// Tests für tools/anlagen_reproduzieren.js (sim-ki2): Jede aus einer
// anforderung.md erzeugte Anlage (Demos und Testcases) muss sich mit dem
// heutigen Werkzeug unverändert neu erzeugen lassen, und eine Abweichung muss
// erkannt werden.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { findeAnlagen, pruefeAnlage } = require('../../tools/anlagen_reproduzieren.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');

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

function bedingung(wahr, meldung) {
  if (!wahr) throw new Error(meldung);
}

// Kopie einer Anlage in einen Temp-Ordner mit demselben Namen (der Name steht
// in netzplan.md), `aendern` darf die kopierte anforderung.md anpassen.
function kopie(name, aendern = (text) => text) {
  const ziel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reproduzieren-test-')), name);
  fs.cpSync(path.join(PROJEKT_ROOT, 'demos', name), ziel, { recursive: true });
  const anforderung = path.join(ziel, 'anforderung.md');
  fs.writeFileSync(anforderung, aendern(fs.readFileSync(anforderung, 'utf8')));
  return ziel;
}

const anlagen = findeAnlagen();

pruefe('Findet Demos und Testcases mit anforderung.md', () => {
  const namen = anlagen.map((o) => path.basename(o));
  for (const erwartet of ['demo_09', 'demo_15', 'testcase_07', 'testcase_08', 'testcase_09']) {
    bedingung(namen.includes(erwartet), `${erwartet} fehlt in ${namen.join(', ')}`);
  }
  bedingung(!namen.includes('testcase_01'), 'testcase_01 hat keine anforderung.md und gehört nicht dazu');
});

for (const ordner of anlagen) {
  const name = path.basename(ordner);
  pruefe(`${name}: netzplan.md, bauteile.md, anlage.json, graph.json neu erzeugt gleich dem eingecheckten Stand`, () => {
    const { fehler, abweichungen } = pruefeAnlage(ordner);
    bedingung(fehler.length === 0, `Anforderung abgelehnt: ${fehler.join('; ')}`);
    bedingung(abweichungen.length === 0, `weicht ab (neu erzeugen mit node tools/demo_erstellung.js ${name}): ${abweichungen
      .map((a) => `${a.datei} Zeile ${a.zeilen[0]?.zeile}`).join(', ')}`);
  });
}

pruefe('Geänderte Anforderung (LS-Nennstrom) wird als Abweichung erkannt', () => {
  const ordner = kopie('demo_15', (text) => text.replace(/(\| SK2 .*?\| B {8}\| )10 /, '$113 '));
  try {
    const { fehler, abweichungen } = pruefeAnlage(ordner);
    bedingung(fehler.length === 0, `Anforderung abgelehnt: ${fehler.join('; ')}`);
    const dateien = abweichungen.map((a) => a.datei);
    bedingung(dateien.includes('bauteile.md') && dateien.includes('anlage.json'), `Abweichungen in: ${dateien.join(', ') || 'keiner Datei'}`);
    const zeile = abweichungen.find((a) => a.datei === 'bauteile.md').zeilen[0];
    bedingung(zeile.eingecheckt.includes('| 10 |') && zeile.neu.includes('| 13 |'), `bauteile.md: ${JSON.stringify(zeile)}`);
  } finally {
    fs.rmSync(path.dirname(ordner), { recursive: true, force: true });
  }
});

pruefe('Ungültige Anforderung wird mit den Meldungen gemeldet, nicht als gleich', () => {
  const ordner = kopie('demo_15', (text) => text.replace('| Hauptschalter Pole   | 3 ', '| Hauptschalter Pole   | 5 '));
  try {
    const { fehler } = pruefeAnlage(ordner);
    bedingung(fehler.some((f) => f.includes('Hauptschalter Pole')), `Meldungen: ${JSON.stringify(fehler)}`);
  } finally {
    fs.rmSync(path.dirname(ordner), { recursive: true, force: true });
  }
});

process.exit(alleBestanden ? 0 : 1);
