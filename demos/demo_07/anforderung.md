# Anforderung – demo_07

Vorlage für eine neue Demo-Anlage. Anlegen mit `node tools/demo_erstellung.js demo_07 --neu`,
Werte ändern, dann `node tools/demo_erstellung.js demo_NN`. Netz-IDs, Leiterquerschnitte, Klemmen,
Hutschienen, Farben und die Prüfwerte des RCD werden vom Werkzeug abgeleitet und hier nicht
eingetragen.

Ausgefüllt ist das Beispiel **demo_07**.

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

| Feld               | Wert                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| Name               | Unterverteiler Demo 07                                                               |
| Beschreibung       | Mittlere Demo: 3-poliger Hauptschalter, 1 RCD (4-polig), 6 LS (Steckdosen und Licht) |
| Netzform           | TN-S                                                                                 |
| Hauptschalter Pole | 3                                                                                    |
| Hauptschalter (A)  | 50                                                                                   |

## Gruppen

Eine Gruppe ist ein RCD mit den dahinter liegenden LS. `ohne` bei RCD Pole = LS direkt am
Hauptschalter.

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen |
| ------ | -------- | ------- | ---------------- | ----------------- | -------- | --------- |
| G1     | 4        | B       | 30               | 40                | nein     | nein      |

## Stromkreise

Die Reihenfolge bestimmt die Nummer (SK1, SK2, ...). Jeder Stromkreis bekommt einen LS in
der angegebenen Gruppe. Bei einem 3-poligen LS ist der Stromkreis dreiphasig, die Spalte
Phase bleibt dann leer.

| Stromkreis | Gruppe | Ziel                | Endstelle                  | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | Zi   | Zs  | RCD | Fehler L (Ω) | Fehler N (Ω) |
| ---------- | ------ | ------------------- | -------------------------- | ------------ | ------- | -------- | ------ | ----- | ---- | --- | --- | -------------------- | ------------ |
| SK1        | G1     | Steckdosen Zimmer 1 | Steckdose + Lichtauslass   | 1 + 1        | 1       | B        | 16     | L1    | nein | ja  | ja  | 0.2                  |              |
| SK2        | G1     | Licht Zimmer 1      | Lichtauslass               | 2            | 1       | B        | 10     | L1    | nein | ja  | ja  | 0.3                  |              |
| SK3        | G1     | Steckdosen Zimmer 2 | Steckdose + Lichtauslass   | 1 + 1        | 1       | B        | 16     | L2    | nein | ja  | ja  | 0.1                  |              |
| SK4        | G1     | Licht Zimmer 2      | Lichtauslass               | 2            | 1       | B        | 10     | L2    | nein | ja  | ja  | 0.4                  |              |
| SK5        | G1     | Steckdosen Zimmer 3 | Steckdose                  | 2            | 1       | B        | 16     | L3    | nein | ja  | ja  | 0.6                  |              |
| SK6        | G1     | Licht Zimmer 3      | Lichtauslass               | 2            | 1       | B        | 16     | L3    | nein | ja  | ja  | 0.7                  |              |

Fehler L (Ω) / Fehler N (Ω): optionale Fehlerwiderstände, leer = kein Fehler. Weitere Fehlerorte
(Gruppe, Einspeisung, Vorimpedanz) siehe demos/anforderung_vorlage.md, Abschnitt Fehlerwiderstände.

Gemischte Endstellen in einem Stromkreis: Endstelle z.B. `Steckdose + Lichtauslass` und
Anzahl Dosen `2 + 1` (je Teil eine Anzahl). Alle Typen müssen zum LS passen (1-polig:
Steckdose, Lichtauslass; 3-polig: Drehstromsteckdose, 5-polige Anschlussdose).

Die Dosen werden automatisch angeordnet: je Block von höchstens 3 Stromkreisen eine Reihe mit
je einer Dose pro Stromkreis, weitere Dosen darunter. Der nächste Block beginnt in einer
neuen Reihe (mehr als 3 Spalten passen nicht in die Breite des Schaltkastens).
