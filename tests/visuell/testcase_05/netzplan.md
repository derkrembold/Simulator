# Netzplan – testcase_05

Variante von testcase_04: derselbe 3-polige Hauptschalter und 4-polige RCD
auf drei Phasen, aber statt drei einpoliger LS (je einem einphasigen
Stromkreis) EIN 3-poliger LS für einen einzigen dreiphasigen Stromkreis
(z.B. Drehstrommotor/Festanschluss). Drei physische Zeilen (Hutschienen):
- **H1** = Hauptschalter (3-polig, L1+L2+L3) + L1-/L2-/L3-/N-/PE-Klemme (unterste Zeile)
- **H2** = Hutschiene mit Gruppe 1 (RCD, 4-polig, + EIN 3-poliger LS1)
- **H3** = Reihenklemmen für SK1 (oberste Zeile) - drei separate, normale
  L-Reihenklemmen (L1/L2/L3), aber EINE gemeinsame N- und PE-Reihenklemme,
  da SK1 nur ein einziger (dreiphasiger) Stromkreis ist, kein neues
  Mehrphasen-Bauteil.

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins – keine Gastzeilen aus anderen
Tabellen. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt dann, aus welcher
Hutschiene dieses Netz stammt.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei
PE-Bauteilen `io1`/`io2`/`io3` (siehe testcase_01/02): `io3` ist immer die
Hutschiene, `io1`/`io2` tragen je genau eine Ader. Beim 3-poligen LS1 (neu
gegenüber testcase_04) gibt es `i1`/`i2`/`i3` (L1/L2/L3) und `o1`/`o2`/`o3`
(L1/L2/L3) - genau wie beim 3-poligen Hauptschalter, nur eine Etage tiefer.

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
|        LS1.i2         |         |       |       |       |         |  L2   |       |       |         |       |       |
|        LS1.i3         |         |       |       |       |         |       |  L3   |       |         |       |       |
|        LS1.o1         |         |       |       |       |         |       |       |       |   L1    |       |       |
|        LS1.o2         |         |       |       |       |         |       |       |       |         |  L2   |       |
|        LS1.o3         |         |       |       |       |         |       |       |       |         |       |  L3   |

---

## Tabelle 3: H3

|           Pin            |  N30  |  N23  |   N24   |  N25  |  N26  |   N27   |  N28  |  N29  |  N31  |  N34  |  N51  |
|:-------------------------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-----:|:-----:|
|        **Quelle**        |  H1   |  H2   |   H2    |  H2   |  H2   |   H3    |  H3   |  H3   |  H3   |  H3   |  H3   |
|        **Farbe**         | gn-ge | blau  | schwarz | braun | grau  | schwarz | blau  | gn-ge | braun | grau  | blank |
|  **Querschnitt (mm²)**   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |  2.5  |  2.5  |  16   |
|      **Kabeltyp**        | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J | NYM-J |   –   |
|  Reihenklemme_L1_SK1.i1   |       |       |   L1    |       |       |         |       |       |       |       |       |
|  Reihenklemme_L1_SK1.o1   |       |       |         |       |       |   L1    |       |       |       |       |       |
|  Reihenklemme_L2_SK1.i1   |       |       |         |  L2   |       |         |       |       |       |       |       |
|  Reihenklemme_L2_SK1.o1   |       |       |         |       |       |         |       |       |  L2   |       |       |
|  Reihenklemme_L3_SK1.i1   |       |       |         |       |  L3   |         |       |       |       |       |       |
|  Reihenklemme_L3_SK1.o1   |       |       |         |       |       |         |       |       |       |  L3   |       |
|  Reihenklemme_N_SK1.i1    |       |   N   |         |       |       |         |       |       |       |       |       |
|  Reihenklemme_N_SK1.o1    |       |       |         |       |       |         |   N   |       |       |       |       |
| Reihenklemme_PE_SK1.io1   |  PE   |       |         |       |       |         |       |       |       |       |       |
| Reihenklemme_PE_SK1.io2   |       |       |         |       |       |         |       |  PE   |       |       |       |
| Reihenklemme_PE_SK1.io3   |       |       |         |       |       |         |       |       |       |       |  PE   |
|     Endstelle_SK1.i1      |       |       |         |       |       |   L1    |       |       |       |       |       |
|     Endstelle_SK1.i2      |       |       |         |       |       |         |       |       |  L2   |       |       |
|     Endstelle_SK1.i3      |       |       |         |       |       |         |       |       |       |  L3   |       |
|     Endstelle_SK1.i4      |       |       |         |       |       |         |   N   |       |       |       |       |
|     Endstelle_SK1.i5      |       |       |         |       |       |         |       |  PE   |       |       |       |
|            H3             |       |       |         |       |       |         |       |       |       |       |  PE   |

---

## Fehlertabelle

Dieselben Beispiel-Fehlerwiderstände wie in testcase_04, auf denselben
Netzen - dort saßen sie auf L1 (RCD1.o1/LS2-Vorgänger.o1 usw.), hier auf
denselben physischen Adern, jetzt Teil des einen 3-poligen LS1.

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
   N-Klemme ungeschaltet direkt zum RCD durch - analog testcase_04.
2. **PE umgeht Hauptschalter und RCD** - analog testcase_01/02/03/04.
3. **RCD ist 4-polig (L1+L2+L3+N)**, versorgt genau EIN 3-poliges LS - anders
   als testcase_04 (dort drei einpolige LS in derselben Gruppe).
4. **LS1 ist 3-polig** (`i1`/`i2`/`i3` = L1/L2/L3, `o1`/`o2`/`o3` = L1/L2/L3)
   - eine Komponente statt drei, aber elektrisch dieselbe Verdrahtung wie
   testcase_04s drei separate LS (dieselben Netz-IDs N20-N22/N24-N26
   wiederverwendet).
5. **Drei separate, normale L-Reihenklemmen** (`Reihenklemme_L1/L2/L3_SK1`)
   statt eines neuen Mehrphasen-Bauteils - stehen einfach nebeneinander, weil
   sie zu SK1 gehören. EINE gemeinsame N- und PE-Reihenklemme (kein
   Mehrfach-N/PE nötig, da N/PE pro Stromkreis ohnehin nur je ein Leiter
   sind, unabhängig von der Phasenzahl).
6. **Endstelle_SK1 hat fünf Pins** (`i1`-`i5` = L1/L2/L3/N/PE) statt der
   sonst üblichen drei (`i1`-`i3` = L/N/PE) - eine direkte Verallgemeinerung
   der bestehenden Konvention für mehrphasige Stromkreise.
7. **Nur eine Ader führt von `PE-Klemme.io2` nach H3** (`N30`, zu
   `Reihenklemme_PE_SK1.io1`) - analog testcase_02/03/04.
8. **Hutschienen-Bonds sind rein lokal** (`N50` nur in H1, `N51` nur in H3) -
   keine Kabelverbindung zwischen den Schienen selbst. H2 hat keine
   PE-Bauteile, daher keinen eigenen Bond.
9. **L1-/L2-/L3-Klemme reduzieren von 16mm² auf 10mm²** zwischen Einspeisung
   und Hauptschalter (`N6`/`N7`/`N8`) - analog testcase_02/03/04.
10. **Farben nach Phase:** L1 = schwarz, L2 = braun, L3 = grau, N = blau,
    PE = gn-ge (Standardkonvention).
11. **Endstelle "Drehstromsteckdose"** mit eigener
    `## Steckdosen (Platzierung)`-Sektion in `bauteile.md` (siehe KONZEPT.md
    "Steckdosen (View-Objekt)") - ursprünglich war hier bewusst
    `Festanschluss` ohne Platzierungstabelle gewählt worden (die
    Drehstromsteckdosen-Vorlage existierte noch nicht), nach deren
    Fertigstellung wurde auf `Drehstromsteckdose` umgestellt.
