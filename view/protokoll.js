// Prüfprotokoll (siehe KONZEPT.md "Protokoll"): drittes View-Objekt neben
// Schaltkasten und Messgerät, unter Letzterem platziert. Inhalt folgt
// docs/referenz/Prüfprotokoll.md (Feldnamen/Struktur), Optik ist an
// docs/referenz/Prüfprotokoll.pdf angelehnt (umrandetes Formularblatt,
// Kästchen zum Ankreuzen). Erste Ausbaustufe bewusst nur Ein-/Ankreuzbar -
// keine Verknüpfung zu echten Messwerten, keine Validierung (folgt später).
//
// Anders als Schaltkasten/Messgerät (reines SVG) wird hier mit normalen
// HTML-Elementen gebaut (Tabellen, <input>, klickbare ☐/☒-Spans) - echte
// Texteingabe braucht native Eingabefelder, dafür ist SVG das falsche
// Werkzeug (siehe view/popup.js für das einzige andere HTML-basierte View
// im Projekt).

import { TITEL_MAENGEL, TITEL_BEURTEILUNG } from '../model/protokoll_soll.js';

let cssEingefuegt = false;

function sorgeFuerCss() {
  if (cssEingefuegt) return;
  cssEingefuegt = true;
  const style = document.createElement('style');
  style.textContent = `
    .pf-blatt {
      box-sizing: border-box;
      width: 100%;
      background: #fff;
      border: 2px solid #000;
      padding: 10px;
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
    }
    .pf-titel-zeile {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .pf-titel-zeile h1 { font-size: 16px; margin: 0; }
    .pf-titel-zeile h2 { font-size: 12px; margin: 2px 0 0; font-weight: normal; }
    .pf-abschnitt {
      border-top: 1px solid #000;
      padding-top: 6px;
      margin-top: 8px;
    }
    .pf-abschnitt-titel { font-weight: bold; margin-bottom: 4px; }
    .pf-zeile {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      margin-bottom: 3px;
    }
    .pf-label { color: #333; white-space: nowrap; }
    .pf-feld {
      border: none;
      border-bottom: 1px solid #999;
      font-family: inherit;
      font-size: inherit;
      padding: 1px 2px;
      min-width: 60px;
      flex: 1 1 auto;
    }
    .pf-feld-schmal { flex: 0 0 50px; min-width: 50px; }
    .pf-feld:focus { outline: none; border-bottom: 1px solid #000; background: #fffef0; }
    /* Prüfprotokoll-Check (sim-0bn, controller/protokoll_check.js): falsches
       oder fehlendes Feld, Ankreuz-Gruppe oder Ankreuz-Zelle. */
    .pf-fehler, .pf-feld.pf-fehler, .pf-feld.pf-fehler:focus { background: #ffd2d2; outline: 2px solid #d00000; }
    .pf-textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #999;
      font-family: inherit;
      font-size: inherit;
      padding: 3px;
      resize: vertical;
    }
    .pf-textarea:focus { outline: none; border-color: #000; background: #fffef0; }
    .pf-cbgroup { display: flex; flex-wrap: wrap; gap: 2px 12px; }
    .pf-cboption { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
    .pf-cb { cursor: pointer; user-select: none; font-size: 13px; }
    /* Tastatur-Bedienung (sim-k3t): Text neben einem Kästchen ist klickbar,
       der Fokus ist deutlich sichtbar. */
    .pf-cboption:has(.pf-cb), .pf-tabelle td.pf-cb-zelle { cursor: pointer; }
    .pf-cb:focus-visible, .pf-feld:focus-visible, .pf-textarea:focus-visible { outline: 2px solid #1a5fb4; outline-offset: 1px; }
    /* Auch ein rot markiertes Feld zeigt den Fokus (blauer Rahmen, rot bleibt
       als äußerer Ring sichtbar). */
    .pf-fehler:focus-visible, .pf-feld.pf-fehler:focus-visible { outline: 2px solid #1a5fb4; outline-offset: 1px; box-shadow: 0 0 0 4px #d00000; }
    .pf-tabelle { width: 100%; border-collapse: collapse; }
    .pf-tabelle th, .pf-tabelle td {
      border: 1px solid #999;
      padding: 2px 4px;
      text-align: left;
      vertical-align: middle;
    }
    .pf-tabelle th { background: #f0f0f0; font-weight: bold; white-space: nowrap; }
    .pf-tabelle td.pf-cb-zelle { text-align: center; }
    /* Eingabefelder füllen ihre Zelle, statt mit ihrer Standardbreite die
       Tabelle auf schmalen Bildschirmen zu verbreitern (sim-rng). */
    .pf-tabelle td > input.pf-feld { width: 100%; min-width: 0; box-sizing: border-box; }
    .pf-scroll { overflow-x: auto; }
    .pf-scroll .pf-tabelle td { white-space: nowrap; }
    .pf-scroll .pf-tabelle th { white-space: normal; max-width: 90px; }
    .pf-scroll .pf-tabelle input.pf-feld { width: 70px; min-width: 70px; flex: none; }
    .pf-linienzeile input.pf-feld { border-bottom: 1px solid #ccc; width: 100%; }
    .pf-seite2-titel { font-size: 13px; font-weight: bold; }

    /* Druck-/PDF-Export (siehe tools/pruefprotokoll_erstellung.js): nur das
       Prüfprotokoll selbst gehört ins PDF, nicht der Schaltkasten/die
       Steckdosen/das Messgerät darüber - diese View-Objekte dienen der
       Simulation auf dem Bildschirm, nicht dem Prüfprotokoll-Ergebnis. Die
       Stromkreisverteiler-Tabelle braucht auf dem Bildschirm horizontales
       Scrollen (siehe .pf-scroll oben), das gibt es beim Drucken nicht -
       stattdessen wird sie über eine kleinere Schrift und schmalere Zellen
       gestaucht, damit alle Spalten auf die Papierbreite passen.
    */
    @media print {
      #steckdosen, #schaltkasten, #messgeraet-zeile { display: none; }
      .pf-scroll { overflow: visible; }
      .pf-scroll .pf-tabelle { font-size: 6px; }
      .pf-scroll .pf-tabelle th, .pf-scroll .pf-tabelle td { padding: 1px 2px; }
      .pf-scroll .pf-tabelle th { max-width: none; }
      /* box-sizing: border-box ist hier Pflicht, nicht nur Geschmackssache -
         ohne das zaehlt die Breite von 100% nur den Inhalt OHNE das
         Eingabefeld-eigene Padding, das dadurch oben draufkommt und das
         Feld breiter macht als die Zelle - das Feld ragt dann mit seinem
         weissen Hintergrund ueber den Zellrahmen hinaus und uebermalt ihn
         optisch. */
      .pf-scroll .pf-tabelle input.pf-feld {
        width: 100%; min-width: 0; border-bottom: none;
        box-sizing: border-box; padding: 0; height: auto; font-size: inherit;
      }
    }
  `;
  document.head.appendChild(style);
}

// Checkbox-Gruppe: eine Liste von Optionen, jede unabhängig an-/abwählbar
// (bewusst kein Radio-Verhalten - reine Ankreuz-Funktion, siehe KONZEPT.md).
function cbGruppe(optionen) {
  return `<span class="pf-cbgroup">${optionen.map((o) =>
    `<span class="pf-cboption"><span class="pf-cb">☐</span>${o}</span>`
  ).join('')}</span>`;
}

function feld(platzhalter = '', schmal = false) {
  return `<input type="text" class="pf-feld${schmal ? ' pf-feld-schmal' : ''}" placeholder="${platzhalter}">`;
}

function zeile(label, inhalt) {
  return `<div class="pf-zeile"><span class="pf-label">${label}</span>${inhalt}</div>`;
}

function abschnitt(titel, inhaltHtml) {
  return `<div class="pf-abschnitt"><div class="pf-abschnitt-titel">${titel}</div>${inhaltHtml}</div>`;
}

// Tabelle mit Prüfpunkten + Ankreuzspalten (Besichtigen/Erproben: i.O./n.i.O.,
// Durchgängigkeit Potentialausgleich: nur eine i.O.-Spalte) + Bemerkung.
function pruefpunktTabelle(spaltenKoepfe, zeilenLabels) {
  const kopf = `<tr><th>Prüfpunkt</th>${spaltenKoepfe.map((s) => `<th>${s}</th>`).join('')}<th>Bemerkung</th></tr>`;
  const zeilen = zeilenLabels.map((label) =>
    `<tr><td>${label}</td>${spaltenKoepfe.map(() => `<td class="pf-cb-zelle"><span class="pf-cb">☐</span></td>`).join('')}<td>${feld()}</td></tr>`
  ).join('');
  return `<table class="pf-tabelle">${kopf}${zeilen}</table>`;
}

function linienTabelle(anzahlZeilen) {
  const zeilen = Array.from({ length: anzahlZeilen }, () =>
    `<tr class="pf-linienzeile"><td>${feld()}</td></tr>`
  ).join('');
  return `<table class="pf-tabelle">${zeilen}</table>`;
}

const BESICHTIGEN_PUNKTE = [
  'Auswahl der Betriebsmittel', 'Trenn- und Schaltgeräte', 'Brandabschottungen',
  'Gebäudesystemtechnik', 'Kabel, Leitungen, Stromschienen',
  'Kennzeichnung Stromkreis / Betriebsmittel', 'Kennzeichnung N- und PE-Leiter',
  'Leiterverbindungen', 'Schutz- und Überwachungseinrichtungen',
  'Basisschutz (Schutz gegen direktes Berühren)', 'Zugänglichkeit',
  'Schutzpotentialausgleich', 'Zusätzl. örtl. Potentialausgleich',
  'Dokumentation / siehe Ergänzungsblätter'
];

const ERPROBEN_PUNKTE = [
  'Funktionsprüfung der Anlage', 'FI-Schutzschalter (RCD)',
  'Funktion der Schutz-, Sicherheits- und Überwachungseinrichtungen',
  'Drehrichtung der Motoren', 'Rechtsdrehfeld (Drehstromsteckdosen)',
  'Überprüfung Spannungsfall', 'Gebäudesystemtechnik'
];

const DURCHGAENGIGKEIT_PUNKTE = [
  'Fundamenterder', 'Haupterdungsschiene', 'Hauptwasserleitung', 'Hauptschutzleiter',
  'Gasinnenleitung', 'Heizungsanlage', 'Klimaanlage', 'Aufzugsanlage', 'EDV-Anlage',
  'Telefonanlage', 'Blitzschutzanlage', 'Antennenanlage / BK', 'Gebäudekonstruktion',
  'Wasserzwischenzähler / Potentialausgleich nachgewiesen'
];

function baueErdungswiderstand() {
  return abschnitt('Erdungswiderstand',
    zeile('Erdungswiderstand Re', feld('', true) + ' Ω')
  );
}

// Spaltengruppen aus docs/BEDIENERPROZESS.md "Messen" -> "Stromkreisverteiler"
// (erweitert/überarbeitet gegenüber der ursprünglichen, flachen Spaltenliste
// aus docs/referenz/Prüfprotokoll.md). `label: null` = eigenständige Spalte
// ohne Gruppierung (spannt im gerenderten Tabellenkopf per `rowspan` beide
// Kopfzeilen), sonst eine Gruppe mehrerer Unterspalten mit gemeinsamem
// Gruppen-Label in der oberen Kopfzeile (per `colspan`) - z.B. "RCD" über
// den vier/fünf RCD-bezogenen Spalten, statt den Gruppennamen in jeder
// einzelnen Spaltenüberschrift zu wiederholen.
const STROMKREIS_GRUPPEN = [
  { label: null, spalten: ['Nr.'] },
  { label: null, spalten: ['Stromkreis / Zielbezeichnung'] },
  { label: 'Leitung/Kabel', spalten: ['Typ', 'Anz-<br>ahl', 'Quers. (mm²)'] },
  { label: null, spalten: ['Rpe (Ω)'] },
  { label: 'Riso (MΩ)', spalten: ['Verbraucher ohne', 'Verbraucher mit'] },
  { label: 'Überstromschutz', spalten: ['Art Charakt.', 'In (A)', 'Zs (Ω)<br>L-PE', 'Ik (A)<br>L-PE', 'Zi (Ω)<br>L-N', 'Ik (A)<br>L-N'] },
  { label: 'RCD', spalten: ['In/Art (A)', 'IΔN (mA)', 'Imess (mA)', 'Ausl. Zeit tA (ms)', 'Umess (V)'] }
];

// Flache Spaltenliste (nur die Unterspalten-Namen, ohne Gruppen-Label) -
// bestimmt die Anzahl/Reihenfolge der Datenzellen je Zeile weiter unten.
const STROMKREIS_SPALTEN = STROMKREIS_GRUPPEN.flatMap((g) => g.spalten);

function baueKopfdaten() {
  return abschnitt('Kopfdaten',
    zeile('Nr.', feld()) +
    zeile('Blatt', feld('', true) + ' von ' + feld('', true)) +
    zeile('Kunden-Nr.', feld()) +
    zeile('Auftraggeber', `<textarea class="pf-textarea" rows="2"></textarea>`) +
    zeile('Auftrag-Nr.', feld()) +
    zeile('Auftragnehmer', `<textarea class="pf-textarea" rows="2"></textarea>`) +
    zeile('Anlage', `<textarea class="pf-textarea" rows="2"></textarea>`) +
    zeile('Standort', `<textarea class="pf-textarea" rows="2"></textarea>`) +
    zeile('Prüfung nach', cbGruppe(['DIN VDE 0100-600', 'DIN VDE 0105-100', 'DGUV Vorschrift 3', 'BetrSichV', 'E-CHECK'])) +
    zeile('Art der Prüfung', cbGruppe(['Neuanlage', 'Erweiterung', 'Änderung', 'Instandsetzung', 'Wiederholungsprüfung'])) +
    zeile('Beginn Prüfung', feld()) +
    zeile('Ende Prüfung', feld()) +
    zeile('Beauftragter des Auftraggebers', feld()) +
    zeile('Prüfer', feld())
  );
}

function baueNetz() {
  return abschnitt('Netz',
    zeile('Netz', feld('', true) + ' / ' + feld('', true) + ' V') +
    zeile('Netzform', cbGruppe(['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'])) +
    zeile('Netzbetreiber', feld()) +
    zeile('Zähler-Nr.', feld()) +
    zeile('Zählerstand (kWh)', feld())
  );
}

function baueMessgeraeteTabelle() {
  const zeilen = [1, 2, 3].map((n) =>
    `<tr><td>${n}</td><td>${feld()}</td><td>${feld()}</td></tr>`
  ).join('');
  return abschnitt('Verwendete Messgeräte (nach VDE 0413)',
    `<table class="pf-tabelle"><tr><th>#</th><th>Fabrikat</th><th>Typ</th></tr>${zeilen}</table>`
  );
}

// "Umess (V)" bekommt zusätzlich zum Spaltennamen ein eigenes Eingabefeld
// IM Tabellenkopf selbst - der Prüfling trägt dort den für die jeweilige
// Anlage/Umgebung geltenden UL-Grenzwert (Berührungsspannungsgrenze) ein,
// bevor er die Umess-Werte je Stromkreis darunter einträgt. Bewusst KEIN
// Default (leer) - der Grenzwert ist nicht immer 50V, der Prüfling muss
// ihn selbst kennen (siehe docs/BEDIENERPROZESS.md "Bekannte Fehler").
function baueStromkreisverteilerUnterspalte(gruppe, spalte) {
  if (gruppe === 'RCD' && spalte === 'Umess (V)') return `<th>U<sub>L</sub> ≤ ${feld()}<br>Umess (V)</th>`;
  return `<th>${spalte}</th>`;
}

// Zweizeiliger Tabellenkopf: eigenständige Spalten (Nr., Stromkreis/
// Zielbezeichnung, Rpe) spannen per rowspan beide Kopfzeilen, gruppierte
// Spalten (Leitung/Kabel, Riso, Überstromschutz, RCD) bekommen ein
// gemeinsames Gruppen-Label per colspan in der oberen Zeile, statt den
// Gruppennamen in jeder Unterspalte zu wiederholen.
function baueStromkreisverteilerKopf() {
  const obereZeile = STROMKREIS_GRUPPEN.map((g) =>
    g.label === null
      ? `<th rowspan="2">${g.spalten[0]}</th>`
      : `<th colspan="${g.spalten.length}">${g.label}</th>`
  ).join('');
  const untereZeile = STROMKREIS_GRUPPEN
    .filter((g) => g.label !== null)
    .map((g) => g.spalten.map((s) => baueStromkreisverteilerUnterspalte(g.label, s)).join(''))
    .join('');
  return `<tr>${obereZeile}</tr><tr>${untereZeile}</tr>`;
}

function baueStromkreisverteiler() {
  const kopf = baueStromkreisverteilerKopf();
  const ersteZeile = `<tr><td>${feld()}</td><td><input type="text" class="pf-feld" value="Hauptleitung"></td>${
    STROMKREIS_SPALTEN.slice(2).map(() => `<td>${feld()}</td>`).join('')
  }</tr>`;
  const weitereZeilen = Array.from({ length: 14 }, () =>
    `<tr>${STROMKREIS_SPALTEN.map(() => `<td>${feld()}</td>`).join('')}</tr>`
  ).join('');
  return abschnitt('Messen – Stromkreisverteiler',
    `<div class="pf-scroll"><table class="pf-tabelle">${kopf}${ersteZeile}${weitereZeilen}</table></div>`
  );
}

function bauePruefergebnis() {
  return abschnitt('Prüfergebnis',
    zeile('Ergebnis', cbGruppe(['Keine Mängel festgestellt', 'Mängel festgestellt'])) +
    zeile('Prüf-Plakette angebracht', cbGruppe(['Ja', 'Nein'])) +
    zeile('Nächster Prüftermin', feld())
  );
}

function baueAbschluss() {
  return abschnitt('Abschluss – Auftraggeber',
    zeile('', `<span class="pf-cboption"><span class="pf-cb">☐</span>Übergabebericht: Anlage vollständig übernommen</span>`) +
    zeile('', `<span class="pf-cboption"><span class="pf-cb">☐</span>Zustandsbericht erhalten</span>`) +
    zeile('Ort', feld()) + zeile('Datum', feld()) + zeile('Unterschrift', feld())
  ) + abschnitt('Abschluss – Prüfer',
    zeile('', `<span class="pf-cboption">Anlage entspricht den anerkannten Regeln der Elektrotechnik</span>` + cbGruppe(['Ja', 'Nein'])) +
    zeile('Ort', feld()) + zeile('Datum', feld()) + zeile('Unterschrift', feld())
  );
}

function baueSeite2() {
  return `
    <div class="pf-blatt" style="margin-top: 20px;">
      <div class="pf-titel-zeile"><span class="pf-seite2-titel">Seite 2 – Übergabe-/Zustandsbericht</span></div>
      ${abschnitt(TITEL_MAENGEL, linienTabelle(11))}
      ${abschnitt(TITEL_BEURTEILUNG, linienTabelle(11))}
      ${abschnitt('Abschluss',
        zeile('', `<span class="pf-cboption"><span class="pf-cb">☐</span>Auftraggeber: Anlage vollständig übernommen</span>`) +
        zeile('', `<span class="pf-cboption"><span class="pf-cb">☐</span>Zustandsbericht erhalten</span>`) +
        zeile('', `<span class="pf-cboption">Prüfer: Anlage entspricht anerkannten Regeln</span>` + cbGruppe(['Ja', 'Nein'])) +
        zeile('Ort / Datum / Unterschrift (Auftraggeber)', feld()) +
        zeile('Ort / Datum / Unterschrift (Prüfer)', feld())
      )}
    </div>
  `;
}

// --- Tastatur-Bedienung (sim-k3t) ---

function umschalten(cb) {
  cb.textContent = cb.textContent === '☒' ? '☐' : '☒';
  cb.setAttribute('aria-checked', String(cb.textContent === '☒'));
}

// Zusammengehörige Kästchen: eine Tabellenzeile, eine Ankreuz-Gruppe oder
// eine Formularzeile mit einzelnem Kästchen.
const kaestchenGruppe = (cb) => cb.closest('tr') ?? cb.closest('.pf-cbgroup') ?? cb.closest('.pf-zeile');

// Kästchen per Tastatur erreichbar: Tab hält nur am ersten Kästchen jeder
// Gruppe, die übrigen erreicht man mit Pfeil links/rechts (Entscheidung zu
// sim-k3t, sonst wären es über 40 Tab-Halte).
function richteKaestchenEin(container) {
  const ersteJeGruppe = new Set();
  for (const cb of container.querySelectorAll('.pf-cb')) {
    const gruppe = kaestchenGruppe(cb);
    cb.setAttribute('role', 'checkbox');
    cb.setAttribute('aria-checked', String(cb.textContent === '☒'));
    cb.setAttribute('aria-label', kaestchenName(cb));
    cb.tabIndex = ersteJeGruppe.has(gruppe) ? -1 : 0;
    ersteJeGruppe.add(gruppe);
  }
}

// Name eines Kästchens für Screenreader (Review Codex zu sim-k3t): der Text
// der Option (z.B. "Ja") bzw. in Prüfpunkt-Tabellen "Prüfpunkt – Spalte"
// (z.B. "Zugänglichkeit – n.i.O.").
function kaestchenName(cb) {
  const option = cb.closest('.pf-cboption');
  if (option) return option.textContent.replace(/[☐☒]/g, '').trim();
  const zelle = cb.closest('td');
  const tabelle = zelle?.closest('table');
  if (!tabelle) return '';
  return `${zelle.parentElement.cells[0].textContent.trim()} – ${tabelle.rows[0].cells[zelle.cellIndex]?.textContent.trim() ?? ''}`;
}

// Bedienbares Element in einer Tabellenzelle bzw. allgemein.
const BEDIENBAR = 'input, textarea, .pf-cb';
const bedienbarIn = (zelle) => zelle?.querySelector(BEDIENBAR) ?? null;
// Zelle (auch Kopfzelle mit Eingabefeld wie U_L in der Messtabelle).
const zelleVon = (el) => el.closest('td, th');

// Steht der Cursor ohne Markierung am Anfang bzw. Ende des Textfelds?
function cursorAmRand(feld, richtung) {
  if (feld.selectionStart !== feld.selectionEnd) return false;
  return richtung < 0 ? feld.selectionStart === 0 : feld.selectionEnd === feld.value.length;
}

// Nachbar in der Tabelle: dieselbe Spalte eine Zeile höher/tiefer (nur
// Datenzeilen, Kopfzeilen mit zusammengefassten Spalten werden übersprungen)
// oder die nächste bedienbare Zelle links/rechts in derselben Zeile.
// Die Spalte wird über die waagrechte Lage bestimmt, nicht über cellIndex:
// Kopfzeilen fassen Spalten zusammen (colspan/rowspan), so findet auch das
// U_L-Feld im Kopf der Messtabelle seine Spalte (Review Codex zu sim-k3t).
function nachbarInTabelle(element, dZeile, dSpalte) {
  const zelle = zelleVon(element);
  const zeile = zelle?.parentElement;
  const tabelle = zeile?.closest('table');
  if (!zelle || !tabelle) return null;
  if (dZeile !== 0) {
    const box = zelle.getBoundingClientRect();
    const mitteX = box.left + box.width / 2;
    const zeilen = [...tabelle.rows];
    for (let i = zeilen.indexOf(zeile) + dZeile; i >= 0 && i < zeilen.length; i += dZeile) {
      const treffer = [...zeilen[i].cells].find((c) => {
        const b = c.getBoundingClientRect();
        return b.left <= mitteX && mitteX < b.right;
      });
      const ziel = bedienbarIn(treffer);
      if (ziel) return ziel;
    }
    return null;
  }
  const inZeile = [...zeile.querySelectorAll(BEDIENBAR)];
  return inZeile[inZeile.indexOf(element) + dSpalte] ?? null;
}

// Nächstes Feld in Tab-Reihenfolge (für Enter außerhalb von Tabellen).
function naechstesFeld(container, element) {
  const felder = [...container.querySelectorAll(BEDIENBAR)].filter((f) => f.tabIndex >= 0);
  return felder[felder.indexOf(element) + 1] ?? null;
}

function tasteGedrueckt(container, ev) {
  const el = ev.target;
  const istKaestchen = el.classList?.contains('pf-cb');
  const istTextfeld = el.tagName === 'INPUT';
  if (!istKaestchen && !istTextfeld) return; // mehrzeilige Felder: Tasten wie gewohnt
  // Mit Umschalt, Strg, Alt oder Meta bleiben die Tasten beim Browser
  // (Text markieren, wortweise springen; Review Gemini zu sim-k3t).
  if (ev.shiftKey || ev.ctrlKey || ev.altKey || ev.metaKey) return;
  const inTabelle = Boolean(zelleVon(el)?.closest('table.pf-tabelle'));
  let ziel = null;

  if (istKaestchen && (ev.key === ' ' || ev.key === 'Enter')) {
    ev.preventDefault();
    umschalten(el);
    return;
  }
  if (ev.key === 'Enter') {
    ziel = inTabelle ? nachbarInTabelle(el, 1, 0) : naechstesFeld(container, el);
  } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
    if (inTabelle) ziel = nachbarInTabelle(el, ev.key === 'ArrowUp' ? -1 : 1, 0);
  } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
    const richtung = ev.key === 'ArrowLeft' ? -1 : 1;
    if (istTextfeld && !cursorAmRand(el, richtung)) return;
    if (inTabelle) {
      ziel = nachbarInTabelle(el, 0, richtung);
    } else if (istKaestchen) {
      const geschwister = [...kaestchenGruppe(el).querySelectorAll('.pf-cb')];
      ziel = geschwister[geschwister.indexOf(el) + richtung] ?? null;
    }
  } else {
    return;
  }
  if (!ziel) return;
  ev.preventDefault();
  ziel.focus();
  // Cursor so setzen, dass ein weiterer Pfeil in dieselbe Richtung direkt
  // weiterspringt: nach links an den Anfang, sonst ans Ende (Review Gemini).
  if (ziel.tagName === 'INPUT') {
    const pos = ev.key === 'ArrowLeft' ? 0 : ziel.value.length;
    ziel.setSelectionRange(pos, pos);
  }
}

export const ProtokollView = {
  // Die Breite kommt aus der Seitenspalte (index.html, sim-rng): das Blatt
  // steht bündig unter dem Schaltkasten.
  render(container) {
    sorgeFuerCss();
    container.innerHTML = `
      <div class="pf-blatt">
        <div class="pf-titel-zeile">
          <div><h1>Prüfung elektrischer Anlagen</h1><h2>Prüfprotokoll</h2></div>
        </div>
        ${baueKopfdaten()}
        ${baueNetz()}
        ${abschnitt('Besichtigen', pruefpunktTabelle(['i.O.', 'n.i.O.'], BESICHTIGEN_PUNKTE))}
        ${abschnitt('Erproben', pruefpunktTabelle(['i.O.', 'n.i.O.'], ERPROBEN_PUNKTE))}
        ${baueErdungswiderstand()}
        ${abschnitt('Durchgängigkeit Potentialausgleich nachgewiesen', pruefpunktTabelle(['i.O.'], DURCHGAENGIGKEIT_PUNKTE))}
        ${baueMessgeraeteTabelle()}
        ${baueStromkreisverteiler()}
        ${bauePruefergebnis()}
        ${baueAbschluss()}
      </div>
      ${baueSeite2()}
    `;

    richteKaestchenEin(container);

    // Ankreuzen: Klick auf ein ☐/☒-Kästchen togglet unabhängig von jedem
    // anderen Kästchen (kein Radio-Verhalten - reine Ankreuz-Funktion,
    // Mehrfachauswahl/Validierung ist bewusst nicht Teil dieser ersten
    // Ausbaustufe, siehe KONZEPT.md "Protokoll"). Ein Klick auf den Text
    // neben dem Kästchen zählt wie ein Klick auf das Kästchen (sim-k3t).
    // Ebenso die freie Fläche einer Ankreuz-Zelle (Touch). Danach liegt der
    // Fokus auf dem Kästchen, damit man mit der Tastatur weitermachen kann.
    container.addEventListener('click', (ev) => {
      const direkt = ev.target.closest('.pf-cb');
      const cb = direkt ?? (ev.target.closest('.pf-cboption') ?? ev.target.closest('td.pf-cb-zelle'))?.querySelector('.pf-cb');
      if (!cb) return;
      umschalten(cb);
      if (!direkt) cb.focus({ preventScroll: true });
    });
    container.addEventListener('keydown', (ev) => tasteGedrueckt(container, ev));
  },

  // Ist irgendetwas eingetragen oder angekreuzt? Vorbelegte Felder (z.B.
  // "Hauptleitung") zählen nur, wenn ihr Inhalt geändert wurde.
  hatEintraege(container) {
    const felder = [...container.querySelectorAll('input, textarea')];
    return felder.some((f) => f.value !== f.defaultValue)
      || [...container.querySelectorAll('.pf-cb')].some((cb) => cb.textContent === '☒');
  },

  // Setzt alle Felder auf den Ausgangszustand zurück (Inhalt, Kreuze und rote
  // Markierungen des Checks), ohne neu zu rendern - so bleibt der eine
  // Klick-Listener aus render() erhalten (sim-ibp).
  leeren(container) {
    container.querySelectorAll('input, textarea').forEach((f) => { f.value = f.defaultValue; });
    container.querySelectorAll('.pf-cb').forEach((cb) => { cb.textContent = '☐'; cb.setAttribute('aria-checked', 'false'); });
    container.querySelectorAll('.pf-fehler').forEach((el) => el.classList.remove('pf-fehler'));
  }
};
