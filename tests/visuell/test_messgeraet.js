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

// Füllfarben der beiden Ampel-Leuchtstreifen links/rechts im Display-Rahmen
// (siehe view/messgeraet.js zeichneDisplay(), 6px breit, Display-Höhe) - in
// der Reihenfolge [links, rechts].
async function ampelFarben(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#messgeraet svg rect')]
      .filter((r) => r.getAttribute('width') === '6' && r.getAttribute('height') === '190')
      .map((r) => r.getAttribute('fill'))
  );
}

// Ob der Pfeil/Sanduhr-Kasten unten links durchgestrichen ist (siehe
// view/messgeraet.js zeichneKastenIndikator() - die beiden Diagonal-Linien
// nutzen als einzige <line>-Elemente stroke-width 1.5).
async function indikatorDurchgestrichen(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#messgeraet svg line')]
      .some((l) => l.getAttribute('stroke-width') === '1.5')
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

function erwarteGleich(tatsaechlich, erwartet, kontext) {
  const t = JSON.stringify(tatsaechlich);
  const e = JSON.stringify(erwartet);
  if (t !== e) {
    throw new Error(`${kontext}: erwarte ${e}, gefunden ${t}`);
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

  // Findet den Schalter-Hebel (`<g style="cursor:pointer">`, siehe
  // zeichneSchalter() in schaltkasten.js) eines bestimmten Bauteils - es gibt
  // kein direktes `data-bauteil`-Attribut auf dem Hebel selbst, daher über
  // die Nähe (2D-Distanz) zur (bereits per data-bauteil auffindbaren)
  // Schraube desselben Geräts identifiziert (Hebel sitzt immer mittig über
  // dessen eigenen Schrauben). BUGFIX (2026-07-24, User-gemeldet über einen
  // fehlgeschlagenen "RCD1 unterbricht den Pfad"-Test): eine erste Version
  // verglich nur die HORIZONTALE Distanz - in testcase_05 fand das
  // fälschlich den Hauptschalter-Hebel (letzte Reihe) statt RCD1s eigenem
  // (erste Hutschienen-Reihe), weil beide Geräte jeweils als erstes in ihrer
  // Reihe stehen und zufällig einen ähnlichen X-Mittelpunkt haben - die
  // Y-Koordinate (andere Reihe) wurde komplett ignoriert. Volle Euklidische
  // Distanz (x UND y) behebt das zuverlässig, da der Zeilenabstand im
  // Schaltkasten immer deutlich größer ist als jede zufällige
  // X-Koinzidenz zwischen Geräten verschiedener Reihen.
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

  await pruefe('RISO: Grenzwert (rechtsbündig) in 10MΩ-Schritten einstellbar, unten bei 0 geklemmt, Reset auf 50MΩ', async () => {
    const page = await neueSeite();
    await drehknopfKlick(page); // RLOW -> RISO
    erwarte(await displayTexte(page), '50MΩ', 'RISO Grenzwert-Default');

    await klick(page, '◄►'); // 0=Titel -> 1=Prüfspannung
    await klick(page, '◄►'); // 1=Prüfspannung -> 2=Grenzwert

    await klick(page, '▲');
    await klick(page, '▲');
    erwarte(await displayTexte(page), '70MΩ', 'Grenzwert nach 2x ▲ (50+2*10)');

    await klick(page, '▼');
    erwarte(await displayTexte(page), '60MΩ', 'Grenzwert nach 1x ▼');

    for (let i = 0; i < 10; i++) await klick(page, '▼');
    erwarte(await displayTexte(page), '0MΩ', 'Grenzwert bleibt bei 0 geklemmt, wird nicht negativ');

    await drehknopfKlick(page); // RISO -> ZI (Bearbeitung geht verloren)
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // voller Zyklus zurück zu RISO
    erwarte(await displayTexte(page), '50MΩ', 'Grenzwert nach Funktionswechsel zurück auf Default');
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

  // Pfad N1->N4->N6->N11->N13 - N6/N11/N13 tragen laut netzplan.md
  // "Fehlertabelle" je einen Beispiel-Fehlerwiderstand (0,1+0,2+0,3=0,6Ω).
  await pruefe('RLOW: Messspitzen auf demselben L1-Pfad summieren die Fehlertabelle', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW vor Messspitzen');

    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click(); // blau
    erwarte([await rlowHauptwert(page)], 'R:0,60Ω', 'RLOW mit beiden Messspitzen auf L1-Pfad (0,1+0,2+0,3Ω)');
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

  // WORKAROUND (siehe KONZEPT.md "Nächste Schritte" - PE-Teilgraph, und
  // controller/app.js berechneRlowMesswert()): PE ist noch kein eigener
  // Teilgraph im Verbindungsgraphen, eine PE-zu-PE-Messung würde deshalb
  // ohne Sonderfall immer beim Platzhalter bleiben - obwohl PE in diesem
  // Modell nie geschaltet wird und elektrisch immer durchgängig ist. Bis
  // der echte PE-Teilgraph existiert: PE-zu-PE liefert pauschal 0Ω, egal an
  // welchen zwei PE-Bauteilen die Messspitzen sitzen (hier: Reihenklemme_PE
  // N9 und die anlagenweite PE-Klemme N3, zwei unterschiedliche Netze).
  await pruefe('RLOW: WORKAROUND - PE-zu-PE (Reihenklemme + PE-Klemme, unterschiedliche Netze) zeigt 0Ω', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N9"]').first().click(); // schwarz, Reihenklemme_PE_SK1
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').first().click(); // blau, PE-Klemme
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'PE-zu-PE liefert pauschal 0Ω (Workaround ohne PE-Teilgraph)');
    await page.close();
  });

  // WORKAROUND PE-zu-N (siehe KONZEPT.md "Nächste Schritte" - PE-Teilgraph,
  // und controller/app.js berechneRlowMesswert()): eine Sonde auf PE (gilt
  // wie oben als immer durchgängig), die andere auf N - die Messung läuft
  // dann nur über den N-Pfad zur Einspeisung (`findePfadZurEinspeisung()`,
  // dieselbe Funktion wie bei ZI/ZS), OHNE feste Vorimpedanz (anders als
  // ZS), da es ein RLOW-Wert bleibt. testcase_02 hat mit N10 (RCD1.o2)
  // extra einen Fehlertabellen-Eintrag auf dem N-Pfad (0,30Ω).
  await pruefe('RLOW: WORKAROUND - PE-zu-N summiert die Fehlertabelle auf dem N-Pfad zur Einspeisung (ohne Vorimpedanz)', async () => {
    const page = await neueSeiteMitTestcase('testcase_02');
    await page.locator('#schaltkasten svg circle[data-netz="N10"]').first().click(); // schwarz, N (RCD1.o2)
    await page.locator('#schaltkasten svg circle[data-farbe="gn-ge"]').first().click(); // blau, PE
    erwarte([await rlowHauptwert(page)], 'R:0,30Ω', 'N-Pfad zur Einspeisung geschlossen -> nur Fehlertabelle (N10), keine Vorimpedanz');
    await page.close();
  });

  await pruefe('RLOW: WORKAROUND - PE-zu-N bleibt beim Platzhalter, solange ein Schalter Richtung Einspeisung offen ist', async () => {
    const page = await neueSeiteMitTestcase('testcase_02');
    await page.locator('#schaltkasten svg circle[data-netz="N10"]').first().click(); // schwarz, N (RCD1.o2)
    await page.locator('#schaltkasten svg circle[data-farbe="gn-ge"]').first().click(); // blau, PE
    erwarte([await rlowHauptwert(page)], 'R:0,30Ω', 'zunächst wie im vorigen Test durchgängig');

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 öffnen -> N-Pfad zur Einspeisung unterbrochen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1 offen -> N-Pfad zur Einspeisung unterbrochen, Platzhalter bleibt');
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
    // Pfad geht über die "weitere"-Ader N7 (N6->N4->N7->N12), N6 trägt laut
    // Fehlertabelle 0,1Ω, N4/N7/N12 keinen Eintrag -> Summe 0,1Ω.
    erwarte([await rlowHauptwert(page)], 'R:0,10Ω', 'RLOW von geteilter RCD-Schraube (N6+N7) zu LS2-Ausgang (N12)');
    await page.close();
  });

  // Bug (siehe schaltkasten.js): reihenklemmen_eingang.pe kann null sein,
  // wenn die PE-Reihenklemme kein eigenes Zubringerkabel hat (PE kommt dann
  // nur über den Hutschienen-Bond, siehe generate_anlage.js). Der Fallback
  // auf die Ausgangsseite griff vorher nur, wenn das GANZE
  // reihenklemmen_eingang-Objekt fehlte, nicht pro Feld - die obere
  // PE-Reihenklemmen-Schraube bekam dadurch gar keinen Klick-Handler
  // (schraube() lässt eine Schraube ohne Ader komplett unklickbar).
  // testcase_01/SK2 hat genau diesen Fall (reihenklemmen_eingang.pe: null).
  await pruefe('Schaltkasten: obere PE-Reihenklemme ohne eigenes Zubringerkabel ist trotzdem als Messpunkt klickbar (SK2)', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    const obereSchraube = page.locator('#schaltkasten svg circle[cx="66"][cy="49"]'); // SK2 PE-Reihenklemme, Eingang (oben)

    const hatNetz = await obereSchraube.getAttribute('data-netz');
    if (!hatNetz) {
      throw new Error('Obere PE-Reihenklemme (SK2) hat kein data-netz - Klick-Handler fehlt');
    }

    await obereSchraube.click(); // schwarz setzen
    const overlayAnzahl = await page.evaluate(() =>
      document.querySelectorAll('#schaltkasten svg circle[stroke="#ffffff"]').length
    );
    if (overlayAnzahl !== 1) {
      throw new Error(`Klick auf obere PE-Reihenklemme (SK2) hat keine Messspitze gesetzt (Overlays: ${overlayAnzahl})`);
    }
    await page.close();
  });

  await pruefe('RLOW: Ausschalten entfernt Messspitzen, Messwert geht auf Platzhalter zurück', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await page.locator('#schaltkasten svg circle[data-netz="N1"]').click();
    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click();
    erwarte([await rlowHauptwert(page)], 'R:0,60Ω', 'RLOW vor dem Ausschalten');

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
    erwarte([await rlowHauptwert(page)], 'R:0,60Ω', 'RLOW mit LS1 geschlossen (Default)');

    const ls1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="78"][y="322"]') });
    await ls1.click(); // LS1 öffnen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RLOW nach Öffnen von LS1 (Pfad unterbrochen)');

    await ls1.click(); // LS1 wieder schließen
    erwarte([await rlowHauptwert(page)], 'R:0,60Ω', 'RLOW nach erneutem Schließen von LS1');
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

  // --- testcase_04: 3-poliger Hauptschalter (L1+L2+L3) + 4-poliges RCD ---
  // Einziger Testcase mit mehrpoligen Bauteilen, die mehrere Funktionen
  // (L1/L2/L3) gleichzeitig betreffen - deckt genau das ab, was testcase_01
  // (nur 1-/2-polig) nicht kann: ein Klick auf EINEN Schalter muss mehrere
  // Kanten in verschiedenen Funktions-Teilgraphen gleichzeitig umschalten.
  // Pfade (siehe generate_anlage.js/berechneWiderstand()) - Fehlertabelle mit
  // durchgängig unterschiedlicher zweiter Nachkommastelle, damit sich Summen
  // beim manuellen Nachrechnen eindeutig zuordnen lassen:
  // L1: N6(Hauptschalter.i1) -> N9(.o1/RCD1.i1) -> N20(RCD1.o1/LS1.i1, 0,13Ω) -> N24(LS1.o1, 0,27Ω) = 0,40Ω
  // L2: N7(Hauptschalter.i2) -> N10(.o2/RCD1.i2) -> N21(RCD1.o2/LS2.i1, 0,19Ω) -> N25(LS2.o1, 0,34Ω) = 0,53Ω
  // L3: N8(Hauptschalter.i3) -> N11(.o3/RCD1.i3) -> N22(RCD1.o3/LS3.i1, 0,41Ω) -> N26(LS3.o1, 0,08Ω) = 0,49Ω

  await pruefe('RLOW: testcase_04 (3-poliger Hauptschalter, 4-poliges RCD) summiert die Fehlertabelle auf L1', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await page.locator('#schaltkasten svg circle[data-netz="N9"][cy="260"]').click(); // schwarz, RCD1.i1
    await page.locator('#schaltkasten svg circle[data-netz="N24"][cy="420"]').click(); // blau, LS1.o1
    erwarte([await rlowHauptwert(page)], 'R:0,40Ω', 'RLOW testcase_04 L1-Pfad (0,13+0,27Ω)');
    await page.close();
  });

  await pruefe('RLOW: testcase_04 summiert die Fehlertabelle auf L2', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await page.locator('#schaltkasten svg circle[data-netz="N10"][cy="260"]').click(); // schwarz, RCD1.i2
    await page.locator('#schaltkasten svg circle[data-netz="N25"][cy="420"]').click(); // blau, LS2.o1
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'RLOW testcase_04 L2-Pfad (0,19+0,34Ω)');
    await page.close();
  });

  await pruefe('RLOW: testcase_04 summiert die Fehlertabelle auf L3', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await page.locator('#schaltkasten svg circle[data-netz="N11"][cy="260"]').click(); // schwarz, RCD1.i3
    await page.locator('#schaltkasten svg circle[data-netz="N26"][cy="420"]').click(); // blau, LS3.o1
    erwarte([await rlowHauptwert(page)], 'R:0,49Ω', 'RLOW testcase_04 L3-Pfad (0,41+0,08Ω)');
    await page.close();
  });

  await pruefe('Schalter: 4-poliges RCD1 (testcase_04) unterbricht L1 UND L2 gleichzeitig', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });

    await page.locator('#schaltkasten svg circle[data-netz="N9"][cy="260"]').click(); // schwarz, RCD1.i1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N24"][cy="420"]').click(); // blau, LS1.o1 (L1)
    erwarte([await rlowHauptwert(page)], 'R:0,40Ω', 'L1 vor dem Öffnen von RCD1');

    await rcd1.click(); // RCD1 öffnen (alle 4 Pole/Funktionen gleichzeitig)
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'L1 nach Öffnen von RCD1 unterbrochen');

    await klick(page, 'ON/OFF'); // Messspitzen zurücksetzen, RCD1 bleibt offen (siehe Test oben)
    await klick(page, 'ON/OFF');

    await page.locator('#schaltkasten svg circle[data-netz="N10"][cy="260"]').click(); // schwarz, RCD1.i2 (L2)
    await page.locator('#schaltkasten svg circle[data-netz="N25"][cy="420"]').click(); // blau, LS2.o1 (L2)
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'L2 ist trotz eigenem Teilgraphen ebenfalls unterbrochen (derselbe RCD1-Klick)');
    await page.close();
  });

  await pruefe('Schalter: 3-poliger Hauptschalter (testcase_04) unterbricht L1 und L3 gleichzeitig', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    const hauptschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="15"][y="572"]') });

    await page.locator('#schaltkasten svg circle[data-netz="N6"][cy="510"]').click(); // schwarz, Hauptschalter.i1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N9"][cy="670"]').click(); // blau, Hauptschalter.o1 (L1)
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'L1 über Hauptschalter vor dem Öffnen (kein Fehlertabellen-Eintrag dort)');

    await hauptschalter.click(); // Hauptschalter öffnen (alle 3 Pole/Funktionen gleichzeitig)
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'L1 nach Öffnen des Hauptschalters unterbrochen');

    await klick(page, 'ON/OFF');
    await klick(page, 'ON/OFF');

    await page.locator('#schaltkasten svg circle[data-netz="N8"][cy="510"]').click(); // schwarz, Hauptschalter.i3 (L3)
    await page.locator('#schaltkasten svg circle[data-netz="N11"][cy="670"]').click(); // blau, Hauptschalter.o3 (L3)
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'L3 ist trotz eigenem Pol ebenfalls unterbrochen (derselbe Hauptschalter-Klick)');
    await page.close();
  });

  // --- testcase_03: RCD1 (Hutschiene H3) und RCD2 (Hutschiene H2) teilen
  // sich dasselbe Einspeise-Netz N6 (siehe netzplan.md-Annahme 1). Ein Pfad
  // zwischen einer Reihenklemme auf der RCD1-Seite und einer auf der
  // RCD2-Seite läuft über N6 und muss Fehler-Widerstände aus BEIDEN Zweigen
  // aufsummieren, über die Hutschienengrenze hinweg.
  // Pfad: N25(Reihenklemme_L_SK1.o1) -> N23(LS1.o1) -> N20(RCD1.o1) -> N6
  //       -> N10(RCD2.o1) -> N16(LS3.o1) -> N33(Reihenklemme_L_SK3.o1)
  // Fehlertabelle: N23=0,15 + N20=0,1 (RCD1-Seite) + N16=0,5 (RCD2-Seite) = 0,75Ω
  await pruefe('RLOW: testcase_03 summiert Fehlerwiderstände aus RCD1- und RCD2-Zweig über die Hutschienengrenze', async () => {
    const page = await neueSeiteMitTestcase('testcase_03');
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').click(); // schwarz, Reihenklemme SK1 (RCD1-Seite, H3)
    await page.locator('#schaltkasten svg circle[data-netz="N33"]').click(); // blau, Reihenklemme SK3 (RCD2-Seite, H2)
    erwarte([await rlowHauptwert(page)], 'R:0,75Ω', 'RLOW über beide RCD-Zweige (0,15+0,1+0,5Ω)');
    await page.close();
  });

  // testcase_02: erster Fehlertabellen-Eintrag auf einem N- statt L1-Netz
  // (N10 = RCD1.o2, Neutralleiter-Ausgang) - Pfad Hauptschalter.i2 (N2) bis
  // Reihenklemme_N_SK1 (N19) läuft über N10 und muss dessen Fehlerwiderstand
  // (0,3Ω) korrekt im N-Teilgraphen aufsummieren.
  await pruefe('RLOW: testcase_02 summiert einen Fehlerwiderstand auf dem N-Pfad', async () => {
    const page = await neueSeiteMitTestcase('testcase_02');
    await page.locator('#schaltkasten svg circle[data-netz="N2"]').click(); // schwarz, Hauptschalter.i2 (N)
    await page.locator('#schaltkasten svg circle[data-netz="N19"]').click(); // blau, Reihenklemme_N_SK1
    erwarte([await rlowHauptwert(page)], 'R:0,30Ω', 'RLOW auf dem N-Pfad über N10 (0,3Ω)');
    await page.close();
  });

  // testcase_05 Gruppe G2 (AFDD, siehe KONZEPT.md "AFDD"): RLOW direkt über
  // das LS3-Kombigerät selbst (letzter/rechter AFDD-LS) - oben links (Eingang
  // L, Netz N61) und unten links (Ausgang L, Netz N66). Dazwischen liegt kein
  // weiteres Bauteil, nur die beiden Fehlertabellen-Einträge auf LS3s
  // eigenen Zubringer-/Abgangsadern (N61=0,18Ω + N66=0,25Ω = 0,43Ω). N66
  // kommt zweimal im DOM vor (auch als Eingang-Schraube der
  // Reihenklemme_L_SK3 oben) - nth(1) ist LS3s eigene Ausgang-Schraube
  // (Gruppen-Reihe, nicht die Reihenklemme).
  await pruefe('RLOW: testcase_05 - über das LS3-AFDD-Kombigerät selbst (oben links Eingang, unten links Ausgang) summiert dessen eigene Fehlertabelle (0,43Ω), Platzhalter sobald der Hebel offen ist', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await page.locator('#schaltkasten svg circle[data-netz="N66"]').nth(1).click(); // schwarz, LS3 Ausgang L (unten links)
    await page.locator('#schaltkasten svg circle[data-netz="N61"]').click(); // blau, LS3 Eingang L (oben links)
    erwarte([await rlowHauptwert(page)], 'R:0,43Ω', 'Fehlertabelle N61 (0,18Ω) + N66 (0,25Ω) auf LS3');

    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width') }))
    );
    const ls3Box = boxen.filter((b) => b.w === '24' && b.y === '322').sort((a, b) => parseFloat(a.x) - parseFloat(b.x))[2]; // RCD2, LS2, LS3 - LS3 ist die dritte/letzte 24px-Box
    const ls3 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${ls3Box.x}"][y="${ls3Box.y}"]`) });

    await ls3.click(); // LS3s Hebel öffnen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Platzhalter, sobald LS3s Hebel offen ist');
    await page.close();
  });

  // testcase_05 Gruppe G2: RLOW über LS3s N-Ader statt L-Ader - anders als
  // bei L (je ein Fehlertabellen-Eintrag vor UND nach dem Bauteil, N61+N66
  // = 0,43Ω, siehe Test oben) trägt hier bewusst nur EINE der beiden
  // N-Adern einen Wert (N67 = 0,07Ω, Netz zwischen LS3.o2 und
  // Reihenklemme_N_SK3.i1 - N63, LS3s N-Eingang, bleibt ohne Eintrag). N67
  // kommt zweimal im DOM vor (auch als Eingang-Schraube der
  // Reihenklemme_N_SK3 oben) - nth(1) ist LS3s eigene Ausgang-Schraube.
  await pruefe('RLOW: testcase_05 - über LS3s N-Ader (oben rechts Eingang, unten rechts Ausgang) liefert 0,07Ω (nur ein Fehlertabellen-Eintrag auf der Ausgangsseite)', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await page.locator('#schaltkasten svg circle[data-netz="N67"]').nth(1).click(); // schwarz, LS3 Ausgang N (unten rechts)
    await page.locator('#schaltkasten svg circle[data-netz="N63"]').click(); // blau, LS3 Eingang N (oben rechts)
    erwarte([await rlowHauptwert(page)], 'R:0,07Ω', 'Fehlertabelle N67 (0,07Ω), N63 ohne eigenen Eintrag');
    await page.close();
  });

  // testcase_05 Gruppe G2: dieselbe Messung wie oben, diesmal mit
  // vertauschter Sonden-Farbreihenfolge (Schwarz auf Eingang/oben, Blau auf
  // Ausgang/unten statt umgekehrt) - RLOW ist symmetrisch (Reihenfolge der
  // Sonden spielt keine Rolle), liefert also denselben Wert 0,07Ω. Zusätzlich
  // die Hebel-Platzhalter-Probe (siehe L-Ader-Test oben): LS3s Hebel öffnen
  // -> Platzhalter statt Messwert.
  await pruefe('RLOW: testcase_05 - dieselbe LS3-N-Ader mit vertauschter Sondenreihenfolge (Schwarz oben rechts, Blau unten rechts) liefert ebenfalls 0,07Ω, Platzhalter sobald der Hebel offen ist', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await page.locator('#schaltkasten svg circle[data-netz="N63"]').click(); // schwarz, LS3 Eingang N (oben rechts)
    await page.locator('#schaltkasten svg circle[data-netz="N67"]').nth(1).click(); // blau, LS3 Ausgang N (unten rechts)
    erwarte([await rlowHauptwert(page)], 'R:0,07Ω', 'RLOW ist symmetrisch - derselbe Wert wie mit vertauschten Farben');

    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width') }))
    );
    const ls3Box = boxen.filter((b) => b.w === '24' && b.y === '322').sort((a, b) => parseFloat(a.x) - parseFloat(b.x))[2];
    const ls3 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${ls3Box.x}"][y="${ls3Box.y}"]`) });

    await ls3.click(); // LS3s Hebel öffnen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Platzhalter, sobald LS3s Hebel offen ist');
    await page.close();
  });

  // Regressionstest für einen User-gemeldeten Bug (2026-07-24): RCD1
  // (Gruppe G1, 4-polig) bekam beim Generieren nur EINE Eingangs-/
  // Ausgangsader (L1) statt vier - die drei rechten Schrauben-Spalten
  // (L2/L3/N) wurden deshalb ohne zugehörige Ader gezeichnet und waren nicht
  // anklickbar (User: "kann nur die linken Schrauben anklicken, oben und
  // unten"). Ursache: `vorkommendePhasen` in generate_anlage.js prüfte nur
  // `sk.phasen[0]`, verpasste dadurch L2/L3 bei Gruppe G1s einzigem
  // Stromkreis (3-poliger LS1, alle drei Phasen in EINEM `sk.phasen`-Array
  // statt in drei separaten Stromkreisen wie bei testcase_04). Fix:
  // `sk.phasen.includes(p)` statt `sk.phasen[0] === p` - siehe
  // test_generator.js für den zugehörigen Daten-Test. Hier: Messspitzen
  // direkt auf RCD1s L3-Spalte (die vorher betroffene, jetzt drittklickbare
  // Spalte, Eingang oben/Ausgang unten) - Fehlertabelle-Eintrag N22=0,41Ω
  // (nur auf der Ausgangsseite, wie bei den LS3-N-Ader-Tests oben).
  await pruefe('RLOW: testcase_05 - BUGFIX: RCD1s L3-Schrauben (Eingang oben, Ausgang unten, dritte Spalte von links) sind jetzt anklickbar und liefern 0,41Ω', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await page.locator('#schaltkasten svg circle[data-bauteil="RCD1"][data-netz="N11"]').click(); // schwarz, RCD1 Eingang L3
    await page.locator('#schaltkasten svg circle[data-bauteil="RCD1"][data-netz="N22"]').click(); // blau, RCD1 Ausgang L3
    erwarte([await rlowHauptwert(page)], 'R:0,41Ω', 'Fehlertabelle N22 auf RCD1s L3-Ausgangsader');
    await page.close();
  });

  // Ausführlicher End-zu-End-Test (User-Vorgabe, 2026-07-24): RLOW von der
  // Drehstromsteckdose (L2, Endstelle) bis zum Hauptschalter-Eingang L2
  // (N7, direkt hinter der Einspeisung) - deckt den KOMPLETTEN L2-Pfad durch
  // Gruppe G1 ab (Hauptschalter -> RCD1 -> LS1(B16) -> Reihenklemme -> SK1).
  // Fehlertabelle-Summe: N21 (RCD1-Ausgang L2, 0,19Ω) + N25 (LS1-Ausgang L2,
  // 0,34Ω) = 0,53Ω. Danach nacheinander JEDEN Schalter auf dem Pfad öffnen
  // und wieder schließen (Hauptschalter, RCD1, LS1) - Messwert muss dabei
  // jedes Mal auf den Platzhalter fallen und exakt wieder auf 0,53Ω
  // zurückkehren. Zuletzt dieselbe Probe mit dem Schraubendreher: RCD1s
  // L2-Eingangsschraube (N10) lösen/wiedereindrehen muss sich identisch
  // verhalten wie ein Schalter-Klick (kappt dieselbe Kante, siehe KONZEPT.md
  // "Schrauben lösen").
  await pruefe('RLOW: testcase_05 - kompletter L2-Pfad (Drehstromsteckdose bis Hauptschalter-Eingang) - Hauptschalter/RCD1/LS1 unterbrechen ihn jeweils einzeln, Schraubendreher an RCD1s L2-Eingang ebenso', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(2).click(); // schwarz: Drehstromsteckdose L2
    await page.locator('#schaltkasten svg circle[data-bauteil="Hauptschalter"][data-netz="N7"]').click(); // blau: Hauptschalter Eingang L2
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'Fehlertabelle N21 (0,19Ω) + N25 (0,34Ω) auf dem L2-Pfad');

    const hsHandle = await findeSchalterHandleNaheBauteil(page, 'Hauptschalter');
    await hsHandle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Hauptschalter offen -> Platzhalter');
    await hsHandle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'Hauptschalter wieder zu -> Wert zurück');

    const rcd1Handle = await findeSchalterHandleNaheBauteil(page, 'RCD1');
    await rcd1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1 offen -> Platzhalter');
    await rcd1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'RCD1 wieder zu -> Wert zurück');

    const ls1Handle = await findeSchalterHandleNaheBauteil(page, 'LS1');
    await ls1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'LS1 (B16) offen -> Platzhalter');
    await ls1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'LS1 wieder zu -> Wert zurück');

    await page.locator('#schraubendreher svg').click();
    const rcd1L2Eingang = page.locator('#schaltkasten svg circle[data-bauteil="RCD1"][data-netz="N10"]');
    await rcd1L2Eingang.click(); // lösen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1s L2-Eingangsschraube gelöst -> Platzhalter');

    await page.locator('#schraubendreher svg').click();
    await rcd1L2Eingang.click(); // wiedereindrehen
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'RCD1s L2-Eingangsschraube wiedereingedreht -> Wert zurück');
    await page.close();
  });

  // Derselbe Test wie oben, jetzt mit L3 statt L2 (User-Vorgabe, direkt im
  // Anschluss) - andere Fehlertabellen-Werte (RCD1-Ausgang L3 N22=0,41Ω +
  // LS1-Ausgang L3 N26=0,08Ω = 0,49Ω, statt 0,53Ω bei L2), sonst identischer
  // Ablauf.
  await pruefe('RLOW: testcase_05 - kompletter L3-Pfad (Drehstromsteckdose bis Hauptschalter-Eingang) - Hauptschalter/RCD1/LS1 unterbrechen ihn jeweils einzeln, Schraubendreher an RCD1s L3-Eingang ebenso', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(3).click(); // schwarz: Drehstromsteckdose L3
    await page.locator('#schaltkasten svg circle[data-bauteil="Hauptschalter"][data-netz="N8"]').click(); // blau: Hauptschalter Eingang L3
    erwarte([await rlowHauptwert(page)], 'R:0,49Ω', 'Fehlertabelle N22 (0,41Ω) + N26 (0,08Ω) auf dem L3-Pfad');

    const hsHandle = await findeSchalterHandleNaheBauteil(page, 'Hauptschalter');
    await hsHandle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Hauptschalter offen -> Platzhalter');
    await hsHandle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,49Ω', 'Hauptschalter wieder zu -> Wert zurück');

    const rcd1Handle = await findeSchalterHandleNaheBauteil(page, 'RCD1');
    await rcd1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1 offen -> Platzhalter');
    await rcd1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,49Ω', 'RCD1 wieder zu -> Wert zurück');

    const ls1Handle = await findeSchalterHandleNaheBauteil(page, 'LS1');
    await ls1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'LS1 (B16) offen -> Platzhalter');
    await ls1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,49Ω', 'LS1 wieder zu -> Wert zurück');

    await page.locator('#schraubendreher svg').click();
    const rcd1L3Eingang = page.locator('#schaltkasten svg circle[data-bauteil="RCD1"][data-netz="N11"]');
    await rcd1L3Eingang.click(); // lösen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1s L3-Eingangsschraube gelöst -> Platzhalter');

    await page.locator('#schraubendreher svg').click();
    await rcd1L3Eingang.click(); // wiedereindrehen
    erwarte([await rlowHauptwert(page)], 'R:0,49Ω', 'RCD1s L3-Eingangsschraube wiedereingedreht -> Wert zurück');
    await page.close();
  });

  // Derselbe Test nochmal mit N statt L2/L3 (User-Vorgabe, direkt im
  // Anschluss) - aber diesmal NUR mit RCD1, ohne Hauptschalter/LS1: der
  // Hauptschalter ist 3-polig (schaltet nur L1/L2/L3, keine eigene N-Ader),
  // LS1 ist ein normaler 3-poliger LS ohne eigenen N-Pol (nur ein
  // AFDD-Kombigerät würde N selbst schalten, siehe KONZEPT.md "AFDD") - N
  // läuft von der N-Klemme UNGESCHALTET direkt bis zu RCD1, das damit der
  // EINZIGE Schalter auf diesem Pfad ist. Keine Fehlertabellen-Einträge auf
  // dem N-Pfad von SK1 (anders als bei L2/L3) -> `R:0,00Ω` statt eines
  // Nicht-Null-Werts. Zusätzlich: diesmal wird RCD1s AUSGANGS- statt
  // Eingangsschraube gelöst (N23, statt N12 am Eingang) - Eingang und
  // Ausgang kappen dieselbe Kante (siehe KONZEPT.md "Schrauben lösen"),
  // Ergebnis muss also identisch sein.
  await pruefe('RLOW: testcase_05 - kompletter N-Pfad (Drehstromsteckdose bis N-Klemme unten) - NUR RCD1 unterbricht ihn (Hauptschalter/LS1 schalten N nicht), Schraubendreher an RCD1s N-AUSGANG', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(4).click(); // schwarz: Drehstromsteckdose N
    await page.locator('#schaltkasten svg circle[data-bauteil="N-Klemme"][data-netz="N12"]').click(); // blau: N-Klemme unten (Ausgang)
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'keine Fehlertabellen-Einträge auf dem N-Pfad von SK1');

    const rcd1Handle = await findeSchalterHandleNaheBauteil(page, 'RCD1');
    await rcd1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1 offen -> Platzhalter (einziger Schalter auf dem N-Pfad)');
    await rcd1Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'RCD1 wieder zu -> Wert zurück');

    await page.locator('#schraubendreher svg').click();
    const rcd1NAusgang = page.locator('#schaltkasten svg circle[data-bauteil="RCD1"][data-netz="N23"]');
    await rcd1NAusgang.click(); // lösen (diesmal AUSGANG statt Eingang)
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD1s N-Ausgangsschraube gelöst -> Platzhalter');

    await page.locator('#schraubendreher svg').click();
    await rcd1NAusgang.click(); // wiedereindrehen
    erwarte([await rlowHauptwert(page)], 'R:0,00Ω', 'RCD1s N-Ausgangsschraube wiedereingedreht -> Wert zurück');
    await page.close();
  });

  // Derselbe Grundaufbau wie die drei Tests oben, aber diesmal Gruppe G2
  // statt G1 (User-Vorgabe, direkt im Anschluss): Sonden auf der MITTLEREN
  // Steckdose (SK2, hinter RCD2 + LS2/AFDD) statt der Drehstromsteckdose -
  // Schwarz auf SK2s L-Kontakt (Funktion L1, da LS2 einpolig auf L1 hängt),
  // Blau auf L1-Klemme unten (Ausgang, N6 - dieselbe Netz-ID wie
  // Hauptschalter-Eingang L1, siehe unten). Pfad: N6 -> N9 (Hauptschalter)
  // -> N60 (RCD2-Ausgang L1, LS2-Zweig) -> N64 (LS2-Ausgang L1) -> N68
  // (SK2-Endstelle) = 0,53Ω (identisch zum L2-Testwert oben, reiner Zufall
  // unterschiedlicher Fehlertabellen-Kombination, kein Bug). Diesmal
  // AUSDRÜCKLICH NUR RCD2 und LS2 (AFDD) geprüft, NICHT der Hauptschalter
  // (User-Vorgabe "alle Hebel müssen geschlossen sein") - RCD2 hat wegen der
  // geteilten Ausgangsschraube (RCD2.o1 speist LS2 UND LS3, siehe
  // KONZEPT.md "AFDD") zwei L1-Kanten; `findeSchraubenKanten()` (Plural,
  // kappt seit dem Bugfix unten ALLE zu einer Schraube gehörenden Kanten,
  // nicht nur die erste) findet für JEDE der zwei RCD2-L1-Schrauben
  // (Eingang UND Ausgang) beide Kanten - hier egal, da nur SK2 gemessen
  // wird. Schraubendreher-Teil deckt beide RCD2-Schrauben ab: erst unten
  // (Ausgang), nach Wiedereindrehen dann oben (Eingang) - beide kappen
  // dieselbe(n) Kante(n), Ergebnis identisch.
  await pruefe('RLOW: testcase_05 - Gruppe G2 (mittlere Steckdose SK2, hinter RCD2+LS2/AFDD) - NUR RCD2 und LS2 unterbrechen den Pfad, Schraubendreher an RCD2 unten UND oben', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // schwarz: SK2 (mittlere Steckdose) L-Kontakt (L1)
    await page.locator('#schaltkasten svg circle[data-bauteil="L1-Klemme"][data-netz="N6"]').click(); // blau: L1-Klemme unten (Ausgang)
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'Pfad L1-Klemme -> Hauptschalter -> RCD2 -> LS2 -> SK2');

    const rcd2Handle = await findeSchalterHandleNaheBauteil(page, 'RCD2');
    await rcd2Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD2 offen -> Platzhalter');
    await rcd2Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'RCD2 wieder zu -> Wert zurück');

    const ls2Handle = await findeSchalterHandleNaheBauteil(page, 'LS2');
    await ls2Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'LS2 (AFDD) offen -> Platzhalter');
    await ls2Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'LS2 wieder zu -> Wert zurück -> alle Hebel wieder geschlossen');

    await page.locator('#schraubendreher svg').click();
    const rcd2Ausgang = page.locator('#schaltkasten svg circle[data-bauteil="RCD2"][data-netz="N60"]'); // unten
    await rcd2Ausgang.click(); // lösen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD2-unten (Ausgang) gelöst -> Platzhalter');

    await page.locator('#schraubendreher svg').click();
    await rcd2Ausgang.click(); // wiedereindrehen -> alle Hebel/Schrauben wieder geschlossen
    erwarte([await rlowHauptwert(page)], 'R:0,53Ω', 'RCD2-unten wiedereingedreht -> Wert zurück');

    await page.locator('#schraubendreher svg').click();
    const rcd2Eingang = page.locator('#schaltkasten svg circle[data-bauteil="RCD2"][data-netz="N9"]'); // oben
    await rcd2Eingang.click(); // lösen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD2-oben (Eingang) gelöst -> Platzhalter (dieselbe Kante wie unten)');
    await page.close();
  });

  // Derselbe Grundaufbau, jetzt SK3 statt SK2 (User-Vorgabe, direkt im
  // Anschluss) - N-Ader statt L1, gemessen von SK3s N-Kontakt bis N-Klemme
  // unten (N12). Pfad: N12 -> N63 (RCD2-Ausgang N, LS3-Zweig) -> N67
  // (LS3-Ausgang N) -> N72 (SK3-Endstelle) = 0,07Ω. NUR RCD2+LS3 (AFDD)
  // getestet, kein Hauptschalter (N wird von ihm nicht geschaltet).
  //
  // Deckte einen ECHTEN Bug auf (User-gemeldet, 2026-07-24): RCD2s
  // N-Ausgang ist eine GETEILTE Schraube (versorgt SK2 UND SK3 gemeinsam
  // unter einem physischen Punkt, siehe KONZEPT.md "AFDD" - `ader.weitere`).
  // `findeSchraubenKante()` (jetzt `findeSchraubenKanten()`, Plural) fand
  // ursprünglich nur die ERSTE der beiden Kanten (`.find()` statt
  // `.filter()`) - beim SK2-Test oben zufällig die richtige (SK2 ist der
  // erste/primäre Zweig), bei SK3 (der "weitere"-Zweig) aber die FALSCHE:
  // die Schraube löste optisch sichtbar, kappte elektrisch aber nur SK2s
  // Ader, SK3s blieb verbunden - Messwert blieb fälschlich bei `R:0,07Ω`
  // stehen statt auf den Platzhalter zu fallen. User-Nachfrage brachte es
  // auf den Punkt: "wenn ich eine Schraube aufmache, wird nur ein Kabel
  // gelöst, und nicht beide?" - elektrisch unsinnig, eine geteilte
  // Anschlussklemme lässt beim Aufdrehen IMMER alle darunterliegenden Adern
  // gleichzeitig los. Fix: `findeSchraubenKanten()` sammelt jetzt alle
  // Netz-IDs der geklickten Schraube (Haupt-Ader + `weitere`) und liefert
  // ALLE Kanten, die eine davon auf `von` ODER `nach` tragen (`.filter()`
  // statt `.find()`) - beide Zweige werden jetzt gemeinsam gekappt/
  // geschlossen, unabhängig davon, ob die Eingangs- oder Ausgangsschraube
  // geklickt wird.
  await pruefe('RLOW: testcase_05 - BUGFIX: Gruppe G2 (SK3 statt SK2), RCD2s geteilte N-Ausgangsschraube kappt jetzt BEIDE Zweige (SK2 UND SK3) gemeinsam', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(8).click(); // schwarz: SK3 N-Kontakt
    await page.locator('#schaltkasten svg circle[data-bauteil="N-Klemme"][data-netz="N12"]').click(); // blau: N-Klemme unten
    erwarte([await rlowHauptwert(page)], 'R:0,07Ω', 'Pfad N-Klemme -> RCD2 -> LS3 -> SK3');

    const rcd2Handle = await findeSchalterHandleNaheBauteil(page, 'RCD2');
    await rcd2Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD2 offen -> Platzhalter');
    await rcd2Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,07Ω', 'RCD2 wieder zu -> Wert zurück');

    const ls3Handle = await findeSchalterHandleNaheBauteil(page, 'LS3');
    await ls3Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'LS3 (AFDD) offen -> Platzhalter');
    await ls3Handle.click();
    erwarte([await rlowHauptwert(page)], 'R:0,07Ω', 'LS3 wieder zu -> Wert zurück -> alle Hebel wieder geschlossen');

    await page.locator('#schraubendreher svg').click();
    const rcd2Ausgang = page.locator('#schaltkasten svg circle[data-bauteil="RCD2"][data-netz="N62"]'); // unten - N62 ist SK2s Zweig, N63 (SK3) ist "weitere"
    await rcd2Ausgang.click(); // lösen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD2-unten (Ausgang, geteilte Schraube) gelöst -> Platzhalter, obwohl N62 (nicht N63) die "Haupt"-Ader ist');

    await page.locator('#schraubendreher svg').click();
    await rcd2Ausgang.click(); // wiedereindrehen
    erwarte([await rlowHauptwert(page)], 'R:0,07Ω', 'RCD2-unten wiedereingedreht -> Wert zurück (beide Zweige wieder geschlossen)');

    await page.locator('#schraubendreher svg').click();
    const rcd2Eingang = page.locator('#schaltkasten svg circle[data-bauteil="RCD2"][data-netz="N12"]'); // oben
    await rcd2Eingang.click(); // lösen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'RCD2-oben (Eingang) gelöst -> Platzhalter (dieselbe geteilte Kanten-Gruppe wie unten)');
    await page.close();
  });

  // Dedizierter Regressionstest: dieselbe EINE Schraube (RCD2s N-Ausgang,
  // N62) muss BEIDE Zweige (SK2 UND SK3) GLEICHZEITIG kappen, nicht nur den
  // gerade gemessenen - direkter Beleg für den Bugfix oben, unabhängig von
  // welchem der beiden Pfade aus gemessen wird. Löst die Schraube EINMAL,
  // misst danach nacheinander SK2 UND SK3 (auf frischen Seiten, da die
  // App-Instanz pro `neueSeiteMitTestcase()`-Aufruf neu startet) - beide
  // müssen auf dem Platzhalter stehen.
  await pruefe('RLOW: testcase_05 - BUGFIX-Beleg: RCD2s N-Ausgangsschraube lösen unterbricht SK2 UND SK3 gleichzeitig (dieselbe physische Schraube)', async () => {
    const seiteSk2 = await neueSeiteMitTestcase('testcase_05');
    await seiteSk2.locator('#schraubendreher svg').click();
    await seiteSk2.locator('#schaltkasten svg circle[data-bauteil="RCD2"][data-netz="N62"]').click(); // lösen
    await seiteSk2.locator('#steckdosen circle[fill="#666666"]').nth(6).click(); // schwarz: SK2 N
    await seiteSk2.locator('#schaltkasten svg circle[data-bauteil="N-Klemme"][data-netz="N12"]').click(); // blau
    erwarte([await rlowHauptwert(seiteSk2)], 'R:---Ω', 'SK2-Zweig unterbrochen (die "Haupt"-Ader der Schraube)');
    await seiteSk2.close();

    const seiteSk3 = await neueSeiteMitTestcase('testcase_05');
    await seiteSk3.locator('#schraubendreher svg').click();
    await seiteSk3.locator('#schaltkasten svg circle[data-bauteil="RCD2"][data-netz="N62"]').click(); // dieselbe Schraube lösen
    await seiteSk3.locator('#steckdosen circle[fill="#666666"]').nth(8).click(); // schwarz: SK3 N
    await seiteSk3.locator('#schaltkasten svg circle[data-bauteil="N-Klemme"][data-netz="N12"]').click(); // blau
    erwarte([await rlowHauptwert(seiteSk3)], 'R:---Ω', 'SK3-Zweig (die "weitere"-Ader derselben Schraube) ebenfalls unterbrochen');
    await seiteSk3.close();
  });

  // testcase_06: N-Kontakt der 5-poligen Anschlussdose (blau, Netz N26) bis
  // zur N-Klemme unten (Ausgang-Schraube, Netz N12) - dazwischen liegt nur
  // die Reihenklemme_N_SK1 mit dem Fehlertabellen-Eintrag N26=0,17Ω (siehe
  // KONZEPT.md "3-poliger LS ohne RCD"). N12 kommt zweimal im DOM vor (auch
  // als Eingang-Schraube der Reihenklemme_N_SK1 oben) - nth(1) ist die
  // N-Klemme selbst (unterste Zeile im Schaltkasten).
  await pruefe('RLOW: testcase_06 - N-Kontakt der 5-poligen Anschlussdose bis zur N-Klemme unten summiert den Fehlertabellen-Eintrag auf der Reihenklemme (0,17Ω)', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await page.locator('#steckdosen circle[fill="#666666"]').nth(0).click(); // schwarz, N-Kontakt der Anschlussdose
    await page.locator('#schaltkasten svg circle[data-netz="N12"]').nth(1).click(); // blau, N-Klemme unten
    erwarte([await rlowHauptwert(page)], 'R:0,17Ω', 'Fehlertabelle N26 (0,17Ω) auf der Reihenklemme_N_SK1');
    await page.close();
  });

  // testcase_06: L1-Kontakt der 5-poligen Anschlussdose (oben, schwarz) bis
  // zum Hauptschalter-Eingang L1 (unten, blau) - dazwischen liegen
  // Hauptschalter, LS1 (3-polig) und Reihenklemme_L1_SK1, aber nur LS1s
  // Ausgang (N20) trägt einen Fehlertabellen-Eintrag (0,20Ω). Öffnet man
  // Hauptschalter ODER den 3-poligen LS1 einzeln, ist der Pfad unterbrochen
  // und der Platzhalter bleibt - drei Zustände in einem Testablauf, analog
  // zum bestehenden Muster (siehe RLOW: testcase_01 oben).
  await pruefe('RLOW: testcase_06 - L1-Kontakt der Anschlussdose bis Hauptschalter-Eingang summiert nur LS1s Fehlertabellen-Eintrag (0,20Ω), Platzhalter sobald Hauptschalter ODER der 3-polige LS1 offen ist', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await page.locator('#steckdosen circle[fill="#666666"]').nth(2).click(); // schwarz, L1-Kontakt der Anschlussdose
    // N6 kommt zweimal vor (auch als Ausgang der L1-Klemme) - nth(0) ist der
    // Hauptschalter selbst (zuerst gezeichnet, weiter links).
    await page.locator('#schaltkasten svg circle[data-netz="N6"]').nth(0).click(); // blau, Hauptschalter-Eingang L1

    erwarte([await rlowHauptwert(page)], 'R:0,20Ω', 'Fehlertabelle N20 (0,20Ω) auf dem LS1-Ausgang, beide Schalter zu');

    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y') }))
    );
    const ls1Box = boxen.find((b) => b.y === '322');
    const hauptschalterBox = boxen.find((b) => b.y === '572');
    const ls1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${ls1Box.x}"][y="${ls1Box.y}"]`) });
    const hauptschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${hauptschalterBox.x}"][y="${hauptschalterBox.y}"]`) });

    await hauptschalter.click(); // Hauptschalter öffnen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Platzhalter, sobald der Hauptschalter offen ist');

    await hauptschalter.click(); // Hauptschalter wieder schließen
    await ls1.click(); // 3-poliger LS1 öffnen
    erwarte([await rlowHauptwert(page)], 'R:---Ω', 'Platzhalter, sobald der 3-polige LS1 offen ist (Hauptschalter wieder zu)');
    await page.close();
  });

  // --- RISO: Spannungsprüfung (live) + Isolationswiderstand (TEST-Taste) ---
  // Anders als RLOW misst RISO nicht kontinuierlich, sondern erst nach TEST -
  // UND zeigt vorher/statt eines Widerstands die anliegende Spannung zwischen
  // L (schwarz, muss auf L1/L2/L3 sitzen) und N/L (blau) an: 230V bei L-N,
  // 400V bei zwei Phasen, 0V wenn kein Punkt mehr mit der Einspeisung
  // verbunden ist (siehe istSpannungFuehrend() - prüft JEDEN Schalter im
  // Pfad, nicht nur den Hauptschalter). PE (grün) muss zusätzlich angelegt
  // sein, fließt aber nicht in die Berechnung ein.
  // testcase_01-Netze: N4/N5 = Leistungsschalter.o1/o2 (HINTER dem Schalter -
  // wichtig, N1/N2 liegen davor und wären immer "live"), N3 = PE-Klemme.io1,
  // N6/N8 = RCD1.o1/o2.

  await pruefe('RISO: Spannung 230V bei anliegender Netzspannung, TEST wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page); // RLOW -> RISO
    let texte = await displayTexte(page);
    erwarte(texte, 'R:---MΩ', 'RISO-Platzhalter vor Messspitzen');
    erwarte(texte, '0V', 'Spannungsanzeige-Default vor Messspitzen');

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE
    texte = await displayTexte(page);
    erwarte(texte, '230V', 'RISO zeigt 230V bei L-N mit anliegender Spannung');
    erwarte(texte, 'R:---MΩ', 'R bleibt Platzhalter, solange Spannung anliegt');

    await klick(page, 'TEST'); // sollte wirkungslos sein
    erwarte(await displayTexte(page), 'R:---MΩ', 'TEST bei anliegender Spannung bleibt wirkungslos');
    await page.close();
  });

  await pruefe('RISO: Schwarz/Blau vertauscht (Schwarz auf N, Blau auf L1) misst genauso', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click(); // schwarz, N (vertauscht)
    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // blau, L1 (vertauscht)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    erwarte(await displayTexte(page), '230V', 'Vertauschte Rollen ändern nichts an der 230V-Erkennung');

    const leistungsschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="12"][y="572"]') });
    await leistungsschalter.click();
    erwarte(await displayTexte(page), '0V', 'Vertauschte Rollen erkennen die offene Einspeisung genauso');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'TEST funktioniert auch mit vertauschten Messspitzen');
    await page.close();
  });

  await pruefe('RISO: Hauptschalter öffnen -> 0V, TEST zeigt R:>999MΩ', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click();
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click();
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click();

    const leistungsschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="12"][y="572"]') });
    await leistungsschalter.click();

    erwarte(await displayTexte(page), '0V', 'Spannung fällt auf 0V, sobald der Leistungsschalter offen ist');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'RISO zeigt >999MΩ (kein Pfad zwischen L1 und N)');
    await page.close();
  });

  // testcase_06: Hauptschalter offen (Schalterzustand lebt unabhängig vom
  // Messgerät, kann also vorher gesetzt werden) - Sonden an der 5-poligen
  // Anschlussdose. Farbzyklus: 1. Klick=schwarz, 2.=blau, 3.=grün - Klick-
  // Reihenfolge L1, N, PE ergibt Schwarz auf braun(L1), Blau auf blau(N),
  // Grün auf grün(PE), wie vom User beschrieben.
  await pruefe('RISO: testcase_06 - Hauptschalter offen, Sonden an der 5-poligen Anschlussdose (Schwarz auf braun=L1, Blau auf blau=N, Grün auf grün=PE) -> TEST zeigt R:>999MΩ, Ampel grün', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y') }))
    );
    const hauptschalterBox = boxen.find((b) => b.y === '572');
    const hauptschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${hauptschalterBox.x}"][y="${hauptschalterBox.y}"]`) });
    await hauptschalter.click();

    await drehknopfKlick(page);
    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(2).click(); // L1 (braun) -> schwarz
    await kreise.nth(0).click(); // N (blau) -> blau
    await kreise.nth(1).click(); // PE (grün) -> grün
    erwarte(await displayTexte(page), '0V', 'kein Pfad zur Einspeisung, solange der Hauptschalter offen ist');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'kein artifizieller Isolationsfehler modelliert');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'hoher Widerstand -> Ampel grün rechts');
    await page.close();
  });

  // Genau der vom User beschriebene Fall: RCD offen, Hauptschalter bleibt
  // geschlossen - an den RCD-AUSGÄNGEN muss trotzdem gemessen werden können
  // (0V dort, obwohl vor dem RCD noch Spannung anliegt).
  await pruefe('RISO: RCD öffnen (Hauptschalter bleibt zu) -> hinter dem RCD trotzdem messbar', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click();

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    erwarte(await displayTexte(page), '0V', 'Hinter dem offenen RCD ist es tot, obwohl der Leistungsschalter noch zu ist');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'Messung ist trotzdem möglich (nicht "Messgerät kaputt")');
    await page.close();
  });

  await pruefe('RISO: TEST bei erneut anliegender Spannung springt zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> keine Spannung hinter dem RCD

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'Erster TEST ohne Spannung liefert einen Messwert');

    await rcd1.click(); // RCD1 wieder schließen -> Spannung liegt wieder an
    erwarte(await displayTexte(page), 'R:>999MΩ', 'Alter Messwert bleibt zunächst stehen, bis erneut getestet wird');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:---MΩ', 'TEST bei wieder anliegender Spannung setzt R auf den Platzhalter zurück');
    await page.close();
  });

  // testcase_04 ist der einzige Testcase mit drei separat eingespeisten
  // Phasen (siehe einspeisung-Feld in graph.json) - nötig, um den 400V-Zweig
  // von berechneRisoSpannung() (zwei verschiedene L-Phasen statt L-N) zu
  // testen, was mit testcase_01 (nur L1) nicht geht.
  await pruefe('RISO: 400V zwischen zwei verschiedenen Phasen (testcase_04)', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N9"][cy="260"]').click(); // schwarz, RCD1.i1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N10"][cy="260"]').click(); // blau, RCD1.i2 (L2)
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').click(); // grün, PE

    erwarte(await displayTexte(page), '400V', 'RISO zeigt 400V zwischen zwei verschiedenen Phasen (L1/L2)');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:---MΩ', 'TEST bei anliegender Spannung bleibt wirkungslos (400V-Fall)');
    await page.close();
  });

  await pruefe('RISO: Grün nicht auf PE -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> keine Spannung hinter dem RCD, TEST würde sonst einen Wert liefern

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)
    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // grün, FÄLSCHLICH auf L1 statt PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:---MΩ', 'Grün nicht auf PE -> TEST liefert trotz fehlender Spannung keinen Messwert');
    await page.close();
  });

  // Schwarz+Blau auf derselben Phase ist keine Isolationsmessung (dafür gibt
  // es risoPaarTyp() für L-N/L-L), sondern schlicht eine Durchgangsprüfung -
  // TEST verhält sich hier wie RLOW: Fehlertabelle-Summe bei geschlossenem
  // Pfad, `>999MΩ` bei unterbrochenem (User-Vorgabe, "das ging früher mal").
  // Die Fehlertabelle ist immer in Ω (wie bei RLOW), die Anzeige zeigt bei
  // einem endlichen Pfad-Ergebnis deshalb "Ω", nicht "MΩ" - nur der
  // Infinity-Sentinel bleibt "R:>999MΩ". Die Ampel vergleicht trotzdem gegen
  // den MΩ-Grenzwert (umgerechnet in Ω, ×1.000.000) - ein realistischer
  // Ω-Wert liegt darunter praktisch immer -> rot, nur >999MΩ ist grün.
  await pruefe('RISO: Schwarz und Blau auf derselben Phase (L1) verhält sich wie RLOW (in Ω, nicht MΩ)', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1 (vor RCD1)
    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // blau, ebenfalls L1 (RCD1.o1)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    erwarte(await displayTexte(page), '0V', 'Zwischen zwei Punkten derselben Phase liegt keine Spannung an');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:0,10Ω', 'RCD1 geschlossen -> Fehlertabellen-Wert von N6 (0,1Ω) wie bei RLOW, in Ω');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], '0,10Ω liegt weit unter dem MΩ-Grenzwert -> Ampel rot');

    await rcd1.click(); // RCD1 öffnen -> Pfad zwischen den beiden L1-Punkten unterbrochen
    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'RCD1 offen -> kein Pfad mehr, >999MΩ');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], '>999MΩ liegt immer über dem Grenzwert -> Ampel grün');
    await page.close();
  });

  await pruefe('RISO: nur zwei von drei Messspitzen gesetzt -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> keine Spannung, TEST würde sonst einen Wert liefern

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)
    // Grün (PE) bewusst nicht gesetzt.

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:---MΩ', 'Fehlende dritte Messspitze -> TEST liefert keinen Messwert');
    await page.close();
  });

  await pruefe('RISO: Messspitzen-Änderung nach TEST setzt den Messwert zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click();

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'TEST liefert zunächst einen Messwert');

    // Blaue Messspitze umsetzen (abklicken + neu setzen) - der alte Messwert
    // gehört zur alten Messspitzen-Konfiguration und muss ungültig werden.
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau entfernen
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau neu setzen
    erwarte(await displayTexte(page), 'R:---MΩ', 'Messspitzen-Änderung setzt den alten Messwert zurück');
    await page.close();
  });

  // Realistische Verwechslung: N-Sonde (blau) landet auf PE statt N, PE-Sonde
  // (grün) sitzt korrekt auf PE (ggf. sogar dieselbe Schraube). PE und N sind
  // am Sternpunkt ohnehin verbunden und PE wird hier nie aufgetrennt - die
  // Anzeige soll deshalb trotzdem 230V zeigen (siehe risoEffektiveAder()).
  await pruefe('RISO: N-Sonde auf PE statt N (Verwechslung) -> Spannung wird trotzdem angezeigt', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // blau, PE-Klemme.io1 (fälschlich statt N)
    await page.locator('#schaltkasten svg circle[data-netz="N9"]').first().click(); // grün, PE-Klemme.io2 (korrekt PE)

    erwarte(await displayTexte(page), '230V', 'N-Sonde auf PE zeigt trotzdem die anliegende Spannung');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:---MΩ', 'TEST bleibt wirkungslos, solange Spannung anliegt');

    const hauptschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="12"][y="572"]') });
    await hauptschalter.click();
    erwarte(await displayTexte(page), '0V', 'Auch mit vertauschter N/PE-Sonde erkennt die Prüfung den offenen Hauptschalter');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'TEST liefert nach Spannungswegfall einen Messwert');
    await page.close();
  });

  // Ampel (Leuchtstreifen links/rechts im Display-Rahmen, siehe
  // controller/app.js risoAmpel/risoTestKlick()): links rot = "durchgefallen"
  // (Spannung an, oder Messwert < Grenzwert), rechts grün = "bestanden"
  // (Messwert >= Grenzwert, oder >999MΩ). Vor dem ersten TEST-Klick bzw. nach
  // einem Reset (Drehknopf) sind beide grau.
  await pruefe('RISO: Ampel zeigt rot, solange Spannung anliegt', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    erwarteGleich(await ampelFarben(page), ['#999999', '#999999'], 'Ampel-Default vor TEST');

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Ampel rot bei anliegender Spannung');
    await page.close();
  });

  await pruefe('RISO: Ampel grün bei >999MΩ, unabhängig vom eingestellten Grenzwert', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen, damit keine Spannung anliegt

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:>999MΩ', 'Kein Pfad zwischen L1 und N (getrennte Teilgraphen)');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], '>999MΩ ist immer über jedem Grenzwert -> grün');
    await page.close();
  });

  // Zeigt, dass der Grenzwert wirklich in den Vergleich eingeht (nicht nur
  // der Infinity-Sonderfall): derselbe endliche Messwert kippt von rot auf
  // grün, sobald der Grenzwert unter den (in Ω umgerechneten) Messwert
  // gesenkt wird.
  await pruefe('RISO: Grenzwert senken kippt einen endlichen Messwert von rot auf grün', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // blau, ebenfalls L1 (RCD1.o1)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'R:0,10Ω', 'Fehlertabellen-Wert von N6 (0,1Ω)');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], '0,10Ω < 50MΩ (=50.000.000Ω) -> rot');

    await klick(page, '◄►'); // 0=Titel -> 1=Prüfspannung
    await klick(page, '◄►'); // 1=Prüfspannung -> 2=Grenzwert
    for (let i = 0; i < 5; i++) await klick(page, '▼'); // Grenzwert auf 0MΩ klemmen
    erwarte(await displayTexte(page), '0MΩ', 'Grenzwert auf 0MΩ gesenkt');

    await klick(page, 'TEST'); // erneut messen, jetzt mit gesenktem Grenzwert
    erwarte(await displayTexte(page), 'R:0,10Ω', 'Messwert unverändert');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], '0,10Ω >= 0Ω (Grenzwert 0MΩ) -> grün');
    await page.close();
  });

  await pruefe('RISO: Drehknopf-Wechsel setzt die Ampel zurück auf grau', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE
    await klick(page, 'TEST');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Ampel rot vor dem Drehknopf-Wechsel');

    await drehknopfKlick(page); // RISO -> ZI
    await drehknopfKlick(page); // ZI -> ZS
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // ZS -> FI/RCD -> V~ -> RLOW -> RISO
    erwarteGleich(await ampelFarben(page), ['#999999', '#999999'], 'Ampel wieder grau nach vollem Zyklus zurück zu RISO');
    await page.close();
  });

  // --- ZI: Schleifenimpedanz (Vorimpedanz + Fehlertabelle L-Seite + N-Seite) ---
  // Anders als RLOW/RISO liegen Schwarz (L1/L2/L3) und Blau (N) auf
  // unterschiedlichen Teilgraphen OHNE gemeinsamen Pfad - ZI sucht deshalb
  // zwei getrennte Pfade zur jeweiligen Einspeisung (findePfadZurEinspeisung())
  // und summiert beide plus eine feste Vorimpedanz (0,14Ω). TEST-gebunden wie
  // RISO, aber ohne Live-Spannungsanzeige und ohne ">999Ω"-Sentinel - fehlt
  // einer der beiden Teilpfade, bleibt schlicht der Platzhalter stehen.
  // testcase_01: N6/N8 = RCD1.o1/o2 (L1/N), Pfad zur Einspeisung jeweils über
  // Leistungsschalter + RCD1 - N6 trägt 0,1Ω Fehlertabelle, N-Seite nichts.
  await pruefe('ZI: TEST summiert Vorimpedanz + Fehlertabelle beider Teilpfade', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page); // RLOW -> RISO
    await drehknopfKlick(page); // RISO -> ZI
    erwarte(await displayTexte(page), 'Z:---Ω', 'ZI-Platzhalter vor TEST');
    erwarte(await displayTexte(page), 'Isc:---A', 'Isc-Platzhalter vor TEST');

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'Vorimpedanz 0,14Ω + Fehlertabelle N6 (0,1Ω) + N-Seite (0Ω)');
    erwarte(await displayTexte(page), 'Isc:862,5A', 'Isc = 0,9*230V/0,24Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (862,5A) > Lim (80,0A, B16A) -> Ampel grün');
    await page.close();
  });

  // Isc/Lim-Ampel wird LIVE aus dem aktuellen LS-Typ/Bemessungsstrom
  // berechnet, nicht als TEST-Snapshot eingefroren - ändert man LS-Typ/
  // Bemessungsstrom per ▲/▼ danach, zieht die Ampel sofort mit (wie Lim
  // selbst schon vorher live war).
  await pruefe('ZI: Isc/Lim-Ampel kippt live, wenn Lim per ▲/▼ über Isc steigt', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await klick(page, 'TEST');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (862,5A) > Lim (80,0A) -> zunächst grün');

    await klick(page, '◄►'); // Titel -> LS-Typ
    await klick(page, '▲'); // B -> C
    await klick(page, '▲'); // C -> D (Faktor 20 statt 5)
    await klick(page, '◄►'); // LS-Typ -> Bemessungsstrom
    for (let i = 0; i < 10; i++) await klick(page, '▲'); // 16A -> 125A (an der oberen Grenze geklemmt)

    erwarte(await displayTexte(page), 'Lim: 2500,0A', 'Lim (D, 125A) liegt jetzt weit über Isc');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Isc (862,5A) < Lim (2500,0A) -> Ampel kippt auf rot');
    await page.close();
  });

  // testcase_01, SK1 (linke, oberste Reihenklemme, Ausgangsschrauben N13/N14):
  // ein realistischeres "durchgefallen"-Szenario als der Test oben - hier
  // wird nicht künstlich der Faktor (LS-Typ D) hochgedreht, sondern nur der
  // Bemessungsstrom auf einen für diesen Pfad zu hohen Wert gestellt (B,
  // 125A). Die Messung läuft trotzdem ganz normal durch, nur die Ampel zeigt
  // "durchgefallen".
  // L-Pfad N1->N4->N6->N11->N13 = 0,1(N6)+0,2(N11)+0,3(N13) = 0,6Ω
  // N-Pfad N2->N5->N8->N14 = 0Ω (keine Fehlertabellen-Einträge)
  // Z = 0,6 + 0,14 (Vorimpedanz) = 0,74Ω: Isc = 0,9*230/0,74 = 279,7A
  // Lim (B, 125A) = 5*125 = 625,0A -> Isc < Lim -> Ampel rot
  await pruefe('ZI: testcase_01 SK1 mit B/125A - Messung läuft durch, Ampel zeigt trotzdem rot', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N13"]').click(); // schwarz, SK1 L-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N14"]').click(); // blau, SK1 N-Ausgang

    await klick(page, '◄►'); // Titel -> LS-Typ (bleibt B, Default)
    await klick(page, '◄►'); // LS-Typ -> Bemessungsstrom
    for (let i = 0; i < 10; i++) await klick(page, '▲'); // 16A -> 125A (an der oberen Grenze geklemmt)

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,74Ω', 'Messung läuft normal durch (0,1+0,2+0,3 Fehlertabelle + 0,14 Vorimpedanz)');
    erwarte(await displayTexte(page), 'Isc:279,7A', 'Isc = 0,9*230V/0,74Ω');
    erwarte(await displayTexte(page), 'Lim: 625,0A', 'Lim (B, 125A) = 5*125');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Isc (279,7A) < Lim (625,0A) -> Ampel rot, obwohl die Messung selbst erfolgreich war');
    await page.close();
  });

  // testcase_02, SK1 (linke, oberste Reihenklemme): Ausgangsschrauben N18 (L)
  // und N19 (N) - anders als der testcase_01-Test summieren sich hier
  // MEHRERE Fehlertabellen-Einträge entlang eines einzigen Teilpfads:
  // L-Pfad N1->N4->N6->N8->N14->N18 = 0,1(N8)+0,15(N14)+0,25(N18) = 0,5Ω
  // N-Pfad N2->N5->N7->N10->N19 = 0,3(N10) (N19 hat keinen Eintrag) = 0,3Ω
  // Summe: 0,5 + 0,3 + 0,14 (Vorimpedanz) = 0,94Ω
  await pruefe('ZI: testcase_02 summiert mehrere Fehlertabellen-Einträge entlang beider Teilpfade', async () => {
    const page = await neueSeiteMitTestcase('testcase_02');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N18"]').click(); // schwarz, SK1 L-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N19"]').click(); // blau, SK1 N-Ausgang

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,94Ω', 'L-Pfad 0,5Ω (drei Einträge) + N-Pfad 0,3Ω + Vorimpedanz 0,14Ω');
    await page.close();
  });

  // Gleicher Pfad/Messwert (Z:0,94Ω) wie oben, aber mit C/63A statt B/16A -
  // zeigt, dass die Isc/Lim-Ampel unabhängig vom konkreten Testcase korrekt
  // gegen die jeweils eingestellte LS-Charakteristik vergleicht.
  // Isc = 0,9*230/0,94 = 220,2A; Lim (C, 63A) = 10*63 = 630,0A -> Ampel rot.
  await pruefe('ZI: testcase_02 SK1 mit C/63A - Messung läuft durch, Ampel zeigt trotzdem rot', async () => {
    const page = await neueSeiteMitTestcase('testcase_02');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N18"]').click(); // schwarz, SK1 L-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N19"]').click(); // blau, SK1 N-Ausgang

    await klick(page, '◄►'); // Titel -> LS-Typ
    await klick(page, '▲'); // B -> C
    await klick(page, '◄►'); // LS-Typ -> Bemessungsstrom
    for (let i = 0; i < 7; i++) await klick(page, '▲'); // 16A -> 63A

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,94Ω', 'Messung läuft normal durch (unverändert gegenüber B/16A)');
    erwarte(await displayTexte(page), 'Isc:220,2A', 'Isc = 0,9*230V/0,94Ω');
    erwarte(await displayTexte(page), 'Lim: 630,0A', 'Lim (C, 63A) = 10*63');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Isc (220,2A) < Lim (630,0A) -> Ampel rot, obwohl die Messung selbst erfolgreich war');
    await page.close();
  });

  await pruefe('ZI: testcase_02 mit offenem RCD1 -> 0V, Pfeil durchgestrichen, TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_02');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> beide Teilpfade zu SK1 unterbrochen

    await page.locator('#schaltkasten svg circle[data-netz="N18"]').click(); // schwarz, SK1 L-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N19"]').click(); // blau, SK1 N-Ausgang

    erwarte(await displayTexte(page), '0V', 'RCD1 offen -> kein geschlossener Pfad zur Einspeisung -> 0V');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte bei offenem RCD1 durchgestrichen sein');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:---Ω', 'TEST bleibt wirkungslos, Platzhalter bleibt stehen');
    await page.close();
  });

  // testcase_06: über die 5-polige Anschlussdose gemessen (Schwarz auf
  // grau=L3 unten links, Blau auf blau=N, Grün auf grün=PE). Anders als ZS
  // summiert ZI explizit BEIDE Teilpfade (L UND N) - hier trifft das genau
  // den N-Reihenklemmen-Fehlerwiderstand (N26=0,17Ω), der eigens für einen
  // ZI-Testcase angelegt wurde (siehe KONZEPT.md "3-poliger LS ohne RCD"):
  // Z = Fehlertabelle(L3-Pfad, N22=0,15Ω) + Fehlertabelle(N-Pfad, N26=0,17Ω)
  // + Vorimpedanz (0,14Ω) = 0,46Ω.
  await pruefe('ZI: testcase_06 - über die 5-polige Anschlussdose gemessen (Schwarz auf grau=L3, Blau auf blau=N) summiert L- UND N-Fehlertabelle: Z:0,46Ω', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(3).click(); // L3 (grau, unten links) -> schwarz
    await kreise.nth(0).click(); // N (blau) -> blau
    await kreise.nth(1).click(); // PE (grün) -> grün

    erwarte(await displayTexte(page), '230V', 'beide Teilpfade zur Einspeisung geschlossen');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,46Ω', 'Fehlertabelle N22 (0,15Ω) + N26 (0,17Ω) + Vorimpedanz (0,14Ω)');
    erwarte(await displayTexte(page), 'Isc:450,0A', 'Isc = 0,9*230V/0,46Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (450,0A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  // testcase_06 Gruppe G2: dieselben Steckdose-Kontakte wie beim FI/RCD-Test
  // oben (Schwarz auf L links, Blau auf N rechts, Grün auf PE), diesmal auf
  // ZI - summiert L-Pfad (kein Fehlertabellen-Eintrag) UND N-Pfad
  // (Reihenklemme_N_SK2-Ausgang N46, 0,13Ω, siehe "3-poliger LS ohne RCD" ->
  // "Zweite Gruppe G2").
  await pruefe('ZI: testcase_06 - über die Steckdose SK2 gemessen (Schwarz auf L links, Blau auf N rechts) summiert den N-Fehlertabellen-Eintrag: Z:0,27Ω', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // Steckdose links (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    erwarte(await displayTexte(page), '230V', 'beide Teilpfade zur Einspeisung geschlossen');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,27Ω', 'N-Fehlertabelle N46 (0,13Ω) + Vorimpedanz (0,14Ω), L-Pfad ohne Eintrag');
    erwarte(await displayTexte(page), 'Isc:766,7A', 'Isc = 0,9*230V/0,27Ω');
    await page.close();
  });

  await pruefe('ZI: fehlende Verbindung zur Einspeisung (offenes RCD) -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> beide Teilpfade (L und N) unterbrochen

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:---Ω', 'Kein Pfad zur Einspeisung -> TEST liefert keinen Messwert');
    await page.close();
  });

  await pruefe('ZI: Messspitzen-Änderung nach TEST setzt den Messwert zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'TEST liefert zunächst einen Messwert');

    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau entfernen
    erwarte(await displayTexte(page), 'Z:---Ω', 'Messspitzen-Änderung setzt den alten Messwert zurück');
    await page.close();
  });

  await pruefe('ZI: Drehknopf-Wechsel setzt den Messwert zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'TEST liefert einen Messwert');

    for (let i = 0; i < 6; i++) await drehknopfKlick(page); // voller Zyklus zurück zu ZI
    erwarte(await displayTexte(page), 'Z:---Ω', 'Messwert nach Drehknopf-Wechsel wieder Platzhalter');
    await page.close();
  });

  // Live-Spannungsanzeige unter dem PE-Kreis, wie bei RISO - aber mit
  // umgekehrtem Zweck: bei ZI zeigt sie an, ob der Stromkreis bereit für
  // eine Messung ist (230V), unabhängig von TEST. Der Pfeil-Kasten unten
  // links (sonst bei ZI immer durchgestrichen, da TEST-gebunden) wird bei
  // anliegender Spannung bewusst undurchgestrichen dargestellt.
  await pruefe('ZI: Live-Spannungsanzeige zeigt 230V bei bereitem Stromkreis, 0V sonst - Pfeil-Kasten entsprechend undurchgestrichen', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    erwarte(await displayTexte(page), '0V', 'Spannungsanzeige-Default vor Messspitzen');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte ohne Spannung durchgestrichen sein');
    }

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)
    erwarte(await displayTexte(page), '230V', 'Beide Teilpfade zur Einspeisung geschlossen -> 230V');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> beide Teilpfade unterbrochen
    erwarte(await displayTexte(page), '0V', 'RCD1 offen -> kein geschlossener Pfad mehr -> 0V');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte wieder durchgestrichen sein, sobald die Spannung wegfällt');
    }
    await page.close();
  });

  // Ein zuvor gemessener Z-Wert wird ungültig, sobald die Spannung wegfällt -
  // auch OHNE dass sich die Messspitzen ändern (z.B. weil währenddessen ein
  // Schalter geöffnet wurde). Kommt die Spannung später zurück, bleibt der
  // Platzhalter trotzdem stehen, bis erneut TEST gedrückt wird - ein alter
  // Messwert soll nicht einfach automatisch wieder auftauchen.
  await pruefe('ZI: Wegfall der Spannung setzt einen bestehenden Messwert zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'TEST liefert zunächst einen Messwert');

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> Spannung fällt weg, OHNE die Messspitzen anzurühren
    erwarte(await displayTexte(page), 'Z:---Ω', 'Wegfall der Spannung setzt den Messwert zurück');
    erwarte(await displayTexte(page), 'Isc:---A', 'Isc hängt an derselben Bedingung wie Z');

    await rcd1.click(); // RCD1 wieder zu -> Spannung liegt wieder an
    erwarte(await displayTexte(page), 'Z:---Ω', 'Platzhalter bleibt stehen, bis erneut TEST gedrückt wird');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'Erneuter TEST liefert wieder den Messwert');
    erwarte(await displayTexte(page), 'Isc:862,5A', 'Isc wird ebenfalls neu berechnet');
    await page.close();
  });

  // --- ZS: erste Iteration (nur der L-Pfad wird geprüft, PE bewusst
  // ignoriert - siehe KONZEPT.md "Berechnung der Messwerte"). Schwarz auf
  // L1/L2/L3, Blau auf N, Grün auf PE - Blau/Grün müssen korrekt platziert
  // sein, damit TEST reagiert, fließen aber NICHT in die Berechnung ein
  // (Annahme: PE hat immer Durchgang). Z = Fehlertabelle(L-Pfad) +
  // Vorimpedanz (derselbe Wert wie bei ZI, 0,14Ω).
  await pruefe('ZS: TEST berechnet nur den L-Pfad + Vorimpedanz, PE/N bleiben unberücksichtigt', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page); // RLOW -> RISO
    await drehknopfKlick(page); // RISO -> ZI
    await drehknopfKlick(page); // ZI -> ZS
    erwarte(await displayTexte(page), 'Z:---Ω', 'ZS-Platzhalter vor TEST');
    erwarte(await displayTexte(page), '0V', 'Spannungsanzeige-Default vor Messspitzen');

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, RCD1.o1 (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, RCD1.o2 (N)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE
    erwarte(await displayTexte(page), '230V', 'L-Pfad zur Einspeisung geschlossen -> 230V');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'Fehlertabelle N6 (0,1Ω) + Vorimpedanz (0,14Ω), PE/N ignoriert');
    erwarte(await displayTexte(page), 'Isc:862,5A', 'Isc = 0,9*230V/0,24Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (862,5A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  // Isc/Lim-Ampel live, wie bei ZI - ändert man LS-Typ/Bemessungsstrom
  // per ▲/▼ nach dem TEST-Klick, zieht die Ampel sofort mit.
  await pruefe('ZS: Isc/Lim-Ampel kippt live, wenn Lim per ▲/▼ über Isc steigt', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün
    await klick(page, 'TEST');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (862,5A) > Lim (80,0A) -> zunächst grün');

    await klick(page, '◄►'); // Titel -> LS-Typ
    await klick(page, '▲'); // B -> C
    await klick(page, '▲'); // C -> D (Faktor 20 statt 5)
    await klick(page, '◄►'); // LS-Typ -> Bemessungsstrom
    for (let i = 0; i < 10; i++) await klick(page, '▲'); // 16A -> 125A (an der oberen Grenze geklemmt)

    erwarte(await displayTexte(page), 'Lim: 2500,0A', 'Lim (D, 125A) liegt jetzt weit über Isc');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Isc (862,5A) < Lim (2500,0A) -> Ampel kippt auf rot');
    await page.close();
  });

  // testcase_04, SK1 (linke Reihenklemmen-Gruppe): drei Sonden auf den drei
  // Ausgangsschrauben N27 (L1), N28 (N), N29 (PE) - anders als bei
  // testcase_01/02 hat testcase_04 eine eigene Einspeisung je Phase
  // (graph.einspeisung), der L1-Pfad läuft über RCD1+LS1 mit ZWEI
  // Fehlertabellen-Einträgen: N1->N6->N9->N20->N24->N27 = 0,13(N20)+0,27(N24)
  // = 0,40Ω. N-Seite trägt nichts bei (keine Fehlertabellen-Einträge auf dem
  // N-Pfad). Z = 0,40 + 0,14 (Vorimpedanz) = 0,54Ω;
  // Isc = 0,9*230/0,54 = 383,3A; bei B/16A (Lim 80,0A) -> Ampel grün.
  await pruefe('ZS: testcase_04 SK1 (L1) - Z:0,54Ω, Isc:383,3A, Ampel grün bei B/16A', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N27"]').click(); // schwarz, SK1 L1-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N28"]').click(); // blau, SK1 N-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N29"]').click(); // grün, SK1 PE-Ausgang

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,54Ω', 'Fehlertabelle N20 (0,13Ω) + N24 (0,27Ω) + Vorimpedanz (0,14Ω)');
    erwarte(await displayTexte(page), 'Isc:383,3A', 'Isc = 0,9*230V/0,54Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (383,3A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  // testcase_04, SK2 (nächste Reihenklemmen-Gruppe): Ausgangsschrauben N31
  // (L2), N32 (N), N33 (PE). L2-Pfad N2->N7->N10->N21->N25->N31 =
  // 0,19(N21)+0,34(N25) = 0,53Ω. Z = 0,53 + 0,14 (Vorimpedanz) = 0,67Ω;
  // Isc = 0,9*230/0,67 = 309,0A; bei B/16A (Lim 80,0A) -> Ampel grün.
  // N33 (PE-Ausgang) kommt im SVG zweimal vor (auch als Fallback-Wert der
  // oberen PE-Reihenklemmen-Eingangsschraube, siehe ARCHITEKTUR.md
  // "PE-Reihenklemmen-Bugfix") - deshalb per cy="131" auf die untere
  // (Ausgangs-)Schraube der Reihe 1 eingeschränkt.
  await pruefe('ZS: testcase_04 SK2 (L2) - Z:0,67Ω, Isc:309,0A, Ampel grün bei B/16A', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N31"]').click(); // schwarz, SK2 L2-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N32"]').click(); // blau, SK2 N-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N33"][cy="131"]').click(); // grün, SK2 PE-Ausgang

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,67Ω', 'Fehlertabelle N21 (0,19Ω) + N25 (0,34Ω) + Vorimpedanz (0,14Ω)');
    erwarte(await displayTexte(page), 'Isc:309,0A', 'Isc = 0,9*230V/0,67Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (309,0A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  // testcase_04, SK3 (dritte Reihenklemmen-Gruppe): Ausgangsschrauben N34
  // (L3), N35 (N), N36 (PE). L3-Pfad N3->N8->N11->N22->N26->N34 =
  // 0,41(N22)+0,08(N26) = 0,49Ω. Z = 0,49 + 0,14 (Vorimpedanz) = 0,63Ω;
  // Isc = 0,9*230/0,63 = 328,6A; bei B/16A (Lim 80,0A) -> Ampel grün. N36
  // (PE-Ausgang) kommt wieder zweimal vor (siehe SK2-Kommentar oben) -
  // deshalb per cy="131" auf die untere Schraube eingeschränkt.
  await pruefe('ZS: testcase_04 SK3 (L3) - Z:0,63Ω, Isc:328,6A, Ampel grün bei B/16A', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N34"]').click(); // schwarz, SK3 L3-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N35"]').click(); // blau, SK3 N-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N36"][cy="131"]').click(); // grün, SK3 PE-Ausgang

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,63Ω', 'Fehlertabelle N22 (0,41Ω) + N26 (0,08Ω) + Vorimpedanz (0,14Ω)');
    erwarte(await displayTexte(page), 'Isc:328,6A', 'Isc = 0,9*230V/0,63Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (328,6A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  // Gleicher Pfad/Messwert wie oben (SK3, L3), aber Bemessungsstrom auf 80A
  // gestellt (LS-Typ bleibt B): Lim = 5*80 = 400,0A > Isc (328,6A) -> Ampel
  // kippt auf rot, obwohl der Messwert selbst unverändert bleibt.
  await pruefe('ZS: testcase_04 SK3 (L3) mit B/80A - Isc (328,6A) < Lim (400,0A), Ampel rot', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N34"]').click(); // schwarz, SK3 L3-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N35"]').click(); // blau, SK3 N-Ausgang
    await page.locator('#schaltkasten svg circle[data-netz="N36"][cy="131"]').click(); // grün, SK3 PE-Ausgang

    await klick(page, '◄►'); // Titel -> LS-Typ (bleibt B)
    await klick(page, '◄►'); // LS-Typ -> Bemessungsstrom
    for (let i = 0; i < 8; i++) await klick(page, '▲'); // 16A -> 80A

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,63Ω', 'Messwert unverändert gegenüber B/16A');
    erwarte(await displayTexte(page), 'Isc:328,6A', 'Isc unverändert');
    erwarte(await displayTexte(page), 'Lim: 400,0A', 'Lim (B, 80A) = 5*80');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Isc (328,6A) < Lim (400,0A) -> Ampel rot');
    await page.close();
  });

  // testcase_05: EIN 3-poliger LS1 statt drei einpoliger (siehe KONZEPT.md
  // "3-poliger LS") - dieselbe Verdrahtung/Fehlertabelle wie testcase_04s
  // drei separate LS, deshalb müssen dieselben Z/Isc-Werte pro Phase
  // rauskommen (Nachweis, dass das Zusammenfassen zu einer Komponente die
  // Pfadsuche/Fehlertabellen-Summierung nicht verändert).
  await pruefe('ZS: testcase_05 - 3-poliger LS1, Phase L1 liefert denselben Wert wie testcase_04 SK1 (L1)', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N27"]').click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N28"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N29"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,54Ω', 'wie testcase_04 SK1 (L1): Fehlertabelle N20+N24 + Vorimpedanz');
    erwarte(await displayTexte(page), 'Isc:383,3A', 'Isc = 0,9*230V/0,54Ω');
    await page.close();
  });

  await pruefe('ZS: testcase_05 - derselbe 3-polige LS1, Phase L2 liefert denselben Wert wie testcase_04 SK2 (L2)', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N31"]').click(); // schwarz, L2
    await page.locator('#schaltkasten svg circle[data-netz="N28"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N29"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,67Ω', 'wie testcase_04 SK2 (L2): Fehlertabelle N21+N25 + Vorimpedanz');
    erwarte(await displayTexte(page), 'Isc:309,0A', 'Isc = 0,9*230V/0,67Ω');
    await page.close();
  });

  await pruefe('ZS: testcase_05 - derselbe 3-polige LS1, Phase L3 liefert denselben Wert wie testcase_04 SK3 (L3)', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N34"]').click(); // schwarz, L3
    await page.locator('#schaltkasten svg circle[data-netz="N28"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N29"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,63Ω', 'wie testcase_04 SK3 (L3): Fehlertabelle N22+N26 + Vorimpedanz');
    erwarte(await displayTexte(page), 'Isc:328,6A', 'Isc = 0,9*230V/0,63Ω');
    await page.close();
  });

  // Der 3-polige LS1 muss als EINE Schalter-Box mit genau einem Hebel
  // gezeichnet werden (wie beim 4-poligen RCD/3-poligen Hauptschalter),
  // nicht als drei separate 1-TE-Boxen - Breite nach der "einfach"-Formel
  // in schaltkasten.js (3 Pole: 3*24 + (3-2)*6 = 78px). Seit Gruppe G2
  // (RCD2 + LS2/LS3 mit AFDD, siehe KONZEPT.md "AFDD") gibt es insgesamt
  // 6 Schalter-Boxen statt 3 (RCD1, LS1, RCD2, LS2, LS3, Hauptschalter).
  await pruefe('Schaltkasten: testcase_05 - der 3-polige LS1 ist EINE Schalter-Box mit 78px Breite (keine drei einzelnen)', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({
        x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width')
      }))
    );
    if (boxen.length !== 6) throw new Error(`erwarte 6 Schalter-Boxen (RCD1, LS1, RCD2, LS2, LS3, Hauptschalter), gefunden ${boxen.length}: ${JSON.stringify(boxen)}`);
    const ls1Box = boxen.find((b) => b.w === '78' && b.y === '322');
    if (!ls1Box) throw new Error(`erwarte eine 78px breite Schalter-Box für LS1 in Reihe 2, gefunden: ${JSON.stringify(boxen)}`);
    await page.close();
  });

  // "LS mit AFDD"-Kombigerät (siehe KONZEPT.md "AFDD"): baulich wie ein
  // 2-poliger RCD - dieselbe Schalter-Box-Breite (24px, Basisbreite) wie
  // RCD2 daneben, nicht die "einfach"-Formel eines normalen LS. Zweizeilige
  // Aufschrift (LS-Charakteristik+Nennstrom, darunter "AFDD").
  await pruefe('Schaltkasten: testcase_05 - LS2/LS3 mit AFDD haben dieselbe Schalter-Bauform wie der 2-polige RCD2 (24px) und zweizeilige Aufschrift', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({
        x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width')
      }))
    );
    const gruppe2Boxen = boxen.filter((b) => b.y === '322' && parseFloat(b.x) >= 252).sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
    if (gruppe2Boxen.length !== 3) throw new Error(`erwarte 3 Schalter-Boxen in Gruppe G2 (RCD2, LS2, LS3), gefunden ${gruppe2Boxen.length}: ${JSON.stringify(gruppe2Boxen)}`);
    for (const box of gruppe2Boxen) {
      if (box.w !== '24') throw new Error(`erwarte 24px Schalter-Box-Breite (RCD-Bauform) für RCD2/LS2/LS3, gefunden: ${JSON.stringify(box)}`);
    }

    const labels = await page.evaluate(() => [...document.querySelectorAll('#schaltkasten svg text')].map((t) => t.textContent));
    if (!labels.includes('B20AFDD')) throw new Error(`erwarte zweizeiliges Label "B20"/"AFDD" für LS2, gefunden: ${JSON.stringify(labels)}`);
    if (!labels.includes('B16AFDD')) throw new Error(`erwarte zweizeiliges Label "B16"/"AFDD" für LS3, gefunden: ${JSON.stringify(labels)}`);
    await page.close();
  });

  // testcase_06: derselbe 3-polige LS1, aber OHNE vorgeschaltetes RCD
  // (Gruppe besteht nur aus LS1) - Regressionstest für den Bug, bei dem
  // `generate_anlage.js` bei einer RCD-losen Gruppe abstürzte (siehe
  // KONZEPT.md "3-poliger LS" / ARCHITEKTUR.md). ZS muss trotzdem normal
  // funktionieren (nur der RCD-Fehlertabellen-Anteil entfällt), und FI/RCD
  // darf keinen RCD finden (kein RCD auf dem Pfad zur Einspeisung).
  await pruefe('ZS: testcase_06 - 3-poliger LS1 OHNE RCD, Phase L1', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N23"]').click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N27"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,34Ω', 'Fehlertabelle N20 (0,20Ω) + Vorimpedanz');
    erwarte(await displayTexte(page), 'Isc:608,8A', 'Isc = 0,9*230V/0,34Ω');
    await page.close();
  });

  await pruefe('ZS: testcase_06 - derselbe 3-polige LS1 OHNE RCD, Phase L2', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').click(); // schwarz, L2
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N27"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,42Ω', 'Fehlertabelle N21 (0,28Ω) + Vorimpedanz');
    erwarte(await displayTexte(page), 'Isc:492,9A', 'Isc = 0,9*230V/0,42Ω');
    await page.close();
  });

  await pruefe('ZS: testcase_06 - derselbe 3-polige LS1 OHNE RCD, Phase L3', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N25"]').click(); // schwarz, L3
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N27"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,29Ω', 'Fehlertabelle N22 (0,15Ω) + Vorimpedanz');
    erwarte(await displayTexte(page), 'Isc:713,8A', 'Isc = 0,9*230V/0,29Ω');
    await page.close();
  });

  await pruefe('Schaltkasten: testcase_06 - Gruppe G1 (LS1, keine RCD-Box) UND Gruppe G2 (RCD2 2-polig + LS2/LS3) auf derselben Hutschiene, Hauptschalter unverändert', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({
        x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width')
      }))
    );
    // 5 Schalter-Boxen: LS1 (78px, Gruppe G1) + RCD2/LS2/LS3 (je 24px,
    // Gruppe G2) in Reihe 2 (y=322), plus Hauptschalter (78px) in der
    // letzten Reihe (y=572) - keine eigene RCD-Box für G1.
    if (boxen.length !== 5) throw new Error(`erwarte genau 5 Schalter-Boxen, gefunden ${boxen.length}: ${JSON.stringify(boxen)}`);
    const ls1Box = boxen.find((b) => b.w === '78' && b.y === '322');
    if (!ls1Box) throw new Error(`erwarte eine 78px breite Schalter-Box für LS1 in Reihe 2, gefunden: ${JSON.stringify(boxen)}`);
    const hauptschalterBox = boxen.find((b) => b.w === '78' && b.y === '572');
    if (!hauptschalterBox) throw new Error(`erwarte eine 78px breite Schalter-Box für den Hauptschalter in der letzten Reihe, gefunden: ${JSON.stringify(boxen)}`);
    const gruppe2Boxen = boxen.filter((b) => b.w === '24' && b.y === '322');
    if (gruppe2Boxen.length !== 3) throw new Error(`erwarte 3 weitere 24px breite Boxen (RCD2, LS2, LS3) in Reihe 2, gefunden ${gruppe2Boxen.length}: ${JSON.stringify(boxen)}`);
    await page.close();
  });

  await pruefe('FI/RCD: testcase_06 - kein RCD auf dem Pfad -> TEST bleibt wirkungslos, Ampel rot', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    await page.locator('#schaltkasten svg circle[data-netz="N23"]').click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N27"]').click(); // grün, PE

    await klick(page, 'TEST');
    const texte = await displayTexte(page);
    if (texte.some((t) => t.startsWith('I:') && t !== 'I:___mA')) {
      throw new Error(`erwarte weiterhin Platzhalter I:___mA (kein RCD gefunden), gefunden: [${texte.join(', ')}]`);
    }
    erwarte(texte, 'I:___mA', 'kein RCD gefunden - Platzhalter bleibt');
    const ampel = await ampelFarben(page);
    if (ampel[0] !== '#ff6666') throw new Error(`erwarte rote Ampel links, gefunden: ${JSON.stringify(ampel)}`);
    await page.close();
  });

  // testcase_05 Gruppe G2 (AFDD, siehe KONZEPT.md "AFDD"): geräteübergreifend
  // über drei verschiedene Endstellen - Blau auf der Drehstromsteckdose SK1
  // (N-Kontakt, Index 4 der grauen Kreise), Schwarz auf SK2 (mittlere
  // Steckdose, linker Kontakt = L1, Index 5), Grün auf SK3s PE (rechte
  // Steckdose, Index 2 der grauen Rechtecke - anders als bei testcase_06 gibt
  // es hier ZWEI normale Steckdosen mit PE-Rechtecken, `.first()` würde SK2s
  // PE statt SK3s treffen). Findet trotzdem RCD2 (die RCD-Suche läuft nur
  // über den Pfad der schwarzen L-Sonde), übernimmt dessen Auslösewerte aus
  // bauteile.md (24,0mA/0,9V/21,0ms) und öffnet nach TEST automatisch den
  // Hebel - Spannung fällt dadurch von 230V auf 0V, der Pfeil-Kasten wird
  // entsprechend durchgestrichen, Ampel rechts grün.
  await pruefe('FI/RCD: testcase_05 - Blau auf der Drehstromsteckdose (N), Schwarz auf SK2 (L1), Grün auf SK3 (PE) findet RCD2, übernimmt dessen Auslösewerte', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // schwarz: SK2 (mittlere Steckdose), linker Kontakt = L1
    await kreise.nth(4).click(); // blau: Drehstromsteckdose N
    await page.locator('#steckdosen rect[fill="#666666"]').nth(2).click(); // grün: SK3 (rechte Steckdose) PE

    erwarte(await displayTexte(page), '230V', 'Stromkreis bereit, RCD2 noch geschlossen');
    if (await indikatorDurchgestrichen(page)) throw new Error('Pfeil-Kasten sollte vor TEST NICHT durchgestrichen sein (Spannung liegt an)');

    await klick(page, 'TEST');
    const texte = await displayTexte(page);
    erwarte(texte, 'I:24,0mA', 'RCD2s Auslösestrom übernommen');
    erwarte(texte, 'Uci:0,9V', 'RCD2s Berührungsspannung übernommen');
    erwarte(texte, 't:21,0ms', 'RCD2s Abschaltzeit übernommen');
    erwarte(texte, '0V', 'RCD2 hat automatisch ausgelöst, Spannung fällt auf 0V');
    if (!(await indikatorDurchgestrichen(page))) throw new Error('Pfeil-Kasten sollte nach dem automatischen Auslösen durchgestrichen sein');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'RCD gefunden -> Ampel grün');
    await page.close();
  });

  // testcase_06 Gruppe G2: SK2 (Steckdose) hängt hinter RCD2 - FI/RCD muss
  // dort im Gegensatz zu SK1 (Gruppe G1, kein RCD) tatsächlich einen RCD
  // finden. Steckdose-Kontakte: L links (dx=-8.9mm, schwarz), N rechts
  // (dx=+8.9mm, blau), PE oben/unten (grün) - siehe zeichneSteckdose() in
  // view/steckdosen.js. Werte (24,0mA/0,9V/21,0ms) aus bauteile.md RCD2.
  await pruefe('FI/RCD: testcase_06 - Steckdose (SK2, Gruppe G2) findet RCD2, übernimmt dessen Auslösewerte', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // Steckdose links (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    erwarte(await displayTexte(page), '230V', 'Stromkreis bereit, RCD2 noch geschlossen');

    await klick(page, 'TEST');
    const texte = await displayTexte(page);
    erwarte(texte, 'I:24,0mA', 'RCD2s Auslösestrom übernommen');
    erwarte(texte, 'Uci:0,9V', 'RCD2s Berührungsspannung übernommen');
    erwarte(texte, 't:21,0ms', 'RCD2s Abschaltzeit übernommen');
    await page.close();
  });

  // Kanten-Kappung (Schraubendreher, siehe KONZEPT.md "Schrauben lösen") an
  // ALLEN VIER Schrauben von RCD2 (Eingang L/N + Ausgang L/N) - anders als
  // der Bugfix-Test "berechneFircdSpannung()" oben (Sonden auf RCD2s EIGENEM
  // Eingang, siehe dort) sitzen die Sonden hier STROMABWÄRTS von RCD2 (an
  // der Steckdose SK2), deshalb unterbricht JEDE der vier Schrauben den
  // Pfad wirklich - Eingang und Ausgang je Pol kappen dieselbe Kante (siehe
  // KONZEPT.md), decken hier also zusammen beide RCD2-Kanten (L1 UND N) ab.
  // User-Vorgabe: Reihenfolge Eingang-L, Eingang-N, Ausgang-L, Ausgang-N,
  // jede Schraube einzeln lösen+prüfen+wiedereindrehen+prüfen, bevor die
  // nächste drankommt.
  await pruefe('FI/RCD: testcase_06 - Steckdose SK2, alle vier RCD2-Schrauben unterbrechen/stellen die Live-Spannungsanzeige über den Schraubendreher wieder her', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // Steckdose links (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    erwarte(await displayTexte(page), '230V', 'Spannung liegt an, bevor irgendeine Schraube gelöst wurde');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    const rcd2SchraubenAnzahl = await page.locator('#schaltkasten svg circle[data-bauteil="RCD2"]').count();
    if (rcd2SchraubenAnzahl !== 4) throw new Error(`erwarte genau 4 RCD2-Schrauben (Eingang+Ausgang, L+N), gefunden ${rcd2SchraubenAnzahl}`);

    for (let i = 0; i < rcd2SchraubenAnzahl; i++) {
      const schraube = page.locator('#schaltkasten svg circle[data-bauteil="RCD2"]').nth(i);

      await page.locator('#schraubendreher svg').click();
      await schraube.click(); // lösen
      erwarte(await displayTexte(page), '0V', `RCD2-Schraube ${i} gelöst -> Spannung fällt auf 0V`);
      if (!(await indikatorDurchgestrichen(page))) {
        throw new Error(`Pfeil-Kasten sollte durchgestrichen sein, sobald RCD2-Schraube ${i} gelöst ist`);
      }

      await page.locator('#schraubendreher svg').click();
      await schraube.click(); // wiedereindrehen
      erwarte(await displayTexte(page), '230V', `RCD2-Schraube ${i} wiedereingedreht -> Spannung kehrt zurück`);
      if (await indikatorDurchgestrichen(page)) {
        throw new Error(`Pfeil-Kasten sollte nach dem Wiedereindrehen von RCD2-Schraube ${i} NICHT mehr durchgestrichen sein`);
      }
    }
    await page.close();
  });

  // testcase_06 Gruppe G2: dieselbe geräteübergreifende Sondenplatzierung
  // wie beim V~-Test oben (Schwarz auf dem schwarzen L-Kontakt der
  // 3-poligen Anschlussdose SK3, Blau/Grün auf der Steckdose SK2), diesmal
  // auf FI/RCD - findet ebenfalls RCD2 und öffnet nach erfolgreichem TEST
  // automatisch dessen Hebel (siehe fircdTestKlick() in controller/app.js) -
  // die Spannung fällt dadurch auf 0V, die übernommenen Werte und die grüne
  // Ampel bleiben trotzdem stehen (analog dem bereits bestehenden
  // testcase_01-Test "erfolgreicher TEST öffnet automatisch den Hebel").
  await pruefe('FI/RCD: testcase_06 - Schwarz auf der 3-poligen Anschlussdose SK3 (L), Blau/Grün auf der Steckdose SK2 (N/PE) findet RCD2 und öffnet dessen Hebel automatisch', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(8).click(); // SK3 schwarzer Kontakt (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    erwarte(await displayTexte(page), '230V', 'Stromkreis bereit, RCD2 noch geschlossen');

    await klick(page, 'TEST');
    const texte = await displayTexte(page);
    erwarte(texte, 'I:24,0mA', 'RCD2s Auslösestrom übernommen');
    erwarte(texte, 'Uci:0,9V', 'RCD2s Berührungsspannung übernommen');
    erwarte(texte, 't:21,0ms', 'RCD2s Abschaltzeit übernommen');
    erwarte(texte, '0V', 'RCD2 hat automatisch ausgelöst, Spannung fällt auf 0V');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'RCD gefunden -> Ampel grün');
    await page.close();
  });

  // testcase_06 Gruppe G2: DREI verschiedene Steckdosen-View-Geräte
  // gleichzeitig - Schwarz auf dem schwarzen L-Kontakt der 3-poligen
  // Anschlussdose SK3, Blau auf dem blauen N-Kontakt der 5-poligen
  // Anschlussdose SK1 (!), Grün auf PE der Steckdose SK2. Findet trotzdem
  // RCD2 (die RCD-Suche läuft nur über den Pfad der schwarzen L-Sonde,
  // Blau/Grün müssen nur korrekt platziert sein, siehe risoTestKlick()-
  // Kommentar zu Schwarz/Blau/Grün-Rollen) und öffnet dessen Hebel sichtbar
  // (kein transform vorher, `rotate(180, ...)` danach).
  await pruefe('FI/RCD: testcase_06 - drei verschiedene Geräte gleichzeitig (Schwarz auf 3-poliger Anschlussdose SK3, Blau auf 5-poliger Anschlussdose SK1, Grün auf Steckdose SK2) findet RCD2 und öffnet sichtbar dessen Hebel', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 4; i++) await drehknopfKlick(page); // RLOW -> RISO -> ZI -> ZS -> FI/RCD

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(8).click(); // SK3 schwarzer Kontakt (L) -> schwarz
    await kreise.nth(0).click(); // SK1 blauer Kontakt (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose SK2 PE -> grün

    erwarte(await displayTexte(page), '230V', 'Stromkreis bereit, RCD2 noch geschlossen');

    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width') }))
    );
    const rcd2Box = boxen.filter((b) => b.w === '24' && b.y === '322').sort((a, b) => parseFloat(a.x) - parseFloat(b.x))[0];
    const hebelVor = await page.evaluate((box) => {
      const g = [...document.querySelectorAll('#schaltkasten svg g[style*="cursor: pointer"]')].find((g) => g.querySelector(`rect[x="${box.x}"][y="${box.y}"]`));
      return g.querySelector('g[transform]')?.getAttribute('transform') ?? null;
    }, rcd2Box);
    if (hebelVor !== null) throw new Error(`erwarte RCD2-Hebel vor TEST geschlossen (kein transform), gefunden: ${hebelVor}`);

    await klick(page, 'TEST');
    const texte = await displayTexte(page);
    erwarte(texte, 'I:24,0mA', 'RCD2s Auslösestrom übernommen');
    erwarte(texte, 'Uci:0,9V', 'RCD2s Berührungsspannung übernommen');
    erwarte(texte, 't:21,0ms', 'RCD2s Abschaltzeit übernommen');
    erwarte(texte, '0V', 'RCD2 hat automatisch ausgelöst, Spannung fällt auf 0V');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'RCD gefunden -> Ampel grün');

    const hebelNach = await page.evaluate((box) => {
      const g = [...document.querySelectorAll('#schaltkasten svg g[style*="cursor: pointer"]')].find((g) => g.querySelector(`rect[x="${box.x}"][y="${box.y}"]`));
      return g.querySelector('g[transform]')?.getAttribute('transform') ?? null;
    }, rcd2Box);
    if (!hebelNach || !hebelNach.startsWith('rotate(180,')) throw new Error(`erwarte RCD2-Hebel nach TEST offen (rotate(180,...)), gefunden: ${hebelNach}`);
    await page.close();
  });

  // testcase_06s Endstelle ist jetzt eine 5-polige Anschlussdose (siehe
  // view/steckdosen.js zeichneFuenfpoligeAnschlussdose()) statt Festanschluss
  // - Messwerte müssen über deren Kontakte genauso funktionieren wie direkt
  // am Schaltkasten-Netz (dieselbe Netz-ID, keine Zusatzarbeit nötig).
  // Zeichenreihenfolge (HERD_KLEMMEN): N, PE, L1, L3, L2.
  await pruefe('ZS: testcase_06 - über die Kontakte der 5-poligen Anschlussdose gemessen liefert denselben Wert wie direkt am Schaltkasten', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(2).click(); // L1 -> schwarz
    await kreise.nth(0).click(); // N -> blau
    await kreise.nth(1).click(); // PE -> grün

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,34Ω', 'wie direkt am Schaltkasten-Netz N23 (L1) gemessen');
    erwarte(await displayTexte(page), 'Isc:608,8A', 'Isc = 0,9*230V/0,34Ω');
    await page.close();
  });

  await pruefe('ZS: testcase_06 - über die 5-polige Anschlussdose gemessen (Schwarz auf schwarz=L2, unten rechts) liefert denselben Wert wie direkt am Schaltkasten', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(4).click(); // L2 (schwarz, unten rechts) -> schwarz
    await kreise.nth(0).click(); // N -> blau
    await kreise.nth(1).click(); // PE -> grün

    erwarte(await displayTexte(page), '230V', 'L-Pfad zur Einspeisung geschlossen');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,42Ω', 'wie direkt am Schaltkasten-Netz N24 (L2) gemessen');
    erwarte(await displayTexte(page), 'Isc:492,9A', 'Isc = 0,9*230V/0,42Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (492,9A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  // testcase_06 Gruppe G2: dieselben Steckdose-Kontakte wie bei den FI/RCD-
  // und ZI-Tests oben (Schwarz auf L links, Blau auf N rechts, Grün auf PE),
  // diesmal auf ZS - anders als ZI wird nur der L-Pfad gezählt, der bei SK2
  // keinen eigenen Fehlertabellen-Eintrag trägt (nur N46 auf dem N-Pfad, den
  // ZS bewusst ignoriert) - deshalb bleibt Z hier bei der reinen Vorimpedanz.
  await pruefe('ZS: testcase_06 - über die Steckdose SK2 gemessen (Schwarz auf L links, Blau auf N rechts) ignoriert den N-Fehlertabellen-Eintrag: Z:0,14Ω', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // Steckdose links (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    erwarte(await displayTexte(page), '230V', 'L-Pfad zur Einspeisung geschlossen');

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,14Ω', 'reine Vorimpedanz, L-Pfad ohne eigenen Fehlertabellen-Eintrag');
    erwarte(await displayTexte(page), 'Isc:1478,6A', 'Isc = 0,9*230V/0,14Ω');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Isc (1478,6A) > Lim (80,0A) -> Ampel grün');
    await page.close();
  });

  await pruefe('ZS: Live-Spannungsanzeige fällt auf 0V, sobald der L-Pfad unterbrochen wird - Pfeil-Kasten entsprechend durchgestrichen', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte vor Messspitzen durchgestrichen sein');
    }

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE
    erwarte(await displayTexte(page), '230V', 'L-Pfad zunächst geschlossen');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> L-Pfad unterbrochen
    erwarte(await displayTexte(page), '0V', 'L-Pfad unterbrochen -> 0V, unabhängig vom PE-Pfad');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte wieder durchgestrichen sein, sobald die Spannung wegfällt');
    }
    await page.close();
  });

  await pruefe('ZS: Schwarz nicht auf L1/L2/L3 -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    // Vertauscht: schwarz auf N, blau auf L1 - für ZS (anders als RISO)
    // keine vertauschbaren Rollen, Schwarz MUSS auf L sitzen.
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // schwarz, N
    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // blau, L1
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:---Ω', 'Schwarz auf N statt L -> keine gültige Platzierung');
    await page.close();
  });

  await pruefe('ZS: Grün nicht auf PE -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // grün, FÄLSCHLICH auf L1

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:---Ω', 'Grün nicht auf PE -> TEST liefert keinen Messwert, obwohl der L-Pfad geschlossen wäre');
    await page.close();
  });

  await pruefe('ZS: Blau nicht auf N -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N7"]').first().click(); // blau, FÄLSCHLICH auf L1 (RCD1.o1, zweiter LS-Zweig)
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:---Ω', 'Blau nicht auf N -> TEST liefert keinen Messwert');
    await page.close();
  });

  await pruefe('ZS: offenes RCD unterbricht den L-Pfad zur Einspeisung -> TEST bleibt wirkungslos', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> L-Pfad unterbrochen

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:---Ω', 'Kein Pfad zur Einspeisung -> TEST liefert keinen Messwert');
    await page.close();
  });

  await pruefe('ZS: Messspitzen-Änderung nach TEST setzt den Messwert zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün
    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'TEST liefert zunächst einen Messwert');

    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün entfernen
    erwarte(await displayTexte(page), 'Z:---Ω', 'Messspitzen-Änderung setzt den alten Messwert zurück');
    await page.close();
  });

  await pruefe('ZS: Drehknopf-Wechsel setzt den Messwert zurück auf den Platzhalter', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün
    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'TEST liefert einen Messwert');

    for (let i = 0; i < 6; i++) await drehknopfKlick(page); // voller Zyklus zurück zu ZS
    erwarte(await displayTexte(page), 'Z:---Ω', 'Messwert nach Drehknopf-Wechsel wieder Platzhalter');
    await page.close();
  });

  await pruefe('ZS: ZSrcd-Ansicht zeigt denselben Messwert wie die normale Zs-Ansicht', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün
    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'Messwert in der normalen Zs-Ansicht');

    await klick(page, '◄►'); // Titel -> LS-Typ
    await klick(page, '◄►'); // LS-Typ -> Bemessungsstrom
    await klick(page, '◄►'); // Bemessungsstrom -> Abschaltzeit
    await klick(page, '◄►'); // Abschaltzeit -> Titel
    await klick(page, '▲'); // Titel -> ZSrcd-Ansicht
    erwarte(await displayTexte(page), 'ZSrcd', 'ZSrcd-Ansicht aktiv');
    erwarte(await displayTexte(page), 'Z:0,24Ω', 'Derselbe Messwert bleibt in der ZSrcd-Ansicht sichtbar');
    await page.close();
  });

  // --- FI/RCD: analog zu ZS aufgebaut - live Spannungsanzeige +
  // Pfeil-Kasten-Umschaltung, dieselbe Platzierungsvorgabe (Schwarz auf
  // L1/L2/L3, Grün auf PE, Blau auf N) und derselbe Ein-Pfad-Check (nur
  // Schwarz -> Einspeisung, PE/N-Pfad bewusst nicht geprüft). Die eigentliche
  // Auslösewert-Berechnung (I/Uci/t) folgt weiter unten.
  await pruefe('FI/RCD: Live-Spannungsanzeige zeigt 230V bei bereitem Stromkreis, 0V sonst - Pfeil-Kasten entsprechend', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    erwarte(await displayTexte(page), '0V', 'Spannungsanzeige-Default vor Messspitzen');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte vor Messspitzen durchgestrichen sein');
    }

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE
    erwarte(await displayTexte(page), '230V', 'L-Pfad zur Einspeisung geschlossen -> 230V');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> L-Pfad unterbrochen
    erwarte(await displayTexte(page), '0V', 'L-Pfad unterbrochen -> 0V');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte wieder durchgestrichen sein, sobald die Spannung wegfällt');
    }
    await page.close();
  });

  // testcase_01: N6/N8 = RCD1.o1/o2, direkt hinter RCD1 - erstes (und
  // einziges) RCD auf dem Weg von der Sonde zur Einspeisung.
  await pruefe('FI/RCD: TEST übernimmt tA/iA/uB des gefundenen RCD, Ampel grün', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'I:18,0mA', 'RCD1.iA übernommen');
    erwarte(await displayTexte(page), 'Uci:1,0V', 'RCD1.uB übernommen');
    erwarte(await displayTexte(page), 't:22,0ms', 'RCD1.tA übernommen');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'RCD gefunden -> Ampel grün');
    await page.close();
  });

  // Hebel-Umbau: SchaltkastenView.render() gibt jetzt zusätzlich
  // schalterHandles zurück (Map<bauteilName, {setGeschlossen}>), über die
  // app.js denselben Zustandswechsel programmatisch auslösen kann wie ein
  // echter Mausklick (siehe zeichneSchalter() in schaltkasten.js). Genutzt
  // von fircdTestKlick(): nach einem erfolgreichen RCD-Fund öffnet sich
  // dessen Hebel automatisch - visuell UND im Verbindungsgraphen.
  await pruefe('FI/RCD: erfolgreicher TEST öffnet automatisch den Hebel des gefundenen RCD', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    function hebelTransform() {
      return page.evaluate(() => {
        const rect = document.querySelector('#schaltkasten svg rect[x="8"][y="322"]'); // RCD1s Schalter-Box
        const outerG = rect?.parentElement;
        const hebelG = outerG?.querySelector('g');
        return hebelG?.getAttribute('transform') ?? null;
      });
    }
    if (await hebelTransform()) {
      throw new Error('Hebel sollte vor dem TEST geschlossen sein (kein transform)');
    }

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    if (!(await hebelTransform())) {
      throw new Error('Hebel des gefundenen RCD sollte sich nach erfolgreichem TEST automatisch öffnen');
    }
    erwarte(await displayTexte(page), '0V', 'Spannung fällt live auf 0V, da der Pfad jetzt durch den offenen RCD unterbrochen ist');
    erwarte(await displayTexte(page), 'I:18,0mA', 'übernommene Messwerte bleiben trotz offenem Hebel im Display stehen');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'Ampel bleibt grün');
    await page.close();
  });

  // testcase_03: RCD1 (G1) speist SK1 (LS1) UND SK2 (LS2) gemeinsam - Schwarz
  // auf Reihenklemme_L_SK1, Blau auf Reihenklemme_N_SK2 (eine ANDERE
  // Stromkreis als Schwarz, aber immer noch hinter demselben RCD1), Grün auf
  // Reihenklemme_PE_SK1. Zeigt, dass die Rollenprüfung (Blau auf N, Grün auf
  // PE) nur die FUNKTION der Ader prüft, nicht ob sie zum selben Stromkreis
  // wie Schwarz gehört - für die RCD-Suche selbst zählt ohnehin nur der
  // Schwarz-Pfad zur Einspeisung (findeErstesRcdAufPfad()).
  await pruefe('FI/RCD: testcase_03 - Schwarz/Blau/Grün aus unterschiedlichen Stromkreisen hinter RCD1 finden trotzdem RCD1 und öffnen dessen Hebel', async () => {
    const page = await neueSeiteMitTestcase('testcase_03');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    function hebelTransform() {
      return page.evaluate(() => {
        const rect = document.querySelector('#schaltkasten svg rect[x="8"][y="322"]'); // RCD1s Schalter-Box
        const outerG = rect?.parentElement;
        const hebelG = outerG?.querySelector('g');
        return hebelG?.getAttribute('transform') ?? null;
      });
    }

    await page.locator('#schaltkasten svg circle[data-netz="N23"]').first().click(); // schwarz, Reihenklemme_L_SK1
    await page.locator('#schaltkasten svg circle[data-netz="N29"]').first().click(); // blau, Reihenklemme_N_SK2
    await page.locator('#schaltkasten svg circle[data-netz="N27"]').first().click(); // grün, Reihenklemme_PE_SK1

    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'I:16,0mA', 'RCD1.iA übernommen');
    erwarte(await displayTexte(page), 't:20,0ms', 'RCD1.tA übernommen');
    if (!(await hebelTransform())) {
      throw new Error('Hebel von RCD1 sollte sich nach erfolgreichem TEST automatisch öffnen');
    }
    await page.close();
  });

  // testcase_03: RCD3 (G3, zweite Gruppe der zweiten Hutschiene, rechts von
  // RCD2 gezeichnet) speist SK5/SK6 - Schwarz auf der letzten grauen
  // Reihenklemme (Reihenklemme_L_SK6), Blau auf der letzten blauen
  // Reihenklemme (Reihenklemme_N_SK6), Grün auf der (einzigen) grünen
  // PE-Klemme in der letzten Reihe (anders als der vorige Test: hier die
  // anlagenweite PE-Klemme, keine Reihenklemme_PE_SKx). Deckt einen anderen
  // RCD als die bisherigen Tests ab (RCD3 statt RCD1) und den rechtesten
  // Schalter im Schaltkasten.
  await pruefe('FI/RCD: testcase_03 - Schwarz/Blau auf SK6, Grün auf der PE-Klemme finden RCD3 und öffnen dessen Hebel (rechter RCD)', async () => {
    const page = await neueSeiteMitTestcase('testcase_03');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    function hebelTransformRcd3() {
      return page.evaluate(() => {
        const rect = document.querySelector('#schaltkasten svg rect[x="152"][y="572"]'); // RCD3s Schalter-Box
        const outerG = rect?.parentElement;
        const hebelG = outerG?.querySelector('g');
        return hebelG?.getAttribute('transform') ?? null;
      });
    }
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte vor dem Anlegen der Messspitzen durchgestrichen sein');
    }

    await page.locator('#schaltkasten svg circle[data-netz="N44"]').first().click(); // schwarz, Reihenklemme_L_SK6
    await page.locator('#schaltkasten svg circle[data-netz="N45"]').first().click(); // blau, Reihenklemme_N_SK6
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').first().click(); // grün, PE-Klemme

    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte nach vollständig angelegten Messspitzen NICHT mehr durchgestrichen sein');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'I:20,0mA', 'RCD3.iA übernommen');
    erwarte(await displayTexte(page), 'Uci:0,8V', 'RCD3.uB übernommen');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'RCD gefunden -> Ampel grün');
    erwarte(await displayTexte(page), '0V', 'Spannung fällt live auf 0V, da RCD3 jetzt offen ist');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte nach dem Auslösen wieder durchgestrichen sein (keine Spannung mehr)');
    }
    if (!(await hebelTransformRcd3())) {
      throw new Error('Hebel von RCD3 sollte sich nach erfolgreichem TEST automatisch öffnen');
    }
    await page.close();
  });

  // testcase_04: einziges RCD (RCD1, 4-polig, speist L1/L2/L3 gemeinsam) -
  // Schwarz auf der zweiten grauen Reihenklemme (Reihenklemme_L_SK2, also
  // L2 statt L1 - testcase_04s drei Stromkreise hängen an je einer eigenen
  // Phase), Blau auf der zweiten blauen Reihenklemme (Reihenklemme_N_SK2),
  // Grün auf der anlagenweiten PE-Klemme (wie im vorigen testcase_03-Test).
  await pruefe('FI/RCD: testcase_04 - Schwarz/Blau auf SK2 (L2), Grün auf der PE-Klemme finden RCD1 und öffnen dessen Hebel', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    function hebelTransformRcd1() {
      return page.evaluate(() => {
        const rect = document.querySelector('#schaltkasten svg rect[x="8"][y="322"]'); // RCD1s Schalter-Box
        const outerG = rect?.parentElement;
        const hebelG = outerG?.querySelector('g');
        return hebelG?.getAttribute('transform') ?? null;
      });
    }

    await page.locator('#schaltkasten svg circle[data-netz="N31"]').first().click(); // schwarz, Reihenklemme_L_SK2 (L2)
    await page.locator('#schaltkasten svg circle[data-netz="N32"]').first().click(); // blau, Reihenklemme_N_SK2
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click(); // grün, PE-Klemme

    erwarte(await displayTexte(page), '230V', 'Spannung liegt an, sobald alle drei Sonden korrekt sitzen');
    if (await indikatorDurchgestrichen(page)) {
      throw new Error('Pfeil-Kasten sollte bei anliegender Spannung NICHT durchgestrichen sein');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'I:16,0mA', 'RCD1.iA übernommen');
    erwarte(await displayTexte(page), 'Uci:0,9V', 'RCD1.uB übernommen');
    erwarte(await displayTexte(page), 't:20,0ms', 'RCD1.tA übernommen');
    erwarteGleich(await ampelFarben(page), ['#999999', '#66ee66'], 'RCD gefunden -> Ampel grün');
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte nach dem Auslösen wieder durchgestrichen sein (keine Spannung mehr)');
    }
    if (!(await hebelTransformRcd1())) {
      throw new Error('Hebel von RCD1 sollte sich nach erfolgreichem TEST automatisch öffnen');
    }
    await page.close();
  });

  // testcase_01: N4/N5 = Leistungsschalter.o1/o2, VOR RCD1 - auf dem Weg zur
  // Einspeisung liegt hier kein RCD mehr (nur noch der Leistungsschalter).
  await pruefe('FI/RCD: kein RCD auf dem Pfad -> Felder bleiben leer, Ampel rot', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N5"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'I:___mA', 'Kein RCD gefunden -> I bleibt Platzhalter');
    erwarte(await displayTexte(page), 'Uci:___V', 'Kein RCD gefunden -> Uci bleibt Platzhalter');
    erwarte(await displayTexte(page), 't:___ms', 'Kein RCD gefunden -> t bleibt Platzhalter');
    erwarteGleich(await ampelFarben(page), ['#ff6666', '#999999'], 'Kein RCD gefunden -> Ampel rot');

    // Messspitzen-Änderung setzt Werte UND Ampel zurück auf grau.
    await page.locator('#schaltkasten svg circle[data-netz="N4"]').first().click(); // schwarz entfernen
    erwarteGleich(await ampelFarben(page), ['#999999', '#999999'], 'Messspitzen-Änderung setzt Ampel zurück auf grau');
    await page.close();
  });

  // Pfeil-Kasten durchgestrichen (kein Pfad/keine Spannung) - TEST bleibt
  // komplett wirkungslos, anders als der "kein RCD gefunden"-Fall oben:
  // keine Ampel-Änderung, weiterhin grau.
  await pruefe('FI/RCD: Pfeil-Kasten durchgestrichen -> TEST bleibt komplett wirkungslos (keine Ampel-Änderung)', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);
    await drehknopfKlick(page);

    const rcd1 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]')
      .filter({ has: page.locator('rect[x="8"][y="322"]') });
    await rcd1.click(); // RCD1 offen -> keine Spannung hinter RCD1

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE
    if (!(await indikatorDurchgestrichen(page))) {
      throw new Error('Pfeil-Kasten sollte durchgestrichen sein (keine Spannung)');
    }

    await klick(page, 'TEST');
    erwarte(await displayTexte(page), 'I:___mA', 'TEST bleibt wirkungslos, Platzhalter unverändert');
    erwarteGleich(await ampelFarben(page), ['#999999', '#999999'], 'TEST bleibt wirkungslos, Ampel bleibt grau');
    await page.close();
  });

  // --- V~: reine Spannungsmessung, freie Sondenplatzierung (keine
  // L/N/PE-Rollenprüfung), keine TEST-Taste nötig - Uln/Ulpe/Unpe live.
  await pruefe('V~: Uln/Ulpe/Unpe zeigen 0V ohne Messspitzen', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const texte = await displayTexte(page);
    erwarte(texte, 'Uln:', 'Uln-Label vorhanden');
    erwarte(texte, 'Ulpe:', 'Ulpe-Label vorhanden');
    erwarte(texte, 'Unpe:', 'Unpe-Label vorhanden');
    erwarteGleich(texte.filter((t) => t === '0V').length, 3, 'alle drei Werte 0V ohne Messspitzen');
    await page.close();
  });

  await pruefe('V~: L-N-Sonden zeigen 230V, N-PE zeigt 0V (Uln/Ulpe leben, Unpe nicht)', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    await page.locator('#schaltkasten svg circle[data-netz="N3"]').click(); // grün, PE

    const texte = await displayTexte(page);
    erwarte(texte, '230V', 'Uln/Ulpe: 230V bei L-N bzw. L-PE');
    erwarteGleich(texte.filter((t) => t === '230V').length, 2, 'genau zwei 230V-Werte (Uln und Ulpe)');
    erwarteGleich(texte.filter((t) => t === '0V').length, 1, 'Unpe bleibt 0V (N und PE gleiches Potential)');
    await page.close();
  });

  await pruefe('V~: zwei verschiedene Außenleiter zeigen 400V (Leiter-Leiter)', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N7"]').first().click(); // blau, L2

    const texte = await displayTexte(page);
    erwarte(texte, 'Uln:', 'Uln-Label vorhanden');
    erwarte(texte, '400V', 'schwarz-blau zwischen zwei Außenleitern -> 400V');
    erwarteGleich(texte.filter((t) => t === '0V').length, 2, 'Ulpe/Unpe bleiben 0V ohne grüne Sonde');
    await page.close();
  });

  await pruefe('V~: kein TEST nötig - Messwerte sind sofort live, TEST-Taste ohne Wirkung', async () => {
    const page = await neueSeiteMitTestcase('testcase_01');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N6"]').first().click(); // schwarz, L1
    await page.locator('#schaltkasten svg circle[data-netz="N8"]').first().click(); // blau, N
    const vorTest = await displayTexte(page);
    erwarte(vorTest, '230V', 'Uln bereits live ohne TEST');

    await klick(page, 'TEST');
    const nachTest = await displayTexte(page);
    erwarteGleich(nachTest, vorTest, 'TEST-Taste verändert bei V~ nichts');
    await page.close();
  });

  // testcase_04: drei grau eingefärbte Reihenklemmen_L (SK1/SK2/SK3, je auf
  // einer eigenen Phase L1/L2/L3 - siehe FARBEN.reihenklemme_l in
  // schaltkasten.js, unabhängig von der Phase immer grau). N24/N25/N26 sind
  // die jeweiligen Schrauben.
  await pruefe('V~: testcase_04 - eine Sonde auf der grauen SK1-Reihenklemme zeigt überall 0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz, SK1-grau (L1)

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '0V').length, 3, 'nur eine Sonde gesetzt -> alle drei Paare 0V');
    await page.close();
  });

  await pruefe('V~: testcase_04 - Sonden auf SK1- und SK2-Reihenklemme (grau) zeigen Uln=400V', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz, SK1-grau (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // blau, SK2-grau (L2)

    const texte = await displayTexte(page);
    erwarte(texte, 'Uln:', 'Uln-Label vorhanden');
    erwarte(texte, '400V', 'SK1/SK2-grau sind verschiedene Außenleiter -> 400V');
    erwarteGleich(texte.filter((t) => t === '0V').length, 2, 'Ulpe/Unpe bleiben 0V ohne dritte Sonde');
    await page.close();
  });

  await pruefe('V~: testcase_04 - alle drei Sonden auf SK1/SK2/SK3-Reihenklemme (grau) zeigen überall 400V', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz, SK1-grau (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // blau, SK2-grau (L2)
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').first().click(); // grün, SK3-grau (L3)

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '400V').length, 3, 'alle drei Paare zwischen unterschiedlichen Außenleitern -> 400V');
    await page.close();
  });

  // --- Phasenfolge (Teil von V~, siehe KONZEPT.md "V~" - kein eigener
  // Drehknopf-Punkt, reine Erweiterung des bestehenden V~-Displays). Nur
  // sichtbar, wenn Schwarz/Blau/Grün auf drei UNTERSCHIEDLICHEN Phasen
  // (L1/L2/L3) liegen und Spannung anliegt. "1.2.3." bei den drei
  // zyklischen Rotationen von L1->L2->L3 (Schwarz->Blau->Grün folgt der
  // "aufsteigenden" Reihenfolge), "3.2.1." bei den restlichen drei
  // (umgekehrten) Zuordnungen - siehe berechnePhasenfolge() in
  // controller/app.js. testcase_04: N24/N25/N26 = SK1/SK2/SK3-Reihenklemme
  // (L1/L2/L3). ---

  function phasenfolgeText(texte) {
    return texte.find((t) => t === '1.2.3.' || t === '3.2.1.') ?? null;
  }

  await pruefe('V~: Phasenfolge - Schwarz=L1/Blau=L2/Grün=L3 zeigt "1.2.3."', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz L1
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // blau L2
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').first().click(); // grün L3

    erwarteGleich(phasenfolgeText(await displayTexte(page)), '1.2.3.', 'zyklische Rotation L1->L2->L3');
    await page.close();
  });

  await pruefe('V~: Phasenfolge - Schwarz=L2/Blau=L3/Grün=L1 zeigt ebenfalls "1.2.3." (zyklische Rotation)', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // schwarz L2
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').first().click(); // blau L3
    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // grün L1

    erwarteGleich(phasenfolgeText(await displayTexte(page)), '1.2.3.', 'zyklische Rotation L2->L3->L1');
    await page.close();
  });

  await pruefe('V~: Phasenfolge - Schwarz=L1/Blau=L3/Grün=L2 zeigt "3.2.1." (umgekehrte Reihenfolge)', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz L1
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').first().click(); // blau L3
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // grün L2

    erwarteGleich(phasenfolgeText(await displayTexte(page)), '3.2.1.', 'umgekehrte Reihenfolge L1->L3->L2');
    await page.close();
  });

  await pruefe('V~: Phasenfolge - Schwarz und Blau auf derselben Phase (L1) zeigt keine Anzeige', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const l1 = page.locator('#schaltkasten svg circle[data-netz="N24"]').first();
    await l1.click(); // schwarz
    await l1.click(); // blau (dieselbe Schraube, 2. Klick)
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // grün L2

    erwarteGleich(phasenfolgeText(await displayTexte(page)), null, 'zwei Sonden auf derselben Phase -> keine sinnvolle Drehfeldrichtung');
    await page.close();
  });

  await pruefe('V~: Phasenfolge - Grün auf N statt einer Phase zeigt keine Anzeige', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz L1
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // blau L2
    await page.locator('#schaltkasten svg circle[data-netz="N2"]').first().click(); // grün, Hauptschalter.i2 (N)

    erwarteGleich(phasenfolgeText(await displayTexte(page)), null, 'Grün nicht auf einer Phase -> keine Anzeige');
    await page.close();
  });

  await pruefe('V~: Phasenfolge - verschwindet, sobald der Hauptschalter geöffnet wird (keine Spannung mehr)', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // schwarz L1
    await page.locator('#schaltkasten svg circle[data-netz="N25"]').first().click(); // blau L2
    await page.locator('#schaltkasten svg circle[data-netz="N26"]').first().click(); // grün L3
    erwarteGleich(phasenfolgeText(await displayTexte(page)), '1.2.3.', 'Spannung liegt an');

    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y') }))
    );
    const hauptschalterBox = boxen.reduce((a, b) => (parseFloat(a.y) > parseFloat(b.y) ? a : b));
    const hauptschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${hauptschalterBox.x}"][y="${hauptschalterBox.y}"]`) });
    await hauptschalter.click();

    erwarteGleich(phasenfolgeText(await displayTexte(page)), null, 'Hauptschalter offen -> keine Spannung mehr -> keine Anzeige');
    await page.close();
  });

  // testcase_05: Phasenfolge über die Drehstromsteckdose selbst gemessen
  // (nicht direkt am Schaltkasten) - Grün auf L1, Schwarz auf L2, Blau auf
  // L3 (Kontakt-Reihenfolge an der Drehstromsteckdose: 0=PE, 1=L1, 2=L2,
  // 3=L3, 4=N, siehe zeichneDrehstromsteckdose() in view/steckdosen.js).
  // Alle drei Sonden auf unterschiedlichen Außenleitern -> Uln/Ulpe/Unpe
  // alle 400V. Schwarz=L2/Blau=L3/Grün=L1 ist eine der drei zyklischen
  // Rotationen -> Phasenfolge "1.2.3.".
  await pruefe('V~: testcase_05 - Phasenfolge an der Drehstromsteckdose (Grün=L1, Schwarz=L2, Blau=L3) zeigt 400V überall und "1.2.3."', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(2).click(); // schwarz: L2
    await kreise.nth(3).click(); // blau: L3
    await kreise.nth(1).click(); // grün: L1

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '400V').length, 3, 'alle drei Paare zwischen unterschiedlichen Außenleitern -> 400V');
    erwarteGleich(phasenfolgeText(texte), '1.2.3.', 'Schwarz=L2/Blau=L3/Grün=L1 ist eine zyklische Rotation');
    await page.close();
  });

  // testcase_05: dieselbe Drehstromsteckdose, andere zyklische Rotation -
  // Blau auf L1, Grün auf L2, Schwarz auf L3 (Schwarz=L3/Blau=L1/Grün=L2 ist
  // die dritte der drei zyklischen Rotationen aus der ursprünglichen
  // User-Spezifikation, siehe KONZEPT.md "V~" -> "Phasenfolge-Anzeige").
  await pruefe('V~: testcase_05 - Phasenfolge an der Drehstromsteckdose (Blau=L1, Grün=L2, Schwarz=L3) zeigt 400V überall und "1.2.3."', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(3).click(); // schwarz: L3
    await kreise.nth(1).click(); // blau: L1
    await kreise.nth(2).click(); // grün: L2

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '400V').length, 3, 'alle drei Paare zwischen unterschiedlichen Außenleitern -> 400V');
    erwarteGleich(phasenfolgeText(texte), '1.2.3.', 'Schwarz=L3/Blau=L1/Grün=L2 ist eine zyklische Rotation');
    await page.close();
  });

  // testcase_05: dieselbe Drehstromsteckdose, jetzt eine UMGEKEHRTE Zuordnung
  // - Grün auf L1, Blau auf L2, Schwarz auf L3 (Schwarz=L3/Blau=L2/Grün=L1
  // ist eine der drei "3.2.1."-Fälle aus der ursprünglichen
  // User-Spezifikation, siehe KONZEPT.md "V~" -> "Phasenfolge-Anzeige").
  await pruefe('V~: testcase_05 - Phasenfolge an der Drehstromsteckdose (Grün=L1, Blau=L2, Schwarz=L3) zeigt 400V überall und "3.2.1."', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(3).click(); // schwarz: L3
    await kreise.nth(2).click(); // blau: L2
    await kreise.nth(1).click(); // grün: L1

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '400V').length, 3, 'alle drei Paare zwischen unterschiedlichen Außenleitern -> 400V');
    erwarteGleich(phasenfolgeText(texte), '3.2.1.', 'Schwarz=L3/Blau=L2/Grün=L1 ist eine umgekehrte Zuordnung');
    await page.close();
  });

  // testcase_05: dieselbe Drehstromsteckdose-Platzierung (Grün=L1/Schwarz=L2/
  // Blau=L3, "1.2.3."), diesmal aber den Hauptschalter geöffnet - alle drei
  // Netze sind dann nicht mehr mit der Einspeisung verbunden
  // (istSpannungFuehrend() liefert false), Uln/Ulpe/Unpe fallen auf 0V UND
  // die Phasenfolge-Anzeige verschwindet (keine der beiden Bedingungen in
  // berechnePhasenfolge() ist mehr erfüllt).
  await pruefe('V~: testcase_05 - Hauptschalter offen an der Drehstromsteckdose zeigt überall 0V und keine Phasenfolge-Anzeige', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(2).click(); // schwarz: L2
    await kreise.nth(3).click(); // blau: L3
    await kreise.nth(1).click(); // grün: L1
    erwarteGleich(phasenfolgeText(await displayTexte(page)), '1.2.3.', 'Spannung liegt an, Hauptschalter noch geschlossen');

    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y') }))
    );
    const hauptschalterBox = boxen.reduce((a, b) => (parseFloat(a.y) > parseFloat(b.y) ? a : b));
    const hauptschalter = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${hauptschalterBox.x}"][y="${hauptschalterBox.y}"]`) });
    await hauptschalter.click();

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '0V').length, 3, 'Hauptschalter offen -> keine Verbindung zur Einspeisung mehr -> alle drei Paare 0V');
    erwarteGleich(phasenfolgeText(texte), null, 'Hauptschalter offen -> keine Phasenfolge-Anzeige');
    await page.close();
  });

  // testcase_05: geräteübergreifend über DREI verschiedene Endstellen der
  // AFDD-Gruppe G2 UND der Drehstromsteckdose SK1 hinweg (siehe KONZEPT.md
  // "AFDD") - Grün auf PE der Drehstromsteckdose (Index 0, erster grauer
  // Kontakt im Steckdosen-Grid), Schwarz auf SK2s L1 (mittlere Steckdose,
  // linker Kontakt, Index 5), Blau auf SK3s N (rechte Steckdose, rechter
  // Kontakt, Index 8). SK2/SK3 hängen an verschiedenen AFDD-LS (LS2/LS3),
  // teilen sich aber denselben N-Pfad zur Einspeisung über RCD2 - V~ prüft
  // keine Rollen (freie Sondenplatzierung), L(schwarz)+N(blau) auf
  // unterschiedlichen Stromkreisen liefert trotzdem Uln=230V, L+PE ebenso
  // Ulpe=230V, N+PE (beide auf demselben Potential im gesunden Stromkreis)
  // Unpe=0V.
  await pruefe('V~: testcase_05 - Grün auf PE der Drehstromsteckdose, Schwarz auf SK2 (L1), Blau auf SK3 (N) zeigt Uln=230V/Ulpe=230V/Unpe=0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_05');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // schwarz: SK2 (mittlere Steckdose), linker Kontakt = L1
    await kreise.nth(8).click(); // blau: SK3 (rechte Steckdose), rechter Kontakt = N
    await kreise.nth(0).click(); // grün: Drehstromsteckdose PE

    const texte = await displayTexte(page);
    erwarte(texte, 'Uln:', 'Uln-Label vorhanden');
    erwarteGleich(texte.filter((t) => t === '230V').length, 2, 'Uln und Ulpe zeigen 230V');
    erwarteGleich(texte.filter((t) => t === '0V').length, 1, 'Unpe bleibt 0V (N und PE auf demselben Potential)');
    await page.close();
  });

  // testcase_06: dieselbe Prüfung wie oben, diesmal über die Kontakte der
  // 5-poligen Anschlussdose statt direkt am Schaltkasten - Schwarz auf
  // braun=L1 (oben rechts), Blau auf grau=L3 (unten links), Grün auf
  // schwarz=L2 (unten rechts). V~ prüft keine Rollen (freie
  // Sondenplatzierung), alle drei Sonden sitzen auf unterschiedlichen
  // Außenleitern -> alle drei Paare zeigen 400V.
  await pruefe('V~: testcase_06 - alle drei Sonden an der 5-poligen Anschlussdose auf unterschiedlichen Außenleitern zeigen überall 400V', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(2).click(); // L1 (braun, oben rechts) -> schwarz
    await kreise.nth(3).click(); // L3 (grau, unten links) -> blau
    await kreise.nth(4).click(); // L2 (schwarz, unten rechts) -> grün

    const texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '400V').length, 3, 'alle drei Paare zwischen unterschiedlichen Außenleitern -> 400V');
    await page.close();
  });

  // testcase_06 Gruppe G2: dieselben Steckdose-Kontakte wie bei den FI/RCD-,
  // ZI- und ZS-Tests oben (Schwarz auf L links, Blau auf N rechts, Grün auf
  // PE) - diesmal auf V~, mit ECHTEN Rollen (nicht wie beim 400V-Test oben
  // drei verschiedene Außenleiter). Uln (L-N) und Ulpe (L-PE) zeigen die
  // reale Netzspannung 230V, Unpe (N-PE) zeigt 0V (N und PE liegen im
  // gesunden Stromkreis auf demselben Potential). Öffnet man LS2 (den
  // ersten LS nach RCD2, versorgt SK2/die Steckdose selbst), fällt die
  // Spannung komplett weg - alle drei zeigen 0V.
  await pruefe('V~: testcase_06 - Steckdose SK2 zeigt Uln=230V/Ulpe=230V/Unpe=0V, nach Öffnen von LS2 alle drei 0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(5).click(); // Steckdose links (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    let texte = await displayTexte(page);
    const ulnIndex = texte.indexOf('Uln:');
    const ulpeIndex = texte.indexOf('Ulpe:');
    const unpeIndex = texte.indexOf('Unpe:');
    erwarteGleich(texte[ulnIndex + 1], '230V', 'Uln (L-N) zeigt die reale Netzspannung');
    erwarteGleich(texte[ulpeIndex + 1], '230V', 'Ulpe (L-PE) zeigt ebenfalls 230V');
    erwarteGleich(texte[unpeIndex + 1], '0V', 'Unpe (N-PE) zeigt 0V, gleiches Potential');

    // LS2 (die zweite der drei 24px-Boxen: RCD2, LS2, LS3) öffnen.
    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width') }))
    );
    const gruppe2Boxen = boxen.filter((b) => b.w === '24' && b.y === '322').sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
    const ls2Box = gruppe2Boxen[1];
    const ls2 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${ls2Box.x}"][y="${ls2Box.y}"]`) });
    await ls2.click();

    texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '0V').length, 3, 'alle drei Werte fallen auf 0V, sobald LS2 offen ist');
    await page.close();
  });

  // testcase_06 Gruppe G2: geräteübergreifende V~-Messung - Blau/Grün bleiben
  // auf der Steckdose SK2 (N rechts/PE), Schwarz wandert auf den SCHWARZEN
  // Kontakt der 3-poligen Anschlussdose SK3 (= L, siehe KLEMMEN-Array in
  // view/steckdosen.js: N/blau bei -90°, L/schwarz bei 30°, PE/grün bei
  // 150°) - zeigt, dass V~ auch über zwei verschiedene Geräte hinweg
  // funktioniert, solange die Funktionen (L/N/PE) stimmen. Beide Stromkreise
  // teilen sich denselben N-Pfad (RCD2.o2), Uln/Ulpe bleiben deshalb bei
  // 230V. "Zweiter LS nach dem RCD" = LS3 (RCD2 -> LS2 -> LS3) - versorgt
  // SK3, dessen L-Kontakt jetzt die schwarze Sonde trägt.
  await pruefe('V~: testcase_06 - Schwarz auf der 3-poligen Anschlussdose SK3 (L), Blau/Grün auf der Steckdose SK2 (N/PE) zeigt Uln=230V/Ulpe=230V/Unpe=0V, nach Öffnen von LS3 alle drei 0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_06');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const kreise = page.locator('#steckdosen circle[fill="#666666"]');
    await kreise.nth(8).click(); // SK3 schwarzer Kontakt (L) -> schwarz
    await kreise.nth(6).click(); // Steckdose rechts (N) -> blau
    await page.locator('#steckdosen rect[fill="#666666"]').first().click(); // Steckdose PE -> grün

    let texte = await displayTexte(page);
    const ulnIndex = texte.indexOf('Uln:');
    const ulpeIndex = texte.indexOf('Ulpe:');
    const unpeIndex = texte.indexOf('Unpe:');
    erwarteGleich(texte[ulnIndex + 1], '230V', 'Uln (L-N) zeigt die reale Netzspannung, geräteübergreifend');
    erwarteGleich(texte[ulpeIndex + 1], '230V', 'Ulpe (L-PE) zeigt ebenfalls 230V');
    erwarteGleich(texte[unpeIndex + 1], '0V', 'Unpe (N-PE) zeigt 0V, gleiches Potential');

    // LS3 (die dritte der drei 24px-Boxen: RCD2, LS2, LS3) öffnen.
    const boxen = await page.evaluate(() =>
      [...document.querySelectorAll('#schaltkasten svg rect[height="36"][fill="#f5f5f5"]')].map((r) => ({ x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width') }))
    );
    const gruppe2Boxen = boxen.filter((b) => b.w === '24' && b.y === '322').sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
    const ls3Box = gruppe2Boxen[2];
    const ls3 = page.locator('#schaltkasten svg g[style*="cursor: pointer"]').filter({ has: page.locator(`rect[x="${ls3Box.x}"][y="${ls3Box.y}"]`) });
    await ls3.click();

    texte = await displayTexte(page);
    erwarteGleich(texte.filter((t) => t === '0V').length, 3, 'alle drei Werte fallen auf 0V, sobald LS3 offen ist');
    await page.close();
  });

  // testcase_04: dieselben Reihenklemme_L_SK1 (grau, N24) und
  // Reihenklemme_N_SK1/SK3 (blau, N28/N35) wie oben, diesmal L-N-Paare -
  // zeigt, dass Uln/Ulpe/Unpe rein von den PLATZIERTEN FARBEN abhängen
  // (Schwarz-Blau/Schwarz-Grün/Blau-Grün), nicht davon, welches Netz
  // "eigentlich" dahintersteckt. Farbzuweisung folgt der Klickreihenfolge
  // je Schraube (siehe naechsteMessspitzenFarbe() in app.js): 1./2./3.
  // Klick auf eine NEUE Schraube vergibt Schwarz/Blau/Grün; ein erneuter
  // Klick auf dieselbe Schraube zyklisiert ihre Farbe weiter (bereits
  // belegte Farben werden dabei übersprungen).
  await pruefe('V~: testcase_04 - Schwarz auf SK1-grau, Blau auf SK1-blau -> Uln=230V, sonst 0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    await page.locator('#schaltkasten svg circle[data-netz="N24"]').first().click(); // 1. Klick -> schwarz, SK1-grau (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N28"]').first().click(); // 2. Klick -> blau, SK1-blau (N)

    const texte = await displayTexte(page);
    erwarte(texte, '230V', 'Uln: L1(schwarz)-N(blau) ist ein L-N-Paar');
    erwarteGleich(texte.filter((t) => t === '230V').length, 1, 'nur Uln zeigt einen Wert');
    erwarteGleich(texte.filter((t) => t === '0V').length, 2, 'Ulpe/Unpe bleiben 0V ohne grüne Sonde');
    await page.close();
  });

  await pruefe('V~: testcase_04 - Grün auf SK1-grau, Schwarz auf SK1-blau -> Ulpe=230V, sonst 0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const grau = page.locator('#schaltkasten svg circle[data-netz="N24"]').first();
    await grau.click(); await grau.click(); await grau.click(); // schwarz -> blau -> grün, SK1-grau (L1)
    await page.locator('#schaltkasten svg circle[data-netz="N28"]').first().click(); // 1. Klick auf dieser Schraube -> schwarz (blau/grün schon belegt), SK1-blau (N)

    const texte = await displayTexte(page);
    erwarte(texte, '230V', 'Ulpe: N(schwarz)-L1(grün) ist ein L-N-Paar');
    erwarteGleich(texte.filter((t) => t === '230V').length, 1, 'nur Ulpe zeigt einen Wert');
    erwarteGleich(texte.filter((t) => t === '0V').length, 2, 'Uln/Unpe bleiben 0V ohne blaue Sonde');
    await page.close();
  });

  await pruefe('V~: testcase_04 - Blau auf SK1-grau, Grün auf SK3-blau (letzte blaue Klemme) -> Unpe=230V, sonst 0V', async () => {
    const page = await neueSeiteMitTestcase('testcase_04');
    for (let i = 0; i < 5; i++) await drehknopfKlick(page); // -> V~

    const grau = page.locator('#schaltkasten svg circle[data-netz="N24"]').first();
    await grau.click(); await grau.click(); // schwarz -> blau, SK1-grau (L1)
    const letzteBlau = page.locator('#schaltkasten svg circle[data-netz="N35"]').first(); // SK3-blau (N), letzte der drei blauen Reihenklemmen
    await letzteBlau.click(); await letzteBlau.click(); // schwarz -> (blau belegt, übersprungen) -> grün

    const texte = await displayTexte(page);
    erwarte(texte, '230V', 'Unpe: L1(blau)-N(grün) ist ein L-N-Paar');
    erwarteGleich(texte.filter((t) => t === '230V').length, 1, 'nur Unpe zeigt einen Wert');
    erwarteGleich(texte.filter((t) => t === '0V').length, 2, 'Uln/Ulpe bleiben 0V ohne schwarze Sonde');
    await page.close();
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
