# Bauteile – testcase_01

Ergänzung zu `netzplan.md`: Eigenschaften der Bauteile, die aus der reinen
Verdrahtung nicht ableitbar sind (Nennstrom, Typ, Charakteristik, ...).

**Status: abgestimmt.**

## Bauteile

| Bauteil             | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA   | IA   | UB  |
| ------------------- | ------ | ------------------ | ----------- | --------- | ---------------- | ---- | -------- | --------- | --------- | ---- | ---- | --- |
| **Einheit**         |        |                    | mA          | A         | mm²              |      |          |           |           | ms   | mA   | V   |
| Leistungsschalter   | –      | –                  | –           | 25        | 35               | 2    | –        | –         | –         | –    | –    | –   |
| PE-Klemme           | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –    | –    | –   |
| RCD1                | G1     | A                  | 30          | 40        | 16               | 2    | nein     | nein      | 2         | 22   | 18   | 1   |
| LS1                 | G1     | B                  | –           | 16        | 16               | 1    | –        | –         | –         | –    | –    | –   |
| LS2                 | G1     | B                  | –           | 10        | 16               | 1    | –        | –         | –         | –    | –    | –   |
| Reihenklemme_L_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –    | –    | –   |
| Reihenklemme_N_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –    | –    | –   |
| Reihenklemme_PE_SK1 | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –    | –    | –   |
| Reihenklemme_L_SK2  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –    | –    | –   |
| Reihenklemme_N_SK2  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –    | –    | –   |
| Reihenklemme_PE_SK2 | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –    | –    | –   |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Steckdosen Zimmer 1 | Steckdose | nein / ja / ja |
| SK2 | Licht Zimmer 1 | Lichtauslass | nein / ja / ja |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Testcase 01 | – |
| Beschreibung | Einfachste Konfiguration: 1 RCD, 2 LS, 1 Hauptschalter, 1 PE-Klemme | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |

## Offene Fragen (bitte gemeinsam klären)

Keine mehr offen.
