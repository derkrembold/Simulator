# TREI Prüfungs-Simulator – Architektur

## Überblick

Die App folgt dem **MVC-Pattern** (Model / View / Controller).
Jede Schicht hat eine klar definierte Aufgabe und ist unabhängig von den anderen.

```
+------------------------------------------+
|                   VIEW                   |
|  Schaltkasten-SVG, Checklisten,          |
|  Protokoll-Formular, Timer               |
+------------------+-----------------------+
                   | Events (Klick, Eingabe)
                   v
+------------------------------------------+
|               CONTROLLER                |
|  Ablaufsteuerung, Validierung,           |
|  Fehler erkennen, Stufen-Logik           |
+------------------+-----------------------+
                   | Lesen / Schreiben
                   v
+------------------------------------------+
|                  MODEL                   |
|  Anlagenkonfiguration (JSON),            |
|  Prüfungszustand, Grenzwerte, Normen     |
+------------------------------------------+
```

---

## Verzeichnisstruktur

```
Simulator/
|-- index.html               <- Einstiegspunkt der PWA
|-- manifest.json            <- PWA Manifest (Name, Icon, Farben)
|-- service-worker.js        <- Offline-Faehigkeit
|
|-- model/
|   |-- anlage.js            <- JSON laden, parsen, validieren
|   |-- pruefung.js          <- Pruefungszustand (was abgehakt, welche Stufe)
|   |-- protokoll.js         <- Messwerte, Bewertungen
|   +-- regeln.js            <- Grenzwerte, Normvorgaben, Fehlerquellen
|
|-- view/
|   |-- schaltkasten.js      <- SVG Visualisierung aus JSON rendern
|   |-- checkliste.js        <- Pruefschritte anzeigen
|   |-- protokoll.js         <- Protokoll-Formular anzeigen
|   +-- timer.js             <- Timer und Sprachansagen (Stufe 3)
|
|-- controller/
|   |-- ablauf.js            <- Phasenreihenfolge, naechster Schritt
|   |-- validator.js         <- Fehler erkennen, Meldungen ausgeben
|   +-- stufen.js            <- Stufen 0-3, Hilfestellung steuern
|
|-- anlagen/                 <- JSON Anlagenkonfigurationen
|   |-- beispiel_eg.json
|   +-- ...
|
|-- docs/                    <- Konzept, Architektur, Referenz
|   |-- KONZEPT.md
|   |-- ARCHITEKTUR.md
|   +-- referenz/
|
+-- tests/
    +-- visuell/
        |-- run_tests.js         <- Testskript: alle Testcases ausfuehren
        |-- test_generator.js    <- Unit-Tests fuer den Generator selbst
        |-- test_messgeraet.js   <- Interaktionstests fuer das Messgeraet
        |-- testcase_01/
        |   |-- anlage.json
        |   +-- anlage.svg
        +-- ...
```

---

## Schritt 1 – Minimale funktionierende App

Dies ist der erste Meilenstein. Alles danach wird schrittweise ergänzt.

```
1. index.html laden
2. Model: anlage.json einlesen
3. View: Schaltkasten als SVG rendern
4. Controller: Klick auf Schraube → Popup (Querschnitt + Kabelfarbe)
```

Das ist ein vollständiger MVC-Zyklus – klein, testbar, funktioniert.

`controller/app.js` ist der Einstiegspunkt und lädt standardmäßig `anlagen/beispiel_eg.json`.
Über den optionalen URL-Parameter `?anlage=<pfad>` lässt sich stattdessen jede andere
Anlagen-JSON interaktiv im Browser öffnen, z.B. zum Ansehen eines Testcases:

```
http://localhost:3000/?anlage=tests/visuell/testcase_02/anlage.json
```

### Testcase Schritt 1

Der Testcase 01 prüft ob Schritt 1 korrekt funktioniert:

```
Input:    tests/visuell/testcase_01/anlage.json
Erwartet: tests/visuell/testcase_01/anlage.svg
Actual:   SVG die die App aus der JSON rendert
Resultat: Vergleich → Pass / Fail
```

**Wichtig:** View und Testcase benutzen denselben Render-Code.
So testet man die echte App – nicht eine separate Implementierung.

### run_tests.js

```javascript
// Fuer jeden Testcase:
// 1. anlage.json laden
// 2. SVG rendern (gleicher Code wie App)
// 3. Mit anlage.svg vergleichen
// 4. Pass / Fail ausgeben

const testcases = ['testcase_01', 'testcase_02', ...];

for (const tc of testcases) {
  const anlage = await Anlage.laden(`tests/visuell/${tc}/anlage.json`);
  const gerendert = SchaltkastenView.renderSVG(anlage);
  const referenz = await lade(`tests/visuell/${tc}/anlage.svg`);
  const ok = vergleiche(gerendert, referenz);
  console.log(`${tc}: ${ok ? 'PASS' : 'FAIL'}`);
}
```

Bei jeder Code-Änderung: `run_tests.js` ausführen → sofortiges Feedback.

**Verdrahtungsprüfung über Attribute:** Jede Schraube trägt im SVG zusätzlich
`data-querschnitt` und `data-farbe` (siehe `schraube()` in `schaltkasten.js`). Da der
Vergleich das komplette SVG-Markup als String prüft, deckt er dadurch auch ab, ob die
richtige Ader (Eingang/Ausgang) an der richtigen Schraube hängt – nicht nur, ob das Bild
optisch gleich aussieht. Ein separates Testscript dafür ist nicht nötig.

**Netzplan-Konsistenzprüfung:** Für Testcases mit `netzplan.md`+`bauteile.md` (siehe
KONZEPT.md, Abschnitt "Netzliste") prüft `run_tests.js` zusätzlich, *bevor* es den
SVG-Vergleich macht, ob die eingecheckte `anlage.json` noch exakt dem entspricht, was
`generate_anlage.js` aktuell aus dem Netzplan erzeugen würde (`generiereAnlage()` wird
dafür als Modul importiert, nicht nur per CLI aufgerufen). Damit kann `anlage.json`
nicht mehr unbemerkt vom Netzplan wegdriften – z.B. nach einer Netzplan-Änderung, die
vergessen wurde zu promoten. Bei Abweichung: `FAIL (Netzplan)` statt eines stillen
Weitertestens mit veralteten Daten. Testcases ohne Netzplan (z.B. `beispiel_eg.json`)
werden dabei übersprungen, da keine Quelle zum Abgleichen existiert.

**Generator-Unit-Tests:** `tests/visuell/test_generator.js` prüft Regeln, die sich
nicht an einem einzelnen Testcase zeigen lassen, sondern absichtlich kaputte
netzplan.md/bauteile.md-Fixtures in einem Temp-Ordner erzeugen (z.B. eine Gruppe,
deren RCD und LS auf unterschiedlichen Hutschienen stehen – siehe KONZEPT.md,
"Mehrere RCDs (Gruppen) können auf einer Hutschiene sein"). `npm test` führt dieses
Skript vor `run_tests.js` aus.

**Messgerät-Interaktionstests:** `tests/visuell/test_messgeraet.js` prüft die
▲/▼/◄►/Drehknopf-Logik aus `controller/app.js` - bewusst **kein** Pixel-Snapshot
wie bei `run_tests.js` (die Messgerät-Optik ändert sich noch zu oft dafür), sondern
gezielte Assertions auf den tatsächlich gerenderten Display-Text (`document.
querySelectorAll('#messgeraet svg text')`), während eine echte Playwright-Seite die
App per Klick auf die realen Buttons steuert (`getByText('▲')` usw. - dieselben
Selektoren, die während der Entwicklung schon für die Screenshot-Verifikation in
`docs/referenz/` verwendet wurden, jetzt als dauerhafte Regressionsprüfung statt
Wegwerf-Skripte). Deckt ab: Drehknopf-Zyklus, ◄►-Wrap-around, RLOW (Titel-Toggle
inkl. R+/R-, Widerstand-Floor bei `___Ω`), RISO (Spannungsliste geklemmt), ZI (LS-Typ/
Bemessungsstrom/Abschaltzeit geklemmt, Lim live neu berechnet, ΔU-Ansicht inkl.
geteilter Variablen), ZS (unabhängig von ZI, ZSrcd-Ansicht mit Std/Low-Toggle),
FI/RCD (Fehlerstrom/Typ geklemmt), sowie dass `setzeBearbeitungenZurueck()` bei
jedem Drehknopf-/ON-OFF-Klick wirklich alle bearbeiteten Werte zurücksetzt - auch
nach einem "Ausflug" zu einer anderen Funktion und zurück. `npm test` führt dieses
Skript zwischen `test_generator.js` und `run_tests.js` aus.

---

## Model

### anlage.js
- Lädt die JSON-Konfigurationsdatei der Anlage
- Validiert die Struktur (Pflichtfelder, TE-Summe **pro Hutschiene**, RCD-Bemessung)
- Stellt die Anlage als Objekt bereit
- Berechnet TE-Breiten automatisch aus Typ und Poligkeit

```javascript
// Beispiel
const anlage = await Anlage.laden('anlagen/beispiel_eg.json');
const gruppe = anlage.hutschienen[0].gruppen[0];
const rcd = gruppe.rcd; // { typ: 'A', polig: 2, te: 2, ... }
```

### pruefung.js
- Hält den aktuellen Zustand der Prüfung
- Welche Phase ist aktiv (Vorbereitung / Besichtigen / Messen / ...)
- Welche Schritte sind abgehakt
- Welche Stufe ist aktiv (0-3)
- Wird lokal gespeichert (localStorage)

### protokoll.js
- Speichert alle Messwerte pro Stromkreis
- Zi / Zs, RPE, RISO, UB, tA, IA
- Bewertung (i.O. / n.i.O.)
- Wird lokal gespeichert

### regeln.js
- Grenzwerte nach VDE 0100-600
- Abschaltbedingungen (2/3-Methode)
- RCD-Auslösezeiten nach Typ
- Fehlerquellen #1-#14 als auslösbare Regeln

```javascript
// Beispiel
Regeln.prufeZs(zs, ls.char, ls.in); // → { ok: true/false, grenzwert: 1.92 }
Regeln.prufeRcd(ta, rcd.typ);        // → { ok: true/false, max_ms: 300 }
```

---

## View

### schaltkasten.js
- Rendert den Unterverteiler als SVG aus der Anlage-JSON
- Massstab: 1mm = 2px, 1TE = 36px, Geraet H = 180px
- Hutschiene mittig durch Geräte
- Reihenfolge: Reihenklemmen → RCD+LS Reihen → Hauptschalter+Klemmen

#### Schraube-Klick Event
Jede Schraube ist klickbar. Klick auf eine Schraube → kleines Info-Popup erscheint mit:
- Querschnitt (z.B. 2.5 mm²)
- Kabelfarbe (z.B. schwarz)

Der Bediener muss selbst herausfinden wohin das Kabel geht – das ist der Lerneffekt.

```javascript
// Beispiel
SchaltkastenView.render(anlage, document.getElementById('schaltkasten'));

// Event: Schraube angeklickt
SchaltkastenView.onSchraubeKlick((ader) => {
  Popup.zeige({
    querschnitt: ader.querschnitt_mm2 + ' mm²',
    farbe: ader.farbe
  });
});
```

### messgeraet.js
- Rendert das Messgerät (BENNING IT 130) als eigene SVG-Komponente, genau wie
  `schaltkasten.js` per `document.createElementNS` aus einzelnen DOM-Elementen
  aufgebaut (kein eingebettetes Bild) – Vorlage ist `docs/referenz/messgeraet_mockup.svg`.
- **Skalierung:** internes Koordinatensystem bleibt `viewBox="0 0 640 280"` (vom
  Mockup übernommen, alle Elementpositionen beziehen sich darauf); die *angezeigte*
  Größe wird separat über `width`/`height` auf die reale Gerätebreite (230mm) im
  selben Maßstab wie der Schaltkasten (1mm = 2px → 460px) herunterskaliert.
- **Datengetrieben pro Drehknopf-Stellung:** `DREHKNOPF_POSITIONEN` trägt zu jeder
  Messfunktion (RLOW/RISO/ZI/ZS/FI-RCD/V~) Label, Winkel am Drehknopf, sowie
  zusätzliche Anzeigefelder (Titel, Aufbau des Hauptmesswerts, Messpunkte-Muster,
  `titelWerte` für ein oder mehrere Werte rechts neben dem Titel, optional
  `nebenwertLinks`/`nebenwertRechts` über dem unteren Strich, ggf. Referenz-LS-Werte
  für ZI/ZS, ggf. Fehlerstrom/Typ für FI/RCD) – nur eingetragen, sobald gegen die
  KONZEPT.md-Tabelle ("Display" → "Anzeige") geprüft (Stand: RLOW, RISO, ZI, ZS,
  FI/RCD). `zustandFuerFunktion(funktion, an)` baut daraus einen fertigen
  Anzeigezustand. Der große zentrale Hauptmesswert zeigt vor einem TEST-Klick
  `---` (bei FI/RCD `___`, da dort mehrere Platzhalter gleichzeitig sichtbar
  sind: Hauptwert `I:___mA` plus `Uci:___V`/`t:___ms` unten – `___` hebt sich
  klarer vom umgebenden Strich-Layout ab); kleinere Werte neben dem Titel (z.B.
  RLOW: kalibrierter Widerstand; RISO: Messspannung; ZI/ZS: LS-Typ/
  Bemessungsstrom/Abschaltzeit; FI/RCD: Fehlerstrom/Typ) können dagegen schon
  vorher als Platzhalter erscheinen. Bei ZI/ZS wird zusätzlich `Lim`
  (Mindestauslösestrom) automatisch aus LS-Typ **und** Bemessungsstrom berechnet:
  `Lim = Faktor(lsTyp) × Bemessungsstrom` (`LIM_FAKTOR_NACH_LS_TYP` +
  `berechneLimText()`, beide aus `view/messgeraet.js` exportiert und auch von
  `controller/app.js` für die Live-Neuberechnung genutzt, siehe unten) – kein
  fest gespeicherter Wert, bleibt also automatisch konsistent, falls sich einer der
  beiden Eingabewerte später ändert. Der Hauptmesswert ist normalerweise mittig
  ausgerichtet, bei FI/RCD über `hauptwertLinksAligniert: true` links (Platz für
  `Uci`/`t` darunter). Noch keins davon an eine echte Netzplan-Berechnung
  angebunden.
- **Zustand lebt im Controller** (`controller/app.js`), nicht in der View: die
  View ist zustandslos und bekommt bei jedem Render einen kompletten Zustand
  übergeben, ähnlich wie `SchaltkastenView.render(anlage, ...)`.
- **Kasten-Indikator im Display:** `zeichneKastenIndikator()` zeichnet unten
  links im Display (auf Höhe der L/PE/N-Messpunkt-Kreise) ein Icon in einem
  umrandeten Kasten – zeigt an, dass über die ◄►-Taste weitere Werte abrufbar
  sind. Normalerweise ein rechtszeigender Pfeil (wie auf der ◄►-Taste,
  `icon: 'pfeil'`, Default); bei V~ stattdessen eine Sanduhr (Bowtie-Form aus
  zwei Dreiecken plus Rahmenstrich oben/unten, `indikatorIcon: 'sanduhr'` in
  `DREHKNOPF_POSITIONEN`) – ausdrücklich nur bei V~, nicht bei den anderen
  Funktionen. Kasten und Icon sind als eine `<g>`-Gruppe gebaut (feste Einheit),
  der Kasten bewusst deutlich größer als das Icon selbst, damit nichts
  überlappt. Für Funktionen ohne weitere Werte über die Pfeiltasten (aktuell ZI,
  ZS und FI/RCD, `indikatorDurchgestrichen: true`) wird der Kasten stattdessen
  mit einem X durchgestrichen. Noch rein statisch (immer sichtbar/durchgestrichen
  je nach Funktion) – unabhängig von der ◄►-Menü-Navigation (siehe nächster
  Punkt), keine inhaltliche Verbindung zwischen beiden.
- **◄►-Taste als Menü-Navigation:** die Taste wandert durch Zone 1 (Titel +
  die Werte aus `titelWerte`, z.B. bei ZI: Titel → LS-Typ → Bemessungsstrom →
  Abschaltzeit → zurück zu Titel) und markiert das jeweils ausgewählte Feld
  invers (weißer Text auf schwarzem Kästchen statt schwarzem Text ohne
  Hintergrund). Index 0 = Titel, Index i+1 = `titelWerte[i]`; die Gesamtzahl
  der Felder (`1 + titelWerte.length`) variiert je Funktion (RLOW/RISO: 2,
  ZI/ZS: 4, FI/RCD: 3, V~: 1 - da V~ keine `titelWerte` hat, bleibt dort immer
  der Titel ausgewählt). `zeichneTitelFeld()` rendert ein einzelnes Feld
  (normal oder invers) und wird sowohl für den Titel als auch für jeden
  `titelWerte`-Eintrag verwendet. Die Kästchengröße wird **nicht** aus der
  Zeichenanzahl geschätzt, sondern per `getBBox()` am tatsächlich gerenderten
  Text gemessen (plus 4px Polsterung) - eine Schätzung passte nicht
  zuverlässig zur tatsächlichen Breite, insbesondere bei Unterstrichen (`___`,
  siehe RLOW-Platzhalter unten): deren Breite/Position variiert stark je nach
  Font-Fallback des Browsers, wodurch sie bei einer festen Schätzung teils
  außerhalb des Kastens und damit unsichtbar landeten. Der Auswahl-Index lebt
  in `controller/app.js` (eigene Variable `zone1Auswahl`, getrennt von
  `messgeraetZustand`, da `zustandFuerFunktion()` bei jedem Drehknopf-/ON-OFF-
  Klick einen komplett neuen Zustand baut) und wird beim Wechsel der Funktion
  oder beim Ein-/Ausschalten auf 0 (Titel) zurückgesetzt.
- **▲/▼-Tasten bearbeiten das per ◄► ausgewählte Feld**, alle Fälle in
  `controller/app.js` (`baueAnzeigeZustand()` wendet die Overrides auf den
  Basis-Zustand aus `zustandFuerFunktion()` an, `aendereAusgewaehltesFeld()`
  reagiert auf ▲/▼, `klemmeIndex(index, richtung, maxIndex)` ist der
  gemeinsame Helfer fürs Klemmen an beiden Enden einer Werteliste):
  - **Titel ausgewählt** (`zone1Auswahl === 0`): togglet die gemeinsame
    Variable `titelZeigtLabel`; was dabei angezeigt wird, ist pro Funktion
    unterschiedlich (in `baueAnzeigeZustand()` je Funktion verzweigt, kein
    generischer Mechanismus):
    - **RLOW:** Titel wechselt zu `messgeraetZustand.label` ("R LOW"), beide
      Varianten bleiben invers markiert. Zusätzlich erscheinen `R+:___`/
      `R-:___` (Vorwärts-/Rückwärts-Widerstand bei der Durchgangsprüfung)
      über dem unteren Strich (links/rechts, wie `nebenwertLinks`/
      `nebenwertRechts` bei ZI/ZS oder FI/RCD) - bei "Durchgang" nicht
      sichtbar. Noch reine Platzhalter.
    - **ZI:** Titel wechselt zu einem festen String `'ΔU'` (nicht zum
      Drehknopf-Label "ZI"). `titelWerte` wird auf `[Spannungsfall%, LS-Typ,
      Bemessungsstrom]` gesetzt (der Spannungsfall-Wert kommt neu dazu), die
      Abschaltzeit wandert stattdessen in ein neues, separates Feld
      `titelWertRechts` (siehe unten). `nebenwertLinks`/`nebenwertRechts`
      (`Isc`/`Lim` aus der normalen Zl-Ansicht) werden auf `null` gesetzt -
      die ΔU-Ansicht nutzt diesen Platz nicht. `hauptwertZeilen` bekommt
      stattdessen vier Einträge: `'ΔU: ___%'`, `'Isc:___A'`, `'Z:___Ω'`,
      `` `Zref: ${ziZref}Ω` `` (eigene Variable, Default `0.1`) - alles
      **einfache Strings**, nicht `{label, wert}`-Objekte wie bei V~ (siehe
      Layout-Hinweis unten).
  - **RLOW, kalibrierter Widerstand ausgewählt** (`zone1Auswahl === 1`):
    ±0,1Ω pro Klick (eigene Variable `rlowKalibrierterWiderstand`), nach
    unten geklemmt bei 0 (zeigt dann `___Ω` statt `0,0Ω`, weitere Klicks nach
    unten bleiben wirkungslos; von dort nach oben normal weiter ab 0,1Ω).
  - **RISO, Prüfspannung ausgewählt** (`zone1Auswahl === 1`): wandert durch
    `RISO_MESSSPANNUNGEN = ['50V','100V','250V','500V','1000V']` (Index
    `risoMessspannungIndex`, Default `'500V'`), an beiden Enden geklemmt
    (kein Wrap-around wie bei ◄►).
  - **ZI, LS-Typ/Bemessungsstrom/Abschaltzeit** - je eine eigene Werteliste
    und ein eigener Index (`ziLsTypIndex`/`ziBemessungsstromIndex`/
    `ziAbschaltzeitIndex` über `ZI_LS_TYPEN`/`ZI_BEMESSUNGSSTROEME`/
    `ZI_ABSCHALTZEITEN`), an beiden Enden geklemmt wie bei RISO.
    `ZI_LS_TYPEN = ['B','C','D','K','Z','L','U','NV','gG']` - L/U/NV/gG sind
    ältere DIN- bzw. Sicherungs- statt aktuelle LS-Charakteristiken (daher
    nicht in `docs/referenz/bauteilwerte.md`, das nur echte LS-Bauteilfelder
    listet), als Referenzgerät für die Zi/Zs-Messung aber ebenso zulässig;
    passend dazu unterstützt `LIM_FAKTOR_NACH_LS_TYP` (`view/messgeraet.js`)
    alle vier bereits seit dessen erster Version. **Dieselben
    drei Variablen** werden in beiden Ansichten (normal "Zl" und "ΔU")
    gelesen und geschrieben - eine Änderung in der einen Ansicht ist sofort
    in der anderen sichtbar. Die zugehörige `zone1Auswahl` ist aber
    **ansichtsabhängig**, da die ΔU-Ansicht ein zusätzliches Feld
    (Spannungsfall) davor einschiebt:
    - Normale "Zl"-Ansicht (`titelZeigtLabel === false`): 1=LS-Typ,
      2=Bemessungsstrom, 3=Abschaltzeit (alle in `titelWerte`, normale
      Mitte-Spacing-Logik).
    - "ΔU"-Ansicht (`titelZeigtLabel === true`): 1=Spannungsfall%
      (`ziSpannungsfallProzent`, eigene Variable, ±0,5 pro Klick, nach unten
      geklemmt bei 0), 2=LS-Typ, 3=Bemessungsstrom (alle drei in
      `titelWerte`), 4=Abschaltzeit (in `titelWertRechts`, siehe
      Layout-Hinweis unten).
    `aendereAusgewaehltesFeld()` prüft deshalb `titelZeigtLabel` **vor**
    `zone1Auswahl`, um die richtige Zuordnung zu treffen.
  - **ZS, LS-Typ/Bemessungsstrom/Abschaltzeit** - strukturell identisch zu
    ZI (gleiche Wertelisten `ZI_LS_TYPEN`/`ZI_BEMESSUNGSSTROEME`/
    `ZI_ABSCHALTZEITEN` wiederverwendet), aber **eigene Indexvariablen**
    (`zsLsTypIndex`/`zsBemessungsstromIndex`/`zsAbschaltzeitIndex`) - ZS und
    ZI messen unterschiedliche Dinge, es wird kein gemeinsamer LS
    vorausgesetzt. Alternative Ansicht heißt `'ZSrcd'` statt `'ΔU'`, mit
    einem neuen Feld `'Std'`/`'Low'` an Stelle des Spannungsfalls
    (`zone1Auswahl 1`, `ZS_STD_LOW`, Index `zsStdLowIndex`). Anders als die
    übrigen Wertelisten (klemmen an den Enden) ist das hier ein reines
    Toggle (`zsStdLowIndex = 1 - zsStdLowIndex`) - ▲ und ▼ machen beide
    dasselbe, da es nur zwei Werte gibt, ähnlich wie beim Titel
    (`titelZeigtLabel`). Anders als bei ZI/ΔU bleibt Zone 2 (Hauptmesswert)
    unverändert - `baueAnzeigeZustand()` überschreibt bei ZS `titel`,
    `titelWerte`, `titelWertRechts` und (wie bei ZI) `nebenwertRechts`
    (`Lim`, siehe nächster Punkt), sonst nichts.
  - **`Lim` live neu berechnet:** anders als ursprünglich (Lücke ist
    behoben) berechnet `baueAnzeigeZustand()` `nebenwertRechts` bei ZI
    (normale "Zl"-Ansicht) und bei ZS (beide Ansichten, "Zs" und "ZSrcd")
    bei jedem Render über `MessgeraetView.berechneLimText(lsTyp,
    lsBemessungsstrom)` neu - mit den jeweils aktuellen, live editierten
    Werten statt den statischen Defaults aus `zustandFuerFunktion()`. Bei ZI
    passiert das nur im `else`-Zweig (normale Ansicht), da die ΔU-Ansicht
    `nebenwertRechts` ohnehin auf `null` setzt; bei ZS gilt es unbedingt
    (vor der `titelZeigtLabel`-Verzweigung), da `Isc`/`Lim` in beiden
    ZS-Ansichten sichtbar bleiben sollen.
  - **FI/RCD, Fehlerstrom/Typ** - je eine eigene Werteliste und ein eigener
    Index (`fircdFehlerstromIndex`/`fircdTypIndex` über
    `FIRCD_FEHLERSTROEME = ['10mA','30mA','100mA','300mA','500mA']`/
    `FIRCD_TYPEN = ['AC','A','F','B','B+']`), an beiden Enden geklemmt wie
    bei RISO/ZI/ZS. `zone1Auswahl 1`=Fehlerstrom, `2`=Typ (FI/RCD hat keine
    alternative Titel-Ansicht wie ZI/ZS, `titelZeigtLabel` bleibt hier ohne
    Wirkung).
  Zone 3 (Messpunkte) ist noch nicht an ▲/▼ angeschlossen. Alle bearbeitbaren Werte werden beim
  Wechsel der Funktion oder beim Ein-/Ausschalten über die gemeinsame
  Hilfsfunktion `setzeBearbeitungenZurueck()` auf ihren Default
  zurückgesetzt.
  - **`titelWertRechts` (optionales zusätzliches Feld ganz rechts):** ein
    einzelner Wert, rechtsbündig am Display-Rand (`text-anchor="end"`,
    analog zu `nebenwertRechts`, aber in Zone 1 statt über dem unteren
    Strich) - genutzt von der ZI-ΔU- und der ZS-ZSrcd-Ansicht für die
    Abschaltzeit, damit die mittlere Reihe nicht auf 4 Werte anwächst.
    Eigener Auswahl-Index direkt
    nach den `titelWerte`-Einträgen (`titelWerte.length + 1`); die
    ◄►-Feldanzahl in `controller/app.js` (`seite`-Handler) zählt ihn
    entsprechend mit. **Layout-Hinweis:** ist `titelWertRechts` gesetzt, wird
    der Abstand zwischen den `titelWerte`-Einträgen in `zeichneDisplay()`
    (`view/messgeraet.js`) von 55px auf 32px reduziert, damit der letzte
    mittige Wert nicht mit dem rechtsbündigen Wert überlappt.
  - **`hauptwertZeilen` mit einfachen Strings statt `{label, wert}`:** war
    bisher nur für V~ gedacht (Label links, Wert mittig in eigener Spalte).
    Die ZI-ΔU-Ansicht braucht stattdessen komplett links ausgerichtete
    Zeilen (z.B. `'Isc:___A'` als ein zusammenhängender String) - `zeichneDisplay()`
    prüft deshalb `typeof zeile === 'string'` und rendert dann nur einen
    einzelnen linksbündigen Text statt der zwei Spalten. Bei reinen
    String-Zeilen wird außerdem automatisch kleinere Schrift (18px statt
    24px) und engerer Zeilenabstand (24px statt 32px) verwendet, damit vier
    Zeilen (ZI-ΔU: ΔU/Isc/Z/Zref) statt drei (V~) in die Zone passen, ohne
    über den unteren Strich hinauszuragen.
- **Aktueller Stand:** ON/OFF-Taste (an/aus, Gerät startet aus), Drehknopf
  (`naechsteFunktion(funktion)` schaltet zyklisch RLOW→RISO→ZI→ZS→FI/RCD→V~→RLOW
  weiter, Zustand wird dabei über `zustandFuerFunktion()` neu aufgebaut - alte
  Messwerte verschwinden automatisch), ◄► (Zone-1-Feld-Auswahl) und ▲/▼
  (Bearbeiten des ausgewählten Feldes, siehe oben) sind interaktiv. Alle
  sechs Messfunktionen sind vollständig gegen die
  KONZEPT.md-Tabelle geprüft: RLOW/RISO/ZI/ZS zeigen einen zentralen Hauptwert
  (ZS praktisch identisch zu ZI, einziger Unterschied ist das Messpunkte-Muster),
  FI/RCD zeigt drei Werte gleichzeitig (Hauptwert `I` links ausgerichtet,
  `Uci`/`t` unten links/rechts über dem Strich), V~ zeigt stattdessen drei Werte
  gestapelt zwischen den beiden Strichen (`hauptwertZeilen` statt `hauptwert` –
  Label links, Wert mittig in einer Spalte; kein `---`, da hier von Anfang an
  ein fester Wert `0V` gezeigt wird statt eines TEST-Platzhalters). TEST-Taste
  und Schrauben-Klicks zum Anlegen von Messpunkten sind noch nicht verdrahtet
  (Buttons ohne `onKlick`-Callback sind nicht klickbar, siehe
  `schraube()`/`taste()`-Muster in `schaltkasten.js`).

```javascript
// Beispiel (siehe controller/app.js)
let zustand = MessgeraetView.zustandFuerFunktion('RLOW', false); // Start: aus

function rendern() {
  MessgeraetView.render(container, zustand, {
    onOff: () => {
      zustand = MessgeraetView.zustandFuerFunktion(zustand.funktion, !zustand.an);
      rendern();
    },
    drehknopf: () => {
      const naechste = MessgeraetView.naechsteFunktion(zustand.funktion);
      zustand = MessgeraetView.zustandFuerFunktion(naechste, zustand.an);
      rendern();
    }
  });
}
```

### checkliste.js
- Zeigt Prüfschritte der aktuellen Phase
- In Stufe 0: alle Hinweise sichtbar
- In Stufe 3: nur Timer sichtbar
- Abhaken aktiviert nächsten Schritt

### protokoll.js
- Formular mit allen Pflichtfeldern nach VDE 0100-600 Anhang NA
- Zi/Zs Spalten klar beschriftet
- Sofortige Bewertung bei Eingabe (grün/rot)
- Warnung bei falscher Spalte

### timer.js
- Sichtbarer 45-Minuten Timer
- Stufe 3: Sprachansagen zu definierten Zeitpunkten
  - 10 min: "Jetzt solltest du bei den Messungen sein"
  - 35 min: "Protokoll abschließen"
  - 45 min: "Zeit ist um"

---

## Controller

### ablauf.js
- Steuert die Reihenfolge der Phasen
- Phase 1 → 2 → 3 → 4 → 5
- Innerhalb Phase 4: Normreihenfolge RPE → RISO → Zi/Zs → RCD
- Generiert automatisch Vor-ISO-Checkliste aus JSON
  (N abklemmen, RCD Typ B abklemmen, AFDD abklemmen)

### validator.js
- Prüft Eingaben gegen Grenzwerte und Normen
- Erkennt bekannte Fehlerquellen #1-#14
- Gibt gezielte Fehlermeldungen aus (nicht warnen, sondern meckern wenn falsch)

```javascript
// Beispiel Fehlerquellen
validator.prufeIsoVorbereitung(anlage, abgehakt);
// → Fehler: "N an HES nicht abgeklemmt!" (Fehlerquelle #9)

validator.prufeZiZsSpalte(stromkreis, eingetrageneMessung);
// → Fehler: "Hinter RCD → Zi messen, nicht Zs!" (Fehlerquelle #14)
```

### stufen.js
- Steuert welche Hilfestellung angezeigt wird
- Stufe 0: alle Hinweise, simulierte Messwerte
- Stufe 1: alle Hinweise, echte Messwerte
- Stufe 2: alle Hinweise, Protokoll auf Papier
- Stufe 3: nur Timer + Sprachansagen

---

## PWA

### manifest.json
```json
{
  "name": "TREI Prüfungs-Simulator",
  "short_name": "Prüfsim",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#333333",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### service-worker.js
- Cacht alle App-Dateien beim ersten Laden
- Funktioniert danach vollständig offline
- Wichtig: kein WLAN im Keller

---

## Entwicklungsreihenfolge (iterativ)

1. **Schritt 1** – Model + View + Controller minimal (Schaltkasten rendern, Schraube klicken)
2. **Testcase 01** – run_tests.js prüft ob SVG korrekt gerendert wird
3. **Checklisten** – Prüfphasen durchklicken
4. **Validator** – Fehlerquellen #1-#14 einbauen
5. **Protokoll** – Formular mit Bewertung
6. **Stufen** – Hilfestellung reduzieren
7. **PWA** – Offline, installierbar
8. **Timer + Sprache** – Stufe 3

---

## Technologie

- **Vanilla JavaScript** – kein Framework, keine Build-Tools
- **SVG** – Schaltkasten-Visualisierung
- **HTML/CSS** – UI
- **localStorage** – Fortschritt und Protokoll speichern
- **Web Speech API** – Sprachansagen in Stufe 3
- **Service Worker** – Offline-Fähigkeit
