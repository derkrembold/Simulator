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
weiterhin ein throwaway-Playwright-Skript bauen (siehe bestehende Muster in
`tests/visuell/test_messgeraet.js`).
