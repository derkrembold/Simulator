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
// messspitzen und schraubenzieher."): `messspitzeSetzen`, `schraubeSchalten`
// und jetzt auch `testDruecken` implementiert - jeder andere `funktion`-Name
// (`drehknopfAufModus`, `leseWert`, `stelleEin`, `hebelSchalten`) wird
// vorerst kommentarlos übersprungen (kein Fehler, einfach kein DOM-Klick)
// und folgt als eigener, späterer Schritt.

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

export function fuehreSchrittAus(schritt) {
  if (schritt.funktion === 'messspitzeSetzen') {
    messspitzeSetzen(schritt.argumente[0]);
  } else if (schritt.funktion === 'schraubeSchalten') {
    schraubeSchalten(schritt.argumente[0], schritt.argumente[1]);
  } else if (schritt.funktion === 'testDruecken') {
    testDruecken();
  }
}
