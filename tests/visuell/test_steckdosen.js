// Tests für das Steckdosen-View-Objekt (view/steckdosen.js), oberhalb des
// Schaltkastens. Kontaktpunkte teilen sich denselben Klick-Callback wie der
// Schaltkasten (Popup bei ausgeschaltetem, Messspitzen bei eingeschaltetem
// Messgerät) - siehe KONZEPT.md "Steckdosen (View-Objekt)".
// Aufruf: node tests/visuell/test_steckdosen.js

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

  async function seiteMitTestcase(testcaseName) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/${testcaseName}/anlage.json`);
    await page.waitForSelector('#steckdosen svg');
    return page;
  }

  async function klick(page, label) {
    await page.getByText(label, { exact: true }).click();
  }

  async function klickeMitte(page, locator) {
    const box = await locator.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  async function drehknopfKlick(page) {
    await page.locator('#messgeraet svg circle[fill="#1a1a1a"]').click({ force: true });
  }

  async function displayTexte(page) {
    return page.evaluate(() => [...document.querySelectorAll('#messgeraet svg text')].map((t) => t.textContent));
  }

  async function indikatorDurchgestrichen(page) {
    return page.evaluate(() =>
      [...document.querySelectorAll('#messgeraet svg line')].some((l) => l.getAttribute('stroke-width') === '1.5')
    );
  }

  // Klickt die Schalter-Box (RCD/LS/Hauptschalter) an ihrer festen
  // Rechteck-Position (siehe view/schaltkasten.js zeichneSchalter()).
  async function schalterKlick(page, x, y) {
    const g = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator(`rect[x="${x}"][y="${y}"]`) });
    await g.click();
  }

  async function rlowHauptwert(page) {
    return page.evaluate(() =>
      [...document.querySelectorAll('#messgeraet svg text')].find((t) => t.textContent.startsWith('R:'))?.textContent
    );
  }

  function erwarte(texte, wert, kontext) {
    if (!texte.includes(wert)) {
      throw new Error(`${kontext}: erwarte "${wert}" im Display, gefunden: [${texte.join(', ')}]`);
    }
  }

  await pruefe('Steckdosen: ohne Platzierungstabelle (Default-Anlage) bleibt der Container leer und unsichtbar', async () => {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForSelector('#messgeraet svg');
    const info = await page.evaluate(() => ({
      display: getComputedStyle(document.getElementById('steckdosen')).display,
      hatSvg: !!document.querySelector('#steckdosen svg')
    }));
    if (info.display !== 'none') throw new Error(`erwarte display:none, gefunden ${info.display}`);
    if (info.hatSvg) throw new Error('erwarte kein <svg> ohne Platzierungstabelle');
    await page.close();
  });

  // Absichtlich ein breiterer Viewport als die Schaltkasten-Breite - sonst
  // fällt eine versehentliche Zentrierung nicht auf (siehe die analoge
  // Protokoll-Regression in ARCHITEKTUR.md "Linksbündig, nicht zentriert").
  await pruefe('Steckdosen: linke Kante steht bündig unter der Schaltkasten-Kante (nicht zentriert)', async () => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/testcase_01/anlage.json`);
    await page.waitForSelector('#steckdosen svg');
    const positionen = await page.evaluate(() => ({
      schaltkasten: document.getElementById('schaltkasten').getBoundingClientRect().left,
      steckdosen: document.getElementById('steckdosen').getBoundingClientRect().left
    }));
    if (positionen.schaltkasten !== positionen.steckdosen) {
      throw new Error(`erwarte gleiche linke Kante (${positionen.schaltkasten}px), Steckdosen steht bei ${positionen.steckdosen}px`);
    }
    await page.close();
  });

  await pruefe('Steckdosen: Breite entspricht exakt der gerenderten Schaltkasten-Breite', async () => {
    const page = await seiteMitTestcase('testcase_01');
    const breiten = await page.evaluate(() => ({
      schaltkasten: document.querySelector('#schaltkasten svg').getAttribute('width'),
      steckdosen: document.querySelector('#steckdosen svg').getAttribute('width')
    }));
    if (breiten.schaltkasten !== breiten.steckdosen) {
      throw new Error(`erwarte Steckdosen-Breite ${breiten.schaltkasten}px, gefunden ${breiten.steckdosen}px`);
    }
    await page.close();
  });

  await pruefe('Steckdosen: Anschlussdose - orangene Klemmdeckel sitzen jeweils direkt über ihrem Kontaktkreis, nicht daneben', async () => {
    const page = await seiteMitTestcase('testcase_01');
    const info = await page.evaluate(() => {
      const svg = document.querySelector('#steckdosen svg');
      const alleKreise = [...svg.querySelectorAll('circle')];
      const grau = alleKreise.filter((c) => c.getAttribute('fill') === '#666666');
      const farbig = alleKreise.filter((c) => ['#0000ff', '#44aa00', '#000000'].includes(c.getAttribute('fill')));
      const deckel = [...svg.querySelectorAll('rect')].filter((r) => r.getAttribute('fill') === '#ff7f2a');

      // Nur graue Kreise einer Wago-Klemme (= mit farbigem Nachbarkreis in der
      // Nähe) betrachten - die grauen Steckdosen-Pins haben keinen Deckel und
      // würden den Test sonst fälschlich über die gesamte Rasterbreite prüfen.
      const klemmenGrau = grau.filter((g) => {
        const gx = parseFloat(g.getAttribute('cx')), gy = parseFloat(g.getAttribute('cy'));
        return farbig.some((f) => Math.hypot(parseFloat(f.getAttribute('cx')) - gx, parseFloat(f.getAttribute('cy')) - gy) < 30);
      });

      return klemmenGrau.map((kreis) => {
        const kx = parseFloat(kreis.getAttribute('cx'));
        const abstaende = deckel.map((d) => Math.abs(parseFloat(d.getAttribute('x')) + parseFloat(d.getAttribute('width')) / 2 - kx));
        return Math.min(...abstaende);
      });
    });
    if (info.length !== 3) throw new Error(`erwarte 3 Wago-Klemmen-Kontaktkreise, gefunden ${info.length}`);
    // Klemmblock ist ca. 28-29px breit (14.33mm*2) - ein sauber zugeordneter
    // Deckel muss deutlich näher als die halbe Blockbreite am eigenen Kreis liegen.
    for (const abstand of info) {
      if (abstand > 8) throw new Error(`Kontaktkreis ohne nah liegenden Klemmdeckel gefunden (Abstand ${abstand}px)`);
    }
    await page.close();
  });

  await pruefe('Steckdosen: testcase_01 zeichnet 3 Geräte (2 Steckdosen für SK1, 1 Anschlussdose für SK2)', async () => {
    const page = await seiteMitTestcase('testcase_01');
    const info = await page.evaluate(() => {
      const svg = document.querySelector('#steckdosen svg');
      // Steckdose hat einen abgerundeten Innen- UND Außenrahmen (2 <rect> mit rx),
      // Anschlussdose keinen <rect> - so lassen sich die beiden Gerätetypen zählen.
      // Nur Rahmen INNERHALB der Geräte-Gruppen zählen (nicht den äußeren
      // Rahmen-Kasten, der jetzt ebenfalls rx-Rechtecke hat, siehe unten).
      const rechteckRahmen = svg.querySelectorAll('g rect[rx]').length;
      const kreisRinge = [...svg.querySelectorAll('circle')].filter((c) => c.getAttribute('fill') === 'none').length;
      return { rechteckRahmen, kreisRinge };
    });
    // 2 Steckdosen x 2 Rahmen-Rects = 4; 2 Steckdosen x 1 Kreis + 1 Anschlussdose x 2 Ringe = 4
    if (info.rechteckRahmen !== 4) throw new Error(`erwarte 4 Rahmen-Rechtecke (2 Steckdosen), gefunden ${info.rechteckRahmen}`);
    if (info.kreisRinge !== 4) throw new Error(`erwarte 4 ungefüllte Kreise (2 Steckdosen-Außenkreis + 2 Anschlussdose-Ringe), gefunden ${info.kreisRinge}`);
    await page.close();
  });

  await pruefe('Steckdosen: testcase_01 - Anschlussdose (SK2) hat drei Steckklemmen in Blau/Grün/Schwarz', async () => {
    const page = await seiteMitTestcase('testcase_01');
    const farben = await page.evaluate(() => {
      const svg = document.querySelector('#steckdosen svg');
      return [...svg.querySelectorAll('circle')]
        .map((c) => c.getAttribute('fill'))
        .filter((f) => f === '#0000ff' || f === '#44aa00' || f === '#000000');
    });
    if (farben.length !== 3) throw new Error(`erwarte je einen blauen/grünen/schwarzen Kontaktkreis, gefunden ${JSON.stringify(farben)}`);
    await page.close();
  });

  await pruefe('Steckdosen: testcase_02 - SK4 ist um 90° rotiert, die anderen drei nicht', async () => {
    const page = await seiteMitTestcase('testcase_02');
    const rotationen = await page.evaluate(() => {
      const svg = document.querySelector('#steckdosen svg');
      return [...svg.querySelectorAll('g')]
        .map((g) => g.getAttribute('transform'))
        .filter((t) => t && t.startsWith('rotate('));
    });
    const gedreht = rotationen.filter((t) => !t.startsWith('rotate(0,'));
    if (gedreht.length !== 1) throw new Error(`erwarte genau ein rotiertes Gerät, gefunden ${JSON.stringify(rotationen)}`);
    if (!gedreht[0].startsWith('rotate(90,')) throw new Error(`erwarte rotate(90,...), gefunden ${gedreht[0]}`);
    await page.close();
  });

  await pruefe('Steckdosen: testcase_03 hat 6 Geräte im 2x3-Raster (4 Steckdosen, 2 Anschlussdosen)', async () => {
    const page = await seiteMitTestcase('testcase_03');
    const info = await page.evaluate(() => {
      const svg = document.querySelector('#steckdosen svg');
      return {
        rechteckRahmen: svg.querySelectorAll('g rect[rx]').length,
        breite: svg.getAttribute('width'),
        schaltkastenBreite: document.querySelector('#schaltkasten svg').getAttribute('width'),
        hoehe: svg.getAttribute('height')
      };
    });
    if (info.rechteckRahmen !== 8) throw new Error(`erwarte 8 Rahmen-Rechtecke (4 Steckdosen x 2), gefunden ${info.rechteckRahmen}`);
    if (info.breite !== info.schaltkastenBreite) throw new Error(`erwarte Breite = Schaltkasten-Breite (${info.schaltkastenBreite}), gefunden ${info.breite}`);
    // 3 Zeilen a 190px (ZELLE_MM=95 * MM=2) + 2x Rahmen-Inset (8px, Rahmen
    // liegt direkt an der weißen Gerätefläche an, kein zusätzliches Padding)
    if (info.hoehe !== '586') throw new Error(`erwarte Höhe 586 (3 Zeilen + Rahmen-Inset), gefunden ${info.hoehe}`);
    await page.close();
  });

  await pruefe('Steckdosen: Klick auf grauen L-Kontakt zeigt bei ausgeschaltetem Messgerät das Popup mit Querschnitt/Farbe', async () => {
    const page = await seiteMitTestcase('testcase_01');
    // Messgerät ist per Default aus - kein ON/OFF-Klick nötig.
    const kreis = page.locator('#steckdosen circle[fill="#666666"]').first();
    await klickeMitte(page, kreis);
    const popup = await page.evaluate(() => {
      const p = document.querySelector('.popup');
      return { display: getComputedStyle(p).display, text: p.textContent };
    });
    if (popup.display !== 'block') throw new Error(`erwarte sichtbares Popup, display: ${popup.display}`);
    if (!popup.text.includes('mm²') || !popup.text.includes('schwarz')) {
      throw new Error(`erwarte Querschnitt+Farbe im Popup, gefunden: "${popup.text}"`);
    }
    await page.close();
  });

  await pruefe('Steckdosen: Anschlussdose - alle grauen Kontaktkreise klickbar, der farbige Kennzeichnungskreis nicht', async () => {
    const page = await seiteMitTestcase('testcase_01');
    const cursors = await page.evaluate(() => {
      const grau = [...document.querySelectorAll('#steckdosen circle[fill="#666666"]')].map((c) => getComputedStyle(c).cursor);
      const blau = getComputedStyle(document.querySelector('#steckdosen circle[fill="#0000ff"]')).cursor;
      return { grau, blau };
    });
    if (!cursors.grau.every((c) => c === 'pointer')) {
      throw new Error(`erwarte alle grauen Kontaktkreise klickbar (cursor:pointer), gefunden ${JSON.stringify(cursors.grau)}`);
    }
    if (cursors.blau === 'pointer') throw new Error('erwarte farbigen Kennzeichnungskreis NICHT klickbar');
    await page.close();
  });

  await pruefe('Steckdosen: bei eingeschaltetem Messgerät legt ein Klick eine Messspitze an (kein Popup, dafür farbiges Overlay)', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF');
    const kreis = page.locator('#steckdosen circle[fill="#666666"]').first();
    await kreis.click({ force: true });
    const info = await page.evaluate(() => ({
      popupSichtbar: !!document.querySelector('.popup') && getComputedStyle(document.querySelector('.popup')).display === 'block',
      overlayAnzahl: document.querySelectorAll('#steckdosen circle[stroke="#ffffff"]').length
    }));
    if (info.popupSichtbar) throw new Error('erwarte kein Popup bei eingeschaltetem Messgerät');
    if (info.overlayAnzahl !== 1) throw new Error(`erwarte 1 Messspitzen-Overlay, gefunden ${info.overlayAnzahl}`);
    await page.close();
  });

  await pruefe('Steckdosen: V~ über L/N-Kontakte derselben Steckdose zeigt echte 230V (Verbindungsgraph ohne Zusatzarbeit angebunden)', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(0).click({ force: true }); // L (erste Steckdose, SK1)
    await kreise.nth(1).click({ force: true }); // N (erste Steckdose, SK1)

    const texte = await page.evaluate(() => [...document.querySelectorAll('#messgeraet text')].map((t) => t.textContent));
    const ulnIndex = texte.indexOf('Uln:');
    if (ulnIndex === -1 || texte[ulnIndex + 1] !== '230V') {
      throw new Error(`erwarte Uln: 230V, gefunden: [${texte.join(', ')}]`);
    }
    await page.close();
  });

  await pruefe('Steckdosen: Messspitze auf einem PE-Kontakt (Rechteck) erscheint mittig darauf, nicht oben links im Bild', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF');
    const peRect = page.locator('#steckdosen rect[fill="#666666"]').first();
    await peRect.click({ force: true });
    const info = await page.evaluate(() => {
      const r = document.querySelector('#steckdosen rect[fill="#666666"]');
      const o = document.querySelector('#steckdosen circle[stroke="#ffffff"]');
      return {
        rectMitte: { cx: parseFloat(r.getAttribute('x')) + parseFloat(r.getAttribute('width')) / 2, cy: parseFloat(r.getAttribute('y')) + parseFloat(r.getAttribute('height')) / 2 },
        overlay: o ? { cx: parseFloat(o.getAttribute('cx')), cy: parseFloat(o.getAttribute('cy')) } : null
      };
    });
    if (!info.overlay) throw new Error('erwarte ein Messspitzen-Overlay');
    if (Math.abs(info.overlay.cx - info.rectMitte.cx) > 0.01 || Math.abs(info.overlay.cy - info.rectMitte.cy) > 0.01) {
      throw new Error(`erwarte Overlay auf Rechteck-Mitte ${JSON.stringify(info.rectMitte)}, gefunden ${JSON.stringify(info.overlay)}`);
    }
    await page.close();
  });

  await pruefe('Steckdosen: testcase_05 - Drehstromsteckdose zeichnet 5 klickbare Kontakte (PE/L1/L2/L3/N) plus 6 dunkelrote Ringe (5 Kontakte + 1 dekorativer Mittelpunkt)', async () => {
    const page = await seiteMitTestcase('testcase_05');
    const info = await page.evaluate(() => {
      const svg = document.querySelector('#steckdosen svg');
      return {
        grau: svg.querySelectorAll('circle[fill="#666666"]').length,
        dunkelrot: svg.querySelectorAll('circle[fill="#800000"]').length
      };
    });
    if (info.grau !== 5) throw new Error(`erwarte 5 graue Kontaktkreise, gefunden ${info.grau}`);
    if (info.dunkelrot !== 6) throw new Error(`erwarte 6 dunkelrote Kreise (5 Kontaktringe + 1 dekorativer Mittelpunkt), gefunden ${info.dunkelrot}`);
    await page.close();
  });

  await pruefe('Steckdosen: testcase_05 - Popup-Reihenfolge der Drehstromsteckdose ist PE, L1, L2, L3, N mit den richtigen Aderfarben', async () => {
    const page = await seiteMitTestcase('testcase_05');
    // Messgerät ist per Default aus - kein ON/OFF-Klick nötig.
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    const erwartet = ['gn-ge', 'schwarz', 'braun', 'grau', 'blau']; // PE, L1, L2, L3, N
    for (let i = 0; i < erwartet.length; i++) {
      await klickeMitte(page, kreise.nth(i));
      const popupText = await page.evaluate(() => document.querySelector('.popup')?.textContent ?? '');
      if (!popupText.includes(erwartet[i])) {
        throw new Error(`Kontakt ${i} (erwarte Farbe "${erwartet[i]}"): Popup zeigt "${popupText}"`);
      }
    }
    await page.close();
  });

  // testcase_03: SK1 (obere linke Steckdose, @180 rotiert) hängt an RCD1.
  // Durch die Rotation erscheint der N-Kontakt (blau) visuell LINKS und der
  // L-Kontakt (schwarz) visuell RECHTS - deckt also nebenbei ab, dass die
  // Ader-Zuordnung auch bei rotierten Geräten korrekt bleibt. Klick-
  // Reihenfolge L->N->PE ergibt über den Farbzyklus schwarz->blau->grün,
  // genau wie am Schaltkasten.
  await pruefe('FI/RCD: testcase_03 - Messspitzen an der oberen linken (rotierten) Steckdose finden RCD1 und öffnen dessen Hebel', async () => {
    const page = await seiteMitTestcase('testcase_03');
    await klick(page, 'ON/OFF');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(0).click({ force: true }); // L (visuell rechts) -> schwarz
    await kreise.nth(1).click({ force: true }); // N (visuell links) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click({ force: true }); // PE -> grün

    erwarte(await displayTexte(page), '230V', 'Stromkreis bereit -> 230V unter dem Kreis');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), '0V', 'RCD1 offen -> 0V unter dem Kreis');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte nach dem Auslösen durchgestrichen sein');
    }

    const hebel = await page.evaluate(() => {
      const rect = document.querySelector('#schaltkasten svg rect[x="8"][y="322"]'); // RCD1s Schalter-Box
      const hebelG = rect?.parentElement?.querySelector('g');
      return hebelG?.getAttribute('transform') ?? null;
    });
    if (!hebel) throw new Error('Hebel von RCD1 sollte sich nach erfolgreichem TEST automatisch öffnen');
    await page.close();
  });

  // testcase_03: SK6 (untere rechte Anschlussdose) - Messspitzen jeweils auf
  // den Kontakt mit passender Kennzeichnungsfarbe (schwarz auf schwarz=L,
  // blau auf blau=N, grün auf grün=PE). Die drei grauen Kreise dieser
  // Anschlussdose sind die letzten drei im DOM (Raster wird zeilenweise
  // gezeichnet, SK6 ist die letzte Platzierung), in der Reihenfolge N/L/PE
  // (siehe KLEMMEN-Array in view/steckdosen.js).
  await pruefe('ZI: testcase_03 - Messspitzen an der unteren rechten Anschlussdose (SK6) liefern Z:0,14Ω und Isc:1478,6A', async () => {
    const page = await seiteMitTestcase('testcase_03');
    await klick(page, 'ON/OFF');
    for (let i = 0; i < 2; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    const anzahl = await kreise.count();
    const [nIdx, lIdx, peIdx] = [anzahl - 3, anzahl - 2, anzahl - 1];

    await kreise.nth(lIdx).click({ force: true }); // L -> schwarz
    await kreise.nth(nIdx).click({ force: true }); // N -> blau
    await kreise.nth(peIdx).click({ force: true }); // PE -> grün

    erwarte(await displayTexte(page), '230V', 'Stromkreis bereit -> 230V unter dem PE-Kreis');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,14Ω', 'Vorimpedanz ohne zusätzliche Fehlertabellen-Einträge auf diesem Pfad');
    erwarte(await displayTexte(page), 'Isc:1478,6A', 'Isc aus Z berechnet');
    await page.close();
  });

  // WORKAROUND (siehe KONZEPT.md "Nächste Schritte" - PE-Teilgraph, und
  // controller/app.js berechneRlowMesswert()): PE ist noch kein eigener
  // Teilgraph, PE-zu-PE liefert deshalb pauschal 0Ω, unabhängig davon, ob
  // die Messspitzen am Schaltkasten oder an einer Steckdose sitzen - hier
  // kombiniert: PE-Kontakt der ersten Steckdose (rect) + die anlagenweite
  // PE-Klemme im Schaltkasten (zwei unterschiedliche Netze).
  await pruefe('RLOW: WORKAROUND - PE-Kontakt der Steckdose + PE-Klemme im Schaltkasten zeigt 0Ω', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF'); // RLOW ist Default-Funktion
    await page.locator('#steckdosen rect[fill="#666666"]').first().click({ force: true }); // schwarz, Steckdosen-PE
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').first().click({ force: true }); // blau, PE-Klemme
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'PE-zu-PE über zwei Views liefert pauschal 0Ω');
    await page.close();
  });

  // WORKAROUND (siehe oben): PE-Kontakt der Anschlussdose (SK2, grauer
  // Kontakt neben dem grünen Kennzeichnungskreis im PE-Block) + die
  // anlagenweite PE-Klemme im Schaltkasten - noch eine PE-Bauteil-
  // Kombination, die den Workaround durchläuft (Anschlussdose statt
  // Steckdose diesmal).
  await pruefe('RLOW: WORKAROUND - PE-Kontakt der Anschlussdose (grün-Block) + PE-Klemme im Schaltkasten zeigt 0Ω', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF'); // RLOW ist Default-Funktion
    // testcase_01-Raster: SK1 (Steckdose) hat die ersten 2 grauen Kreise
    // (idx0/1), SK2 (Anschlussdose) folgt mit N/L/PE (idx2/3/4) - idx4 ist
    // der graue Kontakt im PE-Block (neben dem grünen Kennzeichnungskreis).
    await page.locator('#steckdosen circle[fill="#666666"]').nth(4).click({ force: true }); // schwarz, Anschlussdose-PE
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').first().click({ force: true }); // blau, PE-Klemme
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'PE-zu-PE (Anschlussdose + PE-Klemme) liefert pauschal 0Ω');
    await page.close();
  });

  // WORKAROUND (siehe oben): PE-Kontakt der oberen Steckdose (SK1, rect) +
  // PE-Kontakt der danebenliegenden Anschlussdose (SK2, grauer Kontakt im
  // PE-Block) - diesmal beide Sonden innerhalb des Steckdosen-Views, kein
  // Schaltkasten-Kontakt beteiligt.
  await pruefe('RLOW: WORKAROUND - PE-Kontakt der oberen Steckdose + PE-Kontakt der Anschlussdose daneben zeigt 0Ω', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF'); // RLOW ist Default-Funktion
    await page.locator('#steckdosen rect[fill="#666666"]').first().click({ force: true }); // schwarz, Steckdosen-PE (SK1)
    await page.locator('#steckdosen circle[fill="#666666"]').nth(4).click({ force: true }); // blau, Anschlussdose-PE (SK2)
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'PE-zu-PE (Steckdose + Anschlussdose, beide im Steckdosen-View) liefert pauschal 0Ω');
    await page.close();
  });

  // testcase_03: obere Steckdose (SK1@180) + mittlere linke Steckdose (SK3,
  // unrotiert) - deckt in einem durchgängigen Testablauf drei Zustände ab.
  // Durch die Rotation von SK1 liegt dort links=N/rechts=L (wie in den
  // FI/RCD-Tests oben verifiziert), bei SK3 (unrotiert) ist es umgekehrt
  // links=L/rechts=N - RLOW braucht dieselbe Funktion auf beiden Sonden
  // (siehe berechneRlowMesswert()), das Ergebnis hängt hier also direkt
  // davon ab, welche Kontakte (links/rechts) angefasst werden. Farbe
  // "umsetzen" braucht zwei Klicks auf die alte Schraube (einmal weiter im
  // Zyklus, einmal zurück auf leer), bevor die neue Schraube die Farbe
  // bekommen kann - genau wie ein Nutzer das am echten Gerät machen würde.
  await pruefe('RLOW: testcase_03 - obere und mittlere linke Steckdose, drei Sonden-Zustände nacheinander', async () => {
    const page = await seiteMitTestcase('testcase_03');
    await klick(page, 'ON/OFF'); // RLOW ist Default-Funktion
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');

    // 1) Schwarz auf SK1 links (N, wegen Rotation), Blau auf SK3 rechts (N)
    // -> gleiche Funktion (N), direkter Durchgang -> 0,00Ω.
    await kreise.nth(1).click({ force: true });
    await kreise.nth(6).click({ force: true });
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'SK1 links (N) + SK3 rechts (N) -> Durchgang');

    // 2) Blau von SK3 rechts auf SK3 links (L) umsetzen -> Schwarz (N) und
    // Blau (L) haben jetzt unterschiedliche Funktion -> kein Durchgang.
    await kreise.nth(6).click({ force: true }); // blau -> grün
    await kreise.nth(6).click({ force: true }); // grün -> leer
    await kreise.nth(5).click({ force: true }); // leer -> blau (frei)
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'SK1 links (N) + SK3 links (L) -> kein gemeinsamer Teilgraph');

    // 3) Schwarz von SK1 links auf SK1 rechts (L, wegen Rotation) umsetzen
    // -> Schwarz (L) und Blau (L) wieder gleiche Funktion, jetzt mit
    // Fehlertabellen-Eintrag auf dem Pfad -> 0,75Ω.
    await kreise.nth(1).click({ force: true }); // schwarz -> grün (blau ist belegt)
    await kreise.nth(1).click({ force: true }); // grün -> leer
    await kreise.nth(0).click({ force: true }); // leer -> schwarz (frei)
    erwarte([await rlowHauptwert(page)], 'R:0,75Ω', 'SK1 rechts (L) + SK3 links (L) -> Fehlertabellen-Summe');

    await page.close();
  });

  // testcase_01: PE-zu-N-WORKAROUND (siehe oben) über den Steckdosen-View -
  // Blau auf den blauen (N-)Kontakt der Anschlussdose (SK2), Schwarz auf den
  // PE-Kontakt der unteren Steckdose (zweite SK1-Platzierung, andere
  // physische Steckdose, aber dieselbe Ader/Netz wie die obere). Kein
  // Fehlertabellen-Eintrag auf dem N-Pfad in testcase_01 -> 0,00Ω, solange
  // alle Schalter Richtung Einspeisung geschlossen sind.
  await pruefe('RLOW: testcase_01 - Anschlussdose (blau=N) + untere Steckdose (PE) zeigt 0,00Ω bei geschlossenen Schaltern', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF');
    await page.locator('#steckdosen circle[fill="#666666"]').nth(2).click({ force: true }); // blau, SK2 N-Block
    await page.locator('#steckdosen rect[fill="#666666"]').nth(2).click({ force: true }); // schwarz, untere Steckdose PE
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'N-Pfad zur Einspeisung geschlossen, keine Fehlertabellen-Einträge in testcase_01');
    await page.close();
  });

  await pruefe('RLOW: testcase_01 - dieselben Sonden bleiben beim Platzhalter, sobald der Hauptschalter offen ist', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF');
    await page.locator('#steckdosen circle[fill="#666666"]').nth(2).click({ force: true }); // blau, SK2 N-Block
    await page.locator('#steckdosen rect[fill="#666666"]').nth(2).click({ force: true }); // schwarz, untere Steckdose PE
    await schalterKlick(page, '12', '572'); // Hauptschalter
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Hauptschalter offen -> N-Pfad zur Einspeisung unterbrochen');
    await page.close();
  });

  await pruefe('RLOW: testcase_01 - dieselben Sonden bleiben beim Platzhalter, sobald RCD1 offen ist (Hauptschalter zu)', async () => {
    const page = await seiteMitTestcase('testcase_01');
    await klick(page, 'ON/OFF');
    await page.locator('#steckdosen circle[fill="#666666"]').nth(2).click({ force: true }); // blau, SK2 N-Block
    await page.locator('#steckdosen rect[fill="#666666"]').nth(2).click({ force: true }); // schwarz, untere Steckdose PE
    await schalterKlick(page, '8', '322'); // RCD1
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1 offen -> N-Pfad zur Einspeisung unterbrochen');
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
