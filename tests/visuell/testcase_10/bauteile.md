# Bauteile – Sonderfälle

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

## Bauteile

| Bauteil | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA | IA | UB | AFDD | Riso Elektronik (MΩ) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Einheit** |  |  | mA | A | mm² |  |  |  |  | ms | mA | V | – | – |
| Hauptschalter | – | – | – | 35 | 16 | 3 | – | – | – | – | – | – | – | – |
| L1-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – |
| L2-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – |
| L3-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – |
| N-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – |
| PE-Klemme | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – |
| PE-Klemme_H2 | – | – | – | 63 | 16 | – | – | – | – | – | – | – | – | – |
| RCD1 | G1 | B | 30 | 40 | 16 | 4 | nein | nein | 3 | 22 | 18 | 1 | – | 0,15 |
| LS1 | G1 | C | – | 16 | 16 | 3 | – | – | – | – | – | – | – | – |
| LS2 | G1 | C | – | 16 | 16 | 3 | – | – | – | – | – | – | – | – |
| LS3 | G1 | B | – | 16 | 16 | 1 | – | – | – | – | – | – | – | – |
| RCD2 | G2 | A | 30 | 40 | 16 | 2 | nein | nein | 2 | 22 | 18 | 1 | – | – |
| LS4 | G2 | B | – | 16 | 16 | 2 | – | – | – | – | – | – | ja | 0,3 |
| LS5 | G2 | B | – | 10 | 16 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L1_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L2_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L3_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK1 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L1_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L2_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L3_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK2 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK3 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK4 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_L_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_N_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |
| Reihenklemme_PE_SK5 | – | – | – | 16 | 4 | 1 | – | – | – | – | – | – | – | – |

## Stromkreise

| Stromkreis | Ziel | Endstelle | RCD-Test (ja/nein) |
|---|---|---|---|
| SK1 | CEE Werkbank | Drehstromsteckdose | ja |
| SK2 | CEE Kompressor | Drehstromsteckdose | ja |
| SK3 | Werkbank | Steckdose | ja |
| SK4 | Büro | Steckdose | ja |
| SK5 | Licht Büro | Lichtauslass | ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1 | SK2 | SK3 |
| Reihe 2 | – | – | SK3 |
| Reihe 3 | – | – | SK3:Lichtauslass |
| Reihe 4 | SK4 | SK5 | – |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Sonderfälle | – |
| Beschreibung | Linksdrehfeld, gemischte Endstellen, AFDD, Riso-Elektronik Typ B/AFDD, Hutschiene ohne PE, PE-Klemme auf Gruppen-Hutschiene, PE-Fehler am Zubringer | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |
