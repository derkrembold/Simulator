# Layout- & UI-Refactor – Abgestimmte Roadmap (Stand nach Review 2)

Abgestimmte Arbeitsgrundlage für die schrittweise Verbesserung von Usability und Look & Feel im TREI Prüfungs-Simulator.

---

## Festgelegte Prinzipien & Leitplanken

- **Handyfähig & schmal:** Die App muss auf dem Smartphone gut bedienbar sein. Ein schmales, einspaltiges Layout bleibt der Standard. **Kein** gleichzeitiges Hoch-/Runter- und Links-/Rechts-Scrollen.
- **Schlicht & funktionell:** Funktion und schnelle Erfassbarkeit stehen klar im Vordergrund – kein verspielter Deko-Schnörkel.
- **Realitätsnah bleiben:** Bedienung orientiert sich an echten Geräten (z. B. Drehknopf bleibt zyklisch).
- **Didaktik bewahren:** Keine ungefragten Hilfen im Schaltkasten (die geplante Legende bildet die echte Prüfungssituation ab und darf fehlen, unvollständig oder falsch sein).
- **Erweiterbarkeit im Blick behalten:** Bei Änderungen an der Messgerät-Anbindung im Hinterkopf behalten, dass später weitere Messgeräte (z. B. Fluke, Gossen, Wiha) auswählbar sein sollen.
- **Technische Leitplanken:**
  - Die weiße Schalter-Box (`zeichneSchalter()` in `view/schaltkasten.js`) bewegt sich nie.
  - Bestehende DOM-Selektoren/Attribute, Direkt-URLs (`?anlage=...`) und `@media print` für den PDF-Druck bleiben stabil.
  - Änderungen am Schaltkasten-SVG selbst (`anlage.svg`-Snapshots in `tests/visuell/run_tests.js`) werden bewusst separat und erst nach Abnahme umgesetzt.

---

## Priorität 1 – Hohe Priorität (akute Schmerzpunkte)

### P1.1 Fehlklicks an Schrauben & Kontakten reduzieren
- **Problem:** Schrauben und Dosen-Kontakte haben nur `r=4px` (8×8 px Klickfläche). Auf kleinem Laptop-Screen und per Finger auf dem Handy kommt es regelmäßig zu Fehlklicks.
- **Lösung:**
  - **Größere unsichtbare Klick-/Touch-Fläche** pro Schraube/Kontakt (so groß wie möglich, ohne Nachbarklemmen zu überlappen – bei 12px-Reihenklemmen volle Breite × vergrößerte Höhe, bei Steckdosen/Geräten z. B. `r=9–11px`).
  - **Deutliches Hover-/Touch-Feedback:** Beim Überfahren (Laptop) zeigt ein schlichter, gut sichtbarer Ring sofort an, welche Schraube/welcher Kontakt getroffen wird.
  - *Technischer Ansatz:* Für Steckdosen-Kontakte direkt in `view/steckdosen.js`; für den Schaltkasten möglichst per CSS-Hover + Hit-Area-Overlay über den Controller (wie Messspitzen), damit `anlage.svg`-Snapshots unberührt bleiben.

### P1.2 Lichtanschlussdosen (Wago-Klemmen) besser sichtbar machen
- **Problem:** In `view/steckdosen.js` sind die Wago-Klemmstecker (`#ececec` auf weißem Grund, ohne Rahmen) schlecht erkennbar, und die grauen Messspitzen-Punkte sind schwer auffindbar.
- **Lösung:**
  - Deutlicher Rahmen um jedes Wago-Gehäuse (mittelgraue Kontur + etwas kräftigeres Klemmen-Grau statt fast unsichtbarem `#ececec`).
  - Die **Messspitzen-Stellen** (graue Kontakte) klarer vom Klemmenkörper absetzen (z. B. deutlicher umrandeter/metallischer Messpunkt), sodass sofort klar ist, wo die Messspitze angelegt wird (klar unterscheidbar vom farbigen Ader-Kennzeichnungspunkt daneben).
  - Analog für die 5-polige Herdanschlussdose.

### P1.3 Messspitzen deutlich auffälliger machen
- **Problem:** Die angelegten Messspitzen (`r=7px` Kreise in `controller/app.js:283`) gehen im Schaltkasten und an den Dosen schnell unter (z. B. Schwarz auf dunklem Hauptschalter, Blau auf blauer N-Klemme, Grün auf grüner PE-Klemme).
- **Lösung (vorgeschlagener Favorit: Option A – schlicht & kontraststark):**
  - Etwas größerer Marker (`r=9–10px`) mit kräftiger Füllfarbe und **doppeltem Kontrastring** (dicker weißer Innenring + dünner dunkler Außenrand; bei Schwarz optional sehr kontrastreicher heller Ring), damit jede Messspitze auf *jedem* Hintergrund (schwarz, grau, blau, grün, rot) sofort ins Auge springt.

### P1.4 Tastatur-Navigation im Protokoll (Tab + Pfeiltasten)
- **Problem:** Im Prüfprotokoll (`view/protokoll.js`) fehlt eine flüssige Navigation per **Tab** und **Pfeiltasten**.
- **Lösung:**
  1. **Pfeiltasten-Navigation in allen Tabellen** (Besichtigen, Erproben, Potentialausgleich, Messgeräte, Stromkreisverteiler-Messtabelle, Mängel/Beurteilung):
     - `↑` / `↓` springt in die gleiche Spalte der vorherigen/nächsten Zeile.
     - `←` / `→` springt zur vorherigen/nächsten Zelle (in Textfeldern am Textanfang/-ende, in Checkbox-Zellen direkt).
     - `Enter` springt in der Tabelle eine Zeile nach unten (wie in Excel).
  2. **Checkboxen per Tastatur bedienbar machen:**
     - `tabindex="0"` auf den `.pf-cb`-Elementen → erreichbar per `Tab` und Pfeiltasten, an-/abkreuzbar per `Leertaste` oder `Enter`.
     - Gesamte `.pf-cboption` (Kästchen + Text daneben) klickbar machen.
  3. **Klarer Fokus-Rahmen:** Schlichter, gut sichtbarer Fokus-Rahmen auf dem aktiven Feld/Kästchen.

### P1.5 Ampeln am Messgerät deutlich sichtbarer machen
- **Problem:** Die Leuchtstreifen links (rot) und rechts (grün) im Display-Rahmen (`view/messgeraet.js:344-351`) sind nur `6px` breit (skaliert effektiv ~4px) und blass – insbesondere **Grün** ist kaum sichtbar.
- **Lösung:**
  - Leuchtstreifen etwas breiter und mit **satten, kontrastreichen Signalfarben** (kräftiges Signalgrün und klares Rot) gegen den dunklen Display-Rahmen, sodass *Bestanden / Durchgefallen* auch auf dem Handy auf einen Blick erkennbar ist.

---

## Priorität 2 – Quick Wins & schlichte Politur

### P2.1 Klares Feedback im Schraubendreher-Modus
- **Ist-Zustand:** Beim Aufnehmen verschwindet der Schraubendreher spurlos (`controller/app.js:1883`).
- **Lösung:**
  - Schlichte, **gestrichelte Ablage-Silhouette** an der Ruheposition („Klick zum Ablegen“),
  - **`Esc`-Taste** legt den Schraubendreher jederzeit wieder ab,
  - **Schraubendreher-Cursor** über dem Schaltkasten (Desktop) bzw. schlichter Modus-Rahmen auf Touch-Geräten.

### P2.2 Info-Popups schöner & lesbarer (`view/popup.js`)
- **Ist-Zustand:** Roher Text wie `2.5 mm² · schwarz | 1.5 mm² · schwarz` in einer schwarzen Box; kann am Bildschirmrand abgeschnitten werden.
- **Lösung:**
  - Kleiner **Ader-Farbpunkt** (inkl. grün-gelb gestreift) neben Querschnitt und Farbname,
  - bei mehreren Adern an derselben Klemme sauber untereinander dargestellt,
  - automatische **Rand-Korrektur** (Viewport-Clamping), damit das Popup auch auf schmalen Handy-Screens nie abgeschnitten wird.

### P2.3 Responsives, schmales Layout (handyfähig, kein Quer-Scrollen)
- **Ist-Zustand:** `index.html` nutzt feste 640px-Breiten linksbündig → auf Smartphones entsteht horizontales Scrollen.
- **Lösung:**
  - Zentrale schmale Spalte (auf Desktop mittig, auf Handy `width: 100%` ohne seitlichen Überlauf),
  - **SVGs (`#steckdosen`, `#schaltkasten`, `#messgeraet-zeile`) skalieren sauber per `viewBox` / `max-width: 100%`** auf schmale Handy-Breiten herunter,
  - `#messgeraet-zeile` (Handy + Messgerät + Schraubendreher) sauber per CSS-Flexbox ausrichten statt fragilem `position: absolute` in JS.

### P2.4 Schlichte visuelle Politur (mit wenig Aufwand viel Wirkung)
Bewusst **schlicht, klar und funktional** – kein Spielkram:
- **Allgemeine Bühne (`index.html`):** Ruhiger Hintergrund, saubere System-Typografie, sehr dezente Rahmen/Schatten für klare Trennung der Bereiche.
- **Steckdosen & Lichtanschlussdosen (`view/steckdosen.js`):**
  - Dezenter Hintergrund im Dosen-Panel, damit weiße Schuko-Dosen sich sauber abheben; matteres, augenfreundlicheres CEE-Rot statt grellem `#ff0000`.
  - **Lichtanschlussdose mit schlichtem Tiefeneffekt:** Dezente Innen-Vertiefung (sanfter Schatten am Innenrand der runden Dose), sodass die Dose plastischer wirkt und die kontrastreichen Wago-Klemmen aus P1.2 sauber darin liegen.
- **Messgerät (`view/messgeraet.js`):** Minimale Tasten-Haptik (`:hover` / `:active`), klarerer Display-Kontrast und kräftige Ampeln (P1.5).
- **Handy (`view/handy.js`):** Schlichte kleine Labels unter den Icons (*Timer*, *Replay*, *Check*), bessere Lesbarkeit im Replay-Screen (Tooltip oder klarere Kurztexte).
- **Prüfprotokoll (`view/protokoll.js`):** Schlichtes DIN-Blatt-Design mit klarerer Linien-Hierarchie (Hauptabschnitte deutlicher, zarte Tabellenlinien, sehr dezente Zebra-Zeilen).

### P2.5 Optional / am Schluss: Schlichte Schaltkasten-Optik (`view/schaltkasten.js`)
- **Hinweis:** Ändert `anlage.svg`-Snapshots → bewusst als eigener Schritt am Ende.
- **Vorschlag (sehr schlicht):** Angedeutete Kante an der Hutschiene, klarere Modultrennung, schlichte Schraubendetails und optional dezenter `I`/`0`- bzw. Rot/Grün-Schaltstellungs-Indikator innerhalb der **statischen** Schalter-Box.

---

## Priorität 3 – Größere eigene Vorhaben (Architektur & Erweiterung)

### P3.1 Schaltkreis-Legende über klappbaren Schaltschrank-Deckel
- **Anforderung:** Beschreibt die Schaltgeräte (z. B. `F2.1 LS`, `F3.1 RCD`, Stromkreis-Zuordnung) – darf in einer Prüfung bewusst **fehlen, unvollständig oder falsch** sein.
- **Beschlossenes Interaktionskonzept:**
  - Ein schlichtes **Schaltfeld** am Schaltkasten **klappt den Deckel/die Tür des Schaltschranks zu** (exakt gleiche Fläche wie der Schaltkasten → 0 extra Platzbedarf, 100 % handyfähig).
  - Auf dem geschlossenen Deckel erscheint die **Legende** (und ggf. Anlagen-/UV-Bezeichnung) – oder ein leerer Deckel, wenn keine Legende vorhanden ist.
  - Ein **Klick auf den geschlossenen Deckel** klappt den Schaltschrank wieder auf und zeigt das Innere; alle Schalterstellungen, gelösten Schrauben und angelegten Messspitzen bleiben dabei erhalten.

### P3.2 Einstiegsseite (Challenge- & Anlagen-Auswahl) + Direkt-URLs
- **Anforderung:** Simulationen müssen sowohl über eine **Einstiegsseite** als auch **einzeln direkt per URL** startbar sein.
- **Konzept:**
  - **Ohne URL-Parameter:** Schlichte, handyfähige Einstiegsseite zur Auswahl von **Anlage / Challenge** (und später **Messgerät**) → Start öffnet die Simulation mit den passenden Parametern.
  - **Mit URL-Parameter (`?anlage=...`):** Startet direkt in die Simulation (wie bisher, 100 % kompatibel zu Tests und Lesezeichen). Nicht angegebene Optionen nutzen Default-Werte (z. B. Standard-Messgerät) und können optional ebenfalls per URL-Parameter übergeben werden (z. B. `?anlage=...&messgeraet=...`).

### P3.3 Weitere Messgeräte (z. B. Benning, Fluke, Gossen, Wiha)
- **Einordnung:** Größeres, langfristiges Vorhaben – soll aber bei allen Umbauten **immer architektonisch im Blick** bleiben (saubere Trennung zwischen Mess-Physik/Logik und konkreter Messgerät-View/Bedienung, sodass spätere Geräte über die Einstiegsseite oder URL-Parameter wählbar sind).

---

## Niedrige Priorität / Geparkt / Verworfen

- **Niedrige Priorität – PDF-Drucktaste als App/Icon im Handy:** Schlichtes Drucker-/PDF-Icon im Handy-Homescreen (`window.print()`), keine hohe Prio.
- **Niedrige Priorität / geparkt – Sticky linke Spalten in der Messtabelle:** Später nochmal diskutieren.
- **Geparkt – Fehler-Sprungnavigation nach Protokoll-Check:** Als spätere Idee vorgemerkt.
- **Verworfen – 2-Spalten-Desktop-Splitscreen:** Passt nicht zur Handyfähigkeit und dem Ziel, kein kombiniertes Hoch-/Querscrollen zu haben.
- **Verworfen – Drehknopf direkt anklickbar:** Beim echten Gerät dreht man auch zyklisch durch.
