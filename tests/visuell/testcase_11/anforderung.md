# Anforderung – testcase_11

RCBO (LS mit eingebautem RCD, sim-8as): ein 2-poliger RCBO Typ A an einer Steckdose, ein
4-poliger RCBO Typ B an einer Drehstromsteckdose und zum Vergleich eine normale Gruppe mit
RCD und LS. Erzeugt mit `node tools/demo_erstellung.js testcase_11`, Regeln siehe
`demos/anforderung_vorlage.md`.

## Anlage

| Feld                 | Wert                                                                    |
| -------------------- | ----------------------------------------------------------------------- |
| Name                 | Unterverteiler Testcase 11                                              |
| Beschreibung         | RCBO 2-polig Typ A (Steckdose), RCBO 4-polig Typ B (Drehstromsteckdose), RCD 2-polig mit LS (Licht) |
| Netzform             | TN-S                                                                    |
| Hauptschalter Pole   | 3                                                                       |
| Hauptschalter (A)    | 35                                                                      |
| Vorimpedanz (Ω)      |                                                                         |
| Fehler Einspeisung L (Ω) |                                                                     |
| Fehler Einspeisung N (Ω) |                                                                     |
| Fehler PE Einspeisung (Ω) |                                                                    |
| Fehler PE-Klemme Zubringer (Ω) |                                                               |
| PE-Klemme mit Hutschiene verbunden (ja/nein) |                                                 |

## Gruppen

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen | Fehler L (Ω) | Fehler N (Ω) | Imess AC (mA) | tA AC (ms) |
| ------ | -------- | ------- | ---------------- | ----------------- | -------- | --------- | ------------ | ------------ | ------------- | ---------- |
| G1     | RCBO     | A       | 30               |                   |          |           |              |              | 21            | 18         |
| G2     | RCBO     | B       | 30               |                   |          |           |              |              |               |            |
| G3     | 2        | A       | 30               | 40                | nein     | nein      |              |              |               |            |

## Stromkreise

| Stromkreis | Gruppe | Ziel                     | Endstelle          | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | RCD | Fehler L (Ω) | Fehler N (Ω) |
| ---------- | ------ | ------------------------ | ------------------ | ------------ | ------- | -------- | ------ | ----- | --- | ------------ | ------------ |
| SK1        | G1     | Steckdose Werkbank       | Steckdose          | 1            | 1       | B        | 16     | L1    | ja  | 0,1          |              |
| SK2        | G2     | Drehstromsteckdose       | Drehstromsteckdose | 1            | 3       | C        | 16     |       | ja  |              |              |
| SK3        | G3     | Licht Werkstatt          | Lichtauslass       | 1            | 1       | B        | 10     | L2    | ja  |              |              |
