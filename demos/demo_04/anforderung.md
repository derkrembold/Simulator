# Anforderung – demo_04

Vorlage für eine neue Demo-Anlage. Anlegen mit `node tools/demo_erstellung.js demo_NN --neu`,
Werte ändern, dann `node tools/demo_erstellung.js demo_04`. Netz-IDs, Leiterquerschnitte, Klemmen,
Hutschienen, Farben und die Prüfwerte des RCD werden vom Werkzeug abgeleitet und hier nicht
eingetragen.

Ausgefüllt ist das Beispiel **demo_04**.

## Erlaubte Werte

| Feld                 | Werte                                                               |
| -------------------- | ------------------------------------------------------------------- |
| Hauptschalter Pole   | 2, 3                                                                |
| RCD Pole             | 2, 4, ohne                                                          |
| RCD Typ              | AC, A, F, B, B+                                                     |
| RCD Fehlerstrom (mA) | 10, 30, 100, 300, 500                                               |
| RCD Nennstrom (A)    | 16, 25, 40, 63, 80, 100, 125                                        |
| LS Pole              | 1, 3                                                                |
| LS Charakteristik    | B, C, D, K, Z                                                       |
| LS Nennstrom (A)     | 6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63                           |
| Phase (nur 1-polig)  | L1, L2, L3                                                          |
| Endstelle            | Steckdose, Lichtauslass, Drehstromsteckdose, 5-polige Anschlussdose |
| Ja/Nein              | ja, nein                                                            |

Regeln, die das Werkzeug prüft: 2-poliger RCD höchstens 2 LS, 4-poliger RCD höchstens 6 LS,
RCD-Nennstrom größer als jeder LS, eine Hutschiene höchstens 16 TE.

## Anlage

| Feld               | Wert                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| Name               | Unterverteiler Demo 04                                                             |
| Beschreibung       | 3-poliger Hauptschalter, 4 RCD (2x 2-polig, 2x 4-polig), 6 LS (Steckdosen, Licht, Drehstromsteckdose, Anschlussdose) |
| Netzform           | TN-S                                                                               |
| Hauptschalter Pole | 3                                                                                  |
| Hauptschalter (A)  | 35                                                                                 |

## Gruppen

Eine Gruppe ist ein RCD mit den dahinter liegenden LS. `ohne` bei RCD Pole = LS direkt am
Hauptschalter.

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen |
| ------ | -------- | ------- | ---------------- | ----------------- | -------- | --------- |
| G1     | 2        | A       | 30               | 40                | nein     | nein      |
| G2     | 2        | A       | 30               | 40                | nein     | nein      |
| G3     | 4        | A       | 30               | 40                | nein     | nein      |
| G4     | 4        | A       | 30               | 40                | nein     | nein      |

## Stromkreise

Die Reihenfolge bestimmt die Nummer (SK1, SK2, ...). Jeder Stromkreis bekommt einen LS in
der angegebenen Gruppe. Bei einem 3-poligen LS ist der Stromkreis dreiphasig, die Spalte
Phase bleibt dann leer.

| Stromkreis | Gruppe | Ziel                | Endstelle              | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | Zi   | Zs  | RCD | Fehler Zuleitung (Ω) |
| ---------- | ------ | ------------------- | ---------------------- | ------------ | ------- | -------- | ------ | ----- | ---- | --- | --- | -------------------- |
| SK1        | G1     | Steckdosen Zimmer 1 | Steckdose              | 2            | 1       | B        | 16     | L1    | nein | ja  | ja  |                      |
| SK2        | G1     | Licht Zimmer 1      | Lichtauslass           | 1            | 1       | B        | 10     | L1    | nein | ja  | ja  |                      |
| SK3        | G2     | Steckdosen Zimmer 2 | Steckdose              | 2            | 1       | B        | 16     | L2    | nein | ja  | ja  |                      |
| SK4        | G2     | Licht Zimmer 2      | Lichtauslass           | 1            | 1       | B        | 10     | L2    | nein | ja  | ja  |                      |
| SK5        | G3     | Keller              | Drehstromsteckdose     | 1            | 3       | B        | 16     |       | nein | ja  | ja  |                      |
| SK6        | G4     | Kueche              | 5-polige Anschlussdose | 1            | 3       | B        | 16     |       | nein | ja  | ja  |                      |

Fehler Zuleitung (Ω): optionaler Widerstand auf der Leitung zur Endstelle, leer = 0 Ω.

Die Dosen werden automatisch angeordnet: je Block von höchstens 3 Stromkreisen eine Reihe mit
je einer Dose pro Stromkreis, weitere Dosen darunter. Der nächste Block beginnt in einer
neuen Reihe (mehr als 3 Spalten passen nicht in die Breite des Schaltkastens).
