/* NEXO — Camada das missões no mundo
 *
 * Missões "de mundo" não abrem janela: elas colocam objetos no mapa (sacos, canteiros,
 * máquinas, portas), e o jogador resolve tudo andando, pegando, levando e usando.
 * Este módulo guarda esses objetos e os efeitos que acompanham as ações:
 *   - o que o jogador carrega (desenhado acima da cabeça, com a pose de carregar);
 *   - as ações do jogador (levantar, cavar, colher, manusear), tocadas pelo animador;
 *   - partículas (brilhos, estrelas) e o balão de fala de um personagem.
 */

import { prefersCalm } from '../core/state.js';

const objects = new Map();
const particles = [];
let carried = null;
let actionPlayer = null; // função do mundo que toca um clipe no animador do jogador
let bubble = null; // { x, y, text, until }
let clock = 0;

/* ---------- Objetos ---------- */

/**
 * Coloca um objeto da missão no mapa.
 * @param {{ id: string, x: number, y: number, reach?: number, label: string,
 *           draw: (ctx: CanvasRenderingContext2D, t: number) => void,
 *           onInteract: () => void, enabled?: () => boolean }} object
 *   (x, y) é o ponto de interação (os "pés" do objeto, em pixels do mundo).
 */
export function addQuestObject(object) {
  objects.set(object.id, object);
}

export function removeQuestObject(id) {
  objects.delete(id);
}

export function clearQuestLayer() {
  objects.clear();
  particles.length = 0;
  carried = null;
  bubble = null;
}

/** Objetos que aceitam interação agora (lidos pelo mundo para o "E" e o toque). */
export function questInteractables() {
  return [...objects.values()]
    .filter((object) => !object.enabled || object.enabled())
    .map((object) => ({ kind: 'quest', object, x: object.x, y: object.y, reach: object.reach ?? 46, promptY: object.promptY }));
}

export const questObjects = () => [...objects.values()];

/* ---------- O que o jogador carrega e a pose de ação ---------- */

/**
 * Muda o que o jogador segura. Pegar algo com as mãos vazias toca a animação de levantar.
 * @param {null | { draw: (ctx, t) => void, label: string }} item
 */
export function setCarried(item) {
  if (item && !carried) actionPlayer?.('lift');
  carried = item;
}

export const getCarried = () => carried;

/** O mundo registra aqui quem toca as animações do jogador. */
export function setActionPlayer(play) {
  actionPlayer = play;
}

/**
 * Animação de ação do jogador: 'dig' (cavar), 'harvest' (agachar até o chão),
 * 'use' (mexer em algo à frente) ou 'lift' (pegar e erguer). "crouch" é sinônimo de "harvest".
 */
export function playAction(name = 'harvest') {
  actionPlayer?.(name === 'crouch' ? 'harvest' : name);
}

/* ---------- Efeitos ---------- */

const BURSTS = {
  sparkle: ['#fff3a8', '#7ff0e0', '#ffffff'],
  success: ['#ffd84a', '#7ff0e0', '#ff9fc0', '#b89cff', '#ffffff'],
  dust: ['#c9a26b', '#a57f4b', '#e6c891'],
  grass: ['#93c74a', '#5a8d2c', '#c2e070'],
  soil: ['#8a5634', '#6e4226', '#a06a40'],
};

/** Passo: um pouquinho de poeira, terra ou grama, conforme o chão. */
export function footstep(x, y, ground) {
  if (prefersCalm()) return;
  const kind = ground === 'grass' ? 'grass' : ground === 'soil' ? 'soil' : 'dust';
  const colors = BURSTS[kind];
  for (let i = 0; i < 3; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y - 1,
      vx: (Math.random() - 0.5) * 24,
      vy: -12 - Math.random() * 18,
      life: 0,
      max: 0.3 + Math.random() * 0.2,
      color: colors[i % colors.length],
      size: 1,
    });
  }
}

/** Explosão de partículas em (x, y). */
export function burst(x, y, kind = 'sparkle', count = 14) {
  if (prefersCalm()) count = Math.min(count, 4);
  const colors = BURSTS[kind] ?? BURSTS.sparkle;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = kind === 'dust' ? 20 + Math.random() * 25 : 40 + Math.random() * 70;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === 'dust' ? 10 : 60),
      life: 0,
      max: 0.6 + Math.random() * 0.5,
      color: colors[i % colors.length],
      star: kind === 'success' && i % 3 === 0,
    });
  }
}

/** Balão de fala sobre um ponto do mundo (cabeça de um personagem). */
export function showBubble(x, y, text, seconds = 6) {
  bubble = { x, y, text, until: clock + seconds };
}

export function updateQuestLayer(dt) {
  clock += dt;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    p.vy += 160 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life > p.max) particles.splice(i, 1);
  }
  if (bubble && clock > bubble.until) bubble = null;
}

/* ---------- Desenho ---------- */

export function drawQuestObjects(ctx, t) {
  for (const object of objects.values()) object.draw(ctx, t);
}

/** Item carregado, acima da cabeça do jogador (só com os braços erguidos). */
export function drawCarried(ctx, x, footY, t, { arms = 'raised', lift = 0, scaleY = 1 } = {}) {
  if (!carried || arms !== 'raised') return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(footY - lift - 58 * scaleY + Math.sin(t * 6) * 0.6));
  carried.draw(ctx, t);
  ctx.restore();
}

export function drawEffects(ctx) {
  for (const p of particles) {
    const alpha = 1 - p.life / p.max;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    if (p.star) {
      ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y), 5, 1);
      ctx.fillRect(Math.round(p.x), Math.round(p.y) - 2, 1, 5);
    } else {
      const size = p.size ?? 2;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }
  ctx.globalAlpha = 1;
  if (bubble) drawBubble(ctx, bubble);
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawBubble(ctx, { x, y, text }) {
  ctx.font = '500 7px "Lexend", sans-serif';
  const lines = wrap(ctx, text, 150);
  const width = Math.min(160, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 14);
  const height = lines.length * 9 + 9;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - height - 8);
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = '#fbf3df';
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = '#e2cf9f';
  ctx.fillRect(left, top + height - 2, width, 2);
  // Ponta do balão
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(Math.round(x) - 3, top + height + 1, 7, 1);
  ctx.fillRect(Math.round(x) - 2, top + height + 2, 5, 1);
  ctx.fillRect(Math.round(x) - 1, top + height + 3, 3, 2);
  ctx.fillStyle = '#fbf3df';
  ctx.fillRect(Math.round(x) - 2, top + height, 5, 1);
  ctx.fillRect(Math.round(x) - 1, top + height + 1, 3, 1);
  ctx.fillStyle = '#2b1d14';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, left + 7, top + 5 + i * 9));
}
