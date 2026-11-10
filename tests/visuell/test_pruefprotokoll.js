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
const { berechneProtokoll, kleinsterRiso, schlechtesteMessung, groessterRpe, naechsteTrennstelle, SPALTE } = require('../../tools/pruefprotokoll_erstellung.js');
const { parseBauteile } = require('./generate_anlage.js');

const TESTCASES = ['testcase_01', 'testcase_02', 'testcase_03', 'testcase_04', 'testcase_05', 'testcase_06'];

// Querschnitt der Zuleitung an der Einspeisung (sim-aon), unabhängig vom
// Code aus den Anlagen abgelesen: testcase_02/03 führen die Zuleitung direkt
// auf den Hauptschalter (10 mm²), die anderen über Einspeiseklemmen bzw.
// mit 16 mm² auf den Hauptschalter.
const HAUPTLEITUNG_QUERSCHNITT = {
  testcase_01: '16', testcase_02: '10', testcase_03: '10', testcase_04: '16', testcase_05: '16', testcase_06: '16'
};

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
  await pruefe('groessterRpe: größter Wert gewinnt, ungültiger Wert bleibt sichtbar', async () => {
    erwarteGleich(groessterRpe(['0,12', '0,40', '0,25']), '0,40', 'größter Wert');
    erwarteGleich(groessterRpe(['0,12', '---']), '---', 'mit ---');
  });
  await pruefe('kleinsterRiso: ungültiger Wert (---) bleibt sichtbar', async () => {
    erwarteGleich(kleinsterRiso(['>999', '---', '2']), '---', 'mit ---');
  });

  // sim-f7j: Ohne RCD ist der LS selbst die Trennstelle. Sonst misst Riso
  // über die Sammelschiene die Elektronik eines RCD Typ B einer anderen
  // Gruppe mit (demo_08 SK4: 13 MΩ statt >999).
  await pruefe('naechsteTrennstelle: AFDD-LS, Gruppen-RCD, ohne RCD der LS', async () => {
    const ls = (afdd) => ({
      name: 'LS4', afdd,
      eingang: { leitung: { adern: [{ funktion: 'L1', netz: 'N1' }, { funktion: 'L2', netz: 'N2' }, { funktion: 'N', netz: 'N9' }] } }
    });
    const sk = (afdd) => ({ phasen: ['L1', 'L2'], ls: ls(afdd) });
    const text = (t) => `${t.bauteil} ${t.netze.join('/')} ${t.istLeckageQuelle}`;
    erwarteGleich(text(naechsteTrennstelle(sk(false), {}, ['L1', 'N'])), 'LS4 N1 false', 'ohne RCD');
    erwarteGleich(text(naechsteTrennstelle(sk(true), { rcd: { name: 'RCD1', typ: 'A' } }, ['L1', 'L2'])), 'LS4 N1/N2 true', 'AFDD');
    erwarteGleich(text(naechsteTrennstelle(sk(false), { rcd: { name: 'RCD1', typ: 'B' } }, ['L2', 'PE'])), 'RCD1 N2 true', 'RCD Typ B');
  });

  // sim-f7j, integriert: demo_08 hat einen Stromkreis ohne RCD (SK4, L1-L3)
  // und auf L1 einen RCD Typ B einer anderen Gruppe (G1). Ohne geöffneten
  // LS ergab Riso auf L1 die 13 MΩ der Typ-B-Elektronik.
  await pruefe('demo_08 SK4 (ohne RCD, RCD Typ B auf derselben Phase): Riso überall >999MΩ', async () => {
    const { ergebnisse } = await berechneProtokoll('../../demos/demo_08');
    const sk4 = ergebnisse.find((e) => e.sk === 'SK4');
    const nichtUnendlich = sk4.risoMessungen.filter((m) => m.wert !== '>999');
    if (nichtUnendlich.length > 0) throw new Error(`Riso: ${JSON.stringify(nichtUnendlich)}`);
    erwarteGleich(sk4.riso, '>999', 'Riso im Protokoll');
  });

  for (const testcase of TESTCASES) {
    const ordner = path.join(__dirname, testcase);
    const { bauteile } = parseBauteile(ordner);
    const { ergebnisse, anlage, zeilen, einspeisung, zuordnung, protokollEintraege, zref, erprobenPunkte, hauptleitungZs } = await berechneProtokoll(testcase);
    anlagen[testcase] = anlage;

    // sim-liq: Zref nach dem Hauptschalter = Vorimpedanz (keine Fehler-
    // widerstände vor dem Hauptschalter in den Testcases).
    // sim-lgf: ΔU je Außenleiter = (Zi - Zref) * In / 230 V * 100 und das
    // Erproben-Kreuz "Überprüfung Spannungsfall" passend zum Grenzwert 3,5 %.
    await pruefe(`${testcase}: Spannungsfall je Außenleiter nach Formel, Erproben-Kreuz passend`, async () => {
      const zahl = (w) => parseFloat(String(w).replace(',', '.'));
      const sks = alleStromkreiseAus(anlage);
      const alle = [];
      for (const erg of ergebnisse) {
        const sk = sks.find((s) => s.bezeichnung === erg.sk);
        for (const m of erg.aussenleiter ?? []) {
          const soll = ((zahl(m.zi) - zahl(zref)) * sk.ls.in / 230) * 100;
          if (Math.abs(zahl(m.deltaU) - soll) > 0.011) throw new Error(`${erg.sk} ${m.phase}: ΔU ${m.deltaU}, nach Formel ${soll.toFixed(2)}`);
          alle.push(zahl(m.deltaU));
        }
      }
      const punkt = erprobenPunkte.find((p) => p.punkt === 'Überprüfung Spannungsfall');
      erwarteGleich(punkt?.ergebnis, alle.every((w) => w <= 3.5) ? 'i.O.' : 'n.i.O.', 'Erproben Spannungsfall');
    });

    // sim-aon: Hauptleitung mit Kabel der Einspeisung und Zs je Außenleiter
    // = Vorimpedanz (keine Fehlerwiderstände vor der Einspeisung).
    await pruefe(`${testcase}: Hauptleitung mit Aderanzahl, Querschnitt und Zs = Vorimpedanz`, async () => {
      const soll = (anlage.vorimpedanz_ohm ?? 0.14).toFixed(2).replace('.', ',');
      erwarteGleich(hauptleitungZs.length, anlage.hauptsicherung.polig === 3 ? 3 : 1, 'Anzahl Zs-Messungen');
      for (const m of hauptleitungZs) erwarteGleich(m.zs, soll, `Zs ${m.phase}`);
      const zeile = zeilen.find((z) => z.zeilenIndex === 2).werte;
      const dreiphasig = anlage.hauptsicherung.polig === 3;
      erwarteGleich(zeile[SPALTE.kabelAnzahl], dreiphasig ? '5' : '3', 'Aderanzahl');
      erwarteGleich(zeile[SPALTE.kabelQuerschnitt], HAUPTLEITUNG_QUERSCHNITT[testcase], 'Querschnitt');
      erwarteGleich(zeile[SPALTE.zs], soll, 'Zs im Protokoll');
      if (!zeile[SPALTE.ik]) throw new Error('Ik fehlt');
    });

    await pruefe(`${testcase}: Zref am Verteiler = Vorimpedanz`, async () => {
      const soll = (anlage.vorimpedanz_ohm ?? 0.14).toFixed(2).replace('.', ',');
      erwarteGleich(zref, soll, 'Zref');
    });

    // sim-nt2: Das Replay trägt genau die Werte ein, die auch in der PDF
    // stehen - außer dem Kabeltyp, der in der Anlage nicht ablesbar ist.
    await pruefe(`${testcase}: Protokoll-Einträge im Fahrplan stimmen mit den PDF-Zeilen überein`, async () => {
      const soll = zeilen.flatMap((z) => Object.entries(z.werte)
        .filter(([spalte]) => Number(spalte) !== SPALTE.kabelTyp)
        .map(([spalte, wert]) => `${z.zeilenIndex}/${spalte}=${wert}`)).sort();
      const ist = protokollEintraege.map((e) => `${e.zeile}/${e.spalte}=${e.wert}`).sort();
      erwarteGleich(ist.join('; '), soll.join('; '), 'Einträge');
    });

    await pruefe(`${testcase}: Stromkreis-Bezeichnung aus LS-Position und Endstellen`, async () => {
      ergebnisse.forEach((erg, i) => {
        const zeile = zeilen.find((z) => z.zeilenIndex === erg.zeilenIndex);
        const ziel = zeile.werte[SPALTE.ziel];
        if (!ziel.startsWith(`LS${i + 1}`)) throw new Error(`${erg.sk}: Bezeichnung "${ziel}" beginnt nicht mit LS${i + 1}`);
        const anzahl = (anlage.steckdosen_platzierung ?? []).filter((p) => p.sk === erg.sk).length;
        if (anzahl > 0 && !ziel.includes(`: ${anzahl} `)) throw new Error(`${erg.sk}: Bezeichnung "${ziel}" nennt nicht ${anzahl} Endstellen`);
      });
    });

    // Erwartete Spannungen im gesunden Netz: 230 V gegen N/PE, 400 V zwischen
    // Außenleitern, 0 V zwischen N und PE.
    const sollSpannung = (paar) => (paar === 'N-PE' ? '0' : /^L\d-L\d$/.test(paar) ? '400' : '230');
    await pruefe(`${testcase}: Spannung an der Einspeisung plausibel`, async () => {
      if (einspeisung.length === 0) throw new Error('keine Messung an der Einspeisung');
      for (const m of einspeisung) erwarteGleich(m.wert, sollSpannung(m.paar), `Einspeisung ${m.paar}`);
    });

    await pruefe(`${testcase}: Zuordnung erkennt jede Endstelle an ihrem LS`, async () => {
      const endstellen = (anlage.steckdosen_platzierung ?? []).length;
      erwarteGleich(zuordnung.length, endstellen, 'Anzahl zugeordneter Endstellen');
      for (const z of zuordnung) {
        erwarteGleich(`${z.vorher}/${z.lsAus}/${z.lsWiederEin}`, '230/0/230', `Endstelle ${z.endstelle} (${z.sk}) vorher/LS aus/LS wieder ein`);
      }
    });

    for (const erg of ergebnisse) {
      await pruefe(`${testcase} ${erg.sk}: Spannungsfreiheit an allen Messstellen nach dem Freischalten`, async () => {
        // Messstellen: Abgangsklemmen (Riso) und jede Endstelle (Rpe).
        const endstellen = (anlage.steckdosen_platzierung ?? []).filter((p) => p.sk === erg.sk).map((p) => `${p.row}-${p.col}`);
        const orte = new Set(erg.spannungsfreiheit.map((m) => m.ort));
        for (const ort of ['Abgangsklemmen', ...endstellen]) {
          if (!orte.has(ort)) throw new Error(`${erg.sk}: keine Prüfung der Spannungsfreiheit an ${ort}`);
        }
        for (const m of erg.spannungsfreiheit) erwarteGleich(m.wert, '0', `${erg.sk} ${m.ort} ${m.paar}`);
      });

      await pruefe(`${testcase} ${erg.sk}: Rpe an jeder Endstelle gemessen, 0,00Ω (RLOW-Workaround)`, async () => {
        const endstellen = (anlage.steckdosen_platzierung ?? []).filter((p) => p.sk === erg.sk).length;
        erwarteGleich(erg.rpeMessungen.length, Math.max(endstellen, 1), `${erg.sk} Anzahl Rpe-Messungen`);
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
          const zeile = zeilen.find((z) => z.zeilenIndex === erg.zeilenIndex);
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
