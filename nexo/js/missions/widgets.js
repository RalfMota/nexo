/* NEXO — Peças compartilhadas pelas missões: cena animada, registro e fundos */

import { setupCanvas, escapeHtml } from '../core/dom.js';
import { prefersCalm } from '../core/state.js';
import { approach } from '../art/shapes.js';

/**
 * Anima um canvas de cena enquanto a missão estiver aberta.
 * draw(ctx, t, dt) é chamado a cada quadro com a área já limpa.
 */
export function createScene(canvas, width, height, draw, api) {
  const ctx = setupCanvas(canvas, width, height);
  canvas.style.aspectRatio = `${width} / ${height}`;
  let frameId = 0;
  let last = 0;
  let t = 0;
  const loop = (now) => {
    frameId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    t += dt;
    ctx.clearRect(0, 0, width, height);
    draw(ctx, t, dt);
  };
  frameId = requestAnimationFrame(loop);
  api.onCleanup(() => cancelAnimationFrame(frameId));
}

/** Aproxima valores animados; com "reduzir animações" a mudança é imediata. */
export const tween = (current, target, dt, speed = 6) => (prefersCalm() ? target : approach(current, target, dt, speed));

/**
 * Tabela do Registro técnico. A última linha recebe destaque.
 * Cada célula pode ser um valor ou { value, tone: 'good'|'bad' }.
 */
export function registerTable(headers, rows, caption = 'Registro técnico') {
  const cell = (item) =>
    item && typeof item === 'object'
      ? `<td class="${item.tone ?? ''}">${escapeHtml(item.value)}</td>`
      : `<td>${escapeHtml(item)}</td>`;
  const body = rows.length
    ? rows.map((row, index) => `<tr class="${index === rows.length - 1 ? 'is-new' : ''}">${row.map(cell).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="muted">Ainda sem registros.</td></tr>`;
  return `<table class="ledger"><caption>${escapeHtml(caption)}</caption>
    <thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody></table>`;
}

/* ---------- Fundos de cena ---------- */

export function paintSky(ctx, width, height, top = '#9fd8ff', bottom = '#e8f6ff') {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function paintGround(ctx, width, height, y, color = '#7cc35a') {
  ctx.fillStyle = color;
  ctx.fillRect(0, y, width, height - y);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  for (let x = 0; x < width; x += 22) ctx.fillRect(x + ((x / 22) % 2) * 8, y + 6, 3, 2);
}

/** Painel escuro de fundo (máquinas, oficina, torre). */
export function paintPanel(ctx, x, y, width, height, color = '#2a2440') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}
