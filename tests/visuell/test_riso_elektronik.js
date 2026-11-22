// Riso-Widerstand der Elektronik von RCD Typ B und LS mit AFDD je Gerät
// einstellbar (sim-qha), an testcase_10 (seit sim-unq, früher demos/demo_20):
// RCD1 Typ B 0,15 MΩ (Gruppe G1), LS4 mit AFDD 0,3 MΩ hinter RCD2 Typ A. Ohne Abklemmen misst Riso die Elektronik (n.i.O.), der Fahrplan
// klemmt ab und misst >999 MΩ (tests/visuell/test_pruefprotokoll.js).
// Aufruf: node tests/visuell/test_riso_elektronik.js

const messgeraet = require('../../tools/messgeraet_steuerung.js');
const anlage = require('./testcase_10/anlage.json');

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

const sks = anlage.hutschienen.flatMap((h) => h.gruppen).flatMap((g) => g.stromkreise);
const netz = (sk, f) => sks.find((s) => s.bezeichnung === sk).leitung.adern.find((a) => a.funktion === f).netz;

// Riso L-N an den Abgangsklemmen eines Stromkreises, freigeschaltet, ohne
// abzuklemmen. Liefert Anzeige und Ampel (links rot).
async function risoOhneAbklemmen(sk, phase, rcdWertMOhm) {
  const ctx = await messgeraet.starteTestUmgebung('testcase_10');
  // Optional einen anderen Gerätewert für RCD1 einspielen (Review Codex).
  if (rcdWertMOhm !== undefined) {
    await ctx.page.route((url) => url.pathname.endsWith('/testcase_10/anlage.json'), async (route) => {
      const daten = await (await route.fetch()).json();
      daten.hutschienen.flatMap((h) => h.gruppen).find((g) => g.rcd?.name === 'RCD1').rcd.riso_elektronik_mohm = rcdWertMOhm;
      await route.fulfill({ json: daten });
    });
    await ctx.page.reload();
    await ctx.page.waitForSelector('#schraubendreher svg');
    await ctx.page.getByText('ON/OFF', { exact: true }).click();
  }
  await messgeraet.hebelSchalten(ctx, 'Hauptschalter');
  await messgeraet.drehknopfAufModus(ctx, 'RISO');
  await messgeraet.messspitzeSetzen(ctx, { netz: netz(sk, phase) }); // schwarz
  await messgeraet.messspitzeSetzen(ctx, { netz: netz(sk, 'N') }); // blau
  await messgeraet.messspitzeSetzen(ctx, { bauteil: 'PE-Klemme' }); // grün
  await messgeraet.testDruecken(ctx);
  const wert = await messgeraet.leseWert(ctx, 'hauptmesswert');
  const [links] = await messgeraet.leseWert(ctx, 'ampel');
  await ctx.schliessen();
  return { wert, rot: links === '#ff6666' };
}

(async () => {
  await pruefe('anlage.json trägt die eingestellten Werte (RCD1 0,15 MΩ, LS4 0,3 MΩ), andere Geräte nicht', async () => {
    const rcd = anlage.hutschienen.flatMap((h) => h.gruppen).find((g) => g.rcd?.name === 'RCD1').rcd;
    erwarteGleich(rcd.riso_elektronik_mohm, 0.15, 'RCD1');
    erwarteGleich(sks.find((s) => s.bezeichnung === 'SK4').ls.riso_elektronik_mohm, 0.3, 'LS4');
    erwarteGleich('riso_elektronik_mohm' in sks.find((s) => s.bezeichnung === 'SK3').ls, false, 'LS3 ohne Wert');
  });

  await pruefe('Riso ohne Abklemmen hinter RCD Typ B: 0,15 MΩ, Ampel rot (sim-qha)', async () => {
    const { wert, rot } = await risoOhneAbklemmen('SK3', 'L1');
    erwarteGleich(wert, 'R:0,15MΩ', 'Anzeige');
    erwarteGleich(rot, true, 'Ampel rot');
  });

  // SK4 hängt hinter RCD2 Typ A und LS4 mit AFDD (0,3 MΩ). Bei offenem
  // Hauptschalter erreicht die Messung über die Sammelschiene (L2 und N am
  // Hauptschalter-Ausgang) auch die Elektronik von RCD1 Typ B (0,15 MΩ) der
  // anderen Gruppe - wie in der Realität, deshalb klemmt der Fahrplan ab
  // (sim-f7j). Gemessen wird die Parallelschaltung 0,15 || 0,3 = 0,10 MΩ.
  await pruefe('Riso ohne Abklemmen hinter AFDD, dazu RCD Typ B über die Sammelschiene: 0,15 || 0,3 = 0,10 MΩ (sim-qha)', async () => {
    const { wert } = await risoOhneAbklemmen('SK4', 'L2');
    erwarteGleich(wert, 'R:0,10MΩ', 'Anzeige');
  });

  // Review Codex zu sim-qha: nicht vor der Ampel runden.
  await pruefe('Sehr kleiner Elektronikwert 0,004 MΩ: endlicher Widerstand in Ω, kein Kurzschluss 0,00, Ampel rot', async () => {
    const { wert, rot } = await risoOhneAbklemmen('SK3', 'L1', 0.004);
    erwarteGleich(wert, 'R:4000,00Ω', 'Anzeige');
    erwarteGleich(rot, true, 'Ampel rot');
  });

  await pruefe('Elektronikwert 49,999 MΩ knapp unter dem Grenzwert 50 MΩ: Ampel rot', async () => {
    const { rot } = await risoOhneAbklemmen('SK3', 'L1', 49.999);
    erwarteGleich(rot, true, 'Ampel rot');
  });

  process.exit(alleBestanden ? 0 : 1);
})();
