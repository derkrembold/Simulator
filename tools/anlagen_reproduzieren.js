// Reproduzierbarkeitscheck (sim-ki2): erzeugt jede Anlage, die aus einer
// anforderung.md entsteht (demos/demo_NN und tests/visuell/testcase_NN), in
// einem Temp-Ordner neu und vergleicht netzplan.md, bauteile.md, anlage.json
// und graph.json mit dem eingecheckten Stand. Eine Abweichung heißt: eine
// Änderung an tools/demo_erstellung.js oder tests/visuell/generate_anlage.js
// würde diese Anlage ändern, sie muss neu erzeugt werden (oder die Änderung
// ist ungewollt). Der Fahrplan wird nicht verglichen (braucht den Browser).
//
// Aufruf:
//   node tools/anlagen_reproduzieren.js              alle Anlagen mit anforderung.md
//   node tools/anlagen_reproduzieren.js demo_15      nur diese (auch testcase_NN)
// Exit-Code 1, wenn eine Anlage abweicht oder ihre Anforderung abgelehnt wird.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { erzeugeModell } = require('./demo_erstellung.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..');
const DEMOS_ORDNER = path.join(PROJEKT_ROOT, 'demos');
const TESTCASES_ORDNER = path.join(PROJEKT_ROOT, 'tests', 'visuell');
const DATEIEN = ['netzplan.md', 'bauteile.md', 'anlage.json', 'graph.json'];
// Je Datei höchstens so viele abweichende Zeilen in der Meldung.
const MAX_ZEILEN = 3;

// Alle Ordner mit anforderung.md: demos/<name> und tests/visuell/testcase_NN.
function findeAnlagen() {
  const unterordner = (basis, muster) => fs.readdirSync(basis, { withFileTypes: true })
    .filter((e) => e.isDirectory() && muster.test(e.name))
    .map((e) => path.join(basis, e.name))
    .filter((ordner) => fs.existsSync(path.join(ordner, 'anforderung.md')));
  return [...unterordner(DEMOS_ORDNER, /./), ...unterordner(TESTCASES_ORDNER, /^testcase_\d+$/)].sort();
}

// Ordner zu einem Namen wie demo_15 oder testcase_07 (wie demo_erstellung.js).
function ordnerZuName(name) {
  return /^testcase_\d+$/.test(name) ? path.join(TESTCASES_ORDNER, name) : path.join(DEMOS_ORDNER, name);
}

// Zeilenweiser Vergleich: die ersten abweichenden Zeilen mit Zeilennummer.
function vergleicheText(ist, soll) {
  const a = ist.split('\n');
  const b = soll.split('\n');
  const zeilen = [];
  for (let i = 0; i < Math.max(a.length, b.length) && zeilen.length < MAX_ZEILEN; i++) {
    if (a[i] !== b[i]) zeilen.push({ zeile: i + 1, eingecheckt: a[i] ?? '(fehlt)', neu: b[i] ?? '(fehlt)' });
  }
  return zeilen;
}

// Zeilenumbrüche vereinheitlichen: unter Windows legt Git die Dateien mit CRLF
// ab (core.autocrlf), das Werkzeug schreibt LF. Das ist keine Abweichung
// (sim-57c).
const mitLf = (text) => text.replace(/\r\n/g, '\n');

// Erzeugt die Anlage im Ordner neu und vergleicht. Liefert
// { name, fehler: [Meldungen der Anforderungsprüfung], abweichungen: [{ datei, zeilen }] }.
function pruefeAnlage(ordner) {
  const name = path.basename(ordner);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reproduzieren-'));
  try {
    const ergebnis = erzeugeModell(fs.readFileSync(path.join(ordner, 'anforderung.md'), 'utf8'), temp, name);
    if (ergebnis.fehler.length > 0) return { name, fehler: ergebnis.fehler, abweichungen: [] };
    const abweichungen = [];
    for (const datei of DATEIEN) {
      const pfad = path.join(ordner, datei);
      const eingecheckt = fs.existsSync(pfad) ? mitLf(fs.readFileSync(pfad, 'utf8')) : '';
      const neu = mitLf(fs.readFileSync(path.join(temp, datei), 'utf8'));
      if (eingecheckt !== neu) abweichungen.push({ datei, zeilen: vergleicheText(eingecheckt, neu) });
    }
    return { name, fehler: [], abweichungen };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function main() {
  const namen = process.argv.slice(2);
  const ordner = namen.length > 0 ? namen.map(ordnerZuName) : findeAnlagen();
  let gut = true;
  for (const o of ordner) {
    if (!fs.existsSync(path.join(o, 'anforderung.md'))) {
      console.log(`${path.basename(o)}: keine anforderung.md in ${path.relative(PROJEKT_ROOT, o)}`);
      gut = false;
      continue;
    }
    const { name, fehler, abweichungen } = pruefeAnlage(o);
    if (fehler.length > 0) {
      console.log(`${name}: Anforderung abgelehnt`);
      fehler.forEach((f) => console.log(`  - ${f}`));
      gut = false;
    } else if (abweichungen.length > 0) {
      console.log(`${name}: weicht ab (neu erzeugen mit: node tools/demo_erstellung.js ${name})`);
      for (const { datei, zeilen } of abweichungen) {
        console.log(`  ${datei}:`);
        for (const z of zeilen) console.log(`    Zeile ${z.zeile}\n      eingecheckt: ${z.eingecheckt}\n      neu:         ${z.neu}`);
      }
      gut = false;
    } else {
      console.log(`${name}: gleich`);
    }
  }
  process.exit(gut ? 0 : 1);
}

module.exports = { findeAnlagen, pruefeAnlage, mitLf };

if (require.main === module) main();
