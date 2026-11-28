const ADER_FARBEN = {
  schwarz: '#111111',
  blau: '#2563eb',
  braun: '#8b4513',
  grau: '#9ca3af',
  rot: '#dc2626',
  gelb: '#facc15',
  'grün': '#22aa33',
  gruen: '#22aa33',
  'weiß': '#f8fafc',
  weiss: '#f8fafc'
};

const RAND_PX = 8;
const ABSTAND_PX = 14;

let element = null;

function element_holen() {
  if (!element) {
    element = document.createElement('div');
    element.className = 'popup';
    document.body.appendChild(element);
    document.addEventListener('click', (ev) => {
      if (ev.target !== element && !element.contains(ev.target)) {
        Popup.verstecke();
      }
    });
  }
  return element;
}

function erstelleAderZeile({ querschnitt, farbe }) {
  const zeile = document.createElement('div');
  zeile.className = 'popup-zeile';

  const punkt = document.createElement('span');
  punkt.className = 'popup-punkt';
  const norm = (farbe ?? '').trim().toLowerCase();
  if (norm === 'gn-ge' || norm === 'grün-gelb' || norm === 'gruen-gelb') {
    punkt.classList.add('popup-punkt-gnge');
  } else {
    punkt.style.backgroundColor = ADER_FARBEN[norm] ?? '#888888';
  }

  const text = document.createElement('span');
  text.textContent = `${querschnitt} · ${farbe}`;

  zeile.append(punkt, text);
  return zeile;
}

export const Popup = {
  // `weitere`: zusätzliche { querschnitt, farbe }-Paare für Schrauben mit
  // mehr als einer Ader (z.B. ein RCD-Ausgang, der zwei Stromkreise
  // gleichzeitig speist, siehe generate_anlage.js baueLeitung()).
  zeige({ querschnitt, farbe, weitere }, x, y) {
    const el = element_holen();
    const eintraege = [{ querschnitt, farbe }, ...(weitere ?? [])];
    el.replaceChildren(...eintraege.map(erstelleAderZeile));

    const vv = window.visualViewport;
    const scale = vv?.scale || 1;
    const rand = RAND_PX / scale;
    const vvLeft = vv?.offsetLeft ?? 0;
    const vvTop = vv?.offsetTop ?? 0;
    const vvWidth = vv?.width ?? window.innerWidth;
    const vvHeight = vv?.height ?? window.innerHeight;

    // Maximale Außenbreite vor dem Messen aus visualViewport ableiten, damit
    // das Popup auch bei starkem Handy-Zoom (z.B. 3x) sauber umbricht und
    // innerhalb des sichtbaren Ausschnitts bleibt.
    el.style.maxWidth = `${Math.max(0, Math.floor(vvWidth - 2 * rand))}px`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.display = 'block';

    const rect = el.getBoundingClientRect();
    const minLeft = vvLeft + rand;
    const maxLeft = Math.max(minLeft, vvLeft + vvWidth - rect.width - rand);
    const left = Math.min(Math.max(x - rect.width / 2, minLeft), maxLeft);

    const minTop = vvTop + rand;
    const maxTop = Math.max(minTop, vvTop + vvHeight - rect.height - rand);
    let top = y - rect.height - ABSTAND_PX;
    if (top < minTop) top = y + ABSTAND_PX;
    top = Math.min(Math.max(top, minTop), maxTop);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  },
  verstecke() {
    if (element) {
      element.style.display = 'none';
    }
  }
};
