// Unit-Tests für generate_anlage.js selbst (nicht für einen konkreten Testcase).
// Baut absichtlich kaputte netzplan.md/bauteile.md-Paare in einem Temp-Ordner und
// prüft, dass der Generator sie zurückweist statt sie stillschweigend falsch zu
// verarbeiten. Aufruf: node tests/visuell/test_generator.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { generiereAnlage } = require('./generate_anlage.js');

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

process.exit(alleBestanden ? 0 : 1);
