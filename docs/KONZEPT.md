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
| RISO               | R ISO           | R                | $\Omega$  | L: Kreis ausgefüllt; PE Kreis halb ausgefüllt; N Kreis ausgefüllt  |
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

**RLOW** (Durchgangsprüfung):
Pfad zwischen den beiden angeklickten Schrauben im Netzplan verfolgen, alle
`Widerstand`-Bauteile auf dem Pfad aufsummieren. Kein Widerstand im Pfad → 0Ω.

**RISO** (Isolationswiderstand):
Keine Pfadverfolgung, sondern eine **Konnektivitätsprüfung**: Liegen die beiden
Messpunkte auf unterschiedlichen, nicht verbundenen Netzen → gesund (hoher Normalwert,
z.B. „>200MΩ"). Sind sie (fälschlich) doch verbunden → 0Ω (Isolationsfehler erkannt).
**Voraussetzung:** Der Hauptschalter muss vorher abgeklemmt sein (siehe Checkliste vor
der ISO-Messung, Phase 4) – ohne das keine Messung, sondern eine Fehlermeldung
("Messgerät kaputt").

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

**Status: Konzeptidee, Format noch nicht final.**

Die verschachtelte `anlage.json` von Hand zu pflegen ist fehleranfällig – siehe die
wiederholten fehlenden `ausgang`-Felder und `undefined`-Werte während der Entwicklung.
Ziel ist daher, dass **niemand mehr direkt in der `anlage.json` herumpfuscht**: Die
Anlage wird stattdessen aus einer **Netzliste** erzeugt – einer Tabelle in Markdown,
die die elektrischen Verbindungen zwischen den Bauteilen explizit festhält. Ein
zukünftiges Script übersetzt diese Tabelle in die `anlage.json` (Umsetzung später,
dokumentiert dann in ARCHITEKTUR.md). Die `anlage.json` wird damit zu einem generierten
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

### Widerstand (Fehler-Bauteil)

Ein **Widerstand** ist ein eigenes, zweipoliges Bauteil (`i1`/`o1`) in der Netzliste,
das absichtlich in eine Leitung eingebaut werden kann, um einen Fehler zu simulieren
(z.B. eine schlechte Verbindung, Korrosion, einen zu dünnen Übergang). Er unterbricht
dazu ein durchgehendes Netz in zwei Netze mit dem Widerstand dazwischen:

```
PE-Klemme.o1 → Widerstand1.i1   (Netz A)
Widerstand1.o1 → Reihenklemme2.i2   (Netz B)
```

Der Widerstand trägt einen Wert in Ohm (z.B. `Widerstand1: 1.5Ω`). Dieser Wert fließt
später in die berechneten fiktiven Messwerte ein, wenn über diesen Punkt gemessen wird
(z.B. ein erhöhter $R_{PE}$-Wert am Messgerät). Damit lassen sich gezielt Fehlerszenarien
für das Training bauen, ohne die restliche Anlage zu verändern.

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

1. ARCHITEKTUR.md erstellen (MVC Struktur, Dateiorganisation)
2. Referenz-SVG für Testcase 01 erstellen (ohne Verbindungslinien, siehe `anlage.svg`)
3. PWA Grundstruktur in Claude Code aufbauen
4. Stufe 0 (Vollsimulation) zuerst implementieren
5. Stufe 1–3 schrittweise ergänzen
