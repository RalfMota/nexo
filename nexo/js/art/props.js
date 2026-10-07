/* NEXO — Objetos do cenário em pixel art: postes de luz, caixotes, barris, cercas, placas,
 * mural, bancas do Mercado, chafariz e as bases dos cristais e das engrenagens.
 *
 * Mesmo motor e mesmas regras dos objetos das missões (art/pixel.js). As partes fixas são
 * pintadas uma vez na camada de fundo do mapa; a cabeça do poste (acesa ou apagada) é
 * desenhada a cada quadro por cima do brilho da luz.
 */

import { Pix, ramp, customRamp, lightOf, toneOf, sprite, blit, pixelShadow, noise } from './pixel.js';

const T = 32;
const WOOD = ramp('#9a6232');
const WOOD_LIGHT = ramp('#b98448');
const WOOD_DARK = ramp('#6e4422');
const IRON = customRamp('#121019', ['#1c1a24', '#2a2833', '#3d3b48', '#5a5868', '#8c8a9c']);
const STEEL = ramp('#8f96aa');
const STONE = ramp('#a39d92');
const STONE_DARK = ramp('#857f75');
const BRASS = ramp('#d9a640');
const WATER = ramp('#4c9fe0');
const PAPER = ramp('#efe4c8');
const CORK = ramp('#b98a5a');

/** Tábuas horizontais com veios, emendas e pregos. */
function planks(pix, x0, y0, w, h, R, { plank = 4, light = 0.7, seed = 0 } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / plank);
      const inRow = (y - y0) % plank;
      let level = light - ((x - x0) / w) * 0.25 + (noise(row, seed, 3) - 0.5) * 0.12;
      if (inRow === 0) level += 0.14;
      if (inRow === plank - 1) level -= 0.3;
      if (noise(x, y, seed + 11) > 0.9) level -= 0.12;
      const seam = x0 + 3 + Math.floor(noise(row, seed, 4) * (w - 6));
      if (x === seam && inRow !== 0) level -= 0.35;
      pix.set(x, y, toneOf(level, x, y, R), R.o);
    }
  }
}

/* ---------- Poste de luz ---------- */

function buildLampPost() {
  const pix = new Pix(14, 30);
  // Base de pedra
  for (let y = 25; y <= 29; y++) {
    for (let x = 2; x <= 11; x++) {
      if (y === 25 && (x === 2 || x === 11)) continue;
      pix.set(x, y, toneOf(y === 25 ? 0.95 : 0.6 - (x - 2) * 0.03 + (noise(x, y, 1) - 0.5) * 0.15, x, y, STONE), STONE.o);
    }
  }
  // Coluna de ferro com anéis decorativos
  pix.cylinder(5, 3, 4, 22, IRON, { min: 1 });
  pix.cylinder(4, 21, 6, 4, IRON, { min: 1, shift: (x, y) => (y === 21 ? 0.2 : 0) });
  pix.cylinder(4, 12, 6, 1, IRON, { min: 1, shift: () => 0.15 });
  pix.cylinder(4, 3, 6, 2, IRON, { min: 1, shift: () => 0.1 });
  pix.outline();
  return { pix, ax: 7, ay: 29 };
}

function buildLampHead(lit) {
  const pix = new Pix(14, 17);
  const glass = lit ? ['#ffb84a', '#ffd76a', '#ffeaa0', '#fff8d8'] : ['#3d4458', '#4f5870', '#66708a', '#8a94ac'];
  // Telhadinho e ponta
  pix.set(6, 0, BRASS.t[4], BRASS.o);
  pix.set(7, 0, BRASS.t[2], BRASS.o);
  for (let y = 1; y <= 4; y++) {
    const hw = 1 + y * 1.4;
    for (let x = 0; x < 14; x++) {
      const dx = x + 0.5 - 7;
      if (Math.abs(dx) > hw) continue;
      pix.set(x, y, toneOf(lightOf(dx / hw, -0.6, 0.6), x, y, IRON, { min: 1 }), IRON.o);
    }
  }
  // Vidros com caixilho
  for (let y = 5; y <= 13; y++) {
    for (let x = 2; x <= 11; x++) {
      const frame = x === 2 || x === 11 || x === 6 || x === 7 || y === 13;
      if (frame) {
        pix.set(x, y, x <= 6 ? IRON.t[3] : IRON.t[1], IRON.o);
      } else {
        const g = (y < 8 ? 3 : y < 11 ? 2 : 1) - (x > 7 ? 1 : 0);
        pix.set(x, y, glass[Math.max(0, g)], IRON.o);
      }
    }
  }
  if (lit) {
    pix.set(4, 9, '#ffffff');
    pix.set(9, 9, '#ffffff');
  } else {
    pix.set(3, 6, '#b0bad0');
    pix.set(8, 6, '#b0bad0');
  }
  // Base da lanterna
  for (let x = 1; x <= 12; x++) pix.set(x, 14, x < 7 ? IRON.t[3] : IRON.t[2], IRON.o);
  pix.rect(5, 15, 4, 2, IRON.t[2], IRON.o);
  pix.outline();
  return { pix, ax: 7, ay: 16 };
}

/** Cabeça do poste (acesa ou apagada), desenhada por cima do brilho. */
export function drawLampHead(ctx, x, y, lit) {
  blit(ctx, sprite(`lamp-head:${lit}`, () => buildLampHead(lit)), x, y);
}

/* ---------- Caixote ---------- */

function buildCrate() {
  const pix = new Pix(28, 26);
  // Tampa (face de cima) mais clara
  planks(pix, 2, 2, 24, 5, WOOD_LIGHT, { plank: 5, light: 0.95, seed: 2 });
  // Frente em tábuas
  planks(pix, 2, 7, 24, 17, WOOD, { plank: 4, light: 0.7, seed: 5 });
  // Moldura e travessa diagonal
  const frame = (x, y) => pix.set(x, y, WOOD_DARK.t[x < 14 ? 3 : 2], WOOD_DARK.o);
  for (let y = 7; y <= 23; y++) {
    for (const x of [2, 3, 24, 25]) frame(x, y);
  }
  for (let x = 2; x <= 25; x++) {
    for (const y of [7, 8, 22, 23]) frame(x, y);
  }
  for (let i = 0; i <= 18; i++) {
    const x = 4 + Math.round((i / 18) * 19);
    const y = 21 - Math.round((i / 18) * 12);
    frame(x, y);
    frame(x, y + 1);
  }
  // Pregos
  for (const [nx, ny] of [[3, 8], [24, 8], [3, 22], [24, 22]]) {
    pix.set(nx, ny, STEEL.t[4]);
  }
  pix.outline();
  return { pix, ax: 0, ay: 0 };
}

/* ---------- Barril ---------- */

function buildBarrel() {
  const pix = new Pix(22, 26);
  const cx = 11;
  for (let y = 3; y <= 24; y++) {
    const bulge = Math.sin(((y - 3) / 21) * Math.PI);
    const hw = 7.5 + bulge * 2;
    for (let x = 0; x < 22; x++) {
      const nx = (x + 0.5 - cx) / hw;
      if (Math.abs(nx) > 1) continue;
      const hoop = y === 6 || y === 7 || y === 20 || y === 21;
      let level = lightOf(nx, (y - 14) / 30, Math.sqrt(1 - nx * nx) + 0.2);
      const stave = ((x + 0.5 - cx) / hw) * 4.5; // emendas entre as aduelas
      if (!hoop && Math.abs(stave - Math.round(stave)) < 0.15) level -= 0.25;
      pix.set(x, y, hoop ? toneOf(level, x, y, IRON, { min: 1 }) : toneOf(level, x, y, WOOD), hoop ? IRON.o : WOOD.o);
    }
  }
  // Tampa (elipse) com tábuas
  for (let y = 1; y <= 5; y++) {
    for (let x = 0; x < 22; x++) {
      const e = ((x + 0.5 - cx) / 7.6) ** 2 + ((y + 0.5 - 3.2) / 2.2) ** 2;
      if (e > 1) continue;
      pix.set(x, y, e > 0.7 ? WOOD_DARK.t[2] : x % 4 === 0 ? WOOD_LIGHT.t[2] : WOOD_LIGHT.t[3], WOOD_DARK.o);
    }
  }
  pix.outline();
  return { pix, ax: cx, ay: 24 };
}

/* ---------- Cerca (um bloco) ---------- */

function buildFence() {
  const pix = new Pix(32, 26);
  // Travessas
  for (const ry of [9, 17]) {
    for (let x = 0; x < 32; x++) {
      for (let j = 0; j < 3; j++) pix.set(x, ry + j, WOOD.t[j === 0 ? 3 : j === 1 ? 2 : 1], WOOD.o);
      if (noise(x, ry, 2) > 0.85) pix.set(x, ry + 1, WOOD.t[1]);
    }
  }
  // Mourões com ponta
  for (const px of [4, 22]) {
    for (let y = 3; y <= 25; y++) {
      for (let x = px; x < px + 6; x++) {
        const top = 3 + Math.abs(x - px - 2.5) * 0.9;
        if (y < top) continue;
        const level = 0.85 - (x - px) * 0.12 + (noise(x, y, 7) > 0.9 ? -0.15 : 0);
        pix.set(x, y, toneOf(level, x, y, WOOD_LIGHT), WOOD_LIGHT.o);
      }
    }
  }
  pix.outline();
  return { pix, ax: 0, ay: 0 };
}

/* ---------- Placa ---------- */

function buildSign() {
  const pix = new Pix(30, 32);
  // Estaca
  for (let y = 14; y <= 31; y++) for (let x = 13; x <= 16; x++) pix.set(x, y, toneOf(0.8 - (x - 13) * 0.18, x, y, WOOD_DARK), WOOD_DARK.o);
  // Tábua com moldura
  planks(pix, 2, 2, 26, 14, WOOD_LIGHT, { plank: 7, light: 0.8, seed: 9 });
  for (let x = 2; x <= 27; x++) {
    pix.set(x, 2, WOOD_DARK.t[3]);
    pix.set(x, 15, WOOD_DARK.t[1]);
  }
  for (let y = 2; y <= 15; y++) {
    pix.set(2, y, WOOD_DARK.t[3]);
    pix.set(27, y, WOOD_DARK.t[1]);
  }
  // "Escrita" entalhada
  for (const [y, len] of [[6, 16], [9, 12], [12, 14]]) {
    for (let x = 7; x < 7 + len; x++) if (noise(x, y, 4) > 0.15) pix.set(x, y, WOOD_DARK.t[1]);
  }
  pix.outline();
  return { pix, ax: 1, ay: 1 };
}

/* ---------- Mural de recados ---------- */

function buildBoard(w) {
  const W = w * T;
  const pix = new Pix(W, 34);
  // Pernas
  for (const lx of [5, W - 10]) for (let y = 18; y <= 33; y++) for (let x = lx; x < lx + 4; x++) pix.set(x, y, toneOf(0.8 - (x - lx) * 0.2, x, y, WOOD_DARK), WOOD_DARK.o);
  // Moldura e cortiça
  for (let y = 1; y <= 24; y++) {
    for (let x = 1; x < W - 1; x++) {
      const edge = y <= 2 || y >= 23 || x <= 2 || x >= W - 3;
      if (edge) pix.set(x, y, WOOD.t[y <= 2 || x <= 2 ? 3 : 1], WOOD.o);
      else pix.set(x, y, toneOf(0.55 + (noise(x, y, 5) - 0.5) * 0.3, x, y, CORK), CORK.o);
    }
  }
  // Papéis presos com tachinhas e um gráfico de linha
  const notes = [[6, 5, 14, 13, '#efe4c8'], [23, 4, 13, 10, '#ffe08a'], [39, 6, 16, 14, '#cfe8ff']];
  for (const [nx, ny, nw, nh, color] of notes) {
    if (nx + nw >= W - 3) continue;
    const P = ramp(color);
    pix.rect(nx, ny, nw, nh, P.t[3]);
    pix.rect(nx + nw - 1, ny + 1, 1, nh - 1, P.t[1]);
    pix.rect(nx + 1, ny + nh - 1, nw - 1, 1, P.t[1]);
    for (let r = ny + 3; r < ny + nh - 2; r += 2) pix.rect(nx + 2, r, nw - 5, 1, P.t[0]);
    pix.set(nx + Math.floor(nw / 2), ny, '#c2453b');
  }
  // Gráfico no primeiro papel
  const pts = [[8, 15], [11, 10], [14, 12], [17, 7]];
  for (let i = 0; i < pts.length - 1; i++) pix.line(...pts[i], ...pts[i + 1], '#c2453b');
  pix.outline();
  return { pix, ax: 0, ay: 0 };
}

/* ---------- Banca do Mercado ---------- */

function buildStall(w, color) {
  const W = w * T;
  const pix = new Pix(W + 4, 66);
  const C = ramp(color);
  const CL = ramp('#fff3dc');
  // Postes
  for (const px of [4, W - 4]) for (let y = 10; y <= 62; y++) for (let x = px; x < px + 3; x++) pix.set(x, y, toneOf(0.85 - (x - px) * 0.25, x, y, WOOD_DARK), WOOD_DARK.o);
  // Mercadorias: potes, cristais e frutas
  const goods = ['#5fe3d0', '#ff9fc0', '#f2b84b', '#b48cff', '#7fd36a'];
  for (let i = 0; i < 5; i++) {
    const gx = 8 + i * Math.floor((W - 14) / 5);
    const G = ramp(goods[(i + color.length) % goods.length]);
    if (i % 2) {
      // Pote de vidro com tampa
      for (let y = 30; y <= 37; y++) for (let x = gx; x < gx + 6; x++) pix.set(x, y, toneOf(lightOf((x - gx - 2.5) / 3, 0, 0.8), x, y, G), G.o);
      pix.rect(gx, 29, 6, 1, WOOD.t[3], WOOD.o);
      pix.set(gx + 1, 31, '#ffffff');
    } else {
      // Montinho redondo (frutas ou cristais polidos)
      for (const [ox, oy] of [[0, 34], [4, 34], [2, 31]]) {
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          if ((x === 0 || x === 3) && (y === 0 || y === 3)) continue;
          pix.set(gx + ox + x, oy + y, toneOf(lightOf((x - 1.5) / 2, (y - 1.5) / 2, 0.6), gx + ox + x, oy + y, G), G.o);
        }
      }
    }
  }
  // Balcão em tábuas com tampo
  planks(pix, 2, 38, W, 24, WOOD, { plank: 6, light: 0.72, seed: w + color.length });
  for (let x = 1; x <= W + 2; x++) {
    pix.set(x, 37, WOOD_LIGHT.t[4], WOOD_LIGHT.o);
    pix.set(x, 38, WOOD_LIGHT.t[2], WOOD_LIGHT.o);
  }
  // Toldo listrado com babado ondulado e sombra embaixo
  const stripe = Math.max(6, Math.round(W / 8));
  for (let y = 1; y <= 19; y++) {
    for (let x = 0; x < W + 4; x++) {
      const band = Math.floor(x / stripe) % 2 === 0;
      const local = x % stripe;
      if (y >= 15) {
        const cxs = stripe / 2;
        const r = ((local + 0.5 - cxs) / cxs) ** 2 + ((y - 14.5) / 4.5) ** 2;
        if (r > 1) continue;
      }
      const R = band ? C : CL;
      const level = 0.92 - y * 0.025 - (x / (W + 4)) * 0.15 + (local === 0 ? -0.12 : 0);
      pix.set(x, y, toneOf(level, x, y, R), R.o);
    }
  }
  pix.outline();
  // Sombra do toldo sobre o que está atrás
  return { pix, ax: 2, ay: 0 };
}

/* ---------- Chafariz ---------- */

function buildFountain(w, h) {
  const W = w * T;
  const H = h * T;
  const pix = new Pix(W, H);
  const cx = W / 2;
  const cy = H / 2 + 2;
  const rx = W / 2 - 2;
  const ry = H / 2 - 4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      const inner = ((x + 0.5 - cx) / (rx - 7)) ** 2 + ((y + 0.5 - cy + 1) / (ry - 6)) ** 2;
      if (e > 1) continue;
      if (inner <= 1) {
        // Água: mais funda no meio, com pontilhado de reflexo
        const depth = 1 - inner;
        const level = 0.75 - depth * 0.45 + (noise(x, y, 8) > 0.93 ? 0.35 : 0);
        pix.set(x, y, toneOf(level, x, y, WATER), WATER.o);
      } else {
        // Borda de pedras: blocos com emendas
        const angle = Math.atan2((y + 0.5 - cy) / ry, (x + 0.5 - cx) / rx);
        const block = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 14);
        const seam = Math.abs(((angle + Math.PI) / (Math.PI * 2)) * 14 - Math.round(((angle + Math.PI) / (Math.PI * 2)) * 14)) < 0.06;
        const top = y + 0.5 < cy;
        let level = (top ? 0.85 : 0.5) + (noise(block, 0, 3) - 0.5) * 0.15 - (x / W) * 0.12;
        if (seam) level -= 0.3;
        pix.set(x, y, toneOf(level, x, y, block % 3 ? STONE : STONE_DARK), STONE.o);
      }
    }
  }
  // Pilar central com bacia
  pix.cylinder(Math.round(cx) - 4, 14, 8, 22, STONE);
  for (let y = 11; y <= 15; y++) {
    const hw = 9 - Math.abs(y - 13) * 1.5;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) pix.set(x, y, toneOf(lightOf((x - cx) / hw, y < 13 ? -0.7 : 0.4, 0.6), x, y, STONE), STONE.o);
  }
  pix.outline();
  return { pix, ax: 0, ay: 0 };
}

/* ---------- Bases dos cristais e das engrenagens ---------- */

function buildCrystalBase() {
  const pix = new Pix(26, 12);
  pix.ellipsoid(13, 7, 11, 5, STONE_DARK, { test: (x, y) => y >= 3 });
  for (let x = 6; x <= 19; x++) if (noise(x, 4, 2) > 0.5) pix.set(x, 4, ramp('#6fbf5a').t[3]);
  pix.outline();
  return { pix, ax: 13, ay: 11 };
}

function buildGearBase() {
  const pix = new Pix(28, 26);
  pix.cylinder(12, 4, 4, 16, IRON, { min: 1 });
  for (let y = 19; y <= 25; y++) for (let x = 2; x <= 25; x++) {
    if (y === 19 && (x < 4 || x > 23)) continue;
    pix.set(x, y, toneOf(y === 19 ? 0.85 : 0.55 - (x - 2) * 0.015, x, y, IRON, { min: 1 }), IRON.o);
  }
  for (const rx of [5, 22]) pix.set(rx, 22, BRASS.t[4]);
  pix.outline();
  return { pix, ax: 0, ay: 0 };
}

/* ---------- Entrada: pinta um objeto fixo na camada de fundo ---------- */

/** Pinta o objeto em pixel art. Devolve false quando o tipo não é tratado aqui. */
export function paintPixelProp(ctx, prop) {
  const X = prop.x * T;
  const Y = prop.y * T;
  switch (prop.type) {
    case 'lamp':
      pixelShadow(ctx, X + 16, Y + 30, 7, 1);
      blit(ctx, sprite('lamp-post', buildLampPost), X + 16, Y + 30);
      return true;
    case 'crate':
      pixelShadow(ctx, X + 17, Y + 29, 14, 2);
      blit(ctx, sprite('crate', buildCrate), X + 2, Y + 4);
      return true;
    case 'barrel':
      pixelShadow(ctx, X + 17, Y + 29, 11, 2);
      blit(ctx, sprite('barrel', buildBarrel), X + 16, Y + 29);
      return true;
    case 'fence':
      for (let i = 0; i < prop.w; i++) blit(ctx, sprite('fence', buildFence), X + i * T, Y + 5);
      return true;
    case 'sign':
      pixelShadow(ctx, X + 16, Y + 31, 5, 1);
      blit(ctx, sprite('sign', buildSign), X + 1, Y);
      return true;
    case 'board':
      pixelShadow(ctx, X + (prop.w * T) / 2, Y + 32, prop.w * 12, 2);
      blit(ctx, sprite(`board:${prop.w}`, () => buildBoard(prop.w)), X, Y - 2);
      return true;
    case 'stall':
      pixelShadow(ctx, X + (prop.w * T) / 2 + 2, Y + 62, prop.w * 15, 2);
      blit(ctx, sprite(`stall:${prop.w}:${prop.color}`, () => buildStall(prop.w, prop.color)), X, Y);
      return true;
    case 'fountain':
      pixelShadow(ctx, X + (prop.w * T) / 2 + 2, Y + prop.h * T - 3, prop.w * 15, 3);
      blit(ctx, sprite(`fountain:${prop.w}x${prop.h}`, () => buildFountain(prop.w, prop.h)), X, Y);
      return true;
    case 'crystal':
      blit(ctx, sprite('crystal-base', buildCrystalBase), X + 16, Y + 30);
      return true;
    case 'gear':
      blit(ctx, sprite('gear-base', buildGearBase), X + 2, Y + 5);
      return true;
    default:
      return false;
  }
}
