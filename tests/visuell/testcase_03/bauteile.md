# Bauteile – testcase_03

Ergänzung zu `netzplan.md`: Eigenschaften der Bauteile, die aus der reinen
Verdrahtung nicht ableitbar sind.

**Status: abgestimmt.**

## Bauteile

| Bauteil             | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA  | IA  | UB  |
| -------------------- | ------ | ------------------- | ----------- | --------- | ----------------- | ---- | -------- | --------- | --------- | --- | --- | --- |
| **Einheit**          |        |                     | mA          | A         | mm²               |      |          |           |           | ms  | mA  | V   |
| Hauptschalter        | –      | –                   | –           | 25        | 16                | 2    | –        | –         | –         | –   | –   | –   |
| L-Klemme             | –      | –                   | –           | 63        | 16                | –    | –        | –         | –         | –   | –   | –   |
| N-Klemme             | –      | –                   | –           | 63        | 16                | –    | –        | –         | –         | –   | –   | –   |
| PE-Klemme            | –      | –                   | –           | 63        | 16                | –    | –        | –         | –         | –   | –   | –   |
| RCD1                 | G1     | A                   | 30          | 40        | 16                | 2    | nein     | nein      | 2         | 20  | 16  | 0.9 |
| RCD2                 | G2     | A                   | 30          | 40        | 16                | 2    | nein     | nein      | 2         | 22  | 18  | 1.0 |
| RCD3                 | G3     | A                   | 30          | 40        | 16                | 2    | nein     | nein      | 2         | 24  | 20  | 0.8 |
| LS1                  | G1     | B                   | –           | 16        | 16                | 1    | –        | –         | –         | –   | –   | –   |
| LS2                  | G1     | B                   | –           | 10        | 16                | 1    | –        | –         | –         | –   | –   | –   |
| LS3                  | G2     | B                   | –           | 16        | 16                | 1    | –        | –         | –         | –   | –   | –   |
| LS4                  | G2     | B                   | –           | 16        | 16                | 1    | –        | –         | –         | –   | –   | –   |
| LS5                  | G3     | B                   | –           | 16        | 16                | 1    | –        | –         | –         | –   | –   | –   |
| LS6                  | G3     | B                   | –           | 10        | 16                | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK1   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK1   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK1  | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK2   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK2   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK2  | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK3   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK3   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK3  | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK4   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK4   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK4  | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK5   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK5   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK5  | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_L_SK6   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_N_SK6   | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |
| Reihenklemme_PE_SK6  | –      | –                   | –           | 16        | 4                 | 1    | –        | –         | –         | –   | –   | –   |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Steckdosen Zimmer 1 | Steckdose | nein / ja / ja |
| SK2 | Licht Zimmer 1 | Lichtauslass | nein / ja / ja |
| SK3 | Steckdosen Zimmer 2 | Steckdose | nein / ja / ja |
| SK4 | Steckdosen Zimmer 3 | Steckdose | nein / ja / ja |
| SK5 | Steckdosen Zimmer 4 | Steckdose | nein / ja / ja |
| SK6 | Licht Zimmer 2 | Lichtauslass | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des
Schaltkastens (View-Objekt, noch nicht umgesetzt). Jede Zelle referenziert
eine SK-Nummer aus der Stromkreise-Tabelle oben (Endstellen-Typ Steckdose
vs. Anschlussdose/Lichtauslass wird von dort übernommen, nicht hier
dupliziert); `–` = leere Zelle. Optionales `@<Winkel>`-Suffix (90/180/270)
dreht die Zeichnung im Uhrzeigersinn beim Installieren, ohne Suffix = 0°.
Mehrfaches Vorkommen derselben SK-Nummer = mehrere Steckdosen an dieser
Endstelle.

|         | Spalte 1 | Spalte 2 |
|---------|----------|----------|
| Reihe 1 | SK1@180  | SK2      |
| Reihe 2 | SK3      | SK4      |
| Reihe 3 | SK5@180  | SK6      |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Testcase 03 | – |
| Beschreibung | 3 RCDs auf einer Schiene: RCD -> LS -> LS (x3) | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 230 | V |

## Offene Fragen (bitte gemeinsam klären)

Keine mehr offen.
