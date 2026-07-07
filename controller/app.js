import { Anlage } from '../model/anlage.js';
import { SchaltkastenView } from '../view/schaltkasten.js';
import { Popup } from '../view/popup.js';

async function start() {
  const container = document.getElementById('schaltkasten');
  const pfad = new URLSearchParams(window.location.search).get('anlage') ?? 'anlagen/beispiel_eg.json';
  const anlage = await Anlage.laden(pfad);

  SchaltkastenView.render(anlage, container, (ader, x, y) => {
    Popup.zeige({
      querschnitt: `${ader.querschnitt_mm2} mm²`,
      farbe: ader.farbe
    }, x, y);
  });
}

start();
