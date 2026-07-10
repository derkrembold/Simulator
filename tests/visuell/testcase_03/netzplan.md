# Netzplan – testcase_03

Vier physische Zeilen (Hutschienen) im Schaltkasten, je eine eigene Tabelle:
- **H1** = Hauptschalter + L-/N-/PE-Klemme (unterste Zeile)
- **H2** = Hutschiene mit Gruppe 2 und Gruppe 3 nebeneinander
- **H3** = Hutschiene mit Gruppe 1
- **H4** = Reihenklemmen für SK1–SK6 (oberste Zeile)

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins – keine Gastzeilen aus anderen
Tabellen. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt dann, aus welcher
Hutschiene dieses Netz stammt.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei
PE-Bauteilen `io1`/`io2`/`io3` (siehe testcase_01/02): `io3` ist immer die
Hutschiene, `io1`/`io2` tragen je genau eine Ader.

Die Zeilen **Farbe**, **Querschnitt (mm²)** und **Kabeltyp** zeigen die Eigenschaften
jedes Netzes (Einheit im Zeilennamen, Werte reine Zahlen).

---

## Tabelle 1: H1

|          Pin          |   N1    |  N2   |  N3   |   N4    |  N5   |   N6    |  N7   |  N30  |  N50  |
|:---------------------:|:-------:|:-----:|:-----:|:-------:|:-----:|:-------:|:-----:|:-----:|:-----:|
|      **Quelle**       |   H1    |  H1   |  H1   |   H1    |  H1   |   H1    |  H1   |  H1   |  H1   |
|       **Farbe**       | schwarz | blau  | gn-ge | schwarz | blau  | schwarz | blau  | gn-ge | blank |
| **Querschnitt (mm²)** |   16    |  16   |  16   |   10    |  10   |   10    |  10   |  2.5  |  16   |
|     **Kabeltyp**      |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
|    Einspeisung.L1     |   L1    |       |       |         |       |         |       |       |       |
|     Einspeisung.N     |         |   N   |       |         |       |         |       |       |       |
|    Einspeisung.PE     |         |       |  PE   |         |       |         |       |       |       |
|      L-Klemme.i1      |   L1    |       |       |         |       |         |       |       |       |
|      L-Klemme.o1      |         |       |       |   L1    |       |         |       |       |       |
|      N-Klemme.i1      |         |   N   |       |         |       |         |       |       |       |
|      N-Klemme.o1      |         |       |       |         |   N   |         |       |       |       |
|     PE-Klemme.io1     |         |       |  PE   |         |       |         |       |       |       |
|     PE-Klemme.io2     |         |       |       |         |       |         |       |  PE   |       |
|     PE-Klemme.io3     |         |       |       |         |       |         |       |       |  PE   |
|   Hauptschalter.i1    |         |       |       |   L1    |       |         |       |       |       |
|   Hauptschalter.i2    |         |       |       |         |   N   |         |       |       |       |
|   Hauptschalter.o1    |         |       |       |         |       |   L1    |       |       |       |
|   Hauptschalter.o2    |         |       |       |         |       |         |   N   |       |       |
|          H1           |         |       |       |         |       |         |       |       |  PE   |

---

## Tabelle 2: H2

|          Pin          |   N6    |  N7   |   N10   |   N11   |  N12  |   N13   |   N14   |  N15  |   N16   |   N17   |   N18   |   N19   |
|:---------------------:|:-------:|:-----:|:-------:|:-------:|:-----:|:-------:|:-------:|:-----:|:-------:|:-------:|:-------:|:-------:|
|      **Quelle**       |   H1    |  H1   |   H2    |   H2    |  H2   |   H2    |   H2    |  H2   |   H2    |   H2    |   H2    |   H2    |
|       **Farbe**       | schwarz | blau  | schwarz | schwarz | blau  | schwarz | schwarz | blau  | schwarz | schwarz | schwarz | schwarz |
| **Querschnitt (mm²)** |   10    |  10   |   2.5   |   2.5   |  2.5  |   2.5   |   1.5   |  2.5  |   2.5   |   2.5   |   2.5   |   1.5   |
|     **Kabeltyp**      |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  |
|        RCD2.i1        |   L1    |       |         |         |       |         |         |       |         |         |         |         |
|        RCD2.i2        |         |   N   |         |         |       |         |         |       |         |         |         |         |
|        RCD2.o1        |         |       |   L1    |   L1    |       |         |         |       |         |         |         |         |
|        RCD2.o2        |         |       |         |         |   N   |         |         |       |         |         |         |         |
|        RCD3.i1        |   L1    |       |         |         |       |         |         |       |         |         |         |         |
|        RCD3.i2        |         |   N   |         |         |       |         |         |       |         |         |         |         |
|        RCD3.o1        |         |       |         |         |       |   L1    |   L1    |       |         |         |         |         |
|        RCD3.o2        |         |       |         |         |       |         |         |   N   |         |         |         |         |
|        LS3.i1         |         |       |   L1    |         |       |         |         |       |         |         |         |         |
|        LS3.o1         |         |       |         |         |       |         |         |       |   L1    |         |         |         |
|        LS4.i1         |         |       |         |   L1    |       |         |         |       |         |         |         |         |
|        LS4.o1         |         |       |         |         |       |         |         |       |         |   L1    |         |         |
|        LS5.i1         |         |       |         |         |       |   L1    |         |       |         |         |         |         |
|        LS5.o1         |         |       |         |         |       |         |         |       |         |         |   L1    |         |
|        LS6.i1         |         |       |         |         |       |         |   L1    |       |         |         |         |         |
|        LS6.o1         |         |       |         |         |       |         |         |       |         |         |         |   L1    |
|          H2           |         |       |         |         |       |         |         |       |         |         |         |         |

---

## Tabelle 3: H3

|          Pin          |   N6    |  N7   |   N20   |   N21   |  N22  |   N23   |   N24   |
|:---------------------:|:-------:|:-----:|:-------:|:-------:|:-----:|:-------:|:-------:|
|      **Quelle**       |   H1    |  H1   |   H3    |   H3    |  H3   |   H3    |   H3    |
|       **Farbe**       | schwarz | blau  | schwarz | schwarz | blau  | schwarz | schwarz |
| **Querschnitt (mm²)** |   10    |  10   |   2.5   |   1.5   |  2.5  |   2.5   |   1.5   |
|     **Kabeltyp**      |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |
|        RCD1.i1        |   L1    |       |         |         |       |         |         |
|        RCD1.i2        |         |   N   |         |         |       |         |         |
|        RCD1.o1        |         |       |   L1    |   L1    |       |         |         |
|        RCD1.o2        |         |       |         |         |   N   |         |         |
|        LS1.i1         |         |       |   L1    |         |       |         |         |
|        LS1.o1         |         |       |         |         |       |   L1    |         |
|        LS2.i1         |         |       |         |   L1    |       |         |         |
|        LS2.o1         |         |       |         |         |       |         |   L1    |
|          H3           |         |       |         |         |       |         |         |

---

## Tabelle 4: H4

|           Pin           |  N30  |  N12  |  N15  |   N16   |   N17   |   N18   |   N19   |  N22  |   N23   |   N24   |   N25   |  N26  |  N27  |   N28   |  N29  |  N32  |   N33   |  N34  |  N35  |   N36   |  N37  |  N38  |   N39   |  N42  |  N43  |   N44   |  N45  |  N46  |  N51  |
|:-----------------------:|:-----:|:-----:|:-----:|:-------:|:-------:|:-------:|:-------:|:-----:|:-------:|:-------:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|
|       **Quelle**        |  H1   |  H2   |  H2   |   H2    |   H2    |   H2    |   H2    |  H3   |   H3    |   H3    |   H4    |  H4   |  H4   |   H4    |  H4   |  H4   |   H4    |  H4   |  H4   |   H4    |  H4   |  H4   |   H4    |  H4   |  H4   |   H4    |  H4   |  H4   |  H4   |
|        **Farbe**        | gn-ge | blau  | blau  | schwarz | schwarz | schwarz | schwarz | blau  | schwarz | schwarz | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | blank |
|  **Querschnitt (mm²)**  |  2.5  |  2.5  |  2.5  |   2.5   |   2.5   |   2.5   |   1.5   |  2.5  |   2.5   |   1.5   |   2.5   |  2.5  |  2.5  |   1.5   |  1.5  |  1.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   1.5   |  1.5  |  1.5  |  16   |
|      **Kabeltyp**       | NYM-J | NYM-J | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
|  Reihenklemme_L_SK1.i1  |       |       |       |         |         |         |         |       |   L1    |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK1.o1  |       |       |       |         |         |         |         |       |         |         |   L1    |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK1.i1  |       |       |       |         |         |         |         |   N   |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK1.o1  |       |       |       |         |         |         |         |       |         |         |         |   N   |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io1 |  PE   |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io2 |       |       |       |         |         |         |         |       |         |         |         |       |  PE   |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io3 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |
|    Endstelle_SK1.i1     |       |       |       |         |         |         |         |       |         |         |   L1    |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK1.i2     |       |       |       |         |         |         |         |       |         |         |         |   N   |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK1.i3     |       |       |       |         |         |         |         |       |         |         |         |       |  PE   |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK2.i1  |       |       |       |         |         |         |         |       |         |   L1    |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK2.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |   L1    |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK2.i1  |       |       |       |         |         |         |         |   N   |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK2.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |   N   |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK2.io1 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK2.io2 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |  PE   |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK2.io3 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |
|    Endstelle_SK2.i1     |       |       |       |         |         |         |         |       |         |         |         |       |       |   L1    |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK2.i2     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |   N   |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK2.i3     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |  PE   |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK3.i1  |       |       |       |   L1    |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK3.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |   L1    |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK3.i1  |       |   N   |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK3.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |   N   |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK3.io1 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK3.io2 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |  PE   |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK3.io3 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |
|    Endstelle_SK3.i1     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |   L1    |       |       |         |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK3.i2     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |   N   |       |         |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK3.i3     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |  PE   |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK4.i1  |       |       |       |         |   L1    |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK4.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |   L1    |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK4.i1  |       |   N   |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK4.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |   N   |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK4.io1 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK4.io2 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |  PE   |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK4.io3 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |
|    Endstelle_SK4.i1     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |   L1    |       |       |         |       |       |         |       |       |       |
|    Endstelle_SK4.i2     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |   N   |       |         |       |       |         |       |       |       |
|    Endstelle_SK4.i3     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |  PE   |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK5.i1  |       |       |       |         |         |   L1    |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK5.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |   L1    |       |       |         |       |       |       |
|  Reihenklemme_N_SK5.i1  |       |       |   N   |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK5.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |   N   |       |         |       |       |       |
| Reihenklemme_PE_SK5.io1 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK5.io2 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |  PE   |         |       |       |       |
| Reihenklemme_PE_SK5.io3 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |
|    Endstelle_SK5.i1     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |   L1    |       |       |         |       |       |       |
|    Endstelle_SK5.i2     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |   N   |       |         |       |       |       |
|    Endstelle_SK5.i3     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |  PE   |         |       |       |       |
|  Reihenklemme_L_SK6.i1  |       |       |       |         |         |         |   L1    |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK6.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |   L1    |       |       |       |
|  Reihenklemme_N_SK6.i1  |       |       |   N   |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK6.o1  |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |   N   |       |       |
| Reihenklemme_PE_SK6.io1 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK6.io2 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |  PE   |       |
| Reihenklemme_PE_SK6.io3 |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |
|    Endstelle_SK6.i1     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |   L1    |       |       |       |
|    Endstelle_SK6.i2     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |   N   |       |       |
|    Endstelle_SK6.i3     |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |  PE   |       |
|           H4            |       |       |       |         |         |         |         |       |         |         |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |         |       |       |  PE   |

---

## Fehlertabelle

Beispielhafte Fehler-Widerstände auf drei Netzen im L1-Pfad RCD1→LS1/LS2
(Hutschiene H3: N20 = RCD1.o1/LS1.i1, N23 = LS1.o1, N24 = LS2.o1) - Netze
ohne Eintrag gelten als 0Ω.

Zusätzlich ein Netz auf der RCD2-Seite (Hutschiene H2: N16 = RCD2.o1/LS3.i1)
– RCD1 (H3) und RCD2 (H2) teilen sich dasselbe Einspeise-Netz N6 (siehe
Annahmen unten), ein Pfad zwischen einer Reihenklemme auf der RCD1-Seite und
einer auf der RCD2-Seite läuft also über N6 und summiert Fehler-Widerstände
aus **beiden** Zweigen, über die Hutschienengrenze hinweg.

| Netz | Widerstand (Ω) |
| ---- | -------------- |
| N20  | 0,1            |
| N23  | 0,15           |
| N24  | 0,2            |
| N16  | 0,5            |

---

## Annahmen / Anmerkungen (bitte prüfen)

1. **Hauptschalter speist alle drei Gruppen über ein gemeinsames Netz**
   (`N6`/`N7`, spannt sich über H1/H2/H3). Da er nur 2-polig ist (ein L-Pol),
   gibt es nur eine Phase – alles ist auf **L1** vereinheitlicht (analog
   testcase_02). `L2`/`L3` aus der ursprünglichen `anlage.json` wurden
   entfernt (Widerspruch: ein 2-poliger Schalter kann kein L2/L3 liefern).
   Ein echter 3- oder 4-poliger Hauptschalter mit echten L2/L3 wäre ein
   eigener, späterer Testcase.
2. **PE umgeht Hauptschalter und alle RCDs** – analog testcase_01/02. Die
   RCDs sind entsprechend als `polig: 2` (nur L+N) angenommen.
3. **Nur eine Ader führt von `PE-Klemme.io2` nach H4** (`N30`, 2.5mm², zu
   `Reihenklemme_PE_SK1.io1`) – analog testcase_02. Die übrigen fünf
   Reihenklemmen bekommen ihr PE über den lokalen H4-Bond (`N51`).
4. **Hutschienen-Bonds sind rein lokal** (`N50` nur in H1, `N51` nur in H4) –
   keine Kabelverbindung zwischen den Schienen selbst, analog testcase_01/02.
   H2 und H3 haben keine PE-Bauteile, daher keinen eigenen Bond.
5. **RCD1→LS1(2.5)/LS2(1.5)** und **RCD3→LS5(2.5)/LS6(1.5)** verzweigen mit
   unterschiedlichem Querschnitt (wie testcase_01 Annahme 2). **RCD2→LS3/LS4**
   verzweigt mit gleichem Querschnitt (2.5/2.5, wie testcase_02 RCD2).
6. **L-Klemme/N-Klemme reduzieren von 16mm² auf 10mm²** zwischen Einspeisung
   und Hauptschalter (`N4`/`N5`) – analog testcase_02.
