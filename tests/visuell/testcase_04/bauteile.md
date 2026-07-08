# Bauteile – testcase_04

Ergänzung zu `netzplan.md`: Eigenschaften der Bauteile, die aus der reinen
Verdrahtung nicht ableitbar sind.

**Status: abgestimmt.**

## Bauteile

| Bauteil             | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA  | IA  | UB  |
| ------------------- | ------ | ------------------ | ----------- | --------- | ---------------- | ---- | -------- | --------- | --------- | --- | --- | --- |
| **Einheit**         |        |                    | mA          | A         | mm²              |      |          |           |           | ms  | mA  | V   |
| Hauptschalter       | –      | –                  | –           | 35        | 16               | 3    | –        | –         | –         | –   | –   | –   |
| L1-Klemme           | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| L2-Klemme           | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| L3-Klemme           | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| N-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| PE-Klemme           | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   |
| RCD1                | G1     | A                  | 30          | 40        | 16               | 4    | nein     | nein      | 3         | 20  | 16  | 0.9 |
| LS1                 | G1     | B                  | –           | 16        | 16               | 1    | –        | –         | –         | –   | –   | –   |
| LS2                 | G1     | B                  | –           | 16        | 16               | 1    | –        | –         | –         | –   | –   | –   |
| LS3                 | G1     | B                  | –           | 16        | 16               | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK1 | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK2  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK2  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK2 | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK3  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK3  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK3 | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Steckdosen Zimmer 1 (L1) | Steckdose | nein / ja / ja |
| SK2 | Steckdosen Zimmer 2 (L2) | Steckdose | nein / ja / ja |
| SK3 | Steckdosen Zimmer 3 (L3) | Steckdose | nein / ja / ja |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Testcase 04 | – |
| Beschreibung | 3-poliger Hauptschalter, 4-poliger RCD auf 3 Phasen (L1/L2/L3) | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |

## Offene Fragen (bitte gemeinsam klären)

Keine mehr offen.
