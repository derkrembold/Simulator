# Bauteile – testcase_05

Ergänzung zu `netzplan.md`: Eigenschaften der Bauteile, die aus der reinen
Verdrahtung nicht ableitbar sind (Nennstrom, Typ, Charakteristik, ...).

**Status: abgestimmt.**

## Bauteile

| Bauteil             | Gruppe | Typ/Charakteristik | Fehlerstrom | Nennstrom | Max. Querschnitt | Pole | Selektiv | Abklemmen | Anzahl LS | tA  | IA  | UB  | AFDD |
| -------------------- | ------ | ------------------ | ----------- | --------- | ---------------- | ---- | -------- | --------- | --------- | --- | --- | --- | ---- |
| **Einheit**          |        |                    | mA          | A         | mm²              |      |          |           |           | ms  | mA  | V   |      |
| Hauptschalter        | –      | –                  | –           | 35        | 16               | 3    | –        | –         | –         | –   | –   | –   | –    |
| L1-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   | –    |
| L2-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   | –    |
| L3-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   | –    |
| N-Klemme             | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   | –    |
| PE-Klemme            | –      | –                  | –           | 63        | 16               | –    | –        | –         | –         | –   | –   | –   | –    |
| RCD1                 | G1     | A                  | 30          | 40        | 16               | 4    | nein     | nein      | 1         | 20  | 16  | 0.9 | –    |
| LS1                  | G1     | B                  | –           | 16        | 16               | 3    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_L1_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_L2_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_L3_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_N_SK1   | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_PE_SK1  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| RCD2                 | G2     | B                  | 30          | 40        | 16               | 2    | nein     | nein      | 2         | 21  | 24  | 0.9 | –    |
| LS2                  | G2     | B                  | –           | 20        | 16               | 2    | –        | –         | –         | –   | –   | –   | ja   |
| LS3                  | G2     | B                  | –           | 16        | 16               | 2    | –        | –         | –         | –   | –   | –   | ja   |
| Reihenklemme_L_SK2   | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_N_SK2   | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_PE_SK2  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_L_SK3   | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_N_SK3   | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |
| Reihenklemme_PE_SK3  | –      | –                  | –           | 16        | 4                | 1    | –        | –         | –         | –   | –   | –   | –    |

## Stromkreise

| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |
|---|---|---|---|
| SK1 | Steckdose Werkstatt (Drehstrom) | Drehstromsteckdose | nein / ja / ja |
| SK2 | Steckdose Schlafzimmer | Steckdose | nein / ja / ja |
| SK3 | Steckdose Kinderzimmer | Steckdose | nein / ja / ja |

## Steckdosen (Platzierung)

Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des
Schaltkastens. Jede Zelle referenziert eine SK-Nummer aus der
Stromkreise-Tabelle oben (Endstellen-Typ wird von dort übernommen, nicht hier
dupliziert); `–` = leere Zelle. Optionales `@<Winkel>`-Suffix (90/180/270)
dreht die Zeichnung im Uhrzeigersinn beim Installieren, ohne Suffix = 0°.

|         | Spalte 1 | Spalte 2 | Spalte 3 |
|---------|----------|----------|----------|
| Reihe 1 | SK1      | SK2      | SK3      |

## Anlage (Kopfdaten)

| Feld | Wert | Einheit |
|---|---|---|
| Name | Unterverteiler Testcase 05 | – |
| Beschreibung | 3-poliger Hauptschalter, Gruppe G1 = 4-poliger RCD + EIN 3-poliger LS (dreiphasiger Stromkreis), Gruppe G2 = 2-poliger RCD + zwei "LS mit AFDD"-Kombigeräte (je 2-polig, baulich wie ein 2-poliger RCD) - beide Gruppen auf derselben Hutschiene | – |
| Netzform | TN-S | – |
| Spannung Einspeisung | 400 | V |
| Spannung Stromkreise | 400 | V |

## Offene Fragen (bitte gemeinsam klären)

Keine mehr offen.
