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
| Neuanlage, Erweiterung, Änderung, Instandsetzung, Wiederholungsprüfung | Ja      | In der Regel Wiederholungsprüfung | Das Ankreuzen ist hier wichtig                  |
| Beginn Prüfung                                                         | Ja      | Aktuelles Datum                   | Wichtig!                                        |
| Ende Prüfung                                                           | Ja      | Aktuelle Datum                    | Wichtig!                                        |
| Beauftragter des Auftraggebers                                         | Ja      | Kathi Katz                        |                                                 |
| Prüfer                                                                 | Ja      | Name des Prüfers                  | Wichtig!                                        |



## Netz

| Feld              | Pflicht | Defaultwert                                               | Hinweis                                                                                                                                         |
| ----------------- | ------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Netz / V          | Ja      | 230/400V                                                  | Eintrag könnte so sein: Netz 400 / 230 V                                                                                                        |
| Netzform          | Ja      | aus der Anlage übernehmen (`anlage.json`-Feld `netzform`) | Nicht raten - steht schon in den Anlagedaten, die der Prüfling vor sich hat. In der Regel ist das ein TN-C-S Netz. Aber nicht notwendigerweise. |
| Netzbetreiber     | Ja      | Stattwerte Stuttgart                                      | Hier muss was eingetragen sein.                                                                                                                 |
| Zähler-Nr.        | Nein    | –                                                         | Nur relevant, wenn ein Zähler vorhanden ist.                                                                                                    |
| Zählerstand (kWh) | Nein    | –                                                         | Nur relevant, wenn ein Zähler vorhanden ist.                                                                                                    |

## Besichtigen

14 Prüfpunkte, je i.O./n.i.O. + Bemerkung. Reine Sichtprüfung - der
Simulator kann das aktuell NICHT automatisch prüfen (keine "eingebauten
Fehler" in der Anlage modelliert, siehe KONZEPT.md "Nächste Schritte").

| Vorgabe                                      | Pflicht | Defaultwert | Prüfkriterium                                                                                                                                                                                                                               |
| -------------------------------------------- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auswahl der Betriebsmittel                   | Ja      | i.O.        | Solange die Anlage keinen bekannten Sichtmangel hat (aktuell immer der Fall) - sobald es "Fehlerkarten"/absichtliche Mängel gibt, hier entsprechend n.i.O. + Bemerkung.                                                                     |
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
| FI-Schutzschalter (RCD)                                     | Ja                                     | i.O.                                                      | Am RCD ist in der Regel eine Prüftaste. Die kann betätigt werden, und der RCD löst aus. Kein Meßgerät wird hier genutzt!<br>Die Simulation hat Stand heute keine Prüftaste, kann aber noch hinzukommen. |
| Rechtsdrehfeld (Drehstromsteckdosen)                        | Ja, falls Drehstromanschluss vorhanden | Ergebnis der Phasenfolge (Modus `V~`, Feld `phasenfolge`) | i.O. bei "1.2.3.", n.i.O. bei "3.2.1."<br>Getestet werden hier Drehstromsteckdosen.                                                                                                                     |
| Überprüfung Spannungsfall                                   | Ja                                     | Ergebnis der ΔU-Ansicht (Modus `ZI`, Ansicht `delta_u`)   | Spannungsfall muss unter 3,5% sein., bzw. unter 14V.                                                                                                                                                    |
| Funktionsprüfung der Anlage                                 | Ja                                     | i.O.                                                      | Nicht besonders relevant in Simulation                                                                                                                                                                  |
| Funktion der Schutz-/Sicherheits-/Überwachungseinrichtungen | Ja                                     | i.O.                                                      | Nicht automatisiert prüfbar                                                                                                                                                                             |
| Drehrichtung der Motoren                                    | Nein                                   |                                                           | Nicht besonders relevant in Simulation                                                                                                                                                                  |
| Gebäudesystemtechnik                                        | Nein                                   |                                                           | Nicht besonders relevant in Simulation                                                                                                                                                                  |


## Erdungswiderstand

In der Prüfung ist dieser Werte eigentlich sehr relevant. Aber in der Simulation kann man diese schlecht abbilden. Man kann diese mit der C2 Methode messen. Also mit dem Installationstester. Vielleicht ein Thema für Zukunft.

| Feld                 | Pflicht | Defaultwert | Hinweis                                |
| -------------------- | ------- | ----------- | -------------------------------------- |
| Erdungswiderstand RE | Ja      |             | Nicht besonders relevant in Simulation |



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

Die erste Reihe betrifft immer die Hauptleitung. Bei Hauptleitung sind Überstrom und RCD nicht relevant.

| Spalte                             | Pflicht                 | Quelle                                     | Hinweis                                                                                                                                                |
| ---------------------------------- | ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nr.                                | Ja                      | Fortlaufend                                |                                                                                                                                                        |
| Stromkreis / Zielbezeichnung       | Ja                      | `anlage.json` Stromkreis-Bezeichnung/Ziel  | Wenn die Steckdosen, Reihenklemmen eine Kennzeichnung haben, dann gehört diese rein.                                                                   |
| Leitung/Kabel<br>Typ               | Ja                      | `anlage.json` Ader-Kabeltyp (z.B. NYM-J)   | Typische ist hier NYM, NYY. Aber auch Anzahl der Adern. Beispiel: NYM                                                                                  |
| Leitung/Kabel<br>Anzahl            | Ja                      |                                            | Hier gehört die Anzahl der Adern, bei Steckdosen 3, bei Drehstromsteckdosen 5 rein. Anzahl bezieht sich auf Anzahl der Adern.                          |
| Leitung/Kabel<br>Querschnitt (mm²) | Ja                      | `anlage.json` Ader-Querschnitt             |                                                                                                                                                        |
| Rpe (Ω)                            | Ja                      | RLOW-Messung PE-Durchgang                  | In der Regel wird die Messung von der Steckdose, Anschlussdose oder Drehstromsteckdose zur PE Klemme geführt. Das muss man machen!                     |
| Riso (MΩ)<br>Verbraucher ohne      | Ja                      | RISO-Messung, Verbraucher abgeklemmt       | Beim Abklemmen, immer den Schraubendreher und Schraube verwenden. Nicht den RCD, oder AFDD Hebel. Ausnahme: Der Hauptschalter muss ausgeschaltet sein! |
| Riso (MΩ)<br>Verbraucher mit       | Nein                    | RISO-Messung, Verbraucher angeschlossen    | Nicht besonders relevant in Simulation                                                                                                                 |
| Überstromschutz Art Charakteristik | Ja                      | LS-Typenschild (`bauteile.md`)             |                                                                                                                                                        |
| Überstromschutz In (A)             | Ja                      | LS-Typenschild (`bauteile.md`)             |                                                                                                                                                        |
| Überstromschutz Zs (Ω) L-PE        | Ja                      | ZS-Messung                                 |                                                                                                                                                        |
| Überstromschutz Ik (A) L-PE        | Ja                      | Messgerät zeigt diesen an.                 |                                                                                                                                                        |
| Überstromschutz Zi (Ω) L-N         | Nein                    | Zi-Messung                                 |                                                                                                                                                        |
| Überstromschutz Ik (A) L-N         | Nein                    | Messgerät zeigt diesen an.                 |                                                                                                                                                        |
| RCD <br>In/Art (A)                 | Ja, falls RCD vorhanden | RCD-Typenschild (`bauteile.md`)            |                                                                                                                                                        |
| RCD <br>IΔN (mA)                   | Ja, falls RCD vorhanden | FI/RCD-Messung (Modus `FI/RCD`)            |                                                                                                                                                        |
| RCD <br>Imess (mA)                 | Ja, falls RCD vorhanden | FI/RCD-Messung (Modus `FI/RCD`)            |                                                                                                                                                        |
| RCD <br>Ausl. Zeit tA (ms)         | Ja, falls RCD vorhanden | FI/RCD-Messung (Modus `FI/RCD`)            |                                                                                                                                                        |
| RCD Umess (V)                      | Ja                      | Live-Spannungsanzeige des jeweiligen Modus | Defaultwert: 50V                                                                                                                                       |

## Prüfergebnis

| Feld                     | Pflicht | Defaultwert/Quelle                                                                                             | Hinweis                                                                                                                |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Ergebnis                 | Ja      | Berechnet: "Mängel festgestellt", wenn IRGENDEIN n.i.O./rote Ampel vorliegt, sonst "Keine Mängel festgestellt" | Keine Mängel festgestellt oder Mängel festgestellt muss angekreuzt werden. In der Regel ist es Mängel festgestellt     |
| Prüf-Plakette angebracht | Ja      | Ja, wenn "Keine Mängel festgestellt", sonst Nein                                                               | Die Regel sollte Nein sein.                                                                                            |
| Nächster Prüftermin      | Ja      | Keine Mängel: In vier Jahren, Mängel in  drei Monaten.                                                         | Hängt von Prüfungsart/-intervall ab - brauche hier deine fachliche Einschätzung. In der Regel Innerhalb von 3 Monaten. |

## Abschluss

Abschluss Auftraggeber kann nicht ausgefüllt werden. Abschluss Prüfer muss ausgefüllt werden, sonst durchgefallen.

| Feld                                                        | Pflicht | Defaultwert                                      | Hinweis                   |
| ----------------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------- |
| Ort                                                         | Ja      | Stuttgart                                        | Wie Standort/Auftraggeber |
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


