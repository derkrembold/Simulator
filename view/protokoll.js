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
    .pf-tabelle { width: 100%; border-collapse: collapse; }
    .pf-tabelle th, .pf-tabelle td {
      border: 1px solid #999;
      padding: 2px 4px;
      text-align: left;
      vertical-align: middle;
    }
    .pf-tabelle th { background: #f0f0f0; font-weight: bold; white-space: nowrap; }
    .pf-tabelle td.pf-cb-zelle { text-align: center; }
    .pf-scroll { overflow-x: auto; }
    .pf-scroll .pf-tabelle td { white-space: nowrap; }
    .pf-scroll .pf-tabelle th { white-space: normal; max-width: 90px; }
    .pf-scroll .pf-tabelle input.pf-feld { width: 70px; min-width: 70px; flex: none; }
    .pf-linienzeile input.pf-feld { border-bottom: 1px solid #ccc; width: 100%; }
    .pf-seite2-titel { font-size: 13px; font-weight: bold; }
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
  { label: 'Leitung/Kabel', spalten: ['Typ', 'Anzahl', 'Querschnitt (mm²)'] },
  { label: null, spalten: ['Rpe (Ω)'] },
  { label: 'Riso (MΩ)', spalten: ['Verbraucher ohne', 'Verbraucher mit'] },
  { label: 'Überstromschutz', spalten: ['Art Charakteristik', 'In (A)', 'Zs (Ω)<br>L-PE', 'Ik (A)<br>L-PE', 'Zi (Ω)<br>L-N', 'Ik (A)<br>L-N'] },
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
  const weitereZeilen = Array.from({ length: 10 }, () =>
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
      ${abschnitt('Mängel', linienTabelle(11))}
      ${abschnitt('Beurteilung', linienTabelle(11))}
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

export const ProtokollView = {
  // `breitePx`: Zielbreite in Pixeln (siehe controller/app.js - dieselbe
  // Breite wie der gerenderte Schaltkasten, damit alle drei View-Objekte
  // bündig übereinander stehen).
  render(container, breitePx) {
    sorgeFuerCss();
    container.style.width = `${breitePx}px`;
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

    // Ankreuzen: Klick auf ein ☐/☒-Kästchen togglet unabhängig von jedem
    // anderen Kästchen (kein Radio-Verhalten - reine Ankreuz-Funktion,
    // Mehrfachauswahl/Validierung ist bewusst nicht Teil dieser ersten
    // Ausbaustufe, siehe KONZEPT.md "Protokoll").
    container.addEventListener('click', (ev) => {
      const cb = ev.target.closest('.pf-cb');
      if (!cb) return;
      cb.textContent = cb.textContent === '☒' ? '☐' : '☒';
    });
  }
};
