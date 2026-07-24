import { Anlage } from '../model/anlage.js';
import { SchaltkastenView } from '../view/schaltkasten.js';
import { MessgeraetView } from '../view/messgeraet.js';
import { ProtokollView } from '../view/protokoll.js';
import { SteckdosenView } from '../view/steckdosen.js';
import { SchraubendreherView } from '../view/schraubendreher.js';
import { Popup } from '../view/popup.js';
import { findePfad, berechneWiderstand, istSpannungFuehrend } from '../model/pfad.js';

// Messspitzen (Messmodus, siehe unten): pro Schrauben-Kreis genau eine Farbe,
// jede Farbe insgesamt nur an einer Schraube gleichzeitig (3 Messspitzen wie
// beim echten Gerät: L/N/PE). Kreis-Element als Map-Key, da jede Schraube im
// Schaltkasten-SVG genau ein solches Element ist und sich nie ändert.
const MESSSPITZEN_FARBEN = ['schwarz', 'blau', 'grün'];
const MESSSPITZEN_FARBWERTE = { schwarz: '#111111', blau: '#2255cc', 'grün': '#22aa44' };

function svgKreis(attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Mittelpunkt eines Schrauben-Elements - meist ein <circle> (hat schon
// cx/cy), aber die PE-Kontakte an der Steckdose sind <rect>s (siehe
// view/steckdosen.js zeichneSteckdose()), die kein cx/cy haben und deren
// Mitte deshalb aus x/y/width/height berechnet werden muss.
function schraubenMitte(el) {
  if (el.tagName === 'rect') {
    return {
      cx: parseFloat(el.getAttribute('x')) + parseFloat(el.getAttribute('width')) / 2,
      cy: parseFloat(el.getAttribute('y')) + parseFloat(el.getAttribute('height')) / 2
    };
  }
  return { cx: el.getAttribute('cx'), cy: el.getAttribute('cy') };
}

// Nächster Zustand im Zyklus leer -> schwarz -> blau -> grün -> leer -> ...,
// wobei eine Farbe übersprungen wird, wenn sie gerade an einer ANDEREN
// Schraube hängt (max. 3 Messspitzen gleichzeitig, da nur 3 Farben).
function naechsteMessspitzenFarbe(aktuelleFarbe, belegteFarben) {
  const sequenz = [null, ...MESSSPITZEN_FARBEN];
  let index = sequenz.indexOf(aktuelleFarbe);
  for (let i = 0; i < sequenz.length; i++) {
    index = (index + 1) % sequenz.length;
    const kandidat = sequenz[index];
    if (kandidat === null || !belegteFarben.has(kandidat)) return kandidat;
  }
  return aktuelleFarbe;
}

async function start() {
  const container = document.getElementById('schaltkasten');
  const pfad = new URLSearchParams(window.location.search).get('anlage') ?? 'anlagen/beispiel_eg.json';
  const anlage = await Anlage.laden(pfad);

  // Verbindungsgraph für die Pfadverfolgung (RLOW, siehe KONZEPT.md
  // "Pfadverfolgung und Fehlersimulation") - null, wenn der Testcase keinen
  // Netzplan hat (z.B. die handgepflegte beispiel_eg.json). Ohne Graph bleibt
  // RLOW einfach beim Platzhalter, kein Fehlerfall.
  const graph = await Anlage.ladeGraph(pfad);

  // kreis-Element -> Farbe bzw. -> zugehörige Ader (für die Pfadsuche: welche
  // Funktion/welches Netz hängt an dieser Schraube) bzw. -> Overlay-Kreis-Element.
  const messspitzenFarbe = new Map();
  const messspitzenAder = new Map();
  const messspitzenOverlay = new Map();

  // Schraubendreher-Werkzeug (siehe KONZEPT.md "Schrauben lösen" / Projekt-
  // Memory "Schrauben lösen Idee"): `schraubendreherAufgenommen` ist true,
  // solange das Werkzeug "in der Hand" ist (Icon verschwindet aus der
  // Ruheposition neben dem Messgerät). `geloesteSchrauben` merkt sich pro
  // Schrauben-Element das weiße Overlay - verhindert doppeltes Lösen
  // derselben Schraube und wird zum Wiedereindrehen (Umschalten) gebraucht.
  // Maximal SCHRAUBENDREHER_MAX_GELOEST gleichzeitig gelöste Schrauben
  // (User-Vorgabe, Zwischenschritt vor der Kanten-Kappung: "ich will nicht,
  // dass der User alle Schrauben erst mal aufdreht") - Wiedereindrehen ist
  // davon nicht betroffen (reduziert `geloesteSchrauben.size` ja gerade).
  let schraubendreherAufgenommen = false;
  const geloesteSchrauben = new Map();
  const SCHRAUBENDREHER_MAX_GELOEST = 2;

  // Kanten, die aktuell durch den Schraubendreher gekappt sind (Set von
  // Kanten-Objekten aus `graph`, nicht Schrauben-Elementen - eine Kante kann
  // über mehrere Schrauben-Klicks hinweg eindeutig identifiziert werden,
  // siehe findeSchraubenKanten()). Nötig, damit schalterUmschalten() unten
  // eine per Schraubendreher gekappte Kante NICHT wieder schließt, nur weil
  // derselbe Schalter (z.B. das RCD) auf/zu geklickt wird - Bug-Report
  // testcase_06: Schraube am RCD-Eingang gelöst (0V, korrekt), RCD-Schalter
  // auf/zu geklickt → Kante wurde von schalterUmschalten() fälschlich wieder
  // geschlossen, obwohl die Schraube weiterhin sichtbar gelöst war.
  const geloesteKanten = new Set();

  // Schalter (LS/RCD/Hauptschalter, siehe KONZEPT.md "Schalter"): ein Klick
  // auf den Hebel im Schaltkasten schaltet ALLE Kanten im Verbindungsgraphen
  // um, die zu diesem Bauteil gehören (bei mehrpoligen Bauteilen mehrere
  // Kanten gleichzeitig, eine je Pol/Funktion - z.B. ein 4-poliges RCD
  // betrifft Kanten in L1/L2/L3/N zugleich). Zustand lebt direkt im
  // `graph`-Objekt (`kante.geschlossen`), nicht in einer eigenen Map -
  // bewusst NICHT beim Ausschalten des Messgeräts zurückgesetzt (anders als
  // Messspitzen): ein Schalter bildet den echten Zustand der Anlage ab, der
  // bleibt bestehen, auch wenn man gerade nicht misst.
  function schalterUmschalten(bauteilName, geschlossen) {
    if (!graph) return;
    // Nur die Funktions-Teilgraphen (L1/L2/L3/N), nicht `graph.fehlertabelle`
    // (kein Teilgraph, siehe Anbindung der Fehlertabelle unten).
    for (const funktion of Object.keys(graph).filter((k) => graph[k]?.kanten)) {
      for (const kante of graph[funktion].kanten) {
        if (kante.bauteil !== bauteilName) continue;
        // Der gewünschte Schalter-Zustand wird immer gemerkt (fürs spätere
        // Wiedereindrehen, siehe unten), aber eine per Schraubendreher
        // gekappte Kante bleibt offen, bis sie explizit wiedereingedreht
        // wird - der Schalter allein darf sie nicht wieder schließen.
        kante._schalterSoll = geschlossen;
        if (!geloesteKanten.has(kante)) kante.geschlossen = geschlossen;
      }
    }
    renderMessgeraet(); // RLOW misst kontinuierlich, siehe unten
  }

  // Findet ALLE Kanten im Verbindungsgraphen, die zu einer bestimmten
  // Schraube gehören (Schraubendreher-Werkzeug, siehe KONZEPT.md "Schrauben
  // lösen") - anders als schalterUmschalten() oben (kappt ALLE Pole eines
  // Bauteils gleichzeitig) betrifft eine einzelne Schraube immer nur EINEN
  // Pol/eine Funktion, aber ggf. MEHRERE Kanten: eine physische Schraube
  // kann mehrere Adern gleichzeitig tragen (siehe schaltkasten.js
  // schraube() `data-netz-weitere` - z.B. RCD2.o1, das gleichzeitig LS2 UND
  // LS3 speist, siehe testcase_01 Annahme 2/testcase_05 AFDD). Alle
  // Netz-IDs dieser einen Schraube (Haupt-Ader `ader.netz` + `ader.weitere`)
  // werden gegen `von`/`nach` aller Kanten dieses Bauteils geprüft - beim
  // echten Aufdrehen einer Klemme lösen sich schließlich auch ALLE
  // darunterliegenden Adern gleichzeitig, nicht nur eine (**behobener Bug,
  // User-gemeldet, testcase_05**: eine geteilte RCD-Ausgangsschraube löste
  // bisher nur die ERSTE der beiden Adern, `.find()` statt `.filter()` -
  // die andere blieb elektrisch verbunden, obwohl die Schraube optisch
  // komplett gelöst aussah). `kreis.dataset.bauteil` (siehe schaltkasten.js
  // schraube()) plus `ader.funktion` identifizieren das Bauteil/den Pol -
  // eine Ader/Netz-ID allein würde nicht reichen, da mehrere Bauteile
  // denselben Ausgangspin/dieselbe Ader teilen können. Liefert ein leeres
  // Array, wenn kein Graph existiert, die Schraube keinen Bauteilnamen
  // trägt (aktuell nur Steckdosen-Kontakte, die das Werkzeug ohnehin nicht
  // unterstützen), oder die Funktion PE ist (PE ist noch nicht Teil des
  // Verbindungsgraphen, siehe KONZEPT.md "Nächste Schritte" -
  // PE-Teilgraph) - der Lösen-/Wiedereindrehen-Kreis bleibt in diesen
  // Fällen weiterhin rein visuell, ohne Absturz.
  function findeSchraubenKanten(ader, kreis) {
    const bauteilName = kreis.dataset.bauteil;
    if (!graph || !bauteilName) return [];
    const netzeDieserSchraube = [ader.netz, ...(ader.weitere ?? []).map((w) => w.netz)];
    const kanten = graph[ader.funktion]?.kanten ?? [];
    return kanten.filter((k) =>
      k.bauteil === bauteilName && (netzeDieserSchraube.includes(k.von) || netzeDieserSchraube.includes(k.nach))
    );
  }

  // Klick auf eine Schraube/einen Kontaktpunkt - identisch für Schaltkasten-
  // UND Steckdosen-Kontakte (siehe view/steckdosen.js), da diese Funktion
  // nichts Schaltkasten-Spezifisches referenziert, nur `kreis`/`ader` aus dem
  // jeweiligen Aufruf.
  function onSchraubeKlick(ader, x, y, kreis) {
    // Schraubendreher-Werkzeug hat Vorrang vor Messspitzen UND Popup - hat
    // nichts mit dem An/Aus-Zustand des Messgeräts zu tun (bleibt davon
    // unberührt, siehe Projekt-Memory "Schrauben lösen Idee"). Bei einer
    // Schraube mit Messspitze ODER einem Steckdosen-Kontakt bleibt das
    // Werkzeug aufgenommen (User kann direkt eine andere Schraube probieren,
    // ohne erneut aufzunehmen) - ist das Maximum gelöster Schrauben bereits
    // erreicht, wird das Werkzeug dagegen zurückgelegt (User-Feedback,
    // Handling-Problem 2026-07-23: "besser, wenn der Schraubenzieher wieder
    // hingelegt wird, wenn bereits zwei Punkte gesetzt sind" - der Grund
    // ("keine weitere Schraube geht mehr") ist ein anderer als bei den
    // beiden erstgenannten Fällen und soll sich deshalb auch anders anfühlen).
    if (schraubendreherAufgenommen) {
      // Steckdosen-Kontakte (Steckdose/Anschlussdose/Drehstromsteckdose/
      // 5-polige Anschlussdose, siehe view/steckdosen.js) unterstützen das
      // Werkzeug (noch) nicht - nur Schaltkasten-Schrauben (User-Vorgabe,
      // Zwischenschritt vor der Kanten-Kappung).
      if (kreis.closest('#steckdosen')) return;

      if (messspitzenFarbe.has(kreis)) return;

      // Wiedereindrehen: Klick auf eine bereits gelöste Schraube (weißer
      // Kreis vorhanden) entfernt das Overlay wieder - Umkehrung von Lösen,
      // Werkzeug kehrt genauso automatisch zurück. Immer erlaubt (reduziert
      // `geloesteSchrauben.size`, kann das Maximum unten also nie verletzen).
      // Schließt außerdem ALLE zugehörigen Kanten wieder (siehe
      // findeSchraubenKanten() oben) - Verbindung ist danach wiederhergestellt.
      const bestehendesOverlay = geloesteSchrauben.get(kreis);
      if (bestehendesOverlay) {
        bestehendesOverlay.remove();
        geloesteSchrauben.delete(kreis);
        for (const kante of findeSchraubenKanten(ader, kreis)) {
          geloesteKanten.delete(kante);
          // Nicht blind auf true setzen - falls der zugehörige Schalter in
          // der Zwischenzeit geöffnet wurde (siehe schalterUmschalten()
          // oben), muss die Kante danach offen bleiben, nicht schließen.
          kante.geschlossen = kante._schalterSoll ?? true;
        }
        schraubendreherAufgenommen = false;
        renderSchraubendreher();
        renderMessgeraet(); // RLOW misst kontinuierlich, siehe schalterUmschalten()
        return;
      }

      // Maximum gleichzeitig gelöster Schrauben erreicht: Werkzeug wird
      // zurückgelegt statt aufgenommen zu bleiben (anders als bei den beiden
      // Fällen oben - siehe Kommentar am Anfang der Funktion).
      if (geloesteSchrauben.size >= SCHRAUBENDREHER_MAX_GELOEST) {
        schraubendreherAufgenommen = false;
        renderSchraubendreher();
        return;
      }

      // Weißer Kreis mit schwarzem Rand, dieselbe Größe wie eine
      // Messspitzen-Markierung. Öffnet außerdem ALLE zugehörigen Kanten
      // (siehe findeSchraubenKanten() oben) - genau wie ein offener
      // Schalter, nur auf Ader- statt Bauteil-Ebene (siehe KONZEPT.md
      // "Schrauben lösen").
      const { cx, cy } = schraubenMitte(kreis);
      const overlay = svgKreis({
        cx, cy, r: 7, fill: '#ffffff', stroke: '#000000', 'stroke-width': 2.5
      });
      overlay.style.pointerEvents = 'none'; // Schraube bleibt selbst klickbar (fürs Wiedereindrehen)
      kreis.parentNode.appendChild(overlay);
      geloesteSchrauben.set(kreis, overlay);
      for (const kante of findeSchraubenKanten(ader, kreis)) {
        geloesteKanten.add(kante);
        kante.geschlossen = false;
      }

      schraubendreherAufgenommen = false;
      renderSchraubendreher();
      renderMessgeraet(); // RLOW misst kontinuierlich, siehe schalterUmschalten()
      return;
    }

    // Solange das Messgerät an ist (Messmodus), ersetzen Messspitzen die
    // Popups: kein Querschnitt/Farbe-Tooltip mehr, stattdessen legt jeder
    // Klick auf eine Schraube eine farbige Messspitze an (oder nimmt sie
    // wieder ab) - genau wie beim echten Gerät blendet man Popups aus,
    // sobald man tatsächlich misst.
    if (messgeraetZustand.an) {
      // Eine gelöste Schraube (weißer Kreis, siehe Schraubendreher-Zweig
      // oben) hat keinen elektrischen Kontakt mehr - eine Messspitze dort
      // wäre elektrotechnisch unsinnig, Klick bleibt wirkungslos (User-
      // gemeldeter Bug, 2026-07-23: die ursprünglich spezifizierte Sperre
      // "gelöste Schraube kann keine Messspitze bekommen" war nie
      // umgesetzt worden).
      if (geloesteSchrauben.has(kreis)) return;

      const belegteFarben = new Set(messspitzenFarbe.values());
      belegteFarben.delete(messspitzenFarbe.get(kreis)); // eigene aktuelle Farbe zählt nicht als "belegt"
      const naechsteFarbe = naechsteMessspitzenFarbe(messspitzenFarbe.get(kreis) ?? null, belegteFarben);

      const altesOverlay = messspitzenOverlay.get(kreis);
      if (altesOverlay) altesOverlay.remove();
      messspitzenOverlay.delete(kreis);
      messspitzenFarbe.delete(kreis);
      messspitzenAder.delete(kreis);

      if (naechsteFarbe !== null) {
        messspitzenFarbe.set(kreis, naechsteFarbe);
        messspitzenAder.set(kreis, ader);
        const { cx, cy } = schraubenMitte(kreis);
        const overlay = svgKreis({
          cx, cy, r: 7,
          fill: MESSSPITZEN_FARBWERTE[naechsteFarbe], stroke: '#ffffff', 'stroke-width': 2.5
        });
        overlay.style.pointerEvents = 'none'; // Klicks sollen weiter beim Schrauben-Kreis ankommen (Zyklus geht weiter)
        kreis.parentNode.appendChild(overlay);
        messspitzenOverlay.set(kreis, overlay);
      }

      // RLOW misst kontinuierlich (der Sanduhr/Pfeil-Kasten im Display ist
      // dort NICHT durchgestrichen, siehe messgeraet.js) - jede Änderung an
      // den Messspitzen soll sich also sofort im Messwert niederschlagen,
      // ohne TEST-Taste. Für andere Funktionen bleibt das Neu-Rendern hier
      // wirkungslos (baueAnzeigeZustand() überschreibt dort nichts).
      // RISOs R-Wert braucht dagegen einen TEST-Klick (siehe unten) - eine
      // Änderung an den Messspitzen macht einen alten Messwert aber ungültig,
      // darum hier zurücksetzen (die Spannungsanzeige selbst ist live, kein
      // Reset nötig). Die Ampel gehört zum selben Messvorgang wie der
      // Messwert, geht also mit zurück auf aus/grau. ZIs/ZSs Z-Wert ist
      // ebenso TEST-gebunden, derselbe Reset-Grund gilt dort analog.
      risoMesswert = null;
      risoAmpel = null;
      ziMesswert = null;
      zsMesswert = null;
      fircdMesswert = null;
      fircdAmpel = null;
      renderMessgeraet();
    } else {
      Popup.zeige({
        querschnitt: `${ader.querschnitt_mm2} mm²`,
        farbe: ader.farbe,
        weitere: ader.weitere?.map((w) => ({ querschnitt: `${w.querschnitt_mm2} mm²`, farbe: w.farbe }))
      }, x, y);
    }
  }

  const { svg: schaltkastenSvg, schalterHandles } = SchaltkastenView.render(anlage, container, onSchraubeKlick, schalterUmschalten);

  // Viertes View-Objekt, oberhalb des Schaltkastens (siehe view/steckdosen.js).
  // Breite exakt wie der Schaltkasten (derselbe Rahmen-Look). Kontaktpunkte
  // teilen sich denselben Klick-Callback wie der Schaltkasten - Messspitzen
  // lassen sich also genauso anlegen wie an den Reihenklemmen-Schrauben.
  SteckdosenView.render(document.getElementById('steckdosen'), schaltkastenSvg.getAttribute('width'), anlage, onSchraubeKlick);

  // Alle Netz-IDs, die an einer Ader hängen - normalerweise nur ihre eigene,
  // bei einer physisch geteilten Schraube (siehe generate_anlage.js
  // baueLeitung()) zusätzlich die aus `ader.weitere` (z.B. RCD1.o1, das
  // gleichzeitig LS1 und LS2 speist).
  function alleNetzeVonAder(ader) {
    return [ader?.netz, ...(ader?.weitere ?? []).map((w) => w.netz)].filter(Boolean);
  }

  // Ader der aktuell angelegten Messspitze einer bestimmten Farbe (oder
  // null, wenn diese Farbe gerade an keiner Schraube hängt).
  function messspitzenAderNachFarbe(farbe) {
    for (const [kreis, f] of messspitzenFarbe) {
      if (f === farbe) return messspitzenAder.get(kreis);
    }
    return null;
  }

  // Sucht einen Pfad zwischen zwei Adern - probiert alle Kombinationen ihrer
  // Netz-IDs (inkl. `ader.weitere` bei geteilten Schrauben, siehe oben), da
  // an einer solchen Klemme irgendeine der dort hängenden Adern eine
  // Verbindung herstellen kann. Gibt den ersten gefundenen Pfad zurück, oder
  // null.
  function findePfadZwischenAdern(funktion, aderA, aderB) {
    for (const netzA of alleNetzeVonAder(aderA)) {
      for (const netzB of alleNetzeVonAder(aderB)) {
        const pfad = findePfad(graph, funktion, netzA, netzB);
        if (pfad) return pfad;
      }
    }
    return null;
  }

  // Wie findePfadZwischenAdern(), aber von der Einspeisung (graph.einspeisung)
  // zu einer Ader - für ZI/ZS gebraucht, wo Schwarz und Blau auf
  // UNTERSCHIEDLICHEN Funktionen sitzen (L vs. N) und deshalb kein
  // gemeinsamer Teilgraph existiert, in dem man direkt zwischen ihnen suchen
  // könnte (siehe berechneZiMesswert() unten). null, wenn kein
  // Einspeisungs-Netz für die Funktion bekannt ist oder kein Pfad existiert.
  function findePfadZurEinspeisung(funktion, ader) {
    const einspeisungsNetz = graph?.einspeisung?.[funktion];
    if (!einspeisungsNetz) return null;
    for (const netz of alleNetzeVonAder(ader)) {
      const pfad = findePfad(graph, funktion, einspeisungsNetz, netz);
      if (pfad) return pfad;
    }
    return null;
  }

  // RLOW-Messwert aus den aktuell angelegten Messspitzen: "schwarz" und
  // "blau" müssen beide gesetzt sein (siehe KONZEPT.md "Messmodus"), auf
  // Schrauben mit dem gleichen Netz-`funktion` (z.B. beide "L1") - nur dann
  // existiert überhaupt ein Teilgraph, der beide verbindet (siehe
  // "Pfadverfolgung und Fehlersimulation": L1/L2/L3/N sind je ein eigener
  // Baum, PE noch nicht angebunden). Gibt den Widerstand in Ω zurück (Summe
  // der Fehlertabellen-Einträge entlang des gefundenen Pfads, 0Ω wenn keine
  // Netze im Pfad einen Eintrag haben) oder null, wenn keine Messung möglich
  // ist (Platzhalter bleibt dann stehen).
  function berechneRlowMesswert() {
    if (!graph) return null;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    if (!schwarzAder || !blauAder) return null;

    // WORKAROUND PE-zu-N (siehe KONZEPT.md "Nächste Schritte" -
    // PE-Teilgraph): eine Sonde auf PE, die andere auf N - PE gilt wie beim
    // PE-zu-PE-Workaround unten als immer durchgängig (0Ω), die eigentliche
    // Messung läuft deshalb nur über den N-Pfad zur Einspeisung
    // (`findePfadZurEinspeisung()`, dieselbe Funktion, die ZI/ZS schon für
    // ihren Pfad zur Einspeisung nutzen). Ist irgendein Schalter auf diesem
    // Weg offen, bleibt der Platzhalter stehen - sind alle geschlossen, wird
    // (anders als bei ZS) NUR die Fehlertabelle aufsummiert, OHNE feste
    // Vorimpedanz, da es ein RLOW- und kein ZS/ZI-Wert bleibt. Entfällt
    // ersatzlos, sobald der PE-Teilgraph existiert.
    const peAder = schwarzAder.funktion === 'PE' ? schwarzAder : (blauAder.funktion === 'PE' ? blauAder : null);
    const nAder = schwarzAder.funktion === 'N' ? schwarzAder : (blauAder.funktion === 'N' ? blauAder : null);
    if (peAder && nAder) {
      const pfadN = findePfadZurEinspeisung('N', nAder);
      return pfadN ? berechneWiderstand(graph, pfadN) : null;
    }

    if (schwarzAder.funktion !== blauAder.funktion) return null;

    // WORKAROUND PE-zu-PE (siehe KONZEPT.md "Nächste Schritte" -
    // PE-Teilgraph): PE ist noch nicht Teil des Verbindungsgraphen
    // (`graph.PE` existiert nicht, GRAPH_FUNKTIONEN in generate_anlage.js
    // hat nur L1/L2/L3/N), findePfad() würde also für PE immer null
    // liefern - obwohl PE elektrisch in diesem Modell nie geschaltet wird
    // (kein PE-Schalter, siehe netzplan.md Annahme 1 "PE umgeht
    // Leistungsschalter und RCD") und deshalb praktisch immer durchgängig
    // ist. Bis der echte PE-Teilgraph existiert: PE-zu-PE liefert pauschal
    // 0Ω - unabhängig davon, welche PE-Bauteile (Reihenklemme, PE-Klemme,
    // Steckdose, Anschlussdose) die Messspitzen tragen. Ignoriert bewusst
    // etwaige Fehlertabellen-Einträge auf PE-Netzen (aktuell in keinem
    // Testcase vorhanden). Entfällt ersatzlos, sobald der PE-Teilgraph
    // existiert.
    if (schwarzAder.funktion === 'PE') return 0;

    const pfad = findePfadZwischenAdern(schwarzAder.funktion, schwarzAder, blauAder);
    return pfad ? berechneWiderstand(graph, pfad) : null;
  }

  // RISO misst zwischen L (L1/L2/L3) und N/L (N oder eine ANDERE Phase) -
  // anders als RLOW dürfen die Funktionen hier unterschiedlich sein, das ist
  // ja gerade der Zweck der Isolationsmessung. Welche der beiden Messspitzen
  // (Schwarz/Blau) auf L bzw. N/L sitzt, ist elektrisch egal - wie am echten
  // Gerät ist eine Widerstandsmessung symmetrisch, die Rollen dürfen also
  // vertauscht sein. RISO_L_FUNKTIONEN wird auch vom Test-Klick unten
  // gebraucht.
  const RISO_L_FUNKTIONEN = ['L1', 'L2', 'L3'];

  // Bestimmt den Messtyp für ein beliebiges Adernpaar, unabhängig davon,
  // welche Farbe welche Rolle hat: 'LN' (eine Ader auf L1/L2/L3, die andere
  // auf N ODER PE - siehe risoEffektiveAder() unten), 'LL' (beide auf
  // L1/L2/L3, aber unterschiedliche Phasen), sonst `null` (z.B. beide auf
  // derselben Phase, oder keine der beiden auf L).
  function risoPaarTyp(aderA, aderB) {
    const istL = (ader) => RISO_L_FUNKTIONEN.includes(ader.funktion);
    const istNOderPe = (ader) => ader.funktion === 'N' || ader.funktion === 'PE';
    if (istL(aderA) && istNOderPe(aderB)) return 'LN';
    if (istL(aderB) && istNOderPe(aderA)) return 'LN';
    if (istL(aderA) && istL(aderB) && aderA.funktion !== aderB.funktion) return 'LL';
    return null;
  }

  // Verwechslung N/PE ist im Prüfungsalltag realistisch (anders als ein
  // aufgetrennter PE-Leiter, der praktisch nie vorkommt) - eine an PE
  // angelegte Messspitze wird deshalb bewusst vereinfacht wie N am
  // Einspeisungspunkt behandelt: PE und N sind im TN-S/TN-C-S-Netz ohnehin
  // am Sternpunkt miteinander verbunden, und da PE hier nie aufgetrennt
  // wird, ist "irgendwo auf PE" elektrisch gleichbedeutend mit "direkt am
  // N-Einspeisungspunkt". Kein vollständiger PE-Graph nötig (der wäre wegen
  // der Hutschienen-Bond-Zyklen ein größeres eigenes Vorhaben, siehe
  // KONZEPT.md) - nur für RISO relevant, da nur dort PE überhaupt als
  // Messpunkt vorkommt.
  function risoEffektiveAder(ader) {
    if (ader.funktion !== 'PE' || !graph?.einspeisung?.N) return ader;
    return { funktion: 'N', netz: graph.einspeisung.N };
  }

  // Live-Spannungsprüfung zwischen den beiden RISO-Messpunkten (schwarz/blau)
  // - läuft bei JEDER Messspitzen-Änderung, nicht erst nach TEST (echtes
  // Gerät zeigt anliegende Spannung als Sicherheitsfunktion sofort an). Prüft
  // über istSpannungFuehrend(), ob beide Punkte noch mit der Einspeisung
  // verbunden sind (nicht nur der Hauptschalter - JEDER offene Schalter im
  // jeweiligen Pfad macht den Punkt "tot", z.B. ein offenes RCD auch bei
  // geschlossenem Hauptschalter). 230V bei L-N, 400V bei zwei verschiedenen
  // Phasen, sonst 0V (auch wenn die Messspitzen fehlen oder nicht zueinander
  // passen - RISO zeigt hier IMMER einen Wert, nie einen Platzhalter).
  // Spannung zwischen zwei beliebigen Adern, unabhängig von Farbe/Rolle -
  // 230V bei L-N(-oder-PE, siehe risoEffektiveAder()), 400V bei zwei
  // verschiedenen L-Phasen, sonst 0V (ungültige Kombination, fehlende Ader,
  // oder nicht mehr mit der Einspeisung verbunden). Gemeinsam genutzt von
  // RISO (immer Schwarz/Blau) und V~ (alle drei Sondenpaare, siehe unten).
  function berechneSpannungZwischenAdern(aderARoh, aderBRoh) {
    if (!graph || !aderARoh || !aderBRoh) return 0;
    const typ = risoPaarTyp(aderARoh, aderBRoh);
    if (!typ) return 0;

    const aderA = risoEffektiveAder(aderARoh);
    const aderB = risoEffektiveAder(aderBRoh);
    const aLebt = istSpannungFuehrend(graph, aderA.funktion, aderA.netz);
    const bLebt = istSpannungFuehrend(graph, aderB.funktion, aderB.netz);
    return aLebt && bLebt ? (typ === 'LN' ? 230 : 400) : 0;
  }

  // Phasenfolge-Anzeige, Teil von V~ (siehe KONZEPT.md "V~" - kein eigener
  // Drehknopf-Punkt, reine Erweiterung des bestehenden V~-Displays, User-
  // Vorgabe). Nur sichtbar, wenn Schwarz/Blau/Grün auf DREI VERSCHIEDENEN
  // Phasen (L1/L2/L3) liegen UND alle drei noch mit der Einspeisung
  // verbunden sind (Spannung liegt an) - liegen zwei Sonden auf derselben
  // Phase, gibt es keine sinnvolle Drehfeldrichtung, daher `null` (keine
  // Anzeige). "1.2.3." bei den drei zyklischen Rotationen von L1->L2->L3
  // (Schwarz->Blau->Grün folgt der "aufsteigenden" Reihenfolge), "3.2.1."
  // bei den restlichen drei (umgekehrten) Zuordnungen - algorithmisch reicht
  // der Abstand von Schwarz zu Blau (mod 3): +1 = vorwärts, +2 = rückwärts.
  const PHASENFOLGE_PHASEN = ['L1', 'L2', 'L3'];

  function berechnePhasenfolge() {
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    const gruenAder = messspitzenAderNachFarbe('grün');
    if (!graph || !schwarzAder || !blauAder || !gruenAder) return null;

    const adern = [schwarzAder, blauAder, gruenAder];
    if (!adern.every((ader) => PHASENFOLGE_PHASEN.includes(ader.funktion))) return null;
    if (new Set(adern.map((ader) => ader.funktion)).size !== 3) return null;
    if (!adern.every((ader) => istSpannungFuehrend(graph, ader.funktion, ader.netz))) return null;

    const index = (ader) => PHASENFOLGE_PHASEN.indexOf(ader.funktion);
    const vorwaerts = (index(blauAder) - index(schwarzAder) + 3) % 3 === 1;
    return vorwaerts ? '1.2.3.' : '3.2.1.';
  }

  function berechneRisoSpannung() {
    return berechneSpannungZwischenAdern(messspitzenAderNachFarbe('schwarz'), messspitzenAderNachFarbe('blau'));
  }

  // RISO-Messwert, ausgelöst über die TEST-Taste (siehe renderMessgeraet()
  // unten) - anders als RLOW nicht kontinuierlich. `null` = noch kein
  // gültiger TEST-Klick (Platzhalter bleibt stehen), `Infinity` = kein Pfad
  // gefunden ("gesund", zeigt `>999MΩ`), sonst der über die Fehlertabelle
  // summierte Widerstand wie bei RLOW.
  let risoMesswert = null;
  // Ampel (Leuchtstreifen links/rechts im Display, siehe messgeraet.js) -
  // zeigt das Ergebnis des letzten TEST-Klicks: `null` = aus/grau (noch kein
  // TEST-Klick seit dem letzten Reset), `'rot'` = Spannung lag an ODER
  // Messwert unter dem Grenzwert, `'gruen'` = Messwert über dem Grenzwert
  // (inkl. Gleichstand) oder `>999MΩ`. Lebt wie risoMesswert nur für den
  // aktuellen Messvorgang - siehe die risoAmpel-Resets unten.
  let risoAmpel = null;

  function risoTestKlick() {
    if (messgeraetZustand.funktion !== 'RISO' || !graph) return;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    const gruenAder = messspitzenAderNachFarbe('grün');
    // Alle drei Messspitzen müssen an der richtigen Funktion sitzen (siehe
    // KONZEPT.md "Messmodus") - PE fließt zwar (noch) nicht in die
    // Berechnung ein, muss aber trotzdem angelegt sein. Schwarz/Blau dürfen
    // vertauscht sein (risoPaarTyp() prüft symmetrisch), Grün muss immer PE
    // sein.
    if (!schwarzAder || !blauAder || !gruenAder) return;
    // Schwarz/Blau auf derselben Funktion (z.B. beide L1) ist keine
    // Isolationsmessung, sondern schlicht eine Durchgangsprüfung auf einer
    // Phase - dieselbe Pfadsuche wie bei RLOW (Fehlertabelle-Summe, oder
    // `Infinity`/`>999MΩ` bei offenem Schalter dazwischen), unabhängig von
    // risoPaarTyp()/der L-N/L-L-Spannungslogik. PE-PE bewusst ausgenommen
    // (Grün deckt PE schon separat ab, PE selbst ist nicht im Graphen).
    const gleicheFunktion = schwarzAder.funktion === blauAder.funktion && schwarzAder.funktion !== 'PE';
    if (!gleicheFunktion && !risoPaarTyp(schwarzAder, blauAder)) return;
    if (gruenAder.funktion !== 'PE') return;
    // Sicherheits-Verhalten wie beim echten Gerät: solange Spannung anliegt,
    // springt R auf den Platzhalter zurück, statt einen alten Messwert stehen
    // zu lassen. Bei gleicher Funktion liegt zwischen Schwarz/Blau ohnehin
    // nie eine Spannung an (0V, siehe risoPaarTyp()), dieser Zweig greift
    // dort also nie. Ampel: Spannung anliegend = "durchgefallen" (rot).
    if (berechneRisoSpannung() > 0) {
      risoMesswert = null;
      risoAmpel = 'rot';
      renderMessgeraet();
      return;
    }

    const schwarzEffektiv = risoEffektiveAder(schwarzAder);
    const blauEffektiv = risoEffektiveAder(blauAder);
    const pfad = findePfadZwischenAdern(schwarzEffektiv.funktion, schwarzEffektiv, blauEffektiv);
    // berechneWiderstand() summiert die Fehlertabelle - die ist immer in Ω
    // angegeben (wie bei RLOW), nie in MΩ. `risoMesswert` ist deshalb IMMER
    // ein Ω-Wert, wenn endlich; nur der Infinity-Sentinel wird als „>999MΩ"
    // dargestellt (siehe baueAnzeigeZustand() unten).
    risoMesswert = pfad ? berechneWiderstand(graph, pfad) : Infinity;
    // Ampel: Grenzwert ist in MΩ eingestellt, risoMesswert aber in Ω - für
    // den Vergleich deshalb den Grenzwert in Ω umrechnen (*1_000_000), statt
    // den Messwert zu dividieren (Rundungsfehler bei sehr kleinen Werten).
    // >999MΩ (kein Pfad) liegt immer über jedem endlichen Grenzwert -> grün.
    // Sonst grün ab (einschließlich) Grenzwert, sonst rot. Das gilt bewusst
    // einheitlich für jeden Pfad-Fund (auch den "gleiche Funktion"-Fall) -
    // ein niedriger Ω-Wert liegt bei jedem realistischen Grenzwert (MΩ-
    // Bereich) praktisch immer darunter und zeigt deshalb Rot.
    risoAmpel = risoMesswert === Infinity || risoMesswert >= risoGrenzwertMOhm * 1_000_000 ? 'gruen' : 'rot';
    renderMessgeraet();
  }

  // Live-Spannungsanzeige für ZI (wie berechneRisoSpannung(), aber
  // umgekehrter Zweck: bei RISO warnt sie "hier liegt noch Spannung an, TEST
  // wirkt nicht" - bei ZI zeigt sie "der Stromkreis ist bereit, TEST wird
  // einen Messwert liefern", da ZI ja gerade ein spannungsführendes Netz
  // voraussetzt. Immer 230V oder 0V (nie eine der RISO-typischen 400V, ZI
  // misst immer L gegen N), unabhängig von TEST.
  function berechneZiSpannung() {
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    if (!graph || !schwarzAder || !blauAder) return 0;
    if (!RISO_L_FUNKTIONEN.includes(schwarzAder.funktion) || blauAder.funktion !== 'N') return 0;
    const schwarzLebt = istSpannungFuehrend(graph, schwarzAder.funktion, schwarzAder.netz);
    const blauLebt = istSpannungFuehrend(graph, blauAder.funktion, blauAder.netz);
    return schwarzLebt && blauLebt ? 230 : 0;
  }

  // Feste Basisimpedanz der Trafostation/Einspeisung (siehe KONZEPT.md
  // "Konfigurierbare Parameter" - `vorimpedanz`), die bei jeder ZI/ZS-
  // Berechnung automatisch mit einfließt (reale Schleifenimpedanz ist nie 0,
  // auch ohne jeden Fehler-Widerstand auf dem Pfad). Noch ein fester
  // Konstantenwert, kein Netzplan-Feld (analog zu rlowKalibrierterWiderstand).
  const ZI_VORIMPEDANZ = 0.14;

  // ZI-Messwert, ausgelöst über die TEST-Taste - wie bei RISO nicht
  // kontinuierlich. `null` = noch kein gültiger TEST-Klick (Platzhalter
  // bleibt stehen), sonst der berechnete Z-Wert in Ω.
  let ziMesswert = null;

  function ziTestKlick() {
    if (messgeraetZustand.funktion !== 'ZI' || !graph) return;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const blauAder = messspitzenAderNachFarbe('blau');
    // Schwarz muss auf L1/L2/L3 sitzen, Blau auf N - anders als bei RISO
    // keine vertauschbaren Rollen (Grün/PE spielt bei ZI keine Rolle, siehe
    // messpunkte in messgeraet.js: pe:'leer').
    if (!schwarzAder || !blauAder) return;
    if (!RISO_L_FUNKTIONEN.includes(schwarzAder.funktion)) return;
    if (blauAder.funktion !== 'N') return;

    // Beide Teilpfade (L-Sonde -> L-Einspeisung, N-Sonde -> N-Einspeisung)
    // müssen geschlossen sein, BEVOR die TEST-Taste überhaupt einen Effekt
    // hat - fehlt einer, bleibt der Platzhalter stehen (explizite
    // User-Vorgabe, kein "kein Pfad"-Sentinel wie >999MΩ bei RISO, da ZI ein
    // stromdurchflossenes Netz voraussetzt statt ein spannungsfreies).
    const pfadL = findePfadZurEinspeisung(schwarzAder.funktion, schwarzAder);
    const pfadN = findePfadZurEinspeisung('N', blauAder);
    if (!pfadL || !pfadN) return;

    ziMesswert = berechneWiderstand(graph, pfadL) + berechneWiderstand(graph, pfadN) + ZI_VORIMPEDANZ;
    renderMessgeraet();
  }

  // Live-Spannungsanzeige für ZS - wie berechneZiSpannung(), aber prüft nur
  // den EINEN Teilpfad, den auch zsTestKlick() unten prüft (L-Sonde ->
  // L-Einspeisung, PE bewusst ignoriert) - zeigt also exakt an, ob ein
  // TEST-Klick gerade einen Messwert liefern würde. Alle drei Sonden müssen
  // trotzdem korrekt platziert sein (wie bei zsTestKlick()), auch wenn nur
  // Schwarz tatsächlich geprüft wird.
  function berechneZsSpannung() {
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const gruenAder = messspitzenAderNachFarbe('grün');
    const blauAder = messspitzenAderNachFarbe('blau');
    if (!graph || !schwarzAder || !gruenAder || !blauAder) return 0;
    if (!RISO_L_FUNKTIONEN.includes(schwarzAder.funktion)) return 0;
    if (gruenAder.funktion !== 'PE' || blauAder.funktion !== 'N') return 0;
    return istSpannungFuehrend(graph, schwarzAder.funktion, schwarzAder.netz) ? 230 : 0;
  }

  // Live-Spannungsanzeige für FI/RCD - dieselbe Platzierungsvorgabe wie bei
  // ZS (Schwarz auf L1/L2/L3, Grün auf PE, Blau auf N), aber ANDERS als
  // berechneZsSpannung() (die bewusst nur den L-Pfad prüft, siehe dort) an
  // berechneZiSpannung() angelehnt: ein FI/RCD-Prüfgerät speist sich selbst
  // aus L UND N und injiziert darüber den Fehlerstrom - beide Pfade zur
  // Einspeisung müssen also stehen, bevor überhaupt ein Test möglich ist.
  // ZS dagegen misst die L-PE-Schleife SELBST, die darf als Vorbedingung
  // nicht schon intakt sein müssen - dieser Unterschied gilt für FI/RCD
  // nicht (User-gemeldeter Bug, testcase_06: N-Eingangsschraube eines RCD
  // gelöst, Anzeige blieb trotzdem bei 230V stehen, weil nur Schwarz
  // geprüft wurde). Eigene Funktion statt Wiederverwendung, da sie
  // konzeptionell zu FI/RCD gehört und dort eigenständig weiterentwickelt
  // werden dürfte (z.B. sobald die eigentliche Auslösewert-Berechnung
  // dazukommt).
  function berechneFircdSpannung() {
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const gruenAder = messspitzenAderNachFarbe('grün');
    const blauAder = messspitzenAderNachFarbe('blau');
    if (!graph || !schwarzAder || !gruenAder || !blauAder) return 0;
    if (!RISO_L_FUNKTIONEN.includes(schwarzAder.funktion)) return 0;
    if (gruenAder.funktion !== 'PE' || blauAder.funktion !== 'N') return 0;
    const schwarzLebt = istSpannungFuehrend(graph, schwarzAder.funktion, schwarzAder.netz);
    const blauLebt = istSpannungFuehrend(graph, blauAder.funktion, blauAder.netz);
    return schwarzLebt && blauLebt ? 230 : 0;
  }

  // Alle RCD-Bauteile der Anlage (über alle Hutschienen/Gruppen hinweg) -
  // gebraucht, um einen `kante.bauteil`-Namen aus dem Graphen einem echten
  // RCD-Objekt (mit tA/iA/uB) zuzuordnen. Wird bei jedem TEST-Klick frisch
  // eingesammelt statt gecacht - die Anlage ist klein, kein Performance-Thema.
  function alleRcds() {
    const ergebnis = [];
    for (const hutschiene of anlage.hutschienen ?? []) {
      for (const gruppe of hutschiene.gruppen ?? []) {
        if (gruppe.rcd) ergebnis.push(gruppe.rcd);
      }
    }
    return ergebnis;
  }

  // Kante zwischen zwei (im Pfad benachbarten) Netz-IDs - findePfad() liefert
  // nur die Knotenfolge, nicht die dazwischenliegenden Kanten, die brauchen
  // wir hier aber, um pro Kantenschritt das jeweilige Bauteil zu kennen.
  function kanteZwischenNetzen(funktion, netzA, netzB) {
    return graph[funktion]?.kanten.find((k) =>
      (k.von === netzA && k.nach === netzB) || (k.von === netzB && k.nach === netzA)
    );
  }

  // Sucht das ERSTE RCD auf dem Weg von einer Ader zur Einspeisung - "erste"
  // aus Sicht der Messspitze, also das nächstgelegene (User-Vorgabe). Der
  // Pfad von findePfadZurEinspeisung() ist [Einspeisungsnetz, ...,
  // Adernnetz] - für "von der Sonde aus gesehen" wird er deshalb umgedreht,
  // bevor die Kanten Schritt für Schritt auf ein RCD-Bauteil geprüft werden.
  function findeErstesRcdAufPfad(funktion, ader) {
    const pfad = findePfadZurEinspeisung(funktion, ader);
    if (!pfad) return null;
    const vonDerSondeAus = [...pfad].reverse();
    const rcds = alleRcds();
    for (let i = 0; i < vonDerSondeAus.length - 1; i++) {
      const kante = kanteZwischenNetzen(funktion, vonDerSondeAus[i], vonDerSondeAus[i + 1]);
      const rcd = kante && rcds.find((r) => r.name === kante.bauteil);
      if (rcd) return rcd;
    }
    return null;
  }

  // FI/RCD-Messwert, ausgelöst über die TEST-Taste - wie ZS nicht
  // kontinuierlich. `null` = noch kein gültiger TEST-Klick ODER kein RCD
  // gefunden (Platzhalter bleiben stehen), sonst `{iA, tA, uB}` des
  // gefundenen RCD-Bauteils.
  let fircdMesswert = null;
  // Ampel: `null` = noch kein TEST-Klick seit dem letzten Reset, `'gruen'` =
  // RCD gefunden, `'rot'` = kein RCD auf dem Pfad zur Einspeisung gefunden
  // (User-Vorgabe: das ist ein eigener Fehlerfall, anders als "keine
  // Spannung" unten, der die Ampel unangetastet lässt).
  let fircdAmpel = null;

  function fircdTestKlick() {
    if (messgeraetZustand.funktion !== 'FI/RCD' || !graph) return;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const gruenAder = messspitzenAderNachFarbe('grün');
    const blauAder = messspitzenAderNachFarbe('blau');
    // Dieselbe Platzierungsvorgabe wie bei ZS: Schwarz auf L1/L2/L3, Grün
    // auf PE, Blau auf N.
    if (!schwarzAder || !gruenAder || !blauAder) return;
    if (!RISO_L_FUNKTIONEN.includes(schwarzAder.funktion)) return;
    if (gruenAder.funktion !== 'PE' || blauAder.funktion !== 'N') return;
    // Pfeil-Kasten durchgestrichen (keine Spannung/kein Pfad zur
    // Einspeisung) -> TEST bleibt komplett wirkungslos, keine Ampel-Änderung
    // (explizite User-Vorgabe, anders als der "kein RCD gefunden"-Fall unten).
    if (berechneFircdSpannung() === 0) return;

    const rcd = findeErstesRcdAufPfad(schwarzAder.funktion, schwarzAder);
    if (rcd) {
      fircdMesswert = { iA: rcd.iA, tA: rcd.tA, uB: rcd.uB };
      fircdAmpel = 'gruen';
      // Erfolgreicher RCD-Test -> der gefundene RCD löst aus, sein Hebel
      // öffnet sich automatisch (Hebel UND Verbindungsgraph, über denselben
      // Callback-Pfad wie ein echter Mausklick, siehe zeichneSchalter() in
      // schaltkasten.js). Explizite User-Vorgabe.
      schalterHandles.get(rcd.name)?.setGeschlossen(false);
    } else {
      // Kein RCD gefunden - alle Felder bleiben/werden leer (Platzhalter),
      // aber die Ampel geht explizit auf Rot (User-Vorgabe).
      fircdMesswert = null;
      fircdAmpel = 'rot';
    }
    renderMessgeraet();
  }

  // ZS-Messwert, ausgelöst über die TEST-Taste - wie ZI nicht kontinuierlich.
  // `null` = noch kein gültiger TEST-Klick (Platzhalter bleibt stehen), sonst
  // der berechnete Z-Wert in Ω.
  let zsMesswert = null;

  function zsTestKlick() {
    if (messgeraetZustand.funktion !== 'ZS' || !graph) return;
    const schwarzAder = messspitzenAderNachFarbe('schwarz');
    const gruenAder = messspitzenAderNachFarbe('grün');
    const blauAder = messspitzenAderNachFarbe('blau');
    // Schwarz auf L1/L2/L3, Grün auf PE, Blau auf N - alle drei müssen
    // korrekt platziert sein, damit TEST überhaupt reagiert (explizite
    // User-Vorgabe), auch wenn PE und N unten NICHT in die Berechnung
    // einfließen.
    if (!schwarzAder || !gruenAder || !blauAder) return;
    if (!RISO_L_FUNKTIONEN.includes(schwarzAder.funktion)) return;
    if (gruenAder.funktion !== 'PE') return;
    if (blauAder.funktion !== 'N') return;

    // Unterschied zu ZI: nur EIN Teilpfad wird geprüft (L-Sonde ->
    // L-Einspeisung). Der PE-Pfad wird bewusst NICHT verfolgt - Annahme:
    // PE hat immer Durchgang (0Ω), analog zur PE-Vereinfachung bei RISO
    // (siehe risoEffektiveAder()). Explizit als vorläufige Vereinfachung
    // markiert, kann später durch einen echten PE-Teilgraphen ersetzt
    // werden (siehe KONZEPT.md "Nächste Schritte").
    const pfadL = findePfadZurEinspeisung(schwarzAder.funktion, schwarzAder);
    if (!pfadL) return;

    zsMesswert = berechneWiderstand(graph, pfadL) + ZI_VORIMPEDANZ;
    renderMessgeraet();
  }

  // Box wird auf die tatsächlich gerenderte Schaltkasten-Breite gesetzt, damit
  // das (schmalere) Messgerät mittig darunter erscheint, ohne die Breite hier
  // zu duplizieren - unverändert gegenüber vorher (der Schraubendreher hängt
  // sich per JS rechts daneben, ohne diese Zentrierung zu beeinflussen,
  // siehe ganz unten).
  const messgeraetContainer = document.getElementById('messgeraet');
  messgeraetContainer.style.width = `${schaltkastenSvg.getAttribute('width')}px`;

  // Drittes View-Objekt unter dem Messgerät, gleiche Breite wie der
  // Schaltkasten (siehe view/protokoll.js).
  const protokollContainer = document.getElementById('protokoll');
  ProtokollView.render(protokollContainer, schaltkastenSvg.getAttribute('width'));

  // Gerät startet aus. TEST-Taste/Messpunkte-Anlegen folgen noch.
  let messgeraetZustand = MessgeraetView.zustandFuerFunktion('RLOW', false);
  // Menü-Navigation über die ◄►-Taste: wandert durch Zone 1 (Titel + die
  // Werte aus titelWerte), das ausgewählte Feld wird invers dargestellt.
  // Index 0 = Titel (Default), Index i+1 = titelWerte[i]. Lebt getrennt von
  // messgeraetZustand, da zustandFuerFunktion() bei jedem Drehknopf-/ON-OFF-
  // Klick einen frischen Zustand baut - die Auswahl soll dabei auf den
  // Default (Titel) zurückgesetzt werden.
  let zone1Auswahl = 0;
  // ▲/▼ bearbeiten das per ◄► ausgewählte Feld. Aktuell vier konkrete Fälle:
  // - Titel ausgewählt (zone1Auswahl 0), togglet je nach Funktion (titelZeigtLabel):
  //   - RLOW: zwischen Titel ("Durchgang") und Drehknopf-Label ("R LOW") -
  //     beide Zustände bleiben invers markiert.
  //   - ZI: zu einer eigenen "ΔU"-Ansicht (Spannungsfall) mit vorangestelltem
  //     Platzhalterwert, siehe baueAnzeigeZustand().
  // - Bei RLOW der kalibrierte Widerstand (zone1Auswahl 1): ±0,1Ω pro Klick,
  //   nach unten geklemmt bei 0 (zeigt dann "___Ω" statt "0,0Ω", weitere
  //   Klicks nach unten bleiben wirkungslos).
  // - Bei RISO die Prüfspannung (zone1Auswahl 1): wandert durch eine feste
  //   Werteliste (Normreihe nach VDE 0100-600/IEC 61557-2), an beiden Enden
  //   geklemmt (kein Wrap-around). Weitere Felder (z.B. bei ZI der LS-Typ)
  //   sind noch nicht angeschlossen.
  let titelZeigtLabel = false;
  let rlowKalibrierterWiderstand = 0.4;
  const RISO_MESSSPANNUNGEN = ['50V', '100V', '250V', '500V', '1000V'];
  let risoMessspannungIndex = RISO_MESSSPANNUNGEN.indexOf('500V');
  // Grenzwert (Mindest-Isolationswiderstand), rechtsbündig im Display (siehe
  // titelWertRechts) - per ▲/▼ in 10MΩ-Schritten einstellbar, siehe
  // aendereAusgewaehltesFeld().
  let risoGrenzwertMOhm = 50;
  // ZI: LS-Typ/Bemessungsstrom/Abschaltzeit einzeln per ◄► auswählbar, dann
  // per ▲/▼ durch die jeweilige Werteliste wandern (Bemessungsstrom siehe
  // docs/referenz/bauteilwerte.md). An beiden Enden geklemmt, wie bei RISO.
  // Gemeinsame Liste für ZI und ZS (siehe unten). L/U/NV/gG sind
  // Sicherungs- bzw. ältere DIN-Charakteristiken statt aktueller
  // LS-Charakteristiken (daher nicht in bauteilwerte.md, das nur echte
  // LS-Bauteilfelder listet) - als Referenzgerät für Zi/Zs-Messungen aber
  // ebenso zulässig, siehe auch LIM_FAKTOR_NACH_LS_TYP in view/messgeraet.js,
  // die alle vier bereits unterstützt.
  const ZI_LS_TYPEN = ['B', 'C', 'D', 'K', 'Z', 'L', 'U', 'NV', 'gG'];
  const ZI_BEMESSUNGSSTROEME = ['6A', '10A', '13A', '16A', '20A', '25A', '32A', '35A', '40A', '50A', '63A', '80A', '100A', '125A'];
  const ZI_ABSCHALTZEITEN = ['35ms', '70ms', '0,1s', '0,2s', '0,4s', '1s', '5s'];
  let ziLsTypIndex = ZI_LS_TYPEN.indexOf('B');
  let ziBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
  let ziAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
  // ZI, ΔU-Ansicht: Spannungsfall in %, ±0,5 pro Klick, nach unten geklemmt
  // bei 0. LS-Typ/Bemessungsstrom/Abschaltzeit sind in der ΔU-Ansicht
  // dieselben Variablen wie in der normalen Zl-Ansicht (siehe oben) - eine
  // Änderung in der einen Ansicht gilt auch in der anderen.
  let ziSpannungsfallProzent = 4.0;
  // ZI, ΔU-Ansicht, Zone 2 (zwischen den Strichen): Referenzimpedanz - noch
  // nicht per ◄►/▲▼ auswählbar, aber als Variable gehalten (siehe
  // Kommentar-Konvention bei anderen Defaults in dieser Datei).
  let ziZref = 0.1;
  // ZS: gleicher Mechanismus wie bei ZI (Zl ↔ ΔU), aber eigene Variablen -
  // LS-Typ/Bemessungsstrom/Abschaltzeit von ZS und ZI sind unabhängig
  // voneinander (unterschiedliche Messungen, kein gemeinsamer LS
  // vorausgesetzt). "ZSrcd" ist die alternative Ansicht (statt "ΔU" bei ZI).
  let zsLsTypIndex = ZI_LS_TYPEN.indexOf('B');
  let zsBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
  let zsAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
  // ZS, ZSrcd-Ansicht: "Std" togglet nur zwischen Std/Low, sonst nichts.
  const ZS_STD_LOW = ['Std', 'Low'];
  let zsStdLowIndex = ZS_STD_LOW.indexOf('Std');
  // FI/RCD: Fehlerstrom und Typ einzeln per ◄► auswählbar, dann per ▲/▼
  // durch die jeweilige Werteliste wandern (siehe docs/referenz/bauteilwerte.md
  // "RCD"). An beiden Enden geklemmt, wie bei RISO/ZI.
  const FIRCD_FEHLERSTROEME = ['10mA', '30mA', '100mA', '300mA', '500mA'];
  const FIRCD_TYPEN = ['AC', 'A', 'F', 'B', 'B+'];
  let fircdFehlerstromIndex = FIRCD_FEHLERSTROEME.indexOf('30mA');
  let fircdTypIndex = FIRCD_TYPEN.indexOf('AC');

  function klemmeIndex(index, richtung, maxIndex) {
    return Math.min(maxIndex, Math.max(0, index + richtung));
  }

  function baueAnzeigeZustand() {
    const zustand = { ...messgeraetZustand, zone1Auswahl };
    const funktion = messgeraetZustand.funktion;

    if (funktion === 'RLOW') {
      const wertText = rlowKalibrierterWiderstand === 0
        ? '___Ω'
        : `${rlowKalibrierterWiderstand.toFixed(1).replace('.', ',')}Ω`;
      zustand.titelWerte = [wertText, ...messgeraetZustand.titelWerte.slice(1)];
      // Nur im "R LOW"-Ansicht (Titel togglet, siehe titelZeigtLabel) zeigt
      // RLOW zusätzlich R+/R- (Vorwärts-/Rückwärts-Widerstand bei der
      // Durchgangsprüfung) über dem unteren Strich - bei "Durchgang" nicht.
      if (titelZeigtLabel) {
        zustand.titel = messgeraetZustand.label;
        zustand.nebenwertLinks = 'R+:___';
        zustand.nebenwertRechts = 'R-:___';
      }
      // Hauptmesswert (großer zentraler Wert): aus den angelegten
      // Messspitzen berechnet, siehe berechneRlowMesswert(). Kontinuierliche
      // Messung (kein TEST nötig) - bleibt beim Platzhalter aus
      // zustandFuerFunktion(), solange kein Pfad gefunden wird.
      const rlowMesswert = berechneRlowMesswert();
      if (rlowMesswert !== null) {
        // Zwei Nachkommastellen statt einer - die Fehlertabelle erlaubt
        // Werte wie 0,15Ω, eine Summe (z.B. 0,45Ω) würde mit nur einer
        // Nachkommastelle sichtbar Information verlieren (auf 0,5Ω gerundet).
        zustand.hauptwert = `R:${rlowMesswert.toFixed(2).replace('.', ',')}Ω`;
      }
    } else if (funktion === 'RISO') {
      zustand.titelWerte = [RISO_MESSSPANNUNGEN[risoMessspannungIndex]];
      // Grenzwert (Mindest-Isolationswiderstand nach Norm) rechtsbündig am
      // Display-Rand, analog zur ZI-ΔU-Ansicht (siehe titelWertRechts unten) -
      // per ▲/▼ einstellbar (aendereAusgewaehltesFeld()), Default 50MΩ.
      zustand.titelWertRechts = `${risoGrenzwertMOhm}MΩ`;
      // Live, unabhängig von TEST - siehe berechneRisoSpannung(). Immer ein
      // Wert (Default 0V), nie ein Platzhalter.
      zustand.spannungUnterPe = `${berechneRisoSpannung()}V`;
      // R-Wert nur nach TEST-Klick (siehe risoTestKlick()) - Platzhalter aus
      // zustandFuerFunktion() bleibt stehen, solange risoMesswert null ist.
      // Einheit: risoMesswert ist (wenn endlich) immer ein Ω-Wert aus der
      // Fehlertabelle (siehe risoTestKlick()) - nur der Infinity-Sentinel
      // wird als „>999MΩ" dargestellt (kein echter MΩ-Wert, sondern ein
      // fester "außerhalb der Skala"-Text).
      if (risoMesswert !== null) {
        zustand.hauptwert = risoMesswert === Infinity
          ? 'R:>999MΩ'
          : `R:${risoMesswert.toFixed(2).replace('.', ',')}Ω`;
      }
      // Ampel (siehe risoTestKlick()) - links rot bei "durchgefallen", rechts
      // grün bei "bestanden", sonst beide aus/grau (kein TEST-Klick seit dem
      // letzten Reset).
      zustand.leuchteLinksAn = risoAmpel === 'rot';
      zustand.leuchteRechtsAn = risoAmpel === 'gruen';
    } else if (funktion === 'ZI') {
      const ziTitelWerte = [
        ZI_LS_TYPEN[ziLsTypIndex],
        ZI_BEMESSUNGSSTROEME[ziBemessungsstromIndex],
        ZI_ABSCHALTZEITEN[ziAbschaltzeitIndex]
      ];
      // Live, unabhängig von TEST - siehe berechneZiSpannung(). Gilt für
      // beide Ansichten (normale Zl-Ansicht UND ΔU-Ansicht), da die
      // Messpunkte-Kreise (und damit die Anzeige-Position darunter) in
      // beiden gleich bleiben.
      const ziSpannung = berechneZiSpannung();
      zustand.spannungUnterPe = `${ziSpannung}V`;
      // Pfeil/Sanduhr-Indikator unten links (siehe messgeraet.js) ist bei ZI
      // standardmäßig durchgestrichen (TEST-gebunden, siehe
      // DREHKNOPF_POSITIONEN). Liegt Spannung an, ist der Stromkreis bereit
      // für eine Messung - dann bewusst undurchgestrichen, als visueller
      // Bezug zur Live-Spannungsanzeige (explizite User-Vorgabe, nur für ZI,
      // nicht für RISO - dort bedeutet anliegende Spannung ja gerade "TEST
      // wirkt nicht", der durchgestrichene Zustand bleibt dort korrekt).
      zustand.indikatorDurchgestrichen = ziSpannung === 0;
      // Fällt die Spannung weg (Pfeil-Kasten wird wieder durchgestrichen),
      // ist ein zuvor gemessener Wert nicht mehr gültig - Platzhalter
      // `Z:---Ω` erzwingen, statt einen veralteten Messwert stehen zu
      // lassen. Wird die Spannung später wieder hergestellt, bleibt der
      // Platzhalter bestehen, bis erneut TEST gedrückt wird (explizite
      // User-Vorgabe).
      if (ziSpannung === 0) ziMesswert = null;
      if (titelZeigtLabel) {
        // ΔU-Ansicht (Spannungsfall): eigenständiger Titel statt Zl. LS-Typ
        // und Bemessungsstrom bleiben in der mittleren Reihe, die
        // Abschaltzeit rutscht ganz nach rechts (titelWertRechts) - sonst
        // wären es 4 mittige Werte, was nicht mehr ins Display passt. Der
        // Hauptmesswert (zwischen den Strichen) bleibt hier bewusst leer -
        // kommt erst in einem späteren Schritt dazu.
        zustand.titel = 'ΔU';
        const spannungsfallText = `${ziSpannungsfallProzent.toFixed(1).replace('.', ',')}%`;
        zustand.titelWerte = [spannungsfallText, ziTitelWerte[0], ziTitelWerte[1]];
        zustand.titelWertRechts = ziTitelWerte[2];
        // Zone 2 (zwischen den Strichen): vier links ausgerichtete Zeilen
        // statt des sonst üblichen zentralen Hauptmesswerts - ΔU/Isc/Z noch
        // keine echten Werte (Platzhalter ___, wie sonst nach TEST-Klick),
        // Zref hat schon jetzt einen (weiterhin veränderbaren) Startwert.
        zustand.hauptwertZeilen = [
          'ΔU: ___%',
          'Isc:___A',
          'Z:___Ω',
          `Zref: ${ziZref.toFixed(1).replace('.', ',')}Ω`
        ];
        // Isc/Lim (siehe normale Zl-Ansicht) gehören hier nicht mehr hin -
        // ΔU hat eigene Zeilen zwischen den Strichen stattdessen.
        zustand.nebenwertLinks = null;
        zustand.nebenwertRechts = null;
      } else {
        zustand.titelWerte = ziTitelWerte;
        // Lim hängt von LS-Typ UND Bemessungsstrom ab - live neu berechnet,
        // damit es mit den ▲/▼-Änderungen oben mitzieht (nicht mehr nur aus
        // den statischen Defaults in zustandFuerFunktion()).
        zustand.nebenwertRechts = MessgeraetView.berechneLimText(ziTitelWerte[0], ziTitelWerte[1]);
        // Z-Wert nur nach TEST-Klick (siehe ziTestKlick()) - Platzhalter aus
        // zustandFuerFunktion() ("Z:---Ω") bleibt stehen, solange ziMesswert
        // null ist (kein "kein Pfad"-Sentinel wie bei RISO, siehe dort).
        // Isc (Kurzschlussstrom, unten links über dem Strich) hängt an
        // derselben Bedingung wie Z - beide zeigen den `---`-Platzhalter
        // (`zustandFuerFunktion()`s Default `nebenwertLinks = 'Isc:---A'`),
        // solange kein gültiger Messwert vorliegt.
        if (ziMesswert !== null) {
          zustand.hauptwert = `Z:${ziMesswert.toFixed(2).replace('.', ',')}Ω`;
          const isc = (0.9 * 230) / ziMesswert;
          zustand.nebenwertLinks = `Isc:${isc.toFixed(1).replace('.', ',')}A`;
          // Ampel: reicht der Kurzschlussstrom aus, um den LS in der
          // geforderten Zeit auszulösen? Isc > Lim -> grün (bestanden), sonst
          // rot. Bewusst live aus dem AKTUELLEN LS-Typ/Bemessungsstrom
          // berechnet (wie Lim selbst, siehe oben) statt als eigener
          // TEST-Snapshot - ändert man LS-Typ/Bemessungsstrom per ▲/▼, ohne
          // erneut TEST zu drücken, zieht die Ampel sofort mit.
          const lim = MessgeraetView.berechneLim(ziTitelWerte[0], ziTitelWerte[1]);
          zustand.leuchteLinksAn = isc < lim;
          zustand.leuchteRechtsAn = isc >= lim;
        }
      }
    } else if (funktion === 'ZS') {
      const zsTitelWerte = [
        ZI_LS_TYPEN[zsLsTypIndex],
        ZI_BEMESSUNGSSTROEME[zsBemessungsstromIndex],
        ZI_ABSCHALTZEITEN[zsAbschaltzeitIndex]
      ];
      // Lim wie bei ZI live berechnet - gilt für "Zs" UND "ZSrcd" gleichermaßen
      // (siehe Kommentar unten: Isc/Lim bleiben in ZSrcd unverändert).
      zustand.nebenwertRechts = MessgeraetView.berechneLimText(zsTitelWerte[0], zsTitelWerte[1]);
      // Live, unabhängig von TEST - siehe berechneZsSpannung(). Gilt wie der
      // Z-Wert unten für beide Ansichten (normale Zs- UND ZSrcd-Ansicht).
      const zsSpannung = berechneZsSpannung();
      zustand.spannungUnterPe = `${zsSpannung}V`;
      // Pfeil/Sanduhr-Indikator unten links wie bei ZI: liegt Spannung an
      // (L-Pfad bereit), bewusst undurchgestrichen, sonst durchgestrichen.
      zustand.indikatorDurchgestrichen = zsSpannung === 0;
      if (titelZeigtLabel) {
        // ZSrcd-Ansicht (Zs-Messung durch einen RCD hindurch, ohne ihn
        // auszulösen): eigenständiger Titel statt Zs. "Std"/"Low" togglet
        // per ▲/▼ (siehe unten), LS-Typ/Bemessungsstrom bleiben mittig, die
        // Abschaltzeit rutscht wie bei ZI-ΔU nach rechts (titelWertRechts).
        // Zone 2/3 (Hauptmesswert, Messpunkte, Isc/Lim) bleiben unverändert
        // wie in der normalen Zs-Ansicht - kein Override nötig.
        zustand.titel = 'ZSrcd';
        zustand.titelWerte = [ZS_STD_LOW[zsStdLowIndex], zsTitelWerte[0], zsTitelWerte[1]];
        zustand.titelWertRechts = zsTitelWerte[2];
      } else {
        zustand.titelWerte = zsTitelWerte;
      }
      // Z-Wert nur nach TEST-Klick (siehe zsTestKlick()) - Platzhalter
      // "Z:---Ω" bleibt stehen, solange zsMesswert null ist. Gilt für BEIDE
      // Ansichten (normale Zs- UND ZSrcd-Ansicht) - anders als bei ZIs
      // ΔU-Ansicht (siehe oben) bleibt der Hauptmesswert-Bereich bei ZSrcd
      // unverändert live, siehe Kommentar oben ("kein Override nötig").
      if (zsMesswert !== null) {
        zustand.hauptwert = `Z:${zsMesswert.toFixed(2).replace('.', ',')}Ω`;
        // Isc/Lim-Ampel wie bei ZI: Isc > Lim -> grün (bestanden), sonst rot.
        // Live aus dem AKTUELLEN LS-Typ/Bemessungsstrom berechnet, nicht als
        // TEST-Snapshot eingefroren - siehe ZI-Kommentar für Details.
        const isc = (0.9 * 230) / zsMesswert;
        zustand.nebenwertLinks = `Isc:${isc.toFixed(1).replace('.', ',')}A`;
        const lim = MessgeraetView.berechneLim(zsTitelWerte[0], zsTitelWerte[1]);
        zustand.leuchteLinksAn = isc < lim;
        zustand.leuchteRechtsAn = isc >= lim;
      }
    } else if (funktion === 'FI/RCD') {
      zustand.titelWerte = [FIRCD_FEHLERSTROEME[fircdFehlerstromIndex], FIRCD_TYPEN[fircdTypIndex]];
      // Live, unabhängig von TEST - siehe berechneFircdSpannung(). Wie bei
      // ZS/ZI: Pfeil-Kasten unten links undurchgestrichen, solange der
      // L-Pfad bereit ist, sonst durchgestrichen.
      const fircdSpannung = berechneFircdSpannung();
      zustand.spannungUnterPe = `${fircdSpannung}V`;
      zustand.indikatorDurchgestrichen = fircdSpannung === 0;
      // Ampel (siehe fircdTestKlick()) - grün bei gefundenem RCD, rot bei
      // "kein RCD auf dem Pfad", sonst (noch kein TEST-Klick) beide aus/grau.
      zustand.leuchteLinksAn = fircdAmpel === 'rot';
      zustand.leuchteRechtsAn = fircdAmpel === 'gruen';
      // I/Uci/t nur nach TEST-Klick MIT gefundenem RCD (siehe
      // fircdTestKlick()) - Platzhalter aus zustandFuerFunktion() bleiben
      // stehen, solange fircdMesswert null ist (kein TEST, ODER TEST ohne
      // gefundenes RCD - in beiden Fällen sollen die Felder leer bleiben).
      if (fircdMesswert !== null) {
        zustand.hauptwert = `I:${fircdMesswert.iA.toFixed(1).replace('.', ',')}mA`;
        zustand.nebenwertLinks = `Uci:${fircdMesswert.uB.toFixed(1).replace('.', ',')}V`;
        zustand.nebenwertRechts = `t:${fircdMesswert.tA.toFixed(1).replace('.', ',')}ms`;
      }
    } else if (funktion === 'V~') {
      // Live, keine TEST-Taste nötig, keine Platzierungsvorgabe - Messspitzen
      // dürfen auf beliebige Funktionen gesetzt werden (explizite
      // User-Vorgabe), berechneSpannungZwischenAdern() liefert dann einfach
      // 0V für jede nicht sinnvolle/nicht verbundene Kombination.
      const schwarzAder = messspitzenAderNachFarbe('schwarz');
      const blauAder = messspitzenAderNachFarbe('blau');
      const gruenAder = messspitzenAderNachFarbe('grün');
      zustand.hauptwertZeilen = [
        { label: 'Uln', wert: `${berechneSpannungZwischenAdern(schwarzAder, blauAder)}V` },
        { label: 'Ulpe', wert: `${berechneSpannungZwischenAdern(schwarzAder, gruenAder)}V` },
        { label: 'Unpe', wert: `${berechneSpannungZwischenAdern(blauAder, gruenAder)}V` }
      ];
      // Phasenfolge (siehe berechnePhasenfolge() oben) - oben rechts im
      // Display, unterhalb des oberen grauen Strichs (siehe
      // view/messgeraet.js zeichneDisplay()). null = keine Anzeige.
      zustand.phasenfolge = berechnePhasenfolge();
    }

    return zustand;
  }

  // Setzt alle per ▲/▼ bearbeitbaren Felder auf ihren Default zurück - beim
  // Wechsel der Funktion oder beim Ein-/Ausschalten soll die Bearbeitung nicht
  // erhalten bleiben (zustandFuerFunktion() baut ohnehin einen frischen
  // Basis-Zustand, die Overrides in baueAnzeigeZustand() sollen dazu passen).
  function setzeBearbeitungenZurueck() {
    zone1Auswahl = 0;
    titelZeigtLabel = false;
    rlowKalibrierterWiderstand = 0.4;
    risoMessspannungIndex = RISO_MESSSPANNUNGEN.indexOf('500V');
    risoGrenzwertMOhm = 50;
    risoMesswert = null;
    risoAmpel = null;
    ziMesswert = null;
    ziLsTypIndex = ZI_LS_TYPEN.indexOf('B');
    ziBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
    ziAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
    ziSpannungsfallProzent = 4.0;
    ziZref = 0.1;
    zsLsTypIndex = ZI_LS_TYPEN.indexOf('B');
    zsBemessungsstromIndex = ZI_BEMESSUNGSSTROEME.indexOf('16A');
    zsAbschaltzeitIndex = ZI_ABSCHALTZEITEN.indexOf('0,4s');
    zsStdLowIndex = ZS_STD_LOW.indexOf('Std');
    zsMesswert = null;
    fircdFehlerstromIndex = FIRCD_FEHLERSTROEME.indexOf('30mA');
    fircdTypIndex = FIRCD_TYPEN.indexOf('AC');
    fircdMesswert = null;
    fircdAmpel = null;
  }

  // Entfernt alle angelegten Messspitzen (Overlay-Kreise + Zustand) - beim
  // Ausschalten des Messgeräts, da der Messmodus dann endet und man beim
  // nächsten Einschalten wieder frisch anlegen soll.
  function entferneAlleMessspitzen() {
    for (const overlay of messspitzenOverlay.values()) overlay.remove();
    messspitzenOverlay.clear();
    messspitzenFarbe.clear();
    messspitzenAder.clear();
  }

  function renderMessgeraet() {
    MessgeraetView.render(messgeraetContainer, baueAnzeigeZustand(), {
      onOff: () => {
        const eingeschaltet = !messgeraetZustand.an;
        messgeraetZustand = MessgeraetView.zustandFuerFunktion(messgeraetZustand.funktion, eingeschaltet);
        setzeBearbeitungenZurueck();
        if (!eingeschaltet) entferneAlleMessspitzen();
        renderMessgeraet();
      },
      drehknopf: () => {
        const naechste = MessgeraetView.naechsteFunktion(messgeraetZustand.funktion);
        messgeraetZustand = MessgeraetView.zustandFuerFunktion(naechste, messgeraetZustand.an);
        setzeBearbeitungenZurueck();
        renderMessgeraet();
      },
      seite: () => {
        // Live-Zustand (nicht messgeraetZustand) verwenden, da titelWerte je
        // nach Ansicht überschrieben wird (z.B. ZI-ΔU-Ansicht hat andere
        // Werte/Länge als die normale Zl-Ansicht) und ein optionales
        // titelWertRechts (rechtsbündiger Extra-Wert) dazukommen kann.
        const aktuellerZustand = baueAnzeigeZustand();
        const anzahlFelder = 1 + aktuellerZustand.titelWerte.length + (aktuellerZustand.titelWertRechts ? 1 : 0);
        zone1Auswahl = (zone1Auswahl + 1) % anzahlFelder;
        renderMessgeraet();
      },
      auf: () => { aendereAusgewaehltesFeld(1); },
      ab: () => { aendereAusgewaehltesFeld(-1); },
      test: testKlick
    });
  }

  // TEST-Taste - dispatcht je nach aktueller Messfunktion (jede der beiden
  // Handler-Funktionen prüft ihrerseits messgeraetZustand.funktion und bricht
  // sonst ab, siehe risoTestKlick()/ziTestKlick() - der Dispatch hier dient
  // nur der Übersicht beim Lesen, nicht der eigentlichen Absicherung).
  function testKlick() {
    if (messgeraetZustand.funktion === 'RISO') risoTestKlick();
    else if (messgeraetZustand.funktion === 'ZI') ziTestKlick();
    else if (messgeraetZustand.funktion === 'ZS') zsTestKlick();
    else if (messgeraetZustand.funktion === 'FI/RCD') fircdTestKlick();
  }

  function aendereAusgewaehltesFeld(richtung) {
    const funktion = messgeraetZustand.funktion;
    if (zone1Auswahl === 0) {
      titelZeigtLabel = !titelZeigtLabel;
    } else if (funktion === 'RLOW' && zone1Auswahl === 1) {
      rlowKalibrierterWiderstand = Math.max(0, Math.round((rlowKalibrierterWiderstand + richtung * 0.1) * 10) / 10);
    } else if (funktion === 'RISO' && zone1Auswahl === 1) {
      risoMessspannungIndex = klemmeIndex(risoMessspannungIndex, richtung, RISO_MESSSPANNUNGEN.length - 1);
    } else if (funktion === 'RISO' && zone1Auswahl === 2) {
      // Grenzwert (titelWertRechts) - 10MΩ-Schritte, nicht negativ.
      risoGrenzwertMOhm = Math.max(0, risoGrenzwertMOhm + richtung * 10);
    } else if (funktion === 'ZI' && titelZeigtLabel) {
      // ΔU-Ansicht: 1=Spannungsfall%, 2=LS-Typ, 3=Bemessungsstrom,
      // 4=Abschaltzeit (rechtsbündig, titelWertRechts) - andere Reihenfolge
      // als in der normalen Zl-Ansicht, siehe baueAnzeigeZustand().
      if (zone1Auswahl === 1) {
        ziSpannungsfallProzent = Math.max(0, Math.round((ziSpannungsfallProzent + richtung * 0.5) * 10) / 10);
      } else if (zone1Auswahl === 2) {
        ziLsTypIndex = klemmeIndex(ziLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 3) {
        ziBemessungsstromIndex = klemmeIndex(ziBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 4) {
        ziAbschaltzeitIndex = klemmeIndex(ziAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'ZI') {
      // Normale Zl-Ansicht: 1=LS-Typ, 2=Bemessungsstrom, 3=Abschaltzeit.
      if (zone1Auswahl === 1) {
        ziLsTypIndex = klemmeIndex(ziLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 2) {
        ziBemessungsstromIndex = klemmeIndex(ziBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 3) {
        ziAbschaltzeitIndex = klemmeIndex(ziAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'ZS' && titelZeigtLabel) {
      // ZSrcd-Ansicht: 1="Std"/"Low", 2=LS-Typ, 3=Bemessungsstrom,
      // 4=Abschaltzeit (rechtsbündig, titelWertRechts).
      if (zone1Auswahl === 1) {
        // Reines Toggle (wie beim Titel), nicht geklemmt - ▲ und ▼ machen
        // beide dasselbe, da es nur zwei Werte gibt.
        zsStdLowIndex = 1 - zsStdLowIndex;
      } else if (zone1Auswahl === 2) {
        zsLsTypIndex = klemmeIndex(zsLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 3) {
        zsBemessungsstromIndex = klemmeIndex(zsBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 4) {
        zsAbschaltzeitIndex = klemmeIndex(zsAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'ZS') {
      // Normale Zs-Ansicht: 1=LS-Typ, 2=Bemessungsstrom, 3=Abschaltzeit.
      if (zone1Auswahl === 1) {
        zsLsTypIndex = klemmeIndex(zsLsTypIndex, richtung, ZI_LS_TYPEN.length - 1);
      } else if (zone1Auswahl === 2) {
        zsBemessungsstromIndex = klemmeIndex(zsBemessungsstromIndex, richtung, ZI_BEMESSUNGSSTROEME.length - 1);
      } else if (zone1Auswahl === 3) {
        zsAbschaltzeitIndex = klemmeIndex(zsAbschaltzeitIndex, richtung, ZI_ABSCHALTZEITEN.length - 1);
      }
    } else if (funktion === 'FI/RCD') {
      // 1=Fehlerstrom, 2=Typ.
      if (zone1Auswahl === 1) {
        fircdFehlerstromIndex = klemmeIndex(fircdFehlerstromIndex, richtung, FIRCD_FEHLERSTROEME.length - 1);
      } else if (zone1Auswahl === 2) {
        fircdTypIndex = klemmeIndex(fircdTypIndex, richtung, FIRCD_TYPEN.length - 1);
      }
    }
    renderMessgeraet();
  }

  renderMessgeraet();

  // Schraubendreher (siehe view/schraubendreher.js) - erster Schritt, nur
  // Darstellung, noch keine Interaktivität (siehe KONZEPT.md "Schrauben
  // lösen" / Projekt-Memory "Schrauben lösen Idee"). Höhe wird aus der
  // TATSÄCHLICH gerenderten Messgerät-Höhe gelesen (nicht dupliziert), damit
  // beide immer exakt gleich hoch sind. Rechts neben dem Messgerät (für
  // Rechtshänder, User-Vorgabe) - per JS ABSOLUT positioniert, direkt an der
  // rechten Kante der tatsächlichen Messgerät-SVG (nicht am rechten Rand der
  // #messgeraet-Box, die deutlich breiter ist, um das Messgerät unter dem
  // Schaltkasten zu zentrieren - siehe oben). Dadurch bleibt das Messgerät
  // exakt so zentriert wie vorher, unbeeinflusst vom Schraubendreher.
  const schraubendreherContainer = document.getElementById('schraubendreher');
  const messgeraetZeileContainer = document.getElementById('messgeraet-zeile');
  // Höhe bleibt über die Zeit konstant (unabhängig vom Messgerät-Zustand),
  // einmaliges Auslesen genügt - anders als bei der Positionierung unten
  // (siehe positioniereSchraubendreher()), die JEDES Mal frisch aus dem DOM
  // lesen muss.
  const messgeraetSvgHoehe = messgeraetContainer.querySelector('svg').getAttribute('height');

  // Rechts neben der tatsächlichen Messgerät-SVG positioniert (nicht am
  // rechten Rand der - deutlich breiteren - #messgeraet-Box, die nur zur
  // Zentrierung unter dem Schaltkasten dient) - Position hängt nur vom
  // (ortsfesten) Messgerät ab, ändert sich also über die Zeit nicht. WICHTIG:
  // die SVG dafür muss bei JEDEM Aufruf frisch aus dem DOM gelesen werden
  // (nicht der `messgeraetSvg`-Verweis von ganz oben) - `MessgeraetView.render()`
  // leert den Container bei JEDEM Re-Render (ON/OFF, Drehknopf, Messspitzen-
  // Änderung, ...) und hängt ein KOMPLETT NEUES `<svg>`-Element ein. Ein
  // gecachter Verweis auf das alte, damit aus dem DOM entfernte Element
  // liefert `getBoundingClientRect()` nur noch Nullen - Bug, der den
  // Schraubendreher irgendwo links im Schaltschrank statt rechts vom
  // Messgerät erscheinen ließ (User-Meldung, siehe Projekt-Memory
  // "Schrauben lösen Idee").
  function positioniereSchraubendreher() {
    const messgeraetSvgRect = messgeraetContainer.querySelector('svg').getBoundingClientRect();
    const zeileRect = messgeraetZeileContainer.getBoundingClientRect();
    schraubendreherContainer.style.position = 'absolute';
    schraubendreherContainer.style.left = `${messgeraetSvgRect.right - zeileRect.left + 16}px`;
    schraubendreherContainer.style.top = `${messgeraetSvgRect.top - zeileRect.top}px`;
  }

  // Solange aufgenommen (siehe onSchraubeKlick() oben), bleibt die
  // Ruheposition leer - kein zweites Icon, keine "Werkzeug ablegen"-Klickfläche,
  // exakt wie spezifiziert (kehrt nur automatisch nach einem Schrauben-Klick
  // zurück, siehe onSchraubeKlick()).
  function renderSchraubendreher() {
    if (schraubendreherAufgenommen) {
      schraubendreherContainer.innerHTML = '';
      return;
    }
    SchraubendreherView.render(schraubendreherContainer, messgeraetSvgHoehe, {
      onKlick: () => {
        schraubendreherAufgenommen = true;
        renderSchraubendreher();
      }
    });
    positioniereSchraubendreher();
  }

  renderSchraubendreher();
}

start();
