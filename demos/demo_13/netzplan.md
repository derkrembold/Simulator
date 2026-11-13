# Netzplan – demo_13

Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.

Physische Zeilen (Hutschienen), je eine eigene Tabelle:
- **H1** = Hauptschalter (2-polig) + PE-Klemme (unterste Zeile)
- **H2** = Gruppe G1 (RCD1, 2-polig, + LS1/LS2) und Gruppe G2 (ohne RCD, LS3) und Gruppe G3 (RCD2, 2-polig, + LS4/LS5)
- **H3** = Reihenklemmen (oberste Zeile)

Jede Tabelle zeigt nur ihre eigenen (Home-)Pins. Ein Netz, das über eine Tabellengrenze hinweg
weiterläuft, taucht als Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt, aus welcher
Hutschiene dieses Netz stammt.

**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei PE-Bauteilen
`io1`/`io2`/`io3`: `io3` ist immer die Hutschiene, `io1`/`io2` tragen je genau eine Ader.

---

## Tabelle 1: H1

| Pin | N1 | N2 | N3 | N4 | N5 | N6 | N7 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quelle** | H1 | H1 | H1 | H1 | H1 | H1 | H1 |
| **Farbe** | schwarz | blau | gn-ge | schwarz | blau | gn-ge | blank |
| **Querschnitt (mm²)** | 16 | 16 | 16 | 6 | 6 | 2.5 | 16 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | – |
| Einspeisung.L1 | L1 |  |  |  |  |  |  |
| Einspeisung.N |  | N |  |  |  |  |  |
| Einspeisung.PE |  |  | PE |  |  |  |  |
| PE-Klemme.io1 |  |  | PE |  |  |  |  |
| Hauptschalter.i1 | L1 |  |  |  |  |  |  |
| Hauptschalter.i2 |  | N |  |  |  |  |  |
| Hauptschalter.o1 |  |  |  | L1 |  |  |  |
| Hauptschalter.o2 |  |  |  |  | N |  |  |
| PE-Klemme.io2 |  |  |  |  |  | PE |  |
| PE-Klemme.io3 |  |  |  |  |  |  | PE |
| H1 |  |  |  |  |  |  | PE |

---

## Tabelle 2: H2

| Pin | N4 | N5 | N8 | N9 | N10 | N11 | N12 | N13 | N14 | N15 | N16 | N17 | N18 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quelle** | H1 | H1 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H2 |
| **Farbe** | schwarz | blau | blau | schwarz | schwarz | schwarz | schwarz | schwarz | blau | schwarz | schwarz | schwarz | schwarz |
| **Querschnitt (mm²)** | 6 | 6 | 2.5 | 2.5 | 1.5 | 2.5 | 1.5 | 2.5 | 2.5 | 1.5 | 2.5 | 1.5 | 2.5 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J |
| RCD1.i1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD1.i2 |  | N |  |  |  |  |  |  |  |  |  |  |  |
| RCD1.o2 |  |  | N |  |  |  |  |  |  |  |  |  |  |
| RCD1.o1 |  |  |  | L1 | L1 |  |  |  |  |  |  |  |  |
| LS1.i1 |  |  |  | L1 |  |  |  |  |  |  |  |  |  |
| LS2.i1 |  |  |  |  | L1 |  |  |  |  |  |  |  |  |
| LS1.o1 |  |  |  |  |  | L1 |  |  |  |  |  |  |  |
| LS2.o1 |  |  |  |  |  |  | L1 |  |  |  |  |  |  |
| LS3.i1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |
| LS3.o1 |  |  |  |  |  |  |  | L1 |  |  |  |  |  |
| RCD2.i1 | L1 |  |  |  |  |  |  |  |  |  |  |  |  |
| RCD2.i2 |  | N |  |  |  |  |  |  |  |  |  |  |  |
| RCD2.o2 |  |  |  |  |  |  |  |  | N |  |  |  |  |
| RCD2.o1 |  |  |  |  |  |  |  |  |  | L1 | L1 |  |  |
| LS4.i1 |  |  |  |  |  |  |  |  |  | L1 |  |  |  |
| LS5.i1 |  |  |  |  |  |  |  |  |  |  | L1 |  |  |
| LS4.o1 |  |  |  |  |  |  |  |  |  |  |  | L1 |  |
| LS5.o1 |  |  |  |  |  |  |  |  |  |  |  |  | L1 |
| H2 |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## Tabelle 3: H3

| Pin | N5 | N6 | N8 | N11 | N12 | N13 | N14 | N17 | N18 | N19 | N20 | N21 | N22 | N23 | N24 | N25 | N26 | N27 | N28 | N29 | N30 | N31 | N32 | N33 | N34 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quelle** | H1 | H1 | H2 | H2 | H2 | H2 | H2 | H2 | H2 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 | H3 |
| **Farbe** | blau | gn-ge | blau | schwarz | schwarz | schwarz | blau | schwarz | schwarz | blank | schwarz | blau | gn-ge | schwarz | blau | gn-ge | schwarz | blau | gn-ge | schwarz | blau | gn-ge | schwarz | blau | gn-ge |
| **Querschnitt (mm²)** | 6 | 2.5 | 2.5 | 2.5 | 1.5 | 2.5 | 2.5 | 1.5 | 2.5 | 16 | 2.5 | 2.5 | 2.5 | 1.5 | 1.5 | 1.5 | 2.5 | 2.5 | 2.5 | 1.5 | 1.5 | 1.5 | 2.5 | 2.5 | 2.5 |
| **Kabeltyp** | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | – | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J | NYM-J |
| Reihenklemme_L_SK1.i1 |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK1.o1 |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK1.i1 |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK1.i1 |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK1.o1 |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK1.i2 |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK1.io1 |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK1.io2 |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK1.i3 |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK1.io3 |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK2.i1 |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK2.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK2.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK2.i1 |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK2.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |
| Endstelle_SK2.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK2.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |
| Endstelle_SK2.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK2.io3 |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK3.i1 |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK3.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |
| Endstelle_SK3.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK3.i1 | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK3.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |
| Endstelle_SK3.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |  |  |  |
| Reihenklemme_PE_SK3.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |
| Endstelle_SK3.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |
| Reihenklemme_PE_SK3.io3 |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK4.i1 |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK4.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |
| Endstelle_SK4.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |
| Reihenklemme_N_SK4.i1 |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK4.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |
| Endstelle_SK4.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |  |  |  |
| Reihenklemme_PE_SK4.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |
| Endstelle_SK4.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |  |  |  |
| Reihenklemme_PE_SK4.io3 |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK5.i1 |  |  |  |  |  |  |  |  | L1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_L_SK5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |
| Endstelle_SK5.i1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | L1 |  |  |
| Reihenklemme_N_SK5.i1 |  |  |  |  |  |  | N |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reihenklemme_N_SK5.o1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |
| Endstelle_SK5.i2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | N |  |
| Reihenklemme_PE_SK5.io2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |
| Endstelle_SK5.i3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | PE |
| Reihenklemme_PE_SK5.io3 |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| H3 |  |  |  |  |  |  |  |  |  | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## Fehlertabelle

Fehler-Widerstände aus der Anforderung - Netze ohne Eintrag gelten als 0Ω.

| Netz | Widerstand (Ω) | Ort |
| ---- | --------------- | --- |
| N1 | 0,1 | Einspeisung L1 |
| N9 | 0,05 | RCD1 Ausgang L1 (zu LS1) |
| N10 | 0,05 | RCD1 Ausgang L1 (zu LS2) |
| N20 | 0,1 | SK1 Zuleitung L1 |
| N21 | 0,05 | SK1 Zuleitung N |
| N26 | 0,3 | SK3 Zuleitung L1 |
| N29 | 0,05 | SK4 Zuleitung L1 |
| N33 | 0,1 | SK5 Zuleitung N |

