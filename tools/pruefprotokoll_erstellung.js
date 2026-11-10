// Entwickler-Skill (User-Vorgabe, 2026-07-31): erster Baustein des
// automatisierten Prüfprozesses (siehe ARCHITEKTUR.md "Entwickler-Skills",
// docs/BEDIENERPROZESS.md). Geht für eine Anlage Stromkreis für Stromkreis
// durch, führt die nötigen Messungen über tools/messgeraet_steuerung.js
// (via tools/fahrplan_rekorder.js aufgezeichnet) durch und füllt damit die
// Stromkreisverteiler-Tabelle in view/protokoll.js, exportiert das
// Ergebnis als PDF.
//
// Aufruf:
//   node tools/pruefprotokoll_erstellung.js <testcase> [ausgabeordner]
//
// Alle Sonden werden über die NETZ-ID aus anlage.json platziert, nicht über
// geratene Bauteilnamen (z.B. "Reihenklemme_L_SK1") - deren
// Namenskonvention unterscheidet sich zwischen einphasigen ("..._L_SK2")
// und mehrphasigen Stromkreisen ("..._L1_SK1"/"_L2_SK1"/"_L3_SK1", siehe
// testcase_05 SK1) und ist daher nicht zuverlässig testcase-übergreifend
// vorhersagbar (siehe ARCHITEKTUR.md, Fund vom 2026-07-31 bei der
// testcase_05-Verallgemeinerung).
const fs = require('fs');
const path = require('path');
const { erstelleRekorder } = require('./fahrplan_rekorder.js');
const basis = require('./messgeraet_steuerung.js');
const messgeraet = erstelleRekorder(basis);

const PROJEKT_ROOT = path.resolve(__dirname, '..');

// Spaltenindex in der Stromkreisverteiler-Tabelle (siehe view/protokoll.js
// STROMKREIS_GRUPPEN) - hier hart hinterlegt statt importiert, da
// view/protokoll.js ein ES-Modul ist (kein require() in einem
// CommonJS-Tool ohne Bundler) und sich die Spaltenreihenfolge nur selten
// ändert. Bei einer Änderung an STROMKREIS_GRUPPEN muss diese Liste
// mitgepflegt werden.
const SPALTE = {
  nr: 0, ziel: 1, kabelTyp: 2, kabelAnzahl: 3, kabelQuerschnitt: 4,
  rpe: 5, risoOhne: 6, risoMit: 7,
  ueArt: 8, ueIn: 9, zs: 10, ik: 11, zi: 12, ikLn: 13,
  rcdInArt: 14, rcdIdn: 15, rcdImess: 16, rcdAuslZeit: 17, rcdUmess: 18
};

// Extrahiert den reinen Zahlenwert aus einer Messgerät-Anzeige wie
// "R:0,54Ω", "Isc:383,3A", ">999MΩ" oder "230V" - Label (falls vorhanden)
// und Einheit werden entfernt, das führende ">" bei ">999..." bleibt
// erhalten.
function nurZahl(text) {
  if (text == null) return '';
  const ohneLabel = text.replace(/^[^\d>]*:/, '');
  return ohneLabel.replace(/[a-zA-ZΩµ%]+$/, '').trim();
}

// Netz-IDs der Endstellen-Ader für eine bestimmte Funktion (z.B. 'N', 'PE',
// oder die erste Phase eines Stromkreises) - direkt aus anlage.json, siehe
// Kommentar oben zur Namenskonvention-Problematik.
function aderNetz(sk, funktion) {
  return sk.leitung.adern.find((a) => a.funktion === funktion).netz;
}

// Nächstgelegene Trennstelle zwischen Endstelle und Einspeisung (der LS
// selbst, falls AFDD-Kombigerät oder die Gruppe keinen RCD hat, sonst das
// Gruppen-RCD) - deren Schraube
// MUSS vor RISO geöffnet werden, UNABHÄNGIG davon, ob dieses konkrete
// Bauteil selbst Typ B/AFDD ist. Grund (Fund vom 2026-07-31, beim
// Verallgemeinern auf testcase_05): der Hauptschalter allein reicht NICHT
// als "spannungsfrei"-Maßnahme, wenn eine ANDERE RCD-Gruppe auf derselben
// Sammelschiene (gleiche Phase, gleicher Ausgang des Hauptschalters) ein
// Typ-B/AFDD-Gerät enthält - `findeBauteileAufPfad()` durchsucht die ganze
// Zusammenhangskomponente der Sonde, und der Hauptschalter trennt zwei
// GESCHWISTER-Gruppen nicht voneinander, nur von der Einspeisung. Die
// eigene Gruppen-Schraube (RCD oder LS) dagegen isoliert den Stromkreis
// zuverlässig von JEDER anderen Gruppe UND macht ihn nebenbei spannungsfrei
// - unabhängig vom eigenen Gerätetyp. Der LS hat Vorrang vor dem RCD, da er
// näher an der Endstelle sitzt (eine offene Schraube schneidet automatisch
// auch alles weiter stromaufwärts ab).
// `phasen` = die Außenleiter, an denen gemessen wird: deren Schrauben
// werden geöffnet (`netze`, eine pro Außenleiter). Nur diese, weil die App
// höchstens zwei gelöste Schrauben gleichzeitig erlaubt
// (SCHRAUBENDREHER_MAX_GELOEST in controller/app.js) - bei einem
// Riso-Messpaar sind es nie mehr als zwei.
function naechsteTrennstelle(sk, gruppe, phasen) {
  const netze = sk.ls.eingang.leitung.adern
    .filter((a) => sk.phasen.includes(a.funktion) && phasen.includes(a.funktion))
    .map((a) => a.netz);
  if (sk.ls.afdd) return { bauteil: sk.ls.name, netze, istLeckageQuelle: true };
  if (gruppe.rcd) {
    const istTypBOderAfdd = gruppe.rcd.typ === 'B' || gruppe.rcd.typ === 'B+';
    return { bauteil: gruppe.rcd.name, netze, istLeckageQuelle: istTypBOderAfdd };
  }
  // Ohne RCD trennt nur der LS den Stromkreis von der Sammelschiene. Sonst
  // erreicht die Sonde über die Sammelschiene einen RCD Typ B/AFDD einer
  // anderen Gruppe und misst dessen Elektronik mit (sim-f7j).
  return { bauteil: sk.ls.name, netze, istLeckageQuelle: false };
}

// Riso-Messpaare (Schwarz/Blau): jeder Außenleiter gegen N und gegen PE,
// bei mehrphasigen Stromkreisen zusätzlich jedes Außenleiter-Paar
// gegeneinander. Grün sitzt immer an PE, weil die App das verlangt; in den
// Messwert gehen nur Schwarz und Blau ein (siehe risoTestKlick() in
// controller/app.js). PE behandelt die App wie N an der Einspeisung
// (risoEffektiveAder()), L-PE liefert deshalb denselben Wert wie L-N.
function risoPaare(sk) {
  const paare = [
    ...sk.phasen.map((phase) => ({ name: `${phase}-N`, schwarz: phase, blau: 'N' })),
    ...sk.phasen.map((phase) => ({ name: `${phase}-PE`, schwarz: phase, blau: 'PE' }))
  ];
  for (let i = 0; i < sk.phasen.length; i++) {
    for (let j = i + 1; j < sk.phasen.length; j++) {
      paare.push({ name: `${sk.phasen[i]}-${sk.phasen[j]}`, schwarz: sk.phasen[i], blau: sk.phasen[j] });
    }
  }
  return paare;
}

// Kleinster Riso-Wert als Anzeigetext (">999" zählt als unendlich). Ein
// Wert ohne Zahl (z.B. "---", Spannung lag an) wird unverändert
// zurückgegeben, damit er im Protokoll sichtbar bleibt.
function kleinsterRiso(werte) {
  const alsZahl = (w) => (w.startsWith('>') ? Infinity : parseFloat(w.replace(',', '.')));
  const ungueltig = werte.find((w) => Number.isNaN(alsZahl(w)));
  if (ungueltig !== undefined) return ungueltig;
  return werte.reduce((min, w) => (alsZahl(w) < alsZahl(min) ? w : min));
}

// Messung des Außenleiters mit der höchsten Schleifenimpedanz (`groesse` =
// 'zi' oder 'zs'). Ihr Ik gehört zum selben Außenleiter, weil Ik aus Z
// berechnet wird - deshalb wird die ganze Messung zurückgegeben, nicht nur
// der Z-Wert. Bei Gleichstand gewinnt der erste Außenleiter. Ist bei einem
// Außenleiter Z oder Ik keine Zahl (z.B. "---", Messung fehlgeschlagen),
// wird dessen Messung zurückgegeben, damit der Fehler im Protokoll
// sichtbar bleibt (wie bei kleinsterRiso()).
function schlechtesteMessung(messungen, groesse) {
  const ikFeld = groesse === 'zi' ? 'ikLn' : 'ik';
  const zahl = (w) => parseFloat(String(w).replace(',', '.'));
  const ungueltig = messungen.find((m) => Number.isNaN(zahl(m[groesse])) || Number.isNaN(zahl(m[ikFeld])));
  if (ungueltig) return ungueltig;
  return messungen.reduce((schlechteste, m) => (zahl(m[groesse]) > zahl(schlechteste[groesse]) ? m : schlechteste));
}

async function trennstelleUmschalten(ctx, trennstelle) {
  for (const netz of trennstelle.netze) await messgeraet.schraubeSchalten(ctx, trennstelle.bauteil, netz);
}

// Startzustand eines Abschnitts. Das Werkzeug misst jeden Abschnitt in einer
// frischen Testumgebung (Grundzustand: Hauptschalter ein), beim Replay
// laufen dagegen alle Abschnitte nacheinander auf derselben Anlage. Liegt
// ein Abschnitt im freigeschalteten Block (Hauptschalter aus, siehe
// berechneProtokoll()), wird dieser Zustand hier direkt über `basis`
// hergestellt - nicht über den Rekorder, denn im Replay ist die Anlage an
// dieser Stelle schon freigeschaltet.
async function starteAbschnitt(testcase, anlage, { freigeschaltet = false } = {}) {
  const ctx = await basis.starteTestUmgebung(testcase);
  if (freigeschaltet) await basis.hebelSchalten(ctx, anlage.hauptsicherung.name);
  return ctx;
}

// Adern an der Einspeisung: je Leiter des Hauptschalter-Eingangs die
// Einspeiseklemme (l1_klemme ... n_klemme), falls die Anlage für diesen
// Leiter eine hat, sonst der Eingang des Hauptschalters selbst (z.B.
// testcase_02: nur eine N-Klemme, L1 direkt auf den Hauptschalter). PE von
// der PE-Klemme.
function einspeisungAdern(anlage) {
  const adern = anlage.hauptsicherung.eingang.leitung.adern.map((ader) => {
    const klemme = anlage[`${ader.funktion.toLowerCase()}_klemme`];
    return klemme?.vorhanden ? klemme.eingang.leitung.adern[0] : ader;
  });
  // Ein 3-poliger Hauptschalter hat keinen N-Pol, N kommt dann nur über die
  // N-Klemme.
  if (!adern.some((a) => a.funktion === 'N') && anlage.n_klemme?.vorhanden) {
    adern.push(anlage.n_klemme.eingang.leitung.adern[0]);
  }
  return {
    aussenleiter: adern.filter((a) => a.funktion.startsWith('L')),
    n: adern.find((a) => a.funktion === 'N'),
    pe: anlage.pe_klemme.eingang.leitung.adern[0]
  };
}

// Sondensätze (Schwarz/Blau/Grün) für die Spannung an der Einspeisung: je
// Außenleiter L/N/PE (zeigt L-N, L-PE, N-PE), bei Drehstrom zusätzlich
// L1/L2/L3 (zeigt die drei Außenleiterspannungen). Ein Sondensatz je
// Abschnitt, weil die App die Sondenfarben in Klickreihenfolge vergibt.
function einspeisungSondensaetze(anlage) {
  const { aussenleiter, n, pe } = einspeisungAdern(anlage);
  const saetze = aussenleiter.map((l) => ({
    name: `${l.funktion}/N/PE`,
    netze: [l.netz, n.netz, pe.netz],
    paare: [`${l.funktion}-N`, `${l.funktion}-PE`, 'N-PE']
  }));
  if (aussenleiter.length === 3) {
    saetze.push({
      name: 'L1/L2/L3',
      netze: aussenleiter.map((l) => l.netz),
      paare: ['L1-L2', 'L1-L3', 'L2-L3']
    });
  }
  return saetze;
}

async function leseSpannungen(ctx, paare) {
  const werte = [];
  for (const feld of ['uln', 'ulpe', 'unpe']) werte.push(nurZahl(await messgeraet.leseWert(ctx, feld)));
  return paare.map((paar, i) => ({ paar, wert: werte[i] }));
}

async function messeEinspeisung(testcase, anlage, satz, { erster }) {
  const ctx = await starteAbschnitt(testcase, anlage, { freigeschaltet: !erster });
  messgeraet.abschnittBeginnen(
    `Einspeisung ${satz.name}: Spannung prüfen`,
    erster
      ? 'Orientierung vor der Prüfung: Hauptschalter aus, dann an den Einspeiseklemmen messen, ob die Versorgung vorhanden und plausibel ist (230 V gegen N und PE, 400 V zwischen den Außenleitern, keine Spannung zwischen N und PE). Die eigene Anlage bleibt dabei ausgeschaltet.'
      : 'Weiter an den Einspeiseklemmen, Hauptschalter bleibt aus.'
  );
  if (erster) await messgeraet.hebelSchalten(ctx, anlage.hauptsicherung.name);
  await messgeraet.drehknopfAufModus(ctx, 'V~');
  for (const netz of satz.netze) await messgeraet.messspitzeSetzen(ctx, { netz });
  const spannungen = await leseSpannungen(ctx, satz.paare);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return spannungen;
}

// Referenzstelle für Zref: Ausgang des Hauptschalters (L1 bzw. erster
// Außenleiter, N). Ein 3-poliger Hauptschalter hat keinen N-Pol, N dann
// wie an der Einspeisung (N-Klemme).
function zrefAdern(anlage) {
  const ausgang = anlage.hauptsicherung.ausgang.leitung.adern;
  return {
    l: ausgang.find((a) => a.funktion.startsWith('L')),
    n: ausgang.find((a) => a.funktion === 'N') ?? einspeisungAdern(anlage).n
  };
}

// Zref für die Spannungsfallmessung (sim-liq, Ablauf aus der Anleitung des
// Messgeräts): ZI, Unterfunktion ΔU, Messspitzen nach dem Hauptschalter auf
// L, N und PE, CAL. Danach zurück zur normalen ZI-Ansicht, damit die
// folgenden Zi-Abschnitte (auch im Replay) in derselben Ansicht beginnen.
async function messeZref(testcase, anlage) {
  const { l, n } = zrefAdern(anlage);
  const ctx = await starteAbschnitt(testcase, anlage);
  messgeraet.abschnittBeginnen(
    'Zref am Verteiler',
    'Für die Spannungsfallmessung die Referenzimpedanz Zref direkt nach dem Hauptschalter messen: Drehknopf auf ZI, Unterfunktion ΔU, Messspitzen auf L, N und PE, Taste CAL. Zref bleibt im Messgerät gespeichert. Danach zurück zur normalen ZI-Ansicht.'
  );
  await messgeraet.drehknopfAufModus(ctx, 'ZI');
  await messgeraet.wechsleAnsicht(ctx);
  await messgeraet.messspitzeSetzen(ctx, { netz: l.netz }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: n.netz }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.calDruecken(ctx);
  const zref = nurZahl(await messgeraet.leseWert(ctx, 'zref'));
  await messgeraet.wechsleAnsicht(ctx);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return zref;
}

async function schalteHauptschalter(testcase, anlage, { titel, begruendung, freigeschaltet }) {
  const ctx = await starteAbschnitt(testcase, anlage, { freigeschaltet });
  messgeraet.abschnittBeginnen(titel, begruendung);
  await messgeraet.hebelSchalten(ctx, anlage.hauptsicherung.name);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
}

// Endstellen (Dosen im Steckdosen-View) eines Stromkreises, als
// "Reihe-Spalte" wie `data-endstelle` in view/steckdosen.js.
function endstellenVon(anlage, sk) {
  return (anlage.steckdosen_platzierung ?? [])
    .filter((p) => p.sk === sk.bezeichnung)
    .map((p) => `${p.row}-${p.col}`);
}

// Zuordnung einer Endstelle: an der Endstelle Spannung messen, den LS des
// Stromkreises aus- und wieder einschalten. Fällt die Spannung dabei weg,
// gehört die Endstelle zu diesem LS.
async function messeZuordnung(testcase, anlage, sk, endstelle) {
  const ctx = await starteAbschnitt(testcase, anlage);
  messgeraet.abschnittBeginnen(
    `Zuordnung Endstelle ${endstelle}: ${sk.ls.name}`,
    `Welcher Stromkreis versorgt diese Endstelle? Spannung an der Endstelle messen, dann ${sk.ls.name} aus- und wieder einschalten. Fällt die Spannung weg, gehört die Endstelle zu ${sk.ls.name} (${sk.bezeichnung}). Für die Zuordnung den LS schalten, nicht den RCD: der schaltet die ganze Gruppe.`
  );
  await messgeraet.drehknopfAufModus(ctx, 'V~');
  await messgeraet.messspitzeSetzen(ctx, { endstelle, netz: aderNetz(sk, sk.phasen[0]) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { endstelle, netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { endstelle, netz: aderNetz(sk, 'PE') }); // grün
  const vorher = nurZahl(await messgeraet.leseWert(ctx, 'uln'));
  await messgeraet.hebelSchalten(ctx, sk.ls.name);
  const lsAus = nurZahl(await messgeraet.leseWert(ctx, 'uln'));
  await messgeraet.hebelSchalten(ctx, sk.ls.name);
  const lsWiederEin = nurZahl(await messgeraet.leseWert(ctx, 'uln'));
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { endstelle, sk: sk.bezeichnung, vorher, lsAus, lsWiederEin };
}

// Spannungsfreiheit an den Abgangsklemmen eines Stromkreises, je
// Außenleiter L/N/PE, bei Drehstrom zusätzlich L1/L2/L3.
function spannungsfreiheitSondensaetze(sk) {
  const saetze = sk.phasen.map((phase) => ({
    name: `${phase}/N/PE`,
    netze: [aderNetz(sk, phase), aderNetz(sk, 'N'), aderNetz(sk, 'PE')],
    paare: [`${phase}-N`, `${phase}-PE`, 'N-PE']
  }));
  if (sk.phasen.length === 3) {
    saetze.push({ name: 'L1/L2/L3', netze: sk.phasen.map((p) => aderNetz(sk, p)), paare: ['L1-L2', 'L1-L3', 'L2-L3'] });
  }
  return saetze;
}

// Spannungsfreiheit an einer Messstelle: an den Abgangsklemmen (vor Riso,
// `endstelle` = null) oder an einer Endstelle (vor Rpe).
async function messeSpannungsfreiheit(testcase, anlage, sk, satz, endstelle = null) {
  const ctx = await starteAbschnitt(testcase, anlage, { freigeschaltet: true });
  messgeraet.abschnittBeginnen(
    endstelle
      ? `${sk.bezeichnung} Endstelle ${endstelle} ${satz.name}: Spannungsfreiheit feststellen`
      : `${sk.bezeichnung} Abgangsklemmen ${satz.name}: Spannungsfreiheit feststellen`,
    endstelle
      ? 'Vor Rpe an dieser Endstelle allpolig prüfen, dass keine Spannung anliegt.'
      : 'Vor Riso an den Abgangsklemmen allpolig prüfen, dass keine Spannung anliegt. Gegen Wiedereinschalten sichern.'
  );
  await messgeraet.drehknopfAufModus(ctx, 'V~');
  for (const netz of satz.netze) await messgeraet.messspitzeSetzen(ctx, endstelle ? { endstelle, netz } : { netz });
  const spannungen = await leseSpannungen(ctx, satz.paare);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return spannungen.map((m) => ({ ...m, ort: endstelle ?? 'Abgangsklemmen' }));
}

// Rpe an einer Endstelle (PE-Kontakt der Dose gegen die PE-Klemme). Ohne
// Endstelle (Anlage ohne Steckdosen-Platzierung) an der Abgangsklemme.
async function messeRpe(testcase, anlage, sk, endstelle) {
  const ctx = await starteAbschnitt(testcase, anlage, { freigeschaltet: true });
  messgeraet.abschnittBeginnen(
    endstelle ? `${sk.bezeichnung} Endstelle ${endstelle}: Rpe (PE-Durchgang)` : `${sk.bezeichnung}: Rpe (PE-Durchgang)`,
    'Anlage ist freigeschaltet. Durchgang des Schutzleiters vom PE-Kontakt der Endstelle bis zur PE-Klemme im Verteiler messen.'
  );
  await messgeraet.drehknopfAufModus(ctx, 'RLOW');
  await messgeraet.messspitzeSetzen(ctx, endstelle ? { endstelle, netz: aderNetz(sk, 'PE') } : { netz: aderNetz(sk, 'PE') });
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' });
  const wert = await messgeraet.leseWert(ctx, 'hauptmesswert');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { endstelle: endstelle ?? null, wert: nurZahl(wert) };
}

// Größter Rpe-Wert als Anzeigetext. Ein Wert ohne Zahl bleibt sichtbar (wie
// bei kleinsterRiso()).
function groessterRpe(werte) {
  const zahl = (w) => parseFloat(String(w).replace(',', '.'));
  const ungueltig = werte.find((w) => Number.isNaN(zahl(w)));
  if (ungueltig !== undefined) return ungueltig;
  return werte.reduce((max, w) => (zahl(w) > zahl(max) ? w : max));
}

async function messeRisoOhne(testcase, anlage, sk, gruppe, paar) {
  const trennstelle = naechsteTrennstelle(sk, gruppe, [paar.schwarz, paar.blau]);

  const ctx = await starteAbschnitt(testcase, anlage, { freigeschaltet: true });
  messgeraet.abschnittBeginnen(
    `${sk.bezeichnung} ${paar.name}: Riso Verbraucher ohne`,
    trennstelle
      ? (trennstelle.istLeckageQuelle
        ? `Anlage ist freigeschaltet. Da ${trennstelle.bauteil} ein RCD Typ B/AFDD ist, dessen Schraube auf dieser Phase öffnen, um den inneren (elektronischen) Widerstand zu umgehen (siehe BEDIENERPROZESS.md "Riso Verbraucher ohne"), nach der Messung wieder eindrehen.`
        : `Anlage ist freigeschaltet. Schraube von ${trennstelle.bauteil} öffnen, damit Geschwister-Stromkreise auf derselben Sammelschiene die Messung nicht verfälschen, nach der Messung wieder eindrehen.`)
      : 'Anlage ist freigeschaltet, kein RCD auf diesem Stromkreis - an den Abgangsklemmen messen.'
  );
  // Die Schraube wird nur bei freigeschalteter Anlage gelöst und eingedreht
  // (User-Vorgabe 2026-08-06, "Freischalten zuerst").
  if (trennstelle) await trennstelleUmschalten(ctx, trennstelle);
  await messgeraet.drehknopfAufModus(ctx, 'RISO');
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, paar.schwarz) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, paar.blau) }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  // Direkt über `basis`, nicht über den Rekorder: das Auslesen ist kein
  // Bedienschritt und gehört nicht in den Fahrplan.
  const { schwarz: schwarzNetz, blau: blauNetz } = await basis.platzierteMessspitzen(ctx);
  await messgeraet.testDruecken(ctx);
  const wert = await messgeraet.leseWert(ctx, 'hauptmesswert');
  // Trennstelle wieder schließen. `schraubeSchalten()` schaltet wie am
  // echten Gerät nur um, deshalb derselbe Aufruf wie beim Öffnen.
  if (trennstelle) await trennstelleUmschalten(ctx, trennstelle);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { paar: paar.name, wert: nurZahl(wert), schwarzNetz, blauNetz };
}

// Abschnittstitel-Präfix: bei mehrphasigen Stromkreisen mit Außenleiter
// ("SK1 L2"), damit die drei Messungen im Fahrplan unterscheidbar sind.
function messstelle(sk, phase) {
  return sk.phasen.length > 1 ? `${sk.bezeichnung} ${phase}` : sk.bezeichnung;
}

async function messeUeberstromschutz(testcase, sk, phase) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `${messstelle(sk, phase)}: Überstromschutz (Zs)`,
    `Anlage normal energisiert (kein Abklemmen nötig) - LS-Typenschild (${sk.ls.char}/${sk.ls.in}A) am Messgerät einstellen, dann Schleifenimpedanz messen.`
  );
  await messgeraet.drehknopfAufModus(ctx, 'ZS');
  await messgeraet.stelleEin(ctx, 'lsTyp', sk.ls.char);
  await messgeraet.stelleEin(ctx, 'bemessungsstrom', `${sk.ls.in}A`);
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, phase) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const zs = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const ik = await messgeraet.leseWert(ctx, 'isc');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { zs: nurZahl(zs), ik: nurZahl(ik) };
}

// Zs der Hauptleitung (sim-aon): dort messen, wo die Stromzufuhr von außen
// kommt (Einspeiseklemme bzw. Eingang des Hauptschalters, siehe
// einspeisungAdern()), L-PE je Außenleiter. Die Einspeisung führt immer
// Spannung, der Zustand des Hauptschalters spielt keine Rolle.
async function messeHauptleitungZs(testcase, anlage, ader) {
  const { n } = einspeisungAdern(anlage);
  const ctx = await starteAbschnitt(testcase, anlage);
  messgeraet.abschnittBeginnen(
    `Hauptleitung ${ader.funktion}: Schleifenimpedanz (Zs)`,
    'An der Einspeisung, wo die Zuleitung von außen ankommt, die Schleifenimpedanz L-PE messen: Drehknopf auf ZS, Messspitzen auf den Außenleiter, N und PE, TEST.'
  );
  await messgeraet.drehknopfAufModus(ctx, 'ZS');
  await messgeraet.messspitzeSetzen(ctx, { netz: ader.netz }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: n.netz }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const zs = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const ik = await messgeraet.leseWert(ctx, 'isc');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { phase: ader.funktion, zs: nurZahl(zs), ik: nurZahl(ik) };
}

// Kabelangaben der Hauptleitung (Zuleitung von außen): Aderanzahl aus
// Außenleitern, N und PE an der Einspeisung, Querschnitt des kleinsten
// Außenleiters.
function hauptleitungKabel(anlage) {
  const { aussenleiter, n, pe } = einspeisungAdern(anlage);
  const adern = [...aussenleiter, n, pe].filter(Boolean);
  const querschnitt = Math.min(...aussenleiter.map((a) => a.querschnitt_mm2));
  return {
    kabelTyp: anlage.hauptsicherung.eingang.leitung.typ,
    kabelAnzahl: String(adern.length),
    kabelQuerschnitt: String(querschnitt).replace('.', ',')
  };
}

// Zi (L-N-Schleifenimpedanz statt L-PE wie bei Zs) - Modus ZI, nur Schwarz
// (L)/Blau (N) nötig, PE spielt hier keine Rolle (siehe ziTestKlick() in
// controller/app.js).
// Grenzwert für den Spannungsfall (docs/BEDIENERPROZESS.md "Überprüfung
// Spannungsfall": unter 3,5 %), wird am Messgerät in der ΔU-Ansicht
// eingestellt (Ampel) und entscheidet i.O./n.i.O. im Protokoll.
const SPANNUNGSFALL_GRENZWERT_PROZENT = 3.5;

// Zi und, mit denselben Messspitzen, der Spannungsfall ΔU (sim-lgf): nach
// der Zi-Messung in die ΔU-Ansicht wechseln, Grenzwert einstellen, TEST.
// ΔU braucht das vorher per CAL gemessene Zref (Abschnitt "Zref am
// Verteiler"). Danach zurück zur Zl-Ansicht.
// Stellt in einer frischen Testumgebung den Zustand her, den das Replay
// nach dem Abschnitt "Zref am Verteiler" hat: Zref im Messgerät
// gespeichert. Direkt über `basis` (nicht aufgezeichnet). Danach Messgerät
// aus und wieder ein - das entfernt die Hilfs-Messspitzen und setzt die
// Einstellungen zurück, Zref bleibt gespeichert (controller/app.js
// setzeBearbeitungenZurueck()). `ctx` wird auf diesen Stand nachgeführt.
async function bereiteZrefVor(ctx, anlage) {
  const grundwerte = { ...ctx.werte };
  const { l, n } = zrefAdern(anlage);
  await basis.drehknopfAufModus(ctx, 'ZI');
  await basis.wechsleAnsicht(ctx);
  await basis.messspitzeSetzen(ctx, { netz: l.netz });
  await basis.messspitzeSetzen(ctx, { netz: n.netz });
  await basis.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' });
  await basis.calDruecken(ctx);
  await ctx.page.getByText('ON/OFF', { exact: true }).click();
  await ctx.page.getByText('ON/OFF', { exact: true }).click();
  Object.assign(ctx, { modus: 'ZI', ansicht: 'standard', zone: 0, werte: grundwerte });
}

async function messeZi(testcase, anlage, sk, phase) {
  const ctx = await basis.starteTestUmgebung(testcase);
  await bereiteZrefVor(ctx, anlage);
  messgeraet.abschnittBeginnen(
    `${messstelle(sk, phase)}: Zi (L-N) und Spannungsfall`,
    `Anlage normal energisiert - LS-Typenschild (${sk.ls.char}/${sk.ls.in}A) am Messgerät einstellen, dann L-N-Schleifenimpedanz messen. Mit denselben Messspitzen in die ΔU-Ansicht wechseln, Grenzwert ${String(SPANNUNGSFALL_GRENZWERT_PROZENT).replace('.', ',')} % einstellen und mit TEST den Spannungsfall gegenüber Zref messen.`
  );
  await messgeraet.drehknopfAufModus(ctx, 'ZI');
  await messgeraet.stelleEin(ctx, 'lsTyp', sk.ls.char);
  await messgeraet.stelleEin(ctx, 'bemessungsstrom', `${sk.ls.in}A`);
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, phase) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.testDruecken(ctx);
  const zi = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const ik = await messgeraet.leseWert(ctx, 'isc');
  await messgeraet.wechsleAnsicht(ctx);
  await messgeraet.stelleEin(ctx, 'spannungsfall', SPANNUNGSFALL_GRENZWERT_PROZENT);
  await messgeraet.testDruecken(ctx);
  const deltaU = await messgeraet.leseWert(ctx, 'deltaU');
  await messgeraet.wechsleAnsicht(ctx);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { zi: nurZahl(zi), ik: nurZahl(ik), deltaU: nurZahl(deltaU) };
}

async function messeRcd(testcase, sk, gruppe) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `${sk.bezeichnung}: RCD-Auslösung (FI/RCD)`,
    `${gruppe.rcd.name}-Typenschild (${gruppe.rcd.in_ma}mA, Typ ${gruppe.rcd.typ}) am Messgerät einstellen, dann Fehlerstrom-Auslösung testen - löst den RCD danach automatisch aus.`
  );
  await messgeraet.drehknopfAufModus(ctx, 'FI/RCD');
  await messgeraet.stelleEin(ctx, 'fehlerstrom', `${gruppe.rcd.in_ma}mA`);
  await messgeraet.stelleEin(ctx, 'typ', gruppe.rcd.typ);
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, sk.phasen[0]) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const imess = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const auslZeit = await messgeraet.leseWert(ctx, 't');
  // "Umess (V)" im Prüfprotokoll ist die gemessene Berührungsspannung
  // (gegen die der UL-Grenzwert in der Spaltenüberschrift geprüft wird),
  // NICHT die Netzspannung vor dem Test - das liefert "Uci" im FI/RCD-Modus.
  const umess = await messgeraet.leseWert(ctx, 'uci');
  // RCD wieder einschalten (User-Fund 2026-08-06, dieselbe Ursache wie die
  // Trennstelle bei Riso, siehe ARCHITEKTUR.md "Trennstelle nach Riso
  // wieder schließen"): der TEST-Klick löst den Hebel automatisch aus
  // (siehe fircdTestKlick() in controller/app.js), bleibt aber offen -
  // versorgt das RCD wie hier MEHRERE Stromkreise gemeinsam (eine ganze
  // `gruppe`, nicht nur `sk`), wären ALLE nachfolgenden Zi/Zs/RCD-Tests
  // dieser Gruppe ohne Spannung und lieferten keinen Wert.
  await messgeraet.hebelSchalten(ctx, gruppe.rcd.name);
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { imess: nurZahl(imess), auslZeit: nurZahl(auslZeit), umess: nurZahl(umess) };
}

// Rechtsdrehfeld (Erproben-Prüfpunkt "Rechtsdrehfeld (Drehstromsteckdosen)") -
// nur relevant für dreiphasige Stromkreise. Sonden in Reihenfolge L1
// (schwarz)/L2 (blau)/L3 (grün) an der Endstelle, Anlage normal
// energisiert (kein Abklemmen nötig, anders als bei RISO). Liefert
// "1.2.3." (Rechtsdrehfeld, korrekt) oder "3.2.1." (Linksdrehfeld,
// vertauschte Phasen), siehe controller/app.js berechnePhasenfolge().
async function messeRechtsdrehfeld(testcase, sk) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `Rechtsdrehfeld an ${sk.bezeichnung} (Drehstromsteckdose)`,
    'Anlage normal energisiert - Phasenfolge über V~ prüfen (Sonden in Reihenfolge L1/L2/L3 an Schwarz/Blau/Grün).'
  );
  await messgeraet.drehknopfAufModus(ctx, 'V~');
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'L1') }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'L2') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'L3') }); // grün
  const phasenfolge = await messgeraet.leseWert(ctx, 'phasenfolge');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return phasenfolge;
}

function alleStromkreise(anlage) {
  const liste = [];
  for (const hutschiene of anlage.hutschienen ?? []) {
    for (const gruppe of hutschiene.gruppen ?? []) {
      for (const sk of gruppe.stromkreise) liste.push({ sk, gruppe });
    }
  }
  return liste;
}

// Defaultwerte für Kopfdaten/Prüfung/Netz aus docs/BEDIENERPROZESS.md - wo
// `anlage.json` echte Werte liefert (Anlage/Standort/Netzform/Netzspannung),
// werden die bevorzugt, da genauer als die generischen Platzhalter der Doku
// (User-Entscheidung, 2026-07-31).
function baueKopfdatenWerte(anlage) {
  const heute = new Date().toLocaleDateString('de-DE');
  return {
    text: [
      { label: 'Nr.', wert: '1' },
      { label: 'Kunden-Nr.', wert: '1234' },
      { label: 'Auftraggeber', wert: 'ETZ, Krefelder Straße 12, 70376 Stuttgart' },
      { label: 'Auftrag-Nr.', wert: '1234' },
      { label: 'Anlage', wert: anlage.name ?? 'UV XYZ' },
      { label: 'Standort', wert: 'Raum XYZ' },
      { label: 'Auftragnehmer', wert: 'Max Mustermann, An der Felden 2, 71468 Tailfingen' },
      { label: 'Beginn Prüfung', wert: heute },
      { label: 'Ende Prüfung', wert: heute },
      { label: 'Beauftragter des Auftraggebers', wert: 'Kathi Katz' },
      { label: 'Prüfer', wert: 'Max Mustermann' },
      { label: 'Netzbetreiber', wert: 'Stuttgart Netze GmbH' }
    ],
    // Netz/V ist die allgemeine Netzspannung (Außenleiter/Stern), ein
    // testcase-übergreifend fester Standardwert laut BEDIENERPROZESS.md
    // ("Eintrag könnte so sein: Netz 400 / 230 V") - NICHT aus
    // `anlage.json`s `spannung_stromkreise` übernehmen, das pro Testcase
    // etwas anderes beschreiben kann (z.B. testcase_05: 400V, weil dort
    // eine Drehstromsteckdose mit Außenleiterspannung betrieben wird - gilt
    // aber nicht für die anderen, einphasigen Stromkreise derselben
    // Anlage).
    zweiteilig: [
      { label: 'Netz', werte: ['400', '230'] }
    ],
    checkbox: [
      { label: 'Prüfung nach', option: 'DIN VDE 0105-100' },
      { label: 'Art der Prüfung', option: 'Wiederholungsprüfung' },
      { label: 'Netzform', option: anlage.netzform ?? 'TN-C-S' }
    ]
  };
}

async function fuelleKopfdaten(page, anlage) {
  await page.evaluate((werte) => {
    const findeZeile = (label) =>
      [...document.querySelectorAll('#protokoll .pf-zeile')].find((z) => z.querySelector('.pf-label')?.textContent === label);

    for (const { label, wert } of werte.text) {
      const feld = findeZeile(label)?.querySelector('input.pf-feld, textarea.pf-textarea');
      if (feld) feld.value = wert;
    }
    for (const { label, werte: zweiWerte } of werte.zweiteilig) {
      const eingaben = findeZeile(label)?.querySelectorAll('input.pf-feld');
      zweiWerte.forEach((w, i) => { if (eingaben?.[i]) eingaben[i].value = w; });
    }
    for (const { label, option } of werte.checkbox) {
      const optionSpan = [...(findeZeile(label)?.querySelectorAll('.pf-cboption') ?? [])]
        .find((o) => o.textContent.includes(option));
      optionSpan?.querySelector('.pf-cb')?.click();
    }
  }, baueKopfdatenWerte(anlage));
}

// Kreuzt i.O. bei den genannten Prüfpunkten in der Erproben-Tabelle an
// (erste Ankreuz-Spalte, siehe pruefpunktTabelle() in view/protokoll.js -
// Prüfpunkt-Label steht in der ersten Zelle jeder Zeile).
// `punkte` = [{ punkt, ergebnis: 'i.O.' | 'n.i.O.' }] - erste bzw. zweite
// Ankreuz-Spalte.
async function fuelleErproben(page, punkte) {
  await page.evaluate((punkte) => {
    const zeilen = [...document.querySelectorAll('#protokoll .pf-tabelle tr')];
    for (const { punkt, ergebnis } of punkte) {
      const zeile = zeilen.find((z) => z.cells[0]?.textContent === punkt);
      zeile?.querySelectorAll('.pf-cb-zelle .pf-cb')[ergebnis === 'n.i.O.' ? 1 : 0]?.click();
    }
  }, punkte);
}

// Ort/Datum in BEIDEN Abschluss-Abschnitten ("Abschluss – Auftraggeber" UND
// "Abschluss – Prüfer", siehe baueAbschluss() in view/protokoll.js) - beide
// Abschnitte haben eigene "Ort"/"Datum"-Zeilen mit demselben Label, daher
// über den Abschnitts-Titel (.pf-abschnitt-titel) scopen statt global nach
// Label zu suchen (das fände sonst nur den ERSTEN Treffer).
async function fuelleAbschluss(page, ort, datum) {
  await page.evaluate(({ ort, datum }) => {
    const titel = ['Abschluss – Auftraggeber', 'Abschluss – Prüfer'];
    for (const abschnitt of document.querySelectorAll('#protokoll .pf-abschnitt')) {
      if (!titel.includes(abschnitt.querySelector('.pf-abschnitt-titel')?.textContent)) continue;
      const findeZeile = (label) =>
        [...abschnitt.querySelectorAll('.pf-zeile')].find((z) => z.querySelector('.pf-label')?.textContent === label);
      const ortFeld = findeZeile('Ort')?.querySelector('input.pf-feld');
      if (ortFeld) ortFeld.value = ort;
      const datumFeld = findeZeile('Datum')?.querySelector('input.pf-feld');
      if (datumFeld) datumFeld.value = datum;
    }
  }, { ort, datum });
}

// Fabrikat/Typ des Messgeräts (Zeile #1) - Defaultwerte aus
// BEDIENERPROZESS.md "Verwendete Messgeräte" ("JU 240", Fake Name).
// Gefunden über die Kopfzeile ('#'/'Fabrikat'/'Typ'), da mehrere Tabellen
// dieselbe .pf-tabelle-Klasse teilen.
async function fuelleMessgeraeteTabelle(page) {
  await page.evaluate(() => {
    const tabelle = [...document.querySelectorAll('#protokoll .pf-tabelle')]
      .find((t) => t.rows[0]?.cells[0]?.textContent === '#' && t.rows[0]?.cells[1]?.textContent === 'Fabrikat');
    const zeile = tabelle?.rows[1];
    if (!zeile) return;
    zeile.cells[1].querySelector('input').value = 'JU 240';
    zeile.cells[2].querySelector('input').value = 'Installationstester';
  });
}

// Standard-Berührungsspannungsgrenze UL - siehe BEDIENERPROZESS.md
// "Bekannte Fehler" #4: das Eingabefeld in der "Umess (V)"-Spaltenüberschrift
// ist bewusst standardmäßig leer (der Prüfling muss den für die jeweilige
// Anlage/Umgebung geltenden Wert selbst kennen), 50V ist aber die in den
// allermeisten Umgebungen (trockene Räume) geltende Regel - die
// automatisierte Prüfprotokoll-Erstellung trägt sie deshalb ein.
const UL_GRENZWERT_STANDARD = '50';

async function fuelleProtokoll(testcase, anlage, zeilen, erprobenPunkte = []) {
  const ctx = await basis.starteTestUmgebung(testcase);
  await fuelleKopfdaten(ctx.page, anlage);
  await fuelleErproben(ctx.page, erprobenPunkte);
  await fuelleMessgeraeteTabelle(ctx.page);
  // Ort/Datum wie im Auftraggeber-Feld ("... 70376 Stuttgart") bzw. wie
  // Beginn/Ende Prüfung (aktuelles Datum) - siehe BEDIENERPROZESS.md
  // "Abschluss" (Ort: "wie Standort/Auftraggeber", Datum: "aktuelles Datum").
  await fuelleAbschluss(ctx.page, '70376 Stuttgart', new Date().toLocaleDateString('de-DE'));
  await ctx.page.evaluate(({ zeilen, ulGrenzwert }) => {
    const tabelle = document.querySelector('#protokoll .pf-scroll table');
    const ulEingabe = tabelle.querySelector('th input.pf-feld');
    if (ulEingabe) ulEingabe.value = ulGrenzwert;
    zeilen.forEach(({ zeilenIndex, werte }) => {
      const zeile = tabelle.rows[zeilenIndex];
      for (const [spalteIndex, wert] of Object.entries(werte)) {
        const input = zeile.cells[Number(spalteIndex)].querySelector('input');
        if (input) input.value = wert;
      }
    });
  }, { zeilen, ulGrenzwert: UL_GRENZWERT_STANDARD });
  return ctx;
}

// Lesbare Spaltennamen für die Fahrplan-Beschreibung (protokollEintragen).
const SPALTEN_NAMEN = {
  nr: 'Nr.', ziel: 'Stromkreis / Zielbezeichnung', kabelTyp: 'Leitung Typ', kabelAnzahl: 'Leitung Anzahl Adern',
  kabelQuerschnitt: 'Leitung Querschnitt (mm²)', rpe: 'Rpe (Ω)', risoOhne: 'Riso ohne Verbraucher (MΩ)', risoMit: 'Riso mit Verbraucher (MΩ)',
  ueArt: 'Überstromschutz Art', ueIn: 'Überstromschutz In (A)', zs: 'Zs (Ω)', ik: 'Ik L-PE (A)', zi: 'Zi (Ω)', ikLn: 'Ik L-N (A)',
  rcdInArt: 'RCD In/Art', rcdIdn: 'RCD IΔn (mA)', rcdImess: 'RCD Imess (mA)', rcdAuslZeit: 'RCD Auslösezeit (ms)', rcdUmess: 'RCD Umess (V)'
};

const ENDSTELLEN_MEHRZAHL = {
  Steckdose: 'Steckdosen', Lichtauslass: 'Lichtauslässe', Drehstromsteckdose: 'Drehstromsteckdosen',
  '5-polige Anschlussdose': '5-polige Anschlussdosen'
};

// Stromkreis-Bezeichnung, wie der Benutzer sie selbst ermitteln kann
// (Entscheidung zu sim-nt2): Position des LS im Verteiler von links und
// Art/Anzahl der zugeordneten Endstellen, z.B. "LS1: 2 Steckdosen". Auf den
// Geräten steht nur das Typenschild, SK-Namen sieht der Benutzer nicht.
// Bei gemischten Endstellen (sim-lfi) je Typ in Reihenfolge des ersten
// Auftretens, z.B. "LS1: 2 Steckdosen, 1 Lichtauslass".
function stromkreisBezeichnung(anlage, sk, position) {
  const typen = (anlage.steckdosen_platzierung ?? [])
    .filter((p) => p.sk === sk.bezeichnung)
    .map((p) => p.endstelle ?? sk.endstelle);
  if (typen.length === 0) return `LS${position}`;
  const anzahlJeTyp = new Map();
  for (const typ of typen) anzahlJeTyp.set(typ, (anzahlJeTyp.get(typ) ?? 0) + 1);
  const teile = [...anzahlJeTyp].map(([typ, anzahl]) => `${anzahl} ${anzahl === 1 ? typ : (ENDSTELLEN_MEHRZAHL[typ] ?? typ)}`);
  return `LS${position}: ${teile.join(', ')}`;
}

// Eigener Abschnitt, der die gerade gemessenen Werte ins Prüfprotokoll
// einträgt (sim-nt2) - nach jeder Messart, damit das Replay das Protokoll
// so ausfüllt wie ein Prüfer: erst alle Rpe, dann alle Riso usw.
// `eintraege` = [{ zeile, spalte (Schlüssel aus SPALTE), wert }].
// Schaltet nichts, deshalb ohne Startzustand.
// Liefert die tatsächlich eingetragenen Einträge (Spalte als Index) zurück.
async function trageEin(testcase, titel, begruendung, eintraege) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(titel, begruendung);
  const eingetragen = [];
  for (const { zeile, spalte, wert } of eintraege) {
    if (wert === undefined || wert === null || wert === '') continue;
    await messgeraet.protokollEintragen(ctx, { zeile, spalte: SPALTE[spalte], spaltenName: SPALTEN_NAMEN[spalte] }, wert);
    eingetragen.push({ zeile, spalte: SPALTE[spalte], wert });
  }
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return eingetragen;
}

// Führt alle Messungen für eine Anlage durch und liefert sowohl die
// PDF-Tabellenzeilen (`zeilen`, `erprobenPunkte` - für `fuelleProtokoll()`)
// als auch eine kompakte, benannte Zusammenfassung (`ergebnisse` - für
// automatisierte Tests, siehe test_pruefprotokoll.js). Bewusst OHNE
// Datei-/PDF-Nebenwirkungen (kein `fs.writeFileSync`, kein `page.pdf()`) -
// das macht die Funktion sowohl vom CLI-Teil unten als auch von einem Test
// aufrufbar, ohne dass der Test versehentlich echte Ausgabedateien erzeugt.
async function berechneProtokoll(testcase) {
  const anlage = require(path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase, 'anlage.json'));

  // Hauptleitung ist Nr. 1 (kein eigener Stromkreis in anlage.json): Kabel
  // und Zs an der Einspeisung (sim-aon).
  const HAUPTLEITUNG_ZEILE = 2;
  const hauptleitung = { zeile: HAUPTLEITUNG_ZEILE, werte: { nr: '1', ...hauptleitungKabel(anlage) } };
  const stromkreise = alleStromkreise(anlage);
  // Protokollwerte je Stromkreis (Schlüssel aus SPALTE), werden nach jeder
  // Messart ergänzt und eingetragen. Zeile rows[3] ff., Nr. ab 2.
  const protokoll = stromkreise.map((_, i) => ({ zeile: i + 3, werte: {} }));
  const protokollEintraege = [];
  const eintraegeFuer = (spalten) => stromkreise.flatMap((_, i) =>
    spalten.map((spalte) => ({ zeile: protokoll[i].zeile, spalte, wert: protokoll[i].werte[spalte] })));

  // Ablauf nach Messart (Entscheidung zu sim-7c6, Wiederholungsprüfung):
  // 1. Spannung an der Einspeisung, 2. Zuordnung der Endstellen,
  // 3. Freischalten und Spannungsfreiheit, 4. Rpe, 5. Riso, 6. Wieder-
  // einschalten, 7. Zref, Zs der Hauptleitung, Zi/Zs, 8. RCD-Test,
  // 9. Drehfeld. Jede Messart läuft über
  // alle Stromkreise, bevor die nächste beginnt.
  const ergebnisse = stromkreise.map(({ sk, gruppe }, i) => ({
    sk: sk.bezeichnung, phasen: sk.phasen, messungen: sk.messungen, rcdName: gruppe.rcd?.name ?? null,
    zeilenIndex: protokoll[i].zeile
  }));
  const ergebnisVon = (sk) => ergebnisse.find((e) => e.sk === sk.bezeichnung);

  console.log('--- Einspeisung ---');
  const einspeisung = [];
  const saetze = einspeisungSondensaetze(anlage);
  for (const [i, satz] of saetze.entries()) {
    const spannungen = await messeEinspeisung(testcase, anlage, satz, { erster: i === 0 });
    console.log(`Einspeisung ${satz.name}:`, spannungen.map((m) => `${m.paar} ${m.wert}V`).join(', '));
    einspeisung.push(...spannungen);
  }
  await schalteHauptschalter(testcase, anlage, {
    titel: 'Einspeisung: Hauptschalter wieder ein',
    begruendung: 'Versorgung geprüft, Anlage für die Zuordnung der Endstellen wieder einschalten.',
    freigeschaltet: true
  });

  console.log('--- Zuordnung ---');
  const zuordnung = [];
  for (const { sk } of stromkreise) {
    for (const endstelle of endstellenVon(anlage, sk)) {
      const z = await messeZuordnung(testcase, anlage, sk, endstelle);
      console.log(`Zuordnung ${endstelle} -> ${sk.ls.name}: ${z.vorher}V, LS aus ${z.lsAus}V, LS wieder ein ${z.lsWiederEin}V`);
      zuordnung.push(z);
    }
  }
  stromkreise.forEach(({ sk }, i) => {
    Object.assign(protokoll[i].werte, {
      nr: String(i + 2),
      ziel: stromkreisBezeichnung(anlage, sk, i + 1),
      kabelTyp: sk.leitung.typ,
      kabelAnzahl: String(sk.leitung.adern.length),
      // Dezimalkomma wie bei allen anderen Protokollwerten ("2,5" statt "2.5").
      kabelQuerschnitt: String(sk.leitung.adern[0].querschnitt_mm2).replace('.', ',')
    });
  });
  // Kabeltyp (NYM) wird nicht eingetragen: in der Anlage nicht ablesbar
  // (Entscheidung zu sim-0bn/sim-nt2), steht aber in der PDF.
  protokollEintraege.push(...await trageEin(testcase, 'Protokoll: Stromkreise eintragen',
    'Nach der Zuordnung je Stromkreis eine Zeile anlegen: Nummer, Bezeichnung (Position des LS von links und zugeordnete Endstellen), Aderanzahl und Querschnitt der abgehenden Leitung. In der Zeile Hauptleitung Aderanzahl und Querschnitt der Zuleitung an der Einspeisung.',
    [...['nr', 'kabelAnzahl', 'kabelQuerschnitt'].map((spalte) => ({ zeile: HAUPTLEITUNG_ZEILE, spalte, wert: hauptleitung.werte[spalte] })),
      ...eintraegeFuer(['nr', 'ziel', 'kabelAnzahl', 'kabelQuerschnitt'])]));

  console.log('--- Freischalten ---');
  await schalteHauptschalter(testcase, anlage, {
    titel: 'Freischalten: Hauptschalter aus',
    begruendung: 'Für Rpe und Riso die Anlage freischalten. Der Hauptschalter bleibt bis nach den Riso-Messungen aus.',
    freigeschaltet: false
  });
  for (const { sk } of stromkreise) {
    const e = ergebnisVon(sk);
    e.spannungsfreiheit = [];
    // An allen Messstellen: Abgangsklemmen (Riso) und jede Endstelle (Rpe).
    for (const endstelle of [null, ...endstellenVon(anlage, sk)]) {
      for (const satz of spannungsfreiheitSondensaetze(sk)) {
        e.spannungsfreiheit.push(...await messeSpannungsfreiheit(testcase, anlage, sk, satz, endstelle));
      }
    }
    console.log(`${sk.bezeichnung} Spannungsfreiheit:`, e.spannungsfreiheit.map((m) => `${m.ort} ${m.paar} ${m.wert}V`).join(', '));
  }

  console.log('--- Rpe ---');
  for (const { sk } of stromkreise) {
    const e = ergebnisVon(sk);
    const endstellen = endstellenVon(anlage, sk);
    e.rpeMessungen = [];
    for (const endstelle of (endstellen.length > 0 ? endstellen : [null])) {
      e.rpeMessungen.push(await messeRpe(testcase, anlage, sk, endstelle));
    }
    e.rpe = groessterRpe(e.rpeMessungen.map((m) => m.wert));
    console.log(`${sk.bezeichnung} Rpe:`, e.rpe);
  }
  stromkreise.forEach(({ sk }, i) => { protokoll[i].werte.rpe = ergebnisVon(sk).rpe; });
  protokollEintraege.push(...await trageEin(testcase, 'Protokoll: Rpe eintragen',
    'Je Stromkreis den größten Rpe-Wert seiner Endstellen eintragen.', eintraegeFuer(['rpe'])));

  console.log('--- Riso ---');
  for (const { sk, gruppe } of stromkreise) {
    const e = ergebnisVon(sk);
    e.risoMessungen = [];
    for (const paar of risoPaare(sk)) {
      const messung = await messeRisoOhne(testcase, anlage, sk, gruppe, paar);
      console.log(`${sk.bezeichnung} Riso ${paar.name}:`, messung.wert);
      e.risoMessungen.push(messung);
    }
    e.riso = kleinsterRiso(e.risoMessungen.map((m) => m.wert));
  }
  stromkreise.forEach(({ sk }, i) => { protokoll[i].werte.risoOhne = ergebnisVon(sk).riso; });
  protokollEintraege.push(...await trageEin(testcase, 'Protokoll: Riso eintragen',
    'Je Stromkreis den kleinsten Riso-Wert aller Leiterpaare eintragen.', eintraegeFuer(['risoOhne'])));

  await schalteHauptschalter(testcase, anlage, {
    titel: 'Wiedereinschalten: Hauptschalter ein',
    begruendung: 'Rpe und Riso sind abgeschlossen, alle Trennstellen sind geschlossen. Anlage für die Messungen unter Spannung wieder einschalten.',
    freigeschaltet: true
  });

  console.log('--- Zref ---');
  const zref = await messeZref(testcase, anlage);
  console.log('Zref:', zref);

  // Allgemeine Regel (User, 2026-07-31, in BEDIENERPROZESS.md dokumentiert):
  // sitzt ein RCD im Stromkreis, ergibt Zs/Ik L-PE keinen Sinn (der
  // Fehlerstrom liefe über PE, würde also den RCD auslösen) - dann wird
  // NUR Zi/Ik L-N gemessen. OHNE RCD gibt es diese Einschränkung nicht -
  // dort werden BEIDE Messungen gemacht (Zs/Ik L-PE UND Zi/Ik L-N).
  // Jeder Außenleiter wird einzeln gemessen - ein Fehler auf L2 oder L3
  // eines mehrphasigen Stromkreises fiele sonst nicht auf. Die Werte pro
  // Außenleiter stehen in `ergebnis.aussenleiter`. In die Protokollzeile
  // kommt der schlechteste Wert (siehe schlechtesteMessung()).
  console.log('--- Zs Hauptleitung ---');
  const hauptleitungZs = [];
  for (const ader of einspeisungAdern(anlage).aussenleiter) {
    const messung = await messeHauptleitungZs(testcase, anlage, ader);
    console.log(`Hauptleitung Zs ${messung.phase}:`, messung.zs, 'Ik:', messung.ik);
    hauptleitungZs.push(messung);
  }
  const schlechtesterHauptleitungZs = schlechtesteMessung(hauptleitungZs, 'zs');
  Object.assign(hauptleitung.werte, { zs: schlechtesterHauptleitungZs.zs, ik: schlechtesterHauptleitungZs.ik });
  protokollEintraege.push(...await trageEin(testcase, 'Protokoll: Hauptleitung Zs eintragen',
    'In der Zeile Hauptleitung Zs und Ik L-PE eintragen, bei Drehstrom der schlechteste Außenleiter.',
    ['zs', 'ik'].map((spalte) => ({ zeile: HAUPTLEITUNG_ZEILE, spalte, wert: hauptleitung.werte[spalte] }))));

  console.log('--- Zi/Zs ---');
  for (const { sk, gruppe } of stromkreise) {
    if (!sk.messungen.zs) continue;
    const e = ergebnisVon(sk);
    e.aussenleiter = [];
    for (const phase of sk.phasen) {
      const { zi, ik: ikLn, deltaU } = await messeZi(testcase, anlage, sk, phase);
      console.log(`${sk.bezeichnung} Zi ${phase}:`, zi, 'Ik (L-N):', ikLn, 'ΔU:', deltaU);
      const messung = { phase, zi, ikLn, deltaU };
      if (!gruppe.rcd) {
        const { zs, ik } = await messeUeberstromschutz(testcase, sk, phase);
        console.log(`${sk.bezeichnung} Zs ${phase}:`, zs, 'Ik:', ik);
        messung.zs = zs;
        messung.ik = ik;
      }
      e.aussenleiter.push(messung);
    }
    const schlechtesterZi = schlechtesteMessung(e.aussenleiter, 'zi');
    e.zi = schlechtesterZi.zi;
    e.ikLn = schlechtesterZi.ikLn;
    if (!gruppe.rcd) {
      const schlechtesterZs = schlechtesteMessung(e.aussenleiter, 'zs');
      e.zs = schlechtesterZs.zs;
      e.ik = schlechtesterZs.ik;
    }
  }
  stromkreise.forEach(({ sk, gruppe }, i) => {
    if (!sk.messungen.zs) return;
    const e = ergebnisVon(sk);
    Object.assign(protokoll[i].werte, { ueArt: sk.ls.char, ueIn: String(sk.ls.in), zi: e.zi, ikLn: e.ikLn });
    if (!gruppe.rcd) Object.assign(protokoll[i].werte, { zs: e.zs, ik: e.ik });
  });
  protokollEintraege.push(...await trageEin(testcase, 'Protokoll: Überstromschutz eintragen',
    'Je Stromkreis LS-Charakteristik und Nennstrom vom Typenschild sowie Zi/Ik und, ohne RCD, Zs/Ik eintragen. Bei Drehstrom der schlechteste Außenleiter.',
    eintraegeFuer(['ueArt', 'ueIn', 'zs', 'ik', 'zi', 'ikLn'])));

  console.log('--- RCD ---');
  for (const { sk, gruppe } of stromkreise) {
    if (!(sk.messungen.rcd && gruppe.rcd)) continue;
    const e = ergebnisVon(sk);
    const { imess, auslZeit, umess } = await messeRcd(testcase, sk, gruppe);
    console.log(`${sk.bezeichnung} RCD Imess:`, imess, 'Auslösezeit:', auslZeit, 'Umess:', umess);
    e.rcdImess = imess;
    e.rcdAuslZeit = auslZeit;
    e.rcdUmess = umess;
  }
  stromkreise.forEach(({ sk, gruppe }, i) => {
    if (!(sk.messungen.rcd && gruppe.rcd)) return;
    const e = ergebnisVon(sk);
    Object.assign(protokoll[i].werte, {
      rcdInArt: `${gruppe.rcd.nennstrom_a}/${gruppe.rcd.typ}`, rcdIdn: String(gruppe.rcd.in_ma),
      rcdImess: e.rcdImess, rcdAuslZeit: e.rcdAuslZeit, rcdUmess: e.rcdUmess
    });
  });
  protokollEintraege.push(...await trageEin(testcase, 'Protokoll: RCD eintragen',
    'Je Stromkreis die RCD-Daten vom Typenschild und die Messwerte des RCD-Tests eintragen.',
    eintraegeFuer(['rcdInArt', 'rcdIdn', 'rcdImess', 'rcdAuslZeit', 'rcdUmess'])));

  // Rechtsdrehfeld (Erproben-Prüfpunkt, gilt EINMAL pro Anlage, nicht pro
  // Stromkreis) - nur relevant, wenn irgendein Stromkreis dreiphasig ist
  // (Drehstromsteckdose).
  // Erproben-Punkte: [{ punkt, ergebnis: 'i.O.' | 'n.i.O.' }].
  const erprobenPunkte = [];
  // Spannungsfall (sim-lgf): i.O., wenn an keinem Stromkreis/Außenleiter
  // der Grenzwert überschritten ist. Ein ungültiger Wert ("___") zählt als
  // nicht i.O.
  const alleDeltaU = ergebnisse.flatMap((e) => (e.aussenleiter ?? []).map((m) => m.deltaU));
  if (alleDeltaU.length > 0) {
    const zahl = (w) => parseFloat(String(w).replace(',', '.'));
    const io = alleDeltaU.every((w) => !Number.isNaN(zahl(w)) && zahl(w) <= SPANNUNGSFALL_GRENZWERT_PROZENT);
    console.log('Spannungsfall:', alleDeltaU.join(' / '), io ? 'i.O.' : 'n.i.O.');
    erprobenPunkte.push({ punkt: 'Überprüfung Spannungsfall', ergebnis: io ? 'i.O.' : 'n.i.O.' });
  }
  const dreiphasig = stromkreise.find(({ sk }) => sk.phasen.length === 3);
  if (dreiphasig) {
    const phasenfolge = await messeRechtsdrehfeld(testcase, dreiphasig.sk);
    console.log('Rechtsdrehfeld:', phasenfolge);
    if (phasenfolge === '1.2.3.') erprobenPunkte.push({ punkt: 'Rechtsdrehfeld (Drehstromsteckdosen)', ergebnis: 'i.O.' });
  }
  if (erprobenPunkte.length > 0) {
    const ctx = await basis.starteTestUmgebung(testcase);
    messgeraet.abschnittBeginnen('Protokoll: Erproben ankreuzen',
      `Unter Erproben ankreuzen: Spannungsfall i.O., wenn kein Stromkreis über ${String(SPANNUNGSFALL_GRENZWERT_PROZENT).replace('.', ',')} % liegt, sonst n.i.O.; Rechtsdrehfeld i.O. bei 1.2.3.`);
    for (const { punkt, ergebnis } of erprobenPunkte) await messgeraet.protokollAnkreuzen(ctx, punkt, ergebnis);
    messgeraet.abschnittEnde();
    await ctx.schliessen();
  }

  // Zeilen für die PDF (fuelleProtokoll()) aus denselben Werten wie die
  // Protokoll-Einträge im Fahrplan, inklusive Kabeltyp.
  const zeilen = [
    ...[hauptleitung, ...protokoll].map(({ zeile, werte }) => ({
      zeilenIndex: zeile,
      werte: Object.fromEntries(Object.entries(werte).filter(([, w]) => w !== undefined).map(([k, w]) => [SPALTE[k], w]))
    }))
  ];

  return { anlage, zeilen, erprobenPunkte, ergebnisse, einspeisung, zuordnung, protokollEintraege, zref, hauptleitungZs };
}

async function main() {
  const testcase = process.argv[2];
  const ausgabeordner = process.argv[3] ?? path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase);
  if (!testcase) {
    console.error('Aufruf: node tools/pruefprotokoll_erstellung.js <testcase> [ausgabeordner]');
    process.exit(1);
  }

  const { anlage, zeilen, erprobenPunkte } = await berechneProtokoll(testcase);

  fs.mkdirSync(ausgabeordner, { recursive: true });
  const fahrplanPfad = path.join(ausgabeordner, 'fahrplan.json');
  fs.writeFileSync(fahrplanPfad, JSON.stringify(messgeraet.alsJson(`tests/visuell/${testcase}/anlage.json`), null, 2));
  console.log('Fahrplan gespeichert:', fahrplanPfad);

  const ctx = await fuelleProtokoll(testcase, anlage, zeilen, erprobenPunkte);
  if (process.env.PROTOKOLL_SCREENSHOT) {
    await ctx.page.locator('#protokoll .pf-blatt').first().screenshot({
      path: process.env.PROTOKOLL_SCREENSHOT.replace('.png', '_kopfdaten.png')
    });
    const scrollBox = ctx.page.locator('#protokoll .pf-scroll').first();
    await scrollBox.evaluate((el) => { el.scrollLeft = 0; });
    await scrollBox.screenshot({ path: process.env.PROTOKOLL_SCREENSHOT.replace('.png', '_links.png') });
    await scrollBox.evaluate((el) => { el.scrollLeft = el.scrollWidth / 2; });
    await scrollBox.screenshot({ path: process.env.PROTOKOLL_SCREENSHOT.replace('.png', '_mitte.png') });
    await scrollBox.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await scrollBox.screenshot({ path: process.env.PROTOKOLL_SCREENSHOT.replace('.png', '_rechts.png') });
  }
  const pdfPfad = path.join(ausgabeordner, 'pruefprotokoll.pdf');
  await ctx.page.pdf({ path: pdfPfad, printBackground: true, format: 'A4', landscape: true });
  console.log('Prüfprotokoll gespeichert:', pdfPfad);
  await ctx.schliessen();
}

module.exports = { berechneProtokoll, kleinsterRiso, schlechtesteMessung, groessterRpe, naechsteTrennstelle, SPALTE };

// Nur bei direktem Aufruf ausführen, nicht beim require() aus
// test_pruefprotokoll.js (analog zum Muster in generate_anlage.js).
if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
