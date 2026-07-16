// Generiert eine anlage.json aus netzplan.md + bauteile.md eines Testcase-Ordners.
// Aufruf: node tests/visuell/generate_anlage.js testcase_01
//
// Schreibt NICHTS in anlage.json - Ausgabe geht nach anlage_generated.json im
// selben Ordner. Das ist ein erster, funktionierender Prototyp (kein vollständiger,
// für jede beliebige Anlage generischer Parser).

const fs = require('fs');
const path = require('path');

const KABELFARBEN = { L1: 'schwarz', L2: 'braun', L3: 'grau', N: 'blau', PE: 'gn-ge' };
const TE_TABELLE = {
  'LS-1': 1, 'LS-2': 2, 'LS-3': 3,
  'RCD-2': 2, 'RCD-4': 4,
  'Hauptschalter-2': 2, 'Hauptschalter-3': 3
};

function leseMarkdownTabelle(text) {
  const zeilen = text.split('\n').map((z) => z.trim()).filter((z) => z.startsWith('|'));
  if (zeilen.length < 2) return [];
  const header = zeilen[0].split('|').map((z) => z.trim()).filter((z) => z !== '');
  const datenZeilen = zeilen.slice(2); // Zeile 1 = Header, Zeile 2 = Trennstriche
  return datenZeilen.map((zeile) => {
    const zellen = zeile.split('|').map((z) => z.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1 || (arr[0] !== '' ));
    const roheZellen = zeile.split('|');
    // erstes und letztes Element sind leer (Zeile beginnt/endet mit |)
    const werte = roheZellen.slice(1, -1).map((z) => z.trim());
    const obj = {};
    header.forEach((h, i) => { obj[h] = werte[i] ?? ''; });
    return obj;
  });
}

function bereinige(wert) {
  const w = (wert || '').replace(/\*\*/g, '').trim();
  return w === '–' || w === '-' || w === '' ? null : w;
}

// --- Netzplan parsen ---

function parseNetzplan(ordner) {
  const text = fs.readFileSync(path.join(ordner, 'netzplan.md'), 'utf8');
  const tabellenBloecke = text.split(/^## Tabelle/m).slice(1);

  // netId -> { farbe, querschnitt, kabeltyp, pins: [{pin, funktion}] }
  const netze = {};
  // bauteilName -> Hutschiene (z.B. "RCD1" -> "H3"), aus der Tabellen-Überschrift.
  // Funktioniert nur, weil jedes Bauteil (seit Wegfall der Gastzeilen) in genau
  // einer Tabelle auftaucht - das ist seine physische Heimat-Hutschiene.
  const bauteilTabelle = {};

  for (const block of tabellenBloecke) {
    const tabellenMatch = block.match(/^\s*\d+:\s*(H\d+)/);
    const tableId = tabellenMatch ? tabellenMatch[1] : null;

    const zeilen = leseMarkdownTabelle(block);
    if (zeilen.length === 0) continue;
    const netIds = Object.keys(zeilen[0]).filter((k) => /^N\d+$/.test(k));

    const farbeZeile = zeilen.find((z) => bereinige(z.Pin) === 'Farbe');
    const querschnittZeile = zeilen.find((z) => bereinige(z.Pin)?.startsWith('Querschnitt'));
    const kabeltypZeile = zeilen.find((z) => bereinige(z.Pin) === 'Kabeltyp');

    for (const netId of netIds) {
      if (!netze[netId]) {
        netze[netId] = {
          farbe: bereinige(farbeZeile?.[netId]),
          querschnitt: querschnittZeile ? parseFloat(bereinige(querschnittZeile[netId])) : null,
          kabeltyp: bereinige(kabeltypZeile?.[netId]),
          pins: []
        };
      }
    }

    for (const zeile of zeilen) {
      const pinName = bereinige(zeile.Pin);
      if (!pinName || ['Quelle', 'Farbe', 'Querschnitt (mm²)', 'Kabeltyp'].includes(pinName)) continue;
      if (tableId) {
        const bauteilName = pinName.split('.')[0];
        if (!bauteilTabelle[bauteilName]) bauteilTabelle[bauteilName] = tableId;
      }
      for (const netId of netIds) {
        const funktion = bereinige(zeile[netId]);
        if (funktion) {
          const schonDrin = netze[netId].pins.some((p) => p.pin === pinName && p.funktion === funktion);
          if (!schonDrin) netze[netId].pins.push({ pin: pinName, funktion });
        }
      }
    }
  }

  return { netze, bauteilTabelle };
}

// Findet das Netz, an dem `pin` mit optionaler `funktion` hängt.
function findeNetz(netze, pin, funktion) {
  for (const [netId, netz] of Object.entries(netze)) {
    const treffer = netz.pins.find((p) => p.pin === pin && (!funktion || p.funktion === funktion));
    if (treffer) return { netId, ...netz };
  }
  return null;
}

// Wie findeNetz, aber liefert ALLE Treffer statt nur den ersten - nötig, weil
// ein einzelner Ausgangspin auf mehrere Netze gleichzeitig verzweigen kann
// (z.B. RCD1.o1 speist sowohl LS1 als auch LS2 über zwei separate Adern am
// selben physischen Pin, siehe netzplan.md-Annahme 2 in testcase_01).
function findeAlleNetze(netze, pin, funktion) {
  return Object.entries(netze)
    .filter(([, netz]) => netz.pins.some((p) => p.pin === pin && p.funktion === funktion))
    .map(([netId]) => netId);
}

// Fehlertabelle (siehe KONZEPT.md "Pfadverfolgung und Fehlersimulation"): eine
// optionale `## Fehlertabelle`-Sektion in netzplan.md, die einzelnen
// (bestehenden) Netzen einen Fehler-Widerstand zuweist - Netze ohne Eintrag
// gelten als 0Ω. Format: `| Netz | Widerstand (Ω) |`, Widerstand mit Komma
// als Dezimaltrennzeichen (deutsche Schreibweise, wie sonst im Projekt).
function parseFehlertabelle(ordner) {
  const text = fs.readFileSync(path.join(ordner, 'netzplan.md'), 'utf8');
  const abschnitt = text.split(/^## /m).find((a) => a.startsWith('Fehlertabelle'));
  if (!abschnitt) return {};

  const tabelle = {};
  for (const zeile of leseMarkdownTabelle(abschnitt)) {
    const netId = bereinige(zeile.Netz);
    const widerstandRoh = bereinige(zeile['Widerstand (Ω)']);
    if (netId && widerstandRoh) tabelle[netId] = parseFloat(widerstandRoh.replace(',', '.'));
  }
  return tabelle;
}

// Summiert die Fehler-Widerstände entlang eines gefundenen Pfads (Array von
// Netz-IDs, siehe findePfad()) - Netze ohne Fehlertabellen-Eintrag zählen 0Ω.
function berechneWiderstand(graph, pfad) {
  return pfad.reduce((summe, netzId) => summe + (graph.fehlertabelle?.[netzId] ?? 0), 0);
}

// --- Verbindungsgraph (Pfadverfolgung, siehe KONZEPT.md "Pfadverfolgung und
// Fehlersimulation") ---
//
// Knoten = Netze, Kanten = Bauteile, die zwei Netze über ein i<n>/o<n>-Pinpaar
// derselben Funktion verbinden (z.B. LS1.i1 -> LS1.o1, beide "L1"). Bewusst
// GENERISCH über alle Bauteile aus bauteile.md (nicht pro Bauteiltyp
// hartkodiert) - jedes Bauteil mit `pole` passenden i/o-Paaren liefert
// automatisch seine Kanten, ohne Sonderfälle pro Bauteilart.
//
// Nur L1/L2/L3/N (keine PE) - PE kann über den Hutschienen-Bond mehrere Pfade
// zwischen zwei Punkten haben (echter Graph mit Zyklen, ggf. Parallel-
// widerstand nötig), L1/L2/L3/N sind dagegen reine Baumstrukturen (radiale
// Verteilung, keine Schleifen) und brauchen daher noch keine Zyklen-Behandlung.
const GRAPH_FUNKTIONEN = ['L1', 'L2', 'L3', 'N'];

function knotenFuerFunktion(netze, funktion) {
  return Object.entries(netze)
    .filter(([, netz]) => netz.pins.some((p) => p.funktion === funktion))
    .map(([netId]) => netId);
}

function kantenFuerFunktion(netze, bauteile, funktion) {
  const kanten = [];
  for (const bauteil of bauteile) {
    const polzahl = bauteil.pole ?? 1;
    for (let i = 1; i <= polzahl; i++) {
      const vonNetze = findeAlleNetze(netze, `${bauteil.name}.i${i}`, funktion);
      const nachNetze = findeAlleNetze(netze, `${bauteil.name}.o${i}`, funktion);
      for (const von of vonNetze) {
        for (const nach of nachNetze) {
          kanten.push({ von, nach, bauteil: bauteil.name, geschlossen: true });
        }
      }
    }
  }
  return kanten;
}

// Netz-ID der Einspeisung für eine Funktion (Pin "Einspeisung.<funktion>",
// z.B. "Einspeisung.L1") - Ausgangspunkt für istSpannungFuehrend() weiter
// unten (RISO-Spannungsprüfung, siehe KONZEPT.md "Berechnung der Messwerte").
function findeEinspeisungsNetz(netze, funktion) {
  for (const [netId, netz] of Object.entries(netze)) {
    if (netz.pins.some((p) => p.pin === `Einspeisung.${funktion}` && p.funktion === funktion)) return netId;
  }
  return null;
}

// Baut für jede Funktion (L1/L2/L3/N) einen eigenen Teilgraphen. PE bewusst
// ausgelassen (siehe Kommentar oben).
function generiereGraph(ordner) {
  const { netze } = parseNetzplan(ordner);
  const { bauteile } = parseBauteile(ordner);
  const fehlertabelle = parseFehlertabelle(ordner);

  const graph = { fehlertabelle, einspeisung: {} };
  for (const funktion of GRAPH_FUNKTIONEN) {
    graph[funktion] = {
      knoten: knotenFuerFunktion(netze, funktion),
      kanten: kantenFuerFunktion(netze, bauteile, funktion)
    };
    graph.einspeisung[funktion] = findeEinspeisungsNetz(netze, funktion);
  }
  return graph;
}

// Breitensuche zwischen zwei Netzen innerhalb eines Funktions-Teilgraphen.
// Kanten sind ungerichtet durchquerbar (ein geschlossener Schalter leitet in
// beide Richtungen) und werden übersprungen, wenn `geschlossen: false` ist.
// Gibt den Pfad als Array von Netz-IDs zurück, oder null, wenn keiner existiert.
function findePfad(graph, funktion, startNetz, zielNetz) {
  const teilgraph = graph[funktion];
  if (!teilgraph) return null;
  if (startNetz === zielNetz) return [startNetz];

  const besucht = new Set([startNetz]);
  const warteschlange = [[startNetz]];
  while (warteschlange.length > 0) {
    const pfad = warteschlange.shift();
    const aktuell = pfad[pfad.length - 1];
    for (const kante of teilgraph.kanten) {
      if (!kante.geschlossen) continue;
      let naechster = null;
      if (kante.von === aktuell) naechster = kante.nach;
      else if (kante.nach === aktuell) naechster = kante.von;
      if (!naechster || besucht.has(naechster)) continue;
      const neuerPfad = [...pfad, naechster];
      if (naechster === zielNetz) return neuerPfad;
      besucht.add(naechster);
      warteschlange.push(neuerPfad);
    }
  }
  return null;
}

// Für die RISO-Spannungsprüfung (siehe KONZEPT.md "Berechnung der
// Messwerte"): ist `netz` bei den aktuellen Schalterstellungen überhaupt noch
// mit der Einspeisung verbunden? Prüft bewusst NICHT nur den Hauptschalter,
// sondern den kompletten Pfad (jeder offene Schalter dazwischen - RCD, LS,
// Hauptschalter - macht das Netz "tot", auch wenn die Anlage davor noch unter
// Spannung steht).
function istSpannungFuehrend(graph, funktion, netz) {
  const einspeisungsNetz = graph.einspeisung?.[funktion];
  if (!einspeisungsNetz || !netz) return false;
  return findePfad(graph, funktion, einspeisungsNetz, netz) !== null;
}

function baueAder(netz, funktion) {
  return {
    funktion,
    farbe: netz.farbe ?? KABELFARBEN[funktion],
    querschnitt_mm2: netz.querschnitt,
    // Netz-ID (z.B. "N4") aus dem Netzplan - nötig, um eine angeklickte
    // Schraube im Verbindungsgraphen wiederzufinden (siehe KONZEPT.md
    // "Pfadverfolgung und Fehlersimulation"). War beim Generieren schon
    // bekannt (findeNetz() liefert sie mit), wurde bisher nur nicht mit in
    // die Ader übernommen.
    netz: netz.netId
  };
}

// Baut { leitung: { typ, adern } } für ein Bauteil mit i1..iN / o1..oN Pins.
// Ein Pin kann auf mehrere Netze gleichzeitig verzweigen (z.B. RCD1.o1 speist
// LS1 UND LS2 über zwei Adern an derselben physischen Klemme, siehe
// netzplan.md-Annahme 2 in testcase_01) - das ist keine zweite Schraube,
// sondern dieselbe Schraube mit mehr als einer Ader. Die erste (per
// findeAlleNetze()-Reihenfolge) bleibt die "Haupt"-Ader dieser Position,
// weitere Treffer hängen als `ader.weitere` dran (siehe view/schaltkasten.js).
function baueLeitung(netze, bauteilName, prefix, funktionen) {
  const adern = [];
  let kabeltyp = null;
  funktionen.forEach((funktion, i) => {
    const pin = `${bauteilName}.${prefix}${i + 1}`;
    const [ersteId, ...weitereIds] = findeAlleNetze(netze, pin, funktion);
    if (!ersteId) return;
    const ader = baueAder({ netId: ersteId, ...netze[ersteId] }, funktion);
    if (weitereIds.length > 0) {
      ader.weitere = weitereIds.map((netId) => baueAder({ netId, ...netze[netId] }, funktion));
    }
    adern.push(ader);
    kabeltyp = kabeltyp ?? netze[ersteId].kabeltyp;
  });
  return { leitung: { typ: kabeltyp ?? 'NYM-J', adern } };
}

// Baut { leitung: { typ, adern: [eineAder] } } für einen einzelnen Pin (z.B. L-Klemme.i1).
function baueEinzelAder(netze, pin, funktion) {
  const treffer = findeNetz(netze, pin);
  if (!treffer) return { leitung: { typ: 'NYM-J', adern: [] } };
  return { leitung: { typ: treffer.kabeltyp ?? 'NYM-J', adern: [baueAder(treffer, funktion)] } };
}

// Baut eine Klemme (L-Klemme/N-Klemme/PE-Klemme) mit getrennter Eingangs-/Ausgangsader,
// da beide Seiten unterschiedliche Querschnitte haben können.
function baueKlemme(netze, pinPrefix, eingangPin, ausgangPin, funktion) {
  return {
    vorhanden: true, breite_mm: 12, hoehe_mm: 49,
    eingang: baueEinzelAder(netze, `${pinPrefix}.${eingangPin}`, funktion),
    ausgang: baueEinzelAder(netze, `${pinPrefix}.${ausgangPin}`, funktion)
  };
}

// --- bauteile.md parsen ---

// Parst die "Steckdosen (Platzierung)"-Tabelle in bauteile.md: ein Raster mit
// Zeilen-/Spaltenbeschriftung ("Reihe n"/"Spalte n" - ohne Bedeutung fürs
// Parsing, nur damit die Kopfzeile nicht versehentlich fett über den echten
// SK-Werten steht). Zellinhalt ist `SKn`, `SKn@<Winkel>` (90/180/270 im
// Uhrzeigersinn) oder `–` (leer, wird übersprungen).
function parseSteckdosenPlatzierung(abschnitt) {
  const zeilen = abschnitt.split('\n').map((z) => z.trim()).filter((z) => z.startsWith('|'));
  if (zeilen.length < 3) return [];
  const datenZeilen = zeilen.slice(2); // Zeile 1 = Kopf, Zeile 2 = Trennstriche

  const platzierungen = [];
  datenZeilen.forEach((zeile, row) => {
    const zellen = zeile.split('|').slice(1, -1).map((z) => z.trim());
    zellen.slice(1).forEach((zelle, col) => { // erste Zelle = Zeilen-Label ("Reihe n")
      const wert = bereinige(zelle);
      if (!wert) return;
      const treffer = wert.match(/^(SK\d+)(?:@(\d+))?$/);
      if (!treffer) return;
      platzierungen.push({ row, col, sk: treffer[1], rotation: treffer[2] ? parseInt(treffer[2], 10) : 0 });
    });
  });
  return platzierungen;
}

function parseBauteile(ordner) {
  const text = fs.readFileSync(path.join(ordner, 'bauteile.md'), 'utf8');
  const abschnitte = text.split(/^## /m).slice(1);

  const ergebnis = { bauteile: [], stromkreise: [], kopfdaten: {}, steckdosenPlatzierung: [] };

  for (const abschnitt of abschnitte) {
    if (abschnitt.startsWith('Bauteile')) {
      const alleZeilen = leseMarkdownTabelle(abschnitt);
      const einheiten = alleZeilen.find((z) => bereinige(z.Bauteil) === 'Einheit') || {};
      ergebnis.bauteile = alleZeilen
        .filter((z) => bereinige(z.Bauteil) && bereinige(z.Bauteil) !== 'Einheit')
        .map((z) => ({
          name: z.Bauteil.trim(),
          gruppe: bereinige(z.Gruppe),
          typ: bereinige(z['Typ/Charakteristik']),
          fehlerstrom: bereinige(z.Fehlerstrom) ? parseFloat(z.Fehlerstrom) : null,
          nennstrom: bereinige(z.Nennstrom) ? parseFloat(z.Nennstrom) : null,
          maxQuerschnitt: bereinige(z['Max. Querschnitt']) ? parseFloat(z['Max. Querschnitt']) : null,
          pole: bereinige(z.Pole) ? parseInt(z.Pole, 10) : null,
          selektiv: bereinige(z.Selektiv) === 'ja',
          abklemmen: bereinige(z.Abklemmen) === 'ja',
          anzahlLs: bereinige(z['Anzahl LS']) ? parseInt(z['Anzahl LS'], 10) : null,
          tA: bereinige(z.tA) ? parseFloat(z.tA) : null,
          iA: bereinige(z.IA) ? parseFloat(z.IA) : null,
          uB: bereinige(z.UB) ? parseFloat(z.UB) : null
        }));
    } else if (abschnitt.startsWith('Stromkreise')) {
      ergebnis.stromkreise = leseMarkdownTabelle(abschnitt).map((z) => {
        const [zi, zs, rcd] = z['Messungen (zi/zs/rcd)'].split('/').map((s) => s.trim() === 'ja');
        return { nr: z.Stromkreis.trim(), ziel: z.Ziel.trim(), endstelle: z.Endstelle.trim(), zi, zs, rcd };
      });
    } else if (abschnitt.startsWith('Anlage')) {
      for (const zeile of leseMarkdownTabelle(abschnitt)) {
        ergebnis.kopfdaten[zeile.Feld.trim()] = zeile.Wert.trim();
      }
    } else if (abschnitt.startsWith('Steckdosen')) {
      ergebnis.steckdosenPlatzierung = parseSteckdosenPlatzierung(abschnitt);
    }
  }

  return ergebnis;
}

// --- Generator ---

function generiereAnlage(ordner) {
  const { netze, bauteilTabelle } = parseNetzplan(ordner);
  const { bauteile, stromkreise, kopfdaten, steckdosenPlatzierung } = parseBauteile(ordner);

  const findeBauteil = (name) => bauteile.find((b) => b.name === name);
  const hauptschalter = findeBauteil('Leistungsschalter') || findeBauteil('Hauptschalter');
  const lKlemme = findeBauteil('L-Klemme');
  const nKlemme = findeBauteil('N-Klemme');
  const l1Klemme = findeBauteil('L1-Klemme');
  const l2Klemme = findeBauteil('L2-Klemme');
  const l3Klemme = findeBauteil('L3-Klemme');

  // Bei einem 3-poligen Hauptschalter (L1+L2+L3, kein N-Pol) müssen alle drei
  // Phasen geschaltet werden statt nur L1+N - siehe testcase_04.
  const hauptschalterFunktionen = hauptschalter.pole === 3 ? ['L1', 'L2', 'L3'] : ['L1', 'N'];

  const anlage = {
    name: kopfdaten['Name'],
    beschreibung: kopfdaten['Beschreibung'],
    netzform: kopfdaten['Netzform'],
    spannung_einspeisung: parseInt(kopfdaten['Spannung Einspeisung'], 10),
    spannung_stromkreise: parseInt(kopfdaten['Spannung Stromkreise'], 10),

    // Raster für das Steckdosen-View-Objekt oberhalb des Schaltkastens (siehe
    // view/steckdosen.js und die "## Steckdosen (Platzierung)"-Tabelle in
    // bauteile.md) - der Endstellen-Typ (Steckdose/Anschlussdose) steht NICHT
    // hier, sondern wird über `bezeichnung` in stromkreise[].endstelle
    // nachgeschlagen (keine Redundanz).
    steckdosen_platzierung: steckdosenPlatzierung,

    reihenklemmen: { vorhanden: true, breite_mm: 6, hoehe_mm: 49 },

    pe_klemme: baueKlemme(netze, 'PE-Klemme', 'io1', 'io2', 'PE'),

    hauptsicherung: {
      typ: hauptschalter.name,
      // Bauteilname aus bauteile.md (z.B. "Leistungsschalter") - verbindende ID
      // zum Verbindungsgraphen (siehe KONZEPT.md "Schalter"), getrennt vom
      // (unbenutzten, aber aus Kompatibilität belassenen) `typ`-Feld oben.
      name: hauptschalter.name,
      polig: hauptschalter.pole,
      te: TE_TABELLE[`Hauptschalter-${hauptschalter.pole}`],
      in: hauptschalter.nennstrom,
      eingang: baueLeitung(netze, hauptschalter.name, 'i', hauptschalterFunktionen),
      ausgang: baueLeitung(netze, hauptschalter.name, 'o', hauptschalterFunktionen)
    },

    hutschienen: []
  };

  if (lKlemme) {
    anlage.l_klemme = baueKlemme(netze, 'L-Klemme', 'i1', 'o1', 'L1');
  }
  if (nKlemme) {
    anlage.n_klemme = baueKlemme(netze, 'N-Klemme', 'i1', 'o1', 'N');
  }
  if (l1Klemme) {
    anlage.l1_klemme = baueKlemme(netze, 'L1-Klemme', 'i1', 'o1', 'L1');
  }
  if (l2Klemme) {
    anlage.l2_klemme = baueKlemme(netze, 'L2-Klemme', 'i1', 'o1', 'L2');
  }
  if (l3Klemme) {
    anlage.l3_klemme = baueKlemme(netze, 'L3-Klemme', 'i1', 'o1', 'L3');
  }

  // Gruppen anhand der "Gruppe"-Spalte bündeln
  const gruppenIds = [...new Set(bauteile.map((b) => b.gruppe).filter(Boolean))];
  const gruppen = gruppenIds.map((gruppeId) => {
    const mitglieder = bauteile.filter((b) => b.gruppe === gruppeId);
    const rcd = mitglieder.find((b) => b.name.startsWith('RCD'));
    const lsListe = mitglieder.filter((b) => b.name.startsWith('LS'));

    // Eine Gruppe (RCD + ihre LS) muss komplett auf einer physischen Hutschiene
    // sitzen - sie darf nicht über zwei Tabellen verteilt sein (siehe KONZEPT.md,
    // "Mehrere RCDs (Gruppen) können auf einer Hutschiene sein"). Sonst würde die
    // Gruppe stillschweigend nur der Hutschiene des RCD zugeordnet, ohne dass die
    // abweichenden LS-Positionen auffallen.
    const tabellenDerGruppe = new Set(mitglieder.map((b) => bauteilTabelle[b.name]).filter(Boolean));
    if (tabellenDerGruppe.size > 1) {
      throw new Error(
        `Gruppe ${gruppeId} ist über mehrere Hutschienen verteilt (${[...tabellenDerGruppe].join(', ')}): ` +
        `${mitglieder.map((b) => `${b.name}=${bauteilTabelle[b.name] ?? '?'}`).join(', ')}`
      );
    }

    const stromkreiseDerGruppe = lsListe.map((ls) => {
      const skNr = ls.name.replace('LS', 'SK'); // Konvention: LS1 <-> SK1
      const sk = stromkreise.find((s) => s.nr === skNr);
      const phase = findeNetz(netze, `${ls.name}.i1`)?.pins.find((p) => p.pin === `${ls.name}.i1`)?.funktion ?? 'L1';

      // Über die Endstelle-Pins gesucht (nicht über die Reihenklemme selbst) - robust
      // gegenüber PE-Klemmen, die eingehende+weiterführende Ader auf demselben `io1`
      // Pin tragen (mehrere Netze an einem Pin, siehe Annahme 7).
      let leitungKabeltyp = null;
      const endstellePins = { [phase]: 'i1', N: 'i2', PE: 'i3' };
      const leitungAdern = [phase, 'N', 'PE'].map((funktion) => {
        const treffer = findeNetz(netze, `Endstelle_${skNr}.${endstellePins[funktion]}`);
        if (treffer) leitungKabeltyp = leitungKabeltyp ?? treffer.kabeltyp;
        return treffer ? baueAder(treffer, funktion) : null;
      }).filter(Boolean);

      // Eingangsseite der drei Reihenklemmen (L/N/PE) - kann von der Ausgangsseite
      // (leitung, oben) abweichen, z.B. wenn `io1` der PE-Reihenklemme unverbunden
      // ist (PE kommt dann nur über den Hutschienen-Bond, siehe Annahmen in
      // netzplan.md). null, wenn nichts angeschlossen ist.
      const reihenklemmenEingang = {
        l: (() => {
          const t = findeNetz(netze, `Reihenklemme_L_${skNr}.i1`);
          return t ? baueAder(t, phase) : null;
        })(),
        n: (() => {
          const t = findeNetz(netze, `Reihenklemme_N_${skNr}.i1`);
          return t ? baueAder(t, 'N') : null;
        })(),
        pe: (() => {
          const t = findeNetz(netze, `Reihenklemme_PE_${skNr}.io1`);
          return t ? baueAder(t, 'PE') : null;
        })()
      };

      return {
        nr: parseInt(skNr.replace('SK', ''), 10),
        bezeichnung: skNr,
        ziel: sk.ziel,
        phasen: [phase],
        ls: {
          // Bauteilname aus bauteile.md (z.B. "LS1") - verbindende ID zum
          // Verbindungsgraphen (siehe KONZEPT.md "Schalter").
          name: ls.name,
          char: ls.typ,
          in: ls.nennstrom,
          polig: ls.pole,
          te: TE_TABELLE[`LS-${ls.pole}`],
          eingang: baueLeitung(netze, ls.name, 'i', [phase]),
          ausgang: baueLeitung(netze, ls.name, 'o', [phase])
        },
        afdd: null,
        endstelle: sk.endstelle,
        leitung: { typ: leitungKabeltyp ?? 'NYM-J', adern: leitungAdern },
        reihenklemmen_eingang: reihenklemmenEingang,
        messungen: { zi: sk.zi, zs: sk.zs, rcd: sk.rcd }
      };
    });

    const gruppenPhase = stromkreiseDerGruppe[0]?.phasen[0] ?? 'L1';

    // Ein RCD kann mehrere Stromkreise auf unterschiedlichen Phasen versorgen
    // (z.B. 4-poliger RCD mit L1/L2/L3+N, siehe testcase_04) - alle tatsächlich
    // vorkommenden Phasen einsammeln statt nur die der ersten Gruppe.
    const PHASEN_REIHENFOLGE = ['L1', 'L2', 'L3'];
    const vorkommendePhasen = PHASEN_REIHENFOLGE.filter((p) =>
      stromkreiseDerGruppe.some((sk) => sk.phasen[0] === p)
    );
    const rcdFunktionen = [...(vorkommendePhasen.length ? vorkommendePhasen : [gruppenPhase]), 'N'];

    return {
      _tabelle: bauteilTabelle[rcd.name] ?? null,
      id: gruppeId,
      bezeichnung: `Gruppe ${gruppeId.replace('G', '')}`,
      phase: vorkommendePhasen.length > 1 ? vorkommendePhasen.join('/') : gruppenPhase,
      rcd: {
        // Bauteilname aus bauteile.md (z.B. "RCD1") - verbindende ID zum
        // Verbindungsgraphen (siehe KONZEPT.md "Schalter").
        name: rcd.name,
        typ: rcd.typ,
        polig: rcd.pole,
        te: TE_TABELLE[`RCD-${rcd.pole}`],
        in_ma: rcd.fehlerstrom,
        nennstrom_a: rcd.nennstrom,
        selektiv: rcd.selektiv,
        abklemmen_bei_iso: rcd.abklemmen,
        max_ls_anzahl: rcd.anzahlLs,
        // Auslösewerte des RCD-Geräts selbst (siehe KONZEPT.md "Berechnung
        // der Messwerte" - FI/RCD): Abschaltzeit, Auslösestrom,
        // Berührungsspannung. Werden von TEST übernommen, sobald ein RCD auf
        // dem Pfad zur Einspeisung gefunden wird - reine Bauteil-Eigenschaft,
        // kein Pfad-Widerstand wie bei RLOW/ZI/ZS.
        tA: rcd.tA,
        iA: rcd.iA,
        uB: rcd.uB,
        eingang: baueLeitung(netze, rcd.name, 'i', rcdFunktionen),
        ausgang: baueLeitung(netze, rcd.name, 'o', rcdFunktionen)
      },
      stromkreise: stromkreiseDerGruppe
    };
  });

  // Gruppen nach ihrer physischen Hutschiene bündeln (mehrere Gruppen-Hutschienen
  // möglich, siehe testcase_03: G1 allein, G2+G3 zusammen). Reihenfolge im Array
  // muss der Anordnung im Schaltkasten entsprechen: hutschienen[0] liegt am
  // nächsten an den Reihenklemmen (oberste Gruppen-Zeile), das letzte Element am
  // nächsten am Hauptschalter (unterste Gruppen-Zeile) - das entspricht
  // absteigender Hutschienen-Nummer (Hx mit höchstem x zuerst), da H1 immer der
  // Hauptschalter ist und die Nummerierung von unten nach oben zählt.
  const tabellenNummer = (t) => (t ? parseInt(t.replace('H', ''), 10) : -1);
  const tabellen = [...new Set(gruppen.map((g) => g._tabelle))].sort((a, b) => tabellenNummer(b) - tabellenNummer(a));

  for (const tabelle of tabellen) {
    const gruppenAufDieserHutschiene = gruppen
      .filter((g) => g._tabelle === tabelle)
      .map(({ _tabelle, ...rest }) => rest);
    anlage.hutschienen.push({ gruppen: gruppenAufDieserHutschiene });
  }

  return anlage;
}

module.exports = { generiereAnlage, generiereGraph, findePfad, berechneWiderstand, istSpannungFuehrend, parseBauteile };

// --- Main (nur bei direktem Aufruf, nicht beim require() aus anderen Skripten) ---

if (require.main === module) {
  const testcaseName = process.argv[2];
  if (!testcaseName) {
    console.error('Aufruf: node generate_anlage.js <testcase_ordner>');
    process.exit(1);
  }

  const ordner = path.join(__dirname, testcaseName);
  const anlage = generiereAnlage(ordner);

  const zielPfad = path.join(ordner, 'anlage_generated.json');
  fs.writeFileSync(zielPfad, JSON.stringify(anlage, null, 2));
  console.log(`Geschrieben: ${zielPfad}`);

  // Verbindungsgraph nur, wenn netzplan.md existiert (setzt parseNetzplan()
  // voraus, das generiereGraph() intern aufruft) - übersprungen bei
  // handgepflegten Anlagen ohne Netzplan.
  if (fs.existsSync(path.join(ordner, 'netzplan.md'))) {
    const graph = generiereGraph(ordner);
    const graphZielPfad = path.join(ordner, 'graph_generated.json');
    fs.writeFileSync(graphZielPfad, JSON.stringify(graph, null, 2));
    console.log(`Geschrieben: ${graphZielPfad}`);
  }
}
