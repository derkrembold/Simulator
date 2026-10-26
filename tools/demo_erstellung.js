// Erzeugt eine Demo-Anlage aus einer einfachen Anforderung (demos/demo_NN/anforderung.md,
// Vorlage: demos/anforderung_vorlage.md).
//
// Aufruf:
//   node tools/demo_erstellung.js <demo> --neu     legt demos/<demo>/anforderung.md aus der Vorlage an
//   node tools/demo_erstellung.js <demo>           erzeugt alles aus demos/<demo>/anforderung.md
//   node tools/demo_erstellung.js <demo> --nur-modell
//                                                  nur netzplan.md, bauteile.md, anlage.json, graph.json
//
// Schritte: Anforderung prüfen -> netzplan.md + bauteile.md schreiben -> generate_anlage.js
// (anlage.json, graph.json) -> Verdrahtungsprüfung gegen das gerenderte Bild -> fahrplan.json
// + pruefprotokoll.pdf -> fahrplan.pdf. Siehe docs/ARCHITEKTUR.md, Abschnitt Entwickler-Skills.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const generator = require('../tests/visuell/generate_anlage.js');

const PROJEKT_ROOT = path.resolve(__dirname, '..');
const DEMOS_ORDNER = path.join(PROJEKT_ROOT, 'demos');
const VORLAGE = path.join(DEMOS_ORDNER, 'anforderung_vorlage.md');

const MAX_TE_PRO_HUTSCHIENE = 16;
const FARBE = { L1: 'schwarz', L2: 'braun', L3: 'grau', N: 'blau', PE: 'gn-ge' };

const ERLAUBT = {
  netzform: ['TN-S', 'TN-C-S', 'TT'],
  hauptschalterPole: [2, 3],
  rcdPole: [2, 4],
  rcdTyp: ['AC', 'A', 'F', 'B', 'B+'],
  fehlerstrom: [10, 30, 100, 300, 500],
  rcdNennstrom: [16, 25, 40, 63, 80, 100, 125],
  lsPole: [1, 3],
  lsCharakteristik: ['B', 'C', 'D', 'K', 'Z'],
  lsNennstrom: [6, 10, 13, 16, 20, 25, 32, 35, 40, 50, 63],
  phase: ['L1', 'L2', 'L3'],
  endstelleEinphasig: ['Steckdose', 'Lichtauslass'],
  endstelleDreiphasig: ['Drehstromsteckdose', '5-polige Anschlussdose'],
  janein: ['ja', 'nein']
};

// Leiterquerschnitt (mm²) nach Nennstrom - gilt für Hauptschalterseite und Stromkreise.
function querschnittFuerStrom(ampere) {
  const stufen = [[10, 1.5], [16, 2.5], [25, 4], [32, 6], [50, 10], [63, 16]];
  const treffer = stufen.find(([grenze]) => ampere <= grenze);
  return treffer ? treffer[1] : 25;
}

function naechsterKlemmenQuerschnitt(q) {
  return [4, 6, 10, 16, 25].find((s) => s >= q) ?? q;
}

// --- Anforderung lesen ---

function leseTabelle(abschnitt) {
  const zeilen = abschnitt.split('\n').map((z) => z.trim()).filter((z) => z.startsWith('|'));
  if (zeilen.length < 2) return [];
  const kopf = zeilen[0].split('|').slice(1, -1).map((z) => z.trim());
  return zeilen.slice(2).map((zeile) => {
    const werte = zeile.split('|').slice(1, -1).map((z) => z.trim());
    const obj = {};
    kopf.forEach((k, i) => { obj[k] = werte[i] ?? ''; });
    return obj;
  });
}

// Liest eine Zahl vollständig: "16abc" oder "1,2,3" ergeben null statt einer still abgeschnittenen Zahl.
function zahl(wert) {
  const text = String(wert ?? '').trim();
  if (!/^[+-]?\d+([.,]\d+)?$/.test(text)) return null;
  return parseFloat(text.replace(',', '.'));
}

function parseAnforderung(text) {
  const abschnitte = text.split(/^## /m).slice(1);
  const finde = (name) => abschnitte.find((a) => a.startsWith(name));

  const kopfdaten = {};
  for (const z of leseTabelle(finde('Anlage') ?? '')) kopfdaten[z.Feld] = z.Wert;

  const gruppen = leseTabelle(finde('Gruppen') ?? '').filter((z) => z.Gruppe).map((z) => ({
    id: z.Gruppe,
    ohneRcd: /^ohne$/i.test(z['RCD Pole']),
    rcdPole: /^ohne$/i.test(z['RCD Pole']) ? null : zahl(z['RCD Pole']),
    rcdPoleRoh: z['RCD Pole'],
    typ: z['RCD Typ'],
    fehlerstrom: zahl(z['Fehlerstrom (mA)']),
    nennstrom: zahl(z['RCD Nennstrom (A)']),
    selektiv: z.Selektiv,
    abklemmen: z.Abklemmen
  }));

  const stromkreise = leseTabelle(finde('Stromkreise') ?? '').filter((z) => z.Stromkreis).map((z) => ({
    name: z.Stromkreis,
    gruppe: z.Gruppe,
    ziel: z.Ziel,
    endstelle: z.Endstelle,
    dosen: zahl(z['Anzahl Dosen']),
    lsPole: zahl(z['LS Pole']),
    lsChar: z['LS Char.'],
    lsA: zahl(z['LS (A)']),
    phase: z.Phase || null,
    zi: z.Zi, zs: z.Zs, rcd: z.RCD,
    fehlerRoh: z['Fehler Zuleitung (Ω)'] ?? '',
    fehler: z['Fehler Zuleitung (Ω)'] ? zahl(z['Fehler Zuleitung (Ω)']) : null
  }));

  return {
    name: kopfdaten.Name,
    beschreibung: kopfdaten.Beschreibung,
    netzform: kopfdaten.Netzform,
    hsPole: zahl(kopfdaten['Hauptschalter Pole']),
    hsA: zahl(kopfdaten['Hauptschalter (A)']),
    gruppen,
    stromkreise
  };
}

// --- Prüfen ---

function pruefeAnforderung(anf) {
  const fehler = [];
  const muss = (bedingung, meldung) => { if (!bedingung) fehler.push(meldung); };
  const aus = (wert, liste) => liste.includes(wert);
  const liste = (l) => l.join(', ');

  muss(anf.name, 'Anlage: Name fehlt');
  muss(aus(anf.netzform, ERLAUBT.netzform), `Anlage: Netzform "${anf.netzform}" ungültig (erlaubt: ${liste(ERLAUBT.netzform)})`);
  muss(aus(anf.hsPole, ERLAUBT.hauptschalterPole), `Anlage: Hauptschalter Pole "${anf.hsPole}" ungültig (erlaubt: ${liste(ERLAUBT.hauptschalterPole)})`);
  muss(anf.hsA > 0, 'Anlage: Hauptschalter (A) fehlt oder ist keine Zahl');
  muss(anf.gruppen.length > 0, 'Gruppen: mindestens eine Gruppe nötig');
  muss(anf.stromkreise.length > 0, 'Stromkreise: mindestens ein Stromkreis nötig');

  const gruppenIds = new Set();
  for (const g of anf.gruppen) {
    muss(!gruppenIds.has(g.id), `Gruppe ${g.id}: doppelt vergeben`);
    gruppenIds.add(g.id);
    if (g.ohneRcd) continue;
    muss(aus(g.rcdPole, ERLAUBT.rcdPole), `Gruppe ${g.id}: RCD Pole "${g.rcdPoleRoh}" ungültig (erlaubt: ${liste(ERLAUBT.rcdPole)} oder ohne)`);
    muss(aus(g.typ, ERLAUBT.rcdTyp), `Gruppe ${g.id}: RCD Typ "${g.typ}" ungültig (erlaubt: ${liste(ERLAUBT.rcdTyp)})`);
    muss(aus(g.fehlerstrom, ERLAUBT.fehlerstrom), `Gruppe ${g.id}: Fehlerstrom "${g.fehlerstrom}" ungültig (erlaubt: ${liste(ERLAUBT.fehlerstrom)})`);
    muss(aus(g.nennstrom, ERLAUBT.rcdNennstrom), `Gruppe ${g.id}: RCD Nennstrom "${g.nennstrom}" ungültig (erlaubt: ${liste(ERLAUBT.rcdNennstrom)})`);
    muss(aus(g.selektiv, ERLAUBT.janein), `Gruppe ${g.id}: Selektiv "${g.selektiv}" ungültig (ja/nein)`);
    muss(aus(g.abklemmen, ERLAUBT.janein), `Gruppe ${g.id}: Abklemmen "${g.abklemmen}" ungültig (ja/nein)`);
  }

  const skNamen = new Set();
  for (const s of anf.stromkreise) {
    const n = s.name;
    muss(/^SK[1-9]\d*$/.test(n), `Stromkreis "${n}": Name muss SK<Nummer> ohne führende Null lauten (z.B. SK1)`);
    muss(!skNamen.has(n), `Stromkreis ${n}: doppelt vergeben`);
    skNamen.add(n);
    muss(gruppenIds.has(s.gruppe), `Stromkreis ${n}: Gruppe "${s.gruppe}" existiert nicht`);
    muss(aus(s.lsPole, ERLAUBT.lsPole), `Stromkreis ${n}: LS Pole "${s.lsPole}" ungültig (erlaubt: ${liste(ERLAUBT.lsPole)})`);
    muss(aus(s.lsChar, ERLAUBT.lsCharakteristik), `Stromkreis ${n}: LS Charakteristik "${s.lsChar}" ungültig (erlaubt: ${liste(ERLAUBT.lsCharakteristik)})`);
    muss(aus(s.lsA, ERLAUBT.lsNennstrom), `Stromkreis ${n}: LS (A) "${s.lsA}" ungültig (erlaubt: ${liste(ERLAUBT.lsNennstrom)})`);
    muss(Number.isInteger(s.dosen) && s.dosen >= 1, `Stromkreis ${n}: Anzahl Dosen muss eine Zahl ab 1 sein`);
    for (const [feld, wert] of [['Zi', s.zi], ['Zs', s.zs], ['RCD', s.rcd]]) {
      muss(aus(wert, ERLAUBT.janein), `Stromkreis ${n}: ${feld} "${wert}" ungültig (ja/nein)`);
    }
    muss(s.fehlerRoh === '' || (s.fehler !== null && s.fehler >= 0), `Stromkreis ${n}: Fehler Zuleitung "${s.fehlerRoh}" ungültig (leer oder eine Zahl ab 0)`);
    if (s.lsPole === 3) {
      muss(aus(s.endstelle, ERLAUBT.endstelleDreiphasig), `Stromkreis ${n}: Endstelle "${s.endstelle}" passt nicht zu einem 3-poligen LS (erlaubt: ${liste(ERLAUBT.endstelleDreiphasig)})`);
      muss(!s.phase, `Stromkreis ${n}: bei 3-poligem LS muss Phase leer bleiben`);
      muss(anf.hsPole === 3, `Stromkreis ${n}: 3-poliger LS braucht einen 3-poligen Hauptschalter`);
    } else if (s.lsPole === 1) {
      muss(aus(s.endstelle, ERLAUBT.endstelleEinphasig), `Stromkreis ${n}: Endstelle "${s.endstelle}" passt nicht zu einem 1-poligen LS (erlaubt: ${liste(ERLAUBT.endstelleEinphasig)})`);
      muss(aus(s.phase, ERLAUBT.phase), `Stromkreis ${n}: Phase "${s.phase}" ungültig (erlaubt: ${liste(ERLAUBT.phase)})`);
      muss(anf.hsPole === 3 || s.phase === 'L1', `Stromkreis ${n}: bei 2-poligem Hauptschalter ist nur Phase L1 möglich`);
    }
  }

  for (const g of anf.gruppen) {
    const sks = anf.stromkreise.filter((s) => s.gruppe === g.id);
    muss(sks.length > 0, `Gruppe ${g.id}: kein Stromkreis zugeordnet`);
    if (g.ohneRcd) {
      muss(sks.length === 1, `Gruppe ${g.id}: eine Gruppe ohne RCD darf genau einen Stromkreis haben (hat ${sks.length})`);
      continue;
    }
    if (g.rcdPole === 2) {
      muss(sks.length <= 2, `Gruppe ${g.id}: ein 2-poliger RCD darf höchstens 2 LS haben (hat ${sks.length})`);
      muss(sks.every((s) => s.lsPole === 1), `Gruppe ${g.id}: hinter einem 2-poligen RCD sind nur 1-polige LS möglich`);
      muss(new Set(sks.map((s) => s.phase)).size <= 1, `Gruppe ${g.id}: hinter einem 2-poligen RCD müssen alle LS auf derselben Phase liegen`);
    }
    if (g.rcdPole === 4) {
      muss(sks.length <= 6, `Gruppe ${g.id}: ein 4-poliger RCD darf höchstens 6 LS haben (hat ${sks.length})`);
      muss(anf.hsPole === 3, `Gruppe ${g.id}: ein 4-poliger RCD braucht einen 3-poligen Hauptschalter`);
      const phasen = new Set(sks.flatMap((s) => (s.lsPole === 3 ? ['L1', 'L2', 'L3'] : [s.phase])));
      muss(['L1', 'L2', 'L3'].every((p) => phasen.has(p)), `Gruppe ${g.id}: ein 4-poliger RCD braucht Stromkreise auf L1, L2 und L3`);
    }
    muss(sks.every((s) => g.nennstrom > s.lsA), `Gruppe ${g.id}: RCD-Nennstrom (${g.nennstrom} A) muss größer sein als jeder LS`);
  }

  for (const g of anf.gruppen) {
    const te = teDerGruppe(g, anf.stromkreise);
    muss(te <= MAX_TE_PRO_HUTSCHIENE, `Gruppe ${g.id}: ${te} TE passen nicht auf eine Hutschiene (max. ${MAX_TE_PRO_HUTSCHIENE} TE)`);
  }

  return fehler;
}

function teDerGruppe(gruppe, stromkreise) {
  const sks = stromkreise.filter((s) => s.gruppe === gruppe.id);
  return (gruppe.rcdPole ?? 0) + sks.reduce((summe, s) => summe + s.lsPole, 0);
}

// --- Modell aufbauen (Netze, Pins, Bauteile) ---

function baueModell(anf) {
  const netze = [];
  const tabellePins = {};
  const bauteilTabelle = {};

  function neuesNetz(quelle, funktion, querschnitt, optionen = {}) {
    const netz = {
      id: `N${netze.length + 1}`,
      quelle,
      funktion,
      farbe: optionen.farbe ?? FARBE[funktion],
      querschnitt,
      kabeltyp: optionen.kabeltyp === undefined ? 'NYM-J' : optionen.kabeltyp,
      pins: []
    };
    netze.push(netz);
    return netz;
  }

  function anPin(netz, tabelle, pinName, funktion = netz.funktion) {
    netz.pins.push({ pin: pinName, funktion });
    if (!tabellePins[tabelle]) tabellePins[tabelle] = [];
    if (!tabellePins[tabelle].includes(pinName)) tabellePins[tabelle].push(pinName);
    bauteilTabelle[pinName.split('.')[0]] = tabelle;
  }

  const bond = (tabelle) => neuesNetz(tabelle, 'PE', 16, { farbe: 'blank', kabeltyp: null });

  // Hutschienen: H1 = Hauptschalter + Klemmen, dann Gruppen (je bis 16 TE), zuletzt Reihenklemmen.
  const schienen = [];
  for (const g of anf.gruppen) {
    const te = teDerGruppe(g, anf.stromkreise);
    const letzte = schienen[schienen.length - 1];
    if (letzte && letzte.te + te <= MAX_TE_PRO_HUTSCHIENE) {
      letzte.gruppen.push(g);
      letzte.te += te;
    } else {
      schienen.push({ gruppen: [g], te });
    }
  }
  schienen.forEach((s, i) => { s.id = `H${i + 2}`; });
  const tabelleReihenklemmen = `H${schienen.length + 2}`;
  const tabellenIds = ['H1', ...schienen.map((s) => s.id), tabelleReihenklemmen];

  const hs3 = anf.hsPole === 3;
  const phasenHS = hs3 ? ['L1', 'L2', 'L3'] : ['L1'];
  const qHS = querschnittFuerStrom(anf.hsA);
  const qEin = Math.max(16, qHS);

  // H1: Einspeisung, Hauptschalter, Klemmen
  const einspeisung = {};
  for (const p of phasenHS) {
    einspeisung[p] = neuesNetz('H1', p, qEin);
    anPin(einspeisung[p], 'H1', `Einspeisung.${p}`);
    if (hs3) anPin(einspeisung[p], 'H1', `${p}-Klemme.i1`);
  }
  const nEin = neuesNetz('H1', 'N', qEin);
  anPin(nEin, 'H1', 'Einspeisung.N');
  if (hs3) anPin(nEin, 'H1', 'N-Klemme.i1');
  const peEin = neuesNetz('H1', 'PE', qEin);
  anPin(peEin, 'H1', 'Einspeisung.PE');
  anPin(peEin, 'H1', 'PE-Klemme.io1');

  const hsAus = {};
  let nUngeschaltet;
  if (hs3) {
    phasenHS.forEach((p, k) => {
      const ein = neuesNetz('H1', p, qHS);
      anPin(ein, 'H1', `${p}-Klemme.o1`);
      anPin(ein, 'H1', `Hauptschalter.i${k + 1}`);
    });
    phasenHS.forEach((p, k) => {
      hsAus[p] = neuesNetz('H1', p, qHS);
      anPin(hsAus[p], 'H1', `Hauptschalter.o${k + 1}`);
    });
    nUngeschaltet = neuesNetz('H1', 'N', qHS);
    anPin(nUngeschaltet, 'H1', 'N-Klemme.o1');
  } else {
    anPin(einspeisung.L1, 'H1', 'Hauptschalter.i1');
    anPin(nEin, 'H1', 'Hauptschalter.i2');
    hsAus.L1 = neuesNetz('H1', 'L1', qHS);
    anPin(hsAus.L1, 'H1', 'Hauptschalter.o1');
    nUngeschaltet = neuesNetz('H1', 'N', qHS);
    anPin(nUngeschaltet, 'H1', 'Hauptschalter.o2');
  }
  const zubringer = neuesNetz('H1', 'PE', 2.5);
  anPin(zubringer, 'H1', 'PE-Klemme.io2');
  const bondH1 = bond('H1');
  anPin(bondH1, 'H1', 'PE-Klemme.io3');
  anPin(bondH1, 'H1', 'H1');

  // Stromkreise vorbereiten
  const sks = anf.stromkreise.map((s) => ({
    ...s,
    nr: parseInt(s.name.replace('SK', ''), 10),
    phasen: s.lsPole === 3 ? ['L1', 'L2', 'L3'] : [s.phase],
    q: querschnittFuerStrom(s.lsA)
  }));

  // Gruppen auf ihren Hutschienen
  const gruppenInfo = [];
  let rcdZaehler = 0;
  for (const schiene of schienen) {
    for (const g of schiene.gruppen) {
      const tab = schiene.id;
      const gruppenSks = sks.filter((s) => s.gruppe === g.id);
      const rcdName = g.rcdPole ? `RCD${++rcdZaehler}` : null;
      let gruppeN;

      if (rcdName) {
        const rcdPhasen = g.rcdPole === 4 ? ['L1', 'L2', 'L3'] : [gruppenSks[0].phasen[0]];
        rcdPhasen.forEach((p, k) => anPin(hsAus[p], tab, `${rcdName}.i${k + 1}`));
        anPin(nUngeschaltet, tab, `${rcdName}.i${rcdPhasen.length + 1}`);
        gruppeN = neuesNetz(tab, 'N', Math.max(...gruppenSks.map((s) => s.q)));
        anPin(gruppeN, tab, `${rcdName}.o${rcdPhasen.length + 1}`);
        for (const s of gruppenSks) {
          s.phasen.forEach((p, j) => {
            const zweig = neuesNetz(tab, p, s.q);
            anPin(zweig, tab, `${rcdName}.o${rcdPhasen.indexOf(p) + 1}`);
            anPin(zweig, tab, `LS${s.nr}.i${j + 1}`);
          });
        }
      } else {
        const s = gruppenSks[0];
        s.phasen.forEach((p, j) => anPin(hsAus[p], tab, `LS${s.nr}.i${j + 1}`));
        gruppeN = nUngeschaltet;
      }

      for (const s of gruppenSks) {
        s.gruppeN = gruppeN;
        s.lsAus = s.phasen.map((p, j) => {
          const aus = neuesNetz(tab, p, s.q);
          anPin(aus, tab, `LS${s.nr}.o${j + 1}`);
          return aus;
        });
      }
      gruppenInfo.push({ gruppe: g, rcdName, sks: gruppenSks, tabelle: tab });
    }
  }

  // Reihenklemmen und Endstellen
  const bondR = bond(tabelleReihenklemmen);
  const fehlerNetze = [];
  sks.forEach((s, index) => {
    const tab = tabelleReihenklemmen;
    const mehrphasig = s.phasen.length > 1;
    s.reihenklemmen = [];
    s.phasen.forEach((p, j) => {
      const rk = mehrphasig ? `Reihenklemme_L${p.replace('L', '')}_SK${s.nr}` : `Reihenklemme_L_SK${s.nr}`;
      s.reihenklemmen.push(rk);
      anPin(s.lsAus[j], tab, `${rk}.i1`);
      const ende = neuesNetz(tab, p, s.q);
      anPin(ende, tab, `${rk}.o1`);
      anPin(ende, tab, `Endstelle_SK${s.nr}.i${j + 1}`);
      if (j === 0 && s.fehler) fehlerNetze.push({ netz: ende.id, widerstand: s.fehler });
    });
    s.reihenklemmen.push(`Reihenklemme_N_SK${s.nr}`, `Reihenklemme_PE_SK${s.nr}`);

    anPin(s.gruppeN, tab, `Reihenklemme_N_SK${s.nr}.i1`);
    const nEnde = neuesNetz(tab, 'N', s.q);
    anPin(nEnde, tab, `Reihenklemme_N_SK${s.nr}.o1`);
    anPin(nEnde, tab, `Endstelle_SK${s.nr}.i${s.phasen.length + 1}`);

    if (index === 0) anPin(zubringer, tab, `Reihenklemme_PE_SK${s.nr}.io1`);
    const peEnde = neuesNetz(tab, 'PE', s.q);
    anPin(peEnde, tab, `Reihenklemme_PE_SK${s.nr}.io2`);
    anPin(peEnde, tab, `Endstelle_SK${s.nr}.i${s.phasen.length + 2}`);
    anPin(bondR, tab, `Reihenklemme_PE_SK${s.nr}.io3`);
  });
  anPin(bondR, tabelleReihenklemmen, tabelleReihenklemmen);
  for (const t of tabellenIds) {
    if (!tabellePins[t]) tabellePins[t] = [];
    if (!tabellePins[t].includes(t)) tabellePins[t].push(t);
  }

  return { netze, tabellePins, tabellenIds, schienen, gruppenInfo, sks, hs3, qHS, fehlerNetze };
}

// --- netzplan.md schreiben ---

function schreibeNetzplan(anf, modell, demoName) {
  const { netze, tabellePins, tabellenIds, schienen, gruppenInfo, hs3, fehlerNetze } = modell;
  const letzte = tabellenIds[tabellenIds.length - 1];

  const zeilen = [];
  zeilen.push(`# Netzplan – ${demoName}`, '');
  zeilen.push('Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.', '');
  zeilen.push(`Physische Zeilen (Hutschienen), je eine eigene Tabelle:`);
  zeilen.push(`- **H1** = Hauptschalter (${anf.hsPole}-polig) + ${hs3 ? 'L1-/L2-/L3-/N-/PE-Klemme' : 'PE-Klemme'} (unterste Zeile)`);
  for (const s of schienen) {
    const beschr = s.gruppen.map((g) => {
      const info = gruppenInfo.find((i) => i.gruppe === g);
      return `Gruppe ${g.id} (${info.rcdName ? `${info.rcdName}, ${g.rcdPole}-polig, + ` : 'ohne RCD, '}${info.sks.map((k) => `LS${k.nr}`).join('/')})`;
    }).join(' und ');
    zeilen.push(`- **${s.id}** = ${beschr}`);
  }
  zeilen.push(`- **${letzte}** = Reihenklemmen (oberste Zeile)`, '');
  zeilen.push('Jede Tabelle zeigt nur ihre eigenen (Home-)Pins. Ein Netz, das über eine Tabellengrenze hinweg');
  zeilen.push('weiterläuft, taucht als Spalte in beiden Tabellen auf; die Zeile **Quelle** zeigt, aus welcher');
  zeilen.push('Hutschiene dieses Netz stammt.', '');
  zeilen.push('**Pin-Konvention:** `<Bauteil>.<i|o><Nr>` (`i` = Eingang, `o` = Ausgang). Bei PE-Bauteilen');
  zeilen.push('`io1`/`io2`/`io3`: `io3` ist immer die Hutschiene, `io1`/`io2` tragen je genau eine Ader.', '', '---', '');

  tabellenIds.forEach((tab, index) => {
    const pins = tabellePins[tab];
    const spalten = netze.filter((n) => n.pins.some((p) => pins.includes(p.pin)));
    zeilen.push(`## Tabelle ${index + 1}: ${tab}`, '');
    const kopf = ['Pin', ...spalten.map((n) => n.id)];
    zeilen.push(`| ${kopf.join(' | ')} |`);
    zeilen.push(`|${kopf.map(() => ':---:').join('|')}|`);
    zeilen.push(`| **Quelle** | ${spalten.map((n) => n.quelle).join(' | ')} |`);
    zeilen.push(`| **Farbe** | ${spalten.map((n) => n.farbe).join(' | ')} |`);
    zeilen.push(`| **Querschnitt (mm²)** | ${spalten.map((n) => n.querschnitt).join(' | ')} |`);
    zeilen.push(`| **Kabeltyp** | ${spalten.map((n) => n.kabeltyp ?? '–').join(' | ')} |`);
    for (const pin of pins) {
      const zellen = spalten.map((n) => n.pins.find((p) => p.pin === pin)?.funktion ?? '');
      zeilen.push(`| ${pin} | ${zellen.join(' | ')} |`);
    }
    zeilen.push('', '---', '');
  });

  if (fehlerNetze.length > 0) {
    zeilen.push('## Fehlertabelle', '');
    zeilen.push('Fehler-Widerstand auf der Zuleitung zur Endstelle - Netze ohne Eintrag gelten als 0Ω.', '');
    zeilen.push('| Netz | Widerstand (Ω) |', '| ---- | --------------- |');
    for (const f of fehlerNetze) zeilen.push(`| ${f.netz} | ${String(f.widerstand).replace('.', ',')} |`);
    zeilen.push('');
  }
  return zeilen.join('\n') + '\n';
}

// --- bauteile.md schreiben ---

function schreibeBauteile(anf, modell) {
  const { gruppenInfo, sks, hs3, qHS } = modell;
  const SPALTEN = ['Bauteil', 'Gruppe', 'Typ/Charakteristik', 'Fehlerstrom', 'Nennstrom', 'Max. Querschnitt', 'Pole', 'Selektiv', 'Abklemmen', 'Anzahl LS', 'tA', 'IA', 'UB'];
  const zeile = (werte) => `| ${SPALTEN.map((s) => werte[s] ?? '–').join(' | ')} |`;

  const zeilen = [];
  zeilen.push(`# Bauteile – ${anf.name}`, '');
  zeilen.push('Aus `anforderung.md` erzeugt (`tools/demo_erstellung.js`), nicht von Hand ändern.', '');
  zeilen.push('## Bauteile', '');
  zeilen.push(`| ${SPALTEN.join(' | ')} |`);
  zeilen.push(`|${SPALTEN.map(() => '---').join('|')}|`);
  zeilen.push(zeile({ Bauteil: '**Einheit**', Gruppe: '', 'Typ/Charakteristik': '', Fehlerstrom: 'mA', Nennstrom: 'A', 'Max. Querschnitt': 'mm²', Pole: '', Selektiv: '', Abklemmen: '', 'Anzahl LS': '', tA: 'ms', IA: 'mA', UB: 'V' }));
  zeilen.push(zeile({ Bauteil: 'Hauptschalter', Nennstrom: anf.hsA, 'Max. Querschnitt': Math.max(16, qHS), Pole: anf.hsPole }));
  const klemmen = hs3 ? ['L1-Klemme', 'L2-Klemme', 'L3-Klemme', 'N-Klemme', 'PE-Klemme'] : ['PE-Klemme'];
  for (const k of klemmen) zeilen.push(zeile({ Bauteil: k, Nennstrom: 63, 'Max. Querschnitt': 16 }));

  for (const info of gruppenInfo) {
    const g = info.gruppe;
    if (info.rcdName) {
      zeilen.push(zeile({
        Bauteil: info.rcdName, Gruppe: g.id, 'Typ/Charakteristik': g.typ, Fehlerstrom: g.fehlerstrom,
        Nennstrom: g.nennstrom, 'Max. Querschnitt': 16, Pole: g.rcdPole, Selektiv: g.selektiv, Abklemmen: g.abklemmen,
        'Anzahl LS': info.sks.length, tA: 22, IA: Math.round(g.fehlerstrom * 0.6), UB: 1
      }));
    }
    for (const s of info.sks) {
      zeilen.push(zeile({ Bauteil: `LS${s.nr}`, Gruppe: g.id, 'Typ/Charakteristik': s.lsChar, Nennstrom: s.lsA, 'Max. Querschnitt': 16, Pole: s.lsPole }));
    }
  }
  for (const s of sks) {
    for (const rk of s.reihenklemmen) {
      zeilen.push(zeile({ Bauteil: rk, Nennstrom: 16, 'Max. Querschnitt': naechsterKlemmenQuerschnitt(s.q), Pole: 1 }));
    }
  }

  zeilen.push('', '## Stromkreise', '');
  zeilen.push('| Stromkreis | Ziel | Endstelle | Messungen (zi/zs/rcd) |', '|---|---|---|---|');
  for (const s of sks) zeilen.push(`| ${s.name} | ${s.ziel} | ${s.endstelle} | ${s.zi} / ${s.zs} / ${s.rcd} |`);

  zeilen.push('', '## Steckdosen (Platzierung)', '');
  zeilen.push('Raster für die Anordnung der Steckdosen/Anschlussdosen oberhalb des Schaltkastens.', '');
  const reihen = Math.max(...sks.map((s) => s.dosen));
  zeilen.push(`|         | ${sks.map((_, i) => `Spalte ${i + 1}`).join(' | ')} |`);
  zeilen.push(`|---------|${sks.map(() => '----------').join('|')}|`);
  for (let r = 0; r < reihen; r++) {
    zeilen.push(`| Reihe ${r + 1} | ${sks.map((s) => (r < s.dosen ? s.name : '–')).join(' | ')} |`);
  }

  zeilen.push('', '## Anlage (Kopfdaten)', '');
  zeilen.push('| Feld | Wert | Einheit |', '|---|---|---|');
  zeilen.push(`| Name | ${anf.name} | – |`);
  zeilen.push(`| Beschreibung | ${anf.beschreibung} | – |`);
  zeilen.push(`| Netzform | ${anf.netzform} | – |`);
  zeilen.push('| Spannung Einspeisung | 400 | V |');
  zeilen.push(`| Spannung Stromkreise | ${sks.some((s) => s.lsPole === 3) ? 400 : 230} | V |`);
  return zeilen.join('\n') + '\n';
}

// --- Gesamtablauf ---

// Erzeugt netzplan.md, bauteile.md, anlage.json und graph.json in `ordner` (ohne Browser).
function erzeugeModell(anforderungText, ordner, demoName) {
  const anf = parseAnforderung(anforderungText);
  const fehler = pruefeAnforderung(anf);
  if (fehler.length > 0) return { fehler };

  const modell = baueModell(anf);
  fs.mkdirSync(ordner, { recursive: true });
  fs.writeFileSync(path.join(ordner, 'netzplan.md'), schreibeNetzplan(anf, modell, demoName));
  fs.writeFileSync(path.join(ordner, 'bauteile.md'), schreibeBauteile(anf, modell));

  const anlage = generator.generiereAnlage(ordner);
  const graph = generator.generiereGraph(ordner);
  fs.writeFileSync(path.join(ordner, 'anlage.json'), JSON.stringify(anlage, null, 2));
  fs.writeFileSync(path.join(ordner, 'graph.json'), JSON.stringify(graph, null, 2));
  return { fehler: [], anf, modell, anlage, graph };
}

function fuehreNode(argumente) {
  const ergebnis = spawnSync(process.execPath, argumente, { cwd: PROJEKT_ROOT, stdio: 'inherit' });
  return ergebnis.status === 0;
}

function main() {
  const demo = process.argv[2];
  const flags = process.argv.slice(3);
  if (!demo) {
    console.error('Aufruf: node tools/demo_erstellung.js <demo> [--neu | --nur-modell]');
    console.error('Beispiel: node tools/demo_erstellung.js demo_02 --neu');
    process.exit(1);
  }
  const ordner = path.join(DEMOS_ORDNER, demo);
  const anforderungPfad = path.join(ordner, 'anforderung.md');

  if (flags.includes('--neu')) {
    if (fs.existsSync(anforderungPfad)) {
      console.error(`${anforderungPfad} existiert schon, nichts überschrieben.`);
      process.exit(1);
    }
    fs.mkdirSync(ordner, { recursive: true });
    const vorlage = fs.readFileSync(VORLAGE, 'utf8').replace('demo_NN', demo);
    fs.writeFileSync(anforderungPfad, vorlage);
    console.log(`Angelegt: ${anforderungPfad}\nWerte anpassen, dann: node tools/demo_erstellung.js ${demo}`);
    return;
  }

  if (!fs.existsSync(anforderungPfad)) {
    console.error(`Keine Anforderung gefunden: ${anforderungPfad} (anlegen mit --neu)`);
    process.exit(1);
  }

  const ergebnis = erzeugeModell(fs.readFileSync(anforderungPfad, 'utf8'), ordner, demo);
  if (ergebnis.fehler.length > 0) {
    console.error(`Anforderung ${demo} ist nicht in Ordnung:`);
    ergebnis.fehler.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`Geschrieben: netzplan.md, bauteile.md, anlage.json, graph.json in ${ordner}`);
  if (flags.includes('--nur-modell')) return;

  // Die Werkzeuge in tools/ erwarten den Pfad relativ zu tests/visuell/.
  const werkzeugName = path.relative(path.join(PROJEKT_ROOT, 'tests', 'visuell'), ordner).replace(/\\/g, '/');
  const schritte = [
    ['Verdrahtungsprüfung (alle Stromkreise und Phasen)', ['tools/pfad_zur_einspeisung.js', werkzeugName, '--alle']],
    ['Fahrplan und Prüfprotokoll', ['tools/pruefprotokoll_erstellung.js', werkzeugName]],
    ['Fahrplan-Beschreibung', ['tools/fahrplan_beschreibung.js', werkzeugName]]
  ];
  for (const [titel, argumente] of schritte) {
    console.log(`\n== ${titel} ==`);
    if (!fuehreNode(argumente)) {
      console.error(`Schritt "${titel}" ist fehlgeschlagen.`);
      process.exit(1);
    }
  }
  console.log(`\nFertig. Ansehen: http://localhost:3000/?anlage=demos/${demo}/anlage.json (npx serve)`);
}

module.exports = { parseAnforderung, pruefeAnforderung, erzeugeModell, ERLAUBT };

if (require.main === module) main();
