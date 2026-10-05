/* NEXO — Trilha sonora em loop
 *
 * Os navegadores só deixam tocar som depois de um gesto do jogador; por isso a trilha
 * começa no primeiro clique, toque ou tecla. Ela pausa quando a aba fica escondida e
 * volta quando o jogador retorna. Ligar/desligar e volume ficam salvos nas opções.
 */

import { state, saveState } from './state.js';

const TRACK = 'audio/trilha.mp4';
const DEFAULT_VOLUME = 0.45;

let audio = null;
let unlocked = false;

const musicOn = () => state.set.music ?? true;
const volume = () => state.set.volume ?? DEFAULT_VOLUME;

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio(TRACK);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = volume();
  return audio;
}

function play() {
  if (!musicOn() || document.hidden) return;
  ensureAudio().play().catch(() => {
    // Ainda sem gesto do jogador: tenta de novo no próximo clique ou tecla
    unlocked = false;
  });
}

/** Liga a trilha no primeiro gesto do jogador e acompanha a visibilidade da aba. */
export function initMusic() {
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    play();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (unlocked) play();
  });
}

export function setMusicEnabled(enabled) {
  state.set.music = enabled;
  saveState();
  if (enabled) play();
  else audio?.pause();
}

export function setMusicVolume(value) {
  state.set.volume = value;
  saveState();
  if (audio) audio.volume = value;
}

export const musicSettings = () => ({ on: musicOn(), volume: volume() });
