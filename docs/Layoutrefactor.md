# Layout- & UI-Refactor – Vorschläge (Usability & Look)

Dieses Dokument sammelt konkrete Vorschläge, um den TREI Prüfungs-Simulator bei **Usability (Arbeitsfluss)** und **Look & Feel (Optik & Haptik)** aufzuwerten. Unter jedem Vorschlag ist Platz für Kommentare, Entscheidungen (z. B. *Ja / Später / Nein*) und Anpassungswünsche.

---

## Leitplanken (aus `docs/KONZEPT.md`, `docs/ARCHITEKTUR.md` & `AGENTS.md`)

- **Didaktik bewahren:** Im Schaltkasten keine Legenden, Hilfslinien oder Erklärungen verraten – der Prüfling soll Bauteile, Klemmen und Zusammenhänge selbst erkennen.
- **Statische Schalter-Box:** Die weiße Box bei RCD, LS und Leistungsschalter (`zeichneSchalter()` in `view/schaltkasten.js`) bewegt sich nie; nur ihr Inhalt ändert sich beim Umschalten.
- **Test-Stabilität:**
  - `tests/visuell/run_tests.js` vergleicht das gerenderte Schaltkasten-SVG exakt gegen `anlage.svg`. Änderungen am Schaltkasten-SVG selbst erfordern ein bewusstes Neu-Promoten der Snapshots.
  - Interaktionstests (`test_messgeraet.js`, `test_schraubendreher.js`, `test_handy_timer.js`, `test_protokoll.js`, `test_protokoll_check.js`, `test_fahrplan_ausfuehrung.js` usw.) nutzen konkrete DOM-/Text-Selektoren. Bestehende Selektoren und Datenattribute (`data-netz`, `data-bauteil`, `data-schalter`, `data-prueftaste`, `data-endstelle`, `.pf-cb`, `.pf-fehler` etc.) bleiben erhalten.
- **Druck-/PDF-Export:** `@media print` in `view/protokoll.js` druckt weiterhin sauber und ausschließlich das Prüfprotokoll.

> **Kommentar zu den Leitplanken:**
> 

---

## Grundsatzfragen vorab

### 0.1 Zielgeräte & Priorität (Desktop vs. Tablet/Handy)
Soll das neue Layout primär für **Desktop/Laptop (Querformat)** optimiert werden (mit sauberem einspaltigen Fallback für schmale Bildschirme), oder steht die Nutzung auf dem **Smartphone** (PWA) gleichberechtigt im Vordergrund?

> **Kommentar:** Ich will unbedingt, dass das Programm Handyfähig ist. Deswegen ist ein schmales layout nicht schlecht.
> 

### 0.2 Visuelle Stilrichtung
Welche Grundstimmung passt dir besser?
- **Variante A – Modern-technisch (clean):** Klare Werkbank-/Labor-Optik, dezente Schatten, leichte Verläufe, sehr gute Lesbarkeit, wenig Schnörkel.
- **Variante B – Realistisch / haptisch:** Stärker an echte Geräte angelehnt (Gehäuse-Plastizität, metallische Schienen/Schrauben, LCD-Glaswirkung, Papier-Textur).

> **Kommentar:** Ich habe es gerne sehr einfach. Funktion soll im Vordergrund stehen. Ich mag das spielerische nicht.
> 

---

## Paket 1 – Layout & Arbeitsplatz (Usability-Fundament)

Fokus: Weniger Scrollen, schnellerer Wechsel zwischen Messen und Protokollieren, einfacher Einstieg. Kein Eingriff in das Schaltkasten-SVG nötig.

### 1.1 Split-Screen-Werkbank (Desktop) mit angedockten Werkzeugen
- **Ist-Zustand:** In `index.html` und `controller/app.js` stehen `#steckdosen`, `#schaltkasten`, `#messgeraet-zeile` und `#protokoll` alle untereinander in einer 640px-Spalte linksbündig. Beim Messen an Steckdosen oben muss man zum Messgerät herunterscrollen (`TEST`, Wert ablesen) und noch weiter herunter zum Protokoll.
- **Vorschlag:** Auf breiteren Bildschirmen ein **2-Spalten-Layout**:
  - **Linke Spalte:** Physische Anlage (`#steckdosen` + `#schaltkasten`) scrollbar, und **unten fixiert (`position: sticky`)** die Werkzeugleiste (Handy + Messgerät + Schraubendreher), sodass Messgerät und Werkzeuge beim Messen an Dosen wie am Verteiler immer im Blick und klickbar bleiben.
  - **Rechte Spalte:** Das **Prüfprotokoll** unabhängig scrollbar neben der Anlage – wie ein Klemmbrett neben dem Verteiler.
  - Auf schmalen Bildschirmen automatischer Fallback auf einspaltiges Layout (optional mit schneller Umschaltung *Anlage / Protokoll*).
- **Auswirkung / Risiko:** Änderungen vor allem in `index.html`, CSS und der Positionierungslogik von `#messgeraet-zeile` in `controller/app.js` (aktuell `position: absolute` per JS-Berechnung → lässt sich sauber auf Flexbox umstellen).

> **Kommentar:** Denke immer an die Handyfähigkeit. Ich finde ein scrollen zur seite schlimmer als ein scrollen von oben nach unten. Das schlimmste ist, das gilt fuer handy und fuer desktop: Scrollen von oben nach unten und scrollen von links und rechts.
> 

### 1.2 Schlanke Kopfzeile (App-Leiste)
- **Ist-Zustand:** Es gibt keine Navigation. Anlagen lassen sich nur über den URL-Parameter `?anlage=...` (`controller/app.js:58`) wechseln. Drucken oder komplettes Zurücksetzen erfordert Browser-Menü bzw. Neuladen.
- **Vorschlag:** Eine dezente, schmale Top-Bar (im Druck per `@media print` ausgeblendet) mit:
  - Titel / Name der aktuell geladenen Anlage,
  - **Anlagen-Auswahl** (Dropdown für verfügbare Anlagen/Demos, setzt `?anlage=...`),
  - **Zurücksetzen**-Button (Anlage + Protokoll auf Anfang, mit Bestätigung),
  - **Protokoll drucken / PDF**-Button (`window.print()`),
  - optionalem Button zum Ein-/Ausklappen des Protokolls (für maximale Fläche bei Bedarf).
- **Auswirkung / Risiko:** Rein additiv in `index.html` + `controller/app.js`, bricht keine bestehenden Tests (bei URL-Parameter-Aufruf startet weiterhin exakt die angeforderte Anlage).

> **Kommentar:** Meinst du eine Einstiegsseite? Und der User kann sie dann anlagen auswählen. Schlecht ist die Idee nicht. Dann kann der User sich challenges aussuchen. eine pdf drucktaste kann das handy neben dem messgerät liefern.
> 

### 1.3 Fixierte linke Spalten in der Stromkreisverteiler-Messtabelle
- **Ist-Zustand:** Die Messtabelle in `view/protokoll.js` hat 19 Spalten und scrollt horizontal (`.pf-scroll`). Sobald man nach rechts zu `Zi/Zs` oder den `RCD`-Spalten scrollt, verschwinden `Nr.` und `Stromkreis / Zielbezeichnung` aus dem Sichtfeld.
- **Vorschlag:** Die ersten beiden Spalten (`Nr.` und `Stromkreis / Zielbezeichnung`) beim horizontalen Scrollen mit `position: sticky; left: 0` fixieren (mit dezentem Trennschatten rechts).
- **Auswirkung / Risiko:** Reines CSS in `view/protokoll.js`, im `@media print` deaktiviert.

> **Kommentar:** Weiss nicht so genau. muessen wir weiter diskutieren. Niedrige prio.
> 

### 1.4 Angenehmere Bedienung von Checkboxen & Eingaben im Protokoll
- **Ist-Zustand:** Ankreuzkästchen in `view/protokoll.js` sind kleine `<span class="pf-cb">☐</span>`-Elemente; ein Klick auf den Text daneben (z. B. „Wiederholungsprüfung“) kreuzt nichts an, und per Tastatur (`Tab` / `Leertaste`) sind die Kästchen nicht erreichbar.
- **Vorschlag:**
  - Gesamte `.pf-cboption` (Kästchen + Text) klickbar machen,
  - `tabindex="0"` + Tastaturbedienung (`Space`/`Enter`) für schnelles Ausfüllen,
  - klarer Hover-/Fokus-Rahmen um Kästchen und Eingabefelder.
- **Auswirkung / Risiko:** Bestehende `.pf-cb`-Klasse und `☐`/`☒`-Textinhalt bleiben unverändert, sodass `controller/protokoll_check.js` und `tests/visuell/test_protokoll*.js` weiter unverändert funktionieren.

> **Kommentar:** Was mich aktuell stört, dass ich mit Tabs oder pfeiltasten navigieren kann. das brauche ich. Der rest was du sagst, man muss genau wissen was du damit meinst. Das mit den Pfeiltasten ist für mich hoerere Prio.
> 

---

## Paket 2 – Interaktion & Mikro-UX (Fühlbare Bedienbarkeit)

Fokus: Weniger Fehlklicks, klares Feedback über Werkzeuge und Modi, schnellere Bedienung unter Zeitdruck.

### 2.1 Größere Klickflächen & Hover-Feedback an Schrauben und Kontakten
- **Ist-Zustand:** Schrauben im Schaltkasten und Kontakte in den Steckdosen haben `r=4px` (8×8 px Klickfläche). Bei 12px schmalen Reihenklemmen muss man sehr genau zielen, und außer dem Zeiger-Cursor gibt es kein visuelles Feedback, welches Ziel man gerade trifft.
- **Vorschlag:**
  - Ein dezenter **Hover-Effekt** (z. B. sanfter leuchtender Ring / minimale Vergrößerung beim Überfahren),
  - optional eine unsichtbare, etwas größere Hit-Area (z. B. `r=6px` bzw. an die Klemmenbreite angepasst, ohne Nachbarschrauben zu überlappen).
- **Auswirkung / Risiko:**
  - Reines CSS (`circle[data-netz]:hover`, `rect[data-netz]:hover`) hat **keinen** Einfluss auf `anlage.svg`-Snapshots!
  - Zusätzliche SVG-Hit-Area-Elemente im Schaltkasten würden dagegen `anlage.svg` ändern (müsste man also abwägen – CSS-Hover allein ist schon ein spürbarer Gewinn und 100 % snapshot-neutral).

> **Kommentar:** Sehr gut. Fehlklicks sind ein Problem bei mir! Insbesondere wenn ich auf Laptop mit kleinem Screen und auf Handy bin. Ist bei mir eher hohe Prio.
> 

### 2.2 Klares Feedback im Schraubendreher-Modus
- **Ist-Zustand:** Klickt man auf den Schraubendreher, verschwindet er rechts neben dem Messgerät (`schraubendreherContainer.innerHTML = ''` in `controller/app.js:1883`). Man sieht am Cursor nicht klar, dass das Werkzeug aktiv ist, und es gibt keinen offensichtlichen Weg, es ohne Aktion wieder abzulegen.
- **Vorschlag:**
  - An der Ruheposition eine dezente **gestrichelte Ablage-Silhouette** anzeigen („Klick zum Ablegen“),
  - **`Esc`-Taste** legt den Schraubendreher jederzeit wieder ab,
  - während der Schraubendreher aktiv ist: angepasster **Schraubendreher-Cursor** über dem Schaltkasten (z. B. SVG-Data-URI-Cursor) und dezente Hervorhebung lösbarer Schrauben beim Hover,
  - dezenter Hinweis, wenn das Limit von 2 gelösten Schrauben erreicht ist (statt stummem Ablegen).
- **Auswirkung / Risiko:** Prüfen gegen `tests/visuell/test_schraubendreher.js` (dort ggf. auf leerem Container nach Aufnehmen geprüft – Silhouette als CSS-Hintergrund oder Kind-Element klären, damit Tests nicht brechen).

> **Kommentar:** Nicht schlecht die Idee, so sehe ich, dass der aufgenommen habe. Gefällt mir.,
> 

### 2.3 Messspitzen-Status & schnelleres Abnehmen
- **Ist-Zustand:** Messspitzen werden durch Mehrfachklicks im Zyklus *leer → schwarz → blau → grün → leer* gesetzt. Man sieht nicht auf einen Blick, welche Farben gerade frei oder wo sie angelegt sind (besonders wenn eine Spitze oben an einer Steckdose und eine unten im Verteiler hängt).
- **Vorschlag:**
  - Kleine **Status-Anzeige für die 3 Messspitzen** (schwarz / blau / grün) direkt am Messgerät oder in der Werkzeugleiste: zeigt an, welche Spitzen aktiv sind (und ein Klick darauf springt ggf. dorthin oder zieht alle Spitzen ab).
  - **Rechtsklick** auf eine Schraube mit Messspitze zieht diese Spitze direkt ab (ohne erst durch die übrigen Farben klicken zu müssen).
  - Optional: Dezenter Tooltip/Farbpunkt am Cursor beim Hover im Messmodus, welche Farbe beim nächsten Klick gesetzt würde.
- **Auswirkung / Risiko:** Linksklick-Zyklus bleibt 100 % unverändert (alle Tests bleiben grün).

> **Kommentar:** Mich hat das nicht gestört. Was ich viel störender finde ist: Ich finde die Messpitzen nicht. Ich finde sie sollten auffälliger sein. Für mich ist das hohe Prio.
> 

### 2.4 Drehknopf am Messgerät direkt wählbar machen
- **Ist-Zustand:** Ein Klick auf den Drehknopf in `view/messgeraet.js` schaltet immer nur eine Stufe weiter (`RLOW → RISO → ZI → ZS → FI/RCD → V~`). Um eine Stufe zurückzugehen, braucht man 5 Klicks.
- **Vorschlag:**
  - Die **Funktions-Beschriftungen** rund um den Drehknopf (`R LOW`, `R ISO`, `ZI`, `ZS`, `FI/RCD`, `V~`) direkt klickbar machen, sodass der Drehknopf sofort dorthin springt.
  - Klick direkt auf den Drehknopf behält das bisherige zyklische Weiterschalten (Rückwärts per Rechtsklick oder Mausrad).
- **Auswirkung / Risiko:** Alle bestehenden Tests, die auf den Drehknopf klicken, funktionieren unverändert weiter.

> **Kommentar:** Stört mich nicht. Weil: es ist beim echten Messgerät auch so. Was ich viel interessanter finde, ein ganz neues Messgerät einzubauen. Wählbar, z.B. in der Einstiegsseite. 
> 

### 2.5 Komfort beim Protokoll-Check (Navigation zu Fehlern)
- **Ist-Zustand:** Die Check-App im Handy zeigt „66 Felder rot“ an (`view/handy.js:627`) und markiert die betroffenen Felder im Protokoll rot (`.pf-fehler`). Der Nutzer muss das lange Formular selbst absuchen.
- **Vorschlag:**
  - Klick auf die rote Zahl im Handy (oder ein kleiner **„Nächstes rotes Feld“-Button** / schwebende Mini-Leiste am Protokoll nach dem Check) scrollt sanft zum nächsten markierten Feld (`scrollIntoView`).
  - Optional: Sobald ein rot markiertes Feld bearbeitet wird, schwächt sich die rote Markierung ab (oder wechselt auf „geändert – neu prüfen“), damit man sieht, welche Fehler man schon nachgearbeitet hat.
- **Auswirkung / Risiko:** Rein additiv; `.pf-fehler`-Verhalten beim Check selbst bleibt unverändert.

> **Kommentar:**
> 

### 2.6 Kurze Info-Popups lesbarer & moderner gestalten
- **Ist-Zustand:** Das Ader-Popup (`view/popup.js`, `index.html:26-37`) zeigt z. B. `2.5 mm² · schwarz | 1.5 mm² · schwarz` als rohen Text in einer schwarzen Box. Bei sehr weit oben/links gelegenen Schrauben kann es am Bildschirmrand abgeschnitten werden.
- **Vorschlag:**
  - Farbige **Ader-Farbpunkte** (z. B. blau für blau, grün-gelb gestreift für grün-gelb, braun/schwarz/grau) neben dem Text für schnelles visuelles Erfassen,
  - Mehrere Adern an derselben Klemme sauber untereinander statt mit `|` getrennt,
  - Rand-Erkennung (Viewport-Clamping), damit das Popup nie aus dem Fenster ragt.
- **Auswirkung / Risiko:** Prüfen, ob Tests `textContent` vom Popup auf `|` prüfen – falls ja, Format kompatibel halten.

> **Kommentar:**
> 

---

## Paket 3 – Visuelle Veredelung (Look & Feel)

Fokus: Hochwertiges, stimmiges Erscheinungsbild, das Spaß beim Üben macht und wie ein echtes Arbeitsumfeld wirkt.

### 3.1 Werkbank-Hintergrund, Typografie & Tiefenwirkung
- **Ist-Zustand:** Einfarbiger grauer Hintergrund (`#f5f5f5`), Standard-`sans-serif`, keine Schatten, harte Kanten.
- **Vorschlag:**
  - Ruhiger, moderner Hintergrund (z. B. warmes Neutralgrau/Schieferton mit sehr dezenter Tiefenwirkung),
  - sauberer moderner System-Font-Stack für UI-Elemente,
  - weiche, abgestufte **Schlagschatten** unter Schaltkasten, Steckdosen-Panel, Messgerät, Handy, Schraubendreher und Prüfprotokoll.
- **Auswirkung / Risiko:** Reines CSS, null Risiko für Tests.

> **Kommentar:**
> 

### 3.2 Messgerät-Upgrade (`view/messgeraet.js`)
- **Ist-Zustand:** Flache rote Rechtecke (`#cc0000`/`#dd1111`), flache schwarze Tasten ohne Klick-Feedback, graues `#dddddd`-Display ohne Tiefe, harte Sprünge beim Drehknopf.
- **Vorschlag:**
  - Dezente **Gehäuse-Plastizität** (SVG-Gradient + feine Gummischutz-Rahmenkante wie beim echten BENNING IT 130),
  - **Monochrom-LCD-Look:** Leicht grünlich-grauer LCD-Hintergrund mit feinem Innen-Schatten (vertieftes Display), klarer Monospace-Schrift und subtiler LCD-Reflexion,
  - **Leuchtende Ampel-LEDs:** Sanfter Glow-Filter (`feDropShadow` / Verlauf) für den roten bzw. grünen Leuchtstreifen, wenn aktiv,
  - **Tasten mit Haptik:** Leichter 3D-Bevel + spürbares **Drück-Feedback** (`:hover` Aufhellung, `:active` leicht nach unten versetzt),
  - **Drehknopf:** Metallischer/gummierter Look mit griffigem Zeiger und weicher Dreh-Transition.
- **Auswirkung / Risiko:** Alle Texte in `#messgeraet svg text` bleiben identisch – `test_messgeraet.js` prüft ausschließlich diese Texte und bleibt grün.

> **Kommentar:**
> 

### 3.3 Steckdosen- & Anschlussdosen-Panel (`view/steckdosen.js`)
- **Ist-Zustand:** Schuko-Steckdosen und Anschlussdosen bestehen überwiegend aus dünnen schwarzen Umrissen auf rein weißem Grund; die Drehstromsteckdose nutzt sehr grelles `#ff0000` / `#ff5555`.
- **Vorschlag:**
  - Dezente Wand-/Montageplatten-Optik im Panel-Hintergrund (sehr helles Warmgrau), damit sich weiße Steckdosenrahmen sauber mit leichtem Schatten abheben,
  - Schuko-Steckdosen: weiße Abdeckfläche mit sanfter Vertiefung im Stecktopf und metallisch grauen Schutzkontaktbügeln,
  - Drehstromsteckdose (CEE): realistischeres, matteres Sicherheitsrot (z. B. `#d62828` / `#e04848`) mit leichter Tiefenwirkung statt reinem `#ff0000`,
  - Wago-Klemmen: feine Umrisslinien und plastischere orange Hebel/Kappen.
- **Auswirkung / Risiko:** Keine Änderung an `data-netz`/`data-endstelle` oder Klickpunkten; `test_steckdosen.js` bleibt kompatibel.

> **Kommentar:**
> 

### 3.4 Handy-Widget aufwerten (`view/handy.js`)
- **Ist-Zustand:** Sehr schlichter grauer Kasten mit 3 Icons ohne Beschriftung; im Replay-Screen winziger, bei 20 Zeichen hart abgeschnittener Text (`1/4: messspitzeSe...`); einfache graue Kreise als Schließen-Button.
- **Vorschlag:**
  - Moderneres Smartphone-Gehäuse (dezenter Rahmen-Glanz, feinere Kamera/Hörmuschel, leichte Statusleiste mit Uhrzeit/Akku-Optik),
  - **Kleine App-Labels** unter den Homescreen-Icons (*Timer*, *Replay*, *Check*), damit neue Nutzer sofort wissen, wofür die Icons stehen,
  - **Hover- & Druck-Feedback** auf allen App-Icons und Buttons,
  - **Lesbarere Replay-Anzeige:** Menschengerechte Kurzbezeichnungen statt roher Funktionsnamen (z. B. „Messspitze setzen“ statt `messspitzeSetzen`) oder voller Text als Tooltip beim Hover, plus dezenter Fortschrittsbalken,
  - **Timer-App:** Sanfter Glow am Countdown-Ring, Warnfarbe (Orange/Rot) in den letzten 5 Minuten.
- **Auswirkung / Risiko:** DOM-Reihenfolge der Homescreen-Icons beachten (Kommentar in `view/handy.js:167`: Tests greifen das Replay-Icon per `.last()`), und Text-Assertions in `test_handy_timer.js` prüfen.

> **Kommentar:**
> 

### 3.5 Prüfprotokoll im DIN-Papier-Look (`view/protokoll.js`)
- **Ist-Zustand:** Harte schwarze `2px`-Außenrahmen, gleichförmige `#999`-Tabellenlinien, eng gedrängte Felder ohne visuelle Hierarchie.
- **Vorschlag:**
  - **Papierblatt-Optik** mit weichem Schatten und großzügigerem Innenabstand,
  - feinere **Linien- & Farb-Hierarchie** (dezente dunkelgraue Überschriftenbalken, zarte Rasterlinien, leichte Zebra-Färbung in den Prüfpunkt- und Messtabellen),
  - klarere, angenehmere Fokus- und Fehler-Markierungen (`.pf-fehler` deutlich sichtbar, aber mit abgerundetem Fokus/Shadow statt hartem Pixel-Versatz),
  - kleine visuelle Kennzeichnung der Gruppen in der 19-spaltigen Messtabelle (dezente Hintergrund-Abstufungen für *Leitung*, *Riso*, *Überstromschutz*, *RCD*), damit man sich in der breiten Tabelle sofort orientiert.
  - `@media print` bleibt sauber schwarz-weiß/druckoptimiert.
- **Auswirkung / Risiko:** Reines CSS/HTML-Feintuning in `view/protokoll.js`, keine Logik-Änderung.

> **Kommentar:**
> 

### 3.6 Optional: Schaltkasten-Optik (`view/schaltkasten.js`) – *ändert `anlage.svg`-Snapshots*
- **Ist-Zustand:** Sehr flache Grautöne (`#e0e0e0`, `#aaaaaa`, `#888888`) ohne Tiefe; Hutschienen sind einfarbige Balken; Schrauben sind schlichte graue Kreise; Schalterstellung *AN/AUS* ist nur an der Position des grauen Hebels erkennbar.
- **Vorschlag:**
  - **Hutschiene:** Angedeutetes DIN-Profil (dünne helle/dunkle Kanten oben und unten) statt einfarbigem Balken,
  - **Gehäuse & Geräte:** Leichte Tiefe am Verteilerkasten, feinere Abgrenzung zwischen Modulen, minimal plastischerer Header-Streifen,
  - **Schrauben:** Metallische Optik mit kleinem Schlitz/Kreuzschlitz (gelöste Schrauben klar als offene/herausgedrehte Klemme erkennbar),
  - **Schalter-Hebel (Box bleibt strikt statisch!):** Plastischere Riffelung und optional ein kleiner klassischer **Schaltstellungs-Indikator** (rot = EIN / grün = AUS oder `I`/`0` wie bei echten LS/RCDs), damit man auf einen Blick sieht, welche Automaten ausgelöst haben – ohne den Lerneffekt zu verraten.
- **Auswirkung / Risiko:** Verändert das generierte Schaltkasten-SVG → alle `tests/visuell/testcase_NN/anlage.svg`-Referenzen müssen nach Abnahme bewusst neu erzeugt und geprüft werden. Deshalb am besten als eigener, klar getrennter Schritt ganz zum Schluss.

> **Kommentar:**
> 

---

## Allgemeine Anmerkungen / Weitere Ideen

> **Kommentar:**
> 
