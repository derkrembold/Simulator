const SVG_NS = 'http://www.w3.org/2000/svg';

const TE_PX = 36;
const GERAET_H = 180;
const HEADER_H = 20;
const RK_BREITE = 12;
const RK_HOEHE = 98;
const KLEMME_BREITE = 24;
const REIHENABSTAND = 250;
const HUTSCHIENE_HOEHE = 70;
const HUTSCHIENE_LAENGE = 600;
const KASTEN_PADDING = 20;

const FARBEN = {
  ls: { gehaeuse: '#e0e0e0', header: '#aaaaaa' },
  rcd: { gehaeuse: '#e0e0e0', header: '#aaaaaa' },
  hauptschalter: { gehaeuse: '#444444', header: '#222222', text: '#ffffff' },
  reihenklemme_l: '#aaaaaa',
  reihenklemme_n: '#4466cc',
  reihenklemme_pe: '#44aa44',
  l_klemme: { gehaeuse: '#aaaaaa', header: '#666666' },
  n_klemme: { gehaeuse: '#4466cc', header: '#224499' },
  pe_klemme: { gehaeuse: '#44aa44', header: '#227722' },
  hutschiene: '#a0a0a0'
};

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Vertikale Mittellinie der Hutschiene der Reihe i (0 = Reihenklemmen, 1..n = Gruppen, letzte = Hauptschalter)
function reihenMitteY(i) {
  return 90 + i * REIHENABSTAND;
}

function zeichneHutschiene(svg, reihenIndex) {
  const mitteY = reihenMitteY(reihenIndex);
  svg.appendChild(svgEl('rect', {
    x: 0, y: mitteY - HUTSCHIENE_HOEHE / 2,
    width: HUTSCHIENE_LAENGE, height: HUTSCHIENE_HOEHE,
    fill: FARBEN.hutschiene
  }));
}

function schraube(svg, x, y, ader, onKlick) {
  const attrs = { cx: x, cy: y, r: 4, fill: '#888888' };
  if (ader) {
    attrs['data-querschnitt'] = ader.querschnitt_mm2;
    attrs['data-farbe'] = ader.farbe;
  }
  const kreis = svgEl('circle', attrs);
  if (ader) {
    kreis.style.cursor = 'pointer';
    kreis.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onKlick(ader, ev.clientX, ev.clientY);
    });
  }
  svg.appendChild(kreis);
}

function geraet(svg, { x, y, teAnzahl, farben, label, adernEingang, adernAusgang, onSchraubeKlick }) {
  const breite = teAnzahl * TE_PX;
  svg.appendChild(svgEl('rect', { x, y, width: breite, height: GERAET_H, fill: farben.gehaeuse, stroke: '#555555', 'stroke-width': 1 }));
  svg.appendChild(svgEl('rect', { x, y, width: breite, height: HEADER_H, fill: farben.header }));

  const text = svgEl('text', {
    x: x + breite / 2, y: y + GERAET_H / 2 + 3,
    'text-anchor': 'middle', 'font-size': 9, fill: farben.text ?? '#000000'
  });
  text.textContent = label;
  svg.appendChild(text);

  for (let i = 0; i < teAnzahl; i++) {
    const cx = x + i * TE_PX + TE_PX / 2;
    schraube(svg, cx, y + 10, adernEingang?.[i], onSchraubeKlick);
    schraube(svg, cx, y + GERAET_H - 10, adernAusgang?.[i], onSchraubeKlick);
  }
  return breite;
}

function klemme(svg, { x, y, breite, hoehe, farben, aderEingang, aderAusgang, onSchraubeKlick }) {
  svg.appendChild(svgEl('rect', { x, y, width: breite, height: hoehe, fill: farben.gehaeuse, stroke: '#555555', 'stroke-width': 1 }));
  if (farben.header) {
    svg.appendChild(svgEl('rect', { x, y, width: breite, height: 10, fill: farben.header }));
  }
  const cx = x + breite / 2;
  schraube(svg, cx, y + 8, aderEingang, onSchraubeKlick);
  schraube(svg, cx, y + hoehe - 8, aderAusgang, onSchraubeKlick);
}

function findeAder(adern, funktion) {
  return adern?.find((a) => a.funktion === funktion);
}

export const SchaltkastenView = {
  render(anlage, container, onSchraubeKlick) {
    const svg = svgEl('svg', {});
    container.innerHTML = '';
    container.appendChild(svg);

    const letzteReihenIndex = anlage.hutschienen.length + 1;
    const inhaltBreite = HUTSCHIENE_LAENGE;
    const inhaltHoehe = reihenMitteY(letzteReihenIndex) + GERAET_H / 2;
    const gesamtBreite = inhaltBreite + 2 * KASTEN_PADDING;
    const gesamtHoehe = inhaltHoehe + 2 * KASTEN_PADDING;

    const kasten = svgEl('rect', {
      x: 0, y: 0, width: gesamtBreite, height: gesamtHoehe,
      rx: 6, fill: '#cccccc', stroke: '#888888', 'stroke-width': 2
    });
    svg.appendChild(kasten);

    const innenRand = svgEl('rect', {
      x: 8, y: 8, width: gesamtBreite - 16, height: gesamtHoehe - 16,
      rx: 4, fill: '#e5e5e5', stroke: '#bbbbbb', 'stroke-width': 1.5
    });
    svg.appendChild(innenRand);

    const g = svgEl('g', { transform: `translate(${KASTEN_PADDING}, ${KASTEN_PADDING})` });
    svg.appendChild(g);

    // Reihe 1: Reihenklemmen pro Stromkreis (L + N + PE)
    const reihe1Y = reihenMitteY(0) - RK_HOEHE / 2;
    zeichneHutschiene(g, 0);
    let x = 0;
    for (const hutschiene of anlage.hutschienen) {
      for (const gruppe of hutschiene.gruppen) {
        for (const sk of gruppe.stromkreise) {
          // Ausgangsseite (zur Endstelle) kommt aus sk.leitung - immer vorhanden.
          const adern = sk.leitung?.adern ?? [];
          const lAusgang = adern.find((a) => a.funktion.startsWith('L'));
          const nAusgang = findeAder(adern, 'N');
          const peAusgang = findeAder(adern, 'PE');

          // Eingangsseite kann abweichen (z.B. PE-Reihenklemme ohne eigenes
          // Zubringerkabel, siehe reihenklemmen_eingang in generate_anlage.js).
          // Fehlt das Feld ganz (ältere/handgeschriebene anlage.json ohne
          // Netzplan-Ursprung), auf die Ausgangsseite zurückfallen.
          const eingang = sk.reihenklemmen_eingang;
          const lEingang = eingang ? eingang.l : lAusgang;
          const nEingang = eingang ? eingang.n : nAusgang;
          const peEingang = eingang ? eingang.pe : peAusgang;

          klemme(g, { x, y: reihe1Y, breite: RK_BREITE, hoehe: RK_HOEHE, farben: { gehaeuse: FARBEN.reihenklemme_l }, aderEingang: lEingang, aderAusgang: lAusgang, onSchraubeKlick });
          x += RK_BREITE;
          klemme(g, { x, y: reihe1Y, breite: RK_BREITE, hoehe: RK_HOEHE, farben: { gehaeuse: FARBEN.reihenklemme_n }, aderEingang: nEingang, aderAusgang: nAusgang, onSchraubeKlick });
          x += RK_BREITE;
          klemme(g, { x, y: reihe1Y, breite: RK_BREITE, hoehe: RK_HOEHE, farben: { gehaeuse: FARBEN.reihenklemme_pe }, aderEingang: peEingang, aderAusgang: peAusgang, onSchraubeKlick });
          x += RK_BREITE;
        }
      }
    }

    // Reihe 2..n: pro Hutschiene alle ihre Gruppen (RCD + LS) nebeneinander
    anlage.hutschienen.forEach((hutschiene, i) => {
      const reihenIndex = i + 1;
      const rowY = reihenMitteY(reihenIndex) - GERAET_H / 2;
      zeichneHutschiene(g, reihenIndex);
      let gx = 0;
      for (const gruppe of hutschiene.gruppen) {
        if (gruppe.rcd) {
          gx += geraet(g, {
            x: gx, y: rowY, teAnzahl: gruppe.rcd.te, farben: FARBEN.rcd,
            label: `${gruppe.rcd.typ} ${gruppe.rcd.in_ma}mA`,
            adernEingang: gruppe.rcd.eingang.leitung.adern,
            adernAusgang: gruppe.rcd.ausgang.leitung.adern,
            onSchraubeKlick
          });
        }
        for (const sk of gruppe.stromkreise) {
          const ls = sk.ls;
          gx += geraet(g, {
            x: gx, y: rowY, teAnzahl: ls.te, farben: FARBEN.ls,
            label: `${ls.char}${ls.in}`,
            adernEingang: ls.eingang.leitung.adern,
            adernAusgang: ls.ausgang.leitung.adern,
            onSchraubeKlick
          });
        }
      }
    });

    // Letzte Reihe: Hauptsicherung + L-Klemme + N-Klemme + PE-Klemme
    const letzteY = reihenMitteY(letzteReihenIndex) - GERAET_H / 2;
    const letzteKlemmeY = reihenMitteY(letzteReihenIndex) - RK_HOEHE / 2;
    zeichneHutschiene(g, letzteReihenIndex);
    const hs = anlage.hauptsicherung;
    let hx = geraet(g, {
      x: 0, y: letzteY, teAnzahl: hs.te, farben: FARBEN.hauptschalter,
      label: `${hs.in}A`,
      adernEingang: hs.eingang.leitung.adern,
      adernAusgang: hs.ausgang.leitung.adern,
      onSchraubeKlick
    });
    for (const feld of ['l1_klemme', 'l2_klemme', 'l3_klemme']) {
      if (anlage[feld]) {
        klemme(g, {
          x: hx, y: letzteKlemmeY, breite: KLEMME_BREITE, hoehe: RK_HOEHE, farben: FARBEN.l_klemme,
          aderEingang: anlage[feld].eingang.leitung.adern[0],
          aderAusgang: anlage[feld].ausgang.leitung.adern[0],
          onSchraubeKlick
        });
        hx += KLEMME_BREITE;
      }
    }
    if (anlage.l_klemme) {
      klemme(g, {
        x: hx, y: letzteKlemmeY, breite: KLEMME_BREITE, hoehe: RK_HOEHE, farben: FARBEN.l_klemme,
        aderEingang: anlage.l_klemme.eingang.leitung.adern[0],
        aderAusgang: anlage.l_klemme.ausgang.leitung.adern[0],
        onSchraubeKlick
      });
      hx += KLEMME_BREITE;
    }
    if (anlage.n_klemme) {
      klemme(g, {
        x: hx, y: letzteKlemmeY, breite: KLEMME_BREITE, hoehe: RK_HOEHE, farben: FARBEN.n_klemme,
        aderEingang: anlage.n_klemme.eingang.leitung.adern[0],
        aderAusgang: anlage.n_klemme.ausgang.leitung.adern[0],
        onSchraubeKlick
      });
      hx += KLEMME_BREITE;
    }
    if (anlage.pe_klemme) {
      klemme(g, {
        x: hx, y: letzteKlemmeY, breite: KLEMME_BREITE, hoehe: RK_HOEHE, farben: FARBEN.pe_klemme,
        aderEingang: anlage.pe_klemme.eingang.leitung.adern[0],
        aderAusgang: anlage.pe_klemme.ausgang.leitung.adern[0],
        onSchraubeKlick
      });
      hx += KLEMME_BREITE;
    }

    svg.setAttribute('width', gesamtBreite);
    svg.setAttribute('height', gesamtHoehe);
    svg.setAttribute('viewBox', `0 0 ${gesamtBreite} ${gesamtHoehe}`);

    return svg;
  }
};
