// Sechstes View-Objekt, neben dem Messgerät (siehe Projekt-Memory
// "Handy-Widget Vision"). Erster Schritt (User-Vorgabe, 2026-08-03): nur der
// Homescreen, rein darstellend, noch keine Interaktivität - Klicks auf die
// Icons (Timer-/Replay-App öffnen) folgen in einem späteren Schritt.
//
// Geometrie 1:1 aus der Vorlage
// C:\Users\rembo\Documents\Classes\Pics\handy.svg übernommen (Inkscape-
// Export, dieselbe Technik wie bei view/schraubendreher.js/view/steckdosen.js).
// Die Vorlage zeichnet mehrere Handy-Zustände nebeneinander (Homescreen +
// beide Apps in verschiedenen Zuständen) - hier wird nur der ERSTE
// (Homescreen, oben rechts in der Vorlage) übernommen.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Interne Koordinaten (= Bounding Box der äußeren Handy-Umrandung in der
// Vorlage, dort mm).
const BREITE = 52.93573;
const HOEHE = 93.401024;
const SCREEN_X = 114.74207;
const SCREEN_BREITE = 48.86375;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export const HandyView = {
  // `anzeigeHoehe`: reale Zielhöhe in px - analog zu SchraubendreherView,
  // damit beide Bauteile derselben Messgerät-Höhe folgen.
  render(container, anzeigeHoehe) {
    const anzeigeBreite = BREITE * (anzeigeHoehe / HOEHE);

    const svg = svgEl('svg', {
      width: anzeigeBreite, height: anzeigeHoehe, viewBox: `0 0 ${BREITE} ${HOEHE}`
    });
    container.innerHTML = '';
    container.appendChild(svg);

    // EIN Pfeil-Marker für die Verbindungslinien im Replay-Icon (die Vorlage
    // hat vier optisch identische Marker-Defs, da Inkscape pro Linie einen
    // eigenen dupliziert - hier bewusst nur einer, wiederverwendet).
    const defs = svgEl('defs');
    const marker = svgEl('marker', {
      id: 'handy-pfeil', overflow: 'visible', refX: 0, refY: 0,
      orient: 'auto-start-reverse', markerWidth: 1, markerHeight: 1, viewBox: '0 0 1 1'
    });
    marker.appendChild(svgEl('path', {
      transform: 'scale(0.5)', fill: '#000000', 'fill-rule': 'evenodd',
      d: 'M 5.77,0 -2.88,5 V -5 Z'
    }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Gruppe mit derselben Verschiebung wie in der Vorlage (Homescreen-
    // Bounding-Box beginnt dort bei x=112.85606, y=4.8840661) - die
    // Koordinaten unten bleiben dadurch 1:1 aus der Vorlage übernehmbar.
    const g = svgEl('g', { transform: 'translate(-112.85606,-4.8840661)' });
    svg.appendChild(g);

    // Äußere Umrandung (dunkelgrau).
    g.appendChild(svgEl('rect', {
      fill: '#333333', width: 52.93573, height: 93.401024,
      x: 112.85606, y: 4.8840661, rx: 6.1079679, ry: 6.6169629
    }));
    // Bildschirm (weiß, Homescreen-Zustand).
    g.appendChild(svgEl('rect', {
      fill: '#ffffff', width: SCREEN_BREITE, height: 89.329048,
      x: SCREEN_X, y: 6.9776216, rx: 4.3264818, ry: 4.835474
    }));

    // Notch/Kamera oben mittig (grauer Ring + schwarzer Punkt).
    g.appendChild(svgEl('circle', { fill: '#999999', cx: 139.083541, cy: 11.325195, r: 2.9267344 }));
    g.appendChild(svgEl('circle', { fill: '#000000', cx: 138.997741, cy: 11.405506, r: 1.2724928 }));

    // Icon-Reihe zentriert im Bildschirm (User-Vorgabe 2026-08-04: "die zwei
    // Apps im Handy alignen") - beide Icons gleich groß (19.341904 x
    // 16.033417, aus der Vorlage übernommen), mit festem Abstand
    // ICON_ABSTAND dazwischen, die gesamte Reihe horizontal im Bildschirm
    // zentriert statt (wie in der Vorlage) links-oben zu kleben.
    const ICON_BREITE = 19.341904;
    const ICON_HOEHE = 16.033417;
    const ICON_ABSTAND = 6;
    const ICON_Y = 17;
    const iconReiheBreite = 2 * ICON_BREITE + ICON_ABSTAND;
    const icon1X = SCREEN_X + (SCREEN_BREITE - iconReiheBreite) / 2;
    const icon2X = icon1X + ICON_BREITE + ICON_ABSTAND;

    // Icon 1: Timer-App (blaues Feld, schwarzer Ring-Pfeil - nimmt optisch
    // den Countdown-Ring der späteren Timer-App-Ansicht vorweg). Ursprünglich
    // in der Vorlage bei x=118.47224/y=17.258389 - Rect + Glyph werden hier
    // gemeinsam um das Delta zur neuen, zentrierten Position verschoben
    // (Glyph-Koordinaten selbst bleiben 1:1 aus der Vorlage).
    const icon1Gruppe = svgEl('g', {
      transform: `translate(${icon1X - 118.47224},${ICON_Y - 17.258389})`
    });
    g.appendChild(icon1Gruppe);
    icon1Gruppe.appendChild(svgEl('rect', {
      fill: '#0082fe', width: ICON_BREITE, height: ICON_HOEHE,
      x: 118.47224, y: 17.258389, rx: 3.5629842, ry: 4.3264704
    }));
    icon1Gruppe.appendChild(svgEl('path', {
      fill: 'none', stroke: '#000000', 'stroke-width': 2.156,
      d: 'm 128.11286,21.111819 a 3.9447436,3.944757 0 0 1 3.81513,3.05879 3.9447436,3.944757 0 0 1 -2.09162,4.420022 3.9447436,3.944757 0 0 1 -4.78435,-1.010638 3.9447436,3.944757 0 0 1 -0.12535,-4.888332'
    }));

    // Icon 2: Replay-App (weißes Feld mit schwarzer Umrandung, Pfad aus vier
    // Knoten - Sinnbild für den Fahrplan als Route durch mehrere Messpunkte).
    // Ursprünglich bei x=140.75536/y=16.049719 - analog um dasselbe Delta-
    // Prinzip verschoben.
    const icon2Gruppe = svgEl('g', {
      transform: `translate(${icon2X - 140.75536},${ICON_Y - 16.049719})`
    });
    g.appendChild(icon2Gruppe);
    icon2Gruppe.appendChild(svgEl('rect', {
      fill: 'none', stroke: '#000000', 'stroke-width': 0.356001,
      width: ICON_BREITE, height: ICON_HOEHE, x: 140.75536, y: 16.049719,
      rx: 3.5629842, ry: 4.3264704
    }));
    const replayGlyph = svgEl('g', {
      transform: 'matrix(0.40532927,0,0,0.46461668,134.41133,-51.949226)'
    });
    icon2Gruppe.appendChild(replayGlyph);
    const knotenPfade = [
      'm 22.824346,151.62702 a 4.0719795,4.0719795 0 0 1 5.694765,-0.56722 4.0719795,4.0719795 0 0 1 0.637578,5.68732 4.0719795,4.0719795 0 0 1 -5.679002,0.70783 4.0719795,4.0719795 0 0 1 -0.777984,-5.66982 l 3.259165,2.44108 z',
      'm 39.237231,151.7671 a 4.0719795,4.0719795 0 0 1 5.694765,-0.56723 4.0719795,4.0719795 0 0 1 0.637579,5.68732 4.0719795,4.0719795 0 0 1 -5.679002,0.70784 4.0719795,4.0719795 0 0 1 -0.777984,-5.66982 l 3.259165,2.44108 z',
      'm 53.197261,162.95017 a 4.0719795,4.0719795 0 0 1 5.694765,-0.56722 4.0719795,4.0719795 0 0 1 0.637578,5.68732 4.0719795,4.0719795 0 0 1 -5.679001,0.70783 4.0719795,4.0719795 0 0 1 -0.777985,-5.66982 l 3.259165,2.44108 z',
      'm 40.245696,172.47994 a 4.0719795,4.0719795 0 0 1 5.694765,-0.56722 4.0719795,4.0719795 0 0 1 0.637579,5.68732 4.0719795,4.0719795 0 0 1 -5.679002,0.70783 4.0719795,4.0719795 0 0 1 -0.777985,-5.66982 l 3.259166,2.44108 z',
      'm 23.738301,172.06942 a 4.0719795,4.0719795 0 0 1 5.694765,-0.56722 4.0719795,4.0719795 0 0 1 0.637579,5.68731 4.0719795,4.0719795 0 0 1 -5.679002,0.70784 4.0719795,4.0719795 0 0 1 -0.777984,-5.66982 l 3.259165,2.44108 z'
    ];
    for (const d of knotenPfade) {
      replayGlyph.appendChild(svgEl('path', { fill: '#000a00', stroke: '#000000', 'stroke-width': 0.820349, d }));
    }
    const kantenPfade = [
      'M 23.159384,154.22622 H 37.14079',
      'M 42.844714,174.69719 H 32.457674',
      'm 42.873616,152.66167 10.043913,9.72622',
      'm 54.271566,166.65435 -6.174883,5.16627'
    ];
    for (const d of kantenPfade) {
      replayGlyph.appendChild(svgEl('path', {
        fill: '#000a00', stroke: '#000000', 'stroke-width': 1.05078,
        'marker-end': 'url(#handy-pfeil)', d
      }));
    }

    return { svg };
  }
};
