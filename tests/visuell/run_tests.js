const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

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
    const referenzPfad = path.join(TESTCASE_ORDNER, testcase, 'anlage.svg');
    if (!fs.existsSync(referenzPfad)) {
      console.log(`${testcase}: UEBERSPRUNGEN (keine anlage.svg)`);
      continue;
    }

    try {
      const gerendert = await renderTestcase(page, port, testcase);
      const referenz = fs.readFileSync(referenzPfad, 'utf8');
      const bestanden = normalisiere(gerendert) === normalisiere(referenz);
      console.log(`${testcase}: ${bestanden ? 'PASS' : 'FAIL'}`);
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
