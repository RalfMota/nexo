/* NEXO — Enfeites do cenário em pixel art: arbustos, pedras, tocos, troncos, cogumelos,
 * flores, feno, abóboras e bancos. Pintados uma vez na camada fixa do mapa.
 *
 * Formas orgânicas usam "bolhas" de pixels com luz de cima à esquerda e contorno escuro,
 * no mesmo padrão das árvores.
 */

import { hash } from './shapes.js';

const T = 32;

const LEAF = { o: '#183420', d: '#2a6232', m: '#3d8a3e', l: '#5cab4c', h: '#93d163' };
const STONE = { o: '#3a3a44', d: '#6a6a78', m: '#8f8f9c', l: '#b4b4c0', h: '#d8d8e2' };
const WOOD = { o: '#2a170c', d: '#5a3720', m: '#8a5a33', l: '#b07a48', h: '#d6a46a' };
const HAY = { o: '#5a3e12', d: '#b0862c', m: '#dcae46', l: '#f0cc6a', h: '#fff0a8' };
const PUMPKIN = { o: '#5a2408', d: '#c25a14', m: '#ee8424', l: '#ffab4a', h: '#ffd8a0' };

/** Desenha uma forma orgânica feita de bolhas, com luz, sombra e contorno. */
function blobs(ctx, ox, oy, w, h, list, P, seed, { texture = true } = {}) {
  const owner = new Array(w * h).fill(-1);
  list.forEach(([bx, by, r], index) => {
    for (let y = by - r; y <= by + r; y++) {
      for (let x = bx - r; x <= bx + r; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const wobble = (hash(x + ox, y + oy, seed + index) - 0.5) * 1.6;
        if ((x - bx) ** 2 + (y - by) ** 2 <= (r + wobble) ** 2) owner[y * w + x] = index;
      }
    }
  });
  const color = (x, y) => {
    const index = owner[y * w + x];
    const [bx, by, r] = list[index];
    const light = (-(x - bx) * 0.6 - (y - by)) / r;
    let c = light > 0.5 ? P.l : light > -0.3 ? P.m : P.d;
    if (texture) {
      const n = hash(x + ox, y + oy, seed + 9);
      if (c === P.l && n > 0.82) c = P.h;
      else if (c === P.m && n < 0.1) c = P.d;
    }
    const below = y + 1 < h ? owner[(y + 1) * w + x] : -1;
    if (below >= 0 && below < index) c = P.o;
    return c;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const filled = owner[y * w + x] >= 0;
      if (filled) {
        ctx.fillStyle = color(x, y);
        ctx.fillRect(ox + x, oy + y, 1, 1);
        continue;
      }
      const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < w && ny < h && owner[ny * w + nx] >= 0;
      });
      if (near) {
        ctx.fillStyle = P.o;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

function groundShadow(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(20, 40, 20, .25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

const dot = (ctx, x, y, color, w = 1, h = 1) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/* ---------- Enfeites ---------- */

function bush(ctx, px, py, seed, berries) {
  groundShadow(ctx, px + 16, py + 28, 14, 4);
  blobs(ctx, px + 2, py + 6, 28, 24, [[8, 14, 7], [20, 14, 7], [14, 9, 8], [14, 16, 8]], LEAF, seed);
  if (!berries) return;
  for (let i = 0; i < 6; i++) {
    const bx = px + 6 + Math.floor(hash(seed, i, 1) * 20);
    const by = py + 10 + Math.floor(hash(seed, i, 2) * 14);
    dot(ctx, bx, by, berries, 2, 2);
    dot(ctx, bx, by, '#ffffff');
  }
}

function rock(ctx, px, py, seed) {
  groundShadow(ctx, px + 16, py + 27, 13, 4);
  blobs(ctx, px + 3, py + 8, 26, 21, [[10, 13, 8], [17, 12, 8], [13, 9, 7]], STONE, seed);
  // Rachadura e musgo
  dot(ctx, px + 17, py + 16, STONE.o);
  dot(ctx, px + 18, py + 17, STONE.o);
  dot(ctx, px + 18, py + 18, STONE.o);
  for (let i = 0; i < 5; i++) dot(ctx, px + 8 + i * 3, py + 10 + (i % 2), i % 2 ? '#5cab4c' : '#3d8a3e', 2, 1);
}

function pebbles(ctx, px, py, seed) {
  for (let i = 0; i < 4; i++) {
    const x = px + 4 + Math.floor(hash(seed, i, 3) * 22);
    const y = py + 6 + Math.floor(hash(seed, i, 4) * 20);
    dot(ctx, x, y + 2, 'rgba(20,40,20,.3)', 4, 1);
    dot(ctx, x, y, STONE.m, 4, 2);
    dot(ctx, x, y, STONE.l, 2, 1);
    dot(ctx, x + 3, y + 1, STONE.d);
  }
}

function stump(ctx, px, py) {
  groundShadow(ctx, px + 16, py + 26, 12, 4);
  // Raízes
  dot(ctx, px + 6, py + 22, WOOD.d, 4, 3);
  dot(ctx, px + 22, py + 22, WOOD.d, 4, 3);
  // Tronco
  for (let x = 8; x <= 23; x++) {
    const rel = (x - 8) / 15;
    dot(ctx, px + x, py + 12, rel < 0.3 ? WOOD.l : rel > 0.7 ? WOOD.d : WOOD.m, 1, 13);
  }
  dot(ctx, px + 7, py + 12, WOOD.o, 1, 13);
  dot(ctx, px + 24, py + 12, WOOD.o, 1, 13);
  // Topo com anéis
  ctx.fillStyle = WOOD.o;
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 12, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WOOD.h;
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 12, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = WOOD.l;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 12, 5, 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  dot(ctx, px + 16, py + 12, WOOD.d);
}

function log(ctx, px, py) {
  groundShadow(ctx, px + 16, py + 25, 15, 4);
  for (let y = 14; y <= 23; y++) {
    const rel = (y - 14) / 9;
    dot(ctx, px + 3, py + y, rel < 0.3 ? WOOD.l : rel > 0.7 ? WOOD.d : WOOD.m, 22, 1);
  }
  dot(ctx, px + 3, py + 13, WOOD.o, 22, 1);
  dot(ctx, px + 3, py + 24, WOOD.o, 22, 1);
  for (let x = 6; x < 24; x += 5) dot(ctx, px + x, py + 17 + (x % 2), WOOD.d, 3, 1);
  // Ponta com anéis
  ctx.fillStyle = WOOD.o;
  ctx.beginPath();
  ctx.ellipse(px + 26, py + 19, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WOOD.h;
  ctx.beginPath();
  ctx.ellipse(px + 26, py + 19, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  dot(ctx, px + 26, py + 19, WOOD.d);
  // Musgo e cogumelinho
  dot(ctx, px + 8, py + 13, '#5cab4c', 5, 1);
  dot(ctx, px + 14, py + 10, '#e8473c', 3, 2);
  dot(ctx, px + 15, py + 12, '#f4f0e6', 1, 2);
}

function mushrooms(ctx, px, py, seed) {
  const caps = ['#e8473c', '#c97a2a', '#b89cff'];
  for (let i = 0; i < 3; i++) {
    const x = px + 6 + Math.floor(hash(seed, i, 5) * 18);
    const y = py + 10 + Math.floor(hash(seed, i, 6) * 14);
    const cap = caps[Math.floor(hash(seed, i, 7) * caps.length)];
    dot(ctx, x + 1, y + 3, '#f4f0e6', 2, 3);
    dot(ctx, x + 2, y + 3, '#cfc6b0', 1, 3);
    dot(ctx, x, y + 1, cap, 4, 2);
    dot(ctx, x + 1, y, cap, 2, 1);
    dot(ctx, x + 1, y + 1, '#ffffff');
    dot(ctx, x + 3, y + 2, '#5a1e18');
  }
}

function flowerPatch(ctx, px, py, seed) {
  const kinds = [['#fffaf0', '#f2b84b'], ['#ffd84a', '#d68a1c'], ['#b89cff', '#fff3a8'], ['#ff9fc0', '#fff3a8'], ['#ff6b5b', '#ffd84a']];
  const [petal, center] = kinds[Math.floor(hash(seed, 0, 8) * kinds.length)];
  for (let i = 0; i < 7; i++) {
    const x = px + 4 + Math.floor(hash(seed, i, 9) * 22);
    const y = py + 6 + Math.floor(hash(seed, i, 10) * 20);
    dot(ctx, x, y + 2, '#3f7a26', 1, 3);
    dot(ctx, x - 1, y, petal);
    dot(ctx, x + 1, y, petal);
    dot(ctx, x, y - 1, petal);
    dot(ctx, x, y + 1, petal);
    dot(ctx, x, y, center);
  }
}

function hayBale(ctx, px, py) {
  groundShadow(ctx, px + 16, py + 27, 14, 4);
  blobs(ctx, px + 3, py + 7, 26, 21, [[13, 11, 10]], HAY, 3, { texture: false });
  for (let i = 0; i < 6; i++) dot(ctx, px + 8 + i * 3, py + 12 + (i % 3) * 3, HAY.d, 2, 1);
  dot(ctx, px + 9, py + 10, HAY.h, 3, 1);
  dot(ctx, px + 6, py + 17, '#8a5a33', 20, 1);
}

function pumpkin(ctx, px, py, seed) {
  const x = px + 6 + Math.floor(hash(seed, 0, 11) * 10);
  const y = py + 12 + Math.floor(hash(seed, 0, 12) * 6);
  groundShadow(ctx, x + 7, y + 11, 8, 3);
  blobs(ctx, x, y, 15, 12, [[4, 6, 4], [10, 6, 4], [7, 6, 5]], PUMPKIN, seed, { texture: false });
  dot(ctx, x + 7, y + 2, PUMPKIN.d, 1, 7);
  dot(ctx, x + 6, y - 1, '#3f7a26', 2, 3);
  dot(ctx, x + 8, y, '#5cab4c', 3, 1);
}

function bench(ctx, px, py) {
  groundShadow(ctx, px + 16, py + 27, 15, 3);
  dot(ctx, px + 4, py + 20, WOOD.o, 3, 7);
  dot(ctx, px + 25, py + 20, WOOD.o, 3, 7);
  dot(ctx, px + 2, py + 17, WOOD.o, 28, 5);
  dot(ctx, px + 3, py + 18, WOOD.m, 26, 3);
  dot(ctx, px + 3, py + 18, WOOD.l, 26, 1);
  dot(ctx, px + 2, py + 8, WOOD.o, 28, 7);
  dot(ctx, px + 3, py + 9, WOOD.m, 26, 2);
  dot(ctx, px + 3, py + 12, WOOD.d, 26, 2);
  dot(ctx, px + 3, py + 9, WOOD.h, 10, 1);
}

function tallGrass(ctx, px, py, seed) {
  for (let i = 0; i < 9; i++) {
    const x = px + 6 + Math.floor(hash(seed, i, 13) * 20);
    const h = 5 + Math.floor(hash(seed, i, 14) * 5);
    const y = py + 24;
    dot(ctx, x, y - h, '#4f8428', 1, h);
    dot(ctx, x + 1, y - h + 2, '#6ea536', 1, h - 2);
    dot(ctx, x, y - h - 1, '#c2e070');
  }
}

const PAINTERS = {
  bush: (ctx, px, py, seed) => bush(ctx, px, py, seed, null),
  berryBush: (ctx, px, py, seed) => bush(ctx, px, py, seed, hash(seed, 0, 20) > 0.5 ? '#e8473c' : '#5b6ee0'),
  rock: (ctx, px, py, seed) => rock(ctx, px, py, seed),
  pebbles,
  stump: (ctx, px, py) => stump(ctx, px, py),
  log: (ctx, px, py) => log(ctx, px, py),
  mushrooms,
  flowers: flowerPatch,
  hay: (ctx, px, py) => hayBale(ctx, px, py),
  pumpkin,
  bench: (ctx, px, py) => bench(ctx, px, py),
  tallGrass,
};

/** Pinta um enfeite { type, x, y } (em blocos do mapa). */
export function paintDecor(ctx, item) {
  PAINTERS[item.type]?.(ctx, item.x * T, item.y * T, item.x * 31 + item.y * 17);
}
