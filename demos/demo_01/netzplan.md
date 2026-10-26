# Netzplan – demo_01

Kleine Demo-Anlage, aufgebaut wie testcase_01 (eine Gruppe: RCD1 mit LS1 und LS2),
aber mit **3-poligem Hauptschalter** (L1+L2+L3, kein N-Pol) und getrennten
L1-/L2-/L3-/N-/PE-Klemmen wie in testcase_04 bis 06. Drei physische Zeilen (Hutschienen):
- **H1** = Hauptschalter (3-polig) + L1-/L2-/L3-/N-/PE-Klemme (unterste Zeile)
- **H2** = Gruppe G1: RCD1 (2-polig) + LS1 + LS2 (je 1-polig)
- **H3** = Reihenklemmen für SK1/SK2 (oberste Zeile)

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins – keine Gastzeilen aus anderen
Tabellen. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt dann, aus welcher
Hutschiene dieses Netz stammt.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei
PE-Bauteilen `io1`/`io2`/`io3`: `io3` ist immer die Hutschiene, `io1`/`io2` tragen je
genau eine Ader.

---

## Tabelle 1: H1

|          Pin          |   N1    |  N2   |  N3   |  N4   |  N5   |   N6    |  N7   |  N8   |   N9    |  N10  |  N11  |  N12  |  N30  |  N50  |
|:---------------------:|:-------:|:-----:|:-----:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-----:|:-----:|
|      **Quelle**       |   H1    |  H1   |  H1   |  H1   |  H1   |   H1    |  H1   |  H1   |   H1    |  H1   |  H1   |  H1   |  H1   |  H1   |
|       **Farbe**       | schwarz | braun | grau  | blau  | gn-ge | schwarz | braun | grau  | schwarz | braun | grau  | blau  | gn-ge | blank |
| **Querschnitt (mm²)** |   16    |  16   |  16   |  16   |  16   |   10    |  10   |  10   |   10    |  10   |  10   |  10   |  2.5  |  16   |
|     **Kabeltyp**      |  NYM-J  | NYM-J | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J | NYM-J |   –   |
|    Einspeisung.L1     |   L1    |       |       |       |       |         |       |       |         |       |       |       |       |       |
|    Einspeisung.L2     |         |  L2   |       |       |       |         |       |       |         |       |       |       |       |       |
|    Einspeisung.L3     |         |       |  L3   |       |       |         |       |       |         |       |       |       |       |       |
|     Einspeisung.N     |         |       |       |   N   |       |         |       |       |         |       |       |       |       |       |
|    Einspeisung.PE     |         |       |       |       |  PE   |         |       |       |         |       |       |       |       |       |
|     L1-Klemme.i1      |   L1    |       |       |       |       |         |       |       |         |       |       |       |       |       |
|     L1-Klemme.o1      |         |       |       |       |       |   L1    |       |       |         |       |       |       |       |       |
|     L2-Klemme.i1      |         |  L2   |       |       |       |         |       |       |         |       |       |       |       |       |
|     L2-Klemme.o1      |         |       |       |       |       |         |  L2   |       |         |       |       |       |       |       |
|     L3-Klemme.i1      |         |       |  L3   |       |       |         |       |       |         |       |       |       |       |       |
|     L3-Klemme.o1      |         |       |       |       |       |         |       |  L3   |         |       |       |       |       |       |
|      N-Klemme.i1      |         |       |       |   N   |       |         |       |       |         |       |       |       |       |       |
|      N-Klemme.o1      |         |       |       |       |       |         |       |       |         |       |       |   N   |       |       |
|     PE-Klemme.io1     |         |       |       |       |  PE   |         |       |       |         |       |       |       |       |       |
|     PE-Klemme.io2     |         |       |       |       |       |         |       |       |         |       |       |       |  PE   |       |
|     PE-Klemme.io3     |         |       |       |       |       |         |       |       |         |       |       |       |       |  PE   |
|   Hauptschalter.i1    |         |       |       |       |       |   L1    |       |       |         |       |       |       |       |       |
|   Hauptschalter.i2    |         |       |       |       |       |         |  L2   |       |         |       |       |       |       |       |
|   Hauptschalter.i3    |         |       |       |       |       |         |       |  L3   |         |       |       |       |       |       |
|   Hauptschalter.o1    |         |       |       |       |       |         |       |       |   L1    |       |       |       |       |       |
|   Hauptschalter.o2    |         |       |       |       |       |         |       |       |         |  L2   |       |       |       |       |
|   Hauptschalter.o3    |         |       |       |       |       |         |       |       |         |       |  L3   |       |       |       |
|          H1           |         |       |       |       |       |         |       |       |         |       |       |       |       |  PE   |

---

## Tabelle 2: H2

RCD1 hängt an der L1-Phase des Hauptschalters (N9) und am ungeschalteten N (N12,
Gast-Spalte aus H1). RCD1.o1 speist LS1 UND LS2 über zwei separate Adern am selben
Ausgangspin (N40/N41, wie testcase_01 Annahme 2). RCD1.o2 (N) speist beide Stromkreise
gemeinsam über dieselbe Ader (N42, wie testcase_01 Annahme 3).

|          Pin          |   N9    |  N12  |   N40   |   N41   |  N42  |   N43   |   N44   |
|:---------------------:|:-------:|:-----:|:-------:|:-------:|:-----:|:-------:|:-------:|
|      **Quelle**       |   H1    |  H1   |   H2    |   H2    |  H2   |   H2    |   H2    |
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
|          H2           |         |       |         |         |       |         |         |

---

## Tabelle 3: H3

Beide Stromkreise bekommen ihr PE **nicht** über eine eigene Zubringerader, sondern
ausschließlich über den lokalen Hutschienen-Bond (N51, wie testcase_01 Annahme 4) -
dieselbe eine Zubringerader (N30) versorgt über den Bond die ganze Schiene.

|           Pin           |  N30  |   N42   |   N43   |   N44   |   N45   |  N46  |  N47  |   N48   |  N49  |  N52  |  N51  |
|:-----------------------:|:-----:|:-------:|:-------:|:-------:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|
|       **Quelle**        |  H1   |   H2    |   H2    |   H2    |   H3    |  H3   |  H3   |   H3    |  H3   |  H3   |  H3   |
|        **Farbe**        | gn-ge |  blau   | schwarz | schwarz | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | blank |
|  **Querschnitt (mm²)**  |  2.5  |   2.5   |   2.5   |   1.5   |   2.5   |  2.5  |  2.5  |   1.5   |  1.5  |  1.5  |  16   |
|      **Kabeltyp**       | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
|  Reihenklemme_L_SK1.i1  |       |         |    L1   |         |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK1.o1  |       |         |         |         |    L1   |       |       |         |       |       |       |
|  Reihenklemme_N_SK1.i1  |       |    N    |         |         |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK1.o1  |       |         |         |         |         |   N   |       |         |       |       |       |
| Reihenklemme_PE_SK1.io1 |  PE   |         |         |         |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io2 |       |         |         |         |         |       |  PE   |         |       |       |       |
| Reihenklemme_PE_SK1.io3 |       |         |         |         |         |       |       |         |       |       |  PE   |
|    Endstelle_SK1.i1     |       |         |         |         |    L1   |       |       |         |       |       |       |
|    Endstelle_SK1.i2     |       |         |         |         |         |   N   |       |         |       |       |       |
|    Endstelle_SK1.i3     |       |         |         |         |         |       |  PE   |         |       |       |       |
|  Reihenklemme_L_SK2.i1  |       |         |         |    L1   |         |       |       |         |       |       |       |
|  Reihenklemme_L_SK2.o1  |       |         |         |         |         |       |       |    L1   |       |       |       |
|  Reihenklemme_N_SK2.i1  |       |    N    |         |         |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK2.o1  |       |         |         |         |         |       |       |         |   N   |       |       |
| Reihenklemme_PE_SK2.io2 |       |         |         |         |         |       |       |         |       |  PE   |       |
| Reihenklemme_PE_SK2.io3 |       |         |         |         |         |       |       |         |       |       |  PE   |
|    Endstelle_SK2.i1     |       |         |         |         |         |       |       |    L1   |       |       |       |
|    Endstelle_SK2.i2     |       |         |         |         |         |       |       |         |   N   |       |       |
|    Endstelle_SK2.i3     |       |         |         |         |         |       |       |         |       |  PE   |       |
|           H3            |       |         |         |         |         |       |       |         |       |       |  PE   |

---

## Fehlertabelle

Beispielhafte Fehler-Widerstände auf drei Netzen des L1-Pfads zur Endstelle SK1
(N1 → N6 → N9 → N40 → N43 → N45) - Netze ohne Eintrag gelten als 0Ω.

| Netz | Widerstand (Ω) |
| ---- | --------------- |
| N40  | 0,1             |
| N43  | 0,2             |
| N45  | 0,3             |

---

## Annahmen / Anmerkungen

1. **Hauptschalter ist 3-polig (L1+L2+L3), kein N-Pol.** N läuft über die N-Klemme
   ungeschaltet direkt zu RCD1 und den Reihenklemmen - analog testcase_04 bis 06.
2. **PE umgeht Hauptschalter und RCD** - analog testcase_01.
3. **RCD1 hängt nur an L1** (N9). L2 und L3 sind bis zum Hauptschalter geführt, werden
   aber in dieser Demo nicht weiterverwendet.
4. **Nur eine Ader führt von `PE-Klemme.io2` nach H3** (N30, zu
   `Reihenklemme_PE_SK1.io1`). `Reihenklemme_PE_SK2` bekommt PE ausschließlich über den
   Hutschienen-Bond von H3 (N51), wie in testcase_01 Annahme 4 und testcase_06.
5. **Hutschienen-Bond pro Hutschiene lokal** (N50 für H1, N51 für H3), keine
   Kabelverbindung zwischen den Schienen. H2 hat keine PE-Bauteile, daher keinen Bond.
