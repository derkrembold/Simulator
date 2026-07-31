// Entwickler-Skill (User-Vorgabe, 2026-07-31): dünner Recorder-Wrapper um
// tools/messgeraet_steuerung.js - zeichnet jeden Funktionsaufruf (außer
// starteTestUmgebung, dessen Rückgabewert ein Playwright-`page`-Handle
// enthält und nicht sinnvoll serialisierbar ist) inkl. Argumente und
// Rückgabewert auf. Wird von tools/pruefprotokoll_erstellung.js genutzt,
// damit der Fahrplan (siehe ARCHITEKTUR.md "Fahrplan-Erstellung (Konzept)")
// als Nebenprodukt der echten Messungen entsteht, statt gesondert
// nachgebaut zu werden.
//
// Format (ein JSON-Aktionsprotokoll, siehe ARCHITEKTUR.md):
//   { anlage, abschnitte: [{ titel, begruendung, schritte: [{funktion, argumente, ergebnis}] }] }
//
// `titel`/`begruendung` kommen NICHT automatisch aus den Aufrufen selbst,
// sondern werden von der aufrufenden Logik über abschnittBeginnen()
// mitgegeben - das ist der pädagogische Teil, der sich nicht aus reinen
// Funktionsaufrufen ableiten lässt.
function erstelleRekorder(basisModul) {
  const abschnitte = [];
  let aktuelleSchritte = null;

  function abschnittBeginnen(titel, begruendung) {
    aktuelleSchritte = [];
    abschnitte.push({ titel, begruendung, schritte: aktuelleSchritte });
  }

  function abschnittEnde() {
    aktuelleSchritte = null;
  }

  function alsJson(anlage) {
    return { anlage, abschnitte };
  }

  const rekorder = { abschnittBeginnen, abschnittEnde, alsJson };
  for (const [name, fn] of Object.entries(basisModul)) {
    if (typeof fn !== 'function' || name === 'starteTestUmgebung') {
      rekorder[name] = fn;
      continue;
    }
    rekorder[name] = async (ctx, ...argumente) => {
      const ergebnis = await fn(ctx, ...argumente);
      if (aktuelleSchritte) aktuelleSchritte.push({ funktion: name, argumente, ergebnis: ergebnis ?? null });
      return ergebnis;
    };
  }
  return rekorder;
}

module.exports = { erstelleRekorder };
