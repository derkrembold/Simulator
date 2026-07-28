// Entwickler-Skill (User-Vorgabe, 2026-07-28): gibt für eine beliebige
// Schraube im Schaltkasten den Verdrahtungspfad zurück zur Einspeisung aus -
// als Tabelle mit drei Spalten (Verdrahtung/Verbindung, Bauteil,
// Verzweigung). Zweck: das manuelle Nachschlagen von Netz-IDs in
// anlage.json/graph.json, das diese ganze Session über nötig war, um einen
// throwaway-Playwright-Testscript zu bauen, durch einen einzigen
// Befehlszeilenaufruf ersetzen.
//
// Läuft die Berechnung ZWEIMAL, unabhängig voneinander, und vergleicht das
// Ergebnis (User-Idee: "Der Aufruf wäre gleich ein Testcase! Wenn es
// Unterschiede zwischen Graph und Browser gibt, dann ist da ein Problem."):
// (1) direkt auf dem eingecheckten graph.json (reine Verdrahtungs-Daten,
// kein Browser nötig), (2) auf den tatsächlich gerenderten Schrauben im
// Browser (headless, siehe project_skills_pruefprozess-Memory: "erst
// headless, headful später als Option") - dort werden die Kanten
// UNABHÄNGIG aus den `data-bauteil`/`data-farbe`/`data-netz`/
// `data-netz-weitere`-Attributen der Schrauben-Kreise rekonstruiert, NICHT
// aus graph.json gelesen. Weichen beide Tabellen voneinander ab, ist das
// ein echter Fund (Rendering und Datenmodell laufen auseinander) - Skript
// zeigt dann BEIDE Tabellen mit klar markierter Abweichung und bricht mit
// Exit-Code 1 ab. Stimmen sie überein, wird nur EINE Tabelle ausgegeben.
//
// Aufruf: node tools/pfad_zur_einspeisung.js <testcase> <bauteil> <netz>
// Beispiel: node tools/pfad_zur_einspeisung.js testcase_04 LS3 N26
//
// Zweite Aufrufform (User-Vorgabe, direkt im Anschluss, 2026-07-28): eine
// Endstelle (Drehstromsteckdose, Anschlussdose, Schuko-Steckdose, 5-polige
// Anschlussdose - alle in view/steckdosen.js) hat KEINE eigene Schraube im
// Schaltkasten und trägt im DOM auch keine `data-bauteil`/`data-netz`-
// Attribute (siehe view/steckdosen.js `klickbar()`) - eine Sonde dort lässt
// sich also nicht wie eine Schaltkasten-Schraube identifizieren. Stattdessen
// wird die Netz-ID direkt aus `anlage.json`s `stromkreis.leitung.adern`
// aufgelöst (derselbe Weg, den `SteckdosenView.render()` selbst nutzt, um
// die Kontakte zu zeichnen - keine zweite Datenquelle) und die Tabelle
// bekommt eine zusätzliche erste Zeile, die die Endstelle selbst zeigt.
// Aufruf: node tools/pfad_zur_einspeisung.js <testcase> --endstelle <SK> <funktion>
// Beispiel: node tools/pfad_zur_einspeisung.js testcase_05 --endstelle SK1 L1

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..');
const GRAPH_FUNKTIONEN = ['L1', 'L2', 'L3', 'N'];
// Spiegelt KABELFARBEN aus generate_anlage.js (invertiert) - eine Ader-Farbe
// bestimmt eindeutig die Funktion, gebraucht um die DOM-rekonstruierten
// Kanten pro Funktion zu trennen (siehe ermittleDomKanten() unten).
const FARBE_ZU_FUNKTION = { schwarz: 'L1', braun: 'L2', grau: 'L3', blau: 'N' };
const MIME_TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function ladeGraph(testcase) {
  const graphPfad = path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase, 'graph.json');
  return JSON.parse(fs.readFileSync(graphPfad, 'utf8'));
}

function ladeAnlage(testcase) {
  const anlagePfad = path.join(PROJEKT_ROOT, 'tests', 'visuell', testcase, 'anlage.json');
  return JSON.parse(fs.readFileSync(anlagePfad, 'utf8'));
}

// Spiegelt findeStromkreis() aus view/steckdosen.js - dieselbe Suche, damit
// garantiert dieselbe Endstelle gemeint ist, die auch im Browser gezeichnet
// wird.
function findeStromkreis(anlage, sk) {
  for (const hutschiene of anlage.hutschienen) {
    for (const gruppe of hutschiene.gruppen) {
      for (const stromkreis of gruppe.stromkreise) {
        if (stromkreis.bezeichnung === sk) return stromkreis;
      }
    }
  }
  return null;
}

// Löst "Endstelle SK<n>, Funktion" auf die Netz-ID auf, die
// `stromkreis.leitung.adern` (anlage.json) dafür trägt - derselbe Weg, den
// `SteckdosenView.render()` selbst nutzt (siehe view/steckdosen.js
// findeAder()), keine zweite Datenquelle.
function ermittleEndstelleNetz(anlage, sk, funktion) {
  const stromkreis = findeStromkreis(anlage, sk);
  if (!stromkreis) return null;
  const ader = stromkreis.leitung?.adern?.find((a) => a.funktion === funktion);
  if (!ader) return null;
  return { netz: ader.netz, label: `${stromkreis.endstelle} ${stromkreis.bezeichnung}` };
}

function findeFunktion(graph, netz) {
  return GRAPH_FUNKTIONEN.find((funktion) => graph[funktion]?.knoten?.includes(netz)) ?? null;
}

// Ein Bauteil mit einer geteilten Schraube (z.B. testcase_05s RCD2, das
// über `weitere` sowohl LS2 als auch LS3 speist) besitzt MEHRERE Kanten mit
// demselben Bauteilnamen im selben Funktions-Teilgraphen - taucht der Name
// dann sowohl als Bauteil EINER Zeile als auch als Verzweigung an einer
// anderen Stelle auf, ist ohne Unterscheidung nicht klar, ob es sich um
// dieselbe oder eine andere Kante handelt (User-Beobachtung, 2026-07-28).
// Nummeriert deshalb jede Kante eines Bauteils mit mehr als einer Kante
// durchgehend (`RCD2 (1)`, `RCD2 (2)`, ...) - Bauteile mit nur einer Kante
// bleiben unverändert (kein unnötiges "(1)" bei jedem normalen Bauteil).
function nummeriereKanten(kanten) {
  const nachBauteil = new Map();
  for (const kante of kanten) {
    if (!nachBauteil.has(kante.bauteil)) nachBauteil.set(kante.bauteil, []);
    nachBauteil.get(kante.bauteil).push(kante);
  }
  const label = new Map();
  for (const [bauteil, eigeneKanten] of nachBauteil) {
    if (eigeneKanten.length === 1) {
      label.set(eigeneKanten[0], bauteil);
    } else {
      eigeneKanten.forEach((kante, i) => label.set(kante, `${bauteil} (${i + 1})`));
    }
  }
  return label;
}

// Kern-Algorithmus, unabhängig von der Herkunft der Kanten (Graph ODER DOM,
// siehe beide Aufrufer unten) - BFS von `startNetz` zu `einspeisungsNetz`,
// ignoriert bewusst jeden Schaltzustand (`geschlossen`), da hier die reine
// Verdrahtung interessiert, nicht der aktuelle Schaltzustand (analog zur
// Philosophie von `findeErreichbareKanten()` in model/pfad.js). Liefert
// `null`, wenn kein Pfad existiert, sonst ein Array von Zeilen
// `{eingang, ausgang, bauteil, verzweigung}` - `eingang`/`ausgang` sind
// IMMER die tatsächlichen i-/o-Pin-Netze der Kante selbst (`kante.von` =
// Eingang, `kante.nach` = Ausgang, siehe `kantenFuerFunktion()` in
// generate_anlage.js), NICHT die Gehrichtung des Pfads - der Pfad läuft
// zwar immer vom Ausgang zum Eingang jedes Bauteils (Richtung Einspeisung),
// aber die Spaltenbedeutung bleibt dieselbe wie überall sonst im Projekt
// ("RCD2 Eingang"/"RCD2 Ausgang", User-Vorgabe: "Spalte 1: Eingang,
// Spalte 2: Ausgang").
function berechneTabelle(kanten, einspeisungsNetz, startNetz) {
  if (startNetz === einspeisungsNetz) return [];

  const label = nummeriereKanten(kanten);

  const vorgaenger = new Map();
  const besucht = new Set([startNetz]);
  const warteschlange = [startNetz];
  while (warteschlange.length > 0) {
    const aktuell = warteschlange.shift();
    if (aktuell === einspeisungsNetz) break;
    for (const kante of kanten) {
      let naechster = null;
      if (kante.von === aktuell) naechster = kante.nach;
      else if (kante.nach === aktuell) naechster = kante.von;
      if (!naechster || besucht.has(naechster)) continue;
      besucht.add(naechster);
      vorgaenger.set(naechster, { von: aktuell });
      warteschlange.push(naechster);
    }
  }
  if (!besucht.has(einspeisungsNetz)) return null;

  const pfadNetze = [einspeisungsNetz];
  let aktuellesNetz = einspeisungsNetz;
  while (aktuellesNetz !== startNetz) {
    aktuellesNetz = vorgaenger.get(aktuellesNetz).von;
    pfadNetze.unshift(aktuellesNetz);
  }

  const findeKante = (a, b) => kanten.find((k) => (k.von === a && k.nach === b) || (k.von === b && k.nach === a));

  return pfadNetze.slice(0, -1).map((von, i) => {
    const nach = pfadNetze[i + 1];
    const kante = findeKante(von, nach);
    const naechsteKante = i + 2 < pfadNetze.length ? findeKante(nach, pfadNetze[i + 2]) : null;
    const verzweigungen = [...new Set(
      kanten
        .filter((k) => k !== kante && k !== naechsteKante && (k.von === nach || k.nach === nach))
        .map((k) => label.get(k))
    )];
    return { eingang: kante.von, ausgang: kante.nach, bauteil: label.get(kante), verzweigung: verzweigungen.join(', ') || '–' };
  });
}

function formatTabelle(zeilen) {
  const header = ['Eingang', 'Ausgang', 'Bauteil', 'Verzweigung'];
  const rows = zeilen.map((z) => [z.eingang, z.ausgang, z.bauteil, z.verzweigung]);
  const alle = [header, ...rows];
  const breiten = header.map((_, i) => Math.max(...alle.map((r) => r[i].length)));
  const formatZeile = (r) => '| ' + r.map((zelle, i) => zelle.padEnd(breiten[i])).join(' | ') + ' |';
  const trenner = '| ' + breiten.map((b) => '-'.repeat(b)).join(' | ') + ' |';
  return [formatZeile(header), trenner, ...rows.map(formatZeile)].join('\n');
}

function starteServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPfad = decodeURIComponent(req.url.split('?')[0]);
      const dateiPfad = path.join(PROJEKT_ROOT, urlPfad === '/' ? '/index.html' : urlPfad);
      fs.readFile(dateiPfad, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found: ' + dateiPfad); return; }
        res.writeHead(200, { 'Content-Type': MIME_TYPEN[path.extname(dateiPfad)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

// Rekonstruiert die Kanten UNABHÄNGIG aus den gerenderten Schrauben-Kreisen
// im Schaltkasten - liest NICHT graph.json, sondern nur `data-bauteil`,
// `data-farbe`, `data-netz`, `data-netz-weitere` und die y-Position (siehe
// view/schaltkasten.js schraube()). Zwei Kreise mit demselben Bauteilnamen
// UND derselben Farbe (= derselbe Pol/dieselbe Funktion) bilden ein
// Eingangs-/Ausgangspaar - das Kreuzprodukt ihrer Netz-Mengen (inkl.
// `weitere` bei einer geteilten Schraube, z.B. testcase_05s RCD2) ergibt
// die Kante(n) dieses Bauteils für diesen Pol, exakt analog zu
// `kantenFuerFunktion()` in generate_anlage.js, nur datenquellen-
// unabhängig nachgebaut. WICHTIG: welcher der beiden Kreise Eingang bzw.
// Ausgang ist, wird über die y-Position entschieden (Eingang wird IMMER
// oben gezeichnet, Ausgang unten - `schraube(svg, cx, y + 10, ...)` für
// Eingang vs. `schraube(svg, cx, y + GERAET_H - 10, ...)` für Ausgang, siehe
// `view/schaltkasten.js` `geraet()`) - nicht die zufällige DOM-Reihenfolge
// der Kreise, damit `kante.von` (Eingang) / `kante.nach` (Ausgang) exakt
// dieselbe Bedeutung tragen wie im Graphen. Jede Kante trägt zusätzlich
// ihre Funktion (aus der Farbe abgeleitet, siehe FARBE_ZU_FUNKTION) -
// WICHTIG für `nummeriereKanten()`: ein mehrpoliges Bauteil wie RCD1
// (4-polig) hat pro Funktion nur EINE eigene Kante, aber ohne Trennung nach
// Funktion würden alle vier Pole fälschlich als "mehrere Kanten desselben
// Bauteils" gezählt (**Bugfix, beim Testen selbst gefunden**: erste Version
// verglich über alle vier Funktionen hinweg statt nur innerhalb der gerade
// abgefragten - führte zu einer falschen "ABWEICHUNG"-Meldung, obwohl Graph
// und Browser inhaltlich übereinstimmten).
async function ermittleDomKanten(page) {
  const kreise = await page.evaluate(() =>
    [...document.querySelectorAll('#schaltkasten svg circle[data-bauteil][data-netz]')].map((c) => ({
      bauteil: c.getAttribute('data-bauteil'),
      farbe: c.getAttribute('data-farbe'),
      cy: Number(c.getAttribute('cy')),
      netze: [c.getAttribute('data-netz'), ...(c.getAttribute('data-netz-weitere')?.split(',') ?? [])]
    }))
  );

  const gruppen = new Map();
  for (const kreis of kreise) {
    const schluessel = `${kreis.bauteil}|${kreis.farbe}`;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
    gruppen.get(schluessel).push(kreis);
  }

  const kanten = [];
  for (const [schluessel, gruppenKreise] of gruppen) {
    if (gruppenKreise.length !== 2) continue; // unerwartet (siehe Kommentar oben) - Bauteil ohne sauberes Eingangs-/Ausgangspaar, wird ignoriert statt zu crashen
    const [bauteil, farbe] = schluessel.split('|');
    const funktion = FARBE_ZU_FUNKTION[farbe];
    if (!funktion) continue; // PE oder unbekannte Farbe - kein Teil der L1/L2/L3/N-Teilgraphen
    const [eingangsKreis, ausgangsKreis] = [...gruppenKreise].sort((a, b) => a.cy - b.cy); // kleineres cy = weiter oben = Eingang
    for (const von of eingangsKreis.netze) {
      for (const nach of ausgangsKreis.netze) {
        kanten.push({ von, nach, bauteil, funktion });
      }
    }
  }
  return kanten;
}

function zeigeHilfe() {
  console.error('Aufruf: node tools/pfad_zur_einspeisung.js <testcase> <bauteil> <netz>');
  console.error('Beispiel: node tools/pfad_zur_einspeisung.js testcase_04 LS3 N26');
  console.error('');
  console.error('Oder für eine Endstelle (Drehstromsteckdose, Anschlussdose, Schuko-Steckdose, ...):');
  console.error('Aufruf: node tools/pfad_zur_einspeisung.js <testcase> --endstelle <SK> <funktion>');
  console.error('Beispiel: node tools/pfad_zur_einspeisung.js testcase_05 --endstelle SK1 L1');
}

async function main() {
  const [, , testcase, ...rest] = process.argv;
  if (!testcase) { zeigeHilfe(); process.exit(1); }

  const istEndstelle = rest[0] === '--endstelle';
  const bauteil = istEndstelle ? null : rest[0];
  const netzArgument = istEndstelle ? null : rest[1];
  const [, sk, endstellenFunktion] = istEndstelle ? rest : [];
  if ((istEndstelle && (!sk || !endstellenFunktion)) || (!istEndstelle && (!bauteil || !netzArgument))) {
    zeigeHilfe();
    process.exit(1);
  }

  const anlage = ladeAnlage(testcase);
  let netz = netzArgument;
  let endstellenLabel = null;
  if (istEndstelle) {
    const aufgeloest = ermittleEndstelleNetz(anlage, sk, endstellenFunktion);
    if (!aufgeloest) {
      console.error(`Endstelle "${sk}" mit Funktion "${endstellenFunktion}" in ${testcase} nicht gefunden.`);
      process.exit(1);
    }
    netz = aufgeloest.netz;
    endstellenLabel = aufgeloest.label;
  }

  const graph = ladeGraph(testcase);
  const funktion = findeFunktion(graph, netz);
  if (!funktion) {
    console.error(`Netz "${netz}" nicht im Graphen von ${testcase} gefunden.`);
    process.exit(1);
  }
  const einspeisungsNetz = graph.einspeisung[funktion];

  let graphZeilen = berechneTabelle(graph[funktion].kanten, einspeisungsNetz, netz);
  if (graphZeilen === null) {
    console.error(`Kein Pfad von ${netz} (${funktion}) zur Einspeisung (${einspeisungsNetz}) im Graphen (graph.json) gefunden.`);
    process.exit(1);
  }

  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/index.html?anlage=tests/visuell/${testcase}/anlage.json`);
  await page.waitForSelector('#schraubendreher svg');

  if (!istEndstelle) {
    const hatBauteilNetz = await page.locator(`#schaltkasten svg circle[data-bauteil="${bauteil}"][data-netz="${netz}"]`).count();
    if (hatBauteilNetz === 0) {
      console.error(`WARNUNG: keine Schraube mit data-bauteil="${bauteil}" UND data-netz="${netz}" im gerenderten Schaltkasten gefunden - Bauteilname evtl. falsch (Pfad wird trotzdem über das Netz allein berechnet).`);
    }
  }

  const domKanten = (await ermittleDomKanten(page)).filter((k) => k.funktion === funktion);
  let domZeilen = berechneTabelle(domKanten, einspeisungsNetz, netz);

  await browser.close();
  server.close();

  if (domZeilen === null) {
    console.error(`ABWEICHUNG: Graph findet einen Pfad zur Einspeisung, der gerenderte Schaltkasten aber nicht.`);
    console.error('\nGraph (graph.json):');
    console.error(formatTabelle(graphZeilen));
    process.exit(1);
  }

  // Endstelle hat keine eigene Kante im Graphen (derselbe Netz-Knoten wie
  // die letzte Reihenklemme, siehe Kommentar oben) - die Verbindung dorthin
  // wird deshalb als eigene, identische erste Zeile VOR den eigentlichen
  // Vergleich gehängt (wirkt sich nicht auf die Abweichungserkennung aus,
  // da für beide Tabellen exakt dieselbe Zeile ergänzt wird). `ausgang` ist
  // hier "(Kontakt)" (nichts liegt weiter stromabwärts als die Endstelle
  // selbst), `eingang` ist die Netz-ID - passt zur Kette der übrigen Zeilen
  // (der Eingang EINER Zeile ist immer derselbe Wert wie der Ausgang der
  // nächsten, da beide denselben Knoten teilen).
  if (istEndstelle) {
    const endstellenZeile = { eingang: netz, ausgang: '(Kontakt)', bauteil: endstellenLabel, verzweigung: '–' };
    graphZeilen = [endstellenZeile, ...graphZeilen];
    domZeilen = [endstellenZeile, ...domZeilen];
  }

  if (JSON.stringify(graphZeilen) !== JSON.stringify(domZeilen)) {
    console.error('ABWEICHUNG zwischen Graph und gerendertem Schaltkasten gefunden:');
    console.error('\nGraph (graph.json):');
    console.error(formatTabelle(graphZeilen));
    console.error('\nBrowser (gerenderte Schrauben, headless):');
    console.error(formatTabelle(domZeilen));
    process.exit(1);
  }

  console.log(formatTabelle(graphZeilen));
}

main();
