// Sechstes View-Objekt, neben dem Messgerät (siehe Projekt-Memory
// "Handy-Widget Vision"). Bisher umgesetzt (User-Vorgabe, kleine Schritte):
// Homescreen (2026-08-03), erste Navigation (2026-08-04) - weißes
// Replay-Icon antippen zeigt die "Replay bereit"-Ansicht (Sanduhr, Play-/
// Schritt-Button, X zum Schließen), X bringt zurück zum Homescreen. Das
// blaue Timer-Icon ist bewusst noch NICHT klickbar (nächster, noch kleinerer
// Schritt), Play-/Schritt-Button in der Replay-Ansicht noch ohne Funktion
// (reine Darstellung).
//
// Geometrie 1:1 aus der Vorlage
// C:\Users\rembo\Documents\Classes\Pics\handy.svg übernommen (Inkscape-
// Export, dieselbe Technik wie bei view/schraubendreher.js/view/steckdosen.js).
// Die Vorlage zeichnet FÜNF Handy-Zustände nebeneinander (Homescreen oben,
// darunter je ein "läuft"/"bereit"-Zustandspaar für Replay und Timer) - jeder
// Zustand ist in der Vorlage eine eigene, separat positionierte
// Bauteilgruppe mit eigenen absoluten Koordinaten. Um trotzdem alle
// Pfad-Daten 1:1 (unverändert) übernehmen zu können, wird beim Abtippen
// einer Nicht-Homescreen-Gruppe deren fester Koordinaten-Versatz zur
// Homescreen-Gruppe (deltaX/deltaY, siehe REPLAY_BEREIT_VERSATZ) einmalig
// ausgerechnet und auf jede ihrer Koordinaten angewendet - siehe
// ARCHITEKTUR.md "handy.js" für die Herleitung.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Interne Koordinaten (= Bounding Box der äußeren Handy-Umrandung in der
// Vorlage, dort mm).
const BREITE = 52.93573;
const HOEHE = 93.401024;
const SCREEN_X = 114.74207;
const SCREEN_BREITE = 48.86375;
const SCREEN_Y = 6.9776216;

// Das dreieckige "Stern"-Pfad-Motiv der Vorlage (sodipodi:type="star",
// 3 Seiten) - wird, je nach Transform, sowohl als (fast symmetrische)
// Sanduhr als auch als (gestrecktes) Play-Dreieck verwendet. EIN
// gemeinsamer Pfad, unterschiedliche Transforms - analog zur bereits
// bestehenden Wiederverwendung des Marker-Pfeils unten.
const STERN_PFAD = 'm 75.07712,151.17224 -22.405591,-9.71452 -22.405592,-9.71451 19.61581,-14.54655 19.61581,-14.54656 2.789782,24.26107 z';

// Versatz der "Replay bereit"-Bauteilgruppe (mittig rechts in der Vorlage,
// Ausgangsgruppe `rect1-1-2-6-7-1`, x=114.13277/y=101.28427) relativ zur
// Homescreen-Gruppe (x=112.85606/y=4.8840661) - einmal ausgerechnet, auf
// jede aus der Vorlage übernommene Koordinate dieses Zustands angewendet.
const REPLAY_BEREIT_DX = 112.85606 - 114.13277;
const REPLAY_BEREIT_DY = 4.8840661 - 101.28427;

// Versatz der "Timer bereit"-Bauteilgruppe (unten rechts in der Vorlage,
// Ausgangsgruppe `rect1-1-2-6`, x=113.77376/y=197.77686) relativ zur
// Homescreen-Gruppe - analog zu REPLAY_BEREIT_DX/DY oben, hier aber als
// EIN wrappendes `<g transform="translate(...)">` angewendet (siehe
// zeichneTimerBereit()) statt pro Koordinate einzeln zu verschieben -
// robuster bei Elementen mit eigenem Transform (z.B. der Ring-Pfad, der
// selbst schon Skalierung/Rotation trägt).
const TIMER_BEREIT_DX = 112.85606 - 113.77376;
const TIMER_BEREIT_DY = 4.8840661 - 197.77686;

// Bildschirmhöhe der App-Zustände (Replay/Timer bereit) - beide identisch,
// etwas höher als die des Homescreens (siehe SCREEN_HOEHE in
// zeichneHomescreen()), aus der Vorlage übernommen.
const APP_SCREEN_HOEHE = 87.038559;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Äußere Umrandung (dunkelgrau) - MUSS vor dem eigentlichen Screen-Inhalt
// gezeichnet werden (sonst würde die Umrandung selbst über den Screen
// malen), aber selbst physisch am Gerät und unabhängig vom aktuell
// angezeigten Zustand immer gleich.
function zeichneGehaeuseKoerper(g) {
  g.appendChild(svgEl('rect', {
    fill: '#333333', width: BREITE, height: HOEHE,
    x: 112.85606, y: 4.8840661, rx: 6.1079679, ry: 6.6169629
  }));
}

// Notch/Kamera, Mikrofon-Schlitz - ebenfalls physisch am Gerät und
// zustandsunabhängig, aber bewusst ERST NACH dem Screen-Inhalt gezeichnet
// (siehe render() unten): der Notch liegt geometrisch INNERHALB des
// Screen-Bereichs (Homescreen/App-Screens beginnen knapp oberhalb des
// Notchs) - würde er VOR dem Screen gezeichnet, würde das (undurchsichtige)
// Screen-Rechteck ihn komplett zudecken. Bug, der genau so beim Aufteilen
// dieser Funktion in "Körper"/"Notch" entstanden war (User: "du hast die
// kamera irgendwie verloren") - vorher stand alles in einer Funktion VOR
// dem Screen, was nur zufällig funktionierte, weil der Screen damals
// zufällig noch vor dem Notch gezeichnet wurde.
function zeichneNotchUndMikrofon(g) {
  g.appendChild(svgEl('circle', { fill: '#999999', cx: 139.083541, cy: 11.325195, r: 2.9267344 }));
  g.appendChild(svgEl('circle', { fill: '#000000', cx: 138.997741, cy: 11.405506, r: 1.2724928 }));
  // Mikrofon-Schlitz unten mittig (User-Klarstellung 2026-08-04: "das ist
  // kein Home-Indikator-Balken, dieser weiße Streifen soll das Mikro
  // darstellen" - inkl. der schwarzen Umrandung). Liegt unterhalb des
  // Screen-Bereichs, wäre also von diesem Bug nicht betroffen gewesen -
  // hier trotzdem am selben Ort (nach dem Screen) gezeichnet, da beide
  // Elemente physisch/zustandsunabhängig zusammengehören.
  g.appendChild(svgEl('rect', {
    fill: '#999999', stroke: '#000000', 'stroke-width': 0.121733,
    width: 8.1635857, height: 0.64028132, x: 134.78569, y: 94.763552,
    rx: 0.44920439, ry: 0.44920439
  }));
}

function zeichneHomescreen(g, { onTimerIconKlick, onReplayIconKlick } = {}) {
  // Bildschirm (weiß). Höhe endet VOR dem unteren Rand der Umrandung - der
  // dunkle Rand (#333333, siehe zeichneGehaeuse()) bleibt dort sichtbar,
  // damit der Mikrofon-Schlitz auf dunklem statt weißem Grund liegt
  // (User-Klarstellung 2026-08-04, aus einem bearbeiteten Export abgemessen).
  const SCREEN_HOEHE = 85.007149;
  g.appendChild(svgEl('rect', {
    fill: '#ffffff', width: SCREEN_BREITE, height: SCREEN_HOEHE,
    x: SCREEN_X, y: SCREEN_Y, rx: 4.3264818, ry: 4.835474
  }));

  // Icon-Reihe zentriert im Bildschirm (User-Vorgabe 2026-08-04: "die zwei
  // Apps im Handy alignen"), Icon-Größe verkleinert und die Reihe enger
  // zusammengerückt (User-Vorgabe 2026-08-04: "die icons sind kleiner
  // geworden [und] mehr in die Mitte versetzt" - Werte aus einem vom User
  // in Inkscape bearbeiteten Export dieser Ansicht abgemessen). Beide Icons
  // werden um denselben Faktor ICON_SKALIERUNG verkleinert (Seitenverhältnis
  // bleibt dadurch erhalten) statt nur `width`/`height` des Rects zu ändern
  // - sonst würde nur der Rahmen schrumpfen, das Glyph darin (das weiterhin
  // die absoluten Vorlage-Koordinaten nutzt) aber gleich groß bleiben und
  // über den Rand hinausragen.
  const ICON_SKALIERUNG = 0.887;
  const ICON_BREITE = 19.341904 * ICON_SKALIERUNG;
  const ICON_ABSTAND = 2.16;
  const ICON_Y = 17;
  const iconReiheBreite = 2 * ICON_BREITE + ICON_ABSTAND;
  const icon1X = SCREEN_X + (SCREEN_BREITE - iconReiheBreite) / 2;
  const icon2X = icon1X + ICON_BREITE + ICON_ABSTAND;

  // Icon 1: Timer-App (blaues Feld, schwarzer Ring-Pfeil - nimmt optisch
  // den Countdown-Ring der späteren Timer-App-Ansicht vorweg). Rect + Glyph
  // bleiben in ihren ORIGINALEN Vorlage-Koordinaten (x=118.47224/
  // y=17.258389, Breite/Höhe 19.341904/16.033417) - die Gruppe skaliert
  // beides gemeinsam um ICON_SKALIERUNG (Pivot: die Rect-Ecke selbst) und
  // verschiebt das Ergebnis an die neue Zielposition (icon1X, ICON_Y).
  // Klickbar, sobald `onTimerIconKlick` mitgegeben wird (siehe render()
  // unten) - kein `pointer-events:all` nötig, das Rect hat bereits eine
  // solide Füllung (`#0082fe`), anders als Icon 2 unten.
  const icon1Gruppe = svgEl('g', {
    transform: `translate(${icon1X},${ICON_Y}) scale(${ICON_SKALIERUNG}) translate(${-118.47224},${-17.258389})`,
    style: onTimerIconKlick ? 'cursor:pointer' : ''
  });
  if (onTimerIconKlick) icon1Gruppe.addEventListener('click', onTimerIconKlick);
  g.appendChild(icon1Gruppe);
  icon1Gruppe.appendChild(svgEl('rect', {
    fill: '#0082fe', width: 19.341904, height: 16.033417,
    x: 118.47224, y: 17.258389, rx: 3.5629842, ry: 4.3264704
  }));
  icon1Gruppe.appendChild(svgEl('path', {
    fill: 'none', stroke: '#000000', 'stroke-width': 2.156,
    d: 'm 128.11286,21.111819 a 3.9447436,3.944757 0 0 1 3.81513,3.05879 3.9447436,3.944757 0 0 1 -2.09162,4.420022 3.9447436,3.944757 0 0 1 -4.78435,-1.010638 3.9447436,3.944757 0 0 1 -0.12535,-4.888332'
  }));

  // Icon 2: Replay-App (weißes Feld mit schwarzer Umrandung, Pfad aus vier
  // Knoten - Sinnbild für den Fahrplan als Route durch mehrere Messpunkte).
  // Analog skaliert/verschoben (Pivot: x=140.75536/y=16.049719). Klickbar,
  // sobald `onReplayIconKlick` mitgegeben wird (siehe render() unten).
  const icon2Gruppe = svgEl('g', {
    transform: `translate(${icon2X},${ICON_Y}) scale(${ICON_SKALIERUNG}) translate(${-140.75536},${-16.049719})`,
    style: onReplayIconKlick ? 'cursor:pointer' : ''
  });
  if (onReplayIconKlick) icon2Gruppe.addEventListener('click', onReplayIconKlick);
  g.appendChild(icon2Gruppe);
  // `pointer-events: all` nötig, da dieses Rect `fill: none` hat (nur die
  // Umrandung ist sichtbar) - ohne das würde ein Klick in die transparente
  // Mitte des Icons "durchfallen" und stattdessen den darunterliegenden
  // (weißen) Bildschirm-Hintergrund treffen, nicht dieses Icon (selbst beim
  // Testen dieses Schritts gefunden, siehe ARCHITEKTUR.md "handy.js").
  icon2Gruppe.appendChild(svgEl('rect', {
    fill: 'none', stroke: '#000000', 'stroke-width': 0.356001,
    'pointer-events': 'all',
    width: 19.341904, height: 16.033417, x: 140.75536, y: 16.049719,
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
}

// Verschiebt eine einzelne absolute Koordinate (x oder y) der
// "Replay bereit"-Gruppe der Vorlage in Homescreen-relative Koordinaten
// (siehe REPLAY_BEREIT_DX/DY oben, hergeleitet in ARCHITEKTUR.md).
function replayBereitX(x) { return x + REPLAY_BEREIT_DX; }
function replayBereitY(y) { return y + REPLAY_BEREIT_DY; }

function zeichneReplayBereit(g, { onSchliessenKlick } = {}) {
  // Bildschirm (schwarz, App aktiv) - eigene Höhe (etwas höher als beim
  // Homescreen, aus der Vorlage übernommen), X/Y/Breite ansonsten identisch.
  g.appendChild(svgEl('rect', {
    fill: '#000000', width: SCREEN_BREITE, height: APP_SCREEN_HOEHE,
    x: SCREEN_X, y: SCREEN_Y, rx: 4.3264818, ry: 4.835474
  }));

  // Sanduhr (weiß, statisch - "bereit", noch nicht gestartet). Besteht aus
  // ZWEI überlagerten STERN_PFAD-Instanzen (in der Vorlage selbst schon so
  // gelöst, nicht meine Vereinfachung): die untere Hälfte ist ein normal
  // gefülltes Dreieck, die obere Hälfte ein SCHWARZ gefülltes Dreieck mit
  // sehr dicker weißer Umrandung (`stroke-width: 8.0867`) - die dicke
  // Umrandung selbst bildet die sichtbare "hohle" obere Dreieckshälfte,
  // nicht die (unsichtbare, weil schwarze) Füllung. Ohne dieses zweite
  // Element sieht die Sanduhr wie ein simples Dreieck aus, nicht wie eine
  // Sanduhr (selbst beim Umsetzen dieses Schritts entdeckt - durch
  // Pixel-für-Pixel-Vergleich mit der Vorlage gefunden, siehe
  // ARCHITEKTUR.md "handy.js").
  g.appendChild(svgEl('path', {
    fill: '#ffffff',
    transform: `matrix(0.12639794,-0.04757882,0.05252797,0.11513767,${replayBereitX(127.13875)},${replayBereitY(132.1086)})`,
    d: STERN_PFAD
  }));
  g.appendChild(svgEl('path', {
    fill: '#000000', stroke: '#ffffff', 'stroke-width': 8.0867,
    transform: `matrix(-0.12676924,0.0468149,-0.05162096,-0.11545194,${replayBereitX(155.1938)},${replayBereitY(150.22432)})`,
    d: STERN_PFAD
  }));

  // Play-Button (weißes Feld, schwarze Umrandung + Dreieck) - noch ohne
  // Funktion (User-Vorgabe: erst die Navigation selbst, Wiedergabe folgt
  // als eigener, späterer Schritt).
  g.appendChild(svgEl('rect', {
    fill: '#ffffff', stroke: '#000000', 'stroke-width': 0.356001,
    width: 19.850899, height: 15.778917,
    x: replayBereitX(119.42734), y: replayBereitY(166.99533),
    rx: 3.5629838, ry: 4.3264704
  }));
  g.appendChild(svgEl('path', {
    fill: '#000a00', stroke: '#000000', 'stroke-width': 1.76536,
    transform: `matrix(0.08068112,0.1817278,-0.18906771,0.07817571,${replayBereitX(148.44769)},${replayBereitY(154.73025)})`,
    d: STERN_PFAD
  }));

  // Schritt-Button (weißes Feld, schwarze Umrandung + zwei Punkte mit
  // Pfeil-Verbindung) - ebenfalls noch ohne Funktion.
  g.appendChild(svgEl('rect', {
    fill: '#ffffff', stroke: '#000000', 'stroke-width': 0.356001,
    width: 19.596401, height: 15.269919,
    x: replayBereitX(142.24512), y: replayBereitY(167.46288),
    rx: 3.562984, ry: 4.3264704
  }));
  g.appendChild(svgEl('path', {
    fill: '#000a00', stroke: '#000000', 'stroke-width': 0.356,
    d: `m ${replayBereitX(147.27629)},${replayBereitY(174.08868)} a 1.6504924,1.8919096 0 0 1 2.30825,-0.26354 1.6504924,1.8919096 0 0 1 0.25843,2.64242 1.6504924,1.8919096 0 0 1 -2.30187,0.32888 1.6504924,1.8919096 0 0 1 -0.31534,-2.63429 l 1.32104,1.13416 z`
  }));
  g.appendChild(svgEl('path', {
    fill: '#000a00', stroke: '#000000', 'stroke-width': 0.356,
    d: `m ${replayBereitX(153.9289)},${replayBereitY(174.15378)} a 1.6504924,1.8919096 0 0 1 2.30826,-0.26354 1.6504924,1.8919096 0 0 1 0.25843,2.64242 1.6504924,1.8919096 0 0 1 -2.30187,0.32887 1.6504924,1.8919096 0 0 1 -0.31534,-2.63429 l 1.32104,1.13416 z`
  }));
  g.appendChild(svgEl('path', {
    fill: 'none', stroke: '#000000', 'stroke-width': 0.455998, 'marker-end': 'url(#handy-pfeil)',
    d: `m ${replayBereitX(147.41209)},${replayBereitY(175.29632)} h 5.66707`
  }));

  // X-Button oben rechts, schließt die App zurück zum Homescreen
  // (User-Vorgabe 2026-08-04: "damit kommst du wieder zurück in den Zustand
  // oben rechts").
  const schliessenGruppe = svgEl('g', {
    transform: `translate(${replayBereitX(86.565136)},${replayBereitY(62.168278)})`,
    style: onSchliessenKlick ? 'cursor:pointer' : ''
  });
  if (onSchliessenKlick) schliessenGruppe.addEventListener('click', onSchliessenKlick);
  g.appendChild(schliessenGruppe);
  schliessenGruppe.appendChild(svgEl('circle', { fill: '#666666', cx: 69.04763, cy: 56.184998, r: 5.2172227 }));
  const schliessenText = svgEl('text', {
    x: 65.883194, y: 59.367714, fill: '#ffffff', 'font-size': '7.45064px',
    transform: 'scale(1.010187,0.98991573)'
  });
  schliessenText.textContent = 'X';
  schliessenGruppe.appendChild(schliessenText);
}

// Alle Koordinaten hier sind UNVERÄNDERT aus der Vorlage übernommen (nicht
// wie bei zeichneReplayBereit() einzeln per Hilfsfunktion verschoben) - die
// äußere Gruppe unten übernimmt die komplette Positionierung auf einmal.
// Robuster für Elemente mit eigenem Transform (z.B. der Ring-Pfad `path1-8-7`
// oder der Play-Button, die selbst schon eine Skalierung/Rotation tragen) -
// ein Koordinaten-Offset per Hand hätte dort mit dem bestehenden Transform
// verrechnet werden müssen, statt nur einmal am Schluss addiert zu werden.
function zeichneTimerBereit(g, { onSchliessenKlick } = {}) {
  const gruppe = svgEl('g', { transform: `translate(${TIMER_BEREIT_DX},${TIMER_BEREIT_DY})` });
  g.appendChild(gruppe);

  // Bildschirm (schwarz, App aktiv).
  gruppe.appendChild(svgEl('rect', {
    fill: '#000000', width: SCREEN_BREITE, height: APP_SCREEN_HOEHE,
    x: 115.65977, y: 199.87042, rx: 4.3264818, ry: 4.835474
  }));

  // Ring (blau, fast geschlossen - User-Vorgabe 2026-08-04: "Achte darauf,
  // dass der blaue Kreis fast geschlossen ist") + "45:00"-Text (weiß, aus
  // dem `tspan`-Stil der Vorlage übernommen - der äußere `<text>`-Stil dort
  // sagt zwar fill:#0000ff, wird aber vom `tspan` mit fill:#ffffff
  // überschrieben, das ist also die tatsächlich sichtbare Farbe).
  gruppe.appendChild(svgEl('path', {
    fill: 'none', stroke: '#0082f5', 'stroke-width': 3.356,
    d: 'm 140.49241,229.65801 a 12.852182,12.85218 0 0 1 12.75815,12.84823 12.852182,12.85218 0 0 1 -12.75094,12.85538 12.852182,12.85218 0 0 1 -12.95189,-12.65291 12.852182,12.85218 0 0 1 12.55416,-13.04763'
  }));
  const zeitText = svgEl('text', {
    x: 135.40381, y: 239.44341, fill: '#ffffff', 'font-size': '5.3959px',
    transform: 'scale(0.97961154,1.0208128)'
  });
  zeitText.textContent = '45:00';
  gruppe.appendChild(zeitText);

  // Play-Button (blaues Feld, schwarzes Dreieck) - noch ohne Funktion
  // (User-Vorgabe: "lass den erst ohne funktion. es kommt aber noch eine!").
  const playGruppe = svgEl('g', { transform: 'matrix(0.86516855,0,0,0.92857142,28.47526,19.069227)' });
  gruppe.appendChild(playGruppe);
  playGruppe.appendChild(svgEl('rect', {
    fill: '#0082fe', width: 22.650387, height: 17.814907,
    x: 116.81491, y: 263.40616, rx: 4.1182542, ry: 4.659276
  }));
  playGruppe.appendChild(svgEl('path', {
    fill: '#000a00', stroke: '#000000', 'stroke-width': 1.96959,
    transform: 'matrix(0.08068112,0.1817278,-0.18906771,0.07817571,147.10775,251.90458)',
    d: STERN_PFAD
  }));

  // X-Button oben rechts, schließt zurück zum Homescreen (dieselbe Semantik
  // wie bei zeichneReplayBereit()).
  const schliessenGruppe = svgEl('g', {
    transform: 'translate(87.14711,160.54285)',
    style: onSchliessenKlick ? 'cursor:pointer' : ''
  });
  if (onSchliessenKlick) schliessenGruppe.addEventListener('click', onSchliessenKlick);
  gruppe.appendChild(schliessenGruppe);
  schliessenGruppe.appendChild(svgEl('circle', { fill: '#666666', cx: 69.04763, cy: 56.184998, r: 5.2172227 }));
  const schliessenText = svgEl('text', {
    x: 65.883194, y: 59.367714, fill: '#ffffff', 'font-size': '7.45064px',
    transform: 'scale(1.010187,0.98991573)'
  });
  schliessenText.textContent = 'X';
  schliessenGruppe.appendChild(schliessenText);
}

export const HandyView = {
  // `anzeigeHoehe`: reale Zielhöhe in px - analog zu SchraubendreherView,
  // damit beide Bauteile derselben Messgerät-Höhe folgen. `zustand`:
  // 'homescreen' (Default) oder 'replay-bereit'. `callbacks`:
  // `onReplayIconKlick`/`onSchliessenKlick` (jeweils optional - ohne wird
  // nur gezeichnet, ohne Interaktion, z.B. für reine Darstellungs-Tests).
  render(container, anzeigeHoehe, zustand = 'homescreen', callbacks = {}) {
    const anzeigeBreite = BREITE * (anzeigeHoehe / HOEHE);

    const svg = svgEl('svg', {
      width: anzeigeBreite, height: anzeigeHoehe, viewBox: `0 0 ${BREITE} ${HOEHE}`
    });
    container.innerHTML = '';
    container.appendChild(svg);

    // EIN Pfeil-Marker für die Verbindungslinien im Replay-Icon UND im
    // Schritt-Button der "Replay bereit"-Ansicht (die Vorlage hat mehrere
    // optisch identische Marker-Defs, da Inkscape pro Linie einen eigenen
    // dupliziert - hier bewusst nur einer, wiederverwendet).
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

    // Reihenfolge wichtig (siehe Kommentar an zeichneNotchUndMikrofon()):
    // Körper zuerst, dann der Screen-Inhalt, dann Notch/Mikrofon ZULETZT -
    // sonst deckt der Screen den Notch zu.
    zeichneGehaeuseKoerper(g);
    if (zustand === 'replay-bereit') {
      zeichneReplayBereit(g, callbacks);
    } else if (zustand === 'timer-bereit') {
      zeichneTimerBereit(g, callbacks);
    } else {
      zeichneHomescreen(g, callbacks);
    }
    zeichneNotchUndMikrofon(g);

    return { svg };
  }
};
