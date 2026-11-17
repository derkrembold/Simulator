# Bauteile – Unterverteiler Demo 16

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB | AFDD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V | – |
| Hauptschalter | – | – | – | 63 | 16 | 3 | – | – | – | – | – | – | – |
| L1-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – |
| L2-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – |
| L3-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – |
| N-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – |
| PE-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – |
| RCD1 | G1 | A | 30 | 40 | 16 | 4 | nein | nein | 4 | 22 | 18 | 1 | – |
| LS1 | G1 | C | – | 20 | 16 | 3 | – | – | – | – | – | – | – |
| LS2 | G1 | B | – | 16 | 16 | 2 | – | – | – | – | – | – | ja |
| LS3 | G1 | B | – | 10 | 16 | 1 | – | – | – | – | – | – | – |
| LS4 | G1 | B | – | 16 | 16 | 2 | – | – | – | – | – | – | ja |
| RCD2 | G2 | A | 30 | 25 | 16 | 2 | nein | nein | 2 | 22 | 18 | 1 | – |
| LS5 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – | – |
| LS6 | G2 | B | – | 16 | 16 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L1_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L2_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L3_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_N_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_N_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_N_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_N_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_N_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_L_SK6 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_N_SK6 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK6 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | RCD-Test (ja/nein) |
|---|---|---|---|
| SK1 | Maschinen Drehstrom | Drehstromsteckdose | ja |
| SK2 | Hobelbank Steckdosen | Steckdose | ja |
| SK3 | Werkstatt Licht | Lichtauslass | ja |
| SK4 | Maschinenraum Licht, Steckdose | Lichtauslass | ja |
| SK5 | Lager Licht | Lichtauslass | ja |
| SK6 | Büro Steckdose und Licht | Steckdose | ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |
| Reihe 2 | – | SK2 | SK3 |
| Reihe 3 | – | SK2 | SK3 |
| Reihe 4 | SK4 | SK5 | SK6 |
| Reihe 5 | SK4:Steckdose | SK5 | SK6:Lichtauslass |
| Reihe 6 | SK4:Steckdose | – | – |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Demo 16 | – |
| Beschreibung | Schreinerwerkstatt: 3-poliger Hauptschalter, RCD (4-polig) mit Drehstrom, Licht, Steckdosen und AFDD, RCD (2-polig) mit Lager und Büro | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |
| Vorimpedanz | 0,2 | Ω |
