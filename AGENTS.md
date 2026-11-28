# Zusammenarbeit

Dieses Projekt ist der TREI Prüfungs-Simulator (Progressive Web App, MVC). Überblick:
`docs/KONZEPT.md`, `docs/ARCHITEKTUR.md`, `docs/BEDIENERPROZESS.md`.
Antworten und Tickets auf Deutsch.

## Rollen

| Wer    | Aufgabe                                                                    |
| ------ | -------------------------------------------------------------------------- |
| Mensch | Koordiniert von außen: setzt Prioritäten, entscheidet, schließt Tickets    |
| Claude | Setzt die Fachlogik um: Messwerte, Netzplan, Fahrpläne, Protokoll-Check, Testcases, Werkzeuge |
| Gemini | Setzt die Oberfläche um: Aussehen, Layout und Bedienung (Frontend und UX)   |
| Codex  | Liest Dateien und macht Reviews: schreibt keinen Code, ändert keine Dateien |

Faustregel: Was bestimmt, **wie es aussieht und sich bedient**, gehört Gemini. Was bestimmt,
**was elektrisch passiert**, gehört Claude. Codex prüft beides.

### Rolle: Gemini (Frontend und UX)

- **Zuständig und setzt selbst um:** visuelle Gestaltung (SVG-Zeichnungen, Farben, Kontraste,
  Lesbarkeit), Layout für Handy und Desktop, Bedienung (Klick- und Touch-Flächen, Hover,
  Tastatur, Cursor, Popups, Handy-Widget), App-Rahmen (Einstiegsseite, PWA/Offline,
  Barrierefreiheit) und Frontend-Refactoring.
- **Dateien:** Gemini ändert die Darstellung in `view/`, `index.html`, CSS sowie
  `docs/Layoutrefactor.md` und Referenzbilder in `docs/referenz/`.
- **Nicht Geminis Bereich:** `model/`, `tools/`, `tests/visuell/testcase_NN/` (außer dem
  Referenzbild `anlage.svg`, siehe Projektregeln), Demos,
  `controller/protokoll_check.js`, `controller/fahrplan_ausfuehrung.js`, also alles, was Messwerte,
  Fahrpläne oder den Check ändert. Braucht ein Oberflächen-Ticket dort eine Änderung, legt Gemini
  ein Ticket für Claude an oder kommentiert das bestehende.
- **Ein Owner je Ticket:** Wer das Ticket übernimmt (`--claim`), ist für alle seine Änderungen
  zuständig, auch in Dateien, die Darstellung und Logik mischen (`controller/app.js`,
  `view/schaltkasten.js`). Messpunkte, Klickflächen und `data-`-Attribute nutzen Fahrplan, Replay
  und Tests; `npm test` zeigt, wenn dabei etwas bricht. Ist sich der Owner fachlich unsicher,
  fragt er am Ticket nach.
- **Gleiche Pflichten wie Claude:** Ticket übernehmen (`--claim`), umsetzen, `npm test` grün,
  gerenderte Vorher-/Nachher-Bilder in `docs/referenz/`, Kommentar am Ticket mit Dateiverweisen,
  Label `review`. Review-Ergebnisse bewertet Gemini als Umsetzer selbst (siehe „Ablauf“, Schritt 4).
- **Projektregeln gelten auch für Gemini**, besonders: Die Schalter-Box im Schaltkasten ist
  statisch, `data-`-Attribute und Messpunkte nicht umbenennen, ohne die Tests anzupassen.
- **Beratung für Claude:** Bei Fachlogik-Tickets, die die Oberfläche berühren, stellt Claude den
  Vorschlag ans Ticket und Gemini sieht ihn durch.
- **Fachliche Normfragen** entscheidet immer der Mensch.
- **Kennung:** `BEADS_ACTOR=gemini`.
- **Commits & Schließen:** Gemini committet seine eigenen Tickets nach den Commit-Regeln (siehe
  „Committen“); Tickets schließt der Mensch.
- **Nicht gleichzeitig an denselben Dateien:** Wer ein Ticket übernommen hat, ist für dessen
  Dateien zuständig. Arbeitet Gemini gerade an einer Datei, nimmt Claude keine Arbeit an derselben
  Datei auf, und umgekehrt. Das `--claim` am Ticket zeigt, wer woran ist.

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
  `BEADS_ACTOR=claude`, Gemini mit `BEADS_ACTOR=gemini`. Sonst übernimmt `bd` Name und
  E-Mail aus der Git-Konfiguration.

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
2. **Der Umsetzer** übernimmt ein Ticket (`bd update <id> --claim`): Claude bei Fachlogik,
   Gemini bei Oberfläche (siehe „Rollen“). Er setzt es um und lässt `npm test` laufen. Dann
   kommentiert er am Ticket, was geändert wurde (mit Dateiverweisen), und setzt das Label
   `review` (`bd label add <id> review`).
3. **Codex** prüft Tickets mit dem Label `review`: liest die verwiesenen Dateien und den Diff
   und schreibt die Ergebnisse als Review-Kommentar ans Ticket (mit Dateiverweisen). Codex
   ändert keinen Code und legt keine eigenen Tickets an.
   - **Review-Aufteilung:** Das Code-Review liegt immer bei Codex, egal wer umgesetzt hat. Setzt
     Claude um und betrifft es Bedienung oder Darstellung, macht Gemini zusätzlich ein
     Bedienbarkeits-Review, ebenfalls als Kommentar ans Ticket.
4. **Der Umsetzer** liest die Review-Kommentare und bewertet sie kritisch. Was sinnvoll ist,
   setzt er um. Was er nicht umsetzt, begründet er in einem Kommentar am Ticket. Danach geht
   das Ticket zum Menschen.
   - Jedes Ticket bekommt mindestens ein Review.
   - Nach Fixes aus dem Review entscheidet der Umsetzer, ob ein zweites Review nötig ist. Ist der Fix
     klein (nur Text, Kommentare oder Doku, kein geändertes Verhalten), darf es entfallen.
     Ändert der Fix Code, Logik, Tests oder erzeugte Daten in nennenswertem Umfang, gibt es
     immer ein zweites Review.
   - Der Umsetzer schreibt die Entscheidung mit Begründung in den Kommentar am Ticket.
5. Der **Mensch** schließt das Ticket (`bd close <id>`). Claude oder Gemini schließen ein Ticket
   nur, wenn der Mensch es ausdrücklich sagt, und fragen sonst immer vorher nach.

## Regeln

- Neue Arbeit, die beim Umsetzen auffällt, wird als eigenes Ticket angelegt und nicht
  stillschweigend miterledigt. Tickets anlegen dürfen Claude und Gemini, Codex nicht.
- Commits siehe „Committen“.
- Wiederverwendbare Entwickler-Werkzeuge liegen in `tools/` (Index:
  `.claude/skills/entwickler-werkzeuge/SKILL.md`). Vor einem neuen Wegwerf-Skript zuerst
  prüfen, ob eines davon reicht. Taucht dasselbe Wegwerf-Muster zum zweiten Mal auf, wird
  das im Ticket als Kandidat für ein neues Werkzeug vorgeschlagen. Der Mensch entscheidet.

## Committen

Der Owner eines Tickets committet es selbst: Claude die Fachlogik-Tickets, Gemini die
Oberflächen-Tickets. Codex committet nicht. Vor jedem Commit:

1. Der Mensch hat den Commit ausdrücklich gewünscht.
2. Das Review von Codex liegt vor und ist bewertet (siehe „Ablauf“, Schritt 4).
3. `npm test` ist grün.
4. Die Git-Identität im Simulator-Ordner ist anonym (`git config user.name` ergibt
   `derkrembold`, siehe „Beads auf einem neuen Rechner einrichten“, Punkt 5).
5. Nur Dateien des eigenen Tickets committen; kein urheberrechtlich geschütztes Material aus
   `docs/referenz/` (siehe Projektregeln), keine `fahrplan.pdf`/`pruefprotokoll.pdf`.
6. Nach dem Commit pushen, dann die Tickets exportieren und in trei committen und pushen:
   `bd export -o "<trei>/TREI80 Teil B/beads/issues.jsonl"`, dann `bd dolt push`.
7. Vor neuer Arbeit `git pull` und `bd dolt pull`, damit beide Rechner denselben Stand haben.

## Projektregeln

- **Keine Merker im Sourcecode:** Notizen zu künftigen Verbesserungen oder bewussten
  Vereinfachungen gehören in `docs/KONZEPT.md`, `docs/ARCHITEKTUR.md` oder in ein Ticket, nie
  als Kommentar im Code. Ein Code-Kommentar erklärt nur, was der Code tut und warum.
- **Schalter-Box im Schaltkasten ist statisch:** Die weiße Box bei RCD, LS und Leistungsschalter
  (`zeichneSchalter()` in `view/schaltkasten.js`) bewegt sich nie. Nur ihr Inhalt darf sich
  beim Umschalten ändern.
- **Referenzbilder des Schaltkastens:** `tests/visuell/run_tests.js` rendert für jeden Testcase den
  Schaltkasten und vergleicht ihn Zeichen für Zeichen mit `tests/visuell/testcase_NN/anlage.svg`.
  Ändert sich die Zeichnung (`view/schaltkasten.js`, auch nur eine Farbe), schlagen alle
  Testcases fehl. Dann alle `anlage.svg` neu erzeugen, den Unterschied dem Menschen mit
  Vorher-/Nachher-Bild zeigen und abnehmen lassen. Mehrere Optik-Tickets am Schaltkasten möglichst
  zusammen umsetzen, damit die Referenzbilder nur einmal neu entstehen.
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
