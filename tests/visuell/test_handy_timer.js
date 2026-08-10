// Tests für die Timer/Self-Test-App im Handy (view/handy.js
// zeichneTimerBereit(), controller/app.js). Aufruf: node
// tests/visuell/test_handy_timer.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

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

async function main() {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();

  async function neueSeite() {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/testcase_04/anlage.json`);
    await page.waitForSelector('#schraubendreher svg');
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.waitForTimeout(100);
    return page;
  }

  // Für die Countdown-Tests: Playwrights virtuelle Uhr (`page.clock`)
  // installiert, BEVOR die Seite lädt - lässt echte 45 Minuten in
  // Millisekunden simulieren (`clock.runFor()`), statt in Tests wirklich
  // 45 Minuten zu warten. Bewusst NICHT für die beiden Tests oben
  // verwendet (die brauchen echtes `page.waitForTimeout()`, um den echten
  // 2-Sekunden-Replay-Takt abzuwarten - eine installierte Fake-Uhr würde
  // dessen `setInterval` einfrieren, bis `clock.runFor()` explizit
  // aufgerufen wird).
  async function neueSeiteMitUhr() {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.clock.install();
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/testcase_04/anlage.json`);
    await page.waitForSelector('#schraubendreher svg');
    return page;
  }

  function anzahlMessspitzen(page) {
    return page.evaluate(() => document.querySelectorAll('#schaltkasten svg circle[r="7"]').length);
  }

  function zeitText(page) {
    return page.evaluate(() => {
      const alle = [...document.querySelectorAll('#handy svg text')];
      return alle.find((t) => /^\d{2}:\d{2}$/.test(t.textContent))?.textContent;
    });
  }

  function ringPfad(page) {
    return page.evaluate(() => document.querySelector('#handy svg path[stroke="#0082f5"]')?.getAttribute('d') ?? null);
  }

  // Play-Button zeigt ein Dreieck (<path>), Pause zwei Balken (<rect>) -
  // siehe zeichneTimerBereit() in view/handy.js. Anders als beim Replay
  // (bereit: 3 klickbare Gruppen, läuft: 2) bleibt die ANZAHL beim Timer
  // in beiden Zuständen gleich (bereit: Play+X, läuft: Pause+X, je 2) -
  // die Button-Anzahl allein kann "bereit" also nicht von "läuft"
  // unterscheiden, deshalb hier direkt am Glyph geprüft.
  function zeigtPlayDreieck(page) {
    return page.evaluate(() => {
      const gruppen = [...document.querySelectorAll('#handy svg g')];
      const playPause = gruppen.find((g) => g.querySelector('rect[fill="#0082fe"]'));
      return !!playPause?.querySelector('path');
    });
  }

  // Regressionstest für den Bug vom 2026-08-10 (gefunden beim Vorbereiten
  // des echten Timer-Countdowns): view/handy.js reicht dasselbe
  // `callbacks`-Objekt an zeichneReplayBereit() UND zeichneTimerBereit()
  // weiter (siehe HandyView.render()) - mit gemeinsamen Namen
  // `onPlayKlick`/`onPauseKlick` löste ein Play-Klick im TIMER unsichtbar
  // den REPLAY-Handler in controller/app.js aus (führte im Hintergrund
  // echte Fahrplan-Schritte am Schaltkasten aus, obwohl der sichtbare
  // Screen der Timer war). Fix: App-spezifische Namen
  // (`onReplayPlayKlick`/`onReplayPauseKlick` vs. `onTimerPlayKlick`/
  // `onTimerPauseKlick`).
  await pruefe('Play im Timer-Screen führt KEINEN Fahrplan-Schritt im Schaltkasten aus', async () => {
    const page = await neueSeite();
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Timer-Icon
    await page.waitForTimeout(80);
    const vorher = await anzahlMessspitzen(page);

    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Play (Timer)
    // Länger als ein Replay-Taktzyklus warten (2000ms) - falls der Bug
    // vorläge, wäre bis hierhin mindestens ein messspitzeSetzen-Schritt
    // ausgeführt worden.
    await page.waitForTimeout(2300);
    const nachher = await anzahlMessspitzen(page);

    if (nachher !== vorher) {
      throw new Error(`Messspitzen-Anzahl änderte sich von ${vorher} auf ${nachher} - Timer-Play hat einen Fahrplan-Schritt ausgelöst`);
    }
    await page.close();
  });

  // Regressionscheck daneben: Replay-Play muss weiterhin normal
  // funktionieren (nicht versehentlich durch die Umbenennung mit-kaputt).
  await pruefe('Play im Replay-Screen führt weiterhin Fahrplan-Schritte automatisch aus', async () => {
    const page = await neueSeite();
    await page.locator('#handy svg g[style*="cursor"]').last().click(); // Replay-Icon
    await page.waitForTimeout(80);
    const vorher = await anzahlMessspitzen(page);

    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Play (Replay)
    await page.waitForTimeout(2300);
    const nachher = await anzahlMessspitzen(page);

    if (nachher <= vorher) {
      throw new Error(`Messspitzen-Anzahl blieb bei ${vorher} - Replay-Play hat keinen Schritt ausgeführt`);
    }
    await page.close();
  });

  // Echter Countdown (2026-08-10): Ring schrumpft, Zahl zählt runter.
  // Playwrights virtuelle Uhr lässt den vollen 45-Minuten-Ablauf in einem
  // einzigen `clock.runFor()`-Aufruf simulieren.
  await pruefe('Countdown zählt korrekt runter, ohne Sofort-Dekrement bei Play', async () => {
    const page = await neueSeiteMitUhr();
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Timer-Icon
    await page.waitForTimeout(50);
    if ((await zeitText(page)) !== '45:00') throw new Error(`Start-Anzeige falsch: ${await zeitText(page)}`);
    const ringVorher = await ringPfad(page);
    if (!ringVorher) throw new Error('Ring bei voller Restzeit nicht vorhanden');

    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Play
    await page.waitForTimeout(50);
    if ((await zeitText(page)) !== '45:00') throw new Error('Anzeige sofort nach Play bereits verändert (kein Sofort-Dekrement erwartet)');

    await page.clock.runFor(3000);
    await page.waitForTimeout(50);
    if ((await zeitText(page)) !== '44:57') throw new Error(`Nach 3s erwartet 44:57, gefunden ${await zeitText(page)}`);
    if ((await ringPfad(page)) === ringVorher) throw new Error('Ring hat sich nach 3s nicht verändert');
    await page.close();
  });

  await pruefe('Pause stoppt den Countdown zuverlässig', async () => {
    const page = await neueSeiteMitUhr();
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Timer
    await page.waitForTimeout(50);
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Play
    await page.waitForTimeout(50);
    await page.clock.runFor(3000);
    await page.waitForTimeout(50);
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Pause
    await page.waitForTimeout(50);
    const stand = await zeitText(page);

    await page.clock.runFor(5000);
    await page.waitForTimeout(50);
    if ((await zeitText(page)) !== stand) throw new Error(`Anzeige änderte sich trotz Pause: ${stand} -> ${await zeitText(page)}`);
    await page.close();
  });

  await pruefe('Kompletter Ablauf stoppt automatisch bei 00:00 und zeigt wieder Play', async () => {
    const page = await neueSeiteMitUhr();
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Timer
    await page.waitForTimeout(50);
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Play
    await page.waitForTimeout(50);

    await page.clock.runFor(45 * 60 * 1000);
    await page.waitForTimeout(100);
    if ((await zeitText(page)) !== '00:00') throw new Error(`Erwartet 00:00, gefunden ${await zeitText(page)}`);
    if (await ringPfad(page)) throw new Error('Ring sollte bei 00:00 nicht mehr gezeichnet sein');
    if (!(await zeigtPlayDreieck(page))) throw new Error('Play-Button erscheint nach Ablauf nicht wieder');
    await page.close();
  });

  await pruefe('Erneutes Öffnen der Timer-App setzt die Restzeit auf 45:00 zurück', async () => {
    const page = await neueSeiteMitUhr();
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Timer
    await page.waitForTimeout(50);
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Play
    await page.waitForTimeout(50);
    await page.clock.runFor(10000);
    await page.waitForTimeout(50);

    await page.locator('#handy svg g[style*="cursor"]').nth(1).click(); // X -> Homescreen (waehrend Countdown laeuft)
    await page.waitForTimeout(50);
    await page.locator('#handy svg g[style*="cursor"]').nth(0).click(); // Timer erneut oeffnen
    await page.waitForTimeout(50);
    if ((await zeitText(page)) !== '45:00') throw new Error(`Erwartet Reset auf 45:00, gefunden ${await zeitText(page)}`);
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
