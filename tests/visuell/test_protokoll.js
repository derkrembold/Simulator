// Interaktions-Tests für das Prüfprotokoll (view/protokoll.js). Erste
// Ausbaustufe: rein Ein-/Ankreuzbar, keine Verknüpfung zu Messwerten - Tests
// prüfen deshalb nur Struktur (Breite, Spaltenzahl, Scroll-Notwendigkeit)
// und die beiden Interaktionen (Text eintragen, Kästchen togglen). Aufruf:
// node tests/visuell/test_protokoll.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

function starteServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPfad = decodeURIComponent(req.url.split('?')[0]);
      const dateiPfad = path.join(PROJEKT_ROOT, urlPfad === '/' ? '/index.html' : urlPfad);
      fs.readFile(dateiPfad, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
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
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForSelector('#protokoll .pf-blatt');
    return page;
  }

  await pruefe('Protokoll: Breite entspricht der gerenderten Schaltkasten-Breite', async () => {
    const page = await neueSeite();
    const breiten = await page.evaluate(() => ({
      schaltkasten: document.querySelector('#schaltkasten svg').getAttribute('width'),
      protokoll: getComputedStyle(document.getElementById('protokoll')).width.replace('px', '')
    }));
    if (breiten.schaltkasten !== breiten.protokoll) {
      throw new Error(`erwarte Protokoll-Breite ${breiten.schaltkasten}px, gefunden ${breiten.protokoll}px`);
    }
    await page.close();
  });

  // Absichtlich ein breiterer Viewport als die Schaltkasten-Breite - sonst
  // fällt ein zentrierender `margin: auto` (siehe ARCHITEKTUR.md, dortiger
  // "Linksbündig, nicht zentriert"-Abschnitt) nicht auf, weil der Container
  // ohnehin schon die volle verfügbare Breite einnimmt.
  await pruefe('Protokoll: linke Kante steht bündig unter der Schaltkasten-Kante (nicht zentriert)', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForSelector('#protokoll .pf-blatt');
    const positionen = await page.evaluate(() => ({
      schaltkasten: document.getElementById('schaltkasten').getBoundingClientRect().left,
      protokoll: document.getElementById('protokoll').getBoundingClientRect().left
    }));
    if (positionen.schaltkasten !== positionen.protokoll) {
      throw new Error(`erwarte gleiche linke Kante (${positionen.schaltkasten}px), Protokoll steht bei ${positionen.protokoll}px`);
    }
    await page.close();
  });

  await pruefe('Protokoll: Kästchen togglen unabhängig zwischen ☐ und ☒', async () => {
    const page = await neueSeite();
    const cb = page.locator('#protokoll .pf-cb').first();
    const start = await cb.textContent();
    if (start !== '☐') throw new Error(`erwarte Startzustand ☐, gefunden ${start}`);
    await cb.click();
    if ((await cb.textContent()) !== '☒') throw new Error('Kästchen sollte nach Klick ☒ zeigen');
    await cb.click();
    if ((await cb.textContent()) !== '☐') throw new Error('Kästchen sollte nach 2. Klick wieder ☐ zeigen');

    // Ein zweites Kästchen bleibt beim Togglen des ersten unberührt (keine
    // Radio-Gruppe, jede Option unabhängig ankreuzbar).
    const zweitesCb = page.locator('#protokoll .pf-cb').nth(1);
    await cb.click();
    if ((await zweitesCb.textContent()) !== '☐') {
      throw new Error('anderes Kästchen sollte unberührt bleiben');
    }
    await page.close();
  });

  await pruefe('Protokoll: Text lässt sich in ein Eingabefeld eintragen', async () => {
    const page = await neueSeite();
    const nrFeld = page.locator('#protokoll input.pf-feld').first();
    await nrFeld.fill('12345');
    if ((await nrFeld.inputValue()) !== '12345') throw new Error('Eingabe wurde nicht übernommen');
    await page.close();
  });

  await pruefe('Protokoll: Stromkreisverteiler-Tabelle hat 20 Spalten, 11 Datenzeilen, und braucht horizontalen Scroll', async () => {
    const page = await neueSeite();
    const info = await page.evaluate(() => {
      const scrollDiv = document.querySelector('#protokoll .pf-scroll');
      const tabelle = scrollDiv.querySelector('table');
      return {
        spalten: tabelle.rows[0].cells.length,
        zeilen: tabelle.rows.length,
        brauchtScroll: scrollDiv.scrollWidth > scrollDiv.clientWidth,
        ersteZielbezeichnung: tabelle.rows[1].cells[1].querySelector('input').value
      };
    });
    if (info.spalten !== 20) throw new Error(`erwarte 20 Spalten, gefunden ${info.spalten}`);
    if (info.zeilen !== 12) throw new Error(`erwarte 12 Zeilen (1 Kopf + 11 Daten), gefunden ${info.zeilen}`);
    if (!info.brauchtScroll) throw new Error('Tabelle sollte breiter als der Scroll-Container sein');
    if (info.ersteZielbezeichnung !== 'Hauptleitung') {
      throw new Error(`erste Zeile sollte "Hauptleitung" vorausgefüllt haben, gefunden "${info.ersteZielbezeichnung}"`);
    }
    await page.close();
  });

  await pruefe('Protokoll: Besichtigen-Tabelle enthält alle 14 Prüfpunkte aus Prüfprotokoll.md', async () => {
    const page = await neueSeite();
    const anzahl = await page.evaluate(() => {
      const tabellen = [...document.querySelectorAll('#protokoll .pf-tabelle')];
      const besichtigen = tabellen.find((t) => t.rows[0].cells[0].textContent === 'Prüfpunkt' && t.rows[0].cells.length === 4);
      return besichtigen.rows.length - 1; // minus Kopfzeile
    });
    if (anzahl !== 14) throw new Error(`erwarte 14 Prüfpunkte in Besichtigen, gefunden ${anzahl}`);
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
