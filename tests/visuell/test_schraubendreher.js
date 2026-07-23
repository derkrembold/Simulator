// Tests für das Schraubendreher-Werkzeug (view/schraubendreher.js,
// onSchraubeKlick() in controller/app.js). Darstellung neben dem Messgerät,
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
  // über die horizontale Nähe zur (bereits per data-bauteil auffindbaren)
  // Schraube desselben Geräts identifiziert (Hebel sitzt immer mittig über
  // dessen eigenen Schrauben).
  async function findeSchalterHandleNaheBauteil(page, bauteilName) {
    const kreisBox = await page.locator(`#schaltkasten svg circle[data-bauteil="${bauteilName}"]`).first().boundingBox();
    const handles = page.locator('#schaltkasten svg g[style*="cursor: pointer"]');
    const anzahl = await handles.count();
    let bestIndex = -1, bestDist = Infinity;
    for (let i = 0; i < anzahl; i++) {
      const box = await handles.nth(i).boundingBox();
      if (!box) continue;
      const dist = Math.abs((box.x + box.width / 2) - (kreisBox.x + kreisBox.width / 2));
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

  await pruefe('Schraubendreher: Höhe entspricht exakt der Messgerät-Höhe', async () => {
    const page = await neueSeite();
    const hoehen = await page.evaluate(() => ({
      messgeraet: document.querySelector('#messgeraet svg').getAttribute('height'),
      schraubendreher: document.querySelector('#schraubendreher svg').getAttribute('height')
    }));
    if (hoehen.messgeraet !== hoehen.schraubendreher) {
      throw new Error(`erwarte Schraubendreher-Höhe ${hoehen.messgeraet}, gefunden ${hoehen.schraubendreher}`);
    }
    await page.close();
  });

  await pruefe('Schraubendreher: sitzt rechts neben dem Messgerät, für Rechtshänder (kein Überlappen)', async () => {
    const page = await neueSeite();
    const boxen = await page.evaluate(() => {
      const s = document.querySelector('#schraubendreher svg').getBoundingClientRect();
      const m = document.querySelector('#messgeraet svg').getBoundingClientRect();
      return { schraubendreherLinks: s.left, messgeraetRechts: m.right };
    });
    if (boxen.schraubendreherLinks < boxen.messgeraetRechts) {
      throw new Error(`Schraubendreher (linke Kante ${boxen.schraubendreherLinks}) überlappt das Messgerät (rechte Kante ${boxen.messgeraetRechts})`);
    }
    await page.close();
  });

  await pruefe('Schraubendreher: Messgerät bleibt trotz Schraubendreher exakt mittig unter dem Schaltkasten zentriert', async () => {
    const page = await neueSeite();
    const mitten = await page.evaluate(() => {
      const schaltkasten = document.querySelector('#schaltkasten svg').getBoundingClientRect();
      const messgeraet = document.querySelector('#messgeraet svg').getBoundingClientRect();
      return {
        schaltkasten: schaltkasten.x + schaltkasten.width / 2,
        messgeraet: messgeraet.x + messgeraet.width / 2
      };
    });
    if (Math.abs(mitten.schaltkasten - mitten.messgeraet) > 0.5) {
      throw new Error(`erwarte Messgerät-Mitte ${mitten.schaltkasten}, gefunden ${mitten.messgeraet}`);
    }
    await page.close();
  });

  // --- Aufnehmen/Lösen (siehe onSchraubeKlick() in controller/app.js) ---

  await pruefe('Schraubendreher: Klick nimmt ihn auf - verschwindet aus der Ruheposition', async () => {
    const page = await neueSeite();
    await page.locator('#schraubendreher svg').click();
    const anzahl = await page.locator('#schraubendreher svg').count();
    if (anzahl !== 0) throw new Error(`erwarte kein Schraubendreher-SVG nach dem Aufnehmen, gefunden ${anzahl}`);
    await page.close();
  });

  await pruefe('Schraubendreher: Klick auf eine Schraube löst sie (weißer Kreis mit schwarzem Rand) und das Werkzeug kehrt zurück', async () => {
    const page = await neueSeiteMitTestcase();
    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-netz]').first().click();

    const info = await page.evaluate(() => ({
      weisseKreise: [...document.querySelectorAll('#schaltkasten svg circle[fill="#ffffff"][stroke="#000000"]')].length,
      schraubendreher: document.querySelectorAll('#schraubendreher svg').length
    }));
    if (info.weisseKreise !== 1) throw new Error(`erwarte einen weißen Kreis (gelöste Schraube), gefunden ${info.weisseKreise}`);
    if (info.schraubendreher !== 1) throw new Error(`erwarte, dass der Schraubendreher zurückkehrt, gefunden ${info.schraubendreher} SVGs`);
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
      schraubendreher: document.querySelectorAll('#schraubendreher svg').length
    }));
    if (info.weisseKreise !== 0) throw new Error(`erwarte keinen weißen Kreis (Klick sollte wirkungslos bleiben), gefunden ${info.weisseKreise}`);
    if (info.schraubendreher !== 0) throw new Error(`erwarte, dass das Werkzeug aufgenommen bleibt, gefunden ${info.schraubendreher} SVGs`);
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
      schraubendreher: document.querySelectorAll('#schraubendreher svg').length
    }));
    if (info.weisseKreiseSteckdosen !== 0) throw new Error(`erwarte keinen weißen Kreis an der Steckdose, gefunden ${info.weisseKreiseSteckdosen}`);
    if (info.schraubendreher !== 0) throw new Error(`erwarte, dass das Werkzeug aufgenommen bleibt, gefunden ${info.schraubendreher} SVGs`);
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
  // Position wurde ursprünglich aus einer beim Start EINMALIG gecachten
  // `messgeraetSvg`-Referenz berechnet - `MessgeraetView.render()` leert den
  // Container aber bei JEDEM Re-Render (hier: ON/OFF-Klick) und hängt ein
  // komplett NEUES `<svg>`-Element ein. Der gecachte Verweis zeigte danach
  // auf ein aus dem DOM entferntes Element, `getBoundingClientRect()` lieferte
  // nur noch Nullen - der Schraubendreher landete dadurch irgendwo links im
  // Schaltschrank statt rechts vom Messgerät. Fix: `positioniereSchraubendreher()`
  // liest die Messgerät-SVG jetzt bei JEDEM Aufruf frisch aus dem DOM.
  await pruefe('Schraubendreher: BUGFIX - Position bleibt korrekt (rechts vom Messgerät), auch nachdem das Messgerät zwischendurch neu gerendert wurde (ON/OFF + Messspitze)', async () => {
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
    // exakt dieselbe wie vorher sein (rechts vom Messgerät).
    await page.locator('#schraubendreher svg').click();
    await page.locator('#schaltkasten svg circle[data-netz]').nth(2).click();
    const posNachher = await page.locator('#schraubendreher svg').boundingBox();

    const messgeraet = await page.locator('#messgeraet svg').boundingBox();
    const erwarteX = messgeraet.x + messgeraet.width + 16;
    if (Math.abs(posNachher.x - erwarteX) > 1) {
      throw new Error(`erwarte Schraubendreher bei x≈${erwarteX} (rechts vom Messgerät), gefunden x=${posNachher.x} (vorher: x=${posVorher.x})`);
    }
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
