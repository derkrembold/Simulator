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
        |-- run_tests.js     <- Testskript: alle Testcases ausfuehren
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
  (Mindestauslösestrom) automatisch aus LS-Typ **und** Bemessungsstrom berechnet
  (`LIM_REFERENZ_BEI_16A_NACH_LS_TYP`, skaliert mit `Bemessungsstrom / 16`) – kein
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
  (normal oder invers, Kästchenbreite grob aus der Zeichenanzahl berechnet,
  `Zeichen × 8 + 8`px) und wird sowohl für den Titel als auch für jeden
  `titelWerte`-Eintrag verwendet. Der Auswahl-Index lebt in `controller/app.js`
  (eigene Variable `zone1Auswahl`, getrennt von `messgeraetZustand`, da
  `zustandFuerFunktion()` bei jedem Drehknopf-/ON-OFF-Klick einen komplett
  neuen Zustand baut) und wird beim Wechsel der Funktion oder beim
  Ein-/Ausschalten auf 0 (Titel) zurückgesetzt. Andere Display-Bereiche (Zone
  2/3, Nebenwerte) sind noch nicht ans Cycling angeschlossen.
- **Aktueller Stand:** ON/OFF-Taste (an/aus, Gerät startet aus), Drehknopf
  (`naechsteFunktion(funktion)` schaltet zyklisch RLOW→RISO→ZI→ZS→FI/RCD→V~→RLOW
  weiter, Zustand wird dabei über `zustandFuerFunktion()` neu aufgebaut - alte
  Messwerte verschwinden automatisch) und ◄► (Zone-1-Feld-Auswahl, siehe oben)
  sind interaktiv. Alle sechs Messfunktionen sind vollständig gegen die
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
