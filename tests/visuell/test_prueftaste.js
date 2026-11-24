// Tests für die Prüftaste T des RCD (sim-q3h). Aufruf: node
// tests/visuell/test_prueftaste.js
//
// Bedient den Schaltkasten über tools/messgeraet_steuerung.js, dieselben
// Funktionen, mit denen der Fahrplan entsteht.

const path = require('path');
const steuerung = require('../../tools/messgeraet_steuerung.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');

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

function erwarteGleich(ist, soll, kontext) {
  if (ist !== soll) throw new Error(`${kontext}: erwartet ${JSON.stringify(soll)}, bekommen ${JSON.stringify(ist)}`);
}

// Offener Hebel = um 180° gedreht (zeichneSchalter() in view/schaltkasten.js).
async function hebelOffen(ctx, bauteilName) {
  return ctx.page.evaluate((name) =>
    document.querySelector(`#schaltkasten svg g[data-schalter="${name}"] g`).getAttribute('transform') !== null, bauteilName);
}

// Alle Hebel, die offen sind (Bauteilnamen).
async function offeneHebel(ctx) {
  return ctx.page.evaluate(() => [...document.querySelectorAll('#schaltkasten svg g[data-schalter]')]
    .filter((g) => g.querySelector('g').getAttribute('transform') !== null).map((g) => g.getAttribute('data-schalter')));
}

async function main() {
  // demo_15 hat RCD1 (2-polig) und RCD2 (4-polig) und LS mit AFDD; die
  // AFDD-Geräte haben keine Prüftaste.
  const DEMO = '../../demos/demo_15';
  const anlage = require(path.join(PROJEKT_ROOT, 'demos', 'demo_15', 'anlage.json'));
  const rcds = anlage.hutschienen.flatMap((h) => h.gruppen).filter((g) => g.rcd).map((g) => g.rcd);

  await pruefe('Jeder RCD hat genau eine Prüftaste, LS mit AFDD keine', async () => {
    const ctx = await steuerung.starteTestUmgebung(DEMO);
    const tasten = await ctx.page.evaluate(() => [...document.querySelectorAll('[data-prueftaste]')].map((g) => g.getAttribute('data-prueftaste')));
    erwarteGleich(tasten.join(','), rcds.map((r) => r.name).join(','), 'Prüftasten');
    await ctx.schliessen();
  });

  await pruefe('Prüftaste sitzt in der Spalte der rechten Schrauben, mittig zwischen oben und unten, rechts der Schalter-Box', async () => {
    const ctx = await steuerung.starteTestUmgebung(DEMO);
    for (const rcd of rcds) {
      const lage = await ctx.page.evaluate((name) => {
        const mitte = (el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, rechts: b.x + b.width }; };
        const schrauben = [...document.querySelectorAll(`#schaltkasten svg circle[data-bauteil="${name}"]`)].map(mitte);
        const rechtsX = Math.max(...schrauben.map((s) => s.x));
        const rechte = schrauben.filter((s) => Math.abs(s.x - rechtsX) < 0.5);
        const taste = document.querySelector(`[data-prueftaste="${name}"] rect`).getBoundingClientRect();
        return {
          dx: Math.abs(taste.x + taste.width / 2 - rechtsX),
          dy: Math.abs(taste.y + taste.height / 2 - (Math.min(...rechte.map((s) => s.y)) + Math.max(...rechte.map((s) => s.y))) / 2),
          breite: taste.width
        };
      }, rcd.name);
      if (lage.dx > 0.5 || lage.dy > 0.5) throw new Error(`${rcd.name}: Abstand zur Sollposition ${lage.dx.toFixed(1)}/${lage.dy.toFixed(1)} px`);
      if (lage.breite >= 24) throw new Error(`${rcd.name}: Prüftaste ${lage.breite} px, nicht kleiner als die Schalter-Box`);
    }
    await ctx.schliessen();
  });

  await pruefe('Prüftaste unter Spannung: der RCD löst aus, nach dem Einschalten wieder geschlossen', async () => {
    const ctx = await steuerung.starteTestUmgebung(DEMO);
    for (const rcd of rcds) {
      erwarteGleich(await steuerung.pruefTasteDruecken(ctx, rcd.name), true, `${rcd.name} ausgelöst`);
      await steuerung.hebelSchalten(ctx, rcd.name);
      erwarteGleich(await hebelOffen(ctx, rcd.name), false, `${rcd.name} wieder eingeschaltet`);
    }
    await ctx.schliessen();
  });

  await pruefe('Prüftaste ohne Spannung (Hauptschalter aus): der RCD löst nicht aus', async () => {
    const ctx = await steuerung.starteTestUmgebung(DEMO);
    await steuerung.hebelSchalten(ctx, anlage.hauptsicherung.name);
    for (const rcd of rcds) erwarteGleich(await steuerung.pruefTasteDruecken(ctx, rcd.name), false, `${rcd.name} ausgelöst`);
    await ctx.schliessen();
  });

  // sim-024: In demo_15 liegt der Hebel von LS2 näher an der ersten Schraube
  // von RCD2 als dessen eigener Hebel. Gesucht wird jetzt über data-schalter.
  await pruefe('hebelSchalten(RCD2) schaltet RCD2, nicht den Nachbar-LS (sim-024)', async () => {
    const ctx = await steuerung.starteTestUmgebung(DEMO);
    await steuerung.hebelSchalten(ctx, 'RCD2');
    erwarteGleich((await offeneHebel(ctx)).join(','), 'RCD2', 'offene Hebel');
    await ctx.schliessen();
  });

  await steuerung.beendeTestUmgebungen();
  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
