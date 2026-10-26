// Tests für tools/demo_erstellung.js (Anforderung -> netzplan.md/bauteile.md -> anlage.json/graph.json).
// Läuft ohne Browser in Temp-Ordnern. Aufruf: node tests/visuell/test_demo_erstellung.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseAnforderung, pruefeAnforderung, erzeugeModell } = require('../../tools/demo_erstellung.js');
const { istSpannungFuehrend } = require('./generate_anlage.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const VORLAGE = path.join(PROJEKT_ROOT, 'demos', 'anforderung_vorlage.md');
const DEMO_01 = path.join(PROJEKT_ROOT, 'demos', 'demo_01');

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

const ohneNetzIds = (obj) => JSON.stringify(obj, (k, v) => (k === 'netz' ? undefined : v));

function tempOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'demo-erstellung-'));
}

// Baut einen Anforderungstext aus Daten, damit die Tests nicht von der Textform der Vorlage abhängen.
function baueAnforderung({ hsPole = 3, hsA = 35, gruppen, stromkreise }) {
  const g = gruppen.map((x) => `| ${x.id} | ${x.rcdPole} | ${x.typ ?? 'A'} | ${x.fehlerstrom ?? 30} | ${x.nennstrom ?? 40} | ${x.selektiv ?? 'nein'} | ${x.abklemmen ?? 'nein'} |`).join('\n');
  const s = stromkreise.map((x) => `| ${x.name} | ${x.gruppe} | Ziel ${x.name} | ${x.endstelle ?? 'Steckdose'} | ${x.dosen ?? 1} | ${x.lsPole ?? 1} | ${x.lsChar ?? 'B'} | ${x.lsA ?? 16} | ${x.phase ?? ''} | nein | ja | ja | ${x.fehler ?? ''} |`).join('\n');
  return `# Anforderung – test

## Anlage

| Feld | Wert |
| --- | --- |
| Name | Testanlage |
| Beschreibung | Test |
| Netzform | TN-S |
| Hauptschalter Pole | ${hsPole} |
| Hauptschalter (A) | ${hsA} |

## Gruppen

| Gruppe | RCD Pole | RCD Typ | Fehlerstrom (mA) | RCD Nennstrom (A) | Selektiv | Abklemmen |
| --- | --- | --- | --- | --- | --- | --- |
${g}

## Stromkreise

| Stromkreis | Gruppe | Ziel | Endstelle | Anzahl Dosen | LS Pole | LS Char. | LS (A) | Phase | Zi | Zs | RCD | Fehler Zuleitung (Ω) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
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

pruefe('Vorlage erzeugt dieselbe Anlage wie die von Hand gebaute demo_01 (ohne Netz-IDs)', () => {
  const ergebnis = erzeuge(fs.readFileSync(VORLAGE, 'utf8'));
  const hand = JSON.parse(fs.readFileSync(path.join(DEMO_01, 'anlage.json'), 'utf8'));
  bedingung(ohneNetzIds(ergebnis.anlage) === ohneNetzIds(hand), 'anlage.json weicht von demos/demo_01 ab');
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
    stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehler: '0,45' }]
  }));
  const werte = Object.values(ergebnis.graph.fehlertabelle);
  bedingung(werte.length === 1 && werte[0] === 0.45, `Fehlertabelle: ${JSON.stringify(ergebnis.graph.fehlertabelle)}`);
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

pruefe('Prüfregel: gültige Anforderung ohne Meldungen', () => {
  const fehler = pruefeAnforderung(parseAnforderung(baueAnforderung(basis)));
  bedingung(fehler.length === 0, JSON.stringify(fehler));
});

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
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehler: '-5' }]
}), 'Fehler Zuleitung "-5" ungültig');

lehntAb('Fehlerwiderstand mit Text', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 2 }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1', fehler: '0,3x' }]
}), 'Fehler Zuleitung "0,3x" ungültig');

// Ein unlesbarer RCD-Wert darf nicht still als "ohne RCD" gelten.
lehntAb('unlesbare RCD-Polzahl (abc) wird nicht als "ohne" gelesen', baueAnforderung({
  gruppen: [{ id: 'G1', rcdPole: 'abc' }],
  stromkreise: [{ name: 'SK1', gruppe: 'G1', phase: 'L1' }]
}), 'RCD Pole "abc" ungültig');

// Verdrahtung der eingecheckten Demos: jeder Pfad Endstelle -> Einspeisung (alle Stromkreise und
// Phasen) muss im Graphen und im gerenderten Schaltkasten gleich sein (headless Browser).
(async () => {
  const { pruefeVerdrahtung } = require('../../tools/pfad_zur_einspeisung.js');
  for (const demo of ['demo_01', 'demo_02']) {
    const name = `Verdrahtung ${demo}: Graph und gerenderter Schaltkasten stimmen für alle Stromkreise überein`;
    try {
      const { abweichungen, geprueft } = await pruefeVerdrahtung(`../../demos/${demo}`);
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
