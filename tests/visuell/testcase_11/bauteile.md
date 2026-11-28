# Bauteile – Unterverteiler Testcase 11

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB | tA DC | IA DC | RCBO |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V | ms | mA | – |
| Hauptschalter | – | – | – | 35 | 16 | 3 | – | – | – | – | – | – | – | – | – |
| L1-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – | – |
| L2-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – | – |
| L3-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – | – |
| N-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – | – |
| PE-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – | – |
| LS1 | G1 | B | 30 | 16 | 16 | 2 | – | – | – | 18 | 21 | 1 | – | – | A |
| LS2 | G2 | C | 30 | 16 | 16 | 4 | – | – | – | 22 | 18 | 1 | 25 | 58 | B |
| RCD1 | G3 | A | 30 | 40 | 16 | 2 | nein | nein | 1 | 22 | 18 | 1 | – | – | – |
| LS3 | G3 | B | – | 10 | 16 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_L_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_L1_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_L2_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_L3_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_L_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | RCD-Test (ja/nein) |
|---|---|---|---|
| SK1 | Steckdose Werkbank | Steckdose | ja |
| SK2 | Drehstromsteckdose | Drehstromsteckdose | ja |
| SK3 | Licht Werkstatt | Lichtauslass | ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Testcase 11 | – |
| Beschreibung | RCBO 2-polig Typ A (Steckdose), RCBO 4-polig Typ B (Drehstromsteckdose), RCD 2-polig mit LS (Licht) | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |
