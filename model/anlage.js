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

  // Lädt den Verbindungsgraphen (siehe KONZEPT.md "Pfadverfolgung und
  // Fehlersimulation"), der neben der anlage.json liegt (gleicher Ordner,
  // Dateiname "graph.json") - aus generate_anlage.js erzeugt, ein Testcase
  // ohne netzplan.md (z.B. die handgepflegte beispiel_eg.json) hat keinen.
  // Liefert `null` statt zu werfen, wenn keiner existiert (404) - die
  // Pfadverfolgung ist dann einfach nicht verfügbar, kein Fehlerfall.
  async ladeGraph(anlagePfad) {
    const graphPfad = anlagePfad.replace(/anlage\.json$/, 'graph.json');
    const antwort = await fetch(graphPfad);
    if (!antwort.ok) return null;
    return antwort.json();
  }
};
