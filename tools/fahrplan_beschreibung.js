// Entwickler-Skill (User-Vorgabe, 2026-08-03): erster der zwei geplanten
// Fahrplan-Renderer (siehe ARCHITEKTUR.md "Fahrplan-Erstellung (Konzept)").
// Liest eine `fahrplan.json` (Format aus tools/fahrplan_rekorder.js) und
// erzeugt daraus eine menschenlesbare PDF-Beschreibung des Ablaufs - pro
// Abschnitt Titel/Begründung, pro Schritt ein deutscher Satz statt der
// rohen {funktion, argumente, ergebnis}-Tripel. Pädagogischer Zweck (siehe
// Konzept), KEIN Ersatz für das eigentliche Prüfprotokoll.
//
// Aufruf:
//   node tools/fahrplan_beschreibung.js <testcase> [ausgabeordner]
//   node tools/fahrplan_beschreibung.js testcase_04
//
// Liest <ausgabeordner>/fahrplan.json (Default: tests/visuell/<testcase>/,
// deckt sich mit dem Default-Ausgabeordner von
// tools/pruefprotokoll_erstellung.js), schreibt <ausgabeordner>/fahrplan.pdf
// daneben. Eigenständiges Tool statt in pruefprotokoll_erstellung.js
// integriert - arbeitet auf JEDER fahrplan.json, nicht nur auf frisch
// erzeugten.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..');

function fluchtHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Menschenlesbare Feldnamen für stelleEin()/leseWert() - Schlüssel decken
// sich mit ARCHITEKTUR.md "Messgerät: Settable/Readable-Referenz"
// (tools/messgeraet_steuerung.js MESSGERAET_MODI/READABLE).
const FELD_NAMEN = {
  lsTyp: 'LS-Typ', bemessungsstrom: 'Bemessungsstrom', abschaltzeit: 'Abschaltzeit',
  fehlerstrom: 'Fehlerstrom', typ: 'Typ', pruefspannung: 'Prüfspannung',
  grenzwiderstand: 'Grenzwiderstand', kalibrierterWiderstand: 'Kalibrierter Widerstand',
  stdLow: 'Std/Low', spannungsfall: 'Spannungsfall',
  hauptmesswert: 'Hauptmesswert', isc: 'Kurzschlussstrom Isc', uci: 'Berührungsspannung Uci',
  t: 'Auslösezeit t', phasenfolge: 'Phasenfolge', ampel: 'Ampel', spannungPeKreis: 'Spannung',
  deltaU: 'Spannungsfall ΔU', z: 'Impedanz Z', zref: 'Referenzimpedanz Zref', lim: 'Grenzwert',
  rPlus: 'R+', rMinus: 'R-', uln: 'U(L-N)', ulpe: 'U(L-PE)', unpe: 'U(N-PE)'
};

function feldName(feld) {
  return FELD_NAMEN[feld] ?? feld;
}

// Bei messspitzeSetzen() gibt die App die Sondenfarbe anhand der
// Klick-REIHENFOLGE vor (Schwarz/Blau/Grün, siehe
// tools/messgeraet_steuerung.js) - im Fahrplan-JSON selbst nicht
// mitgeschrieben, daher hier pro Abschnitt nachgezählt (ein Abschnitt = eine
// Messung = maximal 3 Sonden).
const SONDEN_FARBEN = ['schwarz', 'blau', 'grün'];

function beschreibeZiel(ziel) {
  if (ziel?.bauteil && ziel?.netz) return `${ziel.bauteil} (Netz ${ziel.netz})`;
  if (ziel?.bauteil) return ziel.bauteil;
  if (ziel?.netz) return `Netz ${ziel.netz}`;
  return 'Endstelle';
}

function formatiereErgebnis(ergebnis) {
  if (ergebnis == null) return '–';
  if (Array.isArray(ergebnis)) return ergebnis.join(' / ');
  return String(ergebnis);
}

function beschreibeSchritt(schritt, sondenZaehler) {
  const [a, b] = schritt.argumente;
  switch (schritt.funktion) {
    case 'drehknopfAufModus':
      return `Drehknopf auf Modus ${a} stellen.`;
    case 'wechsleAnsicht':
      return 'Anzeige-Ansicht umschalten (▲ bei Zone 0).';
    case 'stelleEin':
      return `${feldName(a)} auf ${b} einstellen.`;
    case 'messspitzeSetzen': {
      const farbe = SONDEN_FARBEN[sondenZaehler.wert] ?? `#${sondenZaehler.wert + 1}`;
      sondenZaehler.wert += 1;
      return `Messspitze (${farbe}) an ${beschreibeZiel(a)} anschließen.`;
    }
    case 'hebelSchalten':
      return `Hebel von ${a} betätigen.`;
    case 'schraubeSchalten':
      return `Schraube von ${a} (Netz ${b}) mit dem Schraubendreher lösen bzw. wieder eindrehen.`;
    case 'testDruecken':
      return 'TEST-Taste drücken.';
    case 'leseWert':
      return `Anzeige ablesen (${feldName(a)}): ${formatiereErgebnis(schritt.ergebnis)}`;
    default:
      return `${schritt.funktion}(${schritt.argumente.map((x) => JSON.stringify(x)).join(', ')})`;
  }
}

function baueHtml(fahrplan) {
  const abschnitteHtml = fahrplan.abschnitte.map((abschnitt) => {
    const sondenZaehler = { wert: 0 };
    const schritteHtml = abschnitt.schritte
      .map((schritt) => `<li>${fluchtHtml(beschreibeSchritt(schritt, sondenZaehler))}</li>`)
      .join('\n');
    return `
      <section class="abschnitt">
        <h2>${fluchtHtml(abschnitt.titel)}</h2>
        <p class="begruendung">${fluchtHtml(abschnitt.begruendung)}</p>
        <ol>${schritteHtml}</ol>
      </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Fahrplan</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .anlage { color: #555; margin-bottom: 24px; }
  .abschnitt { margin-bottom: 16px; page-break-inside: avoid; }
  h2 { font-size: 13px; margin: 0 0 2px; }
  .begruendung { color: #555; font-style: italic; margin: 0 0 4px; }
  ol { margin: 0; padding-left: 20px; }
  li { margin-bottom: 2px; }
</style>
</head>
<body>
  <h1>Fahrplan</h1>
  <p class="anlage">Anlage: ${fluchtHtml(fahrplan.anlage)}</p>
  ${abschnitteHtml}
</body>
</html>`;
}

async function main() {
  const testcase = process.argv[2];
  const ausgabeordner = process.argv[3] ?? path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase);
  if (!testcase) {
    console.error('Aufruf: node tools/fahrplan_beschreibung.js <testcase> [ausgabeordner]');
    process.exit(1);
  }
  const fahrplanPfad = path.join(ausgabeordner, 'fahrplan.json');
  const fahrplan = JSON.parse(fs.readFileSync(fahrplanPfad, 'utf8'));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(baueHtml(fahrplan));
  const pdfPfad = path.join(ausgabeordner, 'fahrplan.pdf');
  // `margin` hier statt (nur) über CSS body-margin - die CSS-margin gilt nur
  // für den Seitenanfang des Inhalts, nicht für jede einzelne PDF-Seite nach
  // einem automatischen Seitenumbruch (sonst startet der Text auf Seite 2+
  // ganz am Rand).
  await page.pdf({
    path: pdfPfad,
    printBackground: true,
    format: 'A4',
    margin: { top: '20mm', bottom: '15mm', left: '15mm', right: '15mm' }
  });
  await browser.close();
  console.log('Fahrplan-Beschreibung gespeichert:', pdfPfad);
}

main().catch((e) => { console.error(e); process.exit(1); });
