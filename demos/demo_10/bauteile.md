# Bauteile – Unterverteiler Demo 10

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V |
| Hauptschalter | – | – | – | 50 | 16 | 3 | – | – | – | – | – | – |
| L1-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| L2-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| L3-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| N-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| PE-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| RCD1 | G1 | B | 30 | 40 | 16 | 4 | nein | nein | 1 | 22 | 18 | 1 |
| LS1 | G1 | B | – | 16 | 16 | 3 | – | – | – | – | – | – |
| RCD2 | G2 | A | 30 | 40 | 16 | 4 | nein | nein | 4 | 22 | 18 | 1 |
| LS2 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS3 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS4 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS5 | G2 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| Reihenklemme_L1_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L2_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L3_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Keller, Drehstrom | Drehstromsteckdose | nein / ja / ja |
| SK2 | Keller, Licht | Lichtauslass | nein / ja / ja |
| SK3 | Keller, Licht | Lichtauslass | nein / ja / ja |
| SK4 | Keller, Steckdose | Steckdose | nein / ja / ja |
| SK5 | Keller, Steckdose | Steckdose | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |
| Reihe 2 | – | SK2:Steckdose | SK3 |
| Reihe 3 | SK4 | SK5 | – |
| Reihe 4 | SK4 | SK5 | – |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Demo 10 | – |
| Beschreibung | Keller Demo | – |
| Netzform | TN-C-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |
