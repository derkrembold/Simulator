// Tests für die Zref-Messung mit der CAL-Taste (sim-liq), die Vorimpedanz
// aus anlage.json und den Spannungsfall ΔU (sim-lgf). Aufruf: node
// tests/visuell/test_zref.js
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

  // --- Spannungsfall ΔU (sim-lgf) ---
  const ampel = (page) => page.evaluate(() =>
    [...document.querySelectorAll('#messgeraet svg rect')]
      .filter((r) => r.getAttribute('width') === '6' && r.getAttribute('height') === '190')
      .map((r) => r.getAttribute('fill')));
  const zahl = (text, label, einheit) => parseFloat(text.replace(label, '').replace(einheit, '').replace(',', '.'));
  // An SK2 in der ΔU-Ansicht TEST (Bemessungsstrom wählbar).
  const deltaUAnSk2 = (bemessungsstrom) => [
    { funktion: 'drehknopfAufModus', argumente: ['ZI'] },
    { funktion: 'stelleEin', argumente: ['bemessungsstrom', bemessungsstrom] },
    { funktion: 'wechsleAnsicht', argumente: [] },
    { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'L1') }] },
    { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'N') }] },
    { funktion: 'messspitzeSetzen', argumente: [{ bauteil: 'PE-Klemme' }] },
    { funktion: 'testDruecken', argumente: [] }
  ];

  // Zref messen, dann Messgerät aus/ein: entfernt die CAL-Messspitzen (wie
  // frische Sonden zwischen zwei Replay-Abschnitten), Zref bleibt
  // gespeichert.
  async function zrefUndNeueSonden(page) {
    await schritte(page, zrefMessen);
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.getByText('ON/OFF', { exact: true }).click();
  }

  // Codex-Review zu sim-lgf: Ampel und Protokoll bewerten denselben,
  // angezeigten (auf zwei Stellen gerundeten) Wert - auch knapp am Grenzwert.
  await pruefe('berechneSpannungsfall: Bewertung des angezeigten Werts knapp am Grenzwert', async () => {
    const page = await neueSeite();
    const ergebnisse = await page.evaluate(async () => {
      const { berechneSpannungsfall } = await import('/model/spannungsfall.js');
      return [
        berechneSpannungsfall(0.6437, 0.14, 16, 3.5), // 3,504 % -> 3,50 %
        berechneSpannungsfall(0.6439, 0.14, 16, 3.5), // 3,506 % -> 3,51 %
        berechneSpannungsfall(0.67, 0.14, 20, 3.5) // 4,61 %
      ].map((e) => `${e.prozent}:${e.io}`);
    });
    erwarteGleich(ergebnisse.join(' '), '3.5:true 3.51:false 4.61:false', 'Ergebnisse');
    await page.close();
  });

  await pruefe('ΔU = (Z - Zref) * In / 230 V * 100, Isc und Z in der ΔU-Ansicht', async () => {
    const page = await neueSeite();
    await zrefUndNeueSonden(page);
    await schritte(page, deltaUAnSk2('20A'));
    const z = zahl(await displayText(page, 'Z:'), 'Z:', 'Ω');
    const deltaU = zahl(await displayText(page, 'ΔU:'), 'ΔU:', '%');
    const isc = zahl(await displayText(page, 'Isc:'), 'Isc:', 'A');
    erwarteGleich(Math.round(deltaU * 100) / 100, Math.round(((z - 0.14) * 20 / 230) * 10000) / 100, 'ΔU');
    erwarteGleich(Math.round(isc * 10) / 10, Math.round((0.9 * 230 / z) * 10) / 10, 'Isc');
    await page.close();
  });

  await pruefe('ΔU-Ampel: über dem Grenzwert rot, darunter grün', async () => {
    const messe = async (bemessungsstrom) => {
      const page = await neueSeite();
      await zrefUndNeueSonden(page);
      await schritte(page, deltaUAnSk2(bemessungsstrom));
      const ergebnis = { deltaU: await displayText(page, 'ΔU:'), ampel: (await ampel(page)).join() };
      await page.close();
      return ergebnis;
    };
    // Grenzwert-Default 4,0 %: SK2 mit 16 A ca. 3,7 % (grün), mit 20 A ca. 4,6 % (rot).
    const klein = await messe('16A');
    const gross = await messe('20A');
    // Beide Leuchten müssen umspringen: unter dem Grenzwert rechts (grün)
    // an und links aus, darüber umgekehrt.
    const [linksKlein, rechtsKlein] = klein.ampel.split(',');
    const [linksGross, rechtsGross] = gross.ampel.split(',');
    if (linksKlein === linksGross || rechtsKlein === rechtsGross) {
      throw new Error(`Ampel springt nicht um: ${klein.deltaU} -> ${klein.ampel}, ${gross.deltaU} -> ${gross.ampel}`);
    }
  });

  await pruefe('ΔU ohne Zref: ΔU bleibt ___, Z wird angezeigt', async () => {
    const page = await neueSeite();
    await schritte(page, deltaUAnSk2('16A'));
    erwarteGleich(await displayText(page, 'ΔU:'), 'ΔU: ___%', 'ΔU ohne Zref');
    if ((await displayText(page, 'Z:')) === 'Z:___Ω') throw new Error('Z fehlt trotz TEST');
    await page.close();
  });

  await pruefe('TEST in der Zl-Ansicht setzt keinen ΔU-Wert', async () => {
    const page = await neueSeite();
    await zrefUndNeueSonden(page);
    await schritte(page, [
      { funktion: 'drehknopfAufModus', argumente: ['ZI'] },
      { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'L1') }] },
      { funktion: 'messspitzeSetzen', argumente: [{ netz: netzVon(SK2, 'N') }] },
      { funktion: 'messspitzeSetzen', argumente: [{ bauteil: 'PE-Klemme' }] },
      { funktion: 'testDruecken', argumente: [] },
      { funktion: 'wechsleAnsicht', argumente: [] }
    ]);
    erwarteGleich(await displayText(page, 'ΔU:'), 'ΔU: ___%', 'ΔU nach TEST in Zl');
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
