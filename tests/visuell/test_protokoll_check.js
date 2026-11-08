// Tests für den Prüfprotokoll-Check (sim-0bn): controller/protokoll_check.js,
// model/protokoll_soll.js, Check-App im Handy. Aufruf: node
// tests/visuell/test_protokoll_check.js
//
// Vorgehen: Das Protokoll von testcase_05 wird vollständig richtig
// ausgefüllt (Messtabelle über die protokollEintragen-Schritte des
// Fahrplans, Rest nach den Regeln), dann gezielt verfälscht. Erwartet wird,
// dass genau die verfälschten Felder rot werden.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const TESTCASE = 'testcase_05';

function starteServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPfad = decodeURIComponent(req.url.split('?')[0]);
      const dateiPfad = path.join(PROJEKT_ROOT, urlPfad === '/' ? '/index.html' : urlPfad);
      fs.readFile(dateiPfad, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
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

function erwarteGleich(ist, soll, kontext) {
  if (ist !== soll) throw new Error(`${kontext}: erwarte ${JSON.stringify(soll)}, gefunden ${JSON.stringify(ist)}`);
}

// Einträge aus docs/referenz/Pflichtfelder.md: [{ abschnitt, name }].
function pflichtfelderAusMarkdown() {
  const text = fs.readFileSync(path.join(PROJEKT_ROOT, 'docs', 'referenz', 'Pflichtfelder.md'), 'utf8');
  const eintraege = [];
  let abschnitt = null;
  for (const zeile of text.split('\n')) {
    const titel = zeile.match(/^##\s+(.*)$/);
    if (titel) { abschnitt = titel[1].trim(); continue; }
    const punkt = zeile.match(/^[*+]\s+(.*?)(?:\s+-\s*.*)?$/);
    if (punkt && abschnitt) eintraege.push({ abschnitt, name: punkt[1].trim() });
  }
  return eintraege;
}

// Füllt das Protokoll vollständig richtig aus (im Browser).
async function fuelleRichtig(page) {
  await page.evaluate(async () => {
    const { PROTOKOLL_REGELN } = await import('/model/protokoll_soll.js');
    const { fuehreSchrittAus } = await import('/controller/fahrplan_ausfuehrung.js');
    const fahrplan = await (await fetch(new URLSearchParams(location.search).get('anlage').replace('anlage.json', 'fahrplan.json'))).json();
    for (const a of fahrplan.abschnitte) for (const s of a.schritte) {
      if (s.funktion === 'protokollEintragen') fuehreSchrittAus(s);
    }

    const heute = new Date().toLocaleDateString('de-DE');
    const abschnitt = (titel) => [...document.querySelectorAll('#protokoll .pf-abschnitt')]
      .find((x) => x.querySelector('.pf-abschnitt-titel')?.textContent === titel);
    const zeile = (ab, label) => [...ab.querySelectorAll('.pf-zeile')].find((z) => z.querySelector('.pf-label')?.textContent === label)
      ?? [...ab.querySelectorAll('.pf-zeile')].find((z) => z.textContent.includes(label));
    const tzeile = (ab, label) => [...ab.querySelectorAll('table.pf-tabelle tr')].find((z) => z.cells[0]?.textContent === label);
    const setze = (f, w) => { f.value = w; };
    for (const r of PROTOKOLL_REGELN) {
      const ab = abschnitt(r.abschnitt);
      if (r.art === 'kreuz' || r.art === 'angekreuzt') { tzeile(ab, r.label).querySelectorAll('.pf-cb')[0].click(); continue; }
      if (r.art === 'nio') { tzeile(ab, r.label).querySelectorAll('.pf-cb')[1].click(); continue; }
      if (r.art === 'keinKreuz') continue;
      if (r.art === 'text') { setze(ab.querySelector('input.pf-feld'), 'Keine'); continue; }
      if (r.art === 'messgeraet') {
        const z = ab.querySelectorAll('table.pf-tabelle tr')[1];
        r.werte.forEach((w, i) => setze(z.cells[i + 1].querySelector('input'), w));
        continue;
      }
      const z = zeile(ab, r.label);
      const felder = [...z.querySelectorAll('input.pf-feld, textarea')];
      if (r.art === 'auswahl') {
        [...z.querySelectorAll('.pf-cboption')].find((o) => o.textContent.replace(/[☐☒]/g, '').trim() === r.wert).querySelector('.pf-cb').click();
      } else if (r.art === 'einsAus') {
        [...z.querySelectorAll('.pf-cboption')].filter((o) => o.querySelector('.pf-cb'))[0].querySelector('.pf-cb').click();
      } else if (r.art === 'option') {
        z.querySelector('.pf-cboption .pf-cb').click();
      } else if (r.art === 'fest' && r.alternativen) {
        setze(felder[0], r.alternativen[0]);
      } else if (r.art === 'fest') {
        (r.werte ?? [r.wert]).forEach((w, i) => setze(felder[i], w));
      } else if (r.art === 'zahl') {
        felder.forEach((f) => setze(f, '1234'));
      } else if (r.art === 'ortDatumUnterschrift') {
        felder.forEach((f) => setze(f, `${r.ort}, ${heute}, Max Mustermann`));
      } else if (r.art === 'datum') {
        felder.forEach((f) => setze(f, heute));
      } else if (r.art === 'pflicht') {
        felder.forEach((f) => setze(f, 'Max Mustermann'));
      }
    }
  });
}

// Check über die Handy-App auslösen: Icon -> Prüfen. Liefert Anzahl roter
// Felder (DOM) und den Ergebnistext im Handy.
async function pruefeUeberHandy(page) {
  await page.evaluate(() => {
    const gruen = [...document.querySelectorAll('#handy svg g[style*="cursor"]')]
      .find((g) => g.querySelector('rect[fill="#1e9e3e"]'));
    gruen.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    const knopf = [...document.querySelectorAll('#handy svg g[style*="cursor"]')]
      .find((g) => g.querySelector('rect[fill="#1e9e3e"]'));
    knopf.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(50);
  return page.evaluate(() => ({
    rot: document.querySelectorAll('#protokoll .pf-fehler').length,
    texte: [...document.querySelectorAll('#handy svg text')].map((t) => t.textContent)
  }));
}

// Zellen-Input der Messtabelle (Zeile/Spalte wie in protokollEintragen).
const zelle = (zeile, spalte) => `document.querySelector('#protokoll .pf-scroll table').rows[${zeile}].cells[${spalte}].querySelector('input')`;

async function main() {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();

  async function neueSeite() {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/${TESTCASE}/anlage.json`);
    await page.waitForSelector('#protokoll .pf-tabelle');
    await page.waitForSelector('#handy svg');
    return page;
  }

  // --- Regeln decken Pflichtfelder.md ab ---
  // Regeln im Browser laden (ES-Modul), nicht in Node.
  const regelNamen = await (async () => {
    const page = await neueSeite();
    const namen = await page.evaluate(async () => {
      const { PROTOKOLL_REGELN } = await import('/model/protokoll_soll.js');
      return PROTOKOLL_REGELN.flatMap((r) => [r.label, ...[].concat(r.quelle ?? [])]);
    });
    await page.close();
    return namen;
  })();
  await pruefe('Jeder Eintrag aus Pflichtfelder.md hat eine Regel', async () => {
    const namen = new Set(regelNamen);
    // "Messen: für jeden Stromkreis" prüft die Messtabelle (Fahrplan),
    // "Blatt" heißt in der Datei "Blatt - 1 - von - 1".
    const fehlend = pflichtfelderAusMarkdown()
      .filter((e) => e.abschnitt !== 'Messen')
      .filter((e) => !namen.has(e.name));
    if (fehlend.length > 0) throw new Error(`ohne Regel: ${fehlend.map((e) => `${e.abschnitt}/${e.name}`).join(', ')}`);
  });

  // --- Hilfsfunktionen ---
  {
    const page = await neueSeite();
    const ergebnis = await page.evaluate(async () => {
      const m = await import('/controller/protokoll_check.js');
      const heute = new Date(2026, 10, 7);
      return {
        komma: m.gleicherWert('0.67', '0,67'),
        einheit: m.gleicherWert('16 A', '16'),
        anders: m.gleicherWert('0,68', '0,67'),
        groesser: m.gleicherWert('>999', '>999'),
        ohneGroesser: m.gleicherWert('999', '>999'),
        leer: m.gleicherWert('', '0,00'),
        text: m.gleicherWert('40 / a', '40/A'),
        // Codex-Review zu sim-0bn: Zahl-Soll nur numerisch vergleichen.
        ungueltigeZahl: ['<999', '=999', '999,0,0', 'abc', '40,0'].map((ist) => m.gleicherWert(ist, ist === '40,0' ? '400' : '>999')),
        gleicheZahl: [m.gleicherWert('400,0', '400'), m.gleicherWert('400.0', '400'), m.gleicherWert('400 V', '400')],
        strasse: m.normalisiereText('ETZ Krefelder Straße 12, 70376 Stuttgart') === m.normalisiereText('ETZ Krefelderstr. 12 70376 Stuttgart'),
        datum: [m.istHeute('7.11.2026', heute), m.istHeute('07.11.26', heute), m.istHeute('8.11.2026', heute)],
        zuordnung: m.ordneZu([[1, 3, 0], [3, 0, 0]]),
        // Codex-Review zu sim-5tx: Datum mit zu langem Jahr, Ziffernrest als
        // "Unterschrift", gültige Formate mit echter Unterschrift.
        ortDatumUnterschrift: [
          '70376 Stuttgart, 07.11.20260',
          '70376 Stuttgart, 07.11.2026',
          '70376 Stuttgart, 07.11.2026 0',
          '70376 Stuttgart, 7.11.2026, Max Mustermann',
          'Max Mustermann 07.11.26 70376 Stuttgart',
          '70376 Stuttgart, 17.11.2026 Max'
        ].map((t) => m.enthaeltOrtDatumUnterschrift(t, '70376 Stuttgart', heute))
      };
    });
    await pruefe('gleicherWert: Komma/Punkt gleich, Einheit ignoriert, Zahlen streng', async () => {
      erwarteGleich([ergebnis.komma, ergebnis.einheit, ergebnis.anders].join(), 'true,true,false', 'Zahlen');
      erwarteGleich([ergebnis.groesser, ergebnis.ohneGroesser, ergebnis.leer, ergebnis.text].join(), 'true,false,false,true', '>999, leer, Text');
    });
    await pruefe('gleicherWert: bei Zahl-Soll keine Textrettung (<999, =999, 40,0 statt 400)', async () => {
      erwarteGleich(ergebnis.ungueltigeZahl.join(), 'false,false,false,false,false', 'ungültige Zahlen');
      erwarteGleich(ergebnis.gleicheZahl.join(), 'true,true,true', '400,0 / 400.0 / 400 V');
    });
    await pruefe('normalisiereText: Straße = Str., Satzzeichen egal', async () => erwarteGleich(ergebnis.strasse, true, 'Adresse'));
    await pruefe('istHeute: T.M.JJJJ und TT.MM.JJ', async () => erwarteGleich(ergebnis.datum.join(), 'true,true,false', 'Datum'));
    await pruefe('enthaeltOrtDatumUnterschrift: zu langes Jahr und Ziffernrest sind keine Unterschrift', async () => {
      erwarteGleich(ergebnis.ortDatumUnterschrift.join(), 'false,false,false,true,true,false', 'Fälle');
    });
    await pruefe('ordneZu: beste Gesamtzuordnung statt erste passende Zeile', async () => erwarteGleich(ergebnis.zuordnung.join(), '1,0', 'Zuordnung'));
    await page.close();
  }

  // --- Check im Protokoll ---
  async function fall(name, verfaelschen, pruefen) {
    await pruefe(name, async () => {
      const page = await neueSeite();
      await fuelleRichtig(page);
      if (verfaelschen) await page.evaluate(verfaelschen);
      const ergebnis = await pruefeUeberHandy(page);
      await pruefen(ergebnis, page);
      await page.close();
    });
  }

  await fall('Richtig ausgefüllt: nichts rot, Handy zeigt "Alles richtig"', null, async (e) => {
    erwarteGleich(e.rot, 0, 'rote Felder');
    if (!e.texte.includes('Alles richtig')) throw new Error(`Handy-Text: ${JSON.stringify(e.texte)}`);
  });

  await fall('Falscher Messwert: genau diese Zelle rot', new Function(`${zelle(3, 12)}.value = '0,99';`), async (e, page) => {
    erwarteGleich(e.rot, 1, 'rote Felder');
    erwarteGleich(await page.evaluate(new Function(`return ${zelle(3, 12)}.classList.contains('pf-fehler');`)), true, 'Zi-Zelle rot');
    if (!e.texte.includes('1 Feld rot')) throw new Error(`Handy-Text: ${JSON.stringify(e.texte)}`);
  });

  await fall('Punkt statt Komma: nicht rot', new Function(`${zelle(3, 12)}.value = ${zelle(3, 12)}.value.replace(',', '.');`), async (e) => {
    erwarteGleich(e.rot, 0, 'rote Felder');
  });

  await fall('Zeilen vertauscht: nichts rot (Zuordnung über die Werte)', () => {
    const tabelle = document.querySelector('#protokoll .pf-scroll table');
    const a = [...tabelle.rows[3].cells].map((c) => c.querySelector('input'));
    const b = [...tabelle.rows[5].cells].map((c) => c.querySelector('input'));
    a.forEach((x, i) => { const t = x.value; x.value = b[i].value; b[i].value = t; });
  }, async (e) => erwarteGleich(e.rot, 0, 'rote Felder'));

  await fall('Riso <999 statt >999: rot', new Function(`${zelle(3, 6)}.value = '<999';`), async (e, page) => {
    erwarteGleich(e.rot, 1, 'rote Felder');
    erwarteGleich(await page.evaluate(new Function(`return ${zelle(3, 6)}.classList.contains('pf-fehler');`)), true, 'Riso-Zelle rot');
  });

  await fall('Netz 40,0 statt 400: rot, 400,0 nicht', () => {
    const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Netz');
    const [u1, u2] = z.querySelectorAll('input');
    u1.value = '40,0';
    u2.value = '230,0';
  }, async (e, page) => {
    erwarteGleich(e.rot, 1, 'rote Felder');
    const markiert = await page.evaluate(() => {
      const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Netz');
      return [...z.querySelectorAll('input')].map((i) => i.classList.contains('pf-fehler')).join();
    });
    erwarteGleich(markiert, 'true,false', '40,0 rot, 230,0 nicht');
  });

  await fall('Leeres Messfeld mit Sollwert: rot', new Function(`${zelle(4, 6)}.value = '';`), async (e) => {
    erwarteGleich(e.rot, 1, 'rote Felder');
  });

  await fall('Ausgefüllte Zeile ohne Stromkreis: rot', new Function(`${zelle(9, 5)}.value = '0,10';`), async (e) => {
    erwarteGleich(e.rot, 1, 'rote Felder');
  });

  await fall('Prüfer leer: rot', () => {
    const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Prüfer');
    z.querySelector('input').value = '';
  }, async (e) => erwarteGleich(e.rot, 1, 'rote Felder'));

  await fall('Kennzeichnung i.O. statt n.i.O.: beide Kästchen rot', () => {
    const z = [...document.querySelectorAll('#protokoll .pf-tabelle tr')].find((x) => x.cells[0]?.textContent === 'Kennzeichnung N- und PE-Leiter');
    z.querySelectorAll('.pf-cb').forEach((cb) => cb.click());
  }, async (e) => erwarteGleich(e.rot, 2, 'rote Felder'));

  await fall('Plakette Ja und Nein angekreuzt: rot', () => {
    const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Prüf-Plakette angebracht');
    z.querySelectorAll('.pf-cb')[1].click();
  }, async (e) => erwarteGleich(e.rot, 1, 'rote Felder'));

  await fall('Falsche Netzform (TN-S): rot', () => {
    const z = [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Netzform');
    [...z.querySelectorAll('.pf-cboption')].forEach((o) => {
      const text = o.textContent.replace(/[☐☒]/g, '').trim();
      if (text === 'TN-C-S' || text === 'TN-S') o.querySelector('.pf-cb').click();
    });
  }, async (e) => erwarteGleich(e.rot, 1, 'rote Felder'));

  // --- sim-5tx: Findings aus dem Test mit der Check-App ---
  await fall('Kunden-Nr., Auftrag-Nr., Anlage: beliebige Zahl ist richtig', () => {
    const feld = (label) => [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === label);
    feld('Kunden-Nr.').querySelector('input').value = '987';
    feld('Auftrag-Nr.').querySelector('input').value = '42';
    feld('Anlage').querySelector('textarea').value = '7';
  }, async (e) => erwarteGleich(e.rot, 0, 'rote Felder'));

  await fall('Kunden-Nr. ohne Zahl: rot', () => {
    [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Kunden-Nr.').querySelector('input').value = 'abc';
  }, async (e) => erwarteGleich(e.rot, 1, 'rote Felder'));

  await fall('Adresse mit Zeilenumbruch und anderer Schreibweise: nicht rot', () => {
    [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Auftraggeber')
      .querySelector('textarea').value = 'etz\nKrefelder Straße 12\n70376  stuttgart';
  }, async (e) => erwarteGleich(e.rot, 0, 'rote Felder'));

  await fall('Netzbetreiber "Stuttgart Netze" richtig, "Stadtwerke Stuttgart" rot', () => {
    [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Netzbetreiber')
      .querySelector('input').value = 'Stadtwerke Stuttgart';
  }, async (e, page) => {
    erwarteGleich(e.rot, 1, 'rote Felder bei Stadtwerke Stuttgart');
    await page.evaluate(() => {
      [...document.querySelectorAll('#protokoll .pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Netzbetreiber')
        .querySelector('input').value = 'stuttgart netze';
    });
    erwarteGleich((await pruefeUeberHandy(page)).rot, 0, 'rote Felder bei stuttgart netze');
  });

  await fall('Gebäudesystemtechnik angekreuzt: rot (keine eingebaut)', () => {
    const z = [...document.querySelectorAll('#protokoll .pf-tabelle tr')].filter((x) => x.cells[0]?.textContent === 'Gebäudesystemtechnik');
    z[0].querySelectorAll('.pf-cb')[0].click(); // Besichtigen i.O.
    z[1].querySelectorAll('.pf-cb')[1].click(); // Erproben n.i.O.
  }, async (e) => erwarteGleich(e.rot, 4, 'rote Kästchen (je Zeile beide)'));

  await fall('Seite 2 Mängel leer: rot', () => {
    const ab = [...document.querySelectorAll('#protokoll .pf-abschnitt')].find((x) => x.querySelector('.pf-abschnitt-titel')?.textContent === 'Mängel');
    ab.querySelectorAll('input').forEach((i) => { i.value = ''; });
  }, async (e) => erwarteGleich(e.rot, 11, 'rote Linien (alle 11 der leeren Mängel-Tabelle)'));

  await fall('Zustandsbericht auf Seite 1 nicht angekreuzt: rot', () => {
    const ab = [...document.querySelectorAll('#protokoll .pf-abschnitt')].find((x) => x.querySelector('.pf-abschnitt-titel')?.textContent === 'Abschluss – Auftraggeber');
    [...ab.querySelectorAll('.pf-zeile')].find((z) => z.textContent.includes('Zustandsbericht erhalten')).querySelector('.pf-cb').click();
  }, async (e) => erwarteGleich(e.rot, 1, 'rote Felder'));

  await fall('Seite 2 Prüfer ohne Stuttgart: rot; Auftraggeber-Unterschrift wird nicht geprüft', () => {
    const ab = [...document.querySelectorAll('#protokoll .pf-abschnitt')].find((x) => x.querySelector('.pf-abschnitt-titel')?.textContent === 'Abschluss');
    const z = [...ab.querySelectorAll('.pf-zeile')].find((x) => x.querySelector('.pf-label')?.textContent === 'Ort / Datum / Unterschrift (Prüfer)');
    z.querySelector('input').value = `${new Date().toLocaleDateString('de-DE')} Max Mustermann`;
  }, async (e) => erwarteGleich(e.rot, 1, 'rote Felder'));

  await fall('Erneutes Prüfen nach Korrektur: Markierung verschwindet', new Function(`${zelle(3, 12)}.value = '0,99';`), async (e, page) => {
    erwarteGleich(e.rot, 1, 'rote Felder vor Korrektur');
    await page.evaluate(new Function(`${zelle(3, 12)}.value = '0,67';`));
    const nachher = await pruefeUeberHandy(page);
    erwarteGleich(nachher.rot, 0, 'rote Felder nach Korrektur');
  });

  await browser.close();
  server.close();
  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
