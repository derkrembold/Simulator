// Viertes View-Objekt, oberhalb des Schaltkastens: zeichnet Steckdosen und
// Anschlussdosen (3 Steckklemmen, für Lichtauslass-Endstellen) im Raster, wie
// in der "## Steckdosen (Platzierung)"-Tabelle in bauteile.md festgelegt
// (geparst von generate_anlage.js -> anlage.steckdosen_platzierung). Die
// Kontaktpunkte (graue Kreise/Vierecke) sind klickbar wie eine
// Reihenklemmen-Schraube - `sk.leitung.adern` aus anlage.json trägt bereits
// dieselben Netz-IDs wie die Endstelle_SKx-Knoten im Verbindungsgraphen,
// keine eigene Datenquelle nötig. Der Klick-Callback wird 1:1 mit dem
// Schaltkasten geteilt (siehe controller/app.js onSchraubeKlick) - Popup bei
// ausgeschaltetem, Messspitzen bei eingeschaltetem Messgerät.
//
// Geometrie 1:1 aus den finalisierten Vorlagen docs/referenz/steckdose_vorlage.svg
// und docs/referenz/anschlussdose_vorlage.svg übernommen (dort mit Playwright
// exakt vermessen) - alle Maße in mm, relativ zum jeweiligen Gerätezentrum.

const SVG_NS = 'http://www.w3.org/2000/svg';

// 1mm = 2px, wie Schaltkasten/Messgerät (siehe docs/KONZEPT.md "Maßstab").
const MM = 2;

// Rastergröße pro Platzierungs-Zelle - deckt die größere der beiden Vorlagen
// (Steckdose, äußerer Rahmen ca. 79x76mm) plus Abstand zur nächsten Zelle.
const ZELLE_MM = 95;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

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

// `sk.leitung.adern` (aus anlage.json) trägt bereits dieselben Netz-IDs wie
// die Endstelle_SKx-Knoten im Verbindungsgraphen (siehe netzplan.md) - keine
// eigene Datenquelle für die Steckdosen-Kontakte nötig.
function findeAder(adern, funktion) {
  return adern?.find((a) => (funktion === 'L' ? a.funktion.startsWith('L') : a.funktion === funktion)) ?? null;
}

// Macht ein SVG-Element (Kreis oder Rechteck) klickbar wie eine
// Reihenklemmen-Schraube (siehe view/schaltkasten.js schraube()) - ruft
// `onKlick(ader, clientX, clientY, element)` auf. Ohne `ader` (z.B. Endstelle
// ohne passende Funktion) bleibt das Element unklickbar.
function klickbar(el, ader, onKlick) {
  if (!ader || !onKlick) return el;
  el.style.cursor = 'pointer';
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onKlick(ader, ev.clientX, ev.clientY, el);
  });
  return el;
}

// --- Steckdose (Vorlage: docs/referenz/steckdose_vorlage.svg) ---

// Kontakt-Kerbe: eine Geometrie (oben links, relativ zum Gerätezentrum) plus
// Vorzeichen-Spiegelung für die anderen drei Ecken - siehe die <use>-Spiegelung
// in der Vorlage.
const NOTCH_DX = -20.668766, NOTCH_DY = -3.038159, NOTCH_H = 3.154004, NOTCH_V = -8.163306;

function zeichneSteckdose(svg, cx, cy, rotationGrad, adern, onSchraubeKlick) {
  const g = svgEl('g', { transform: `rotate(${rotationGrad}, ${cx}, ${cy})` });

  g.appendChild(svgEl('rect', {
    x: cx - 79.406654 * MM / 2, y: cy - 76.067119 * MM / 2,
    width: 79.406654 * MM, height: 76.067119 * MM, rx: 3.6 * MM,
    fill: 'none', stroke: '#000000', 'stroke-width': 1.05648
  }));
  g.appendChild(svgEl('rect', {
    x: cx - 55.102277 * MM / 2, y: cy - 53.223653 * MM / 2,
    width: 55.102277 * MM, height: 53.223653 * MM, rx: 2.7 * MM,
    fill: 'none', stroke: '#000000', 'stroke-width': 1.05648
  }));
  g.appendChild(svgEl('circle', {
    cx, cy, r: 21.057603 * MM, fill: 'none', stroke: '#000000', 'stroke-width': 1.05648
  }));

  for (const mx of [1, -1]) {
    for (const my of [1, -1]) {
      g.appendChild(svgEl('path', {
        d: `M ${cx + mx * NOTCH_DX * MM} ${cy + my * NOTCH_DY * MM} `
          + `h ${mx * NOTCH_H * MM} v ${my * NOTCH_V * MM}`,
        fill: 'none', stroke: '#000000', 'stroke-width': 1.05648
      }));
    }
  }

  // L/N-Kontaktkreise: r=2mm, derselbe reale Radius wie die
  // Reihenklemmen-Schraube (siehe view/schaltkasten.js schraube()).
  const lAder = findeAder(adern, 'L');
  const nAder = findeAder(adern, 'N');
  const peAder = findeAder(adern, 'PE');
  g.appendChild(klickbar(svgEl('circle', { cx: cx - 8.909838 * MM, cy, r: 2 * MM, fill: '#666666' }), lAder, onSchraubeKlick));
  g.appendChild(klickbar(svgEl('circle', { cx: cx + 8.909838 * MM, cy, r: 2 * MM, fill: '#666666' }), nAder, onSchraubeKlick));

  // PE-Kontakte (zwei Vierecke oben/unten) - dieselbe Ader/Netz-ID an beiden,
  // physisch derselbe PE-Punkt.
  const peY = 17.5995185 * MM;
  const peW = 2.267583 * MM, peH = 7.833471 * MM;
  g.appendChild(klickbar(svgEl('rect', { x: cx - peW / 2, y: cy - peY - peH / 2, width: peW, height: peH, fill: '#666666' }), peAder, onSchraubeKlick));
  g.appendChild(klickbar(svgEl('rect', { x: cx - peW / 2, y: cy + peY - peH / 2, width: peW, height: peH, fill: '#666666' }), peAder, onSchraubeKlick));

  svg.appendChild(g);
}

// --- Anschlussdose mit drei Steckklemmen (Vorlage:
// docs/referenz/anschlussdose_vorlage.svg) - für Lichtauslass-Endstellen. ---

const BLOCK_RADIUS_MM = 15.369092; // Abstand jeder Steckklemme vom Dosen-Zentrum
const BLOCK_BOX_W = 14.333682, BLOCK_BOX_H = 7.000174;
const BLOCK_GREY_DX = -3.147765, BLOCK_GREY_DY = 0.044551; // Messspitzen-Kontakt (grau)
const BLOCK_COLOR_DX = 3.09518, BLOCK_COLOR_DY = 0.182761; // Funktions-Kennzeichnung
const BLOCK_CAP_W = 5.666803, BLOCK_CAP_H = 1.500032;
const BLOCK_CAP1_DX = -3.66705, BLOCK_CAP1_DY = -4.250347;
const BLOCK_CAP2_DX = 3.30435, BLOCK_CAP2_DY = -4.250347;

// Winkel/Farbe je Funktion, siehe die symmetrische 120°-Anordnung in der
// Vorlage (oben=N/blau bei -90°, unten rechts=L/schwarz bei 30°, unten
// links=PE/grün bei 150°).
const KLEMMEN = [
  { funktion: 'N', winkelGrad: -90, farbe: '#0000ff' },
  { funktion: 'L', winkelGrad: 30, farbe: '#000000' },
  { funktion: 'PE', winkelGrad: 150, farbe: '#44aa00' }
];

function zeichneWagoKlemme(g, bcx, bcy, farbe, ader, onSchraubeKlick) {
  g.appendChild(svgEl('rect', {
    x: bcx - BLOCK_BOX_W * MM / 2, y: bcy - BLOCK_BOX_H * MM / 2,
    width: BLOCK_BOX_W * MM, height: BLOCK_BOX_H * MM, fill: '#ececec'
  }));
  g.appendChild(svgEl('rect', {
    x: bcx + BLOCK_CAP1_DX * MM - BLOCK_CAP_W * MM / 2, y: bcy + BLOCK_CAP1_DY * MM - BLOCK_CAP_H * MM / 2,
    width: BLOCK_CAP_W * MM, height: BLOCK_CAP_H * MM, fill: '#ff7f2a'
  }));
  g.appendChild(svgEl('rect', {
    x: bcx + BLOCK_CAP2_DX * MM - BLOCK_CAP_W * MM / 2, y: bcy + BLOCK_CAP2_DY * MM - BLOCK_CAP_H * MM / 2,
    width: BLOCK_CAP_W * MM, height: BLOCK_CAP_H * MM, fill: '#ff7f2a'
  }));
  // Messspitzen-Kontakt (grau) - r=2mm, derselbe reale Radius wie die
  // Reihenklemmen-Schraube. Der farbige Kreis daneben ist nur eine
  // Funktions-Kennzeichnung, kein eigener Kontakt - nicht klickbar.
  g.appendChild(klickbar(svgEl('circle', { cx: bcx + BLOCK_GREY_DX * MM, cy: bcy + BLOCK_GREY_DY * MM, r: 2 * MM, fill: '#666666' }), ader, onSchraubeKlick));
  g.appendChild(svgEl('circle', { cx: bcx + BLOCK_COLOR_DX * MM, cy: bcy + BLOCK_COLOR_DY * MM, r: 2 * MM, fill: farbe }));
}

function zeichneAnschlussdose(svg, cx, cy, rotationGrad, adern, onSchraubeKlick) {
  const g = svgEl('g', { transform: `rotate(${rotationGrad}, ${cx}, ${cy})` });

  g.appendChild(svgEl('circle', { cx, cy, r: 31.084093 * MM, fill: 'none', stroke: '#000000', 'stroke-width': 1.05648 }));
  g.appendChild(svgEl('circle', { cx, cy, r: 32.500786 * MM, fill: 'none', stroke: '#000000', 'stroke-width': 1.05648 }));

  for (const { funktion, winkelGrad, farbe } of KLEMMEN) {
    const rad = winkelGrad * Math.PI / 180;
    const bcx = cx + BLOCK_RADIUS_MM * MM * Math.cos(rad);
    const bcy = cy + BLOCK_RADIUS_MM * MM * Math.sin(rad);
    zeichneWagoKlemme(g, bcx, bcy, farbe, findeAder(adern, funktion), onSchraubeKlick);
  }

  svg.appendChild(g);
}

// Rahmen um die Geräte: doppelte Umrandung im selben Look wie die äußere Box
// des Schaltkastens (siehe view/schaltkasten.js SchaltkastenView.render()) -
// Außenrahmen leichtes Grau, Innenrahmen liegt direkt an der weißen
// Gerätefläche an (kein zusätzlicher grauer Rand dazwischen).
const RAHMEN_INSET = 8;

export const SteckdosenView = {
  render(container, breitePx, anlage, onSchraubeKlick) {
    const platzierung = anlage.steckdosen_platzierung ?? [];
    container.innerHTML = '';

    // Kein Raster hinterlegt (z.B. die handgepflegte beispiel_eg.json ohne
    // bauteile.md) -> View-Objekt bleibt unsichtbar, kein Fehlerfall.
    if (platzierung.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    const maxRow = Math.max(...platzierung.map((p) => p.row));
    const maxCol = Math.max(...platzierung.map((p) => p.col));
    const zellePx = ZELLE_MM * MM;
    const inhaltBreite = (maxCol + 1) * zellePx;
    const inhaltHoehe = (maxRow + 1) * zellePx;

    // Breite exakt wie der Schaltkasten (von controller/app.js durchgereicht,
    // wie schon bei Messgerät/Protokoll) - Höhe wächst mit dem Raster.
    const gesamtBreite = Number(breitePx);
    const gesamtHoehe = inhaltHoehe + 2 * RAHMEN_INSET;

    const svg = svgEl('svg', {
      width: gesamtBreite, height: gesamtHoehe, viewBox: `0 0 ${gesamtBreite} ${gesamtHoehe}`
    });
    container.appendChild(svg);

    // Äußere Rahmenlinie, leichtes Grau.
    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: gesamtBreite, height: gesamtHoehe,
      rx: 6, fill: '#eeeeee', stroke: '#888888', 'stroke-width': 2
    }));
    // Innere Rahmenlinie liegt DIREKT an der weißen Gerätefläche an - kein
    // grauer Rand mehr dazwischen, Füllung ist deshalb bereits weiß statt
    // grau (anders als noch in der vorherigen Fassung).
    svg.appendChild(svgEl('rect', {
      x: RAHMEN_INSET, y: RAHMEN_INSET, width: gesamtBreite - 2 * RAHMEN_INSET, height: gesamtHoehe - 2 * RAHMEN_INSET,
      rx: 4, fill: '#ffffff', stroke: '#bbbbbb', 'stroke-width': 1.5
    }));

    // Raster horizontal mittig in der weißen Fläche platziert.
    const inhaltX = RAHMEN_INSET + (gesamtBreite - 2 * RAHMEN_INSET - inhaltBreite) / 2;
    const g = svgEl('g', { transform: `translate(${inhaltX}, ${RAHMEN_INSET})` });
    svg.appendChild(g);

    for (const platz of platzierung) {
      const cx = platz.col * zellePx + zellePx / 2;
      const cy = platz.row * zellePx + zellePx / 2;
      const stromkreis = findeStromkreis(anlage, platz.sk);
      const adern = stromkreis?.leitung?.adern;
      if (stromkreis?.endstelle === 'Steckdose') {
        zeichneSteckdose(g, cx, cy, platz.rotation, adern, onSchraubeKlick);
      } else {
        // Lichtauslass (und alle anderen, noch nicht eigens gezeichneten
        // Endstellen-Typen) -> Anschlussdose mit drei Steckklemmen.
        zeichneAnschlussdose(g, cx, cy, platz.rotation, adern, onSchraubeKlick);
      }
    }
  }
};
