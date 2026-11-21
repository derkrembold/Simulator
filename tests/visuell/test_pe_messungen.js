// Messungen über den PE-Graphen (PE-Konzept in docs/KONZEPT.md, sim-0cf):
// RLOW PE-PE und PE-N, Riso N-PE mit Sternpunkt-Regel. Kontaktfehler werden
// für die Tests in graph.json eingespielt (page.route), weil noch keine
// Anlage PE-Fehler hat. Aufruf: node tests/visuell/test_pe_messungen.js

const messgeraet = require('../../tools/messgeraet_steuerung.js');

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
  if (ist !== soll) throw new Error(`${was}: erwartet ${JSON.stringify(soll)}, ist ${JSON.stringify(ist)}`);
}

// testcase_01: SK1 mit Endstelle 0-0 (PE-Netz N15, N-Netz N14), PE-Klemme an
// der Einspeisung (N3), Eingang der N-Reihenklemme N8, RCD1 2-polig.
const TESTCASE = 'testcase_01';

// Testumgebung, optional mit Kontaktfehlern { pin: widerstand } im PE-Graphen.
async function umgebung(kontaktfehler = {}) {
  const ctx = await messgeraet.starteTestUmgebung(TESTCASE);
  if (Object.keys(kontaktfehler).length > 0) {
    await ctx.page.route('**/graph.json', async (route) => {
      const graph = await (await route.fetch()).json();
      for (const k of graph.PE.kontakte) if (k.pin in kontaktfehler) k.widerstand = kontaktfehler[k.pin];
      await route.fulfill({ json: graph });
    });
    await ctx.page.reload();
    await ctx.page.waitForSelector('#schraubendreher svg');
    await ctx.page.getByText('ON/OFF', { exact: true }).click();
  }
  return ctx;
}

// Anzeigetext wie "R:0,20Ω" als Zahl, ">999" bleibt Text (wie nurZahl() im
// Fahrplan-Werkzeug).
const nurZahl = (text) => String(text ?? '').replace(/^[^\d>]*:/, '').replace(/[a-zA-ZΩµ%]+$/, '').trim();
const zahl = (text) => parseFloat(nurZahl(text).replace(',', '.'));

async function rlow(ctx, schwarz, blau) {
  await messgeraet.drehknopfAufModus(ctx, 'RLOW');
  await messgeraet.messspitzeSetzen(ctx, schwarz);
  await messgeraet.messspitzeSetzen(ctx, blau);
  return messgeraet.leseWert(ctx, 'hauptmesswert');
}

async function risoNPe(ctx, vorher = async () => {}) {
  await vorher();
  await messgeraet.drehknopfAufModus(ctx, 'RISO');
  await messgeraet.messspitzeSetzen(ctx, { endstelle: '0-0', netz: 'N14' }); // schwarz, N
  await messgeraet.messspitzeSetzen(ctx, { endstelle: '0-0', netz: 'N15' }); // blau, PE
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const [links] = await messgeraet.leseWert(ctx, 'ampel');
  return { wert: nurZahl(await messgeraet.leseWert(ctx, 'hauptmesswert')), rot: links === '#ff6666' };
}

(async () => {
  await pruefe('RLOW PE-PE: Endstelle gegen PE-Klemme ohne Kontaktfehler 0 Ω', async () => {
    const ctx = await umgebung();
    erwarteGleich(zahl(await rlow(ctx, { endstelle: '0-0', netz: 'N15' }, { bauteil: 'PE-Klemme' })), 0, 'Rpe');
    await ctx.schliessen();
  });

  await pruefe('RLOW PE-PE: Kontaktfehler an der PE-Reihenklemme (Abgang) liegt zwischen Endstelle und PE-Klemme', async () => {
    const ctx = await umgebung({ 'Reihenklemme_PE_SK1.io2': 0.2 });
    erwarteGleich(zahl(await rlow(ctx, { endstelle: '0-0', netz: 'N15' }, { bauteil: 'PE-Klemme' })), 0.2, 'Endstelle - PE-Klemme');
    await ctx.schliessen();
  });

  await pruefe('RLOW PE-PE: Messspitze auf der Schraube der PE-Reihenklemme liegt vor dem Kontaktfehler', async () => {
    const ctx = await umgebung({ 'Reihenklemme_PE_SK1.io2': 0.2 });
    erwarteGleich(zahl(await rlow(ctx, { bauteil: 'Reihenklemme_PE_SK1', netz: 'N15' }, { bauteil: 'PE-Klemme' })), 0, 'Reihenklemme - PE-Klemme');
    await ctx.schliessen();
  });

  await pruefe('RLOW PE-PE: Fehler am PE-Kontakt der Einspeisung wirkt nicht zwischen Endstelle und PE-Klemme', async () => {
    const ctx = await umgebung({ 'PE-Klemme.io1': 0.3 });
    erwarteGleich(zahl(await rlow(ctx, { endstelle: '0-0', netz: 'N15' }, { bauteil: 'PE-Klemme' })), 0, 'Rpe');
    await ctx.schliessen();
  });

  await pruefe('RLOW PE-N: PE-Weg zur Einspeisung geht in den Wert ein (Fehler am PE-Kontakt der Einspeisung + 0,30 Ω)', async () => {
    const ohne = await umgebung();
    const basis = zahl(await rlow(ohne, { endstelle: '0-0', netz: 'N15' }, { endstelle: '0-0', netz: 'N14' }));
    await ohne.schliessen();
    const mit = await umgebung({ 'PE-Klemme.io1': 0.3 });
    const wert = zahl(await rlow(mit, { endstelle: '0-0', netz: 'N15' }, { endstelle: '0-0', netz: 'N14' }));
    await mit.schliessen();
    erwarteGleich(Math.round((wert - basis) * 100) / 100, 0.3, `Differenz (${basis} -> ${wert})`);
  });

  await pruefe('Riso N-PE ohne N-Trennung: Kurzschluss über den Sternpunkt, Ampel rot', async () => {
    const ctx = await umgebung();
    const { wert, rot } = await risoNPe(ctx);
    if (Number.isNaN(zahl(wert)) || wert.startsWith('>')) throw new Error(`erwartet Kurzschluss, ist ${wert}`);
    erwarteGleich(rot, true, 'Ampel rot');
    await ctx.schliessen();
  });

  await pruefe('Riso N-PE mit gelöster Schraube am Eingang der N-Reihenklemme: >999 MΩ', async () => {
    const ctx = await umgebung();
    const { wert } = await risoNPe(ctx, () => messgeraet.schraubeSchalten(ctx, 'Reihenklemme_N_SK1', 'N8'));
    erwarteGleich(wert, '>999', 'Riso N-PE');
    await ctx.schliessen();
  });

  await pruefe('Riso N-PE bei geöffnetem 2-poligem RCD (N-Pol offen): >999 MΩ', async () => {
    const ctx = await umgebung();
    const { wert } = await risoNPe(ctx, () => messgeraet.hebelSchalten(ctx, 'RCD1'));
    erwarteGleich(wert, '>999', 'Riso N-PE');
    await ctx.schliessen();
  });

  // --- Hutschienen als Messpunkt (sim-kfb), demos/demo_19 ---
  // H1: PE-Klemme ohne Kontakt zur Hutschiene; H2: eigene PE-Klemme mit Ader
  // von unten; H3: Reihenklemmen-Hutschiene, PE über Zubringer (0,05 Ω).
  const DEMO = '../../demos/demo_19';
  const demoAnlage = require('../../demos/demo_19/anlage.json');
  const sk1 = demoAnlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise).find((s) => s.bezeichnung === 'SK1');
  const sk1Netz = (f) => sk1.leitung.adern.find((a) => a.funktion === f).netz;
  const demoUmgebung = () => messgeraet.starteTestUmgebung(DEMO);

  for (const [name, soll] of [['H1', null], ['H2', 0], ['H3', 0.05]]) {
    await pruefe(`Rpe Hutschiene ${name} gegen PE-Klemme: ${soll === null ? 'kein Durchgang' : `${soll} Ω`} (sim-kfb)`, async () => {
      const ctx = await demoUmgebung();
      const wert = await rlow(ctx, { bauteil: name }, { bauteil: 'PE-Klemme' });
      if (soll === null) erwarteGleich(nurZahl(wert), '---', `Rpe ${name}`);
      else erwarteGleich(zahl(wert), soll, `Rpe ${name}`);
      await ctx.schliessen();
    });
  }

  await pruefe('V~ Ulpe: 0 V gegen eine Hutschiene ohne PE, 230 V gegen eine mit PE (sim-kfb)', async () => {
    const ergebnis = [];
    for (const name of ['H1', 'H2']) {
      const ctx = await demoUmgebung();
      await messgeraet.drehknopfAufModus(ctx, 'V~');
      await messgeraet.messspitzeSetzen(ctx, { netz: sk1Netz('L1') }); // schwarz
      await messgeraet.messspitzeSetzen(ctx, { netz: sk1Netz('N') }); // blau
      await messgeraet.messspitzeSetzen(ctx, { bauteil: name }); // grün
      ergebnis.push(await messgeraet.leseWert(ctx, 'ulpe'));
      await ctx.schliessen();
    }
    erwarteGleich(ergebnis.join(), '0V,230V', 'Ulpe H1, H2');
  });

  await pruefe('Zs mit Grün auf einer Hutschiene ohne PE: kein Messwert (sim-kfb)', async () => {
    const ctx = await demoUmgebung();
    await messgeraet.drehknopfAufModus(ctx, 'ZS');
    await messgeraet.messspitzeSetzen(ctx, { netz: sk1Netz('L1') }); // schwarz
    await messgeraet.messspitzeSetzen(ctx, { netz: sk1Netz('N') }); // blau
    await messgeraet.messspitzeSetzen(ctx, { bauteil: 'H1' }); // grün
    await messgeraet.testDruecken(ctx);
    const wert = nurZahl(await messgeraet.leseWert(ctx, 'hauptmesswert'));
    if (!Number.isNaN(zahl(wert))) throw new Error(`erwartet kein Messwert, ist ${wert}`);
    await ctx.schliessen();
  });

  process.exit(alleBestanden ? 0 : 1);
})();
