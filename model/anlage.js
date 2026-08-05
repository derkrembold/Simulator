const MAX_TE_PRO_HUTSCHIENE = 16; // 300mm / 18mm, siehe KONZEPT.md

function summeTe(gruppen) {
  return gruppen.reduce((summe, gruppe) => {
    let te = gruppe.rcd?.te ?? 0;
    te += gruppe.stromkreise.reduce((s, sk) => s + sk.ls.te, 0);
    return summe + te;
  }, 0);
}

export const Anlage = {
  async laden(pfad) {
    const antwort = await fetch(pfad);
    if (!antwort.ok) {
      throw new Error(`Anlage konnte nicht geladen werden: ${pfad}`);
    }
    const anlage = await antwort.json();

    anlage.hutschienen.forEach((hutschiene, i) => {
      const te = summeTe(hutschiene.gruppen);
      if (te > MAX_TE_PRO_HUTSCHIENE) {
        throw new Error(`Hutschiene ${i + 1} zu lang: ${te} TE (max. ${MAX_TE_PRO_HUTSCHIENE} TE)`);
      }
    });

    return anlage;
  },

  // Ersetzt den Dateinamen "anlage.json" am Ende eines Anlage-Pfads durch
  // `zielDatei` (z.B. "graph.json"/"fahrplan.json", siehe ladeGraph()/
  // ladeFahrplan() unten) - liefert `null`, wenn der Pfad gar nicht auf
  // "anlage.json" endet (z.B. die handgepflegte `anlagen/beispiel_eg.json`,
  // die einzige Anlage im Projekt mit abweichendem Dateinamen). WICHTIGER
  // Bugfix (selbst beim Bauen des Fahrplan-Ausführers gefunden, siehe
  // ARCHITEKTUR.md "Fahrplan laden"): ohne diese Prüfung lässt `.replace()`
  // einen nicht passenden Pfad UNVERÄNDERT stehen, wodurch `ladeGraph()`/
  // `ladeFahrplan()` versehentlich die ANLAGE-Datei selbst nochmal fetchen
  // und ihren Inhalt fälschlich als gültigen Graph/Fahrplan zurückliefern
  // (`antwort.ok` ist ja `true`) - führte zum Absturz von `start()`, sobald
  // `fahrplan.abschnitte` gelesen wurde (Anlage-Daten haben kein
  // `abschnitte`-Feld).
  _abgeleiteterPfad(anlagePfad, zielDatei) {
    if (!anlagePfad.endsWith('anlage.json')) return null;
    return anlagePfad.replace(/anlage\.json$/, zielDatei);
  },

  // Lädt den Verbindungsgraphen (siehe KONZEPT.md "Pfadverfolgung und
  // Fehlersimulation"), der neben der anlage.json liegt (gleicher Ordner,
  // Dateiname "graph.json") - aus generate_anlage.js erzeugt, ein Testcase
  // ohne netzplan.md (z.B. die handgepflegte beispiel_eg.json) hat keinen.
  // Liefert `null` statt zu werfen, wenn keiner existiert (404) oder sich
  // kein Pfad ableiten lässt - die Pfadverfolgung ist dann einfach nicht
  // verfügbar, kein Fehlerfall.
  async ladeGraph(anlagePfad) {
    const graphPfad = this._abgeleiteterPfad(anlagePfad, 'graph.json');
    if (!graphPfad) return null;
    const antwort = await fetch(graphPfad);
    if (!antwort.ok) return null;
    return antwort.json();
  },

  // Lädt den Fahrplan (siehe ARCHITEKTUR.md "Fahrplan-Erstellung"), der
  // neben der anlage.json liegt (gleicher Ordner, Dateiname "fahrplan.json")
  // - von tools/pruefprotokoll_erstellung.js erzeugt, aber gitignored (siehe
  // .gitignore) und deshalb nicht für jede Anlage vorhanden. Liefert `null`
  // statt zu werfen, wenn keiner existiert (404) oder sich kein Pfad
  // ableiten lässt - das Replay-Icon im Handy (siehe view/handy.js) wird
  // dann einfach nicht angezeigt (User-Vorgabe 2026-08-05: "Wenn fahrplan
  // nicht existiert, dann gibt es auch keinen replay app icon auf dem Handy
  // und nichts kann gestartet werden."), analog zu ladeGraph() oben.
  async ladeFahrplan(anlagePfad) {
    const fahrplanPfad = this._abgeleiteterPfad(anlagePfad, 'fahrplan.json');
    if (!fahrplanPfad) return null;
    const antwort = await fetch(fahrplanPfad);
    if (!antwort.ok) return null;
    return antwort.json();
  }
};
