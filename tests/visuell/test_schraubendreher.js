// Tests für das Schraubendreher-Werkzeug (view/schraubendreher.js,
// onSchraubeKlick() in controller/app.js). Darstellung in der Werkzeugzeile,
// Aufnehmen/Lösen/Wiedereindrehen, Einschränkungen, UND die tatsächliche
// Kanten-Kappung im Verbindungsgraphen (siehe KONZEPT.md "Schrauben lösen").
// Aufruf: node tests/visuell/test_schraubendreher.js

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
    await page.waitForSelector('#schraubendreher svg');
    return page;
  }

  // Für die Lösen-Interaktion wird ein echter Testcase gebraucht - die
  // Default-Anlage (`anlagen/beispiel_eg.json`) ist handgepflegt ohne
  // Netzplan-Ursprung und trägt deshalb nirgends ein `data-netz`-Attribut
  // (siehe generate_anlage.js `baueAder()` - nur gesetzt, wenn `ader.netz`
  // existiert).
  async function neueSeiteMitTestcase() {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/testcase_01/anlage.json`);
    await page.waitForSelector('#schraubendreher svg');
    return page;
  }

  function rlowHauptwert(page) {
    return page.evaluate(() =>
      [...document.querySelectorAll('#messgeraet svg text')].find((t) => t.textContent.startsWith('R:'))?.textContent
    );
  }

  // Findet den Schalter-Hebel (`<g style="cursor:pointer">`, siehe
  // zeichneSchalter() in schaltkasten.js) eines bestimmten Bauteils - es
  // gibt kein direktes `data-bauteil`-Attribut auf dem Hebel selbst, daher
  // über die Nähe (2D-Distanz) zur (bereits per data-bauteil auffindbaren)
  // Schraube desselben Geräts identifiziert (Hebel sitzt immer mittig über
  // dessen eigenen Schrauben). BUGFIX (2026-07-24): eine erste Version
  // verglich nur die HORIZONTALE Distanz - in testcase_05 hat das
  // Hauptschalters Hebel (letzte Reihe) fälschlich für RCD1 (erste
  // Hutschienen-Reihe) gefunden, weil beide zufällig einen ähnlichen
  // X-Mittelpunkt haben (beide sind das jeweils erste Gerät ihrer Reihe) -
  // die Y-Koordinate (andere Reihe) wurde komplett ignoriert. Volle
  // Euklidische Distanz (x UND y) behebt das zuverlässig, da der
  // Zeilenabstand im Schaltkasten immer deutlich größer ist als jede
  // zufällige X-Koinzidenz zwischen Geräten verschiedener Reihen.
  async function findeSchalterHandleNaheBauteil(page, bauteilName) {
    const kreisBox = await page.locator(`#schaltkasten svg circle[data-bauteil="${bauteilName}"]`).first().boundingBox();
    const kreisCx = kreisBox.x + kreisBox.width / 2;
    const kreisCy = kreisBox.y + kreisBox.height / 2;
    const handles = page.locator('#schaltkasten svg g[style*="cursor: pointer"]');
    const anzahl = await handles.count();
    let bestIndex = -1, bestDist = Infinity;
    for (let i = 0; i < anzahl; i++) {
      const box = await handles.nth(i).boundingBox();
      if (!box) continue;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const dist = Math.hypot(cx - kreisCx, cy - kreisCy);
      if (dist < bestDist) { bestDist = dist; bestIndex = i; }
    }
    return handles.nth(bestIndex);
  }

  await pruefe('Schraubendreher: wird neben dem Messgerät gerendert', async () => {
    const page = await neueSeite();
    const anzahl = await page.locator('#schraubendreher svg').count();
    if (anzahl !== 1) throw new Error(`erwarte genau ein Schraubendreher-SVG, gefunden ${anzahl}`);
    await page.close();
  });

  await pruefe('Schraubendreher: gleiche Höhe wie das Handy (Werkzeugzeile)', async () => {
    const page = await neueSeite();
    const hoehen = await page.evaluate(() => ({
      handy: document.querySelector('#handy svg').getAttribute('height'),
      schraubendreher: document.querySelector('#schraubendreher svg').getAttribute('height')
    }));
    if (hoehen.handy !== hoehen.schraubendreher) {
      throw new Error(`erwarte Schraubendreher-Höhe ${hoehen.handy}, gefunden ${hoehen.schraubendreher}`);
    }
    await page.close();
  });

  // Layout sim-rng: Messgerät in eigener Zeile, darunter die Werkzeugzeile
  // mit Handy links und Schraubendreher rechts (für Rechtshänder).
  await pruefe('Schraubendreher: Werkzeugzeile unter dem Messgerät, Schraubendreher rechts vom Handy', async () => {
    const page = await neueSeite();
    const boxen = await page.evaluate(() => ({
      handy: document.querySelector('#handy svg').getBoundingClientRect(),
      messgeraet: document.querySelector('#messgeraet svg').getBoundingClientRect(),
      schraubendreher: document.querySelector('#schraubendreher svg').getBoundingClientRect()
    }));
    if (boxen.handy.top < boxen.messgeraet.bottom || boxen.schraubendreher.top < boxen.messgeraet.bottom) {
      throw new Error(`Werkzeugzeile (Handy oben ${boxen.handy.top}, Schraubendreher oben ${boxen.schraubendreher.top}) steht nicht unter dem Messgerät (unten ${boxen.messgeraet.bottom})`);
    }
    if (boxen.schraubendreher.left < boxen.handy.right) {
      throw new Error(`Schraubendreher (linke Kante ${boxen.schraubendreher.left}) überlappt das Handy (rechte Kante ${boxen.handy.right})`);
    }
    await page.close();
  });

  // Das Messgerät wird auf dem Desktop nie größer oder kleiner als seine
  // gerenderte Breite, auf dem Handy füllt es die Spalte.
  await pruefe('Layout: Messgerät auf dem Desktop in gerenderter Breite und zentriert unter dem Schaltkasten', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForSelector('#messgeraet svg');
    const werte = await page.evaluate(() => {
      const m = document.querySelector('#messgeraet svg');
      const s = document.querySelector('#schaltkasten svg').getBoundingClientRect();
      const b = m.getBoundingClientRect();
      return { attrBreite: Number(m.getAttribute('width')), breite: b.width, mitteM: b.left + b.width / 2, mitteS: s.left + s.width / 2 };
    });
    if (Math.abs(werte.breite - werte.attrBreite) > 0.5) {
      throw new Error(`erwarte Messgerät-Breite ${werte.attrBreite}px, gefunden ${werte.breite}px`);
    }
    if (Math.abs(werte.mitteM - werte.mitteS) > 0.5) {
      throw new Error(`Messgerät-Mitte ${werte.mitteM} nicht unter der Schaltkasten-Mitte ${werte.mitteS}`);
    }
    await page.close();
  });

  await pruefe('Layout: Handybreite 360 px - kein waagrechtes Scrollen, Messgerät in Spaltenbreite', async () => {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, isMobile: true });
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForSelector('#protokoll .pf-blatt');
    const werte = await page.evaluate(() => ({
      seitenBreite: document.documentElement.scrollWidth,
      fensterBreite: document.documentElement.clientWidth,
      messgeraet: document.querySelector('#messgeraet svg').getBoundingClientRect().width,
      spalte: document.getElementById('spalte').getBoundingClientRect().width
    }));
    if (werte.seitenBreite > werte.fensterBreite) {
      throw new Error(`Seite ist ${werte.seitenBreite}px breit, Fenster nur ${werte.fensterBreite}px`);
    }
    if (Math.abs(werte.messgeraet - werte.spalte) > 0.5) {
      throw new Error(`erwarte Messgerät in Spaltenbreite ${werte.spalte}px, gefunden ${werte.messgeraet}px`);
    }
    await page.close();
  });

  // --- Aufnehmen/Lösen (siehe onSchraubeKlick() in controller/app.js) ---

  await pruefe('Schraubendreher: Klick nimmt ihn auf - zeigt Ablage-Silhouette und aktiven Modus (sim-as0)', async () => {
    const page = await neueSeite();
    await page.locator('#schraubendreher svg').click();
    const info = await page.evaluate(() => ({
      svgAnzahl: document.querySelectorAll('#schraubendreher svg').length,
      ablageZustand: document.querySelector('#schraubendreher .schraubendreher-ablage')?.dataset.zustand,
      bildSrc: document.querySelector('#schraubendreher .schraubendreher-ablage img')?.getAttribute('src') ?? '',
      aktiv: document.getElementById('schaltkasten').classList.contains('schraubendreher-aktiv'),
      cursor: getComputedStyle(document.getElementById('schaltkasten')).cursor
    }));
    if (info.svgAnzahl !== 0 || info.ablageZustand !== 'aufgenommen' || !info.bildSrc.includes('stroke-dasharray')) {
      throw new Error(`erwarte gestrichelte Ablage-Silhouette ohne aktives Werkzeug-SVG, gefunden ${JSON.stringify(info)}`);
    }
    if (!info.aktiv || !info.cursor.includes('url(')) {
      throw new Error(`erwarte aktiven Modus-Rahmen und Schraubendreher-Cursor, gefunden ${JSON.stringify(info)}`);
    }
    await page.close();
  });

  await pruefe('Schraubendreher: Klick auf Ablage-Silhouette und Esc legen das Werkzeug wieder ab (sim-as0)', async () => {
    const page = await neueSeiteMitTestcase();
    await page.locator('#schraubendreher svg').click(); // aufnehmen
    await page.locator('#schraubendreher .schraubendreher-ablage').click(); // Klick auf Silhouette -> ablegen
    const nachSilhouette = await page.evaluate(() => ({
      zustand: document.querySelector('#schraubendreher svg')?.getAttribute('data-zustand'),
      ablagen: document.querySelectorAll('#schraubendreher .schraubendreher-ablage').length,
      aktiv: document.getElementById('schaltkasten').classList.contains('schraubendreher-aktiv')
    }));
    if (nachSilhouette.zustand !== 'abgelegt' || nachSilhouette.ablagen !== 0 || nachSilhouette.aktiv) {
      throw new Error(`erwarte abgelegten Zustand nach Klick auf Silhouette, gefunden ${JSON.stringify(nachSilhouette)}`);
    }

    await page.locator('#schraubendreher svg').click(); // erneut aufnehmen
    await page.keyboard.press('Escape'); // Esc -> ablegen
    const nachEsc = await page.evaluate(() => ({
      zustand: document.querySelector('#schraubendreher svg')?.getAttribute('data-zustand'),
      ablagen: document.querySelectorAll('#schraubendreher .schraubendreher-ablage').length,
      aktiv: document.getElementById('schaltkasten').classList.contains('schraubendreher-aktiv')
    }));
    if (nachEsc.zustand !== 'abgelegt' || nachEsc.ablagen !== 0 || nachEsc.aktiv) {
      throw new Error(`erwarte abgelegten Zustand nach Esc, gefunden ${JSON.stringify(nachEsc)}`);
    }

    // Nach dem Ablegen per Esc lösen normale Klicks wieder das Popup statt Schrauben aus.
    await page.locator('#schaltkasten svg circle[data-netz]').first().click();
    const popupSichtbar = await page.evaluate(() => document.querySelector('.popup')?.style.display === 'block');
    if (!popupSichtbar) throw new Error('erwarte Popup nach Ablegen per Esc');
    await page.close();
  });

  await pruefe('Schraubendreher: Replay-Schritt schraubeSchalten funktioniert auch bei bereits aufgenommenem Werkzeug (sim-as0)', async () => {
    const page = await neueSeiteMitTestcase();
    await page.locator('#schraubendreher svg').click(); // manuell aufnehmen
    const ziel = await page.evaluate(() => {
      const c = document.querySelector('#schaltkasten svg circle[data-bauteil="RCD1"][data-netz]');
      return { bauteil: c.getAttribute('data-bauteil'), netz: c.getAttribute('data-netz') };
    });
    await page.evaluate(async ({ bauteil, netz }) => {
      const { fuehreSchrittAus } = await import('./controller/fahrplan_ausfuehrung.js');
      fuehreSchrittAus({ funktion: 'schraubeSchalten', argumente: [bauteil, netz] });
    }, ziel);
    const info = await page.evaluate(() => ({
      weisseKreise: document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]').length,
      popupSichtbar: document.querySelector('.popup')?.style.display === 'block',
      zustand: document.querySelector('#schraubendreher svg')?.getAttribute('data-zustand')
    }));
    if (info.weisseKreise !== 1 || info.popupSichtbar || info.zustand !== 'abgelegt') {
      throw new Error(`erwarte gelöste Schraube ohne Popup bei bereits aufgenommenem Werkzeug, gefunden ${JSON.stringify(info)}`);
    }
    await page.close();
  });

  await pruefe('Schraubendreher: Klick auf eine Schraube löst sie (weißer Kreis mit schwarzem Rand) und das Werkzeug kehrt zurück', async () => {
    const page = await neueSeiteMitTestcase();
    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-netz]').first().click();

    const info = await page.evaluate(() => ({
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length,
      zustand: document.querySelector('#schraubendreher svg')?.getAttribute('data-zustand'),
      aktiv: document.getElementById('schaltkasten').classList.contains('schraubendreher-aktiv')
    }));
    if (info.weisseKreise !== 1) throw new Error(`erwarte einen weißen Kreis (gelöste Schraube), gefunden ${info.weisseKreise}`);
    if (info.zustand !== 'abgelegt' || info.aktiv) throw new Error(`erwarte, dass der Schraubendreher zurückkehrt, gefunden ${JSON.stringify(info)}`);
    await page.close();
  });

  // Regressionstest für einen User-gemeldeten Bug (2026-07-23): die
  // ursprünglich spezifizierte Sperre "gelöste Schraube kann keine
  // Messspitze mehr bekommen" (elektrisch kein Kontakt mehr) war nie
  // tatsächlich umgesetzt worden - eine Messspitze ließ sich trotzdem auf
  // eine bereits gelöste Schraube setzen.
  await pruefe('Schraubendreher: BUGFIX - auf einer gelösten Schraube (weißer Kreis) kann keine Messspitze gesetzt werden', async () => {
    const page = await neueSeiteMitTestcase();
    const schraube = page.locator('#schaltkasten svg circle[data-netz]').first();
    await page.locator('#schraubendreher svg').click();
    await schraube.click(); // lösen

    await page.getByText('ON/OFF', { exact: true }).click();
    await schraube.click(); // Versuch, eine Messspitze auf die gelöste Schraube zu setzen

    const info = await page.evaluate(() => ({
      messspitzen: [...document.querySelectorAll('#schaltkasten svg circle[stroke="#ffffff"]')].length,
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length
    }));
    if (info.messspitzen !== 0) throw new Error(`erwarte keine Messspitze auf der gelösten Schraube, gefunden ${info.messspitzen}`);
    if (info.weisseKreise !== 1) throw new Error(`erwarte, dass der weiße Kreis unverändert bleibt, gefunden ${info.weisseKreise}`);

    // Eine ANDERE Schraube sollte weiterhin normal eine Messspitze bekommen.
    await page.locator('#schaltkasten svg circle[data-netz]').nth(1).click();
    const messspitzenNach = await page.evaluate(() => [...document.querySelectorAll('#schaltkasten svg circle[stroke="#ffffff"]')].length);
    if (messspitzenNach !== 1) throw new Error(`erwarte, dass eine andere Schraube weiterhin normal eine Messspitze bekommt, gefunden ${messspitzenNach}`);
    await page.close();
  });

  await pruefe('Schraubendreher: Klick auf eine Schraube mit bereits gesetzter Messspitze bleibt wirkungslos, Werkzeug bleibt aufgenommen', async () => {
    const page = await neueSeiteMitTestcase();
    await page.getByText('ON/OFF', { exact: true }).click();
    const schraube = page.locator('#schaltkasten svg circle[data-netz]').first();
    await schraube.click(); // Messspitze setzen (Messgerät an)

    await page.locator('#schraubendreher svg').click(); // aufnehmen
    await schraube.click(); // Schraube MIT Messspitze anklicken

    const info = await page.evaluate(() => ({
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length,
      schraubendreherSvg: document.querySelectorAll('#schraubendreher svg').length,
      zustand: document.querySelector('#schraubendreher .schraubendreher-ablage')?.dataset.zustand
    }));
    if (info.weisseKreise !== 0) throw new Error(`erwarte keinen weißen Kreis (Klick sollte wirkungslos bleiben), gefunden ${info.weisseKreise}`);
    if (info.schraubendreherSvg !== 0 || info.zustand !== 'aufgenommen') throw new Error(`erwarte, dass das Werkzeug aufgenommen bleibt, gefunden ${JSON.stringify(info)}`);
    await page.close();
  });

  await pruefe('Schraubendreher: Klick auf eine bereits gelöste Schraube dreht sie wieder ein (weißer Kreis verschwindet), Werkzeug kehrt zurück', async () => {
    const page = await neueSeiteMitTestcase();
    const schraube = page.locator('#schaltkasten svg circle[data-netz]').first();
    await page.locator('#schraubendreher svg').click();
    await schraube.click(); // lösen

    await page.locator('#schraubendreher svg').click(); // erneut aufnehmen
    await schraube.click(); // dieselbe (bereits gelöste) Schraube nochmal anklicken -> wiedereindrehen

    const info = await page.evaluate(() => ({
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length,
      schraubendreher: document.querySelectorAll('#schraubendreher svg').length
    }));
    if (info.weisseKreise !== 0) throw new Error(`erwarte keinen weißen Kreis mehr (wiedereingedreht), gefunden ${info.weisseKreise}`);
    if (info.schraubendreher !== 1) throw new Error(`erwarte, dass das Werkzeug zurückkehrt, gefunden ${info.schraubendreher} SVGs`);
    await page.close();
  });

  await pruefe('Schraubendreher: eine wiedereingedrehte Schraube ist wieder ganz normal nutzbar (Popup)', async () => {
    const page = await neueSeiteMitTestcase();
    const schraube = page.locator('#schaltkasten svg circle[data-netz]').first();
    await page.locator('#schraubendreher svg').click();
    await schraube.click(); // lösen
    await page.locator('#schraubendreher svg').click();
    await schraube.click(); // wiedereindrehen

    await schraube.click(); // normaler Klick (Messgerät aus) -> sollte Popup zeigen
    const popupSichtbar = await page.evaluate(() => document.querySelector('.popup')?.style.display === 'block');
    if (!popupSichtbar) throw new Error('erwarte, dass die wiedereingedrehte Schraube wieder normal (Popup) klickbar ist');
    await page.close();
  });

  await pruefe('Schraubendreher: bereits gesetzte Messspitzen bleiben unberührt, wenn das Werkzeug eine ANDERE Schraube löst', async () => {
    const page = await neueSeiteMitTestcase();
    await page.getByText('ON/OFF', { exact: true }).click();
    const kreise = page.locator('#schaltkasten svg circle[data-netz]');
    await kreise.nth(0).click(); // Messspitze auf Schraube 0

    await page.locator('#schraubendreher svg').click();
    await kreise.nth(1).click(); // andere Schraube lösen

    const info = await page.evaluate(() => ({
      messspitzen: [...document.querySelectorAll('#schaltkasten svg circle[stroke="#ffffff"]')].length,
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length
    }));
    if (info.messspitzen !== 1) throw new Error(`erwarte, dass die Messspitze erhalten bleibt, gefunden ${info.messspitzen}`);
    if (info.weisseKreise !== 1) throw new Error(`erwarte einen weißen Kreis auf der gelösten Schraube, gefunden ${info.weisseKreise}`);
    await page.close();
  });

  // --- Zwischenschritt vor der Kanten-Kappung (User-Vorgabe): Steckdosen-
  // Kontakte unterstützen das Werkzeug (noch) nicht, und maximal zwei
  // Schrauben gleichzeitig gelöst - "ich will nicht, dass der User alle
  // Schrauben erst mal aufdreht". ---

  await pruefe('Schraubendreher: an Steckdosen-Kontakten (Steckdose/Anschlussdose/Drehstromsteckdose) kann kein weißer Punkt gesetzt werden', async () => {
    const page = await neueSeiteMitTestcase();
    await page.locator('#schraubendreher svg').click();
    await page.locator('#steckdosen circle[fill="#666666"]').first().click();

    const info = await page.evaluate(() => ({
      weisseKreiseSteckdosen: [...document.querySelectorAll('#steckdosen circle[fill="#ffffff"][stroke="#000000"]')].length,
      schraubendreherSvg: document.querySelectorAll('#schraubendreher svg').length,
      zustand: document.querySelector('#schraubendreher .schraubendreher-ablage')?.dataset.zustand
    }));
    if (info.weisseKreiseSteckdosen !== 0) throw new Error(`erwarte keinen weißen Kreis an der Steckdose, gefunden ${info.weisseKreiseSteckdosen}`);
    if (info.schraubendreherSvg !== 0 || info.zustand !== 'aufgenommen') throw new Error(`erwarte, dass das Werkzeug aufgenommen bleibt, gefunden ${JSON.stringify(info)}`);
    await page.close();
  });

  await pruefe('Schraubendreher: maximal zwei Schrauben gleichzeitig gelöst - ein dritter Versuch bleibt ohne weiteren weißen Kreis UND legt das Werkzeug zurück', async () => {
    const page = await neueSeiteMitTestcase();
    const schrauben = page.locator('#schaltkasten svg circle[data-netz]');

    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(0).click(); // 1. lösen
    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(1).click(); // 2. lösen

    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(2).click(); // 3. Versuch -> kein weiterer weißer Kreis, Werkzeug wird zurückgelegt

    const info = await page.evaluate(() => ({
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length,
      schraubendreher: document.querySelectorAll('#schraubendreher svg').length
    }));
    if (info.weisseKreise !== 2) throw new Error(`erwarte weiterhin genau zwei weiße Kreise (dritter blockiert), gefunden ${info.weisseKreise}`);
    // Anders als bei Messspitze/Steckdosen-Sperre: bei erreichtem Maximum
    // wird das Werkzeug zurückgelegt statt aufgenommen zu bleiben - User-
    // Feedback (Handling-Problem, 2026-07-23): "besser, wenn der
    // Schraubenzieher wieder hingelegt wird, wenn bereits zwei Punkte
    // gesetzt sind".
    if (info.schraubendreher !== 1) throw new Error(`erwarte, dass das Werkzeug zurückgelegt wird, gefunden ${info.schraubendreher} SVGs`);
    await page.close();
  });

  await pruefe('Schraubendreher: nach dem Zurücklegen (Maximum erreicht) funktionieren normale Klicks (Popup) wieder wie gewohnt', async () => {
    const page = await neueSeiteMitTestcase();
    const schrauben = page.locator('#schaltkasten svg circle[data-netz]');

    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(0).click();
    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(1).click();
    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(2).click(); // 3. Versuch -> Werkzeug wird zurückgelegt

    await schrauben.nth(3).click(); // normaler Klick, Messgerät aus -> Popup
    const popupSichtbar = await page.evaluate(() => document.querySelector('.popup')?.style.display === 'block');
    if (!popupSichtbar) throw new Error('erwarte, dass normale Klicks (Popup) nach dem automatischen Zurücklegen wieder funktionieren');
    await page.close();
  });

  await pruefe('Schraubendreher: Wiedereindrehen macht bei erreichtem Maximum wieder Platz für eine neue Schraube', async () => {
    const page = await neueSeiteMitTestcase();
    const schrauben = page.locator('#schaltkasten svg circle[data-netz]');

    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(0).click(); // 1. lösen
    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(1).click(); // 2. lösen (Maximum erreicht)

    await page.locator('#schraubendreher svg').click(); // erneut aufnehmen
    await schrauben.nth(0).click(); // Schraube 1 wiedereindrehen -> Platz frei

    await page.locator('#schraubendreher svg').click();
    await schrauben.nth(2).click(); // jetzt sollte die 3. Schraube gehen

    const weisseKreise = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length
    );
    if (weisseKreise !== 2) throw new Error(`erwarte genau zwei weiße Kreise (Schraube 2 + neu gelöste Schraube 3), gefunden ${weisseKreise}`);
    await page.close();
  });

  // --- Kanten-Kappung im Verbindungsgraphen (letzter Schritt, User-Vorgabe:
  // eine einzige Kante pro Bauteil+Pol - unabhängig davon, ob die Eingangs-
  // oder die Ausgangsschraube gelöst wird, siehe KONZEPT.md "Schrauben
  // lösen"). testcase_01: N1 (Leistungsschalter.i1) -> N13
  // (Reihenklemme_L_SK1.o1) summiert die Fehlertabelle zu 0,60Ω (0,1+0,2+0,3Ω,
  // siehe bestehender RLOW-Test "Messspitzen auf demselben L1-Pfad"). ---

  await pruefe('Schraubendreher: Lösen einer Schraube kappt tatsächlich die zugehörige Kante - RLOW zeigt danach den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase();
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click(); // blau
    const vorher = await rlowHauptwert(page);
    if (vorher !== 'R:0,60Ω') throw new Error(`RLOW vor dem Lösen: erwarte "R:0,60Ω", gefunden "${vorher}"`);

    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-bauteil="RCD1"]').first().click(); // RCD1 lösen (liegt auf dem gemessenen Pfad)

    const nachher = await rlowHauptwert(page);
    if (nachher !== 'R:---Ω') throw new Error(`RCD1 gelöst -> erwarte Platzhalter "R:---Ω", gefunden "${nachher}"`);
    await page.close();
  });

  await pruefe('Schraubendreher: Wiedereindrehen schließt die Kante wieder - RLOW-Wert kehrt zurück', async () => {
    const page = await neueSeiteMitTestcase();
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();

    await page.locator('#schraubendreher svg').click();
    const rcd1Schraube = page.locator('#schaltkasten svg circle[data-bauteil="RCD1"]').first();
    await rcd1Schraube.click(); // lösen
    const geloest = await rlowHauptwert(page);
    if (geloest !== 'R:---Ω') throw new Error(`RCD1 gelöst: erwarte "R:---Ω", gefunden "${geloest}"`);

    await page.locator('#schraubendreher svg').click();
    await rcd1Schraube.click(); // wiedereindrehen

    const wiederhergestellt = await rlowHauptwert(page);
    if (wiederhergestellt !== 'R:0,60Ω') throw new Error(`RCD1 wiedereingedreht -> erwarte "R:0,60Ω", gefunden "${wiederhergestellt}"`);
    await page.close();
  });

  await pruefe('Schraubendreher: eine PE-Schraube lösen stürzt nicht ab (PE ist noch nicht Teil des Verbindungsgraphen)', async () => {
    const page = await neueSeiteMitTestcase();
    const fehler = [];
    page.on('pageerror', (err) => fehler.push(err.message));

    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-bauteil="PE-Klemme"]').first().click();

    const weisserKreis = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length
    );
    if (weisserKreis !== 1) throw new Error(`erwarte weiterhin einen weißen Kreis (rein visuell, ohne Graph-Wirkung), gefunden ${weisserKreis}`);
    if (fehler.length > 0) throw new Error(`erwarte keine JS-Fehler, gefunden: ${fehler.join('; ')}`);
    await page.close();
  });

  await pruefe('Schraubendreher: Lösen einer UNBETEILIGTEN Schraube (anderer Stromkreis) beeinflusst eine laufende Messung nicht', async () => {
    const page = await neueSeiteMitTestcase();
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();
    const vorher = await rlowHauptwert(page);
    if (vorher !== 'R:0,60Ω') throw new Error(`RLOW vor dem Lösen: erwarte "R:0,60Ω", gefunden "${vorher}"`);

    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-bauteil="LS2"]').first().click(); // LS2 gehört zu SK2, nicht zum gemessenen SK1-Pfad

    const nachher = await rlowHauptwert(page);
    if (nachher !== 'R:0,60Ω') throw new Error(`unbeteiligtes Bauteil gelöst -> erwarte unverändert "R:0,60Ω", gefunden "${nachher}"`);
    await page.close();
  });

  // Regressionstest für einen User-gemeldeten Bug (testcase_06): eine per
  // Schraubendreher gekappte Kante wurde von schalterUmschalten() wieder
  // fälschlich geschlossen, sobald derselbe Bauteil-Schalter (hier RCD1)
  // geöffnet und wieder geschlossen wurde - obwohl die Schraube weiterhin
  // sichtbar gelöst war (weißer Kreis blieb stehen). Ursache: beide
  // Mechanismen schrieben ungeprüft in dieselbe `kante.geschlossen`-
  // Eigenschaft. Fix: `geloesteKanten`-Set verhindert, dass
  // schalterUmschalten() eine gelöste Kante wieder schließt; der zuletzt
  // gewünschte Schalter-Zustand wird in `kante._schalterSoll` gemerkt und
  // erst beim tatsächlichen Wiedereindrehen angewendet.
  await pruefe('Schraubendreher: BUGFIX - eine gelöste Kante bleibt offen, auch wenn der zugehörige Schalter danach auf/zu geklickt wird', async () => {
    const page = await neueSeiteMitTestcase();
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();
    const vorher = await rlowHauptwert(page);
    if (vorher !== 'R:0,60Ω') throw new Error(`RLOW vor dem Lösen: erwarte "R:0,60Ω", gefunden "${vorher}"`);

    await page.locator('#schraubendreher svg').click();
    const rcd1Schraube = page.locator('#schaltkasten svg circle[data-bauteil="RCD1"]').first();
    await rcd1Schraube.click(); // lösen
    const geloest = await rlowHauptwert(page);
    if (geloest !== 'R:---Ω') throw new Error(`RCD1 gelöst: erwarte "R:---Ω", gefunden "${geloest}"`);

    const rcd1Handle = await findeSchalterHandleNaheBauteil(page, 'RCD1');
    await rcd1Handle.click(); // RCD1-Schalter öffnen
    await rcd1Handle.click(); // RCD1-Schalter wieder schließen

    const nachSchalterToggle = await rlowHauptwert(page);
    if (nachSchalterToggle !== 'R:---Ω') {
      throw new Error(`gelöste Schraube muss trotz Schalter auf/zu weiterhin offen bleiben: erwarte "R:---Ω", gefunden "${nachSchalterToggle}"`);
    }
    const weisserKreisNochDa = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length
    );
    if (weisserKreisNochDa !== 1) throw new Error(`weißer Kreis muss weiterhin sichtbar sein, gefunden ${weisserKreisNochDa}`);

    // Wiedereindrehen bei geschlossenem Schalter muss wieder korrekt herstellen.
    await page.locator('#schraubendreher svg').click();
    await rcd1Schraube.click();
    const wiederhergestellt = await rlowHauptwert(page);
    if (wiederhergestellt !== 'R:0,60Ω') throw new Error(`Wiedereindrehen bei geschlossenem Schalter: erwarte "R:0,60Ω", gefunden "${wiederhergestellt}"`);
    await page.close();
  });

  // Regressionstest für einen User-gemeldeten Bug (testcase_06): die
  // Position hing früher an einer beim Start gecachten Messgerät-SVG, die
  // `MessgeraetView.render()` bei jedem Re-Render ersetzt. Seit sim-rng steht
  // der Schraubendreher im Layout-Fluss der Werkzeugzeile; die Position muss
  // nach einem Re-Render des Messgeräts trotzdem dieselbe bleiben.
  await pruefe('Schraubendreher: BUGFIX - Position bleibt gleich, auch nachdem das Messgerät zwischendurch neu gerendert wurde (ON/OFF + Messspitze)', async () => {
    const page = await neueSeiteMitTestcase();

    // Erstes Lösen VOR jeder Messgerät-Interaktion, als Ausgangswert.
    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-netz]').first().click();
    const posVorher = await page.locator('#schraubendreher svg').boundingBox();

    // Messgerät an (löst MessgeraetView.render() mit einem KOMPLETT NEUEN
    // <svg>-Element aus) und eine Messspitze setzen (löst ebenfalls ein
    // Re-Render aus, siehe onSchraubeKlick()).
    await page.getByText('ON/OFF', { exact: true }).click();
    await page.locator('#schaltkasten svg circle[data-netz]').nth(1).click();

    // Erneut aufnehmen und eine weitere Schraube lösen - die Position muss
    // exakt dieselbe wie vorher sein.
    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-netz]').nth(2).click();
    const posNachher = await page.locator('#schraubendreher svg').boundingBox();

    if (Math.abs(posNachher.x - posVorher.x) > 1 || Math.abs(posNachher.y - posVorher.y) > 1) {
      throw new Error(`erwarte Schraubendreher bei (${posVorher.x}, ${posVorher.y}), gefunden (${posNachher.x}, ${posNachher.y})`);
    }
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
