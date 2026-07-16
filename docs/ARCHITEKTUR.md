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

#### Programmatisches Umschalten (`schalterHandles`, Status: umgesetzt)

Bis hierhin konnte ein Hebel nur über den echten Mausklick auf die `<g>`
umschalten - `geschlossen` und der Rotations-`transform` lebten rein in der
Closure von `zeichneSchalter()`, ohne dass `controller/app.js` von außen
darauf zugreifen konnte. Grund für den Umbau: FI/RCD sollte nach einem
erfolgreichen TEST den gefundenen RCD automatisch auslösen (siehe
`fircdTestKlick()` unten) - das braucht einen Weg, denselben Zustandswechsel
programmatisch statt per Klick auszulösen.

- `zeichneSchalter(svg, mitteX, mitteY, breite, onKlick, initialGeschlossen = true)`:
  neuer fünfter Parameter, Default `true` (unverändertes Verhalten). Die
  Rotations-Logik (`if (geschlossen) hebel.removeAttribute('transform') else
  hebel.setAttribute('transform', ...)`) wurde in eine kleine interne
  `hebelAnwenden()`-Funktion extrahiert, einmal beim Zeichnen aufgerufen
  (damit `initialGeschlossen: false` sofort korrekt gezeichnet würde - aktuell
  nirgends genutzt, aber die zuvor stillschweigend immer-geschlossen
  gezeichnete Startposition war streng genommen falsch, sobald ein Testcase
  mal mit offenem Schalter starten sollte) und erneut im Klick-Handler.
  Rückgabewert ist jetzt ein Handle `{ setGeschlossen(neu) }`: no-op, wenn
  `neu === geschlossen` (kein Redraw/Callback ohne echte Zustandsänderung),
  sonst exakt derselbe Ablauf wie beim Klick-Handler (`geschlossen = neu`,
  `hebelAnwenden()`, `onKlick?.(geschlossen)`) - **ein Mausklick und ein
  programmatischer Aufruf laufen dadurch über denselben Callback-Pfad**, kein
  zweiter, paralleler Zustand.
- `geraet()`: neuer `schalterHandles`-Parameter (eine `Map`, optional) -
  wird nach dem `zeichneSchalter()`-Aufruf mit `schalterHandles?.set(bauteilName,
  handle)` befüllt, falls `schalterTyp` gesetzt ist. Die `breite`-Rückgabe von
  `geraet()` selbst blieb unverändert (die Aufrufer akkumulieren `gx +=
  geraet(...)` bzw. `hx = geraet(...)` für die Positionierung - eine
  Rückgabetyp-Änderung hier hätte das gebrochen, darum läuft das Handle über
  einen separaten, von außen hereingereichten Sammel-Parameter statt über den
  Rückgabewert).
- `SchaltkastenView.render(...)`: legt `const schalterHandles = new Map()`
  zu Beginn an, reicht sie an alle 3 `geraet()`-Aufrufstellen (RCD/LS/
  Hauptschalter) durch, und gibt am Ende statt nur `svg` jetzt
  `{ svg, schalterHandles }` zurück. Beide bisherigen Aufrufer angepasst:
  `controller/app.js` destrukturiert `const { svg: schaltkastenSvg,
  schalterHandles } = SchaltkastenView.render(...)`; `tests/visuell/
  run_tests.js` ignoriert den Rückgabewert ohnehin (`SchaltkastenView.render(
  anlage, container, () => {})` ohne Zuweisung), unverändert lauffähig.
- `fircdTestKlick()`: wird ein RCD gefunden (Ampel grün), zusätzlich
  `schalterHandles.get(rcd.name)?.setGeschlossen(false)` - öffnet dessen Hebel
  visuell UND (über den `onKlick`-Callback → `onSchalterKlick` →
  `schalterUmschalten(rcd.name, false)`) im Verbindungsgraphen, exakt wie ein
  echter Klick auf diesen Hebel. `schalterUmschalten()` rendert das Messgerät
  dabei bereits selbst einmal neu (Spannungsanzeige fällt sofort auf 0V, da
  der Pfad jetzt unterbrochen ist); der bestehende `renderMessgeraet()`-Aufruf
  am Ende von `fircdTestKlick()` rendert danach nochmal - redundant, aber
  harmlos, kein zusätzlicher Zustand involviert.

Test in `test_messgeraet.js`: "FI/RCD: erfolgreicher TEST öffnet automatisch
den Hebel des gefundenen RCD" (testcase_01) - Hebel-Transform vor TEST `null`
(geschlossen), nach TEST `rotate(180, 20, 340)` (RCD1s Box-Mittelpunkt,
offen); Spannungsanzeige fällt dabei auf `0V`, die übernommenen Messwerte
(`I:18,0mA` etc.) und die grüne Ampel bleiben trotzdem im Display stehen.

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
- Rendert das Messgerät (beschriftet als "INSTALLATIONSTESTER", Vorbild BENNING IT 130) als eigene SVG-Komponente, genau wie
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
  `Lim = Faktor(lsTyp) × Bemessungsstrom` (`LIM_FAKTOR_NACH_LS_TYP`, modulintern
  in `view/messgeraet.js`, nicht exportiert). Zwei Varianten exportiert:
  `berechneLimText()` (formatierter Text `Lim: X,XA`, für die Anzeige) und
  `berechneLim()` (roher Zahlenwert, seit der Isc/Lim-Ampel bei ZI gebraucht -
  siehe `controller/app.js` unten). Beide von `controller/app.js` für die
  Live-Neuberechnung genutzt – kein fest gespeicherter Wert, bleibt also
  automatisch konsistent, falls sich einer der beiden Eingabewerte später
  ändert. Der Hauptmesswert ist normalerweise mittig
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
  ein fester Wert `0V` gezeigt wird statt eines TEST-Platzhalters). Schrauben-
  Klicks zum Anlegen von Messpunkten sind seit dem Messmodus verdrahtet
  (siehe `app.js` unten), die TEST-Taste über den `testKlick()`-Dispatcher
  seit RISO und ZI (ruft je nach `messgeraetZustand.funktion` `risoTestKlick()`
  bzw. `ziTestKlick()` auf, siehe dort) - für ZS/FI/RCD/V~ ist sie weiterhin
  ohne Effekt, da `testKlick()` für diese Funktionen keinen Handler aufruft
  (siehe `schraube()`/`taste()`-Muster in `schaltkasten.js`).
- **Display-Rahmen + Ampel-Leuchtstreifen:** `zeichneDisplay()` zeichnet vor
  dem eigentlichen Display-Rechteck einen 6px breiten Rahmen
  (`DISPLAY_RAHMEN_BREITE`), gefüllt in derselben Farbe wie das
  ausgeschaltete Display (`DISPLAY_AUS_FARBE = '#333333'`) - wirkt dadurch
  wie ein durchgehender Bezel, egal ob das Gerät an oder aus ist. Darüber
  liegen zwei schmale Streifen-Rechtecke, exakt auf Display-Höhe begrenzt
  (nicht die volle Rahmenhöhe, damit die runden Rahmen-Ecken oben/unten
  dunkel bleiben): links `zustand.leuchteLinksAn` steuert
  `DISPLAY_LEUCHTE_LINKS_AN_FARBE` (`#ff6666`, hellrot) vs.
  `DISPLAY_LEUCHTE_AUS_FARBE` (`#999999`, grau), rechts analog
  `zustand.leuchteRechtsAn` → `DISPLAY_LEUCHTE_RECHTS_AN_FARBE` (`#66ee66`,
  hellgrün). Beide Felder sind optional und nur von RISO belegt (siehe
  `risoAmpel` in `app.js` unten) - bei jeder anderen Funktion bleiben beide
  Streifen grau, da `zustand.leuchteLinksAn`/`RechtsAn` dort `undefined`
  sind.

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

**Status: erste Ausbaustufe umgesetzt** (rein ein-/ankreuzbar, siehe
KONZEPT.md "Prüfprotokoll (View-Objekt)"). Drittes View-Objekt neben
Schaltkasten und Messgerät, gerendert in `#protokoll` unterhalb von
`#messgeraet`. Anders als `schaltkasten.js`/`messgeraet.js` (reines SVG, per
`svgEl()`/`document.createElementNS`) baut dieses Modul mit normalen
HTML-Elementen - Tabellen, `<input type="text">`, klickbare ☐/☒-`<span>`s -
über einen großen Template-String (`container.innerHTML = ...`), da hier
echte Texteingabe gebraucht wird (native Eingabefelder statt SVG-Text).
Zweites HTML-basiertes View im Projekt neben `view/popup.js`.

- `sorgeFuerCss()`: injiziert einmalig ein `<style>`-Element mit allen
  `.pf-*`-Klassen in `document.head` (Guard über `cssEingefuegt`, damit
  mehrfaches `render()` - z.B. Testcase-Wechsel - das `<style>` nicht
  dupliziert). Bewusst modul-eigenes CSS statt Ergänzung in `index.html`s
  `<style>`-Block (anders als `.popup`), da hier deutlich mehr
  Formular-spezifische Klassen anfallen als bei einem einzelnen Tooltip.
- Inhalt/Struktur exakt aus `docs/referenz/Prüfprotokoll.md` übernommen:
  `BESICHTIGEN_PUNKTE` (14), `ERPROBEN_PUNKTE` (7), `ERDUNG_PUNKTE` (16),
  `STROMKREIS_SPALTEN` (20, wortgleich aus der Tabellenüberschrift der .md)
  als Konstanten-Arrays, daraus generieren `pruefpunktTabelle()`/
  `baueStromkreisverteiler()`/`baueMessgeraeteTabelle()` die jeweiligen
  `<table>`s. Optik an `docs/referenz/Prüfprotokoll.pdf` angelehnt (schwarz
  umrandetes Blatt `.pf-blatt`, kompakte Tabellenzellen, ☐-Kästchen) - kein
  Pixel-Nachbau, sondern derselbe amtliche Formular-Charakter.
- `ProtokollView.render(container, breitePx)`: setzt `container.style.width`
  auf `breitePx` (von `controller/app.js` als `schaltkastenSvg.
  getAttribute('width')` durchgereicht - identisches Prinzip wie beim
  Messgerät, siehe unten), baut das komplette Formular (Seite 1 + Seite 2
  als zweites `.pf-blatt` darunter) und hängt EINEN Klick-Listener auf den
  Wurzel-Container (Event-Delegation über `ev.target.closest('.pf-cb')`)
  statt eines Listeners pro Kästchen - togglet `textContent` zwischen `☐`
  und `☒`, unabhängig von jedem anderen Kästchen (bewusst kein
  Radio-Verhalten, auch nicht innerhalb einer Options-Gruppe wie
  "Netzform").
- **Messen – Stromkreisverteiler** (20 Spalten) ist breiter als die
  Schaltkasten-Breite - eigener `overflow-x: auto`-Wrapper (`.pf-scroll`),
  unabhängig vom Rest des Blatts, der selbst nicht seitlich scrollt. Erste
  Datenzeile hat "Hauptleitung" als vorausgefüllten `value` im
  Zielbezeichnung-Feld (wie in der .md-Vorlage), die restlichen 10 Zeilen
  sind komplett leer.
- **Bewusst NICHT Teil dieser Ausbaustufe** (verschoben nach KONZEPT.md
  "Nächste Schritte"): Verknüpfung mit echten Messwerten aus dem Messgerät,
  automatische Übernahme ins Protokoll, Bewertung/Validierung (grün/rot),
  Warnung bei falscher Spalte (Fehlerquelle #14) - das hier beschriebene
  Modul ist reine Ein-/Ankreuz-Funktion.

`controller/app.js`: `ProtokollView.render(protokollContainer,
schaltkastenSvg.getAttribute('width'))` direkt nach dem bestehenden
`messgeraetContainer.style.width`-Aufruf, `index.html` bekam dafür ein neues
`<div id="protokoll">` unterhalb von `#messgeraet` plus eine minimale
`#protokoll { margin-top: 20px; }`-Regel.

**Linksbündig, nicht zentriert:** die erste Fassung nutzte `margin: 20px
auto 0` - der `auto`-Wert links/rechts zentriert den `#protokoll`-Container
innerhalb der `body`-Breite, nicht innerhalb der (schmaleren)
Schaltkasten-Breite. Bei einem Viewport, der breiter als der Schaltkasten
ist, rutschte das Blatt dadurch sichtbar nach rechts, statt direkt unter dem
Schaltkasten zu stehen (anders als `#messgeraet`, dessen `justify-content:
center` nur den *Inhalt innerhalb* des ohnehin schon auf Schaltkasten-Breite
gesetzten Containers zentriert, nicht den Container selbst). Fix: `auto`
entfernt, nur noch `margin-top` - `#protokoll` bleibt dadurch wie
`#schaltkasten` im normalen Fluss linksbündig, beide Container haben
dieselbe linke Kante (verifiziert per `getBoundingClientRect().left` bei
einem absichtlich breiteren Viewport als die Schaltkasten-Breite, um den
alten Bug überhaupt sichtbar zu machen).

Getestet in `tests/visuell/test_protokoll.js` (eigene Testdatei, gleiches
Server/`pruefe()`-Muster wie `test_messgeraet.js`, in `package.json`s
`test`-Skript ergänzt, 6 Tests): Breite entspricht exakt der gerenderten
Schaltkasten-Breite; linke Kante steht (bei absichtlich breiterem Viewport
als die Schaltkasten-Breite) bündig unter der Schaltkasten-Kante statt
zentriert zu sein; ein Kästchen togglet zwischen ☐/☒ und lässt andere
Kästchen unberührt; Texteingabe in ein Feld wird übernommen (`inputValue()`);
die Stromkreisverteiler-Tabelle hat 20 Spalten/12 Zeilen (1 Kopf + 11 Daten)
und braucht tatsächlich horizontalen Scroll (`scrollWidth > clientWidth`);
die Besichtigen-Tabelle enthält alle 14 Prüfpunkte aus der .md-Vorlage.

### steckdosen.js

**Status: Zeichnung, Popup UND Messspitzen umgesetzt** (siehe KONZEPT.md
"Steckdosen (View-Objekt)"). Viertes View-Objekt, gerendert in `#steckdosen`,
**oberhalb** von `#schaltkasten` (`index.html`: neues `<div id="steckdosen">`
vor `<div id="schaltkasten">`, plus `#steckdosen { margin-bottom: 20px; }`
- bewusst KEIN `display: flex; justify-content: center` wie bei Messgerät,
siehe "Linksbündig, direkt über dem Schaltkasten" unten). Reines SVG (wie
`schaltkasten.js`/`messgeraet.js`, per `svgEl()`).

- `findeStromkreis(anlage, sk)`: läuft `anlage.hutschienen[].gruppen[].
  stromkreise[]` durch und liefert das komplette Stromkreis-Objekt für die
  gegebene `bezeichnung` (z.B. `"SK1"`) - kein eigener Lookup-Aufbau, direkt
  auf der schon geladenen `anlage.json` gesucht. Liefert sowohl `.endstelle`
  (Steckdose/Lichtauslass) als auch `.leitung.adern` (L/N/PE-Ader-Objekte mit
  Netz-ID, siehe unten).
- `findeAder(adern, funktion)`: sucht in `sk.leitung.adern` die Ader mit
  passender Funktion (`'L'` matcht `L1`/`L2`/`L3` per `startsWith`, `'N'`/
  `'PE'` exakt).
- `klickbar(el, ader, onKlick)`: macht ein beliebiges SVG-Element (Kreis oder
  Rechteck) klickbar wie eine Reihenklemmen-Schraube (`schraube()` in
  `schaltkasten.js`) - setzt `cursor: pointer` und ruft bei Klick
  `onKlick(ader, ev.clientX, ev.clientY, el)` auf. Ohne `ader` bleibt das
  Element unklickbar (No-op, `el` wird trotzdem zurückgegeben).
- `zeichneSteckdose(svg, cx, cy, rotationGrad, adern, onSchraubeKlick)` /
  `zeichneAnschlussdose(svg, cx, cy, rotationGrad, adern, onSchraubeKlick)`:
  bauen die jeweilige Zeichnung aus Grundformen
  (`rect`/`circle`/`path`) mit Konstanten, die 1:1 aus den finalisierten
  Vorlagen `docs/referenz/steckdose_vorlage.svg`/`anschlussdose_vorlage.svg`
  übernommen sind (dort mit Playwright `getCTM()`/`getBBox()` exakt
  vermessen, da die Vorlagen selbst mehrfach verschachtelte
  Skalierungs-Transforms haben). Alle Maße in mm, multipliziert mit der
  Modul-Konstante `MM = 2` (1mm = 2px, wie überall sonst im Schaltkasten-
  Maßstab). Rotation wird als `<g transform="rotate(rotationGrad, cx, cy)">`
  um das jeweilige Gerätezentrum gelegt - bei einer Steckdose (die selbst
  180°-punktsymmetrisch ist) macht das bei `@180` optisch keinen sichtbaren
  Unterschied, ist aber korrekt umgesetzt (per Playwright am `transform`-
  Attribut verifiziert, nicht am Pixel-Bild).
  - Steckdose: äußerer/innerer abgerundeter Rahmen, Außenkreis, vier
    Kontakt-Kerben (eine Geometrie + Vorzeichen-Spiegelung für die anderen
    drei Ecken, analog zum `<use>`-Mirroring in der Vorlage, hier aber direkt
    über `mx`/`my` ∈ `{1,-1}` in der Pfad-Berechnung statt eines echten
    `<use>`-Elements), zwei L/N-Kontaktkreise (r=2mm, klickbar über
    `findeAder(adern, 'L'/'N')`), zwei PE-Kontakte (Rechtecke oben/unten,
    beide mit derselben PE-Ader klickbar - physisch derselbe Punkt).
  - Anschlussdose: zwei konzentrische Ringe, drei Steckklemmen
    (`zeichneWagoKlemme()`) exakt symmetrisch im 120°-Abstand auf einem
    gemeinsamen Radius (`BLOCK_RADIUS_MM`) platziert - Winkel/Farbe/Funktion
    fest zugeordnet (`KLEMMEN`-Array: N/blau bei -90°, L/schwarz bei 30°,
    PE/grün bei 150°, identisch zur Vorlage). Nur der graue
    Messspitzen-Kontaktkreis jeder Steckklemme ist klickbar (über
    `findeAder(adern, funktion)`), der farbige Kennzeichnungskreis daneben
    nicht (reine Funktions-Anzeige, kein eigener Anschlusspunkt). Die
    grauen/farbigen Kontaktkreise (`BLOCK_GREY_DX/DY`, `BLOCK_COLOR_DX/DY`)
    mussten nachträglich korrigiert werden - die erste Vermessung der Vorlage
    nutzte versehentlich den Startpunkt des Bogenpfads (ein Punkt auf dem
    Kreisrand) statt des echten Kreismittelpunkts, wodurch die orangenen
    Klemmdeckel sichtbar neben statt über ihren Kreisen lagen. Fix:
    Mittelpunkt über `getBBox()`-Zentrum (korrekt für Rechteck UND
    Bogenpfad) statt eines geratenen Referenzpunkts neu vermessen.
- `SteckdosenView.render(container, breitePx, anlage, onSchraubeKlick)`:
  liest `anlage.steckdosen_platzierung` (siehe unten), berechnet
  Raster-Inhaltsbreite/-höhe aus `max(row)`/`max(col)` und der Zellgröße
  `ZELLE_MM = 95` (deckt die größere Vorlage, Steckdose ca. 79x76mm, plus
  Abstand), zeichnet pro Platzierung das per `findeStromkreis()` bestimmte
  Gerät (`.endstelle`) mit seinen Adern (`.leitung.adern`) an die Zellmitte.
  Fehlt das Feld oder ist leer (z.B. die handgepflegte
  `anlagen/beispiel_eg.json` ohne `bauteile.md`), bleibt der Container leer
  und `display: none` - kein Fehlerfall.
- **Rahmen:** doppelte Umrandung um eine weiße Gerätefläche (zwei
  ineinander liegende `rect`s mit `rx`/`stroke-width` wie `kasten`/
  `innenRand` in `SchaltkastenView.render()`). Anders als beim
  Schaltkasten-Kasten (zwei unterschiedlich dunkle Grautöne
  `#cccccc`/`#e5e5e5` für Außen-/Innenfläche) füllt hier nur das äußere
  `rect` mit leichtem Grau (`#eeeeee`); das innere `rect` ist bereits
  `#ffffff` und bildet damit gleichzeitig die innere Rahmenlinie UND die
  Gerätefläche - der Rahmen liegt dadurch **direkt** an der weißen Fläche
  an, kein grauer Rand mehr dazwischen (nur noch der schmale
  `RAHMEN_INSET = 8px` breite Abstand zwischen äußerer und innerer
  Rahmenlinie ist grau; ursprünglich `RAHMEN_PADDING = 20px` mit separatem
  weißen Innen-`rect`, auf zwei aufeinanderfolgende User-Vorgaben hin zu
  dieser schlankeren Fassung vereinfacht). Die SVG-Breite ist exakt
  `breitePx` (von `controller/app.js` durchgereicht, s.u.), nicht die
  Rasterbreite - das Raster selbst wird per `<g transform="translate(...)">`
  horizontal in der weißen Fläche zentriert. Die Höhe ergibt sich aus der
  Rasterhöhe plus `2 * RAHMEN_INSET`.

**Datenherkunft (`generate_anlage.js`):** neue Sektion `## Steckdosen
(Platzierung)` in `bauteile.md` (Raster-Tabelle, Zelle = SK-Nummer oder
`SK-Nummer@Winkel` oder `–`) wird von `parseSteckdosenPlatzierung()` geparst
(eigene Funktion statt der generischen `leseMarkdownTabelle()`, da die
Kopf-/erste Spalte hier nur Lese-Labels ohne Bedeutung sind, keine
Objekt-Keys) und in `parseBauteile()`s Rückgabewert als `steckdosenPlatzierung`
(flaches Array `{row, col, sk, rotation}`) abgelegt. `generiereAnlage()`
übernimmt das unverändert als `anlage.steckdosen_platzierung` - rein additiv,
kein bestehendes Feld verändert. Alle vier `anlage.json` wurden dafür
regeneriert und promotet (`node generate_anlage.js <testcase> ` +
`anlage_generated.json` → `anlage.json`), der Diff ist entsprechend rein
additiv (nur das neue Feld, siehe `git diff`).

**Ader-Daten für die Kontaktpunkte:** brauchten KEINE neue Datenquelle -
`sk.leitung.adern` (schon in `anlage.json` vorhanden, von `generiereAnlage()`
aus dem LS-Ausgang gebaut) trägt bereits dieselben Netz-IDs wie die
`Endstelle_SKx.i1/i2/i3`-Knoten im Netzplan (z.B. testcase_01 SK1: N13/N14/
N15). `findeAder()` in `steckdosen.js` greift direkt darauf zu.

**Klick-Callback wird mit dem Schaltkasten geteilt:** `controller/app.js`
extrahierte den bisher inline in `SchaltkastenView.render()` definierten
Klick-Handler in eine eigene, benannte Funktion `onSchraubeKlick(ader, x, y,
kreis)` (Farbzyklus/Messspitzen-Overlay bei eingeschaltetem, `Popup.zeige()`
bei ausgeschaltetem Messgerät - unverändert in der Logik, siehe "Messspitzen
(Messmodus)" oben) und reicht **dieselbe Funktion** an beide Views durch:
`SchaltkastenView.render(anlage, container, onSchraubeKlick,
schalterUmschalten)` und `SteckdosenView.render(document.getElementById(
'steckdosen'), schaltkastenSvg.getAttribute('width'), anlage,
onSchraubeKlick)` (Aufruf muss NACH `SchaltkastenView.render()` stehen, da
`schaltkastenSvg` erst dort entsteht). Möglich, weil `onSchraubeKlick`
nichts Schaltkasten-Spezifisches referenziert, nur den übergebenen
`kreis`/`ader` - die Messspitzen-Maps (`messspitzenFarbe`/`messspitzenAder`/
`messspitzenOverlay`) sind ohnehin generisch über das DOM-Element als Key
indiziert, nicht über eine Bauteil-ID. Echte Messwerte (z.B. V~ Uln zwischen
den L/N-Kontakten einer Steckdose) funktionieren dadurch **ohne
Zusatzarbeit**, da `findePfad()`/`berechneWiderstand()` nur über die Netz-ID
der Ader gehen (`ader.netz`, aus `sk.leitung.adern`) - völlig unabhängig
davon, ob die Messspitze am Schaltkasten oder an einer Steckdose sitzt.

**Bug: Messspitze auf `<rect>`-Kontakten landete bei (0,0).** Der
Overlay-Kreis in `onSchraubeKlick()` wurde bisher direkt mit `cx:
kreis.getAttribute('cx'), cy: kreis.getAttribute('cy')` positioniert - für
Reihenklemmen-Schrauben und die meisten Steckdosen-Kontakte (`<circle>`)
korrekt, aber die beiden PE-Kontakte an der Steckdose sind `<rect>`s (siehe
`zeichneSteckdose()` oben) und haben kein `cx`/`cy`-Attribut, `getAttribute`
liefert dafür `null`. Ohne gültige Koordinaten landete die Messspitze am
SVG-Ursprung (0,0), also sichtbar oben links im Bild statt auf dem
Rechteck. Fix: neue Helper-Funktion `schraubenMitte(el)` in
`controller/app.js` prüft `el.tagName` - bei `'rect'` wird die Mitte aus
`x + width/2`/`y + height/2` berechnet, sonst (also bei `<circle>`)
weiterhin `cx`/`cy` gelesen.

**Linksbündig, direkt über dem Schaltkasten:** dieselbe Falle wie bei
`protokoll.js` (siehe dort "Linksbündig, nicht zentriert") - `display: flex;
justify-content: center` hätte den Inhalt innerhalb der vollen Body-Breite
zentriert statt innerhalb der (schmaleren) Schaltkasten-Breite, da
`#steckdosen` (anders als `#messgeraet`/`#protokoll`) nicht auf die
Schaltkasten-Breite gesetzt wird. Bewusst weggelassen, `#steckdosen` bleibt
im normalen Fluss linksbündig wie `#schaltkasten` selbst (verifiziert per
`getBoundingClientRect().left` bei absichtlich breiterem Viewport).

**Bewusst noch offen** (siehe KONZEPT.md "Nächste Schritte"): Drehstromsteckdose
(eigener testcase_05, eigene Vorlage).

Getestet in `tests/visuell/test_steckdosen.js` (19 Tests): ohne
Platzierungstabelle bleibt der Container leer/unsichtbar; linke Kante steht
(bei absichtlich breiterem Viewport als die Schaltkasten-Breite) bündig
unter der Schaltkasten-Kante statt zentriert zu sein; Breite entspricht
exakt der gerenderten Schaltkasten-Breite; die orangenen Klemmdeckel jeder
Wago-Klemme sitzen nah über ihrem eigenen Kontaktkreis (Regressionstest für
den oben beschriebenen Vermessungsfehler); testcase_01
zeichnet die richtige Geräte-Mischung (2 Steckdosen + 1 Anschlussdose,
gezählt über `rect[rx]`/ungefüllte `circle`-Elemente) und die Anschlussdose
trägt alle drei erwarteten Kontaktfarben; testcase_02 dreht nur SK4 um 90°
(`transform`-Attribut geprüft), die anderen drei Geräte bleiben bei 0°;
testcase_03 zeichnet alle 6 Geräte im korrekten 2x3-Raster (SVG-Breite/-Höhe
stimmen exakt mit `ZELLE_MM` überein); ein Klick auf einen grauen Kontakt
zeigt bei ausgeschaltetem Messgerät das Popup mit Querschnitt/Farbe; an der
Anschlussdose ist nur der graue Kontaktkreis klickbar (`cursor: pointer`),
der farbige Kennzeichnungskreis nicht; bei eingeschaltetem Messgerät legt
ein Klick eine Messspitze an (Overlay statt Popup); V~ über die L/N-Kontakte
derselben Steckdose zeigt echte 230V; eine Messspitze auf einem PE-Kontakt
(`<rect>`) erscheint exakt auf dessen Mitte statt bei (0,0) - Regressionstest
für den oben beschriebenen `schraubenMitte()`-Bugfix; testcase_03 - Messspitzen
an der oberen linken, um 180° rotierten Steckdose (SK1@180, blau links=N,
schwarz rechts=L, grün auf PE) finden RCD1 korrekt und öffnen dessen Hebel
(230V vor TEST/Pfeil-Kasten nicht durchgestrichen, nach TEST 0V/durchgestrichen)
- deckt zusätzlich ab, dass die Ader-Zuordnung auch bei rotierten Geräten
stimmt (der rotationsbedingte Farbtausch links/rechts wurde vorab per
Playwright an den tatsächlichen Bildschirmkoordinaten verifiziert); ZI:
testcase_03 - Messspitzen an der unteren rechten Anschlussdose (SK6, die
letzten drei grauen Kreise im DOM in der Reihenfolge N/L/PE aus dem
`KLEMMEN`-Array) liefern nach TEST Z:0,14Ω und Isc:1478,6A (230V/nicht
durchgestrichen davor) - Klick jeweils auf den Kontakt mit passender
Kennzeichnungsfarbe (schwarz auf schwarz=L usw.); RLOW: PE-Kontakt der
Steckdose (`rect`) + die anlagenweite PE-Klemme im Schaltkasten (zwei
unterschiedliche Netze) zeigt pauschal 0Ω - Regressionstest für den
`berechneRlowMesswert()`-PE-Workaround, siehe "Berechnung der Messwerte" -
"RLOW-Berechnung"; RLOW: PE-Kontakt der Anschlussdose (SK2, grauer Kontakt im
PE-Block) + PE-Klemme im Schaltkasten zeigt ebenfalls pauschal 0Ω; RLOW:
PE-Kontakt der oberen Steckdose + PE-Kontakt der danebenliegenden
Anschlussdose (beide Sonden innerhalb des Steckdosen-Views) zeigt ebenfalls
pauschal 0Ω; RLOW: obere Steckdose (SK1@180) + mittlere linke
Steckdose (SK3, unrotiert) durchlaufen in einem Testablauf drei
Sonden-Zustände nacheinander (0,00Ω / `---` / 0,75Ω je nachdem, ob Schwarz
und Blau auf demselben Netz-`funktion` liegen) - Farbe "umsetzen" erfordert
zwei Klicks auf die alte Schraube (einmal weiter im Zyklus, einmal zurück
auf leer), bevor die neue Schraube die Farbe annehmen kann, genau wie am
echten Gerät.

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
- **WORKAROUND für PE-zu-PE:** haben beide Adern `funktion === 'PE'`, wird
  sofort `0` zurückgegeben, OHNE `findePfad()` aufzurufen - `graph.PE`
  existiert nicht (`GRAPH_FUNKTIONEN` in `generate_anlage.js` hat nur
  L1/L2/L3/N), `findePfad()` würde also immer `null` liefern und der
  Platzhalter bliebe stehen, obwohl PE in diesem Modell nie geschaltet wird
  (kein PE-Schalter, siehe netzplan.md Annahme 1) und deshalb elektrisch
  immer durchgängig ist. Deckt jede Kombination aus PE-Bauteilen ab
  (Reihenklemme, PE-Klemme, Steckdose, Anschlussdose), unabhängig von deren
  Netz-ID - user-gemeldeter Bug, als bewusster, klar dokumentierter
  Sonderfall gefixt, **entfällt ersatzlos** sobald der PE-Teilgraph existiert
  (siehe KONZEPT.md "Nächste Schritte" - PE-Teilgraph).
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
anderer Stelle markierte (z.B. "INSTALLATIONSTESTER" blau hervorgehoben - wirkte
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
- `risoTestKlick()` - an die TEST-Taste gebunden (über den `testKlick()`-
  Dispatcher, siehe ZI-Abschnitt unten). Bricht ab, wenn Funktion nicht
  RISO ist, eine der drei Messspitzen (Schwarz/Blau/Grün) fehlt, oder Grün
  nicht auf PE sitzt. Für die Zulässigkeit des Schwarz/Blau-Paars gibt es
  zwei Fälle: **gleiche Funktion** (`schwarzAder.funktion ===
  blauAder.funktion`, außer PE) ist keine Isolationsmessung, sondern eine
  reine Durchgangsprüfung auf einer Phase - hier greift `risoPaarTyp()`
  bewusst NICHT (`gleicheFunktion`-Flag umgeht die Prüfung), stattdessen
  direkt dieselbe Pfadsuche wie bei RLOW (User-Vorgabe: "das ging früher mal
  so", ursprünglich als "ungültiges Paar" abgelehnt, dann bewusst revidiert -
  siehe Test in `test_messgeraet.js`). **Unterschiedliche Funktion** braucht
  weiterhin ein gültiges `risoPaarTyp(schwarzAder, blauAder)` (LN/LL), sonst
  bricht der Klick ab. Ist `berechneRisoSpannung() > 0` (Sicherheits-
  Verhalten: solange noch Spannung anliegt, gibt es keinen Messwert - bei
  gleicher Funktion liegt ohnehin nie eine Spannung an, siehe
  `risoPaarTyp()`, dieser Zweig greift dort also nie), setzt
  `risoTestKlick()` `risoMesswert` explizit auf `null` zurück - ein
  TEST-Klick bei anliegender Spannung springt also aktiv auf den Platzhalter
  `R:---MΩ`, statt einen älteren Messwert stehen zu lassen (z.B. wenn
  zwischen zwei TEST-Klicks ein Schalter wieder geschlossen wurde). Sonst wie
  RLOW, aber mit den **effektiven** Adern (PE-als-N-Substitution greift nur
  bei tatsächlicher PE-Beteiligung): `findePfadZwischenAdern()` +
  `berechneWiderstand()`; kein Pfad → `risoMesswert = Infinity` (Sentinel,
  Anzeige `R:>999MΩ`). **Einheit:** `berechneWiderstand()` summiert die
  Fehlertabelle, die durchgehend in **Ω** angegeben ist (wie bei RLOW) - ein
  endliches `risoMesswert` ist deshalb immer ein Ω-Wert, nie MΩ (frühere
  Version hängte pauschal `MΩ` an, unabhängig von der tatsächlichen Quelle -
  das war eine falsche Beschriftung, siehe `baueAnzeigeZustand()` unten für
  die korrigierte Anzeige). Setzt am Ende außerdem `risoAmpel` (siehe unten):
  im Spannungs-Abbruchzweig immer `'rot'`; sonst `'gruen'`, wenn
  `risoMesswert === Infinity` oder `risoMesswert >= risoGrenzwertMOhm *
  1_000_000` ist (Gleichstand zählt als bestanden), andernfalls `'rot'` - der
  Grenzwert wird für den Vergleich extra mit `1_000_000` multipliziert (MΩ →
  Ω), da `risoGrenzwertMOhm` in MΩ eingestellt ist, `risoMesswert` aber immer
  in Ω vorliegt. Bewusste Konsequenz (User-Vorgabe, nicht versehentlich):
  jeder reale Fehlertabellen-Wert liegt weit unter jedem sinnvollen
  MΩ-Grenzwert, der "gleiche Funktion"-Fall zeigt also praktisch immer Rot,
  sobald überhaupt ein Pfad existiert - nur `>999MΩ` (kein Pfad) ist Grün. Die
  Ampel bewertet damit einheitlich nach der RISO-Logik (hoher Widerstand =
  bestanden) für JEDEN Pfad-Fund, unabhängig von der Quelle, statt für den
  "gleiche Funktion"-Fall eine umgekehrte (RLOW-typische) Schwelle zu
  verwenden.
- `risoMesswert` - neue State-Variable, startet `null` (Platzhalter). Wird bei
  **jeder** Messspitzen-Änderung und in `setzeBearbeitungenZurueck()`
  (Drehknopf-Wechsel, ON/OFF) auf `null` zurückgesetzt - anders als der
  Schalterzustand oben lebt dieser Messwert nur für den aktuellen
  Messvorgang, nicht persistent über Ein-/Ausschalten hinweg.
- `risoGrenzwertMOhm` - Mindest-Isolationswiderstand, Default `50`, rechts
  oben im Display angezeigt (`zustand.titelWertRechts`, ausgewählt über
  `zone1Auswahl === 2`, da `titelWerte` für RISO nur einen Eintrag hat - die
  Prüfspannung - und `titelWertRechts` deshalb Index `titelWerte.length + 1
  = 2` bekommt). Per ▲/▼ in `aendereAusgewaehltesFeld()` in 10MΩ-Schritten
  verstellbar (`Math.max(0, risoGrenzwertMOhm + richtung * 10)`, nach unten
  bei 0 geklemmt, keine Obergrenze), Reset auf `50` in
  `setzeBearbeitungenZurueck()`.
- `risoAmpel` - neue State-Variable (`null | 'rot' | 'gruen'`), gesetzt in
  `risoTestKlick()` (siehe oben). In `baueAnzeigeZustand()`s RISO-Zweig auf
  `zustand.leuchteLinksAn`/`zustand.leuchteRechtsAn` (siehe messgeraet.js
  oben) abgebildet - `'rot'` → nur links an, `'gruen'` → nur rechts an,
  `null` → beide aus/grau. Reset auf `null` bei **jeder**
  Messspitzen-Änderung (derselbe Codepfad wie der `risoMesswert`-Reset - ein
  altes Ampel-Ergebnis gehört zur alten Messspitzen-Konfiguration) und in
  `setzeBearbeitungenZurueck()` (Drehknopf-Wechsel, ON/OFF) - explizite
  User-Vorgabe ("wenn wir den Drehschalter drehen, gehen die Leuchten aus").
- `baueAnzeigeZustand()`s RISO-Zweig setzt zusätzlich
  `zustand.spannungUnterPe = \`${berechneRisoSpannung()}V\`` (immer ein Wert,
  nie ein Platzhalter, Default `0V`) und überschreibt `zustand.hauptwert` nur,
  wenn `risoMesswert !== null` - mit korrigierter Einheit: `Infinity` →
  `'R:>999MΩ'` (fester Text, kein echter MΩ-Wert), sonst
  `` `R:${risoMesswert.toFixed(2).replace('.', ',')}Ω` `` (Ω, nicht MΩ, siehe
  oben).

Neu in `messgeraet.js`: `zeichneDisplay()` rendert `zustand.spannungUnterPe`
unter dem halb gefüllten PE-Kreis (`x+177, kreisY+19`, Schriftgröße 9,
zentriert) - passt noch knapp vor die untere Display-Kante.

Grenzen des Prototyps (bewusst akzeptiert, siehe KONZEPT.md): mit dem
heutigen Graph-Modell sind L1/L2/L3/N vollständig getrennte Teilgraphen ohne
Querverbindung, es gibt noch keinen Mechanismus, der künstlich einen
Isolationsfehler ZWISCHEN ZWEI FUNKTIONEN einspeist (z.B. L1 gegen N). Der
"Pfad gefunden"-Zweig in `risoTestKlick()` ist für diesen Fall deshalb heute
praktisch nie erreichbar - der Code ist aber bereits dafür strukturiert,
sobald ein Fehlerfall-Mechanismus dafür existiert. Für Schwarz/Blau auf
DERSELBEN Funktion (Durchgangsprüfung, siehe `gleicheFunktion` oben) ist der
"Pfad gefunden"-Zweig dagegen der Normalfall, genau wie bei RLOW.

Getestet in `test_messgeraet.js` (17 Tests): Spannung liegt an → 230V
angezeigt, TEST wirkungslos; Schwarz/Blau vertauscht (Rollen-Symmetrie, siehe
`risoPaarTyp()` oben) → dasselbe Ergebnis; Hauptschalter öffnen → 0V, TEST
zeigt `R:>999MΩ`; RCD öffnen bei weiterhin geschlossenem Hauptschalter →
hinter dem RCD trotzdem 0V/messbar (der eingangs erwähnte
Einspeisungs-Pfad-Test); TEST bei erneut anliegender Spannung setzt einen
alten Messwert zurück auf den Platzhalter; 400V zwischen zwei verschiedenen
Phasen (nur mit testcase_04 testbar, da dort L1/L2/L3 getrennt eingespeist
werden); Schwarz/Blau auf derselben Phase verhält sich wie RLOW, aber in Ω
statt MΩ angezeigt (Fehlertabellen-Wert bei geschlossenem Pfad, `>999MΩ` bei
offenem Schalter dazwischen); Grün nicht auf PE und fehlende dritte
Messspitze → TEST bleibt jeweils wirkungslos; eine Messspitzen-Änderung nach
einem TEST-Klick macht den alten Messwert ungültig; N-Sonde auf PE statt N
(siehe `risoEffektiveAder()` oben) → 230V werden trotzdem angezeigt, und die
Erkennung eines offenen Hauptschalters funktioniert genauso wie bei korrekt
platzierter N-Sonde. Dazu vier Ampel-Tests: Rot bei anliegender Spannung,
Grün bei `>999MΩ` unabhängig vom Grenzwert, ein endlicher Messwert kippt von
Rot auf Grün, sobald der Grenzwert unter den (in Ω umgerechneten) Messwert
gesenkt wird, und Reset auf Grau nach einem vollen Drehknopf-Zyklus. Dazu ein
Node-Test in `test_generator.js` für `istSpannungFuehrend()` direkt gegen den
Graphen.

**ZI (Schleifenimpedanz) - prototypisch umgesetzt.** Anders als RLOW/RISO
sitzen die beiden Messspitzen bei ZI auf UNTERSCHIEDLICHEN Funktionen (Schwarz
auf L1/L2/L3, Blau auf N) OHNE vertauschbare Rollen (kein `risoPaarTyp()`-
Äquivalent - Schwarz muss L sein, Blau muss N sein) und ohne gemeinsamen
Teilgraphen - `findePfadZwischenAdern()` greift hier also nicht.

Neu in `app.js`:
- `findePfadZurEinspeisung(funktion, ader)` - wie `findePfadZwischenAdern()`,
  aber von `graph.einspeisung[funktion]` zu einer einzelnen Ader (probiert
  wie üblich alle Netz-IDs inkl. `ader.weitere`). `null`, wenn kein
  Einspeisungs-Netz für die Funktion bekannt ist oder kein Pfad existiert.
  Wird von RISO nicht gebraucht (das nutzt `istSpannungFuehrend()`, das nur
  einen Boolean statt des Pfad-Arrays braucht), aber von ZI, wo aus dem Pfad
  ja noch die Fehlertabelle summiert werden muss.
- `ZI_VORIMPEDANZ = 0.14` - feste Basisimpedanz (siehe KONZEPT.md
  "Konfigurierbare Parameter"), noch kein Netzplan-Feld.
- `ziMesswert` - State-Variable wie `risoMesswert`, startet `null`
  (Platzhalter `Z:---Ω` aus `zustandFuerFunktion()`). Reset an denselben
  beiden Stellen wie `risoMesswert`/`risoAmpel` (Messspitzen-Änderung im
  Schraube-Klick-Handler, `setzeBearbeitungenZurueck()` bei Drehknopf-Wechsel
  und ON/OFF).
- `ziTestKlick()` - an die TEST-Taste gebunden (siehe `testKlick()`-Dispatcher
  unten). Bricht ab, wenn Funktion nicht ZI ist, eine der beiden Messspitzen
  fehlt, Schwarz nicht auf L1/L2/L3 sitzt, oder Blau nicht auf N sitzt (PE
  spielt bei ZI keine Rolle, siehe `messpunkte: {pe: 'leer'}` in
  `messgeraet.js`). Sucht dann **zwei getrennte Pfade** über
  `findePfadZurEinspeisung()` (L-Sonde → L-Einspeisung, N-Sonde →
  N-Einspeisung) - **beide** müssen existieren, bevor TEST überhaupt einen
  Effekt hat (explizite User-Vorgabe: die Verbindung zur Einspeisung wird
  VOR der eigentlichen Messung geprüft, kein `>999Ω`-Sentinel wie bei RISO,
  da ZI ohnehin ein spannungsführendes Netz voraussetzt statt ein
  spannungsfreies - fehlt einer der beiden Pfade, bleibt der Platzhalter
  einfach stehen). Sind beide Pfade da:
  `ziMesswert = berechneWiderstand(graph, pfadL) + berechneWiderstand(graph,
  pfadN) + ZI_VORIMPEDANZ`.
- `testKlick()` - neuer Dispatcher, an `MessgeraetView.render()`s
  Options-Objekt gebunden (ersetzt das bisherige direkte `test:
  risoTestKlick`). Ruft je nach `messgeraetZustand.funktion` `risoTestKlick()`
  oder `ziTestKlick()` - beide Handler prüfen ihre Funktion ohnehin selbst
  noch einmal, der Dispatcher dient nur der Übersicht, nicht der Absicherung.
- `berechneZiSpannung()` - **live**, strukturell identisch zu
  `berechneRisoSpannung()`, aber mit umgekehrtem Zweck: RISO warnt "hier
  liegt noch Spannung an, TEST wirkt nicht", ZI zeigt "der Stromkreis ist
  bereit, TEST wird einen Messwert liefern". Verlangt Schwarz auf L1/L2/L3
  und Blau auf N (kein LN/LL-Unterschied wie bei RISO, ZI misst immer nur
  L-N); liefert `230` nur, wenn `istSpannungFuehrend()` für **beide** Adern
  true ist, sonst `0` (nie `400`, anders als bei RISO).
- `baueAnzeigeZustand()`s ZI-Zweig setzt `zustand.spannungUnterPe =
  \`${berechneZiSpannung()}V\`` (immer ein Wert, nie ein Platzhalter, wie bei
  RISO) - **vor** der `titelZeigtLabel`-Verzweigung, gilt also für beide
  Ansichten (normale Zl-Ansicht UND ΔU-Ansicht) gleichermaßen, da die
  Messpunkte-Kreise darunter in beiden Ansichten identisch bleiben. Nur die
  normale Zl-Ansicht (nicht die ΔU-Ansicht - deren `Z:___Ω`-Zeile bleibt
  vorerst ein reiner Platzhalter) überschreibt zusätzlich `zustand.hauptwert`
  mit `` `Z:${ziMesswert.toFixed(2).replace('.', ',')}Ω` ``, wenn
  `ziMesswert !== null` - und im selben `if`-Block `zustand.nebenwertLinks`
  (unten links über dem Strich, siehe `messgeraet.js`) mit `` `Isc:${((0.9 *
  230) / ziMesswert).toFixed(1).replace('.', ',')}A` ``: $I_{sc} = 0{,}9
  \times 230V / Z$ (Sicherheitsfaktor, siehe KONZEPT.md "Berechnung der
  Messwerte"). Beide hängen an derselben Bedingung, überschreibt also den
  Default-Platzhalter `nebenwertLinks: 'Isc:---A'` aus
  `zustandFuerFunktion()` nur gemeinsam mit `hauptwert`. Im selben `if`-Block
  außerdem die Isc/Lim-Ampel: `const lim = MessgeraetView.berechneLim(
  ziTitelWerte[0], ziTitelWerte[1])` (neu exportierte Funktion, roher
  Zahlenwert statt des formatierten `Lim: X,XA`-Texts aus
  `berechneLimText()` - beide teilen sich jetzt dieselbe Formel, siehe
  `messgeraet.js`), dann `zustand.leuchteLinksAn = isc < lim` /
  `zustand.leuchteRechtsAn = isc >= lim`. Bewusst **live** aus dem
  aktuellen `ziLsTypIndex`/`ziBemessungsstromIndex` berechnet statt als
  eigener TEST-Snapshot (anders als `risoAmpel`, das eine echte
  State-Variable ist) - Isc selbst ändert sich nur durch einen neuen
  TEST-Klick, Lim kann sich aber per ▲/▼ jederzeit live ändern (siehe
  `nebenwertRechts` oben), die Ampel zieht also sofort mit, ohne dass es
  einer eigenen Reset-Logik bedarf. An derselben Stelle
  wird außerdem
  `zustand.indikatorDurchgestrichen = ziSpannung === 0` gesetzt (überschreibt
  den statischen `indikatorDurchgestrichen: true` aus
  `DREHKNOPF_POSITIONEN`): liegt Spannung an, zeigt der Pfeil-Kasten unten
  links (siehe `zeichneKastenIndikator()` in `messgeraet.js`) bewusst KEINEN
  Diagonal-Strich mehr - explizite User-Vorgabe, nur für ZI, RISO bleibt
  unverändert immer durchgestrichen (dort bedeutet anliegende Spannung ja
  gerade "TEST wirkt nicht", nicht "bereit"). **Direkt danach:** `if
  (ziSpannung === 0) ziMesswert = null;` - fällt die Spannung weg (Pfeil-
  Kasten wird wieder durchgestrichen), wird ein zuvor per TEST ermittelter
  Wert sofort ungültig, auch OHNE dass sich die Messspitzen ändern (z.B. weil
  währenddessen ein Schalter geöffnet wurde) - der Platzhalter erscheint
  sofort beim nächsten Render, nicht erst nach der nächsten
  Messspitzen-Änderung. Kommt die Spannung später zurück, bleibt
  `ziMesswert` trotzdem `null`, bis `ziTestKlick()` erneut aufgerufen wird -
  ein alter Messwert taucht nicht automatisch wieder auf. Bewusst als
  Seiteneffekt in `baueAnzeigeZustand()` (nicht in einer eigenen
  Reset-Funktion), da hier bei jedem Render ohnehin schon `ziSpannung` frisch
  berechnet wird.

Getestet in `test_messgeraet.js` (11 Tests, meist mit testcase_01, da
`neueSeite()`s Default-Anlage `beispiel_eg.json` keinen Netzplan/Graph hat):
TEST summiert Vorimpedanz + Fehlertabelle beider Teilpfade und berechnet Isc
daraus (`Z:0,24Ω` = 0,14Ω Vorimpedanz + 0,1Ω Fehlertabelle N6 + 0Ω N-Seite,
`Isc:862,5A` = 0,9×230V/0,24Ω, Isc/Lim-Ampel grün, da 862,5A > 80,0A);
Isc/Lim-Ampel kippt live auf rot, wenn LS-Typ/Bemessungsstrom per ▲/▼ so
verändert werden, dass Lim über den unverändert gebliebenen Isc-Wert steigt
(D-Charakteristik, 125A → Lim 2500,0A); testcase_01 SK1 (Ausgangsschrauben
N13/N14) mit realistischerem Bemessungsstrom (B, 125A statt künstlich hoher
D-Charakteristik) - Messung läuft normal durch (`Z:0,74Ω`, `Isc:279,7A`),
Lim (625,0A) liegt aber darüber → Ampel zeigt trotzdem "durchgefallen";
testcase_02 (SK1,
Ausgangsschrauben N18/N19) summiert MEHRERE Fehlertabellen-Einträge entlang
eines einzigen Teilpfads (`Z:0,94Ω` = 0,5Ω L-Pfad aus drei Einträgen N8/N14/N18
+ 0,3Ω N-Pfad aus N10 + 0,14Ω Vorimpedanz), dasselbe nochmal mit C/63A statt
B/16A (`Isc:220,2A` < `Lim: 630,0A` → wieder "durchgefallen", zeigt dass die
Ampel testcase-unabhängig korrekt gegen die jeweils eingestellte
LS-Charakteristik vergleicht), und mit offenem RCD1 davor →
0V, Pfeil-Kasten durchgestrichen, TEST bleibt wirkungslos; offenes RCD
(testcase_01) unterbricht beide Teilpfade zur Einspeisung → TEST bleibt wirkungslos;
Messspitzen-Änderung setzt den Messwert zurück; Drehknopf-Wechsel setzt den
Messwert zurück; Live-Spannungsanzeige zeigt 230V bei geschlossenen
Teilpfaden (Pfeil-Kasten dabei undurchgestrichen), 0V sobald RCD1 öffnet
(Pfeil-Kasten wieder durchgestrichen); Wegfall der Spannung setzt sowohl Z
als auch Isc zurück auf den Platzhalter, auch ohne Messspitzen-Änderung, und
beide bleiben stehen, bis nach Rückkehr der Spannung erneut TEST gedrückt
wird.

**ZS - prototypisch umgesetzt, iterativ aufgebaut (User-Vorgabe).** Kam in
mehreren Schritten: zuerst nur die Kern-Messung, dann Live-Spannungsanzeige,
Pfeil-Kasten-Umschaltung und zuletzt die Isc/Lim-Ampel - alle vier RISO/ZI-
typischen Bausteine sind inzwischen vollständig nachgezogen (siehe unten).

Anders als ZI (Schwarz+Blau) nutzt ZS **Schwarz+Grün** als aktive Sonden -
Blau muss trotzdem korrekt auf N sitzen, damit TEST reagiert, fließt aber
(wie bei ZI) nicht in die Berechnung ein. Der eigentliche Unterschied: nur
EIN Teilpfad wird verfolgt (L-Sonde → L-Einspeisung), der zweite (PE) wird
komplett übersprungen - eine bewusste, in `zsTestKlick()` explizit
kommentierte Vereinfachung (PE hat "immer Durchgang", 0Ω), analog zur
PE-als-N-Vereinfachung bei RISO (`risoEffektiveAder()`).

Neu in `app.js`:
- `berechneZsSpannung()` - **live**, strukturell wie `berechneZiSpannung()`,
  prüft aber bewusst nur den EINEN Teilpfad, den auch `zsTestKlick()` prüft
  (L-Sonde → L-Einspeisung, PE bewusst ignoriert) - zeigt also exakt an, ob
  ein TEST-Klick gerade einen Messwert liefern würde. Verlangt trotzdem alle
  drei Sonden korrekt platziert (Schwarz auf L1/L2/L3, Grün auf PE, Blau auf
  N), auch wenn nur `istSpannungFuehrend()` für Schwarz ausgewertet wird.
- `zsMesswert` - State-Variable wie `ziMesswert`, startet `null`. Reset an
  denselben Stellen (Messspitzen-Änderung im Schraube-Klick-Handler,
  `setzeBearbeitungenZurueck()`).
- `zsTestKlick()` - an die TEST-Taste gebunden (`testKlick()`-Dispatcher,
  jetzt um den ZS-Zweig erweitert). Bricht ab, wenn Funktion nicht ZS ist,
  eine der drei Messspitzen fehlt, Schwarz nicht auf L1/L2/L3, Grün nicht
  auf PE, oder Blau nicht auf N sitzt. Sucht dann NUR
  `findePfadZurEinspeisung(schwarzAder.funktion, schwarzAder)` (kein
  zweiter Aufruf für Grün/PE, im Gegensatz zu ZIs zwei Aufrufen) - kein Pfad
  → TEST bleibt wirkungslos, Platzhalter bleibt stehen (kein
  `>999Ω`-Sentinel, wie bei ZI). Sonst: `zsMesswert =
  berechneWiderstand(graph, pfadL) + ZI_VORIMPEDANZ` (derselbe
  Konstantenwert wie bei ZI, per expliziter User-Vorgabe wiederverwendet,
  kein eigener `ZS_VORIMPEDANZ`).
- `baueAnzeigeZustand()`s ZS-Zweig berechnet `const zsSpannung =
  berechneZsSpannung()` einmal und setzt daraus `zustand.spannungUnterPe =
  \`${zsSpannung}V\`` (immer ein Wert, nie ein Platzhalter, wie bei ZI/RISO)
  sowie `zustand.indikatorDurchgestrichen = zsSpannung === 0` (Pfeil-Kasten
  unten links, wie bei ZI: undurchgestrichen, solange der L-Pfad bereit
  ist). Beide **außerhalb** der `titelZeigtLabel`-Verzweigung platziert,
  gelten also für Zs UND ZSrcd gleichermaßen. Ebenfalls außerhalb dieser
  Verzweigung: überschreibt `zustand.hauptwert` mit
  `` `Z:${zsMesswert.toFixed(2).replace('.', ',')}Ω` ``, wenn `zsMesswert
  !== null` - anders als ZIs Isc/Ampel-Override, der nur im `else`-Zweig der
  normalen Zl-Ansicht sitzt. Das ist kein Sonderfall, sondern folgt einem
  bereits bestehenden Kommentar an der ZSrcd-Verzweigung ("Zone 2/3 bleiben
  unverändert wie in der normalen Zs-Ansicht - kein Override nötig") -
  anders als ZIs ΔU-Ansicht (die den Hauptmesswert-Bereich komplett durch
  statische Platzhalter-Zeilen ersetzt) lässt ZSrcd den Hauptmesswert-Bereich
  unangetastet. Im selben `if (zsMesswert !== null)`-Block außerdem die
  Isc/Lim-Ampel: `const isc = (0.9 * 230) / zsMesswert`,
  `zustand.nebenwertLinks = \`Isc:${isc...}A\``, `const lim =
  MessgeraetView.berechneLim(zsTitelWerte[0], zsTitelWerte[1])`,
  `zustand.leuchteLinksAn = isc < lim`, `zustand.leuchteRechtsAn = isc >=
  lim` - strukturell identisch zu ZIs Isc/Ampel-Berechnung, nur eben
  außerhalb der `titelZeigtLabel`-Verzweigung (gilt für Zs UND ZSrcd) statt
  nur im `else`-Zweig.
- `testKlick()`-Dispatcher um `else if (funktion === 'ZS') zsTestKlick();`
  ergänzt.

Damit sind ZI und ZS jetzt bis auf einen bewussten Unterschied funktional
deckungsgleich: ZS prüft/berechnet keinen PE-Pfad (siehe "Grenzen" oben in
`zsTestKlick()`s Kommentar) - alle anderen Features (Live-Spannungsanzeige,
Pfeil-Kasten, Isc/Lim-Ampel) sind 1:1 identisch übertragen.

Getestet in `test_messgeraet.js` (14 Tests, meist mit testcase_01): TEST
berechnet nur den L-Pfad + Vorimpedanz und die Isc/Lim-Ampel daraus
(`Z:0,24Ω` = 0,1Ω Fehlertabelle N6 + 0,14Ω Vorimpedanz, `Isc:862,5A` >
`Lim: 80,0A` → grün), PE/N bleiben unberücksichtigt; Isc/Lim-Ampel kippt
live auf rot, wenn LS-Typ/Bemessungsstrom per ▲/▼ so verändert werden, dass
Lim über den unveränderten Isc-Wert steigt (D-Charakteristik, 125A → Lim
2500,0A); testcase_04s drei Stromkreise (SK1/SK2/SK3, je eine eigene Phase
mit eigener Einspeisung) liefern je einen eigenständigen Zahlen-Regressionstest
- SK1/L1: `Z:0,54Ω` (N20+N24), `Isc:383,3A`; SK2/L2: `Z:0,67Ω` (N21+N25),
`Isc:309,0A`; SK3/L3: `Z:0,63Ω` (N22+N26), `Isc:328,6A` - alle drei grün bei
B/16A, plus ein vierter Test auf demselben SK3-Pfad, der nur den
Bemessungsstrom auf 80A stellt (`Lim: 400,0A` > `Isc:328,6A`, Messwert
selbst unverändert) und damit gezielt den Rot-Fall mit einem realistischen
Nachrechnen-Beispiel abdeckt (statt wie beim ersten ZI/ZS-Ampel-Test nur
künstlich per D-Charakteristik). Die PE-Ausgangsschraube von SK2/SK3
(N33/N36) kommt im SVG jeweils zweimal vor (Fallback-Wert der oberen
PE-Reihenklemmen-Eingangsschraube ohne eigenes Zubringerkabel, siehe
"PE-Reihenklemmen-Bugfix" oben) - die Tests schränken deshalb per
`cy="131"` gezielt auf die untere (Ausgangs-)Schraube ein.
Live-Spannungsanzeige zeigt 230V, solange der L-Pfad geschlossen ist,
und fällt auf 0V, sobald das zugehörige RCD öffnet (Pfeil-Kasten dabei
jeweils undurchgestrichen bzw. wieder durchgestrichen); Schwarz nicht auf L,
Grün nicht auf PE, und Blau nicht auf N → TEST jeweils wirkungslos; offenes
RCD unterbricht den L-Pfad → TEST wirkungslos; Messspitzen-Änderung und
Drehknopf-Wechsel setzen den Messwert zurück; die ZSrcd-Ansicht zeigt
denselben Messwert wie die normale Zs-Ansicht.

**FI/RCD - prototypisch umgesetzt, iterativ aufgebaut analog zu ZS.**
Startete mit denselben beiden Bausteinen wie ZS (Live-Spannungsanzeige +
Pfeil-Kasten-Umschaltung, identische Platzierungsvorgabe: Schwarz auf
L1/L2/L3, Grün auf PE, Blau auf N, identischer Ein-Pfad-Check nur für
Schwarz), dann kam die eigentliche Auslösewert-Übernahme dazu - **anders als
ZI/ZS aber keine Widerstandssumme**, sondern eine Bauteil-Zuordnung: das
erste RCD auf dem Pfad zur Einspeisung wird gesucht, dessen `tA`/`iA`/`uB`
werden direkt übernommen.

Voraussetzung dafür: `tA`/`iA`/`uB` mussten zuerst ins `rcd`-Objekt in
`anlage.json` nachgezogen werden (waren vorher nur in `bauteile.md`
vorhanden, `parseBauteile()` parste sie zwar schon in die
Zwischenrepräsentation, aber `generiereAnlage()`s `rcd`-Objekt-Literal ließ
sie beim finalen Zusammenbau weg) - risikoarme, isolierte Ergänzung
(`generate_anlage.js`, drei zusätzliche Felder), alle 4 Testcases neu
generiert/promotet, Diff bestätigt isoliert auf genau diese drei neuen
Felder pro RCD (`anlage.svg` unverändert, da nirgends gerendert).

Neu in `app.js`:
- `berechneFircdSpannung()` - Code identisch zu `berechneZsSpannung()`
  (bewusst als eigene Funktion dupliziert statt wiederverwendet, da FI/RCD
  konzeptionell eigenständig weiterentwickelt werden dürfte).
- `alleRcds()` - sammelt alle `rcd`-Objekte der Anlage über alle
  Hutschienen/Gruppen hinweg ein (frisch bei jedem Aufruf, keine
  Zwischenspeicherung nötig bei dieser Anlagengröße) - für die Zuordnung
  `kante.bauteil` (Name-String im Graphen) → echtes RCD-Objekt (mit
  `tA`/`iA`/`uB`) gebraucht.
- `kanteZwischenNetzen(funktion, netzA, netzB)` - `findePfad()`/
  `findePfadZurEinspeisung()` liefern nur die Knotenfolge (Netz-IDs), nicht
  die dazwischenliegenden Kanten - dieser Helfer sucht die Kante zwischen
  zwei im Pfad benachbarten Netzen (`von`/`nach` in beide Richtungen
  geprüft, da `findePfad()`s BFS die Kantenrichtung ignoriert).
- `findeErstesRcdAufPfad(funktion, ader)` - ruft
  `findePfadZurEinspeisung()` auf (liefert `[Einspeisungsnetz, ...,
  Adernnetz]`), dreht das Ergebnis um (`[Adernnetz, ..., Einspeisungsnetz]`
  - "von der Sonde aus gesehen", User-Vorgabe: das nächstgelegene RCD zur
  Sonde zählt, nicht das erste ab der Einspeisung), geht dann Kante für
  Kante durch `kanteZwischenNetzen()` und gibt beim ersten Treffer in
  `alleRcds()` (Abgleich über `kante.bauteil === rcd.name`) dieses RCD
  zurück, sonst `null`.
- `fircdMesswert` - State-Variable (`null | {iA, tA, uB}`), startet `null`.
  Reset an denselben Stellen wie `zsMesswert` (Messspitzen-Änderung im
  Schraube-Klick-Handler, `setzeBearbeitungenZurueck()`).
- `fircdAmpel` - State-Variable (`null | 'rot' | 'gruen'`), analog zu
  `risoAmpel` (eine echte State-Variable, nicht live wie ZIs/ZSs Isc/Lim-
  Ampel, da das Suchergebnis selbst ein TEST-Snapshot ist). Reset an
  denselben Stellen wie `fircdMesswert`.
- `fircdTestKlick()` - an die TEST-Taste gebunden
  (`testKlick()`-Dispatcher um `else if (funktion === 'FI/RCD')` erweitert).
  Bricht ab, wenn Funktion nicht FI/RCD ist, eine der drei Messspitzen
  fehlt/falsch platziert ist (dieselbe Prüfung wie `zsTestKlick()`), oder
  `berechneFircdSpannung() === 0` ist (Pfeil-Kasten durchgestrichen - TEST
  bleibt dann **komplett wirkungslos**, keine Ampel-Änderung, explizite
  User-Vorgabe, um diesen Fall vom "kein RCD gefunden"-Fall unten zu
  unterscheiden). Sonst: `findeErstesRcdAufPfad()` - RCD gefunden →
  `fircdMesswert = {iA, tA, uB}`, `fircdAmpel = 'gruen'`; kein RCD gefunden
  → `fircdMesswert = null` (alle Felder bleiben/werden Platzhalter),
  `fircdAmpel = 'rot'` (eigener Fehlerfall: "keine RCD-Absicherung auf
  diesem Pfad gefunden"). Im gefunden-Fall zusätzlich `schalterHandles.get(
  rcd.name)?.setGeschlossen(false)` - öffnet den Hebel des gefundenen RCD
  automatisch, siehe "Programmatisches Umschalten" oben.
- `baueAnzeigeZustand()`s FI/RCD-Zweig setzt `zustand.spannungUnterPe`/
  `zustand.indikatorDurchgestrichen` wie bei ZS, dazu
  `zustand.leuchteLinksAn = fircdAmpel === 'rot'` /
  `zustand.leuchteRechtsAn = fircdAmpel === 'gruen'`, und überschreibt bei
  `fircdMesswert !== null` `zustand.hauptwert` (`` `I:${iA}mA` ``, Mitte),
  `zustand.nebenwertLinks` (`` `Uci:${uB}V` ``, unten links) und
  `zustand.nebenwertRechts` (`` `t:${tA}ms` ``, unten rechts) - je eine
  Nachkommastelle, Komma-Format wie überall sonst.

Getestet in `test_messgeraet.js` (8 Tests, testcase_01 sofern nicht anders
genannt): Live-Spannungsanzeige zeigt 230V bei geschlossenem L-Pfad
(Pfeil-Kasten undurchgestrichen), 0V sobald das zugehörige RCD öffnet
(Pfeil-Kasten wieder durchgestrichen); TEST direkt hinter RCD1 (N6/N8)
übernimmt dessen `iA`/`uB`/`tA` (`I:18,0mA`, `Uci:1,0V`, `t:22,0ms`), Ampel
grün; derselbe erfolgreiche TEST öffnet zusätzlich automatisch den Hebel von
RCD1 (Transform vor TEST `null`, danach `rotate(180, 20, 340)`) - die
Spannung fällt dadurch live auf 0V, Messwerte und grüne Ampel bleiben aber
stehen; **testcase_03** (RCD1 speist SK1+SK2 gemeinsam): Schwarz auf
Reihenklemme_L_SK1, Blau auf Reihenklemme_N_SK2 (bewusst ein ANDERER
Stromkreis als Schwarz, aber weiterhin hinter RCD1), Grün auf
Reihenklemme_PE_SK1 - Pfeil-Kasten undurchgestrichen, TEST liefert
`I:16,0mA`/`t:20,0ms` (RCD1s Werte) und öffnet dessen Hebel; belegt, dass die
Rollenprüfung (Blau auf N, Grün auf PE) nur die Ader-FUNKTION prüft, nicht
Zugehörigkeit zum selben Stromkreis wie Schwarz - die RCD-Suche selbst folgt
ohnehin nur dem Schwarz-Pfad zur Einspeisung; **testcase_03, RCD3** (zweite
Gruppe der zweiten Hutschiene, rechts von RCD2 gezeichnet, speist SK5+SK6):
Schwarz auf der letzten grauen Reihenklemme (Reihenklemme_L_SK6, N44), Blau
auf der letzten blauen Reihenklemme (Reihenklemme_N_SK6, N45), Grün auf der
anlagenweiten PE-Klemme (N3, nicht einer Reihenklemme_PE_SKx - ein anderer
Bauteiltyp mit derselben Funktion) - Pfeil-Kasten wechselt von
durchgestrichen zu undurchgestrichen, sobald alle drei Sonden sitzen; TEST
liefert `I:20,0mA`/`Uci:0,8V` (RCD3s Werte statt RCD1s), Ampel grün, Hebel
von RCD3 öffnet sich (`rotate(180, 164, 590)` - andere Box-Koordinaten als
RCD1, da weiter rechts im Schaltkasten gezeichnet), Spannung fällt auf 0V,
Pfeil-Kasten dadurch wieder durchgestrichen; **testcase_04** (einziges RCD,
4-polig, speist L1/L2/L3 gemeinsam): Schwarz auf der zweiten grauen
Reihenklemme (Reihenklemme_L_SK2, hier also L2 statt L1 - testcase_04s drei
Stromkreise hängen je an einer eigenen Phase), Blau auf der zweiten blauen
Reihenklemme (Reihenklemme_N_SK2), Grün wieder auf der anlagenweiten
PE-Klemme - 230V erscheint sofort, Pfeil-Kasten undurchgestrichen, TEST
liefert `I:16,0mA`/`Uci:0,9V`/`t:20,0ms` (RCD1s Werte), Ampel grün, Hebel von
RCD1 öffnet sich, Spannung fällt auf 0V, Pfeil-Kasten wieder durchgestrichen;
TEST vor RCD1 (N4/N5, nur noch der Leistungsschalter auf dem Pfad) lässt
alle drei Felder auf dem Platzhalter, Ampel rot, und eine anschließende
Messspitzen-Änderung setzt die Ampel zurück auf grau; bei durchgestrichenem
Pfeil-Kasten (RCD1 offen) bleibt TEST komplett wirkungslos, Ampel bleibt
grau statt auf Rot zu springen.

**V~ - umgesetzt, reine Spannungsmessung ohne TEST-Taste und ohne
Platzierungsvorgabe.**

- `berechneRisoSpannung()` wurde zur generischen Hilfsfunktion
  `berechneSpannungZwischenAdern(aderARoh, aderBRoh)` erweitert (nimmt jetzt
  zwei beliebige Adern statt fest Schwarz/Blau zu lesen). Interne Logik
  unverändert: `risoPaarTyp(aderA, aderB)` klassifiziert das Paar (`'LN'`,
  `'LL'` oder `null`, wenn keine der beiden Adern auf L1/L2/L3 liegt),
  `risoEffektiveAder()` ersetzt eine PE-Ader durch N (siehe RISO oben), dann
  `istSpannungFuehrend()` für beide Adern - nur wenn beide `true` sind, ist
  das Ergebnis `230` (LN) bzw. `400` (LL), sonst `0`. `berechneRisoSpannung()`
  ist jetzt ein Einzeiler: `return
  berechneSpannungZwischenAdern(messspitzenAderNachFarbe('schwarz'),
  messspitzenAderNachFarbe('blau'));` - RISOs Verhalten bleibt dadurch
  unverändert (bestehende RISO-Tests laufen unverändert weiter).
- `baueAnzeigeZustand()`s V~-Zweig liest alle drei Sondenfarben und ruft
  `berechneSpannungZwischenAdern()` dreimal auf, ohne jede Rollenprüfung
  (anders als RISO/ZI/ZS/FI-RCD wird nicht verlangt, dass eine bestimmte
  Farbe auf einer bestimmten Funktion sitzt):
  `zustand.hauptwertZeilen = [{label:'Uln', wert:...}, {label:'Ulpe',
  wert:...}, {label:'Unpe', wert:...}]` - dieselbe `{label, wert}`-Form, die
  `view/messgeraet.js` bereits für den Drei-Zeilen-Hauptwertbereich
  unterstützt (siehe oben, "bisher nur für V~ gedacht"). Es gibt **keinen
  V~-Zweig im `testKlick()`-Dispatcher** - ein TEST-Klick bei V~ läuft
  dadurch komplett ins Leere, exakte User-Vorgabe ("Die TEST Taste wird
  nicht gebraucht!").
- Kein Reset-Zustand nötig (anders als bei RISO/ZI/ZS/FI-RCD): V~ hat keine
  eigene Messwert-Variable, `hauptwertZeilen` wird bei jedem Render frisch
  aus den aktuellen Messspitzen berechnet.

Getestet in `test_messgeraet.js` (10 Tests): alle drei Werte 0V ohne
Messspitzen (testcase_01); Schwarz auf L1, Blau auf N, Grün auf PE liefert
Uln=230V, Ulpe=230V, Unpe=0V - Unpe bleibt 0V, weil `risoPaarTyp()` für ein
reines N/PE-Paar `null` liefert (siehe KONZEPT.md, Abschnitt "V~"); zwei
verschiedene Außenleiter (testcase_04, L1/L2) liefern 400V; ein TEST-Klick
nach dem Platzieren der Sonden verändert das Display nicht. Zusätzlich drei
Tests auf testcase_04s drei grau eingefärbten Reihenklemme_L_SK1/SK2/SK3
(`FARBEN.reihenklemme_l` in `schaltkasten.js` ist unabhängig von der Phase
immer grau, N24/N25/N26 sind die Schrauben): nur eine Sonde gesetzt → alle
drei Paare 0V; zwei Sonden auf SK1/SK2 (L1/L2) → Uln=400V, Ulpe/Unpe bleiben
0V; alle drei Sonden auf SK1/SK2/SK3 (L1/L2/L3) → alle drei Paare zwischen
unterschiedlichen Außenleitern, also überall 400V.

Drei weitere Tests kombinieren dieselbe graue SK1-Klemme (N24, L1) mit den
blauen Reihenklemme_N_SK1/SK3 (N28/N35, `FARBEN.reihenklemme_n`) zu
L-N-Paaren und zeigen, dass Uln/Ulpe/Unpe rein von der PLATZIERTEN FARBE
abhängen, nicht vom "eigentlichen" Netz dahinter: Schwarz auf N24, Blau auf
N28 → Uln=230V (sonst 0V); Grün auf N24, Schwarz auf N28 → Ulpe=230V (sonst
0V); Blau auf N24, Grün auf N35 → Unpe=230V (sonst 0V). Die beiden letzten
Fälle brauchen mehrfaches Klicken derselben Schraube, um eine Farbe zu
erreichen, die nicht die Standard-Klickreihenfolge (1./2./3. Klick = Schwarz/
Blau/Grün) ergibt - `naechsteMessspitzenFarbe()` zyklisiert dabei die Farbe
der geklickten Schraube weiter und überspringt bereits anderswo belegte
Farben (z.B. 2 Klicks auf einer Schraube mit bereits vergebenem Blau
anderswo: Schwarz → Grün, Blau wird übersprungen).

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
