# DIN VDE 0100-600 – Prüfungen

---

## Slide 1 – Übersicht Prüfung

**(6.4) Prüfung:**
- (6.4.2) Besichtigen
- (6.4.3) Erproben und
- (6.4.3) Messen nach Anforderung von VDE 100

**(6.4.1)** Bei der Erstprüfung muss elektrische Anlagen vom Errichter vor Inbetriebnahme geprüft werden.

**(6.4.1.2)** Notwendige Informationen vorhanden.

**(6.4.1.6)** Durchgeführt von Fachkraft, normgerechte Messgeräte (Tabelle 1).

**(6.4.4)** Prüfbericht.

**(6.5.3.4)** Wiederholungsprüfung sind betriebliche Angelegenheiten, Verantwortung vom Betreiber.

---

### (6.4.2.3) Besichtigen: Untersuchung der Anlage mit allen Sinnen

- Auswahl der Schutzmaßnahmen gegen elektrischen Schlag (VDE 0100-410)
- Brandabschottung (VDE 0100-420)
- Auswahl Kabel (VDE 0100-430, DIN 0298-4)
- Selektivität (VDE 0100-530)
- Anordnung SPD (VDE 0100-534)
- Kennzeichnung PE, N (VDE 0100-510 Abschnitt 514)
- Warnhinweise (VDE 0100-510)
- Erdungsanlage (VDE 0100-540)
- Körper an Erdungsanlage (VDE 0100-410)

> **Hinweis:** Größter Kurzschlussstrom muss nicht berechnet werden, sondern TAB beachten!

---

## Slide 2 – Reihenfolge Erproben und Messen

**(6.4.3.1)** Erproben und Messen: Nachweis der ordentlichen Funktion der Anlage.

**Reihenfolge:**

1. Durchgängigkeit Schutzleiter, Schutzpotentialausgleichsleiter (6.4.3.2)
2. Isolationswiderstand (6.4.3.3)
3. Isolierende Fußböden und Wände (6.4.3.5)
4. Spannungspolarität – N darf nicht alleine getrennt werden (6.4.3.6)
5. Messung von Schutz durch automatische Abschaltung (6.4.3.7)
6. Messung des zusätzlichen Schutzes (6.4.3.8)
7. Phasenfolge (6.4.3.9)
8. Funktionsprüfung (6.4.3.10)
9. Spannungsfall (6.4.3.11)

---

## Slide 3 – Durchgang und Isolationswiderstand

### (6.4.3.2) Durchgang
Widerstandsbeläge (Tabelle A.1, Kiefer Seite 364).

---

### (6.4.3.3) Isolationswiderstand
Verantwortung Errichter (Tabelle 1):

| Nennspannung (V) | Messgleichspannung (V) | Isolationswiderstand (MΩ) |
|------------------|----------------------|--------------------------|
| SELV/PELV | 250 | 0,5 |
| Bis 500 V | 500 | 1,0 |
| Über 500 V | 1000 | 1,0 |

**Messung:** Widerstand zwischen Außenleiter und Neutralleiter und alle Leiter und PE.
- N muss getrennt werden, da sonst Innenwiderstände gemessen werden.
- Alle Überstromeinrichtungen und alle Schalter trennen!

---

### (6.5) Wiederkehrende Prüfung (VDE 0105-100)

**(VDE 0105-100 Abschnitt 5.3.3.101.3.3)** Wiederkehrende Prüfung durch Messen:

| Situation | Grenzwert |
|-----------|-----------|
| Verbraucher angeschlossen (300 Ω/V) | bei 500 V: mind. 150 kΩ |
| Verbraucher ausgesteckt (1000 Ω/V) | bei 500 V: mind. 500 kΩ |
| IT-System | 50 Ω/V |
| SELV/PELV | mind. 250 kΩ mit 250 V Messspannung |
| Wenn SPD vorhanden | 250 V Messspannung, mind. 1 MΩ |

---

### (6.4.3.6) Spannungspolarität
- Kein Schaltgerät (einpolig) an Neutralleiter, nur an Außenleiter!
- Schraubenfassung an Neutralleiter.
- Kabel fachgerecht an Steckdosen.

---

## Slide 4 – Schutz durch automatische Abschaltung

### (6.4.3.7) Schutz durch automatische Abschaltung

#### (6.4.3.7.1 a) TN-Netz
- Schleifenimpedanz messen (Berechnungen reichen auch)
- Besichtigung von Nennstrom von Sicherungen
- Einstellung von Leistungsschalter prüfen
- Erproben von RCD durch Erzeugung von Differenzstrom
- Bei LS: Siehe Tabellenbuch Seite 260

#### (6.4.3.7.1 b) TT-Netz
- Messung von Erdungswiderstand RA
- Prüfung von Kenndaten der Schutzeinrichtung
- Prüfung ob Erdungswiderstand an RCD angepasst ist:

| RCD-Auslösestrom | Erdungswiderstand RA |
|------------------|----------------------|
| 300 mA | 167 Ω (Tabelle NB.3) |
| 30 mA | 500–1667 Ω (Tabelle NB.3) |

- Erproben von RCD durch Differenzstrom
- Prüfung von Überstrom, Besichtigung von Nennstrom, Einstellung von Leistungsschalter

#### (6.4.3.7.1 c) IT-Netz
- Körper (einzeln, Gruppe) mit Schutzleiter prüfen
- Isolationsüberwachung prüfen durch Betätigung
- Fehlerstromberechnung (oder messen)
- Wenn IT wie TN → siehe TN oben
- Wenn IT wie TT → siehe TT oben

---

## Slide 5 – Erdwiderstand und Schleifenimpedanz

### (6.4.3.7.2) Erdwiderstand
Kann auch berechnet werden, wenn Messung nicht möglich.

---

### (6.4.3.7.3) Schleifenimpedanz / Kurzschlussstrom

Das Messgerät misst die Spannung mit zwei Prüfwiderständen, die nacheinander zugeschaltet werden. Dann wird Strom/Impedanz berechnet.

**Korrekturfaktoren:**
- Messunsicherheit: ca. 30% → Faktor 1,3
- Temperaturerhöhung (Leitungen nicht auf Betriebstemperatur): Faktor 1,14

**Gesamtfaktor:** 1,14 × 1,3 = **1,5** → d.h. gemessener Zs-Wert muss ≤ 2/3 des Grenzwertes sein.

---

## Slide 6 – Prüfbericht, Funktionsprüfung und Spannungsfall

### (6.4.4) Prüfbericht (Erstellung von Prüfungsprotokollen)

**Inhalt:**
- Anschrift
- Netzform (TT, TN, IT)
- Schutzeinrichtung
- Messergebnisse
- Fabrikat und Messverfahren
- Mängel
- Datum
- Verteilung

> **Wichtig:** Bewertung der Messergebnisse!

---

### (6.4.3.10) Funktionsprüfung
- Sicherheitseinrichtungen wirksam
- Funktion RCD prüfen
- Funktion Meldeeinrichtung prüfen
- Notaus prüfen

---

### (6.4.3.11) Spannungsfall
- Prüfen ob Spannungsfall gefordert (TAB)
- Wenn ja → VDE 0100-520
- Kann gemessen und berechnet werden

---

## Slide 7 – Methoden zur Erdwiderstandsmessung

### Methoden zur Messung Erdwiderstand

#### Strom-Spannungsverfahren
- Spannung zwischen Erder und Sonde messen
- Strommessung

#### Kompensationsmessverfahren
- Spannung zwischen Erder und Hilfserder messen
- Spannung Erder und Sonde messen
- Linienmethode und Winkelmethode

---

### (Anhang C) Messung des Erdwiderstands nach VDE 0100-600

#### (Anhang C.1) Wechselspannung Erde und Hilfserde
- Hilfserde in 40 m Abstand
- Sonde misst Spannung
- 2 Wiederholungen mit unterschiedlichen Positionen der Sonde zum Vergleich

#### (Anhang C.2) Messen über Fehlerschleifenimpedanz (TT-Netz)
Bei TN-Netz mit abgeschalteter Stromversorgung:
- Hauptschalter aus
- Erdungsleiter von HES abklemmen
- Messung zwischen Erdung und Außenleiter

#### (Anhang C.3) Zangenmethode – bevorzugt bei TN (auch TT)
- Messspannung an Erdschleife mit Zange induzieren
- Strom mit Zange messen
- Bei TT: N mit Erder verbinden
- PE oder PEN wird **nicht** abgeklemmt!
