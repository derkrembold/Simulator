// Fünftes View-Objekt, neben dem Messgerät (siehe KONZEPT.md "Schrauben
// lösen" / Projekt-Memory "Schrauben lösen Idee"). Klickbar, um es
// "aufzunehmen" (siehe controller/app.js) - Schrauben lösen/wieder
// eindrehen folgt in einem späteren Schritt.
//
// Geometrie 1:1 aus der Vorlage
// C:\Users\rembo\Documents\Classes\Pics\schraubendreher-1.svg übernommen
// (Inkscape-Export, ein Pfad + sechs Rechtecke in einer gemeinsamen Gruppe
// mit Verschiebung) - dieselbe Technik wie bei den Steckdosen-Vorlagen
// (siehe view/steckdosen.js).

const SVG_NS = 'http://www.w3.org/2000/svg';

// Interne Koordinaten (= die viewBox-Einheiten der Vorlage, dort mm).
const BREITE = 19.380453;
const HOEHE = 143.24223;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const GRIFF_PFAD = 'm 96.20033,110.96119 c -0.986946,0 -1.781287,0.79485 -1.781287,1.7818 v 7.46311 a 21.75964,29.394602 0 0 1 0,19.18901 v 28.85767 a 7.8484478,7.889173 0 0 1 0,6.62233 v 3.01946 c 0,0.98694 0.794341,1.78128 1.781287,1.78128 h 14.76086 c 0.98694,0 1.7818,-0.79434 1.7818,-1.78128 v -2.40296 a 8.015192,7.889173 0 0 1 0,-6.90965 v -27.36112 a 17.533375,28.122091 0 0 1 0,-21.02353 v -7.45432 c 0,-0.98695 -0.79486,-1.7818 -1.7818,-1.7818 z';

// Gestrichelte Ablage-Silhouette als Data-URI-SVG für <img> in einem <button>:
// so bleibt `#schraubendreher svg` im aufgenommenen Zustand frei, damit
// Replay/Werkzeuge (`#schraubendreher svg g` bzw. `#schraubendreher svg`) ein
// bereits aufgenommenes Werkzeug nicht versehentlich wieder ablegen (sim-as0).
const SILHOUETTE_SVG_URI = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="${SVG_NS}" viewBox="0 0 ${BREITE} ${HOEHE}">`
  + `<g transform="translate(-93.890768,-37.049365)" fill="rgba(225,85,23,0.08)" stroke="#888888" stroke-width="1" stroke-dasharray="3.5 2.5">`
  + `<path d="${GRIFF_PFAD}"/>`
  + '<rect width="7.1259632" height="43.773781" x="100.33904" y="67.703255" rx="1.5269923" ry="1.5269923"/>'
  + '<rect width="5.8534703" height="30.539846" x="101.036" y="37.197151"/>'
  + '</g></svg>'
);

export const SchraubendreherView = {
  // `anzeigeHoehe`: reale Zielhöhe in px - soll der Höhe des Messgeräts
  // entsprechen (siehe controller/app.js, liest dafür die tatsächlich
  // gerenderte Messgerät-SVG-Höhe aus dem DOM, analog zur bereits
  // bestehenden Breiten-Angleichung zwischen Schaltkasten und Messgerät).
  // `onKlick` (optional): macht die ganze Zeichnung klickbar (Werkzeug
  // "aufnehmen" bzw. bei `aufgenommen: true` wieder ablegen).
  render(container, anzeigeHoehe, { onKlick, aufgenommen = false } = {}) {
    const anzeigeBreite = BREITE * (anzeigeHoehe / HOEHE);
    container.innerHTML = '';

    if (aufgenommen) {
      const ablage = document.createElement('button');
      ablage.type = 'button';
      ablage.className = 'schraubendreher-ablage';
      ablage.dataset.zustand = 'aufgenommen';
      ablage.title = 'Klick oder Esc zum Ablegen';
      ablage.setAttribute('aria-label', 'Schraubendreher ablegen');
      if (onKlick) ablage.addEventListener('click', onKlick);

      const bild = document.createElement('img');
      bild.src = SILHOUETTE_SVG_URI;
      bild.width = anzeigeBreite;
      bild.height = anzeigeHoehe;
      bild.alt = '';
      bild.draggable = false;
      ablage.appendChild(bild);
      container.appendChild(ablage);
      return { svg: null, ablage };
    }

    const svg = svgEl('svg', {
      width: anzeigeBreite,
      height: anzeigeHoehe,
      viewBox: `0 0 ${BREITE} ${HOEHE}`,
      'data-zustand': 'abgelegt',
      'aria-label': 'Schraubendreher aufnehmen'
    });
    const titel = svgEl('title', {});
    titel.textContent = 'Schraubendreher aufnehmen';
    svg.appendChild(titel);
    container.appendChild(svg);

    // Gruppe mit derselben Verschiebung wie in der Vorlage - die
    // Pfad-/Rechteck-Koordinaten unten bleiben dadurch unverändert
    // übernehmbar, ohne sie einzeln in den 0..BREITE/0..HOEHE-Bereich
    // umzurechnen.
    const g = svgEl('g', {
      transform: 'translate(-93.890768,-37.049365)',
      style: onKlick ? 'cursor:pointer' : ''
    });
    if (onKlick) g.addEventListener('click', onKlick);
    svg.appendChild(g);

    // Griff (orange).
    g.appendChild(svgEl('path', {
      fill: '#e15517', stroke: '#e15517', 'stroke-width': 1.05648,
      d: GRIFF_PFAD
    }));
    // Schaft (orange).
    g.appendChild(svgEl('rect', {
      fill: '#e15517', stroke: '#e15517', 'stroke-width': 1.05648,
      width: 7.1259632, height: 43.773781, x: 100.33904, y: 67.703255, rx: 1.5269923, ry: 1.5269923
    }));
    // Klinge (grau).
    g.appendChild(svgEl('rect', {
      fill: '#999999', width: 5.8534703, height: 30.539846, x: 101.036, y: 37.197151
    }));
    // Spitze (drei dunkle Striche).
    g.appendChild(svgEl('rect', {
      fill: '#333333', width: 0.76349604, height: 5.5989723, x: 103.59566, y: 37.049366
    }));
    g.appendChild(svgEl('rect', {
      fill: '#333333', width: 0.76349604, height: 5.5989723, x: 106.23966, y: 37.06477
    }));
    g.appendChild(svgEl('rect', {
      fill: '#333333', width: 0.76349604, height: 5.5989723, x: 101.00723, y: 37.166172
    }));
    // Griffring, oberer Teil (gelb).
    g.appendChild(svgEl('rect', {
      fill: '#f7b500', stroke: '#f7b500', 'stroke-width': 1.05648,
      width: 18.323906, height: 7.6349602, x: 94.419014, y: 110.70694, rx: 1.2724936, ry: 1.2724936
    }));
    // Griffring, unterer Teil (gelb).
    g.appendChild(svgEl('rect', {
      fill: '#f7b500', stroke: '#f7b500', 'stroke-width': 1.05648,
      width: 7.8894587, height: 26.213366, x: 99.633675, y: 153.54999, rx: 2.0359898, ry: 2.0359898
    }));

    return { svg };
  }
};
