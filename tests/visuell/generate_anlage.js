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

function baueAder(netz, funktion) {
  return {
    funktion,
    farbe: netz.farbe ?? KABELFARBEN[funktion],
    querschnitt_mm2: netz.querschnitt
  };
}

// Baut { leitung: { typ, adern } } für ein Bauteil mit i1..iN / o1..oN Pins.
function baueLeitung(netze, bauteilName, prefix, funktionen) {
  const adern = [];
  let kabeltyp = null;
  funktionen.forEach((funktion, i) => {
    const pin = `${bauteilName}.${prefix}${i + 1}`;
    const treffer = findeNetz(netze, pin);
    if (treffer) {
      adern.push(baueAder(treffer, funktion));
      kabeltyp = kabeltyp ?? treffer.kabeltyp;
    }
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

function parseBauteile(ordner) {
  const text = fs.readFileSync(path.join(ordner, 'bauteile.md'), 'utf8');
  const abschnitte = text.split(/^## /m).slice(1);

  const ergebnis = { bauteile: [], stromkreise: [], kopfdaten: {} };

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
    }
  }

  return ergebnis;
}

// --- Generator ---

function generiereAnlage(ordner) {
  const { netze, bauteilTabelle } = parseNetzplan(ordner);
  const { bauteile, stromkreise, kopfdaten } = parseBauteile(ordner);

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

    reihenklemmen: { vorhanden: true, breite_mm: 6, hoehe_mm: 49 },

    pe_klemme: baueKlemme(netze, 'PE-Klemme', 'io1', 'io2', 'PE'),

    hauptsicherung: {
      typ: hauptschalter.name,
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
        typ: rcd.typ,
        polig: rcd.pole,
        te: TE_TABELLE[`RCD-${rcd.pole}`],
        in_ma: rcd.fehlerstrom,
        nennstrom_a: rcd.nennstrom,
        selektiv: rcd.selektiv,
        abklemmen_bei_iso: rcd.abklemmen,
        max_ls_anzahl: rcd.anzahlLs,
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

module.exports = { generiereAnlage };

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
}
