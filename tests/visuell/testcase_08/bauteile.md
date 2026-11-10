# Bauteile – Unterverteiler Demo 08

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V |
| Hauptschalter | – | – | – | 35 | 16 | 3 | – | – | – | – | – | – |
| L1-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| L2-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| L3-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| N-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| PE-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| RCD1 | G1 | B | 30 | 40 | 16 | 2 | nein | nein | 1 | 22 | 18 | 1 |
| LS1 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| RCD2 | G2 | A | 30 | 40 | 16 | 2 | nein | nein | 2 | 22 | 18 | 1 |
| LS2 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS3 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS4 | G3 | B | – | 16 | 16 | 3 | – | – | – | – | – | – |
| Reihenklemme_L_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L1_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L2_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L3_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Kueche | Steckdose | nein / ja / ja |
| SK2 | Kueche | Lichtauslass | nein / ja / ja |
| SK3 | Kueche | Steckdose | nein / ja / ja |
| SK4 | Kueche | 5-polige Anschlussdose | nein / ja / nein |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |
| Reihe 2 | SK1:Lichtauslass | SK2:Steckdose | SK3 |
| Reihe 3 | SK4 | – | – |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Demo 08 | – |
| Beschreibung | 3-poliger Hauptschalter, 2 RCD (2-polig), 4 LS (Steckdosen, Licht, Herdanschlussdose) | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |
