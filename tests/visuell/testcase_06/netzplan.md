# Netzplan – testcase_06

Variante von testcase_05: derselbe 3-polige Hauptschalter und derselbe
3-polige LS1 für einen einzigen dreiphasigen Stromkreis, aber **ohne**
vorgeschaltetes RCD - LS1 hängt direkt hinter dem Hauptschalter (Gruppe G1
besteht nur aus LS1, kein RCD-Mitglied). Zusätzlich **Gruppe G2**: ein
2-poliger RCD (RCD2) mit zwei 1-poligen LS (LS2/LS3) daneben, auf derselben
Hutschiene wie G1 - ein normaler einphasiger Stromkreis-Fall, analog
testcase_01, aber innerhalb von testcase_06 als zweite Gruppe ergänzt. Drei
physische Zeilen (Hutschienen):
- **H1** = Hauptschalter (3-polig, L1+L2+L3) + L1-/L2-/L3-/N-/PE-Klemme (unterste Zeile)
- **H2** = Hutschiene mit Gruppe G1 (3-poliger LS1, kein RCD) UND Gruppe G2
  (RCD2, 2-polig, + LS2/LS3, je 1-polig)
- **H3** = Reihenklemmen für SK1/SK2/SK3 (oberste Zeile) - SK1: drei separate,
  normale L-Reihenklemmen (L1/L2/L3), aber EINE gemeinsame N- und
  PE-Reihenklemme, da SK1 nur ein einziger (dreiphasiger) Stromkreis ist,
  kein neues Mehrphasen-Bauteil. SK2/SK3: je eine normale L-/N-/PE-Reihenklemme
  (einphasig, wie testcase_01).

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins – keine Gastzeilen aus anderen
Tabellen. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt dann, aus welcher
Hutschiene dieses Netz stammt.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei
PE-Bauteilen `io1`/`io2`/`io3` (siehe testcase_01/02): `io3` ist immer die
Hutschiene, `io1`/`io2` tragen je genau eine Ader. Beim 3-poligen LS1 gibt es
`i1`/`i2`/`i3` (L1/L2/L3) und `o1`/`o2`/`o3` (L1/L2/L3) - genau wie beim
3-poligen Hauptschalter, nur eine Etage tiefer.

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

Kein RCD vor LS1 - LS1 hängt direkt an den Hauptschalter-Ausgängen
(N9/N10/N11) bzw. am ungeschalteten N (N12, nur Gast-Spalte, hier ohne
eigenes Bauteil, läuft unverändert weiter nach H3). Neu: **Gruppe G2** (RCD2,
2-polig, + LS2/LS3, je 1-polig) sitzt auf derselben Hutschiene H2 - zapft
denselben L1-Ausgang des Hauptschalters (N9) und dasselbe ungeschaltete N
(N12) an wie LS1 (zwei Bauteile am selben Ausgangspin, siehe testcase_01
Annahme 2). RCD2.o1 speist LS2 UND LS3 über zwei separate Ausgangsadern
(N40/N41, wie RCD1.o1 in testcase_01), RCD2.o2 (N) speist beide Stromkreise
gemeinsam über dieselbe Ader (N42, wie RCD1.o2 in testcase_01).

|          Pin          |   N9    |  N10  |  N11  |  N12  |   N20   |  N21  |  N22  |   N40   |   N41   |  N42  |   N43   |   N44   |
|:---------------------:|:-------:|:-----:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-------:|:-----:|:-------:|:-------:|
|      **Quelle**       |   H1    |  H1   |  H1   |  H1   |   H2    |  H2   |  H2   |   H2    |   H2    |  H2   |   H2    |   H2    |
|       **Farbe**       | schwarz | braun | grau  | blau  | schwarz | braun | grau  | schwarz | schwarz | blau  | schwarz | schwarz |
| **Querschnitt (mm²)** |   10    |  10   |  10   |  10   |   2.5   |  2.5  |  2.5  |   2.5   |   2.5   |  2.5  |   2.5   |   2.5   |
|     **Kabeltyp**      |  NYM-J  | NYM-J | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |
|        LS1.i1         |   L1    |       |       |       |         |       |       |         |         |       |         |         |
|        LS1.i2         |         |  L2   |       |       |         |       |       |         |         |       |         |         |
|        LS1.i3         |         |       |  L3   |       |         |       |       |         |         |       |         |         |
|        LS1.o1         |         |       |       |       |   L1    |       |       |         |         |       |         |         |
|        LS1.o2         |         |       |       |       |         |  L2   |       |         |         |       |         |         |
|        LS1.o3         |         |       |       |       |         |       |  L3   |         |         |       |         |         |
|        RCD2.i1        |   L1    |       |       |       |         |       |       |         |         |       |         |         |
|        RCD2.i2        |         |       |       |   N   |         |       |       |         |         |       |         |         |
|        RCD2.o1        |         |       |       |       |         |       |       |   L1    |   L1    |       |         |         |
|        RCD2.o2        |         |       |       |       |         |       |       |         |         |   N   |         |         |
|        LS2.i1         |         |       |       |       |         |       |       |   L1    |         |       |         |         |
|        LS2.o1         |         |       |       |       |         |       |       |         |         |       |   L1    |         |
|        LS3.i1         |         |       |       |       |         |       |       |         |   L1    |       |         |         |
|        LS3.o1         |         |       |       |       |         |       |       |         |         |       |         |   L1    |

---

## Tabelle 3: H3

SK2/SK3 (Gruppe G2) sind normale einphasige Stromkreise - je eine L-, eine
N- und eine PE-Reihenklemme, analog testcase_01. Beide bekommen ihr PE
**nicht** über eine eigene Zubringerader, sondern ausschließlich über den
lokalen Hutschienen-Bond (N51, wie testcase_01 Annahme 4) - dieselbe eine
Zubringerader (N30) versorgt über den Bond die ganze Schiene.

|           Pin            |  N30  |  N12  |   N20   |  N21  |  N22  |   N23   |  N24  |  N25  |  N26  |  N27  |   N43   |   N44   |  N42  |   N45   |   N46   |   N47   |   N48   |   N49   |   N52   |  N51  |
|:-------------------------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-------:|:-----:|:-----:|:-----:|:-----:|:-------:|:-------:|:-----:|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|:-----:|
|        **Quelle**        |  H1   |  H1   |   H2    |  H2   |  H2   |   H3    |  H3   |  H3   |  H3   |  H3   |   H2    |   H2    |  H2   |   H3    |   H3    |   H3    |   H3    |   H3    |   H3    |  H3   |
|        **Farbe**         | gn-ge | blau  | schwarz | braun | grau  | schwarz | braun | grau  | blau  | gn-ge | schwarz | schwarz | blau  | schwarz | blau    | gn-ge   | schwarz | blau    | gn-ge   | blank |
|  **Querschnitt (mm²)**   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |   2.5   |  2.5  |  2.5  |  2.5  |  2.5  |   2.5   |   2.5   |  2.5  |   2.5   |  2.5    |  2.5    |  2.5    |  2.5    |  2.5    |  16   |
|      **Kabeltyp**        | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J | NYM-J | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  |  NYM-J  |   –   |
|  Reihenklemme_L1_SK1.i1   |       |       |   L1    |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L1_SK1.o1   |       |       |         |       |       |   L1    |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L2_SK1.i1   |       |       |         |  L2   |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L2_SK1.o1   |       |       |         |       |       |         |   L2  |       |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L3_SK1.i1   |       |       |         |       |  L3   |         |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L3_SK1.o1   |       |       |         |       |       |         |       |  L3   |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_N_SK1.i1    |       |   N   |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_N_SK1.o1    |       |       |         |       |       |         |       |       |   N   |       |         |         |       |         |         |         |         |         |         |       |
| Reihenklemme_PE_SK1.io1   |  PE   |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
| Reihenklemme_PE_SK1.io2   |       |       |         |       |       |         |       |       |       |  PE   |         |         |       |         |         |         |         |         |         |       |
| Reihenklemme_PE_SK1.io3   |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |  PE   |
|     Endstelle_SK1.i1      |       |       |         |       |       |   L1    |       |       |       |       |         |         |       |         |         |         |         |         |         |       |
|     Endstelle_SK1.i2      |       |       |         |       |       |         |   L2  |       |       |       |         |         |       |         |         |         |         |         |         |       |
|     Endstelle_SK1.i3      |       |       |         |       |       |         |       |  L3   |       |       |         |         |       |         |         |         |         |         |         |       |
|     Endstelle_SK1.i4      |       |       |         |       |       |         |       |       |   N   |       |         |         |       |         |         |         |         |         |         |       |
|     Endstelle_SK1.i5      |       |       |         |       |       |         |       |       |       |  PE   |         |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L_SK2.i1    |       |       |         |       |       |         |       |       |       |       |    L1   |         |       |         |         |         |         |         |         |       |
|  Reihenklemme_L_SK2.o1    |       |       |         |       |       |         |       |       |       |       |         |         |       |    L1   |         |         |         |         |         |       |
|  Reihenklemme_N_SK2.i1    |       |       |         |       |       |         |       |       |       |       |         |         |   N   |         |         |         |         |         |         |       |
|  Reihenklemme_N_SK2.o1    |       |       |         |       |       |         |       |       |       |       |         |         |       |         |    N    |         |         |         |         |       |
| Reihenklemme_PE_SK2.io2   |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |   PE    |         |         |         |       |
| Reihenklemme_PE_SK2.io3   |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |  PE   |
|     Endstelle_SK2.i1      |       |       |         |       |       |         |       |       |       |       |         |         |       |    L1   |         |         |         |         |         |       |
|     Endstelle_SK2.i2      |       |       |         |       |       |         |       |       |       |       |         |         |       |         |    N    |         |         |         |         |       |
|     Endstelle_SK2.i3      |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |   PE    |         |         |         |       |
|  Reihenklemme_L_SK3.i1    |       |       |         |       |       |         |       |       |       |       |         |    L1   |       |         |         |         |         |         |         |       |
|  Reihenklemme_L_SK3.o1    |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |    L1   |         |         |       |
|  Reihenklemme_N_SK3.i1    |       |       |         |       |       |         |       |       |       |       |         |         |   N   |         |         |         |         |         |         |       |
|  Reihenklemme_N_SK3.o1    |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |    N    |         |       |
| Reihenklemme_PE_SK3.io2   |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |   PE    |       |
| Reihenklemme_PE_SK3.io3   |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |  PE   |
|     Endstelle_SK3.i1      |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |    L1   |         |         |       |
|     Endstelle_SK3.i2      |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |    N    |         |       |
|     Endstelle_SK3.i3      |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |   PE    |       |
|            H3             |       |       |         |       |       |         |       |       |       |       |         |         |       |         |         |         |         |         |         |  PE   |

---

## Fehlertabelle

Fehlerwiderstände auf der Leitung LS1 → Reihenklemme (LS1-Ausgang, dieselbe
Netz-Rolle wie testcase_05s LS1-Ausgangsseite N24-N26, hier direkt und ohne
vorgelagerten RCD-Fehlerwiderstand). Zusätzlich ein Fehlerwiderstand auf der
N-Reihenklemme (`Reihenklemme_N_SK1.o1` → `Endstelle_SK1.i4`, Netz N26) -
diesen Fall gab es bisher in keinem Testcase; ZI summiert (anders als ZS,
siehe KONZEPT.md "Berechnung der Messwerte" - Abschnitt "ZS") explizit auch
den N-Pfad, damit lässt sich dieser Wert dort gezielt prüfen. Außerdem zwei
Fehlerwiderstände auf Gruppe G2 (SK2/SK3): N-Leiter zur Steckdose SK2
(`Reihenklemme_N_SK2.o1` → `Endstelle_SK2.i2`, Netz N46) und L-Leiter zur
3-poligen Anschlussdose SK3 (`Reihenklemme_L_SK3.o1` → `Endstelle_SK3.i1`,
Netz N48):

| Netz | Widerstand (Ω) |
| ---- | --------------- |
| N20  | 0,20            |
| N21  | 0,28            |
| N22  | 0,15            |
| N26  | 0,17            |
| N46  | 0,13            |
| N48  | 0,19            |

---

## Annahmen / Anmerkungen (bitte prüfen)

1. **Hauptschalter ist 3-polig (L1+L2+L3), kein N-Pol.** N läuft über die
   N-Klemme ungeschaltet direkt zur Reihenklemme durch - analog testcase_05.
2. **PE umgeht Hauptschalter** - analog testcase_01-05.
3. **Gruppe G1 besteht NUR aus LS1, kein RCD-Mitglied** - LS1 hängt direkt an
   den Hauptschalter-Ausgängen (N9/N10/N11). Testet den zuvor gefundenen und
   behobenen Bug in `generate_anlage.js` (`rcd` konnte `undefined` sein, wenn
   eine Gruppe kein RCD-Bauteil enthält - ungeprüfter Zugriff auf `rcd.name`
   warf einen TypeError; jetzt `rcd: rcd ? {...} : null`).
4. **LS1 ist 3-polig** (`i1`/`i2`/`i3` = L1/L2/L3, `o1`/`o2`/`o3` = L1/L2/L3)
   - identisch zu testcase_05s LS1, nur ohne vorgeschaltetes RCD.
5. **Drei separate, normale L-Reihenklemmen** (`Reihenklemme_L1/L2/L3_SK1`)
   statt eines neuen Mehrphasen-Bauteils - analog testcase_05. EINE
   gemeinsame N- und PE-Reihenklemme.
6. **Endstelle_SK1 hat fünf Pins** (`i1`-`i5` = L1/L2/L3/N/PE) - analog
   testcase_05.
7. **Nur eine Ader führt von `PE-Klemme.io2` nach H3** (`N30`, zu
   `Reihenklemme_PE_SK1.io1`) - analog testcase_02-05.
8. **Hutschienen-Bonds sind rein lokal** (`N50` nur in H1, `N51` nur in H3) -
   keine Kabelverbindung zwischen den Schienen selbst. H2 hat keine
   PE-Bauteile, daher keinen eigenen Bond.
9. **L1-/L2-/L3-Klemme reduzieren von 16mm² auf 10mm²** zwischen Einspeisung
   und Hauptschalter (`N6`/`N7`/`N8`) - analog testcase_02-05.
10. **Farben nach Phase:** L1 = schwarz, L2 = braun, L3 = grau, N = blau,
    PE = gn-ge (Standardkonvention).
11. **Endstelle "5-polige Anschlussdose"** mit eigener
    `## Steckdosen (Platzierung)`-Sektion in `bauteile.md` (siehe KONZEPT.md
    "Steckdosen (View-Objekt)") - ursprünglich war hier bewusst
    `Festanschluss` ohne Platzierungstabelle gewählt worden (die Vorlage
    existierte noch nicht - feste Verdrahtung statt Stecker, z.B. für einen
    Herdanschluss), nach deren Fertigstellung (Vorlage vom User bereitgestellt,
    `docs/referenz/herdanschlussdose_vorlage.svg`) wurde auf `5-polige
    Anschlussdose` umgestellt - analog zu testcase_05s Vorgehen bei der
    Drehstromsteckdose.
12. **Messungen (zi/zs/rcd) = nein/ja/nein**: `zi` nicht relevant (kein RCD
    in der Gruppe), `zs` relevant (normale Abschaltbedingung über den LS),
    `rcd` nein (es gibt kein RCD auf dem Pfad zu diesem Stromkreis - FI/RCD
    sollte hier keinen RCD finden, Ampel rot, analog dem in KONZEPT.md
    beschriebenen "kein RCD auf dem Pfad"-Fall).
13. **Gruppe G2 (RCD2 + LS2/LS3) zapft dieselben Ausgangsnetze wie LS1 an**
    (`N9` für L1, `N12` für N) - zwei Bauteile am selben Ausgangspin, analog
    testcase_01 Annahme 2 (dort RCD1.o1 speist LS1 UND LS2 über zwei
    Ausgangsadern). Elektrisch realistisch: mehrere Gruppen auf einer
    Hutschiene hängen an derselben Sammelschiene/demselben Phasenleiter.
14. **RCD2 ist 2-polig** (L1+N, Standardfall - kein neuer, ungetesteter
    Bauteil-Fall, `TE_TABELLE['RCD-2']` existiert bereits und wird schon in
    testcase_01 verwendet).
15. **RCD2.o1 speist LS2 UND LS3 über zwei separate Ausgangsadern** (N40/N41,
    unterschiedliche Nennströme 16A/10A) - **RCD2.o2 (N) speist beide
    Stromkreise gemeinsam** über dieselbe Ader (N42) - beides analog
    testcase_01 Annahme 2/3.
16. **SK2/SK3 sind normale einphasige Stromkreise** (Steckdose bzw.
    Lichtauslass als Endstelle) mit je einer eigenen L-/N-/PE-Reihenklemme
    auf H3, direkt neben SK1s Reihenklemmen. Bekommen ihr PE **nicht** über
    eine eigene Zubringerader, sondern ausschließlich über den lokalen
    Hutschienen-Bond (N51) - analog testcase_01 Annahme 4.
17. **Messungen (zi/zs/rcd) für SK2/SK3 = nein/ja/ja** - analog testcase_01
    SK1/SK2 (dort ebenfalls hinter einem RCD, aber `zs` statt `zi` als
    repräsentative Messung gewählt).
