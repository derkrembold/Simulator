# Anforderung – demo_12

Vorlage für eine neue Demo-Anlage. Anlegen mit `node tools/demo_erstellung.js demo_12 --neu`,
Werte ändern, dann `node tools/demo_erstellung.js demo_12`. Netz-IDs, Leiterquerschnitte, Klemmen,
Hutschienen, Farben und die Prüfwerte des RCD werden vom Werkzeug abgeleitet und hier nicht
eingetragen.

Ausgefüllt ist ein Beispiel. Die von Hand gebaute Anlage dazu liegt in
`tests/visuell/referenz/vorlage_anlage.json`.

## Erlaubte Werte

| Feld                 | Werte                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Hauptschalter Pole   | 2, 3                                                                    |
| RCD Pole             | 2, 4, ohne                                                              |
| RCD Typ              | AC, A, F, B, B+                                                         |
| RCD Fehlerstrom (mA) | 10, 30, 100, 300, 500                                                   |
| RCD Nennstrom (A)    | 16, 25, 40, 63, 80, 100, 125                                            |
| LS Pole              | 1, 3                                                                    |
| LS Charakteristik    | B, C, D, K, Z                                                           |
| LS Nennstrom (A)     | 6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63                               |
| Phase (nur 1-polig)  | L1, L2, L3                                                              |
| Endstelle            | Steckdose, Lichtauslass, Drehstromsteckdose, 5-polige Anschlussdose     |
| Ja/Nein              | ja, nein                                                                |

Regeln, die das Werkzeug prüft: 2-poliger RCD höchstens 2 LS, 4-poliger RCD höchstens 6 LS,
RCD-Nennstrom größer als jeder LS, eine Hutschiene höchstens 16 TE.

## Anlage

| Feld                     | Wert                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Name                     | Unterverteiler Demo 12                                                                                                  |
| Beschreibung             | 3-poliger Hauptschalter, 3 RCD (2x 2-polig Typ A und B, 1x 4-polig Typ A), 6 LS (Steckdosen, Licht, Drehstromsteckdose) |
| Netzform                 | TN-S                                                                                                                    |
| Hauptschalter Pole       | 3                                                                                                                       |
| Hauptschalter (A)        | 63                                                                                                                      |
| Vorimpedanz (Ω)          |                                                                                                                         |
| Fehler Einspeisung L (Ω) |                                                                                                                         |
| Fehler Einspeisung N (Ω) |                                                                                                                         |

## Gruppen

Eine Gruppe ist ein RCD mit den dahinter liegenden LS. `ohne` bei RCD Pole = LS direkt am
Hauptschalter.

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen | Fehler L (Ω) | Fehler N (Ω) |
| ------ | -------- | ------- | ---------------- | ----------------- | -------- | --------- | ------------ | ------------ |
| G1     | 2        | A       | 30               | 40                | nein     | nein      | 0,1          | 0,15         |
| G2     | 2        | B       | 30               | 40                | nein     | nein      | 0,15         | 0,05         |
| G3     | 4        | A       | 30               | 40                | nein     | nein      | 0,1          | 0,5          |

## Stromkreise

Die Reihenfolge bestimmt die Nummer (SK1, SK2, ...). Jeder Stromkreis bekommt einen LS in
der angegebenen Gruppe. Bei einem 3-poligen LS ist der Stromkreis dreiphasig, die Spalte
Phase bleibt dann leer.

| Stromkreis | Gruppe | Ziel                               | Endstelle                   | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | Zi   | Zs  | RCD | Fehler L (Ω) | Fehler N (Ω) |
| ---------- | ------ | ---------------------------------- | --------------------------- | ------------ | ------- | -------- | ------ | ----- | ---- | --- | --- | ------------ | ------------ |
| SK1        | G1     | Schlafzimmer 1 Steckdosen          | Steckdose + Steckdose       | 1+1          | 1       | B        | 16     | L1    | nein | ja  | ja  | 0,05         | 0,07         |
| SK2        | G1     | Schlafzimmer 1 Licht               | Lichtauslass + Lichtauslass | 1+1          | 1       | B        | 10     | L1    | nein | ja  | ja  | 0,07         | 0,05         |
| SK3        | G2     | Schlafzimmer 2 Steckdose und Licht | Steckdose + Lichtauslass    | 1+1          | 1       | B        | 10     | L2    | nein | ja  | ja  | 0,05         | 0,07         |
| SK4        | G2     | Schlafzimmer 2 Steckdose und Licht | Steckdose + Lichtauslass    | 1+1          | 1       | B        | 10     | L2    | nein | ja  | ja  | 0,07         | 0,05         |
| SK5        | G3     | Garage Drehstrom                   | Drehstromsteckdose          | 1            | 3       | C        | 16     |       | nein | ja  | ja  | 0,4          | 0,2          |
| SK6        | G3     | Garage Licht und Steckdose         | Lichtauslass + Steckdose    | 1+1          | 1       | B        | 10     | L3    | nein | ja  | ja  | 0,05         | 0,07         |

Gemischte Endstellen in einem Stromkreis: Endstelle z.B. `Steckdose + Lichtauslass` und
Anzahl Dosen `2 + 1` (je Teil eine Anzahl). Alle Typen müssen zum LS passen (1-polig:
Steckdose, Lichtauslass; 3-polig: Drehstromsteckdose, 5-polige Anschlussdose).

Die Dosen werden automatisch angeordnet: je Block von höchstens 3 Stromkreisen eine Reihe mit
je einer Dose pro Stromkreis, weitere Dosen darunter. Der nächste Block beginnt in einer
neuen Reihe (mehr als 3 Spalten passen nicht in die Breite des Schaltkastens).

## Fehlerwiderstände

Alle Fehlerfelder sind optional, leer = kein Fehler. Eine Zahl gilt für den ersten
Außenleiter, `0,1 / 0 / 0,3` gibt je Außenleiter L1 / L2 / L3 einen Wert (nur wo es drei
Außenleiter gibt: 3-poliger Hauptschalter, 4-poliger RCD, 3-poliger LS).

| Wo                         | Sitzt auf                                   | Wirkung                                                       |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Stromkreis, Fehler L       | Zuleitung Reihenklemme -> Endstelle         | Zi, Zs und ΔU dieses Stromkreises steigen                     |
| Stromkreis, Fehler N       | N-Zuleitung zur Endstelle                   | Zi und ΔU steigen, Zs bleibt gleich                           |
| Gruppe, Fehler L / N       | Ausgang des RCD (z.B. lose Klemme)          | wie oben, für alle Stromkreise der Gruppe                     |
| Anlage, Fehler Einspeisung | Zuleitung von außen bis zum Hauptschalter   | Zs der Hauptleitung und alle Zi/Zs steigen; Zref wird auf L1 und N gemessen, ΔU steigt deshalb nur bei einem Fehler auf L2/L3 |
| Anlage, Vorimpedanz        | Netz vor der Anlage (leer = 0,14 Ω)         | ein Gesamtwert, der einmal zu jedem Zi, Zs und Zref addiert wird; ΔU bleibt gleich |

Gruppen ohne RCD haben keine Gruppen-Fehler, dort den Fehler am Stromkreis eintragen.
