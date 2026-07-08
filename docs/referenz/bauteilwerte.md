# Gültige Bauteil-Werte

Referenz für die Felder in `bauteile.md` (pro Testcase) — welche Werte dort erlaubt
sind. Konsolidiert aus KONZEPT.md plus ergänzten Normreihen.

## LS (Leitungsschutzschalter)

**Charakteristik:** B, C, D, K, Z

**Nennstrom (Normreihe nach IEC 60898):**
6A, 10A, 13A, 16A, 20A, 25A, 32A, 35A, 40A, 50A, 63A, 80A, 100A, 125A

**Pole:** 1, 2, 3

## RCD

**Typ:** AC, A, F, B, B+

**Fehlerstrom ($I_{\Delta N}$):** 10mA, 30mA, 100mA, 300mA, 500mA

**Nennstrom:** 16A, 25A, 40A, 63A, 80A, 100A, 125A

**Pole:** 2, 4

**Anzahl LS (Bemessungsregel, siehe KONZEPT.md Phase 2):**
- 2-poliger RCD → max. 2 LS
- 4-poliger RCD → max. 6 LS
- RCD-Nennstrom muss größer sein als jeder einzelne angeschlossene LS

**Selektiv:** ja, nein

## Hauptsicherung / Hauptschalter

**Typ:** Leistungsschalter, SLS, Hauptschalter

**Pole:** 2, 3

## Leitung

**Typ:** NYM-J, NYY-J, H07RN-F, H05RN-F

**Querschnitt (mm², Normreihe):**
1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95

## Sonstige Felder

**Abklemmen:** ja, nein
