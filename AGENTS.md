# Zusammenarbeit

Dieses Projekt ist der TREI Prüfungs-Simulator (Progressive Web App, MVC). Überblick:
`docs/KONZEPT.md`, `docs/ARCHITEKTUR.md`, `docs/BEDIENERPROZESS.md`.
Antworten und Tickets auf Deutsch.

## Rollen

| Wer    | Aufgabe                                                                    |
| ------ | -------------------------------------------------------------------------- |
| Mensch | Koordiniert von außen: setzt Prioritäten, entscheidet, schließt Tickets    |
| Claude | Setzt um: schreibt und ändert Code, Tests und Doku                         |
| Codex  | Liest Dateien und macht Reviews: schreibt keinen Code, ändert keine Dateien |
| Gemini | Product Engineer: führt die App zur Marktreife (Design/UI/UX, SVG-Grafiken, Layout, Refactoring, PWA, Härtung) |

### Rolle: Gemini (Product Engineer)

- **Schwerpunkt:** Visuelle Gestaltung (SVGs, Kontraste, Lesbarkeit), responsives Layout (Handy &
  Desktop), UX/Bedienbarkeit, Frontend-Refactoring, PWA-/Offline-Fähigkeit, Persistenz und Härtung
  gegen Randfälle.
- **Abgrenzung zu Claude:** Elektrotechnik-/VDE-Fachlogik, Netzplan-Generatoren, Fahrpläne,
  Protokoll-Check und Testcases liegen primär bei Claude; Gemini ändert dort nur im Rahmen
  abgestimmter Refactorings. Fachliche Normfragen entscheidet immer der Mensch.
- **Ablauf & Kennung:** Gemini arbeitet im gleichen Beads-Ablauf wie Claude (`BEADS_ACTOR=gemini`):
  Ticket übernehmen (`--claim`), Code/Tests/Doku umsetzen, `npm test` grün laufen lassen, gerenderte
  Vorher-/Nachher-Bilder in `docs/referenz/` ablegen, am Ticket kommentieren und Label `review` für
  Codex setzen. Review-Bewertung erfolgt durch den jeweiligen Umsetzer.
- **Commits & Schließen:** Commits macht weiterhin nur Claude auf Wunsch des Menschen; Tickets
  schließt der Mensch.

## Kommunikation nur über Beads

- Alle Absprachen zwischen den Agenten laufen über Beads-Tickets (`bd`). Keine Notizen,
  Übergaben oder Nachrichten in Dateien oder als Kommentar im Sourcecode.
- Tickets verweisen auf Dateien per Pfad, bei Code mit Zeile (`datei:zeile`). Inhalte aus
  `docs/` oder dem Code werden nicht ins Ticket kopiert.
- Erkenntnisse, Entscheidungen und Review-Ergebnisse kommen als Kommentar ans Ticket:
  `bd comments add <id> "..."`.
- Beads-Präfix `sim`. Die Tickets liegen im **privaten** Repository `derkrembold/trei`, nicht
  im öffentlichen Simulator-Repo (sie enthalten Namen und E-Mail-Adressen):
  - lesbare Ticket-Liste: `trei/TREI80 Teil B/beads/issues.jsonl`, erzeugt mit
    `bd export -o "<trei>/TREI80 Teil B/beads/issues.jsonl"` und dort committet,
  - vollständige Historie: `bd dolt push` / `bd dolt pull` (Remote ist `derkrembold/trei`).
  `.beads/issues.jsonl` im Simulator-Ordner ist nur eine lokale Kopie und steht in `.gitignore`.
- Jeder Agent schreibt unter eigener Kennung: Codex mit `BEADS_ACTOR=codex`, Claude mit
  `BEADS_ACTOR=claude`, Gemini mit `BEADS_ACTOR=gemini`. Sonst übernimmt `bd` Name und E-Mail aus der Git-Konfiguration.

### Beads auf einem neuen Rechner einrichten

Im Simulator-Repo steht nur die Konfiguration (`.beads/config.yaml`, `sync.remote` zeigt auf
`derkrembold/trei`). Die Ticket-Datenbank wird nicht eingecheckt, nach einem `git clone` fehlt
sie also. So holt man sie:

1. Zugriff auf das private Repo prüfen: `git ls-remote https://github.com/derkrembold/trei.git`.
   Schlägt das fehl: `gh auth login` mit dem Konto `derkrembold`, dann `gh auth setup-git`.
2. `bd version` muss `bootstrap` kennen (getestet mit 1.3.2).
3. Im Simulator-Ordner: `git pull`, `bd bootstrap --dry-run`, `bd bootstrap`, dann `bd ready`.
4. Gab es dort schon ein `bd init`, meldet `bootstrap` nur eine vorhandene Datenbank. Dann
   `.beads/embeddeddolt` umbenennen (nicht löschen) und `bd bootstrap` wiederholen.
5. Anonyme Git-Identität im Simulator-Ordner, damit kein Name ins öffentliche Repo kommt:
   `git config user.name derkrembold` und
   `git config user.email 182214423+derkrembold@users.noreply.github.com`.
6. Für den lesbaren Export trei nach `~/Documents/trei` klonen (nur beim Committen nötig).

## Ablauf

1. Offene Arbeit finden: `bd ready`, Details mit `bd show <id>`.
2. **Claude** (oder **Gemini** bei Tickets aus seinem Schwerpunkt, siehe „Rolle: Gemini“)
   übernimmt ein Ticket (`bd update <id> --claim`), setzt es um und lässt `npm test` laufen.
   Dann kommentiert der Umsetzer am Ticket, was geändert wurde (mit Dateiverweisen), und setzt
   das Label `review` (`bd label add <id> review`). In den folgenden Schritten gilt für Gemini
   dasselbe wie für Claude, außer beim Committen.
3. **Codex** prüft Tickets mit dem Label `review`: liest die verwiesenen Dateien und den Diff
   und schreibt die Ergebnisse als Review-Kommentar ans Ticket (mit Dateiverweisen). Codex
   ändert keinen Code und legt keine eigenen Tickets an.
   - **Review-Aufteilung:** Das Code-Review liegt bei Codex. Betrifft ein Ticket die Bedienung
     oder Darstellung (z.B. Label `layout`), macht Gemini zusätzlich ein Bedienbarkeits-Review
     und schreibt es ebenfalls als Kommentar ans Ticket. Setzt Gemini selbst um, entfällt dessen
     Bedienbarkeits-Review; das Code-Review bleibt bei Codex. Bei reinen Code-Änderungen ohne
     Auswirkung auf Bedienung oder Darstellung (z.B. Fachlogik, Werkzeuge, Tests) reviewt Gemini
     nicht.
4. **Claude** liest die Review-Kommentare und bewertet sie kritisch. Was sinnvoll ist, setzt
   Claude um. Was Claude nicht umsetzt, begründet Claude in einem Kommentar am Ticket. Danach
   geht das Ticket zum Menschen.
   - Jedes Ticket bekommt mindestens ein Review.
   - Nach Fixes aus dem Review entscheidet Claude, ob ein zweites Review nötig ist. Ist der Fix
     klein (nur Text, Kommentare oder Doku, kein geändertes Verhalten), darf es entfallen.
     Ändert der Fix Code, Logik, Tests oder erzeugte Daten in nennenswertem Umfang, gibt es
     immer ein zweites Review.
   - Claude schreibt die Entscheidung mit Begründung in den Kommentar am Ticket.
5. Der **Mensch** schließt das Ticket (`bd close <id>`). Claude schließt ein Ticket nur, wenn
   der Mensch es ausdrücklich sagt, und fragt sonst immer vorher nach.

## Regeln

- Neue Arbeit, die beim Umsetzen auffällt, wird als eigenes Ticket angelegt und nicht
  stillschweigend miterledigt.
- Vor jedem Commit muss `npm test` grün sein. Commits macht nur Claude, und nur auf Wunsch des
  Menschen.
- Wiederverwendbare Entwickler-Werkzeuge liegen in `tools/` (Index:
  `.claude/skills/entwickler-werkzeuge/SKILL.md`). Vor einem neuen Wegwerf-Skript zuerst
  prüfen, ob eines davon reicht. Taucht dasselbe Wegwerf-Muster zum zweiten Mal auf, wird
  das im Ticket als Kandidat für ein neues Werkzeug vorgeschlagen. Der Mensch entscheidet.

## Projektregeln

- **Keine Merker im Sourcecode:** Notizen zu künftigen Verbesserungen oder bewussten
  Vereinfachungen gehören in `docs/KONZEPT.md`, `docs/ARCHITEKTUR.md` oder in ein Ticket, nie
  als Kommentar im Code. Ein Code-Kommentar erklärt nur, was der Code tut und warum.
- **Schalter-Box im Schaltkasten ist statisch:** Die weiße Box bei RCD, LS und Leistungsschalter
  (`zeichneSchalter()` in `view/schaltkasten.js`) bewegt sich nie. Nur ihr Inhalt darf sich
  beim Umschalten ändern.
- **Testcases** liegen in `tests/visuell/testcase_NN/`. Ändert sich eine `anlage.json`, muss
  `fahrplan.json` neu erzeugt werden (`node tools/pruefprotokoll_erstellung.js <testcase>`).
  `fahrplan.json` wird mit eingecheckt, weil die App sie zur Laufzeit lädt. Die beiden PDFs
  (`fahrplan.pdf`, `pruefprotokoll.pdf`) bleiben ausgeschlossen.
- **Gerenderte Bilder und SVGs**, die dem Menschen gezeigt werden, zusätzlich mit versioniertem
  Namen nach `docs/referenz/` kopieren (zum Beispiel `messgeraet_render_v1.svg`), nicht nur in
  ein Temp-Verzeichnis.
- **Öffentliches Repo:** `derkrembold/Simulator` ist öffentlich (GitHub Pages). Unter
  `docs/referenz/` liegt fremdes, urheberrechtlich geschütztes Material (Handbücher, Normen).
  Solche Dateien nicht einchecken. Im Zweifel den Menschen fragen.
- **App lokal testen:** `npx serve` im Projektordner (ES-Module brauchen einen HTTP-Server).
