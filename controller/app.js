import { Anlage } from '../model/anlage.js';
import { SchaltkastenView } from '../view/schaltkasten.js';
import { MessgeraetView } from '../view/messgeraet.js';
import { Popup } from '../view/popup.js';

async function start() {
  const container = document.getElementById('schaltkasten');
  const pfad = new URLSearchParams(window.location.search).get('anlage') ?? 'anlagen/beispiel_eg.json';
  const anlage = await Anlage.laden(pfad);

  const schaltkastenSvg = SchaltkastenView.render(anlage, container, (ader, x, y) => {
    Popup.zeige({
      querschnitt: `${ader.querschnitt_mm2} mm²`,
      farbe: ader.farbe
    }, x, y);
  });

  // Box wird auf die tatsächlich gerenderte Schaltkasten-Breite gesetzt, damit
  // das (schmalere) Messgerät mittig darunter erscheint, ohne die Breite hier
  // zu duplizieren.
  const messgeraetContainer = document.getElementById('messgeraet');
  messgeraetContainer.style.width = `${schaltkastenSvg.getAttribute('width')}px`;

  // Gerät startet aus. TEST-Taste/Messpunkte-Anlegen folgen noch.
  let messgeraetZustand = MessgeraetView.zustandFuerFunktion('RLOW', false);
  // Menü-Navigation über die ◄►-Taste: wandert durch Zone 1 (Titel + die
  // Werte aus titelWerte), das ausgewählte Feld wird invers dargestellt.
  // Index 0 = Titel (Default), Index i+1 = titelWerte[i]. Lebt getrennt von
  // messgeraetZustand, da zustandFuerFunktion() bei jedem Drehknopf-/ON-OFF-
  // Klick einen frischen Zustand baut - die Auswahl soll dabei auf den
  // Default (Titel) zurückgesetzt werden.
  let zone1Auswahl = 0;

  function renderMessgeraet() {
    MessgeraetView.render(messgeraetContainer, { ...messgeraetZustand, zone1Auswahl }, {
      onOff: () => {
        messgeraetZustand = MessgeraetView.zustandFuerFunktion(messgeraetZustand.funktion, !messgeraetZustand.an);
        zone1Auswahl = 0;
        renderMessgeraet();
      },
      drehknopf: () => {
        const naechste = MessgeraetView.naechsteFunktion(messgeraetZustand.funktion);
        messgeraetZustand = MessgeraetView.zustandFuerFunktion(naechste, messgeraetZustand.an);
        zone1Auswahl = 0;
        renderMessgeraet();
      },
      seite: () => {
        const anzahlFelder = 1 + messgeraetZustand.titelWerte.length;
        zone1Auswahl = (zone1Auswahl + 1) % anzahlFelder;
        renderMessgeraet();
      }
    });
  }
  renderMessgeraet();
}

start();
