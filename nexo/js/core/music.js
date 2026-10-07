/* NEXO — Trilha sonora em sequência
 *
 * As faixas tocam uma depois da outra e, ao fim da lista, recomeçam. Na troca, a faixa que
 * termina vai sumindo enquanto a próxima entra em fade-in (crossfade). Os navegadores só
 * deixam tocar som depois de um gesto do jogador; por isso a trilha começa no primeiro
 * clique, toque ou tecla. Ela pausa quando a aba fica escondida e volta quando o jogador
 * retorna. Ligar/desligar e volume ficam salvos nas opções.
 */

import { state, saveState } from './state.js';

const TRACKS = [
  'trilha.mp4',
  'maple-square [usesuno.com].mp3',
  'crystal-floorplan [usesuno.com].mp3',
  'lantern-save-point [usesuno.com].mp3',
  'dungeon-light [usesuno.com].mp3',
  'maple-square [usesuno.com](1).mp3',
  'crystal-floorplan [usesuno.com](1).mp3',
  'noctune [usesuno.com].mp3',
].map((file) => `audio/${encodeURIComponent(file)}`);

const DEFAULT_VOLUME = 0.45;
const FADE_SECONDS = 4;
const TICK_MS = 50;

/** Faixas tocando agora: cada uma com seu ganho de fade (0 a 1) e para onde ele vai. */
let voices = [];
let trackIndex = 0;
let unlocked = false;
let timer = null;

const musicOn = () => state.set.music ?? true;
const volume = () => state.set.volume ?? DEFAULT_VOLUME;

function applyVolume(voice) {
  voice.audio.volume = Math.max(0, Math.min(1, voice.gain * volume()));
}

/** Começa a faixa de índice `index`; com fade-in se já havia outra tocando. */
function startTrack(index, fadeIn) {
  trackIndex = index % TRACKS.length;
  const audio = new Audio(TRACKS[trackIndex]);
  audio.preload = 'auto';
  const voice = { audio, gain: fadeIn ? 0 : 1, target: 1, handedOff: false };
  applyVolume(voice);
  // Faixa com problema (arquivo ausente ou formato não suportado): pula para a próxima
  audio.addEventListener('error', () => handOff(voice, false), { once: true });
  // Garantia caso a faixa acabe antes do crossfade (ex.: aba voltou no fim da música)
  audio.addEventListener('ended', () => handOff(voice, false), { once: true });
  voices.push(voice);
  audio.play().catch(() => {
    // Ainda sem gesto do jogador: tenta de novo no próximo clique ou tecla
    unlocked = false;
  });
  ensureTimer();
}

/** Passa a vez para a próxima faixa; a atual sai em fade-out (ou para na hora). */
function handOff(voice, fade) {
  if (voice.handedOff) return;
  voice.handedOff = true;
  voice.target = 0;
  if (!fade) voice.gain = 0;
  startTrack(trackIndex + 1, true);
}

function tick() {
  const step = TICK_MS / 1000 / FADE_SECONDS;
  for (const voice of voices) {
    const { audio } = voice;
    // Perto do fim: dispara o crossfade para a próxima faixa
    if (!voice.handedOff && audio.duration && audio.duration - audio.currentTime <= FADE_SECONDS) handOff(voice, true);
    if (voice.gain < voice.target) voice.gain = Math.min(voice.target, voice.gain + step);
    else if (voice.gain > voice.target) voice.gain = Math.max(voice.target, voice.gain - step);
    applyVolume(voice);
  }
  // Remove as faixas que já sumiram
  voices = voices.filter((voice) => {
    if (voice.target === 0 && voice.gain === 0) {
      voice.audio.pause();
      voice.audio.removeAttribute('src');
      return false;
    }
    return true;
  });
  if (!voices.length) stopTimer();
}

function ensureTimer() {
  if (!timer) timer = setInterval(tick, TICK_MS);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function play() {
  if (!musicOn() || document.hidden) return;
  if (!voices.length) {
    startTrack(trackIndex, true);
    return;
  }
  for (const voice of voices) {
    voice.audio.play().catch(() => {
      unlocked = false;
    });
  }
  ensureTimer();
}

function pause() {
  for (const voice of voices) voice.audio.pause();
  stopTimer();
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
    if (document.hidden) pause();
    else if (unlocked) play();
  });
}

export function setMusicEnabled(enabled) {
  state.set.music = enabled;
  saveState();
  if (enabled) play();
  else pause();
}

export function setMusicVolume(value) {
  state.set.volume = value;
  saveState();
  voices.forEach(applyVolume);
}

export const musicSettings = () => ({ on: musicOn(), volume: volume() });
