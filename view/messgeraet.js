const SVG_NS = 'http://www.w3.org/2000/svg';

// Internes Koordinatensystem (viewBox) - unverändert vom Mockup, alle Positionen
// unten beziehen sich darauf.
const BREITE = 640;
const HOEHE = 280;

// Angezeigte Größe: reale Breite des BENNING IT 130 (230mm, siehe KONZEPT.md
// "Messgerät" -> "Darstellung") im selben Maßstab wie der Schaltkasten (1mm = 2px,
// siehe view/schaltkasten.js). Höhe proportional mitskaliert, da keine reale
// Gerätehöhe dokumentiert ist. Das SVG wird über width/height auf diese Größe
// herunterskaliert, während die viewBox unverändert bleibt - alle Elementpositionen
// unten bleiben also gültig.
const SCHALTKASTEN_MM_ZU_PX = 2;
const REALE_BREITE_MM = 230;
const ANZEIGE_BREITE = REALE_BREITE_MM * SCHALTKASTEN_MM_ZU_PX;
const ANZEIGE_HOEHE = HOEHE * (ANZEIGE_BREITE / BREITE);

const DISPLAY = { x: 190, y: 55, breite: 260, hoehe: 190 };
const DREHKNOPF = { cx: 542, cy: 147, r: 26 };
const TEST_TASTE = { cx: 57, cy: 149 };

// Lim-Grenzwert für ZI/ZS: Auslösefaktor je LS-Charakteristik, direkt mit dem
// Bemessungsstrom multipliziert (Lim = Faktor × Bemessungsstrom). Lim hängt
// also von BEIDEN Werten ab (Typ und Bemessungsstrom), nicht nur vom Typ.
// NV/gG-Faktoren können sich noch ändern (vom Anwender als vorläufig markiert).
const LIM_FAKTOR_NACH_LS_TYP = {
  B: 5, C: 10, D: 20, K: 15, Z: 3, L: 5.25, U: 12, NV: 12, gG: 12
};

// Berechnet den formatierten Lim-Text ("Lim: X,XA") aus LS-Typ und
// Bemessungsstrom (String mit "A"-Suffix, z.B. "16A") - gemeinsam genutzt vom
// initialen/statischen Zustand (zustandFuerFunktion) und vom live editierten
// Zustand in controller/app.js, damit die Formel nur an einer Stelle steht.
function berechneLimText(lsTyp, lsBemessungsstrom) {
  const faktor = LIM_FAKTOR_NACH_LS_TYP[lsTyp];
  const bemessungsstrom = parseFloat(lsBemessungsstrom);
  const lim = faktor * bemessungsstrom;
  return `Lim: ${lim.toFixed(1).replace('.', ',')}A`;
}

// Reihenfolge entspricht dem zyklischen Weiterschalten beim Drehknopf-Klick
// (siehe KONZEPT.md "Bedienung" - RLOW -> RISO -> ZI -> ZS -> FI/RCD -> V~ -> ...).
// Winkel sind grob am Mockup (docs/referenz/messgeraet_mockup.svg) abgelesen.
// `titel` = Anzeige-Titel im Display für diese Drehknopf-Stellung (siehe
// KONZEPT.md "Messgerät" -> "Display" -> Tabelle "Anzeige (Titel)").
// `wertPrefix`/`einheit` = Aufbau des Hauptmesswerts ("R:---Ω" usw., siehe Tabelle
// "Angezeigte Werte"/"Einheit"). `messpunkte` = welche L/PE/N-Kreise unten im
// Display markiert sind (siehe Tabelle "Messpunkte") - nur eingetragen, wo bereits
// geprüft (siehe Review). `calibratedResistance` = Wert rechts neben dem Titel bei
// RLOW - der um den Leitungswiderstand der Messleitungen kalibrierte Wert (CAL-Taste).
// Noch ein Platzhalter, wird später durch einen echten, aus dem Netzplan berechneten
// Wert ersetzt.
const DREHKNOPF_POSITIONEN = [
  {
    funktion: 'RLOW', label: 'R LOW', titel: 'Durchgang', wertPrefix: 'R', einheit: 'Ω',
    messpunkte: { l: 'voll', pe: 'leer', n: 'voll' },
    calibratedResistance: '0,4Ω',
    winkel: -160, radiusZuschlag: 10
  },
  {
    funktion: 'RISO', label: 'R ISO', titel: 'R ISO', wertPrefix: 'R', einheit: 'MΩ',
    messpunkte: { l: 'voll', pe: 'halb', n: 'voll' },
    // Prüfspannung für die Isolationswiderstandsmessung (DC, nach VDE 0100-600 /
    // IEC 61557-2 wählbar): 100V, 250V, 500V, 1000V. Noch ein fester Platzhalter,
    // später einstellbar/aus dem Netzplan.
    messspannung: '500V',
    winkel: -110
  },
  {
    funktion: 'ZI', label: 'ZI', titel: 'Zl', wertPrefix: 'Z', einheit: 'Ω',
    messpunkte: { l: 'voll', pe: 'leer', n: 'voll' },
    // Bei ZI gibt's über die Pfeiltasten keine weiteren Werte abzurufen - der
    // Indikator im Display wird deshalb durchgestrichen dargestellt.
    indikatorDurchgestrichen: true,
    // Referenzwerte des LS, gegen den die gemessene Impedanz geprüft wird (gültige
    // Werte siehe docs/referenz/bauteilwerte.md): Charakteristik, Bemessungsstrom,
    // und die geforderte max. Abschaltzeit (0,2s oder 0,4s nach VDE 0100-410).
    // Noch feste Platzhalter, später einstellbar/aus dem Netzplan.
    lsTyp: 'B',
    lsBemessungsstrom: '16A',
    abschaltzeitGrenzwert: '0,4s',
    winkel: -70
  },
  {
    funktion: 'ZS', label: 'ZS', titel: 'Zs', wertPrefix: 'Z', einheit: 'Ω',
    messpunkte: { l: 'voll', pe: 'voll', n: 'halb' },
    // Wie bei ZI: keine weiteren Werte über die Pfeiltasten abrufbar.
    indikatorDurchgestrichen: true,
    // Wie bei ZI: Referenzwerte des LS, gegen den die gemessene Schleifenimpedanz
    // geprüft wird - siehe Kommentar bei ZI.
    lsTyp: 'B',
    lsBemessungsstrom: '16A',
    abschaltzeitGrenzwert: '0,4s',
    winkel: -30
  },
  {
    funktion: 'FI/RCD', label: 'FI/RCD', titel: 'RCD I', winkel: 5, radiusZuschlag: 16,
    wertPrefix: 'I', einheit: 'mA',
    messpunkte: { l: 'voll', pe: 'voll', n: 'halb' },
    // Anders als bei RLOW/RISO/ZI/ZS ist der Hauptmesswert hier links statt
    // mittig ausgerichtet - Platz für Uci/t, die schon unten links/rechts stehen.
    hauptwertLinksAligniert: true,
    // Wie bei ZI/ZS: keine weiteren Werte über die Pfeiltasten abrufbar.
    indikatorDurchgestrichen: true,
    // Fehlerstrom-Auslöseschwelle des geprüften RCD (Normreihe siehe
    // docs/referenz/bauteilwerte.md). Noch fester Platzhalter, später
    // einstellbar/aus dem Netzplan.
    rcdFehlerstrom: '30mA',
    // Typ des geprüften RCD (siehe docs/referenz/bauteilwerte.md). Noch fester
    // Platzhalter, später einstellbar/aus dem Netzplan.
    rcdTyp: 'AC'
  },
  {
    funktion: 'V~', label: 'V~', titel: 'TRMS Spannung', winkel: 65, radiusZuschlag: 4,
    messpunkte: { l: 'voll', pe: 'voll', n: 'voll' },
    // Einziger Ort mit Sanduhr statt Pfeil im Kasten-Indikator.
    indikatorIcon: 'sanduhr',
    // Drei Spannungswerte gleichzeitig, gestapelt zwischen den beiden Strichen -
    // anders als bei den anderen Funktionen gibt's hier keinen TEST-Platzhalter
    // (kein `---`), sondern sofort einen (noch festen) Wert.
    spannungswerte: [
      { label: 'Uln', wert: '0V' },
      { label: 'Ulpe', wert: '0V' },
      { label: 'Unpe', wert: '0V' }
    ]
  }
];

// Beispielzustand für den ersten visuellen Entwurf (entspricht dem Mockup 1:1):
// FI/RCD-Messung, Gerät an, Messwert bereits per TEST-Taste übernommen.
const BEISPIEL_ZUSTAND = {
  an: true,
  funktion: 'FI/RCD',
  titel: 'RCD I',
  titelWerte: ['AC~'],
  hauptwert: 'I:20,4mA',
  nebenwertLinks: 'Uci:0.1V',
  nebenwertRechts: 't:20,3ms',
  messpunkte: { l: 'voll', pe: 'voll', n: 'halb' }
};

// Baut einen "sauberen" Zustand für eine Drehknopf-Stellung: Titel passend zur
// Funktion, aber ohne Messwert (kein TEST-Klick erfolgt) und ohne angelegte
// Messpunkte. Bei an=false zeigt das Display ohnehin nichts an (siehe
// zeichneDisplay), aber `funktion` bleibt gültig, da die Knopfstellung
// mechanisch ist und unabhängig vom Ein/Aus-Zustand angezeigt wird.
function zustandFuerFunktion(funktion, an) {
  const pos = DREHKNOPF_POSITIONEN.find((p) => p.funktion === funktion) ?? DREHKNOPF_POSITIONEN[0];
  // Werte rechts neben dem Titel - ein einzelner Wert (RLOW/RISO) oder mehrere
  // nebeneinander (ZI: LS-Typ, Bemessungsstrom, Abschaltzeit-Grenzwert). Reihenfolge
  // = Anzeigereihenfolge von der Mitte nach rechts.
  const titelWerte = [
    pos.calibratedResistance, pos.messspannung,
    pos.lsTyp, pos.lsBemessungsstrom, pos.abschaltzeitGrenzwert,
    pos.rcdFehlerstrom, pos.rcdTyp
  ].filter(Boolean);

  // Isc (links, noch kein Wert - Platzhalter) / Lim (rechts, aus LS-Typ UND
  // Bemessungsstrom abgeleitet) über dem unteren Strich - nur bei Funktionen mit
  // Referenz-LS (ZI).
  let nebenwertLinks = null;
  let nebenwertRechts = null;
  if (pos.lsTyp && pos.lsBemessungsstrom) {
    nebenwertLinks = 'Isc:---A';
    nebenwertRechts = berechneLimText(pos.lsTyp, pos.lsBemessungsstrom);
  } else if (pos.funktion === 'FI/RCD') {
    // Uci (links, Berührungsspannung) / t (rechts, Auslösezeit) - noch keine
    // Werte, Platzhalter bis zum TEST-Klick.
    nebenwertLinks = 'Uci:___V';
    nebenwertRechts = 't:___ms';
  }

  return {
    an,
    funktion: pos.funktion,
    titel: pos.titel,
    // Kurzform des Titels (Drehknopf-Label, z.B. "R LOW" statt "Durchgang") -
    // per ▲/▼ umschaltbar, wenn der Titel gerade ausgewählt ist (zone1Auswahl 0).
    label: pos.label,
    titelWerte,
    hauptwert: pos.wertPrefix ? `${pos.wertPrefix}:${pos.funktion === 'FI/RCD' ? '___' : '---'}${pos.einheit}` : null,
    hauptwertLinksAligniert: pos.hauptwertLinksAligniert ?? false,
    hauptwertZeilen: pos.spannungswerte ?? null,
    nebenwertLinks,
    nebenwertRechts,
    messpunkte: pos.messpunkte ?? {},
    indikatorDurchgestrichen: pos.indikatorDurchgestrichen ?? false,
    indikatorIcon: pos.indikatorIcon ?? 'pfeil'
  };
}

// Nächste Funktion im zyklischen Weiterschalten (siehe KONZEPT.md "Bedienung":
// RLOW -> RISO -> ZI -> ZS -> FI/RCD -> V~ -> zurück zu RLOW).
function naechsteFunktion(funktion) {
  const index = DREHKNOPF_POSITIONEN.findIndex((p) => p.funktion === funktion);
  const naechsterIndex = index >= 0 ? (index + 1) % DREHKNOPF_POSITIONEN.length : 0;
  return DREHKNOPF_POSITIONEN[naechsterIndex].funktion;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function text(inhalt, attrs) {
  const el = svgEl('text', attrs);
  el.textContent = inhalt;
  return el;
}

// Ein Feld in Zone 1 (Titel oder ein Wert aus titelWerte) - normal (schwarzer
// Text) oder invers (weißer Text auf schwarzem Kästchen, zeigt Auswahl per
// ◄►-Taste an). `textAnchor` bestimmt, ob `x` der linke Rand (Titel) oder die
// Mitte (titelWerte) des Textes ist. Die Kästchengröße wird per `getBBox()`
// am tatsächlich gerenderten Text gemessen statt aus der Zeichenanzahl
// geschätzt - eine Schätzung (z.B. Zeichen × Breite) passt nicht zuverlässig
// zur tatsächlichen Textbreite, insbesondere bei Unterstrichen ("___", siehe
// RLOW-Platzhalter): deren Breite variiert stark je nach Font-Fallback des
// Browsers und kann bei einer festen Schätzung weit über den Kastenrand hinausragen.
function zeichneTitelFeld(svg, wert, x, y, { invers = false, textAnchor = 'start' } = {}) {
  const textEl = text(wert, {
    x, y, 'text-anchor': textAnchor,
    'font-size': 13, 'font-weight': 'bold', fill: invers ? '#ffffff' : '#111111', 'font-family': "'Courier New', monospace"
  });
  if (invers) {
    svg.appendChild(textEl);
    const box = textEl.getBBox();
    const polsterung = 4;
    svg.insertBefore(svgEl('rect', {
      x: box.x - polsterung, y: box.y - polsterung,
      width: box.width + polsterung * 2, height: box.height + polsterung * 2,
      fill: '#111111'
    }), textEl);
  } else {
    svg.appendChild(textEl);
  }
}

function taste(svg, { x, y, breite, hoehe, label, fontSize = 14, onKlick }) {
  const g = svgEl('g', { style: onKlick ? 'cursor:pointer' : '' });
  g.appendChild(svgEl('rect', {
    x, y, width: breite, height: hoehe, rx: 3, ry: 3,
    fill: '#111111', stroke: '#333333', 'stroke-width': 1
  }));
  g.appendChild(text(label, {
    x: x + breite / 2, y: y + hoehe / 2 + fontSize / 3,
    'text-anchor': 'middle', 'font-size': fontSize, 'font-weight': 'bold', fill: '#ffffff'
  }));
  if (onKlick) g.addEventListener('click', onKlick);
  svg.appendChild(g);
  return g;
}

// Messpunkt-Kreis unter dem Display: 'voll' = ausgefüllt, 'halb' = halb ausgefüllt
// (Kreis-Umriss + Sektor), 'leer' = nur Umriss.
function messpunktKreis(svg, cx, cy, zustand) {
  const r = 8.2;
  if (zustand === 'voll') {
    svg.appendChild(svgEl('circle', { cx, cy, r, fill: '#000000' }));
    return;
  }
  svg.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: '#000000', 'stroke-width': 1 }));
  if (zustand === 'halb') {
    svg.appendChild(svgEl('path', {
      d: `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`,
      fill: '#000000'
    }));
  }
}

// Kasten-Indikator unten links im Display - zeigt an, dass über die Pfeiltasten
// weitere Infos/Werte abrufbar sind. Normalerweise ein rechtszeigender Pfeil
// (wie auf der ◄►-Taste), bei V~ stattdessen eine Sanduhr (`icon: 'sanduhr'`).
// Kasten und Icon bilden eine feste Einheit (eine Gruppe), der Kasten ist
// deutlich größer als das Icon selbst, damit nichts überlappt. `durchgestrichen`
// = bei dieser Funktion gibt's nichts Weiteres abzurufen (z.B. ZI) - zeigt einen
// diagonalen Strich über den ganzen Kasten.
function zeichneKastenIndikator(svg, cx, cy, { durchgestrichen = false, icon = 'pfeil' } = {}) {
  const kastenBreite = 33;
  const kastenHoehe = 27;
  const g = svgEl('g');
  g.appendChild(svgEl('rect', {
    x: cx - kastenBreite / 2, y: cy - kastenHoehe / 2, width: kastenBreite, height: kastenHoehe,
    rx: 3, fill: 'none', stroke: '#000000', 'stroke-width': 1.5
  }));
  if (icon === 'sanduhr') {
    // Sanduhr: zwei Dreiecke (oben/unten), die sich mittig berühren - Bowtie-Form
    // per Pfad, plus ein kurzer Rahmenstrich oben und unten (klassisches
    // Sanduhr-Symbol). Deutlich innerhalb des Kastens, kein Überlappen mit dessen Rand.
    const sanduhrBreite = 14;
    const sanduhrHoehe = 16;
    const links = cx - sanduhrBreite / 2;
    const rechts = cx + sanduhrBreite / 2;
    const oben = cy - sanduhrHoehe / 2;
    const unten = cy + sanduhrHoehe / 2;
    g.appendChild(svgEl('path', {
      d: `M ${links} ${oben} L ${rechts} ${oben} L ${cx} ${cy} L ${rechts} ${unten} L ${links} ${unten} L ${cx} ${cy} Z`,
      fill: '#000000'
    }));
    g.appendChild(svgEl('line', { x1: links, y1: oben, x2: rechts, y2: oben, stroke: '#000000', 'stroke-width': 2 }));
    g.appendChild(svgEl('line', { x1: links, y1: unten, x2: rechts, y2: unten, stroke: '#000000', 'stroke-width': 2 }));
  } else {
    const pfeilHoehe = 12;
    const pfeilBreite = 12;
    g.appendChild(svgEl('path', {
      d: `M ${cx - pfeilBreite / 2} ${cy - pfeilHoehe / 2} L ${cx - pfeilBreite / 2} ${cy + pfeilHoehe / 2} L ${cx + pfeilBreite / 2} ${cy} Z`,
      fill: '#000000'
    }));
  }
  if (durchgestrichen) {
    g.appendChild(svgEl('line', {
      x1: cx - kastenBreite / 2, y1: cy - kastenHoehe / 2, x2: cx + kastenBreite / 2, y2: cy + kastenHoehe / 2,
      stroke: '#000000', 'stroke-width': 1.5
    }));
    g.appendChild(svgEl('line', {
      x1: cx - kastenBreite / 2, y1: cy + kastenHoehe / 2, x2: cx + kastenBreite / 2, y2: cy - kastenHoehe / 2,
      stroke: '#000000', 'stroke-width': 1.5
    }));
  }
  svg.appendChild(g);
}

function zeichneDisplay(svg, zustand) {
  const { x, y, breite, hoehe } = DISPLAY;
  svg.appendChild(svgEl('rect', {
    x, y, width: breite, height: hoehe, rx: 4,
    fill: zustand.an ? '#dddddd' : '#333333', stroke: '#444444', 'stroke-width': 1
  }));

  if (!zustand.an) return;

  const linieObenY = y + 37;
  const linieUntenY = y + hoehe - 55;

  // Zone 1 (oben): Titel/Messfunktion + Werte rechts daneben (titelWerte).
  // Per ◄►-Taste durchklickbar (Menü-Navigation, siehe zustand.zone1Auswahl):
  // Index 0 = Titel, Index i+1 = titelWerte[i]. Das gerade ausgewählte Feld
  // wird invers dargestellt (weißer Text auf schwarzem Kästchen), alle anderen
  // normal (schwarzer Text ohne Hintergrund).
  const zone1Auswahl = zustand.zone1Auswahl ?? 0;
  zeichneTitelFeld(svg, zustand.titel, x + 8, y + 29, { invers: zone1Auswahl === 0 });
  // Werte rechts neben dem Titel, beginnend mittig im Display (nicht am rechten
  // Rand) - Platz für sich ändernde Werte (z.B. Durchgang: "0,4Ω", oder bei ZI
  // mehrere nebeneinander: LS-Typ, Bemessungsstrom, Abschaltzeit-Grenzwert).
  // Ist zusätzlich ein titelWertRechts gesetzt (siehe unten), bleibt weniger
  // Platz bis zum rechten Rand - dann enger, damit sich nichts überlappt.
  const titelWerte = zustand.titelWerte ?? [];
  const titelWerteAbstand = zustand.titelWertRechts ? 32 : 55;
  titelWerte.forEach((wert, i) => {
    zeichneTitelFeld(svg, wert, x + breite / 2 + i * titelWerteAbstand, y + 29, {
      invers: zone1Auswahl === i + 1, textAnchor: 'middle'
    });
  });
  // Optionaler zusätzlicher Wert ganz rechts, rechtsbündig am Display-Rand
  // (z.B. bei ZI-ΔU-Ansicht: Abschaltzeit, damit die mittlere Reihe nicht auf
  // 4 Werte anwächst und über den Rand hinausragt) - eigener Auswahl-Index
  // direkt nach den titelWerte-Einträgen.
  if (zustand.titelWertRechts) {
    zeichneTitelFeld(svg, zustand.titelWertRechts, x + breite - 8, y + 29, {
      invers: zone1Auswahl === titelWerte.length + 1, textAnchor: 'end'
    });
  }

  svg.appendChild(svgEl('line', { x1: x + 4, y1: linieObenY, x2: x + breite - 4, y2: linieObenY, stroke: '#999999', 'stroke-width': 0.5 }));
  svg.appendChild(svgEl('line', { x1: x + 4, y1: linieUntenY, x2: x + breite - 4, y2: linieUntenY, stroke: '#999999', 'stroke-width': 0.5 }));

  // Zone 2 (Mitte): normalerweise EIN Hauptmesswert (mittig bei RLOW/RISO/ZI/ZS,
  // links ausgerichtet bei FI/RCD - Platz für Uci/t unten). Bei V~ stattdessen
  // DREI Werte gestapelt (Uln/Ulpe/Unpe): Label links ausgerichtet, Wert mittig
  // in einer Spalte (sonst würden die Werte je nach Label-Länge unterschiedlich
  // weit rechts stehen). Bei ZI-ΔU-Ansicht VIER komplett links ausgerichtete
  // Zeilen (einfache Strings statt {label,wert}-Objekte, da hier keine Spalten
  // gebraucht werden) - kleinere Schrift/engerer Zeilenabstand, damit alle vier
  // in die Zone passen.
  if (zustand.hauptwertZeilen) {
    const zeilenSindStrings = zustand.hauptwertZeilen.every((z) => typeof z === 'string');
    const fontSize = zeilenSindStrings ? 18 : 24;
    const zeilenAbstand = zeilenSindStrings ? 24 : 32;
    const startY = zeilenSindStrings ? 20 : 28;
    zustand.hauptwertZeilen.forEach((zeile, i) => {
      const zeilenY = linieObenY + startY + i * zeilenAbstand;
      if (typeof zeile === 'string') {
        svg.appendChild(text(zeile, {
          x: x + 8, y: zeilenY,
          'font-size': fontSize, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace"
        }));
        return;
      }
      svg.appendChild(text(`${zeile.label}:`, {
        x: x + 8, y: zeilenY,
        'font-size': fontSize, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace"
      }));
      svg.appendChild(text(zeile.wert, {
        x: x + breite / 2, y: zeilenY, 'text-anchor': 'middle',
        'font-size': fontSize, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace"
      }));
    });
  } else {
    svg.appendChild(text(zustand.hauptwert ?? '---', zustand.hauptwertLinksAligniert
      ? { x: x + 8, y: (linieObenY + linieUntenY) / 2 + 8, 'font-size': 52, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace" }
      : { x: x + breite / 2, y: (linieObenY + linieUntenY) / 2 + 8, 'text-anchor': 'middle', 'font-size': 52, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace" }
    ));
  }
  if (zustand.nebenwertLinks) {
    svg.appendChild(text(zustand.nebenwertLinks, {
      x: x + 8, y: linieUntenY - 8,
      'font-size': 12, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace"
    }));
  }
  if (zustand.nebenwertRechts) {
    svg.appendChild(text(zustand.nebenwertRechts, {
      x: x + breite - 8, y: linieUntenY - 8, 'text-anchor': 'end',
      'font-size': 12, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace"
    }));
  }

  // Zone 3 (unten): Messpunkte L / PE / N - Label über dem Kreis
  const mp = zustand.messpunkte ?? {};
  const labelY = linieUntenY + 15;
  const kreisY = linieUntenY + 26;
  const punkte = [['L', x + 143], ['PE', x + 177], ['N', x + 214]];
  for (const [label, cx] of punkte) {
    svg.appendChild(text(label, {
      x: cx, y: labelY, 'text-anchor': 'middle',
      'font-size': 12, 'font-weight': 'bold', fill: '#111111', 'font-family': "'Courier New', monospace"
    }));
    messpunktKreis(svg, cx, kreisY, mp[label.toLowerCase()] ?? 'leer');
  }

  // Kasten-Indikator links unten, auf Höhe der Messpunkt-Kreise.
  zeichneKastenIndikator(svg, x + 25, kreisY, {
    durchgestrichen: zustand.indikatorDurchgestrichen,
    icon: zustand.indikatorIcon
  });
}

function zeichneDrehknopf(svg, zustand, onFunktionKlick) {
  const { cx, cy, r } = DREHKNOPF;

  for (const pos of DREHKNOPF_POSITIONEN) {
    const rad = (pos.winkel * Math.PI) / 180;
    const labelR = r + 20 + (pos.radiusZuschlag ?? 0);
    const strichInnenR = r + 8;
    const strichAussenR = r + 12;

    svg.appendChild(text(pos.label, {
      x: cx + labelR * Math.cos(rad), y: cy + labelR * Math.sin(rad),
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 'bold', fill: '#ffffff'
    }));
    svg.appendChild(svgEl('line', {
      x1: cx + strichInnenR * Math.cos(rad), y1: cy + strichInnenR * Math.sin(rad),
      x2: cx + strichAussenR * Math.cos(rad), y2: cy + strichAussenR * Math.sin(rad),
      stroke: '#ffffff', 'stroke-width': 2.5
    }));
  }

  const g = svgEl('g', { style: onFunktionKlick ? 'cursor:pointer' : '' });
  // Teil 1+2: Ring (mittelgrauer Rand) + dunkler Kreis (Fläche) - ein Element mit Stroke.
  g.appendChild(svgEl('circle', { cx, cy, r, fill: '#1a1a1a', stroke: '#666666', 'stroke-width': 3 }));

  // Teil 3+4: Griff-Schlitz (Quadrat/Rechteck, mittelgrau) + weißer Strich, als EIN
  // starres Bauteil gemeinsam gedreht (echter Drehknopf - beides sitzt fest zueinander,
  // nicht wie zwei unabhängige Elemente). Ruheposition ist horizontal (0°), die Gruppe
  // wird per transform auf den Winkel der aktuell gewählten Messfunktion gedreht.
  const aktuelleIndex = DREHKNOPF_POSITIONEN.findIndex((p) => p.funktion === zustand.funktion);
  const aktuellerWinkelGrad = aktuelleIndex >= 0 ? DREHKNOPF_POSITIONEN[aktuelleIndex].winkel : 0;

  const griff = svgEl('g', { transform: `rotate(${aktuellerWinkelGrad}, ${cx}, ${cy})` });
  const griffHalbbreite = r - 8;
  griff.appendChild(svgEl('rect', {
    x: cx - griffHalbbreite, y: cy - 8, width: griffHalbbreite * 2, height: 16, rx: 2, ry: 2, fill: '#555555'
  }));
  griff.appendChild(svgEl('line', {
    x1: cx + 5, y1: cy, x2: cx + griffHalbbreite - 2, y2: cy,
    stroke: '#ffffff', 'stroke-width': 3, 'stroke-linecap': 'round'
  }));
  g.appendChild(griff);

  if (onFunktionKlick) g.addEventListener('click', onFunktionKlick);
  svg.appendChild(g);
}

export const MessgeraetView = {
  BEISPIEL_ZUSTAND,
  zustandFuerFunktion,
  naechsteFunktion,
  berechneLimText,

  render(container, zustand = BEISPIEL_ZUSTAND, onKlick = {}) {
    const svg = svgEl('svg', {
      width: ANZEIGE_BREITE, height: ANZEIGE_HOEHE, viewBox: `0 0 ${BREITE} ${HOEHE}`,
      'font-family': 'Arial, sans-serif'
    });
    container.innerHTML = '';
    container.appendChild(svg);

    svg.appendChild(svgEl('rect', { width: BREITE, height: HOEHE, rx: 12, fill: '#cc0000' }));
    svg.appendChild(svgEl('rect', { x: 8, y: 8, width: BREITE - 16, height: HOEHE - 16, rx: 10, fill: '#dd1111' }));
    svg.appendChild(text('BENNING IT 130', {
      x: BREITE / 2, y: 35, 'text-anchor': 'middle', 'font-size': 11, fill: '#ffffff', 'letter-spacing': 2
    }));

    zeichneDisplay(svg, zustand);

    // TEST-Taste: rund, silber (Verlauf via zwei konzentrische Kreise simuliert)
    const testGruppe = svgEl('g', { style: onKlick.test ? 'cursor:pointer' : '' });
    testGruppe.appendChild(svgEl('circle', { cx: TEST_TASTE.cx, cy: TEST_TASTE.cy, r: 24, fill: '#cccccc', stroke: '#888888', 'stroke-width': 2 }));
    testGruppe.appendChild(svgEl('circle', { cx: TEST_TASTE.cx, cy: TEST_TASTE.cy, r: 18, fill: '#eeeeee', stroke: '#aaaaaa', 'stroke-width': 1.5 }));
    testGruppe.appendChild(text('TEST', {
      x: TEST_TASTE.cx, y: TEST_TASTE.cy + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 'bold',
      fill: '#333333', stroke: '#333333', 'stroke-width': 0.6
    }));
    if (onKlick.test) testGruppe.addEventListener('click', onKlick.test);
    svg.appendChild(testGruppe);

    // Pfeiltasten
    taste(svg, { x: 110, y: 81, breite: 48, hoehe: 24, label: '▲', onKlick: onKlick.auf });
    taste(svg, { x: 110, y: 123, breite: 48, hoehe: 24, label: '▼', onKlick: onKlick.ab });
    taste(svg, { x: 110, y: 163, breite: 48, hoehe: 24, label: '◄►', onKlick: onKlick.seite });

    zeichneDrehknopf(svg, zustand, onKlick.drehknopf);

    // ON/OFF und CAL
    taste(svg, { x: 478, y: 219, breite: 60, hoehe: 30, label: 'ON/OFF', fontSize: 13, onKlick: onKlick.onOff });
    taste(svg, { x: 560, y: 219, breite: 60, hoehe: 30, label: 'CAL', fontSize: 13, onKlick: onKlick.cal });

    return svg;
  }
};
