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
  zeige({ querschnitt, farbe }, x, y) {
    const el = element_holen();
    el.textContent = `${querschnitt} · ${farbe}`;
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
