// Prüfprotokoll-Check (sim-0bn): vergleicht die Eingaben des Benutzers im
// Prüfprotokoll (view/protokoll.js) mit den Sollwerten und markiert
// Abweichungen rot (Klasse `pf-fehler`). Zwei Quellen:
//   - Kopfdaten, Netz, Besichtigen, Erproben, Messgeräte, Prüfergebnis,
//     Abschluss: Regeln aus model/protokoll_soll.js
//     (docs/referenz/Pflichtfelder.md)
//   - Messtabelle: die protokollEintragen-Schritte des Fahrplans
//     (dieselben Werte, die das Replay einträgt).
// Ein leeres Feld ist falsch, wenn es einen Sollwert hat. Den richtigen
// Wert verrät der Check nicht (Entscheidung zu sim-0bn).

import { PROTOKOLL_REGELN } from '../model/protokoll_soll.js';

// --- Vergleich ---

// Text ohne Groß-/Kleinschreibung, Leerzeichen und Satzzeichen; "Straße"
// und "Str." gelten als gleich.
export function normalisiereText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/strasse/g, 'str')
    .replace(/[^a-z0-9äöü]/g, '');
}

// Zahl aus einer Eingabe wie "0,54", "0.54", "16 A", ">999": Komma und
// Punkt sind gleichwertig, eine Einheit dahinter wird ignoriert. `null`,
// wenn die Eingabe keine Zahl ist.
export function zahlwert(text) {
  const kompakt = String(text ?? '').trim().replace(/\s+/g, '');
  const treffer = kompakt.match(/^(>?)(-?\d+(?:[.,]\d+)?)([a-zA-ZΩµ%]*)$/);
  if (!treffer) return null;
  return { groesser: treffer[1] === '>', zahl: parseFloat(treffer[2].replace(',', '.')) };
}

// Vergleich: Ist der Sollwert eine Zahl, zählt nur der Zahlenvergleich
// (gleicher Zahlenwert, gleiches ">") - eine Eingabe, die keine Zahl ist
// (z.B. "<999", "=999", "40,0,0"), ist dann falsch. Der Textvergleich
// würde Satz- und Vergleichszeichen entfernen ("<999" = ">999", "40,0" =
// "400"). Nur echte Textwerte (z.B. "40/A", "B", Adressen) werden wie
// normalisiereText() verglichen. Leer ist nie gleich.
export function gleicherWert(ist, soll) {
  if (String(ist ?? '').trim() === '') return false;
  const b = zahlwert(soll);
  if (b) {
    const a = zahlwert(ist);
    return a !== null && a.groesser === b.groesser && a.zahl === b.zahl;
  }
  return normalisiereText(ist) === normalisiereText(soll);
}

// Datum T.M.JJJJ (führende Nullen egal, auch JJ) gleich `heute`.
export function istHeute(text, heute) {
  const treffer = String(text ?? '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (!treffer) return false;
  const jahr = treffer[3].length === 2 ? 2000 + Number(treffer[3]) : Number(treffer[3]);
  return Number(treffer[1]) === heute.getDate() && Number(treffer[2]) === heute.getMonth() + 1 && jahr === heute.getFullYear();
}

// Ein Feld "Ort / Datum / Unterschrift": enthält den Ort (normalisiert, z.B.
// "70376 Stuttgart"), das heutige Datum (T.M.JJJJ oder TT.MM.JJ) und
// darüber hinaus eine Unterschrift. Das Datum darf nicht von weiteren
// Ziffern umgeben sein ("08.11.20260" ist kein Datum), und als Unterschrift
// zählt nur ein Rest mit Buchstaben - übrig gebliebene Ziffern eines
// falschen Datums sind keine Unterschrift (Codex-Review zu sim-5tx).
export function enthaeltOrtDatumUnterschrift(text, ort, heute) {
  const roh = String(text ?? '');
  const datum = roh.match(/(?<!\d)\d{1,2}\.\d{1,2}\.(\d{4}|\d{2})(?!\d)/);
  if (!datum || !istHeute(datum[0], heute)) return false;
  const ohneDatum = normalisiereText(roh.replace(datum[0], ' '));
  const ortNorm = normalisiereText(ort);
  if (!ohneDatum.includes(ortNorm)) return false;
  return /[a-zäöü]/.test(ohneDatum.replace(ortNorm, ''));
}

// Beste Gesamtzuordnung Sollzeile -> Benutzerzeile: `bewertung[i][j]` =
// Punkte, wenn Sollzeile i der Benutzerzeile j zugeordnet wird. Jede
// Benutzerzeile höchstens einmal. Liefert je Sollzeile den Index der
// Benutzerzeile. Nicht Zeile für Zeile die erste passende, sonst kann eine
// frühe Zeile einer späteren die richtige Partnerzeile wegnehmen.
export function ordneZu(bewertung) {
  const n = bewertung.length;
  const m = bewertung[0]?.length ?? 0;
  const memo = new Map();
  function beste(i, belegt) {
    if (i === n) return { summe: 0, wahl: [] };
    const schluessel = `${i}:${belegt}`;
    if (memo.has(schluessel)) return memo.get(schluessel);
    let ergebnis = null;
    for (let j = 0; j < m; j++) {
      if (belegt & (1 << j)) continue;
      const rest = beste(i + 1, belegt | (1 << j));
      const summe = bewertung[i][j] + rest.summe;
      if (!ergebnis || summe > ergebnis.summe) ergebnis = { summe, wahl: [j, ...rest.wahl] };
    }
    memo.set(schluessel, ergebnis);
    return ergebnis;
  }
  return beste(0, 0)?.wahl ?? [];
}

// --- Protokoll lesen ---

function findeAbschnitt(wurzel, titel) {
  return [...wurzel.querySelectorAll('.pf-abschnitt')]
    .find((a) => a.querySelector('.pf-abschnitt-titel')?.textContent === titel);
}

function findeZeile(abschnitt, label) {
  const zeilen = [...abschnitt.querySelectorAll('.pf-zeile')];
  return zeilen.find((z) => z.querySelector('.pf-label')?.textContent === label)
    ?? zeilen.find((z) => z.textContent.includes(label));
}

function findeTabellenzeile(abschnitt, label) {
  return [...abschnitt.querySelectorAll('table.pf-tabelle tr')].find((z) => z.cells[0]?.textContent === label);
}

// Ankreuz-Optionen einer Zeile (nur solche mit Kästchen).
function optionen(zeile) {
  return [...zeile.querySelectorAll('.pf-cboption')]
    .filter((o) => o.querySelector('.pf-cb'))
    .map((o) => ({ text: o.textContent.replace(/[☐☒]/g, '').trim(), an: o.querySelector('.pf-cb').textContent === '☒' }));
}

const angekreuzt = (zelle) => zelle?.querySelector('.pf-cb')?.textContent === '☒';

// --- Regeln prüfen ---

function pruefeRegel(wurzel, regel, heute, drehstrom, markiere) {
  if (regel.nurMitDrehstrom && !drehstrom) return;
  const abschnitt = findeAbschnitt(wurzel, regel.abschnitt);
  if (!abschnitt) return;

  if (['kreuz', 'nio', 'angekreuzt', 'keinKreuz'].includes(regel.art)) {
    const zeile = findeTabellenzeile(abschnitt, regel.label);
    if (!zeile) return;
    const zellen = [...zeile.querySelectorAll('.pf-cb-zelle')];
    const [io, nio] = zellen.map(angekreuzt);
    const richtig = regel.art === 'kreuz' ? io !== nio
      : regel.art === 'nio' ? nio && !io
        : regel.art === 'keinKreuz' ? !io && !nio
          : io;
    if (!richtig) zellen.forEach(markiere);
    return;
  }

  // Seite 2: Linien-Tabelle, mindestens eine ausgefüllte Zeile.
  if (regel.art === 'text') {
    const felder = [...abschnitt.querySelectorAll('input.pf-feld')];
    if (!felder.some((f) => f.value.trim() !== '')) felder.forEach(markiere);
    return;
  }

  if (regel.art === 'messgeraet') {
    const zeile = abschnitt.querySelectorAll('table.pf-tabelle tr')[1];
    regel.werte.forEach((soll, i) => {
      const input = zeile?.cells[i + 1]?.querySelector('input');
      if (input && normalisiereText(input.value) !== normalisiereText(soll)) markiere(input);
    });
    return;
  }

  const zeile = findeZeile(abschnitt, regel.label);
  if (!zeile) return;

  // Einzelne Ankreuz-Option (z.B. "Zustandsbericht erhalten").
  if (regel.art === 'option') {
    const kaestchen = zeile.querySelector('.pf-cboption .pf-cb');
    if (kaestchen?.textContent !== '☒') markiere(zeile.querySelector('.pf-cboption') ?? zeile);
    return;
  }

  if (regel.art === 'auswahl' || regel.art === 'einsAus') {
    const an = optionen(zeile).filter((o) => o.an);
    const richtig = regel.art === 'auswahl'
      ? an.length === 1 && an[0].text === regel.wert
      : an.length === 1;
    if (!richtig) markiere(zeile.querySelector('.pf-cbgroup') ?? zeile);
    return;
  }

  const felder = [...zeile.querySelectorAll('input.pf-feld, textarea')];
  if (regel.art === 'pflicht') {
    felder.filter((f) => f.value.trim() === '').forEach(markiere);
  } else if (regel.art === 'datum') {
    felder.filter((f) => !istHeute(f.value, heute)).forEach(markiere);
  } else if (regel.art === 'zahl') {
    felder.filter((f) => zahlwert(f.value) === null).forEach(markiere);
  } else if (regel.art === 'ortDatumUnterschrift') {
    felder.filter((f) => !enthaeltOrtDatumUnterschrift(f.value, regel.ort, heute)).forEach(markiere);
  } else if (regel.art === 'fest' && regel.alternativen) {
    felder.filter((f) => !regel.alternativen.some((a) => gleicherWert(f.value, a))).forEach(markiere);
  } else if (regel.art === 'fest') {
    const sollWerte = regel.werte ?? [regel.wert];
    // gleicherWert(): Zahlen (z.B. Netz 400/230, Kunden-Nr.) numerisch,
    // Text (Adressen) normalisiert.
    felder.forEach((f, i) => {
      if (sollWerte[i] !== undefined && !gleicherWert(f.value, sollWerte[i])) markiere(f);
    });
  }
}

// --- Messtabelle prüfen ---

const SPALTE_NR = 0;
const SPALTE_ZIEL = 1;
const HAUPTLEITUNG_ZEILE = 2;

// Sollzeilen aus den protokollEintragen-Schritten: [{ zeile, werte: { spalte: wert } }].
export function sollZeilenAusFahrplan(fahrplan) {
  const zeilen = new Map();
  for (const abschnitt of fahrplan?.abschnitte ?? []) {
    for (const schritt of abschnitt.schritte) {
      if (schritt.funktion !== 'protokollEintragen') continue;
      const [{ zeile, spalte }, wert] = schritt.argumente;
      if (zeile === HAUPTLEITUNG_ZEILE) continue;
      if (!zeilen.has(zeile)) zeilen.set(zeile, {});
      zeilen.get(zeile)[spalte] = wert;
    }
  }
  return [...zeilen.entries()].sort(([a], [b]) => a - b).map(([zeile, werte]) => ({ zeile, werte }));
}

function pruefeMesstabelle(wurzel, fahrplan, markiere) {
  const tabelle = wurzel.querySelector('.pf-scroll table');
  const soll = sollZeilenAusFahrplan(fahrplan);
  if (!tabelle || soll.length === 0) return;

  // Benutzerzeilen: alle Datenzeilen nach der Hauptleitung.
  const benutzer = [...tabelle.rows].slice(HAUPTLEITUNG_ZEILE + 1).map((zeile) => ({
    zeile,
    inputs: [...zeile.cells].map((c) => c.querySelector('input'))
  }));
  const wert = (b, spalte) => b.inputs[Number(spalte)]?.value ?? '';
  const vergleichsSpalten = (s) => Object.keys(s.werte).filter((sp) => ![SPALTE_NR, SPALTE_ZIEL].includes(Number(sp)));

  // Punkte = Anzahl gleicher Messwerte; kleiner Bonus für dieselbe Zeile,
  // damit bei Gleichstand (z.B. leere Zeilen) die naheliegende Zuordnung
  // gewinnt.
  const bewertung = soll.map((s) => benutzer.map((b) =>
    vergleichsSpalten(s).filter((sp) => gleicherWert(wert(b, sp), s.werte[sp])).length
    + (b.zeile.rowIndex === s.zeile ? 0.001 : 0)));
  const zuordnung = ordneZu(bewertung);

  const zugeordnet = new Set();
  soll.forEach((s, i) => {
    const b = benutzer[zuordnung[i]];
    if (!b) return;
    zugeordnet.add(b);
    for (const spalte of Object.keys(s.werte)) {
      const input = b.inputs[Number(spalte)];
      const richtig = [SPALTE_NR, SPALTE_ZIEL].includes(Number(spalte))
        ? wert(b, spalte).trim() !== ''
        : gleicherWert(wert(b, spalte), s.werte[spalte]);
      if (!richtig) markiere(input);
    }
  });

  // Ausgefüllte Zeilen ohne passenden Stromkreis: alle Einträge rot.
  for (const b of benutzer) {
    if (zugeordnet.has(b)) continue;
    b.inputs.filter((i) => i && i.value.trim() !== '').forEach(markiere);
  }
}

// --- Einstieg ---

// Entfernt alte Markierungen, prüft neu und liefert die Anzahl der rot
// markierten Felder. `drehstrom` = Anlage hat eine Drehstrom-Endstelle
// (hatDrehstromEndstelle()); ohne gilt das Rechtsdrehfeld als nicht nötig.
export function pruefeProtokoll(wurzel, { fahrplan = null, heute = new Date(), drehstrom = true } = {}) {
  wurzel.querySelectorAll('.pf-fehler').forEach((el) => el.classList.remove('pf-fehler'));
  let anzahl = 0;
  const markiere = (el) => {
    if (!el || el.classList.contains('pf-fehler')) return;
    el.classList.add('pf-fehler');
    anzahl += 1;
  };
  for (const regel of PROTOKOLL_REGELN) pruefeRegel(wurzel, regel, heute, drehstrom, markiere);
  if (fahrplan) pruefeMesstabelle(wurzel, fahrplan, markiere);
  return { anzahl };
}
