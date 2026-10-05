/* NEXO — Cenário vivo: o que se mexe no mapa
 *
 *   grama   tufos balançam com o vento; rajadas atravessam o mapa e a grama se afasta
 *           quando o jogador passa por cima
 *   água    ondas que correm, brilhos de reflexo e anéis de ondulação de vez em quando
 *   folhas  caem das árvores da borda das clareiras, balançando
 *   luz     raios de sol diagonais e um calor suave no alto da tela
 * Só o que está na tela é desenhado; tudo respeita "reduzir animações".
 */

import { TILE, MAP_W, MAP_H, ground } from './map.js';
import { hash } from '../art/shapes.js';
import { prefersCalm } from '../core/state.js';

const at = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? 'T' : ground[y][x]);

/* ---------- Grama ao vento ---------- */

/** Tufos fixos (posição sorteada uma vez por bloco de grama). */
const TUFTS = [];
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (ground[y][x] !== '.') continue;
    const count = hash(x, y, 300) > 0.35 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      TUFTS.push({
        x: x * TILE + 3 + Math.floor(hash(x, y, 301 + i) * 26),
        y: y * TILE + 8 + Math.floor(hash(x, y, 311 + i) * 22),
        h: 3 + Math.floor(hash(x, y, 321 + i) * 3),
        phase: hash(x, y, 331 + i) * 6,
      });
    }
  }
}

/** Vento num ponto: balanço contínuo + rajadas que viajam pelo mapa da esquerda para a direita. */
function wind(x, y, t) {
  const sway = Math.sin(t * 1.7 + x * 0.045 + y * 0.02) * 0.7;
  const gust = Math.max(0, Math.sin(t * 0.45 - x * 0.006 - y * 0.002)) ** 4 * 1.8;
  return sway + gust;
}

export function drawGrass(ctx, t, view, player) {
  const calm = prefersCalm();
  for (const tuft of TUFTS) {
    if (tuft.x < view.x - 8 || tuft.x > view.x + view.w + 8 || tuft.y < view.y - 8 || tuft.y > view.y + view.h + 8) continue;
    let bend = calm ? 0 : wind(tuft.x, tuft.y, t + tuft.phase * 0.05);
    // A grama se afasta dos pés do jogador
    if (player) {
      const dx = tuft.x - player.x;
      const dy = tuft.y - player.y;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 8) bend += Math.sign(dx || 1) * (12 - Math.abs(dx)) * 0.25;
    }
    for (let b = -1; b <= 1; b++) {
      const bx = tuft.x + b * 2;
      const h = tuft.h - Math.abs(b);
      const offset = Math.round(bend * (0.7 + Math.abs(b) * 0.3) + b * 0.5);
      const half = Math.ceil(h / 2);
      ctx.fillStyle = '#4f8428';
      ctx.fillRect(bx, tuft.y - half, 1, half);
      ctx.fillStyle = '#6ea536';
      ctx.fillRect(bx + Math.round(offset / 2), tuft.y - h, 1, h - half);
      ctx.fillStyle = '#c2e070';
      ctx.fillRect(bx + offset, tuft.y - h - 1, 1, 1);
    }
  }
}

/* ---------- Água viva ---------- */

const WATER = [];
for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (ground[y][x] === '~') WATER.push([x, y]);
const ripples = [];
let rippleIn = 0.5;

export function drawWater(ctx, t, view) {
  const calm = prefersCalm();
  for (const [x, y] of WATER) {
    const px = x * TILE;
    const py = y * TILE;
    if (px + TILE < view.x || px > view.x + view.w || py + TILE < view.y || py > view.y + view.h) continue;
    // Ondas que correm devagar
    for (let i = 0; i < 2; i++) {
      const speed = calm ? 0 : 6 + i * 3;
      const wx = (hash(x, y, 400 + i) * 32 + t * speed) % 34 - 2;
      const wy = 6 + i * 13 + Math.round(Math.sin(t * 1.3 + x + i) * 1.5);
      ctx.fillStyle = 'rgba(160, 215, 250, .55)';
      ctx.fillRect(px + Math.floor(wx), py + wy, 5, 1);
      ctx.fillStyle = 'rgba(230, 248, 255, .55)';
      ctx.fillRect(px + Math.floor(wx) + 1, py + wy - 1, 2, 1);
    }
    // Brilho de reflexo que pisca
    const glint = Math.sin(t * 2.2 + hash(x, y, 410) * 20);
    if (glint > 0.85) {
      const gx = px + 4 + Math.floor(hash(x, y, 411) * 24);
      const gy = py + 4 + Math.floor(hash(x, y, 412) * 24);
      ctx.fillStyle = `rgba(255, 255, 255, ${(glint - 0.85) * 6})`;
      ctx.fillRect(gx - 1, gy, 3, 1);
      ctx.fillRect(gx, gy - 1, 1, 3);
    }
  }
  ctx.lineWidth = 1;
  for (const ripple of ripples) {
    const u = ripple.age / ripple.max;
    ctx.strokeStyle = `rgba(225, 245, 255, ${0.6 * (1 - u)})`;
    ctx.beginPath();
    ctx.ellipse(ripple.x, ripple.y, 2 + u * 11, 1 + u * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ---------- Folhas caindo ---------- */

/** Árvores na borda das clareiras: só delas caem folhas (as do meio da mata ficam fora da tela). */
const EDGE_TREES = [];
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (ground[y][x] !== 'T') continue;
    if (at(x - 1, y) !== 'T' || at(x + 1, y) !== 'T' || at(x, y + 1) !== 'T') EDGE_TREES.push([x, y]);
  }
}
const LEAF_COLORS = ['#57ad55', '#3d9446', '#c9c24a', '#e0a12f'];
const leaves = [];
let leafIn = 0.3;

export function drawLeaves(ctx) {
  for (const leaf of leaves) {
    const u = leaf.age / leaf.max;
    ctx.globalAlpha = u > 0.8 ? (1 - u) * 5 : 1;
    ctx.fillStyle = leaf.color;
    const flip = Math.sin(leaf.age * 6 + leaf.phase) > 0;
    ctx.fillRect(Math.round(leaf.x), Math.round(leaf.y), flip ? 2 : 1, flip ? 1 : 2);
  }
  ctx.globalAlpha = 1;
}

/* ---------- Atualização ---------- */

export function updateScenery(dt, t, view) {
  if (prefersCalm() || !view.w) {
    ripples.length = 0;
    leaves.length = 0;
    return;
  }

  // Anéis na água visível
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].age += dt;
    if (ripples[i].age > ripples[i].max) ripples.splice(i, 1);
  }
  rippleIn -= dt;
  if (rippleIn <= 0) {
    rippleIn = 0.6 + Math.random() * 1.2;
    const visible = WATER.filter(([x, y]) => x * TILE > view.x && x * TILE < view.x + view.w && y * TILE > view.y && y * TILE < view.y + view.h);
    if (visible.length) {
      const [x, y] = visible[Math.floor(Math.random() * visible.length)];
      ripples.push({ x: x * TILE + 6 + Math.random() * 20, y: y * TILE + 6 + Math.random() * 20, age: 0, max: 1.6 });
    }
  }

  // Folhas
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    leaf.age += dt;
    leaf.y += 14 * dt;
    leaf.x += (Math.sin(leaf.age * 2.4 + leaf.phase) * 18 + 6) * dt;
    if (leaf.age > leaf.max) leaves.splice(i, 1);
  }
  leafIn -= dt;
  if (leafIn <= 0 && leaves.length < 14) {
    leafIn = 0.25 + Math.random() * 0.6;
    const visible = EDGE_TREES.filter(([x, y]) => x * TILE > view.x - 32 && x * TILE < view.x + view.w && y * TILE > view.y - 32 && y * TILE < view.y + view.h);
    if (visible.length) {
      const [x, y] = visible[Math.floor(Math.random() * visible.length)];
      leaves.push({
        x: x * TILE + 6 + Math.random() * 20,
        y: y * TILE + Math.random() * 10,
        age: 0,
        max: 2 + Math.random() * 1.5,
        phase: Math.random() * 6,
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      });
    }
  }
}

/* ---------- Luz (coordenadas da tela) ---------- */

export function drawLight(ctx, width, height, t) {
  // Calor no alto da tela, como sol de fim de tarde
  const warm = ctx.createLinearGradient(0, 0, 0, height);
  warm.addColorStop(0, 'rgba(255, 214, 140, .10)');
  warm.addColorStop(0.5, 'rgba(255, 214, 140, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, width, height);
  if (prefersCalm()) return;

  // Raios de sol diagonais que passeiam devagar
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const center = ((t * 12 + i * 420) % (width + 600)) - 300;
    const beamWidth = 70 + i * 40;
    const alpha = 0.05 + 0.025 * Math.sin(t * 0.6 + i * 2);
    const gradient = ctx.createLinearGradient(center - beamWidth, 0, center + beamWidth, 0);
    gradient.addColorStop(0, 'rgba(255, 236, 180, 0)');
    gradient.addColorStop(0.5, `rgba(255, 236, 180, ${alpha})`);
    gradient.addColorStop(1, 'rgba(255, 236, 180, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(center - beamWidth, 0);
    ctx.lineTo(center + beamWidth, 0);
    ctx.lineTo(center + beamWidth - height * 0.6, height);
    ctx.lineTo(center - beamWidth - height * 0.6, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
