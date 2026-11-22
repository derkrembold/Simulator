// Abschaltbedingung des Überstromschutzes (Zi/Zs-Messung): gemeinsame
// Rechnung für die Ampel des Messgeräts (controller/app.js über
// view/messgeraet.js) und den Fahrplan-Generator
// (tools/pruefprotokoll_erstellung.js).
//
// Lim = Ia = Auslösefaktor je LS-Charakteristik × Bemessungsstrom (z.B. C16:
// 10 × 16 A = 160 A). Das Messgerät zeigt Isc = 0,9 · U0 / Z und schaltet die
// Ampel grün, wenn Isc ≥ Lim.
//
// 2/3-Regel (sim-g0o, VDE 0100-600 D.6.4.3.7.2): Weil die Leiterwiderstände
// im Betrieb durch die Temperatur steigen, muss die gemessene Impedanz
// Z ≤ 2/3 · U0 / Ia sein. Liegt Z darüber, ist das ein Mangel. Zeigt das
// Gerät dabei noch grün, muss der Prüfling ihn selbst erkennen; zeigt es rot,
// ist die Abschaltbedingung gar nicht erfüllt, auch das ist ein Mangel. Die
// Grenze grün/rot spielt für den Mangel deshalb keine Rolle, so kann der
// gerundete Protokollwert dort nicht falsch entscheiden. Kein zusätzlicher
// 0,9-Faktor (Entscheidung Mensch).

export const U0_V = 230;
export const ISC_FAKTOR = 0.9;
export const ZWEI_DRITTEL = 2 / 3;

// NV/gG-Faktoren können sich noch ändern (vom Anwender als vorläufig markiert).
export const LIM_FAKTOR_NACH_LS_TYP = {
  B: 5, C: 10, D: 20, K: 15, Z: 3, L: 5.25, U: 12, NV: 12, gG: 12
};

// Lim in Ampere. `bemessungsstrom` als Zahl oder Text ("16", "16A").
export function berechneLim(lsTyp, bemessungsstrom) {
  return LIM_FAKTOR_NACH_LS_TYP[lsTyp] * parseFloat(bemessungsstrom);
}

// Bewertung einer gemessenen Impedanz `z` (Ω):
//   isc         - angezeigter Kurzschlussstrom 0,9 · U0 / z
//   ampelGruen  - isc ≥ Lim (wie das Messgerät)
//   grenzeZ     - größte zulässige Impedanz nach der 2/3-Regel
//   mangel      - z > grenzeZ (Ampel grün oder rot)
export function bewerteAbschaltung(z, lsTyp, bemessungsstrom) {
  const lim = berechneLim(lsTyp, bemessungsstrom);
  const isc = (ISC_FAKTOR * U0_V) / z;
  const ampelGruen = isc >= lim;
  const grenzeZ = (ZWEI_DRITTEL * U0_V) / lim;
  return { lim, isc, ampelGruen, grenzeZ, mangel: z > grenzeZ };
}
