# Netzplan – testcase_04

Drei physische Zeilen (Hutschienen) im Schaltkasten, je eine eigene Tabelle:
- **H1** = Hauptschalter (3-polig, L1+L2+L3) + L1-/L2-/L3-/N-/PE-Klemme (unterste Zeile)
- **H2** = Hutschiene mit Gruppe 1 (RCD, 4-polig, + LS1/LS2/LS3, je eine Phase)
- **H3** = Reihenklemmen für SK1–SK3 (oberste Zeile), je Stromkreis eine eigene Phase

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

|          Pin          |   N9    |  N10  |  N11  |  N12  |   N20   |  N21  |  N22  |  N23  |   N24   |  N25  |  N26  |
|:---------------------:|:-------:|:-----:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-------:|:-----:|:-----:|
|      **Quelle**       |   H1    |  H1   |  H1   |  H1   |   H2    |  H2   |  H2   |  H2   |   H2    |  H2   |  H2   |
|       **Farbe**       | schwarz | braun | grau  | blau  | schwarz | braun | grau  | blau  | schwarz | braun | grau  |
| **Querschnitt (mm²)** |   10    |  10   |  10   |  10   |   2.5   |  2.5  |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |
|     **Kabeltyp**      |  NYM-J  | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |
|        RCD1.i1        |   L1    |       |       |       |         |       |       |       |         |       |       |
|        RCD1.i2        |         |  L2   |       |       |         |       |       |       |         |       |       |
|        RCD1.i3        |         |       |  L3   |       |         |       |       |       |         |       |       |
|        RCD1.i4        |         |       |       |   N   |         |       |       |       |         |       |       |
|        RCD1.o1        |         |       |       |       |   L1    |       |       |       |         |       |       |
|        RCD1.o2        |         |       |       |       |         |  L2   |       |       |         |       |       |
|        RCD1.o3        |         |       |       |       |         |       |  L3   |       |         |       |       |
|        RCD1.o4        |         |       |       |       |         |       |       |   N   |         |       |       |
|        LS1.i1         |         |       |       |       |   L1    |       |       |       |         |       |       |
|        LS1.o1         |         |       |       |       |         |       |       |       |   L1    |       |       |
|        LS2.i1         |         |       |       |       |         |  L2   |       |       |         |       |       |
|        LS2.o1         |         |       |       |       |         |       |       |       |         |  L2   |       |
|        LS3.i1         |         |       |       |       |         |       |  L3   |       |         |       |       |
|        LS3.o1         |         |       |       |       |         |       |       |       |         |       |  L3   |

---

## Tabelle 3: H3

|           Pin           |  N30  |  N23  |   N24   |  N25  |  N26  |   N27   |  N28  |  N29  |  N31  |  N32  |  N33  |  N34  |  N35  |  N36  |  N51  |
|:-----------------------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
|       **Quelle**        |  H1   |  H2   |   H2    |  H2   |  H2   |   H3    |  H3   |  H3   |  H3   |  H3   |  H3   |  H3   |  H3   |  H3   |  H3   |
|        **Farbe**        | gn-ge | blau  | schwarz | braun | grau  | schwarz | blau  | gn-ge | braun | blau  | gn-ge | grau  | blau  | gn-ge | blank |
|  **Querschnitt (mm²)**  |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |  2.5  |  2.5  |  2.5  |  2.5  |  2.5  |  2.5  |  16   |
|      **Kabeltyp**       | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J |   –   |
|  Reihenklemme_L_SK1.i1  |       |       |   L1    |       |       |         |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_L_SK1.o1  |       |       |         |       |       |   L1    |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_N_SK1.i1  |       |   N   |         |       |       |         |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_N_SK1.o1  |       |       |         |       |       |         |   N   |       |       |       |       |       |       |       |       |
| Reihenklemme_PE_SK1.io1 |  PE   |       |         |       |       |         |       |       |       |       |       |       |       |       |       |
| Reihenklemme_PE_SK1.io2 |       |       |         |       |       |         |       |  PE   |       |       |       |       |       |       |       |
| Reihenklemme_PE_SK1.io3 |       |       |         |       |       |         |       |       |       |       |       |       |       |       |  PE   |
|    Endstelle_SK1.i1     |       |       |         |       |       |   L1    |       |       |       |       |       |       |       |       |       |
|    Endstelle_SK1.i2     |       |       |         |       |       |         |   N   |       |       |       |       |       |       |       |       |
|    Endstelle_SK1.i3     |       |       |         |       |       |         |       |  PE   |       |       |       |       |       |       |       |
|  Reihenklemme_L_SK2.i1  |       |       |         |  L2   |       |         |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_L_SK2.o1  |       |       |         |       |       |         |       |       |  L2   |       |       |       |       |       |       |
|  Reihenklemme_N_SK2.i1  |       |   N   |         |       |       |         |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_N_SK2.o1  |       |       |         |       |       |         |       |       |       |   N   |       |       |       |       |       |
| Reihenklemme_PE_SK2.io1 |       |       |         |       |       |         |       |       |       |       |       |       |       |       |       |
| Reihenklemme_PE_SK2.io2 |       |       |         |       |       |         |       |       |       |       |  PE   |       |       |       |       |
| Reihenklemme_PE_SK2.io3 |       |       |         |       |       |         |       |       |       |       |       |       |       |       |  PE   |
|    Endstelle_SK2.i1     |       |       |         |       |       |         |       |       |  L2   |       |       |       |       |       |       |
|    Endstelle_SK2.i2     |       |       |         |       |       |         |       |       |       |   N   |       |       |       |       |       |
|    Endstelle_SK2.i3     |       |       |         |       |       |         |       |       |       |       |  PE   |       |       |       |       |
|  Reihenklemme_L_SK3.i1  |       |       |         |       |  L3   |         |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_L_SK3.o1  |       |       |         |       |       |         |       |       |       |       |       |  L3   |       |       |       |
|  Reihenklemme_N_SK3.i1  |       |   N   |         |       |       |         |       |       |       |       |       |       |       |       |       |
|  Reihenklemme_N_SK3.o1  |       |       |         |       |       |         |       |       |       |       |       |       |   N   |       |       |
| Reihenklemme_PE_SK3.io1 |       |       |         |       |       |         |       |       |       |       |       |       |       |       |       |
| Reihenklemme_PE_SK3.io2 |       |       |         |       |       |         |       |       |       |       |       |       |       |  PE   |       |
| Reihenklemme_PE_SK3.io3 |       |       |         |       |       |         |       |       |       |       |       |       |       |       |  PE   |
|    Endstelle_SK3.i1     |       |       |         |       |       |         |       |       |       |       |       |  L3   |       |       |       |
|    Endstelle_SK3.i2     |       |       |         |       |       |         |       |       |       |       |       |       |   N   |       |       |
|    Endstelle_SK3.i3     |       |       |         |       |       |         |       |       |       |       |       |       |       |  PE   |       |
|           H3            |       |       |         |       |       |         |       |       |       |       |       |       |       |       |  PE   |

---

## Fehlertabelle

Beispielhafte Fehler-Widerstände auf allen drei Phasen der RCD1-Gruppe -
L1 (N20 = RCD1.o1/LS1.i1, N24 = LS1.o1), L2 (N21 = RCD1.o2/LS2.i1, N25 =
LS2.o1) und L3 (N22 = RCD1.o3/LS3.i1, N26 = LS3.o1) - Netze ohne Eintrag
gelten als 0Ω. Werte bewusst mit unterschiedlicher zweiter Nachkommastelle,
damit sich Summen beim manuellen Nachrechnen eindeutig zuordnen lassen.

| Netz | Widerstand (Ω) |
| ---- | --------------- |
| N20  | 0,13            |
| N24  | 0,27            |
| N21  | 0,19            |
| N25  | 0,34            |
| N22  | 0,41            |
| N26  | 0,08            |

---

## Annahmen / Anmerkungen (bitte prüfen)

1. **Hauptschalter ist 3-polig (L1+L2+L3), kein N-Pol.** N läuft über die
   N-Klemme ungeschaltet direkt zum RCD durch – analog zur PE-Umgehung
   (Annahme 2), nur dass hier nicht nur PE, sondern auch N am Hauptschalter
   vorbeigeführt wird, weil er dafür schlicht keinen Pol hat.
2. **PE umgeht Hauptschalter und RCD** – analog testcase_01/02/03.
3. **RCD ist 4-polig (L1+L2+L3+N)** und versorgt alle drei Gruppen-Phasen aus
   einem einzigen RCD – LS1(L1)/LS2(L2)/LS3(L3) sitzen alle in derselben
   Gruppe, wie gefordert.
4. **RCD.o4 (N) speist alle drei Stromkreise gemeinsam** (`N23`, analog zum
   Muster aus testcase_02/03, wo ein gemeinsames N-Netz mehrere
   Reihenklemmen versorgt).
5. **Nur eine Ader führt von `PE-Klemme.io2` nach H3** (`N30`, 2.5mm², zu
   `Reihenklemme_PE_SK1.io1`) – analog testcase_02/03. Die übrigen zwei
   Reihenklemmen bekommen ihr PE über den lokalen H3-Bond (`N51`).
6. **Hutschienen-Bonds sind rein lokal** (`N50` nur in H1, `N51` nur in H3) –
   keine Kabelverbindung zwischen den Schienen selbst, analog
   testcase_01/02/03. H2 hat keine PE-Bauteile, daher keinen eigenen Bond.
7. **L1-/L2-/L3-Klemme reduzieren von 16mm² auf 10mm²** zwischen Einspeisung
   und Hauptschalter (`N6`/`N7`/`N8`) – analog testcase_02/03.
8. **Farben nach Phase:** L1 = schwarz, L2 = braun, L3 = grau, N = blau,
   PE = gn-ge (Standardkonvention).
