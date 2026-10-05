/* NEXO — Inicialização */

import { applySettings } from './core/state.js';
import { showTitle } from './ui/title-screen.js';
import { initMusic } from './core/music.js';

/** As fontes precisam estar carregadas antes de pintar as placas do mapa. */
function waitForFonts(timeout = 1500) {
  if (!document.fonts) return Promise.resolve();
  const loads = ['700 12px "Pixelify Sans"', '600 12px "Lexend"'].map((font) => document.fonts.load(font));
  return Promise.race([Promise.allSettled(loads), new Promise((resolve) => setTimeout(resolve, timeout))]);
}

applySettings();
initMusic();
waitForFonts().then(showTitle);
