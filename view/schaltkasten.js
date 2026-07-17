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

// Schalter-Symbol (LS/RCD/Leistungsschalter, siehe KONZEPT.md "Schalter") -
// aktuell nur eine leere, feste Box (Inhalt/Klick-Verhalten wird gerade neu
// entworfen, siehe zeichneSchalter()). W = Basisbreite beim 1-poligen LS;
// Leistungsschalter/LS skalieren linear mit der Polzahl (TE = Polzahl bei
// diesen Typen, siehe TE_TABELLE in generate_anlage.js) plus einen kleinen
// Zusatz ab 3 Polen (rein optisch, der 1- und 2-polige Fall bleiben exakt wie
// bisher). RCD: linker Rand bleibt fest (SCHALTER_RCD_RAND_LINKS), der rechte
// Rand ist ebenfalls fest statt proportional zur Polzahl zu wachsen - dadurch
// bleibt der 2-polige Fall exakt wie bisher (Breite = W), während der
// 4-polige Fall breiter wird als die ursprüngliche (Polzahl-1)*W-Formel.
const SCHALTER_BASISBREITE = 24;
const SCHALTER_HOEHE = 36;
const SCHALTER_RCD_RAND_LINKS = 8;
const SCHALTER_RCD_RAND_RECHTS = 40;
const SCHALTER_ZUSATZ_PRO_POL_AB_3 = 6;
// Hebel (Balken + Riffelung, siehe docs/referenz/hebel_beispiel_*.svg): eigener
// Rahmen, passt in die obere Hälfte der (festen) Box - SCHALTER_HEBEL_RAND ist
// der Abstand von der Box-Kante zum Hebel-Rahmen (oben/links/rechts), die
// untere Hebel-Rahmenkante liegt exakt auf dem Box-Mittelpunkt (Drehpunkt).
const SCHALTER_HEBEL_RAND = 4;
const SCHALTER_HEBEL_BALKEN_HOEHE = 4;
const SCHALTER_HEBEL_LINIEN_PADDING = 2;

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
    // Nur gesetzt, wenn die Ader eine Netz-ID trägt (siehe generiereAnlage() /
    // KONZEPT.md "Pfadverfolgung und Fehlersimulation") - nützlich zum
    // gezielten Ansteuern einer bestimmten Schraube in Tests/Debugging,
    // genau wie data-querschnitt/data-farbe schon für Popup-Zwecke.
    if (ader.netz) attrs['data-netz'] = ader.netz;
    // Eine physische Schraube kann mehr als eine Ader tragen (z.B. RCD1.o1,
    // das gleichzeitig LS1 und LS2 speist, siehe generate_anlage.js
    // baueLeitung()) - `data-netz` bleibt die "Haupt"-Ader, die zusätzlichen
    // Netz-IDs stehen kommagetrennt hier, ebenfalls fürs gezielte Ansteuern
    // in Tests/Debugging.
    if (ader.weitere?.length) attrs['data-netz-weitere'] = ader.weitere.map((w) => w.netz).join(',');
  }
  const kreis = svgEl('circle', attrs);
  if (ader) {
    kreis.style.cursor = 'pointer';
    kreis.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // kreis wird mitgegeben, damit der Aufrufer (controller/app.js) im
      // Messmodus eine Messspitzen-Markierung exakt an der Schraubenposition
      // platzieren kann (SVG-Koordinaten cx/cy, nicht die Client-Koordinaten
      // aus ev.clientX/Y, die nur fürs Popup-Positionieren gedacht sind).
      onKlick(ader, ev.clientX, ev.clientY, kreis);
    });
  }
  svg.appendChild(kreis);
}

// Schalter-Symbol (siehe KONZEPT.md "Schalter", Vorlage
// docs/referenz/hebel_beispiel_geschlossen.svg/hebel_beispiel_offen.svg):
// eine **feste** weiße Box (Position/Größe ändert sich nie, Rand `#555555`
// wie der Bauteil-Rand) mit einem klickbaren Hebel darin (eigener Rahmen um
// Balken + drei Riffel-Linien). Der Hebel füllt geschlossen (Default,
// `initialGeschlossen`) die obere Boxhälfte, ein Klick auf die Box dreht ihn
// um 180° um den Box-Mittelpunkt (`mitteX`/`mitteY`) - danach füllt er die
// untere Boxhälfte, Balken und Riffelung haben die Seite getauscht, Größe/
// Form des Hebels bleiben dabei unverändert (reine Rotation, keine
// Neupositionierung einzelner Elemente). `mitteX`/`mitteY` sind die feste
// Mitte der Box - die Aufrufer entscheiden, ob mittig oder (beim RCD)
// linksversetzt. `onKlick` (optional) wird mit dem neuen Zustand
// (`geschlossen: true/false`) beim Klick aufgerufen - der Aufrufer verbindet
// das mit dem Verbindungsgraphen (siehe controller/app.js). Rückgabewert ist
// ein Handle `{ setGeschlossen(bool) }`, mit dem derselbe Zustandswechsel
// auch PROGRAMMATISCH ausgelöst werden kann (ruft denselben `onKlick`-Pfad
// auf wie ein echter Mausklick - beides landet im selben Callback, siehe
// controller/app.js `schalterHandles`). No-op, wenn der Zielzustand bereits
// erreicht ist.
function zeichneSchalter(svg, mitteX, mitteY, breite, onKlick, initialGeschlossen = true) {
  const x = mitteX - breite / 2;
  const boxY = mitteY - SCHALTER_HOEHE / 2;

  const g = svgEl('g', {});
  // Rand-Farbe #555555 - dieselbe Grau-Farbe wie der Bauteil-Rand selbst
  // (siehe `stroke: '#555555'` am äußeren Gehäuse-Rect in geraet()).
  g.appendChild(svgEl('rect', {
    x, y: boxY, width: breite, height: SCHALTER_HOEHE,
    fill: '#f5f5f5', stroke: '#555555', 'stroke-width': 1.2
  }));

  const hebelBreite = breite - 2 * SCHALTER_HEBEL_RAND;
  const hebelHoehe = SCHALTER_HOEHE / 2 - SCHALTER_HEBEL_RAND;
  const hebelX = mitteX - hebelBreite / 2;
  const hebelY = mitteY - hebelHoehe;

  const hebel = svgEl('g', {});
  hebel.appendChild(svgEl('rect', {
    x: hebelX, y: hebelY, width: hebelBreite, height: hebelHoehe,
    fill: '#dddddd', stroke: '#222222', 'stroke-width': 1
  }));
  hebel.appendChild(svgEl('rect', {
    x: hebelX, y: hebelY, width: hebelBreite, height: SCHALTER_HEBEL_BALKEN_HOEHE, fill: '#222222'
  }));
  const linienBereichHoehe = hebelHoehe - SCHALTER_HEBEL_BALKEN_HOEHE;
  for (let i = 0; i < 3; i++) {
    const ly = hebelY + SCHALTER_HEBEL_BALKEN_HOEHE + SCHALTER_HEBEL_LINIEN_PADDING
      + i * ((linienBereichHoehe - 2 * SCHALTER_HEBEL_LINIEN_PADDING) / 2);
    hebel.appendChild(svgEl('line', {
      x1: hebelX + SCHALTER_HEBEL_LINIEN_PADDING, x2: hebelX + hebelBreite - SCHALTER_HEBEL_LINIEN_PADDING,
      y1: ly, y2: ly, stroke: '#222222', 'stroke-width': 1
    }));
  }
  g.appendChild(hebel);

  let geschlossen = initialGeschlossen;

  function hebelAnwenden() {
    if (geschlossen) {
      hebel.removeAttribute('transform');
    } else {
      hebel.setAttribute('transform', `rotate(180, ${mitteX}, ${mitteY})`);
    }
  }
  hebelAnwenden();

  g.style.cursor = 'pointer';
  g.addEventListener('click', (ev) => {
    ev.stopPropagation();
    geschlossen = !geschlossen;
    hebelAnwenden();
    onKlick?.(geschlossen);
  });

  svg.appendChild(g);

  return {
    setGeschlossen(neu) {
      if (neu === geschlossen) return;
      geschlossen = neu;
      hebelAnwenden();
      onKlick?.(geschlossen);
    }
  };
}

// LS/Leistungsschalter: Breite skaliert linear mit der Polzahl (1-/2-polig
// bleiben dadurch exakt wie ursprünglich), ab 3 Polen kommt ein kleiner fixer
// Zusatz pro Pol dazu (rein optisch etwas breiter, kein Überlappen mit dem
// Bauteilrand). RCD: linker Rand fest, rechter Rand ebenfalls fest statt
// proportional - der 2-polige Fall bleibt dadurch exakt bei Basisbreite,
// größere Polzahlen (z.B. 4-polig) werden breiter als die reine
// (Polzahl-1)*Basisbreite-Formel.
function schalterBreite(schalterTyp, teAnzahl) {
  if (schalterTyp === 'rcd') {
    return teAnzahl * TE_PX - SCHALTER_RCD_RAND_LINKS - SCHALTER_RCD_RAND_RECHTS;
  }
  const zusatz = teAnzahl > 2 ? (teAnzahl - 2) * SCHALTER_ZUSATZ_PRO_POL_AB_3 : 0;
  return teAnzahl * SCHALTER_BASISBREITE + zusatz;
}

function geraet(svg, { x, y, teAnzahl, farben, label, adernEingang, adernAusgang, onSchraubeKlick, schalterTyp, bauteilName, onSchalterKlick, schalterHandles }) {
  const breite = teAnzahl * TE_PX;
  svg.appendChild(svgEl('rect', { x, y, width: breite, height: GERAET_H, fill: farben.gehaeuse, stroke: '#555555', 'stroke-width': 1 }));
  svg.appendChild(svgEl('rect', { x, y, width: breite, height: HEADER_H, fill: farben.header }));

  // Direkt unter dem Header-Balken statt vertikal mittig in der ganzen Box -
  // näher an der Typenschild-Position auf echten Geräten.
  const text = svgEl('text', {
    x: x + breite / 2, y: y + HEADER_H + 12,
    'text-anchor': 'middle', 'font-size': 9, fill: farben.text ?? '#000000'
  });
  text.textContent = label;
  svg.appendChild(text);

  if (schalterTyp) {
    const sBreite = schalterBreite(schalterTyp, teAnzahl);
    const sMitteY = y + GERAET_H / 2;
    const sMitteX = schalterTyp === 'rcd'
      ? x + SCHALTER_RCD_RAND_LINKS + sBreite / 2
      : x + breite / 2;
    const handle = zeichneSchalter(svg, sMitteX, sMitteY, sBreite, (geschlossen) => onSchalterKlick?.(bauteilName, geschlossen));
    schalterHandles?.set(bauteilName, handle);
  }

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
  render(anlage, container, onSchraubeKlick, onSchalterKlick) {
    const svg = svgEl('svg', {});
    container.innerHTML = '';
    container.appendChild(svg);

    // Ein Handle je Schalter-Bauteil (RCD/LS/Hauptschalter), mit dem
    // controller/app.js den Hebel auch PROGRAMMATISCH umschalten kann (z.B.
    // FI/RCD: Hebel öffnet automatisch nach erfolgreichem TEST) - siehe
    // zeichneSchalter() oben. Läuft über denselben `onSchalterKlick`-Pfad
    // wie ein echter Mausklick, keine zweite Zustandsquelle.
    const schalterHandles = new Map();

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
          // lAusgangListe hat normalerweise ein Element, bei einem mehrpoligen
          // LS (siehe testcase_05) eines pro Phase (L1/L2/L3).
          const adern = sk.leitung?.adern ?? [];
          const lAusgangListe = adern.filter((a) => a.funktion.startsWith('L'));
          const nAusgang = findeAder(adern, 'N');
          const peAusgang = findeAder(adern, 'PE');

          // Eingangsseite kann abweichen (z.B. PE-Reihenklemme ohne eigenes
          // Zubringerkabel, siehe reihenklemmen_eingang in generate_anlage.js).
          // Fällt PRO FELD (bzw. pro Phase bei `l`) auf die Ausgangsseite
          // zurück - nicht nur, wenn das ganze `reihenklemmen_eingang`-Objekt
          // fehlt (ältere/handgeschriebene anlage.json ohne Netzplan-Ursprung),
          // sondern auch, wenn ein einzelnes Feld darin `null` ist (z.B. PE
          // ohne eigenes Zubringerkabel - elektrisch trotzdem erreichbar über
          // den Hutschienen-Bond, die Schraube muss also trotzdem klickbar sein).
          const eingang = sk.reihenklemmen_eingang;
          const lEingangListe = lAusgangListe.map((lAusgang, i) => eingang?.l?.[i] ?? lAusgang);
          const nEingang = eingang?.n ?? nAusgang;
          const peEingang = eingang?.pe ?? peAusgang;

          // Eine Reihenklemme pro L-Phase (bei einem mehrpoligen LS also
          // mehrere nebeneinander - bewusst normale, einzelne Reihenklemmen
          // statt eines neuen Mehrphasen-Bauteils, siehe KONZEPT.md).
          lAusgangListe.forEach((lAusgang, i) => {
            klemme(g, { x, y: reihe1Y, breite: RK_BREITE, hoehe: RK_HOEHE, farben: { gehaeuse: FARBEN.reihenklemme_l }, aderEingang: lEingangListe[i], aderAusgang: lAusgang, onSchraubeKlick });
            x += RK_BREITE;
          });
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
            onSchraubeKlick, schalterTyp: 'rcd', bauteilName: gruppe.rcd.name, onSchalterKlick, schalterHandles
          });
        }
        for (const sk of gruppe.stromkreise) {
          const ls = sk.ls;
          gx += geraet(g, {
            x: gx, y: rowY, teAnzahl: ls.te, farben: FARBEN.ls,
            label: `${ls.char}${ls.in}`,
            adernEingang: ls.eingang.leitung.adern,
            adernAusgang: ls.ausgang.leitung.adern,
            onSchraubeKlick, schalterTyp: 'einfach', bauteilName: ls.name, onSchalterKlick, schalterHandles
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
      onSchraubeKlick, schalterTyp: 'einfach', bauteilName: hs.name, onSchalterKlick, schalterHandles
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

    return { svg, schalterHandles };
  }
};
