// Tests für tools/demo_erstellung.js (Anforderung -> netzplan.md/bauteile.md -> anlage.json/graph.json).
// Läuft ohne Browser in Temp-Ordnern. Aufruf: node tests/visuell/test_demo_erstellung.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseAnforderung, pruefeAnforderung, erzeugeModell } = require('../../tools/demo_erstellung.js');
const { istSpannungFuehrend, findePfad, berechneWiderstand } = require('./generate_anlage.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const VORLAGE = path.join(PROJEKT_ROOT, 'demos', 'anforderung_vorlage.md');
// Von Hand gebaute Anlage zur ausgefüllten Vorlage (früher demos/demo_01, sim-qlp).
const VORLAGE_ANLAGE = path.join(__dirname, 'referenz', 'vorlage_anlage.json');

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

const ohneNetzIds = (obj) => JSON.stringify(obj, (k, v) => (k === 'netz' || k === 'pe_netz' ? undefined : v));

function tempOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'demo-erstellung-'));
}

// Baut einen Anforderungstext aus Daten, damit die Tests nicht von der Textform der Vorlage abhängen.
// `anlage` ergänzt Zeilen der Anlage-Tabelle (z.B. Vorimpedanz), `fehlerSpalte` ersetzt den
// Kopf der Stromkreis-Fehlerspalten (für die Meldung zur alten Spalte).
function baueAnforderung({ hsPole = 3, hsA = 35, gruppen, stromkreise, anlage = {}, fehlerSpalte = 'Fehler L (Ω) | Fehler N (Ω)' }) {
  // Spalte "PE-Klemme (ja/nein)" nur bei Bedarf (sim-kfb).
  const mitPeKlemme = gruppen.some((x) => 'peKlemme' in x);
  const g = gruppen.map((x) => `| ${x.id} | ${x.rcdPole} | ${x.typ ?? 'A'} | ${x.fehlerstrom ?? 30} | ${x.nennstrom ?? 40} | ${x.selektiv ?? 'nein'} | ${x.abklemmen ?? 'nein'} | ${x.fehlerL ?? ''} | ${x.fehlerN ?? ''} |${mitPeKlemme ? ` ${x.peKlemme ?? ''} |` : ''}`).join('\n');
  // Spalte "AFDD (ja/nein)" nur, wenn ein Stromkreis sie setzt (sie ist optional).
  const mitAfdd = stromkreise.some((x) => 'afdd' in x);
  // Spalte "Drehfeld (rechts/links)" ebenso nur bei Bedarf (sim-wme).
  const mitDrehfeld = stromkreise.some((x) => 'drehfeld' in x);
  // Spalte "Fehler PE (Ω)" ebenso nur bei Bedarf (sim-24c).
  const mitPe = stromkreise.some((x) => 'fehlerPE' in x);
  const s = stromkreise.map((x) => `| ${x.name} | ${x.gruppe} | Ziel ${x.name} | ${x.endstelle ?? 'Steckdose'} | ${x.dosen ?? 1} | ${x.lsPole ?? 1} | ${x.lsChar ?? 'B'} | ${x.lsA ?? 16} | ${x.phase ?? ''} | ja | ${x.fehlerL ?? ''} | ${x.fehlerN ?? ''} |${mitAfdd ? ` ${x.afdd ?? ''} |` : ''}${mitDrehfeld ? ` ${x.drehfeld ?? ''} |` : ''}${mitPe ? ` ${x.fehlerPE ?? ''} |` : ''}`).join('\n');
  const zusatz = Object.entries(anlage).map(([feld, wert]) => `\n| ${feld} | ${wert} |`).join('');
  return `# Anforderung – test

## Anlage

| Feld | Wert |
| --- | --- |
| Name | Testanlage |
| Beschreibung | Test |
| Netzform | TN-S |
| Hauptschalter Pole | ${hsPole} |
| Hauptschalter (A) | ${hsA} |${zusatz}

## Gruppen

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen | Fehler L (Ω) | Fehler N (Ω) |${mitPeKlemme ? ' PE-Klemme (ja/nein) |' : ''}
| --- | --- | --- | --- | --- | --- | --- | --- | --- |${mitPeKlemme ? ' --- |' : ''}
${g}

## Stromkreise

| Stromkreis | Gruppe | Ziel | Endstelle | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | RCD | ${fehlerSpalte} |${mitAfdd ? ' AFDD (ja/nein) |' : ''}${mitDrehfeld ? ' Drehfeld (rechts/links) |' : ''}${mitPe ? ' Fehler PE (Ω) |' : ''}
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |${mitAfdd ? ' --- |' : ''}${mitDrehfeld ? ' --- |' : ''}${mitPe ? ' --- |' : ''}
${s}
`;
}

function erzeuge(text) {
  const ergebnis = erzeugeModell(text, tempOrdner(), 'demo_test');
  bedingung(ergebnis.fehler.length === 0, `Anforderung abgelehnt: ${ergebnis.fehler.join('; ')}`);
  return ergebnis;
}

// Jede Ader L1/L2/L3/N jedes Stromkreises muss über geschlossene Schalter bis zur Einspeisung führen.
function pruefeErreichbarkeit({ anlage, graph }) {
  for (const gruppe of anlage.hutschienen.flatMap((h) => h.gruppen)) {
    for (const sk of gruppe.stromkreise) {
      for (const ader of sk.leitung.adern.filter((a) => a.funktion !== 'PE')) {
        bedingung(
          istSpannungFuehrend(graph, ader.funktion, ader.netz),
          `${sk.bezeichnung}: ${ader.funktion}-Ader (${ader.netz}) ist nicht mit der Einspeisung verbunden`
        );
      }
    }
  }
}

pruefe('Vorlage erzeugt dieselbe Anlage wie die von Hand gebaute Referenz (ohne Netz-IDs)', () => {
  const ergebnis = erzeuge(fs.readFileSync(VORLAGE, 'utf8'));
  const hand = JSON.parse(fs.readFileSync(VORLAGE_ANLAGE, 'utf8'));
  bedingung(ohneNetzIds(ergebnis.anlage) === ohneNetzIds(hand), 'anlage.json weicht von tests/visuell/referenz/vorlage_anlage.json ab');
  pruefeErreichbarkeit(ergebnis);
});

pruefe('Zweite Gruppe (4-poliger RCD Typ B, drei LS auf L1/L2/L3) neben der ersten: alle Adern erreichbar', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [
      { id: 'G1', rcdPole: 2 },
      { id: 'G2', rcdPole: 4, typ: 'B', nennstrom: 63, abklemmen: 'ja' }
    ],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', phase: 'L1' },
      { name: 'SK2', gruppe: 'G2', phase: 'L1' },
      { name: 'SK3', gruppe: 'G2', phase: 'L2' },
      { name: 'SK4', gruppe: 'G2', phase: 'L3' }
    ]
  }));
  const gruppen = ergebnis.anlage.hutschienen.flatMap((h) => h.gruppen);
  bedingung(gruppen.length === 2, `erwartet 2 Gruppen, ${gruppen.length} gefunden`);
  bedingung(ergebnis.anlage.hutschienen.length === 1, 'beide Gruppen (7 TE) sollen auf einer Hutschiene liegen');
  const rcd2 = gruppen.find((g) => g.id === 'G2').rcd;
  bedingung(rcd2.polig === 4 && rcd2.typ === 'B' && rcd2.abklemmen_bei_iso === true, 'RCD der zweiten Gruppe falsch übernommen');
  bedingung(rcd2.name === 'RCD2', `RCD der zweiten Gruppe heißt ${rcd2.name}, erwartet RCD2`);
  pruefeErreichbarkeit(ergebnis);
});

pruefe('Zu viele TE für eine Hutschiene: dritte Gruppe kommt auf eine neue Hutschiene', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [
      { id: 'G1', rcdPole: 2 },
      { id: 'G2', rcdPole: 4, nennstrom: 63 },
      { id: 'G3', rcdPole: 2 }
    ],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', phase: 'L1' }, { name: 'SK2', gruppe: 'G1', phase: 'L1' },
      { name: 'SK3', gruppe: 'G2', phase: 'L1' }, { name: 'SK4', gruppe: 'G2', phase: 'L2' }, { name: 'SK5', gruppe: 'G2', phase: 'L3' },
      { name: 'SK6', gruppe: 'G2', phase: 'L1' }, { name: 'SK7', gruppe: 'G2', phase: 'L2' }, { name: 'SK8', gruppe: 'G2', phase: 'L3' },
      { name: 'SK9', gruppe: 'G3', phase: 'L2' }, { name: 'SK10', gruppe: 'G3', phase: 'L2' }
    ]
  }));
  bedingung(ergebnis.anlage.hutschienen.length === 2, `erwartet 2 Hutschienen, ${ergebnis.anlage.hutschienen.length} gefunden`);
  pruefeErreichbarkeit(ergebnis);
});

pruefe('Dosen-Raster hat höchstens 3 Spalten (Schaltkasten 640 px, Zelle 190 px), keine Dose geht verloren', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', phase: 'L1', dosen: 2 }, { name: 'SK2', gruppe: 'G1', phase: 'L2' },
      { name: 'SK3', gruppe: 'G1', phase: 'L3' }, { name: 'SK4', gruppe: 'G1', phase: 'L1', dosen: 2 },
      { name: 'SK5', gruppe: 'G1', phase: 'L2' }
    ]
  }));
  const p = ergebnis.anlage.steckdosen_platzierung;
  bedingung(Math.max(...p.map((z) => z.col)) <= 2, 'mehr als 3 Spalten im Dosen-Raster');
  bedingung(p.length === 7, `erwartet 7 Dosen, ${p.length} gefunden`);
  bedingung(new Set(p.map((z) => `${z.row}/${z.col}`)).size === p.length, 'zwei Dosen auf demselben Rasterplatz');
  bedingung(p.filter((z) => z.sk === 'SK4').length === 2 && p.filter((z) => z.sk === 'SK5').length === 1, 'Dosenzahl je Stromkreis falsch');
});

pruefe('3-poliger LS ohne RCD plus Gruppe mit 2-poligem RCD (wie testcase_06)', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 'ohne' }, { id: 'G2', rcdPole: 2 }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', lsPole: 3, lsA: 25, endstelle: '5-polige Anschlussdose' },
      { name: 'SK2', gruppe: 'G2', phase: 'L1' }
    ]
  }));
  const g1 = ergebnis.anlage.hutschienen.flatMap((h) => h.gruppen).find((g) => g.id === 'G1');
  bedingung(g1.rcd === null, 'Gruppe ohne RCD soll rcd: null haben');
  bedingung(g1.stromkreise[0].phasen.join() === 'L1,L2,L3', 'SK1 soll dreiphasig sein');
  pruefeErreichbarkeit(ergebnis);
});

pruefe('4-poliger RCD mit 3-poligem LS und Drehstromsteckdose (wie testcase_05)', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', lsPole: 3, lsA: 16, endstelle: 'Drehstromsteckdose' }
    ]
  }));
  bedingung(ergebnis.anlage.spannung_stromkreise === 400, 'Spannung der Stromkreise soll 400 V sein');
  pruefeErreichbarkeit(ergebnis);
});

pruefe('2-poliger Hauptschalter (wie testcase_01): keine L-/N-Klemmen, alle Adern erreichbar', () => {
  const ergebnis = erzeuge(baueAnforderung({
    hsPole: 2, hsA: 25,
    gruppen: [{ id: 'G1', rcdPole: 2 }],
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }, { name: 'SK2', gruppe: 'G1', phase: 'L1', endstelle: 'Lichtauslass', lsA: 10 }]
  }));
  bedingung(ergebnis.anlage.hauptsicherung.polig === 2, 'Hauptschalter soll 2-polig sein');
  bedingung(!ergebnis.anlage.l1_klemme && !ergebnis.anlage.n_klemme, 'bei 2-poligem Hauptschalter gibt es keine L-/N-Klemmen');
  pruefeErreichbarkeit(ergebnis);
});

pruefe('Fehlerwiderstand auf der Zuleitung landet in der Fehlertabelle von graph.json', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 2 }],
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehlerL: '0,45' }]
  }));
  const werte = Object.values(ergebnis.graph.fehlertabelle);
  bedingung(werte.length === 1 && werte[0] === 0.45, `Fehlertabelle: ${JSON.stringify(ergebnis.graph.fehlertabelle)}`);
});

// sim-vdo: Fehler an Stromkreis (L und N, je Außenleiter), Gruppe (RCD-Ausgang) und
// Einspeisung. Erwartet ist die Summe der Fehler auf dem Pfad von der Endstelle zur
// Einspeisung, so wie die App sie für Zi (L + N) und Zs (nur L) aufsummiert.
pruefe('Fehler an Stromkreis, Gruppe und Einspeisung summieren sich je Ader richtig', () => {
  const ergebnis = erzeuge(baueAnforderung({
    anlage: { 'Vorimpedanz (Ω)': '0,2', 'Fehler Einspeisung L (Ω)': '0 / 0,05 / 0', 'Fehler Einspeisung N (Ω)': '0,02' },
    gruppen: [{ id: 'G1', rcdPole: 4, fehlerL: '0,1', fehlerN: '0,03' }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', phase: 'L1', fehlerL: '0,2', fehlerN: '0,15' },
      { name: 'SK2', gruppe: 'G1', phase: 'L2' },
      { name: 'SK3', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose', fehlerL: '0,1 / 0,2 / 0,3' }
    ]
  }));
  const { graph, modell, anlage } = ergebnis;
  const summe = (sk, k, funktion) => {
    const netz = modell.netze.find((n) => n.pins.some((p) => p.pin === `Endstelle_${sk}.i${k}`)).id;
    return berechneWiderstand(graph, findePfad(graph, funktion, graph.einspeisung[funktion], netz));
  };
  const soll = [
    ['SK1', 1, 'L1', 0.3], ['SK1', 2, 'N', 0.2],
    ['SK2', 1, 'L2', 0.05], ['SK2', 2, 'N', 0.05],
    ['SK3', 1, 'L1', 0.2], ['SK3', 2, 'L2', 0.25], ['SK3', 3, 'L3', 0.3], ['SK3', 4, 'N', 0.05]
  ];
  for (const [sk, k, funktion, wert] of soll) {
    const ist = summe(sk, k, funktion);
    bedingung(Math.abs(ist - wert) < 1e-9, `${sk} ${funktion}: Fehlersumme ${ist}, erwartet ${wert}`);
  }
  bedingung(anlage.vorimpedanz_ohm === 0.2, `vorimpedanz_ohm: ${anlage.vorimpedanz_ohm}`);
  pruefeErreichbarkeit(ergebnis);
});

// sim-i4f: LS mit AFDD wie testcase_05 Gruppe G2: 2-poliges Kombigerät, eine
// L-Phase, eigene N-Ader vom RCD und geschaltetes N zur Reihenklemme. Der
// Gruppen-Fehler N wirkt auf jeden Stromkreis der Gruppe genau einmal, auch
// wenn ein normaler LS daneben sitzt.
pruefe('LS mit AFDD (sim-i4f): 2-poliges Kombigerät, eigene N-Ader, Gruppen-Fehler N je Stromkreis einmal', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 2, fehlerN: '0,03' }, { id: 'G2', rcdPole: 4, nennstrom: 63 }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', phase: 'L2', afdd: 'ja', fehlerN: '0,1' },
      { name: 'SK2', gruppe: 'G1', phase: 'L2', afdd: 'nein' },
      { name: 'SK3', gruppe: 'G2', phase: 'L1', afdd: 'ja', endstelle: 'Lichtauslass', lsA: 10 },
      { name: 'SK4', gruppe: 'G2', phase: 'L2' },
      { name: 'SK5', gruppe: 'G2', phase: 'L3', afdd: '' }
    ]
  }));
  const { anlage, graph, modell } = ergebnis;
  const sks = anlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise);
  const ls = (name) => sks.find((s) => s.bezeichnung === name);
  for (const [name, afdd] of [['SK1', true], ['SK2', false], ['SK3', true], ['SK4', false], ['SK5', false]]) {
    const sk = ls(name);
    bedingung(sk.ls.afdd === afdd, `${name}: afdd ${sk.ls.afdd}, erwartet ${afdd}`);
    bedingung(sk.ls.polig === (afdd ? 2 : 1), `${name}: LS ${sk.ls.polig}-polig`);
    bedingung(sk.phasen.length === 1, `${name}: phasen ${sk.phasen.join()}`);
  }
  // Die N-Ader eines AFDD-Stromkreises läuft über den LS (LS.o2), nicht am LS vorbei.
  const nNetz = (sk) => modell.netze.find((n) => n.pins.some((p) => p.pin === `Reihenklemme_N_${sk}.i1`));
  bedingung(nNetz('SK1').pins.some((p) => p.pin === 'LS1.o2'), 'SK1: N-Reihenklemme soll vom AFDD-Ausgang LS1.o2 kommen');
  bedingung(nNetz('SK2').pins.some((p) => p.pin === 'RCD1.o2'), 'SK2: N-Reihenklemme soll am gemeinsamen RCD-N hängen');
  const nSumme = (sk) => {
    const netz = modell.netze.find((n) => n.pins.some((p) => p.pin === `Endstelle_${sk}.i2`)).id;
    return berechneWiderstand(graph, findePfad(graph, 'N', graph.einspeisung.N, netz));
  };
  bedingung(Math.abs(nSumme('SK1') - 0.13) < 1e-9, `SK1 N: Fehlersumme ${nSumme('SK1')}, erwartet 0.13`);
  bedingung(Math.abs(nSumme('SK2') - 0.03) < 1e-9, `SK2 N: Fehlersumme ${nSumme('SK2')}, erwartet 0.03`);
  pruefeErreichbarkeit(ergebnis);
});

// sim-wme: Drehfeld links vertauscht L2 und L3 an der Endstelle. Die Adern
// behalten ihre Funktion (Netz), `kontakt` nennt die Position an der Dose.
pruefe('Drehfeld links (sim-wme): L2/L3 an der Dose vertauscht, Adern mit kontakt, rechts ohne', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose', drehfeld: 'links' },
      { name: 'SK2', gruppe: 'G1', lsPole: 3, endstelle: '5-polige Anschlussdose', drehfeld: 'rechts' }
    ]
  }));
  const sks = ergebnis.anlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise);
  const adern = (name) => sks.find((s) => s.bezeichnung === name).leitung.adern.map((a) => `${a.funktion}${a.kontakt ? `@${a.kontakt}` : ''}`).join();
  bedingung(adern('SK1') === 'L1,L2@L3,L3@L2,N,PE', `SK1: ${adern('SK1')}`);
  bedingung(adern('SK2') === 'L1,L2,L3,N,PE', `SK2: ${adern('SK2')}`);
  pruefeErreichbarkeit(ergebnis);
});

// sim-24c: PE-Fehler sitzen an Kontakten der PE-Klemme bzw. PE-Reihenklemme.
pruefe('Fehler PE (sim-24c): Kontaktfehler an PE-Klemme (Einspeisung, Zubringer) und PE-Reihenklemme', () => {
  const ergebnis = erzeuge(baueAnforderung({
    anlage: { 'Fehler PE Einspeisung (Ω)': '0,04', 'Fehler PE-Klemme Zubringer (Ω)': '0,06' },
    gruppen: [{ id: 'G1', rcdPole: 2 }],
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehlerPE: '0,2' }, { name: 'SK2', gruppe: 'G1', phase: 'L1', fehlerPE: '' }]
  }));
  const kontakte = Object.fromEntries(ergebnis.graph.PE.kontakte.filter((k) => k.widerstand).map((k) => [k.pin, k.widerstand]));
  bedingung(JSON.stringify(kontakte) === JSON.stringify({ 'PE-Klemme.io1': 0.04, 'PE-Klemme.io2': 0.06, 'Reihenklemme_PE_SK1.io2': 0.2 }), JSON.stringify(kontakte));
  bedingung(Object.keys(ergebnis.graph.fehlertabelle).length === 0, 'PE-Fehler gehören nicht in die netzbezogene Fehlertabelle');
  pruefeErreichbarkeit(ergebnis);
});

// sim-kfb: PE-Klemme ohne Kontakt zu H1, eigene PE-Klemme auf einer Gruppen-Hutschiene.
pruefe('Hutschienen (sim-kfb): H1 ohne PE-Kontakt, Gruppen-Hutschiene mit eigener PE-Klemme, Namen und PE-Netze in anlage.json', () => {
  const ergebnis = erzeuge(baueAnforderung({
    anlage: { 'PE-Klemme mit Hutschiene verbunden (ja/nein)': 'nein' },
    gruppen: [{ id: 'G1', rcdPole: 2, peKlemme: 'ja' }],
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
  }));
  const { anlage, graph } = ergebnis;
  bedingung(anlage.hutschiene_hauptschalter.name === 'H1', JSON.stringify(anlage.hutschiene_hauptschalter));
  const h2 = anlage.hutschienen[0];
  bedingung(h2.name === 'H2' && h2.pe_netz && h2.pe_klemme?.name === 'PE-Klemme_H2', JSON.stringify(h2));
  bedingung(anlage.hutschiene_reihenklemmen.name === 'H3' && anlage.hutschiene_reihenklemmen.pe_netz, JSON.stringify(anlage.hutschiene_reihenklemmen));
  const pinsAmNetz = (pin) => graph.PE.kontakte.filter((k) => k.netz === graph.PE.kontakte.find((x) => x.pin === pin).netz).map((k) => k.pin).sort().join();
  bedingung(pinsAmNetz('H1') === 'H1', `H1 ohne PE-Klemme: ${pinsAmNetz('H1')}`);
  bedingung(pinsAmNetz('H2') === 'H2,PE-Klemme_H2.io3', `H2: ${pinsAmNetz('H2')}`);
  bedingung(pinsAmNetz('PE-Klemme_H2.io1') === 'PE-Klemme.io2,PE-Klemme_H2.io1', `Zuleitung PE-Klemme_H2: ${pinsAmNetz('PE-Klemme_H2.io1')}`);
  pruefeErreichbarkeit(ergebnis);
});

// Review Codex zu sim-kfb: die gemeinsame PE-Klemme zählt je Hutschiene nur
// einmal. 11 TE + 4 TE + 1 TE PE-Klemme = 16 TE, passt auf eine Hutschiene.
pruefe('Hutschienen (sim-kfb): zwei Gruppen mit PE-Klemme teilen sich eine Hutschiene und eine PE-Klemme', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63, peKlemme: 'ja' }, { id: 'G2', rcdPole: 2, peKlemme: 'ja' }],
    stromkreise: [
      { name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose' },
      { name: 'SK2', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose' },
      { name: 'SK3', gruppe: 'G1', phase: 'L1' },
      { name: 'SK4', gruppe: 'G2', phase: 'L2' },
      { name: 'SK5', gruppe: 'G2', phase: 'L2' }
    ]
  }));
  const schienen = ergebnis.anlage.hutschienen;
  bedingung(schienen.length === 1, `${schienen.length} Gruppen-Hutschienen statt 1`);
  bedingung(schienen[0].gruppen.length === 2 && schienen[0].pe_klemme?.name === 'PE-Klemme_H2', JSON.stringify(schienen.map((h) => [h.name, h.gruppen.length, h.pe_klemme?.name])));
  pruefeErreichbarkeit(ergebnis);
});

pruefe('Ohne Vorimpedanz in der Anforderung bleibt anlage.json ohne vorimpedanz_ohm', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 2 }],
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
  }));
  bedingung(!('vorimpedanz_ohm' in ergebnis.anlage), 'vorimpedanz_ohm gesetzt');
});

// sim-lfi: gemischte Endstellen in einem Stromkreis.
pruefe('Gemischte Endstellen: Steckdose + Lichtauslass (2 + 1) ergibt drei Dosen mit eigenem Typ', () => {
  const ergebnis = erzeuge(baueAnforderung({
    gruppen: [{ id: 'G1', rcdPole: 2 }],
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', endstelle: 'Steckdose + Lichtauslass', dosen: '2 + 1' }]
  }));
  const sk = ergebnis.anlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise)[0];
  const typen = ergebnis.anlage.steckdosen_platzierung.filter((p) => p.sk === 'SK1').map((p) => p.endstelle ?? sk.endstelle);
  bedingung(sk.endstelle === 'Steckdose', `Haupttyp: ${sk.endstelle}`);
  bedingung(typen.join() === 'Steckdose,Steckdose,Lichtauslass', `Typen je Dose: ${typen.join()}`);
  pruefeErreichbarkeit(ergebnis);
});

// Codex-Review zu sim-lfi: die erzeugte Anlage testcase_07 (früher demo_06)
// trägt im Fahrplan die gemischte Bezeichnung ins Protokoll ein.
pruefe('testcase_07: Protokoll-Bezeichnung "LS1: 2 Steckdosen, 1 Lichtauslass"', () => {
  const fahrplan = require(path.join(__dirname, 'testcase_07', 'fahrplan.json'));
  const bezeichnungen = fahrplan.abschnitte.flatMap((a) => a.schritte)
    .filter((s) => s.funktion === 'protokollEintragen' && s.argumente[0].spalte === 1)
    .map((s) => s.argumente[1]);
  bedingung(bezeichnungen.join(' | ') === 'LS1: 2 Steckdosen, 1 Lichtauslass | LS2: 1 Lichtauslass', `Bezeichnungen: ${bezeichnungen.join(' | ')}`);
});

// --- Prüfregeln: die Anforderung muss mit einer klaren Meldung abgelehnt werden ---

function lehntAb(name, text, erwartet) {
  pruefe(`Prüfregel: ${name}`, () => {
    const fehler = pruefeAnforderung(parseAnforderung(text));
    bedingung(fehler.some((f) => f.includes(erwartet)), `erwartet Meldung mit "${erwartet}", bekommen: ${JSON.stringify(fehler)}`);
  });
}

const basis = {
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
};

lehntAb('Gemischte Endstellen: Anzahl passt nicht zu den Typen', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', endstelle: 'Steckdose + Lichtauslass', dosen: '2' }]
}), 'unterschiedlich viele Teile');

lehntAb('Gemischte Endstellen: Drehstromsteckdose an einem 1-poligen LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', endstelle: 'Steckdose + Drehstromsteckdose', dosen: '1 + 1' }]
}), 'Endstelle "Drehstromsteckdose" passt nicht zu einem 1-poligen LS');

pruefe('Prüfregel: gültige Anforderung ohne Meldungen', () => {
  const fehler = pruefeAnforderung(parseAnforderung(baueAnforderung(basis)));
  bedingung(fehler.length === 0, JSON.stringify(fehler));
});

lehntAb('Drehfeld links an einem 1-poligen LS (sim-wme)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', drehfeld: 'links' }]
}), 'Drehfeld links gibt es nur bei einem 3-poligen LS');

lehntAb('Drehfeld mit ungültigem Wert (sim-wme)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose', drehfeld: 'falsch' }]
}), 'Drehfeld "falsch" ungültig');

lehntAb('Fehler PE mit mehreren Werten (sim-24c)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose', fehlerPE: '0,1 / 0,2 / 0,3' }]
}), 'Fehler PE (Ω) "0,1 / 0,2 / 0,3": 3 Werte');

lehntAb('PE-Klemme mit ungültigem Wert (sim-kfb)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2, peKlemme: 'vielleicht' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'PE-Klemme "vielleicht" ungültig');

lehntAb('AFDD an einem 3-poligen LS (sim-i4f)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose', afdd: 'ja' }]
}), 'AFDD gibt es nur bei einem 1-poligen LS');

lehntAb('AFDD in einer Gruppe ohne RCD (sim-i4f)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 'ohne' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', afdd: 'ja' }]
}), 'AFDD nur in einer Gruppe mit RCD');

lehntAb('AFDD mit ungültigem Wert (sim-i4f)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', afdd: 'vielleicht' }]
}), 'AFDD "vielleicht" ungültig');

lehntAb('2-poliger RCD mit drei LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: ['SK1', 'SK2', 'SK3'].map((name) => ({ name, gruppe: 'G1', phase: 'L1', lsA: 10 }))
}), 'höchstens 2 LS');

lehntAb('RCD-Nennstrom nicht größer als der LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2, nennstrom: 16 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', lsA: 16 }]
}), 'RCD-Nennstrom');

lehntAb('unbekannte Gruppe', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G9', phase: 'L1' }]
}), 'Gruppe "G9" existiert nicht');

lehntAb('ungültiger RCD-Typ', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2, typ: 'X' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'RCD Typ "X" ungültig');

lehntAb('4-poliger RCD ohne Stromkreise auf allen Phasen', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'L1, L2 und L3');

lehntAb('Steckdose an dreiphasigem LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Steckdose' }]
}), 'passt nicht zu einem 3-poligen LS');

lehntAb('Phase L2 bei 2-poligem Hauptschalter', baueAnforderung({
  hsPole: 2,
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L2' }]
}), 'nur Phase L1');

lehntAb('Gruppe ohne RCD mit zwei Stromkreisen', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 'ohne' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }, { name: 'SK2', gruppe: 'G1', phase: 'L1' }]
}), 'genau einen Stromkreis');

lehntAb('4-poliger RCD mit sieben LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 4, nennstrom: 63 }],
  stromkreise: Array.from({ length: 6 }, (_, i) => ({ name: `SK${i + 1}`, gruppe: 'G1', phase: ['L1', 'L2', 'L3'][i % 3], lsPole: 1 }))
    .concat([{ name: 'SK7', gruppe: 'G1', phase: 'L1' }])
}), 'höchstens 6 LS');

lehntAb('Stromkreisname mit führender Null (SK01)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK01', gruppe: 'G1', phase: 'L1' }]
}), 'ohne führende Null');

lehntAb('LS-Ampere mit angehängtem Text (16abc)', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', lsA: '16abc' }]
}), 'LS (A) "null" ungültig');

lehntAb('negativer Fehlerwiderstand', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehlerL: '-5' }]
}), 'Fehler L (Ω) "-5" ungültig');

lehntAb('Fehlerwiderstand mit Text', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehlerN: '0,3x' }]
}), 'Fehler N (Ω) "0,3x" ungültig');

lehntAb('zwei Fehlerwerte an einem 3-poligen LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 'ohne' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', lsPole: 3, endstelle: 'Drehstromsteckdose', fehlerL: '0,1 / 0,2' }]
}), '2 Werte, an dieser Stelle gibt es 3 Außenleiter');

lehntAb('drei Fehlerwerte an einem 1-poligen LS', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehlerL: '0,1 / 0,2 / 0,3' }]
}), '3 Werte, an dieser Stelle gibt es 1 Außenleiter');

lehntAb('Gruppen-Fehler bei einer Gruppe ohne RCD', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 'ohne', fehlerN: '0,1' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'ohne RCD gibt es keinen Gruppen-Fehler');

lehntAb('Fehler Einspeisung je Außenleiter bei 2-poligem Hauptschalter', baueAnforderung({
  hsPole: 2,
  anlage: { 'Fehler Einspeisung L (Ω)': '0,1 / 0 / 0' },
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'Fehler Einspeisung L (Ω) "0,1 / 0 / 0": 3 Werte');

lehntAb('Vorimpedanz 0', baueAnforderung({
  anlage: { 'Vorimpedanz (Ω)': '0' },
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'Vorimpedanz (Ω) "0" ungültig');

// sim-r65: Zi/Zs folgen aus der Anlage, alte Spalten werden nicht still ignoriert.
lehntAb('alte Spalte Zs', baueAnforderung({
  fehlerSpalte: 'Fehler L (Ω) | Fehler N (Ω) | Zs',
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'die Spalten "Zi" und "Zs" entfallen');

lehntAb('alte Spalte Fehler Zuleitung', baueAnforderung({
  fehlerSpalte: 'Fehler Zuleitung (Ω) | Fehler N (Ω)',
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'heißt jetzt "Fehler L (Ω)"');

// Ein unlesbarer RCD-Wert darf nicht still als "ohne RCD" gelten.
lehntAb('unlesbare RCD-Polzahl (abc) wird nicht als "ohne" gelesen', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 'abc' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'RCD Pole "abc" ungültig');

// Die Pfadtabelle darf nicht von der Reihenfolge der Kanten abhängen (Graph und Browser liefern sie
// verschieden): weder bei den Abzweigen noch bei der Nummerierung mehrerer Kanten desselben Bauteils.
pruefe('Pfadtabelle ist unabhängig von der Reihenfolge der Kanten', () => {
  const { berechneTabelle } = require('../../tools/pfad_zur_einspeisung.js');
  const kanten = [
    { von: 'N1', nach: 'N2', bauteil: 'RCD1' },
    { von: 'N1', nach: 'N3', bauteil: 'RCD1' },
    { von: 'N1', nach: 'N5', bauteil: 'RCD2' },
    { von: 'N1', nach: 'N6', bauteil: 'RCD3' },
    { von: 'N2', nach: 'N4', bauteil: 'LS1' }
  ];
  const vorwaerts = JSON.stringify(berechneTabelle(kanten, 'N1', 'N4'));
  const rueckwaerts = JSON.stringify(berechneTabelle([...kanten].reverse(), 'N1', 'N4'));
  bedingung(vorwaerts === rueckwaerts, `Tabelle hängt von der Kantenreihenfolge ab:\n${vorwaerts}\n${rueckwaerts}`);
});

// Verdrahtung der eingecheckten, aus Anforderungen erzeugten Anlagen: jeder Pfad Endstelle -> Einspeisung (alle Stromkreise und
// Phasen) muss im Graphen und im gerenderten Schaltkasten gleich sein (headless Browser).
(async () => {
  const { pruefeVerdrahtung } = require('../../tools/pfad_zur_einspeisung.js');
  for (const demo of ['../../demos/demo_04', '../../demos/demo_15', '../../demos/demo_18', '../../demos/demo_19', 'testcase_07', 'testcase_08']) {
    const name = `Verdrahtung ${path.basename(demo)}: Graph und gerenderter Schaltkasten stimmen für alle Stromkreise überein`;
    try {
      const { abweichungen, geprueft } = await pruefeVerdrahtung(demo);
      bedingung(geprueft > 0, 'keine Pfade geprüft');
      bedingung(abweichungen.length === 0, abweichungen.join('; '));
      console.log(`${name}: PASS (${geprueft} Pfade)`);
    } catch (err) {
      console.log(`${name}: FAIL – ${err.message}`);
      alleBestanden = false;
    }
  }
  process.exit(alleBestanden ? 0 : 1);
})();
