// Führt EINEN Fahrplan-Schritt (aus `fahrplan.json`, siehe ARCHITEKTUR.md
// "Fahrplan-Erstellung") gegen die bereits im Browser laufende App aus -
// Geschwister-Modul zu `tools/messgeraet_steuerung.js`, das dieselben
// Aktionen für Playwright (externe Automatisierung, eigener Browser-
// Kontext) bereitstellt. Hier dagegen: echte DOM-Klick-EVENTS auf dieselben
// SVG-Elemente, die auch ein Mensch anklicken würde - kein separater
// Ausführungspfad, dieselben (bereits bestehenden) Click-Handler reagieren.
//
// WICHTIG: `element.click()` funktioniert hier NICHT - `SVGCircleElement`
// (anders als `HTMLElement`) hat in diesem Browser keine `.click()`-Methode
// (`typeof element.click === 'undefined'`, selbst beim Testen dieses
// Schritts gefunden). Stattdessen wird ein echtes `MouseEvent('click', {
// bubbles: true })` dispatcht - funktioniert für JEDES Element (HTML/SVG
// gleichermaßen), da `addEventListener('click', ...)` (siehe
// view/schaltkasten.js) auf Events reagiert, unabhängig davon, ob sie vom
// Nutzer oder programmatisch ausgelöst wurden.
//
// Kleine Schritte (User-Vorgabe 2026-08-05, "erst gucken ob es prinzipiell
// funktioniert. z.B. replay nur mit messspitzen. dann replay mit
// messspitzen und schraubenzieher."): `messspitzeSetzen`, `schraubeSchalten`,
// `testDruecken`, `drehknopfAufModus` und jetzt auch `hebelSchalten`
// implementiert - jeder andere `funktion`-Name (`leseWert`, `stelleEin`)
// wird vorerst kommentarlos übersprungen (kein Fehler, einfach kein
// DOM-Klick) und folgt als eigener, späterer Schritt.

function klicke(element) {
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function messspitzeSetzen({ bauteil, netz }) {
  const teile = ['#schaltkasten svg circle'];
  if (bauteil) teile.push(`[data-bauteil="${bauteil}"]`);
  if (netz) teile.push(`[data-netz="${netz}"]`);
  klicke(document.querySelector(teile.join('')));
}

// Zwei Klicks, genau wie ein Mensch (und wie `tools/messgeraet_steuerung.js`s
// gleichnamige Playwright-Funktion): erst das Schraubendreher-Werkzeug
// "aufnehmen", dann die Ziel-Schraube treffen. WICHTIG: der Klick-Listener
// des Werkzeugs sitzt auf der inneren `<g>` (siehe view/schraubendreher.js),
// NICHT auf dem äußeren `<svg>` - ein Klick-Event auf das `<svg>` selbst
// würde NICHT zur `<g>` "runterbubbeln" (Events bubbeln nur zu Vorfahren des
// tatsächlichen Ziels, nie zu Nachfahren) und den Listener deshalb nicht
// auslösen (selbst beim Umsetzen dieses Schritts gefunden).
//
// Die Ziel-Schraube wird wie in `messgeraet_steuerung.js` per exaktem
// Abgleich gegen `data-netz` ODER (gesplittet) `data-netz-weitere` gesucht,
// nicht per CSS-Teilstring-Selektor (`*=`) - sonst würden geteilte
// Schrauben (z.B. ein RCD-Ausgang, der zwei LS versorgt, siehe
// ARCHITEKTUR.md "schraubeSchalten()") falsch oder gar nicht gefunden, bzw.
// ein Netz wie "N41" fälschlich auch "N410" treffen.
function schraubeSchalten(bauteil, netz) {
  klicke(document.querySelector('#schraubendreher svg g'));

  const kandidaten = document.querySelectorAll(`#schaltkasten svg circle[data-bauteil="${bauteil}"]`);
  const ziel = [...kandidaten].find((kreis) => {
    const weitere = kreis.getAttribute('data-netz-weitere')?.split(',') ?? [];
    return kreis.getAttribute('data-netz') === netz || weitere.includes(netz);
  });
  klicke(ziel);
}

// Wie `tools/messgeraet_steuerung.js`s gleichnamige Playwright-Funktion
// (`page.getByText('TEST', {exact:true}).click()`): der Klick-Listener
// sitzt in `view/messgeraet.js` auf der `<g>`, die u.a. den TEST-Text
// enthält (`testGruppe`, kein eigenes ID/Data-Attribut) - hier deshalb über
// den exakten Textinhalt gesucht (analog zu Playwright `getByText`), ein
// Klick auf das gefundene `<text>` bubbelt zur `<g>` hoch (siehe
// `schraubeSchalten()` oben zum selben Bubbling-Prinzip).
function testDruecken() {
  const text = [...document.querySelectorAll('#messgeraet svg text')].find((t) => t.textContent === 'TEST');
  klicke(text);
}

// Reihenfolge wie am echten Gerät (kein Zurückdrehen), 1:1 aus
// `tools/messgeraet_steuerung.js`s gleichnamiger Konstante übernommen.
const MODUS_REIHENFOLGE = ['RLOW', 'RISO', 'ZI', 'ZS', 'FI/RCD', 'V~'];

// Rückwärts-Tabelle Rotationswinkel -> Modus, 1:1 aus `view/messgeraet.js`s
// `DREHKNOPF_POSITIONEN`-Winkeln übernommen (dort nicht exportiert, deshalb
// hier als eigene, kleine Kopie gepflegt).
const WINKEL_ZU_MODUS = { '-160': 'RLOW', '-110': 'RISO', '-70': 'ZI', '-30': 'ZS', '5': 'FI/RCD', '65': 'V~' };

// Liest den AKTUELL eingestellten Modus direkt aus dem Rotations-Winkel des
// Drehknopf-Griffs, NICHT aus dem angezeigten Zone-1-Titel/Label - der
// wechselt per ▲/▼ zwischen `titel` ("Durchgang") und `label` ("R LOW") und
// ist bei RISO zudem wortgleich mit dem festen Ring-Label "R ISO"
// (`zeichneDrehknopf()` zeichnet das für JEDEN Modus, nicht nur den aktuell
// gewählten) - über zwei mögliche Textquellen mit potentieller Dopplung
// zuverlässig auf den aktuellen Modus zu schließen wäre unnötig fragil. Der
// Rotationswinkel des Griffs ist dagegen immer eindeutig ein einziger Wert.
// `null`, wenn der Drehknopf (noch) nicht im DOM gefunden wird.
function aktuellerModus() {
  const kreis = document.querySelector('#messgeraet svg circle[fill="#1a1a1a"]');
  const griff = [...(kreis?.parentElement?.children ?? [])].find(
    (el) => el.tagName === 'g' && el.getAttribute('transform')?.startsWith('rotate(')
  );
  const winkel = griff?.getAttribute('transform').match(/rotate\(([-\d.]+)/)?.[1];
  return WINKEL_ZU_MODUS[winkel] ?? null;
}

// Dreht (wie am echten Gerät, kein Zurückdrehen) bis zum Zielmodus - anders
// als `tools/messgeraet_steuerung.js`s gleichnamige Playwright-Funktion OHNE
// eigenen mitgeführten Modus-Zustand: nach jedem Klick wird der tatsächliche
// Modus live aus dem DOM neu gelesen (siehe `aktuellerModus()` oben), statt
// (wie im externen Skript nötig, das die App nicht synchron introspizieren
// kann) blind eine erwartete Zyklus-Position mitzuzählen - hier robuster,
// weil kein zweiter, potentiell abweichender Zustand entstehen kann.
function drehknopfAufModus(zielModus) {
  if (!MODUS_REIHENFOLGE.includes(zielModus)) return;
  const kreis = document.querySelector('#messgeraet svg circle[fill="#1a1a1a"]');
  // Sicherheitsgrenze gegen Endlosschleife, falls `aktuellerModus()` aus
  // irgendeinem Grund dauerhaft `null` liefert (z.B. DOM-Struktur geändert) -
  // ein voller Zyklus braucht höchstens `MODUS_REIHENFOLGE.length` Klicks.
  for (let i = 0; i < MODUS_REIHENFOLGE.length && aktuellerModus() !== zielModus; i++) {
    klicke(kreis);
  }
}

// Findet den Hebel eines Bauteils über die Nähe (2D-Distanz) zu dessen
// eigener Schraube - 1:1 dieselbe Idee wie `tools/messgeraet_steuerung.js`s
// gleichnamige Funktion (dort per `boundingBox()`, hier per
// `getBoundingClientRect()`, da wir direkt im selben DOM stehen statt über
// Playwright-Locators zu gehen). Der Hebel selbst trägt kein
// `data-bauteil`-Attribut (siehe `zeichneSchalter()` in
// `view/schaltkasten.js`), deshalb die Umwegsuche über die räumlich
// nächstgelegene klickbare `<g>` (`style.cursor === 'pointer'`).
function findeHebel(bauteilName) {
  const kreis = document.querySelector(`#schaltkasten svg circle[data-bauteil="${bauteilName}"]`);
  if (!kreis) return null;
  const kreisBox = kreis.getBoundingClientRect();
  const kreisCx = kreisBox.x + kreisBox.width / 2;
  const kreisCy = kreisBox.y + kreisBox.height / 2;
  const handles = [...document.querySelectorAll('#schaltkasten svg g')].filter((g) => g.style.cursor === 'pointer');

  let bester = null;
  let besteDistanz = Infinity;
  for (const handle of handles) {
    const box = handle.getBoundingClientRect();
    if (!box.width && !box.height) continue;
    const distanz = Math.hypot((box.x + box.width / 2) - kreisCx, (box.y + box.height / 2) - kreisCy);
    if (distanz < besteDistanz) { besteDistanz = distanz; bester = handle; }
  }
  return bester;
}

function hebelSchalten(bauteilName) {
  klicke(findeHebel(bauteilName));
}

export function fuehreSchrittAus(schritt) {
  if (schritt.funktion === 'messspitzeSetzen') {
    messspitzeSetzen(schritt.argumente[0]);
  } else if (schritt.funktion === 'schraubeSchalten') {
    schraubeSchalten(schritt.argumente[0], schritt.argumente[1]);
  } else if (schritt.funktion === 'testDruecken') {
    testDruecken();
  } else if (schritt.funktion === 'drehknopfAufModus') {
    drehknopfAufModus(schritt.argumente[0]);
  } else if (schritt.funktion === 'hebelSchalten') {
    hebelSchalten(schritt.argumente[0]);
  }
}
