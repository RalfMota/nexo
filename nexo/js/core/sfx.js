/* NEXO — Efeitos sonoros, sintetizados no próprio navegador (Web Audio)
 *
 * Nenhum arquivo de áudio: cada som é montado na hora com osciladores e ruído, então não há
 * direitos autorais de terceiros nem download extra. Os sons acompanham os gestos e as
 * respostas do jogo (pegar, encaixar, alavanca, acerto, erro, vitória, porta).
 *
 * Opções do computador (state.set): sfx (liga/desliga), sfxVolume (0 a 1) e captions
 * (legendas dos sons: um aviso escrito aparece junto com cada som, para quem não ouve).
 */

import { state, saveState } from './state.js';

let context = null;
let master = null;
const captionListeners = new Set();

/** Legenda escrita de cada som (para quem joga sem som ou não ouve). */
const CAPTIONS = {
  pegar: 'pegou',
  usar: 'encaixou',
  cavar: 'cavou',
  alavanca: 'alavanca',
  acerto: 'acerto!',
  erro: 'não deu certo',
  vitoria: 'missão concluída!',
  porta: 'porta',
};

const sfxOn = () => state.set?.sfx !== false;
const sfxVolume = () => (typeof state.set?.sfxVolume === 'number' ? state.set.sfxVolume : 0.5);

function audio() {
  if (!context) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    context = new Context();
    master = context.createGain();
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  master.gain.value = sfxVolume() * 0.6;
  return context;
}

/** Uma nota com envelope curto (ataque rápido e queda exponencial). */
function tone(ctx, { freq, start = 0, length = 0.12, type = 'triangle', gain = 0.5, slide = null }) {
  const at = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, at + length);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(env).connect(master);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** Ruído filtrado curto (cavar, porta, alavanca). */
function noise(ctx, { start = 0, length = 0.15, freq = 800, gain = 0.3 }) {
  const at = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const env = ctx.createGain();
  env.gain.value = gain;
  source.connect(filter).connect(env).connect(master);
  source.start(at);
}

const SOUNDS = {
  pegar: (ctx) => {
    tone(ctx, { freq: 660, length: 0.07, gain: 0.25 });
    tone(ctx, { freq: 990, start: 0.05, length: 0.08, gain: 0.2 });
  },
  usar: (ctx) => tone(ctx, { freq: 220, length: 0.09, type: 'square', gain: 0.12, slide: 160 }),
  cavar: (ctx) => noise(ctx, { length: 0.18, freq: 400, gain: 0.35 }),
  alavanca: (ctx) => {
    noise(ctx, { length: 0.05, freq: 2400, gain: 0.25 });
    tone(ctx, { freq: 140, start: 0.03, length: 0.14, type: 'sine', gain: 0.35, slide: 90 });
  },
  acerto: (ctx) => [523, 659, 784].forEach((freq, i) => tone(ctx, { freq, start: i * 0.08, length: 0.18, gain: 0.28 })),
  erro: (ctx) => {
    tone(ctx, { freq: 330, length: 0.16, type: 'sine', gain: 0.25 });
    tone(ctx, { freq: 262, start: 0.14, length: 0.24, type: 'sine', gain: 0.25 });
  },
  vitoria: (ctx) => {
    [523, 659, 784, 1047].forEach((freq, i) => tone(ctx, { freq, start: i * 0.1, length: 0.22, gain: 0.26 }));
    tone(ctx, { freq: 784, start: 0.45, length: 0.5, type: 'sine', gain: 0.22 });
    tone(ctx, { freq: 1047, start: 0.45, length: 0.5, type: 'sine', gain: 0.18 });
  },
  porta: (ctx) => noise(ctx, { length: 0.35, freq: 600, gain: 0.2 }),
};

/** Toca um som pelo nome. Sem efeitos ligados (ou sem Web Audio), só a legenda aparece. */
export function playSfx(name) {
  if (state.set?.captions && CAPTIONS[name]) captionListeners.forEach((listener) => listener(CAPTIONS[name], name));
  if (!sfxOn() || !SOUNDS[name] || document.hidden) return;
  const ctx = audio();
  if (!ctx) return;
  try {
    SOUNDS[name](ctx);
  } catch {
    // Navegador sem suporte a algum nó de áudio: segue sem som
  }
}

/** A interface mostra as legendas dos sons (quando a opção está ligada). */
export function onSfxCaption(listener) {
  captionListeners.add(listener);
  return () => captionListeners.delete(listener);
}

export const sfxSettings = () => ({ on: sfxOn(), volume: sfxVolume(), captions: Boolean(state.set?.captions) });

export function setSfxEnabled(enabled) {
  state.set.sfx = enabled;
  saveState();
  if (enabled) playSfx('pegar');
}

export function setSfxVolume(value) {
  state.set.sfxVolume = value;
  saveState();
}

export function setCaptions(enabled) {
  state.set.captions = enabled;
  saveState();
}
