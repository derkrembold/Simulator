// Tests für die Abschaltbedingung und die 2/3-Regel (sim-g0o):
// model/abschaltbedingung.js. Reine Rechnung, ohne Browser. Aufruf:
// node tests/visuell/test_abschaltbedingung.js

const { berechneLim, bewerteAbschaltung } = require('../../model/abschaltbedingung.js');

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

function erwarteGleich(ist, soll, kontext) {
  if (ist !== soll) throw new Error(`${kontext}: erwarte ${JSON.stringify(soll)}, gefunden ${JSON.stringify(ist)}`);
}

pruefe('Lim = Faktor × In (C16 160 A, B10 50 A, D20 400 A, Text "16A")', () => {
  erwarteGleich([berechneLim('C', 16), berechneLim('B', 10), berechneLim('D', 20), berechneLim('C', '16A')].join(), '160,50,400,160', 'Lim');
});

// C16: Grenze 2/3 · 230 / 160 = 0,958 Ω; Ampel grün bis 0,9 · 230 / 160 = 1,294 Ω.
pruefe('C16: 0,95 Ω i.O., 0,97 und 1,29 Ω Mangel (Ampel grün), 1,2941 und 1,30 Ω Mangel (Ampel rot)', () => {
  const b = (z) => bewerteAbschaltung(z, 'C', 16);
  erwarteGleich(b(0.95).grenzeZ.toFixed(3), '0.958', 'Grenze');
  erwarteGleich([0.95, 0.97, 1.29, 1.2941, 1.3].map((z) => `${b(z).ampelGruen}/${b(z).mangel}`).join(),
    'true/false,true/true,true/true,false/true,false/true', 'Ampel/Mangel');
});

pruefe('B16 bei 1,0 Ω: i.O. (Grenze 1,92 Ω)', () => {
  const b = bewerteAbschaltung(1.0, 'B', 16);
  erwarteGleich(`${b.ampelGruen}/${b.mangel}/${b.grenzeZ.toFixed(2)}`, 'true/false/1.92', 'B16');
});

process.exit(alleBestanden ? 0 : 1);
