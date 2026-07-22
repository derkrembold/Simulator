# Netzplan – testcase_05

Variante von testcase_04: derselbe 3-polige Hauptschalter und 4-polige RCD
auf drei Phasen, aber statt drei einpoliger LS (je einem einphasigen
Stromkreis) EIN 3-poliger LS für einen einzigen dreiphasigen Stromkreis
(z.B. Drehstrommotor/Festanschluss). Zusätzlich **Gruppe G2**: ein 2-poliger
RCD (RCD2) mit zwei "LS mit AFDD"-Kombigeräten (LS2/LS3, siehe KONZEPT.md
"AFDD") daneben, auf derselben Hutschiene wie G1 - baulich analog zu
testcase_06s Gruppe G2 (RCD2 + zwei 1-polige LS), nur dass LS2/LS3 hier
Kombigeräte sind: baulich wie ein 2-poliger RCD (L+N in einem Gehäuse), aber
elektrisch ein normaler 2-poliger LS (schaltet L UND N). Drei physische
Zeilen (Hutschienen):
- **H1** = Hauptschalter (3-polig, L1+L2+L3) + L1-/L2-/L3-/N-/PE-Klemme (unterste Zeile)
- **H2** = Hutschiene mit Gruppe G1 (RCD1, 4-polig, + EIN 3-poliger LS1) UND
  Gruppe G2 (RCD2, 2-polig, + LS2/LS3, je 2-polig mit AFDD)
- **H3** = Reihenklemmen für SK1/SK2/SK3 (oberste Zeile) - SK1: drei separate,
  normale L-Reihenklemmen (L1/L2/L3), aber EINE gemeinsame N- und
  PE-Reihenklemme, da SK1 nur ein einziger (dreiphasiger) Stromkreis ist,
  kein neues Mehrphasen-Bauteil. SK2/SK3: je eine normale L-/N-/PE-Reihenklemme
  (einphasig, wie testcase_01/06).

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

Neu: **Gruppe G2** (RCD2, 2-polig, + LS2/LS3, je 2-polig mit AFDD) sitzt auf
derselben Hutschiene H2 - zapft denselben L1-Ausgang des Hauptschalters (N9)
und dasselbe ungeschaltete N (N12) an wie RCD1 (mehrere Bauteile am selben
Ausgangspin, siehe testcase_01 Annahme 2, hier analog testcase_06 Annahme
13). RCD2.o1 (L) UND RCD2.o2 (N) speisen je LS2 UND LS3 über zwei separate
Ausgangsadern (N60/N61 bzw. N62/N63) - anders als bei einem normalen
1-poligen LS (testcase_06) braucht hier auch der N-Pol eine eigene Ader pro
Gerät, weil LS2/LS3 als AFDD-Kombigerät N selbst mitschalten (siehe
KONZEPT.md "AFDD").

|          Pin          |   N9    |  N10  |  N11  |  N12  |   N20   |  N21  |  N22  |  N23  |   N24   |  N25  |  N26  |   N60   |   N61   |  N62  |  N63  |   N64   |  N65  |   N66   |  N67  |
|:---------------------:|:-------:|:-----:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-------:|:-----:|:-----:|:-------:|:-----:|:-------:|:-----:|
|      **Quelle**       |   H1    |  H1   |  H1   |  H1   |   H2    |  H2   |  H2   |  H2   |   H2    |  H2   |  H2   |   H2    |   H2    |  H2   |  H2   |   H2    |  H2   |   H2    |  H2   |
|       **Farbe**       | schwarz | braun | grau  | blau  | schwarz | braun | grau  | blau  | schwarz | braun | grau  | schwarz | schwarz | blau  | blau  | schwarz | blau  | schwarz | blau  |
| **Querschnitt (mm²)** |   10    |  10   |  10   |  10   |   2.5   |  2.5  |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |   2.5   |  2.5  |
|     **Kabeltyp**      |  NYM-J  | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J |  NYM-J  | NYM-J |
|        RCD1.i1        |   L1    |       |       |       |         |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.i2        |         |  L2   |       |       |         |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.i3        |         |       |  L3   |       |         |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.i4        |         |       |       |   N   |         |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.o1        |         |       |       |       |   L1    |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.o2        |         |       |       |       |         |  L2   |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.o3        |         |       |       |       |         |       |  L3   |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD1.o4        |         |       |       |       |         |       |       |   N   |         |       |       |         |         |       |       |         |         |       |       |
|        LS1.i1         |         |       |       |       |   L1    |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        LS1.i2         |         |       |       |       |         |  L2   |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        LS1.i3         |         |       |       |       |         |       |  L3   |       |         |       |       |         |         |       |       |         |         |       |       |
|        LS1.o1         |         |       |       |       |         |       |       |       |   L1    |       |       |         |         |       |       |         |         |       |       |
|        LS1.o2         |         |       |       |       |         |       |       |       |         |  L2   |       |         |         |       |       |         |         |       |       |
|        LS1.o3         |         |       |       |       |         |       |       |       |         |       |  L3   |         |         |       |       |         |         |       |       |
|        RCD2.i1        |   L1    |       |       |       |         |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD2.i2        |         |       |       |   N   |         |       |       |       |         |       |       |         |         |       |       |         |         |       |       |
|        RCD2.o1        |         |       |       |       |         |       |       |       |         |       |       |    L1   |    L1   |       |       |         |         |       |       |
|        RCD2.o2        |         |       |       |       |         |       |       |       |         |       |       |         |         |   N   |   N   |         |         |       |       |
|        LS2.i1         |         |       |       |       |         |       |       |       |         |       |       |    L1   |         |       |       |         |         |       |       |
|        LS2.i2         |         |       |       |       |         |       |       |       |         |       |       |         |         |   N   |       |         |         |       |       |
|        LS2.o1         |         |       |       |       |         |       |       |       |         |       |       |         |         |       |       |    L1   |       |         |       |
|        LS2.o2         |         |       |       |       |         |       |       |       |         |       |       |         |         |       |       |         |   N   |         |       |
|        LS3.i1         |         |       |       |       |         |       |       |       |         |       |       |         |    L1   |       |       |         |       |         |       |
|        LS3.i2         |         |       |       |       |         |       |       |       |         |       |       |         |         |       |   N   |         |       |         |       |
|        LS3.o1         |         |       |       |       |         |       |       |       |         |       |       |         |         |       |       |         |       |    L1   |       |
|        LS3.o2         |         |       |       |       |         |       |       |       |         |       |       |         |         |       |       |         |       |         |   N   |

---

## Tabelle 3: H3

SK2/SK3 (Gruppe G2) sind normale einphasige Stromkreise - je eine L-, eine
N- und eine PE-Reihenklemme, analog testcase_01/06. Anders als bei einem
normalen 1-poligen LS hat hier auch die N-Reihenklemme eine eigene
Zubringerader von der LS-AFDD-Ausgangsseite (N65/N67, nicht direkt von
RCD2.o2), weil LS2/LS3 den N-Pol selbst schalten. Beide bekommen ihr PE
**nicht** über eine eigene Zubringerader, sondern ausschließlich über den
lokalen Hutschienen-Bond (N51) - analog testcase_01/06 Annahme 4.

|           Pin            |  N30  |  N23  |   N24   |  N25  |  N26  |   N27   |  N28  |  N29  |  N31  |  N34  |   N64   |  N65  |   N66   |  N67  |   N68   |  N69  |  N70  |   N71   |  N72  |  N73  |  N51  |
|:-------------------------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-----:|:-------:|:-----:|:-------:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|
|        **Quelle**        |  H1   |  H2   |   H2    |  H2   |  H2   |   H3    |  H3   |  H3   |  H3   |  H3   |   H2    |  H2   |   H2    |  H2   |   H3    |  H3   |  H3   |   H3    |  H3   |  H3   |  H3   |
|        **Farbe**         | gn-ge | blau  | schwarz | braun | grau  | schwarz | blau  | gn-ge | braun | grau  | schwarz | blau  | schwarz | blau  | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | blank |
|  **Querschnitt (mm²)**   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |  2.5  |  2.5  |   2.5   |  2.5  |   2.5   |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |  16   |
|      **Kabeltyp**        | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J |  NYM-J  | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
|  Reihenklemme_L1_SK1.i1   |       |       |   L1    |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_L1_SK1.o1   |       |       |         |       |       |   L1    |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_L2_SK1.i1   |       |       |         |  L2   |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_L2_SK1.o1   |       |       |         |       |       |         |       |       |  L2   |       |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_L3_SK1.i1   |       |       |         |       |  L3   |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_L3_SK1.o1   |       |       |         |       |       |         |       |       |       |  L3   |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK1.i1    |       |   N   |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|  Reihenklemme_N_SK1.o1    |       |       |         |       |       |         |   N   |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io1   |  PE   |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io2   |       |       |         |       |       |         |       |  PE   |       |       |         |       |         |       |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io3   |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |  PE   |
|     Endstelle_SK1.i1      |       |       |         |       |       |   L1    |       |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|     Endstelle_SK1.i2      |       |       |         |       |       |         |       |       |  L2   |       |         |       |         |       |         |       |       |         |       |       |       |
|     Endstelle_SK1.i3      |       |       |         |       |       |         |       |       |       |  L3   |         |       |         |       |         |       |       |         |       |       |       |
|     Endstelle_SK1.i4      |       |       |         |       |       |         |   N   |       |       |       |         |       |         |       |         |       |       |         |       |       |       |
|     Endstelle_SK1.i5      |       |       |         |       |       |         |       |  PE   |       |       |         |       |         |       |         |       |       |         |       |       |       |
|   Reihenklemme_L_SK2.i1   |       |       |         |       |       |         |       |       |       |       |   L1    |       |         |       |         |       |       |         |       |       |       |
|   Reihenklemme_L_SK2.o1   |       |       |         |       |       |         |       |       |       |       |         |       |         |       |    L1   |       |       |         |       |       |       |
|   Reihenklemme_N_SK2.i1   |       |       |         |       |       |         |       |       |       |       |         |   N   |         |       |         |       |       |         |       |       |       |
|   Reihenklemme_N_SK2.o1   |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |   N   |       |         |       |       |       |
|  Reihenklemme_PE_SK2.io2  |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |  PE   |         |       |       |       |
|  Reihenklemme_PE_SK2.io3  |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |  PE   |
|     Endstelle_SK2.i1      |       |       |         |       |       |         |       |       |       |       |         |       |         |       |    L1   |       |       |         |       |       |       |
|     Endstelle_SK2.i2      |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |   N   |       |         |       |       |       |
|     Endstelle_SK2.i3      |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |  PE   |         |       |       |       |
|   Reihenklemme_L_SK3.i1   |       |       |         |       |       |         |       |       |       |       |         |       |    L1   |       |         |       |       |         |       |       |       |
|   Reihenklemme_L_SK3.o1   |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |    L1   |       |       |       |
|   Reihenklemme_N_SK3.i1   |       |       |         |       |       |         |       |       |       |       |         |       |         |   N   |         |       |       |         |       |       |       |
|   Reihenklemme_N_SK3.o1   |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |   N   |       |       |
|  Reihenklemme_PE_SK3.io2  |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |  PE   |       |
|  Reihenklemme_PE_SK3.io3  |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |  PE   |
|     Endstelle_SK3.i1      |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |    L1   |       |       |       |
|     Endstelle_SK3.i2      |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |   N   |       |       |
|     Endstelle_SK3.i3      |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |  PE   |       |
|            H3             |       |       |         |       |       |         |       |       |       |       |         |       |         |       |         |       |       |         |       |       |  PE   |

---

## Fehlertabelle

Dieselben Beispiel-Fehlerwiderstände wie in testcase_04, auf denselben
Netzen - dort saßen sie auf L1 (RCD1.o1/LS2-Vorgänger.o1 usw.), hier auf
denselben physischen Adern, jetzt Teil des einen 3-poligen LS1. Zusätzlich
zwei Fehlerwiderstände auf Gruppe G2 (SK2/SK3), je einer vor und einer nach
dem LS-AFDD-Kombigerät, analog zu testcase_04s Muster. Außerdem ein
Fehlerwiderstand auf LS3s N-Ausgangsader (N67, Netz zwischen LS3.o2 und
Reihenklemme_N_SK3.i1) - anders als bei den L-Adern (je ein Wert vor UND
nach dem Bauteil) hier bewusst nur EIN Wert auf einer der beiden N-Adern
(Eingang N63 bleibt ohne Eintrag), sodass RLOW zwischen LS3s N-Eingang und
N-Ausgang exakt 0,07Ω ergibt:

| Netz | Widerstand (Ω) |
| ---- | --------------- |
| N20  | 0,13            |
| N24  | 0,27            |
| N21  | 0,19            |
| N25  | 0,34            |
| N22  | 0,41            |
| N26  | 0,08            |
| N60  | 0,22            |
| N64  | 0,31            |
| N61  | 0,18            |
| N66  | 0,25            |
| N67  | 0,07            |

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
12. **Gruppe G2 (RCD2 + LS2/LS3) zapft dieselben Ausgangsnetze wie RCD1 an**
    (`N9` für L1, `N12` für N) - zwei Gruppen am selben Ausgangspin, analog
    testcase_06 Annahme 13.
13. **RCD2 ist 2-polig** (L1+N, Standardfall) und speist LS2 UND LS3 über je
    zwei separate Ausgangsadern, sowohl auf L (`N60`/`N61`) als auch auf N
    (`N62`/`N63`) - anders als testcase_06 (dort teilen sich die
    nachgeschalteten 1-poligen LS eine gemeinsame N-Ausgangsader von RCD2,
    weil ein normaler LS N gar nicht schaltet).
14. **LS2/LS3 sind "LS mit AFDD"-Kombigeräte** (siehe KONZEPT.md "AFDD"): je
    2-polig (`i1`/`o1` = L, `i2`/`o2` = N), baulich wie ein 2-poliger RCD
    (eigene TE-Breite/Schalter-Bauform in `view/schaltkasten.js`, Aufschrift
    zweizeilig "B20"/"AFDD" bzw. "B16"/"AFDD"), elektrisch aber ein normaler
    2-poliger LS ohne Sonderverhalten (kein `abklemmen_bei_iso` o.ä. - RISO-
    Implikationen von AFDD/RCD Typ B sind bewusst zurückgestellt, siehe
    KONZEPT.md "Geplant für später").
15. **SK2/SK3 sind normale einphasige Stromkreise** (je eine Steckdose als
    Endstelle) mit eigener L-/N-Reihenklemme UND eigener Zubringerader für
    beide (da LS2/LS3 den N-Pol selbst schalten, siehe Annahme 13/14) - PE
    weiterhin nur über den lokalen Hutschienen-Bond (`N51`), analog
    testcase_01/06 Annahme 4.
16. **Messungen (zi/zs/rcd) für SK2/SK3 = nein/ja/ja** - analog testcase_06
    SK2/SK3 (RCD2 auf dem Pfad, `zs` als repräsentative Messung gewählt).
