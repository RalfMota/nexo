/* NEXO — Inicialização */

import { applySettings, onSaveProblem } from './core/state.js';
import { migrateSavedLogs } from './core/research-log.js';
import { onLogProblem } from './core/log-store.js';
import { showToast } from './ui/toast.js';
import { initCaptions } from './ui/captions.js';
import { showProfiles } from './ui/profile-screen.js';
import { initMusic } from './core/music.js';
import { initCloudSync } from './core/cloud.js';

/** As fontes precisam estar carregadas antes de pintar as placas do mapa. */
function waitForFonts(timeout = 1500) {
  if (!document.fonts) return Promise.resolve();
  const loads = ['700 12px "Fredoka"', '600 12px "Lexend"'].map((font) => document.fonts.load(font));
  return Promise.race([Promise.allSettled(loads), new Promise((resolve) => setTimeout(resolve, timeout))]);
}

// Problemas de armazenamento aparecem na tela (antes, o jogo seguia sem salvar e sem avisar)
onSaveProblem((message) => showToast('Atenção:', message, 12000));
onLogProblem((message) => showToast('Modo Pesquisa:', message, 12000));

applySettings();
initCaptions();
migrateSavedLogs();
initMusic();
initCloudSync();
waitForFonts().then(showProfiles);
