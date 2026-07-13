import { Anlage } from '../model/anlage.js';
import { SchaltkastenView } from '../view/schaltkasten.js';
import { MessgeraetView } from '../view/messgeraet.js';
import { Popup } from '../view/popup.js';
import { findePfad, berechneWiderstand, istSpannungFuehrend } from '../model/pfad.js';

// Messspitzen (Messmodus, siehe unten): pro Schrauben-Kreis genau eine Farbe,
// jede Farbe insgesamt nur an einer Schraube gleichzeitig (3 Messspitzen wie
// beim echten Gerät: L/N/PE). Kreis-Element als Map-Key, da jede Schraube im
// Schaltkasten-SVG genau ein solches Element ist und sich nie ändert.
const MESSSPITZEN_FARBEN = ['schwarz', 'blau', 'grün'];
const MESSSPITZEN_FARBWERTE = { schwarz: '#111111', blau: '#2255cc', 'grün': '#22aa44' };

function svgKreis(attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Nächster Zustand im Zyklus leer -> schwarz -> blau -> grün -> leer -> ...,
// wobei eine Farbe übersprungen wird, wenn sie gerade an einer ANDEREN
// Schraube hängt (max. 3 Messspitzen gleichzeitig, da nur 3 Farben).
function naechsteMessspitzenFarbe(aktuelleFarbe, belegteFarben) {
  const sequenz = [null, ...MESSSPITZEN_FARBEN];
  let index = sequenz.indexOf(aktuelleFarbe);
  for (let i = 0; i < sequenz.length; i++) {
    index = (index + 1) % sequenz.length;
    const kandidat = sequenz[index];
    if (kandidat === null || !belegteFarben.has(kandidat)) return kandidat;
  }
  return aktuelleFarbe;
}

async function start() {
  const container = document.getElementById('schaltkasten');
  const pfad = new URLSearchParams(window.location.search).get('anlage') ?? 'anlagen/beispiel_eg.json';
  const anlage = await Anlage.laden(pfad);
  // Verbindungsgraph für die Pfadverfolgung (RLOW, siehe KONZEPT.md
  // "Pfadverfolgung und Fehlersimulation") - null, wenn der Testcase keinen
  // Netzplan hat (z.B. die handgepflegte beispiel_eg.json). Ohne Graph bleibt
  // RLOW einfach beim Platzhalter, kein Fehlerfall.
  const graph = await Anlage.ladeGraph(pfad);

  // kreis-Element -> Farbe bzw. -> zugehörige Ader (für die Pfadsuche: welche
  // Funktion/welches Netz hängt an dieser Schraube) bzw. -> Overlay-Kreis-Element.
  const messspitzenFarbe = new Map();
  const messspitzenAder = new Map();
  const messspitzenOverlay = new Map();

  // Schalter (LS/RCD/Hauptschalter, siehe KONZEPT.md "Schalter"): ein Klick
  // auf den Hebel im Schaltkasten schaltet ALLE Kanten im Verbindungsgraphen
  // um, die zu diesem Bauteil gehören (bei mehrpoligen Bauteilen mehrere
  // Kanten gleichzeitig, eine je Pol/Funktion - z.B. ein 4-poliges RCD
  // betrifft Kanten in L1/L2/L3/N zugleich). Zustand lebt direkt im
  // `graph`-Objekt (`kante.geschlossen`), nicht in einer eigenen Map -
  // bewusst NICHT beim Ausschalten des Messgeräts zurückgesetzt (anders als
  // Messspitzen): ein Schalter bildet den echten Zustand der Anlage ab, der
  // bleibt bestehen, auch wenn man gerade nicht misst.
  function schalterUmschalten(bauteilName, geschlossen) {
    if (!graph) return;
    // Nur die Funktions-Teilgraphen (L1/L2/L3/N), nicht `graph.fehlertabelle`
    // (kein Teilgraph, siehe Anbindung der Fehlertabelle unten).
    for (const funktion of Object.keys(graph).filter((k) => graph[k]?.kanten)) {
      for (const kante of graph[funktion].kanten) {
        if (kante.bauteil === bauteilName) kante.geschlossen = geschlossen;
      }
    }
    renderMessgeraet(); // RLOW misst kontinuierlich, siehe unten
  }

  const schaltkastenSvg = SchaltkastenView.render(anlage, container, (ader, x, y, kreis) => {
    // Solange das Messgerät an ist (Messmodus), ersetzen Messspitzen die
    // Popups: kein Querschnitt/Farbe-Tooltip mehr, stattdessen legt jeder
    // Klick auf eine Schraube eine farbige Messspitze an (oder nimmt sie
    // wieder ab) - genau wie beim echten Gerät blendet man Popups aus,
    // sobald man tatsächlich misst.
    if (messgeraetZustand.an) {
      const belegteFarben = new Set(messspitzenFarbe.values());
      belegteFarben.delete(messspitzenFarbe.get(kreis)); // eigene aktuelle Farbe zählt nicht als "belegt"
      const naechsteFarbe = naechsteMessspitzenFarbe(messspitzenFarbe.get(kreis) ?? null, belegteFarben);

      const altesOverlay = messspitzenOverlay.get(kreis);
      if (altesOverlay) altesOverlay.remove();
      messspitzenOverlay.delete(kreis);
      messspitzenFarbe.delete(kreis);
      messspitzenAder.delete(kreis);

      if (naechsteFarbe !== null) {
        messspitzenFarbe.set(kreis, naechsteFarbe);
        messspitzenAder.set(kreis, ader);
        const overlay = svgKreis({
          cx: kreis.getAttribute('cx'), cy: kreis.getAttribute('cy'), r: 7,
          fill: MESSSPITZEN_FARBWERTE[naechsteFarbe], stroke: '#ffffff', 'stroke-width': 2.5
        });
        overlay.style.pointerEvents = 'none'; // Klicks sollen weiter beim Schrauben-Kreis ankommen (Zyklus geht weiter)
        kreis.parentNode.appendChild(overlay);
        messspitzenOverlay.set(kreis, overlay);
      }

      // RLOW misst kontinuierlich (der Sanduhr/Pfeil-Kasten im Display ist
      // dort NICHT durchgestrichen, siehe messgeraet.js) - jede Änderung an
      // den Messspitzen soll sich also sofort im Messwert niederschlagen,
      // ohne TEST-Taste. Für andere Funktionen bleibt das Neu-Rendern hier
      // wirkungslos (baueAnzeigeZustand() überschreibt dort nichts).
      // RISOs R-Wert braucht dagegen einen TEST-Klick (siehe unten) - eine
      // Änderung an den Messspitzen macht einen alten Messwert aber ungültig,
      // darum hier zurücksetzen (die Spannungsanzeige selbst ist live, kein
      // Reset nötig). Die Ampel gehört zum selben Messvorgang wie der
      // Messwert, geht also mit zurück auf aus/grau.
      risoMesswert = null;
      risoAmpel = null;
      renderMessgeraet();
    } else {
      Popup.zeige({
        querschnitt: `${ader.querschnitt_mm2} mm²`,
        farbe: ader.farbe,
        weitere: ader.weitere?.map((w) => ({ querschnitt: `${w.querschnitt_mm2} mm²`, farbe: w.farbe }))
      }, x, y);
    }
  }, schalterUmschalten);

  // Alle Netz-IDs, die an einer Ader hängen - normalerweise nur ihre eigene,
  // bei einer physisch geteilten Schraube (siehe generate_anlage.js
  // baueLeitung()) zusätzlich die aus `ader.weitere` (z.B. RCD1.o1, das
  // gleichzeitig LS1 und LS2 speist).
  function alleNetzeVonAder(ader) {
    return [ader?.netz, ...(ader?.weitere ?? []).map((w) => w.netz)].filter(Boolean);
  }

  // Ader der aktuell angelegten Messspitze einer bestimmten Farbe (oder
  // null, wenn diese Farbe gerade an keiner Schraube hängt).
  function messspitzenAderNachFarbe(farbe) {
    for (const [kreis, f] of messspitzenFarbe) {
      if (f === farbe) return messspitzenAder.get(kreis);
    }
    return null;
  }

  // Sucht einen Pfad zwischen zwei Adern - probiert alle Kombinationen ihrer
  // Netz-IDs (inkl. `ader.weitere` bei geteilten Schrauben, siehe oben), da
  // an einer solchen Klemme irgendeine der dort hängenden Adern eine
  // Verbindung herstellen kann. Gibt den ersten gefundenen Pfad zurück, oder
  // null.
  function findePfadZwischenAdern(funktion, aderA, aderB) {
    for (const netzA of alleNetzeVonAder(aderA)) {
      for (const netzB of alleNetzeVonAder(aderB)) {
        const pfad = findePfad(graph, funktion, netzA, netzB);
        if (pfad) return pfad;
      }
    }
    return null;
  }

  // RLOW-Messwert aus den aktuell angelegten Messspitzen: "schwarz" und
  // "blau" müssen beide gesetzt sein (siehe KONZEPT.md "Messmodus"), auf
  // Schrauben mit dem gleichen Netz-`funktion` (z.B. beide "L1") - nur dann
  // existiert überhaupt ein Teilgraph, der beide verbindet (siehe
  // "Pfadverfolgung und Fehlersimulation": L1/L2/L3/N sind je ein eigener
  // Baum, PE noch nicht angebunden). Gibt den Widerstand in Ω zurück (Summe
  // der Fehlertabellen-Einträge entlang des gefundenen Pfads, 0Ω wenn keine
  // Netze im Pfad einen Eintrag haben) oder null, wenn keine Messung möglich
  // ist (Platzhalter bleibt dann stehen).
  function berechneRlowMesswert() {
    if (!graph) return null;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    if (!schwarzAder || !blauAder) return null;
    if (schwarzAder.funktion !== blauAder.funktion) return null;
    const pfad = findePfadZwischenAdern(schwarzAder.funktion, schwarzAder, blauAder);
    return pfad ? berechneWiderstand(graph, pfad) : null;
  }

  // RISO misst zwischen L (L1/L2/L3) und N/L (N oder eine ANDERE Phase) -
  // anders als RLOW dürfen die Funktionen hier unterschiedlich sein, das ist
  // ja gerade der Zweck der Isolationsmessung. Welche der beiden Messspitzen
  // (Schwarz/Blau) auf L bzw. N/L sitzt, ist elektrisch egal - wie am echten
  // Gerät ist eine Widerstandsmessung symmetrisch, die Rollen dürfen also
  // vertauscht sein. RISO_L_FUNKTIONEN wird auch vom Test-Klick unten
  // gebraucht.
  const RISO_L_FUNKTIONEN = ['L1', 'L2', 'L3'];

  // Bestimmt den Messtyp für ein beliebiges Adernpaar, unabhängig davon,
  // welche Farbe welche Rolle hat: 'LN' (eine Ader auf L1/L2/L3, die andere
  // auf N ODER PE - siehe risoEffektiveAder() unten), 'LL' (beide auf
  // L1/L2/L3, aber unterschiedliche Phasen), sonst `null` (z.B. beide auf
  // derselben Phase, oder keine der beiden auf L).
  function risoPaarTyp(aderA, aderB) {
    const istL = (ader) => RISO_L_FUNKTIONEN.includes(ader.funktion);
    const istNOderPe = (ader) => ader.funktion === 'N' || ader.funktion === 'PE';
    if (istL(aderA) && istNOderPe(aderB)) return 'LN';
    if (istL(aderB) && istNOderPe(aderA)) return 'LN';
    if (istL(aderA) && istL(aderB) && aderA.funktion !== aderB.funktion) return 'LL';
    return null;
  }

  // Verwechslung N/PE ist im Prüfungsalltag realistisch (anders als ein
  // aufgetrennter PE-Leiter, der praktisch nie vorkommt) - eine an PE
  // angelegte Messspitze wird deshalb bewusst vereinfacht wie N am
  // Einspeisungspunkt behandelt: PE und N sind im TN-S/TN-C-S-Netz ohnehin
  // am Sternpunkt miteinander verbunden, und da PE hier nie aufgetrennt
  // wird, ist "irgendwo auf PE" elektrisch gleichbedeutend mit "direkt am
  // N-Einspeisungspunkt". Kein vollständiger PE-Graph nötig (der wäre wegen
  // der Hutschienen-Bond-Zyklen ein größeres eigenes Vorhaben, siehe
  // KONZEPT.md) - nur für RISO relevant, da nur dort PE überhaupt als
  // Messpunkt vorkommt.
  function risoEffektiveAder(ader) {
    if (ader.funktion !== 'PE' || !graph?.einspeisung?.N) return ader;
    return { funktion: 'N', netz: graph.einspeisung.N };
  }

  // Live-Spannungsprüfung zwischen den beiden RISO-Messpunkten (schwarz/blau)
  // - läuft bei JEDER Messspitzen-Änderung, nicht erst nach TEST (echtes
  // Gerät zeigt anliegende Spannung als Sicherheitsfunktion sofort an). Prüft
  // über istSpannungFuehrend(), ob beide Punkte noch mit der Einspeisung
  // verbunden sind (nicht nur der Hauptschalter - JEDER offene Schalter im
  // jeweiligen Pfad macht den Punkt "tot", z.B. ein offenes RCD auch bei
  // geschlossenem Hauptschalter). 230V bei L-N, 400V bei zwei verschiedenen
  // Phasen, sonst 0V (auch wenn die Messspitzen fehlen oder nicht zueinander
  // passen - RISO zeigt hier IMMER einen Wert, nie einen Platzhalter).
  function berechneRisoSpannung() {
    const schwarzAderRoh = messspitzenAderNachFarbe('schwarz');
    const blauAderRoh = messspitzenAderNachFarbe('blau');
    if (!graph || !schwarzAderRoh || !blauAderRoh) return 0;
    const typ = risoPaarTyp(schwarzAderRoh, blauAderRoh);
    if (!typ) return 0;

    const schwarzAder = risoEffektiveAder(schwarzAderRoh);
    const blauAder = risoEffektiveAder(blauAderRoh);
    const schwarzLebt = istSpannungFuehrend(graph, schwarzAder.funktion, schwarzAder.netz);
    const blauLebt = istSpannungFuehrend(graph, blauAder.funktion, blauAder.netz);
    return schwarzLebt && blauLebt ? (typ === 'LN' ? 230 : 400) : 0;
  }

  // RISO-Messwert, ausgelöst über die TEST-Taste (siehe renderMessgeraet()
  // unten) - anders als RLOW nicht kontinuierlich. `null` = noch kein
  // gültiger TEST-Klick (Platzhalter bleibt stehen), `Infinity` = kein Pfad
  // gefunden ("gesund", zeigt `>999MΩ`), sonst der über die Fehlertabelle
  // summierte Widerstand wie bei RLOW.
  let risoMesswert = null;
  // Ampel (Leuchtstreifen links/rechts im Display, siehe messgeraet.js) -
  // zeigt das Ergebnis des letzten TEST-Klicks: `null` = aus/grau (noch kein
  // TEST-Klick seit dem letzten Reset), `'rot'` = Spannung lag an ODER
  // Messwert unter dem Grenzwert, `'gruen'` = Messwert über dem Grenzwert
  // (inkl. Gleichstand) oder `>999MΩ`. Lebt wie risoMesswert nur für den
  // aktuellen Messvorgang - siehe die risoAmpel-Resets unten.
  let risoAmpel = null;

  function risoTestKlick() {
    if (messgeraetZustand.funktion !== 'RISO' || !graph) return;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    const gruenAder = messspitzenAderNachFarbe('grün');
    // Alle drei Messspitzen müssen an der richtigen Funktion sitzen (siehe
    // KONZEPT.md "Messmodus") - PE fließt zwar (noch) nicht in die
    // Berechnung ein, muss aber trotzdem angelegt sein. Schwarz/Blau dürfen
    // vertauscht sein (risoPaarTyp() prüft symmetrisch), Grün muss immer PE
    // sein.
    if (!schwarzAder || !blauAder || !gruenAder) return;
    // Schwarz/Blau auf derselben Funktion (z.B. beide L1) ist keine
    // Isolationsmessung, sondern schlicht eine Durchgangsprüfung auf einer
    // Phase - dieselbe Pfadsuche wie bei RLOW (Fehlertabelle-Summe, oder
    // `Infinity`/`>999MΩ` bei offenem Schalter dazwischen), unabhängig von
    // risoPaarTyp()/der L-N/L-L-Spannungslogik. PE-PE bewusst ausgenommen
    // (Grün deckt PE schon separat ab, PE selbst ist nicht im Graphen).
    const gleicheFunktion = schwarzAder.funktion === blauAder.funktion && schwarzAder.funktion !== 'PE';
    if (!gleicheFunktion && !risoPaarTyp(schwarzAder, blauAder)) return;
    if (gruenAder.funktion !== 'PE') return;
    // Sicherheits-Verhalten wie beim echten Gerät: solange Spannung anliegt,
    // springt R auf den Platzhalter zurück, statt einen alten Messwert stehen
    // zu lassen. Bei gleicher Funktion liegt zwischen Schwarz/Blau ohnehin
    // nie eine Spannung an (0V, siehe risoPaarTyp()), dieser Zweig greift
    // dort also nie. Ampel: Spannung anliegend = "durchgefallen" (rot).
    if (berechneRisoSpannung() > 0) {
      risoMesswert = null;
      risoAmpel = 'rot';
      renderMessgeraet();
      return;
    }

    const schwarzEffektiv = risoEffektiveAder(schwarzAder);
    const blauEffektiv = risoEffektiveAder(blauAder);
    const pfad = findePfadZwischenAdern(schwarzEffektiv.funktion, schwarzEffektiv, blauEffektiv);
    // berechneWiderstand() summiert die Fehlertabelle - die ist immer in Ω
    // angegeben (wie bei RLOW), nie in MΩ. `risoMesswert` ist deshalb IMMER
    // ein Ω-Wert, wenn endlich; nur der Infinity-Sentinel wird als „>999MΩ"
    // dargestellt (siehe baueAnzeigeZustand() unten).
    risoMesswert = pfad ? berechneWiderstand(graph, pfad) : Infinity;
    // Ampel: Grenzwert ist in MΩ eingestellt, risoMesswert aber in Ω - für
    // den Vergleich deshalb den Grenzwert in Ω umrechnen (*1_000_000), statt
    // den Messwert zu dividieren (Rundungsfehler bei sehr kleinen Werten).
    // >999MΩ (kein Pfad) liegt immer über jedem endlichen Grenzwert -> grün.
    // Sonst grün ab (einschließlich) Grenzwert, sonst rot. Das gilt bewusst
    // einheitlich für jeden Pfad-Fund (auch den "gleiche Funktion"-Fall) -
    // ein niedriger Ω-Wert liegt bei jedem realistischen Grenzwert (MΩ-
    // Bereich) praktisch immer darunter und zeigt deshalb Rot.
    risoAmpel = risoMesswert === Infinity || risoMesswert >= risoGrenzwertMOhm * 1_000_000 ? 'gruen' : 'rot';
    renderMessgeraet();
  }

  // Box wird auf die tatsächlich gerenderte Schaltkasten-Breite gesetzt, damit
  // das (schmalere) Messgerät mittig darunter erscheint, ohne die Breite hier
  // zu duplizieren.
  const messgeraetContainer = document.getElementById('messgeraet');
  messgeraetContainer.style.width = `${schaltkastenSvg.getAttribute('width')}px`;

  // Gerät startet aus. TEST-Taste/Messpunkte-Anlegen folgen noch.
  let messgeraetZustand = MessgeraetView.zustandFuerFunktion('RLOW', false);
  // Menü-Navigation über die ◄►-Taste: wandert durch Zone 1 (Titel + die
  // Werte aus titelWerte), das ausgewählte Feld wird invers dargestellt.
  // Index 0 = Titel (Default), Index i+1 = titelWerte[i]. Lebt getrennt von
  // messgeraetZustand, da zustandFuerFunktion() bei jedem Drehknopf-/ON-OFF-
  // Klick einen frischen Zustand baut - die Auswahl soll dabei auf den
  // Default (Titel) zurückgesetzt werden.
  let zone1Auswahl = 0;
  // ▲/▼ bearbeiten das per ◄► ausgewählte Feld. Aktuell vier konkrete Fälle:
  // - Titel ausgewählt (zone1Auswahl 0), togglet je nach Funktion (titelZeigtLabel):
  //   - RLOW: zwischen Titel ("Durchgang") und Drehknopf-Label ("R LOW") -
  //     beide Zustände bleiben invers markiert.
  //   - ZI: zu einer eigenen "ΔU"-Ansicht (Spannungsfall) mit vorangestelltem
  //     Platzhalterwert, siehe baueAnzeigeZustand().
  // - Bei RLOW der kalibrierte Widerstand (zone1Auswahl 1): ±0,1Ω pro Klick,
  //   nach unten geklemmt bei 0 (zeigt dann "___Ω" statt "0,0Ω", weitere
  //   Klicks nach unten bleiben wirkungslos).
  // - Bei RISO die Prüfspannung (zone1Auswahl 1): wandert durch eine feste
  //   Werteliste (Normreihe nach VDE 0100-600/IEC 61557-2), an beiden Enden
  //   geklemmt (kein Wrap-around). Weitere Felder (z.B. bei ZI der LS-Typ)
  //   sind noch nicht angeschlossen.
  let titelZeigtLabel = false;
  let rlowKalibrierterWiderstand = 0.4;
  const RISO_MESSSPANNUNGEN = ['50V', '100V', '250V', '500V', '1000V'];
  let risoMessspannungIndex = RISO_MESSSPANNUNGEN.indexOf('500V');
  // Grenzwert (Mindest-Isolationswiderstand), rechtsbündig im Display (siehe
  // titelWertRechts) - per ▲/▼ in 10MΩ-Schritten einstellbar, siehe
  // aendereAusgewaehltesFeld().
  let risoGrenzwertMOhm = 50;
  // ZI: LS-Typ/Bemessungsstrom/Abschaltzeit einzeln per ◄► auswählbar, dann
  // per ▲/▼ durch die jeweilige Werteliste wandern (Bemessungsstrom siehe
  // docs/referenz/bauteilwerte.md). An beiden Enden geklemmt, wie bei RISO.
  // Gemeinsame Liste für ZI und ZS (siehe unten). L/U/NV/gG sind
  // Sicherungs- bzw. ältere DIN-Charakteristiken statt aktueller
  // LS-Charakteristiken (daher nicht in bauteilwerte.md, das nur echte
  // LS-Bauteilfelder listet) - als Referenzgerät für Zi/Zs-Messungen aber
  // ebenso zulässig, siehe auch LIM_FAKTOR_NACH_LS_TYP in view/messgeraet.js,
  // die alle vier bereits unterstützt.
  const ZI_LS_TYPEN = ['B', 'C', 'D', 'K', 'Z', 'L', 'U', 'NV', 'gG'];
  const ZI_BEMESSUNGSSTROEME = ['6A', '10A', '13A', '16A', '20A', '25A', '32A', '35A', '40A', '50A', '63A', '80A', '100A', '125A'];
  const ZI_ABSCHALTZEITEN = ['35ms', '70ms', '0,1s', '0,2s', '0,4s', '1s', '5s'];
  let ziLsTypIndex = ZI_LS_TYPEN.indexOf('B');
  let ziBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
  let ziAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
  // ZI, ΔU-Ansicht: Spannungsfall in %, ±0,5 pro Klick, nach unten geklemmt
  // bei 0. LS-Typ/Bemessungsstrom/Abschaltzeit sind in der ΔU-Ansicht
  // dieselben Variablen wie in der normalen Zl-Ansicht (siehe oben) - eine
  // Änderung in der einen Ansicht gilt auch in der anderen.
  let ziSpannungsfallProzent = 4.0;
  // ZI, ΔU-Ansicht, Zone 2 (zwischen den Strichen): Referenzimpedanz - noch
  // nicht per ◄►/▲▼ auswählbar, aber als Variable gehalten (siehe
  // Kommentar-Konvention bei anderen Defaults in dieser Datei).
  let ziZref = 0.1;
  // ZS: gleicher Mechanismus wie bei ZI (Zl ↔ ΔU), aber eigene Variablen -
  // LS-Typ/Bemessungsstrom/Abschaltzeit von ZS und ZI sind unabhängig
  // voneinander (unterschiedliche Messungen, kein gemeinsamer LS
  // vorausgesetzt). "ZSrcd" ist die alternative Ansicht (statt "ΔU" bei ZI).
  let zsLsTypIndex = ZI_LS_TYPEN.indexOf('B');
  let zsBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
  let zsAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
  // ZS, ZSrcd-Ansicht: "Std" togglet nur zwischen Std/Low, sonst nichts.
  const ZS_STD_LOW = ['Std', 'Low'];
  let zsStdLowIndex = ZS_STD_LOW.indexOf('Std');
  // FI/RCD: Fehlerstrom und Typ einzeln per ◄► auswählbar, dann per ▲/▼
  // durch die jeweilige Werteliste wandern (siehe docs/referenz/bauteilwerte.md
  // "RCD"). An beiden Enden geklemmt, wie bei RISO/ZI.
  const FIRCD_FEHLERSTROEME = ['10mA', '30mA', '100mA', '300mA', '500mA'];
  const FIRCD_TYPEN = ['AC', 'A', 'F', 'B', 'B+'];
  let fircdFehlerstromIndex = FIRCD_FEHLERSTROEME.indexOf('30mA');
  let fircdTypIndex = FIRCD_TYPEN.indexOf('AC');

  function klemmeIndex(index, richtung, maxIndex) {
    return Math.min(maxIndex, Math.max(0, index + richtung));
  }

  function baueAnzeigeZustand() {
    const zustand = { ...messgeraetZustand, zone1Auswahl };
    const funktion = messgeraetZustand.funktion;

    if (funktion === 'RLOW') {
      const wertText = rlowKalibrierterWiderstand === 0
        ? '___Ω'
        : `${rlowKalibrierterWiderstand.toFixed(1).replace('.', ',')}Ω`;
      zustand.titelWerte = [wertText, ...messgeraetZustand.titelWerte.slice(1)];
      // Nur im "R LOW"-Ansicht (Titel togglet, siehe titelZeigtLabel) zeigt
      // RLOW zusätzlich R+/R- (Vorwärts-/Rückwärts-Widerstand bei der
      // Durchgangsprüfung) über dem unteren Strich - bei "Durchgang" nicht.
      if (titelZeigtLabel) {
        zustand.titel = messgeraetZustand.label;
        zustand.nebenwertLinks = 'R+:___';
        zustand.nebenwertRechts = 'R-:___';
      }
      // Hauptmesswert (großer zentraler Wert): aus den angelegten
      // Messspitzen berechnet, siehe berechneRlowMesswert(). Kontinuierliche
      // Messung (kein TEST nötig) - bleibt beim Platzhalter aus
      // zustandFuerFunktion(), solange kein Pfad gefunden wird.
      const rlowMesswert = berechneRlowMesswert();
      if (rlowMesswert !== null) {
        // Zwei Nachkommastellen statt einer - die Fehlertabelle erlaubt
        // Werte wie 0,15Ω, eine Summe (z.B. 0,45Ω) würde mit nur einer
        // Nachkommastelle sichtbar Information verlieren (auf 0,5Ω gerundet).
        zustand.hauptwert = `R:${rlowMesswert.toFixed(2).replace('.', ',')}Ω`;
      }
    } else if (funktion === 'RISO') {
      zustand.titelWerte = [RISO_MESSSPANNUNGEN[risoMessspannungIndex]];
      // Grenzwert (Mindest-Isolationswiderstand nach Norm) rechtsbündig am
      // Display-Rand, analog zur ZI-ΔU-Ansicht (siehe titelWertRechts unten) -
      // per ▲/▼ einstellbar (aendereAusgewaehltesFeld()), Default 50MΩ.
      zustand.titelWertRechts = `${risoGrenzwertMOhm}MΩ`;
      // Live, unabhängig von TEST - siehe berechneRisoSpannung(). Immer ein
      // Wert (Default 0V), nie ein Platzhalter.
      zustand.spannungUnterPe = `${berechneRisoSpannung()}V`;
      // R-Wert nur nach TEST-Klick (siehe risoTestKlick()) - Platzhalter aus
      // zustandFuerFunktion() bleibt stehen, solange risoMesswert null ist.
      // Einheit: risoMesswert ist (wenn endlich) immer ein Ω-Wert aus der
      // Fehlertabelle (siehe risoTestKlick()) - nur der Infinity-Sentinel
      // wird als „>999MΩ" dargestellt (kein echter MΩ-Wert, sondern ein
      // fester "außerhalb der Skala"-Text).
      if (risoMesswert !== null) {
        zustand.hauptwert = risoMesswert === Infinity
          ? 'R:>999MΩ'
          : `R:${risoMesswert.toFixed(2).replace('.', ',')}Ω`;
      }
      // Ampel (siehe risoTestKlick()) - links rot bei "durchgefallen", rechts
      // grün bei "bestanden", sonst beide aus/grau (kein TEST-Klick seit dem
      // letzten Reset).
      zustand.leuchteLinksAn = risoAmpel === 'rot';
      zustand.leuchteRechtsAn = risoAmpel === 'gruen';
    } else if (funktion === 'ZI') {
      const ziTitelWerte = [
        ZI_LS_TYPEN[ziLsTypIndex],
        ZI_BEMESSUNGSSTROEME[ziBemessungsstromIndex],
        ZI_ABSCHALTZEITEN[ziAbschaltzeitIndex]
      ];
      if (titelZeigtLabel) {
        // ΔU-Ansicht (Spannungsfall): eigenständiger Titel statt Zl. LS-Typ
        // und Bemessungsstrom bleiben in der mittleren Reihe, die
        // Abschaltzeit rutscht ganz nach rechts (titelWertRechts) - sonst
        // wären es 4 mittige Werte, was nicht mehr ins Display passt. Der
        // Hauptmesswert (zwischen den Strichen) bleibt hier bewusst leer -
        // kommt erst in einem späteren Schritt dazu.
        zustand.titel = 'ΔU';
        const spannungsfallText = `${ziSpannungsfallProzent.toFixed(1).replace('.', ',')}%`;
        zustand.titelWerte = [spannungsfallText, ziTitelWerte[0], ziTitelWerte[1]];
        zustand.titelWertRechts = ziTitelWerte[2];
        // Zone 2 (zwischen den Strichen): vier links ausgerichtete Zeilen
        // statt des sonst üblichen zentralen Hauptmesswerts - ΔU/Isc/Z noch
        // keine echten Werte (Platzhalter ___, wie sonst nach TEST-Klick),
        // Zref hat schon jetzt einen (weiterhin veränderbaren) Startwert.
        zustand.hauptwertZeilen = [
          'ΔU: ___%',
          'Isc:___A',
          'Z:___Ω',
          `Zref: ${ziZref.toFixed(1).replace('.', ',')}Ω`
        ];
        // Isc/Lim (siehe normale Zl-Ansicht) gehören hier nicht mehr hin -
        // ΔU hat eigene Zeilen zwischen den Strichen stattdessen.
        zustand.nebenwertLinks = null;
        zustand.nebenwertRechts = null;
      } else {
        zustand.titelWerte = ziTitelWerte;
        // Lim hängt von LS-Typ UND Bemessungsstrom ab - live neu berechnet,
        // damit es mit den ▲/▼-Änderungen oben mitzieht (nicht mehr nur aus
        // den statischen Defaults in zustandFuerFunktion()).
        zustand.nebenwertRechts = MessgeraetView.berechneLimText(ziTitelWerte[0], ziTitelWerte[1]);
      }
    } else if (funktion === 'ZS') {
      const zsTitelWerte = [
        ZI_LS_TYPEN[zsLsTypIndex],
        ZI_BEMESSUNGSSTROEME[zsBemessungsstromIndex],
        ZI_ABSCHALTZEITEN[zsAbschaltzeitIndex]
      ];
      // Lim wie bei ZI live berechnet - gilt für "Zs" UND "ZSrcd" gleichermaßen
      // (siehe Kommentar unten: Isc/Lim bleiben in ZSrcd unverändert).
      zustand.nebenwertRechts = MessgeraetView.berechneLimText(zsTitelWerte[0], zsTitelWerte[1]);
      if (titelZeigtLabel) {
        // ZSrcd-Ansicht (Zs-Messung durch einen RCD hindurch, ohne ihn
        // auszulösen): eigenständiger Titel statt Zs. "Std"/"Low" togglet
        // per ▲/▼ (siehe unten), LS-Typ/Bemessungsstrom bleiben mittig, die
        // Abschaltzeit rutscht wie bei ZI-ΔU nach rechts (titelWertRechts).
        // Zone 2/3 (Hauptmesswert, Messpunkte, Isc/Lim) bleiben unverändert
        // wie in der normalen Zs-Ansicht - kein Override nötig.
        zustand.titel = 'ZSrcd';
        zustand.titelWerte = [ZS_STD_LOW[zsStdLowIndex], zsTitelWerte[0], zsTitelWerte[1]];
        zustand.titelWertRechts = zsTitelWerte[2];
      } else {
        zustand.titelWerte = zsTitelWerte;
      }
    } else if (funktion === 'FI/RCD') {
      zustand.titelWerte = [FIRCD_FEHLERSTROEME[fircdFehlerstromIndex], FIRCD_TYPEN[fircdTypIndex]];
    }

    return zustand;
  }

  // Setzt alle per ▲/▼ bearbeitbaren Felder auf ihren Default zurück - beim
  // Wechsel der Funktion oder beim Ein-/Ausschalten soll die Bearbeitung nicht
  // erhalten bleiben (zustandFuerFunktion() baut ohnehin einen frischen
  // Basis-Zustand, die Overrides in baueAnzeigeZustand() sollen dazu passen).
  function setzeBearbeitungenZurueck() {
    zone1Auswahl = 0;
    titelZeigtLabel = false;
    rlowKalibrierterWiderstand = 0.4;
    risoMessspannungIndex = RISO_MESSSPANNUNGEN.indexOf('500V');
    risoGrenzwertMOhm = 50;
    risoMesswert = null;
    risoAmpel = null;
    ziLsTypIndex = ZI_LS_TYPEN.indexOf('B');
    ziBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
    ziAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
    ziSpannungsfallProzent = 4.0;
    ziZref = 0.1;
    zsLsTypIndex = ZI_LS_TYPEN.indexOf('B');
    zsBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
    zsAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
    zsStdLowIndex = ZS_STD_LOW.indexOf('Std');
    fircdFehlerstromIndex = FIRCD_FEHLERSTROEME.indexOf('30mA');
    fircdTypIndex = FIRCD_TYPEN.indexOf('AC');
  }

  // Entfernt alle angelegten Messspitzen (Overlay-Kreise + Zustand) - beim
  // Ausschalten des Messgeräts, da der Messmodus dann endet und man beim
  // nächsten Einschalten wieder frisch anlegen soll.
  function entferneAlleMessspitzen() {
    for (const overlay of messspitzenOverlay.values()) overlay.remove();
    messspitzenOverlay.clear();
    messspitzenFarbe.clear();
    messspitzenAder.clear();
  }

  function renderMessgeraet() {
    MessgeraetView.render(messgeraetContainer, baueAnzeigeZustand(), {
      onOff: () => {
        const eingeschaltet = !messgeraetZustand.an;
        messgeraetZustand = MessgeraetView.zustandFuerFunktion(messgeraetZustand.funktion, eingeschaltet);
        setzeBearbeitungenZurueck();
        if (!eingeschaltet) entferneAlleMessspitzen();
        renderMessgeraet();
      },
      drehknopf: () => {
        const naechste = MessgeraetView.naechsteFunktion(messgeraetZustand.funktion);
        messgeraetZustand = MessgeraetView.zustandFuerFunktion(naechste, messgeraetZustand.an);
        setzeBearbeitungenZurueck();
        renderMessgeraet();
      },
      seite: () => {
        // Live-Zustand (nicht messgeraetZustand) verwenden, da titelWerte je
        // nach Ansicht überschrieben wird (z.B. ZI-ΔU-Ansicht hat andere
        // Werte/Länge als die normale Zl-Ansicht) und ein optionales
        // titelWertRechts (rechtsbündiger Extra-Wert) dazukommen kann.
        const aktuellerZustand = baueAnzeigeZustand();
        const anzahlFelder = 1 + aktuellerZustand.titelWerte.length + (aktuellerZustand.titelWertRechts ? 1 : 0);
        zone1Auswahl = (zone1Auswahl + 1) % anzahlFelder;
        renderMessgeraet();
      },
      auf: () => { aendereAusgewaehltesFeld(1); },
      ab: () => { aendereAusgewaehltesFeld(-1); },
      test: risoTestKlick
    });
  }

  function aendereAusgewaehltesFeld(richtung) {
    const funktion = messgeraetZustand.funktion;
    if (zone1Auswahl === 0) {
      titelZeigtLabel = !titelZeigtLabel;
    } else if (funktion === 'RLOW' && zone1Auswahl === 1) {
      rlowKalibrierterWiderstand = Math.max(0, Math.round((rlowKalibrierterWiderstand + richtung * 0.1) * 10) / 10);
    } else if (funktion === 'RISO' && zone1Auswahl === 1) {
      risoMessspannungIndex = klemmeIndex(risoMessspannungIndex, richtung, RISO_MESSSPANNUNGEN.length - 1);
    } else if (funktion === 'RISO' && zone1Auswahl === 2) {
      // Grenzwert (titelWertRechts) - 10MΩ-Schritte, nicht negativ.
      risoGrenzwertMOhm = Math.max(0, risoGrenzwertMOhm + richtung * 10);
    } else if (funktion === 'ZI' && titelZeigtLabel) {
      // ΔU-Ansicht: 1=Spannungsfall%, 2=LS-Typ, 3=Bemessungsstrom,
      // 4=Abschaltzeit (rechtsbündig, titelWertRechts) - andere Reihenfolge
      // als in der normalen Zl-Ansicht, siehe baueAnzeigeZustand().
      if (zone1Auswahl === 1) {
        ziSpannungsfallProzent = Math.max(0, Math.round((ziSpannungsfallProzent + richtung * 0.5) * 10) / 10);
      } else if (zone1Auswahl === 2) {
        ziLsTypIndex = klemmeIndex(ziLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 3) {
        ziBemessungsstromIndex = klemmeIndex(ziBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 4) {
        ziAbschaltzeitIndex = klemmeIndex(ziAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'ZI') {
      // Normale Zl-Ansicht: 1=LS-Typ, 2=Bemessungsstrom, 3=Abschaltzeit.
      if (zone1Auswahl === 1) {
        ziLsTypIndex = klemmeIndex(ziLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 2) {
        ziBemessungsstromIndex = klemmeIndex(ziBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 3) {
        ziAbschaltzeitIndex = klemmeIndex(ziAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'ZS' && titelZeigtLabel) {
      // ZSrcd-Ansicht: 1="Std"/"Low", 2=LS-Typ, 3=Bemessungsstrom,
      // 4=Abschaltzeit (rechtsbündig, titelWertRechts).
      if (zone1Auswahl === 1) {
        // Reines Toggle (wie beim Titel), nicht geklemmt - ▲ und ▼ machen
        // beide dasselbe, da es nur zwei Werte gibt.
        zsStdLowIndex = 1 - zsStdLowIndex;
      } else if (zone1Auswahl === 2) {
        zsLsTypIndex = klemmeIndex(zsLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 3) {
        zsBemessungsstromIndex = klemmeIndex(zsBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 4) {
        zsAbschaltzeitIndex = klemmeIndex(zsAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'ZS') {
      // Normale Zs-Ansicht: 1=LS-Typ, 2=Bemessungsstrom, 3=Abschaltzeit.
      if (zone1Auswahl === 1) {
        zsLsTypIndex = klemmeIndex(zsLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 2) {
        zsBemessungsstromIndex = klemmeIndex(zsBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 3) {
        zsAbschaltzeitIndex = klemmeIndex(zsAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'FI/RCD') {
      // 1=Fehlerstrom, 2=Typ.
      if (zone1Auswahl === 1) {
        fircdFehlerstromIndex = klemmeIndex(fircdFehlerstromIndex, richtung, FIRCD_FEHLERSTROEME.length - 1);
      } else if (zone1Auswahl === 2) {
        fircdTypIndex = klemmeIndex(fircdTypIndex, richtung, FIRCD_TYPEN.length - 1);
      }
    }
    renderMessgeraet();
  }

  renderMessgeraet();
}

start();
