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
// selbst, falls AFDD-Kombigerät, sonst das Gruppen-RCD) - deren Schraube
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
function naechsteTrennstelle(sk, gruppe) {
  if (sk.ls.afdd) return { bauteil: sk.ls.name, netz: sk.ls.eingang.leitung.adern[0].netz, istLeckageQuelle: true };
  if (gruppe.rcd) {
    const istTypBOderAfdd = gruppe.rcd.typ === 'B' || gruppe.rcd.typ === 'B+';
    return { bauteil: gruppe.rcd.name, netz: sk.ls.eingang.leitung.adern[0].netz, istLeckageQuelle: istTypBOderAfdd };
  }
  return null;
}

async function messeRpe(testcase, sk) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `${sk.bezeichnung}: Rpe (PE-Durchgang)`,
    'Vor RLOW die Anlage spannungsfrei machen (hier: PE ist ohnehin nie geschaltet, siehe KONZEPT.md "Nächste Schritte" - PE-Teilgraph).'
  );
  await messgeraet.drehknopfAufModus(ctx, 'RLOW');
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'PE') });
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' });
  const wert = await messgeraet.leseWert(ctx, 'hauptmesswert');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return nurZahl(wert);
}

async function messeRisoOhne(testcase, sk, gruppe, hauptschalterName) {
  const trennstelle = naechsteTrennstelle(sk, gruppe);

  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `${sk.bezeichnung}: Riso Verbraucher ohne`,
    trennstelle
      ? (trennstelle.istLeckageQuelle
        ? `Vor RISO die Anlage spannungsfrei machen. Da ${trennstelle.bauteil} ein RCD Typ B/AFDD ist, dessen Schraube auf dieser Phase öffnen, um den inneren (elektronischen) Widerstand zu umgehen (siehe BEDIENERPROZESS.md "Riso Verbraucher ohne").`
        : `Vor RISO die Anlage spannungsfrei machen - Schraube von ${trennstelle.bauteil} öffnen (nicht nur den Hauptschalter, sonst blieben Geschwister-Stromkreise auf derselben Sammelschiene erreichbar und könnten die Messung verfälschen).`)
      : 'Vor RISO die Anlage spannungsfrei machen (Hauptschalter aus, kein RCD auf diesem Stromkreis vorhanden).'
  );
  if (trennstelle) {
    // Sicherheit (User-Vorgabe 2026-08-06, Diskussion "Freischalten zuerst"):
    // eine Schraube wird NIE unter Spannung gelöst/eingedreht - erst den
    // Hauptschalter aus, dann die Schraube öffnen, danach den Hauptschalter
    // wieder ein (die eigentliche Trennstelle für RISO ist ab hier die
    // offene Schraube selbst, siehe Begründungstext oben - der Hauptschalter
    // schützt nur während der kurzen physischen Schrauben-Handlung).
    await messgeraet.hebelSchalten(ctx, hauptschalterName);
    await messgeraet.schraubeSchalten(ctx, trennstelle.bauteil, trennstelle.netz);
    await messgeraet.hebelSchalten(ctx, hauptschalterName);
  } else {
    await messgeraet.hebelSchalten(ctx, hauptschalterName);
  }
  await messgeraet.drehknopfAufModus(ctx, 'RISO');
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, sk.phasen[0]) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const wert = await messgeraet.leseWert(ctx, 'hauptmesswert');
  // Trennstelle wieder schließen (Schraube eindrehen/Hauptschalter zurück) -
  // die Anlage muss für die nachfolgenden Messungen (Zi/Zs/RCD-Auslösung)
  // wieder spannungsführend sein. `schraubeSchalten()`/`hebelSchalten()`
  // schalten hier - wie am echten Gerät und wie beim Öffnen oben - immer nur
  // um, unabhängig vom Zielzustand (die App entscheidet anhand des
  // tatsächlichen Zustands, ob das ein Öffnen oder Schließen ist), deshalb
  // hier derselbe Aufruf wie beim Öffnen (Fund 2026-08-06, User: "Ist der
  // Grund, dass die Schraube draußen war? Sollten die nicht entfernt werden
  // nach einem Durchgang?" - vorher blieb die Trennstelle offen, wodurch
  // Zi/Zs/RCD-Auslösung beim Replay keinen Wert lieferten, siehe
  // ARCHITEKTUR.md "Messspitzen-Reset pro Abschnitt").
  if (trennstelle) {
    // Dieselbe Sicherheits-Umklammerung wie beim Öffnen oben, jetzt fürs
    // Wiedereindrehen.
    await messgeraet.hebelSchalten(ctx, hauptschalterName);
    await messgeraet.schraubeSchalten(ctx, trennstelle.bauteil, trennstelle.netz);
    await messgeraet.hebelSchalten(ctx, hauptschalterName);
  } else {
    await messgeraet.hebelSchalten(ctx, hauptschalterName);
  }
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return nurZahl(wert);
}

async function messeUeberstromschutz(testcase, sk) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `${sk.bezeichnung}: Überstromschutz (Zs)`,
    `Anlage normal energisiert (kein Abklemmen nötig) - LS-Typenschild (${sk.ls.char}/${sk.ls.in}A) am Messgerät einstellen, dann Schleifenimpedanz messen.`
  );
  await messgeraet.drehknopfAufModus(ctx, 'ZS');
  await messgeraet.stelleEin(ctx, 'lsTyp', sk.ls.char);
  await messgeraet.stelleEin(ctx, 'bemessungsstrom', `${sk.ls.in}A`);
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, sk.phasen[0]) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const zs = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const ik = await messgeraet.leseWert(ctx, 'isc');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { zs: nurZahl(zs), ik: nurZahl(ik) };
}

// Zi (L-N-Schleifenimpedanz statt L-PE wie bei Zs) - Modus ZI, nur Schwarz
// (L)/Blau (N) nötig, PE spielt hier keine Rolle (siehe ziTestKlick() in
// controller/app.js).
async function messeZi(testcase, sk) {
  const ctx = await basis.starteTestUmgebung(testcase);
  messgeraet.abschnittBeginnen(
    `${sk.bezeichnung}: Zi (L-N)`,
    `Anlage normal energisiert - LS-Typenschild (${sk.ls.char}/${sk.ls.in}A) am Messgerät einstellen, dann L-N-Schleifenimpedanz messen.`
  );
  await messgeraet.drehknopfAufModus(ctx, 'ZI');
  await messgeraet.stelleEin(ctx, 'lsTyp', sk.ls.char);
  await messgeraet.stelleEin(ctx, 'bemessungsstrom', `${sk.ls.in}A`);
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, sk.phasen[0]) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: aderNetz(sk, 'N') }); // blau
  await messgeraet.testDruecken(ctx);
  const zi = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const ik = await messgeraet.leseWert(ctx, 'isc');
  messgeraet.abschnittEnde();
  await ctx.schliessen();
  return { zi: nurZahl(zi), ik: nurZahl(ik) };
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
      { label: 'Netzbetreiber', wert: 'Stadtwerke Stuttgart' }
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
async function fuelleErproben(page, punkte) {
  await page.evaluate((punkte) => {
    const zeilen = [...document.querySelectorAll('#protokoll .pf-tabelle tr')];
    for (const punkt of punkte) {
      const zeile = zeilen.find((z) => z.cells[0]?.textContent === punkt);
      zeile?.querySelector('.pf-cb-zelle .pf-cb')?.click();
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

// Führt alle Messungen für eine Anlage durch und liefert sowohl die
// PDF-Tabellenzeilen (`zeilen`, `erprobenPunkte` - für `fuelleProtokoll()`)
// als auch eine kompakte, benannte Zusammenfassung (`ergebnisse` - für
// automatisierte Tests, siehe test_pruefprotokoll.js). Bewusst OHNE
// Datei-/PDF-Nebenwirkungen (kein `fs.writeFileSync`, kein `page.pdf()`) -
// das macht die Funktion sowohl vom CLI-Teil unten als auch von einem Test
// aufrufbar, ohne dass der Test versehentlich echte Ausgabedateien erzeugt.
async function berechneProtokoll(testcase) {
  const anlage = require(path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase, 'anlage.json'));

  // Hauptleitung ist Nr. 1 - hier nicht automatisiert vermessen (kein
  // eigener Stromkreis in anlage.json), aber die Nummer selbst gehört
  // trotzdem rein.
  const zeilen = [{ zeilenIndex: 2, werte: { [SPALTE.nr]: '1' } }];
  const ergebnisse = [];
  let nr = 2;
  for (const { sk, gruppe } of alleStromkreise(anlage)) {
    console.log(`--- ${sk.bezeichnung} (${sk.ziel}) ---`);
    const rpe = await messeRpe(testcase, sk);
    console.log('Rpe:', rpe);
    const riso = await messeRisoOhne(testcase, sk, gruppe, anlage.hauptsicherung.name);
    console.log('Riso Verbraucher ohne:', riso);

    const werte = {
      [SPALTE.nr]: String(nr),
      [SPALTE.ziel]: sk.bezeichnung,
      [SPALTE.kabelTyp]: sk.leitung.typ,
      [SPALTE.kabelAnzahl]: String(sk.leitung.adern.length),
      [SPALTE.kabelQuerschnitt]: String(sk.leitung.adern[0].querschnitt_mm2),
      [SPALTE.rpe]: rpe,
      [SPALTE.risoOhne]: riso
    };
    const ergebnis = { sk: sk.bezeichnung, rpe, riso, rcdName: gruppe.rcd?.name ?? null };

    // Allgemeine Regel (User, 2026-07-31, in BEDIENERPROZESS.md dokumentiert):
    // sitzt ein RCD im Stromkreis, ergibt Zs/Ik L-PE keinen Sinn (der
    // Fehlerstrom liefe über PE, würde also den RCD auslösen) - dann wird
    // NUR Zi/Ik L-N gemessen. OHNE RCD gibt es diese Einschränkung nicht -
    // dort werden BEIDE Messungen gemacht (Zs/Ik L-PE UND Zi/Ik L-N).
    if (sk.messungen.zs) {
      werte[SPALTE.ueArt] = sk.ls.char;
      werte[SPALTE.ueIn] = String(sk.ls.in);
      const { zi, ik: ikLn } = await messeZi(testcase, sk);
      console.log('Zi:', zi, 'Ik (L-N):', ikLn);
      werte[SPALTE.zi] = zi;
      werte[SPALTE.ikLn] = ikLn;
      ergebnis.zi = zi;
      ergebnis.ikLn = ikLn;
      if (!gruppe.rcd) {
        const { zs, ik } = await messeUeberstromschutz(testcase, sk);
        console.log('Zs:', zs, 'Ik:', ik);
        werte[SPALTE.zs] = zs;
        werte[SPALTE.ik] = ik;
        ergebnis.zs = zs;
        ergebnis.ik = ik;
      }
    }

    if (sk.messungen.rcd && gruppe.rcd) {
      const { imess, auslZeit, umess } = await messeRcd(testcase, sk, gruppe);
      console.log('RCD Imess:', imess, 'Auslösezeit:', auslZeit, 'Umess:', umess);
      werte[SPALTE.rcdInArt] = `${gruppe.rcd.nennstrom_a}/${gruppe.rcd.typ}`;
      werte[SPALTE.rcdIdn] = String(gruppe.rcd.in_ma);
      werte[SPALTE.rcdImess] = imess;
      werte[SPALTE.rcdAuslZeit] = auslZeit;
      werte[SPALTE.rcdUmess] = umess;
      ergebnis.rcdImess = imess;
      ergebnis.rcdAuslZeit = auslZeit;
      ergebnis.rcdUmess = umess;
    }

    zeilen.push({ zeilenIndex: 1 + nr, werte }); // rows[0]/[1] = Kopfzeilen, rows[2] = Hauptleitung
    ergebnisse.push(ergebnis);
    nr += 1;
  }

  // Rechtsdrehfeld (Erproben-Prüfpunkt, gilt EINMAL pro Anlage, nicht pro
  // Stromkreis) - nur relevant, wenn irgendein Stromkreis dreiphasig ist
  // (Drehstromsteckdose).
  const erprobenPunkte = [];
  const dreiphasig = alleStromkreise(anlage).find(({ sk }) => sk.phasen.length === 3);
  if (dreiphasig) {
    const phasenfolge = await messeRechtsdrehfeld(testcase, dreiphasig.sk);
    console.log('Rechtsdrehfeld:', phasenfolge);
    if (phasenfolge === '1.2.3.') erprobenPunkte.push('Rechtsdrehfeld (Drehstromsteckdosen)');
  }

  return { anlage, zeilen, erprobenPunkte, ergebnisse };
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

module.exports = { berechneProtokoll };

// Nur bei direktem Aufruf ausführen, nicht beim require() aus
// test_pruefprotokoll.js (analog zum Muster in generate_anlage.js).
if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
