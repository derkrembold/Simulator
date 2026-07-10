# Netzplan – testcase_02

Drei physische Zeilen (Hutschienen) im Schaltkasten, je eine eigene Tabelle:
- **H1** = Hauptschalter + L-/N-/PE-Klemme (letzte Zeile)
- **H2** = Hutschiene 1: RCD1+LS1+LS2 und RCD2+LS3+LS4 nebeneinander (Gruppen-Zeile)
- **H3** = Reihenklemmen für SK1–SK4 (erste Zeile)

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins – keine Gastzeilen aus anderen
Tabellen mehr. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
Spalte in beiden Tabellen auf; die Zeile **Quelle** (direkt unter dem Tabellenkopf,
neben Farbe/Querschnitt/Kabeltyp) zeigt dann, aus welcher Hutschiene dieses Netz
stammt. So lässt sich pro Tabelle sofort erkennen, welche Netze dort ihren Ursprung
haben (Quelle = eigene Hutschiene) und welche importiert sind.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei
PE-Bauteilen `io1`/`io2`/`io3`, da PE keine gerichtete Strömung hat. `io3` ist immer
die Hutschiene. `io1` und `io2` tragen je genau eine Ader (rein oder raus) – nie
mehrere Adern auf demselben Pin. Bei den `Reihenklemme_PE_*` ist `io1` die ankommende
Ader (von `PE-Klemme`), `io2` die weiterführende Ader (zur Endstelle). Bei `PE-Klemme`
selbst verzweigt `io2` auf mehrere Netze gleichzeitig (eine Ader je Reihenklemme), da
sie als Sammelpunkt mehrere Reihenklemmen gleichzeitig versorgt.

Die Zeilen **Farbe**, **Querschnitt (mm²)** und **Kabeltyp** zeigen die Eigenschaften
jedes Netzes (Einheit im Zeilennamen, Werte reine Zahlen).

---

## Tabelle 1: H1

| Pin                   |   N1    |  N2   |  N3   |   N4    |  N5   |   N6    |  N7   |  N30  |  N34  |
| --------------------- | :-----: | :---: | :---: | :-----: | :---: | :-----: | :---: | :---: | :---: |
| **Quelle**            |   H1    |  H1   |  H1   |   H1    |  H1   |   H1    |  H1   |  H1   |  H1   |
| **Farbe**             | schwarz | blau  | gn-ge | schwarz | blau  | schwarz | blau  | gn-ge | blank |
| **Querschnitt (mm²)** |   16    |  16   |  16   |   10    |  10   |   10    |  10   |  2.5  |  16   |
| **Kabeltyp**          |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
| Einspeisung.L1        |   L1    |       |       |         |       |         |       |       |       |
| Einspeisung.N         |         |   N   |       |         |       |         |       |       |       |
| Einspeisung.PE        |         |       |  PE   |         |       |         |       |       |       |
| L-Klemme.i1           |   L1    |       |       |         |       |         |       |       |       |
| L-Klemme.o1           |         |       |       |   L1    |       |         |       |       |       |
| N-Klemme.i1           |         |   N   |       |         |       |         |       |       |       |
| N-Klemme.o1           |         |       |       |         |   N   |         |       |       |       |
| PE-Klemme.io1         |         |       |  PE   |         |       |         |       |       |       |
| PE-Klemme.io2         |         |       |       |         |       |         |       |  PE   |       |
| PE-Klemme.io3         |         |       |       |         |       |         |       |       |  PE   |
| Hauptschalter.i1      |         |       |       |   L1    |       |         |       |       |       |
| Hauptschalter.i2      |         |       |       |         |   N   |         |       |       |       |
| Hauptschalter.o1      |         |       |       |         |       |   L1    |       |       |       |
| Hauptschalter.o2      |         |       |       |         |       |         |   N   |       |       |
| H1                    |         |       |       |         |       |         |       |       |  PE   |


**Anmerkung zu N6/N7:** `Hauptschalter.o1`/`.o2` speisen **beide** RCDs über
dasselbe Netz. Da der Hauptschalter nur 2-polig ist (ein L-Pol), gibt es nur L1 –
"L2" für Gruppe 2 wurde entfernt und auf L1 vereinheitlicht (siehe Annahme unten).
Ein 3-poliger Hauptschalter mit echtem L2 wäre ein eigener, späterer Testcase.

---

## Tabelle 2: H2

| Pin                   |   N6    |  N7   |   N8    |   N9    |  N10  |   N11   |   N12   |  N13  |   N14   |   N15   |   N16   |   N17   |
| --------------------- | :-----: | :---: | :-----: | :-----: | :---: | :-----: | :-----: | :---: | :-----: | :-----: | :-----: | :-----: |
| **Quelle**            |   H1    |  H1   |   H2    |   H2    |  H2   |   H2    |   H2    |  H2   |   H2    |   H2    |   H2    |   H2    |
| **Farbe**             | schwarz | blau  | schwarz | schwarz | blau  | schwarz | schwarz | blau  | schwarz | schwarz | schwarz | schwarz |
| **Querschnitt (mm²)** |   10    |  10   |   2.5   |   1.5   |  2.5  |   2.5   |   2.5   |  2.5  |   2.5   |   1.5   |   2.5   |   2.5   |
| **Kabeltyp**          |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  |
| RCD1.i1               |   L1    |       |         |         |       |         |         |       |         |         |         |         |
| RCD1.i2               |         |   N   |         |         |       |         |         |       |         |         |         |         |
| RCD1.o1               |         |       |   L1    |   L1    |       |         |         |       |         |         |         |         |
| RCD1.o2               |         |       |         |         |   N   |         |         |       |         |         |         |         |
| RCD2.i1               |   L1    |       |         |         |       |         |         |       |         |         |         |         |
| RCD2.i2               |         |   N   |         |         |       |         |         |       |         |         |         |         |
| RCD2.o1               |         |       |         |         |       |   L1    |   L1    |       |         |         |         |         |
| RCD2.o2               |         |       |         |         |       |         |         |   N   |         |         |         |         |
| LS1.i1                |         |       |   L1    |         |       |         |         |       |         |         |         |         |
| LS1.o1                |         |       |         |         |       |         |         |       |   L1    |         |         |         |
| LS2.i1                |         |       |         |   L1    |       |         |         |       |         |         |         |         |
| LS2.o1                |         |       |         |         |       |         |         |       |         |   L1    |         |         |
| LS3.i1                |         |       |         |         |       |   L1    |         |       |         |         |         |         |
| LS3.o1                |         |       |         |         |       |         |         |       |         |         |   L1    |         |
| LS4.i1                |         |       |         |         |       |         |   L1    |       |         |         |         |         |
| LS4.o1                |         |       |         |         |       |         |         |       |         |         |         |   L1    |
| H2                    |         |       |         |         |       |         |         |       |         |         |         |         |

---

## Tabelle 3: H3

| Pin                     |  N10  |  N13  |   N14   |   N15   |   N16   |   N17   |   N18   |  N19  |  N20  |   N21   |  N22  |  N23  |   N24   |  N25  |  N26  |   N27   |  N28  |  N29  |  N30  |  N31  |
|-------------------------|:-----:|:-----:|:-------:|:-------:|:-------:|:-------:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-----:|
| **Quelle**              |  H2   |  H2   |   H2    |   H2    |   H2    |   H2    |   H3    |  H3   |  H3   |   H3    |  H3   |  H3   |   H3    |  H3   |  H3   |   H3    |  H3   |  H3   |  H1   |  H3   |
| **Farbe**               | blau  | blau  | schwarz | schwarz | schwarz | schwarz | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | gn-ge | blank |
| **Querschnitt (mm²)**   |  2.5  |  2.5  |   2.5   |   1.5   |   2.5   |   2.5   |   2.5   |  2.5  |  2.5  |   1.5   |  1.5  |  1.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |  2.5  |  16   |
| **Kabeltyp**            | NYM-J | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J |   –   |
| Reihenklemme_N_SK1.i1   |   N   |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_N_SK1.o1   |       |       |         |         |         |         |         |   N   |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_N_SK2.i1   |   N   |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_N_SK2.o1   |       |       |         |         |         |         |         |       |       |         |   N   |       |         |       |       |         |       |       |       |       |
| Reihenklemme_N_SK3.i1   |       |   N   |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_N_SK3.o1   |       |       |         |         |         |         |         |       |       |         |       |       |         |   N   |       |         |       |       |       |       |
| Reihenklemme_N_SK4.i1   |       |   N   |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_N_SK4.o1   |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |   N   |       |       |       |
| Reihenklemme_L_SK1.i1   |       |       |   L1    |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_L_SK1.o1   |       |       |         |         |         |         |   L1    |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_L_SK2.i1   |       |       |         |   L1    |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_L_SK2.o1   |       |       |         |         |         |         |         |       |       |   L1    |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_L_SK3.i1   |       |       |         |         |   L1    |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_L_SK3.o1   |       |       |         |         |         |         |         |       |       |         |       |       |   L1    |       |       |         |       |       |       |       |
| Reihenklemme_L_SK4.i1   |       |       |         |         |         |   L1    |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_L_SK4.o1   |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |   L1    |       |       |       |       |
| Reihenklemme_PE_SK1.io1 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |       |
| Reihenklemme_PE_SK1.io2 |       |       |         |         |         |         |         |       |  PE   |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_PE_SK1.io3 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |  PE   |
| Reihenklemme_PE_SK2.io1 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_PE_SK2.io2 |       |       |         |         |         |         |         |       |       |         |       |  PE   |         |       |       |         |       |       |       |       |
| Reihenklemme_PE_SK2.io3 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |  PE   |
| Reihenklemme_PE_SK3.io1 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_PE_SK3.io2 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |  PE   |         |       |       |       |       |
| Reihenklemme_PE_SK3.io3 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |  PE   |
| Reihenklemme_PE_SK4.io1 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Reihenklemme_PE_SK4.io2 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |  PE   |       |       |
| Reihenklemme_PE_SK4.io3 |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |  PE   |
| Endstelle_SK1.i1        |       |       |         |         |         |         |   L1    |       |       |         |       |       |         |       |       |         |       |       |       |       |
| Endstelle_SK1.i2        |       |       |         |         |         |         |         |   N   |       |         |       |       |         |       |       |         |       |       |       |       |
| Endstelle_SK1.i3        |       |       |         |         |         |         |         |       |  PE   |         |       |       |         |       |       |         |       |       |       |       |
| Endstelle_SK2.i1        |       |       |         |         |         |         |         |       |       |   L1    |       |       |         |       |       |         |       |       |       |       |
| Endstelle_SK2.i2        |       |       |         |         |         |         |         |       |       |         |   N   |       |         |       |       |         |       |       |       |       |
| Endstelle_SK2.i3        |       |       |         |         |         |         |         |       |       |         |       |  PE   |         |       |       |         |       |       |       |       |
| Endstelle_SK3.i1        |       |       |         |         |         |         |         |       |       |         |       |       |   L1    |       |       |         |       |       |       |       |
| Endstelle_SK3.i2        |       |       |         |         |         |         |         |       |       |         |       |       |         |   N   |       |         |       |       |       |       |
| Endstelle_SK3.i3        |       |       |         |         |         |         |         |       |       |         |       |       |         |       |  PE   |         |       |       |       |       |
| Endstelle_SK4.i1        |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |   L1    |       |       |       |       |
| Endstelle_SK4.i2        |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |   N   |       |       |       |
| Endstelle_SK4.i3        |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |  PE   |       |       |
| H3                      |       |       |         |         |         |         |         |       |       |         |       |       |         |       |       |         |       |       |       |  PE   |

---

## Fehlertabelle

Beispielhafte Fehler-Widerstände auf drei Netzen des L1-Pfads RCD1→LS1→SK1
(N6 → N8 → N14 → N18) - Netze ohne Eintrag gelten als 0Ω.

Zusätzlich ein Netz auf dem N-Pfad (N10 = RCD1.o2, Neutralleiter-Ausgang, der
über die Reihenklemmen sowohl SK1 als auch SK2 speist) - der erste
Fehlertabellen-Eintrag auf N statt L1.

| Netz | Widerstand (Ω) |
| ---- | --------------- |
| N8   | 0,1             |
| N14  | 0,15            |
| N18  | 0,25            |
| N10  | 0,3             |

---

## Annahmen / Anmerkungen (bitte prüfen)

1. **Hauptschalter speist beide Gruppen über ein gemeinsames Netz (N6/N7).** Da er
   nur 2-polig ist (ein L-Pol), gibt es nur eine Phase – alles ist auf **L1**
   vereinheitlicht, "L2" für Gruppe 2 wurde entfernt (war ein Widerspruch: ein
   2-poliger Schalter kann kein L2 liefern). Ein echter 3-poliger Hauptschalter mit
   zwei getrennten Phasen wäre ein eigener, späterer Testcase.
2. **L-Klemme/N-Klemme** als eigene Pass-through-Bauteile vor dem Hauptschalter
   (Einspeisung → Klemme → Hauptschalter), analog zur PE-Klemme, aber mit normaler
   `i`/`o`-Richtung (nicht `io`), da L/N gerichtet Strom führen.
3. **RCD1.o1 verzweigt zu LS1 (2.5mm²) und LS2 (1.5mm²)** – unterschiedlicher
   Querschnitt am selben Ausgangspin, wie in testcase_01.
4. **RCD2.o1 verzweigt zu LS3 und LS4, beide 2.5mm²** – hier kein Sprung, da beide
   LS denselben Querschnitt deklarieren.
5. **Nur eine Ader führt von `PE-Klemme.io2` nach H3** (N30, 2.5mm², echtes Kabel zu
   `Reihenklemme_PE_SK1.io1`). Die übrigen drei Reihenklemmen (`_SK2`/`_SK3`/`_SK4`)
   bekommen ihr PE **nicht** über eine eigene Zubringerader von der PE-Klemme, sondern
   ausschließlich über den lokalen Hutschienen-Bond von H3 (N31, siehe Annahme 6) – die
   eine Zubringerader zu SK1 versorgt über den Bond die ganze Schiene. Jede
   Reihenklemme_PE führt ihre Ader über `io2` zur jeweiligen Endstelle weiter (analog
   testcase_01).
6. **Hutschienen-Bond ist pro Hutschiene ein eigenes, lokales Netz – keine Kabel-
   verbindung zwischen den Schienen selbst.** Eine Hutschiene ist kein Kabel, also
   verbindet sie sich nicht "über ein Netz" mit einer anderen Hutschiene. `N34` (H1)
   verbindet nur `PE-Klemme.io3` mit der `H1`-Selbstzeile. `N31` (H3) verbindet nur die
   vier `Reihenklemme_PE_*.io3` mit der `H3`-Selbstzeile. Die einzige tatsächliche
   Verbindung zwischen H1 und H3 ist das echte Kabel N30 (siehe Annahme 5). `H2` hat
   keine PE-Bauteile, daher keinen eigenen Bond.
