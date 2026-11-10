// Sollwerte des Prüfprotokolls außerhalb der Messtabelle (sim-0bn), aus
// docs/referenz/Pflichtfelder.md übernommen. Die Messtabelle selbst prüft
// controller/protokoll_check.js gegen die protokollEintragen-Schritte des
// Fahrplans.
//
// `abschnitt` = Titel des Protokoll-Abschnitts (view/protokoll.js), `label`
// = Feld- bzw. Prüfpunkt-Label darin. Arten:
//   fest     - Text muss passen (Vergleich ohne Groß-/Kleinschreibung,
//              Leerzeichen, Satzzeichen; "Straße" = "Str."). `werte` bei
//              mehreren Eingabefeldern in einer Zeile.
//   datum    - aktuelles Datum (T.M.JJJJ, führende Nullen egal)
//   pflicht  - irgendetwas muss drinstehen, Inhalt egal
//   auswahl  - in einer Ankreuz-Gruppe genau diese Option angekreuzt
//   einsAus  - in einer Ankreuz-Gruppe genau eine Option angekreuzt
//   kreuz    - Prüfpunkt-Tabelle: genau eins von i.O./n.i.O. angekreuzt
//   nio      - Prüfpunkt-Tabelle: n.i.O. angekreuzt (und nicht i.O.)
//   angekreuzt - Prüfpunkt-Tabelle mit nur einer Spalte: angekreuzt
//   messgeraet - erste Zeile der Messgeräte-Tabelle, `werte` = [Fabrikat, Typ]
//   zahl     - irgendeine Zahl, Wert egal (Kunden-Nr., Auftrag-Nr.)
//   keinKreuz - Prüfpunkt-Tabelle: weder i.O. noch n.i.O. angekreuzt
//              (Gebäudesystemtechnik: keine eingebaut)
//   option   - eine einzelne Ankreuz-Option der Zeile ist angekreuzt
//   text     - Linien-Tabelle (Seite 2): mindestens eine Zeile ausgefüllt
//   ortDatumUnterschrift - ein Feld mit Ort (`ort`), heutigem Datum und
//              weiterem Text als Unterschrift (Seite 2, Prüfer). Eine
//              Postleitzahl vor dem Ort ist erlaubt, aber nicht nötig.
// `alternativen` (bei fest): mehrere zulässige Schreibweisen.
// `nurMitDrehstrom`: Regel gilt nur, wenn die Anlage eine Drehstrom-
//              Endstelle hat (siehe hatDrehstromEndstelle()); sonst darf
//              das Feld leer bleiben.
//
// `quelle` = Bezeichnung in Pflichtfelder.md, falls sie vom Label im
// Formular abweicht (z.B. "Betreiber" -> "Netzbetreiber").

const K = 'Kopfdaten';
const N = 'Netz';
const B = 'Besichtigen';
const E = 'Erproben';
const D = 'Durchgängigkeit Potentialausgleich nachgewiesen';
const M = 'Verwendete Messgeräte (nach VDE 0413)';
const P = 'Prüfergebnis';
const A = 'Abschluss – Prüfer';
const AG = 'Abschluss – Auftraggeber';
const S2 = 'Abschluss';

export const PROTOKOLL_REGELN = [
  { abschnitt: K, label: 'Nr.', art: 'fest', wert: '1' },
  { abschnitt: K, label: 'Blatt', art: 'fest', werte: ['1', '1'], quelle: 'Blatt' },
  { abschnitt: K, label: 'Auftraggeber', art: 'fest', wert: 'ETZ Krefelderstr. 12 70376 Stuttgart' },
  { abschnitt: K, label: 'Kunden-Nr.', art: 'zahl' },
  { abschnitt: K, label: 'Auftrag-Nr.', art: 'zahl' },
  { abschnitt: K, label: 'Auftragnehmer', art: 'pflicht' },
  { abschnitt: K, label: 'Anlage', art: 'pflicht' },
  { abschnitt: K, label: 'Standort', art: 'pflicht' },
  { abschnitt: K, label: 'Prüfung nach', art: 'auswahl', wert: 'DIN VDE 0105-100' },
  { abschnitt: K, label: 'Art der Prüfung', art: 'auswahl', wert: 'Wiederholungsprüfung' },
  { abschnitt: K, label: 'Beginn Prüfung', art: 'datum' },
  { abschnitt: K, label: 'Ende Prüfung', art: 'datum' },
  { abschnitt: K, label: 'Beauftragter des Auftraggebers', art: 'pflicht' },
  { abschnitt: K, label: 'Prüfer', art: 'pflicht' },

  { abschnitt: N, label: 'Netz', art: 'fest', werte: ['400', '230'] },
  { abschnitt: N, label: 'Netzform', art: 'auswahl', wert: 'TN-C-S' },
  { abschnitt: N, label: 'Netzbetreiber', art: 'fest', alternativen: ['Stuttgart Netze GmbH', 'Stuttgart Netze', 'Stadtwerke Stuttgart', 'Stadtwerke Stuttgart GmbH'], quelle: 'Betreiber' },

  { abschnitt: B, label: 'Auswahl der Betriebsmittel', art: 'kreuz' },
  { abschnitt: B, label: 'Trenn- und Schaltgeräte', art: 'kreuz' },
  { abschnitt: B, label: 'Kabel, Leitungen, Stromschienen', art: 'kreuz' },
  { abschnitt: B, label: 'Kennzeichnung Stromkreis / Betriebsmittel', art: 'nio' },
  { abschnitt: B, label: 'Kennzeichnung N- und PE-Leiter', art: 'nio' },
  { abschnitt: B, label: 'Leiterverbindungen', art: 'kreuz' },
  { abschnitt: B, label: 'Schutz- und Überwachungseinrichtungen', art: 'kreuz' },
  { abschnitt: B, label: 'Basisschutz (Schutz gegen direktes Berühren)', art: 'kreuz' },
  { abschnitt: B, label: 'Zugänglichkeit', art: 'kreuz' },
  { abschnitt: B, label: 'Schutzpotentialausgleich', art: 'kreuz' },
  { abschnitt: B, label: 'Zusätzl. örtl. Potentialausgleich', art: 'kreuz' },
  { abschnitt: B, label: 'Dokumentation / siehe Ergänzungsblätter', art: 'nio', quelle: 'Dokumentation' },
  { abschnitt: B, label: 'Gebäudesystemtechnik', art: 'keinKreuz' },

  { abschnitt: E, label: 'Funktionsprüfung der Anlage', art: 'kreuz' },
  { abschnitt: E, label: 'FI-Schutzschalter (RCD)', art: 'kreuz' },
  { abschnitt: E, label: 'Funktion der Schutz-, Sicherheits- und Überwachungseinrichtungen', art: 'kreuz' },
  { abschnitt: E, label: 'Rechtsdrehfeld (Drehstromsteckdosen)', art: 'kreuz', nurMitDrehstrom: true },
  { abschnitt: E, label: 'Überprüfung Spannungsfall', art: 'kreuz' },
  { abschnitt: E, label: 'Gebäudesystemtechnik', art: 'keinKreuz' },

  { abschnitt: D, label: 'Hauptschutzleiter', art: 'angekreuzt' },

  { abschnitt: M, label: 'Messgerät', art: 'messgeraet', werte: ['Benning', 'IT 130'], quelle: ['Fabrikat', 'Typ'] },

  { abschnitt: P, label: 'Ergebnis', art: 'einsAus' },
  { abschnitt: P, label: 'Prüf-Plakette angebracht', art: 'einsAus' },
  { abschnitt: P, label: 'Nächster Prüftermin', art: 'pflicht' },

  { abschnitt: AG, label: 'Übergabebericht: Anlage vollständig übernommen', art: 'option', quelle: 'Anlage vollständig übernommen' },
  { abschnitt: AG, label: 'Zustandsbericht erhalten', art: 'option' },

  { abschnitt: A, label: 'Anlage entspricht den anerkannten Regeln der Elektrotechnik', art: 'einsAus' },
  { abschnitt: A, label: 'Ort', art: 'fest', alternativen: ['Stuttgart', '70376 Stuttgart'] },
  { abschnitt: A, label: 'Datum', art: 'datum' },
  { abschnitt: A, label: 'Unterschrift', art: 'pflicht' },

  // Seite 2 (Übergabe-/Zustandsbericht). Der Prüfer unterschreibt immer,
  // der Auftraggeber nicht.
  { abschnitt: 'Mängel', label: 'Mängel', art: 'text' },
  { abschnitt: 'Beurteilung', label: 'Beurteilung', art: 'text' },
  { abschnitt: S2, label: 'Auftraggeber: Anlage vollständig übernommen', art: 'option', quelle: 'Anlage vollständig übernommen' },
  { abschnitt: S2, label: 'Zustandsbericht erhalten', art: 'option' },
  { abschnitt: S2, label: 'Prüfer: Anlage entspricht anerkannten Regeln', art: 'einsAus', quelle: 'Anlage entspricht anerkannten Regeln' },
  { abschnitt: S2, label: 'Ort / Datum / Unterschrift (Prüfer)', art: 'ortDatumUnterschrift', ort: 'Stuttgart' }
];

// Endstellen, an denen das Rechtsdrehfeld geprüft wird: Drehstromsteckdose
// und Herdanschlussdose (5-polige Anschlussdose).
export const DREHSTROM_ENDSTELLEN = ['Drehstromsteckdose', '5-polige Anschlussdose'];

// Hat die Anlage (anlage.json) mindestens eine Drehstrom-Endstelle? Typ je
// Stromkreis (`endstelle`) oder je Dose (`steckdosen_platzierung[].endstelle`).
export function hatDrehstromEndstelle(anlage) {
  const typen = [
    ...(anlage?.hutschienen ?? []).flatMap((h) => h.gruppen.flatMap((g) => g.stromkreise.map((sk) => sk.endstelle))),
    ...(anlage?.steckdosen_platzierung ?? []).map((p) => p.endstelle)
  ];
  return typen.some((t) => DREHSTROM_ENDSTELLEN.includes(t));
}
