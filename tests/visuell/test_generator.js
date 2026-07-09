// Unit-Tests für generate_anlage.js selbst (nicht für einen konkreten Testcase).
// Baut absichtlich kaputte netzplan.md/bauteile.md-Paare in einem Temp-Ordner und
// prüft, dass der Generator sie zurückweist statt sie stillschweigend falsch zu
// verarbeiten. Aufruf: node tests/visuell/test_generator.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { generiereAnlage, generiereGraph, findePfad } = require('./generate_anlage.js');

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

process.exit(alleBestanden ? 0 : 1);
