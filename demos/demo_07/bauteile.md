# Bauteile – Unterverteiler Demo 07

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
| RCD1 | G1 | B | 30 | 40 | 16 | 4 | nein | nein | 6 | 22 | 18 | 1 |
| LS1 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| LS2 | G1 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS3 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| LS4 | G1 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| LS5 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| LS6 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
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
| Reihenklemme_L_SK6 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK6 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK6 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Steckdosen Zimmer 1 | Steckdose | nein / ja / ja |
| SK2 | Licht Zimmer 1 | Lichtauslass | nein / ja / ja |
| SK3 | Steckdosen Zimmer 2 | Steckdose | nein / ja / ja |
| SK4 | Licht Zimmer 2 | Lichtauslass | nein / ja / ja |
| SK5 | Steckdosen Zimmer 3 | Steckdose | nein / ja / ja |
| SK6 | Licht Zimmer 3 | Lichtauslass | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |
| Reihe 2 | SK1:Lichtauslass | SK2 | SK3:Lichtauslass |
| Reihe 3 | SK4 | SK5 | SK6 |
| Reihe 4 | SK4 | SK5 | SK6 |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Demo 07 | – |
| Beschreibung | Mittlere Demo: 3-poliger Hauptschalter, 1 RCD (4-polig), 6 LS (Steckdosen und Licht) | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |
