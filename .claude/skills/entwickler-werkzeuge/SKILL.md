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
