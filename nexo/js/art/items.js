/* NEXO — Objetos das missões no mundo, em pixel art (saco de sementes, semeadeira, baldes,
 * comporta, cesto, caldeirão, pacotes e canteiros).
 *
 * Cada objeto é pintado pixel a pixel pelo motor de art/pixel.js: volume pela luz (vinda de
 * cima, à esquerda), textura do material (trama da juta, tábuas, vime, ferro) e contorno
 * na cor escura do material. Partes que se mexem (roda, volante, fogo) têm quadros
 * próprios, também em cache. (x, y) é o ponto em que o objeto encosta no chão.
 */

import { Pix, ramp, customRamp, lightOf, toneOf, sprite, blit, pixelShadow, noise } from './pixel.js';

const BURLAP = ramp('#c4945a');
const BURLAP_TOP = ramp('#d8b07a');
const ROPE = ramp('#8c5a2c');
const SEED = ramp('#e0b048');
const WOOD = ramp('#9a6232');
const WOOD_LIGHT = ramp('#b98448');
const WOOD_DARK = ramp('#6e4422');
const STEEL = ramp('#8f96aa');
const IRON = customRamp('#0c0a12', ['#15121c', '#221e2c', '#353142', '#545066', '#8c89a2']);
const RED = ramp('#cc3b30');
const WATER = ramp('#4c9fe0');
const LEAF = ramp('#4f9e44');
const LEAF_LIGHT = ramp('#79c95a');
const WICKER = ramp('#c28b4a');
const CLOTH = ramp('#e2cda2');
const SOIL = ramp('#86522f');
const STONE = ramp('#9a958c');
const CREAM = '#f3e7cb';
const HOLE = '#3a2316';

/* ---------- Saco de sementes (juta) ---------- */

function seedPixel(pix, x, y) {
  pix.set(x, y, SEED.t[3], SEED.o);
  pix.set(x + 1, y, SEED.t[2], SEED.o);
  pix.set(x, y - 1, SEED.t[4], SEED.o);
  pix.set(x + 1, y + 1, SEED.t[1], SEED.o);
}

function buildSack() {
  const pix = new Pix(26, 30);
  const cx = 13;
  const weave = (x, y) => ((x + y) & 1 ? 0.05 : -0.04) + ((x & 1) && (y & 1) ? -0.05 : 0);

  // Corpo bojudo, assentado no chão
  const halfWidth = (y) => {
    const t = (y - 11) / 17;
    let hw = 4.5 + 6.8 * Math.sin(Math.min(1, t * 1.4) * Math.PI / 2);
    if (y >= 26) hw -= (y - 25) * 1.3;
    return hw;
  };
  for (let y = 11; y <= 28; y++) {
    const hw = halfWidth(y);
    for (let x = 0; x < pix.w; x++) {
      const nx = (x + 0.5 - cx) / hw;
      if (Math.abs(nx) > 1) continue;
      const ny = Math.max(-1, Math.min(1, (y - 21) / 9)) * 0.75;
      const level = lightOf(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny * 0.4)) + 0.2) + weave(x, y) - (y >= 27 ? 0.15 : 0);
      pix.set(x, y, toneOf(level, x, y, BURLAP), BURLAP.o);
    }
  }
  // Dobras do tecido: vinco escuro com borda iluminada
  for (let y = 13; y <= 21; y++) {
    const x = cx - 5 + Math.round(Math.sin(y * 0.45));
    pix.set(x, y, BURLAP.t[1]);
    pix.set(x - 1, y, BURLAP.t[3]);
  }
  for (let y = 15; y <= 25; y++) {
    const x = cx + 6 + Math.round(Math.sin(y * 0.4 + 1));
    pix.set(x, y, BURLAP.t[0]);
    pix.set(x - 1, y, BURLAP.t[2]);
  }

  // Etiqueta costurada com um broto
  const lx = cx - 4;
  const ly = 16;
  pix.rect(lx, ly, 8, 7, CREAM);
  pix.rect(lx + 6, ly + 1, 2, 6, '#ddd0ae');
  pix.rect(lx, ly + 6, 8, 1, '#d2c39c');
  for (let i = 0; i < 8; i += 2) {
    pix.set(lx + i, ly, '#8a6436');
    pix.set(lx + i + 1, ly + 6, '#8a6436');
  }
  for (let j = 1; j < 6; j += 2) {
    pix.set(lx, ly + j, '#8a6436');
    pix.set(lx + 7, ly + j + 1, '#8a6436');
  }
  pix.set(lx + 3, ly + 5, '#3f7f34');
  pix.set(lx + 3, ly + 4, '#3f7f34');
  pix.set(lx + 3, ly + 3, '#4f9e44');
  pix.set(lx + 2, ly + 2, '#6cbf55');
  pix.set(lx + 1, ly + 2, '#4f9e44');
  pix.set(lx + 4, ly + 2, '#6cbf55');
  pix.set(lx + 5, ly + 1, '#8fe07a');

  // Boca franzida (babado) aberta para cima
  for (let y = 3; y <= 10; y++) {
    const hw = 4.5 + (10 - y) * 0.85;
    for (let x = 0; x < pix.w; x++) {
      const dx = x + 0.5 - cx;
      if (Math.abs(dx) > hw) continue;
      if (y === 3 && Math.abs(dx) > hw - 1.2) continue; // cantos arredondados
      const nx = dx / hw;
      const gather = (Math.round(dx) % 3 === 0 ? -0.22 : 0) + (Math.round(dx) % 3 === 1 ? 0.08 : 0);
      const level = lightOf(nx, -0.35, Math.sqrt(Math.max(0, 1 - nx * nx)) + 0.3) + gather + weave(x, y) * 0.6;
      pix.set(x, y, toneOf(level, x, y, BURLAP_TOP), BURLAP_TOP.o);
    }
  }
  // Interior escuro com sementes aparecendo
  for (let y = 3; y <= 6; y++) {
    for (let x = 0; x < pix.w; x++) {
      if (((x + 0.5 - cx) / 6.8) ** 2 + ((y + 0.5 - 4.6) / 1.9) ** 2 <= 1) pix.set(x, y, y === 3 ? '#2a170c' : HOLE);
    }
  }
  [[cx - 5, 5], [cx - 3, 5], [cx - 1, 6], [cx + 1, 5], [cx + 3, 5], [cx - 2, 4], [cx + 2, 4], [cx + 5, 5]].forEach(([x, y]) => seedPixel(pix, x, y));

  // Corda trançada no pescoço, com nó e pontas soltas
  for (let x = cx - 6; x <= cx + 5; x++) {
    for (const y of [10, 11]) {
      const k = (x + y) % 3;
      pix.set(x, y, ROPE.t[k === 0 ? 1 : k === 1 ? 2 : 3], ROPE.o);
    }
  }
  pix.rect(cx + 2, 11, 3, 2, ROPE.t[2], ROPE.o);
  pix.set(cx + 2, 11, ROPE.t[4]);
  [[cx + 4, 13], [cx + 5, 14], [cx + 5, 15], [cx + 2, 13], [cx + 2, 14], [cx + 1, 15]].forEach(([x, y], i) => pix.set(x, y, i % 2 ? ROPE.t[1] : ROPE.t[2], ROPE.o));

  pix.outline();
  return { pix, ax: cx, ay: 29 };
}

export function drawSeedSack(ctx, x, y, scale = 1) {
  pixelShadow(ctx, x + 1, y, 12 * scale, Math.max(1, Math.round(2 * scale)));
  blit(ctx, sprite('sack', buildSack), x, y, scale);
}

/* ---------- Punhado de sementes numa cuia ---------- */

function buildBowl(count) {
  const pix = new Pix(18, 12);
  const cx = 9;
  // Montinho de sementes acima da borda
  const spots = [[cx - 2, 4], [cx, 4], [cx + 2, 4], [cx - 4, 5], [cx + 4, 5], [cx - 1, 3], [cx + 1, 3], [cx - 3, 4], [cx + 3, 4], [cx, 2]];
  spots.slice(0, Math.min(count, spots.length)).forEach(([x, y]) => seedPixel(pix, x, y));
  // Cuia de madeira (meia esfera)
  for (let y = 5; y <= 11; y++) {
    for (let x = 0; x < pix.w; x++) {
      const nx = (x + 0.5 - cx) / 8;
      const ny = (y + 0.5 - 5) / 6.5;
      if (nx * nx + ny * ny > 1) continue;
      const level = lightOf(nx, ny * 0.8, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) + 0.2) + (noise(x, y, 5) > 0.85 ? -0.12 : 0);
      pix.set(x, y, toneOf(level, x, y, WOOD), WOOD.o);
    }
  }
  for (let x = cx - 7; x <= cx + 6; x++) pix.set(x, 5, x < cx ? WOOD.t[4] : WOOD.t[3]);
  pix.outline();
  return { pix, ax: cx, ay: 11 };
}

export function drawSeedBowl(ctx, x, y, count) {
  blit(ctx, sprite(`bowl:${Math.min(count, 10)}`, () => buildBowl(count)), x, y + 3);
}

/* ---------- Semeadeira de empurrar ---------- */

function thickLine(pix, x0, y0, x1, y1, R, light = 2) {
  pix.line(x0, y0, x1, y1, R.t[light + 1], R.o);
  pix.line(x0, y0 + 1, x1, y1 + 1, R.t[light], R.o);
  pix.line(x0, y0 + 2, x1, y1 + 2, R.t[light - 1], R.o);
}

function buildSeederBody() {
  const pix = new Pix(44, 36);

  // Cabos de empurrar (o de trás mais escuro) e manoplas vermelhas
  thickLine(pix, 28, 18, 39, 3, WOOD_DARK, 1);
  thickLine(pix, 26, 19, 37, 4, WOOD, 2);
  for (const [gx, gy] of [[38, 0], [36, 1]]) {
    pix.rect(gx, gy, 3, 4, RED.t[2], RED.o);
    pix.set(gx, gy, RED.t[4]);
    pix.set(gx + 1, gy, RED.t[3]);
    pix.set(gx + 2, gy + 3, RED.t[0]);
  }

  // Chassi: viga do eixo da roda até o pé traseiro
  thickLine(pix, 9, 27, 31, 28, WOOD_DARK, 2);
  thickLine(pix, 30, 25, 32, 33, WOOD_DARK, 2);
  pix.rect(29, 33, 6, 2, STEEL.t[1], STEEL.o);
  pix.rect(29, 33, 6, 1, STEEL.t[3]);

  // Tubo por onde a semente cai
  pix.cylinder(21, 21, 3, 9, STEEL);
  pix.rect(20, 29, 5, 1, STEEL.t[1], STEEL.o);

  // Funil de madeira: largo em cima, tábuas com veios, lateral direita em sombra
  const top = 7;
  const bottom = 21;
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / (bottom - top);
    const left = Math.round(11 + t * 4);
    const right = Math.round(32 - t * 4);
    for (let x = left; x <= right; x++) {
      const side = x >= right - 2;
      const plankEdge = (y - top) % 4 === 3;
      let level = 0.78 - ((x - left) / (right - left)) * 0.35 + (noise(x, y, 7) > 0.88 ? -0.14 : 0) + (noise(x >> 2, y, 8) - 0.5) * 0.08;
      if (side) level = 0.2;
      if (plankEdge) level -= 0.3;
      if ((y - top) % 4 === 0) level += 0.12;
      pix.set(x, y, toneOf(level, x, y, WOOD_LIGHT), WOOD_LIGHT.o);
    }
  }
  // Borda de cima (tampa) e cinta de metal com rebites
  for (let x = 10; x <= 33; x++) pix.set(x, top - 1, x < 30 ? WOOD_LIGHT.t[4] : WOOD_LIGHT.t[2], WOOD_LIGHT.o);
  for (let y = 13; y <= 14; y++) {
    const t = (y - top) / (bottom - top);
    const left = Math.round(11 + t * 4);
    const right = Math.round(32 - t * 4);
    for (let x = left; x <= right; x++) {
      const nx = ((x - left) / (right - left)) * 2 - 1;
      pix.set(x, y, toneOf(lightOf(nx, y === 13 ? -0.6 : 0.3, 0.8), x, y, STEEL), STEEL.o);
    }
    if (y === 13) for (let x = left + 2; x < right; x += 5) pix.set(x, y, STEEL.t[4]);
    if (y === 14) for (let x = left + 2; x < right; x += 5) pix.set(x, y, STEEL.t[0]);
  }
  // Monte de sementes no topo
  for (let y = 2; y <= 6; y++) {
    for (let x = 11; x <= 32; x++) {
      const nx = (x + 0.5 - 21.5) / 10.5;
      const ny = (y + 0.5 - 6.2) / 4.2;
      if (nx * nx + ny * ny > 1) continue;
      const n = noise(x, y, 3);
      const level = lightOf(nx, ny, 0.7) + (n > 0.7 ? 0.2 : n < 0.25 ? -0.2 : 0);
      pix.set(x, y, toneOf(level, x, y, SEED), SEED.o);
    }
  }
  pix.outline();
  return { pix, ax: 18, ay: 35 };
}

/** Roda raiada: 6 raios, então 6 quadros cobrem uma volta inteira de 60°. */
function buildWheel(frame) {
  const size = 17;
  const pix = new Pix(size, size);
  const c = 8.5;
  const angle = (frame / 6) * (Math.PI / 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      if (d > 8.2) continue;
      if (d >= 6.6) pix.set(x, y, toneOf(lightOf(dx / d, dy / d, 0.35), x, y, IRON, { min: 1 }), IRON.o);
      else if (d >= 5.4) pix.set(x, y, toneOf(lightOf(dx / d, dy / d, 0.6), x, y, WOOD), WOOD.o);
      else if (d <= 1.8) pix.set(x, y, d < 1 ? STEEL.t[4] : STEEL.t[2], STEEL.o);
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI) / 3;
    pix.line(c - 0.5 + Math.cos(a) * 2, c - 0.5 + Math.sin(a) * 2, c - 0.5 + Math.cos(a) * 5.2, c - 0.5 + Math.sin(a) * 5.2, Math.sin(a) < 0 ? WOOD.t[3] : WOOD.t[1], WOOD.o);
  }
  return { pix, ax: 8, ay: 8 };
}

export function drawSeederMachine(ctx, x, y, t) {
  pixelShadow(ctx, x + 2, y, 18, 2);
  blit(ctx, sprite('seeder', buildSeederBody), x, y);
  const frame = Math.floor(t * 9) % 6;
  blit(ctx, sprite(`seeder-wheel:${frame}`, () => buildWheel(frame)), x - 9, y - 8);
  // Semente caindo pelo tubo
  const drop = (t * 1.3) % 1;
  if (drop < 0.55) {
    ctx.fillStyle = SEED.t[3];
    ctx.fillRect(Math.round(x + 4), Math.round(y - 5 + drop * 9), 2, 2);
    ctx.fillStyle = SEED.t[4];
    ctx.fillRect(Math.round(x + 4), Math.round(y - 5 + drop * 9), 1, 1);
  }
}

/* ---------- Balde de madeira ---------- */

function buildBucket() {
  const pix = new Pix(15, 17);
  const cx = 7.5;
  // Alça de arame
  for (let a = Math.PI * 1.08; a <= Math.PI * 1.92; a += 0.05) {
    pix.set(cx - 0.5 + Math.cos(a) * 6, 7 + Math.sin(a) * 6, STEEL.t[a < Math.PI * 1.5 ? 3 : 1], STEEL.o);
  }
  // Corpo afunilado com aduelas
  for (let y = 6; y <= 16; y++) {
    const hw = 6.4 - ((y - 6) / 10) * 1.3;
    for (let x = 0; x < pix.w; x++) {
      const nx = (x + 0.5 - cx) / hw;
      if (Math.abs(nx) > 1) continue;
      let level = lightOf(nx, -0.1, Math.sqrt(1 - nx * nx) + 0.2);
      if (Math.round((x + 0.5 - cx) * 1.6) % 3 === 0) level -= 0.22;
      const hoop = y === 8 || y === 9 || y === 14;
      pix.set(x, y, hoop ? toneOf(level + 0.05, x, y, STEEL) : toneOf(level, x, y, WOOD), hoop ? STEEL.o : WOOD.o);
    }
  }
  // Boca com água e reflexo
  for (let x = 2; x <= 12; x++) pix.set(x, 6, WOOD.t[x < 8 ? 4 : 3]);
  for (let x = 3; x <= 11; x++) pix.set(x, 7, x < 6 ? WATER.t[4] : x < 9 ? WATER.t[3] : WATER.t[2]);
  pix.outline();
  return { pix, ax: 7, ay: 16 };
}

export function drawWoodBucket(ctx, x, y) {
  blit(ctx, sprite('bucket', buildBucket), x, y);
}

/* ---------- Comporta: cano com volante ---------- */

function buildValveBase() {
  const pix = new Pix(21, 26);
  // Laje de pedra
  for (let y = 20; y <= 25; y++) {
    for (let x = 1; x <= 19; x++) {
      if ((y === 20 || y === 25) && (x === 1 || x === 19)) continue;
      let level = y === 20 ? 0.9 : 0.62 - (x / 19) * 0.25 + (noise(x, y, 4) - 0.5) * 0.15;
      if (x === 8 && y > 20) level -= 0.35;
      pix.set(x, y, toneOf(level, x, y, STONE), STONE.o);
    }
  }
  // Cano e flanges
  pix.cylinder(8, 6, 5, 14, STEEL);
  pix.cylinder(7, 13, 7, 2, STEEL, { shift: (x, y) => (y === 13 ? 0.15 : -0.1) });
  pix.cylinder(7, 18, 7, 2, STEEL, { shift: (x, y) => (y === 18 ? 0.15 : -0.1) });
  pix.outline();
  return { pix, ax: 10, ay: 25 };
}

function buildHandwheel(frame) {
  const size = 19;
  const pix = new Pix(size, size);
  const c = 9.5;
  const angle = (frame / 4) * (Math.PI / 2);
  // Raios primeiro (o aro e o cubo ficam por cima)
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2;
    pix.line(c - 0.5 + Math.cos(a) * 2, c - 0.5 + Math.sin(a) * 2, c - 0.5 + Math.cos(a) * 7, c - 0.5 + Math.sin(a) * 7, Math.sin(a) < 0.2 ? RED.t[3] : RED.t[1]);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      if (d > 9.3) continue;
      if (d > 8.4 || (d >= 6.3 && d < 6.9)) {
        pix.set(x, y, RED.o); // contorno de fora e de dentro do aro
      } else if (d >= 6.9) {
        const across = (d - 7.65) / 0.75; // seção do aro: -1 (dentro) a 1 (fora)
        pix.set(x, y, toneOf(lightOf(dx / d + across * 0.4, dy / d + across * 0.4, 0.85 - Math.abs(across) * 0.4), x, y, RED));
      } else if (d <= 2.2) {
        pix.set(x, y, d > 1.6 ? STEEL.o : d < 0.9 ? STEEL.t[4] : STEEL.t[2]);
      }
    }
  }
  return { pix, ax: 9, ay: 9 };
}

export function drawValveWheel(ctx, x, y, t) {
  pixelShadow(ctx, x, y, 11, 2);
  blit(ctx, sprite('valve', buildValveBase), x, y);
  const frame = ((Math.round(Math.sin(t) * 2) % 4) + 4) % 4;
  blit(ctx, sprite(`valve-wheel:${frame}`, () => buildHandwheel(frame)), x, y - 23);
}

/* ---------- Cesto de vime ---------- */

function rasterLeaf(pix, bx, by, angle, length, R) {
  for (let s = 0; s <= length; s += 0.5) {
    const width = Math.sin((s / length) * Math.PI) * 1.9;
    for (let w = -width; w <= width; w += 0.5) {
      const x = bx + Math.cos(angle) * s - Math.sin(angle) * w;
      const y = by + Math.sin(angle) * s + Math.cos(angle) * w;
      const tone = Math.abs(w) < 0.5 ? 3 : w < 0 ? 2 : 1;
      pix.set(x, y, R.t[s > length * 0.8 ? 4 : tone], R.o);
    }
  }
}

function buildBasket(leaves) {
  const pix = new Pix(28, 22);
  const cx = 14;
  if (leaves) {
    rasterLeaf(pix, 7, 10, -2.3, 8, LEAF);
    rasterLeaf(pix, 11, 10, -1.95, 9, LEAF_LIGHT);
    rasterLeaf(pix, 14, 10, -1.6, 10, LEAF);
    rasterLeaf(pix, 17, 10, -1.2, 9, LEAF_LIGHT);
    rasterLeaf(pix, 20, 10, -0.75, 8, LEAF);
  }
  // Corpo trançado (pontos de vime desencontrados) com volume
  for (let y = 10; y <= 21; y++) {
    const hw = 12 - ((y - 10) / 11) * 2.5 - (y >= 20 ? (y - 19) * 1.2 : 0);
    for (let x = 0; x < pix.w; x++) {
      const nx = (x + 0.5 - cx) / hw;
      if (Math.abs(nx) > 1) continue;
      const row = Math.floor((y - 10) / 2);
      const cell = (x + (row % 2) * 2) % 4;
      const weave = cell === 1 ? 0.18 : cell === 3 ? -0.28 : 0;
      const groove = (y - 10) % 2 === 1 ? -0.12 : 0;
      const level = lightOf(nx, 0.1, Math.sqrt(1 - nx * nx) + 0.25) + weave + groove - (y >= 21 ? 0.2 : 0);
      pix.set(x, y, toneOf(level, x, y, WICKER), WICKER.o);
    }
  }
  // Borda grossa trançada
  for (let x = 1; x <= 26; x++) {
    for (const y of [9, 10]) pix.set(x, y, (x + y) % 2 ? WICKER.t[x < 18 ? 4 : 3] : WICKER.t[1], WICKER.o);
  }
  pix.outline();
  return { pix, ax: cx, ay: 21 };
}

export function drawWickerBasket(ctx, x, y, { leaves = true, shadow = true } = {}) {
  if (shadow) pixelShadow(ctx, x, y, 13, 2);
  blit(ctx, sprite(`basket:${leaves}`, () => buildBasket(leaves)), x, y);
}

/* ---------- Caldeirão de ferro sobre o fogo ---------- */

function buildCauldron(liquid) {
  const pix = new Pix(34, 30);
  const cx = 17;
  const L = ramp(liquid);
  // Lenha cruzada na frente da base
  thickLine(pix, 4, 27, 29, 25, WOOD_DARK, 2);
  thickLine(pix, 5, 24, 30, 27, WOOD, 2);
  // Pezinhos
  pix.rect(7, 22, 3, 4, IRON.t[1], IRON.o);
  pix.rect(24, 22, 3, 4, IRON.t[1], IRON.o);
  // Bojo (esfera achatada) com brilho
  for (let y = 7; y <= 24; y++) {
    for (let x = 0; x < pix.w; x++) {
      const nx = (x + 0.5 - cx) / 14;
      const ny = (y + 0.5 - 13) / 11;
      if (nx * nx + ny * ny > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const level = lightOf(nx, ny, nz + 0.1);
      pix.set(x, y, level > 0.93 ? IRON.t[4] : toneOf(level * 0.9, x, y, IRON, { max: 3 }), IRON.o);
    }
  }
  // Borda grossa e líquido
  for (let y = 3; y <= 10; y++) {
    for (let x = 0; x < pix.w; x++) {
      const outer = ((x + 0.5 - cx) / 15.5) ** 2 + ((y + 0.5 - 7) / 3.6) ** 2;
      const inner = ((x + 0.5 - cx) / 12.5) ** 2 + ((y + 0.5 - 7) / 2.4) ** 2;
      if (outer > 1) continue;
      if (inner <= 1) {
        const n = noise(x, y, 9);
        pix.set(x, y, y <= 5 ? L.t[1] : n > 0.8 ? L.t[4] : x < cx - 3 ? L.t[3] : L.t[2]);
      } else {
        pix.set(x, y, y < 7 ? (x < cx ? IRON.t[4] : IRON.t[3]) : IRON.t[2], IRON.o);
      }
    }
  }
  pix.outline();
  return { pix, ax: cx, ay: 29 };
}

function buildFire(frame) {
  const pix = new Pix(26, 12);
  const colors = ['#c23b2a', '#ff7a2a', '#ffb43a', '#ffe08a', '#fff6c8'];
  for (let i = 0; i < 6; i++) {
    const base = 2 + i * 4;
    const h = 5 + ((i * 7 + frame * 3) % 5) + (i % 2) * 2;
    for (let j = 0; j < h; j++) {
      const w = Math.max(0, Math.round((1 - j / h) * 2.2));
      const sway = Math.round(Math.sin(frame * 1.7 + i + j * 0.6) * 0.8);
      for (let k = -w; k <= w; k++) {
        const heat = 1 - j / h - Math.abs(k) * 0.18;
        const color = colors[Math.max(0, Math.min(4, Math.round(heat * 4.4)))];
        pix.set(base + k + sway, 11 - j, color);
      }
    }
  }
  return { pix, ax: 13, ay: 11 };
}

export function drawIronCauldron(ctx, x, y, liquid, t, bubbling = 0.7) {
  pixelShadow(ctx, x, y, 17, 2);
  // Brilho do fogo no chão
  ctx.fillStyle = 'rgba(255, 150, 60, .18)';
  ctx.fillRect(Math.round(x - 15), Math.round(y - 3), 30, 4);
  const frame = Math.floor(t * 10) % 4;
  blit(ctx, sprite(`fire:${frame}`, () => buildFire(frame)), x, y - 2);
  blit(ctx, sprite(`cauldron:${liquid}`, () => buildCauldron(liquid)), x, y);
  // Bolhas e vapor (pixels subindo)
  for (let i = 0; i < 4; i++) {
    const phase = (t * bubbling + i / 4) % 1;
    const bx = Math.round(x - 7 + i * 5 + Math.sin(t * 2 + i) * 1.5);
    const by = Math.round(y - 23 - phase * 12);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * (1 - phase)})`;
    const size = phase < 0.4 ? 1 : 2;
    ctx.fillRect(bx, by, size, size);
    if (size === 2) ctx.fillRect(bx - 1, by + 1, 1, 1);
  }
}

/* ---------- Pacote de cristais (trouxinha de pano) ---------- */

function buildPack(color) {
  const pix = new Pix(16, 16);
  const cx = 8;
  const S = ramp(color);
  // Cristais saindo pelo nó
  [[6, '#5fe3d0', 4], [8, '#b48cff', 5], [10, '#e3fffb', 3]].forEach(([x0, c, h]) => {
    const C = ramp(c);
    for (let j = 0; j < h; j++) {
      pix.set(x0, 5 - j, C.t[j === h - 1 ? 4 : 3], C.o);
      if (j < h - 2) pix.set(x0 + 1, 5 - j, C.t[1], C.o);
    }
  });
  // Trouxa de pano
  for (let y = 5; y <= 15; y++) {
    const hw = y <= 7 ? 2.2 + (y - 5) * 1.2 : 6.8 - Math.max(0, y - 12) * 1.1;
    for (let x = 0; x < pix.w; x++) {
      const nx = (x + 0.5 - cx) / hw;
      if (Math.abs(nx) > 1) continue;
      const stripe = y === 11 || y === 12;
      const level = lightOf(nx, (y - 11) / 6, Math.sqrt(1 - nx * nx) + 0.3) + (Math.round(x - cx) % 3 === 0 && y < 10 ? -0.15 : 0);
      pix.set(x, y, stripe ? toneOf(level, x, y, S) : toneOf(level, x, y, CLOTH), stripe ? S.o : CLOTH.o);
    }
  }
  // Barbante
  for (let x = cx - 3; x <= cx + 2; x++) pix.set(x, 7, x % 2 ? ROPE.t[1] : ROPE.t[2], ROPE.o);
  pix.outline();
  return { pix, ax: cx, ay: 15 };
}

export function drawCrystalPack(ctx, x, y, color) {
  blit(ctx, sprite(`pack:${color}`, () => buildPack(color)), x, y + 2);
}

/* ---------- Canteiro de terra arada ---------- */

function buildBed(w, h) {
  const W = Math.round(w);
  const H = Math.round(h);
  const pix = new Pix(W + 2, H + 2);
  const corner = 3;
  for (let y = 1; y <= H; y++) {
    for (let x = 1; x <= W; x++) {
      const cxDist = Math.max(0, corner + 1 - x, x - (W - corner));
      const cyDist = Math.max(0, corner + 1 - y, y - (H - corner));
      if (cxDist * cxDist + cyDist * cyDist > corner * corner + 1) continue;
      // Leiras: crista iluminada, encosta, sulco escuro
      const band = (y - 1) % 6;
      let level = [0.74, 0.64, 0.52, 0.42, 0.3, 0.14][band];
      level += (noise(x, y, 2) - 0.5) * 0.08 + (x < W * 0.3 ? 0.03 : 0) - (y > H - 2 ? 0.2 : 0);
      const clod = noise(x, y, 6);
      let color = toneOf(level, x, y, SOIL, { max: 3 });
      if (clod > 0.993) color = STONE.t[2];
      else if (clod > 0.982 && band < 3) color = SOIL.t[3];
      pix.set(x, y, color, SOIL.o);
    }
  }
  pix.outline();
  return { pix, ax: 1, ay: 1 };
}

export function drawSoilBed(ctx, left, top, w, h) {
  ctx.fillStyle = 'rgba(40, 20, 10, .25)';
  ctx.fillRect(Math.round(left + 2), Math.round(top + h + 1), Math.round(w - 2), 2);
  blit(ctx, sprite(`bed:${Math.round(w)}x${Math.round(h)}`, () => buildBed(w, h)), left, top);
}

/** Semente plantada no canteiro, ou broto crescendo (sprout de 0 a 1), em pixels. */
export function drawPlantedSeed(ctx, x, y, sprout, t, index) {
  const px = Math.round(x);
  const py = Math.round(y);
  const dot = (dx, dy, color, w = 1, hh = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(px + dx, py + dy, w, hh);
  };
  if (sprout > 0) {
    const h = Math.round(2 + sprout * 5);
    const sway = Math.round(Math.sin(t * 2 + index) * sprout * 0.9);
    dot(-1, 1, HOLE, 3, 1);
    for (let j = 0; j < h; j++) dot(j > h / 2 ? sway : 0, -j, j < 2 ? '#3f7f34' : '#4f9e44');
    const tip = -h + 1;
    const leaf = Math.max(1, Math.round(sprout * 3));
    dot(sway - leaf, tip, '#6cbf55', leaf, 1);
    dot(sway - leaf, tip - 1, '#8fe07a', 1, 1);
    dot(sway + 1, tip - 1, '#5aa84a', leaf, 1);
    dot(sway + leaf, tip - 2, '#8fe07a', 1, 1);
    return;
  }
  const glow = 0.18 + Math.sin(t * 3 + index) * 0.08;
  dot(-2, -1, `rgba(255, 236, 140, ${glow})`, 5, 3);
  dot(-1, 1, HOLE, 3, 1);
  dot(0, -1, SEED.t[4]);
  dot(1, -1, SEED.t[3]);
  dot(0, 0, SEED.t[3]);
  dot(1, 0, SEED.t[1]);
}
