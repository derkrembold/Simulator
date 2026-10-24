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

## Kommunikation nur über Beads

- Alle Absprachen zwischen den Agenten laufen über Beads-Tickets (`bd`). Keine Notizen,
  Übergaben oder Nachrichten in Dateien oder als Kommentar im Sourcecode.
- Tickets verweisen auf Dateien per Pfad, bei Code mit Zeile (`datei:zeile`). Inhalte aus
  `docs/` oder dem Code werden nicht ins Ticket kopiert.
- Erkenntnisse, Entscheidungen und Review-Ergebnisse kommen als Kommentar ans Ticket:
  `bd comments add <id> "..."`.
- Beads ist lokal eingerichtet (Stealth, nicht in Git). Die Tickets gibt es nur auf diesem
  Rechner.

## Ablauf

1. Offene Arbeit finden: `bd ready`, Details mit `bd show <id>`.
2. **Claude** übernimmt ein Ticket (`bd update <id> --claim`), setzt es um und lässt `npm test`
   laufen. Dann kommentiert Claude am Ticket, was geändert wurde (mit Dateiverweisen), und
   setzt das Label `review` (`bd label add <id> review`).
3. **Codex** prüft Tickets mit dem Label `review`: liest die verwiesenen Dateien und den Diff
   und schreibt die Ergebnisse als Review-Kommentar ans Ticket (mit Dateiverweisen). Codex
   ändert keinen Code und legt keine eigenen Tickets an.
4. **Claude** liest die Review-Kommentare und bewertet sie kritisch. Was sinnvoll ist, setzt
   Claude um. Was Claude nicht umsetzt, begründet Claude in einem Kommentar am Ticket. Danach
   geht das Ticket zum Menschen.
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
