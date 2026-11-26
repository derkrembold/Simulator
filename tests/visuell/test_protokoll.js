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

  await pruefe('Protokoll: Breite entspricht der dargestellten Schaltkasten-Breite', async () => {
    const page = await neueSeite();
    const breiten = await page.evaluate(() => ({
      schaltkasten: document.querySelector('#schaltkasten svg').getBoundingClientRect().width,
      protokoll: document.getElementById('protokoll').getBoundingClientRect().width
    }));
    if (Math.abs(breiten.schaltkasten - breiten.protokoll) > 0.5) {
      throw new Error(`erwarte Protokoll-Breite ${breiten.schaltkasten}px, gefunden ${breiten.protokoll}px`);
    }
    await page.close();
  });

  // Absichtlich ein breiterer Viewport als die Spalte (sim-rng: höchstens
  // 780 px, zentriert) - Schaltkasten und Protokoll müssen dieselbe linke
  // Kante haben.
  await pruefe('Protokoll: linke Kante steht bündig unter der Schaltkasten-Kante', async () => {
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

  await pruefe('Protokoll: Stromkreisverteiler-Tabelle hat 19 Datenspalten, zweizeiligen Gruppenkopf, 15 Datenzeilen, und braucht horizontalen Scroll', async () => {
    const page = await neueSeite();
    const info = await page.evaluate(() => {
      const scrollDiv = document.querySelector('#protokoll .pf-scroll');
      const tabelle = scrollDiv.querySelector('table');
      return {
        spaltenDatenzeile: tabelle.rows[2].cells.length,
        obereKopfzeile: tabelle.rows[0].cells.length,
        untereKopfzeile: tabelle.rows[1].cells.length,
        zeilen: tabelle.rows.length,
        brauchtScroll: scrollDiv.scrollWidth > scrollDiv.clientWidth,
        ersteZielbezeichnung: tabelle.rows[2].cells[1].querySelector('input').value
      };
    });
    if (info.spaltenDatenzeile !== 19) throw new Error(`erwarte 19 Datenspalten, gefunden ${info.spaltenDatenzeile}`);
    if (info.obereKopfzeile !== 7) throw new Error(`erwarte 7 Zellen in oberer Kopfzeile (3 rowspan + 4 Gruppen), gefunden ${info.obereKopfzeile}`);
    if (info.untereKopfzeile !== 16) throw new Error(`erwarte 16 Zellen in unterer Kopfzeile (Unterspalten der 4 Gruppen), gefunden ${info.untereKopfzeile}`);
    if (info.zeilen !== 17) throw new Error(`erwarte 17 Zeilen (2 Kopf + 15 Daten), gefunden ${info.zeilen}`);
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

  // --- Tastatur-Bedienung (sim-k3t) ---

  // Beschreibung des fokussierten Elements: Abschnitt, Zeile, Spalte bzw.
  // Label, damit die Erwartungen lesbar bleiben.
  const fokus = (page) => page.evaluate(() => {
    const el = document.activeElement;
    const abschnitt = el.closest('.pf-abschnitt')?.querySelector('.pf-abschnitt-titel')?.textContent ?? '';
    const zelle = el.closest('td');
    if (zelle) return `${abschnitt}|${zelle.parentElement.rowIndex}|${zelle.cellIndex}|${el.classList.contains('pf-cb') ? 'cb' : 'feld'}`;
    return `${abschnitt}|${el.closest('.pf-zeile')?.querySelector('.pf-label')?.textContent ?? ''}|${el.tagName}`;
  });
  const zelleFokussieren = (page, titel, zeile, spalte) => page.evaluate(({ titel, zeile, spalte }) => {
    const ab = [...document.querySelectorAll('#protokoll .pf-abschnitt')].find((a) => a.querySelector('.pf-abschnitt-titel').textContent === titel);
    ab.querySelector('table').rows[zeile].cells[spalte].querySelector('input, .pf-cb').focus();
  }, { titel, zeile, spalte });

  await pruefe('Tastatur (sim-k3t): Tab hält nur am ersten Kästchen einer Zeile, dann Bemerkung, dann nächste Zeile', async () => {
    const page = await neueSeite();
    await zelleFokussieren(page, 'Besichtigen', 1, 1);
    const folge = [await fokus(page)];
    for (let i = 0; i < 2; i++) { await page.keyboard.press('Tab'); folge.push(await fokus(page)); }
    const soll = ['Besichtigen|1|1|cb', 'Besichtigen|1|3|feld', 'Besichtigen|2|1|cb'];
    if (folge.join(' > ') !== soll.join(' > ')) throw new Error(`Fokusfolge ${folge.join(' > ')}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t): Pfeil rechts zum zweiten Kästchen, Leertaste und Enter kreuzen an, aria-checked folgt', async () => {
    const page = await neueSeite();
    await zelleFokussieren(page, 'Besichtigen', 1, 1);
    await page.keyboard.press('ArrowRight');
    const ort = await fokus(page);
    await page.keyboard.press(' ');
    const nachLeertaste = await page.evaluate(() => [document.activeElement.textContent, document.activeElement.getAttribute('aria-checked')].join());
    await page.keyboard.press('Enter');
    const nachEnter = await page.evaluate(() => document.activeElement.textContent);
    if (ort !== 'Besichtigen|1|2|cb') throw new Error(`Pfeil rechts landet bei ${ort}`);
    if (nachLeertaste !== '☒,true' || nachEnter !== '☐') throw new Error(`Leertaste: ${nachLeertaste}, Enter: ${nachEnter}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t): Messtabelle Pfeil hoch/runter, Enter eine Zeile tiefer, links/rechts erst am Rand des Textes', async () => {
    const page = await neueSeite();
    const titel = 'Messen – Stromkreisverteiler';
    await zelleFokussieren(page, titel, 3, 6);
    const folge = [];
    await page.keyboard.press('ArrowDown'); folge.push(await fokus(page));
    await page.keyboard.press('Enter'); folge.push(await fokus(page));
    await page.keyboard.press('ArrowUp'); folge.push(await fokus(page));
    await page.keyboard.type('0,25');
    await page.keyboard.press('ArrowLeft'); folge.push(await fokus(page)); // Cursor bewegt sich im Text
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowRight'); folge.push(await fokus(page)); // am Ende: Nachbarzelle
    const soll = [`${titel}|4|6|feld`, `${titel}|5|6|feld`, `${titel}|4|6|feld`, `${titel}|4|6|feld`, `${titel}|4|7|feld`];
    if (folge.join(' > ') !== soll.join(' > ')) throw new Error(`Fokusfolge ${folge.join(' > ')}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t): Enter springt in Kopfdaten zum nächsten Feld, in mehrzeiligen Feldern Zeilenumbruch', async () => {
    const page = await neueSeite();
    await page.evaluate(() => {
      const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Beginn Prüfung');
      z.querySelector('input').focus();
    });
    await page.keyboard.press('Enter');
    const nachEnter = await fokus(page);
    await page.evaluate(() => [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Anlage').querySelector('textarea').focus());
    await page.keyboard.type('UV');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Keller');
    const textarea = await page.evaluate(() => [document.activeElement.tagName, document.activeElement.value].join('|'));
    if (nachEnter !== 'Kopfdaten|Ende Prüfung|INPUT') throw new Error(`Enter in Beginn Prüfung landet bei ${nachEnter}`);
    if (textarea !== 'TEXTAREA|UV\nKeller') throw new Error(`Anlage: ${JSON.stringify(textarea)}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t): Klick auf den Text neben einem Kästchen kreuzt an, Pfeil links/rechts innerhalb der Gruppe', async () => {
    const page = await neueSeite();
    const ergebnis = await page.evaluate(() => {
      const option = [...document.querySelectorAll('#protokoll .pf-cboption')].find((o) => o.textContent.includes('Wiederholungsprüfung'));
      option.click();
      return option.querySelector('.pf-cb').textContent;
    });
    await page.evaluate(() => {
      const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Netzform');
      z.querySelector('.pf-cb').focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const option = await page.evaluate(() => document.activeElement.closest('.pf-cboption').textContent.replace(/[☐☒]/g, '').trim());
    if (ergebnis !== '☒') throw new Error(`Klick auf "Wiederholungsprüfung": ${ergebnis}`);
    if (option !== 'TN-C-S') throw new Error(`zweimal Pfeil rechts ab TN-C landet bei ${option}`);
    await page.close();
  });

  // Review Codex/Gemini zu sim-k3t.
  await pruefe('Tastatur (sim-k3t, Review): U_L im Tabellenkopf - Enter und Pfeil runter in die Umess-Spalte, Pfeil hoch zurück', async () => {
    const page = await neueSeite();
    const titel = 'Messen – Stromkreisverteiler';
    const ul = () => page.evaluate(() => document.querySelector('#protokoll .pf-scroll th input').focus());
    await ul();
    await page.keyboard.press('Enter');
    const nachEnter = await fokus(page);
    await page.keyboard.press('ArrowUp');
    const zurueck = await page.evaluate(() => document.activeElement.closest('th') !== null);
    await page.keyboard.press('ArrowDown');
    const nachRunter = await fokus(page);
    if (nachEnter !== `${titel}|2|18|feld` || nachRunter !== `${titel}|2|18|feld`) throw new Error(`Enter: ${nachEnter}, Pfeil runter: ${nachRunter}`);
    if (!zurueck) throw new Error('Pfeil hoch aus der Umess-Spalte erreicht das U_L-Feld nicht');
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t, Review): Kästchen haben einen Namen für Screenreader', async () => {
    const page = await neueSeite();
    const namen = await page.evaluate(() => {
      const zeile = [...document.querySelectorAll('#protokoll .pf-tabelle tr')].find((z) => z.cells[0]?.textContent === 'Zugänglichkeit');
      const ja = [...document.querySelectorAll('#protokoll .pf-cboption')].find((o) => o.textContent.includes('Wiederholungsprüfung'));
      return [zeile.querySelectorAll('.pf-cb')[1].getAttribute('aria-label'), ja.querySelector('.pf-cb').getAttribute('aria-label')].join('|');
    });
    if (namen !== 'Zugänglichkeit – n.i.O.|Wiederholungsprüfung') throw new Error(`Namen: ${namen}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t, Review): Pfeil links springt durch gefüllte Felder, Umschalt+Pfeil markiert nur', async () => {
    const page = await neueSeite();
    const titel = 'Messen – Stromkreisverteiler';
    await page.evaluate(() => {
      const zeile = document.querySelector('#protokoll .pf-scroll table').rows[3];
      zeile.cells[5].querySelector('input').value = '0,64';
      zeile.cells[6].querySelector('input').value = '>999';
    });
    await zelleFokussieren(page, titel, 3, 7);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    const nachLinks = await fokus(page);
    await page.keyboard.press('Shift+ArrowLeft');
    const nachUmschalt = await fokus(page);
    if (nachLinks !== `${titel}|3|5|feld`) throw new Error(`zweimal Pfeil links landet bei ${nachLinks}`);
    if (nachUmschalt !== `${titel}|3|5|feld`) throw new Error(`Umschalt+Pfeil links springt nach ${nachUmschalt}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t, Review): Klick auf Text bzw. freie Zellenfläche kreuzt an und setzt den Fokus aufs Kästchen', async () => {
    const page = await neueSeite();
    const ergebnis = await page.evaluate(() => {
      const option = [...document.querySelectorAll('#protokoll .pf-cboption')].find((o) => o.textContent.includes('Neuanlage'));
      option.click();
      const fokusNachText = document.activeElement === option.querySelector('.pf-cb');
      const zelle = [...document.querySelectorAll('#protokoll .pf-tabelle tr')].find((z) => z.cells[0]?.textContent === 'Zugänglichkeit').cells[1];
      zelle.click();
      return [fokusNachText, option.querySelector('.pf-cb').textContent, zelle.querySelector('.pf-cb').textContent].join();
    });
    if (ergebnis !== 'true,☒,☒') throw new Error(`Fokus/Kreuze: ${ergebnis}`);
    await page.close();
  });

  await pruefe('Tastatur (sim-k3t, Review): rot markiertes Feld zeigt beim Tastatur-Fokus den blauen Rahmen', async () => {
    const page = await neueSeite();
    await zelleFokussieren(page, 'Messen – Stromkreisverteiler', 3, 6);
    await page.evaluate(() => document.querySelector('#protokoll .pf-scroll table').rows[4].cells[6].querySelector('input').classList.add('pf-fehler'));
    await page.keyboard.press('ArrowDown');
    const rahmen = await page.evaluate(() => getComputedStyle(document.activeElement).outlineColor);
    if (rahmen !== 'rgb(26, 95, 180)') throw new Error(`Fokus-Rahmen auf rotem Feld: ${rahmen}`);
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
