// Breitensuche im Verbindungsgraphen (siehe KONZEPT.md "Pfadverfolgung und
// Fehlersimulation"). Spiegelt findePfad() aus tests/visuell/generate_anlage.js
// bewusst 1:1 (kleine, reine Funktion ohne weitere Abhängigkeiten) - dort
// lebt das Original für die Node-seitigen Tests, hier die Browser-Kopie für
// die Laufzeit-Anbindung ans Messgerät. Bei Änderungen an einer Seite die
// andere mitziehen.

// Kanten sind ungerichtet durchquerbar (ein geschlossener Schalter leitet in
// beide Richtungen) und werden übersprungen, wenn `geschlossen: false` ist.
// Gibt den Pfad als Array von Netz-IDs zurück, oder null, wenn keiner existiert.
export function findePfad(graph, funktion, startNetz, zielNetz) {
  const teilgraph = graph[funktion];
  if (!teilgraph) return null;
  if (startNetz === zielNetz) return [startNetz];

  const besucht = new Set([startNetz]);
  const warteschlange = [[startNetz]];
  while (warteschlange.length > 0) {
    const pfad = warteschlange.shift();
    const aktuell = pfad[pfad.length - 1];
    for (const kante of teilgraph.kanten) {
      if (!kante.geschlossen) continue;
      let naechster = null;
      if (kante.von === aktuell) naechster = kante.nach;
      else if (kante.nach === aktuell) naechster = kante.von;
      if (!naechster || besucht.has(naechster)) continue;
      const neuerPfad = [...pfad, naechster];
      if (naechster === zielNetz) return neuerPfad;
      besucht.add(naechster);
      warteschlange.push(neuerPfad);
    }
  }
  return null;
}

// Summiert die Fehler-Widerstände entlang eines gefundenen Pfads (Array von
// Netz-IDs) über die Fehlertabelle (`graph.fehlertabelle`, siehe KONZEPT.md
// "Pfadverfolgung und Fehlersimulation") - Netze ohne Eintrag zählen 0Ω.
// Spiegelt berechneWiderstand() aus generate_anlage.js.
export function berechneWiderstand(graph, pfad) {
  return pfad.reduce((summe, netzId) => summe + (graph.fehlertabelle?.[netzId] ?? 0), 0);
}

// Sammelt ALLE Kanten, die von `startNetz` aus über die Verkabelung
// erreichbar sind (BFS über den GESAMTEN Teilgraphen, keine Zielsuche zu
// einem bestimmten Knoten). Gebraucht für die RISO-Elektronik-Erkennung
// (siehe controller/app.js berechneRisoElektronikWiderstand()): ob ein
// AFDD/RCD Typ B mit einer Sonde verbunden ist, ist eine reine
// Verdrahtungsfrage - hängt NICHT davon ab, ob die Sonde noch bis zur
// Einspeisung durchgängig ist (**behobener Bug, User-Repro**:
// Hauptschalter-Schrauben L1+L2 gelöst, Sonden an RCD2s eigenem Ausgang -
// RCD2 bleibt trotzdem MIT DEN SONDEN verbunden, obwohl die Verbindung zur
// Einspeisung selbst unterbrochen ist; eine frühere Version suchte
// fälschlich einen Pfad BIS ZUR EINSPEISUNG und fand RCD2 deshalb nicht
// mehr, sobald irgendeine Kante VOR RCD2 fehlte). Deshalb bewusst KEINE
// Zielsuche zu `graph.einspeisung` wie bei `findePfadZurEinspeisung()`,
// sondern die volle von `startNetz` aus erreichbare
// Zusammenhangskomponente. RISO braucht ohnehin einen spannungsfreien
// (also meist ausgeschalteten) Stromkreis, um überhaupt zu messen - ein
// offener Schalter irgendwo in dieser Komponente ist deshalb der
// Normalfall, nicht die Ausnahme, `findePfad()` würde dort sofort
// abbrechen.
//
// `geschlossen` (Schalterzustand) wird deshalb differenziert behandelt,
// nicht pauschal ignoriert (User-Vorgabe, 2026-07-27, "Das Verhalten
// sollte so sein wie bei den Schrauben. Die Schrauben sind ja auch sowas
// wie Schalter."): eine Kante, an deren einem Ende die Sonde DIREKT sitzt
// (`aktuell === startNetz`), wird immer erkannt - auch bei offenem
// Hebel, da die Sonde das Bauteil physisch berührt (Beispiel: Sonde an
// RCD2s eigenem Eingang, RCD2s Hebel offen -> RCD2 selbst bleibt
// erkennbar, 13MΩ). Jede WEITER ENTFERNTE Kante (transitiv über einen
// fremden Hebel erreicht) verhält sich dagegen wie eine gelöste Schraube:
// offen blockiert komplett, weder Erkennung noch Weitersuche dahinter
// (Beispiel: dieselbe Messung von der LS2-Steckdose aus, RCD2s Hebel
// offen -> RCD2 verschwindet auch von der Ausgangsseite, nur noch LS2
// alleine, 101MΩ).
//
// EINE weitere Ausnahme bleibt wichtig: eine per Schraubendreher gelöste
// Schraube (siehe KONZEPT.md "Schrauben lösen") ist KEIN Schalter, sondern
// eine ECHTE physische Trennung der Ader - anders als ein offener Schalter
// (Draht bleibt vorhanden, leitet nur gerade nicht) ist die Ader an dieser
// Stelle wirklich unterbrochen (User-Frage, die das auf den Punkt brachte:
// "wenn jemand eine Schraube rausgedreht hat, ist das wie wenn ein
// Schalter umgedreht wurde?" - Antwort: NEIN). `ausgeschlosseneKanten`
// (Set von Kanten-Objekten, i.d.R. `geloesteKanten` aus controller/app.js)
// markiert genau diese physisch getrennten Kanten - die werden hier
// UNABHÄNGIG von `aktuell === startNetz` immer übersprungen (eine
// physisch fehlende Schraube erkennt auch eine direkt daran sitzende
// Sonde nicht mehr - anders als beim bloßen Hebel).
export function findeErreichbareKanten(graph, funktion, startNetz, ausgeschlosseneKanten = new Set()) {
  const teilgraph = graph[funktion];
  if (!teilgraph) return [];

  const besucht = new Set([startNetz]);
  const warteschlange = [startNetz];
  const erreichbareKanten = new Set();
  while (warteschlange.length > 0) {
    const aktuell = warteschlange.shift();
    for (const kante of teilgraph.kanten) {
      if (ausgeschlosseneKanten.has(kante)) continue;
      let naechster = null;
      if (kante.von === aktuell) naechster = kante.nach;
      else if (kante.nach === aktuell) naechster = kante.von;
      if (!naechster) continue;
      if (aktuell === startNetz) {
        erreichbareKanten.add(kante);
        if (kante.geschlossen && !besucht.has(naechster)) {
          besucht.add(naechster);
          warteschlange.push(naechster);
        }
      } else if (kante.geschlossen) {
        erreichbareKanten.add(kante);
        if (!besucht.has(naechster)) {
          besucht.add(naechster);
          warteschlange.push(naechster);
        }
      }
    }
  }
  return [...erreichbareKanten];
}

// Für die RISO-Spannungsprüfung: ist `netz` bei den aktuellen
// Schalterstellungen überhaupt noch mit der Einspeisung verbunden? Prüft
// bewusst NICHT nur den Hauptschalter, sondern den kompletten Pfad (jeder
// offene Schalter dazwischen macht das Netz "tot"). Spiegelt
// istSpannungFuehrend() aus generate_anlage.js.
export function istSpannungFuehrend(graph, funktion, netz) {
  const einspeisungsNetz = graph.einspeisung?.[funktion];
  if (!einspeisungsNetz || !netz) return false;
  return findePfad(graph, funktion, einspeisungsNetz, netz) !== null;
}
