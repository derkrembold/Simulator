---
name: entwickler-werkzeuge
description: Index der wiederverwendbaren Node-Entwickler-Werkzeuge unter tools/ in diesem Projekt (TREI Prüfungs-Simulator) - nutzen, bevor ein throwaway-Playwright-Skript gebaut wird, um Netz-IDs/Verdrahtung eines Testcases nachzuschlagen oder zu verifizieren
---

Dieses Projekt sammelt wiederverwendbare Entwickler-Werkzeuge unter `tools/`
(ausführlich dokumentiert in `docs/ARCHITEKTUR.md`, Abschnitt "Entwickler-
Skills" - dort steht die vollständige Beschreibung, Design-Entscheidungen
und Bugfix-Historie zu jedem Werkzeug; diese Datei ist nur ein Index, keine
Doku-Kopie). Vor jedem throwaway-Playwright-Skript (Sonden setzen,
Drehknopf drehen, TEST drücken) erst prüfen, ob eines dieser Werkzeuge die
Frage schon beantwortet - spart oft das manuelle Nachschlagen von Netz-IDs
in `anlage.json`/`graph.json`.

## Verfügbare Werkzeuge

### `tools/pfad_zur_einspeisung.js`

Gibt für eine Schraube im Schaltkasten ODER eine Endstelle (Drehstrom-
steckdose, Schuko-Steckdose, Anschlussdose/Lichtauslass, 5-polige
Anschlussdose) den Verdrahtungspfad zur Einspeisung aus - als Tabelle mit
den Spalten Eingang, Ausgang, Bauteil, Verzweigung. Prüft dabei automatisch
`graph.json` gegen den tatsächlich gerenderten Schaltkasten (headless
Playwright) und bricht mit Exit-Code 1 ab, wenn beide voneinander abweichen.

Aufruf für eine Schaltkasten-Schraube:
```
node tools/pfad_zur_einspeisung.js <testcase> <bauteil> <netz>
node tools/pfad_zur_einspeisung.js testcase_04 LS3 N26
```

Aufruf für eine Endstelle (Steckdose/Drehstromsteckdose/Anschlussdose):
```
node tools/pfad_zur_einspeisung.js <testcase> --endstelle <SK> <funktion>
node tools/pfad_zur_einspeisung.js testcase_05 --endstelle SK1 L1
```

Nützlich, um schnell herauszufinden: welche Netz-ID gehört zu einem
bestimmten Bauteil-Pin; welche anderen Bauteile hängen an derselben
Sammelschiene/geteilten Schraube (Verzweigungs-Spalte, z.B. `RCD2 (1)`,
`RCD2 (2)` bei einer geteilten Ausgangsschraube); ob die Verdrahtung
zwischen Datenmodell und Rendering konsistent ist.

**Nicht geeignet für:** Fragen zu Schalterzuständen/Messwerten (Hebel/
Schrauben-Interaktion, RISO/RCD-Auslösewerte etc.) - das Werkzeug ignoriert
bewusst jeden Schaltzustand und prüft nur die statische Verdrahtung. Dafür
`tools/messgeraet_steuerung.js` (siehe unten).

### `tools/messgeraet_steuerung.js`

Node-Modul (kein CLI-Tool, sondern `require()`-bar), das das komplette
throwaway-Playwright-Interaktionsmuster dieser Session formalisiert:
Server/Browser starten, Drehknopf auf einen Modus drehen, Werte einstellen/
lesen, Messspitzen setzen, Bauteil-Hebel/Schrauben bedienen, TEST drücken.
Vor jedem NEUEN throwaway-Verifikationsskript erst prüfen, ob sich der
Ablauf komplett aus diesem Modul zusammensetzen lässt, statt Boilerplate
neu zu schreiben.

```js
const { starteTestUmgebung, drehknopfAufModus, stelleEin, leseWert,
  messspitzeSetzen, hebelSchalten, schraubeSchalten, testDruecken
} = require('./tools/messgeraet_steuerung.js');

const ctx = await starteTestUmgebung('testcase_04');
await drehknopfAufModus(ctx, 'RISO');
await stelleEin(ctx, 'grenzwiderstand', 30);
await messspitzeSetzen(ctx, { bauteil: 'RCD1', netz: 'N10' });
await messspitzeSetzen(ctx, { bauteil: 'RCD1', netz: 'N11' });
await messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' });
await testDruecken(ctx);
console.log(await leseWert(ctx, 'hauptmesswert'), await leseWert(ctx, 'ampel'));
await ctx.schliessen();
```

Welche Felder pro Modus settable/readable sind (inkl. Defaults, feste
Wertelisten vs. Schrittweiten): siehe ARCHITEKTUR.md "Messgerät:
Settable/Readable-Referenz" - direkt vor der Tool-Beschreibung selbst.

**Wichtiger Fallstrick:** `schraubeSchalten()` auf eine Schraube mit
bereits gesetzter Messspitze ist wirkungslos UND lässt das Werkzeug
"aufgenommen" zurück (App-Verhalten, kein Bug) - immer eine Schraube ohne
eigene Messspitze wählen.

### `tools/fahrplan_rekorder.js`

Dünner Wrapper um `tools/messgeraet_steuerung.js`: `erstelleRekorder(basis)`
liefert ein Objekt mit denselben Funktionen, das jeden Aufruf (Funktion +
Argumente + Rückgabewert) automatisch mitschreibt, gruppiert über
`abschnittBeginnen(titel, begruendung)`/`abschnittEnde()`. `alsJson(anlage)`
liefert das komplette Aktionsprotokoll - Grundlage für den geplanten
Fahrplan (PDF + Replay-Skript, siehe ARCHITEKTUR.md "Fahrplan-Erstellung
(Konzept)"). Wird bereits von `tools/pruefprotokoll_erstellung.js` genutzt.

### `tools/pruefprotokoll_erstellung.js`

Geht für eine Anlage Stromkreis für Stromkreis durch, misst über
`tools/messgeraet_steuerung.js` (aufgezeichnet mit `fahrplan_rekorder.js`),
füllt die Stromkreisverteiler-Tabelle in `view/protokoll.js` und
exportiert das Ergebnis als PDF.

```
node tools/pruefprotokoll_erstellung.js testcase_04
node tools/pruefprotokoll_erstellung.js testcase_04 pfad/zum/ausgabeordner
```

Schreibt `pruefprotokoll.pdf` + `fahrplan.json` in den Ausgabeordner
(Default: `tests/visuell/<testcase>/`). Mit `PROTOKOLL_SCREENSHOT=<pfad>.png`
zusätzlich drei gescrollte Debug-Screenshots der Tabelle.

**Drei wichtige Fallstricke, beim Bauen/Verallgemeinern selbst gefunden:**
1. Jede Messung läuft in einem FRISCHEN `starteTestUmgebung()`-Kontext,
   nicht in einem wiederverwendeten - Messspitzen bleiben sonst über
   Modus-Wechsel hinweg bestehen (nur Aus-/Einschalten entfernt sie) und
   verschieben die Schwarz/Blau/Grün-Zuordnung der nächsten Messung.
2. Vor RISO muss IMMER die Schraube der nächstgelegenen Trennstelle (LS
   falls AFDD, sonst das Gruppen-RCD) geöffnet werden - auch wenn dieses
   Bauteil selbst kein Typ B/AFDD ist. Der Hauptschalter allein reicht
   nicht, sobald eine ANDERE RCD-Gruppe auf derselben Sammelschiene sitzt
   (siehe `testcase_05`: G1/RCD-Typ-A und G2/RCD-Typ-B teilen sich Phase
   L1 - nur den Hauptschalter zu öffnen ließ RCD2/LS2/LS3 weiterhin
   erreichbar und verfälschte die Messung).
3. `schraubeSchalten()` muss bei geteilten Schrauben auch
   `data-netz-weitere` prüfen, nicht nur `data-netz` (siehe `testcase_06`s
   RCD2-Ausgang, der SK2+SK3 gemeinsam versorgt) - inzwischen in
   `messgeraet_steuerung.js` selbst gefixt (exakter Abgleich gegen beide
   Attribute), kein Workaround im aufrufenden Code mehr nötig.

Details in ARCHITEKTUR.md ("`tools/pruefprotokoll_erstellung.js`").

**Verifiziert auf ALLEN SECHS Testcases (Stand 2026-07-31, `testcase_01`
bis `testcase_06`)** - deckt ab: einphasige und dreiphasige Stromkreise,
Stromkreise mit und ohne RCD, RCD Typ A/B, AFDD-Kombigeräte, mehrere
RCD-Gruppen auf derselben Sammelschiene, geteilte Schrauben, verschiedene
Hauptschalter-Namen. Sondenplatzierung erfolgt über Netz-ID aus
`anlage.json`, nicht über Bauteilnamen-Konvention (die je nach Anzahl
Phasen unterschiedlich ist).

### `tools/fahrplan_beschreibung.js`

Liest eine `fahrplan.json` (siehe `tools/fahrplan_rekorder.js` oben) und
erzeugt daraus eine menschenlesbare PDF-Beschreibung des Ablaufs - ein
deutscher Satz pro aufgezeichnetem Schritt, statt der rohen
`{funktion, argumente, ergebnis}`-Tripel. Eigenständiges Tool, arbeitet auf
JEDER `fahrplan.json`.

```
node tools/fahrplan_beschreibung.js <testcase> [ausgabeordner]
node tools/fahrplan_beschreibung.js testcase_04
```

Liest `<ausgabeordner>/fahrplan.json` (Default: `tests/visuell/<testcase>/`),
schreibt `<ausgabeordner>/fahrplan.pdf` daneben. Erster der zwei geplanten
Fahrplan-Renderer (siehe ARCHITEKTUR.md "Fahrplan-Erstellung (Konzept)") -
der zweite (Replay-Skript, headful) ist noch offen.

### `tests/visuell/test_pruefprotokoll.js`

Automatisierter Regressionstest (Teil von `npm test`) über
`tools/pruefprotokoll_erstellung.js` für alle sechs Testcases - vergleicht
die gemessenen RCD-Werte gegen die unabhängigen Referenzwerte aus
`bauteile.md` (`iA`/`tA`/`uB`) und prüft `Riso Verbraucher ohne` auf
`>999MΩ`. `tools/pruefprotokoll_erstellung.js` ist dafür `require()`-bar
(`berechneProtokoll(testcase)`, keine Datei-/PDF-Nebenwirkungen). Details
in ARCHITEKTUR.md.
