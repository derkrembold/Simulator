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

**PE-Klemme:**
```json
{
  "pe_klemme": {
    "vorhanden": true,
    "breite_mm": 12,
    "hoehe_mm": 49,
    "querschnitt_mm2": 16
  }
}
```

**N-Klemme:**
```json
{
  "n_klemme": {
    "vorhanden": true,
    "breite_mm": 12,
    "hoehe_mm": 49,
    "querschnitt_mm2": 16
  }
}
```

**L-Klemme:**
```json
{
  "l_klemme": {
    "vorhanden": true,
    "breite_mm": 12,
    "hoehe_mm": 49,
    "querschnitt_mm2": 16
  }
}
```

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

## Testkonzept

### Visueller Regressionstest für das Bild (SVG) der Schaltanlage

Jeder Testcase besteht aus einem JSON+SVG Paar:
- `anlage.json` → Anlagenkonfiguration
- `anlage.svg` → Referenzgrafik (Topologie, ohne Verbindungen)

Bei jeder Code-Änderung wird die JSON gerendert und mit der Referenz verglichen.
Akzeptanzkriterium: Wenn das gerendert Bild dem Bild der `anlage.svg` entspricht.

### Testcase Verzeichnisstruktur

```
tests/visuell/
  testcase_01/   ← einfach: 1 RCD, 2 LS
  testcase_02/   ← mit AFDD
  testcase_03/   ← RCD Typ B
  testcase_04/   ← 2 RCDs auf einer Schiene
  testcase_05/   ← Gruppe ohne RCD
  ...
```

---

## Nächste Schritte

1. ARCHITEKTUR.md erstellen (MVC Struktur, Dateiorganisation)
2. Referenz-SVG für Testcase 01 erstellen (ohne Verbindungslinien, siehe `anlage.svg`)
3. PWA Grundstruktur in Claude Code aufbauen
4. Stufe 0 (Vollsimulation) zuerst implementieren
5. Stufe 1–3 schrittweise ergänzen
