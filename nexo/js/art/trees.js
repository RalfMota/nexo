/* NEXO — Árvores em pixel art (estilo RPG de fazenda)
 *
 * A copa é montada com vários "tufos" de folhas sobrepostos. Cada tufo tem luz e sombra
 * próprias (luz de cima à esquerda) e uma borda escura embaixo, onde encosta no tufo de
 * trás: é isso que dá o volume em camadas. Pontinhos de brilho e de sombra fazem a
 * textura das folhas. O tronco tem casca com veios, luz à esquerda e raízes.
 *
 * Cada variedade é desenhada uma vez em três fatias horizontais da copa (topo, meio, base),
 * para o vento poder entortar mais o topo que a base. O desenho final fica em cache.
 */

import { hash } from './shapes.js';

const PALETTES = {
  oak: { o: '#183420', d: '#275e30', m: '#3a813b', l: '#58a648', h: '#8fd060' },
  deep: { o: '#132b1d', d: '#214f2c', m: '#2f6d37', l: '#4a9244', h: '#7cbf57' },
  pine: { o: '#0f2a22', d: '#1d4a37', m: '#2a6646', l: '#3f8a57', h: '#6db574' },
  blossom: { o: '#3a2132', d: '#a85a8a', m: '#d77fb0', l: '#f2a8cc', h: '#ffd9ec' },
  autumn: { o: '#3a1f12', d: '#a14a1e', m: '#d5782a', l: '#f0a640', h: '#ffd27a' },
};
const BARK = { o: '#2a170c', d: '#4f2f1a', m: '#7a4e2c', l: '#a06a40', h: '#c08a55' };

/** Variedades: paleta, forma e enfeites. */
const VARIANTS = [
  { kind: 'round', palette: 'oak' },
  { kind: 'round', palette: 'deep' },
  { kind: 'round', palette: 'oak', fruit: '#e8473c' },
  { kind: 'pine', palette: 'pine' },
  { kind: 'pine', palette: 'deep' },
  { kind: 'round', palette: 'blossom' },
  { kind: 'round', palette: 'autumn' },
];

const CANOPY_W = 56;
const CANOPY_H = 50;
const TRUNK_W = 14;
const TRUNK_H = 22;

/* ---------- Grade simples de pixels ---------- */

function grid(w, h) {
  const cells = new Array(w * h).fill(null);
  return {
    w,
    h,
    cells,
    get: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : cells[y * w + x]),
    set: (x, y, c) => {
      if (x >= 0 && y >= 0 && x < w && y < h) cells[y * w + x] = c;
    },
  };
}

function toCanvas(g, y0 = 0, y1 = g.h) {
  const canvas = document.createElement('canvas');
  canvas.width = g.w;
  canvas.height = y1 - y0;
  const ctx = canvas.getContext('2d');
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y - y0, 1, 1);
    }
  }
  return canvas;
}

/* ---------- Copa redonda (tufos) ---------- */

function roundCanopy(seed, P, fruit) {
  const g = grid(CANOPY_W, CANOPY_H);
  // Tufos: de trás para a frente (os de baixo e da frente por último)
  const blobs = [
    [28, 15, 13], [16, 21, 11], [40, 21, 11], [22, 11, 9], [35, 10, 9],
    [10, 31, 9], [46, 31, 9], [28, 26, 12], [19, 34, 10], [37, 34, 10], [28, 38, 9],
  ].map(([x, y, r], i) => [x + Math.round((hash(seed, i, 1) - 0.5) * 4), y + Math.round((hash(seed, i, 2) - 0.5) * 3), r]);

  const owner = new Array(CANOPY_W * CANOPY_H).fill(-1);
  blobs.forEach(([bx, by, r], index) => {
    for (let y = by - r; y <= by + r; y++) {
      for (let x = bx - r; x <= bx + r; x++) {
        const dx = x - bx;
        const dy = y - by;
        // Borda irregular: o raio varia um pouco em volta do tufo
        const wobble = (hash(x, y, seed + index) - 0.5) * 2.2;
        if (dx * dx + dy * dy <= (r + wobble) * (r + wobble) && x >= 0 && y >= 0 && x < CANOPY_W && y < CANOPY_H) {
          owner[y * CANOPY_W + x] = index;
        }
      }
    }
  });

  for (let y = 0; y < CANOPY_H; y++) {
    for (let x = 0; x < CANOPY_W; x++) {
      const index = owner[y * CANOPY_W + x];
      if (index < 0) continue;
      const [bx, by, r] = blobs[index];
      // Luz de cima à esquerda: compara a posição dentro do tufo com a direção da luz
      const light = (-(x - bx) * 0.6 - (y - by)) / r;
      let color = light > 0.55 ? P.l : light > -0.25 ? P.m : P.d;
      const n = hash(x, y, seed + 7);
      if (color === P.l && n > 0.8) color = P.h;
      else if (color === P.m && n > 0.88) color = P.l;
      else if (color === P.m && n < 0.08) color = P.d;
      else if (color === P.d && n < 0.12) color = P.o;
      // Borda de baixo do tufo, onde ele encosta no de trás: sombra marcada
      const below = y + 1 < CANOPY_H ? owner[(y + 1) * CANOPY_W + x] : -1;
      if (below !== index && below >= 0 && below < index) color = P.o;
      g.set(x, y, color);
    }
  }

  // Contorno escuro em volta da copa
  const copy = g.cells.slice();
  for (let y = 0; y < CANOPY_H; y++) {
    for (let x = 0; x < CANOPY_W; x++) {
      if (copy[y * CANOPY_W + x]) continue;
      const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < CANOPY_W && ny < CANOPY_H && copy[ny * CANOPY_W + nx];
      });
      if (near) g.set(x, y, P.o);
    }
  }

  // Frutas ou flores
  if (fruit) {
    for (let i = 0; i < 7; i++) {
      const fx = 10 + Math.floor(hash(seed, i, 30) * 36);
      const fy = 12 + Math.floor(hash(seed, i, 31) * 26);
      if (!g.get(fx, fy)) continue;
      g.set(fx, fy, fruit);
      g.set(fx + 1, fy, fruit);
      g.set(fx, fy + 1, '#a8302a');
      g.set(fx + 1, fy + 1, fruit);
      g.set(fx, fy - 1, '#fff0e0');
    }
  }
  return g;
}

/* ---------- Pinheiro (camadas em triângulo) ---------- */

function pineCanopy(seed, P) {
  const g = grid(CANOPY_W, CANOPY_H);
  const tiers = [[4, 10], [12, 15], [20, 20], [29, 25]]; // [topo da camada, meia largura da base]
  tiers.forEach(([top, half], tier) => {
    const height = 14 + tier;
    for (let y = 0; y < height; y++) {
      const width = Math.round((half * (y + 2)) / height);
      for (let x = -width; x <= width; x++) {
        const px = 28 + x;
        const py = top + y;
        // Base da camada em "dentes" de agulhas
        if (y === height - 1 && (px + tier) % 3 === 0) continue;
        const side = x / Math.max(1, width);
        let color = side < -0.35 ? P.l : side > 0.35 ? P.d : P.m;
        const n = hash(px, py, seed + tier);
        if (color === P.l && n > 0.82) color = P.h;
        if (color === P.m && n < 0.1) color = P.d;
        if (y >= height - 2) color = color === P.l ? P.m : P.d;
        g.set(px, py, color);
      }
    }
  });
  // Contorno
  const copy = g.cells.slice();
  for (let y = 0; y < CANOPY_H; y++) {
    for (let x = 0; x < CANOPY_W; x++) {
      if (copy[y * CANOPY_W + x]) continue;
      const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => copy[(y + dy) * CANOPY_W + (x + dx)] && x + dx >= 0 && x + dx < CANOPY_W);
      if (near) g.set(x, y, P.o);
    }
  }
  return g;
}

/* ---------- Tronco ---------- */

function trunk(seed, thin) {
  const g = grid(TRUNK_W, TRUNK_H);
  const half = thin ? 2 : 3;
  for (let y = 0; y < TRUNK_H; y++) {
    // Raízes se abrem na base
    const flare = y > TRUNK_H - 5 ? Math.floor((y - (TRUNK_H - 5)) / 1.5) : 0;
    for (let x = 7 - half - flare; x <= 6 + half + flare; x++) {
      const rel = (x - (7 - half - flare)) / (2 * half + 2 * flare);
      let color = rel < 0.25 ? BARK.l : rel > 0.7 ? BARK.d : BARK.m;
      // Veios da casca
      if ((x + Math.floor(hash(seed, y >> 2, 50) * 3)) % 3 === 0 && y % 4 !== 0 && rel > 0.2 && rel < 0.8) color = BARK.d;
      if (hash(x, y, seed + 51) > 0.92) color = BARK.h;
      g.set(x, y, color);
    }
  }
  // Nó na madeira
  if (!thin) {
    g.set(7, 8, BARK.o);
    g.set(8, 8, BARK.d);
    g.set(7, 9, BARK.d);
  }
  // Contorno
  const copy = g.cells.slice();
  for (let y = 0; y < TRUNK_H; y++) {
    for (let x = 0; x < TRUNK_W; x++) {
      if (copy[y * TRUNK_W + x]) continue;
      if ((x > 0 && copy[y * TRUNK_W + x - 1]) || (x < TRUNK_W - 1 && copy[y * TRUNK_W + x + 1])) g.set(x, y, BARK.o);
    }
  }
  return g;
}

/* ---------- Montagem e cache ---------- */

const cache = new Map();

/** Desenhos de uma variedade: tronco e a copa em 3 fatias (topo, meio, base). */
export function treeArt(variantIndex) {
  if (cache.has(variantIndex)) return cache.get(variantIndex);
  const variant = VARIANTS[variantIndex % VARIANTS.length];
  const P = PALETTES[variant.palette];
  const canopy = variant.kind === 'pine' ? pineCanopy(variantIndex * 17 + 3, P) : roundCanopy(variantIndex * 17 + 3, P, variant.fruit);
  const art = {
    kind: variant.kind,
    trunk: toCanvas(trunk(variantIndex, variant.kind === 'pine')),
    slices: [toCanvas(canopy, 0, 17), toCanvas(canopy, 17, 34), toCanvas(canopy, 34, CANOPY_H)],
  };
  cache.set(variantIndex, art);
  return art;
}

export const TREE_VARIANTS = VARIANTS.length;

/**
 * Desenha uma árvore com a base do tronco em (x, baseY).
 * sway: quanto o vento entorta (pixels no topo da copa).
 */
export function drawTree(ctx, x, baseY, variantIndex, sway) {
  const art = treeArt(variantIndex);
  const left = Math.round(x - CANOPY_W / 2);
  const canopyTop = baseY - TRUNK_H - CANOPY_H + (art.kind === 'pine' ? 8 : 12);
  // Sombra no chão
  ctx.fillStyle = 'rgba(20, 40, 20, .28)';
  ctx.beginPath();
  ctx.ellipse(x + 3, baseY - 2, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(art.trunk, Math.round(x - TRUNK_W / 2), baseY - TRUNK_H);
  const bend = [sway, sway * 0.55, sway * 0.2];
  art.slices.forEach((slice, i) => {
    ctx.drawImage(slice, left + Math.round(bend[i]), canopyTop + i * 17);
  });
}
