/* NEXO — Objetos das missões extras: Jardim Espelhado, Cercas do Vale e Jardim de Nyla
 *
 * Mesmo estilo dos outros objetos (pixel art com rampas de tons e contorno escuro). As
 * peças pequenas e repetidas (flores, tábuas, lajotas) são pintadas direto, pixel a pixel.
 */

import { Pix, ramp, toneOf, sprite, blit, pixelShadow, noise } from './pixel.js';

const SOIL = ramp('#86522f');
const STONE = ramp('#a39d92');
const WOOD = ramp('#9a6232');
const WOOD_LIGHT = ramp('#b98448');
const WICKER = ramp('#c28b4a');
const MOSS = ramp('#5f9e4a');

export const FLOWER_COLORS = { red: '#e0523d', yellow: '#f2c43a' };

const px = (ctx, x, y, color, w = 1, h = 1) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};

/* ---------- Canteiro quadriculado e caminho de pedras ---------- */

/** Uma cova de terra (célula do canteiro), com a borda escura e o miolo fofo. */
export function drawPlot(ctx, x, y, size, { highlight = null } = {}) {
  px(ctx, x, y, SOIL.o, size, size);
  px(ctx, x + 1, y + 1, SOIL.t[1], size - 2, size - 2);
  px(ctx, x + 2, y + 2, SOIL.t[2], size - 4, size - 5);
  px(ctx, x + 2, y + 2, SOIL.t[3], size - 5, 1);
  if (highlight) {
    ctx.fillStyle = highlight === 'bad' ? 'rgba(255, 90, 70, .45)' : 'rgba(255, 236, 140, .35)';
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
}

/** Caminho de pedras (o eixo de simetria). */
export function drawStonePath(ctx, x, y, w, h) {
  px(ctx, x, y, '#6e675d', w, h);
  for (let j = 0; j < h; j += 4) {
    for (let i = (j / 4) % 2 ? 2 : 0; i < w; i += 4) {
      const n = noise(x + i, y + j, 3);
      px(ctx, x + i, y + j, n > 0.5 ? STONE.t[3] : STONE.t[2], Math.min(3, w - i), Math.min(3, h - j));
      px(ctx, x + i, y + j, STONE.t[4], 1, 1);
    }
  }
}

/* ---------- Flor (muda plantada) ---------- */

export function drawFlower(ctx, x, y, color, sway = 0) {
  const P = ramp(color);
  const cx = Math.round(x);
  const base = Math.round(y);
  // Caule e folhas
  px(ctx, cx, base - 6, '#2e5e2a', 1, 6);
  px(ctx, cx - 3, base - 4, '#2e5e2a', 3, 2);
  px(ctx, cx - 2, base - 4, '#5aa84a', 2, 1);
  px(ctx, cx + 1, base - 3, '#2e5e2a', 3, 2);
  px(ctx, cx + 1, base - 3, '#6cbf55', 2, 1);
  // Flor de 7 × 7: quatro pétalas com contorno e miolo
  const top = base - 12 + sway;
  const petal = (dx, dy) => {
    px(ctx, cx + dx - 1, top + dy - 1, P.o, 4, 4);
    px(ctx, cx + dx, top + dy, P.t[3], 2, 2);
    px(ctx, cx + dx, top + dy, P.t[4], 1, 1);
  };
  petal(-2, 0);
  petal(1, 0);
  petal(-2, 3);
  petal(1, 3);
  px(ctx, cx - 1, top + 2, P.t[1], 3, 1);
  px(ctx, cx, top + 1, P.t[2], 1, 3);
  px(ctx, cx - 1, top + 2, '#8a4a12', 2, 2);
  px(ctx, cx - 1, top + 2, '#ffd84a', 1, 1);
}

/* ---------- Cesto de mudas ---------- */

function buildSeedlingBasket(color) {
  const pix = new Pix(22, 18);
  const P = ramp(color);
  // Flores aparecendo
  [[6, 6], [10, 4], [14, 6], [8, 3], [12, 3]].forEach(([x, y]) => {
    pix.rect(x, y, 3, 3, P.t[3], P.o);
    pix.set(x, y, P.t[4]);
    pix.set(x + 1, y + 1, '#fff3b0');
  });
  for (let y = 8; y <= 17; y++) {
    const hw = 9 - (y - 8) * 0.25;
    for (let x = 0; x < 22; x++) {
      const nx = (x + 0.5 - 11) / hw;
      if (Math.abs(nx) > 1) continue;
      const cell = (x + Math.floor((y - 8) / 2) * 2) % 4;
      const level = 0.75 - nx * 0.25 + (cell === 1 ? 0.15 : cell === 3 ? -0.22 : 0) - (y >= 17 ? 0.2 : 0);
      pix.set(x, y, toneOf(level, x, y, WICKER), WICKER.o);
    }
  }
  for (let x = 2; x <= 19; x++) pix.set(x, 8, (x % 2) ? WICKER.t[4] : WICKER.t[2], WICKER.o);
  pix.outline();
  return { pix, ax: 11, ay: 17 };
}

export function drawSeedlingBasket(ctx, x, y, color) {
  pixelShadow(ctx, x, y, 10, 1);
  blit(ctx, sprite(`seedling-basket:${color}`, () => buildSeedlingBasket(color)), x, y);
}

/* ---------- Tábuas de cerca ---------- */

function buildBoardPile() {
  const pix = new Pix(30, 18);
  for (let layer = 0; layer < 4; layer++) {
    const y = 14 - layer * 3;
    const x0 = 2 + (layer % 2) * 2;
    for (let x = x0; x < x0 + 24; x++) {
      for (let j = 0; j < 3; j++) {
        const level = (j === 0 ? 0.9 : j === 2 ? 0.35 : 0.65) - (x - x0) * 0.01 + (noise(x, y + j, layer) > 0.9 ? -0.15 : 0);
        pix.set(x, y + j, toneOf(level, x, y + j, WOOD_LIGHT), WOOD_LIGHT.o);
      }
    }
  }
  pix.outline();
  return { pix, ax: 15, ay: 17 };
}

export function drawBoardPile(ctx, x, y) {
  pixelShadow(ctx, x, y, 13, 1);
  blit(ctx, sprite('board-pile', buildBoardPile), x, y);
}

/** Tábua avulsa (na mão do jogador). */
export function drawBoardHandful(ctx, x, y, count) {
  const shown = Math.min(count, 4);
  for (let i = 0; i < shown; i++) {
    px(ctx, x - 9, y - i * 3 - 3, WOOD_LIGHT.o, 18, 4);
    px(ctx, x - 8, y - i * 3 - 2, WOOD_LIGHT.t[3], 16, 2);
    px(ctx, x - 8, y - i * 3 - 2, WOOD_LIGHT.t[4], 16, 1);
  }
}

/**
 * Cerca retangular de `w` × `h` unidades (cada tábua cobre uma unidade de lado).
 * `boards`: quantas tábuas foram usadas; faltando, os últimos lados ficam abertos; sobrando,
 * as tábuas extras ficam no chão ao lado.
 */
export function drawFence(ctx, left, top, w, h, unit, boards = null) {
  const sides = [];
  for (let i = 0; i < w; i++) sides.push(['h', left + i * unit, top]);
  for (let j = 0; j < h; j++) sides.push(['v', left + w * unit, top + j * unit]);
  for (let i = w - 1; i >= 0; i--) sides.push(['h', left + i * unit, top + h * unit]);
  for (let j = h - 1; j >= 0; j--) sides.push(['v', left, top + j * unit]);
  const placed = boards == null ? sides.length : Math.min(boards, sides.length);
  sides.forEach(([dir, x, y], index) => {
    if (index >= placed) {
      // Lado aberto: só a marca no chão
      ctx.fillStyle = 'rgba(60, 30, 15, .35)';
      if (dir === 'h') ctx.fillRect(x, y, unit, 1);
      else ctx.fillRect(x, y, 1, unit);
      return;
    }
    if (dir === 'h') {
      px(ctx, x, y - 2, WOOD.o, unit + 1, 4);
      px(ctx, x, y - 1, WOOD.t[3], unit, 2);
      px(ctx, x, y - 1, WOOD.t[4], unit, 1);
    } else {
      px(ctx, x - 2, y, WOOD.o, 4, unit + 1);
      px(ctx, x - 1, y, WOOD.t[2], 2, unit);
      px(ctx, x - 1, y, WOOD.t[3], 1, unit);
    }
  });
  // Mourões nos cantos
  for (const [cx, cy] of [[left, top], [left + w * unit, top], [left, top + h * unit], [left + w * unit, top + h * unit]]) {
    px(ctx, cx - 2, cy - 4, WOOD.o, 4, 6);
    px(ctx, cx - 1, cy - 3, WOOD.t[3], 2, 4);
  }
  if (boards != null && boards > sides.length) {
    for (let i = 0; i < Math.min(6, boards - sides.length); i++) {
      px(ctx, left + w * unit + 6, top + h * unit - i * 3, WOOD.o, unit, 3);
      px(ctx, left + w * unit + 7, top + h * unit - i * 3 + 1, WOOD.t[3], unit - 2, 1);
    }
  }
}

/** Quadradinhos de área dentro de um retângulo (grama clara em xadrez). */
export function drawAreaSquares(ctx, left, top, w, h, unit) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = (i + j) % 2 ? 'rgba(170, 220, 120, .45)' : 'rgba(140, 200, 100, .45)';
      ctx.fillRect(left + i * unit + 1, top + j * unit + 1, unit - 1, unit - 1);
    }
  }
}

/* ---------- Lajotas de musgo (Jardim de Nyla) ---------- */

export function drawMossTile(ctx, x, y, size, faded = false) {
  px(ctx, x, y, MOSS.o, size, size);
  px(ctx, x + 1, y + 1, faded ? 'rgba(120, 150, 110, .5)' : MOSS.t[2], size - 2, size - 2);
  if (!faded) {
    px(ctx, x + 1, y + 1, MOSS.t[3], size - 3, 1);
    px(ctx, x + 1, y + 1, MOSS.t[4], 1, 1);
    px(ctx, x + size - 2, y + 2, MOSS.t[1], 1, size - 3);
    if (noise(x, y, 4) > 0.6) px(ctx, x + 3, y + 3, '#f2c43a', 1, 1);
  }
}

function buildTilePile() {
  const pix = new Pix(26, 16);
  for (let layer = 0; layer < 4; layer++) {
    const y = 12 - layer * 3;
    const x0 = 2 + layer * 2;
    for (let x = x0; x < x0 + 18 - layer * 2; x++) {
      for (let j = 0; j < 3; j++) pix.set(x, y + j, MOSS.t[j === 0 ? 4 : j === 2 ? 1 : 2], MOSS.o);
    }
  }
  pix.outline();
  return { pix, ax: 13, ay: 15 };
}

export function drawTilePile(ctx, x, y) {
  pixelShadow(ctx, x, y, 12, 1);
  blit(ctx, sprite('tile-pile', buildTilePile), x, y);
}

/** Fontezinha 2 × 2 no meio do jardim (etapa 3). */
export function drawMiniFountain(ctx, x, y, size, t) {
  px(ctx, x, y, STONE.o, size, size);
  px(ctx, x + 1, y + 1, STONE.t[3], size - 2, size - 2);
  px(ctx, x + 3, y + 3, '#3f8fd6', size - 6, size - 6);
  const phase = (t * 1.5) % 1;
  px(ctx, x + size / 2 - 1, y + size / 2 - 2 - phase * 3, `rgba(220, 245, 255, ${1 - phase})`, 2, 2);
}
