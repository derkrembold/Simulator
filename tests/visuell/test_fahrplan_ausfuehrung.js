// Regressionstest für controller/fahrplan_ausfuehrung.js (Ein-Schritt-
// Ausführer) UND tools/pruefprotokoll_erstellung.js (Fahrplan-Generator)
// zusammen: klickt für ALLE SECHS Testcases den Handy-Schritt-Button so oft
// wie der jeweilige Fahrplan Schritte hat - ganz ohne jeden manuellen
// Eingriff, genau wie ein Nutzer es am Handy tun würde. Zwei Prüfungen pro
// Durchlauf:
//   1. Nach JEDEM `testDruecken`-Schritt: kein Platzhalter (`---`/`___`)
//      mehr im Display (2026-08-06, ursprüngliche Fassung dieses Tests).
//   2. Nach JEDEM `leseWert`- UND `stelleEin`-Schritt: der erwartete Wert
//      steht TATSÄCHLICH im Display (2026-08-07 ergänzt, siehe unten).
//
// Wertevergleich, Herkunft der Sollwerte (KEIN separater Soll-Ist-Datensatz
// nötig): `fahrplan.json`s `leseWert`-Schritte tragen bereits ein
// `ergebnis`-Feld - den beim AUFZEICHNEN (tools/pruefprotokoll_erstellung.js
// über tools/messgeraet_steuerung.js) tatsächlich abgelesenen Wert (z.B.
// `"Z:0,54Ω"`). Ein frischer Replay-Durchlauf MUSS beim selben Schritt
// exakt denselben String erneut anzeigen - andernfalls hat sich der
// Ausführer (oder die zugrundeliegende Berechnung) seit der Aufzeichnung
// unbemerkt geändert. `stelleEin`-Schritte tragen ihren Zielwert direkt in
// `argumente[1]` - nach der Ausführung muss dieser String im Display
// auftauchen (prüft die Zone-Navigation UND Werte-Auswahl selbst, siehe
// ARCHITEKTUR.md "stelleEin").
//
// Ursprünglich (2026-08-06) bewusst NUR "kein Platzhalter", kein
// Wertevergleich - Begründung damals: `fahrplan.json` nutzt dieselbe
// Berechnungslogik, die test_pruefprotokoll.js schon gegen bauteile.md
// verifiziert, ein zweiter Vergleich wäre redundant. Das stimmt für die
// eigentliche MESSUNG (hauptmesswert etc.), aber NICHT für Settable-Felder
// wie `stelleEin` (LS-Typ, Bemessungsstrom, RCD-Fehlerstrom/-Typ) - die
// beeinflussen nur den angezeigten Vergleichswert ("Lim" etc.), nicht die
// Messung selbst, UND werden nirgends offiziell im Prüfprotokoll erfasst.
// Der `stelleEin`-Bug vom 2026-08-07 (Zone falsch navigiert -> falscher
// Vergleichswert im Display, aber kein Platzhalter) hätte die ursprüngliche
// Fassung dieses Tests NICHT gefangen - deshalb jetzt ergänzt.
//
// Aufruf: node tests/visuell/test_fahrplan_ausfuehrung.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const TESTCASES = ['testcase_01', 'testcase_02', 'testcase_03', 'testcase_04', 'testcase_05', 'testcase_06'];

function starteServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPfad = decodeURIComponent(req.url.split('?')[0]);
      const dateiPfad = path.join(PROJEKT_ROOT, urlPfad === '/' ? '/index.html' : urlPfad);
      fs.readFile(dateiPfad, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME_TYPEN[path.extname(dateiPfad)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

let alleBestanden = true;

async function pruefe(name, fn) {
  try {
    await fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.log(`${name}: FAIL – ${err.message}`);
    alleBestanden = false;
  }
}

async function displayTexte(page) {
  return page.evaluate(() => [...document.querySelectorAll('#messgeraet svg text')].map((t) => t.textContent));
}

async function main() {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();

  for (const testcase of TESTCASES) {
    const fahrplan = require(path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase, 'fahrplan.json'));
    const flach = [];
    fahrplan.abschnitte.forEach((abschnitt) => abschnitt.schritte.forEach((schritt) => flach.push({ ...schritt, abschnittTitel: abschnitt.titel })));

    await pruefe(`${testcase}: kompletter Fahrplan (${flach.length} Schritte) läuft über den Handy-Schritt-Button korrekt durch`, async () => {
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(String(e)));

      await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/${testcase}/anlage.json`);
      await page.waitForSelector('#schraubendreher svg');
      await page.getByText('ON/OFF', { exact: true }).click();
      await page.waitForTimeout(100);

      await page.locator('#handy svg g[style*="cursor"]').last().click(); // Replay-Icon
      await page.waitForTimeout(100);
      const schrittButton = page.locator('#handy svg g[style*="cursor"]').nth(1);

      for (const schritt of flach) {
        await schrittButton.click();
        await page.waitForTimeout(20);

        if (schritt.funktion === 'testDruecken') {
          const texte = await displayTexte(page);
          const platzhalter = texte.filter((t) => t?.includes('---') || t?.includes('___'));
          if (platzhalter.length > 0) {
            throw new Error(`${schritt.abschnittTitel}: Platzhalter nach testDruecken noch vorhanden (${JSON.stringify(platzhalter)})`);
          }
        }

        if (schritt.funktion === 'leseWert' && schritt.ergebnis !== null) {
          const texte = await displayTexte(page);
          if (!texte.includes(schritt.ergebnis)) {
            throw new Error(`${schritt.abschnittTitel}: leseWert("${schritt.argumente[0]}") erwartet "${schritt.ergebnis}", nicht im Display gefunden (${JSON.stringify(texte)})`);
          }
        }

        if (schritt.funktion === 'stelleEin') {
          const zielWert = schritt.argumente[1];
          const texte = await displayTexte(page);
          if (!texte.includes(zielWert)) {
            throw new Error(`${schritt.abschnittTitel}: stelleEin("${schritt.argumente[0]}", "${zielWert}") - Zielwert nicht im Display gefunden (${JSON.stringify(texte)})`);
          }
        }
      }

      if (fehler.length > 0) throw new Error(`Browser-Fehler: ${fehler.join('; ')}`);
      await page.close();
    });
  }

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
