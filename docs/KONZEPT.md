# TREI Prüfungs-Simulator – Konzept

## Ziel

Eine Progressive Web App (PWA) die Teilnehmer der TREI-Prüfung Teil B dabei unterstützt,
den kompletten Prüfungsablauf einer elektrischen Anlage zu trainieren.
Ziel: Der Teilnehmer soll so oft die Prüfung trainieren, dass er sie innerhalb von **45 Minuten** besteht.

---

## Lernstufenkonzept

Der Simulator hat 5 Stufen. Mit jeder Stufe wird die Hilfestellung reduziert:

| Stufe | App                                | Schaltkasten | Protokoll  | Ziel                            | Priorität      |
| ----- | ---------------------------------- | ------------ | ---------- | ------------------------------- | -------------- |
| 0     | Vollsimulation + fiktive Messwerte | Simuliert    | In der App | Ablauf und Grenzwerte verstehen | hoch           |
| 1     | Vollständige Führung               | Echt         | In der App | Ablauf am echten Objekt üben    | niedrig        |
| 2     | Vollständige Führung               | Echt         | Papier     | Protokoll vom Gerät lösen       | niedrig-mittel |
| 3     | Nur Timer + Sprachansagen          | Echt         | Papier     | Selbstständig unter Zeitdruck   | mittel         |

---

## Technische Umsetzung

- **Progressive Web App (PWA)** – läuft im Browser, kann auf Handy installiert werden
- **Offline-fähig** – Service Worker, kein WLAN nötig (z.B. im Keller)
- **Einzelperson** – kein Server, kein Login, Fortschritt lokal gespeichert
- **Datengetrieben** – Anlage wird aus JSON-Konfigurationsdatei geladen
- **Mehrere Anlagenkonfigurationen** möglich
- **Architektur** – MVC (Model / View / Controller)

---

## Prüfungsablauf im Simulator

Der Teilnehmer sollte in dem Phasen auf die angegebenen Punkte hingewiesen werden, bzw. er soll selbstständig diese abarbeiten.
### Phase 1 – Vorbereitung
- Kabel des Messgeräts entwirren (**Fehlerquelle #1**)
- Dokumentation und Schaltpläne anfordern
- Vorherige Prüfprotokolle einsehen
- Messgerät BENNING IT 130 vorbereiten
- PSA anlegen
- Netzform bestimmen (TN-S / TN-C / TN-C-S / TT)

### Phase 2 – Besichtigen (Sichtprüfung)
- Basisschutz (Berührungsschutz)
- Brandabschottungen
- Kennzeichnung N- und PE-Leiter (Farben!) (**Fehlerquelle #12**)
- Überstromschutzeinrichtungen korrekt bemessen
- Kabelquerschnitte passend zur Absicherung
- RCD-Typ für Anwendungsbereich geeignet
- RCD-Bemessung zu nachgeschalteten LS prüfen (**Fehlerquelle #13**)
  - 2-poliger RCD → max. 2 LS
  - 4-poliger RCD → max. 6 LS
  - RCD-Nennstrom muss größer sein als jeder einzelne LS
- Schutzpotentialausgleich vorhanden und angeschlossen
- Zugänglichkeit

### Phase 3 – Erproben
- RCD-Prüftaste betätigen
- Drehfeld an Drehstromsteckdosen prüfen
- Not-Aus / Sicherheitseinrichtungen
- Schalt- und Meldeleuchten

### Phase 4 – Messen (Normreihenfolge einhalten!)

**Vor der ISO-Messung – Checkliste (automatisch aus JSON generiert):**
- Anlage ausschalten
- N an Potentialausgleichsschiene abklemmen (wenn HES vorhanden) (**Fehlerquelle #9**)
- RCD Typ B abklemmen (wenn vorhanden) (**Fehlerquelle #10**)
- AFDD abklemmen (wenn vorhanden) (**Fehlerquelle #10**)

**Messreihenfolge:**
1. $R_{PE}$ – Schutzleiterdurchgängigkeit (Duspol reicht, kein Messwert nötig) (**Fehlerquelle #8**)
2. $R_{ISO}$ – Isolationswiderstand (500 V, min. 1 MΩ ohne Verbraucher)
3. Anlage wieder anschalten
4. $Z_i$ / $Z_s$ – Schleifenimpedanz / Leitungsimpedanz
   - Hinter RCD → $Z_i$ messen, nicht $Z_s$ (Messfehler zu groß) (**Fehlerquelle #14**)
   - $Z_i$ ≠ $Z_s$ – nicht verwechseln! (**Fehlerquelle #6**)
   - Nummerierung = Anfang des Kabels, Zielbezeichnung = Ende (**Fehlerquelle #7**)
   - **$I_k$ an Hauptleitung nicht vergessen!** (**Fehlerquelle #3**)
5. RCD-Messung:
   - Berührungsspannung UB (≤ 50 V)
   - Abschaltzeit tA (≤ 300 ms Standard-RCD)
   - Auslösestrom IA
   - Typ A: Impulsspannung zuerst messen. Nur wenn > $I_{ΔN}$ dann auch AC messen (**Fehlerquelle #5**)
   - Schlechterer Wert wird eingetragen (**Fehlerquelle #4**)
6. Spannungsfall (wenn TAB fordert)
   - $Z_{REF}$ kalibrieren (Zuleitung als Referenz) (**Fehlerquelle #2**)

**Erdwiderstandsmessung nach C2-Methode (wenn HES oder PAS vorhanden):**
- Anlage spannungsfrei schalten (Hauptschalter aus!)
- Erdungsleiter von HES oder PAS abklemmen
- Messung durchführen
- Erdungsleiter wieder anklemmen
- Anlage einschalten

### Phase 5 – Protokoll
- Pflichtfelder nach VDE 0100-600 Anhang NA
- Zi/Zs korrekte Spalte eintragen (**Fehlerquelle #6**)
- Bewertung der Messergebnisse

---

## Stufe 0: Visualisierung des Unterverteilers

### Designprinzipien

- Orientiert sich am echten Hutschienenverteiler
- Minimalistisch – keine Legende, keine Maßangaben, keine Erklärungen
- Nur was der Bediener im echten Schaltkasten sieht: Farben, Formen, Angaben der Betriebsmittel, wie Bemessungsstrom, Fehlerstrom, Typ
- Der Teilnehmer muss selbst erkennen was was ist – das ist der Lerneffekt

### Maßstab (1mm = 2px)

| Maß                    | Real   | SVG                         |
| ---------------------- | ------ | --------------------------- |
| 1 Teilungseinheit (TE) | 18 mm  | 36 px                       |
| Gerätehöhe (LS/RCD)    | 90 mm  | 180 px                      |
| Reihenklemme Höhe      | 49 mm  | 98 px                       |
| Reihenklemme Breite    | 6 mm   | 12 px                       |
| PE-Klemme Breite       | 12 mm  | 24 px                       |
| N-Klemme Breite        | 12 mm  | 24 px                       |
| L-Klemme Breite        | 12 mm  | 24 px                       |
| Hutschiene Höhe        | 35 mm  | 70 px                       |
| Hutschiene Position    | mittig | 90 px vom oberen Geräterand |
| Hutschiene Länge       | 300 mm | 600 px (max. ~16 TE)        |
| Reihenabstand          | 125 mm | 250 px                      |

### TE-Breiten der Komponenten (automatisch berechnet)

| Komponente    | Poligkeit | TE  |
| ------------- | --------- | --- |
| LS            | 1-polig   | 1   |
| LS            | 2-polig   | 2   |
| LS            | 3-polig   | 3   |
| RCD           | 2-polig   | 2   |
| RCD           | 4-polig   | 4   |
| Hauptschalter | 2-polig   | 2   |
| Hauptschalter | 3-polig   | 3   |
| SLS           | 3-polig   | 3   |

### Farben der Komponenten

| Komponente      | Gehäuse          | Header             |
| --------------- | ---------------- | ------------------ |
| LS              | hellgrau #e0e0e0 | grau #aaaaaa       |
| RCD             | hellgrau #e0e0e0 | grau #aaaaaa       |
| Hauptschalter   | dunkelgrau #444  | schwarz #222       |
| Reihenklemme L  | grau #aaaaaa     | –                  |
| Reihenklemme N  | blau #4466cc     | –                  |
| Reihenklemme PE | grün #44aa44     | –                  |
| PE-Klemme       | grün #44aa44     | dunkelgrün #227722 |
| N-Klemme        | blau #4466cc     | dunkelblau #224499 |
| L-Klemme        | grau #aaaaaa     | dunkelgrau #666666 |
| Schrauben       | grau #888        | –                  |
| Hutschiene      | grau #a0a0a0     | –                  |

### Rand um Bauteile

Jedes Bauteil (Reihenklemmen, RCD, LS, Hauptschalter, L-/N-/PE-Klemme) hat einen
dünnen Rand in dunkelgrau `#555555` (1px), damit einzelne Geräte klar voneinander
abgegrenzt sind.

### Schrauben

Jede Komponente hat Schrauben oben und unten – je eine pro TE-Mittelpunkt.
Schrauben: kleiner grauer Kreis (r=4px), leicht nach innen vom Rand versetzt.
Reihenklemmen: je eine Schraube oben und unten (kleiner, r=3px).
PE/N/L-Klemme: eine Schraube oben, eine unten (mittig, r=4px).

### Beschriftung der Bauteile

Jedes Bauteil (LS, RCD, Hauptschalter) zeigt eine kurze Beschriftung mit den technischen
Angaben – nie die Typ-Kategorie als Wort (z.B. nicht "Leistungsschalter", sondern nur
der Wert wie "25A" oder "B16"):

- Horizontal und vertikal **mittig im Bauteil** zentriert (nicht nur im Header-Streifen)
- Schriftgröße 9px
- Standardfarbe **schwarz**, außer bei dunklem Gehäuse (Hauptschalter) → **weiß** für
  ausreichenden Kontrast

### Anordnung pro Hutschiene (von links nach rechts)

Eine Hutschiene = eine Zeile im Verteiler.
Reihenfolge auf einer Schiene:
* LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig
* LS 3-polig → LS 3-polig → LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig
* RCD 2-polig → LS 1-polig → LS 1-polig
* RCD 2-polig → LS 1-polig → LS 1-polig → RCD 2-polig → LS 1-polig → LS 1-polig
* RCD 4-polig → LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig → LS 1-polig
* RCD 4-polig → LS 3-polig → LS 3-polig

Mehrere RCDs (Gruppen) können auf einer Hutschiene sein.
Welche Gruppen zusammen auf einer Hutschiene liegen, wird explizit im `hutschienen`-Array
im JSON festgelegt (siehe "JSON-Konfiguration der Anlage") – die Reihenfolge der Gruppen
innerhalb einer Hutschiene bestimmt die Anordnung von links nach rechts.

**Umgekehrt gilt aber auch: Eine einzelne Gruppe (RCD + ihre LS) muss komplett auf
einer Hutschiene sitzen – sie darf nicht über zwei Hutschienen verteilt sein.**
RCD und LS sind physisch nebeneinander auf derselben Schiene montiert; ein RCD auf
Hutschiene 1 kann keine LS auf Hutschiene 2 "speisen" im Sinne dieses Datenmodells.
Der Netzplan-Generator (`generate_anlage.js`) prüft das automatisch: Er bestimmt
für jede Gruppe die Hutschiene ihres RCD und wirft einen Fehler, falls ein LS
derselben Gruppe in einer anderen Tabelle steht (siehe `tests/visuell/test_generator.js`
für den entsprechenden Test).

### Aufbau von oben nach unten

```
Reihe 1: Reihenklemmen (pro Stromkreis: L grau + N blau + PE grün-gelb)
Reihe 2: Hutschiene 1 – [RCD1] [LS1] [LS2] [RCD2] [LS3] [LS4]
Reihe x: weitere Hutschienen falls vorhanden
Letzte Reihe: Hauptschalter + L-Klemme + N-Klemme + PE-Klemme
```

L-Klemme, N-Klemme und PE-Klemme sind (wie die Reihenklemmen in Reihe 1) **vertikal
mittig zur Hutschiene** ausgerichtet – nicht an der Gerätehöhe des Hauptschalters.

### Gehäuserahmen (Kasten)

Der gesamte Unterverteiler wird von einem Kasten umschlossen, der den Eindruck eines
echten Schaltschranks vermittelt:

- **Äußerer Rahmen**: dunkler grau `#cccccc`, Rand `#888888`, 20px Abstand zu den Hutschienen
- **Innerer Rahmen**: hellgrau `#e5e5e5`, Rand `#bbbbbb`, 8px Abstand zum äußeren Rahmen
- Die 8px zwischen äußerem und innerem Rahmen bleiben dadurch als dunklerer Streifen sichtbar
  und heben die beiden Rahmen voneinander ab

Die Bildgröße richtet sich eng am Inhalt aus (kein überschüssiger Leerraum):
- **Breite** = Hutschienenlänge (300mm / 600px) + 2× 20px Rand
- **Höhe** = exakt bis zur letzten Reihe (Hauptschalter/Klemmen) + 2× 20px Rand

### Validierung Hutschienenlänge

Die App prüft automatisch pro Hutschiene (jeder Eintrag im `hutschienen`-Array), ob alle
Gruppen darauf in 300mm passen:
- Max. ~16 TE pro Hutschiene (300mm / 18mm)
- Überschreitung → Fehlermeldung bei JSON-Laden (nennt die betroffene Hutschiene)

### Wichtige Unterschiede (PAS/HES)

- **HES** (Haupterdungsschiene) → nur im Hauptverteiler, nicht im Unterverteiler
- **PAS** (Potentialausgleichsschiene) → außerhalb des Schaltkastens
- **PE-Klemme** → im Unterverteiler, letzte Reihe (grün-gelb, 12mm breit, 49mm hoch)
- **N-Klemme** → im Unterverteiler, letzte Reihe (blau, 12mm breit, 49mm hoch)
- **L-Klemme** → im Unterverteiler, letzte Reihe (grau, 12mm breit, 49mm hoch)
- **Reihenklemmen** → pro Stromkreis L+N+PE, erste Reihe

### Darstellungsmodus

- Keine Verbindungslinien
- Keine Legende, keine Maßangaben
- Nur Typ und Nennstrom sichtbar
- Datei: `anlage.svg` – dient gleichzeitig als Referenz für den automatisierten Test

---

## Messgerät (BENNING IT 130)

### Darstellung

Das Messgerät wird als eigene Komponente **unterhalb des Schaltkastens** angezeigt.
Grundlage ist das Mockup `docs/referenz/messgeraet_mockup.svg`.

**Reale Breite:** 230 mm (BENNING IT 130), im selben Maßstab wie der Schaltkasten
dargestellt (1mm = 2px, siehe "Maßstab") → 460px angezeigte Breite. Das interne
SVG-Koordinatensystem (`view/messgeraet.js`, `BREITE = 640`/`HOEHE = 280`, vom
Mockup übernommen) bleibt unverändert; die Anzeigegröße wird separat über die
`width`/`height`-Attribute auf 460px skaliert (`viewBox` bleibt `0 0 640 280`).
Die Höhe ist proportional mitskaliert (keine reale Gerätehöhe dokumentiert).

### Messmodus

Schaltet der Bediener das Messgerät über die ON/OFF-Taste **an**, wechselt die
gesamte App in den **Messmodus**: im Schaltkasten zeigen Klicks auf Schrauben
nicht mehr das Info-Popup (Querschnitt/Kabelfarbe) – stattdessen legt man
**Messspitzen** an, wie beim echten Messen. Ist das Messgerät **aus**,
funktionieren die Popups wieder normal.

**Messspitzen anlegen/entfernen:** eine Messspitze wird als farbiger Kreis
direkt an der Schraube dargestellt. Klick-Zyklus pro Schraube:

```
leer → schwarz → blau → grün → leer → ...
```

Eine Farbe wird dabei übersprungen, wenn sie gerade an einer **anderen**
Schraube hängt – jede Farbe ist zu jedem Zeitpunkt höchstens einmal vergeben,
es sind also maximal drei Messspitzen gleichzeitig angelegt (wie beim echten
Gerät: eine je L/N/PE-Prüfspitze). Ein Wechsel der Messfunktion am Drehknopf
lässt die angelegten Messspitzen unangetastet (sie bilden die physische
Verdrahtung ab, nicht den Anzeigezustand des Messgeräts). Schaltet der
Bediener das Messgerät aber **aus**, werden alle Messspitzen automatisch
entfernt – der Messmodus endet, beim nächsten Einschalten legt man frisch an.

**RLOW ist bereits angebunden:** RLOW misst laut Display (nicht durchgestrichener
Pfeil-Kasten) kontinuierlich, ohne TEST-Taste – jeder Messspitzen-Klick löst
direkt eine Pfadsuche im Verbindungsgraphen aus (siehe "Pfadverfolgung und
Fehlersimulation"). Für die übrigen Funktionen (RISO/ZI/ZS/FI-RCD) soll die
TEST-Taste die angelegten Messspitzen auslesen und daraus (statt der aktuellen
`---`-Platzhalter) einen echten, aus dem Netzplan berechneten Messwert
anzeigen – noch nicht umgesetzt.

### Bedienelemente (als DOM-Elemente)

Alle Bedienelemente werden – wie beim Schaltkasten – per JavaScript aus einzelnen
SVG-DOM-Elementen aufgebaut (nicht als eingebettetes Bild), damit sie später klickbar
gemacht werden können:

- **Drehknopf** (rechts, Messfunktion wählen)
- **TEST-Taste** (links, löst die Messwertaufnahme aus)
- **Pfeil oben** (▲)
- **Pfeil unten** (▼)
- **Pfeil links/rechts** (◄►)
- **ON/OFF**
- **CAL**

**Styling der Tasten** (Pfeil oben, Pfeil unten, Pfeil links/rechts, ON/OFF, CAL):
- Hintergrund: schwarz
- Schrift: weiß, fett, Arial

**Styling der TEST-Taste:**
- Form: rund
- Farbe: silber
- Position: links am Gerät

### Bedienung

**Drehknopf (rechts am Gerät):**
Ein Klick auf den Drehknopf schaltet zyklisch zur nächsten Messfunktion:

```
RLOW → RISO → ZI → ZS → FI/RCD → V~ → (zurück zu RLOW)
```

Beim Drehen wird der Messwert zurückgesetzt auf `---` (kein Wert). Erst ein Klick auf
die **TEST-Taste** übernimmt einen simulierten Messwert und zeigt ihn an.

**Messpunkte (Schrauben im Schaltkasten):**
Je nach eingestellter Messfunktion müssen erst mehrere Schrauben nacheinander angeklickt
werden (wie das Anlegen der Messspitzen). Erst ein anschließender Klick auf die
**TEST-Taste** löst die Messwertaufnahme aus und zeigt den Wert im Display an.

| Messfunktion | Nötige Klicks (Schrauben) | Entspricht (Phase 4 – Messen) |
| ------------ | ------------------------- | ------------------------------ |
| RLOW         | 2                          | $R_{PE}$ – Schutzleiterdurchgängigkeit |
| RISO         | 3                          | $R_{ISO}$ – Isolationswiderstand |
| ZI           | 2                          | $Z_i$ – Leitungsimpedanz (hinter RCD) |
| ZS           | 3                          | $Z_s$ – Schleifenimpedanz |
| FI/RCD       | 3                          | RCD-Messung: $U_B$, $t_A$, $I_A$ |
| V~           | 3                          | Spannungsfall / AC-Spannung |

**◄►-Taste (Pfeil links/rechts):**
Wandert durch die Werte in der oberen Zeile des Displays (Titel, und falls vorhanden
weitere Werte daneben – z.B. bei ZI: LS-Typ, Bemessungsstrom, Abschaltzeit) und markiert
das jeweils ausgewählte Feld **invers** (weißer Text auf schwarzem Kästchen statt
schwarzem Text ohne Hintergrund). Zyklisch, mit Wrap-around zurück zum Titel. Zeigt an,
welcher Wert gerade ausgewählt ist.

**Pfeil oben/unten (▲/▼):**
Ändert das per ◄► ausgewählte Feld. Bisher umgesetzt:
- **Titel ausgewählt:** togglet zwischen dem vollen Namen (z.B. "Durchgang") und der
  Kurzform vom Drehknopf (z.B. "R LOW") – beide Varianten bleiben invers markiert. Bei
  RLOW zeigt die Kurzform-Ansicht zusätzlich zwei bisher verborgene Werte über dem
  unteren Strich: `R+:___` (links) und `R-:___` (rechts) – Vorwärts-/Rückwärts-Widerstand
  bei der Durchgangsprüfung (Umkehrung der Prüfstromrichtung, deckt thermoelektrische
  Effekte auf). Bei "Durchgang" bleiben diese ausgeblendet.
- **RLOW, kalibrierter Widerstand ausgewählt:** ändert den Wert in 0,1Ω-Schritten, nach
  unten geklemmt bei 0 (zeigt dann `___Ω` statt `0,0Ω`).
- **RISO, Prüfspannung ausgewählt:** wandert durch die Werteliste 50V/100V/250V/500V/1000V
  (siehe "Konfigurierbare Parameter" weiter unten), an beiden Enden geklemmt.
- **ZI, Titel ausgewählt:** togglet zu einer eigenen **ΔU-Ansicht** (Spannungsfall) –
  Titel wird zu "ΔU", davor erscheint ein neuer Wert `4,0%` (Default, siehe unten). LS-Typ
  und Bemessungsstrom bleiben mittig daneben stehen, die Abschaltzeit rutscht dabei ganz
  nach rechts (rechtsbündig statt wie sonst mittig in der Reihe – sonst wären es 4 mittige
  Werte, was nicht mehr ins Display passt). Über dem unteren Strich verschwinden `Isc`/`Lim`
  (die gehören zur normalen "Zl"-Ansicht). Zwischen den Strichen stehen stattdessen vier
  links ausgerichtete Zeilen: `ΔU: ___%`, `Isc:___A`, `Z:___Ω`, `Zref: 0,1Ω` (noch keine
  echten Werte außer Zref, das schon einen Startwert hat – alle vier sind Variablen). Die
  Messpunkte (unter dem Strich) bleiben unverändert. Toggle zurück zu "Zl" wie gehabt.
- **ZI, Spannungsfall (`4,0%`) ausgewählt** (nur in der ΔU-Ansicht sichtbar): ändert den
  Wert in 0,5%-Schritten, nach unten geklemmt bei 0%.
- **ZI, LS-Typ ausgewählt:** wandert durch B/C/D/K/Z (siehe
  `docs/referenz/bauteilwerte.md`) sowie zusätzlich L/U/NV/gG (ältere
  DIN-Charakteristiken bzw. Sicherungs- statt LS-Charakteristiken, als
  Referenzgerät für die Zi-Messung aber ebenso zulässig – siehe auch
  `LIM_FAKTOR_NACH_LS_TYP`, die alle vier bereits unterstützt), an beiden
  Enden geklemmt.
- **ZI, Bemessungsstrom ausgewählt:** wandert durch die Normreihe 6A/10A/13A/16A/20A/
  25A/32A/35A/40A/50A/63A/80A/100A/125A (siehe `docs/referenz/bauteilwerte.md`), an
  beiden Enden geklemmt.
- **ZI, Abschaltzeit ausgewählt:** wandert durch 35ms/70ms/0,1s/0,2s/0,4s/1s/5s, an
  beiden Enden geklemmt.

**Wichtig:** LS-Typ, Bemessungsstrom und Abschaltzeit sind in der normalen "Zl"-Ansicht
und in der "ΔU"-Ansicht dieselben Werte (nicht zwei getrennte Kopien) – eine Änderung in
der einen Ansicht gilt sofort auch in der anderen, in beide Richtungen.

- **ZS, Titel ausgewählt:** togglet zu einer eigenen **ZSrcd-Ansicht** (Schleifenimpedanz
  durch einen RCD hindurch, ohne ihn auszulösen) – Titel wird zu "ZSrcd", danach steht das
  Menü-Item **`Std`**, dann LS-Typ und Bemessungsstrom mittig, die Abschaltzeit
  rechtsbündig ganz rechts (gleicher Mechanismus wie bei ZI/ΔU). Der Inhalt zwischen den
  Strichen (Hauptmesswert) und unter dem Strich (Isc/Lim, Messpunkte) ist bei "Zs" und
  "ZSrcd" **identisch** (anders als bei ZI/ΔU) – kein Unterschied dort. Toggle zurück zu
  "Zs" wie gehabt.
- **ZS, "Std" ausgewählt** (nur in der ZSrcd-Ansicht sichtbar): togglet zwischen `Std` und
  `Low`, sonst keine weiteren Werte.
- **ZS, LS-Typ/Bemessungsstrom/Abschaltzeit ausgewählt:** gleiche Werten und gleicher
  Mechanismus wie bei ZI (siehe oben), aber **eigene, unabhängige Werte** – eine Änderung
  bei ZS wirkt sich nicht auf ZI aus und umgekehrt (unterschiedliche Messungen, kein
  gemeinsam vorausgesetzter LS).
- **FI/RCD, Fehlerstrom ausgewählt:** wandert durch 10mA/30mA/100mA/300mA/500mA (siehe
  `docs/referenz/bauteilwerte.md`), an beiden Enden geklemmt.
- **FI/RCD, Typ ausgewählt:** wandert durch AC/A/F/B/B+ (siehe
  `docs/referenz/bauteilwerte.md`), an beiden Enden geklemmt.

Der Inhalt zwischen den Strichen bei der ZI-ΔU-Ansicht (ΔU/Isc/Z/Zref) ist noch nicht an
▲/▼ angeschlossen – geplante Erweiterung.

### Display

Das Display sitzt **mittig im Gerät** (horizontal und vertikal zentriert).

**Zustand ON/OFF:**
- Gerät **aus** → Display **dunkelgrau**
- Gerät **an** → Display **hellgrau**

**Aufteilung bei eingeschaltetem Gerät:**
Das Display ist durch zwei mittelgraue horizontale Striche (oben und unten) in drei
Zonen unterteilt:
- Über dem oberen Strich: die Anzeige (Titel)
- Mitte (zwischen den Strichen): der Messwert
- Unter dem unteren Strich: die Messpunkte (L/PE/N-Kreise aus der Tabelle)

Die Anzeige im LCD-Display ändert sich je nach Drehknopf-Stellung (nur wenn das Gerät an ist):

| Drehknopf-Stellung | Anzeige (Titel) | Angezeigte Werte | Einheit   | Messpunkte                                                         |
| ------------------ | --------------- | ---------------- | --------- | ------------------------------------------------------------------ |
| RISO               | R ISO           | R                | $M\Omega$ (Sonderfall gleiche Phase: $\Omega$) | L: Kreis ausgefüllt; PE Kreis halb ausgefüllt; N Kreis ausgefüllt  |
| ZI                 | Zl              | Z                | $\Omega$  | L: Kreis ausgefüllt; PE Kreis nicht ausgefüllt; N Kreis ausgefüllt |
| ZS                 | Zs              | Z                | $\Omega$  | L: Kreis ausgefüllt; PE Kreis ausgefüllt; N Kreis halb ausgefüllt  |
| FI/RCD             | RCD I           | I, t, Uci        | mA, ms, V | L: Kreis ausgefüllt; PE Kreis ausgefüllt; N Kreis halb ausgefüllt  |
| V~                 | TRMS Spannung   | Uln, Ulpe, Unpe  | V,V,V     | L: Kreis ausgefüllt; PE Kreis ausgefüllt; N Kreis ausgefüllt       |
| RLOW               | Durchgang       | R: Widerstand    | $\Omega$  | L: Kreis ausgefüllt; PE Kreis nicht ausgefüllt; N Kreis ausgefüllt |

### Berechnung der Messwerte

Die Werte werden **nicht** fest in der `anlage.json` hinterlegt, sondern zur Laufzeit
aus dem Netzplan berechnet (Model-Aufgabe). Das entspricht Stufe 0
("Vollsimulation + fiktive Messwerte") aus dem Lernstufenkonzept – die Werte sind
weiterhin fiktiv, aber aus der Verdrahtung abgeleitet statt hart hinterlegt. Damit
wirkt sich ein eingebautes `Widerstand`-Fehler-Bauteil (siehe "Netzliste") automatisch
auf den angezeigten Messwert aus, ohne dass man irgendwo einen Wert von Hand nachpflegen muss.

Pro Messfunktion gilt ein eigenes Prinzip:

**RLOW** (Durchgangsprüfung, **umgesetzt**):
Pfad zwischen den beiden angelegten Messspitzen im Verbindungsgraphen verfolgen
(siehe "Pfadverfolgung und Fehlersimulation" weiter unten), die
Fehlertabellen-Einträge der Netze entlang dieses Pfads aufsummieren
(`berechneWiderstand()`). Kein Fehler-Widerstand im Pfad → 0Ω. Kein Pfad
(offener Schalter dazwischen) → kein Messwert, Platzhalter bleibt stehen.
Misst kontinuierlich, keine TEST-Taste nötig.

**RISO** (Isolationswiderstand, **prototypisch umgesetzt**):
Drei Messspitzen nötig - eine auf L1/L2/L3, eine auf N oder einer ANDEREN
Phase, eine (grün) auf PE (fließt noch nicht in die Berechnung ein, nur
Platzierungs-Voraussetzung). Welche der ersten beiden Spitzen (Schwarz/Blau)
auf L bzw. N/L sitzt, ist egal - wie bei einer echten Widerstandsmessung sind
die Rollen vertauschbar, nur Grün muss immer auf PE bleiben.

**Verwechslung N/PE:** landet die "N"-Spitze (bewusst oder aus Versehen) auf
PE statt auf N, funktioniert die Messung trotzdem - PE und N sind im
TN-S/TN-C-S-Netz am Sternpunkt ohnehin verbunden, und anders als ein offener
Schalter ist ein aufgetrennter PE-Leiter im Prüfungsalltag kein realistisches
Szenario. Bewusste Vereinfachung statt eines vollständigen PE-Graphen (der
wäre wegen möglicher Zyklen über den Hutschienen-Bond ein größeres eigenes
Vorhaben): eine an PE angelegte Spitze wird für RISO einfach wie N am
Einspeisungspunkt behandelt - **Stand heute bewusst so akzeptiert, aber ein
Kandidat für später** (siehe "Nächste Schritte" -> "PE-Teilgraph").

Zwei Schritte:
1. **Live-Spannungsprüfung** (unabhängig von TEST, wie eine Sicherheitsfunktion
   am echten Gerät): liegt zwischen L und N/L noch echte Netzspannung an
   (beide Punkte über einen geschlossenen Pfad mit der Einspeisung verbunden,
   siehe `istSpannungFuehrend()`), wird diese Spannung angezeigt (230V bei
   L-N, 400V zwischen zwei Phasen) statt eines Widerstands. Ein TEST-Klick
   liefert dann keinen Messwert - stattdessen springt ein eventuell noch
   angezeigter alter Messwert aktiv auf den Platzhalter `R:---MΩ` zurück
   (Sicherheits-Verhalten: solange Spannung anliegt, wird nie ein
   Widerstandswert stehen gelassen, auch nicht versehentlich ein
   veralteter). **Wichtig:** geprüft wird der komplette Pfad zur
   Einspeisung, nicht pauschal nur der Hauptschalter - ein offenes RCD macht
   z.B. seine eigenen Ausgänge "tot", auch wenn der Hauptschalter noch
   geschlossen ist, und ist dort dann trotzdem messbar.
2. **TEST-Klick** (nur wenn keine Spannung mehr anliegt): dieselbe Pfadsuche
   wie bei RLOW zwischen L und N/L. Kein Pfad (heute praktisch immer der
   Fall, da L1/L2/L3/N getrennte Teilgraphen ohne Kanten zueinander sind) →
   `>999MΩ` ("gesund"). Ein Pfad würde wie bei RLOW den summierten
   Fehlerwiderstand zeigen - dieser Fall ist heute technisch nicht
   erreichbar, da es noch keinen Mechanismus gibt, der zwei unterschiedliche
   Funktionen (Isolationsfehler) künstlich verbindet; der Code ist aber
   bereits dafür vorbereitet, sobald ein solcher Fehlerfall-Mechanismus
   existiert.

**Sonderfall - Schwarz und Blau auf derselben Phase:** das ist keine
Isolationsmessung mehr (dafür bräuchte es zwei unterschiedliche Funktionen),
sondern schlicht eine Durchgangsprüfung auf einer Phase. TEST verhält sich in
diesem Fall genau wie bei RLOW: geschlossener Pfad → Summe der
Fehlertabellen-Einträge, offener Schalter dazwischen → `>999MΩ`. Zwischen den
beiden Punkten liegt dabei nie eine Spannung an (dieselbe Phase hat kein
Potentialgefälle zu sich selbst), die Live-Spannungsprüfung zeigt hier also
immer 0V.

**Ampel (Bestanden/Durchgefallen):** die beiden Leuchtstreifen links/rechts
im Display-Rahmen (siehe "Messgerät" → "Display") zeigen bei jedem TEST-Klick
das Ergebnis an - links rot = durchgefallen, rechts grün = bestanden, nie
beide gleichzeitig. **Rot:** Spannung liegt an (TEST liefert dann ohnehin
keinen Messwert), ODER der gemessene Widerstand liegt unter dem eingestellten
Grenzwert (rechts oben im Display, Default 50MΩ, in 10MΩ-Schritten per ▲/▼
einstellbar). **Grün:** der Messwert liegt bei oder über dem Grenzwert, oder
das Ergebnis ist `>999MΩ` (das liegt per Definition über jedem endlichen
Grenzwert). Vor dem ersten TEST-Klick sowie nach einem Drehknopf-Wechsel
(Reset wie beim Messwert selbst) sind beide Streifen grau.

**Einheiten beim Vergleich:** die Fehlertabelle ist durchgehend in **Ω**
angegeben (wie bei RLOW) - auch der Sonderfall "Schwarz/Blau auf derselben
Phase" (siehe oben) liefert deshalb einen Ω-Wert, den das Display auch als
`R:0,10Ω` zeigt (nicht `MΩ` - eine frühere Version hängte pauschal `MΩ` an,
das war falsch beschriftet). Der Grenzwert ist dagegen in **MΩ** eingestellt.
Für den Ampel-Vergleich wird deshalb der Grenzwert mit 1.000.000
multipliziert (nicht der Messwert dividiert, wegen Rundungsfehlern bei sehr
kleinen Werten). Das hat eine bewusst in Kauf genommene Konsequenz: ein
Fehlertabellen-Wert liegt fast immer weit unter jedem sinnvollen MΩ-Grenzwert
(z.B. 0,1Ω ≪ 50.000.000Ω) - der Sonderfall "gleiche Phase" zeigt also
praktisch immer Rot, sobald überhaupt ein Pfad existiert, und nur ein
unterbrochener Pfad (`>999MΩ`) zeigt Grün. Das mag auf den ersten Blick
gegenüber einer klassischen Durchgangsprüfung (niedriger Widerstand = gut)
verkehrt wirken, ist aber explizite User-Vorgabe: die Ampel bewertet
einheitlich nach der RISO-Logik (hoher Widerstand = bestanden), unabhängig
davon, über welchen Pfad der Wert zustande kam - u.a. weil ein hoher
Übergangswiderstand (z.B. durch Kontaktkorrosion an einer Klemme) durchaus
real vorkommen kann und dann korrekt als Auffälligkeit markiert werden soll.

**ZI / ZS** (Impedanz):
`Vorimpedanz` (siehe unten) + alle `Widerstand`-Bauteile auf dem Pfad von der ersten
Schraube zur Einspeisung und zurück zur zweiten Schraube. Zi und Zs sind **dieselbe
Berechnung** – der Name unterscheidet sich nur danach, ob hinter einem RCD gemessen
wird (Zi) oder nicht (Zs), siehe Fehlerquelle #14.

Der Kurzschlussstrom $I_k$ (Fehlerquelle #3) braucht keinen eigenen Messwert – er
ergibt sich direkt aus Zi/Zs per $I_k = U / Z$, keine eigene Spalte in `bauteile.md` nötig.

**FI/RCD** (RCD-Auslösewerte):
Keine Berechnung – feste Werte direkt am RCD-Bauteil selbst (Spalten `tA`, `IA`, `UB`
in `bauteile.md`), da das Eigenschaften des RCD-Geräts sind, nicht des Pfades.

**V~** (Spannung):
Vorerst der Nominalwert aus `spannung_stromkreise` der Anlage, ohne Berücksichtigung
von `Widerstand`-Bauteilen (kein Spannungsteiler-Modell). Spätere Erweiterung möglich.

### Konfigurierbare Parameter

- **`vorimpedanz`** – feste Basisimpedanz der Trafostation/Einspeisung, die bei jeder
  Zi/Zs-Berechnung automatisch mit einfließt (reale Schleifenimpedanz ist nie 0, auch
  ohne jeden Fehler). Default irgendwo im Bereich 0.1–0.5Ω.
- **Messspannung (RISO)** – Prüfspannung für die Isolationswiderstandsmessung, am
  Messgerät per ▲/▼ wählbar (Feld muss vorher über ◄► ausgewählt sein). Gültige
  Werte nach VDE 0100-600/IEC 61557-2: 50V, 100V, 250V, 500V, 1000V. Default
  500V, an beiden Enden der Liste geklemmt (kein Wrap-around). Umgesetzt in
  `controller/app.js` (`RISO_MESSSPANNUNGEN`); der Default-Wert stammt weiterhin
  aus `view/messgeraet.js` (`messspannung`-Feld bei RISO in
  `DREHKNOPF_POSITIONEN`, nur für den Anfangszustand vor dem ersten ▲/▼-Klick).
- **Referenz-LS (ZI/ZS)** – bei der Leitungs-/Schleifenimpedanzmessung zeigt das
  Display zusätzlich den LS an, gegen dessen Auslösebedingungen die gemessene
  Impedanz geprüft werden soll: Charakteristik (B/C/D/K/Z/L/U/NV/gG, siehe
  `docs/referenz/bauteilwerte.md` für B/C/D/K/Z), Bemessungsstrom (Normreihe,
  siehe `docs/referenz/bauteilwerte.md`) und die geforderte max. Abschaltzeit
  (35ms/70ms/0,1s/0,2s/0,4s/1s/5s). Defaults: B, 16A, 0,4s. Über ◄► auswählbar
  und per ▲/▼ einstellbar (siehe "Bedienung" weiter oben), umgesetzt in
  `controller/app.js`; für ZI und ZS jeweils eigene, unabhängige Werte.
- **Isc/Lim (ZI/ZS)** – unten im Display, über dem Strich: `Isc` (links) ist der
  gemessene/berechnete Kurzschlussstrom, noch kein Wert (Platzhalter `---`, wird
  später aus dem Netzplan berechnet). `Lim` (rechts) ist der Mindestauslösestrom,
  den die Charakteristik des Referenz-LS für ein Auslösen innerhalb der
  Abschaltzeit braucht – hängt von **beiden** Referenzwerten ab, `lsTyp` **und**
  `lsBemessungsstrom` (nicht nur vom Typ): `Lim = Faktor(lsTyp) × lsBemessungsstrom`.
  Faktoren (`LIM_FAKTOR_NACH_LS_TYP` in `view/messgeraet.js`, exportiert als
  `berechneLimText()`): B=5, C=10, K=15, D=20, Z=3, L=5,25, U=12, NV=12, gG=12
  (NV/gG-Faktoren können sich noch ändern). `Lim` wird live neu berechnet, wenn
  LS-Typ oder Bemessungsstrom über ▲/▼ geändert werden (in `controller/app.js`).
- **Fehlerstrom/Typ (FI/RCD)** – neben dem Titel "RCD I" zeigt das Display den
  geprüften RCD an: Fehlerstrom (mittig, Normreihe siehe
  `docs/referenz/bauteilwerte.md`: 10mA, 30mA, 100mA, 300mA, 500mA; Default 30mA)
  und Typ (rechts daneben: AC, A, F, B, B+; Default AC). Über ◄► auswählbar und
  per ▲/▼ einstellbar (siehe "Bedienung" weiter oben), umgesetzt in
  `controller/app.js` (`FIRCD_FEHLERSTROEME`/`FIRCD_TYPEN`); der Default-Wert
  stammt weiterhin aus `view/messgeraet.js` (`rcdFehlerstrom`/`rcdTyp` bei
  FI/RCD in `DREHKNOPF_POSITIONEN`, nur für den Anfangszustand vor dem ersten
  ▲/▼-Klick).

---

## JSON-Konfiguration der Anlage

### Struktur (Baum)

```
Einspeisung (400V, L1/L2/L3/N/PE)
│
├── Reihenklemmen (pro Stromkreis)
├── L-Klemme
├── N-Klemme
├── PE-Klemme
│
└── Hauptsicherung (Leistungsschalter / SLS)
    │
    ├── Hutschiene 1
    │   ├── Gruppe 1 (Phase L1)
    │   │   ├── RCD (Typ A, 30mA, 40A, 2-polig)
    │   │   └── Stromkreise
    │   │       ├── LS → Stromkreis (mit AFDD optional)
    │   │       └── LS → Stromkreis
    │   │
    │   └── Gruppe 2 (Phase L2)
    │       ├── RCD (Typ F, 30mA, 40A, 2-polig)
    │       └── Stromkreise
    │
    └── Hutschiene 2
        └── Gruppe 3 (Phase L3)
            ├── RCD: null (kein RCD)
            └── Stromkreise
```

Jede Hutschiene ist ein eigener Eintrag im `hutschienen`-Array und enthält ihre eigenen
Gruppen (`gruppen`-Array). Welche Gruppen auf welcher Hutschiene landen, wird explizit im
JSON festgelegt – nicht automatisch anhand der Breite berechnet.

**Hutschiene:**
```json
{
  "hutschienen": [
    { "gruppen": [ /* Gruppe 1, Gruppe 2, ... */ ] },
    { "gruppen": [ /* Gruppe 3, ... */ ] }
  ]
}
```

### Felder pro Komponente

**Reihenklemmen:**
```json
{
  "reihenklemmen": {
    "vorhanden": true,
    "breite_mm": 6,
    "hoehe_mm": 49
  }
}
```

**PE-Klemme, N-Klemme, L-Klemme:** Jede Klemme hat zwei Schrauben (oben = Eingang,
unten = Ausgang) mit potenziell unterschiedlichem Querschnitt – z.B. dickeres
Zuleitungskabel rein, dünneres internes Verteilungskabel raus. Deshalb wie bei
Hauptsicherung/RCD/LS getrennte `eingang`/`ausgang`-Felder statt eines einzelnen
`querschnitt_mm2`-Werts (der wäre nur die Klemmenkapazität, nicht die tatsächlich
angeschlossene Ader):
```json
{
  "pe_klemme": {
    "vorhanden": true,
    "breite_mm": 12,
    "hoehe_mm": 49,
    "eingang": {
      "leitung": {
        "typ": "NYM-J",
        "adern": [{ "funktion": "PE", "farbe": "gn-ge", "querschnitt_mm2": 16 }]
      }
    },
    "ausgang": {
      "leitung": {
        "typ": "NYM-J",
        "adern": [{ "funktion": "PE", "farbe": "gn-ge", "querschnitt_mm2": 2.5 }]
      }
    }
  }
}
```
`n_klemme`/`l_klemme` sind identisch aufgebaut (Funktion `N` bzw. `L1`).

**Mehrphasige Anlagen (3-poliger Hauptschalter ohne N-Pol, siehe testcase_04):**
Statt einer einzelnen `l_klemme` gibt es dann `l1_klemme`/`l2_klemme`/`l3_klemme`
(gleicher Aufbau, Funktion `L1`/`L2`/`L3`) – **keine** Array-Struktur, weil es bei
Drehstrom nie mehr als genau diese drei Phasen gibt (kein Bedarf für eine
generische Liste). `n_klemme`/`pe_klemme` bleiben Singular, da Neutralleiter und
PE auch bei Drehstrom nur je einmal vorhanden sind. `l_klemme` (Singular) und
`l1_klemme`/`l2_klemme`/`l3_klemme` schließen sich gegenseitig aus – eine Anlage
hat entweder das eine oder die drei anderen, nie beides.

**Hauptsicherung:**
```json
{
  "typ": "SLS",
  "polig": 3,
  "te": 3,
  "in": 63,
  "phasen": ["L1", "L2", "L3"],
  "eingang": { "leitung": { ... } },
  "ausgang": { "leitung": { ... } }
}
```

**Hauptschalter:**
```json
{
  "typ": "Hauptschalter",
  "polig": 2,
  "te": 2,
  "in": 25,
  "phasen": ["L1", "N"],
  "eingang": { "leitung": { ... } },
  "ausgang": { "leitung": { ... } }
}
```

**RCD:**
```json
{
  "typ": "A",
  "polig": 2,
  "te": 2,
  "in_ma": 30,
  "nennstrom_a": 40,
  "selektiv": false,
  "abklemmen_bei_iso": false,
  "max_ls_anzahl": 2,
  "eingang": { "leitung": { ... } },
  "ausgang": { "leitung": { ... } }
}
```

**RCD-Typen:** A, F, B, B+
> Typ B und B+: `abklemmen_bei_iso: true`

**LS:**
```json
{
  "char": "B",
  "in": 16,
  "polig": 1,
  "te": 1,
  "eingang": { "leitung": { ... } },
  "ausgang": { "leitung": { ... } }
}
```

**LS-Charakteristiken:** B, C, D, K, Z

**AFDD (optional, pro Stromkreis):**
```json
{
  "vorhanden": true,
  "abklemmen_bei_iso": true,
  "eingang": { "leitung": { ... } },
  "ausgang": { "leitung": { ... } }
}
```

**Stromkreis:**
```json
{
  "nr": 1,
  "bezeichnung": "SK1",
  "ziel": "Steckdosen Wohnzimmer",
  "phasen": ["L1"],
  "ls": { ... },
  "afdd": null,
  "endstelle": "Steckdose",
  "leitung": { "typ": "NYM-J", "adern": [ { "funktion": "L1", ... }, { "funktion": "N", ... }, { "funktion": "PE", ... } ] },
  "reihenklemmen_eingang": {
    "l": { "funktion": "L1", "farbe": "schwarz", "querschnitt_mm2": 2.5 },
    "n": { "funktion": "N", "farbe": "blau", "querschnitt_mm2": 2.5 },
    "pe": null
  },
  "messungen": {
    "zi": false,
    "zs": true,
    "rcd": true
  }
}
```

`zi`/`zs`/`rcd` sagen nur, welche Messungen für diesen Stromkreis zutreffen (z.B. `zi`
nur relevant, wenn der Stromkreis hinter einem RCD liegt). Die eigentlichen Messwerte
werden **nicht** hier gespeichert, sondern zur Laufzeit aus dem Netzplan berechnet –
siehe "Messgerät (BENNING IT 130)" → "Berechnung der Messwerte".

`leitung` ist die Ausgangsseite der Reihenklemmen (das eine physische Kabel zur
Endstelle) – dieselbe Ader gilt für die untere Schraube aller drei Reihenklemmen
(L/N/PE). `reihenklemmen_eingang` ist die **Eingangsseite** und kann davon abweichen:
z.B. hat die PE-Reihenklemme oft **kein** eigenes Zubringerkabel (PE kommt dann nur
über den Hutschienen-Bond, siehe "Netzliste" → Hutschienen-Bond) – in dem Fall ist
`pe: null`, und die entsprechende Schraube im Rendering ist unverbunden (keine
`data-querschnitt`/`data-farbe`-Attribute, nicht anklickbar). Fehlt das Feld
`reihenklemmen_eingang` komplett (z.B. bei handgeschriebenen Anlagen ohne
Netzplan-Ursprung), fällt der Renderer auf die Ausgangsseite zurück.

**Endstellen:** Steckdose, CEE-Steckdose 16A, CEE-Steckdose 32A, Festanschluss, Lichtauslass

**Leitung:**
```json
{
  "typ": "NYM-J",
  "adern": [
    { "funktion": "L1", "farbe": "schwarz", "querschnitt_mm2": 2.5 },
    { "funktion": "N",  "farbe": "blau",    "querschnitt_mm2": 2.5 },
    { "funktion": "PE", "farbe": "gn-ge",   "querschnitt_mm2": 2.5 }
  ]
}
```

**Kabelfarben nach VDE 0100-510:**
- L1 → schwarz
- L2 → braun
- L3 → grau
- N → blau
- PE → gn-ge

---

## Netzliste (Ziel-Eingabeformat)

**Status: umgesetzt.** Die Netzliste heißt in der Implementierung `netzplan.md`
(eine Datei pro Testcase, z.B. `tests/visuell/testcase_01/netzplan.md`), das
Übersetzungs-Script ist `tests/visuell/generate_anlage.js` (siehe
ARCHITEKTUR.md). Format und Regeln unten sind aktuell und werden durch
`tests/visuell/test_generator.js` als Unit-Tests abgesichert.

Die verschachtelte `anlage.json` von Hand zu pflegen ist fehleranfällig – siehe die
wiederholten fehlenden `ausgang`-Felder und `undefined`-Werte während der Entwicklung.
Ziel ist daher, dass **niemand mehr direkt in der `anlage.json` herumpfuscht**: Die
Anlage wird stattdessen aus einer **Netzliste** erzeugt – einer Tabelle in Markdown,
die die elektrischen Verbindungen zwischen den Bauteilen explizit festhält. Das
Script übersetzt diese Tabelle in die `anlage.json` (Details dazu in
ARCHITEKTUR.md). Die `anlage.json` wird damit zu einem generierten
Artefakt, so wie eine kompilierte Datei – nicht mehr zur manuellen Bearbeitung gedacht.

### Format

**Eine Tabelle pro Hutschiene** – gemeint ist jede **physische Zeile** im Schaltkasten
(eigene Hutschienen-Leiste im Rendering), nicht nur die Einträge im `hutschienen`-Array
der JSON. Das sind bei einer typischen Anlage z.B. drei Zeilen: Reihenklemmen-Zeile,
eine oder mehrere Gruppen-Zeilen (RCD+LS), und die Hauptsicherung+Klemmen-Zeile.

Die Hutschienen werden fortlaufend **H1, H2, H3, ...** benannt. Jede Tabellenüberschrift
folgt der Form `Tabelle x: Hx` (x = Tabellennummer = Hutschienennummer).

- **Zeilen** = einzelne Pins der Bauteile, benannt nach Elektrotechnik-Konvention:
  `<Bauteil><Nr>.<i|o><Nr>` (`i` = Input, `o` = Output), z.B. `RCD1.i1`, `LS1.o1`.
  Bei **PE-Bauteilen** (`PE-Klemme`, `Reihenklemme_PE_*`) gibt es keine sinnvolle
  Eingang/Ausgang-Richtung, da im Normalbetrieb kein Strom über PE fließt – dort
  heißen die Pins stattdessen `io1`, `io2`, `io3` (drei statt der üblichen zwei):
  `io1` = ankommende Ader, `io2` = weiterführende Ader, **`io3` = immer die
  Verbindung zur Hutschiene selbst** (Metallschiene als PE-Bezugspunkt/Sammelschiene)
  – feste Konvention für jedes PE-Bauteil. `io1` und `io2` tragen dabei **je genau
  eine Ader** (nie mehrere Netze auf demselben Pin), analog zu `i`/`o` bei normalen
  Bauteilen. Ausnahme: Ein PE-Bauteil, das als Sammelpunkt mehrere Reihenklemmen
  gleichzeitig versorgt (z.B. `PE-Klemme`), darf auf `io2` zu mehreren Netzen
  gleichzeitig verzweigen (eine Ader je Ziel) – siehe "Ein Netz kann mehr als zwei
  Pins verbinden" weiter unten.
- **Jede Tabelle zeigt nur ihre eigenen (Home-)Pins** – keine Gastzeilen aus anderen
  Tabellen. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
  Spalte in beiden Tabellen auf; die Zeile **"Quelle"** (siehe unten) zeigt dann, aus
  welcher Hutschiene dieses Netz stammt.
- **Spalten** = benannte Netze (`N1`, `N2`, ...) – Netz- und Pin-Namen werden über
  Tabellengrenzen hinweg wiederverwendet, dieselbe physische Verbindung bleibt so
  eindeutig erkennbar
- **Zeilen "Quelle", "Farbe", "Querschnitt (mm²)" und "Kabeltyp"** direkt unter dem
  Tabellenkopf (statt in den Spaltenkopf gequetscht oder pro Pin wiederholt) zeigen
  die Eigenschaften jedes Netzes. `Quelle` nennt die Hutschiene, aus der das Netz
  stammt (bei nativen, nicht importierten Netzen: die eigene Hutschiene). Die Einheit
  bei Querschnitt steht im Zeilennamen (`Querschnitt (mm²)`), die Werte selbst sind
  reine Zahlen ohne Einheit. `Kabeltyp` (z.B. `NYM-J`) wiederholt sich über alle
  Netze, die zur selben physischen Mehrader-Leitung gehören (gültige Werte für
  Kabeltyp und Querschnitt siehe `docs/referenz/bauteilwerte.md`).
- **Zellinhalt** = welche Funktion dieser Pin auf diesem Netz hat: `L1`, `L2`, `L3`,
  `N` oder `PE` (statt eines einfachen Kreuzes) – leer, wenn nicht verbunden
- Ein Netz kann **mehr als zwei** Pins verbinden (z.B. eine Kammschiene, die einen
  RCD-Ausgang auf mehrere LS-Eingänge verteilt) – das Format erlaubt das ohne Sonderfall
- **Die Hutschiene selbst ist auch ein Bauteil:** jede Tabelle hat eine eigene Zeile
  `H1`/`H2`/`H3`/... (Pin = Hutschienenname, kein `i`/`o`/`io`-Suffix, da nur ein
  Anschlusspunkt) – das ist der tatsächliche Endpunkt, an den alle `io3`-Pins der
  PE-Bauteile auf dieser Hutschiene anschließen. **Der Hutschienen-Bond bleibt dabei
  immer lokal auf seine eigene Tabelle beschränkt** – eine Hutschiene ist kein Kabel
  und verbindet sich nicht "über ein Netz" mit einer anderen Hutschiene. Sitzen
  PE-Bauteile auf mehreren Hutschienen, bekommt jede Hutschiene ihren eigenen,
  lokalen Bond mit eigener Netznummer; die tatsächliche Verbindung zwischen den
  Hutschienen läuft ausschließlich über ein echtes Kabel (z.B. von einer PE-Klemme
  zu einer Reihenklemme).

Ein vollständiges, ausgearbeitetes Beispiel steht in
`tests/visuell/testcase_01/netzplan.md`.

### Bauteil-Eigenschaften

Der Netzplan deckt nur die Verdrahtung ab (Topologie, Farbe, Querschnitt) – nicht
Gerätewerte wie Nennstrom, Typ oder Charakteristik. Diese stehen in einer separaten
`bauteile.md` pro Testcase (z.B. `tests/visuell/testcase_01/bauteile.md`): eine Zeile
pro Bauteil mit Spalten wie Gruppe, Typ/Charakteristik, Fehlerstrom, Nennstrom,
Max. Querschnitt, Pole, Selektiv, Abklemmen, Anzahl LS. Wie im Netzplan steht die
Einheit in einer eigenen **Zeile "Einheit"** direkt unter dem Tabellenkopf, die
Zellwerte selbst sind reine Zahlen.

Die **`Gruppe`-Spalte** (z.B. `G1`) ordnet RCD und die zugehörigen LS derselben
Gruppe zu – nötig, weil eine Gruppe als Objekt eine eigene Kennung (`id`/`bezeichnung`)
braucht, die sich aus der reinen Verdrahtung nicht ableiten lässt.

**`Max. Querschnitt`** ist die Anschlusskapazität einer Klemme/eines Geräts selbst
(z.B. "nimmt Adern bis 16mm² auf") – ein anderes Feld als der tatsächliche Querschnitt
der angeschlossenen Adern (der steht im Netzplan).

`bauteile.md` enthält neben der Bauteile-Tabelle noch zwei weitere:
- **Stromkreise**: eine Zeile pro Stromkreis mit Ziel, Endstelle und den
  `messungen`-Flags (zi/zs/rcd)
- **Anlage (Kopfdaten)**: Name, Beschreibung, Netzform, Spannungen – hier steht die
  Einheit als eigene **Spalte "Einheit"** (nicht als Zeile, da diese Tabelle
  Feld/Wert-Paare statt vieler Bauteil-Spalten hat)

Zusätzlich trägt das RCD-Bauteil eigene Messwerte (siehe "Messgerät (BENNING IT 130)"
→ "Berechnung der Messwerte"), da diese am Gerät selbst hängen, nicht am Pfad:
- **RCD**: Spalten `tA` (Abschaltzeit), `IA` (Auslösestrom), `UB` (Berührungsspannung)

Der Kurzschlussstrom ($I_{sc}$/$I_k$, Fehlerquelle #3) braucht keine eigene Spalte –
er ergibt sich direkt aus der berechneten Impedanz (Zi/Zs) per $I_k = U / Z$.

Welche Werte in diesen Spalten überhaupt gültig sind (z.B. gültige LS-Charakteristiken,
RCD-Typen, genormte Nennstrom-Reihen), steht zentral in
**`docs/referenz/bauteilwerte.md`** – gilt für alle Testcases, nicht pro Testcase
wiederholt.

## Pfadverfolgung und Fehlersimulation

**Status: umgesetzt (für RLOW, prototypisch auch RISO).** Ersetzt den früheren
Ansatz "Widerstand als eigenes Bauteil in der Netzliste" (zu umständlich –
jeder Fehler hätte den Netzplan selbst verändert). Stattdessen: ein separater
**Verbindungsgraph**, der Pfade zwischen zwei Schrauben sucht, unter
Berücksichtigung von Schalterstellungen und optionalen Fehler-Widerständen.
Umgesetzt: Graph-Generierung (siehe unten) inkl. Ausgabedatei (`graph.json`
pro Testcase), Anbindung ans Messgerät für RLOW (Messspitzen setzen, Pfad
wird live verfolgt, siehe "Messmodus" und ARCHITEKTUR.md), Schalterzustand
(LS/RCD/Hauptschalter klickbar, siehe "Schalter" unten - schaltet
`kante.geschlossen` live um, RLOW reagiert sofort darauf), die Fehlertabelle
(siehe unten - Fehler-Widerstände pro Netz, `berechneWiderstand()` summiert
sie über den gefundenen Pfad), sowie für RISO die Einspeisungs-Erreichbarkeit
pro Netz (`graph.einspeisung` + `istSpannungFuehrend()`, siehe "Berechnung
der Messwerte"). ZI/ZS nutzen den Graphen noch nicht.

### Verbindungsgraph

**Umgesetzt** in `tests/visuell/generate_anlage.js` (`generiereGraph()` +
`findePfad()`, Tests in `test_generator.js`). Knoten sind **Netze** (nicht
einzelne Pins/Schrauben – ein Netz fasst ohnehin alle Pins zusammen, die
elektrisch identisch sind; jede Ader trägt dafür ihre Netz-ID als `netz`-Feld
in `anlage.json`, gespiegelt als `data-netz`-Attribut am Schrauben-Kreis im
SVG, sodass eine angeklickte Schraube ihr Netz ohne erneutes Parsen kennt),
Kanten sind Bauteile, die zwei Netze
über ein `i<n>`/`o<n>`-Pinpaar derselben Funktion verbinden – generisch über
alle Bauteile aus `bauteile.md`, kein Sonderfall pro Bauteilart. Ein einzelner
Ausgangspin kann dabei auf mehrere Netze gleichzeitig verzweigen (z.B. ein
RCD-Ausgang, der zwei LS versorgt) – das Format erlaubt das ohne Sonderfall.
Dieselbe Verzweigung wird auch auf der Anzeigeseite abgebildet: eine Ader in
`anlage.json` kann ein optionales `weitere`-Array mit zusätzlichen Adern an
derselben physischen Schraube tragen (eine Schraube, mehrere Kabel – wie eine
Astgabelung, keine zweite Schraube), sichtbar sowohl im Popup (Normalmodus)
als auch beim Messen (die Messspitze "sieht" dann alle dort geklemmten Netze
gleichzeitig, siehe ARCHITEKTUR.md).
Pro Testcase wird ein **eigener Teilgraph je Funktion** gebaut (`L1`, `L2`,
`L3`, `N`), nicht ein gemeinsamer Graph für alle Funktionen. **PE bewusst
ausgelassen:** L1/L2/L3/N sind radiale Verteilung ohne Schleifen (echte
Bäume, immer genau ein Pfad zwischen zwei Punkten). PE dagegen kann über den
Hutschienen-Bond (jedes PE-Bauteil hängt sowohl an der Ader-Kette als auch am
`io3`-Bond der Hutschiene) mehrere Pfade zwischen zwei Punkten haben – ein
echter Graph mit Zyklen, bei dem der Widerstand bei mehreren Pfaden korrekt
eine Parallelschaltung wäre statt einer einfachen Summe. Das ist deutlich
komplexer und wird erst angegangen, sobald eine PE-basierte Messung ($R_{PE}$)
tatsächlich ansteht.

Diese Struktur gehört **nicht** in `anlage.json` (das bleibt reine
Anzeigedaten – Farbe/Querschnitt pro Ader, plus die schlanke `netz`-Lookup-ID,
wie oben beschrieben) und wird auch nicht im Browser aus `netzplan.md` neu
geparst (keine doppelte Parsing-Logik in Node und Browser pflegen). Der Graph
wird stattdessen als eigene Datei `graph.json` pro Testcase geschrieben (von
derselben CLI wie `anlage.json`, siehe ARCHITEKTUR.md) und zur Laufzeit per
`Anlage.ladeGraph()` in den Browser geladen; `model/pfad.js` ist ein bewusst
dupliziertes Browser-Gegenstück zu `findePfad()` (kein Bundler im Projekt, die
Funktion ist klein genug für eine gepflegte Duplizierung). RLOW und RISO
nutzen das bereits (siehe "Messmodus"); ZI/ZS folgen später demselben Modell.

### Schalter (LS, RCD, Hauptschalter)

**Status: umgesetzt** (für RLOW - siehe "Berechnung der Messwerte" oben,
RISO/ZI/ZS folgen später demselben Verbindungsgraph-Modell). Das
Schalter-Symbol (`zeichneSchalter()` in `schaltkasten.js`) besteht aus zwei
Teilen:
- Eine **feste weiße Box** (`#f5f5f5`, Rand `#555555` - dieselbe Grau-Farbe
  wie der Bauteil-Rand selbst) - **Position/Größe ändern sich nie**, das war
  eine explizite, mehrfach bestätigte User-Vorgabe. Breite skaliert mit der
  Polzahl, ausgehend von einer Basisbreite `W` (Breite des 1-poligen LS):
  LS/Hauptschalter linear (`Polzahl × W`, plus ab 3 Polen ein kleiner fester
  Zusatz pro Pol, rein optisch nach User-Feedback; horizontal UND vertikal
  mittig), RCD dagegen mit festem linken UND rechten Rand statt reiner
  `(Polzahl − 1) × W`-Formel (2-polig bleibt bei `W`, 4-polig wird breiter als
  `3×W`; horizontal nicht zwingend mittig, darf nach links versetzt sein).
- Ein **Hebel** darin (eigener Rahmen, Innenfläche `#dddddd`, oben ein
  schwarzer Balken, darunter drei Riffel-Linien) - orientiert an
  `docs/referenz/hebelgeschlossen.svg` (vom User bereitgestellt) bzw. den
  daraus abgeleiteten Beispielen `docs/referenz/hebel_beispiel_geschlossen.svg`/
  `hebel_beispiel_offen.svg`. Der Hebel füllt geschlossen (Default) die obere
  Boxhälfte. **Klickbar:** ein Klick auf die Box dreht den Hebel per
  SVG-`transform="rotate(180, mitteX, mitteY)"` um den **Box-Mittelpunkt** -
  Größe/Form des Hebels bleiben dabei exakt gleich (reine Rotation, keine
  Neupositionierung einzelner Elemente), er füllt danach die untere
  Boxhälfte mit vertauschter Balken/Riffelung-Seite. Der Drehpunkt liegt
  bewusst nicht in der Hebel-Mitte, sondern an seiner unteren Rahmenkante
  (horizontal mittig) - dadurch berührt diese Kante im geschlossenen Zustand
  exakt den Box-Mittelpunkt, und nach der Drehung die *obere* Rahmenkante
  denselben Punkt.

Frühere Entwürfe (ganze Box wandert; Box fest, aber Balken+Riffelung tauschen
ohne Rotation die Position) wurden verworfen, siehe ARCHITEKTUR.md für Details.

Jeder schaltbare Bauteil hat eine **doppelte Rolle**:
- **Grafisch:** im Schaltkasten-SVG klickbar – die Schalter-Box selbst (nicht
  die Schrauben, die sind für Messspitzen reserviert, siehe "Messmodus").
- **Im Graphen:** eine Kante (bzw. bei mehrpoligen Bauteilen mehrere Kanten
  gleichzeitig, eine je Pol) zwischen den Eingangs- und Ausgangs-Pins, mit
  Zustand `geschlossen: true/false`. Die Pfadsuche überspringt Kanten mit
  `geschlossen: false`. Bei einem 4-poligen RCD steuert ein Klick also bis zu
  vier Kanten gleichzeitig (eine je Pol), da alle denselben Schalterzustand
  referenzieren.

Verbindende ID zwischen SVG und Graph: der Bauteilname aus `bauteile.md`
(`LS1`, `RCD1`, `Hauptschalter`, ...) – dafür trägt jetzt auch `anlage.json`
ein `name`-Feld pro RCD/LS/Hauptsicherung (vorher fehlte das, nur die
Hauptsicherung hatte es zufällig im `typ`-Feld). Der Laufzeit-Zustand ("welche
Schalter sind gerade offen") lebt im Controller (`controller/app.js`) direkt
als Mutation der `kante.geschlossen`-Felder im geladenen `graph`-Objekt, nicht
in einer eigenen Map und nicht in der Graph-Datei selbst (die beschreibt nur
die Ausgangs-Topologie). Default: alle Schalter geschlossen (Normalzustand
einer Anlage unter Spannung). **Wichtig, bewusst anders als bei den
Messspitzen:** der Schalterzustand wird beim Aus-/Einschalten des Messgeräts
**nicht** zurückgesetzt – ein Schalter bildet den echten Zustand der Anlage
ab, der bleibt bestehen, unabhängig davon, ob gerade gemessen wird.

RLOW nutzt das bereits: `berechneRlowMesswert()` in `controller/app.js` findet
über `findePfad()` keinen Pfad mehr, sobald irgendeine Kante zwischen den
beiden Messspitzen `geschlossen: false` ist, und zeigt dann wieder den
`___Ω`-Platzhalter statt eines Messwerts.

### Schrauben lösen

Der Bediener soll Schrauben auch **lösen** können (Mechanismus/Werkzeug noch
nicht entschieden). Wirkung im Graphen: dieselbe Art von Kante wie beim
Schalter, nur auf Ebene einer einzelnen Ader statt eines ganzen Bauteils –
eine gelöste Schraube kappt genau eine Kante.

### Fehlertabelle (Fehler-Widerstände)

**Status: umgesetzt.** Eine optionale Tabelle direkt in `netzplan.md` (pro
Testcase), die einzelnen **bestehenden** Netzen einen Fehler-Widerstand
zuweist – kein eigenes Bauteil, keine Änderung an der restlichen Verdrahtung
nötig:

```
## Fehlertabelle

| Netz | Widerstand (Ω) |
| ---- | --------------- |
| N1   | 0,1             |
```

Netze ohne Eintrag gelten als **0Ω** (kein Fehler), Widerstand mit Komma als
Dezimaltrennzeichen. `generate_anlage.js` (`parseFehlertabelle()`) parst die
Sektion und legt sie als `graph.fehlertabelle` (`{ N1: 0.1, ... }`) mit in
`graph.json` ab – kein eigenes Bauteil im Graphen, sondern ein flaches
Nachschlage-Objekt. Der Widerstand gehört zum **Netz** (Knoten, entspricht
einer Kabelstrecke), nicht zur Kante (die repräsentiert ein Bauteil, per
Design widerstandslos/ideal) – `berechneWiderstand(graph, pfad)` summiert
schlicht die Fehlertabellen-Einträge aller Netz-IDs, die `findePfad()` im
Pfad-Array zurückgibt.

Alle 4 Testcases tragen inzwischen je 3 Beispiel-Netze mit Widerstand (auf
einem bekannten L1-Pfad, siehe die jeweilige `netzplan.md`) – bewusst nicht
alle Leitungen, der User füllt die Tabelle nach Bedarf selbst weiter auf.

### RLOW-Berechnung (erster Anwendungsfall)

**Status: umgesetzt.** Die zwei relevanten Messspitzen (siehe "Messmodus")
markieren zwei Knoten im Graphen. Pfadsuche zwischen ihnen; existiert ein Pfad
(alle Kanten `geschlossen`), ist der angezeigte Wert die **Summe der
Fehlertabellen-Einträge der Netze entlang dieses Pfads** (0Ω, wenn keine
Fehlertabellen-Einträge auf dem Weg liegen). Existiert kein Pfad (offener
Schalter dazwischen), bleibt der Messwert beim `---`-Platzhalter.

### RISO-Berechnung (zweiter Anwendungsfall, prototypisch)

**Status: prototypisch umgesetzt** (siehe "Berechnung der Messwerte" oben für
die Details - Live-Spannungsprüfung über `istSpannungFuehrend()`, TEST-Klick
sucht denselben Pfad wie RLOW). ZI/ZS folgen später demselben Graph-Modell,
sind aber noch nicht im Detail durchdacht.

---

## Testkonzept

### Visueller Regressionstest für das Bild (SVG) der Schaltanlage

Jeder Testcase besteht aus einem JSON+SVG Paar:
- `anlage.json` → Anlagenkonfiguration
- `anlage.svg` → Referenzgrafik (Topologie, ohne Verbindungen)

Bei jeder Code-Änderung wird die JSON gerendert und mit der Referenz verglichen.
Akzeptanzkriterium: Wenn das gerendert Bild dem Bild der `anlage.svg` entspricht.
Da jede Schraube ihre Ader-Daten (Querschnitt, Farbe) als Attribut trägt, prüft der
Vergleich nicht nur die Optik, sondern auch ob die richtige Ader an der richtigen
Schraube hängt.

### Testcase Verzeichnisstruktur

```
tests/visuell/
  testcase_01/   ← einfach: 1 RCD, 2 LS
  testcase_02/   ← 2 RCDs auf einer Hutschiene
  testcase_03/   ← 3 RCDs auf 2 Hutschienen (Gruppe 1 allein, Gruppe 2+3 zusammen)
  testcase_04/   ← 3-poliger Hauptschalter (L1+L2+L3, kein N), 4-poliger RCD auf allen 3 Phasen
  ...
```

**Geplant für später (noch nicht umgesetzt):**
- Gruppe mit AFDD
- RCD Typ B
- Gruppe ohne RCD

---

## Nächste Schritte

Verbindungsgraph, Schalter und Fehlertabelle sind für RLOW umgesetzt (siehe
"Pfadverfolgung und Fehlersimulation"). RISO ist prototypisch umgesetzt (Live-
Spannungsprüfung + TEST-gestützte Widerstandsmessung, siehe "Berechnung der
Messwerte"). Offen:

1. **ZI/ZS an den Verbindungsgraphen anbinden** - nutzt dieselbe
   Infrastruktur (Graph, Messspitzen, Schalter, Fehlertabelle), aber mit
   eigenem Messprinzip (Vorimpedanz + Widerstände auf dem Pfad zur
   Einspeisung und zurück, siehe "Berechnung der Messwerte").
2. **Isolationsfehler-Mechanismus für RISO** - heute sind L1/L2/L3/N
   vollständig getrennte Teilgraphen, ein TEST-Klick ohne anliegende
   Spannung liefert deshalb praktisch immer `>999MΩ`. Für echte
   Fehlerszenarien bräuchte es einen Weg, zwei Funktionen künstlich über
   einen simulierten Isolationsfehler zu verbinden - der Code
   (`risoTestKlick()`) ist strukturell schon darauf vorbereitet.
3. **PE-Teilgraph** - bewusst zurückgestellt, da PE über den
   Hutschienen-Bond Zyklen bilden kann (Parallelwiderstand statt einfacher
   Pfad-Summe) - ein eigenständiges, größeres Vorhaben. Bis dahin gilt für
   RISO die bewusste Vereinfachung `risoEffektiveAder()`: eine an PE
   angelegte Messspitze wird pauschal wie N am Einspeisungspunkt behandelt
   (siehe "Berechnung der Messwerte" - Abschnitt "Verwechslung N/PE"), statt
   den tatsächlichen PE-Pfad zu verfolgen. Das ist **Stand heute bewusst so
   akzeptiert** (ein aufgetrennter PE-Leiter ist im Prüfungsalltag kein
   realistisches Szenario), aber eine Vereinfachung, keine korrekte
   Modellierung - sobald der PE-Teilgraph existiert, sollte
   `risoEffektiveAder()` durch eine echte Pfadsuche über den PE-Graphen
   ersetzt werden.
4. **Schrauben lösen** - Mechanismus/Werkzeug noch nicht entschieden (siehe
   "Schrauben lösen" oben).
5. Weitere Testcase-Szenarien (siehe "Geplant für später" oben: AFDD, RCD
   Typ B, Gruppe ohne RCD).
