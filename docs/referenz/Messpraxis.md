# VDE Messpraxis elektrischer Anlagen nach DIN VDE 0100-600 und DIN VDE 0105-100

## Inhalt

- Grundlegende Thesen über die Prüfung
- Netzsysteme, Abschaltbedingungen
- Sicht und Funktionsprüfungen
- DIN VDE 0100 Teil 600 und VDE 0105-100
- Praktisches Messen mit eigenen Messgeräten
- Dokumentation


## Grundlegende Thesen über die Prüfung

> Vieles wird immer falsch verstanden, man wiegt sich in falscher Sicherheit, oder man überlässt das Denken anderen. Deshalb folgender Grundsatz:

**Geprüft wird auf Sicherheit und nicht _nur_ auf die Einhaltung der Normen**

**DIN-Normen sind private technische Regelungen mit Empfehlungscharakter, die die anerkannten Regeln der Technik zwar wiedergeben, aber auch schlechthin falsch sein können.**

_Quelle: BGH-Urteil (AZ VIZR 184/97 vom 14.05.1998)_

---

## Netzsysteme

Bezeichnung erfolgt international durch Buchstaben: **T – N – C – S – System**

### Erdungsverhältnisse der Stromquelle

- **T** (terre) Direkte Erdung eines Punktes
- **I** (isolé) Stromquelle nicht geerdet (Sonderform)

### Erdungsbedingung der Körper (Verbraucher)

- **N** (neutre) Körper direkt mit Betriebserde verbunden
- **T** (terre) Verbraucheranlage hat einen eigenen Erder

### Anordnung des Neutral- und des Schutzleiters

- **S** (séparé) Neutral- und Schutzleiter getrennt
- **C** (combiné) Neutral- und Schutzleiter zusammen (PEN)

---

### Errichten von Niederspannungsanlagen – Teil 6: Prüfungen


#### DIN VDE 0100-600 (6.4.1.6)

Die Prüfung muss von einer Elektrofachkraft vorgenommen werden, die zur Durchführung von Prüfungen befähigt ist.

Nach Beendigung der Prüfung **muss** ein Prüfprotokoll erstellt werden nach **Anhang NA** der DIN VDE 0100-600.

---

## Inhalte einer Sichtprüfung

### DIN VDE 0100-600 (6.4) (Auszugsweise)

- Schutzmaßnahmen gegen elektrischen Schlag
- Vorhandensein von Brandabschottungen und sonstigen Maßnahmen gegen die Ausbreitung von Feuer und Rauch
- Strombelastbarkeit / Spannungsfall (Kabel, Leitungen, Stromschienen)
- Auswahl, Einstellung, Koordination, Selektivität von Überstromschutzeinrichtungen
- Auswahl, Anordnung von Überspannungsschutzeinrichtungen
- Auswahl, Anordnung von Trenn- und Schaltgeräten
- Auswahl, Anordnung von Betriebsmitteln nach äußeren Einflüssen
- Kennzeichnung von Schutz-, Neutralleiter
- Vorhandensein von Schaltungsunterlagen, Warnhinweisen (Die Einhaltung der Vorgaben der Hersteller der elektrischen Betriebsmittel sollte geprüft werden)
- Kennzeichnung der Stromkreise, Überstrom-Schutzeinrichtungen usw.
- Auswahl und Errichtung von Erdungsanlagen, Schutzleitern usw.
- Maßnahmen gegen elektromagnetische Störungen

---

## DIN VDE 0100-600 / VDE 0105-100

### Sofern zutreffend sind folgende Messungen durchzuführen:

- Durchgängigkeit der Schutzleiter, der Verbindungen des Hauptpotentialausgleichs und des zusätzlichen Potentialausgleichs (kann mehrere geben)
- Isolationswiderstand der elektrischen Anlage (zwischen aktiven Leitern, und zw. aktiven Leiter und Erde)
	- Bei 500V könnte der SPD auslösen, deswegen 250V.
	- Bei Messung von 250V muss protokolliert werden.
- Schutz durch SELV und PELV oder Schutztrennung
- Widerstand von isolierenden Fußböden und Wänden
- Schutz durch automatische Abschaltung der Stromversorgung (Schleifenwiderstand)
- Zusätzlicher Schutz (Zusätzlicher Schutz gegen elektrischen Schlag, Fehlerschutz)
- Spannungspolarität
- Funktionsprüfungen
- Drehfeld von Drehstromsteckdosen (rechts)
- Prüfung des Spannungsfalls

---

## Messungen – $R_{SL}$

Messung der Durchgängigkeit des Schutzleiters, der Verbindung des Hauptpotentialausgleich (Schutzpotentialausgleich über die Haupterdungsschiene) und des zusätzlichen Potentialausgleichs.

> **Kein normativer Grenzwert vorgegeben**
> 
> Der gemessene Wert sollte nicht höher sein als der der Leitungslänge entsprechenden Leiterwiderstand zuzüglich der örtlichen Übergangswiderstände. In DIN 18014 (11.3) wird aber als Wert 1Ω angegeben.

---

## Messungen – $R_{iso}$

### Messung des Isolationswiderstandes

Die Messung muss spannungsfrei sein. Um den Isolationswiderstand zwischen Neutralleiter und Schutzleiter zu messen, muss der Neutralleiter, z.B. an der Potentialausgleichsschiene, aufgetrennt werden.

Der Isolationswiderstand muss zwischen:

- a) aktiven Leitern, **und**
- b) aktiven Leitern und dem mit der Erdungsanlage verbundenen Schutzleiter gemessen werden.

In der Praxis kann es erforderlich sein, diese Messung während der Errichtung der elektrischen Anlage vor dem Anschluss der elektrischen Verbrauchsmittel durchzuführen. Wenn der Stromkreis Betriebsmittel beinhaltet, welche möglicherweise die Messergebnisse beeinflussen oder beschädigt werden können, ist nur die Messung nach VDE 0100-600 (6.4.3.3.b) erforderlich.

> **Nur gültig bei Neuanlagenprüfung!!!**

---

### Grenzwerte Isolationsmessung

| Nennspannung des Stromkreises $U_{N}$ | Messgleichspannung | Grenzwert Isolationswiderstand |
| ------------------------------------- | ------------------ | ------------------------------ |
| SELV / PELV (Kleinspannung)           | 250 V              | > 0,5 MΩ                       |
| **bis 500 V**                         | **500 V**          | **> 1,0 MΩ**                   |
| über 500 V                            | 1000 V             | > 1,0 MΩ                       |

> Grenzwert Wiederholungsprüfungen: 1000 Ω/V

In der Praxis liegen die Messwerte weit über dem Grenzwert. Bei Neuanlagen sollte der max. Wert des Messgerätes angezeigt werden.

---

## Schutzmaßnahme im TN-System

### Abschaltung durch Überstromschutzeinrichtung

Das Grundprinzip dieser Schutzmaßnahme ist die automatische Abschaltung des fehlerhaften Stromkreises, siehe VDE 0100-410 (Tabelle 41.1).

|Nennspannung Stromkreis gegen Erde U₀|Maximale Abschaltzeit|
|---|---|
|**bis 230 V**|**0,4 Sek.**|
|bis 400 V|0,2 Sek.|
|Größer 400 V|0,1 Sek.|

Bei Steckdosen-Stromkreisen > 63A Nennstrom und Endstromkreisen oder Verteilerstromkreisen  >32A Nennstrom sind max. **5s** zulässig, siehe VDE 0100-410 (411.3.2.3).


---

## Messung – $Z_S$

### Messung des Schleifenwiderstandes $Z_S$

Gemessen wird der Schleifenwiderstand über den Fehlerstromkreis: Phase → Verbraucher → Schutzleiter → PEN → zurück zur Quelle.

---

## Messung – $Z_I$

### Messung des Netzinnenwiderstandes $Z_I$

_(Nachweis des Kurzschlussschutzes)_

> **Normativ keine Pflicht!!!**

---

## Kurzschlussstrom – $I_k$

### Berechnung des Kurzschlussstroms $I_k$

$$I_k = \frac{U_0}{Z_S}$$

- U₀ = Spannung gegen Erde (230 V)

**Beispiel:** Gemessener Schleifenwiderstand $Z_S$ = 1,4 Ω

$$I_k = \frac{U_0}{Z_S} = \frac{230V}{1,4\Omega} = 164A$$

---

## Kurzschlussstrom – $I_k$

### Berücksichtigung der Toleranzen VDE 0100-600 (6.4.3.7.3)

**Gründe:**

- Widerstandserhöhung der Kabel / Leitungen bei Erwärmung
- Messabweichung des Prüfgerätes
- Veränderung der Netzverhältnisse z.B. Spannungsschwankungen
- Die Toleranz ist ca. 50%

**Formel mit Toleranz:**

$$Z_s(m) \leq \frac{2}{3} \times \frac{U_0}{I_a}$$

**Beispiel:** Gemessener Schleifenwiderstand $Z_S$ = 1,4 Ω

$$I_k = \frac{U_0}{Z_S} = \frac{230V}{1{,}4\Omega} = 164A = \underline{108A}$$

$$\text{ (abzueglich ca. 34prz. Toleranz)}$$
---

## Schutzmaßnahme im TN-System

### Beispiel: gemessen Z_S = 1,4 Ω / Absicherung LS - B16

$$I_K \geq I_a$$
1. 
$$I_k = \frac{U_0}{Z_S} = \frac{230V}{1,4\Omega} = 164A = \mathbf{108A} \text{ (ca. 34prz. Toleranz)}$$
2. 
$$I_a = \text{Charakteristik} \times I_N = 5 \times 16A = 80A$$

**Beurteilung:** Der Kurzschlussstrom ist mit 108 A > als 80 A Abschaltstrom der Sicherung

> **Abschaltbedingung erfüllt!**

---

## Schutzmaßnahme im TN-System

### Beispiel: gemessen Z_S = 1,4 Ω / Absicherung LS - B16

$$I_K \geq I_a$$
1.
$$I_k = \frac{U_0}{Z_S} = \frac{230V}{1,4\Omega} = 164A$$
2.
$$I_a = \text{Charakteristik} \times I_N = 5 \times 16A = 80A + 50\text{ prz. Toleranz} = 120A$$

**Beurteilung:** Der Kurzschlussstrom ist mit 164 A > als 120 A Abschaltstrom der Sicherung

> **Abschaltbedingung erfüllt!**

---

## Spannungsfall

### Übersicht der zulässigen Spannungsfälle

|                    | TAB 2019                     | DIN 18015 Teil 1           | VDE 0100 Teil 520              |
| ------------------ | ---------------------------- | -------------------------- | ------------------------------ |
| Spannungsfall      | 0,5 rpz.                     | 3,0 prz.                   | 4 prz.                         |
| Rechtliche Vorgabe | **Muss** eingehalten werden. | **Kann** einzuhalten sein. | **Sollte** eingehalten werden. |

---

## Messungen RCD

Die Messung erfolgt zwischen L und dem Schutzleiter.

**1. Messung der Berührungsspannung $U_B$** (Impulsmethode)

**2. Messung der Abschaltzeit $t_a$** (Impulsmethode)

**3. Messung des Abschaltstroms $I_a$** (Ansteigender Prüfstrom)

> Zusätzlich ist als Funktionsprüfung die Prüftaste der RCD zu betätigen.

---

## Messung RCD Typ A – Grenzwerte (TN-Netz)

### Abschaltzeit $I_{Δt}$

| Nennspannung gegen Erde U₀ | Maximale Abschaltzeit $t_A$     |
| -------------------------- | ------------------------------- |
| **U₀ bis 230 V**           | **0,4 Sek.** (Produktnorm 0,3s) |
| U₀ bis 400 V               | 0,2 Sek.                        |
| U₀ größer 400 V            | 0,1 Sek.                        |

**Praxiswert:** In der Praxis löst ein „normaler" Fehlerstromschutzschalter in 10–60 ms aus, wenn ein Fehlerstrom $I_{ΔF}$ in der Höhe seines Bemessungs-Differenzstromes $I_{Δn}$ fließt.

---

## Messung RCD Typ A – Grenzwerte

### Berührungsspannungsmessung $U_B$

**$U_B ≤ U_L$**

|                    | Wechselspannung | Gleichspannung |
| ------------------ | --------------- | -------------- |
| Normal             | ≤ 50 V          | ≤ 120 V        |
| Besondere Bereiche | ≤ 25 V          | ≤ 60 V         |

### Abschaltzeit $I_{Δt}$ (Bauartbedingt)

|Standard RCD|Selektiver RCD|
|---|---|
|Bei ≥ I_ΔN max. 300 ms|Abschaltzeit 130–500 ms|

> **Hinweis:** Diese Abschaltzeiten gelten für alle RCD-Typen.

---

## Messung RCD Typ A – Grenzwerte

### Abschaltstrom $I_{ΔF}$

| Bemessungs-Differenzstrom $I_{ΔN}$ | Auslösestrom $I_{ΔF}$ |
| ---------------------------------- | --------------------- |
| 10 mA                              | 5–10 mA               |
| 30 mA                              | 15–30 mA              |
| 300 mA                             | 150–300 mA            |
| 500 mA                             | 250–500 mA            |

**Praxiswert:** Der Abschaltstrom eines neuen RCDs sollte zwischen 1/2 – 2/3 seines Bemessungs-Differenzstromes liegen.


---

## Messungen RCD – Typ B

### Besonderheit: Prüfung von RCDs Typ B in VDE 0100-600 (6.4.3.7.1)

_(4-Prüfschritte)_

1. Prüfung der Auslösezeit **$t_a$** und der Berührungsspannung **$U_B$** mit **Wechselfehlerstrom**
2. Prüfung des Auslösestromes **$I_a$** mit **Wechselfehlerstrom**

---

## Messungen RCD – Typ B

### Besonderheit: Prüfung von RCDs Typ B in VDE 0100-600 (6.4.3.7.1)

_(4-Prüfschritte)_

3. Prüfung der Auslösezeit **$t_a$** und der Berührungsspannung **$U_B$** mit **glattem Gleichfehlerstrom** (Positiver oder negativer Prüfstrom)
4. Prüfung des Auslösestromes **$I_a$** mit **glattem Gleichfehlerstrom** (Positiver oder negativer Prüfstrom)


---

## Messung RCD Typ B – Grenzwerte

### Berührungsspannungsmessung $U_B$

**U_B ≤ U_L**

|                    | Wechselspannung | Gleichspannung |
| ------------------ | --------------- | -------------- |
| Normal             | ≤ 50 V          | ≤ 120 V        |
| Besondere Bereiche | ≤ 25 V          | ≤ 60 V         |

### Abschaltzeit $I_{ΔM}$ nach DIN VDE 0100-410 (Tabelle 41.1) (U₀ ≤ 230 V)

| TN Netz               | TT Netz               |
| --------------------- | --------------------- |
| Abschaltzeit ≤ 400 ms | Abschaltzeit ≤ 200 ms |

> **Hinweis:** Diese Abschaltzeiten gelten für alle RCD-Typen.


---

## Messung RCD Typ B – Grenzwerte DC

### Abschaltstrom $I_{ΔF}$

| Bemessungs-Differenzstrom $I_{ΔN}$ | Auslösestrom $I_{ΔF}$ |
| ---------------------------------- | --------------------- |
| 10 mA                              | 5–20 mA               |
| 30 mA                              | 15–60 mA              |
| 300 mA                             | 150–600 mA            |
| 500 mA                             | 250–1000 mA           |

> **Hinweis:** Der Abschaltstrom eines RCDs Typ B darf laut der Produktnorm zwischen 50–200% des Bemessungs-Differenzstromes bei Gleichfehlerströmen liegen.

---

## Messung Erdausbreitungswiderstand

### VDE 0100-600 (Verfahren C2)

$$R_E = R_{ESim} - \frac{1}{2} \times R_I - R_B$$

---

## Dokumentation Anhang NA (Normativ)

### Mindestinhalte eines Prüfberichts

Der Prüfbericht muss folgende Mindestangaben enthalten:

#### 1. Allgemeine Angaben

- Name und Anschrift des **Auftraggebers**
- Name und Anschrift des **Auftragnehmers**
- Bezeichnung der einzelnen Prüfprotokolle für die Dokumentation von Messwerten (Protokoll-Nr.) – optional
- **Bezeichnung des Objekts**, z. B. Anlage, Gebäude, Gebäudeteile, Verteiler, Stromkreise. Aus der Dokumentation müssen die geprüften Stromkreise, bei denen **unzureichende Messwerte** festgestellt wurden, mit deren Bezeichnungen und die zugehörigen Schutzeinrichtungen ersichtlich sein.
- Verwendete **Mess- und Prüfgeräte**

---

## Dokumentation Anhang NA (Normativ)

### Mindestinhalte eines Prüfberichts

#### 2. Bewertung der Prüfung

Alle bei dem Besichtigen, Erproben und Messen ermittelten Informationen sowie die Ergebnisse von Berechnungen müssen vom Prüfer bewertet werden. Diese **Bewertung ist das Ergebnis** der Prüfung. Das Ergebnis der Prüfung ist, einschließlich der für die Bewertung relevanten **unzureichenden Messwerte** zu dokumentieren. Bei der Bewertung sollten auch Messwerte, die die Normanforderungen erfüllen, aber **auffällig** von den zu erwarteten Werten abweichen, berücksichtigt werden.

> Eine Dokumentation aller einzelnen Messwerte ist **nicht** gefordert.

#### 3. Prüfstelle, Prüfer, Prüfdatum, Unterschrift


---

## Hilfstabelle: Beurteilung Schutzleiterwiderstand

Leitungsquerschnitt und Länge der zu prüfenden Leitung

|          | 1,0 mm² | 1,5 mm²  | 2,5 mm² | 4 mm²   | 6 mm²    | 10 mm²  | 16 mm²  |
| -------- | ------- | -------- | ------- | ------- | -------- | ------- | ------- |
| **1 m**  | 19 mΩ   | 12,1 mΩ  | 7,5 mΩ  | 5,0 mΩ  | 3,2 mΩ   | 1,9 mΩ  | 1,2 mΩ  |
| **2 m**  | 38 mΩ   | 24,2 mΩ  | 15 mΩ   | 10,0 mΩ | 6,4 mΩ   | 3,8 mΩ  | 2,4 mΩ  |
| **3 m**  | 57 mΩ   | 36,3 mΩ  | 22,5 mΩ | 15,0 mΩ | 9,6 mΩ   | 5,7 mΩ  | 3,6 mΩ  |
| **4 m**  | 76 mΩ   | 48,4 mΩ  | 30,0 mΩ | 20,0 mΩ | 12,8 mΩ  | 7,6 mΩ  | 4,8 mΩ  |
| **5 m**  | 95 mΩ   | 60,5 mΩ  | 37,5 mΩ | 25,0 mΩ | 16,0 mΩ  | 9,5 mΩ  | 6,0 mΩ  |
| **6 m**  | 114 mΩ  | 72,6 mΩ  | 45,0 mΩ | 30,0 mΩ | 19,2 mΩ  | 11,4 mΩ | 7,2 mΩ  |
| **7 m**  | 133 mΩ  | 84,1 mΩ  | 52,5 mΩ | 35,0 mΩ | 22,4 mΩ  | 13,3 mΩ | 8,4 mΩ  |
| **8 m**  | 152 mΩ  | 96,8 mΩ  | 60,0 mΩ | 40,0 mΩ | 25,6 mΩ  | 15,2 mΩ | 9,6 mΩ  |
| **9 m**  | 171 mΩ  | 108,9 mΩ | 67,5 mΩ | 45,0 mΩ | 28,8 mΩ  | 17,1 mΩ | 10,8 mΩ |
| **10 m** | 190 mΩ  | 121 mΩ   | 75,0 mΩ | 50,0 mΩ | 32,0 mΩ  | 19,0 mΩ | 12,0 mΩ |
| **20 m** | 380 mΩ  | 242 mΩ   | 150 mΩ  | 100 mΩ  | 64,0 mΩ  | 38,0 mΩ | 24,0 mΩ |
| **30 m** | 570 mΩ  | 363 mΩ   | 225 mΩ  | 150 mΩ  | 96,0 mΩ  | 57,0 mΩ | 36,0 mΩ |
| **40 m** | 760 mΩ  | 484 mΩ   | 300 mΩ  | 200 mΩ  | 128,0 mΩ | 76,0 mΩ | 48,0 mΩ |
| **50 m** | 950 mΩ  | 605 mΩ   | 375 mΩ  | 250 mΩ  | 160,0 mΩ | 95,0 mΩ | 60,0 mΩ |

Widerstandswerte bei 20°C (gerundet) in mΩ pro angegebenen Querschnitt und der dazugehörigen Länge.

> **Wichtig:** Pro Verbindungsstelle ist zwischen 1 und 2 Meter der jeweiligen Leitungslänge hinzuzurechnen, um die Übergangswiderstände der Verbindungs- und Kontaktstellen zu berücksichtigen.

---

