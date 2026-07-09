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

export const Popup = {
  // `weitere`: zusätzliche { querschnitt, farbe }-Paare für Schrauben mit
  // mehr als einer Ader (z.B. ein RCD-Ausgang, der zwei Stromkreise
  // gleichzeitig speist, siehe generate_anlage.js baueLeitung()).
  zeige({ querschnitt, farbe, weitere }, x, y) {
    const el = element_holen();
    const zeilen = [`${querschnitt} · ${farbe}`, ...(weitere ?? []).map((w) => `${w.querschnitt} · ${w.farbe}`)];
    el.textContent = zeilen.join(' | ');
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'block';
  },
  verstecke() {
    if (element) {
      element.style.display = 'none';
    }
  }
};
