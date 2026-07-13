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

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main();
