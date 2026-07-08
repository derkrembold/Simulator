const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { generiereAnlage } = require('./generate_anlage.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const TESTCASE_ORDNER = __dirname;

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

function normalisiere(svgText) {
  return svgText.trim().replace(/\s+/g, ' ');
}

// Prüft, ob die eingecheckte anlage.json noch exakt dem entspricht, was der
// Generator aktuell aus netzplan.md + bauteile.md erzeugen würde. Verhindert,
// dass anlage.json (und damit die gerenderten Schrauben-Werte/Popups) vom
// Netzplan wegdriftet, z.B. nach manuellen Netzplan-Änderungen ohne erneutes
// Promoten. Testcases ohne netzplan.md werden übersprungen (keine Quelle
// vorhanden, mit der verglichen werden könnte).
function pruefeNetzplanKonsistenz(testcaseOrdner) {
  const netzplanPfad = path.join(testcaseOrdner, 'netzplan.md');
  const bauteilePfad = path.join(testcaseOrdner, 'bauteile.md');
  if (!fs.existsSync(netzplanPfad) || !fs.existsSync(bauteilePfad)) return null;

  const anlagePfad = path.join(testcaseOrdner, 'anlage.json');
  if (!fs.existsSync(anlagePfad)) return { bestanden: false, meldung: 'keine anlage.json vorhanden' };

  const erwartet = generiereAnlage(testcaseOrdner);
  const tatsaechlich = JSON.parse(fs.readFileSync(anlagePfad, 'utf8'));

  const erwartetJson = JSON.stringify(erwartet, null, 2);
  const tatsaechlichJson = JSON.stringify(tatsaechlich, null, 2);
  if (erwartetJson === tatsaechlichJson) return { bestanden: true };

  return {
    bestanden: false,
    meldung: 'anlage.json weicht vom generierten Netzplan ab (npm run generate + promoten?)'
  };
}

async function renderTestcase(page, port, testcaseName) {
  const jsonPfad = `tests/visuell/${testcaseName}/anlage.json`;
  const html = `<!DOCTYPE html>
<html>
<head><base href="http://localhost:${port}/"><meta charset="UTF-8"></head>
<body>
  <div id="schaltkasten"></div>
  <script type="module">
    import { Anlage } from './model/anlage.js';
    import { SchaltkastenView } from './view/schaltkasten.js';

    const container = document.getElementById('schaltkasten');
    const anlage = await Anlage.laden('${jsonPfad}');
    SchaltkastenView.render(anlage, container, () => {});
    document.title = 'gerendert';
  </script>
</body>
</html>`;

  await page.goto(`http://localhost:${port}/`);
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => document.title === 'gerendert', { timeout: 5000 });
  await page.waitForSelector('#schaltkasten svg');

  return page.locator('#schaltkasten svg').evaluate((el) => {
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return el.outerHTML;
  });
}

async function main() {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const testcases = fs.readdirSync(TESTCASE_ORDNER, { withFileTypes: true })
    .filter((eintrag) => eintrag.isDirectory())
    .map((eintrag) => eintrag.name)
    .sort();

  let alleBestanden = true;

  for (const testcase of testcases) {
    const testcaseOrdner = path.join(TESTCASE_ORDNER, testcase);

    const netzplanCheck = pruefeNetzplanKonsistenz(testcaseOrdner);
    if (netzplanCheck && !netzplanCheck.bestanden) {
      console.log(`${testcase}: FAIL (Netzplan) – ${netzplanCheck.meldung}`);
      alleBestanden = false;
      continue;
    }

    const referenzPfad = path.join(testcaseOrdner, 'anlage.svg');
    if (!fs.existsSync(referenzPfad)) {
      console.log(`${testcase}: UEBERSPRUNGEN (keine anlage.svg)`);
      continue;
    }

    try {
      const gerendert = await renderTestcase(page, port, testcase);
      const referenz = fs.readFileSync(referenzPfad, 'utf8');
      const bestanden = normalisiere(gerendert) === normalisiere(referenz);
      const netzplanHinweis = netzplanCheck ? ' [Netzplan OK]' : '';
      console.log(`${testcase}: ${bestanden ? 'PASS' : 'FAIL'}${netzplanHinweis}`);
      if (!bestanden) alleBestanden = false;
    } catch (err) {
      console.log(`${testcase}: FEHLER (${err.message})`);
      alleBestanden = false;
    }
  }

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
