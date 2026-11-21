// Tests für den Schutzleiter-Graphen (PE-Konzept in docs/KONZEPT.md, sim-gn9):
// graph.PE aus generiereGraph() und berechneErsatzwiderstand() aus
// model/pfad.js. Aufruf: node tests/visuell/test_pe_graph.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { generiereGraph } = require('./generate_anlage.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');

let alleBestanden = true;

function pruefe(name, fn) {
  try {
    fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.log(`${name}: FAIL – ${err.message}`);
    alleBestanden = false;
  }
}

function bedingung(wahr, meldung) {
  if (!wahr) throw new Error(meldung);
}

const nahe = (ist, soll) => ist !== null && Math.abs(ist - soll) < 1e-9;

// Kopie einer Anlage mit zusätzlichen Zeilen in der Fehlertabelle
// (`| Netz | Widerstand (Ω) | Ort | Pin |`).
function mitFehlerzeilen(quelle, zeilen) {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'pe-graph-'));
  for (const datei of ['netzplan.md', 'bauteile.md']) fs.copyFileSync(path.join(quelle, datei), path.join(ziel, datei));
  let text = fs.readFileSync(path.join(ziel, 'netzplan.md'), 'utf8');
  text = text.replace(/\n## Fehlertabelle[\s\S]*$/, '');
  text += `\n## Fehlertabelle\n\n| Netz | Widerstand (Ω) | Ort | Pin |\n| --- | --- | --- | --- |\n${zeilen.join('\n')}\n`;
  fs.writeFileSync(path.join(ziel, 'netzplan.md'), text);
  return ziel;
}

(async () => {
  const { berechneErsatzwiderstand, peKnoten } = await import(path.join(PROJEKT_ROOT, 'model', 'pfad.js'));
  const netz = (id) => peKnoten('netz', id);
  const bauteil = (name) => peKnoten('bauteil', name);
  const R = (g, a, b) => berechneErsatzwiderstand(g, a, b);

  // --- graph.PE aus den Anlagen ---
  const anlagen = [
    ...fs.readdirSync(__dirname).filter((d) => /^testcase_\d+$/.test(d)).map((d) => path.join(__dirname, d)),
    ...fs.readdirSync(path.join(PROJEKT_ROOT, 'demos')).filter((d) => /^demo_\d+$/.test(d)).map((d) => path.join(PROJEKT_ROOT, 'demos', d))
  ];
  for (const ordner of anlagen) {
    const name = path.basename(ordner);
    pruefe(`${name}: graph.PE verbindet jede Endstelle mit der Einspeisung (ohne Kontaktfehler widerstandsfrei), ohne Kanten`, () => {
      const graph = generiereGraph(ordner);
      bedingung(graph.PE && graph.PE.einspeisung, 'graph.PE.einspeisung fehlt');
      bedingung(!('kanten' in graph.PE), 'graph.PE darf keine Schalter-Kanten haben');
      bedingung(!graph.einspeisung.PE, 'graph.einspeisung.PE darf es nicht geben (bisherige Pfadsuchen sehen PE nicht)');
      const endstellen = [...new Set(graph.PE.kontakte.filter((k) => k.bauteil.startsWith('Endstelle_')).map((k) => k.bauteil))];
      bedingung(endstellen.length > 0, 'keine Endstelle im PE-Graphen');
      // Anlagen mit PE-Kontaktfehlern (z.B. testcase_09): verbunden, Wert > 0
      // möglich; ohne Kontaktfehler überall 0 Ω.
      const mitFehlern = graph.PE.kontakte.some((k) => k.widerstand > 0);
      for (const e of endstellen) {
        const r = R(graph.PE, bauteil(e), netz(graph.PE.einspeisung));
        bedingung(r !== null && (mitFehlern ? r >= 0 : r === 0), `${e}: ${r}`);
      }
    });
  }

  // --- Ersatzwiderstand an kleinen Graphen ---
  // Kette Einspeisung - PE-Klemme - Zubringer - RK - Endstelle.
  const kette = (r = {}) => ({
    kontakte: [
      { bauteil: 'Einspeisung', pin: 'Einspeisung.PE', netz: 'N1' },
      { bauteil: 'PE-Klemme', pin: 'PE-Klemme.io1', netz: 'N1', widerstand: r.einspeisung },
      { bauteil: 'PE-Klemme', pin: 'PE-Klemme.io2', netz: 'N2', widerstand: r.zubringer },
      { bauteil: 'RK', pin: 'RK.io1', netz: 'N2' },
      { bauteil: 'RK', pin: 'RK.io2', netz: 'N3', widerstand: r.abgang },
      { bauteil: 'Endstelle', pin: 'Endstelle.i3', netz: 'N3' }
    ]
  });

  pruefe('Baum: Ersatzwiderstand = Summe der Kontaktfehler auf dem Weg', () => {
    const g = kette({ einspeisung: 0.05, zubringer: 0.1, abgang: 0.2 });
    bedingung(nahe(R(g, bauteil('Endstelle'), bauteil('PE-Klemme')), 0.3), `Endstelle-PE-Klemme ${R(g, bauteil('Endstelle'), bauteil('PE-Klemme'))}`);
    bedingung(nahe(R(g, bauteil('Endstelle'), bauteil('Einspeisung')), 0.35), 'Endstelle-Einspeisung');
    bedingung(nahe(R(g, bauteil('PE-Klemme'), bauteil('Endstelle')), 0.3), 'symmetrisch');
  });

  pruefe('Zwei Messpunkte an beiden Enden einer Ader mit Kontaktfehler messen den Fehler', () => {
    const g = kette({ abgang: 0.2 });
    bedingung(nahe(R(g, bauteil('RK'), bauteil('Endstelle')), 0.2), `RK-Endstelle ${R(g, bauteil('RK'), bauteil('Endstelle'))}`);
    bedingung(nahe(R(g, netz('N3'), bauteil('Endstelle')), 0), 'Netzseite des Kontakts liegt bei der Endstelle');
  });

  pruefe('Fehler am PE-Kontakt der Einspeisung: nicht zwischen Endstelle und PE-Klemme, wohl bis zur Einspeisung', () => {
    const g = kette({ einspeisung: 0.4 });
    bedingung(nahe(R(g, bauteil('Endstelle'), bauteil('PE-Klemme')), 0), 'Rpe');
    bedingung(nahe(R(g, bauteil('Endstelle'), bauteil('Einspeisung')), 0.4), 'bis Einspeisung');
  });

  pruefe('Zwei Parallelzweige: Ersatzwiderstand wie Parallelschaltung', () => {
    const g = {
      kontakte: [
        { bauteil: 'A', pin: 'A.io1', netz: 'N1', widerstand: 0.3 },
        { bauteil: 'B', pin: 'B.io1', netz: 'N1' },
        { bauteil: 'A', pin: 'A.io2', netz: 'N2', widerstand: 0.6 },
        { bauteil: 'B', pin: 'B.io2', netz: 'N2' }
      ]
    };
    // A - N1 (0,3) und A - N2 (0,6), N1 und N2 über B ideal verbunden: 0,3 || 0,6 = 0,2.
    bedingung(nahe(R(g, bauteil('A'), bauteil('B')), 0.2), `${R(g, bauteil('A'), bauteil('B'))}`);
  });

  pruefe('Sackgassen, schwebende und unbekannte Messpunkte', () => {
    const g = kette({ abgang: 0.2 });
    g.kontakte.push({ bauteil: 'H1', pin: 'H1', netz: 'N9' }, { bauteil: 'Rest', pin: 'Rest.io1', netz: 'N9', widerstand: 0.7 });
    bedingung(nahe(R(g, bauteil('Endstelle'), bauteil('PE-Klemme')), 0.2), 'Sackgasse stört nicht');
    bedingung(R(g, bauteil('H1'), bauteil('PE-Klemme')) === null, 'nicht verbundene Hutschiene: kein Durchgang');
    bedingung(R(g, bauteil('Gibtsnicht'), bauteil('PE-Klemme')) === null, 'unbekannter Messpunkt');
    bedingung(R(g, bauteil('PE-Klemme'), bauteil('PE-Klemme')) === 0, 'gleicher Punkt');
  });

  pruefe('Hutschiene mit indirektem Parallelweg hat Durchgang', () => {
    const g = kette({ zubringer: 0.2 });
    // Hutschiene H über PE-Klemme.io3 und RK.io3 an beiden Seiten verbunden.
    g.kontakte.push(
      { bauteil: 'PE-Klemme', pin: 'PE-Klemme.io3', netz: 'NH' },
      { bauteil: 'H', pin: 'H', netz: 'NH' },
      { bauteil: 'RK', pin: 'RK.io3', netz: 'NH', widerstand: 0.2 }
    );
    bedingung(nahe(R(g, bauteil('Endstelle'), bauteil('PE-Klemme')), 0.1), `0,2 || 0,2 = 0,1, ist ${R(g, bauteil('Endstelle'), bauteil('PE-Klemme'))}`);
    bedingung(nahe(R(g, bauteil('H'), bauteil('PE-Klemme')), 0), 'Hutschiene ideal an der PE-Klemme');
  });

  // --- Kontaktfehler aus der Fehlertabelle ---
  const demo = path.join(PROJEKT_ROOT, 'demos', 'demo_04');
  pruefe('Fehlertabelle mit Pin: Kontaktfehler landet am PE-Kontakt und wirkt im Ersatzwiderstand', () => {
    const basis = generiereGraph(demo).PE;
    const abgang = basis.kontakte.find((k) => k.pin === 'Reihenklemme_PE_SK2.io2');
    const ordner = mitFehlerzeilen(demo, [`| ${abgang.netz} | 0,25 | SK2 PE | Reihenklemme_PE_SK2.io2 |`]);
    const pe = generiereGraph(ordner).PE;
    const kontakt = pe.kontakte.find((k) => k.pin === 'Reihenklemme_PE_SK2.io2');
    bedingung(kontakt.widerstand === 0.25, `widerstand ${kontakt.widerstand}`);
    bedingung(nahe(R(pe, bauteil('Endstelle_SK2'), bauteil('PE-Klemme')), 0.25), 'SK2');
    bedingung(nahe(R(pe, bauteil('Endstelle_SK1'), bauteil('PE-Klemme')), 0), 'SK1 unberührt');
  });

  pruefe('Fehlertabelle: PE-Netz ohne Pin und Pin an einem L-Netz werden abgelehnt', () => {
    const pe = generiereGraph(demo).PE;
    const peNetz = pe.kontakte.find((k) => k.pin === 'Reihenklemme_PE_SK2.io2').netz;
    let meldung = '';
    try { generiereGraph(mitFehlerzeilen(demo, [`| ${peNetz} | 0,25 | SK2 PE |  |`])); } catch (e) { meldung = e.message; }
    bedingung(meldung.includes('braucht einen Kontakt'), `PE ohne Pin: "${meldung}"`);
    meldung = '';
    try { generiereGraph(mitFehlerzeilen(demo, ['| N2 | 0,25 | L | Hauptschalter.i1 |'])); } catch (e) { meldung = e.message; }
    bedingung(meldung.includes('gibt es im PE-Netz nicht'), `L mit Pin: "${meldung}"`);
  });

  // Review Codex zu sim-gn9: ungültige Kontaktfehler werden abgelehnt, nicht
  // still als idealer Kontakt übernommen.
  pruefe('Fehlertabelle mit Pin: Text, Zahl mit Textrest, negative und nichtendliche Werte werden abgelehnt', () => {
    const peNetz = generiereGraph(demo).PE.kontakte.find((k) => k.pin === 'Reihenklemme_PE_SK2.io2').netz;
    for (const wert of ['abc', '0,25xyz', '-0,25', 'Infinity']) {
      let meldung = '';
      try { generiereGraph(mitFehlerzeilen(demo, [`| ${peNetz} | ${wert} | SK2 PE | Reihenklemme_PE_SK2.io2 |`])); } catch (e) { meldung = e.message; }
      bedingung(meldung.includes(`Widerstand "${wert}" ungültig`) && meldung.includes(peNetz), `${wert}: "${meldung}"`);
    }
    const ordner = mitFehlerzeilen(demo, [`| ${peNetz} | 0 | SK2 PE | Reihenklemme_PE_SK2.io2 |`]);
    bedingung(generiereGraph(ordner).PE.kontakte.find((k) => k.pin === 'Reihenklemme_PE_SK2.io2').widerstand === 0, 'explizite 0 ist gültig');
  });

  process.exit(alleBestanden ? 0 : 1);
})();
