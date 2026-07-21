// Unit-Tests für generate_anlage.js selbst (nicht für einen konkreten Testcase).
// Baut absichtlich kaputte netzplan.md/bauteile.md-Paare in einem Temp-Ordner und
// prüft, dass der Generator sie zurückweist statt sie stillschweigend falsch zu
// verarbeiten. Aufruf: node tests/visuell/test_generator.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { generiereAnlage, generiereGraph, findePfad, berechneWiderstand, istSpannungFuehrend, parseBauteile } = require('./generate_anlage.js');

let alleBestanden = true;

function pruefe(name, fn) {
  try {
    fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.log(`${name}: FAIL – ${err.message}`);
    alleBestanden = false;
  }
}

function tempOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'netzplan-test-'));
}

// Eine Gruppe (RCD1 + LS1) über zwei Hutschienen verteilt: RCD1 sitzt in H1,
// LS1 in H2 - das darf der Generator nicht klaglos hinnehmen (siehe KONZEPT.md,
// "Mehrere RCDs (Gruppen) können auf einer Hutschiene sein").
pruefe('Gruppe über zwei Hutschienen verteilt -> muss Fehler werfen', () => {
  const ordner = tempOrdner();

  fs.writeFileSync(path.join(ordner, 'netzplan.md'), `# Netzplan – Testfixture

## Tabelle 1: H1

| Pin              | N1 | N2 | N3 | N4 |
| ---------------- | :---: | :---: | :---: | :---: |
| **Quelle**       | H1 | H1 | H1 | H1 |
| **Farbe**        | schwarz | blau | schwarz | blau |
| **Querschnitt (mm²)** | 2.5 | 2.5 | 2.5 | 2.5 |
| **Kabeltyp**     | NYM-J | NYM-J | NYM-J | NYM-J |
| Hauptschalter.i1 | L1 |    |    |    |
| Hauptschalter.i2 |    | N  |    |    |
| Hauptschalter.o1 |    |    | L1 |    |
| Hauptschalter.o2 |    |    |    | N  |
| RCD1.i1          |    |    | L1 |    |
| RCD1.i2          |    |    |    | N  |

## Tabelle 2: H2

| Pin      | N3 | N4 | N5 |
| -------- | :---: | :---: | :---: |
| **Quelle** | H1 | H1 | H2 |
| **Farbe**  | schwarz | blau | schwarz |
| **Querschnitt (mm²)** | 2.5 | 2.5 | 2.5 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J |
| LS1.i1   |    |    | L1 |
| LS1.o1   |    |    |    |
`);

  fs.writeFileSync(path.join(ordner, 'bauteile.md'), `# Bauteile – Testfixture

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V |
| Hauptschalter | – | – | – | 25 | 16 | 2 | – | – | – | – | – | – |
| RCD1 | G1 | A | 30 | 40 | 16 | 2 | nein | nein | 2 | 20 | 16 | 0.9 |
| LS1  | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Testkreis | Steckdose | nein / ja / ja |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Testfixture | – |
| Beschreibung | – | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |
`);

  let geworfen = false;
  try {
    generiereAnlage(ordner);
  } catch (err) {
    geworfen = true;
    if (!err.message.includes('über mehrere Hutschienen verteilt')) {
      throw new Error(`Fehler geworfen, aber falsche Meldung: "${err.message}"`);
    }
  }
  if (!geworfen) throw new Error('Generator hat KEINEN Fehler geworfen, obwohl RCD1 (H1) und LS1 (H2) auf verschiedenen Hutschienen sitzen');

  fs.rmSync(ordner, { recursive: true });
});

// Gegentest: dieselbe Fixture, aber RCD1 und LS1 beide in H2 - das ist gültig
// und darf NICHT als Fehler geworfen werden (sonst würde der obige Test nur
// zeigen, dass der Generator immer wirft, egal was drinsteht).
pruefe('Gruppe komplett auf einer Hutschiene -> darf NICHT werfen', () => {
  const ordner = tempOrdner();

  fs.writeFileSync(path.join(ordner, 'netzplan.md'), `# Netzplan – Testfixture

## Tabelle 1: H1

| Pin              | N1 | N2 | N3 | N4 |
| ---------------- | :---: | :---: | :---: | :---: |
| **Quelle**       | H1 | H1 | H1 | H1 |
| **Farbe**        | schwarz | blau | schwarz | blau |
| **Querschnitt (mm²)** | 2.5 | 2.5 | 2.5 | 2.5 |
| **Kabeltyp**     | NYM-J | NYM-J | NYM-J | NYM-J |
| Hauptschalter.i1 | L1 |    |    |    |
| Hauptschalter.i2 |    | N  |    |    |
| Hauptschalter.o1 |    |    | L1 |    |
| Hauptschalter.o2 |    |    |    | N  |

## Tabelle 2: H2

| Pin      | N3 | N4 | N5 |
| -------- | :---: | :---: | :---: |
| **Quelle** | H1 | H1 | H2 |
| **Farbe**  | schwarz | blau | schwarz |
| **Querschnitt (mm²)** | 2.5 | 2.5 | 2.5 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J |
| RCD1.i1  | L1 |    |    |
| RCD1.i2  |    | N  |    |
| LS1.i1   |    |    | L1 |
| LS1.o1   |    |    |    |
`);

  fs.writeFileSync(path.join(ordner, 'bauteile.md'), `# Bauteile – Testfixture

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V |
| Hauptschalter | – | – | – | 25 | 16 | 2 | – | – | – | – | – | – |
| RCD1 | G1 | A | 30 | 40 | 16 | 2 | nein | nein | 2 | 20 | 16 | 0.9 |
| LS1  | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Testkreis | Steckdose | nein / ja / ja |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Testfixture | – |
| Beschreibung | – | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |
`);

  generiereAnlage(ordner); // wirft, wenn was kaputt ist - Test faengt das via pruefe() ab

  fs.rmSync(ordner, { recursive: true });
});

function gleich(tatsaechlich, erwartet, meldung) {
  const t = JSON.stringify(tatsaechlich);
  const e = JSON.stringify(erwartet);
  if (t !== e) throw new Error(`${meldung}: erwartet ${e}, bekommen ${t}`);
}

// --- Verbindungsgraph (generiereGraph/findePfad) gegen testcase_01 ---
// Nutzt den echten, eingecheckten Netzplan (nicht eine Temp-Fixture) - die
// erwarteten Netz-IDs unten sind direkt aus tests/visuell/testcase_01/netzplan.md
// abgelesen. Deckt L1 (Kette über Leistungsschalter -> RCD1 -> LS1/LS2 ->
// Reihenklemme -> Endstelle) und N ab; deckt außerdem den Verzweigungsfall ab
// (RCD1.o1 speist LS1 UND LS2 vom selben physischen Pin aus, siehe
// netzplan.md-Annahme 2).

const TESTCASE_01 = path.join(__dirname, 'testcase_01');
const TESTCASE_02 = path.join(__dirname, 'testcase_02');
const TESTCASE_03 = path.join(__dirname, 'testcase_03');
const TESTCASE_04 = path.join(__dirname, 'testcase_04');
const TESTCASE_05 = path.join(__dirname, 'testcase_05');
const TESTCASE_06 = path.join(__dirname, 'testcase_06');

pruefe('Graph: L1-Pfad Einspeisung -> Endstelle SK1 folgt der erwarteten Kette', () => {
  const graph = generiereGraph(TESTCASE_01);
  const pfad = findePfad(graph, 'L1', 'N1', 'N13');
  gleich(pfad, ['N1', 'N4', 'N6', 'N11', 'N13'], 'L1-Pfad SK1');
});

pruefe('Graph: L1-Pfad Einspeisung -> Endstelle SK2 nutzt die RCD1.o1-Verzweigung nach N7', () => {
  const graph = generiereGraph(TESTCASE_01);
  const pfad = findePfad(graph, 'L1', 'N1', 'N16');
  gleich(pfad, ['N1', 'N4', 'N7', 'N12', 'N16'], 'L1-Pfad SK2');
});

pruefe('Graph: N-Pfad Einspeisung -> Endstelle SK1 folgt der erwarteten Kette', () => {
  const graph = generiereGraph(TESTCASE_01);
  const pfad = findePfad(graph, 'N', 'N2', 'N14');
  gleich(pfad, ['N2', 'N5', 'N8', 'N14'], 'N-Pfad SK1');
});

pruefe('Graph: kein Pfad zwischen Netzen unterschiedlicher Funktion (L1 vs. N)', () => {
  const graph = generiereGraph(TESTCASE_01);
  const pfad = findePfad(graph, 'L1', 'N1', 'N2');
  if (pfad !== null) throw new Error(`erwarte keinen Pfad (N2 ist ein N-Netz, kein L1-Netz), bekommen: ${JSON.stringify(pfad)}`);
});

pruefe('Graph: L1-Knotenliste enthält alle L1-Netze von testcase_01', () => {
  const graph = generiereGraph(TESTCASE_01);
  const erwartet = ['N1', 'N4', 'N6', 'N7', 'N11', 'N12', 'N13', 'N16'];
  const tatsaechlich = [...graph.L1.knoten].sort();
  gleich(tatsaechlich, [...erwartet].sort(), 'L1-Knotenliste');
});

// Fehlertabelle (siehe KONZEPT.md "Pfadverfolgung und Fehlersimulation"): eine
// optionale ## Fehlertabelle-Sektion in netzplan.md weist einzelnen Netzen
// einen Fehler-Widerstand zu - testcase_01 trägt auf dem L1-Pfad zur SK1
// (N1->N4->N6->N11->N13) Beispielwerte auf N6/N11/N13 (0,1+0,2+0,3Ω).
pruefe('Graph: Fehlertabelle wird geparst und berechneWiderstand() summiert sie über den Pfad', () => {
  const graph = generiereGraph(TESTCASE_01);
  gleich(graph.fehlertabelle, { N6: 0.1, N11: 0.2, N13: 0.3 }, 'geparste Fehlertabelle');

  const pfad = findePfad(graph, 'L1', 'N1', 'N13');
  const widerstand = berechneWiderstand(graph, pfad);
  if (Math.abs(widerstand - 0.6) > 1e-9) {
    throw new Error(`erwarte 0.6Ω (0,1+0,2+0,3), bekommen: ${widerstand}`);
  }
});

pruefe('Graph: berechneWiderstand() zählt Netze ohne Fehlertabellen-Eintrag als 0Ω', () => {
  const graph = generiereGraph(TESTCASE_01);
  // N1/N4 haben keinen Fehlertabellen-Eintrag - ein Pfad nur über diese beiden
  // muss exakt 0Ω ergeben.
  const widerstand = berechneWiderstand(graph, ['N1', 'N4']);
  gleich(widerstand, 0, 'Widerstand ohne Fehlertabellen-Einträge');
});

// testcase_03: RCD1 (Hutschiene H3) und RCD2 (H2) teilen sich dasselbe
// Einspeise-Netz N6 (siehe netzplan.md-Annahme 1) - ein Pfad zwischen einer
// Reihenklemme auf der RCD1-Seite und einer auf der RCD2-Seite muss
// Fehler-Widerstände aus BEIDEN Zweigen aufsummieren, über die
// Hutschienengrenze hinweg.
pruefe('Graph: testcase_03 summiert Fehlerwiderstände über die Hutschienengrenze (RCD1+RCD2)', () => {
  const graph = generiereGraph(TESTCASE_03);
  const pfad = findePfad(graph, 'L1', 'N25', 'N33');
  gleich(pfad, ['N25', 'N23', 'N20', 'N6', 'N10', 'N16', 'N33'], 'Pfad über N6 (gemeinsames Einspeise-Netz)');

  const widerstand = berechneWiderstand(graph, pfad);
  if (Math.abs(widerstand - 0.75) > 1e-9) {
    throw new Error(`erwarte 0.75Ω (0,15+0,1 [RCD1] + 0,5 [RCD2]), bekommen: ${widerstand}`);
  }
});

// testcase_02: erster Fehlertabellen-Eintrag auf einem N- statt L1-Netz
// (N10 = RCD1.o2) - Pfad Hauptschalter.i2 (N2) bis Reihenklemme_N_SK1 (N19)
// muss dessen Fehlerwiderstand im N-Teilgraphen aufsummieren.
pruefe('Graph: testcase_02 summiert einen Fehlerwiderstand auf dem N-Pfad', () => {
  const graph = generiereGraph(TESTCASE_02);
  const pfad = findePfad(graph, 'N', 'N2', 'N19');
  gleich(pfad, ['N2', 'N5', 'N7', 'N10', 'N19'], 'N-Pfad Hauptschalter.i2 -> Reihenklemme_N_SK1');

  const widerstand = berechneWiderstand(graph, pfad);
  if (Math.abs(widerstand - 0.3) > 1e-9) {
    throw new Error(`erwarte 0.3Ω (N10), bekommen: ${widerstand}`);
  }
});

// testcase_04: Fehlertabelle auf allen drei Phasen (L1/L2/L3) der
// RCD1-Gruppe, mit durchgängig unterschiedlicher zweiter Nachkommastelle
// (siehe netzplan.md) - deckt ab, dass berechneWiderstand() nicht nur auf L1
// funktioniert, sondern gleichermaßen auf L2/L3.
pruefe('Graph: testcase_04 summiert die Fehlertabelle auf L1/L2/L3', () => {
  const graph = generiereGraph(TESTCASE_04);
  const faelle = [
    ['L1', 'N9', 'N24', 0.40],
    ['L2', 'N10', 'N25', 0.53],
    ['L3', 'N11', 'N26', 0.49]
  ];
  for (const [funktion, von, nach, erwartet] of faelle) {
    const pfad = findePfad(graph, funktion, von, nach);
    const widerstand = berechneWiderstand(graph, pfad);
    if (Math.abs(widerstand - erwartet) > 1e-9) {
      throw new Error(`${funktion} ${von}->${nach}: erwarte ${erwartet}Ω, bekommen: ${widerstand}`);
    }
  }
});

// anlage.json (Anzeigeseite) muss dieselbe Verzweigung wie der Graph
// abbilden: RCD1.o1 speist LS1 (N6) UND LS2 (N7) vom selben physischen Pin -
// baueLeitung() nutzte dafür ursprünglich findeNetz() (nur erster Treffer),
// wodurch N7 in anlage.json komplett verschwand (LS2 wirkte im Schaltkasten
// unverbunden, siehe ARCHITEKTUR.md "Verzweigende Adern in anlage.json").
pruefe('anlage.json: RCD1-Ausgang trägt die zweite L1-Ader (N7) als ader.weitere', () => {
  const anlage = generiereAnlage(TESTCASE_01);
  const rcdAusgang = anlage.hutschienen[0].gruppen[0].rcd.ausgang.leitung.adern;
  const l1Ader = rcdAusgang.find((a) => a.funktion === 'L1');
  if (!l1Ader) throw new Error('keine L1-Ader am RCD-Ausgang gefunden');
  gleich(l1Ader.netz, 'N6', 'RCD-Ausgang L1 Haupt-Ader');
  if (!l1Ader.weitere || l1Ader.weitere.length !== 1) {
    throw new Error(`erwarte genau eine weitere Ader (N7), bekommen: ${JSON.stringify(l1Ader.weitere)}`);
  }
  gleich(l1Ader.weitere[0].netz, 'N7', 'RCD-Ausgang L1 weitere Ader');
});

// istSpannungFuehrend() (RISO-Spannungsprüfung, siehe KONZEPT.md "Berechnung
// der Messwerte"): prüft nicht nur den Hauptschalter, sondern JEDEN Schalter
// im Pfad zur Einspeisung - ein offenes RCD macht seine eigenen Ausgänge
// "tot", auch wenn der Leistungsschalter davor noch geschlossen ist.
pruefe('Graph: istSpannungFuehrend() prüft den kompletten Pfad zur Einspeisung, nicht nur den Hauptschalter', () => {
  const graph = generiereGraph(TESTCASE_01);
  gleich(graph.einspeisung, { L1: 'N1', L2: null, L3: null, N: 'N2' }, 'Einspeisungs-Netze');

  if (!istSpannungFuehrend(graph, 'L1', 'N6')) {
    throw new Error('N6 (RCD1.o1) sollte bei geschlossenen Schaltern spannungsführend sein');
  }
  // Nur RCD1 öffnen, Leistungsschalter bleibt zu.
  for (const kante of graph.L1.kanten) if (kante.bauteil === 'RCD1') kante.geschlossen = false;
  if (istSpannungFuehrend(graph, 'L1', 'N6')) {
    throw new Error('N6 sollte "tot" sein, sobald RCD1 offen ist - unabhängig vom Leistungsschalter');
  }
  if (!istSpannungFuehrend(graph, 'L1', 'N4')) {
    throw new Error('N4 (vor RCD1, hinter dem Leistungsschalter) sollte weiterhin spannungsführend sein');
  }
});

// --- 3-poliger LS (testcase_05, siehe KONZEPT.md "3-poliger LS") - EINE
// Komponente (LS1, Pole=3) statt drei einpoliger LS, für einen einzigen
// dreiphasigen Stromkreis. Verdrahtung/Fehlertabelle bewusst identisch zu
// testcase_04 gehalten (dieselben Netz-IDs), damit sich die Messwerte pro
// Phase 1:1 vergleichen lassen. ---

pruefe('Graph: testcase_05 - der 3-polige LS1 hat drei separate Kanten (L1/L2/L3), keine in N', () => {
  const graph = generiereGraph(TESTCASE_05);
  const kanteL1 = graph.L1.kanten.find((k) => k.bauteil === 'LS1');
  const kanteL2 = graph.L2.kanten.find((k) => k.bauteil === 'LS1');
  const kanteL3 = graph.L3.kanten.find((k) => k.bauteil === 'LS1');
  const kanteN = graph.N.kanten.find((k) => k.bauteil === 'LS1');
  gleich(kanteL1, { von: 'N20', nach: 'N24', bauteil: 'LS1', geschlossen: true }, 'LS1 L1-Kante');
  gleich(kanteL2, { von: 'N21', nach: 'N25', bauteil: 'LS1', geschlossen: true }, 'LS1 L2-Kante');
  gleich(kanteL3, { von: 'N22', nach: 'N26', bauteil: 'LS1', geschlossen: true }, 'LS1 L3-Kante');
  if (kanteN) throw new Error(`LS1 sollte keine Kante im N-Teilgraphen haben, gefunden: ${JSON.stringify(kanteN)}`);
});

pruefe('Graph: testcase_05 - Fehlertabellen-Summe pro Phase über den 3-poligen LS1 stimmt mit testcase_04s drei einpoligen LS überein', () => {
  const graph = generiereGraph(TESTCASE_05);
  // Dieselben Netz-IDs/Fehlertabellen-Werte wie testcase_04 (dort auf
  // LS1/LS2/LS3 verteilt, hier alle auf demselben, 3-poligen LS1).
  const faelle = [
    ['L1', 'N9', 'N24', 0.40],
    ['L2', 'N10', 'N25', 0.53],
    ['L3', 'N11', 'N26', 0.49]
  ];
  for (const [funktion, von, nach, erwartet] of faelle) {
    const pfad = findePfad(graph, funktion, von, nach);
    const widerstand = berechneWiderstand(graph, pfad);
    if (Math.abs(widerstand - erwartet) > 1e-9) {
      throw new Error(`${funktion} ${von}->${nach}: erwarte ${erwartet}Ω, bekommen: ${widerstand}`);
    }
  }
});

pruefe('anlage.json: testcase_05 - EIN Stromkreis mit drei Phasen, ls.polig=3, drei Reihenklemmen-Eingangs-Adern', () => {
  const anlage = generiereAnlage(TESTCASE_05);
  const stromkreise = anlage.hutschienen[0].gruppen[0].stromkreise;
  if (stromkreise.length !== 1) throw new Error(`erwarte genau einen Stromkreis, gefunden ${stromkreise.length}`);
  const sk = stromkreise[0];
  gleich(sk.phasen, ['L1', 'L2', 'L3'], 'SK1 phasen');
  gleich(sk.ls.polig, 3, 'LS1 polig');
  gleich(sk.ls.te, 3, 'LS1 TE-Breite');
  if (!Array.isArray(sk.reihenklemmen_eingang.l) || sk.reihenklemmen_eingang.l.length !== 3) {
    throw new Error(`erwarte reihenklemmen_eingang.l als 3-elementiges Array, gefunden: ${JSON.stringify(sk.reihenklemmen_eingang.l)}`);
  }
  gleich(sk.reihenklemmen_eingang.l.map((a) => a.funktion), ['L1', 'L2', 'L3'], 'Reihenklemmen-Eingang Funktionen');
  // Endstelle trägt fünf Adern (L1/L2/L3/N/PE) statt der sonst üblichen drei.
  gleich(sk.leitung.adern.map((a) => a.funktion), ['L1', 'L2', 'L3', 'N', 'PE'], 'Endstelle-Adern');
});

pruefe('anlage.json: testcase_01/02/03/04 - reihenklemmen_eingang.l ist weiterhin ein 1-elementiges Array (Rückwärtskompatibilität)', () => {
  for (const testcase of [TESTCASE_01, TESTCASE_02, TESTCASE_03, TESTCASE_04]) {
    const anlage = generiereAnlage(testcase);
    for (const hutschiene of anlage.hutschienen) {
      for (const gruppe of hutschiene.gruppen) {
        for (const sk of gruppe.stromkreise) {
          if (!Array.isArray(sk.reihenklemmen_eingang.l) || sk.reihenklemmen_eingang.l.length !== 1) {
            throw new Error(`${testcase} ${sk.bezeichnung}: erwarte reihenklemmen_eingang.l als 1-elementiges Array, gefunden: ${JSON.stringify(sk.reihenklemmen_eingang.l)}`);
          }
        }
      }
    }
  }
});

// --- 3-poliger LS OHNE RCD (testcase_06) - eine Gruppe kann komplett ohne
// RCD-Mitglied sein (z.B. LS direkt hinter der Hauptsicherung). Regressionstest
// für einen Bug, bei dem `generate_anlage.js` ungeprüft auf `rcd.name` (etc.)
// zugriff, obwohl `rcd` bei einer Gruppe ohne RCD-Bauteil `undefined` ist -
// warf vorher einen TypeError. ---

pruefe('anlage.json: testcase_06 - Gruppe ohne RCD-Mitglied wird als gruppe.rcd = null generiert (kein Absturz)', () => {
  const anlage = generiereAnlage(TESTCASE_06);
  const gruppe = anlage.hutschienen[0].gruppen[0];
  if (gruppe.rcd !== null) throw new Error(`erwarte gruppe.rcd === null, gefunden: ${JSON.stringify(gruppe.rcd)}`);
  const sk = gruppe.stromkreise[0];
  gleich(sk.phasen, ['L1', 'L2', 'L3'], 'SK1 phasen');
  gleich(sk.ls.polig, 3, 'LS1 polig');
});

pruefe('Graph: testcase_06 - LS1 hängt direkt am Hauptschalter, keine RCD-Kante dazwischen (Gruppe G1)', () => {
  const graph = generiereGraph(TESTCASE_06);
  const kanteHauptschalter = graph.L1.kanten.find((k) => k.bauteil === 'Hauptschalter');
  const kanteLs1 = graph.L1.kanten.find((k) => k.bauteil === 'LS1');
  gleich(kanteHauptschalter.nach, kanteLs1.von, 'Hauptschalter-Ausgang == LS1-Eingang (direkt verbunden, keine Zwischenstufe)');
});

// Gruppe G2 (RCD2 2-polig + LS2/LS3) sitzt auf derselben Hutschiene wie G1,
// zapft aber denselben Hauptschalter-Ausgang (N9) an wie LS1 - RCD2 muss
// trotzdem als eigene, korrekte Kante existieren.
pruefe('Graph: testcase_06 - Gruppe G2 (RCD2 2-polig + LS2/LS3) verzweigt korrekt vom selben Hauptschalter-Ausgang wie LS1', () => {
  const graph = generiereGraph(TESTCASE_06);
  const kanteHauptschalter = graph.L1.kanten.find((k) => k.bauteil === 'Hauptschalter');
  const kanteRcd2Ls2 = graph.L1.kanten.find((k) => k.bauteil === 'RCD2' && k.von === kanteHauptschalter.nach);
  const kanteLs2 = graph.L1.kanten.find((k) => k.bauteil === 'LS2');
  const kanteLs3 = graph.L1.kanten.find((k) => k.bauteil === 'LS3');
  if (!kanteRcd2Ls2) throw new Error('erwarte eine RCD2-Kante ab demselben Netz wie der Hauptschalter-Ausgang');
  gleich(graph.L1.kanten.filter((k) => k.bauteil === 'RCD2').length, 2, 'RCD2 hat zwei Ausgangskanten (zu LS2 und LS3)');
  if (!kanteLs2 || !kanteLs3) throw new Error('erwarte je eine Kante für LS2 und LS3');
});

pruefe('Graph: testcase_06 - Fehlertabellen-Summe pro Phase über LS1 (ohne RCD-Anteil)', () => {
  const graph = generiereGraph(TESTCASE_06);
  const faelle = [
    ['L1', 'N9', 'N23', 0.20],
    ['L2', 'N10', 'N24', 0.28],
    ['L3', 'N11', 'N25', 0.15]
  ];
  for (const [funktion, von, nach, erwartet] of faelle) {
    const pfad = findePfad(graph, funktion, von, nach);
    const widerstand = berechneWiderstand(graph, pfad);
    if (Math.abs(widerstand - erwartet) > 1e-9) {
      throw new Error(`${funktion} ${von}->${nach}: erwarte ${erwartet}Ω, bekommen: ${widerstand}`);
    }
  }
});

// --- parseSteckdosenPlatzierung (über parseBauteile) gegen die "Steckdosen
// (Platzierung)"-Tabelle in bauteile.md aller vier Testcases - View-Objekt
// selbst noch nicht umgesetzt, siehe KONZEPT.md "Nächste Schritte". ---

pruefe('Steckdosen-Platzierung: testcase_01 (2x2, eine Lücke)', () => {
  const { steckdosenPlatzierung } = parseBauteile(TESTCASE_01);
  gleich(steckdosenPlatzierung, [
    { row: 0, col: 0, sk: 'SK1', rotation: 0 },
    { row: 0, col: 1, sk: 'SK2', rotation: 0 },
    { row: 1, col: 0, sk: 'SK1', rotation: 0 }
  ], 'testcase_01 Steckdosen-Platzierung');
});

pruefe('Steckdosen-Platzierung: testcase_02 (2x2, SK4 um 90° gedreht)', () => {
  const { steckdosenPlatzierung } = parseBauteile(TESTCASE_02);
  gleich(steckdosenPlatzierung, [
    { row: 0, col: 0, sk: 'SK1', rotation: 0 },
    { row: 0, col: 1, sk: 'SK2', rotation: 0 },
    { row: 1, col: 0, sk: 'SK3', rotation: 0 },
    { row: 1, col: 1, sk: 'SK4', rotation: 90 }
  ], 'testcase_02 Steckdosen-Platzierung');
});

pruefe('Steckdosen-Platzierung: testcase_03 (2x3, SK1/SK5 um 180° gedreht)', () => {
  const { steckdosenPlatzierung } = parseBauteile(TESTCASE_03);
  gleich(steckdosenPlatzierung, [
    { row: 0, col: 0, sk: 'SK1', rotation: 180 },
    { row: 0, col: 1, sk: 'SK2', rotation: 0 },
    { row: 1, col: 0, sk: 'SK3', rotation: 0 },
    { row: 1, col: 1, sk: 'SK4', rotation: 0 },
    { row: 2, col: 0, sk: 'SK5', rotation: 180 },
    { row: 2, col: 1, sk: 'SK6', rotation: 0 }
  ], 'testcase_03 Steckdosen-Platzierung');
});

pruefe('Steckdosen-Platzierung: testcase_04 (2x2, SK1 zweimal - einmal um 180° gedreht)', () => {
  const { steckdosenPlatzierung } = parseBauteile(TESTCASE_04);
  gleich(steckdosenPlatzierung, [
    { row: 0, col: 0, sk: 'SK1', rotation: 0 },
    { row: 0, col: 1, sk: 'SK1', rotation: 180 },
    { row: 1, col: 0, sk: 'SK2', rotation: 0 },
    { row: 1, col: 1, sk: 'SK3', rotation: 0 }
  ], 'testcase_04 Steckdosen-Platzierung');
});

process.exit(alleBestanden ? 0 : 1);
