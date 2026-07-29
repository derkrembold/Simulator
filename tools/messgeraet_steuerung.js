// Entwickler-Skill (User-Vorgabe, 2026-07-29): formalisiert das
// throwaway-Playwright-Interaktionsmuster dieser Session (Server/Browser
// starten, Drehknopf drehen, Werte einstellen, Messspitzen setzen,
// Bauteil-Hebel/Schrauben bedienen, TEST drücken, Display auslesen) zu
// wiederverwendbaren Funktionen - ersetzt das manuelle Neuschreiben dieses
// Boilerplates vor jedem neuen throwaway-Verifikationsskript.
//
// Datengrundlage: docs/ARCHITEKTUR.md "Entwickler-Skills" ->
// "Messgerät: Settable/Readable-Referenz" (dort auch das Warum der
// Design-Entscheidungen - diese Datei ist die Umsetzung, keine zweite
// Quelle der Wahrheit für die Werte selbst, siehe MESSGERAET_MODI unten,
// direkt aus controller/app.js übernommen).
//
// Nutzung (Beispiel):
//   const { starteTestUmgebung } = require('./messgeraet_steuerung.js');
//   const ctx = await starteTestUmgebung('testcase_04');
//   await drehknopfAufModus(ctx, 'RISO');
//   await stelleEin(ctx, 'grenzwiderstand', 30);
//   await messspitzeSetzen(ctx, { bauteil: 'RCD1', netz: 'N10' });
//   await messspitzeSetzen(ctx, { bauteil: 'RCD1', netz: 'N11' });
//   await messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' });
//   await testDruecken(ctx);
//   console.log(await leseWert(ctx, 'hauptmesswert'));
//   await ctx.schliessen();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..');
const MIME_TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function starteServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPfad = decodeURIComponent(req.url.split('?')[0]);
      const dateiPfad = path.join(PROJEKT_ROOT, urlPfad === '/' ? '/index.html' : urlPfad);
      fs.readFile(dateiPfad, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found: ' + dateiPfad); return; }
        res.writeHead(200, { 'Content-Type': MIME_TYPEN[path.extname(dateiPfad)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

// --- Baustein 1: App/Testcase starten ---
//
// `testcase` optional - ohne Angabe lädt die Default-Anlage
// (beispiel_eg.json, kein Verbindungsgraph). Liefert einen Kontext, der
// durch alle übrigen Funktionen dieser Datei durchgereicht wird (hält
// `page` sowie den intern mitgeführten Messgerät-Zustand - siehe
// MESSGERAET_ZUSTAND_DEFAULTS unten für den Grund, warum das nötig ist).
async function starteTestUmgebung(testcase) {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const anlageParam = testcase ? `?anlage=tests/visuell/${testcase}/anlage.json` : '';
  await page.goto(`http://localhost:${port}/index.html${anlageParam}`);
  await page.waitForSelector('#schraubendreher svg');
  await page.getByText('ON/OFF', { exact: true }).click();

  return {
    page,
    modus: 'RLOW',
    ansicht: 'standard',
    zone: 0,
    werte: { ...MESSGERAET_ZUSTAND_DEFAULTS },
    async schliessen() {
      await browser.close();
      server.close();
    }
  };
}

// --- Grundbausteine: Anzeige lesen ---

async function displayTexte(ctx) {
  return ctx.page.evaluate(() => [...document.querySelectorAll('#messgeraet svg text')].map((t) => t.textContent));
}

// Ampel-Leuchtstreifen links/rechts im Display-Rahmen (siehe
// view/messgeraet.js zeichneDisplay(), 6px breit, Display-Höhe 190) - in
// der Reihenfolge [links, rechts].
async function ampelFarben(ctx) {
  return ctx.page.evaluate(() =>
    [...document.querySelectorAll('#messgeraet svg rect')]
      .filter((r) => r.getAttribute('width') === '6' && r.getAttribute('height') === '190')
      .map((r) => r.getAttribute('fill'))
  );
}

// Kasten-Indikator (Pfeil/Sanduhr unten links) durchgestrichen? Siehe
// view/messgeraet.js zeichneKastenIndikator() - die Diagonale nutzt als
// einzige <line> stroke-width 1.5.
async function kastenDurchgestrichen(ctx) {
  return ctx.page.evaluate(() =>
    [...document.querySelectorAll('#messgeraet svg line')].some((l) => l.getAttribute('stroke-width') === '1.5')
  );
}

function ersterTextMit(texte, prefix) {
  return texte.find((t) => t.startsWith(prefix)) ?? null;
}

// Für V~ (siehe READABLE unten): Label ("Uln:") und Wert ("230V") sind
// getrennte <text>-Elemente, direkt hintereinander im DOM - der Wert ist
// das Element, das im Array unmittelbar auf das exakte Label folgt.
function nachLabel(texte, label) {
  const index = texte.indexOf(label);
  return index === -1 ? null : texte[index + 1] ?? null;
}

// --- Baustein 5: TEST drücken ---
async function testDruecken(ctx) {
  await ctx.page.getByText('TEST', { exact: true }).click();
}

// --- Baustein 2: Drehknopf ---

const MODUS_REIHENFOLGE = ['RLOW', 'RISO', 'ZI', 'ZS', 'FI/RCD', 'V~'];

async function drehknopfKlickRoh(ctx) {
  await ctx.page.locator('#messgeraet svg circle[fill="#1a1a1a"]').click({ force: true });
  // Jeder Drehknopf-Klick setzt in controller/app.js ALLE Settable-Werte auf
  // ihre Defaults zurück (setzeBearbeitungenZurueck()), unabhängig vom
  // Zielmodus - der eigene Zustand hier muss das exakt spiegeln, sonst
  // laufen stelleEin()s Klick-Deltas (aktueller Index -> Zielindex) aus dem
  // Ruder.
  const i = MODUS_REIHENFOLGE.indexOf(ctx.modus);
  ctx.modus = MODUS_REIHENFOLGE[(i + 1) % MODUS_REIHENFOLGE.length];
  ctx.ansicht = 'standard';
  ctx.zone = 0;
  ctx.werte = { ...MESSGERAET_ZUSTAND_DEFAULTS };
}

// Dreht vorwärts (wie am echten Gerät, kein Zurückdrehen) bis zum
// Zielmodus. Bereits auf dem Zielmodus -> keine Wirkung.
async function drehknopfAufModus(ctx, zielModus) {
  if (!MODUS_REIHENFOLGE.includes(zielModus)) throw new Error(`Unbekannter Modus "${zielModus}"`);
  while (ctx.modus !== zielModus) {
    await drehknopfKlickRoh(ctx);
  }
}

// --- Baustein 6 (Settable-Teil): ◄►/▲/▼ ---

async function seiteKlick(ctx) {
  await ctx.page.getByText('◄►', { exact: true }).click();
}
async function pfeilKlick(ctx, richtung) {
  await ctx.page.getByText(richtung > 0 ? '▲' : '▼', { exact: true }).click();
}

// Feste Werteliste je Settable-Feld (identisch zu den `const`-Arrays in
// controller/app.js - siehe ARCHITEKTUR.md "Messgerät:
// Settable/Readable-Referenz" für die Herkunft).
const RISO_MESSSPANNUNGEN = ['50V', '100V', '250V', '500V', '1000V'];
const ZI_LS_TYPEN = ['B', 'C', 'D', 'K', 'Z', 'L', 'U', 'NV', 'gG'];
const ZI_BEMESSUNGSSTROEME = ['6A', '10A', '13A', '16A', '20A', '25A', '32A', '35A', '40A', '50A', '63A', '80A', '100A', '125A'];
const ZI_ABSCHALTZEITEN = ['35ms', '70ms', '0,1s', '0,2s', '0,4s', '1s', '5s'];
const ZS_STD_LOW = ['Std', 'Low'];
const FIRCD_FEHLERSTROEME = ['10mA', '30mA', '100mA', '300mA', '500mA'];
const FIRCD_TYPEN = ['AC', 'A', 'F', 'B', 'B+'];

// Defaults exakt wie die `let`-Startwerte in controller/app.js - jeder
// Drehknopf-Klick setzt hierauf zurück (siehe drehknopfKlickRoh() oben).
const MESSGERAET_ZUSTAND_DEFAULTS = {
  rlowKalibrierterWiderstand: 0.4,
  risoMessspannung: '500V',
  risoGrenzwiderstand: 50,
  ziLsTyp: 'B', ziBemessungsstrom: '16A', ziAbschaltzeit: '0,4s', ziSpannungsfall: 4.0,
  zsLsTyp: 'B', zsBemessungsstrom: '16A', zsAbschaltzeit: '0,4s', zsStdLow: 'Std',
  fircdFehlerstrom: '30mA', fircdTyp: 'AC'
};

// Pro Modus+Ansicht: `anzahlFelder` (für den ◄►-Modulo, siehe
// baueAnzeigeZustand()s `1 + titelWerte.length + (titelWertRechts?1:0)` in
// controller/app.js), `ansichtWechsel` (Zielansicht bei Titel-Toggle, `null`
// wenn es keine gibt) und `settable` (Feldname -> { zone, key, werte? }).
// `zone` = Position in der ◄►-Reihenfolge (0 ist immer der Titel selbst -
// dort togglet ▲/▼ die Ansicht, kein eigenes Settable-Feld). `key` verweist
// auf den Schlüssel in ctx.werte/MESSGERAET_ZUSTAND_DEFAULTS. `werte` (falls
// vorhanden) = feste Liste für Index-Navigation; fehlt sie, ist es ein
// freier Zahlenwert mit `schritt` (Ganzzahl- oder Dezimalschritte, siehe
// jeweiliges Feld).
const MESSGERAET_MODI = {
  RLOW: {
    standard: {
      anzahlFelder: 2, ansichtWechsel: 'r_low',
      settable: { kalibrierterWiderstand: { zone: 1, key: 'rlowKalibrierterWiderstand', schritt: 0.1 } }
    },
    r_low: {
      anzahlFelder: 2, ansichtWechsel: 'standard',
      settable: { kalibrierterWiderstand: { zone: 1, key: 'rlowKalibrierterWiderstand', schritt: 0.1 } }
    }
  },
  RISO: {
    standard: {
      anzahlFelder: 3, ansichtWechsel: null,
      settable: {
        pruefspannung: { zone: 1, key: 'risoMessspannung', werte: RISO_MESSSPANNUNGEN },
        grenzwiderstand: { zone: 2, key: 'risoGrenzwiderstand', schritt: 10 }
      }
    }
  },
  ZI: {
    standard: {
      anzahlFelder: 4, ansichtWechsel: 'delta_u',
      settable: {
        lsTyp: { zone: 1, key: 'ziLsTyp', werte: ZI_LS_TYPEN },
        bemessungsstrom: { zone: 2, key: 'ziBemessungsstrom', werte: ZI_BEMESSUNGSSTROEME },
        abschaltzeit: { zone: 3, key: 'ziAbschaltzeit', werte: ZI_ABSCHALTZEITEN }
      }
    },
    delta_u: {
      anzahlFelder: 5, ansichtWechsel: 'standard',
      settable: {
        spannungsfall: { zone: 1, key: 'ziSpannungsfall', schritt: 0.5 },
        lsTyp: { zone: 2, key: 'ziLsTyp', werte: ZI_LS_TYPEN },
        bemessungsstrom: { zone: 3, key: 'ziBemessungsstrom', werte: ZI_BEMESSUNGSSTROEME },
        abschaltzeit: { zone: 4, key: 'ziAbschaltzeit', werte: ZI_ABSCHALTZEITEN }
      }
    }
  },
  ZS: {
    standard: {
      anzahlFelder: 4, ansichtWechsel: 'zsrcd',
      settable: {
        lsTyp: { zone: 1, key: 'zsLsTyp', werte: ZI_LS_TYPEN },
        bemessungsstrom: { zone: 2, key: 'zsBemessungsstrom', werte: ZI_BEMESSUNGSSTROEME },
        abschaltzeit: { zone: 3, key: 'zsAbschaltzeit', werte: ZI_ABSCHALTZEITEN }
      }
    },
    zsrcd: {
      anzahlFelder: 5, ansichtWechsel: 'standard',
      settable: {
        stdLow: { zone: 1, key: 'zsStdLow', werte: ZS_STD_LOW },
        lsTyp: { zone: 2, key: 'zsLsTyp', werte: ZI_LS_TYPEN },
        bemessungsstrom: { zone: 3, key: 'zsBemessungsstrom', werte: ZI_BEMESSUNGSSTROEME },
        abschaltzeit: { zone: 4, key: 'zsAbschaltzeit', werte: ZI_ABSCHALTZEITEN }
      }
    }
  },
  'FI/RCD': {
    standard: {
      anzahlFelder: 3, ansichtWechsel: null,
      settable: {
        fehlerstrom: { zone: 1, key: 'fircdFehlerstrom', werte: FIRCD_FEHLERSTROEME },
        typ: { zone: 2, key: 'fircdTyp', werte: FIRCD_TYPEN }
      }
    }
  },
  'V~': {
    standard: { anzahlFelder: 1, ansichtWechsel: null, settable: {} }
  }
};

function aktuelleModusAnsicht(ctx) {
  const modusEintrag = MESSGERAET_MODI[ctx.modus];
  if (!modusEintrag) throw new Error(`Unbekannter Modus "${ctx.modus}"`);
  const eintrag = modusEintrag[ctx.ansicht];
  if (!eintrag) throw new Error(`Unbekannte Ansicht "${ctx.ansicht}" für Modus "${ctx.modus}"`);
  return eintrag;
}

// Navigiert per ◄► von der aktuell gemerkten Zone zur Zielzone (zyklisch,
// nur vorwärts - wie am echten Gerät, siehe seiteKlick()).
async function navigiereZuZone(ctx, zielZone, anzahlFelder) {
  const delta = (zielZone - ctx.zone + anzahlFelder) % anzahlFelder;
  for (let i = 0; i < delta; i++) await seiteKlick(ctx);
  ctx.zone = zielZone;
}

// Wechselt die Ansicht per Titel-Toggle (▲/▼ bei Zone 0) - z.B. ZI -> ΔU,
// ZS -> ZSRCD, RLOW -> R LOW. Ohne Wirkung, wenn der aktuelle Modus keinen
// Toggle hat (z.B. RISO, FI/RCD, V~).
async function wechsleAnsicht(ctx) {
  const eintrag = aktuelleModusAnsicht(ctx);
  if (!eintrag.ansichtWechsel) throw new Error(`Modus "${ctx.modus}" (Ansicht "${ctx.ansicht}") hat keinen Ansichts-Toggle`);
  await navigiereZuZone(ctx, 0, eintrag.anzahlFelder);
  await pfeilKlick(ctx, 1);
  ctx.ansicht = eintrag.ansichtWechsel;
  // Geteilte Felder (z.B. LS-Typ zwischen ZI/ΔU) behalten ihren Wert - der
  // Toggle selbst setzt in controller/app.js nichts zurück (nur ein
  // Drehknopf-Klick tut das, siehe drehknopfKlickRoh()) - ctx.werte bleibt
  // deshalb bewusst unverändert.
}

// --- Baustein 6 (Settable): einen Wert setzen ---
//
// `feld` = Schlüssel aus der `settable`-Map des aktuellen Modus/Ansicht
// (siehe MESSGERAET_MODI oben, deckt sich mit ARCHITEKTUR.md). Bei fester
// Werteliste ist `wert` einer der Listeneinträge (exakter String, z.B.
// 'C' oder '20A'); bei freiem Zahlenwert eine Zahl (z.B. 30 für 30MΩ).
async function stelleEin(ctx, feld, wert) {
  const eintrag = aktuelleModusAnsicht(ctx);
  const feldConfig = eintrag.settable[feld];
  if (!feldConfig) throw new Error(`Feld "${feld}" ist im Modus "${ctx.modus}" (Ansicht "${ctx.ansicht}") nicht settable`);

  await navigiereZuZone(ctx, feldConfig.zone, eintrag.anzahlFelder);

  if (feldConfig.werte) {
    const aktuellerIndex = feldConfig.werte.indexOf(ctx.werte[feldConfig.key]);
    const zielIndex = feldConfig.werte.indexOf(wert);
    if (zielIndex === -1) throw new Error(`"${wert}" ist kein gültiger Wert für "${feld}" (gültig: ${feldConfig.werte.join(', ')})`);
    const delta = zielIndex - aktuellerIndex;
    for (let i = 0; i < Math.abs(delta); i++) await pfeilKlick(ctx, delta > 0 ? 1 : -1);
    ctx.werte[feldConfig.key] = wert;
  } else {
    const aktuellerWert = ctx.werte[feldConfig.key];
    const anzahlKlicks = Math.round((wert - aktuellerWert) / feldConfig.schritt);
    for (let i = 0; i < Math.abs(anzahlKlicks); i++) await pfeilKlick(ctx, anzahlKlicks > 0 ? 1 : -1);
    // Geklemmt bei 0 (alle betroffenen Felder - Kalibrierter Widerstand,
    // Grenzwiderstand, Spannungsfall% - siehe controller/app.js
    // `Math.max(0, ...)`) - hier nachgebildet, damit ctx.werte auch bei
    // einem Zielwert < 0 den tatsächlich erreichten Wert zeigt.
    ctx.werte[feldConfig.key] = Math.max(0, Math.round((aktuellerWert + anzahlKlicks * feldConfig.schritt) * 10) / 10);
  }
}

// --- Baustein 3: Messspitze setzen ---
//
// `ziel` entweder `{ bauteil, netz }` (Schaltkasten-Schraube, `netz`
// optional bei eindeutigem Bauteil wie PE-Klemme) oder ein bereits
// fertiger Playwright-Locator (z.B. für einen Steckdosen-Kontakt, der
// keine data-bauteil/data-netz-Attribute trägt, siehe
// view/steckdosen.js) - Farbreihenfolge (Schwarz/Blau/Grün) übernimmt die
// App selbst anhand der Klickreihenfolge, hier nicht extra anzugeben.
async function messspitzeSetzen(ctx, ziel) {
  if (ziel?.click) {
    await ziel.click();
    return;
  }
  const { bauteil, netz } = ziel;
  const selektor = netz
    ? `#schaltkasten svg circle[data-bauteil="${bauteil}"][data-netz="${netz}"]`
    : `#schaltkasten svg circle[data-bauteil="${bauteil}"]`;
  await ctx.page.locator(selektor).first().click();
}

// --- Baustein 4: Bauteil bedienen (Hebel/Schraube) ---
//
// Hebel eines Bauteils finden über die Nähe (2D-Distanz) zu dessen eigener
// Schraube - siehe test_messgeraet.js findeSchalterHandleNaheBauteil() für
// die Bugfix-Historie (volle euklidische statt nur horizontale Distanz).
async function findeHebel(ctx, bauteilName) {
  const kreisBox = await ctx.page.locator(`#schaltkasten svg circle[data-bauteil="${bauteilName}"]`).first().boundingBox();
  const kreisCx = kreisBox.x + kreisBox.width / 2;
  const kreisCy = kreisBox.y + kreisBox.height / 2;
  const handles = ctx.page.locator('#schaltkasten svg g[style*="cursor: pointer"]');
  const anzahl = await handles.count();
  let bestIndex = -1, bestDist = Infinity;
  for (let i = 0; i < anzahl; i++) {
    const box = await handles.nth(i).boundingBox();
    if (!box) continue;
    const dist = Math.hypot((box.x + box.width / 2) - kreisCx, (box.y + box.height / 2) - kreisCy);
    if (dist < bestDist) { bestDist = dist; bestIndex = i; }
  }
  return handles.nth(bestIndex);
}

async function hebelSchalten(ctx, bauteilName) {
  const hebel = await findeHebel(ctx, bauteilName);
  await hebel.click();
}

// Löst oder dreht eine Schraube wieder ein (Schraubendreher-Werkzeug siehe
// KONZEPT.md "Schrauben lösen") - derselbe Aufruf für beide Richtungen, die
// App unterscheidet selbst anhand des aktuellen Schraubenzustands.
//
// ACHTUNG (selbst beim Testen dieser Datei hineingelaufen): ein Klick mit
// dem Werkzeug auf eine Schraube, an der bereits eine Messspitze sitzt, ist
// in `controller/app.js` (`onSchraubeKlick()`) bewusst wirkungslos - UND
// lässt das Werkzeug "aufgenommen" zurück (kein `renderSchraubendreher()`,
// da die Funktion vorher per `return` abbricht). Ein zweiter
// `schraubeSchalten()`-Aufruf direkt danach findet dann `#schraubendreher
// svg` nicht mehr an der erwarteten Stelle und hängt sich auf. Für diese
// Funktion also immer eine Schraube OHNE eigene Messspitze wählen - siehe
// `tools/pfad_zur_einspeisung.js`, das denselben Fallstrick schon einmal
// dokumentiert hat.
async function schraubeSchalten(ctx, bauteil, netz) {
  await ctx.page.locator('#schraubendreher svg').click();
  await ctx.page.locator(`#schaltkasten svg circle[data-bauteil="${bauteil}"][data-netz="${netz}"]`).click();
}

// --- Baustein 6 (Readable-Teil): einen Wert lesen ---
//
// `feld` = Schlüssel aus der `readable`-Map unten (modusübergreifend
// `ampel`/`kastenDurchgestrichen` immer verfügbar, Rest je nach Modus -
// siehe ARCHITEKTUR.md "Messgerät: Settable/Readable-Referenz").
const READABLE = {
  RLOW: {
    standard: { hauptmesswert: (t) => ersterTextMit(t, 'R:') },
    r_low: {
      hauptmesswert: (t) => ersterTextMit(t, 'R:'),
      rPlus: (t) => ersterTextMit(t, 'R+:'),
      rMinus: (t) => ersterTextMit(t, 'R-:')
    }
  },
  RISO: {
    standard: {
      hauptmesswert: (t) => ersterTextMit(t, 'R:'),
      spannungPeKreis: (t) => t.filter((x) => x.endsWith('V')).at(-1) ?? null
    }
  },
  ZI: {
    standard: {
      hauptmesswert: (t) => ersterTextMit(t, 'Z:'),
      isc: (t) => ersterTextMit(t, 'Isc:'),
      lim: (t) => t.find((x) => x.startsWith('Lim:')) ?? null,
      spannungPeKreis: (t) => t.filter((x) => x.endsWith('V')).at(-1) ?? null
    },
    delta_u: {
      deltaU: (t) => ersterTextMit(t, 'ΔU:'),
      isc: (t) => ersterTextMit(t, 'Isc:'),
      z: (t) => ersterTextMit(t, 'Z:'),
      zref: (t) => ersterTextMit(t, 'Zref:'),
      spannungPeKreis: (t) => t.filter((x) => x.endsWith('V')).at(-1) ?? null
    }
  },
  ZS: {
    standard: {
      hauptmesswert: (t) => ersterTextMit(t, 'Z:'),
      isc: (t) => ersterTextMit(t, 'Isc:'),
      lim: (t) => t.find((x) => x.startsWith('Lim:')) ?? null,
      spannungPeKreis: (t) => t.filter((x) => x.endsWith('V')).at(-1) ?? null
    },
    zsrcd: {
      hauptmesswert: (t) => ersterTextMit(t, 'Z:'),
      isc: (t) => ersterTextMit(t, 'Isc:'),
      lim: (t) => t.find((x) => x.startsWith('Lim:')) ?? null,
      spannungPeKreis: (t) => t.filter((x) => x.endsWith('V')).at(-1) ?? null
    }
  },
  'FI/RCD': {
    standard: {
      hauptmesswert: (t) => ersterTextMit(t, 'I:'),
      uci: (t) => ersterTextMit(t, 'Uci:'),
      t: (t) => t.find((x) => x.startsWith('t:')) ?? null,
      spannungPeKreis: (t) => t.filter((x) => x.endsWith('V')).at(-1) ?? null
    }
  },
  'V~': {
    // Anders als bei allen anderen Modi sind Label und Wert bei V~ ZWEI
    // getrennte <text>-Elemente (`{label, wert}` in
    // zustand.hauptwertZeilen, siehe view/messgeraet.js zeichneDisplay() -
    // "Uln:" und der eigentliche Wert werden per zwei separaten
    // svg.appendChild()-Aufrufen gezeichnet, nicht als ein kombinierter
    // String wie z.B. `R:13MΩ` sonst überall). `ersterTextMit()` würde nur
    // das Label selbst treffen ("Uln:") - stattdessen wird der Wert als
    // NÄCHSTES Element nach dem Label-Text aus displayTexte() gelesen
    // (Bugfix, beim Testen dieser Datei selbst gefunden: erste Version lieferte
    // nur "Uln:" statt "Uln:230V").
    standard: {
      uln: (t) => nachLabel(t, 'Uln:'),
      ulpe: (t) => nachLabel(t, 'Ulpe:'),
      unpe: (t) => nachLabel(t, 'Unpe:'),
      phasenfolge: (t) => t.find((x) => x === '1.2.3.' || x === '3.2.1.') ?? null
    }
  }
};

async function leseWert(ctx, feld) {
  if (feld === 'ampel') return ampelFarben(ctx);
  if (feld === 'kastenDurchgestrichen') return kastenDurchgestrichen(ctx);

  const modusEintrag = READABLE[ctx.modus];
  const leser = modusEintrag?.[ctx.ansicht]?.[feld];
  if (!leser) throw new Error(`Feld "${feld}" ist im Modus "${ctx.modus}" (Ansicht "${ctx.ansicht}") nicht readable`);
  const texte = await displayTexte(ctx);
  return leser(texte);
}

module.exports = {
  starteTestUmgebung,
  drehknopfAufModus,
  wechsleAnsicht,
  stelleEin,
  leseWert,
  messspitzeSetzen,
  hebelSchalten,
  schraubeSchalten,
  testDruecken,
  displayTexte,
  ampelFarben,
  kastenDurchgestrichen
};
