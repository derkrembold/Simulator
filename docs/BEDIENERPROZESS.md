# Bedienerprozess – TREI Prüfungs-Simulator

Beschreibt den Schritt-für-Schritt-Ablauf, den ein Prüfer durchläuft, um
eine Anlage zu prüfen und das Prüfprotokoll korrekt auszufüllen. Der
Prüfling kann dabei ein Mensch sein (der die App selbst bedient) ODER eine
KI, die genau diesen Prozess anwendet (über die Entwickler-Skills, siehe
`docs/ARCHITEKTUR.md` "Entwickler-Skills") - der Prozess selbst ist für
beide identisch, nur die Ausführung unterscheidet sich.

Orientiert sich an den TATSÄCHLICHEN Feldern des in der App bereits
umgesetzten Prüfprotokolls (`view/protokoll.js`, 1:1 nach
`docs/referenz/Prüfprotokoll.md` gebaut, das wiederum eine strukturierte
Abschrift des Original-Formulars `docs/referenz/Prüfprotokoll.pdf` ist) -
nicht an einer idealisierten Fassung, damit dieses Dokument nicht von der
echten Implementierung abdriftet.

**Nomenklatur**:
1. Prüfer: Person oder KI die die Prüfung an der Anlage durchführt
2. Prüfling: Es soll eine Prüfungssituation für den Teil B der TREI (Technische Regeln der Elektroinstallation) Prüfung simuliert werden. Das ist der Praktische Teil der TREI Prüfung. Ziel ist herauszufinden, ob der Prüfling die Befähigung besitzt, die Prüfung an einer Anlage durchzuführen.

**Punktabzug:** wird ein als PFLICHT markiertes Feld nicht ausgefüllt bzw.
eine vorgeschriebene Handlung ausgelassen, führt das bei der Bewertung zu
Punktabzug. Jedes Feld unten ist deshalb mit Pflicht (Ja/Nein) und, wo
sinnvoll, einem Defaultwert versehen.

## Kopfdaten

| Feld              | Pflicht | Defaultwert                                       | Hinweis                                          |
| ----------------- | ------- | ------------------------------------------------- | ------------------------------------------------ |
| Nr.               | Ja      | 1                                                 | Muss eine Zahl sein                              |
| Blatt ... von ... | Nein    | –                                                 | Unwichtig für die Bewertung                      |
| Kunden-Nr.        | Ja      | 1234                                              |                                                  |
| Auftraggeber      | Ja      | ETZ, Krefelder Straße 12, 70376 Stuttgart         |                                                  |
| Auftrag Nr.       | Ja      | 1234                                              |                                                  |
| Anlage            | Ja      | UV XYZ                                            | Der Prüfling sollte diese herausfinden           |
| Standort          | Ja      | Raum 123                                          | Der Prüfling sollte diese herausfinden           |
| Auftragnehmer     | Ja      | Max Mustermann, An der Felden 2, 71468 Tailfingen | Der Prüfling sollte seine Adresse dort ausfüllen |

## Prüfung

| Feld                                                                   | Pflicht | Defaultwert                       | Hinweis                                         |
| ---------------------------------------------------------------------- | ------- | --------------------------------- | ----------------------------------------------- |
| Prüfung nach                                                           | Ja      | DIN VDE 0105-100                  | Das Ankreuzen einer der Felder ist hier wichtig |
| Neuanlage, Erweiterung, Änderung, Instandsetzung, Wiederholungsprüfung | Ja      | Wiederholungsprüfung              | Das Ankreuzen ist hier wichtig. Der Simulator bildet nur die Wiederholungsprüfung ab (Entscheidung zu sim-7c6). |
| Beginn Prüfung                                                         | Ja      | Aktuelles Datum                   | Wichtig!                                        |
| Ende Prüfung                                                           | Ja      | Aktuelle Datum                    | Wichtig!                                        |
| Beauftragter des Auftraggebers                                         | Ja      | Kathi Katz                        |                                                 |
| Prüfer                                                                 | Ja      | Max Mustermann                    | Wichtig! Dieselbe Person wie Auftragnehmer (in dieser Simulation identisch). |



## Netz

| Feld              | Pflicht | Defaultwert                                               | Hinweis                                                                                                                                         |
| ----------------- | ------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Netz / V          | Ja      | 400 / 230 V                                               | Fester Standardwert (Außenleiter-/Sternspannung des allgemeinen TN-Netzes) - NICHT aus `anlage.json` übernehmen, auch wenn dort ein anderer `spannung_stromkreise`-Wert steht (der kann pro Testcase etwas anderes beschreiben, z.B. die Außenleiterspannung EINER Drehstromsteckdose, nicht die allgemeine Netzspannung). |
| Netzform          | Ja      | aus der Anlage übernehmen (`anlage.json`-Feld `netzform`) | Nicht raten - steht schon in den Anlagedaten, die der Prüfling vor sich hat. In der Regel ist das ein TN-C-S Netz. Aber nicht notwendigerweise. |
| Netzbetreiber     | Ja      | Stuttgart Netze GmbH                                      | Hier muss was eingetragen sein.                                                                                                                 |
| Zähler-Nr.        | Nein    | –                                                         | Nur relevant, wenn ein Zähler vorhanden ist.                                                                                                    |
| Zählerstand (kWh) | Nein    | –                                                         | Nur relevant, wenn ein Zähler vorhanden ist.                                                                                                    |

## Besichtigen

14 Prüfpunkte, je i.O./n.i.O. + Bemerkung. Reine Sichtprüfung - der
Simulator kann das aktuell NICHT automatisch prüfen (keine "eingebauten
Fehler" in der Anlage modelliert, siehe KONZEPT.md "Nächste Schritte").

| Vorgabe                                      | Pflicht | Defaultwert | Prüfkriterium                                                                                                                                                                                                                               |
| -------------------------------------------- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auswahl der Betriebsmittel                   | Ja      | i.O. oder n.i.O. (Hauptsache angekreuzt, siehe docs/referenz/Pflichtfelder.md) | Solange die Anlage keinen bekannten Sichtmangel hat (aktuell immer der Fall) - sobald es "Fehlerkarten"/absichtliche Mängel gibt, hier entsprechend n.i.O. + Bemerkung.                                                                     |
| Trenn- und Schaltgeräte                      | Ja      | i.O.        | Es sollte ein Trenngerät, also Hauptschalter, da sein.                                                                                                                                                                                      |
| Brandabschottungen                           | Nein    |             | Nicht besonders relevant in Simulation                                                                                                                                                                                                      |
| Gebäudesystemtechnik                         | Nein    |             | Nicht besonders relevant in Simulation                                                                                                                                                                                                      |
| Kabel, Leitungen, Stromschienen              | Ja      |             | PE Leiter muss erforderlichen Querschnitt haben.<br>PE darf nicht mit L1, L2, L3 verbunden sein.<br>In Schutzleitern darf kein LS sein,<br>Querschnitte der Kabel und LS Bemessung müssen zueinander passen                                 |
| Kennzeichnung Stromkreis / Betriebsmittel    | Ja      |             | Die Schaltkreise müssen beschriftet sein! Z.B. an den Steckdosen, oder an den Reihenklemmen.                                                                                                                                                |
| Kennzeichnung N- und PE-Leiter               | Ja      |             | PE Muss gekennzeichnet sein (gruen gelb).<br>PE und Neutralleiter dürfen nicht verwechselt werden.                                                                                                                                          |
| Leiterverbindungen                           | Ja      | i.O.        | Nicht besonders relevant in Simulation                                                                                                                                                                                                      |
| Schutz- und Überwachungseinrichtungen        | Ja      |             | Sind Überstrom und Überspannungeinrichtungen vorhanden? In Unterverteiler muss eine Überspannungsschutz nicht unbedingt rein. Darf aber! In Hauptverteiler muss eine rein.                                                                  |
| Basisschutz (Schutz gegen direktes Berühren) | Ja      | i.O.        | Nicht besonders relevant in Simulation                                                                                                                                                                                                      |
| Zugänglichkeit                               | Ja      | i.O.        | Nicht besonders relevant in Simulation                                                                                                                                                                                                      |
| Schutzpotentialausgleich                     | Ja      |             | Hauptpotentialausgleichsleiter, Hauptschutzleiter, Haupterdungsleiter und andere Erdungsleiter mit der Potentialausgleichsschiene oder Haupterdungsschiene (-klemme) verbunden                                                              |
| Zusätzl. örtl. Potentialausgleich            | Ja      |             |                                                                                                                                                                                                                                             |
| Dokumentation / siehe Ergänzungsblätter      | Ja      | n.i.O.      | Schaltpläne vorhanden. Beschriftungen und dauerhafte Kennzeichnungen der Stromkreise zutreffend.                                                                                                                                            |

## Erproben

7 Prüfpunkte, je i.O./n.i.O. + Bemerkung. Drei davon lassen sich über das
Messgerät tatsächlich prüfen, der Rest bleibt wie bei "Besichtigen" reine
Einschätzung.

| Prüfpunkt                                                   | Pflicht                                | Defaultwert/Quelle                                        | Prüfkriterium                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FI-Schutzschalter (RCD)                                     | Ja                                     | i.O.                                                      | Am RCD ist in der Regel eine Prüftaste. Die kann betätigt werden, und der RCD löst aus. Kein Meßgerät wird hier genutzt!<br>Im Simulator hat jeder RCD (2- und 4-polig) eine Prüftaste T, rechts neben der Schalter-Box, mittig zwischen den rechten Schrauben (sim-q3h). Ein Klick löst den RCD aus, wenn an seinem Eingang Spannung anliegt; ohne Spannung passiert nichts. Danach den RCD wieder einschalten. Der Fahrplan drückt die Prüftaste je RCD und kreuzt i.O. an. Ein RCD mit defekter Prüftaste (Anforderung: Spalte `Prüftaste defekt`, sim-iw3) löst nicht aus: dann n.i.O. ankreuzen und unter Mängel nennen (z.B. „F3-2 defekt“); der Check verlangt „Mängel festgestellt“ und Plakette „Nein“. Die Messung mit dem Messgerät bleibt dabei normal. Der Check prüft nur das Kreuz, nicht ob die Taste gedrückt wurde. |
| Rechtsdrehfeld (Drehstromsteckdosen)                        | Ja, falls Drehstromanschluss vorhanden | Ergebnis der Phasenfolge (Modus `V~`, Feld `phasenfolge`) | i.O. bei "1.2.3.", n.i.O. bei "3.2.1."<br>Getestet werden hier Drehstromsteckdosen, und zwar jede einzeln an ihren Kontakten L1/L2/L3. Zeigt eine Dose "3.2.1." (Außenleiter vertauscht angeklemmt), ist das Ergebnis n.i.O.; der Check erwartet dann n.i.O. (sim-wme).                                                                                                                     |
| Überprüfung Spannungsfall                                   | Ja                                     | Ergebnis der ΔU-Ansicht (Modus `ZI`, Ansicht `delta_u`)   | Spannungsfall muss unter 3,5% sein., bzw. unter 14V.                                                                                                                                                    |
| Funktionsprüfung der Anlage                                 | Ja                                     | i.O.                                                      | Nicht besonders relevant in Simulation                                                                                                                                                                  |
| Funktion der Schutz-/Sicherheits-/Überwachungseinrichtungen | Ja                                     | i.O.                                                      | Nicht automatisiert prüfbar                                                                                                                                                                             |
| Drehrichtung der Motoren                                    | Nein                                   |                                                           | Nicht besonders relevant in Simulation                                                                                                                                                                  |
| Gebäudesystemtechnik                                        | Nein                                   |                                                           | Nicht besonders relevant in Simulation                                                                                                                                                                  |


## Erdungswiderstand

In der Prüfung ist dieser Werte eigentlich sehr relevant. Aber in der Simulation kann man diese schlecht abbilden. Man kann diese mit der C2 Methode messen. Also mit dem Installationstester. Vielleicht ein Thema für Zukunft.

| Feld                 | Pflicht | Defaultwert | Hinweis                                |
| -------------------- | ------- | ----------- | -------------------------------------- |
| Erdungswiderstand RE | Ja      |             | Nicht besonders relevant in Simulation. **Widerspruch (Pflicht Ja, aber kein Defaultwert/Hinweis "nicht relevant") bewusst ungelöst gelassen**, solange die Simulation den Erdungswiderstand gar nicht messen kann - erst klärbar, wenn diese Messung (C2-Methode, siehe oben) implementiert ist. |



## Durchgängigkeit Potentialausgleich nachgewiesen

In der Prüfung sind diese Werte eigentlich sehr relevant. Aber in der Simulation kann man diese schlecht abbilden.
16 Punkte, je EINE Spalte (Wert/i.O.). Aktuell nicht automatisiert prüfbar
(kein PE-Teilgraph, kein Erdungswiderstand-Modell, siehe KONZEPT.md
"Nächste Schritte").

| Vorgabe                                                | Pflicht | Defaultwert | Hinweis                                |
| ------------------------------------------------------ | ------- | ----------- | -------------------------------------- |
| Fundamenterder                                         | Nein    |             | Nicht besonders relevant in Simulation |
| Haupterdungsschiene                                    | Nein    |             | Nicht besonders relevant in Simulation |
| Hauptwasserleitung                                     | Nein    |             | Nicht besonders relevant in Simulation |
| Hauptschutzleiter                                      | Nein    |             | Nicht besonders relevant in Simulation |
| Gasinnenleitung                                        | Nein    |             | Nicht besonders relevant in Simulation |
| Heizungsanlage                                         | Nein    |             | Nicht besonders relevant in Simulation |
| Klimaanlage                                            | Nein    |             | Nicht besonders relevant in Simulation |
| Aufzugsanlage                                          | Nein    |             | Nicht besonders relevant in Simulation |
| EDV-Anlage                                             | Nein    |             | Nicht besonders relevant in Simulation |
| Telefonanlage                                          | Nein    |             | Nicht besonders relevant in Simulation |
| Blitzschutzanlage                                      | Nein    |             | Nicht besonders relevant in Simulation |
| Antennenanlage / BK                                    | Nein    |             | Nicht besonders relevant in Simulation |
| Gebäudekonstruktion                                    | Nein    |             | Nicht besonders relevant in Simulation |
| Wasserzwischenzähler / Potentialausgleich nachgewiesen | Nein    |             | Nicht besonders relevant in Simulation |

## Verwendete Messgeräte

| Feld          | Pflicht | Defaultwert         | Hinweis                                           |
| ------------- | ------- | ------------------- | ------------------------------------------------- |
| # 1, Fabrikat | Ja      | JU 240              | Fake Name                                         |
| # 1, Typ      | Ja      | Installationstester | Wie auf dem Messgerät im Schaltkasten beschriftet |

## Messen

### Stromkreisverteiler

Es muss hier ein Eintrag erfolgen. Auf dem Unterverteiler, oder in der Doku sollte eine Nr herausgelesen werden. Die sollte hier rein.

Der eigentliche Kern der Prüfung - eine Zeile PRO Stromkreis. Anders als
oben kein fester Defaultwert, sondern eine Quelle (Anlagedaten oder
Messgerät-Skill), da die Werte je Stromkreis unterschiedlich sind.

Die erste Reihe betrifft immer die Hauptleitung. Bei Hauptleitung sind Überstrom und RCD nicht relevant. Eingetragen werden Nr., Aderanzahl und Querschnitt der Zuleitung an der Einspeisung sowie Zs und Ik L-PE, gemessen dort, wo die Stromzufuhr von außen kommt (Einspeiseklemme bzw. Eingang des Hauptschalters), je Außenleiter, eingetragen der schlechteste Wert. Fehlt Zs, ist das Feld im Check rot (sim-aon).

| Spalte                             | Pflicht                 | Quelle                                     | Hinweis                                                                                                                                                |
| ---------------------------------- | ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nr.                                | Ja                      | Kennzeichen des LS, F2-1, F2-2, …          | Betriebsmittelkennzeichen des LS (sim-0ns, siehe unten). Hauptleitung: beliebig, nur ausgefüllt. |
| Stromkreis / Zielbezeichnung       | Ja                      | Position des LS von links + zugeordnete Endstellen, z.B. "LS1: 2 Steckdosen" | Wenn die Steckdosen, Reihenklemmen eine Kennzeichnung haben, dann gehört diese rein. Im Simulator gibt es keine Kennzeichnung, deshalb die LS-Position und die Endstellen aus der Zuordnung (Entscheidung zu sim-nt2). |
| Leitung/Kabel<br>Typ               | Ja                      | `anlage.json` Ader-Kabeltyp (z.B. NYM-J)   | Typische ist hier NYM, NYY. Aber auch Anzahl der Adern. Beispiel: NYM                                                                                  |
| Leitung/Kabel<br>Anzahl            | Ja                      |                                            | Hier gehört die Anzahl der Adern, bei Steckdosen 3, bei Drehstromsteckdosen 5 rein. Anzahl bezieht sich auf Anzahl der Adern.                          |
| Leitung/Kabel<br>Querschnitt (mm²) | Ja                      | `anlage.json` Ader-Querschnitt             |                                                                                                                                                        |
| Rpe (Ω)                            | Ja                      | RLOW-Messung PE-Durchgang                  | In der Regel wird die Messung von der Steckdose, Anschlussdose oder Drehstromsteckdose zur PE Klemme geführt. Das muss man machen! Vor RLOW (wie vor RISO) die Anlage spannungsfrei machen (Hauptschalter aus, oder betroffene Schrauben auf). Zusätzlich jede Hutschiene mit PE-Klemme bzw. PE-Reihenklemmen gegen die PE-Klemme messen (Messpunkt rechts an der Hutschiene): kein Durchgang heißt, die Hutschiene hat kein PE-Potential (Mangel, sim-kfb). |
| Riso (MΩ)<br>Verbraucher ohne      | Ja                      | RISO-Messung, Verbraucher abgeklemmt       | Beim Abklemmen, immer den Schraubendreher und Schraube verwenden. Nicht den RCD, oder AFDD Hebel. Ausnahme: Der Hauptschalter muss ausgeschaltet sein! Vor RISO grundsätzlich die Anlage spannungsfrei machen (Hauptschalter aus, oder betroffene Schrauben auf). Bei AFDD und RCD Typ B zusätzlich deren Schrauben aufdrehen, um den inneren (elektronischen) Widerstand zu umgehen - gilt auch hier: wenn Schrauben auf, dann auch spannungsfrei. Gemessen wird L-N, L-PE, bei Drehstrom L-L und N-PE. Für N-PE den Neutralleiter trennen (Schraube am Eingang der N-Reihenklemme lösen): N und PE sind an der Einspeisung verbunden, ohne Trennung zeigt das Gerät einen Kurzschluss (sim-0cf). Wer die Schrauben von RCD Typ B oder AFDD nicht öffnet, misst deren Elektronik, je nach Anlage auch unter 1 MΩ (z.B. 0,15 MΩ, n.i.O., sim-qha). |
| Riso (MΩ)<br>Verbraucher mit       | Nein                    | RISO-Messung, Verbraucher angeschlossen    | Nicht besonders relevant in Simulation                                                                                                                 |
| Überstromschutz Art Charakteristik | Ja                      | LS-Typenschild (`bauteile.md`)             |                                                                                                                                                        |
| Überstromschutz In (A)             | Ja                      | LS-Typenschild (`bauteile.md`)             |                                                                                                                                                        |
| Überstromschutz Zs (Ω) L-PE        | Ja, falls KEIN RCD im Stromkreis | ZS-Messung                        | Sitzt ein RCD im Stromkreis, ergibt Zs/Ik L-PE keinen Sinn und entfällt - der Fehlerstrom über PE würde den RCD unnötig auslösen, ohne zusätzlichen Erkenntniswert (der PE-Fehlerfall wird bereits über den FI/RCD-Test abgedeckt). Stattdessen wird dann NUR Zi/Ik L-N gemessen (siehe unten). Ist KEIN RCD im Stromkreis, wird Zs/Ik L-PE eingetragen und Zi/Ik L-N nicht (sim-1jl). Zi wird trotzdem gemessen, weil der Spannungsfall daraus kommt. Trägt der Prüfling die jeweils andere Messung zusätzlich ein, ist das unnötige Arbeit, aber kein Fehler (nicht rot). Gemessen an der Endstelle (L, N und PE der Dose), weil Zs den PE-Weg bis zur Einspeisung enthält: ein PE-Fehler am Stromkreis erhöht Zs nur, wenn PE an der Dose abgegriffen wird (sim-24c). |
| Überstromschutz Ik (A) L-PE        | Ja, falls KEIN RCD im Stromkreis | Messgerät zeigt diesen an.        | Siehe Hinweis bei Zs (Ω) L-PE. 2/3-Regel siehe unten bei Ik L-N.                                                                                     |
| Überstromschutz Zi (Ω) L-N         | Ja, falls ein RCD im Stromkreis | Zi-Messung                             | Immer messen, unabhängig davon ob ein RCD im Stromkreis sitzt (der Spannungsfall kommt aus der Zi-Messung). Eingetragen wird Zi/Ik L-N nur mit RCD; ohne RCD wird stattdessen Zs/Ik L-PE eingetragen (sim-1jl, siehe Hinweis bei Zs (Ω) L-PE). Bei Drehstromsteckdose und 5-poliger Anschlussdose wird jeder Außenleiter gemessen; eingetragen wird der schlechteste Wert (höchstes Zi bzw. Zs mit dem Ik desselben Außenleiters). |
| Überstromschutz Ik (A) L-N         | Ja                          | Messgerät zeigt diesen an.             | Siehe Hinweis bei Zi (Ω) L-N. **2/3-Regel** (sim-g0o, VDE 0100-600 D.6.4.3.7.2, weil die Leiterwiderstände durch die Temperatur steigen): Der eingetragene Wert (Zi bzw. Zs) muss Z ≤ 2/3 · 230 V / Ia sein, Ia = Lim des Messgeräts (z.B. C16: 160 A, Grenze 0,96 Ω). Liegt Z darüber, ist das ein Mangel. Zeigt die Ampel dabei noch grün (Isc = 0,9 · 230 V / Z ≥ Lim, bei C16 bis 1,29 Ω), muss der Prüfling ihn selbst erkennen; bei roter Ampel ist die Abschaltbedingung gar nicht erfüllt. In beiden Fällen: unter Mängel eintragen, Ergebnis „Mängel festgestellt“, Prüf-Plakette „Nein“, „Anlage entspricht den anerkannten Regeln“ „Nein“. Diese drei Kreuze verlangt der Check auch dann, wenn die Anforderung keinen Mängel-Punkt nennt (Entscheidung Mensch). Die Ampel bleibt wie beim echten Gerät; der Prüfling muss es selbst erkennen. Der Fahrplan-Generator meldet solche Stromkreise als Hinweis, der Mängel-Punkt steht in der anforderung.md (sim-03t). Rechnung: model/abschaltbedingung.js. |
| RCD <br>In/Art (A)                 | Ja, falls RCD vorhanden | RCD-Typenschild (`bauteile.md`)            |                                                                                                                                                        |
| RCD <br>IΔN (mA)                   | Ja, falls RCD vorhanden | FI/RCD-Messung (Modus `FI/RCD`)            |                                                                                                                                                        |
| RCD <br>Imess (mA)                 | Ja, falls RCD vorhanden | FI/RCD-Messung (Modus `FI/RCD`)            |                                                                                                                                                        |
| RCD <br>Ausl. Zeit tA (ms)         | Ja, falls RCD vorhanden | FI/RCD-Messung (Modus `FI/RCD`)            |                                                                                                                                                        |
| RCD Umess (V)                      | Ja                      | Live-Spannungsanzeige des jeweiligen Modus | Defaultwert: 50V                                                                                                                                       |

**RCD Typ B und B+ (sim-24l):** Ein RCD Typ AC, A oder F steht mit seinen Werten in der Zeile des
Stromkreises, an dem er gemessen wird (LS-Teil, danach RCD-Teil). Ein RCD Typ B oder B+ wird zweimal
geprüft, mit Wechselstrom (Einstellung AC am Messgerät) und mit glattem Gleichstrom (Einstellung B
bzw. B+). Jede Prüfung bekommt eine eigene Zeile ohne LS-Teil: in Nr. das Kennzeichen des RCD
(F3-n), in der Zielbezeichnung RCD und Prüfart, dazu In/Art, IΔN, Imess, tA und Umess. In der Zeile
des Stromkreises bleibt der RCD-Teil dann leer, steht dort etwas, ist es im Check rot. Das Messgerät
zeigt bei Einstellung B/B+ an einem RCD Typ B/B+ dessen Gleichstromwerte, sonst die Wechselstromwerte.
Eine Prüfung mit Einstellung AC oder A an einem RCD Typ B ist zulässig, sie liefert die Werte für die
Wechselstrom-Zeile. Die Messwerte stehen je Gruppe in `anforderung.md` (Spalten `Imess AC (mA)`,
`tA AC (ms)`, `Imess DC (mA)`, `tA DC (ms)`, siehe `demos/anforderung_vorlage.md`).

### Betriebsmittelkennzeichen

**Status:** F2 für LS-Stromkreise ist umgesetzt (sim-0ns), F3 für die eigenen Zeilen eines RCD
Typ B/B+ ebenfalls (sim-24l). Die weiteren Kennzeichen sind geplant.

In die Spalte Nr. gehört das Betriebsmittelkennzeichen des Schutzorgans, durchnummeriert:

| Kennzeichen | Betriebsmittel                 |
| ----------- | ------------------------------ |
| F1          | Schmelzsicherung               |
| F2          | Leitungsschutzschalter (LS)    |
| F3          | Fehlerstromschutzschalter (RCD) |
| Q1          | Hauptschalter                  |
| Q2          | Leistungsschalter              |
| S1          | Schalter-Stromkreis            |
| S2          | Taster-Stromkreis              |
| E1          | Leuchte                        |
| X1          | Schukosteckdose                |
| X3          | CEE-Steckdose 16 A             |

- **LS-Stromkreis (sim-0ns, umgesetzt):** Ein Stromkreis ist im Simulator immer einem LS
  zugeordnet. Seine Zeile bekommt in Nr. das Kennzeichen des LS:
  - Nummer: die LS werden im Schaltkasten von links oben nach rechts unten gezählt, also
    Hutschiene für Hutschiene von oben und auf jeder Hutschiene von links. Die Zahl nach dem
    Bindestrich läuft über alle Hutschienen weiter.
  - Ein LS mit AFDD (Kombigerät) ist auch F2 und zählt mit.
  - Der Fahrplan schreibt `F2-1`. Der Check lässt Varianten derselben Nummer gelten: `F2-01`,
    `-F2-1`, `f2.1`, `F2 - 1`. Falsch sind eine andere Nummer, ein anderes Kennzeichen und
    eine bloße Zahl.
  - Die Zeile Hauptleitung bleibt wie bisher: der Fahrplan schreibt `1`, der Check verlangt
    nur ein ausgefülltes Feld.
  - Die Zielbezeichnung bleibt bei der LS-Position (`LS1: 2 Steckdosen`).
- **RCD als eigene Zeile (sim-24l, umgesetzt für Typ B/B+):** Ein RCD Typ B oder B+ bekommt
  zwei eigene Zeilen mit F3-n, eine für die Prüfung mit Wechselstrom und eine mit glattem
  Gleichstrom (Abschnitt "RCD Typ B und B+" oben). Die RCD werden wie die LS von links oben
  nach rechts unten gezählt, über alle RCD der Anlage. Ein RCD Typ AC, A oder F bleibt in der
  Zeile seines Stromkreises. Für alle RCD eine eigene Zeile war die ursprüngliche Idee (sim-ovx).
- **Weitere Kennzeichen (sim-23w, P3, nach sim-0ns):** S, E, Q und X aus der Tabelle oben für
  Endstellen und Schalter. Noch offen: wo sie erscheinen (Zielbezeichnung, Schaltkasten, Dosen,
  Check), die Nummerierung, und welche Kennzeichen Lichtauslass, Drehstromsteckdose und
  5-polige Anschlussdose bekommen. Taster und Schalter gibt es im Simulator noch nicht.

## Prüfergebnis

**Automatisierte Befüllung dieses Abschnitts auf später verschoben** (User,
2026-07-31) - `tools/pruefprotokoll_erstellung.js` füllt aktuell bewusst
NICHT Ergebnis/Prüf-Plakette/Nächster Prüftermin, obwohl die Tabelle unten
schon Defaultwerte dafür beschreibt. Grund: "Ergebnis" bräuchte eine
Auswertung ALLER Messwerte/Ampeln der Anlage (aktuell nicht Teil der
Orchestrierung), an der auch die restliche Logik (Prüf-Plakette, nächster
Prüftermin) hängt - das ist ein eigenes, noch nicht angegangenes Vorhaben.

| Feld                     | Pflicht | Defaultwert/Quelle                                                                                             | Hinweis                                                                                                                |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Ergebnis                 | Ja      | Berechnet: "Mängel festgestellt", wenn IRGENDEIN n.i.O./rote Ampel vorliegt, sonst "Keine Mängel festgestellt" | Keine Mängel festgestellt oder Mängel festgestellt muss angekreuzt werden. In der Regel ist es Mängel festgestellt     |
| Prüf-Plakette angebracht | Ja      | Ja, wenn "Keine Mängel festgestellt", sonst Nein                                                               | Die Regel sollte Nein sein.                                                                                            |
| Nächster Prüftermin      | Ja      | Keine Mängel: In vier Jahren, Mängel in  drei Monaten.                                                         | Hängt von Prüfungsart/-intervall ab - brauche hier deine fachliche Einschätzung (auf später verschoben, siehe oben). In der Regel Innerhalb von 3 Monaten. |

## Abschluss

Unterschrift kann nicht ausgefüllt werden. Wenn die Unterschrift fehlt, ist das ein Kriterium für durchgefallen.

| Feld                                                        | Pflicht | Defaultwert                                      | Hinweis                   |
| ----------------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------- |
| Ort                                                         | Ja      | 70376 Stuttgart                                  | Wie Standort/Auftraggeber |
| Datum                                                       | Ja      | Datum der Prüfung                                | Aktuelles Datum           |
| Unterschrift (Prüfling)                                     | Ja      | Name des Prüflings                               |                           |
| Anlage entspricht den anerkannten Regeln der Elektrotechnik | Ja      | Ja, wenn "Keine Mängel festgestellt", sonst Nein |                           |

## Bekannte Fehler im aktuellen Prüfprotokoll (noch zu fixen)

Beim Durchgehen entdeckte Abweichungen zwischen dem, was das Feld zeigen
sollte, und dem, was `view/protokoll.js` aktuell rendert - hier nur
gesammelt, Fix folgt später (nicht Teil dieses Dokuments selbst).

1. ~~**"Blatt ... / von ..."** (`baueKopfdaten()`): "/" zwischen den Feldern entfernen, "von" als reiner Label-Text statt Platzhalter in einem zweiten Eingabefeld.~~ **Erledigt.**

2. ~~**"Netz / V"** (`baueNetz()`): zwei getrennte Eingabefelder (Außenleiterspannung z.B. 400, Sternspannung z.B. 230) mit "/" bzw. "V" als reinem Label-Text.~~ **Erledigt.**

3. ~~**Spaltenüberschriften in der Stromkreisverteiler-Tabelle zweizeilig machen** - lange Überschriften wie "Zs (Ω) L-PE" sollen über zwei Zeilen laufen.~~ **Erledigt** - zunächst per CSS-Wrap, inzwischen zusätzlich mit expliziten `<br>`-Umbrüchen vor "L-PE"/"L-N" (kontrolliert an der richtigen Stelle statt dem Browser überlassen).

4. ~~**"Umess (V)"-Spaltenüberschrift soll ein eigenes Eingabefeld für den UL-Grenzwert enthalten**~~ **Erledigt**, in vereinfachter Form gegenüber dem ursprünglichen Vorschlag: `U_L ≤ [Eingabefeld]<br>Umess (V)` - kein "RCD"-Präfix mehr (steht bereits als Gruppen-Label über der Spalte) und kein abschließendes "V" hinter dem Eingabefeld (macht die Spalte wieder schmal, "Ω"/"V" als Einheit ist ohnehin implizit). Eingabefeld weiterhin standardmäßig LEER.

5. ~~**Spalten der Stromkreisverteiler-Tabelle an die hier dokumentierte Liste anpassen** (Leitung/Kabel, Riso (MΩ), Überstromschutz, RCD als Gruppen mit Unterspalten, zweizeiliger Gruppen-Kopf mit `colspan`/`rowspan`, alle vier Gruppen linksbündig).~~ **Erledigt** - `view/protokoll.js` (`STROMKREIS_GRUPPEN`, `baueStromkreisverteilerKopf()`) rendert jetzt exakt die 19 Spalten aus der Tabelle oben, gruppiert mit `<br>`-Zeilenumbrüchen in den Unterspalten-Labels.

6. ~~**"Erdung / Potentialausgleich" war noch EIN Abschnitt in `view/protokoll.js`** (`ERDUNG_PUNKTE`, 16 Punkte inkl. "Erdungswiderstand Re" und "Durchgängigkeit Potentialausgleich" als normale Ankreuz-Zeilen) - sollte den beiden oben dokumentierten Abschnitten entsprechen: eigener Abschnitt "Erdungswiderstand" (nur "Erdungswiderstand Re", freier Ω-Wert statt Ankreuz-Zeile) VOR "Durchgängigkeit Potentialausgleich nachgewiesen" (14 Punkte, ohne die beiden herausgelösten Zeilen).~~ **Erledigt** - `baueErdungswiderstand()` (schmales Eingabefeld + "Ω", nah beieinander statt an den rechten Rand gedrückt) plus `DURCHGAENGIGKEIT_PUNKTE` (14 Einträge) für den zweiten Abschnitt.


