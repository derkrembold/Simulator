// Regressionstest für tools/pruefprotokoll_erstellung.js: prüft die von
// berechneProtokoll() gelieferten Messwerte für ALLE SECHS Testcases gegen
// unabhängige Referenzwerte, statt nur "läuft ohne Exception durch" zu
// prüfen (das wäre zirkulär - die App würde nur gegen sich selbst
// verglichen). Zwei Referenzquellen:
//   1. bauteile.md (über generate_anlage.js parseBauteile()) - RCD-Werte
//      (iA/tA/uB) sind dort per Definition hinterlegt, nicht aus der
//      Verdrahtung ableitbar, also eine ECHTE unabhängige Erwartung.
//   2. Dokumentierte Zi-Werte je Außenleiter für testcase_05 SK1
//      (docs/KONZEPT.md, "3-poliger LS": dieselben Werte wie testcase_04s
//      drei einpolige Stromkreise) - sichert ab, dass wirklich jeder
//      Außenleiter gemessen wird und nicht dreimal L1.
//   3. Fachliche Grundregeln (Riso ohne Fehler -> immer >999MΩ; Zs/Zi/Ik
//      sind positive Zahlen) - kein Soll-Ist-Vergleich möglich, da diese
//      Werte aus der Widerstands-Netzwerk-Berechnung des Graphen kommen und
//      nirgends unabhängig vorgegeben sind (siehe ARCHITEKTUR.md) - hier nur
//      Plausibilitätsprüfung statt exaktem Wert.
//
// Aufruf: node tests/visuell/test_pruefprotokoll.js
const path = require('path');
const { berechneProtokoll, kleinsterRiso, schlechtesteMessung, SPALTE } = require('../../tools/pruefprotokoll_erstellung.js');
const { parseBauteile } = require('./generate_anlage.js');

const TESTCASES = ['testcase_01', 'testcase_02', 'testcase_03', 'testcase_04', 'testcase_05', 'testcase_06'];

// Sollwerte Zi je Außenleiter, siehe Kopfkommentar Punkt 2.
const ZI_JE_AUSSENLEITER = {
  'testcase_05 SK1': { L1: '0,54', L2: '0,67', L3: '0,63' }
};

// Erwartete Protokollzeile bei Drehstrom: der schlechteste Außenleiter, hier
// L2 mit dem höchsten Zi aus ZI_JE_AUSSENLEITER, samt seinem Ik
// (docs/KONZEPT.md: Isc 309,0A).
const ZEILE_SCHLECHTESTER_WERT = {
  'testcase_05 SK1': { zi: '0,67', ikLn: '309,0' }
};

const anlagen = {};

function alleStromkreiseAus(anlage) {
  return (anlage.hutschienen ?? []).flatMap((h) => (h.gruppen ?? []).flatMap((g) => g.stromkreise));
}

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
  await pruefe('kleinsterRiso: kleinster endlicher Wert gewinnt, >999 zählt als unendlich', async () => {
    erwarteGleich(kleinsterRiso(['>999', '12,5', '3', '450']), '3', 'gemischte Werte');
    erwarteGleich(kleinsterRiso(['>999', '0,8']), '0,8', 'Komma-Wert');
    erwarteGleich(kleinsterRiso(['>999', '>999']), '>999', 'nur >999');
  });
  await pruefe('schlechtesteMessung: höchstes Z gewinnt, Ik kommt vom selben Außenleiter', async () => {
    const messungen = [
      { phase: 'L1', zi: '0,54', ikLn: '383,3' },
      { phase: 'L2', zi: '0,67', ikLn: '309,0' },
      { phase: 'L3', zi: '0,63', ikLn: '328,6' }
    ];
    const m = schlechtesteMessung(messungen, 'zi');
    erwarteGleich(`${m.phase} ${m.zi} ${m.ikLn}`, 'L2 0,67 309,0', 'schlechtester Außenleiter');
    erwarteGleich(schlechtesteMessung([{ phase: 'L1', zs: '0,5', ik: '460,0' }, { phase: 'L2', zs: '0,5', ik: '460,0' }], 'zs').phase, 'L1', 'Gleichstand');
  });
  await pruefe('schlechtesteMessung: ungültige Messung auf L2/L3 bleibt sichtbar', async () => {
    const zMitStrich = schlechtesteMessung([
      { phase: 'L1', zi: '0,54', ikLn: '383,3' },
      { phase: 'L2', zi: '---', ikLn: '---' },
      { phase: 'L3', zi: '0,63', ikLn: '328,6' }
    ], 'zi');
    erwarteGleich(`${zMitStrich.phase} ${zMitStrich.zi}`, 'L2 ---', 'ungültiges Zi');
    const ikMitStrich = schlechtesteMessung([
      { phase: 'L1', zs: '0,90', ik: '255,6' },
      { phase: 'L2', zs: '0,40', ik: '' },
      { phase: 'L3', zs: '0,60', ik: '383,3' }
    ], 'zs');
    erwarteGleich(`${ikMitStrich.phase} ${ikMitStrich.ik}`, 'L2 ', 'ungültiges Ik');
  });
  await pruefe('kleinsterRiso: ungültiger Wert (---) bleibt sichtbar', async () => {
    erwarteGleich(kleinsterRiso(['>999', '---', '2']), '---', 'mit ---');
  });

  for (const testcase of TESTCASES) {
    const ordner = path.join(__dirname, testcase);
    const { bauteile } = parseBauteile(ordner);
    const { ergebnisse, anlage, zeilen } = await berechneProtokoll(testcase);
    anlagen[testcase] = anlage;

    for (const erg of ergebnisse) {
      await pruefe(`${testcase} ${erg.sk}: Rpe (PE-Durchgang) ist 0,00Ω (RLOW-Workaround)`, async () => {
        erwarteGleich(erg.rpe, '0,00', `${erg.sk} Rpe`);
      });

      await pruefe(`${testcase} ${erg.sk}: Riso Verbraucher ohne ist >999MΩ (kein Isolationsfehler in diesem Testcase)`, async () => {
        erwarteGleich(erg.riso, '>999', `${erg.sk} Riso`);
      });

      await pruefe(`${testcase} ${erg.sk}: Riso je Leiterpaar mit den im Browser gesetzten Sonden gemessen`, async () => {
        const sk = alleStromkreiseAus(anlagen[testcase]).find((s) => s.bezeichnung === erg.sk);
        const netz = (funktion) => sk.leitung.adern.find((a) => a.funktion === funktion).netz;
        const erwartet = [...sk.phasen.map((p) => [p, 'N']), ...sk.phasen.map((p) => [p, 'PE'])];
        for (let i = 0; i < sk.phasen.length; i++) {
          for (let j = i + 1; j < sk.phasen.length; j++) erwartet.push([sk.phasen[i], sk.phasen[j]]);
        }
        // schwarzNetz/blauNetz liest berechneProtokoll() im Browser an den
        // tatsächlich gesetzten Messspitzen ab (platzierteMessspitzen()).
        erwarteGleich(erg.risoMessungen.length, erwartet.length, `${erg.sk} Anzahl Riso-Messungen`);
        erwartet.forEach(([a, b], i) => {
          const m = erg.risoMessungen[i];
          erwarteGleich(`${m.schwarzNetz}/${m.blauNetz}`, `${netz(a)}/${netz(b)}`, `${erg.sk} Riso ${a}-${b} Sonden`);
          erwarteGleich(m.wert, '>999', `${erg.sk} Riso ${a}-${b}`);
        });
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

      if (erg.messungen.zs) {
        await pruefe(`${testcase} ${erg.sk}: Zi/Zs für jeden Außenleiter (${erg.phasen.join('/')}) gemessen`, async () => {
          if (!erg.aussenleiter) throw new Error(`${erg.sk}: keine Messwerte pro Außenleiter geliefert`);
          const gemessen = erg.aussenleiter.map((m) => m.phase).join('/');
          erwarteGleich(gemessen, erg.phasen.join('/'), `${erg.sk} gemessene Außenleiter`);
          for (const m of erg.aussenleiter) {
            erwartePositiv(parseKomma(m.zi), `${erg.sk} ${m.phase} Zi`);
            erwartePositiv(parseKomma(m.ikLn), `${erg.sk} ${m.phase} Ik(L-N)`);
            if (!erg.rcdName) {
              erwartePositiv(parseKomma(m.zs), `${erg.sk} ${m.phase} Zs`);
              erwartePositiv(parseKomma(m.ik), `${erg.sk} ${m.phase} Ik(L-PE)`);
            }
          }
        });
      }

      // Die Protokollzeile (nicht nur `ergebnis`) muss bei mehrphasigen
      // Stromkreisen den schlechtesten Außenleiter zeigen.
      if (erg.aussenleiter?.length > 1) {
        await pruefe(`${testcase} ${erg.sk}: Protokollzeile zeigt den schlechtesten Außenleiter`, async () => {
          const zeile = zeilen.find((z) => z.werte[SPALTE.ziel] === erg.sk);
          if (!zeile) throw new Error(`${erg.sk}: keine Protokollzeile gefunden`);
          const zi = schlechtesteMessung(erg.aussenleiter, 'zi');
          erwarteGleich(`${zeile.werte[SPALTE.zi]} / ${zeile.werte[SPALTE.ikLn]}`, `${zi.zi} / ${zi.ikLn}`, `${erg.sk} Zi/Ik in der Zeile`);
          if (!erg.rcdName) {
            const zs = schlechtesteMessung(erg.aussenleiter, 'zs');
            erwarteGleich(`${zeile.werte[SPALTE.zs]} / ${zeile.werte[SPALTE.ik]}`, `${zs.zs} / ${zs.ik}`, `${erg.sk} Zs/Ik in der Zeile`);
          }
          const fest = ZEILE_SCHLECHTESTER_WERT[`${testcase} ${erg.sk}`];
          if (fest) {
            erwarteGleich(`${zeile.werte[SPALTE.zi]} / ${zeile.werte[SPALTE.ikLn]}`, `${fest.zi} / ${fest.ikLn}`, `${erg.sk} Zi/Ik laut docs/KONZEPT.md`);
          }
        });
      }

      const soll = ZI_JE_AUSSENLEITER[`${testcase} ${erg.sk}`];
      if (soll) {
        await pruefe(`${testcase} ${erg.sk}: Zi je Außenleiter stimmt mit docs/KONZEPT.md überein`, async () => {
          for (const m of erg.aussenleiter) erwarteGleich(m.zi, soll[m.phase], `${erg.sk} ${m.phase} Zi`);
        });
      }

      // Die Fehlertabellen der Testcases geben jedem Außenleiter eigene
      // Widerstände. Gleiche Werte auf allen Außenleitern hießen, dass
      // dreimal derselbe Leiter gemessen wurde.
      if (erg.aussenleiter?.length > 1) {
        await pruefe(`${testcase} ${erg.sk}: Zi/Zs unterscheiden sich je Außenleiter`, async () => {
          for (const groesse of erg.rcdName ? ['zi'] : ['zi', 'zs']) {
            const werte = erg.aussenleiter.map((m) => m[groesse]);
            if (new Set(werte).size !== werte.length) {
              throw new Error(`${erg.sk} ${groesse}: gleiche Werte auf mehreren Außenleitern (${werte.join(' / ')})`);
            }
          }
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
