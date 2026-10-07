/* NEXO — Pixel art da Torre dos Padrões por dentro (missão dos andares)
 *
 * Hastes de luz da parede (apagadas, acesas e "faltando"), brilho, porta em arco (fechada e
 * aberta, com a escada iluminada), blocos de energia, engrenagens, caixotes e as lâmpadas
 * dos andares. Tudo vira textura do Phaser na cena de interior.
 */

import { Pix, ramp, lightOf, toneOf, noise, sprite, customRamp } from './pixel.js';
import { drawRodPile, drawMineCart, drawLever, drawPedestal } from './mission-props.js';

export const CELL = 22; // lado de um módulo da grade, em pixels

const STONE = ramp('#6f7488');
const ROD = customRamp('#0b4a56', ['#127a86', '#2fb8c8', '#7fe6ff', '#c8f8ff', '#ffffff']);
const BAD = ramp('#d6493b');
const WOOD = ramp('#7a4a28');
const IRON = ramp('#4b4f60');
const BRASS = ramp('#d9a640');
const ENERGY = ramp('#3fe0c5');

/* ---------- Hastes da grade ---------- */

function buildRod(horizontal, state) {
  const long = CELL + 4;
  const pix = new Pix(horizontal ? long : 6, horizontal ? 6 : long);
  for (let a = 0; a < long; a++) {
    for (let b = 0; b < 6; b++) {
      const [x, y] = horizontal ? [a, b] : [b, a];
      const edge = b === 0 || b === 5;
      if (state === 'off') {
        // Sulco na pedra: borda escura, fundo levemente iluminado embaixo
        pix.set(x, y, edge ? STONE.t[0] : b === 4 ? STONE.t[2] : STONE.t[1]);
      } else if (state === 'bad') {
        pix.set(x, y, edge ? BAD.o : b === 2 ? BAD.t[4] : BAD.t[2]);
      } else {
        const tone = edge ? 0 : b === 2 || b === 3 ? 4 : 2;
        pix.set(x, y, ROD.t[tone]);
      }
    }
  }
  return { pix, ax: 0, ay: 0 };
}

export const rodSprite = (horizontal, state) => sprite(`torre:haste:${horizontal ? 'h' : 'v'}:${state}`, () => buildRod(horizontal, state));

/** Brilho suave (mistura aditiva no motor). */
export function glowCanvas(size = 40, color = '127, 230, 255') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color}, .9)`);
  g.addColorStop(0.4, `rgba(${color}, .35)`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/* ---------- Porta em arco (fechada e aberta) ---------- */

function buildDoor(open) {
  const W = 38;
  const H = 58;
  const pix = new Pix(W, H);
  const inside = (x, y) => {
    const r = (W - 6) / 2;
    if (y >= 3 + r) return x >= 3 && x < W - 3;
    return (x + 0.5 - W / 2) ** 2 + (y - 3 - r) ** 2 <= r * r;
  };
  // Moldura de pedra
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = W / 2;
      const outer = y >= r ? true : (x + 0.5 - W / 2) ** 2 + (y - r) ** 2 <= r * r;
      if (!outer) continue;
      if (inside(x, y)) continue;
      pix.set(x, y, toneOf(0.75 - (x / W) * 0.3 + (noise(x, y, 3) - 0.5) * 0.15, x, y, ramp('#9097b8')), '#2e3358');
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      if (open) {
        // Escada iluminada subindo
        const step = Math.floor((H - y) / 7);
        const light = Math.min(1, 0.25 + step * 0.12);
        const level = (H - y) % 7 === 0 ? light - 0.2 : light;
        pix.set(x, y, toneOf(level, x, y, ramp('#7f8ab8')));
      } else {
        const plank = Math.floor((x - 3) / 8);
        let level = 0.6 + (noise(plank, 1, 5) - 0.5) * 0.2 - (x - 3) * 0.008;
        if ((x - 3) % 8 === 0) level = 0.2;
        const band = y === 20 || y === 21 || y === 44 || y === 45;
        pix.set(x, y, band ? IRON.t[y % 2 ? 1 : 3] : toneOf(level, x, y, WOOD));
      }
    }
  }
  if (!open) {
    // Argola e cravos
    pix.set(W - 11, 32, BRASS.t[4]);
    pix.rect(W - 12, 33, 3, 3, BRASS.t[2], BRASS.o);
    for (const x of [8, 18, 28]) {
      pix.set(x, 20, IRON.t[4]);
      pix.set(x, 44, IRON.t[4]);
    }
  }
  pix.outline();
  return { pix, ax: W / 2, ay: H - 1 };
}

export const doorSprite = (open) => sprite(`torre:porta:${open}`, () => buildDoor(open));

/* ---------- Bloco de energia e engrenagem ---------- */

function buildBlock() {
  const pix = new Pix(14, 14);
  pix.box(1, 1, 12, 12, ENERGY, { top: 4, light: 0.75 });
  pix.rect(5, 7, 4, 3, '#e3fffb');
  pix.set(5, 7, '#ffffff');
  pix.outline();
  return { pix, ax: 7, ay: 13 };
}

function buildGear() {
  const pix = new Pix(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8;
      const dy = y + 0.5 - 8;
      const d = Math.hypot(dx, dy);
      const tooth = Math.cos(Math.atan2(dy, dx) * 8) > 0.3 ? 1.6 : 0;
      if (d > 5.4 + tooth || d < 1.8) continue;
      pix.set(x, y, toneOf(lightOf(dx / 7, dy / 7, 0.7), x, y, BRASS), BRASS.o);
    }
  }
  pix.outline();
  return { pix, ax: 8, ay: 15 };
}

export const blockSprite = () => sprite('torre:bloco', buildBlock);
export const gearSprite = () => sprite('torre:engrenagem', buildGear);

/* ---------- Caixote com ícone (blocos ou engrenagens) ---------- */

function buildCrate(kind) {
  const pix = new Pix(32, 30);
  pix.box(1, 6, 30, 23, ramp('#9a6232'), { top: 6, light: 0.72, grain: 4 });
  pix.rect(1, 12, 30, 2, ramp('#6e4422').t[1]);
  // Itens aparecendo por cima
  for (let i = 0; i < 4; i++) {
    const x = 5 + i * 6;
    if (kind === 'block') {
      pix.rect(x, 2 + (i % 2), 5, 5, ENERGY.t[3], ENERGY.o);
      pix.set(x, 2 + (i % 2), ENERGY.t[4]);
    } else {
      pix.rect(x, 2 + (i % 2), 5, 5, BRASS.t[3], BRASS.o);
      pix.set(x + 2, 4 + (i % 2), BRASS.o);
    }
  }
  pix.outline();
  return { pix, ax: 16, ay: 29 };
}

export const crateSprite = (kind) => sprite(`torre:caixote:${kind}`, () => buildCrate(kind));

/* ---------- Lâmpada de andar (apagada, certa, errada) ---------- */

function buildLamp(state) {
  const pix = new Pix(12, 16);
  const glass = state === 'on' ? ramp('#6cff8a') : state === 'bad' ? ramp('#ff6b5b') : ramp('#5a5470');
  pix.rect(3, 0, 6, 2, BRASS.t[3], BRASS.o);
  pix.ellipsoid(6, 7, 5, 5.5, glass, { test: (x, y) => y >= 2 });
  if (state !== 'off') {
    pix.set(4, 5, '#ffffff');
    pix.set(5, 4, '#ffffff');
  }
  pix.rect(2, 12, 8, 3, BRASS.t[2], BRASS.o);
  pix.outline();
  return { pix, ax: 6, ay: 15 };
}

export const lampSprite = (state) => sprite(`torre:lampada:${state}`, () => buildLamp(state));

/* ---------- Objetos já existentes, desenhados num canvas próprio ---------- */

const drawn = new Map();

/** Canvas de um objeto desenhado por uma função (x, y) → ctx, com a âncora em (ax, ay). */
function drawnSprite(key, w, h, ax, ay, draw) {
  if (!drawn.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    draw(ctx, ax, ay);
    drawn.set(key, { canvas, ax, ay });
  }
  return drawn.get(key);
}

export const rodPileSprite = (bundles) => drawnSprite(`torre:monte:${bundles}`, 36, 24, 18, 22, (ctx, x, y) => drawRodPile(ctx, x, y, bundles));
export const cartSprite = () => drawnSprite('torre:carrinho', 36, 30, 18, 28, (ctx, x, y) => drawMineCart(ctx, x, y, 0));
export const leverSprite = (pulled, color) => drawnSprite(`torre:alavanca:${pulled}:${color}`, 22, 28, 11, 26, (ctx, x, y) => drawLever(ctx, x, y, pulled, color));
export const pedestalSprite = () => drawnSprite('torre:pedestal', 40, 40, 20, 38, (ctx, x, y) => drawPedestal(ctx, x, y, false));
