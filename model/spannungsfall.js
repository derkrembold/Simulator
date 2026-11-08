// Spannungsfall ΔU (sim-lgf): eine gemeinsame Berechnung und Bewertung für
// die Anzeige/Ampel des Messgeräts (controller/app.js) und - über den
// angezeigten Wert - für das Prüfprotokoll (tools/pruefprotokoll_erstellung.js).
//
// ΔU % = (Z - Zref) * In / Un * 100, auf zwei Nachkommastellen gerundet wie
// in der Anzeige. Bewertet wird der gerundete Wert: bis einschließlich zum
// Grenzwert i.O. - so können Ampel und Protokoll am Grenzwert nicht
// voneinander abweichen (z.B. 3,504 % wird als 3,50 % angezeigt und ist bei
// 3,5 % i.O.).

export const NENNSPANNUNG_V = 230;

export function berechneSpannungsfall(z, zref, bemessungsstromA, grenzwertProzent) {
  const roh = ((z - zref) * bemessungsstromA / NENNSPANNUNG_V) * 100;
  const prozent = Math.round(roh * 100) / 100;
  return { prozent, io: prozent <= grenzwertProzent };
}
