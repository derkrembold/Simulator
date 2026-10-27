# Netzplan – demo_05

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

Physische Zeilen (Hutschienen), je eine eigene Tabelle:
- **H1** = Hauptschalter (3-polig) + L1-/L2-/L3-/N-/PE-Klemme (unterste Zeile)
- **H2** = Gruppe G1 (RCD1, 2-polig, + LS1/LS2) und Gruppe G2 (RCD2, 2-polig, + LS3/LS4) und Gruppe G3 (RCD3, 4-polig, + LS5)
- **H3** = Reihenklemmen (oberste Zeile)

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins. Ein Netz, das über eine Tabellengrenze hinweg
weiterläuft, taucht als Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt, aus welcher
Hutschiene dieses Netz stammt.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei PE-Bauteilen
`io1`/`io2`/`io3`: `io3` ist immer die Hutschiene, `io1`/`io2` tragen je genau eine Ader.

---

## Tabelle 1: H1

| Pin | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 | N13 | N14 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quelle** | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 | H1 |
| **Farbe** | schwarz | braun | grau | blau | gn-ge | schwarz | braun | grau | schwarz | braun | grau | blau | gn-ge | blank |
| **Querschnitt (mm²)** | 16 | 16 | 16 | 16 | 16 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 2.5 | 16 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | – |
| Einspeisung.L1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| L1-Klemme.i1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Einspeisung.L2 |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |
| L2-Klemme.i1 |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |
| Einspeisung.L3 |  |  | L3 |  |  |  |  |  |  |  |  |  |  |  |
| L3-Klemme.i1 |  |  | L3 |  |  |  |  |  |  |  |  |  |  |  |
| Einspeisung.N |  |  |  | N |  |  |  |  |  |  |  |  |  |  |
| N-Klemme.i1 |  |  |  | N |  |  |  |  |  |  |  |  |  |  |
| Einspeisung.PE |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |
| PE-Klemme.io1 |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |
| L1-Klemme.o1 |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |
| Hauptschalter.i1 |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |
| L2-Klemme.o1 |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |
| Hauptschalter.i2 |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |
| L3-Klemme.o1 |  |  |  |  |  |  |  | L3 |  |  |  |  |  |  |
| Hauptschalter.i3 |  |  |  |  |  |  |  | L3 |  |  |  |  |  |  |
| Hauptschalter.o1 |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |
| Hauptschalter.o2 |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |
| Hauptschalter.o3 |  |  |  |  |  |  |  |  |  |  | L3 |  |  |  |
| N-Klemme.o1 |  |  |  |  |  |  |  |  |  |  |  | N |  |  |
| PE-Klemme.io2 |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |
| PE-Klemme.io3 |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |
| H1 |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |

---

## Tabelle 2: H2

| Pin | N9 | N10 | N11 | N12 | N15 | N16 | N17 | N18 | N19 | N20 | N21 | N22 | N23 | N24 | N25 | N26 | N27 | N28 | N29 | N30 | N31 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quelle** | H1 | H1 | H1 | H1 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 |
| **Farbe** | schwarz | braun | grau | blau | blau | schwarz | schwarz | schwarz | schwarz | blau | braun | braun | braun | braun | blau | schwarz | braun | grau | schwarz | braun | grau |
| **Querschnitt (mm²)** | 10 | 10 | 10 | 10 | 2.5 | 2.5 | 1.5 | 2.5 | 1.5 | 2.5 | 2.5 | 1.5 | 2.5 | 1.5 | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J |
| RCD1.i1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD1.i2 |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD1.o2 |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD1.o1 |  |  |  |  |  | L1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| LS1.i1 |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| LS2.i1 |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| LS1.o1 |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| LS2.o1 |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD2.i1 |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD2.i2 |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD2.o2 |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |
| RCD2.o1 |  |  |  |  |  |  |  |  |  |  | L2 | L2 |  |  |  |  |  |  |  |  |  |
| LS3.i1 |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |  |
| LS4.i1 |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |
| LS3.o1 |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |
| LS4.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |
| RCD3.i1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD3.i2 |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD3.i3 |  |  | L3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD3.i4 |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD3.o4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |
| RCD3.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |
| LS5.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |
| RCD3.o2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |
| LS5.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |
| RCD3.o3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L3 |  |  |  |
| LS5.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L3 |  |  |  |
| LS5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |
| LS5.o2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |
| LS5.o3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L3 |
| H2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## Tabelle 3: H3

| Pin | N13 | N15 | N18 | N19 | N20 | N23 | N24 | N25 | N29 | N30 | N31 | N32 | N33 | N34 | N35 | N36 | N37 | N38 | N39 | N40 | N41 | N42 | N43 | N44 | N45 | N46 | N47 | N48 | N49 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quelle** | H1 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 |
| **Farbe** | gn-ge | blau | schwarz | schwarz | blau | braun | braun | blau | schwarz | braun | grau | blank | schwarz | blau | gn-ge | schwarz | blau | gn-ge | braun | blau | gn-ge | braun | blau | gn-ge | schwarz | braun | grau | blau | gn-ge |
| **Querschnitt (mm²)** | 2.5 | 2.5 | 2.5 | 1.5 | 2.5 | 2.5 | 1.5 | 2.5 | 2.5 | 2.5 | 2.5 | 16 | 2.5 | 2.5 | 2.5 | 1.5 | 1.5 | 1.5 | 2.5 | 2.5 | 2.5 | 1.5 | 1.5 | 1.5 | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | – | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J |
| Reihenklemme_L_SK1.i1 |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK1.o1 |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK1.i1 |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK1.i1 |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK1.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK1.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK1.io1 | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK1.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK1.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK1.io3 |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK2.i1 |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK2.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK2.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK2.i1 |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK2.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK2.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK2.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK2.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK2.io3 |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK3.i1 |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK3.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK3.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK3.i1 |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK3.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |
| Endstelle_SK3.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK3.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |
| Endstelle_SK3.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK3.io3 |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK4.i1 |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK4.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |
| Endstelle_SK4.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |
| Reihenklemme_N_SK4.i1 |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK4.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |
| Endstelle_SK4.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |
| Reihenklemme_PE_SK4.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |
| Endstelle_SK4.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |
| Reihenklemme_PE_SK4.io3 |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L1_SK5.i1 |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L1_SK5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |
| Endstelle_SK5.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |
| Reihenklemme_L2_SK5.i1 |  |  |  |  |  |  |  |  |  | L2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L2_SK5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |
| Endstelle_SK5.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L2 |  |  |  |
| Reihenklemme_L3_SK5.i1 |  |  |  |  |  |  |  |  |  |  | L3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L3_SK5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L3 |  |  |
| Endstelle_SK5.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L3 |  |  |
| Reihenklemme_N_SK5.i1 |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |
| Endstelle_SK5.i4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |
| Reihenklemme_PE_SK5.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |
| Endstelle_SK5.i5 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |
| Reihenklemme_PE_SK5.io3 |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| H3 |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

