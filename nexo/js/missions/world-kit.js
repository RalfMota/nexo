/* NEXO — Peças comuns das missões no mundo: etiquetas, alavancas e mostradores
 *
 * Mostrador: um painel com o número e duas setas (▼ à esquerda, ▲ à direita). Cada seta
 * é um ponto de interação próprio; segurar E faz o número girar depressa.
 */

import { addQuestObject, removeQuestObject, playAction, burst } from '../world/quest-layer.js';
import { drawLever, drawDialPanel } from '../art/mission-props.js';

export const TILE = 32;

/** Centro de um bloco do mapa, na altura dos "pés" (onde o objeto encosta no chão). */
export const tileFoot = (tx, ty) => ({ x: tx * TILE + 16, y: ty * TILE + 28 });

/** Etiqueta com texto curto, sempre legível sobre o mapa. */
export function drawTag(ctx, x, y, text, { fill = '#fbf3df', ink = '#2b1d14' } = {}) {
  ctx.font = '700 8px "Fredoka", sans-serif';
  const width = Math.ceil(ctx.measureText(text).width) + 8;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - 6);
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(left - 1, top - 1, width + 2, 12);
  ctx.fillStyle = fill;
  ctx.fillRect(left, top, width, 10);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.round(x), top + 5.5);
}

/** Seta amarela pulando sobre um ponto (indica para onde levar algo). */
export function drawArrow(ctx, x, y, t) {
  const bob = Math.round(Math.sin(t * 5) * 2);
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(x - 5, y - 9 + bob, 10, 8);
  ctx.fillRect(x - 8, y - 2 + bob, 16, 2);
  ctx.fillRect(x - 6, y + bob, 12, 2);
  ctx.fillRect(x - 4, y + 2 + bob, 8, 2);
  ctx.fillRect(x - 2, y + 4 + bob, 4, 2);
  ctx.fillStyle = '#ffd84a';
  ctx.fillRect(x - 4, y - 8 + bob, 8, 7);
  ctx.fillRect(x - 6, y - 1 + bob, 12, 1);
  ctx.fillRect(x - 4, y + 1 + bob, 8, 1);
  ctx.fillRect(x - 2, y + 3 + bob, 4, 1);
}

/**
 * Alavanca no mapa. Puxa (animação curta) e chama `onPull`.
 * @returns {{ remove: () => void }}
 */
export function addLever({ id, x, y, label, color = '#c2453b', onPull, enabled, visible }) {
  let pulledUntil = 0;
  let clock = 0;
  const shown = () => (visible ? visible() : true);
  addQuestObject({
    id,
    x,
    y,
    reach: 30,
    label,
    visible: visible ? shown : undefined,
    enabled: () => shown() && (!enabled || enabled()),
    draw: (ctx, t) => {
      clock = t;
      if (shown()) drawLever(ctx, x, y, t < pulledUntil, color);
    },
    onInteract: () => {
      pulledUntil = clock + 0.35;
      playAction('use');
      onPull();
    },
  });
  return { remove: () => removeQuestObject(id) };
}

/**
 * Mostrador com setas.
 * @returns {{ get: () => number, set: (v: number) => void, remove: () => void }}
 */
export function addDial({ id, x, y, label, min = 0, max = 60, value = 0, visible, caption }) {
  let current = value;
  let flash = null;
  let flashUntil = 0;
  let clock = 0;
  const shown = () => (visible ? visible() : true);
  const change = (delta, side) => {
    current = Math.max(min, Math.min(max, current + delta));
    flash = side;
    flashUntil = clock + 0.15;
    burst(x + (side === 'up' ? 15 : -15), y - 16, 'sparkle', 2);
  };
  addQuestObject({
    id: `${id}-down`,
    x: x - 15,
    y: y + 2,
    reach: 20,
    label: `${label}: diminuir`,
    visible: visible ? shown : undefined,
    enabled: shown,
    draw: (ctx, t) => {
      clock = t;
      if (!shown()) return;
      drawDialPanel(ctx, x, y, current, { highlight: t < flashUntil ? flash : null });
      if (caption) drawTag(ctx, x, y - 34, caption);
    },
    onInteract: () => change(-1, 'down'),
  });
  addQuestObject({
    id: `${id}-up`,
    x: x + 15,
    y: y + 2,
    reach: 20,
    label: `${label}: aumentar`,
    enabled: shown,
    draw: () => {},
    onInteract: () => change(1, 'up'),
  });
  return {
    get: () => current,
    set: (v) => {
      current = v;
    },
    remove: () => {
      removeQuestObject(`${id}-down`);
      removeQuestObject(`${id}-up`);
    },
  };
}
