// RCBO (LS mit eingebautem RCD, sim-8as) an testcase_11: LS1 ist ein
// 2-poliger RCBO Typ A (SK1, Steckdose), LS2 ein 4-poliger RCBO Typ B (SK2,
// Drehstromsteckdose), RCD1 mit LS3 eine normale Gruppe zum Vergleich.
// Aufruf: node tests/visuell/test_rcbo.js

const steuerung = require('../../tools/messgeraet_steuerung.js');
const anlage = require('./testcase_11/anlage.json');

let alleBestanden = true;

async function pruefe(name, fn) {
  try {
    await fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.log(`${name}: FAIL – ${err.message}`);
    alleBestanden = false;
  }
}

function erwarteGleich(ist, soll, was) {
  if (JSON.stringify(ist) !== JSON.stringify(soll)) throw new Error(`${was}: erwartet ${JSON.stringify(soll)}, ist ${JSON.stringify(ist)}`);
}

const sks = anlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise);
const sk = (name) => sks.find((s) => s.bezeichnung === name);
const netz = (name, f) => sk(name).leitung.adern.find((a) => a.funktion === f).netz;

// Offener Hebel = um 180° gedreht (zeichneSchalter() in view/schaltkasten.js).
async function offeneHebel(ctx) {
  return ctx.page.evaluate(() => [...document.querySelectorAll('#schaltkasten svg g[data-schalter]')]
    .filter((g) => g.querySelector('g').getAttribute('transform') !== null).map((g) => g.getAttribute('data-schalter')));
}

// Sonden an den Abgangsklemmen eines Stromkreises: schwarz auf L1, blau auf
// N, grün auf die PE-Klemme.
async function sondenAnStromkreis(ctx, name) {
  await steuerung.messspitzeSetzen(ctx, { netz: netz(name, 'L1') });
  await steuerung.messspitzeSetzen(ctx, { netz: netz(name, 'N') });
  await steuerung.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' });
}

(async () => {
  await pruefe('anlage.json: LS1 2-poliger RCBO Typ A, LS2 4-poliger RCBO Typ B, beide schalten N, LS3 ohne RCBO', async () => {
    const ls1 = sk('SK1').ls;
    const ls2 = sk('SK2').ls;
    erwarteGleich([ls1.polig, ls1.te, sk('SK1').phasen], [2, 2, ['L1']], 'LS1 Pole, TE, Phasen');
    erwarteGleich([ls2.polig, ls2.te, sk('SK2').phasen], [4, 4, ['L1', 'L2', 'L3']], 'LS2 Pole, TE, Phasen');
    erwarteGleich(ls1.rcbo, { typ: 'A', in_ma: 30, tA: 18, iA: 21, uB: 1 }, 'LS1 RCD-Teil');
    erwarteGleich(ls2.rcbo, { typ: 'B', in_ma: 30, tA: 22, iA: 18, uB: 1, tA_dc: 25, iA_dc: 58 }, 'LS2 RCD-Teil');
    erwarteGleich(ls1.ausgang.leitung.adern.map((a) => a.funktion), ['L1', 'N'], 'LS1 Ausgang');
    erwarteGleich(ls2.ausgang.leitung.adern.map((a) => a.funktion), ['L1', 'L2', 'L3', 'N'], 'LS2 Ausgang');
    erwarteGleich('rcbo' in sk('SK3').ls, false, 'LS3 ohne rcbo');
  });

  await pruefe('Schaltkasten: RCBO zweizeilig beschriftet, Prüftaste T an LS1, LS2 und RCD1, nicht an LS3', async () => {
    const ctx = await steuerung.starteTestUmgebung('testcase_11');
    const tasten = await ctx.page.evaluate(() => [...document.querySelectorAll('[data-prueftaste]')].map((g) => g.getAttribute('data-prueftaste')));
    erwarteGleich(tasten.sort(), ['LS1', 'LS2', 'RCD1'], 'Prüftasten');
    const labels = await ctx.page.evaluate(() => [...document.querySelectorAll('#schaltkasten svg text')].map((t) => [...t.querySelectorAll('tspan')].map((s) => s.textContent).join('/')));
    for (const erwartet of ['B16/A 30mA', 'C16/B 30mA', 'B10']) {
      if (!labels.includes(erwartet)) throw new Error(`Aufschrift "${erwartet}" fehlt in ${JSON.stringify(labels)}`);
    }
    await ctx.schliessen();
  });

  await pruefe('Prüftaste unter Spannung: LS1 und LS2 lösen aus, sonst kein Hebel; ohne Spannung löst nichts aus', async () => {
    const ctx = await steuerung.starteTestUmgebung('testcase_11');
    erwarteGleich(await steuerung.pruefTasteDruecken(ctx, 'LS1'), true, 'LS1 ausgelöst');
    erwarteGleich(await steuerung.pruefTasteDruecken(ctx, 'LS2'), true, 'LS2 ausgelöst');
    erwarteGleich((await offeneHebel(ctx)).sort(), ['LS1', 'LS2'], 'offene Hebel');
    await steuerung.hebelSchalten(ctx, 'LS1');
    await steuerung.hebelSchalten(ctx, 'LS2');
    await steuerung.hebelSchalten(ctx, 'Hauptschalter');
    erwarteGleich(await steuerung.pruefTasteDruecken(ctx, 'LS1'), false, 'LS1 ohne Spannung');
    erwarteGleich(await steuerung.pruefTasteDruecken(ctx, 'LS2'), false, 'LS2 ohne Spannung');
    await ctx.schliessen();
  });

  await pruefe('FI/RCD an SK1: findet den RCBO LS1, zeigt seine Auslösewerte und schaltet nur LS1 ab', async () => {
    const ctx = await steuerung.starteTestUmgebung('testcase_11');
    await steuerung.drehknopfAufModus(ctx, 'FI/RCD');
    await sondenAnStromkreis(ctx, 'SK1');
    await steuerung.testDruecken(ctx);
    erwarteGleich([await steuerung.leseWert(ctx, 'hauptmesswert'), await steuerung.leseWert(ctx, 't')], ['I:21,0mA', 't:18,0ms'], 'Anzeige');
    erwarteGleich(await offeneHebel(ctx), ['LS1'], 'offene Hebel');
    await ctx.schliessen();
  });

  await pruefe('FI/RCD an SK2 mit Einstellung B: Gleichstromwerte des RCBO Typ B, LS2 schaltet ab', async () => {
    const ctx = await steuerung.starteTestUmgebung('testcase_11');
    await steuerung.drehknopfAufModus(ctx, 'FI/RCD');
    await steuerung.stelleEin(ctx, 'typ', 'B');
    await sondenAnStromkreis(ctx, 'SK2');
    await steuerung.testDruecken(ctx);
    erwarteGleich([await steuerung.leseWert(ctx, 'hauptmesswert'), await steuerung.leseWert(ctx, 't')], ['I:58,0mA', 't:25,0ms'], 'Anzeige');
    erwarteGleich(await offeneHebel(ctx), ['LS2'], 'offene Hebel');
    await ctx.schliessen();
  });

  await pruefe('Riso L1-N an SK2 ohne Abklemmen: Elektronik des RCBO Typ B (13 MΩ), nach Lösen seiner Eingangsschrauben >999MΩ', async () => {
    const ctx = await steuerung.starteTestUmgebung('testcase_11');
    await steuerung.hebelSchalten(ctx, 'Hauptschalter');
    await steuerung.drehknopfAufModus(ctx, 'RISO');
    await sondenAnStromkreis(ctx, 'SK2');
    await steuerung.testDruecken(ctx);
    erwarteGleich(await steuerung.leseWert(ctx, 'hauptmesswert'), 'R:13MΩ', 'ohne Abklemmen');
    const eingang = sk('SK2').ls.eingang.leitung.adern;
    for (const f of ['L1', 'N']) await steuerung.schraubeSchalten(ctx, 'LS2', eingang.find((a) => a.funktion === f).netz);
    await steuerung.testDruecken(ctx);
    erwarteGleich(await steuerung.leseWert(ctx, 'hauptmesswert'), 'R:>999MΩ', 'abgeklemmt');
    await ctx.schliessen();
  });

  await steuerung.beendeTestUmgebungen();
  process.exit(alleBestanden ? 0 : 1);
})();
