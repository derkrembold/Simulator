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

**Verbindungsgraph (`generiereGraph()`/`findePfad()`):** neue Exporte in
`tests/visuell/generate_anlage.js`, siehe KONZEPT.md "Pfadverfolgung und
Fehlersimulation" für die Motivation. Implementierung:
- `findeAlleNetze(netze, pin, funktion)` - wie das bestehende `findeNetz()`,
  liefert aber ALLE Treffer statt nur den ersten (per `Array.filter` statt
  `Array.find`). Nötig, weil ein einzelner Ausgangspin auf mehrere Netze
  verzweigen kann (z.B. `RCD1.o1`, das über zwei separate Adern gleichzeitig
  `LS1.i1` und `LS2.i1` versorgt - beide Netze teilen sich denselben
  physischen Pin, siehe testcase_01/netzplan.md Annahme 2). Mit dem
  ursprünglichen `findeNetz()` (nur erster Treffer) wäre eine der beiden
  Verzweigungen beim Kanten-Aufbau stillschweigend verloren gegangen.
- `knotenFuerFunktion(netze, funktion)` - alle Netz-IDs, die mindestens einen
  Pin mit der gegebenen Funktion (`L1`/`L2`/`L3`/`N`) tragen.
- `kantenFuerFunktion(netze, bauteile, funktion)` - iteriert **generisch**
  über alle Bauteile aus `bauteile.md` (nicht pro Bauteiltyp hartkodiert):
  für jeden Pol `i` (1..`bauteil.pole`, Default 1) wird versucht, `i<i>` und
  `o<i>` für die gegebene Funktion aufzulösen; jeder gefundene
  Von-Netz×Nach-Netz-Kombination wird eine Kante `{von, nach, bauteil,
  geschlossen: true}` hinzugefügt. Funktioniert für LS/RCD/Hauptschalter/
  Klemmen/Reihenklemmen gleichermaßen, weil sie alle derselben
  `i<n>`/`o<n>`-Pinkonvention folgen - kein Sonderfall pro Bauteilart nötig.
  `geschlossen` ist beim Generieren immer `true` (Ausgangs-/Normalzustand
  einer Anlage unter Spannung) - zur Laufzeit im Browser wird das Feld beim
  Schalter-Klick umgeschaltet, siehe "Schalter" unter `app.js` weiter unten
  und KONZEPT.md "Schalter". `graph.json` selbst beschreibt also nur die
  Ausgangs-Topologie, nicht den aktuellen Schaltzustand.
- `generiereGraph(ordner)` - baut für `GRAPH_FUNKTIONEN = ['L1','L2','L3','N']`
  (bewusst ohne `PE`, siehe KONZEPT.md) je einen Teilgraphen
  `{ knoten: string[], kanten: Kante[] }`, Rückgabeform
  `{ L1: {...}, L2: {...}, L3: {...}, N: {...} }`.
- `findePfad(graph, funktion, startNetz, zielNetz)` - Breitensuche (BFS) im
  Teilgraphen der gegebenen Funktion; Kanten werden **ungerichtet**
  durchquert (`kante.von === aktuell` oder `kante.nach === aktuell`, da ein
  geschlossener Schalter in beide Richtungen leitet) und bei
  `geschlossen: false` übersprungen. Rückgabe: Array der durchlaufenen
  Netz-IDs (inkl. Start/Ziel), oder `null`, wenn kein Pfad existiert.

**Verzweigende Adern in `anlage.json` (`ader.weitere`):** `findeAlleNetze()`
wird nicht nur beim Graph-Aufbau genutzt, sondern seit einem Fix auch von
`baueLeitung()` selbst - vorher nutzte `baueLeitung()` (baut
`eingang`/`ausgang.leitung.adern` für RCD/LS/Hauptsicherung) noch `findeNetz()`
(nur erster Treffer), wodurch eine Verzweigung wie `RCD1.o1` → `N6`+`N7` in
`anlage.json` stillschweigend auf nur `N6` reduziert wurde: die zweite
physische Ader (zu `LS2`) hatte dadurch **keine** Schraube irgendwo am RCD, nur
noch `LS2`s eigene Eingangsschraube kannte `N7` - im Schaltkasten-SVG sah es
so aus, als wäre `LS2` gar nicht am RCD angeschlossen (der Graph selbst war
davon nicht betroffen, siehe oben - nur die Anzeige/`anlage.json`-Seite). Fix:
`baueLeitung()` baut jetzt pro Schrauben-Position eine **Haupt-Ader** (erster
Treffer von `findeAlleNetze()`) plus optional `ader.weitere` (Array
zusätzlicher Adern für dieselbe physische Klemme, z.B. `RCD1.o1`s zweite Ader
zu `N7`) - eine Schraube kann eben mehr als ein Kabel tragen ("wie bei einer
Astgabelung"), es entsteht keine zusätzliche Schraube. Auswirkungen:
- `schraube()` in `schaltkasten.js` setzt zusätzlich `data-netz-weitere`
  (kommagetrennte Netz-IDs) neben dem unveränderten `data-netz` (Haupt-Ader,
  rückwärtskompatibel zu allen bestehenden `data-netz="..."`-Selektoren in
  Tests).
- `Popup.zeige()` (`view/popup.js`) akzeptiert jetzt ein optionales `weitere`-
  Array (`{querschnitt, farbe}`-Paare) und zeigt mehrere Zeilen mit ` | `
  getrennt (z.B. `2.5 mm² · schwarz | 1.5 mm² · schwarz`), statt nur die
  Haupt-Ader zu zeigen und die zweite stillschweigend zu verschlucken.
- `controller/app.js`s `berechneRlowMesswert()` sammelt für jede Messspitze
  über `alleNetzeVonAder(ader)` alle Netz-IDs (Haupt-Ader + `weitere`) und
  probiert `findePfad()` für jede Kombination aus Schwarz-Netz × Blau-Netz -
  eine Messspitze an einer geteilten Schraube "sieht" damit alle dort
  geklemmten Adern gleichzeitig, genau wie ein echtes Messgerät.

Getestet in `test_generator.js` gegen den echten, eingecheckten Netzplan von
`testcase_01` (nicht gegen eine Temp-Fixture wie die übrigen Generator-Tests) -
die erwarteten Netz-IDs in den Assertions sind direkt aus
`testcase_01/netzplan.md` abgelesen. Deckt ab: einfache Kette (Einspeisung →
Endstelle SK1), die RCD1.o1-Verzweigung (Einspeisung → Endstelle SK2, anderer
Zweig als SK1), dass zwischen Netzen unterschiedlicher Funktion kein Pfad
gefunden wird, und die vollständige Knotenliste für `L1`.

**Pfad über eine Hutschienengrenze hinweg (testcase_03):** RCD1 (Hutschiene
H3) und RCD2 (Hutschiene H2) teilen sich laut `netzplan.md`-Annahme dasselbe
Einspeise-Netz N6 (analog zu testcase_02s "beide RCDs am selben Netz", siehe
oben) - ein Pfad zwischen einer Reihenklemme auf der RCD1-Seite und einer auf
der RCD2-Seite läuft folglich über diesen gemeinsamen Knoten und über die
physische Hutschienengrenze hinweg (`N25→N23→N20→N6→N10→N16→N33`). Getestet
in `test_generator.js` (`findePfad()` liefert exakt diese Kette) und in
`test_messgeraet.js` über die echte App (Messspitzen auf beiden
Reihenklemmen) - zusammen mit einem zusätzlichen Fehlertabellen-Eintrag auf
der RCD2-Seite (`N16 = 0,5Ω`, bewusst rund gewählt fürs manuelle Nachrechnen)
belegt das, dass `berechneWiderstand()` Fehler-Widerstände aus **beiden**
Zweigen korrekt aufsummiert (`R:0,75Ω`), nicht nur aus dem zuerst gefundenen.

**Ausgabedatei und Anbindung an RLOW: umgesetzt.** `generiereGraph(ordner)`
wird auch über die CLI von `generate_anlage.js` aufgerufen und schreibt
`graph_generated.json` (promotet zu `graph.json`, ein File pro Testcase,
analog zu `anlage.json`) - aber nur, wenn ein `netzplan.md` im Testcase-Ordner
existiert. `model/anlage.js` (`Anlage.ladeGraph(anlagePfad)`) lädt diese Datei
zur Laufzeit per `fetch` (Pfad wird aus dem `anlage.json`-Pfad abgeleitet,
`anlage.json` → `graph.json`; liefert `null`, wenn keine Datei existiert -
kein Fehler, da noch nicht jeder Testcase einen Netzplan hat). `model/pfad.js`
ist ein bewusst dupliziertes Browser-ES-Module-Gegenstück zu `findePfad()` aus
`generate_anlage.js` (Node/CommonJS) - keine gemeinsame Quelle, da das Projekt
keinen Build-Schritt hat (`index.html` lädt ES-Module direkt, `generate_
anlage.js` läuft unter Node/CommonJS); die Funktion ist klein genug (~20
Zeilen BFS), dass die Duplizierung einfacher ist als ein Bundler-Umweg.
`controller/app.js` nutzt beide zusammen für die RLOW-Live-Messung, siehe
"Messspitzen" unter `app.js` weiter unten. Schalterzustand und Fehlertabelle
sind inzwischen ebenfalls angebunden (siehe "Schalter" und "Fehlertabelle"
weiter unten). **Noch nicht umgesetzt:** PE-Teilgraph - siehe KONZEPT.md für
den geplanten Ablauf.

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
nach einem "Ausflug" zu einer anderen Funktion und zurück. Zusätzlich diverse
Tests für die RLOW-Graph-Messung (eigene Helfer
`neueSeiteMitTestcase(testcaseName)`, das direkt einschaltet, und
`rlowHauptwert(page)`, das den `R:`-Text ausliest) gegen `testcase_01`
(Messspitzen auf zusammenhängenden L1-Netzen, unterschiedliche Funktion,
nur eine Messspitze, Aus-/Wiedereinschalten setzt zurück, `ader.weitere`-
Verzweigung, Schalter-Unterbrechung, Fehlertabellen-Summe) und `testcase_04`
(mehrpolige Schalter über mehrere Funktionen hinweg) - siehe die
"Fehlertabelle"- und "Schalter"-Abschnitte weiter unten für die Details.
`npm test` führt dieses Skript zwischen `test_generator.js` und
`run_tests.js` aus.

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
Jede Schraube ist klickbar. Das Verhalten hängt vom **Messmodus** ab (siehe
"Messmodus" unter `controller/app.js` weiter unten) - `schraube()` selbst kennt
diesen Unterschied nicht, sie ruft bei jedem Klick immer denselben, von
`controller/app.js` übergebenen `onKlick(ader, ev.clientX, ev.clientY, kreis)`
auf (das vierte Argument `kreis` ist das DOM-Element des Schrauben-Kreises
selbst - siehe unten, wofür das gebraucht wird). Der Aufrufer entscheidet dann:

- **Messgerät aus (Normalmodus):** kleines Info-Popup erscheint mit
  Querschnitt (z.B. 2.5 mm²) und Kabelfarbe (z.B. schwarz). Der Bediener muss
  selbst herausfinden wohin das Kabel geht – das ist der Lerneffekt.
- **Messgerät an (Messmodus):** kein Popup, stattdessen wird eine
  **Messspitze** angelegt/entfernt (siehe "Messmodus" weiter unten).

```javascript
// Beispiel (vereinfacht, siehe controller/app.js für den echten Code)
SchaltkastenView.render(anlage, container, (ader, x, y, kreis) => {
  if (messgeraetZustand.an) {
    // Messspitze an "kreis" anlegen/entfernen, siehe unten
  } else {
    Popup.zeige({ querschnitt: ader.querschnitt_mm2 + ' mm²', farbe: ader.farbe }, x, y);
  }
});
```

#### Label-Position im Bauteil
`geraet()`s Typenschild-Text (z.B. "A 30mA", "B16", "25A") sitzt direkt unter
dem Header-Balken (`y: y + HEADER_H + 12`), nicht mehr vertikal mittig in der
ganzen Box wie ursprünglich - näher an der Typenschild-Position auf echten
Geräten, und macht in der Boxmitte Platz für das Schalter-Symbol (siehe
unten). Der Header-Balken selbst (`farben.header`, oben in der Box) bleibt
davon unberührt - bewusst getrennt vom Schalter-Symbol, keine Wiederverwendung.

#### Schalter-Symbol (`zeichneSchalter()`)
Zwei Teile: eine feste weiße Box (unverändert wie zuvor) und ein darin
klickbar rotierender **Hebel**.

**Box:** heller Kasten (`#f5f5f5`), Rand in `#555555` (dieselbe Grau-Farbe wie
der äußere Bauteil-Rand, `stroke: '#555555'` am Gehäuse-Rect in `geraet()`).

**Wichtige Design-Vorgabe (mehrfach im Verlauf bestätigt):** Die Box-Position
(`x`/`y`/`width`/`height`) ist **fix und bewegt sich nie**. Zwei frühere
Entwürfe wurden deshalb verworfen, bevor der jetzige Ansatz stand:
1. Die ganze Box wanderte beim Öffnen 40px nach unten
   (`SCHALTER_OFFEN_VERSATZ`) - falsch, weil die Box selbst wandern durfte.
2. Die Box blieb fest, aber ein Balken + drei Riffel-Striche innerhalb
   tauschten beim Klick die Seite durch direktes Verschieben der einzelnen
   `rect`/`line`-Elemente (kein Neu-Rendern des Schaltkastens nötig, da das
   die separat hinzugefügten Messspitzen-Overlays zerstört hätte) - technisch
   funktionierend, aber der User wollte stattdessen einen kompletten Neustart
   mit einer anderen Innen-Mechanik (Rotation statt Neupositionierung).

**Hebel (aktueller, bestätigter Stand):** orientiert an einer vom User
bereitgestellten Vorlage (`C:\Users\rembo\Documents\Classes\Pics\
hebelgeschlossen.svg`, Kopie/Ableitung als
`docs/referenz/hebel_beispiel_geschlossen.svg`/`hebel_beispiel_offen.svg`).
Eigener Rahmen (`stroke: '#222222'`) um Balken + drei Riffel-Linien, Innenfläche
`#dddddd`. Größe wird aus der Box-Größe abgeleitet, nicht fest verdrahtet:
- `hebelBreite = breite - 2 * SCHALTER_HEBEL_RAND` (`SCHALTER_HEBEL_RAND = 4`,
  Abstand zur Box-Kante links/rechts/oben)
- `hebelHoehe = SCHALTER_HOEHE / 2 - SCHALTER_HEBEL_RAND` - **maximal die
  halbe Boxhöhe**, das ist zwingend: der Hebel darf beim Umschalten (siehe
  unten) nie über die Box-Kante hinausragen.
- `hebelX = mitteX - hebelBreite / 2`, `hebelY = mitteY - hebelHoehe` - der
  Hebel füllt im geschlossenen Zustand (Default) exakt die **obere
  Boxhälfte**, seine untere Rahmenkante liegt exakt auf dem Box-Mittelpunkt
  (`mitteX`, `mitteY`).

**Klick-Rotation:** ein Klick auf die Box (`cursor: pointer` auf der äußeren
`<g>`) togglet eine lokale `geschlossen`-Variable und setzt/entfernt
`transform="rotate(180, mitteX, mitteY)"` auf die Hebel-`<g>`-Gruppe - eine
reine SVG-Rotation um den **Box-Mittelpunkt als Drehpunkt** (nicht um die
Hebel-eigene Mitte). Das ist der Grund, warum der Hebel selbst im
geschlossenen Zustand mit seiner unteren Kante exakt auf dem Box-Mittelpunkt
sitzt: nach der 180°-Drehung um genau diesen Punkt liegt seine (jetzt) obere
Kante wieder exakt dort, und der komplette Hebel liegt spiegelbildlich in der
unteren Boxhälfte - Größe/Form bleiben dabei exakt erhalten (reine Rotation,
keine Neupositionierung einzelner Elemente, kein Neu-Rendern des
Schaltkastens, Messspitzen-Overlays bleiben unberührt).

**Anbindung an den Verbindungsgraphen: umgesetzt** (für RLOW). `zeichneSchalter()`
bekommt jetzt einen `onKlick(geschlossen)`-Callback; `geraet()` reicht ihn
zusammen mit dem neuen `bauteilName`-Parameter durch
(`onKlick?.(geschlossen)` wird zu `(geschlossen) => onSchalterKlick?.
(bauteilName, geschlossen)`). `SchaltkastenView.render(anlage, container,
onSchraubeKlick, onSchalterKlick)` hat dafür ein viertes Argument bekommen;
die 3 `geraet()`-Aufrufstellen (RCD/LS/Hauptschalter) übergeben jeweils
`bauteilName: gruppe.rcd.name`/`ls.name`/`hs.name`.

Voraussetzung war ein neues `name`-Feld in `anlage.json`: `rcd`/`ls`/
`hauptsicherung` trugen bisher keinen Bauteilnamen (nur `hauptsicherung.typ`
enthielt ihn zufällig/ungenutzt) - `generate_anlage.js` schreibt ihn jetzt
explizit (`name: rcd.name`/`ls.name`/`hauptschalter.name`), analog zur
früheren `netz`-Feld-Ergänzung bei den Adern.

`controller/app.js`s `schalterUmschalten(bauteilName, geschlossen)`: iteriert
beim Klick über alle Funktions-Teilgraphen (`Object.keys(graph)`, also
`L1`/`L2`/`L3`/`N`) und setzt `kante.geschlossen = geschlossen` für jede Kante
mit `kante.bauteil === bauteilName` - bei einem mehrpoligen Bauteil (z.B.
4-poliges RCD) betrifft das mehrere Kanten in verschiedenen Teilgraphen
gleichzeitig, da alle denselben Bauteilnamen tragen. Mutiert das geladene
`graph`-Objekt direkt (keine separate Zustands-Map wie bei den Messspitzen -
`kante.geschlossen` genügt, `findePfad()` prüft es ohnehin schon). Ruft danach
`renderMessgeraet()` auf (RLOW ist kontinuierlich, zieht sofort nach).
**Bewusst nicht** in `setzeBearbeitungenZurueck()`/`entferneAlleMessspitzen()`
eingebunden - der Schalterzustand bleibt beim Aus-/Einschalten des Messgeräts
erhalten, anders als Messspitzen (explizite User-Vorgabe, verifiziert per
Test: LS1 öffnen → Messgerät aus/an → Messspitzen neu setzen → RLOW zeigt
weiterhin `___Ω`).

Tests in `test_messgeraet.js`: "Schalter: Öffnen von LS1 unterbricht eine
laufende RLOW-Messung" (öffnen → Platzhalter, wieder schließen → `0,60Ω`),
"Schalter: Zustand bleibt beim Aus-/Einschalten des Messgeräts erhalten", und
gegen testcase_04 (einziger Testcase mit mehrpoligen Bauteilen über mehrere
Funktionen hinweg - 3-poliger Hauptschalter, 4-poliges RCD): "Schalter:
4-poliges RCD1 unterbricht L1 UND L2 gleichzeitig" sowie "Schalter: 3-poliger
Hauptschalter unterbricht L1 und L3 gleichzeitig" - belegen, dass ein Klick
wirklich mehrere Kanten in verschiedenen Funktions-Teilgraphen (`L1`/`L2`/
`L3`) gleichzeitig umschaltet, nicht nur eine.

Größenformel (`schalterBreite(schalterTyp, teAnzahl)`), ausgehend von
`SCHALTER_BASISBREITE = 24` (Breite `W` beim 1-poligen LS, `SCHALTER_HOEHE =
36`):
- `schalterTyp: 'einfach'` (LS, Hauptschalter/Leistungsschalter) - Breite =
  `teAnzahl × W`, plus ab 3 Polen ein fester Zusatz pro Pol
  (`SCHALTER_ZUSATZ_PRO_POL_AB_3 = 6`, rein optisch nach User-Feedback -
  "3-poliger Leistungsschalter könnte ein Tick breiter sein"). 1- und
  2-polig bleiben dadurch exakt bei reiner linearer Skalierung (24px/48px),
  3-polig wird 72px + 6px = 78px statt reiner `3×W`. Horizontal **und**
  vertikal mittig im Bauteil (`GERAET_H / 2`). Beim 1-poligen LS (36px
  TE-Breite) bleibt dadurch beidseitig 6px Rand - kein Überlappen mit dem
  Bauteilrand, wie vom User gefordert.
- `schalterTyp: 'rcd'` - Breite = `teAnzahl × TE_PX - SCHALTER_RCD_RAND_LINKS
  (8px) - SCHALTER_RCD_RAND_RECHTS (40px)` - fester linker UND rechter Rand
  statt einer reinen `(teAnzahl - 1) × W`-Formel, damit der 2-polige Fall
  exakt bei `W` (24px) bleibt (User-Feedback: "perfekt, so lassen"), während
  der 4-polige Fall breiter wird als die ursprüngliche Formel (96px statt
  72px, User-Feedback: "kann breiter sein", linker Rand-Abstand aber
  unverändert gut). Vertikal mittig, horizontal nicht zentriert (links
  versetzt).

Alle 4 Testcase-`anlage.svg` wurden nach der Änderung neu generiert und
promotet (nur Label-`y` und die neuen Schalter-Symbol-Elemente als Diff), dann
nach User-Feedback zur Breite ein zweites Mal (nur die Breiten-Formel für 3+
Pole).

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

### app.js
Der tatsächliche, aktuell implementierte Einstiegspunkt (`start()`) - lädt die
Anlage, rendert Schaltkasten und Messgerät und verdrahtet beide miteinander.
Die Messgerät-Zustandslogik (▲/▼/◄►/Drehknopf, `titelZeigtLabel`,
`zone1Auswahl`, alle Wertelisten wie `ZI_LS_TYPEN`) ist bereits ausführlich
unter `messgeraet.js` (View-Abschnitt oben) dokumentiert, da sie eng mit dem
dortigen Datenmodell verzahnt ist. Die `ablauf.js`/`validator.js`/`stufen.js`-
Module weiter unten sind **geplant, noch nicht implementiert** - aktuell steckt
alles in `app.js`.

**Messmodus (Schaltkasten-Popups vs. Messspitzen):** Ob ein Klick auf eine
Schraube ein Info-Popup zeigt oder eine Messspitze anlegt, hängt einzig von
`messgeraetZustand.an` ab (kein eigener Moduswechsel-Zustand nötig - die
Messgerät-ON/OFF-Taste ist gleichzeitig der Modusschalter). Die Callback-
Funktion, die `SchaltkastenView.render()` übergeben wird, prüft das bei jedem
Klick neu (kein erneutes Rendern des Schaltkastens beim Umschalten nötig, da
`messgeraetZustand` als Closure-Variable immer den aktuellen Stand liefert):
- **Aus:** `Popup.zeige(...)` wie bisher.
- **An:** Messspitze anlegen/entfernen, siehe unten. `Popup` wird nicht mehr
  aufgerufen; ein evtl. noch offenes Popup verschwindet automatisch über
  dessen eigenen "Klick außerhalb schließt"-Mechanismus (`popup.js`), sobald
  der Bediener die ON/OFF-Taste anklickt (das zählt als Klick außerhalb).

**Messspitzen:** repräsentiert durch einen farbigen Kreis (`schwarz`/`blau`/
`grün` - mit Umlaut, passend zur Schreibweise in KONZEPT.md/Doku-Prosa, siehe
`MESSSPITZEN_FARBWERTE`), der als zusätzliches `<circle>`-Overlay direkt neben
den bestehenden Schrauben-Kreis gesetzt wird (`svgKreis()`, lokaler Helfer in
`app.js` - `schaltkasten.js` selbst weiß nichts von Messspitzen). Dafür gibt
`schraube()` in `schaltkasten.js` seit dieser Funktion das eigene
Kreis-DOM-Element als viertes Argument an `onKlick` mit (`ev.clientX`/`Y`
allein reichen nicht - das sind Bildschirmkoordinaten fürs Popup, keine
SVG-Koordinaten für die Overlay-Positionierung). Das Overlay bekommt
`pointer-events: none`, damit weitere Klicks auf derselben Stelle weiter beim
Schrauben-Kreis ankommen (sonst würde der Overlay-Kreis alle Folgeklicks
abfangen und der Zyklus bliebe hängen). Der weiße Rand (`stroke-width: 2.5`,
bewusst dicker als ein normaler dünner Rand) sorgt für Kontrast, auch wenn
eine dunkle Messspitze (schwarz) auf einem dunklen Bauteil-Gehäuse
(z.B. Hauptschalter) landet – sonst wäre nur eine kaum sichtbare Fläche zu
sehen.

Klick-Zyklus pro Schraube: `leer → schwarz → blau → grün → leer → ...`
(`naechsteMessspitzenFarbe()`), wobei eine Farbe übersprungen wird, wenn sie
gerade an einer ANDEREN Schraube hängt - jede Farbe ist maximal einmal
gleichzeitig vergeben (3 Messspitzen wie beim echten Gerät: L/N/PE). Zustand
lebt in drei `Map`s mit dem Kreis-Element als Key (`messspitzenFarbe`:
Element → Farbe; `messspitzenOverlay`: Element → Overlay-Circle, zum späteren
Entfernen; `messspitzenAder`: Element → `ader`-Objekt aus der Anlage, für die
Graph-Suche unten) - alle drei leben in `start()`s Closure. Ein Wechsel der
Messfunktion (Drehknopf) lässt sie unangetastet, aber `onOff` ruft beim
**Ausschalten** (nicht beim Einschalten) `entferneAlleMessspitzen()` auf, die
alle Overlay-Kreise aus dem DOM entfernt und alle drei Maps leert - der
Messmodus endet mit dem Gerät, beim nächsten Einschalten ist der Schaltkasten
wieder leer. Noch nicht angebunden: TEST-Taste liest die angelegten
Messspitzen bisher nicht aus (kommt in einem späteren Schritt, siehe
KONZEPT.md "Messgerät") - RLOW ist davon nicht betroffen, siehe unten.

**RLOW-Live-Messung über den Verbindungsgraph:** `start()` lädt zusätzlich
`const graph = await Anlage.ladeGraph(pfad)` neben der Anlage selbst. Jeder
Messspitzen-Klick ruft am Ende `renderMessgeraet()` erneut auf (RLOW misst
laut KONZEPT.md **kontinuierlich**, ohne TEST-Taste - siehe der
nicht-durchgestrichene Pfeil-Kasten im RLOW-Display), was
`baueAnzeigeZustand()` und darin `berechneRlowMesswert()` auslöst:
- Sucht in `messspitzenFarbe` die Kreise mit Farbe `schwarz` bzw. `blau` und
  liest über `messspitzenAder` deren `ader`-Objekt.
- Bricht mit `null` ab, wenn eine der beiden Messspitzen fehlt, keine `netz`-
  ID trägt, oder beide Adern eine unterschiedliche `funktion` haben (z.B.
  schwarz auf L1, blau auf N - kein gemeinsamer Teilgraph, siehe
  `GRAPH_FUNKTIONEN` oben).
- Sonst `findePfad(graph, funktion, schwarzAder.netz, blauAder.netz)`
  (`model/pfad.js`); existiert ein Pfad, wird `berechneWiderstand(graph,
  pfad)` zurückgegeben, sonst `null`.
- `null` lässt den Platzhalter (`R:___Ω` bzw. `Durchgang`-Ansicht) unverändert;
  ein Zahlenwert überschreibt `zustand.hauptwert` mit `` `R:${wert.toFixed(2)
  .replace('.', ',')}Ω` `` (z.B. `R:0,60Ω`, zwei Nachkommastellen für
  eindeutiges manuelles Nachrechnen).

**Fehlertabelle - Anbindung an RLOW: umgesetzt.** `berechneWiderstand(graph,
pfad)` (in `model/pfad.js` und gespiegelt in `generate_anlage.js`) summiert
`graph.fehlertabelle[netzId]` für jede Netz-ID im von `findePfad()`
zurückgegebenen Pfad-Array - Netze ohne Eintrag zählen 0Ω
(`graph.fehlertabelle?.[netzId] ?? 0`). `graph.fehlertabelle` wird von
`parseFehlertabelle(ordner)` in `generate_anlage.js` aus einer optionalen
`## Fehlertabelle`-Sektion in `netzplan.md` geparst (Format `| Netz |
Widerstand (Ω) |`, Komma als Dezimaltrennzeichen) und von `generiereGraph()`
in `graph.json` mit abgelegt (`{ L1: {...}, L2: {...}, L3: {...}, N: {...},
fehlertabelle: { N6: 0.1, ... } }`). Da `fehlertabelle` kein Funktions-
Teilgraph ist (kein `{knoten, kanten}`-Objekt), filtert
`schalterUmschalten()` in `app.js` explizit danach (`Object.keys(graph)
.filter((k) => graph[k]?.kanten)`), um es beim Schalter-Kanten-Update nicht
fälschlich als Teilgraph zu behandeln.

Alle 4 Testcases tragen Beispiel-Netze mit Widerstand - bewusst nicht
flächendeckend, der User befüllt die Tabelle nach Bedarf selbst weiter.
`graph.json` wurde bei jeder Ergänzung neu generiert und promotet (isolierter
Diff: nur das `fehlertabelle`-Feld, `anlage.json`/`anlage.svg` unverändert).
Neben dem ursprünglichen L1-Pfad pro Testcase decken die Werte inzwischen auch
ab: einen N-Pfad (testcase_02, `N10`), einen Pfad über eine Hutschienengrenze
mit zwei unabhängigen RCD-Zweigen (testcase_03, siehe unten), und alle drei
Phasen L1/L2/L3 gleichzeitig (testcase_04, je zwei Netze pro Phase, mit
durchgängig unterschiedlicher zweiter Nachkommastelle für eindeutiges
manuelles Nachrechnen - `test_generator.js`/`test_messgeraet.js` prüfen alle
drei Phasen einzeln).

Voraussetzung dafür ist die `netz`-ID pro Ader: `baueAder()` in
`generate_anlage.js` schreibt sie als neues Feld (`netz: netz.netId`) in jede
Ader von `anlage.json` (nur eine Lookup-ID, nicht der Graph selbst - der bleibt
bewusst in der separaten `graph.json`). `schraube()` in `schaltkasten.js`
spiegelt sie zusätzlich als `data-netz`-Attribut auf dem Schrauben-Kreis
(genutzt u.a. von den RLOW-Tests in `test_messgeraet.js`, um gezielt einzelne
Schrauben per Netz-ID anzuklicken statt über Pixel-Koordinaten).

**Bugfix - Textauswahl bei schnellem Mehrfachklicken:** mehrere schnelle
Klicks auf dieselbe Schraube (z.B. beim Messspitzen-Zyklus) lösten die native
Doppelklick-Textauswahl des Browsers aus, die dann zufällig SVG-Text an
anderer Stelle markierte (z.B. "BENNING IT 130" blau hervorgehoben - wirkte
wie ein Farb-Bug im Messgerät, war aber Text-Selektion). Behoben in
`index.html`: `#schaltkasten`/`#messgeraet` bekommen `user-select: none`
(inkl. `-webkit-`/`-moz-`-Präfix).

**Bugfix - obere PE-Reihenklemmen-Schraube ohne Messpunkt (User-Report):**
`schraube()` hängt den Klick-Handler nur an, wenn eine Ader übergeben wird
(`if (ader) { ... }`) - eine Schraube ohne Ader ist bewusst komplett
unklickbar (kein Draht, kein Messpunkt). Für die PE-Reihenklemme kann
`reihenklemmen_eingang.pe` `null` sein, wenn kein eigenes Zubringerkabel
modelliert ist (PE kommt dann nur über den Hutschienen-Bond, siehe
`generate_anlage.js`) - elektrisch ist die Schraube trotzdem vorhanden und
erreichbar, nur eben ohne separates Kabel. Der Fallback in
`SchaltkastenView.render()` (`const lEingang = eingang ? eingang.l :
lAusgang` usw.) griff aber nur, wenn das ganze `reihenklemmen_eingang`-Objekt
fehlte (alte, handgeschriebene `anlage.json` ohne Netzplan-Ursprung) - nicht,
wenn nur ein einzelnes Feld darin `null` war. Die obere PE-Reihenklemmen-
Schraube bekam dadurch gar kein `data-netz`/keinen Klick-Handler, sobald ein
Stromkreis kein PE-Zubringerkabel hatte (z.B. testcase_01/SK2) - für den User
sichtbar als "PE-Messpunkt an der oberen Reihenklemme lässt sich nicht
setzen", während die untere (Ausgangs-)Schraube und die separate PE-Klemme
am Kastenende normal funktionierten. Fix: Fallback jetzt pro Feld
(`eingang?.l ?? lAusgang` usw.), fällt also auch dann auf die Ausgangs-Ader
zurück, wenn nur das PE-Feld fehlt. Die exakte Netz-ID der Ausgangsseite
weicht dabei elektrisch leicht vom echten Bond-Punkt ab (zwei verschiedene
Netz-IDs, die über den PE-Bond kurzgeschlossen sind) - unkritisch, da PE
ohnehin nicht im Verbindungsgraphen verfolgt wird (siehe "Pfadverfolgung und
Fehlersimulation") und für RISO nur die `funktion === 'PE'`-Kennzeichnung
zählt, nicht die konkrete Netz-ID (siehe `risoEffektiveAder()` unten).
`anlage.svg` aller 4 Testcases neu promotet (isolierter Diff: nur die
zuvor toten oberen PE-Reihenklemmen-Schrauben bekommen `data-netz`/
`cursor:pointer`, sonst nichts geändert). Test in `test_messgeraet.js`.

**Schalter (LS/RCD/Hauptschalter) - Anbindung an den Verbindungsgraphen:**
`SchaltkastenView.render(anlage, container, onSchraubeKlick, onSchalterKlick)`
bekommt als viertes Argument `schalterUmschalten(bauteilName, geschlossen)`
(definiert in `start()`, vor dem `render()`-Aufruf). Beim Klick auf einen
Hebel im Schaltkasten (siehe `zeichneSchalter()` in `schaltkasten.js`):
- Iteriert über alle Funktions-Teilgraphen (`Object.keys(graph).filter((k) =>
  graph[k]?.kanten)`, also `L1`/`L2`/`L3`/`N` - der Filter schließt die
  Nicht-Teilgraph-Felder `fehlertabelle` und `einspeisung` aus) und setzt
  `kante.geschlossen = geschlossen` für jede
  Kante mit `kante.bauteil === bauteilName` - mutiert das geladene
  `graph`-Objekt direkt, keine separate Zustands-Map wie bei den Messspitzen.
  Bei einem mehrpoligen Bauteil (z.B. 4-poliges RCD) betrifft das mehrere
  Kanten in verschiedenen Teilgraphen gleichzeitig, da alle denselben
  Bauteilnamen tragen.
- Ruft danach `renderMessgeraet()` auf - RLOW ist kontinuierlich, `findePfad()`
  findet ab sofort keinen Pfad mehr über die geöffnete Kante, der Platzhalter
  erscheint wieder.
- **Bewusst nicht** in `setzeBearbeitungenZurueck()`/`entferneAlleMessspitzen()`
  eingebunden - der Schalterzustand bleibt beim Aus-/Einschalten des
  Messgeräts erhalten (anders als Messspitzen), da er den echten Zustand der
  Anlage abbildet, nicht den Mess-Vorgang selbst (explizite User-Vorgabe).

Voraussetzung war ein neues `name`-Feld in `anlage.json` bei `rcd`/`ls`/
`hauptsicherung` (vorher fehlte der Bauteilname dort komplett, nur
`hauptsicherung.typ` enthielt ihn zufällig/ungenutzt) - `generate_anlage.js`
schreibt ihn jetzt explizit, analog zur früheren `netz`-Feld-Ergänzung bei den
Adern. `geraet()` in `schaltkasten.js` reicht `bauteilName` an
`zeichneSchalter()` durch, dessen `onKlick(geschlossen)`-Callback dann zu
`onSchalterKlick(bauteilName, geschlossen)` wird.

Getestet in `test_messgeraet.js`: "Schalter: Öffnen von LS1 unterbricht eine
laufende RLOW-Messung", "Schalter: Zustand bleibt beim Aus-/Einschalten des
Messgeräts erhalten", und die beiden testcase_04-Mehrpol-Tests (siehe
`schaltkasten.js`-Abschnitt oben) - decken zusammen ab, dass ein einzelner
Klick auf ein mehrpoliges Bauteil (RCD 4-polig, Hauptschalter 3-polig)
wirklich alle zugehörigen Kanten über mehrere Funktions-Teilgraphen hinweg
gleichzeitig umschaltet.

**RISO (Isolationswiderstand) - prototypisch umgesetzt.** Erste echte Nutzung
der bis dahin komplett unverdrahteten TEST-Taste (`messgeraet.js` unterstützte
`onKlick.test` schon vorher optisch/als Klick-Handler, `app.js` reichte aber
nie einen `test:`-Callback durch).

Vorbereitend wurde `berechneRlowMesswert()` in zwei Hilfsfunktionen zerlegt,
die RLOW und RISO jetzt gemeinsam nutzen (kein dritter Kopie-Block):
- `messspitzenAderNachFarbe(farbe)` - kapselt die Suche in `messspitzenFarbe`
  → `messspitzenAder` nach Kreis-Farbe.
- `findePfadZwischenAdern(funktion, aderA, aderB)` - probiert `findePfad()`
  für jede Kombination aus `alleNetzeVonAder(aderA)` × `alleNetzeVonAder(aderB)`
  (berücksichtigt also auch `ader.weitere`-Verzweigungen).

Neu in `generate_anlage.js`/`model/pfad.js` (Node- und Browser-Version
identisch, wie bei `findePfad()`/`berechneWiderstand()` bewusst dupliziert):
- `graph.einspeisung` - neues Top-Level-Feld (kein Funktions-Teilgraph, wird
  von `schalterUmschalten()`s Filter mit ausgeschlossen, siehe oben), pro
  `GRAPH_FUNKTIONEN`-Eintrag die Netz-ID der Einspeisung
  (`findeEinspeisungsNetz()` sucht den Pin `Einspeisung.<funktion>`). Für die
  bisherigen Testcases: `{L1: 'N1', L2: null, L3: null, N: 'N2'}`
  (testcase_01/02/03, einphasig) bzw. `{L1: 'N1', L2: 'N2', L3: 'N3', N: 'N4'}`
  (testcase_04, dreiphasig).
- `istSpannungFuehrend(graph, funktion, netz)` - `findePfad(graph, funktion,
  graph.einspeisung[funktion], netz) !== null`. Prüft damit den **kompletten
  Pfad** zur Einspeisung inklusive jedes Schalters darin, nicht pauschal nur
  den Hauptschalter - ein offenes RCD macht seine eigenen Ausgänge "tot",
  auch wenn der Hauptschalter noch geschlossen ist (explizite User-Vorgabe,
  mit einem eigenen Test in `test_generator.js` abgesichert).

Neu in `app.js`:
- `RISO_L_FUNKTIONEN = ['L1', 'L2', 'L3']`.
- `risoPaarTyp(aderA, aderB)` - bestimmt den Messtyp für ein beliebiges
  Adernpaar **symmetrisch**, unabhängig davon, welche Farbe (Schwarz/Blau)
  welche Rolle hat: `'LN'` (eine Ader auf L1/L2/L3, die andere auf `N` ODER
  `PE` - siehe `risoEffektiveAder()` unten), `'LL'` (beide auf L1/L2/L3, aber
  unterschiedliche Phasen), sonst `null` (z.B. beide auf derselben Phase,
  oder keine der beiden auf L). Wie am echten Gerät ist eine
  Widerstandsmessung richtungsunabhängig - Schwarz auf N und Blau auf L1
  misst dasselbe wie umgekehrt (User-Vorgabe, mit einem eigenen Test in
  `test_messgeraet.js` abgesichert).
- `risoEffektiveAder(ader)` - bewusste Vereinfachung für die Verwechslung
  N/PE (realistischer Fall im Prüfungsalltag, anders als ein tatsächlich
  aufgetrennter PE-Leiter, der praktisch nie vorkommt): eine Ader mit
  `funktion === 'PE'` wird durch eine synthetische `{funktion: 'N', netz:
  graph.einspeisung.N}` ersetzt, alle anderen Adern unverändert
  durchgereicht. Kein eigenständiger PE-Graph nötig (der wäre wegen
  möglicher Zyklen über den Hutschienen-Bond ein größeres eigenes Vorhaben,
  siehe "Pfadverfolgung und Fehlersimulation" oben) - die Begründung ist rein
  elektrisch: PE und N sind am Sternpunkt ohnehin verbunden, und da PE hier
  nie aufgetrennt wird, ist "irgendwo auf PE" gleichbedeutend mit "direkt am
  N-Einspeisungspunkt". Wird sowohl von `berechneRisoSpannung()` als auch von
  `risoTestKlick()` vor der eigentlichen Pfadsuche angewendet.
- `berechneRisoSpannung()` - **live**, ruft bei jedem Render neu auf (nicht
  TEST-gebunden). Liest Schwarz-/Blau-Ader, ruft `risoPaarTyp()` auf den
  **rohen** Adern auf (Klassifizierung berücksichtigt PE-als-N) - `null` →
  `0`. Liefert den Spannungswert (230V bei `'LN'`, 400V bei `'LL'`) nur, wenn
  `istSpannungFuehrend()` für die **effektiven** Adern (nach
  `risoEffektiveAder()`) true ist, sonst `0`.
- `risoTestKlick()` - an die TEST-Taste gebunden (`test: risoTestKlick` im
  Options-Objekt von `renderMessgeraet()`). Bricht ab, wenn Funktion nicht
  RISO ist, eine der drei Messspitzen (Schwarz/Blau/Grün) fehlt,
  `risoPaarTyp(schwarzAder, blauAder)` `null` liefert, oder Grün nicht auf PE
  sitzt. Ist `berechneRisoSpannung() > 0` (Sicherheits-Verhalten: solange noch
  Spannung anliegt, gibt es keinen Messwert), setzt `risoTestKlick()`
  `risoMesswert` explizit auf `null` zurück - ein TEST-Klick bei anliegender
  Spannung springt also aktiv auf den Platzhalter `R:---MΩ`, statt einen
  älteren Messwert stehen zu lassen (z.B. wenn zwischen zwei TEST-Klicks ein
  Schalter wieder geschlossen wurde). Sonst wie RLOW, aber mit den
  **effektiven** Adern: `findePfadZwischenAdern()` + `berechneWiderstand()`;
  kein Pfad → `risoMesswert = Infinity` (Sentinel, Anzeige `R:>999MΩ`).
- `risoMesswert` - neue State-Variable, startet `null` (Platzhalter). Wird bei
  **jeder** Messspitzen-Änderung und in `setzeBearbeitungenZurueck()`
  (Drehknopf-Wechsel, ON/OFF) auf `null` zurückgesetzt - anders als der
  Schalterzustand oben lebt dieser Messwert nur für den aktuellen
  Messvorgang, nicht persistent über Ein-/Ausschalten hinweg.
- `baueAnzeigeZustand()`s RISO-Zweig setzt zusätzlich
  `zustand.spannungUnterPe = \`${berechneRisoSpannung()}V\`` (immer ein Wert,
  nie ein Platzhalter, Default `0V`) und überschreibt `zustand.hauptwert` nur,
  wenn `risoMesswert !== null`.

Neu in `messgeraet.js`: `zeichneDisplay()` rendert `zustand.spannungUnterPe`
unter dem halb gefüllten PE-Kreis (`x+177, kreisY+19`, Schriftgröße 9,
zentriert) - passt noch knapp vor die untere Display-Kante.

Grenzen des Prototyps (bewusst akzeptiert, siehe KONZEPT.md): mit dem
heutigen Graph-Modell sind L1/L2/L3/N vollständig getrennte Teilgraphen ohne
Querverbindung, es gibt noch keinen Mechanismus, der künstlich einen
Isolationsfehler zwischen zwei Funktionen einspeist. Der "Pfad gefunden"-Zweig
in `risoTestKlick()` ist deshalb heute praktisch nie erreichbar - der Code ist
aber bereits dafür strukturiert, sobald ein Fehlerfall-Mechanismus dafür
existiert.

Getestet in `test_messgeraet.js` (12 Tests): Spannung liegt an → 230V
angezeigt, TEST wirkungslos; Schwarz/Blau vertauscht (Rollen-Symmetrie, siehe
`risoPaarTyp()` oben) → dasselbe Ergebnis; Hauptschalter öffnen → 0V, TEST
zeigt `R:>999MΩ`; RCD öffnen bei weiterhin geschlossenem Hauptschalter →
hinter dem RCD trotzdem 0V/messbar (der eingangs erwähnte
Einspeisungs-Pfad-Test); TEST bei erneut anliegender Spannung setzt einen
alten Messwert zurück auf den Platzhalter; 400V zwischen zwei verschiedenen
Phasen (nur mit testcase_04 testbar, da dort L1/L2/L3 getrennt eingespeist
werden); Grün nicht auf PE, ungültiges Paar (beide auf derselben Phase), und
fehlende dritte Messspitze → TEST bleibt jeweils wirkungslos; eine
Messspitzen-Änderung nach einem TEST-Klick macht den alten Messwert
ungültig; N-Sonde auf PE statt N (siehe `risoEffektiveAder()` oben) → 230V
werden trotzdem angezeigt, und die Erkennung eines offenen Hauptschalters
funktioniert genauso wie bei korrekt platzierter N-Sonde. Dazu ein neuer
Node-Test in `test_generator.js` für `istSpannungFuehrend()` direkt gegen
den Graphen.

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
