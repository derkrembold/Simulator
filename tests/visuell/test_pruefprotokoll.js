// Regressionstest für tools/pruefprotokoll_erstellung.js: prüft die von
// berechneProtokoll() gelieferten Messwerte für ALLE SECHS Testcases gegen
// unabhängige Referenzwerte, statt nur "läuft ohne Exception durch" zu
// prüfen (das wäre zirkulär - die App würde nur gegen sich selbst
// verglichen). Zwei Referenzquellen:
//   1. bauteile.md (über generate_anlage.js parseBauteile()) - RCD-Werte
//      (iA/tA/uB) sind dort per Definition hinterlegt, nicht aus der
//      Verdrahtung ableitbar, also eine ECHTE unabhängige Erwartung.
//   2. Fachliche Grundregeln (Riso ohne Fehler -> immer >999MΩ; Zs/Zi/Ik
//      sind positive Zahlen) - kein Soll-Ist-Vergleich möglich, da diese
//      Werte aus der Widerstands-Netzwerk-Berechnung des Graphen kommen und
//      nirgends unabhängig vorgegeben sind (siehe ARCHITEKTUR.md) - hier nur
//      Plausibilitätsprüfung statt exaktem Wert.
//
// Aufruf: node tests/visuell/test_pruefprotokoll.js
const path = require('path');
const { berechneProtokoll } = require('../../tools/pruefprotokoll_erstellung.js');
const { parseBauteile } = require('./generate_anlage.js');

const TESTCASES = ['testcase_01', 'testcase_02', 'testcase_03', 'testcase_04', 'testcase_05', 'testcase_06'];

function parseKomma(text) {
  return parseFloat(String(text).replace(',', '.'));
}

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

function erwarteGleich(tatsaechlich, erwartet, kontext) {
  if (tatsaechlich !== erwartet) {
    throw new Error(`${kontext}: erwarte "${erwartet}", gefunden "${tatsaechlich}"`);
  }
}

function erwarteNahe(tatsaechlich, erwartet, kontext, epsilon = 0.05) {
  if (Number.isNaN(tatsaechlich) || Math.abs(tatsaechlich - erwartet) > epsilon) {
    throw new Error(`${kontext}: erwarte ${erwartet}, gemessen ${tatsaechlich}`);
  }
}

function erwartePositiv(tatsaechlich, kontext) {
  if (Number.isNaN(tatsaechlich) || !(tatsaechlich > 0)) {
    throw new Error(`${kontext}: erwarte eine positive Zahl, gemessen "${tatsaechlich}"`);
  }
}

async function main() {
  for (const testcase of TESTCASES) {
    const ordner = path.join(__dirname, testcase);
    const { bauteile } = parseBauteile(ordner);
    const { ergebnisse } = await berechneProtokoll(testcase);

    for (const erg of ergebnisse) {
      await pruefe(`${testcase} ${erg.sk}: Rpe (PE-Durchgang) ist 0,00Ω (RLOW-Workaround)`, async () => {
        erwarteGleich(erg.rpe, '0,00', `${erg.sk} Rpe`);
      });

      await pruefe(`${testcase} ${erg.sk}: Riso Verbraucher ohne ist >999MΩ (kein Isolationsfehler in diesem Testcase)`, async () => {
        erwarteGleich(erg.riso, '>999', `${erg.sk} Riso`);
      });

      if (erg.rcdName) {
        const rcd = bauteile.find((b) => b.name === erg.rcdName);
        await pruefe(`${testcase} ${erg.sk}: RCD-Werte (${erg.rcdName}) stimmen mit bauteile.md überein`, async () => {
          if (!rcd) throw new Error(`${erg.rcdName} nicht in bauteile.md gefunden`);
          erwarteNahe(parseKomma(erg.rcdImess), rcd.iA, `${erg.rcdName} Imess (iA)`);
          erwarteNahe(parseKomma(erg.rcdAuslZeit), rcd.tA, `${erg.rcdName} Auslösezeit (tA)`);
          erwarteNahe(parseKomma(erg.rcdUmess), rcd.uB, `${erg.rcdName} Umess (uB)`);
        });
      }

      if (erg.zi !== undefined) {
        await pruefe(`${testcase} ${erg.sk}: Zi/Ik(L-N) sind plausible positive Zahlen`, async () => {
          erwartePositiv(parseKomma(erg.zi), `${erg.sk} Zi`);
          erwartePositiv(parseKomma(erg.ikLn), `${erg.sk} Ik(L-N)`);
        });
      }

      if (erg.zs !== undefined) {
        await pruefe(`${testcase} ${erg.sk}: Zs/Ik(L-PE) sind plausible positive Zahlen`, async () => {
          erwartePositiv(parseKomma(erg.zs), `${erg.sk} Zs`);
          erwartePositiv(parseKomma(erg.ik), `${erg.sk} Ik(L-PE)`);
        });
      }
    }
  }

  process.exit(alleBestanden ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
