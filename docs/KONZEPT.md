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

## Messgerät (INSTALLATIONSTESTER)

### Darstellung

Das Messgerät wird als eigene Komponente **unterhalb des Schaltkastens** angezeigt.
Grundlage ist das Mockup `docs/referenz/messgeraet_mockup.svg`.

**Reale Breite:** 230 mm (Vorbild BENNING IT 130, im Simulator als "INSTALLATIONSTESTER" beschriftet), im selben Maßstab wie der Schaltkasten
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

**Alle sechs Messfunktionen sind angebunden**, aber mit unterschiedlichem
TEST-Bezug: RLOW misst laut Display (nicht durchgestrichener Pfeil-Kasten)
kontinuierlich, ohne TEST-Taste – jeder Messspitzen-Klick löst direkt eine
Pfadsuche im Verbindungsgraphen aus (siehe "Pfadverfolgung und
Fehlersimulation"). RISO, ZI, ZS und FI/RCD lesen dagegen erst beim
TEST-Klick die angelegten Messspitzen aus und berechnen daraus (statt des
`---`-Platzhalters) einen echten, aus dem Netzplan/der Fehlertabelle bzw.
den RCD-Bauteildaten berechneten Messwert (siehe "Berechnung der
Messwerte"). V~ braucht wie RLOW **keine TEST-Taste** – alle drei
Spannungswerte werden live bei jeder Messspitzen-Änderung neu berechnet,
allerdings ohne die kontinuierliche Pfadsuche-Semantik von RLOW (V~ prüft
keine Rolle/Platzierung, siehe "Berechnung der Messwerte" - Abschnitt "V~").

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
| V~           | 3                          | AC-Spannung ($U_{LN}$, $U_{LPE}$, $U_{NPE}$) |

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

**ZI / ZS** (Impedanz, **beide vollständig umgesetzt** - ZS mit einer
bewusst dauerhaft akzeptierten Vereinfachung, siehe unten):
`Vorimpedanz` (siehe unten) + alle `Widerstand`-Bauteile auf dem Pfad von der ersten
Schraube zur Einspeisung und zurück zur zweiten Schraube. Zi und Zs nutzen
denselben **Mechanismus** (Pfadsuche + Fehlertabellen-Summe + Vorimpedanz,
TEST-gebunden) - der Name unterscheidet sich danach, ob hinter einem RCD
gemessen wird (Zi) oder nicht (Zs), siehe Fehlerquelle #14. **Aber ihre
Formeln sind NICHT identisch:** Zi summiert L-Pfad UND N-Pfad, Zs (siehe
unten) bewusst nur den L-Pfad - PE und N bleiben dort unberücksichtigt.

Zwei Messspitzen bei ZI: Schwarz auf L1/L2/L3, Blau auf N (keine
vertauschbaren Rollen wie bei RISO, PE spielt keine Rolle). Da L und N
unterschiedliche Teilgraphen ohne gemeinsamen Pfad sind, wird **zweigeteilt**
gesucht: Pfad von der L-Sonde zur L-Einspeisung, Pfad von der N-Sonde zur
N-Einspeisung - jeweils die Fehlertabellen-Summe wie bei RLOW. **Beide**
Teilpfade müssen zur Einspeisung durchgängig geschlossen sein, BEVOR die
TEST-Taste überhaupt einen Effekt hat - fehlt einer (z.B. offener Schalter
dazwischen), bleibt der Platzhalter stehen, kein `>999Ω`-Sentinel wie bei
RISO (ZI setzt ja gerade ein stromdurchflossenes, spannungsführendes Netz
voraus, keine spannungsfreie Anlage). Ist die Messung möglich: **bei ZI**
`Z = Fehlertabelle(L-Pfad) + Fehlertabelle(N-Pfad) + Vorimpedanz`
(`ziTestKlick()` in `controller/app.js` summiert explizit `pfadL + pfadN +
ZI_VORIMPEDANZ`). TEST-gebunden wie RISO.

**Live-Spannungsanzeige** unter dem PE-Kreis, dieselbe Anzeige-Position wie
bei RISO - aber mit umgekehrtem Zweck: bei RISO warnt sie "hier liegt noch
Spannung an, TEST wirkt nicht", bei ZI zeigt sie "der Stromkreis ist bereit,
TEST wird einen Messwert liefern" (230V, wenn beide Teilpfade zur
Einspeisung geschlossen sind, sonst 0V) - naheliegend, da ZI ja gerade ein
spannungsführendes Netz voraussetzt, RISO dagegen ein spannungsfreies.

**Pfeil-Kasten unten links** (siehe "Messgerät" → "Display" - normalerweise
durchgestrichen bei TEST-gebundenen Funktionen wie ZI): liegt Spannung an
(Stromkreis bereit), wird er bei ZI bewusst undurchgestrichen dargestellt -
optischer Bezug zur Live-Spannungsanzeige. Nur für ZI, nicht für RISO: dort
bedeutet anliegende Spannung ja gerade "TEST wirkt nicht", der
durchgestrichene Zustand bleibt dort unverändert korrekt.

**Wegfall der Spannung entwertet einen bestehenden Messwert:** wird der
Pfeil-Kasten wieder durchgestrichen (Spannung fällt weg, z.B. weil währenddessen
ein Schalter geöffnet wurde - unabhängig davon, ob die Messspitzen dabei
angefasst wurden), springt ein zuvor per TEST ermittelter Z-Wert sofort auf
den Platzhalter `Z:---Ω` zurück, statt veraltet stehen zu bleiben. Kommt die
Spannung später zurück, bleibt der Platzhalter trotzdem bestehen, bis erneut
TEST gedrückt wird - ein alter Messwert taucht nicht von selbst wieder auf.

**Isc (Kurzschlussstrom, Fehlerquelle #3, ZI prototypisch umgesetzt):** braucht
keinen eigenen Messwert – ergibt sich direkt aus dem gemessenen Z per
$I_{sc} = 0{,}9 \times 230V / Z$ (Sicherheitsfaktor 0,9 nach Norm, da die
Netzspannung unter Last etwas einbrechen kann), keine eigene Spalte in
`bauteile.md` nötig. Angezeigt unten links über dem Strich (`Isc:XX,XA`, eine
Nachkommastelle) - hängt an derselben Bedingung wie der Z-Wert: nur berechnet,
solange `ziMesswert !== null` ist, sonst bleibt der Platzhalter `Isc:---A`
stehen (inkl. desselben Resets bei Wegfall der Spannung, siehe oben).

**Isc/Lim-Ampel:** sobald Isc feststeht, vergleicht die Ampel (dieselben
Leuchtstreifen wie bei RISO) ihn gegen `Lim` (rechts daneben, die
Mindestauslöseschwelle der gewählten LS-Charakteristik) - reicht der
Kurzschlussstrom aus, um den LS in der geforderten Zeit auszulösen? **Isc >
Lim** → grün rechts (bestanden). **Isc < Lim** (inkl. Gleichstand) → rot
links (der LS würde nicht schnell genug auslösen). Anders als bei RISOs
Ampel ist dieser Vergleich bewusst **live** statt als TEST-Snapshot
eingefroren: ändert man LS-Typ/Bemessungsstrom danach per ▲/▼ (Lim selbst
ist ja ohnehin schon live, siehe "Referenz-LS"), zieht die Ampel sofort mit,
ohne dass erneut TEST gedrückt werden muss - Isc bleibt dabei unverändert
der zuletzt gemessene Wert.

**ZS (bewusst vereinfacht, keine weitere Iteration geplant):** Messspitzen diesmal Schwarz
(L1/L2/L3, wie bei ZI) und **Grün** statt Blau als zweite aktive Sonde -
Grün muss auf PE sitzen, Blau zusätzlich auf N (analog zu ZI/RISO müssen
alle drei Sonden korrekt platziert sein, damit TEST überhaupt reagiert).
**Der eigentliche Unterschied zu ZI:** obwohl bei ZS - anders als bei ZI -
sogar DREI Sonden korrekt platziert sein müssen (L, N UND PE), fließt in
die Berechnung nur der **L-Pfad** ein - sowohl der PE-Pfad ALS AUCH der
N-Pfad werden komplett ignoriert (`zsTestKlick()` in `controller/app.js`
prüft `blauAder.funktion === 'N'` und `gruenAder.funktion === 'PE'` nur als
Platzierungs-Voraussetzung, summiert aber ausschließlich
`findePfadZurEinspeisung(schwarzAder.funktion, schwarzAder)` - anders als
ZI, das explizit `pfadL + pfadN` addiert, siehe oben). Das beruht auf der
Annahme, dass PE immer Durchgang hat (0Ω) - dieselbe Vereinfachung wie bei
RISOs `risoEffektiveAder()` (siehe oben) und aus demselben Grund akzeptiert:
ein aufgetrennter PE-Leiter ist im Prüfungsalltag kein realistisches
Szenario, und PE ist ohnehin noch nicht im Verbindungsgraphen modelliert
(siehe "Nächste Schritte" - PE-Teilgraph). Der N-Pfad wird aus demselben
Grund wie PE weggelassen, obwohl N technisch bereits ein eigener
Funktions-Teilgraph ist (anders als PE) - eine reale Unterbrechung/einen
Fehlerwiderstand auf dem N-Leiter zwischen Sonde und Einspeisung würde ZS
aktuell also **nicht** erkennen (ein Fehlertabellen-Eintrag auf einem
N-seitigen Netz hätte hier keine Wirkung auf den angezeigten Z-Wert). `Z =
Fehlertabelle(L-Pfad) + Vorimpedanz` (derselbe feste Wert wie bei ZI,
0,14Ω). TEST-Taste
funktioniert für die normale Zs-Ansicht UND die ZSrcd-Ansicht gleichermaßen
(anders als ZIs ΔU-Ansicht, deren Hauptmesswert-Bereich statisch bleibt -
siehe "Bedienung").

**Live-Spannungsanzeige (umgesetzt):** unter dem PE-Kreis, wie bei ZI - zeigt
aber bewusst nur an, ob der EINE geprüfte Teilpfad (L-Sonde → L-Einspeisung)
geschlossen ist, nicht zusätzlich den (ohnehin ignorierten) PE-Pfad. 230V,
wenn dieser Pfad steht, sonst 0V - exakt deckungsgleich mit der
Vorbedingung, die auch der TEST-Klick prüft. Alle drei Sonden müssen
trotzdem korrekt platziert sein (wie beim TEST-Klick), auch wenn nur
Schwarz tatsächlich ausgewertet wird. Gilt wie der Z-Wert für beide
Ansichten (Zs und ZSrcd) gleichermaßen.

**Pfeil-Kasten unten links (umgesetzt):** genau wie bei ZI - liegt Spannung
an (L-Pfad bereit), undurchgestrichen, sonst durchgestrichen.

**Isc/Lim-Ampel (umgesetzt):** genau wie bei ZI - Isc = $0{,}9 \times 230V /
Z$ (aus `zsMesswert`, sobald vorhanden), verglichen gegen `Lim` (rechts
daneben, Mindestauslöseschwelle der gewählten LS-Charakteristik). **Isc >
Lim** → grün rechts. **Isc < Lim** (inkl. Gleichstand) → rot links. Bewusst
live berechnet (nicht als TEST-Snapshot eingefroren) - ändert man LS-Typ/
Bemessungsstrom danach per ▲/▼, zieht die Ampel sofort mit. Damit sind ZI
und ZS jetzt funktional deckungsgleich bis auf den einen bewusst
akzeptierten Unterschied: ZS prüft/berechnet keinen PE-Pfad.

**FI/RCD** (RCD-Auslösewerte, **prototypisch umgesetzt**):
Die eigentlichen Auslösewerte (I/Uci/t) sind feste Werte direkt am
RCD-Bauteil selbst (Spalten `tA`, `IA`, `UB` in `bauteile.md`, seit der
letzten Erweiterung auch in `anlage.json`s `rcd`-Objekt vorhanden), da das
Eigenschaften des RCD-Geräts sind, nicht des Pfades - keine Berechnung
nötig, nur eine Zuordnung.

Dieselbe Platzierungsvorgabe wie bei ZS (Schwarz auf L1/L2/L3, Grün auf PE,
Blau auf N), aber ANDERS als bei ZS an ZI angelehnt: geprüft werden BEIDE
Pfade zur Einspeisung (L UND N), PE bleibt weiterhin außen vor. 230V, wenn
beide Pfade geschlossen sind, sonst 0V. Grund für den Unterschied zu ZS: ein
FI/RCD-Prüfgerät speist sich selbst aus L UND N und injiziert darüber den
Fehlerstrom, braucht also beide Pfade als Vorbedingung - ZS dagegen misst
die L-PE-Schleife SELBST, die darf als Vorbedingung nicht schon intakt sein
müssen (**behobener Bug, User-gemeldet, testcase_06:** ursprünglich wurde
nur der L-Pfad geprüft, wie bei ZS kopiert - eine Schraube am N-Eingang
eines RCD zu lösen änderte die Anzeige dadurch fälschlich nicht). Der
Pfeil-Kasten unten links folgt derselben Logik: undurchgestrichen, solange
beide Pfade bereit sind, sonst durchgestrichen - **liegt er durchgestrichen,
bleibt TEST komplett wirkungslos**, wie bei ZS/ZI.

**Anders als bei ZI/ZS wird kein Widerstand summiert**, sondern das erste
RCD auf dem Weg von der Sonde zur Einspeisung gesucht (nächstgelegenes zur
Sonde, nicht das erste ab der Einspeisung aus gesehen - explizite
User-Vorgabe) und dessen `tA`/`iA`/`uB` direkt übernommen: `I` in der Mitte
(Hauptwert, mA), `Uci` unten links (V), `t` unten rechts (ms), je eine
Nachkommastelle. **Wird kein RCD auf dem Pfad gefunden** (Pfad existiert,
aber ohne RCD-Kante dazwischen), bleiben alle drei Felder auf dem
`___`-Platzhalter, aber die Ampel (dieselben Leuchtstreifen wie bei
RISO/ZI/ZS) geht trotzdem auf **Rot** - ein eigener Fehlerfall ("keine
RCD-Absicherung auf diesem Pfad gefunden"), zu unterscheiden vom
"Pfeil-Kasten durchgestrichen"-Fall oben, der die Ampel unangetastet lässt.
Wird ein RCD gefunden, geht die Ampel auf **Grün** - zusätzlich öffnet sich
in diesem Fall automatisch der Hebel des gefundenen RCD (visuell UND im
Verbindungsgraphen, über dasselbe programmatische Umschalten wie ein echter
Mausklick, siehe "Schalter" oben) - genau wie beim echten Gerät löst ein
erfolgreicher RCD-Test das Gerät tatsächlich aus. Die Spannungsanzeige fällt
dadurch beim nächsten Render live auf 0V zurück (der Pfad ist jetzt
unterbrochen), die übernommenen Messwerte und die grüne Ampel bleiben aber
im Display stehen - sie gehören zum abgeschlossenen Messvorgang, nicht zur
Live-Spannungsanzeige.

**V~** (reine Spannungsmessung, **umgesetzt**):
Anders als bei RISO/ZI/ZS/FI-RCD gibt es bei V~ **keine Platzierungsvorgabe** -
die drei Messspitzen dürfen auf beliebige Netze gesetzt werden, es wird keine
L/N/PE-Rolle geprüft. Es gibt außerdem **keine TEST-Taste-Interaktion**: alle
drei Werte sind live berechnet und aktualisieren sich sofort bei jeder
Messspitzen-Änderung. Angezeigt werden drei Zeilen im Hauptwertbereich
(Label + Wert, kein Umschalten über ◄►):

- **Uln** – Spannung zwischen Schwarz und Blau
- **Ulpe** – Spannung zwischen Schwarz und Grün
- **Unpe** – Spannung zwischen Blau und Grün

Jedes Adernpaar wird über dieselbe Klassifikation wie bei RISO
(`risoPaarTyp()`, siehe oben) ausgewertet: liegen beide Sonden auf
verschiedenen Außenleitern (L-L), zeigt das Paar 400V; liegt eine Sonde auf
einem Außenleiter und die andere auf N oder PE (L-N), zeigt es 230V - jeweils
nur, wenn beide beteiligten Netze auch tatsächlich mit der Einspeisung
verbunden sind (`istSpannungFuehrend()`), sonst 0V. Fehlt eine der beiden
Sonden für ein Paar, ist der Wert ebenfalls 0V. **Unpe (Blau-Grün, also N
gegen PE) zeigt in einer gesunden Anlage immer 0V**: `risoPaarTyp()`
verlangt, dass mindestens eine der beiden Adern auf einem Außenleiter (L1/L2/
L3) liegt, um ein Paar überhaupt zu klassifizieren - ein reines N/PE-Paar
erfüllt das nie und fällt dadurch auf 0V zurück. Das ist elektrisch
korrekt (N und PE sind am Sternpunkt verbunden), ergibt sich hier aber als
Nebeneffekt der bestehenden RISO-Logik statt aus einem eigenen N-PE-Fall.

Implementiert über eine gemeinsame Hilfsfunktion `berechneSpannungZwischenAdern()`,
die RISOs bisherige Schwarz/Blau-Spannungsberechnung auf ein beliebiges
Adernpaar verallgemeinert - RISO ruft sie weiterhin nur für Schwarz/Blau auf,
V~ dreimal für alle drei Paare.

**Phasenfolge-Anzeige (Status: umgesetzt, Teil von V~, kein eigener
Drehknopf-Punkt).** Zeigt die Drehfeldrichtung an - wichtig bei der
Drehstromsteckdose (Rechtsdrehfeld-Prüfung). Nur sichtbar, wenn Schwarz,
Blau UND Grün jeweils auf einer VERSCHIEDENEN Phase (L1/L2/L3) liegen und
alle drei noch mit der Einspeisung verbunden sind (Spannung liegt an) -
liegen zwei Sonden auf derselben Phase, gibt es keine sinnvolle
Drehfeldrichtung, also keine Anzeige (null). Zwei mögliche Werte:
- **"1.2.3."** bei den drei ZYKLISCHEN Rotationen von L1→L2→L3
  (Schwarz=L1/Blau=L2/Grün=L3; Schwarz=L2/Blau=L3/Grün=L1; Schwarz=L3/
  Blau=L1/Grün=L2) - Schwarz→Blau→Grün folgt der "aufsteigenden" Reihenfolge.
- **"3.2.1."** bei den restlichen drei (umgekehrten) Zuordnungen.

Algorithmisch reicht der Abstand von Schwarz zu Blau (mod 3, mit
L1=0/L2=1/L3=2): `(index(blau) - index(schwarz) + 3) % 3 === 1` → "1.2.3.",
sonst "3.2.1." (`berechnePhasenfolge()` in `controller/app.js`) - Grün ist
durch die beiden anderen bereits eindeutig festgelegt (drei verschiedene
Phasen, keine vierte Möglichkeit), muss also nicht separat geprüft werden.
Nutzt ausschließlich bereits bestehende Bausteine (`messspitzenAderNachFarbe()`,
`istSpannungFuehrend()`) - keine neuen Grundfunktionen nötig.

Darstellung in `view/messgeraet.js` `zeichneDisplay()`: oben rechts im
Display, direkt unter dem oberen grauen Strich (`x + breite - 8`,
text-anchor `end`, `y: linieObenY + 16`) - im selben Codepfad wie die
Uln/Ulpe/Unpe-Zeilen (`zustand.hauptwertZeilen`), aber unabhängig davon
positioniert (kein zusätzlicher Platzbedarf innerhalb der drei Zeilen).

**Getestet in `test_messgeraet.js`** (10 Tests). Sechs generische Tests (mit
`testcase_04`, direkt am Schaltkasten): zwei zyklische Fälle liefern "1.2.3."
(Schwarz=L1/Blau=L2/Grün=L3 UND Schwarz=L2/Blau=L3/Grün=L1), ein umgekehrter
Fall liefert "3.2.1." (Schwarz=L1/Blau=L3/Grün=L2), zwei Sonden auf derselben
Phase zeigen keine Anzeige, Grün auf N statt einer Phase zeigt keine Anzeige,
und die Anzeige verschwindet, sobald der Hauptschalter geöffnet wird (keine
Spannung mehr). Zusätzlich vier `testcase_05`-Tests, alle über die
Drehstromsteckdose selbst gemessen (nicht direkt am Schaltkasten, Kontakt-
Reihenfolge 0=PE/1=L1/2=L2/3=L3/4=N): die restlichen zwei der drei
zyklischen Rotationen (Blau=L1/Grün=L2/Schwarz=L3 und Grün=L1/Schwarz=L2/
Blau=L3, beide "1.2.3." und alle drei Paare 400V), eine der drei umgekehrten
Zuordnungen (Grün=L1/Blau=L2/Schwarz=L3 → "3.2.1.", ebenfalls 400V überall),
und Hauptschalter offen an der Drehstromsteckdose (alle drei Paare fallen
auf 0V, keine Phasenfolge-Anzeige mehr).

### Konfigurierbare Parameter

- **`vorimpedanz`** – feste Basisimpedanz der Trafostation/Einspeisung, die bei jeder
  Zi/Zs-Berechnung automatisch mit einfließt (reale Schleifenimpedanz ist nie 0, auch
  ohne jeden Fehler). **Umgesetzt für ZI:** fester Wert `0,14Ω`
  (`ZI_VORIMPEDANZ` in `controller/app.js`) - noch kein Netzplan-Feld, analog
  zu `rlowKalibrierterWiderstand` bei RLOW.
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

## Prüfprotokoll (View-Objekt)

**Status: erste Ausbaustufe umgesetzt** (rein ein-/ankreuzbar). Drittes
View-Objekt neben Schaltkasten und Messgerät, unter Letzterem platziert
(`#protokoll`, `view/protokoll.js`). Inhalt folgt 1:1
`docs/referenz/Prüfprotokoll.md` (alle Felder/Abschnitte), Optik ist an
`docs/referenz/Prüfprotokoll.pdf` angelehnt (umrandetes Formularblatt,
☐-Kästchen zum Ankreuzen) - kein Pixel-genauer Nachbau, sondern derselbe
"amtliches Formular"-Charakter (schwarzer Rahmen, kompakte Tabellen,
Ankreuzkästchen).

**Breite:** identisch zur tatsächlich gerenderten Schaltkasten-Breite (wie
schon beim Messgerät) - `ProtokollView.render(container, breitePx)` bekommt
die Breite von `controller/app.js` durchgereicht (`schaltkastenSvg.
getAttribute('width')`), damit alle drei View-Objekte bündig übereinander
stehen. **Höhe** wächst frei nach unten, je nach Inhalt.

**Aufbau:** anders als Schaltkasten/Messgerät (reines SVG, siehe oben) baut
`view/protokoll.js` mit normalen HTML-Elementen (Tabellen, `<input>`,
klickbare ☐/☒-Spans) statt SVG - echte Texteingabe braucht native
Eingabefelder, SVG ist dafür das falsche Werkzeug. Einziges andere
HTML-basierte View im Projekt: `view/popup.js`.

Abschnitte (Reihenfolge und Feldnamen exakt wie in `Prüfprotokoll.md`):
Kopfdaten, Netz, Besichtigen (14 Prüfpunkte, i.O./n.i.O./Bemerkung),
Erproben (7 Prüfpunkte, gleiches Schema), Erdung/Potentialausgleich (16
Prüfpunkte, eine Wert-Spalte statt i.O./n.i.O.), Verwendete Messgeräte (3
Zeilen), Messen – Stromkreisverteiler (20 Spalten, 11 Zeilen, erste Zeile
mit "Hauptleitung" vorausgefüllt), Prüfergebnis, Abschluss – Auftraggeber/
Prüfer, und als eigenes zweites Blatt Seite 2 (Übergabe-/Zustandsbericht:
Mängel/Beurteilung als je 11 linierte Zeilen, plus dieselben
Abschluss-Felder wie Seite 1).

**Messen – Stromkreisverteiler braucht horizontalen Scroll:** 20 Spalten
passen bei Schaltkasten-Breite nicht nebeneinander - die Tabelle sitzt in
einem eigenen `overflow-x: auto`-Container (`.pf-scroll`), unabhängig vom
Rest des Blatts, das selbst nicht seitlich scrollt.

**Ankreuzen:** jedes ☐/☒-Kästchen ist ein eigenständiger Span mit
Klick-Listener (Event-Delegation auf dem Wurzel-Container), togglet
unabhängig von jedem anderen Kästchen - bewusst **kein Radio-Verhalten**,
auch nicht innerhalb einer Options-Gruppe wie "Netzform" (TN-C/TN-S/...).
Mehrfachauswahl-Einschränkung, Verknüpfung mit echten Messwerten aus dem
Messgerät, und Validierung sind explizit **nicht** Teil dieser ersten
Ausbaustufe - "die einzige Funktion" ist Eintragen/Ankreuzen, laut
User-Vorgabe. Spätere Erweiterung möglich.

---

## Steckdosen (View-Objekt)

**Status: umgesetzt** (Zeichnung, Popup UND Messspitzen-Mechanismus).
Viertes View-Objekt, **oberhalb** des Schaltkastens platziert
(`#steckdosen`, `view/steckdosen.js`) - zeigt Steckdosen, Anschlussdosen
(3 Steckklemmen, für Lichtauslass-Endstellen), Drehstromsteckdosen
(5-poliger CEE-Kontakt, für dreiphasige Festanschlüsse) und 5-polige
Anschlussdosen (feste Verdrahtung statt Stecker, z.B. für einen
Herdanschluss) der Anlage in einem Raster, wie in `bauteile.md` festgelegt.

**Platzierungstabelle:** neue Sektion `## Steckdosen (Platzierung)` in
`bauteile.md`, direkt unter der Stromkreise-Tabelle - ein Raster, bei dem
jede Zelle entweder `–` (leer) oder eine SK-Nummer trägt, optional mit
`@<Winkel>`-Suffix (90/180/270, im Uhrzeigersinn, 0° = kein Suffix). Zwei
Zusatzspalten/-zeilen ("Spalte 1"/"Reihe 1" usw.) sorgen nur dafür, dass die
bedeutungslose Markdown-Kopfzeile nicht über den echten SK-Werten fett
erscheint. Mehrfaches Vorkommen derselben SK-Nummer = mehrere
Steckdosen/Anschlussdosen an derselben Endstelle. Der Endstellen-**Typ**
(Steckdose vs. Anschlussdose) steht **nicht** in dieser Tabelle, sondern wird
beim Rendern über die SK-Nummer in der schon vorhandenen `## Stromkreise`-
Tabelle nachgeschlagen (`stromkreis.endstelle`, `"Steckdose"` oder
`"Lichtauslass"`) - keine Redundanz.

`generate_anlage.js` (`parseSteckdosenPlatzierung()`) parst diese Tabelle in
`anlage.steckdosen_platzierung` (Array aus `{row, col, sk, rotation}`) - kein
eigenes Bauteil im Verbindungsgraphen, reine Layout-Information fürs View.

**Zeichnung:** Vorlagen `docs/referenz/steckdose_vorlage.svg`,
`docs/referenz/anschlussdose_vorlage.svg`,
`docs/referenz/drehstromsteckdose_vorlage.svg` und
`docs/referenz/herdanschlussdose_vorlage.svg` (mit Playwright exakt
vermessen bzw. direkt aus der Vorlage abgeleitet, alle Maße in mm), im
selben Maßstab wie der Schaltkasten (1mm = 2px, siehe "Maßstab") direkt mit
`svgEl()`-Grundformen nachgebaut (kein eingebettetes Bild). Alle vier
Vorlagen haben ihre grauen (und bei Anschlussdose/Drehstromsteckdose/
5-poliger Anschlussdose auch farbigen bzw. dunkelroten) Kontaktkreise
bewusst auf denselben realen Radius wie die Reihenklemmen-Schraube skaliert
(r=2mm). Rotation (`@<Winkel>`) wird als SVG-`rotate()` um das
Gerätezentrum umgesetzt.

**Drehstromsteckdose (Status: umgesetzt, siehe `testcase_05`):**
5-poliger CEE-Kontakt für dreiphasige Festanschlüsse - drei konzentrische
Ringe (rot außen, schwarz, hellrot innen), ein schwarzer Halbkreis als
Führungsnase unten (rein optisch), ein dekorativer Mittelpunkt ohne
Funktion, und 5 funktionale Kontakte im exakten 72°-Abstand: PE unten, im
Uhrzeigersinn L1/L2/L3/N (`DREHSTROM_KONTAKTE` in `view/steckdosen.js`,
Reihenfolge entspricht der Zeichenreihenfolge im DOM). Die Vorlage selbst ist
mit 99mm Außendurchmesser gezeichnet (Vorbild: reales rotes CEE-Gehäuse),
würde die 95mm-Raster-Zelle aber knapp überschreiten - deshalb um den Faktor
0,85 auf 84,15mm Außendurchmesser herunterskaliert (User-Entscheidung: die
Vorlage verkleinern statt das Raster für alle Testcases zu vergrößern). Der
klickbare Kontaktradius bleibt bewusst bei den realen 2mm (nicht
mitskaliert). In `bauteile.md` wird der Typ über `stromkreis.endstelle ===
"Drehstromsteckdose"` ausgewählt (analog zu `"Steckdose"`), alle anderen
Werte (inkl. `"Festanschluss"`) fallen weiterhin auf die Anschlussdose
zurück.

**5-polige Anschlussdose (Status: umgesetzt, siehe `testcase_06`):** feste
Verdrahtung statt Stecker (z.B. für einen Herdanschluss) - quadratisches
Gehäuse (89mm Kantenlänge, leicht abgerundete Ecken) mit 5 Wago-Klemmen
(`HERD_KLEMMEN` in `view/steckdosen.js`) in zwei Reihen wie in der
Vorlage: oben N/PE/L1, unten L3/L2 (keine kreisförmige 72°-Anordnung wie bei
der Drehstromsteckdose - hier keine Steckverbindung mit Führungsnase nötig).
Jede Klemme besteht wie schon bei der 3-Klemmen-Anschlussdose aus grauem
Kontaktkreis (klickbar, r=2mm) + farbigem Kennzeichnungskreis (nicht
klickbar, rein dekorativ) + zwei orangenen Klemmdeckeln. Die
Kennzeichnungsfarben stammen 1:1 aus der User-Vorlage und weichen bewusst
von der sonst im Projekt üblichen Aderfarben-Konvention ab (dort L1=schwarz/
L2=braun/L3=grau, hier laut User-Vorgabe L1=braun(`#806600`)/L2=schwarz/
L3=hellgrau(`#b3b3b3`), N=blau, PE=grün) - reine, unabhängige
Bauteil-Kennzeichnung, keine Aderfarbe. Die Vorlage
(`docs/referenz/herdanschlussdose_vorlage.svg`) wurde vom User bereitgestellt
(`herdanschlussdose.svg`, eine reale Herdanschlussdose) und iterativ bereinigt:
alle 5 Klemmen-Blöcke hatten in der Referenz bereits identische
Innen-Geometrie (Kappen/Kreise relativ zum Block-Mittelpunkt), nur die
Block-Mittelpunkte selbst waren nicht sauber pro Reihe ausgerichtet - jetzt
liegen alle Blöcke einer Reihe exakt auf derselben Höhe (verifiziert per
gerenderten Pixel-Koordinaten, nicht nur SVG-Attributen). Das 89mm-Gehäuse
passt ohne Skalierung in die 95mm-Raster-Zelle (bei den unterstützten
Rotationswinkeln 0/90/180/270 bleibt die quadratische Grundfläche
unverändert - anders als z.B. bei 45°, das aber ohnehin kein gültiger
Wert ist). Ausgewählt über `stromkreis.endstelle === '5-polige
Anschlussdose'` (dritter spezifischer Zweig neben `'Steckdose'` und
`'Drehstromsteckdose'`, alle anderen Werte fallen weiterhin auf die
3-Klemmen-Anschlussdose zurück). `testcase_06` (3-poliger LS ohne RCD)
nutzte anfangs `Festanschluss` als Platzhalter-Endstelle, wurde nach
Fertigstellung der Vorlage umgestellt - Messwerte über die neuen Kontakte
stimmen exakt mit den direkt am Schaltkasten gemessenen überein.

**Kontaktpunkte sind klickbar** (graue Kreise/Vierecke - der farbige
Kennzeichnungskreis an der Anschlussdose NICHT), genau wie eine
Reihenklemmen-Schraube - und teilen sich denselben Klick-Callback wie der
Schaltkasten (`onSchraubeKlick` in `controller/app.js`, einmal definiert, an
beide Views durchgereicht). `anlage.json` trägt pro Stromkreis unter
`sk.leitung.adern` bereits dieselben Netz-IDs wie die `Endstelle_SKx`-Knoten
im Verbindungsgraphen, deshalb ist keine eigene Anbindung nötig: bei
ausgeschaltetem Messgerät zeigt ein Klick Querschnitt/Farbe (Popup, wie am
Schaltkasten); bei eingeschaltetem Messgerät legt ein Klick eine Messspitze
an (Farbzyklus, Overlay) - und **echte Messwerte funktionieren sofort**, da
`findePfad()`/`berechneWiderstand()` etc. ohnehin nur über die Netz-ID der
Ader gehen, unabhängig davon, ob die Messspitze am Schaltkasten oder an
einer Steckdose sitzt (z.B. Uln=230V zwischen den L/N-Kontakten derselben
Steckdose, siehe Test unten).

**Bug behoben - Messspitze auf PE-Kontakten falsch positioniert:** die
Overlay-Positionierung ging bisher immer von `cx`/`cy` des geklickten
Elements aus - das gilt für Reihenklemmen-Schrauben und die meisten
Steckdosen-Kontakte (alles `<circle>`), aber die beiden PE-Kontakte an der
Steckdose sind `<rect>`s (siehe "Zeichnung" oben) und haben kein `cx`/`cy`.
Die Messspitze landete deshalb bei (0,0), also oben links im Bild. Fix:
`schraubenMitte()` in `controller/app.js` berechnet den Mittelpunkt je nach
Element-Typ (`x+width/2`/`y+height/2` bei `<rect>`, sonst `cx`/`cy`).

**Raster:** jede Zelle ist `ZELLE_MM=95` mm (190px) groß - deckt die größere
der beiden Vorlagen (Steckdose, äußerer Rahmen ca. 79x76mm) plus Abstand.
Ohne Platzierungstabelle (z.B. die handgepflegte `beispiel_eg.json` ohne
`bauteile.md`) bleibt der Container leer und unsichtbar (`display: none`) -
kein Fehlerfall.

**Rahmen:** doppelte Umrandung (zwei ineinanderliegende, unterschiedlich
dunkel umrandete Linien, wie die äußere Box des Schaltkastens) um eine weiße
Gerätefläche. Die innere Rahmenlinie liegt **direkt** an dieser weißen
Fläche an (kein zusätzlicher grauer Rand dazwischen) - das leichte Grau
(`#eeeeee`) bleibt auf den schmalen Abstand zwischen äußerer und innerer
Rahmenlinie beschränkt (`RAHMEN_INSET = 8px`). Breite exakt wie der
Schaltkasten (`breitePx` von `controller/app.js` durchgereicht, wie schon
bei Messgerät/Protokoll). Da das Geräte-Raster meist schmaler als die weiße
Fläche ist, wird es darin horizontal zentriert; die Höhe wächst mit der
Zeilenzahl des Rasters.

**Linksbündig, direkt über dem Schaltkasten:** wie schon beim Prüfprotokoll
(siehe dort "Linksbündig, nicht zentriert") KEIN `display: flex;
justify-content: center` auf `#steckdosen` - das würde den Inhalt innerhalb
der vollen Body-Breite zentrieren statt innerhalb der (schmaleren)
Schaltkasten-Breite. `#steckdosen` bleibt im normalen Fluss linksbündig,
genau wie `#schaltkasten` selbst.

**Getestet in `tests/visuell/test_steckdosen.js`** (26 Tests): Container
bleibt ohne Platzierungstabelle unsichtbar; linke Kante steht (bei
absichtlich breiterem Viewport als die Schaltkasten-Breite) bündig unter der
Schaltkasten-Kante statt zentriert zu sein; Breite entspricht exakt der
gerenderten Schaltkasten-Breite; die orangenen Klemmdeckel jeder Wago-Klemme
sitzen jeweils nah über ihrem eigenen Kontaktkreis statt seitlich versetzt;
testcase_01 zeichnet die richtige Geräte-Mischung (2 Steckdosen +
1 Anschlussdose) und die Anschlussdose trägt die drei erwarteten
Kontaktfarben (Blau/Grün/Schwarz); testcase_02 dreht nur SK4 um 90°, alle
anderen bleiben bei 0°; testcase_03 zeichnet alle 6 Geräte im korrekten
2x3-Raster (Breite/Höhe stimmen mit `ZELLE_MM` überein); ein Klick auf einen
grauen Kontakt zeigt bei ausgeschaltetem Messgerät das Popup mit
Querschnitt/Farbe; an der Anschlussdose ist nur der graue Kontaktkreis
klickbar, der farbige Kennzeichnungskreis nicht; bei eingeschaltetem
Messgerät legt ein Klick eine Messspitze an (Overlay statt Popup); V~ über
die L/N-Kontakte derselben Steckdose zeigt echte 230V, ganz ohne
Zusatzarbeit am Verbindungsgraphen; eine Messspitze auf einem PE-Kontakt
(Rechteck statt Kreis) erscheint exakt mittig darauf statt oben links im
Bild (Regressionstest für einen Bug, siehe unten); testcase_03 - Messspitzen
an der oberen linken, um 180° rotierten Steckdose (blau links=N, schwarz
rechts=L, grün auf PE) finden RCD1 korrekt (230V vor TEST, nach TEST 0V,
Pfeil-Kasten durchgestrichen, Hebel öffnet) - deckt zusätzlich ab, dass die
Ader-Zuordnung auch bei rotierten Geräten stimmt; ZI: testcase_03 -
Messspitzen an der unteren rechten Anschlussdose (SK6) liefern nach TEST
Z:0,14Ω und Isc:1478,6A (230V/nicht durchgestrichen davor); RLOW: PE-Kontakt
der Steckdose + PE-Klemme im Schaltkasten (WORKAROUND, siehe "RLOW-Berechnung")
zeigt pauschal 0Ω; RLOW: PE-Kontakt der Anschlussdose (grün-Block) +
PE-Klemme im Schaltkasten zeigt ebenfalls pauschal 0Ω; RLOW: PE-Kontakt der
oberen Steckdose + PE-Kontakt der danebenliegenden Anschlussdose (beide
Sonden innerhalb des Steckdosen-Views, kein Schaltkasten-Kontakt beteiligt)
zeigt ebenfalls pauschal 0Ω; RLOW: obere Steckdose
(SK1@180) + mittlere linke Steckdose (SK3) durchlaufen in einem Testablauf
drei Sonden-Zustände
nacheinander (0,00Ω bei gleicher Funktion, `---` bei unterschiedlicher,
0,75Ω nach erneutem Wechsel zurück auf gleiche Funktion mit
Fehlertabellen-Eintrag) - deckt zusätzlich das "Umsetzen" einer Messspitze
über den Farbzyklus ab (alte Schraube erst zweimal klicken bis leer, dann
neue Schraube einmal klicken); RLOW: PE-zu-N-Workaround über den
Steckdosen-View (Anschlussdose blau=N + untere Steckdose PE) zeigt 0,00Ω bei
geschlossenen Schaltern, bleibt aber beim Platzhalter, sobald der
Hauptschalter ODER RCD1 einzeln geöffnet wird (drei Tests, dieselben Sonden,
unterschiedliche Schalterstellungen); testcase_05 - die Drehstromsteckdose
zeichnet genau 5 klickbare graue Kontakte plus 6 dunkelrote Kreise (5
Kontaktringe + 1 dekorativer Mittelpunkt); ein Klick auf jeden der 5
Kontakte in DOM-Reihenfolge zeigt im Popup nacheinander die erwartete
Aderfarbe (PE=gn-ge, L1=schwarz, L2=braun, L3=grau, N=blau) - belegt sowohl
die Zeichenreihenfolge (PE unten, im Uhrzeigersinn L1/L2/L3/N) als auch die
korrekte Ader-Zuordnung; testcase_06 - die 5-polige Anschlussdose zeichnet
genau 5 klickbare graue Kontakte und 5 farbige Kennzeichnungskreise in der
erwarteten Reihenfolge/Farbe (N/PE/L1/L3/L2); ein Klick auf jeden der 5
Kontakte in DOM-Reihenfolge zeigt im Popup die erwartete Aderfarbe (N=blau,
PE=gn-ge, L1=schwarz, L3=grau, L2=braun) - belegt sowohl die
Zeichenreihenfolge (zwei Reihen wie in der Vorlage) als auch die korrekte
Ader-Zuordnung.

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

**Beschriftung:** zweizeilig - Typ+Fehlerstrom (z.B. "A 30mA"), darunter der
Nennstrom (z.B. "40A", aus `nennstrom_a`) - reale RCDs sind immer mit beiden
Werten beschriftet. Nutzt denselben Array-Label-Mechanismus wie das
AFDD-Kombigerät (siehe "AFDD" unten, `geraet()`s `label`-Parameter).

**LS:**
```json
{
  "char": "B",
  "in": 16,
  "polig": 1,
  "te": 1,
  "afdd": false,
  "eingang": { "leitung": { ... } },
  "ausgang": { "leitung": { ... } }
}
```

**LS-Charakteristiken:** B, C, D, K, Z

**AFDD ("LS mit AFDD"-Kombigerät, testcase_05 Gruppe G2):** kein eigenes
Bauteil mit eigenen i/o-Pins, sondern ein Flag `ls.afdd: true` auf einem
2-poligen LS (`bauteile.md`-Spalte `AFDD` = `ja`). Baulich wie ein 2-poliger
RCD - `view/schaltkasten.js` zeichnet dieselbe Schalter-Bauform
(`schalterTyp: 'rcd'` statt `'einfach'`, gleiche TE-Breite) mit zweizeiliger
Aufschrift (LS-Charakteristik+Nennstrom, darunter "AFDD"). Elektrisch ein
normaler 2-poliger LS (`i1`/`o1` = L, `i2`/`o2` = N, siehe
`kantenFuerFunktion()` in `generate_anlage.js` - generisch über `pole`, kein
AFDD-Sonderfall nötig). Das Stromkreis-Feld `sk.phasen` bleibt trotz des
2-poligen Gehäuses ein 1-elementiges Array (nur die L-Phase zählt, der
N-Pol wird wie beim RCD gesondert behandelt, siehe `generiereAnlage()`).

> Noch **nicht** umgesetzt: eigenes RISO-Verhalten (AFDD-Elektronik müsste
> vor der Isolationswiderstandsmessung abgeklemmt werden, analog RCD Typ B/B+
> `abklemmen_bei_iso`) - bewusst zurückgestellt, siehe "Geplant für später"
> unten.

**Stromkreis:**
```json
{
  "nr": 1,
  "bezeichnung": "SK1",
  "ziel": "Steckdosen Wohnzimmer",
  "phasen": ["L1"],
  "ls": { ... },
  "endstelle": "Steckdose",
  "leitung": { "typ": "NYM-J", "adern": [ { "funktion": "L1", ... }, { "funktion": "N", ... }, { "funktion": "PE", ... } ] },
  "reihenklemmen_eingang": {
    "l": [ { "funktion": "L1", "farbe": "schwarz", "querschnitt_mm2": 2.5 } ],
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
siehe "Messgerät (INSTALLATIONSTESTER)" → "Berechnung der Messwerte".

`leitung` ist die Ausgangsseite der Reihenklemmen (das eine physische Kabel zur
Endstelle) – dieselbe Ader gilt für die untere Schraube aller Reihenklemmen mit
derselben Funktion. `reihenklemmen_eingang` ist die **Eingangsseite** und kann
davon abweichen: z.B. hat die PE-Reihenklemme oft **kein** eigenes Zubringerkabel
(PE kommt dann nur über den Hutschienen-Bond, siehe "Netzliste" → Hutschienen-Bond)
– in dem Fall ist `pe: null`, und die entsprechende Schraube im Rendering ist
unverbunden (keine `data-querschnitt`/`data-farbe`-Attribute, nicht anklickbar).
Fehlt das Feld `reihenklemmen_eingang` komplett (z.B. bei handgeschriebenen
Anlagen ohne Netzplan-Ursprung), fällt der Renderer auf die Ausgangsseite zurück.

**`reihenklemmen_eingang.l` ist immer ein Array** (eine Reihenklemme pro
Phase) – bei einem normalen einpoligen Stromkreis ein Array mit genau einem
Eintrag (siehe Beispiel oben), bei einem mehrpoligen LS (siehe "3-poliger
LS" unten) mit einem Eintrag pro Phase (`phasen`/`l` haben dann immer
dieselbe Länge). `n`/`pe` bleiben immer Singular-Werte, da Neutralleiter und
PE unabhängig von der Phasenzahl nur je einmal vorhanden sind.

**Endstellen:** Steckdose, Drehstromsteckdose, 5-polige Anschlussdose,
Festanschluss, Lichtauslass – freier String, keine Validierung in
`generate_anlage.js`. Nur `Steckdose`, `Drehstromsteckdose` und `5-polige
Anschlussdose` haben eine eigene Zeichnung im Steckdosen-View
(`SteckdosenView.render()`); alle anderen Werte (inkl. `Festanschluss`)
fallen auf die 3-Klemmen-Anschlussdose zurück (siehe "Steckdosen
(View-Objekt)").

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

Zusätzlich trägt das RCD-Bauteil eigene Messwerte (siehe "Messgerät (INSTALLATIONSTESTER)"
→ "Berechnung der Messwerte"), da diese am Gerät selbst hängen, nicht am Pfad:
- **RCD**: Spalten `tA` (Abschaltzeit), `IA` (Auslösestrom), `UB` (Berührungsspannung)

Der Kurzschlussstrom ($I_{sc}$/$I_k$, Fehlerquelle #3) braucht keine eigene Spalte –
er ergibt sich direkt aus der berechneten Impedanz (Zi/Zs) per
$I_{sc} = 0{,}9 \times 230V / Z$ (siehe "Berechnung der Messwerte").

Welche Werte in diesen Spalten überhaupt gültig sind (z.B. gültige LS-Charakteristiken,
RCD-Typen, genormte Nennstrom-Reihen), steht zentral in
**`docs/referenz/bauteilwerte.md`** – gilt für alle Testcases, nicht pro Testcase
wiederholt.

## Pfadverfolgung und Fehlersimulation

**Status: umgesetzt (für RLOW, prototypisch auch RISO/ZI/ZS).** Ersetzt den
früheren Ansatz "Widerstand als eigenes Bauteil in der Netzliste" (zu
umständlich – jeder Fehler hätte den Netzplan selbst verändert). Stattdessen:
ein separater **Verbindungsgraph**, der Pfade zwischen zwei Schrauben sucht,
unter Berücksichtigung von Schalterstellungen und optionalen
Fehler-Widerständen. Umgesetzt: Graph-Generierung (siehe unten) inkl.
Ausgabedatei (`graph.json` pro Testcase), Anbindung ans Messgerät für RLOW
(Messspitzen setzen, Pfad wird live verfolgt, siehe "Messmodus" und
ARCHITEKTUR.md), Schalterzustand (LS/RCD/Hauptschalter klickbar, siehe
"Schalter" unten - schaltet `kante.geschlossen` live um, RLOW reagiert
sofort darauf), die Fehlertabelle (siehe unten - Fehler-Widerstände pro
Netz, `berechneWiderstand()` summiert sie über den gefundenen Pfad), sowie
die Einspeisungs-Erreichbarkeit pro Netz (`graph.einspeisung` +
`istSpannungFuehrend()`, für RISOs Live-Spannungsprüfung und für ZI/ZS'
Pfadsuche zur Einspeisung gleichermaßen genutzt, siehe "Berechnung der
Messwerte").

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
Funktion ist klein genug für eine gepflegte Duplizierung). RLOW, RISO, ZI und
ZS nutzen das bereits (siehe "Messmodus").

### Schalter (LS, RCD, Hauptschalter)

**Status: umgesetzt** (für RLOW, RISO, ZI und ZS gleichermaßen - siehe
"Berechnung der Messwerte" oben, jeder Schalter-Klick wirkt sich sofort auf
alle Pfadsuchen aus, unabhängig von der aktuell gewählten Messfunktion). Das
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
  referenzieren. Dieselbe Kantenbildung ist komponenten-agnostisch (läuft
  generisch über `bauteil.pole`, egal ob RCD/LS/Hauptschalter) - der
  3-polige LS (siehe unten) brauchte hier deshalb **keine** Änderung.

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

**Programmatisches Umschalten (Status: umgesetzt).** Bis vor Kurzem konnte
ein Hebel nur per Mausklick umschalten - `zeichneSchalter()` hielt Zustand
und Rotation rein lokal, ohne Weg für `app.js`, von außen einzugreifen.
`SchaltkastenView.render()` gibt jetzt zusätzlich `schalterHandles`
zurück, eine `Map<bauteilName, {setGeschlossen(bool)}>` mit einem Eintrag
je Schalter-Bauteil (RCD/LS/Hauptschalter). `setGeschlossen(neu)` löst
denselben `onKlick`-Callback aus wie ein echter Mausklick (App und Graph
erfahren also von einem programmatischen Umschalten genauso wie von einem
Mausklick - **beides sind Ereignisse, die über denselben Pfad laufen**,
kein zweiter, paralleler Zustand) und ist ein No-op, wenn der Zielzustand
bereits erreicht ist. Erster Nutzer: FI/RCD öffnet nach einem erfolgreichen
TEST automatisch den Hebel des gefundenen RCD (`fircdTestKlick()`, siehe
"Berechnung der Messwerte" - Abschnitt "FI/RCD"). Nebenbei behoben: der
Hebel wurde beim Zeichnen bisher immer hart auf "geschlossen" initialisiert,
unabhängig vom tatsächlichen Ausgangszustand - `zeichneSchalter()` akzeptiert
jetzt einen `initialGeschlossen`-Parameter (Default weiterhin `true`, aktuell
nirgends anders befüllt, aber die Voraussetzung für künftige Testcases, die
mit einem bereits offenen Schalter starten).

### 3-poliger LS

**Status: umgesetzt** (siehe `testcase_05`). Ein 3-poliger LS verhält sich
grafisch wie ein 4-poliger RCD: **eine** Schalter-Box mit **einem** Hebel, der
aber über drei Eingangs- und drei Ausgangsschrauben liegt (statt vier bei
einem 4-poligen RCD ohne N-Schaltung, bzw. drei Ein-/Ausgänge ohne eigenen
N-Pol). Er sitzt normalerweise hinter einem 3-poligen RCD und schützt **einen**
dreiphasigen Stromkreis (nicht drei unabhängige einphasige) – Input 1/2/3 sind
L1/L2/L3, die zusammen zu einer Endstelle führen (z. B. ein Festanschluss oder
eine Drehstromsteckdose, siehe "Steckdosen (View-Objekt)" oben). Reihenfolge
und Mischung auf der Hutschiene
sind frei: 1-polige und 3-polige LS dürfen beliebig gemischt und in beliebiger
Reihenfolge hinter einem RCD stehen, solange die TE-Breite passt.

Da `geraet()` (`view/schaltkasten.js`) die Schrauben bereits generisch über
`teAnzahl` zeichnet und `schalterBreite()` die Breite bereits generisch aus
`teAnzahl` berechnet (beides schon für den 3-poligen Hauptschalter aus
testcase_04 gebaut, siehe "Mehrphasige Anlagen" oben), und da die
Graph-Kantenbildung ebenfalls generisch über `bauteil.pole` läuft (siehe
"Schalter (LS, RCD, Hauptschalter)" oben), brauchte die reine Darstellung und
Verdrahtung **keine** Codeänderung. `TE_TABELLE['LS-3']` (`generate_anlage.js`)
war bereits vorhanden, nur ungenutzt.

Die echte Lücke war der Gruppe→Stromkreis→LS-Baustein in
`generate_anlage.js`: der ging bisher von genau einer Phase pro Stromkreis
aus (`phase` als einzelner String, verwendet für `ls.eingang/ausgang`,
Endstelle-Pins und `reihenklemmen_eingang`). Er wurde auf ein `phasen`-Array
verallgemeinert (`for (let i = 1; i <= (ls.pole ?? 1); i++)`, ein Eintrag je
Pol des LS). Daraus folgen drei konkrete Konventionen:

- **Reihenklemmen:** ein dreiphasiger Stromkreis bekommt **drei separate,
  normale einphasige Reihenklemmen** (kein neuer, verbreiterter
  Bauteil-Typ), benannt `Reihenklemme_L1_<SK>` / `_L2_<SK>` / `_L3_<SK>`
  (Suffix nur bei mehr als einer Phase – ein normaler einphasiger Stromkreis
  bleibt bei `Reihenklemme_L_<SK>`, unverändert). `reihenklemmen_eingang.l`
  ist deshalb immer ein Array (siehe Konvention weiter oben), eines pro
  Phase; `n`/`pe` bleiben Singular. Diese drei Reihenklemmen werden auf der
  Hutschiene bewusst nebeneinander gruppiert (wie testcase_04s drei
  einpolige LS), damit optisch klar bleibt, dass sie zu einem Stromkreis
  gehören.
- **Endstelle-Pins:** von der festen `i1`=Phase/`i2`=N/`i3`=PE-Konvention auf
  eine dynamische `[...phasen, 'N', 'PE']`-Indizierung verallgemeinert –
  bei drei Phasen also `i1`=L1, `i2`=L2, `i3`=L3, `i4`=N, `i5`=PE.
- **`ls.polig`/`ls.te`** werden aus `ls.pole` bzw. `TE_TABELLE['LS-'+ls.pole]`
  übernommen, genau wie beim Hauptschalter.

Für `testcase_05` wurde bewusst dieselbe Netz-Nummerierung und dieselben
Fehlertabellen-Werte wie in `testcase_04`s drei einpoligen LS wiederverwendet
– dadurch liefert ZS für L1/L2/L3 exakt dieselben Werte
(Z:0,54Ω/Isc:383,3A, Z:0,67Ω/Isc:309,0A, Z:0,63Ω/Isc:328,6A) wie testcase_04s
SK1/SK2/SK3, was als starke Korrektheits-Bestätigung diente statt neue,
unabhängig zu verifizierende Werte zu erfinden. Die Endstelle in
`testcase_05` ist eine `Drehstromsteckdose` (siehe "Steckdosen
(View-Objekt)" oben) mit einer eigenen Steckdosen-Platzierungstabelle -
ursprünglich war hier bewusst `Festanschluss` ohne Platzierungstabelle
gewählt worden (Drehstromsteckdosen-Vorlage existierte noch nicht), nach
deren Fertigstellung wurde `testcase_05` auf `Drehstromsteckdose`
umgestellt (reine Metadaten-/Platzierungsänderung, Verbindungsgraph
unverändert - siehe Diff-Verifikation in "Rückwärtskompatibilität" unten,
analog).

**Rückwärtskompatibilität:** die vier bestehenden Testcases (01-04) wurden
mit `generate_anlage.js` neu generiert und ihre `anlage.json` ersetzt – der
einzige Unterschied war die neue Array-Form von `reihenklemmen_eingang.l`
(vorher ein einzelnes Objekt, jetzt ein 1-elementiges Array), keine
Verhaltensänderung (bestätigt per Diff und per vollem Testlauf).

**Behobener Bug (User-gemeldet, 2026-07-24): RCD1s rechte Schrauben (L2/L3/N)
in `testcase_05` waren nicht anklickbar.** Ein vorgeschaltetes RCD bekommt
seine eigenen Eingangs-/Ausgangsadern über `rcdFunktionen` (`generate_anlage.js`,
`baueLeitung(netze, rcd.name, 'i'/'o', rcdFunktionen)`), zusammengesetzt aus
`vorkommendePhasen` - allen L-Phasen, die IRGENDEIN Stromkreis der Gruppe
tatsächlich nutzt (plus `N`). Der Fehler: `vorkommendePhasen` prüfte nur
`sk.phasen[0]` (das erste Element), nicht das ganze Array - korrekt für
testcase_04s Szenario (drei SEPARATE einphasige Stromkreise, ein 4-poliges
RCD, jeder mit `phasen: ['L1']`/`['L2']`/`['L3']`), aber falsch für
testcase_05s Gruppe G1 (EIN dreiphasiger 3-poliger LS1 mit `phasen: ['L1',
'L2', 'L3']` als ganzes Array in einem einzigen Stromkreis) - `sk.phasen[0]`
liefert dort immer nur `'L1'`, L2/L3 blieben unentdeckt. Sichtbare Folge:
RCD1 bekam nur eine Eingangs-/Ausgangsader (L1) statt vier, `geraet()`
(`view/schaltkasten.js`) zeichnete die drei rechten Schrauben-Spalten
(L2/L3/N) dadurch ohne zugehörige Ader - `schraube()` hängt ohne `ader`
keinen Klick-Handler an (siehe "Schrauben lösen" oben, dieselbe Funktion),
die Schrauben blieben also klicklos stehen. Der zugrundeliegende
Verbindungsgraph selbst war davon nicht betroffen (`kantenFuerFunktion()`
läuft unabhängig über `GRAPH_FUNKTIONEN`/`bauteil.pole`, nicht über
`rcdFunktionen`) - reiner Rendering-/Bedienbarkeits-Bug, keine falschen
Messwerte. Fix: `sk.phasen.includes(p)` statt `sk.phasen[0] === p`. Nur
`testcase_05`/`testcase_06` betroffen (einzige Testcases mit einem
mehrpoligen LS als einzigem Gruppenmitglied) - `testcase_06`s Änderung war
rein kosmetisch (das unbenutzte `gruppe.phase`-Feld, G1 dort hat kein RCD).

**3-poliger LS ohne RCD (`testcase_06`, Status: umgesetzt):** ein 3-poliger
LS muss nicht zwingend hinter einem RCD sitzen – manchmal hängt er direkt
hinter der Hauptsicherung. Dabei kam ein Bug in `generate_anlage.js` zutage:
die Gruppen-Konstruktion suchte `rcd = mitglieder.find(b =>
b.name.startsWith('RCD'))`, fand aber bei einer Gruppe ohne RCD-Bauteil
`undefined` – der anschließende, ungeprüfte Zugriff auf `rcd.name`/`rcd.typ`
warf einen TypeError. `view/schaltkasten.js` hatte diesen Fall dagegen
bereits vorgesehen (`if (gruppe.rcd) {...}`, überspringt die RCD-Box), nur
der Generator-Pfad fehlte – er wurde vorher nie durchlaufen, da alle
bisherigen Testcases in jeder Gruppe ein RCD hatten. Fix: der `rcd`-Block
wird jetzt nur gebaut, wenn ein RCD-Mitglied existiert (`rcd: rcd ? {...} :
null`), und die Hutschienen-Zuordnung (`_tabelle`) wird über alle
Gruppen-Mitglieder statt nur über das RCD ermittelt (funktioniert dadurch
unabhängig davon, ob ein RCD existiert). `testcase_06` ist strukturell
identisch zu `testcase_05` (derselbe 3-polige Hauptschalter, derselbe
3-polige LS1 für einen dreiphasigen Stromkreis), aber LS1 hängt direkt an
den Hauptschalter-Ausgängen statt an einem RCD-Ausgang – die
Fehlertabellen-Werte sitzen dadurch nur noch auf einer Stufe (LS1-Ausgang)
statt zwei. Endstelle ist eine `5-polige Anschlussdose` (siehe "Steckdosen
(View-Objekt)" oben) mit eigener Steckdosen-Platzierungstabelle - anfangs
war hier bewusst `Festanschluss` ohne Platzierungstabelle gewählt worden
(Vorlage existierte noch nicht), nach deren Fertigstellung wurde auf
`5-polige Anschlussdose` umgestellt, analog zu `testcase_05`s Vorgehen bei
der Drehstromsteckdose.

Zusätzlich trägt `testcase_06` (auf Wunsch, um einen ZI-Testcase zu
erweitern - diesen Fall gab es vorher in keinem Testcase) einen
Fehlertabellen-Eintrag auf der N-Reihenklemme (`Reihenklemme_N_SK1.o1` →
`Endstelle_SK1.i4`, Netz N26, 0,17Ω). Da ZI (anders als ZS, siehe "ZS"
unten) den N-Pfad explizit mitsummiert, liefert ZI mit Schwarz auf L1 + Blau
auf N `Z:0,51Ω` (Fehlertabelle N20=0,20Ω + N26=0,17Ω + Vorimpedanz 0,14Ω).

**Zweite Gruppe G2 (RCD2, 2-polig, + LS2/LS3, je 1-polig) auf derselben
Hutschiene wie G1:** ein normaler einphasiger Fall (analog `testcase_01`,
1 RCD + 2 LS), zusätzlich in `testcase_06` ergänzt, um zu zeigen, dass eine
Gruppe ohne RCD (G1) und eine Gruppe mit RCD (G2) problemlos auf derselben
Hutschiene koexistieren. RCD2 ist 2-polig (L1+N) - ein bereits etabliertes,
vielfach getestetes Bauteil (kein neuer Code-Pfad nötig, anders als die
eingangs erwogene, nie umgesetzte 3-polige-RCD-Idee). RCD2 zapft denselben
Hauptschalter-Ausgang (N9, L1) und dieselbe ungeschaltete N-Ader (N12) an
wie LS1 - zwei Bauteile am selben Ausgangspin, analog testcase_01 (dort
speist RCD1.o1 sowohl LS1 als auch LS2 über zwei separate Ausgangsadern).
RCD2.o1 verzweigt ebenso zu LS2 UND LS3 (unterschiedliche Nennströme,
16A/10A), RCD2.o2 (N) versorgt beide Stromkreise gemeinsam über dieselbe
Ader. LS2/LS3 speisen SK2 (Steckdose) bzw. SK3 (Lichtauslass) - je eine
eigene L-/N-/PE-Reihenklemme auf derselben obersten Hutschiene wie SK1s
Reihenklemmen, PE über den lokalen Hutschienen-Bond statt einer eigenen
Zubringerader (analog testcase_01). Verifiziert: FI/RCD auf SK2/SK3 findet
korrekt RCD2 (Auslösewerte aus `bauteile.md` übernommen, siehe unten), ZS
lieferte anfangs `Z:0,14Ω` (reine Vorimpedanz, noch keine
Fehlertabellen-Einträge auf den neuen Netzen).

**Nachträglich ergänzt:** zwei weitere Fehlertabellen-Einträge auf Gruppe
G2 - N-Leiter zur Steckdose SK2 (`Reihenklemme_N_SK2.o1` →
`Endstelle_SK2.i2`, Netz N46, 0,13Ω) und L-Leiter zur 3-poligen
Anschlussdose SK3 (`Reihenklemme_L_SK3.o1` → `Endstelle_SK3.i1`, Netz N48,
0,19Ω - "3-polig" zur Unterscheidung von SK1s 5-poliger Anschlussdose).
Sowie RCD2s Auslösewerte auf User-Wunsch geändert: `tA` 22→21ms, `iA`
18→24mA, `uB` 1→0,9V (reiner `bauteile.md`-Datenwert, kein Code-Fix).
Verifiziert per FI/RCD über die Steckdosen-Kontakte selbst (Schwarz auf
L links, Blau auf N rechts, Grün auf PE - siehe `zeichneSteckdose()`):
`I:24,0mA`/`Uci:0,9V`/`t:21,0ms`. Dieselben Kontakte diesmal auf ZI:
`Z:0,27Ω` = N-Fehlertabelle (N46=0,13Ω, L-Pfad ohne eigenen Eintrag) +
Vorimpedanz (0,14Ω), `Isc:766,7A`. Und nochmal dieselben Kontakte auf ZS
(ignoriert anders als ZI den N-Pfad, siehe "ZS" oben): reine Vorimpedanz,
`Z:0,14Ω`/`Isc:1478,6A`, Ampel grün. Und ein letztes Mal auf V~ - diesmal
mit ECHTEN Rollen (nicht wie beim 400V-Test unten drei verschiedene
Außenleiter): `Uln:230V`/`Ulpe:230V`/`Unpe:0V` (N und PE liegen im gesunden
Stromkreis auf demselben Potential). Öffnet man LS2 (den ersten LS nach
RCD2, versorgt SK2/die Steckdose selbst), fallen alle drei auf 0V.

**Geräteübergreifende V~-Messung:** Blau/Grün bleiben auf der Steckdose SK2
(N/PE), Schwarz wandert auf den schwarzen Kontakt (= L) der 3-poligen
Anschlussdose SK3 - zeigt, dass V~ auch über zwei verschiedene Geräte
hinweg funktioniert, solange die Funktionen stimmen (beide Stromkreise
teilen sich denselben N-Pfad über RCD2.o2). Ergebnis identisch:
`Uln:230V`/`Ulpe:230V`/`Unpe:0V`. Öffnet man LS3 (den zweiten LS nach RCD2,
versorgt SK3), fallen wieder alle drei auf 0V. Dieselbe geräteübergreifende
Sondenplatzierung auf FI/RCD: findet ebenfalls RCD2, übernimmt
`I:24,0mA`/`Uci:0,9V`/`t:21,0ms` und öffnet nach erfolgreichem TEST
automatisch dessen Hebel (siehe "Programmatisches Umschalten" oben) - die
Spannung fällt dadurch auf 0V, Werte und grüne Ampel bleiben stehen. Noch
einen Schritt weiter: DREI verschiedene Geräte gleichzeitig (Schwarz auf
SK3s schwarzem L-Kontakt, Blau auf SK1s blauem N-Kontakt - der 5-poligen
Anschlussdose selbst -, Grün auf SK2s PE) - findet trotzdem RCD2 (die
Suche läuft nur über den Pfad der schwarzen Sonde, Blau/Grün müssen nur
korrekt platziert sein) und öffnet sichtbar dessen Hebel (`transform`
vorher `null`, danach `rotate(180, ...)`).

**Getestet in:** `test_generator.js` (Graph-Kanten des 3-poligen LS,
Fehlertabellen-Summe pro Phase im Vergleich zu testcase_04, `anlage.json`-
Form von testcase_05, Rückwärtskompatibilität von testcase_01-04,
`testcase_06`s `gruppe.rcd === null` ohne Absturz, LS1 direkt am
Hauptschalter ohne RCD-Kante, Fehlertabellen-Summe ohne RCD-Anteil, Gruppe
G2s RCD2 verzweigt korrekt vom selben Hauptschalter-Ausgang wie LS1, mit
zwei Ausgangskanten zu LS2/LS3) und
`test_messgeraet.js` (ZS-Messwerte für L1/L2/L3 gegen testcase_04 verglichen,
dass der 3-polige LS als **eine** 78px breite Schalter-Box gerendert wird,
nicht drei einzelne, `testcase_06`s ZS-Werte L1/L2/L3 ohne RCD-Anteil, dass
FI/RCD dort keinen RCD findet - TEST bleibt wirkungslos, Ampel rot -, und
dass Gruppe G1 keine eigene RCD-Box hat, während Gruppe G2 daneben genau
5 Schalter-Boxen zeigt: LS1 (78px) + RCD2/LS2/LS3 (je 24px) in Reihe 2, plus
der unveränderte Hauptschalter in der letzten Reihe; zusätzlich, dass die
Steckdose SK2 tatsächlich RCD2 findet und dessen aktuelle Auslösewerte
übernimmt - Schwarz auf L links, Blau auf N rechts, Grün auf PE, siehe
`zeichneSteckdose()` -, sowie ZI über dieselben Steckdose-Kontakte, das den
N-Fehlertabellen-Eintrag korrekt mitsummiert, ZS über dieselben Kontakte,
das ihn bewusst ignoriert und nur die Vorimpedanz zeigt, V~ über dieselben
Kontakte mit echten Rollen (Uln/Ulpe=230V, Unpe=0V), das nach Öffnen von
LS2 komplett auf 0V zurückfällt, V~ geräteübergreifend - Schwarz auf
dem schwarzen (L-)Kontakt der 3-poligen Anschlussdose SK3, Blau/Grün
weiterhin auf der Steckdose SK2 -, das dieselben Werte liefert und nach
Öffnen von LS3 ebenfalls komplett auf 0V zurückfällt, dieselbe
geräteübergreifende Sondenplatzierung auf FI/RCD, das RCD2 findet und nach
erfolgreichem TEST automatisch dessen Hebel öffnet, und schließlich DREI
verschiedene Geräte gleichzeitig (Schwarz auf SK3, Blau auf SK1, Grün auf
SK2), das ebenfalls RCD2 findet und dessen Hebel-Transform sichtbar von
`null` auf `rotate(180,...)` wechselt). Zusätzlich sechs vom User
Schritt für Schritt vorgegebene Testcases, alle über die Kontakte der
5-poligen Anschlussdose gemessen (nicht direkt am Schaltkasten) - verifiziert
also nebenbei, dass die Anschlussdose exakt an dieselben Netz-IDs
angeschlossen ist wie die entsprechenden Schaltkasten-Schrauben: RLOW
zwischen N-Kontakt der Anschlussdose und der N-Klemme unten summiert den
Fehlertabellen-Eintrag auf der Reihenklemme (`R:0,17Ω`); RLOW zwischen
L1-Kontakt und Hauptschalter-Eingang summiert nur LS1s Fehlertabellen-Eintrag
(`R:0,20Ω`), Platzhalter sobald Hauptschalter ODER der 3-polige LS1 offen
ist; RISO bei offenem Hauptschalter (Schwarz auf braun=L1, Blau auf blau=N,
Grün auf grün=PE) zeigt `R:>999MΩ`, Ampel grün (kein artifizieller
Isolationsfehler modelliert); ZI (Schwarz auf grau=L3, Blau auf blau=N)
summiert L- UND N-Fehlertabelle zu `Z:0,46Ω` - trifft genau den eigens für
diesen Zweck angelegten N-Reihenklemmen-Fehlerwiderstand; ZS (Schwarz auf
schwarz=L2) liefert `Z:0,42Ω`, identisch zum direkt am Schaltkasten
gemessenen Wert; V~ mit drei Sonden auf drei unterschiedlichen Außenleitern
(braun=L1, grau=L3, schwarz=L2) zeigt überall 400V.

### AFDD

**Status: umgesetzt** (Gruppe G2 in `testcase_05`, "LS mit AFDD"-Kombigerät).
Ein AFDD (Arc Fault Detection Device, Brandschutzschalter) wird in der
Praxis meist als Kombigerät mit einem LS verbaut - baulich wie ein
2-poliger RCD (L+N in einem Gehäuse, weil die AFDD-Elektronik einen
N-Anschluss braucht), elektrisch aber ein normaler 2-poliger LS (schaltet
L UND N). Bewusst **kein** eigenes Bauteil mit eigenen `i`/`o`-Pins (wie
ursprünglich hier als Platzhalter skizziert), sondern nur ein Flag
`ls.afdd: true` auf einem ganz normalen, generischen 2-poligen LS -
`bauteile.md` bekommt dafür eine neue Spalte `AFDD` (`ja`/`–`), geparst in
`parseBauteile()` als `bauteil.afdd`.

**Darstellung:** `view/schaltkasten.js` unterscheidet beim Zeichnen eines LS
nur noch `ls.afdd ? 'rcd' : 'einfach'` als `schalterTyp` - der 2-polige
AFDD-LS bekommt dadurch exakt dieselbe Schalter-Bauform (`schalterBreite()`)
wie ein 2-poliger RCD, ohne neuen Formel-Zweig. Die Aufschrift wird
zweizeilig: `geraet()`s `label`-Parameter akzeptiert jetzt wahlweise einen
String oder ein Array (eine Zeile pro Element, per `<tspan dy="10">`
untereinander) - beim AFDD-LS `[${ls.char}${ls.in}, 'AFDD']` (z.B. "B20" /
"AFDD"). Später (auf User-Wunsch) auch für die RCD-Beschriftung selbst
übernommen (Typ+Fehlerstrom / Nennstrom, siehe "Felder pro Komponente" ->
"RCD" oben) - bei allen anderen Bauteilen (normaler LS, Hauptschalter)
weiterhin ein normaler einzeiliger String (unveränderte Optik, siehe
Rückwärtskompatibilität unten).

**Verdrahtung:** anders als ein normaler 1-poliger LS hinter einem 2-poligen
RCD (siehe `testcase_06`s Gruppe G2, wo der RCD-N-Ausgang direkt und
ungeschaltet bis zur Reihenklemme durchläuft) braucht der AFDD-LS eine
**eigene** N-Zubringerader vom RCD, weil er N selbst schaltet - RCD2.o1 (L)
UND RCD2.o2 (N) verzweigen deshalb je auf zwei separate Ausgangsadern (eine
pro AFDD-LS), nicht nur RCD2.o1 wie bei einem normalen LS.

In `generate_anlage.js` war die einzige nötige Änderung die
`phasen`-Herleitung pro Stromkreis: bisher lief sie generisch über
`ls.pole` (ein Array-Eintrag pro Pol, korrekt bei einem normalen
mehrpoligen LS wie testcase_05s 3-poligem LS1, wo jeder Pol eine eigene
L-Phase ist). Bei einem AFDD-LS wäre der zweite Pol aber N, nicht L2/L3 -
ungefiltert übernommen hätte das `phasen` auf `['L1', 'N']` verlängert und
nachgelagerten Code (`[...phasen, 'N', 'PE']` für die Endstelle-Pins)
kaputt gemacht (doppeltes N). Fix: bei `ls.afdd` zählt nur `i1` als Phase
(analog zum RCD, dessen eigener N-Pol ebenfalls nicht in der
Gruppen-Phasenliste auftaucht, siehe `rcdFunktionen` weiter oben) - `sk.ls`s
eigene Ein-/Ausgangsadern bekommen den N-Pol separat dazugehängt
(`lsFunktionen = [...phasen, 'N']`). Die Graph-Kantenbildung
(`kantenFuerFunktion()`) brauchte dagegen **keine** Änderung - sie läuft
bereits generisch über `bauteil.pole` und findet L- bzw. N-Kanten unabhängig
davon, was an welchem Pin verdrahtet ist.

**Rückwärtskompatibilität:** alle sechs Testcases wurden mit
`generate_anlage.js` neu generiert - der einzige Unterschied war das neue
Feld `ls.afdd` (`false` bei allen bestehenden LS) und die `<tspan>`-Hülle um
bereits bestehende einzeilige Labels (identischer `textContent`, geprüft per
SVG-Diff gegen die alten `anlage.svg`-Referenzbilder), keine
Verhaltensänderung.

**Noch offen:** eigenes RISO-Verhalten (AFDD-Elektronik müsste vor der
Isolationswiderstandsmessung abgeklemmt werden, wie bei RCD Typ B/B+ -
`abklemmen_bei_iso`) - bewusst zurückgestellt, siehe "Geplant für später"
unten (zusammen mit RCD Typ B, da beide dieselbe RISO-Fragestellung
aufwerfen).

**Nachträglich ergänzt (direkt im Anschluss, alles User-Vorgaben):**
1. `testcase_05`s RCD2 von Typ A auf Typ B umgestellt (`bauteile.md`),
   Fehlerstrom blieb bei 30mA - reiner `anlage.json`-Diff (`rcd.typ`).
2. RCD-Beschriftung projektweit zweizeilig gemacht: Typ+Fehlerstrom oben,
   Nennstrom unten (z.B. "A 30mA"/"40A", aus `nennstrom_a`) - nutzt denselben
   Array-Label-Mechanismus wie oben beim AFDD-LS, siehe "Felder pro
   Komponente" -> "RCD".
3. Fünf neue Messungs-Testcases für Gruppe G2, alle vom User Schritt für
   Schritt vorgegeben und per throwaway-Playwright-Skript verifiziert:
   - **V~ geräteübergreifend:** Grün auf PE der Drehstromsteckdose (SK1),
     Schwarz auf SK2s L1 (mittlere Steckdose, linker Kontakt), Blau auf SK3s
     N (rechte Steckdose, rechter Kontakt) - `Uln:230V`/`Ulpe:230V`/
     `Unpe:0V`.
   - **FI/RCD geräteübergreifend:** Blau auf der Drehstromsteckdose (N),
     Schwarz auf SK2 (L1), Grün auf SK3 (PE) - findet RCD2, übernimmt dessen
     Auslösewerte (`I:24,0mA`/`Uci:0,9V`/`t:21,0ms`), öffnet nach TEST
     automatisch den Hebel, Spannung fällt auf 0V, Pfeil-Kasten wird
     durchgestrichen, Ampel grün.
   - **RLOW direkt über das LS3-Kombigerät selbst** (nicht über eine
     Endstelle): oben links (Eingang L, `N61`) zu unten links (Ausgang L,
     `N66`) summiert LS3s eigene Fehlertabelle zu `0,43Ω`
     (`0,18Ω`+`0,25Ω`), Platzhalter `---Ω` sobald LS3s Hebel offen ist.
   - **RLOW über LS3s N-Ader:** ein zusätzlicher Fehlertabellen-Eintrag auf
     `N67` (LS3.o2 → Reihenklemme_N_SK3.i1, `0,07Ω` - `N63`, LS3s
     N-Eingang, bewusst ohne eigenen Eintrag, anders als bei der L-Ader mit
     zwei Einträgen) liefert `0,07Ω` zwischen LS3s N-Eingang/-Ausgang -
     zusätzlich verifiziert mit vertauschter Sondenfarbreihenfolge (RLOW ist
     symmetrisch, liefert denselben Wert).

**Getestet in:** `test_generator.js` (4 Tests: LS2/LS3 sind 2-polige AFDD-Kombigeräte
mit `sk.phasen` weiterhin 1-elementig, `ls.afdd === true`/`false` korrekt
gesetzt, LS-Eingangs-/Ausgangsadern tragen L+N, RCD2 verzweigt auf L1 UND N
je zu zwei separaten Kanten, Fehlertabellen-Summe über RCD2→LS2/LS3) und
`test_messgeraet.js` (6 Tests: 6 statt 3 Schalter-Boxen in `testcase_05`, RCD2/LS2/LS3
haben identische 24px-Schalter-Bauform, zweizeiliges Label "B20"/"AFDD" bzw.
"B16"/"AFDD"; RLOW direkt über LS3 auf der L-Ader mit Hebel-Platzhalter-Probe,
RLOW über LS3s N-Ader inkl. vertauschter Sondenreihenfolge; FI/RCD und V~
jeweils geräteübergreifend über Drehstromsteckdose + beide neuen Steckdosen).

### Schrauben lösen

Der Bediener soll Schrauben auch **lösen** können. Wirkung im Graphen:
dieselbe Art von Kante wie beim Schalter, nur auf Ebene einer einzelnen Ader
statt eines ganzen Bauteils – eine gelöste Schraube kappt genau eine Kante.

**Werkzeug: Schraubendreher (Status: vollständig umgesetzt - Darstellung,
Aufnehmen/Lösen/Wiedereindrehen, Einschränkungen UND die tatsächliche
Kanten-Kappung im Verbindungsgraphen, siehe unten).** Fünftes
View-Objekt (`view/schraubendreher.js`), sitzt RECHTS neben dem Messgerät
(für Rechtshänder, explizite User-Vorgabe). `#schraubendreher` wird per JS
ABSOLUT positioniert, direkt an der rechten Kante der tatsächlich
gerenderten Messgerät-SVG (`messgeraetSvgRect.right - zeileRect.left +
16px`) - NICHT über Flexbox-Zentrierung der beiden zusammen, weil das
Messgerät sonst nicht mehr exakt an derselben Stelle wie vorher unter dem
Schaltkasten zentriert wäre (erster Implementierungsversuch nutzte Flexbox
und wurde deshalb korrigiert). `#messgeraet` behält seine ursprüngliche
eigene Zentrierung (`display:flex;justify-content:center`, Breite =
Schaltkasten-Breite) unverändert bei - der umgebende `#messgeraet-zeile`
liefert nur den Positionierungs-Anker (`position: relative`) für den
Schraubendreher. Geometrie 1:1 aus einer User-Vorlage übernommen (ein Pfad +
sechs Rechtecke, per Inkscape exportiert) - die Höhe wird bewusst nicht als
Konstante dupliziert, sondern zur Laufzeit aus der tatsächlich gerenderten
Messgerät-SVG-Höhe gelesen, damit beide immer exakt gleich hoch bleiben,
auch wenn sich die Messgerät-Größe künftig ändert.

**Aufnehmen + Lösen + Wiedereindrehen (Status: umgesetzt):** Klick auf den
Schraubendreher setzt `schraubendreherAufgenommen = true`
(`controller/app.js`) - das Werkzeug verschwindet aus der Ruheposition
(`renderSchraubendreher()` rendert dann bewusst nichts). `onSchraubeKlick()`
prüft diesen Zustand VOR der bestehenden Messspitzen-/Popup-Logik, bei
aufgenommenem Werkzeug:
- Schraube mit bereits gesetzter Messspitze → wirkungslos, Werkzeug bleibt
  aufgenommen (User kann direkt eine andere Schraube probieren, ohne erneut
  aufzunehmen - explizite User-Entscheidung).
- Schraube bereits gelöst (weißer Kreis vorhanden) → **Wiedereindrehen**:
  Overlay wird entfernt (`geloesteSchrauben.delete(kreis)`), Werkzeug kehrt
  automatisch zurück.
- sonst → **Lösen**: weißer Kreis mit schwarzem Rand (`fill:#ffffff,
  stroke:#000000`, `r:7` - dieselbe Größe wie eine Messspitzen-Markierung)
  wird angelegt, Werkzeug kehrt automatisch zurück.

Beides zusammen ergibt ein Umschalt-Werkzeug: derselbe Klick-Mechanismus
toggelt je nach Zustand der angeklickten Schraube. Der weiße Kreis bekommt
`pointer-events: none`, damit die darunterliegende Schraube weiterhin
klickbar bleibt (sowohl fürs Wiedereindrehen als auch für normale
Popup-/Messspitzen-Klicks, sobald wieder eingedreht). Rein visuell in
diesem Schritt - **noch keine Wirkung auf den Verbindungsgraphen**, das
kommt als eigener, letzter Schritt (siehe unten).

**Einschränkungen (Status: umgesetzt, Zwischenschritt vor der Kanten-Kappung,
explizite User-Vorgabe):**
- **Steckdosen-Kontakte unterstützen das Werkzeug (noch) nicht** - Klick auf
  eine Schraube der Steckdosen-View (Steckdose/Anschlussdose/
  Drehstromsteckdose/5-polige Anschlussdose, siehe `view/steckdosen.js`)
  bleibt wirkungslos (`kreis.closest('#steckdosen')`-Prüfung), Werkzeug
  bleibt aufgenommen. Nur Schaltkasten-Schrauben können gelöst werden.
- **Maximal `SCHRAUBENDREHER_MAX_GELOEST` (= 2) Schrauben gleichzeitig
  gelöst** - User-Wortlaut: "Ich will nicht, dass der User alle Schrauben
  erst mal aufdreht." Ein Lösen-Versuch über dem Maximum bleibt ohne
  weiteren weißen Kreis, UND das Werkzeug wird zurückgelegt (nicht
  aufgenommen belassen wie bei Messspitzen-/Steckdosen-Blockaden -
  Folgekorrektur nach User-Feedback: "besser, wenn der Schraubenzieher
  wieder hingelegt wird, wenn bereits zwei Punkte gesetzt sind", da sich
  ein "geht gerade nicht mehr" anders anfühlen soll als ein "diese eine
  Schraube geht nicht"). Wiedereindrehen ist von der Obergrenze nicht
  betroffen (reduziert die Anzahl gelöster Schrauben ja gerade) und schafft
  dadurch wieder Platz für eine neue.

**Behobener Bug (User-gemeldet, testcase_06):** der Schraubendreher landete
nach einer Messgerät-Interaktion (ON/OFF, Messspitze setzen) an einer
falschen Position (links im Schaltschrank statt rechts vom Messgerät).
Ursache: `positioniereSchraubendreher()` nutzte eine beim Start einmalig
gecachte SVG-Referenz - `MessgeraetView.render()` leert den Container aber
bei jedem Re-Render komplett und hängt ein neues `<svg>`-Element ein, die
gecachte Referenz zeigte danach ins Leere (`getBoundingClientRect()` liefert
auf einem losgelösten Element nur Nullen). Fix: die Messgerät-SVG wird bei
jedem Positionieren frisch aus dem DOM gelesen, nicht gecacht (nur die
- über die Zeit konstante - Höhe darf weiter gecacht werden).

**Behobener Bug (User-gemeldet, 2026-07-23):** die ursprünglich in der
Spezifikation vorgesehene Sperre "eine gelöste Schraube kann keine
Messspitze mehr bekommen" (siehe oben) war nie tatsächlich umgesetzt worden
- eine Messspitze ließ sich trotz weißem Kreis normal setzen, elektrisch
unsinnig (kein Kontakt mehr). Fix: der Messspitzen-Zweig in
`onSchraubeKlick()` prüft jetzt zuerst `geloesteSchrauben.has(kreis)` und
bricht ohne Wirkung ab, bevor er den Farbzyklus (schwarz/blau/grün)
weiterschaltet.

**Kanten-Kappung im Verbindungsgraphen (Status: umgesetzt, letzter
iterativer Schritt):** Lösen öffnet jetzt tatsächlich genau eine Kante
(`kante.geschlossen = false`), Wiedereindrehen schließt sie wieder
(`kante.geschlossen = true`) - exakt derselbe Mechanismus wie bei
`schalterUmschalten()`, nur auf Ebene einer einzelnen Kante statt aller
Kanten eines Bauteils. Design-Entscheidung (mit dem User geklärt, bevor
umgesetzt wurde): Eingangs- und Ausgangs-Schraube eines Bauteils sind KEINE
zwei separaten Kanten, sondern zwei verschiedene Knoten desselben Graphen,
verbunden durch genau EINE Kante (`kantenFuerFunktion()` in
`generate_anlage.js` legt pro Bauteil+Pol nur diese eine Kante an - es gibt
keine separate Kante für den Draht ZWISCHEN zwei benachbarten Bauteilen,
diese Konnektivität ergibt sich implizit daraus, dass beide Pins denselben
Netz-Knoten teilen). Das Kappen dieser einen Kante liefert deshalb schon von
selbst das elektrisch korrekte asymmetrische Verhalten: der Eingangsknoten
bleibt über die Kante des VORGESCHALTETEN Bauteils erreichbar, der
Ausgangsknoten wird unerreichbar, weil der einzige Weg dorthin über die nun
offene Kante führt - keine feinere Modellierung pro Eingang/Ausgang nötig.

**Behobener Bug (User-gemeldet, testcase_06):** eine per Schraubendreher
gekappte Kante wurde wieder fälschlich geschlossen, sobald derselbe
Bauteil-Schalter (z.B. RCD1) geöffnet und wieder geschlossen wurde - der
weiße Kreis blieb sichtbar stehen, aber die Messung zeigte trotzdem wieder
Spannung. Ursache: sowohl `schalterUmschalten()` (Schalter-Hebel) als auch
das Schraubendreher-Werkzeug schrieben ungeprüft in dieselbe
`kante.geschlossen`-Eigenschaft - ein Schalter-Klick überschrieb den
Zustand der gelösten Schraube einfach wieder. Fix: ein neues
`geloesteKanten`-Set verhindert, dass `schalterUmschalten()` eine gerade
gelöste Kante schließt; der zuletzt vom Schalter gewünschte Zustand wird
zusätzlich in `kante._schalterSoll` gemerkt und erst beim tatsächlichen
Wiedereindrehen der Schraube angewendet (statt Wiedereindrehen blind auf
`geschlossen: true` zu setzen, was einen zwischenzeitlich geöffneten
Schalter ignoriert hätte).

Zuordnung Schraube → Kante(n): jede Schraube trägt jetzt zusätzlich
`data-bauteil` (gesetzt in `schraube()`, `view/schaltkasten.js`, durchgereicht
von `geraet()` und `klemme()` - letztere brauchte dafür einen neuen
`bauteilName`-Parameter, alle 7 Aufrufstellen von `klemme()` rekonstruieren
den passenden Bauteilnamen aus `bauteile.md`-Konventionen, z. B.
`Reihenklemme_L1_SK1`, `L-Klemme`, `PE-Klemme`). `findeSchraubenKanten(ader,
kreis)` (`controller/app.js`) liest `kreis.dataset.bauteil` und sucht die
passenden Kanten in `graph[ader.funktion].kanten`. PE-Schrauben haben keine
Entsprechung im Verbindungsgraphen (`GRAPH_FUNKTIONEN` in
`generate_anlage.js` deckt nur `L1/L2/L3/N` ab) - `findeSchraubenKanten()`
liefert dafür sauber ein leeres Array, Lösen/Wiedereindrehen bleibt dort
rein visuell ohne Absturz. Nach jeder Kanten-Änderung wird
`renderMessgeraet()` aufgerufen, damit eine laufende Messung (z. B. RLOW)
sofort reagiert - genau wie bei `schalterUmschalten()`.

**Behobener Bug (User-gemeldet, testcase_05): eine geteilte Schraube kappte
nur EINE der darunterliegenden Adern statt alle.** Manche physischen
Schrauben tragen mehr als eine Ader gleichzeitig (`ader.weitere`, siehe
"Pfadverfolgung und Fehlersimulation" - z. B. RCD2s N-Ausgang in
testcase_05, der gleichzeitig zwei AFDD-LS speist). `findeSchraubenKanten()`
hieß ursprünglich `findeSchraubenKante()` (Singular) und nutzte `.find()`,
das rein über `k.bauteil === bauteilName` matchte, ohne `von`/`nach` zu
prüfen - bei mehreren Kanten desselben Bauteils+Pols (genau der
geteilte-Schraube-Fall) traf das immer nur die ERSTE gefundene, unabhängig
davon, welche der beiden Adern tatsächlich unter der geklickten Schraube
liegt. Elektrisch falsch: beim echten Aufdrehen einer Klemme mit zwei Adern
darunter lösen sich BEIDE gleichzeitig, nicht nur eine (User-Frage, die den
Kern traf: *"wenn ich eine Schraube aufmache, wird nur ein Kabel gelöst,
und nicht beide?"*). Fix: `findeSchraubenKanten()` sammelt zuerst alle
Netz-IDs der geklickten Schraube (`ader.netz` + alle `ader.weitere[].netz`)
und liefert per `.filter()` ALLE Kanten des Bauteils, deren `von` ODER
`nach` in dieser Menge liegt - Lösen/Wiedereindrehen in `onSchraubeKlick()`
iteriert jetzt über das gesamte Array statt eine einzelne Kante zu
behandeln. Betrifft nur Bauteile mit tatsächlich geteilten Ausgangsschrauben
(aktuell RCD2 in testcase_05/testcase_06) - bei einer normalen,
ungeteilten Schraube liefert das Array weiterhin genau ein Element, keine
Verhaltensänderung.

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

Alle Testcases tragen inzwischen mehrere Beispiel-Netze mit Widerstand (auf
bekannten Pfaden, siehe die jeweilige `netzplan.md`) – bewusst nicht
alle Leitungen, der User füllt die Tabelle nach Bedarf selbst weiter auf.

### RLOW-Berechnung (erster Anwendungsfall)

**Status: umgesetzt.** Die zwei relevanten Messspitzen (siehe "Messmodus")
markieren zwei Knoten im Graphen. Pfadsuche zwischen ihnen; existiert ein Pfad
(alle Kanten `geschlossen`), ist der angezeigte Wert die **Summe der
Fehlertabellen-Einträge der Netze entlang dieses Pfads** (0Ω, wenn keine
Fehlertabellen-Einträge auf dem Weg liegen). Existiert kein Pfad (offener
Schalter dazwischen), bleibt der Messwert beim `---`-Platzhalter.

**WORKAROUND für PE-zu-PE, bis der PE-Teilgraph existiert:** da PE kein
eigener Teilgraph ist (siehe "Nächste Schritte" - PE-Teilgraph), würde eine
RLOW-Messung zwischen zwei PE-Punkten (z.B. eine grüne Reihenklemme und die
PE-Klemme, oder eine PE-Steckdose) nie einen Pfad finden und dauerhaft beim
Platzhalter bleiben - obwohl PE in diesem Modell nie geschaltet wird (kein
PE-Schalter) und deshalb elektrisch immer durchgängig ist. `berechneRlowMesswert()`
in `controller/app.js` behandelt PE-zu-PE deshalb als Sonderfall und liefert
pauschal **0Ω**, unabhängig davon, an welchen zwei PE-Bauteilen (Reihenklemme,
PE-Klemme, Steckdose, Anschlussdose) die Messspitzen sitzen. Ignoriert bewusst
etwaige Fehlertabellen-Einträge auf PE-Netzen (aktuell in keinem Testcase
vorhanden). **Entfällt ersatzlos**, sobald der echte PE-Teilgraph existiert.

**WORKAROUND für PE-zu-N, bis der PE-Teilgraph existiert:** ähnlich gelagert
wie PE-zu-PE, aber diesmal mit einer Sonde auf N: PE gilt weiterhin als immer
durchgängig (0Ω), die eigentliche Messung läuft deshalb nur über den N-Pfad
zur Einspeisung - **wie bei ZS, aber für N statt L, und OHNE die feste
Vorimpedanz** (bleibt ein RLOW-Wert, kein ZS/ZI-Wert). Ist irgendein Schalter
auf dem Weg zur Einspeisung offen, bleibt der Platzhalter stehen; sind alle
geschlossen, wird die Fehlertabelle entlang dieses N-Pfads aufsummiert und
kontinuierlich angezeigt (ohne TEST-Taste, wie RLOW sonst auch). Ebenfalls
**entfällt ersatzlos**, sobald der echte PE-Teilgraph existiert.

### RISO-Berechnung (zweiter Anwendungsfall, prototypisch)

**Status: prototypisch umgesetzt** (siehe "Berechnung der Messwerte" oben für
die Details - Live-Spannungsprüfung über `istSpannungFuehrend()`, TEST-Klick
sucht denselben Pfad wie RLOW).

### ZI-/ZS-Berechnung (dritter/vierter Anwendungsfall)

**Status: prototypisch umgesetzt** (siehe "Berechnung der Messwerte" oben).
Nutzen dasselbe Graph-Modell wie RLOW/RISO, aber mit einem eigenen
`findePfadZurEinspeisung()`-Helfer (Pfad von einer Sonde zur jeweiligen
Einspeisung, statt direkt zwischen zwei Sonden wie bei RLOW/RISO - nötig, da
Schwarz und Blau/Grün auf unterschiedlichen Funktionen sitzen und deshalb
keinen gemeinsamen Teilgraphen haben). ZI prüft zwei Teilpfade (L und N), ZS
bewusst nur einen (L, PE wird ignoriert - siehe "Berechnung der Messwerte").

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
  testcase_05/   ← Gruppe G1: 3-poliger LS (EINE Komponente statt drei einpoliger) hinter 4-poligem RCD, Drehstromsteckdose als Endstelle; Gruppe G2: 2-poliger RCD + 2x "LS mit AFDD"-Kombigerät (beide auf derselben Hutschiene)
  testcase_06/   ← Gruppe G1: 3-poliger LS OHNE RCD, 5-polige Anschlussdose; Gruppe G2: 2-poliger RCD + 2x 1-poliger LS (beide auf derselben Hutschiene)
  ...
```

**Geplant für später (noch nicht umgesetzt):**
- RCD Typ B (und dessen RISO-Implikationen, siehe auch die noch offene
  AFDD-RISO-Frage unter "AFDD" oben)

---

## Nächste Schritte

Verbindungsgraph, Schalter und Fehlertabelle sind für RLOW umgesetzt (siehe
"Pfadverfolgung und Fehlersimulation"). RISO, ZI und ZS sind prototypisch
umgesetzt (RISO: Live-Spannungsprüfung + TEST-gestützte Widerstandsmessung;
ZI: TEST-gestützte Vorimpedanz + Fehlertabelle beider Teilpfade; ZS: dieselbe
Mechanik wie ZI, aber mit bewusst ignoriertem PE-Pfad; siehe "Berechnung der
Messwerte"). FI/RCD ist prototypisch umgesetzt (Live-Spannungsanzeige +
Pfeil-Kasten-Umschaltung wie bei ZS, TEST-gestützte Übernahme der
Auslösewerte I/Uci/t vom ersten RCD auf dem Pfad zur Einspeisung, und
öffnet nach einem erfolgreichen Fund automatisch dessen Hebel - siehe
"Schalter" unten). V~ ist umgesetzt (freie Sondenplatzierung ohne
Rollenprüfung, live berechnete Uln/Ulpe/Unpe, keine TEST-Taste nötig).
Offen:

1. **Isolationsfehler-Mechanismus für RISO** - heute sind L1/L2/L3/N
   vollständig getrennte Teilgraphen, ein TEST-Klick ohne anliegende
   Spannung liefert deshalb praktisch immer `>999MΩ`. Für echte
   Fehlerszenarien bräuchte es einen Weg, zwei Funktionen künstlich über
   einen simulierten Isolationsfehler zu verbinden - der Code
   (`risoTestKlick()`) ist strukturell schon darauf vorbereitet.
2. **PE-Teilgraph** - bewusst zurückgestellt, da PE über den
   Hutschienen-Bond Zyklen bilden kann (Parallelwiderstand statt einfacher
   Pfad-Summe) - ein eigenständiges, größeres Vorhaben. Bis dahin gelten zwei
   bewusste Vereinfachungen: bei RISO wird eine an PE angelegte Messspitze
   pauschal wie N am Einspeisungspunkt behandelt (`risoEffektiveAder()`,
   siehe "Berechnung der Messwerte" - Abschnitt "Verwechslung N/PE"); bei ZS
   wird der PE-Pfad komplett ignoriert (PE-hat-immer-Durchgang-Annahme,
   siehe "Berechnung der Messwerte" - Abschnitt "ZS"). Beide **Stand heute
   bewusst so akzeptiert** (ein aufgetrennter PE-Leiter ist im
   Prüfungsalltag kein realistisches Szenario), aber Vereinfachungen, keine
   korrekte Modellierung - sobald der PE-Teilgraph existiert, sollten beide
   durch eine echte Pfadsuche über den PE-Graphen ersetzt werden. Dritte
   Vereinfachung aus demselben Grund: RLOW liefert bei PE-zu-PE pauschal 0Ω,
   und bei PE-zu-N nur die Fehlertabelle des N-Pfads zur Einspeisung ohne
   Vorimpedanz (`berechneRlowMesswert()`-Workarounds, siehe
   "RLOW-Berechnung" oben) - entfallen ebenfalls ersatzlos, sobald der
   PE-Teilgraph existiert.
3. Weitere Testcase-Szenarien (siehe "Geplant für später" oben: RCD Typ B).
4. **Prüfprotokoll: Verknüpfung mit echten Messwerten** - aktuell rein
   ein-/ankreuzbar, ohne Bezug zu den im Messgerät tatsächlich ermittelten
   Werten (siehe "Prüfprotokoll (View-Objekt)" oben). Spätere Ausbaustufe:
   automatisches Übernehmen der TEST-Ergebnisse in die passende Zeile/Spalte
   der Stromkreisverteiler-Tabelle, plus Validierung (z.B. Fehlerquelle #14 -
   Zi/Zs-Verwechslung - direkt im Protokoll markieren).
6. **3-Phasen-Reihenklemme als eigener Bauteil-Typ** - beim 3-poligen LS
   (siehe "3-poliger LS" oben) wurde bewusst **nicht** diese Richtung
   gewählt, sondern drei separate, normale einphasige Reihenklemmen
   gruppiert. Für später vorgemerkt: eine eigens verbreiterte
   "3-Phasen-Reihenklemme" (eine Komponente statt drei) könnte für
   Hutschienen-Platzersparnis oder eine kompaktere Darstellung nützlich
   sein - nicht die gewählte Richtung, nur eine notierte Möglichkeit.
