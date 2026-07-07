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
