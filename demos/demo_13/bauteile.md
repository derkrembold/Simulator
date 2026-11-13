# Bauteile – Unterverteiler Demo 13

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V |
| Hauptschalter | – | – | – | 32 | 16 | 2 | – | – | – | – | – | – |
| PE-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – |
| RCD1 | G1 | F | 30 | 25 | 16 | 2 | nein | nein | 2 | 22 | 18 | 1 |
| LS1 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| LS2 | G1 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS3 | G2 | C | – | 16 | 16 | 1 | – | – | – | – | – | – |
| RCD2 | G3 | A | 30 | 25 | 16 | 2 | nein | nein | 2 | 22 | 18 | 1 |
| LS4 | G3 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS5 | G3 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
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
| SK1 | Küche Steckdosen | Steckdose | nein / ja / ja |
| SK2 | Küche Licht | Lichtauslass | nein / ja / ja |
| SK3 | Waschküche Steckdose | Steckdose | nein / ja / nein |
| SK4 | Flur Licht | Lichtauslass | nein / ja / ja |
| SK5 | Flur Steckdose | Steckdose | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |
| Reihe 2 | SK1 | – | – |
| Reihe 3 | SK4 | SK5 | – |
| Reihe 4 | SK4 | – | – |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Demo 13 | – |
| Beschreibung | 2-poliger Hauptschalter, 2 RCD (2-polig, Typ F und A), 1 LS ohne RCD, 5 LS (Steckdosen, Licht) | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |
| Vorimpedanz | 0,3 | Ω |
