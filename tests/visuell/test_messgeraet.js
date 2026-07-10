// Interaktions-Tests für das Messgerät (view/messgeraet.js + controller/app.js).
// Kein Pixel-Snapshot-Vergleich (die Optik ändert sich noch zu oft dafür,
// siehe run_tests.js für den Snapshot-Ansatz beim Schaltkasten) - stattdessen
// treibt jeder Test die echte App per Playwright (◄►/▲/▼/Drehknopf-Klicks) und
// prüft den tatsächlich gerenderten Display-Text. Aufruf: node tests/visuell/test_messgeraet.js

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

// Alle sichtbaren <text>-Inhalte im Messgerät-SVG - Assertions prüfen per
// includes() darauf, statt exakte Positionen/Reihenfolge vorauszusetzen.
async function displayTexte(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#messgeraet svg text')].map((t) => t.textContent)
  );
}

async function klick(page, label) {
  await page.getByText(label, { exact: true }).click();
}

async function drehknopfKlick(page) {
  await page.locator('#messgeraet svg circle[fill="#1a1a1a"]').click({ force: true });
}

function erwarte(texte, wert, kontext) {
  if (!texte.includes(wert)) {
    throw new Error(`${kontext}: erwarte "${wert}" im Display, gefunden: [${texte.join(', ')}]`);
  }
}

function erwarteNicht(texte, wert, kontext) {
  if (texte.includes(wert)) {
    throw new Error(`${kontext}: "${wert}" sollte NICHT im Display stehen, gefunden: [${texte.join(', ')}]`);
  }
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

  // Frische Seite pro Test - App-Zustand lebt in start()'s Closure, ein
  // erneutes goto() garantiert einen sauberen Ausgangszustand ohne dass Tests
  // sich gegenseitig beeinflussen.
  async function neueSeite() {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForSelector('#messgeraet svg');
    await klick(page, 'ON/OFF');
    return page;
  }

  // Wie neueSeite(), aber mit einem konkreten Testcase statt der
  // Default-Anlage (beispiel_eg.json) - nötig für RLOW-Messungen, die einen
  // Verbindungsgraphen (graph.json, siehe KONZEPT.md "Pfadverfolgung und
  // Fehlersimulation") brauchen, den nur Testcases mit netzplan.md haben.
  async function neueSeiteMitTestcase(testcaseName) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/${testcaseName}/anlage.json`);
    await page.waitForSelector('#messgeraet svg');
    await klick(page, 'ON/OFF');
    return page;
  }

  function rlowHauptwert(page) {
    return page.evaluate(() =>
      [...document.querySelectorAll('#messgeraet svg text')].find((t) => t.textContent.startsWith('R:'))?.textContent
    );
  }

  await pruefe('Drehknopf: voller Zyklus kommt zurück zu RLOW', async () => {
    const page = await neueSeite();
    const titelProFunktion = ['R ISO', 'Zl', 'Zs', 'RCD I', 'TRMS Spannung', 'Durchgang'];
    for (const titel of titelProFunktion) {
      await drehknopfKlick(page);
      erwarte(await displayTexte(page), titel, `nach Drehknopf-Klick (erwarte ${titel})`);
    }
    await page.close();
  });

  await pruefe('◄►: Wrap-around bei ZI landet wieder auf dem Titel', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RLOW -> RISO
    await drehknopfKlick(page); // RISO -> ZI
    for (let i = 0; i < 4; i++) await klick(page, '◄►'); // Titel -> LS-Typ -> Bemessungsstrom -> Abschaltzeit -> Titel
    await klick(page, '▲'); // nur wirksam, wenn Titel (zone1Auswahl 0) tatsächlich wieder ausgewählt ist
    erwarte(await displayTexte(page), 'ΔU', 'Titel nach 4x ◄► + ▲ (erwarte ΔU-Ansicht)');
    await page.close();
  });

  await pruefe('RLOW: Titel togglet Durchgang <-> R LOW mit R+/R-', async () => {
    const page = await neueSeite();
    let texte = await displayTexte(page);
    erwarte(texte, 'Durchgang', 'RLOW Start');
    erwarteNicht(texte, 'R+:___', 'RLOW Start (kein R+/R-)');

    await klick(page, '▲');
    texte = await displayTexte(page);
    erwarte(texte, 'R LOW', 'RLOW nach Titel-Toggle');
    erwarte(texte, 'R+:___', 'RLOW nach Titel-Toggle (R+)');
    erwarte(texte, 'R-:___', 'RLOW nach Titel-Toggle (R-)');

    await klick(page, '▲');
    texte = await displayTexte(page);
    erwarte(texte, 'Durchgang', 'RLOW nach zweitem Titel-Toggle (zurück)');
    erwarteNicht(texte, 'R+:___', 'RLOW nach zweitem Titel-Toggle (R+ wieder weg)');
    await page.close();
  });

  await pruefe('RLOW: kalibrierter Widerstand ±0,1Ω, Floor bei 0 zeigt ___Ω', async () => {
    const page = await neueSeite();
    await klick(page, '◄►');
    erwarte(await displayTexte(page), '0,4Ω', 'RLOW Widerstand Default');

    for (let i = 0; i < 4; i++) await klick(page, '▼'); // 0,4 -> 0,0
    erwarte(await displayTexte(page), '___Ω', 'RLOW Widerstand bei 0 (Platzhalter statt 0,0Ω)');
    erwarteNicht(await displayTexte(page), '0,0Ω', 'RLOW Widerstand bei 0 (kein 0,0Ω)');

    await klick(page, '▼'); // bleibt bei ___Ω (geklemmt)
    erwarte(await displayTexte(page), '___Ω', 'RLOW Widerstand unter 0 bleibt geklemmt');

    await klick(page, '▲');
    erwarte(await displayTexte(page), '0,1Ω', 'RLOW Widerstand nach Klemmen wieder hoch');
    await page.close();
  });

  await pruefe('RISO: Prüfspannung wandert durch Liste, an beiden Enden geklemmt', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RLOW -> RISO
    await klick(page, '◄►');
    erwarte(await displayTexte(page), '500V', 'RISO Default');

    for (let i = 0; i < 3; i++) await klick(page, '▼'); // 500 -> 250 -> 100 -> 50
    erwarte(await displayTexte(page), '50V', 'RISO untere Grenze');
    await klick(page, '▼');
    erwarte(await displayTexte(page), '50V', 'RISO bleibt bei unterer Grenze geklemmt');

    for (let i = 0; i < 4; i++) await klick(page, '▲'); // 50 -> 100 -> 250 -> 500 -> 1000
    erwarte(await displayTexte(page), '1000V', 'RISO obere Grenze');
    await klick(page, '▲');
    erwarte(await displayTexte(page), '1000V', 'RISO bleibt bei oberer Grenze geklemmt');
    await page.close();
  });

  await pruefe('ZI: LS-Typ/Bemessungsstrom/Abschaltzeit ändern, Lim live neu berechnet', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RLOW -> RISO
    await drehknopfKlick(page); // RISO -> ZI
    erwarte(await displayTexte(page), 'Lim: 80,0A', 'ZI Lim Default (B, 16A -> 5*16)');

    await klick(page, '◄►'); // LS-Typ auswählen
    await klick(page, '▲'); // B -> C
    let texte = await displayTexte(page);
    erwarte(texte, 'C', 'ZI LS-Typ nach 1x ▲');
    erwarte(texte, 'Lim: 160,0A', 'ZI Lim nach LS-Typ-Wechsel (C, 16A -> 10*16)');

    await klick(page, '◄►'); // Bemessungsstrom auswählen
    await klick(page, '▲'); // 16A -> 20A
    texte = await displayTexte(page);
    erwarte(texte, '20A', 'ZI Bemessungsstrom nach 1x ▲');
    erwarte(texte, 'Lim: 200,0A', 'ZI Lim nach Bemessungsstrom-Wechsel (C, 20A -> 10*20)');
    await page.close();
  });

  await pruefe('ZI: LS-Typ-Liste wandert bis gG und bleibt dort geklemmt', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await klick(page, '◄►');
    for (let i = 0; i < 8; i++) await klick(page, '▲'); // B->C->D->K->Z->L->U->NV->gG
    erwarte(await displayTexte(page), 'gG', 'ZI LS-Typ obere Grenze (gG)');
    await klick(page, '▲');
    erwarte(await displayTexte(page), 'gG', 'ZI LS-Typ bleibt bei gG geklemmt');
    await page.close();
  });

  await pruefe('ZI: ΔU-Ansicht zeigt Spannungsfall/Zref, kein Isc/Lim, LS-Werte geteilt', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await klick(page, '◄►'); // Titel -> LS-Typ (zone1Auswahl 0 -> 1)
    await klick(page, '▲'); // B -> C (soll in ΔU-Ansicht sichtbar bleiben)

    // 3 weitere ◄►-Klicks: LS-Typ -> Bemessungsstrom -> Abschaltzeit -> Titel
    // (normale Zl-Ansicht hat 4 Felder: Titel + 3 titelWerte, Index 1 -> 0 braucht 3 Schritte)
    await klick(page, '◄►');
    await klick(page, '◄►');
    await klick(page, '◄►');
    await klick(page, '▲'); // Titel -> ΔU-Ansicht

    const texte = await displayTexte(page);
    erwarte(texte, 'ΔU', 'ΔU-Ansicht Titel');
    erwarte(texte, '4,0%', 'ΔU-Ansicht Spannungsfall-Default');
    erwarte(texte, 'C', 'ΔU-Ansicht übernimmt vorher gesetzten LS-Typ (C)');
    erwarte(texte, 'ΔU: ___%', 'ΔU-Ansicht Zone-2-Zeile ΔU');
    erwarte(texte, 'Isc:___A', 'ΔU-Ansicht Zone-2-Zeile Isc');
    erwarte(texte, 'Z:___Ω', 'ΔU-Ansicht Zone-2-Zeile Z');
    erwarte(texte, 'Zref: 0,1Ω', 'ΔU-Ansicht Zone-2-Zeile Zref');
    erwarteNicht(texte, 'Lim: 160,0A', 'ΔU-Ansicht zeigt kein Isc/Lim über dem Strich');
    await page.close();
  });

  // ZI und ZS haben getrennte Variablen (zsLsTypIndex/ziLsTypIndex etc.) -
  // eine Änderung an ZI darf sich nicht auf das GLEICHZEITIG bestehende
  // ZS-Display auswirken. Ein Ausflug per Drehknopf zu ZS und zurück zu ZI
  // ist bewusst kein Test für "Werte bleiben erhalten" - laut
  // setzeBearbeitungenZurueck() (siehe controller/app.js) werden ALLE
  // bearbeitbaren Werte bei jedem Drehknopf-/ON-OFF-Klick zurückgesetzt, das
  // gilt für ZI genauso wie für ZS.
  await pruefe('ZI und ZS: unabhängige Variablen (gleichzeitig, nicht über Drehknopf-Wechsel hinweg)', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RISO
    await drehknopfKlick(page); // ZI
    await klick(page, '◄►');
    await klick(page, '▲'); // ZI LS-Typ B -> C

    await drehknopfKlick(page); // ZI -> ZS
    const texteZs = await displayTexte(page);
    erwarte(texteZs, 'B', 'ZS bleibt beim eigenen Default (B), unbeeinflusst von ZI-Änderung');
    erwarteNicht(texteZs, 'Lim: 160,0A', 'ZS-Lim unverändert (nicht das von ZI beeinflusste C-Lim)');
    await page.close();
  });

  await pruefe('Drehknopf-Wechsel setzt bearbeitete Werte zurück (auch beim Zurückkommen)', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RISO
    await drehknopfKlick(page); // ZI
    await klick(page, '◄►');
    await klick(page, '▲'); // ZI LS-Typ B -> C
    erwarte(await displayTexte(page), 'C', 'ZI LS-Typ vor dem Ausflug ist C');

    await drehknopfKlick(page); // ZI -> ZS
    await drehknopfKlick(page); // ZS -> FI/RCD
    await drehknopfKlick(page); // FI/RCD -> V~
    await drehknopfKlick(page); // V~ -> RLOW
    await drehknopfKlick(page); // RLOW -> RISO
    await drehknopfKlick(page); // RISO -> ZI
    erwarte(await displayTexte(page), 'B', 'ZI LS-Typ ist nach dem Ausflug wieder auf Default B zurückgesetzt');
    await page.close();
  });

  await pruefe('ZS: ZSrcd-Ansicht mit Std/Low-Toggle und rechtsbündiger Abschaltzeit', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RISO
    await drehknopfKlick(page); // ZI
    await drehknopfKlick(page); // ZS

    await klick(page, '▲'); // Zs -> ZSrcd
    let texte = await displayTexte(page);
    erwarte(texte, 'ZSrcd', 'ZS Titel-Toggle zu ZSrcd');
    erwarte(texte, 'Std', 'ZSrcd Default Std');

    await klick(page, '◄►'); // Std auswählen
    await klick(page, '▼'); // Std -> Low (Toggle, nicht geklemmt - auch mit ▼ erreichbar)
    erwarte(await displayTexte(page), 'Low', 'ZSrcd Std -> Low per Pfeil unten');
    await klick(page, '▼'); // Low -> Std (Toggle in dieselbe Richtung erneut)
    erwarte(await displayTexte(page), 'Std', 'ZSrcd Low -> Std per Pfeil unten (reines Toggle)');

    // Zone 2/Isc/Lim bleiben in ZSrcd wie in der normalen Zs-Ansicht sichtbar.
    texte = await displayTexte(page);
    erwarte(texte, 'Z:---Ω', 'ZSrcd Hauptmesswert unverändert wie bei Zs');
    erwarte(texte, 'Lim: 80,0A', 'ZSrcd zeigt weiterhin Isc/Lim');
    await page.close();
  });

  await pruefe('FI/RCD: Fehlerstrom und Typ wandern durch Liste, an beiden Enden geklemmt', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RISO
    await drehknopfKlick(page); // ZI
    await drehknopfKlick(page); // ZS
    await drehknopfKlick(page); // FI/RCD

    let texte = await displayTexte(page);
    erwarte(texte, '30mA', 'FI/RCD Fehlerstrom Default');
    erwarte(texte, 'AC', 'FI/RCD Typ Default');

    await klick(page, '◄►'); // Fehlerstrom auswählen
    await klick(page, '▼'); // 30mA -> 10mA
    erwarte(await displayTexte(page), '10mA', 'FI/RCD Fehlerstrom untere Grenze');
    await klick(page, '▼');
    erwarte(await displayTexte(page), '10mA', 'FI/RCD Fehlerstrom bleibt geklemmt');
    for (let i = 0; i < 4; i++) await klick(page, '▲'); // 10 -> 30 -> 100 -> 300 -> 500mA
    erwarte(await displayTexte(page), '500mA', 'FI/RCD Fehlerstrom obere Grenze');

    await klick(page, '◄►'); // Typ auswählen
    for (let i = 0; i < 4; i++) await klick(page, '▲'); // AC -> A -> F -> B -> B+
    erwarte(await displayTexte(page), 'B+', 'FI/RCD Typ obere Grenze');
    await klick(page, '▲');
    erwarte(await displayTexte(page), 'B+', 'FI/RCD Typ bleibt geklemmt');
    await page.close();
  });

  // --- RLOW-Messung über Messspitzen + Verbindungsgraph (testcase_01) ---
  // Deckt die Netz-IDs aus testcase_01/netzplan.md ab (siehe auch die
  // gleichen IDs in test_generator.js): N1 = Leistungsschalter.i1 (L1),
  // N13 = Reihenklemme_L_SK1.o1 (L1, über RCD1+LS1 erreichbar), N2 =
  // Leistungsschalter.i2 (N).

  await pruefe('RLOW: Messspitzen auf demselben L1-Pfad zeigen 0,0Ω', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW vor Messspitzen');

    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click(); // blau
    erwarte([await rlowHauptwert(page)], 'R:0,0Ω', 'RLOW mit beiden Messspitzen auf L1-Pfad');
    await page.close();
  });

  await pruefe('RLOW: Messspitzen auf unterschiedlicher Funktion (L1/N) zeigen keinen Wert', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N2"]').click(); // blau, N
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW bei L1+N (kein gemeinsamer Teilgraph)');
    await page.close();
  });

  await pruefe('RLOW: nur eine Messspitze zeigt keinen Wert', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW mit nur einer Messspitze');
    await page.close();
  });

  // RCD1.o1 speist LS1 (N6) UND LS2 (N7) über dieselbe physische Schraube
  // (siehe netzplan.md-Annahme 2, ader.weitere in generate_anlage.js). Eine
  // Messspitze an dieser geteilten Schraube trägt data-netz="N6" +
  // data-netz-weitere="N7" - der Messwert muss trotzdem über N7 zum
  // LS2-Ausgang (N12) gefunden werden, nicht nur über die Haupt-Ader N6.
  await pruefe('RLOW: Messspitze an geteilter RCD-Schraube erreicht auch den LS2-Zweig (ader.weitere)', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N6"][data-netz-weitere]').first().click(); // schwarz, geteilte RCD-Ausgangsschraube
    await page.locator('#schaltkasten svg circle[data-netz="N12"][cy="420"]').click(); // blau, LS2-Ausgang
    erwarte([await rlowHauptwert(page)], 'R:0,0Ω', 'RLOW von geteilter RCD-Schraube (N6+N7) zu LS2-Ausgang (N12)');
    await page.close();
  });

  await pruefe('RLOW: Ausschalten entfernt Messspitzen, Messwert geht auf Platzhalter zurück', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();
    erwarte([await rlowHauptwert(page)], 'R:0,0Ω', 'RLOW vor dem Ausschalten');

    await klick(page, 'ON/OFF'); // aus
    await klick(page, 'ON/OFF'); // wieder an
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW nach Aus-/Wiedereinschalten (Messspitzen weg)');
    await page.close();
  });

  // --- Schalter (LS/RCD/Leistungsschalter) unterbrechen den Verbindungsgraphen ---
  // LS1 liegt im Pfad zwischen N1 (Leistungsschalter.i1) und N13
  // (Reihenklemme_L_SK1.o1) - Schalter-Box bei x=78,y=322 in testcase_01
  // (siehe schalterBreite()/geraet() in schaltkasten.js für die Positionsformel).

  await pruefe('Schalter: Öffnen von LS1 unterbricht eine laufende RLOW-Messung', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();
    erwarte([await rlowHauptwert(page)], 'R:0,0Ω', 'RLOW mit LS1 geschlossen (Default)');

    const ls1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="78"][y="322"]') });
    await ls1.click(); // LS1 öffnen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW nach Öffnen von LS1 (Pfad unterbrochen)');

    await ls1.click(); // LS1 wieder schließen
    erwarte([await rlowHauptwert(page)], 'R:0,0Ω', 'RLOW nach erneutem Schließen von LS1');
    await page.close();
  });

  await pruefe('Schalter: Zustand bleibt beim Aus-/Einschalten des Messgeräts erhalten (anders als Messspitzen)', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    const ls1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="78"][y="322"]') });
    await ls1.click(); // LS1 öffnen

    await klick(page, 'ON/OFF'); // aus (Messspitzen werden entfernt, Schalterzustand nicht)
    await klick(page, 'ON/OFF'); // wieder an

    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'LS1 ist nach Aus-/Wiedereinschalten weiterhin offen');
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
