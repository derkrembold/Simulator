# Bauteile – Unterverteiler Demo 06

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
| RCD1 | G1 | A | 30 | 40 | 16 | 2 | nein | nein | 2 | 22 | 18 | 1 |
| LS1 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – |
| LS2 | G1 | B | – | 10 | 16 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_L_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_N_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |
| Reihenklemme_PE_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Zimmer 1 | Steckdose | nein / ja / ja |
| SK2 | Licht Zimmer 1 | Lichtauslass | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 |
|---------|----------|----------|
| Reihe 1 | SK1 | SK2 |
| Reihe 2 | SK1 | – |
| Reihe 3 | SK1:Lichtauslass | – |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Demo 06 | – |
| Beschreibung | Gemischte Endstellen: SK1 versorgt zwei Steckdosen und einen Lichtauslass | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |
