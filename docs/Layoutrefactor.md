# Layout- & UI-Refactor – Bereinigte Roadmap (Stand nach sim-uqo)

Abgestimmte Arbeitsgrundlage für die schrittweise Verbesserung von Usability und Look & Feel im TREI Prüfungs-Simulator, inklusive aller technischen Korrekturen aus dem Doppel-Review (`sim-uqo`, Codex & Claude).

**Arbeitsweise:** Die Punkte werden nicht blind 1:1 übernommen, sondern vor der Umsetzung einzeln besprochen, iterativ Ticket für Ticket umgesetzt und optisch/funktional am Ergebnis geprüft – was gut aussieht und funktioniert, bleibt drin; was nicht überzeugt, wird angepasst oder wieder herausgenommen.

---

## Festgelegte Prinzipien & Leitplanken

- **Handyfähig & schmal:** Die App muss auf dem Smartphone gut bedienbar sein. Ein schmales, einspaltiges Layout bleibt der Standard und soll die volle Smartphone-Breite ausnutzen (keine verschenkten Ränder, größere Darstellung).
- **Kein Quer-Scrollen der Seite (mit einer bewussten Ausnahme):** Die Seite selbst scrollt ausschließlich vertikal. **Bewusste Ausnahme:** Die 19-spaltige Stromkreisverteiler-Messtabelle im Prüfprotokoll bleibt in ihrer heutigen Tabellenform erhalten und darf innerhalb ihres eigenen Scroll-Rahmens (`.pf-scroll`) horizontal scrollen.
- **Schlicht & funktionell:** Funktion und schnelle Erfassbarkeit stehen klar im Vordergrund – kein verspielter Deko-Schnörkel.
- **Realitätsnah bleiben:** Bedienung orientiert sich an echten Geräten (z. B. Drehknopf bleibt zyklisch).
- **Didaktik bewahren:** Keine ungefragten Hilfen im Schaltkasten (die geplante Legende bildet die echte Prüfungssituation ab und darf fehlen, unvollständig oder falsch sein).
- **Erweiterbarkeit im Blick behalten:** Bei Änderungen an Messgerät und Fahrplänen im Hinterkopf behalten, dass später weitere Messgeräte (z. B. Fluke, Gossen, Wiha) auswählbar sein sollen.
- **Technische Leitplanken:**
  - Die weiße Schalter-Box (`zeichneSchalter()` in `view/schaltkasten.js`) bewegt sich nie; nur ihr Inhalt darf sich beim Umschalten ändern.
  - Bestehende DOM-Selektoren/Attribute, Direkt-URLs (`?anlage=...`) und `@media print` für den PDF-Druck bleiben stabil.
  - Änderungen am Schaltkasten-SVG selbst (`anlage.svg`-Snapshots in `tests/visuell/run_tests.js`) werden bewusst separat und erst nach Abnahme umgesetzt.

---

## Priorität 1 – Hohe Priorität (akute Schmerzpunkte)

> **Umsetzungsreihenfolge:** `P1.1` (Handy-Skalierung) bildet die Basis für `P1.2` (Klickflächen) und `P1.4` (Messspitzen), da deren sichtbare Größe in CSS-Pixeln von der Skalierung abhängt. **`P1.3` (Lichtanschlussdosen/Wago)**, **`P1.5` (Protokoll-Tastatur)** und **`P1.6` (Messgerät-Ampeln)** sind davon unabhängig und können jederzeit direkt umgesetzt werden.

### P1.1 Randfüllendes, zentriertes Layout für Handy & Desktop (Basis für P1.2 & P1.4)
- **Problem:** In `index.html` fehlt `<meta name="viewport" content="width=device-width, initial-scale=1">`, und feste 640px-Breiten + `padding: 20px` links führen zu zwei Problemen: Auf Smartphones zoomt der Browser auf ~980px heraus (alle Grafiken wirken klein mit leerem Rand), und auf dem Desktop klebt alles links am Rand mit großer leerer Fläche rechts daneben. Zudem positioniert `controller/app.js:1836-1872` Handy und Schraubendreher über starre `position: absolute`-Pixelwerte.
- **Lösung:**
  - `<meta name="viewport" content="width=device-width, initial-scale=1">` in `index.html` ergänzen.
  - **Eine zentrale, einspaltige Arbeitsfläche** in der bewährten Reihenfolge (*Steckdosen → Schaltkasten → Werkzeugzeile → Protokoll*):
    - **Auf dem Handy:** volle Bildschirmbreite mit minimalem Rand/Padding → Grafiken werden ~50 % größer als heute.
    - **Auf dem Desktop:** horizontal **zentriert** (`margin: 0 auto`) und per SVG-`viewBox` sanft auf **~760–820 px** Maximalbreite hochskaliert (gestochen scharf, ~20–25 % größere Klickziele & breiteres Protokoll), eingebettet in einen ruhigen, leicht abgetönten Hintergrund.
  - **Snapshot-neutrale Skalierung:** `view/schaltkasten.js` bleibt unverändert (`anlage.svg`-Snapshots bleiben unberührt); die Skalierung läuft rein per CSS am Container (z. B. `#schaltkasten svg { width: 100%; height: auto }`), und die Breitenkette für Steckdosen, Protokoll und Werkzeugzeile in `controller/app.js` wird auf die tatsächliche Spaltenbreite umgestellt.
  - **Werkzeugzeile auf dem Handy (offener Diskussionspunkt vor Umsetzung):** Das Messgerät soll in seiner Darstellungsgröße/Lesbarkeit **nicht** verkleinert werden – kein blindes proportionales Herunterskalieren der 3er-Reihe auf Handybreite; die konkrete Anordnung wird vor Umsetzung von `sim-rng` abgestimmt.
  - Bestehende Layout-Tests (`tests/visuell/test_protokoll.js`, `tests/visuell/test_schraubendreher.js`, `tests/visuell/test_handy_timer.js`) auf die neue Spaltenbreite anpassen und um Prüfungen für schmale Handy-Viewports ergänzen.

### P1.2 Fehlklicks an Schrauben & Kontakten reduzieren
- **Problem:** Schrauben (`view/schaltkasten.js:91-125`, `r=4`) und Dosen-Kontakte (`view/steckdosen.js:116-117,165`, `r=4`) sind auf kleinem Laptop-Screen und per Finger auf dem Handy schwer zu treffen.
- **Lösung (testsicher & snapshot-neutral):**
  - **Kein separates Overlay über der Schraube** (würde Playwright-Klicks blockieren und die Kreis-Identität in `controller/app.js` stören). Stattdessen die Trefferfläche direkt **per CSS am Original-Element** vergrößern (z. B. `stroke: transparent; stroke-width: ...` in `index.html`). Das lässt alle Selektoren und `anlage.svg`-Snapshots 100 % unverändert.
  - **Reihenklemmen (offener Diskussionspunkt vor Umsetzung von `sim-mi0`):** Zielgröße in echten Bildschirm-Pixeln nach P1.1-Skalierung bemessen. Für die engen 12px-Reihenklemmen wird vor Umsetzung entschieden, ob die Reihenklemmen selbst breiter werden (ändert dann `anlage.svg`) oder unverändert bleiben und nur die übrigen Geräteschrauben (`36px`) und Dosen-Kontakte vergrößert werden.
  - **Deutliches Hover-Feedback** am Desktop; für Touch-Geräte und enge Klemmen gezielte Interaktionstests (Messspitze, Schraubendreher, Popup, Replay) ergänzen.

### P1.3 Lichtanschlussdosen & Wago-Klemmen besser sichtbar + schlichter Tiefeneffekt
*(unabhängig von P1.1, direkt in `view/steckdosen.js`, kein Einfluss auf `anlage.svg`)*
- **Problem:** Die Wago-Klemmstecker (`#ececec` auf weißem Grund, ohne Rahmen) sind schlecht erkennbar, die grauen Messspitzen-Kontakte kaum auffindbar, und die runde Lichtanschlussdose wirkt sehr flach.
- **Lösung:**
  - **Schlichter Tiefeneffekt** für die runde Lichtanschlussdose (dezente Innen-Vertiefung / zarter Schatten am Innenrand der Dose, unverspielt).
  - **Deutliche Kontur** und etwas kräftigeres Grau für die Wago-Gehäuse statt fast unsichtbarem `#ececec`.
  - **Messspitzen-Stellen** klar vom Klemmenkörper und vom farbigen Ader-Kennzeichnungspunkt absetzen (z. B. deutlicher umrandeter/metallischer Messpunkt).
  - Analog für die Wago-Klemmen der 5-poligen Herdanschlussdose.

### P1.4 Messspitzen deutlich auffälliger machen
- **Problem:** Die angelegten Messspitzen (`r=7` Kreise in `controller/app.js:283-288`) gehen im Schaltkasten und an den Dosen schnell unter (z. B. Schwarz auf dunklem Hauptschalter, Blau auf blauer N-Klemme, Grün auf grüner PE-Klemme).
- **Lösung (rücksichtsvoll bei 12px-Reihenklemmen):**
  - Kein pauschales Aufblähen auf `r=9–10` (20 px Durchmesser würde benachbarte 12px-Reihenklemmen optisch überdecken).
  - Stattdessen hochkontrastreiche Gestaltung gekoppelt an P1.1 und Klemmenabstand:
    - kräftige Füllfarbe + **doppelter Kontrastring** (weißer Innenring + dunkler Außenrand), sodass jede Farbe auf *jedem* Untergrund sofort heraussticht,
    - an engen Reihenklemmen kompakt in der Breite (`≤ 12 px`) oder mit schlichtem, **vertikal** (nach oben/unten, wo Platz ist) ausweichendem Prüfspitzen-Marker, sodass Nachbarschrauben immer sichtbar bleiben.

### P1.5 Tastatur-Navigation im Protokoll (Tab + Pfeiltasten)
*(unabhängig von P1.1, in `view/protokoll.js`)*
- **Problem:** Im Prüfprotokoll fehlt eine flüssige Navigation per **Tab** und **Pfeiltasten**.
- **Lösung:**
  1. **Pfeiltasten-Navigation in allen Tabellen** (Besichtigen, Erproben, Potentialausgleich, Messgeräte, Stromkreisverteiler-Messtabelle, Mängel/Beurteilung):
     - `↑` / `↓` springt in die gleiche Spalte der vorherigen/nächsten Zeile (in mehrzeiligen `<textarea>`s nur am Textanfang/-ende bzw. ohne normalen Zeilenwechsel zu stören).
     - `←` / `→` springt zur vorherigen/nächsten Zelle (in Textfeldern nur, wenn der Cursor ohne Textmarkierung am Anfang bzw. Ende steht; in Checkbox-Zellen direkt).
     - `Enter` springt in der Tabelle eine Zeile nach unten (wie in Excel).
  2. **Checkboxen per Tastatur bedienbar machen:**
     - `.pf-cb` mit `tabindex="0"`, `role="checkbox"`, `aria-checked` und Tastatur-Toggle (`Leertaste`/`Enter`) ausstatten; gesamte `.pf-cboption` (Kästchen + Text) klickbar machen.
     - Bestehende `.pf-cb`-Selektoren und das `☐`/`☒`-Textformat bleiben erhalten (`controller/protokoll_check.js:175-180`, `controller/fahrplan_ausfuehrung.js:300-307`).
  3. **Klarer Fokus-Rahmen** auf dem aktiven Feld/Kästchen.

### P1.6 Ampeln am Messgerät deutlich sichtbarer machen
*(unabhängig von P1.1, in `view/messgeraet.js:344-351`)*
- **Problem:** Die Leuchtstreifen links (rot) und rechts (grün) im Display-Rahmen sind nur `6px` breit (skaliert noch schmaler) und blass – insbesondere **Grün** ist kaum sichtbar.
- **Lösung:**
  - Leuchtstreifen breiter und mit **satten, kontrastreichen Signalfarben** (kräftiges Signalgrün und klares Rot) gegen den dunklen Display-Rahmen, sodass der Status der **Messgerät-Ampel** auch auf dem Handy sofort erkennbar ist *(Hinweis: Die Ampel zeigt den Geräte-Vergleich wie am echten IT 130, nicht zwingend das finale Prüfergebnis – z. B. bei der 2/3-Regel nach `docs/BEDIENERPROZESS.md:170`)*.

---

## Priorität 2 – Quick Wins & schlichte Politur

### P2.1 Klares Feedback im Schraubendreher-Modus
- **Ist-Zustand:** Beim Aufnehmen verschwindet der Schraubendreher spurlos (`controller/app.js:1885`).
- **Lösung:**
  - Schlichte, **gestrichelte Ablage-Silhouette** an der Ruheposition („Klick zum Ablegen“),
  - **`Esc`-Taste** legt den Schraubendreher jederzeit wieder ab,
  - **Schraubendreher-Cursor** über dem Schaltkasten (Desktop) bzw. schlichter Modus-Rahmen auf Touch-Geräten.

### P2.2 Info-Popups schöner & lesbarer (`view/popup.js`)
- **Ist-Zustand:** Roher Text wie `2.5 mm² · schwarz | 1.5 mm² · schwarz` in einer schwarzen Box; kann am Bildschirmrand abgeschnitten werden.
- **Lösung:**
  - Kleiner **Ader-Farbpunkt** (inkl. grün-gelb gestreift) neben Querschnitt und Farbname,
  - mehrere Adern an derselben Klemme sauber untereinander *(kompatibel zu `tests/visuell/test_steckdosen.js:268,366`, die auf Teiltexte prüfen)*,
  - automatische **Rand-Korrektur** (Viewport-Clamping), damit das Popup auf dem Handy nie abgeschnitten wird.

### P2.3 Schlichte visuelle Politur (nach View aufteilbar)
Bewusst **schlicht, klar und funktional** – kein Spielkram:
- **Allgemeine Bühne (`index.html`):** Ruhiger Hintergrund, saubere System-Typografie, sehr dezente Rahmen/Schatten für klare Trennung der Bereiche.
- **Steckdosen (`view/steckdosen.js`):** Dezenter Hintergrund im Dosen-Panel, damit weiße Schuko-Dosen sich sauber abheben; matteres, augenfreundlicheres CEE-Rot statt grellem `#ff0000` *(Lichtanschlussdose/Wago bereits in P1.3)*.
- **Messgerät (`view/messgeraet.js`):** Minimale Tasten-Haptik (`:hover` / `:active`), klarerer Display-Kontrast *(Ampeln bereits in P1.6)*.
- **Handy (`view/handy.js`):** Schlichte kleine Labels unter den Icons (*Timer*, *Replay*, *Check*), bessere Lesbarkeit im Replay-Screen (Tooltip oder klarere Kurztexte). *Technischer Hinweis:* Vor dem Hinzufügen neuer Icons zunächst `data`-Attribute je Icon einführen, da `tests/visuell/test_handy_timer.js:132,175,274` das Replay-Icon aktuell über `.last()` wählt.
- **Prüfprotokoll (`view/protokoll.js`):** Schlichtes DIN-Blatt-Design mit klarerer Linien-Hierarchie (Hauptabschnitte deutlicher, zarte Tabellenlinien, sehr dezente Zebra-Zeilen).

### P2.4 Optional / am Schluss: Schlichte Schaltkasten-Optik (`view/schaltkasten.js`)
- **Hinweis:** Ändert `anlage.svg`-Snapshots → bewusst als eigener Schritt am Ende.
- **Vorschlag (sehr schlicht):** Angedeutete Kante an der Hutschiene, klarere Modultrennung, schlichte Schraubendetails und optional dezenter `I`/`0`- bzw. Rot/Grün-Schaltstellungs-Indikator innerhalb der **statischen** Schalter-Box.

---

## Priorität 3 – Größere eigene Vorhaben (Architektur & Erweiterung)

### P3.1 Schaltkreis-Legende über klappbaren Schaltschrank-Deckel
- **Anforderung:** Beschreibt die Schaltgeräte (z. B. `F2-1 LS`, `F3-1 RCD`, Stromkreis-Zuordnung) – darf in einer Prüfung bewusst **fehlen, unvollständig oder falsch** sein.
- **Beschlossenes Interaktionskonzept:**
  - Ein schlichtes **Schaltfeld** am Schaltkasten **klappt den Deckel/die Tür des Schaltschranks zu** (exakt gleiche Fläche wie der Schaltkasten → 0 extra Platzbedarf, 100 % handyfähig).
  - Auf dem geschlossenen Deckel erscheint die **Legende** (und ggf. Anlagen-/UV-Bezeichnung) – oder ein leerer Deckel, wenn keine Legende vorhanden ist.
  - Ein **Klick auf den geschlossenen Deckel** klappt den Schaltschrank wieder auf; Schalterstellungen, gelöste Schrauben und Messspitzen im Inneren bleiben unverändert erhalten (kein Neu-Rendern des Schaltkastens).
- **Technische Randbedingungen (aus `sim-uqo`):**
  - Deckel ist beim Start **offen**; bei geschlossenem Deckel dürfen Klicks nicht zu Schrauben/Hebeln durchgehen; ein gestartetes Replay öffnet den Deckel automatisch sichtbar, bevor ein Schaltkasten-Schritt läuft.
  - Inhaltlich an die offenen Tickets `sim-mb5` (Kennzeichen am Gerät, optionale Legende) und `sim-23w` (Betriebsmittelkennzeichen `F2-n`, `F3-n`) anbinden.

### P3.2 Einstiegsseite (Challenge- & Anlagen-Auswahl) + Direkt-URLs
- **Anforderung:** Simulationen müssen sowohl über eine **Einstiegsseite** als auch **einzeln direkt per URL** startbar sein.
- **Konzept:**
  - **Einstiegsseite:** Schlichte, handyfähige Auswahl von **Anlage / Challenge** (und später **Messgerät**) → Start öffnet die Simulation per URL-Parametern.
  - **Direkt-URL (`?anlage=...`):** Startet direkt in die Simulation mit Default-Werten (z. B. Standard-Messgerät), optional per URL überschreibbar (`?anlage=...&messgeraet=...`).
- **Technischer Hinweis (aus `sim-uqo`):** Derzeit lädt `index.html` ohne Parameter direkt `anlagen/beispiel_eg.json`, worauf ~15 Tests (z. B. `tests/visuell/test_messgeraet.js:118`, `test_schraubendreher.js:56-65`) sowie öffentliche GitHub-Pages-Links bauen. Vor Umsetzung ausdrücklich festlegen, ob diese Tests/Links auf `?anlage=...` umgestellt werden oder die Einstiegsseite eine eigene Route bekommt.

### P3.3 Weitere Messgeräte (z. B. Benning, Fluke, Gossen, Wiha)
- **Einordnung:** Größeres, langfristiges Vorhaben – soll aber architektonisch **immer im Blick** bleiben.
- **Kern der Architekturfrage (aus `sim-uqo`):** Nicht nur die View hängt am BENNING IT 130, sondern auch `fahrplan.json` speichert derzeit gerätespezifische Schritte (`drehknopfAufModus`, `stelleEin` mit IT-130-Feldnamen/Wertelisten, `leseWert` in `controller/fahrplan_ausfuehrung.js:165-173`). Ein zweites Messgerät braucht daher neben getrennter Mess-Physik/View auch eine **geräteneutrale Schrittsprache** (oder gerätespezifische Fahrpläne).

---

## Niedrige Priorität / Geparkt / Verworfen

- **Niedrige Priorität – PDF-Drucktaste als App/Icon im Handy:** Schlichtes Drucker-/PDF-Icon im Handy-Homescreen (`window.print()`), erst nach Einführung von `data`-Attributen je Handy-Icon.
- **Niedrige Priorität / geparkt – Sticky linke Spalten in der Messtabelle:** Erst mal nicht nötig, aktuelle Messtabelle gefällt.
- **Geparkt – Fehler-Sprungnavigation nach Protokoll-Check:** Als spätere Idee vorgemerkt.
- **Verworfen – 2-Spalten-Desktop-Splitscreen:** Passt nicht zur Handyfähigkeit.
- **Verworfen – Drehknopf direkt anklickbar:** Beim echten Gerät dreht man auch zyklisch durch.
