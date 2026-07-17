# Bauteile – testcase_05

Ergänzung zu `netzplan.md`: Eigenschaften der Bauteile, die aus der reinen
Verdrahtung nicht ableitbar sind (Nennstrom, Typ, Charakteristik, ...).

**Status: abgestimmt.**

## Bauteile

| Bauteil             | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA  | IA  | UB  |
| -------------------- | ------ | ------------------ | ----------- | --------- | ---------------- | ---- | -------- | --------- | --------- | --- | --- | --- |
| **Einheit**          |        |                    | mA          | A         | mm²              |      |          |           |           | ms  | mA  | V   |
| Hauptschalter        | –      | –                  | –           | 35        | 16               | 3    | –        | –         | –         | –   | –   | –   |
| L1-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| L2-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| L3-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| N-Klemme             | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| PE-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| RCD1                 | G1     | A                  | 30          | 40        | 16               | 4    | nein     | nein      | 1         | 20  | 16  | 0.9 |
| LS1                  | G1     | B                  | –           | 16        | 16               | 3    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L1_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L2_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L3_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK1   | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Steckdose Werkstatt (Drehstrom) | Drehstromsteckdose | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des
Schaltkastens. Jede Zelle referenziert eine SK-Nummer aus der
Stromkreise-Tabelle oben (Endstellen-Typ wird von dort übernommen, nicht hier
dupliziert); `–` = leere Zelle. Optionales `@<Winkel>`-Suffix (90/180/270)
dreht die Zeichnung im Uhrzeigersinn beim Installieren, ohne Suffix = 0°.

|         | Spalte 1 |
|---------|----------|
| Reihe 1 | SK1      |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Testcase 05 | – |
| Beschreibung | 3-poliger Hauptschalter, 4-poliger RCD, EIN 3-poliger LS (statt drei einpoliger) für einen einzigen dreiphasigen Stromkreis | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |

## Offene Fragen (bitte gemeinsam klären)

Keine mehr offen.
