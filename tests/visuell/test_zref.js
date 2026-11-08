// Tests für die Zref-Messung mit der CAL-Taste (sim-liq) und die
// Vorimpedanz aus anlage.json. Aufruf: node tests/visuell/test_zref.js
//
// Bedient das Messgerät über dieselben Schritte wie das Fahrplan-Replay
// (fuehreSchrittAus() aus controller/fahrplan_ausfuehrung.js), damit die
// Tests unabhängig von festen Klick-Koordinaten bleiben.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const TESTCASE = 'testcase_05';
const anlage = require(path.join(PROJEKT_ROOT, 'tests', 'visuell', TESTCASE, 'anlage.json'));

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

function erwarteGleich(ist, soll, kontext) {
  if (ist !== soll) throw new Error(`${kontext}: erwarte ${JSON.stringify(soll)}, gefunden ${JSON.stringify(ist)}`);
}

// Referenzstelle nach dem Hauptschalter (wie zrefAdern() im Werkzeug):
// L1-Ausgang des Hauptschalters, N über die N-Klemme (3-poliger
// Hauptschalter ohne N-Pol).
const L_NACH_HS = anlage.hauptsicherung.ausgang.leitung.adern.find((a) => a.funktion === 'L1').netz;
const N_NETZ = anlage.n_klemme.eingang.leitung.adern[0].netz;
// Steckdose SK2 (einphasig hinter RCD2), für Zi an der Endstelle.
const SK2 = anlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise).find((s) => s.bezeichnung === 'SK2');
const netzVon = (sk, funktion) => sk.leitung.adern.find((a) => a.funktion === funktion).netz;

async function main() {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();

  // `vorimpedanz`: wird per Request-Umleitung in die ausgelieferte
  // anlage.json geschrieben (undefined = Datei unverändert).
  async function neueSeite(vorimpedanz) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    if (vorimpedanz !== undefined) {
      await page.route(`**/tests/visuell/${TESTCASE}/anlage.json`, (route) => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ ...anlage, vorimpedanz_ohm: vorimpedanz })
      }));
    }
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/${TESTCASE}/anlage.json`);
    await page.waitForSelector('#schraubendreher svg');
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.waitForTimeout(50);
    return page;
  }

  // Führt Fahrplan-Schritte im Browser aus.
  async function schritte(page, liste) {
    await page.evaluate(async (liste) => {
      const { fuehreSchrittAus } = await import('/controller/fahrplan_ausfuehrung.js');
      for (const s of liste) fuehreSchrittAus(s);
    }, liste);
    await page.waitForTimeout(50);
  }

  const displayText = (page, anfang) => page.evaluate((anfang) =>
    [...document.querySelectorAll('#messgeraet svg text')].map((t) => t.textContent).find((t) => t.startsWith(anfang)) ?? null, anfang);

  const zrefMessen = [
    { funktion: 'drehknopfAufModus', argumente: ['ZI'] },
    { funktion: 'wechsleAnsicht', argumente: [] },
    { funktion: 'messspitzeSetzen', argumente: [{ netz: L_NACH_HS }] },
    { funktion: 'messspitzeSetzen', argumente: [{ netz: N_NETZ }] },
    { funktion: 'messspitzeSetzen', argumente: [{ bauteil: 'PE-Klemme' }] },
    { funktion: 'calDruecken', argumente: [] }
  ];

  await pruefe('Vor der ersten CAL-Messung zeigt Zref ___', async () => {
    const page = await neueSeite();
    await schritte(page, zrefMessen.slice(0, 2));
    erwarteGleich(await displayText(page, 'Zref:'), 'Zref: ___Ω', 'Anzeige');
    await page.close();
  });

  await pruefe('CAL ohne Eintrag in anlage.json: Zref = 0,14 Ω (Default-Vorimpedanz)', async () => {
    const page = await neueSeite();
    await schritte(page, zrefMessen);
    erwarteGleich(await displayText(page, 'Zref:'), 'Zref: 0,14Ω', 'Anzeige');
    await page.close();
  });

  await pruefe('CAL mit vorimpedanz_ohm = 0,25 in anlage.json: Zref = 0,25 Ω', async () => {
    const page = await neueSeite(0.25);
    await schritte(page, zrefMessen);
    erwarteGleich(await displayText(page, 'Zref:'), 'Zref: 0,25Ω', 'Anzeige');
    await page.close();
  });

  // Zi an der Steckdose SK2 mit Default- und erhöhter Vorimpedanz: die
  // Differenz muss genau die Änderung der Vorimpedanz sein (0,11 Ω).
  await pruefe('Vorimpedanz aus anlage.json fließt auch in Zi ein', async () => {
    const ziAnSk2 = async (vorimpedanz) => {
      const page = await neueSeite(vorimpedanz);
      await schritte(page, [
        { funktion: 'drehknopfAufModus', argumente: ['ZI'] },
        { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'L1') }] },
        { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'N') }] },
        { funktion: 'messspitzeSetzen', argumente: [{ bauteil: 'PE-Klemme' }] },
        { funktion: 'testDruecken', argumente: [] }
      ]);
      const text = await displayText(page, 'Z:');
      await page.close();
      return parseFloat(text.replace('Z:', '').replace(',', '.'));
    };
    const standard = await ziAnSk2();
    const erhoeht = await ziAnSk2(0.25);
    erwarteGleich(Math.round((erhoeht - standard) * 100) / 100, 0.11, 'Differenz Zi');
  });

  // Codex-Review zu sim-liq: CAL muss wirklich messen, nicht nur die
  // Vorimpedanz übernehmen - an der Steckdose SK2 (mit Fehlerwiderständen
  // auf dem Pfad) muss Zref genau Zi an derselben Stelle sein.
  await pruefe('CAL an einer Stelle mit Pfadwiderstand: Zref = Zi dort (nicht nur Vorimpedanz)', async () => {
    const page = await neueSeite();
    const sonden = [
      { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'L1') }] },
      { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'N') }] },
      { funktion: 'messspitzeSetzen', argumente: [{ bauteil: 'PE-Klemme' }] }
    ];
    await schritte(page, [{ funktion: 'drehknopfAufModus', argumente: ['ZI'] }, ...sonden, { funktion: 'testDruecken', argumente: [] }]);
    const zi = (await displayText(page, 'Z:')).replace('Z:', '');
    await schritte(page, [{ funktion: 'wechsleAnsicht', argumente: [] }, { funktion: 'calDruecken', argumente: [] }]);
    const zref = (await displayText(page, 'Zref:')).replace('Zref: ', '');
    erwarteGleich(zref, zi, 'Zref an SK2');
    if (zref === '0,14Ω') throw new Error('Zref an SK2 ist nur die Vorimpedanz - erwartet war ein höherer Wert');
    await page.close();
  });

  await pruefe('CAL bei ausgeschaltetem Hauptschalter: Zref bleibt leer', async () => {
    const page = await neueSeite();
    await schritte(page, [{ funktion: 'hebelSchalten', argumente: [anlage.hauptsicherung.name] }, ...zrefMessen]);
    erwarteGleich(await displayText(page, 'Zref:'), 'Zref: ___Ω', 'Anzeige bei offenem Hauptschalter');
    await page.close();
  });

  await pruefe('CAL außerhalb der ΔU-Ansicht wirkt nicht', async () => {
    const page = await neueSeite();
    await schritte(page, [
      { funktion: 'drehknopfAufModus', argumente: ['ZI'] },
      ...zrefMessen.slice(2),
      { funktion: 'wechsleAnsicht', argumente: [] }
    ]);
    erwarteGleich(await displayText(page, 'Zref:'), 'Zref: ___Ω', 'Anzeige nach CAL in der Zl-Ansicht');
    await page.close();
  });

  await pruefe('Zref bleibt gespeichert, auch nach anderem Modus und zurück', async () => {
    const page = await neueSeite();
    await schritte(page, [
      ...zrefMessen,
      { funktion: 'drehknopfAufModus', argumente: ['ZS'] },
      { funktion: 'drehknopfAufModus', argumente: ['ZI'] },
      { funktion: 'wechsleAnsicht', argumente: [] }
    ]);
    erwarteGleich(await displayText(page, 'Zref:'), 'Zref: 0,14Ω', 'Anzeige nach Moduswechsel');
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
