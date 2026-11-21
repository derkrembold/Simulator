# Anforderung – demo_19

Vorlage für eine neue Demo-Anlage. Anlegen mit `node tools/demo_erstellung.js demo_NN --neu`,
Werte ändern, dann `node tools/demo_erstellung.js demo_NN`. Netz-IDs, Leiterquerschnitte, Klemmen,
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
| AFDD                 | ja, nein, leer (= nein)                                                 |
| Drehfeld             | rechts, links, leer (= rechts), links nur bei 3-poligem LS              |

Regeln, die das Werkzeug prüft: 2-poliger RCD höchstens 2 LS, 4-poliger RCD höchstens 6 LS,
RCD-Nennstrom größer als jeder LS, eine Hutschiene höchstens 16 TE, AFDD nur bei 1-poligem LS
in einer Gruppe mit RCD.

## Anlage

| Feld                 | Wert                                                                    |
| -------------------- | ----------------------------------------------------------------------- |
| Name                 | Hutschienen und PE                                                      |
| Beschreibung         | PE-Klemme unten ohne Kontakt zur Hutschiene, mittlere Hutschiene mit eigener PE-Klemme, PE-Kontaktfehler |
| Netzform             | TN-S                                                                    |
| Hauptschalter Pole   | 3                                                                       |
| Hauptschalter (A)    | 35                                                                      |
| Vorimpedanz (Ω)      |                                                                         |
| Fehler Einspeisung L (Ω) |                                                                     |
| Fehler Einspeisung N (Ω) |                                                                     |
| Fehler PE Einspeisung (Ω) |                                                                    |
| PE-Klemme mit Hutschiene verbunden (ja/nein) | nein                                            |
| Fehler PE-Klemme Zubringer (Ω) | 0,05                                                          |

## Gruppen

Eine Gruppe ist ein RCD mit den dahinter liegenden LS. `ohne` bei RCD Pole = LS direkt am
Hauptschalter.

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen | Fehler L (Ω) | Fehler N (Ω) | PE-Klemme (ja/nein) |
| ------ | -------- | ------- | ---------------- | ----------------- | -------- | --------- | ------------ | ------------ | ------------------- |
| G1     | 2        | A       | 30               | 40                | nein     | nein      |              |              | ja                  |

## Stromkreise

Die Reihenfolge bestimmt die Nummer (SK1, SK2, ...). Jeder Stromkreis bekommt einen LS in
der angegebenen Gruppe. Bei einem 3-poligen LS ist der Stromkreis dreiphasig, die Spalte
Phase bleibt dann leer. RCD = ja/nein, ob der RCD-Test gemacht wird. Zi und Zs werden nicht
angegeben: mit RCD wird Zi gemessen, ohne RCD Zi und Zs (im Protokoll steht dann Zs).

| Stromkreis | Gruppe | Ziel                | Endstelle    | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | RCD  | Fehler L (Ω) | Fehler N (Ω) | AFDD (ja/nein) | Fehler PE (Ω) |
| ---------- | ------ | ------------------- | ------------ | ------------ | ------- | -------- | ------ | ----- | ---- | ------------ | ------------ | -------------- | ------------- |
| SK1        | G1     | Steckdosen Zimmer 1 | Steckdose    | 2            | 1       | B        | 16     | L1    | ja   |              |              | nein           | 0,3           |
| SK2        | G1     | Licht Zimmer 1      | Lichtauslass | 1            | 1       | B        | 10     | L1    | ja   |              |              | nein           |               |

Drehfeld = links: An den Dosen dieses Drehstrom-Stromkreises sind L2 und L3 vertauscht
angeklemmt (Linksdrehfeld, Mangel). Die Spalte `Drehfeld (rechts/links)` darf fehlen, leer heißt
rechts. Sie steht nicht in der Beispieltabelle oben; bei Bedarf als letzte Spalte ergänzen.

AFDD = ja macht aus dem LS ein Kombigerät "LS mit AFDD" (Brandschutzschalter): 2-polig,
schaltet L und N, braucht 2 TE. Nur bei 1-poligem LS und nur in einer Gruppe mit RCD. Die
Spalte darf fehlen, leer heißt nein.

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
| Stromkreis, Fehler PE      | Kontakt der PE-Reihenklemme zur Leitung zur Endstelle | Rpe und Zs (an der Endstelle gemessen) dieses Stromkreises steigen |
| Anlage, Fehler PE-Klemme Zubringer | Kontakt an der PE-Klemme zum Zubringer zur ersten Reihenklemme | Rpe und Zs aller Stromkreise steigen (ihr PE läuft über die Reihenklemmen-Hutschiene) |
| Anlage, Fehler PE Einspeisung | Kontakt an der PE-Klemme zur Zuleitung   | Zs aller Stromkreise und der Hauptleitung steigen, Rpe nicht |

Gruppen ohne RCD haben keine Gruppen-Fehler, dort den Fehler am Stromkreis eintragen. PE-Fehler sind
immer eine einzelne Zahl (ein Schutzleiter), Gruppen haben keinen PE-Fehler (RCD und LS führen
keinen PE). Die Spalte `Fehler PE (Ω)` in der Stromkreis-Tabelle darf fehlen.
