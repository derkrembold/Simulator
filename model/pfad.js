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
