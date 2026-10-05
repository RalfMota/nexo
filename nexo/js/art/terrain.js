/* NEXO — Pintura do terreno: grama, estradas, água, canteiros e árvores */

import { hash, circle } from './shapes.js';

const T = 32;
const isRoad = (char) => char === '=' || char === 'p';

export function paintTerrain(ctx, ground) {
  const height = ground.length;
  const width = ground[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 'T' : ground[y][x]);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = ground[y][x];
      const px = x * T;
      const py = y * T;
      const r = hash(x, y);
      if (char === '=') paintRoad(ctx, px, py, x, y, at);
      else if (char === 'p') paintPavement(ctx, px, py, x, y);
      else if (char === '~') paintWater(ctx, px, py, x, y, at);
      else if (char === '#') paintSoil(ctx, px, py, r);
      else paintGrass(ctx, px, py, x, y, r, char === 'T');
    }
  }

  // Árvores por último, de cima para baixo, para as copas se sobreporem com profundidade
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (ground[y][x] === 'T') paintTree(ctx, x * T, y * T, hash(x, y, 7));
    }
  }
}

/* Grama no estilo RPG de fazenda: verde amarelado com textura em três tons,
 * lâminas com ponta clara, tufos em V, trevos, pedrinhas e flores silvestres. */
const GRASS = {
  base: '#7fb43f',
  shade: '#6fa236',
  dark: '#5a8d2c',
  deep: '#477723',
  light: '#93c74a',
  tip: '#c2e070',
};
const FLOWER_KINDS = [
  { petal: '#fffaf0', center: '#f2b84b' }, // margarida
  { petal: '#ffd84a', center: '#d68a1c' }, // dente-de-leão
  { petal: '#b89cff', center: '#fff3a8' }, // violeta
  { petal: '#ff9fc0', center: '#fff3a8' }, // rosinha
];

function paintGrass(ctx, px, py, x, y, r, underTree) {
  const dot = (dx, dy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + dx, py + dy, w, h);
  };

  if (underTree) {
    dot(0, 0, T, T, GRASS.dark);
    for (let i = 0; i < 10; i++) dot(Math.floor(hash(x, y, i + 90) * 30), Math.floor(hash(x, y, i + 110) * 31), 2, 1, GRASS.deep);
    return;
  }

  // Base com textura: manchas de 2 × 1 em tons próximos, sem bloco liso
  dot(0, 0, T, T, GRASS.base);
  const seed = x * 131 + y * 977;
  for (let dy = 0; dy < T; dy++) {
    for (let dx = 0; dx < T; dx += 2) {
      const n = hash(seed + dx, dy, 4);
      if (n < 0.13) dot(dx, dy, 2, 1, GRASS.shade);
      else if (n > 0.93) dot(dx, dy, 2, 1, GRASS.light);
    }
  }

  // Lâminas de grama: haste escura, ponta clara, às vezes em tufo (V)
  const blades = 5 + Math.floor(hash(x, y, 5) * 5);
  for (let i = 0; i < blades; i++) {
    const bx = 2 + Math.floor(hash(x, y, i + 10) * 27);
    const by = 4 + Math.floor(hash(x, y, i + 20) * 25);
    const tall = hash(x, y, i + 30) > 0.5 ? 4 : 3;
    dot(bx, by - tall + 1, 1, tall, GRASS.dark);
    dot(bx, by - tall, 1, 1, GRASS.tip);
    if (hash(x, y, i + 40) > 0.55) {
      dot(bx - 1, by - 2, 1, 2, GRASS.dark);
      dot(bx - 2, by - 3, 1, 1, GRASS.light);
      dot(bx + 1, by - 2, 1, 2, GRASS.deep);
      dot(bx + 2, by - 3, 1, 1, GRASS.light);
    }
  }

  // Trevo
  if (r > 0.6 && r < 0.67) {
    const cx = 8 + Math.floor(hash(x, y, 50) * 16);
    const cy = 8 + Math.floor(hash(x, y, 51) * 16);
    [[-2, 0], [1, 0], [-1, -2]].forEach(([ox, oy]) => {
      dot(cx + ox, cy + oy, 2, 2, '#8fd05a');
      dot(cx + ox, cy + oy, 1, 1, '#b5e37a');
    });
    dot(cx, cy + 2, 1, 2, GRASS.deep);
  }

  // Pedrinha
  if (hash(x, y, 60) < 0.07) {
    const sx = 4 + Math.floor(hash(x, y, 61) * 22);
    const sy = 6 + Math.floor(hash(x, y, 62) * 20);
    dot(sx, sy + 2, 4, 1, 'rgba(40, 60, 20, .35)');
    dot(sx, sy, 4, 2, '#a9a48c');
    dot(sx + 1, sy, 2, 1, '#cfc9ad');
    dot(sx + 3, sy + 1, 1, 1, '#7d7966');
  }

  // Flores silvestres: pétalas, miolo e caule
  if (r > 0.88) {
    const kind = FLOWER_KINDS[Math.floor(hash(x, y, 3) * FLOWER_KINDS.length)];
    const count = 1 + Math.floor(hash(x, y, 70) * 3);
    for (let i = 0; i < count; i++) {
      const fx = 5 + Math.floor(hash(x, y, i + 30) * 21);
      const fy = 6 + Math.floor(hash(x, y, i + 41) * 19);
      dot(fx, fy + 2, 1, 3, GRASS.deep);
      dot(fx + 1, fy + 3, 1, 1, GRASS.dark);
      dot(fx - 1, fy, 1, 1, kind.petal);
      dot(fx + 1, fy, 1, 1, kind.petal);
      dot(fx, fy - 1, 1, 1, kind.petal);
      dot(fx, fy + 1, 1, 1, kind.petal);
      dot(fx, fy, 1, 1, kind.center);
    }
  }
}

/* Estrada de terra: tons quentes, pedrinhas, rachaduras e grama invadindo as bordas */
const DIRT = { base: '#d4a86a', shade: '#bf9156', deep: '#a57a45', light: '#e6c28a', pebble: '#9c8f7a', pebbleLight: '#cfc6b0' };

function paintRoad(ctx, px, py, x, y, at) {
  const dot = (dx, dy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + dx, py + dy, w, h);
  };
  dot(0, 0, T, T, DIRT.base);
  const seed = x * 173 + y * 911;
  for (let dy = 0; dy < T; dy++) {
    for (let dx = 0; dx < T; dx += 2) {
      const n = hash(seed + dx, dy, 8);
      if (n < 0.1) dot(dx, dy, 2, 1, DIRT.shade);
      else if (n > 0.94) dot(dx, dy, 2, 1, DIRT.light);
    }
  }
  // Pedrinhas com brilho e sombra
  const pebbles = 2 + Math.floor(hash(x, y, 81) * 3);
  for (let i = 0; i < pebbles; i++) {
    const sx = 3 + Math.floor(hash(x, y, i + 82) * 25);
    const sy = 3 + Math.floor(hash(x, y, i + 86) * 25);
    dot(sx, sy + 2, 3, 1, DIRT.deep);
    dot(sx, sy, 3, 2, DIRT.pebble);
    dot(sx, sy, 1, 1, DIRT.pebbleLight);
  }
  // Rachadura
  if (hash(x, y, 90) > 0.7) {
    const cx = 6 + Math.floor(hash(x, y, 91) * 18);
    const cy = 6 + Math.floor(hash(x, y, 92) * 18);
    dot(cx, cy, 3, 1, DIRT.deep);
    dot(cx + 3, cy + 1, 2, 1, DIRT.deep);
    dot(cx - 2, cy - 1, 2, 1, DIRT.deep);
  }
  // Bordas: grama avança em tufos irregulares e deixa uma linha de sombra na terra
  const edges = [
    [!isRoad(at(x, y - 1)), (i, d) => [i, d, 1, 1]],
    [!isRoad(at(x, y + 1)), (i, d) => [i, T - 1 - d, 1, 1]],
    [!isRoad(at(x - 1, y)), (i, d) => [d, i, 1, 1]],
    [!isRoad(at(x + 1, y)), (i, d) => [T - 1 - d, i, 1, 1]],
  ];
  edges.forEach(([isEdge, place], side) => {
    if (!isEdge) return;
    for (let i = 0; i < T; i++) {
      const depth = 1 + Math.floor(hash(x * 3 + side, y * 7 + i, 93) * 3);
      for (let d = 0; d < depth; d++) dot(...place(i, d), d === depth - 1 ? GRASS.dark : GRASS.base);
      dot(...place(i, depth), DIRT.shade);
    }
  });
}

/* Praça: pedras irregulares, cada uma com luz no alto e sombra embaixo */
const STONES = ['#cfc6b4', '#c4baa6', '#d8d0bf', '#c9bfac'];

function paintPavement(ctx, px, py, x, y) {
  ctx.fillStyle = '#9a917f';
  ctx.fillRect(px, py, T, T);
  for (let row = 0; row < 4; row++) {
    const offset = (row + y) % 2 ? 5 : 0;
    for (let col = -1; col < 4; col++) {
      const sx = col * 10 + offset;
      const w = 9;
      const left = Math.max(0, sx);
      const right = Math.min(T, sx + w);
      if (right <= left) continue;
      const sy = row * 8;
      const tone = STONES[Math.floor(hash(x * 4 + col, y * 4 + row, 95) * STONES.length)];
      ctx.fillStyle = tone;
      ctx.fillRect(px + left, py + sy, right - left, 7);
      ctx.fillStyle = '#e6dfd0';
      ctx.fillRect(px + left, py + sy, right - left, 1);
      ctx.fillStyle = '#ada38f';
      ctx.fillRect(px + left, py + sy + 6, right - left, 1);
      if (hash(x * 4 + col, y * 4 + row, 96) > 0.8) {
        ctx.fillStyle = '#b3a995';
        ctx.fillRect(px + left + 2, py + sy + 3, 2, 1);
      }
    }
  }
}

/* Água: azul profundo no centro, ondas claras, margem de areia com espuma e pedras */
function paintWater(ctx, px, py, x, y, at) {
  const dot = (dx, dy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + dx, py + dy, w, h);
  };
  dot(0, 0, T, T, '#3f86c8');
  const inner = ['~'].includes(at(x, y - 1)) && at(x, y + 1) === '~' && at(x - 1, y) === '~' && at(x + 1, y) === '~';
  // Longe da margem a água fica mais funda: pontilhado escuro, sem bordas retas
  const seed = x * 211 + y * 613;
  for (let dy = 0; dy < T; dy++) {
    for (let dx = 0; dx < T; dx += 2) {
      if (hash(seed + dx, dy, 99) < (inner ? 0.35 : 0.12)) dot(dx, dy, 2, 1, '#3575b6');
    }
  }
  for (let i = 0; i < 4; i++) {
    const wx = Math.floor(hash(x, y, i + 100) * 24);
    const wy = 4 + Math.floor(hash(x, y, i + 104) * 24);
    dot(wx, wy, 6, 1, '#6fb2e6');
    dot(wx + 1, wy - 1, 3, 1, '#9fd2f5');
  }
  const edges = [
    [at(x, y - 1), (i, d) => [i, d, 1, 1]],
    [at(x, y + 1), (i, d) => [i, T - 1 - d, 1, 1]],
    [at(x - 1, y), (i, d) => [d, i, 1, 1]],
    [at(x + 1, y), (i, d) => [T - 1 - d, i, 1, 1]],
  ];
  edges.forEach(([neighbor, place], side) => {
    if (neighbor === '~') return;
    for (let i = 0; i < T; i++) {
      const sand = 2 + Math.floor(hash(x * 5 + side, y * 3 + i, 107) * 2);
      for (let d = 0; d < sand; d++) dot(...place(i, d), d === 0 ? '#d9c08a' : '#ead7a6');
      dot(...place(i, sand), '#dff4ff');
      if (hash(x * 5 + side, y * 3 + i, 108) > 0.85) dot(...place(i, sand + 1), '#bfe3f8');
      if (hash(x * 5 + side, y * 3 + i, 109) > 0.93) dot(...place(i, 0), '#9c8f7a');
    }
  });
}

/* Terra arada: sulcos com crista clara e fundo escuro, torrões e brotinhos */
function paintSoil(ctx, px, py, r) {
  const dot = (dx, dy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + dx, py + dy, w, h);
  };
  dot(0, 0, T, T, '#8a5634');
  for (let row = 0; row < T; row += 6) {
    dot(0, row, T, 1, '#a06a40');
    dot(0, row + 1, T, 1, '#94603a');
    dot(0, row + 4, T, 2, '#6e4226');
  }
  for (let i = 0; i < 6; i++) {
    const cx = Math.floor(hash(px, py, i + 120) * 30);
    const cy = Math.floor(hash(px, py, i + 126) * 30);
    dot(cx, cy, 2, 1, '#5e3820');
    dot(cx, cy - 1, 1, 1, '#b07a4c');
  }
  if (r > 0.55) {
    const sx = 8 + Math.floor(r * 14);
    dot(sx, 12, 1, 4, '#3f8a35');
    dot(sx - 2, 12, 2, 1, '#7fd36a');
    dot(sx + 1, 13, 2, 1, '#7fd36a');
  }
}

function paintTree(ctx, px, py, r) {
  const cx = px + 16;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(cx, py + 28, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (r < 0.28) {
    // Pinheiro
    ctx.fillStyle = '#6d4527';
    ctx.fillRect(cx - 3, py + 20, 6, 10);
    const layers = [
      [py - 4, 9, '#2a6e3e'],
      [py + 4, 12, '#2f7a43'],
      [py + 11, 15, '#357f48'],
    ];
    for (const [top, half, color] of layers) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx + half, top + 13);
      ctx.lineTo(cx - half, top + 13);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#4c9a5c';
    ctx.fillRect(cx - 4, py + 6, 3, 3);
    return;
  }

  // Árvore de copa redonda
  ctx.fillStyle = '#6d4527';
  ctx.fillRect(cx - 4, py + 17, 8, 13);
  ctx.fillStyle = '#56351d';
  ctx.fillRect(cx + 1, py + 17, 3, 13);
  circle(ctx, cx, py + 9, 15, '#2f7d3b');
  circle(ctx, cx - 4, py + 6, 11, '#3d9446');
  circle(ctx, cx - 6, py + 2, 6, '#57ad55');
  if (r > 0.86) {
    ctx.fillStyle = '#e8473c';
    ctx.fillRect(cx + 5, py + 6, 3, 3);
    ctx.fillRect(cx - 7, py + 12, 3, 3);
    ctx.fillRect(cx + 2, py + 15, 3, 3);
  }
}
