# Netzplan – testcase_01

Drei physische Zeilen (Hutschienen) im Schaltkasten, je eine eigene Tabelle:
- **H1** = Leistungsschalter + PE-Klemme (letzte Zeile)
- **H2** = Hutschiene 1: RCD1 + LS1 + LS2 (Gruppen-Zeile)
- **H3** = Reihenklemmen (erste Zeile)

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins – keine Gastzeilen aus anderen
Tabellen. Ein Netz, das über eine Tabellengrenze hinweg weiterläuft, taucht als
Spalte in beiden Tabellen auf; die Zeile **Quelle** (direkt unter dem Tabellenkopf,
neben Farbe/Querschnitt/Kabeltyp) zeigt dann, aus welcher Hutschiene dieses Netz
stammt. So lässt sich pro Tabelle sofort erkennen, welche Netze dort ihren Ursprung
haben (Quelle = eigene Hutschiene) und welche importiert sind.

Ausnahme ist der Hutschienen-Bond (die Metallschiene als PE-Sammelpunkt, siehe
Annahme 6): Eine Hutschiene ist kein Kabel und verbindet sich nicht "über ein Netz"
mit einer anderen Hutschiene. Der Bond bleibt daher immer lokal auf seine eigene
Tabelle beschränkt und bekommt pro Hutschiene eine eigene Netznummer, auch wenn
mehrere PE-Bauteile auf verschiedenen Schienen sitzen.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang).
Bei **PE-Bauteilen** (`PE-Klemme`, `Reihenklemme_PE_*`) gibt es keine sinnvolle
Eingang/Ausgang-Richtung, da im Normalbetrieb kein Strom über PE fließt. Dort heißen
die Pins stattdessen `io1`, `io2`, `io3` – **drei** gleichwertige Anschlusspunkte
statt zwei: ankommende Ader, weiterführende Ader, und die Verbindung zur Hutschiene
selbst (die Metallschiene dient als PE-Bezugspunkt/Sammelschiene).

Die Zeilen **Farbe**, **Querschnitt (mm²)** und **Kabeltyp** direkt unter dem
Tabellenkopf zeigen die Eigenschaften jedes Netzes (Einheit steht im Zeilennamen,
Werte sind reine Zahlen). `N19` und `N20` (Hutschienen-Bonds, siehe Annahme 6) haben
keinen Kabeltyp, da es keine isolierten Leitungen sind, sondern die blanke
Metallschiene selbst.

---

## Tabelle 1: H1

| Pin                   |   N1    |  N2   |  N3   |   N4    |  N5   |  N9   |  N19  |
| --------------------- | :-----: | :---: | :---: | :-----: | :---: | :---: | :---: |
| **Quelle**            |   H1    |  H1   |  H1   |   H1    |  H1   |  H1   |  H1   |
| **Farbe**             | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | blank |
| **Querschnitt (mm²)** |   16    |  16   |  16   |   10    |  10   |  2.5  |  16   |
| **Kabeltyp**          |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
| Einspeisung.L1        |   L1    |       |       |         |       |       |       |
| Einspeisung.N         |         |   N   |       |         |       |       |       |
| Einspeisung.PE        |         |       |  PE   |         |       |       |       |
| Leistungsschalter.i1  |   L1    |       |       |         |       |       |       |
| Leistungsschalter.i2  |         |   N   |       |         |       |       |       |
| Leistungsschalter.o1  |         |       |       |   L1    |       |       |       |
| Leistungsschalter.o2  |         |       |       |         |   N   |       |       |
| PE-Klemme.io1         |         |       |  PE   |         |       |       |       |
| PE-Klemme.io2         |         |       |       |         |       |  PE   |       |
| PE-Klemme.io3         |         |       |       |         |       |       |  PE   |
| H1                    |         |       |       |         |       |       |  PE   |

---

## Tabelle 2: H2

| Pin                   |   N4    |  N5   |   N6    |   N7    |  N8   |   N11   |   N12   |
| --------------------- | :-----: | :---: | :-----: | :-----: | :---: | :-----: | :-----: |
| **Quelle**            |   H1    |  H1   |   H2    |   H2    |  H2   |   H2    |   H2    |
| **Farbe**             | schwarz | blau  | schwarz | schwarz | blau  | schwarz | schwarz |
| **Querschnitt (mm²)** |   10    |  10   |   2.5   |   1.5   |  2.5  |   2.5   |   1.5   |
| **Kabeltyp**          |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  | NYM-J |  NYM-J  |  NYM-J  |
| RCD1.i1               |   L1    |       |         |         |       |         |         |
| RCD1.i2               |         |   N   |         |         |       |         |         |
| RCD1.o1               |         |       |   L1    |   L1    |       |         |         |
| RCD1.o2               |         |       |         |         |   N   |         |         |
| LS1.i1                |         |       |   L1    |         |       |         |         |
| LS1.o1                |         |       |         |         |       |   L1    |         |
| LS2.i1                |         |       |         |   L1    |       |         |         |
| LS2.o1                |         |       |         |         |       |         |   L1    |
| H2                    |         |       |         |         |       |         |         |

---

## Tabelle 3: H3

| Pin                     |  N8   |  N9   |   N11   |   N12   |   N13   |  N14  |  N15  |   N16   |  N17  |  N18  |  N20  |
| ----------------------- | :---: | :---: | :-----: | :-----: | :-----: | :---: | :---: | :-----: | :---: | :---: | :---: |
| **Quelle**              |  H2   |  H1   |   H2    |   H2    |   H3    |  H3   |  H3   |   H3    |  H3   |  H3   |  H3   |
| **Farbe**               | blau  | gn-ge | schwarz | schwarz | schwarz | blau  | gn-ge | schwarz | blau  | gn-ge | blank |
| **Querschnitt (mm²)**   |  2.5  |  2.5  |   2.5   |   1.5   |   2.5   |  2.5  |  2.5  |   1.5   |  1.5  |  1.5  |  16   |
| **Kabeltyp**            | NYM-J | NYM-J |  NYM-J  |  NYM-J  |  NYM-J  | NYM-J | NYM-J |  NYM-J  | NYM-J | NYM-J |   –   |
| Reihenklemme_L_SK1.i1   |       |       |   L1    |         |         |       |       |         |       |       |       |
| Reihenklemme_L_SK1.o1   |       |       |         |         |   L1    |       |       |         |       |       |       |
| Reihenklemme_N_SK1.i1   |   N   |       |         |         |         |       |       |         |       |       |       |
| Reihenklemme_N_SK1.o1   |       |       |         |         |         |   N   |       |         |       |       |       |
| Reihenklemme_PE_SK1.io1 |       |  PE   |         |         |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK1.io2 |       |       |         |         |         |       |  PE   |         |       |       |       |
| Reihenklemme_PE_SK1.io3 |       |       |         |         |         |       |       |         |       |       |  PE   |
| Endstelle_SK1.i1        |       |       |         |         |   L1    |       |       |         |       |       |       |
| Endstelle_SK1.i2        |       |       |         |         |         |   N   |       |         |       |       |       |
| Endstelle_SK1.i3        |       |       |         |         |         |       |  PE   |         |       |       |       |
| Reihenklemme_L_SK2.i1   |       |       |         |   L1    |         |       |       |         |       |       |       |
| Reihenklemme_L_SK2.o1   |       |       |         |         |         |       |       |   L1    |       |       |       |
| Reihenklemme_N_SK2.i1   |   N   |       |         |         |         |       |       |         |       |       |       |
| Reihenklemme_N_SK2.o1   |       |       |         |         |         |       |       |         |   N   |       |       |
| Reihenklemme_PE_SK2.io1 |       |       |         |         |         |       |       |         |       |       |       |
| Reihenklemme_PE_SK2.io2 |       |       |         |         |         |       |       |         |       |  PE   |       |
| Reihenklemme_PE_SK2.io3 |       |       |         |         |         |       |       |         |       |       |  PE   |
| Endstelle_SK2.i1        |       |       |         |         |         |       |       |   L1    |       |       |       |
| Endstelle_SK2.i2        |       |       |         |         |         |       |       |         |   N   |       |       |
| Endstelle_SK2.i3        |       |       |         |         |         |       |       |         |       |  PE   |       |
| H3                      |       |       |         |         |         |       |       |         |       |       |  PE   |

---

## Annahmen / Anmerkungen (bitte prüfen)

1. **PE umgeht Leistungsschalter und RCD** – auch wenn die aktuelle `anlage.json` bei
   `hauptsicherung.eingang/ausgang` und `rcd.eingang/ausgang` jeweils eine PE-Ader mit
   auflistet, hab ich das hier nicht übernommen. Realistisch schalten Hauptschalter/RCD
   in diesem Fall nur L1+N (`polig: 2`); PE läuft direkt von der Einspeisung zur
   PE-Klemme. Die PE-Adern in `hauptsicherung`/`rcd` in der JSON halte ich für einen
   Datei-Artefakt (gleiche Kabel-Vorlage überall verwendet), nicht für Absicht.
2. **RCD1.o1 speist LS1 und LS2 mit unterschiedlichem Querschnitt** (N6: 2.5mm² zu LS1,
   N7: 1.5mm² zu LS2) – beide Netze starten am selben physischen Ausgangspin (zwei
   Adern an einer Klemme), das Format erlaubt das.
3. **RCD1.o2 (N) speist SK1 und SK2 gemeinsam mit demselben Querschnitt** (N8,
   2.5mm²) – die JSON hat für diesen Abschnitt keinen separaten Wert pro Stromkreis,
   im Gegensatz zu L1 (dort hat jeder LS einen eigenen `eingang`-Wert).
4. **Nur eine Ader führt von `PE-Klemme.io2` nach H3** (N9, 2.5mm², echtes Kabel zu
   `Reihenklemme_PE_SK1.io1`). `Reihenklemme_PE_SK2` bekommt ihr PE **nicht** über
   eine eigene Zubringerader von der PE-Klemme, sondern ausschließlich über den
   lokalen Hutschienen-Bond von H3 (N20, siehe Annahme 6) – die eine Zubringerader zu
   SK1 versorgt über den Bond die ganze Schiene. Ein zweites Direktkabel (früher N10)
   wäre redundant, da SK1 und SK2 auf derselben Hutschiene sitzen und intern über den
   Bond verbunden sind.
5. Reihenklemmen sind pro Stromkreis in drei separate Bauteile aufgeteilt
   (`Reihenklemme_L_SK1`, `_N_SK1`, `_PE_SK1`), wie zuletzt besprochen.
6. **Hutschienen-Bond ist pro Hutschiene ein eigenes, lokales Netz – keine Kabel-
   verbindung zwischen den Schienen selbst.** Eine Hutschiene ist kein Kabel, also
   verbindet sie sich nicht "über ein Netz" mit einer anderen Hutschiene. `N19` (H1)
   verbindet nur `PE-Klemme.io3` mit der `H1`-Selbstzeile. `N20` (H3) verbindet nur
   die `io3`-Pins beider `Reihenklemme_PE_*` mit der `H3`-Selbstzeile. Die einzige
   tatsächliche Verbindung zwischen H1 und H3 ist das echte Kabel N9 (siehe
   Annahme 4). `H2` hat keine PE-Bauteile, daher keinen eigenen Bond.
7. **Die Hutschiene selbst ist auch ein Bauteil:** jede Tabelle hat eine eigene Zeile
   `H1`/`H2`/`H3` (Pin = Hutschienenname selbst, kein `i`/`o`/`io`-Suffix nötig, da nur
   ein Anschlusspunkt). In Tabelle 1 ist diese Zeile an `N19` angeschlossen, in
   Tabelle 3 an `N20` (jeweils `PE`) – das ist der Endpunkt, an den alle `io3`-Pins
   der jeweiligen Hutschiene tatsächlich anschließen. `H2` hat aktuell keine
   PE-Bauteile, daher keine Verbindung.
