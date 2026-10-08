/* NEXO — Pixel art da Torre dos Padrões por dentro (missão dos andares)
 *
 * Linguagem visual da missão: a haste de PARTIDA é dourada e as hastes de cada MÓDULO são
 * azuis. As mesmas cores aparecem na grade da parede, no suporte de hastes, no painel de
 * encaixe e na Máquina da Regra do topo, para o aluno ligar "1 + 3 × módulos" ao que vê.
 */

import { Pix, ramp, lightOf, toneOf, noise, sprite, customRamp } from './pixel.js';
import { drawMineCart, drawLever } from './mission-props.js';

export const CELL = 28; // lado de um módulo da grade, em pixels

const STONE = ramp('#6f7488');
const CYAN = customRamp('#0b4a56', ['#127a86', '#2fb8c8', '#7fe6ff', '#c8f8ff', '#ffffff']);
const GOLD = customRamp('#5a3a08', ['#8a5a12', '#d08a1a', '#ffc34a', '#ffe9a0', '#fffbe8']);
const BAD = ramp('#d6493b');
const WOOD = ramp('#7a4a28');
const WOOD_LIGHT = ramp('#a8743e');
const IRON = ramp('#4b4f60');
const STEEL = customRamp('#14101c', ['#2a2838', '#3f3d52', '#5f5c78', '#8a87a6', '#c0bdd8']);
const BRASS = ramp('#d9a640');
const GLASS_DARK = '#101a2e';

const RODS = { cyan: CYAN, gold: GOLD };

/* ---------- Hastes da grade (apagada, azul, dourada, faltando) ---------- */

function buildRod(horizontal, state) {
  const long = CELL + 4;
  const pix = new Pix(horizontal ? long : 7, horizontal ? 7 : long);
  for (let a = 0; a < long; a++) {
    for (let b = 0; b < 7; b++) {
      const [x, y] = horizontal ? [a, b] : [b, a];
      const edge = b === 0 || b === 6;
      const cap = a === 0 || a === long - 1;
      if (state === 'off') {
        pix.set(x, y, edge || cap ? STONE.t[0] : b === 5 ? STONE.t[2] : STONE.t[1]);
      } else if (state === 'bad') {
        pix.set(x, y, edge || cap ? BAD.o : b === 3 ? BAD.t[4] : BAD.t[2]);
      } else {
        const R = RODS[state];
        const tone = edge ? 0 : b === 2 || b === 3 ? 4 : b === 1 ? 3 : 2;
        pix.set(x, y, cap ? R.t[1] : R.t[tone]);
      }
    }
  }
  return { pix, ax: 0, ay: 0 };
}

export const rodSprite = (horizontal, state) => sprite(`torre2:haste:${horizontal ? 'h' : 'v'}:${state}`, () => buildRod(horizontal, state));
export const rodKey = (horizontal, state) => `torre2:haste:${horizontal ? 'h' : 'v'}:${state}`;

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
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = W / 2;
      const outer = y >= r ? true : (x + 0.5 - W / 2) ** 2 + (y - r) ** 2 <= r * r;
      if (!outer || inside(x, y)) continue;
      pix.set(x, y, toneOf(0.75 - (x / W) * 0.3 + (noise(x, y, 3) - 0.5) * 0.15, x, y, ramp('#9097b8')), '#2e3358');
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      if (open) {
        const step = Math.floor((H - y) / 7);
        const light = Math.min(1, 0.25 + step * 0.12);
        pix.set(x, y, toneOf((H - y) % 7 === 0 ? light - 0.2 : light, x, y, ramp('#7f8ab8')));
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
    // Cadeado com o símbolo de energia: abre quando a grade acende
    pix.rect(W / 2 - 4, 28, 9, 8, BRASS.t[3], BRASS.o);
    pix.rect(W / 2 - 2, 24, 5, 4, BRASS.t[1], BRASS.o);
    pix.rect(W / 2 - 1, 30, 3, 3, CYAN.t[3]);
  }
  pix.outline();
  return { pix, ax: W / 2, ay: H - 1 };
}

export const doorSprite = (open) => sprite(`torre2:porta:${open}`, () => buildDoor(open));
export const doorKey = (open) => `torre2:porta:${open}`;

/* ---------- Suporte de hastes (de pé, brilhando) ---------- */

function buildRack(kind) {
  const pix = new Pix(40, 44);
  const R = RODS[kind];
  // Hastes de pé, de alturas um pouco diferentes
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 5;
    const top = 2 + (i % 3) * 2;
    for (let y = top; y < 36; y++) {
      pix.set(x, y, R.t[2], R.o);
      pix.set(x + 1, y, R.t[4], R.o);
      pix.set(x + 2, y, R.t[1], R.o);
    }
    pix.rect(x, top, 3, 2, R.t[4], R.o);
  }
  // Base de madeira com furos e a barra que segura as hastes
  pix.box(1, 32, 38, 11, WOOD_LIGHT, { top: 4, light: 0.75, grain: 9 });
  pix.rect(2, 16, 36, 3, WOOD.t[3], WOOD.o);
  pix.rect(2, 16, 36, 1, WOOD.t[4]);
  pix.rect(2, 4, 3, 30, WOOD.t[2], WOOD.o);
  pix.rect(35, 4, 3, 30, WOOD.t[1], WOOD.o);
  pix.outline();
  return { pix, ax: 20, ay: 43 };
}

export const rackSprite = (kind) => sprite(`torre2:suporte:${kind}`, () => buildRack(kind));
export const rackKey = (kind) => `torre2:suporte:${kind}`;

/* ---------- Feixe de 10 hastes (amarrado, com a etiqueta "10") ---------- */

function buildBundleCrate() {
  const pix = new Pix(44, 36);
  // Feixes deitados por cima da caixa
  for (let k = 0; k < 3; k++) {
    const y = 3 + k * 5;
    for (let x = 4; x < 40; x++) {
      for (let j = 0; j < 4; j++) pix.set(x + (k % 2) * 2, y + j, CYAN.t[j === 1 ? 4 : j === 0 ? 3 : 2], CYAN.o);
    }
    pix.rect(18 + (k % 2) * 2, y - 1, 4, 6, '#c8a070', '#5a3e12');
  }
  pix.box(2, 16, 40, 19, WOOD_LIGHT, { top: 5, light: 0.72, grain: 4 });
  // Placa "10" pintada
  pix.rect(15, 23, 14, 9, '#f3e7cb', '#8a7a6a');
  pix.rect(18, 25, 2, 5, '#2b1d14');
  pix.set(17, 26, '#2b1d14');
  pix.rect(17, 29, 4, 1, '#2b1d14');
  pix.rect(22, 25, 4, 5, '#2b1d14');
  pix.rect(23, 26, 2, 3, '#f3e7cb');
  pix.outline();
  return { pix, ax: 22, ay: 35 };
}

export const bundleCrateSprite = () => sprite('torre2:caixa-feixes', buildBundleCrate);

/* ---------- Painel de encaixe (embaixo da grade) ---------- */

function buildSocketPanel() {
  const pix = new Pix(44, 40);
  // Coluna e caixa de aço com chanfros e rebites
  pix.rect(18, 22, 8, 17, STEEL.t[2], STEEL.o);
  pix.rect(18, 22, 2, 17, STEEL.t[4]);
  for (let y = 0; y < 26; y++) {
    for (let x = 2; x < 42; x++) {
      const top = y === 0 || x === 2;
      const bottom = y === 25 || x === 41;
      let level = 0.6 - (x - 2) / 160 + (top ? 0.28 : 0) - (bottom ? 0.3 : 0);
      pix.set(x, y, toneOf(level, x, y, STEEL, { min: 1 }), STEEL.o);
    }
  }
  for (const [rx, ry] of [[4, 2], [39, 2], [4, 23], [39, 23]]) pix.set(rx, ry, STEEL.t[4]);
  // Fenda de encaixe que brilha
  pix.rect(14, 12, 16, 7, GLASS_DARK, STEEL.o);
  pix.rect(16, 14, 12, 3, CYAN.t[3]);
  pix.rect(16, 14, 12, 1, CYAN.t[4]);
  // Seta para cima (a grade da parede)
  for (let i = 0; i < 4; i++) pix.rect(22 - i, 3 + i, 1 + i * 2, 1, GOLD.t[3]);
  pix.rect(21, 7, 3, 4, GOLD.t[3]);
  pix.outline();
  return { pix, ax: 22, ay: 39 };
}

export const socketPanelSprite = () => sprite('torre2:painel', buildSocketPanel);

/* ---------- Máquina da Regra (topo da Torre) ---------- */

function ringPix(pix, cx, cy, r0, r1, paint) {
  for (let y = Math.floor(cy - r1 - 1); y <= cy + r1 + 1; y++) {
    for (let x = Math.floor(cx - r1 - 1); x <= cx + r1 + 1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d >= r0 && d <= r1) paint(x, y, dx, dy, d);
    }
  }
}

/** Placa chanfrada: borda clara em cima/à esquerda, escura embaixo/à direita. */
function bevel(pix, x0, y0, w, h, R, level = 0.42) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      let l = level - ((x - x0) / w) * 0.06 - ((y - y0) / h) * 0.04 + (noise(x, y, 17) - 0.5) * 0.02;
      if (y === y0 || x === x0) l += 0.3;
      if (y === y0 + h - 1 || x === x0 + w - 1) l -= 0.3;
      pix.set(x, y, toneOf(l, x, y, R, { min: 1 }), R.o);
    }
  }
}

function buildRuleMachine() {
  const pix = new Pix(120, 70);
  const COPPER = ramp('#c8743a');
  // Pés
  for (const fx of [8, 104]) {
    pix.rect(fx, 64, 9, 5, STEEL.t[1], STEEL.o);
    pix.rect(fx, 64, 9, 1, STEEL.t[3]);
  }
  // Corpo em placas, com emenda no meio e rebites
  bevel(pix, 4, 20, 112, 45, STEEL);
  bevel(pix, 6, 58, 108, 6, STEEL, 0.2);
  for (let y = 22; y < 58; y++) {
    pix.set(60, y, STEEL.t[1]);
    pix.set(61, y, STEEL.t[3]);
  }
  for (let x = 8; x < 114; x += 9) {
    for (const ry of [23, 55]) {
      pix.set(x, ry, STEEL.t[4]);
      pix.set(x + 1, ry + 1, STEEL.o);
    }
  }
  // Canos de cobre laterais segurando o visor
  for (const px of [6, 110]) {
    pix.cylinder(px, 4, 4, 18, COPPER);
    pix.rect(px - 1, 12, 6, 2, BRASS.t[3], BRASS.o);
  }
  // Visor com moldura de latão
  for (let y = 0; y < 21; y++) {
    for (let x = 11; x < 109; x++) {
      const edge = y < 2 || y > 18 || x < 13 || x > 106;
      if (!edge) continue;
      const l = y < 1 || x < 12 ? 0.95 : y > 19 || x > 107 ? 0.25 : 0.6;
      pix.set(x, y, toneOf(l, x, y, BRASS), BRASS.o);
    }
  }
  pix.rect(13, 2, 94, 17, '#0c0b1e');
  for (let y = 3; y < 18; y += 2) for (let x = 14; x < 106; x++) pix.set(x, y, '#141330');
  pix.rect(14, 3, 30, 1, '#2a2860');
  // Os dois tubos de vidro: azul (por módulo) e dourado (de partida)
  for (const [x0, R] of [[22, CYAN], [80, GOLD]]) {
    // Moldura colorida
    pix.rect(x0 - 3, 24, 24, 34, R.t[1], R.o);
    pix.rect(x0 - 3, 24, 24, 1, R.t[3]);
    pix.rect(x0 - 3, 24, 1, 34, R.t[3]);
    pix.rect(x0 - 2, 25, 22, 32, R.t[0]);
    // Vidro com reflexo (cilindro escuro)
    for (let y = 26; y < 56; y++) {
      for (let x = x0; x < x0 + 18; x++) {
        const nx = ((x - x0) / 17) * 2 - 1;
        pix.set(x, y, nx < -0.7 ? '#3a4a70' : nx > 0.75 ? '#0a1020' : GLASS_DARK);
      }
    }
    for (let y = 28; y < 54; y++) pix.set(x0 + 2, y, '#7f98c8');
    // Marcas de nível a cada haste (8 no máximo)
    for (let i = 1; i <= 8; i++) pix.rect(x0 + 15, 55 - i * 3.5, 2, 1, R.t[2]);
    // Funil de latão por onde as hastes entram
    for (let i = 0; i < 4; i++) {
      const l = 0.85 - i * 0.15;
      for (let x = x0 - 4 + i; x < x0 + 22 - i; x++) pix.set(x, 20 + i, toneOf(l - (x - x0) / 80, x, 20 + i, BRASS), BRASS.o);
    }
    // Lâmpada da cor do tubo, embaixo
    pix.rect(x0 + 6, 59, 6, 3, R.t[3], R.o);
    pix.set(x0 + 6, 59, R.t[4]);
  }
  // Centro: placas "×" e "+" e um manômetro
  bevel(pix, 46, 28, 10, 10, STEEL, 0.7);
  for (let i = 0; i < 6; i++) {
    pix.set(48 + i, 30 + i, '#1d1a38');
    pix.set(53 - i, 30 + i, '#1d1a38');
  }
  bevel(pix, 64, 28, 10, 10, STEEL, 0.7);
  pix.rect(66, 32, 6, 2, '#1d1a38');
  pix.rect(68, 30, 2, 6, '#1d1a38');
  ringPix(pix, 60, 47, 0, 6.5, (x, y, dx, dy, d) => pix.set(x, y, d > 5.2 ? toneOf(lightOf(dx / d, dy / d, 0.4), x, y, BRASS) : '#f4ecdc', BRASS.o));
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.8 + i * 0.35);
    pix.set(Math.round(59.5 + Math.cos(a) * 4), Math.round(46.5 + Math.sin(a) * 4), '#5a5470');
  }
  pix.line(60, 47, 63, 44, '#c2453b');
  pix.set(60, 47, '#2b1d14');
  pix.outline();
  return { pix, ax: 60, ay: 69 };
}

export const ruleMachineSprite = () => sprite('torre2:maquina-regra2', buildRuleMachine);
/** Área de cada tubo da Máquina da Regra, relativa à âncora (base, centro). */
export const RULE_TUBES = { cyan: { x: 22 - 60, y: 26 - 69, w: 18, h: 30 }, gold: { x: 80 - 60, y: 26 - 69, w: 18, h: 30 } };

/* ---------- Caixote de hastes (para a Máquina da Regra) ---------- */

function buildRodCrate(kind) {
  const pix = new Pix(34, 32);
  const R = RODS[kind];
  for (let i = 0; i < 5; i++) {
    const x = 5 + i * 5;
    for (let y = 1 + (i % 2) * 2; y < 14; y++) {
      pix.set(x, y, R.t[2], R.o);
      pix.set(x + 1, y, R.t[4], R.o);
    }
  }
  pix.box(1, 10, 32, 21, ramp('#9a6232'), { top: 5, light: 0.72, grain: 4 });
  pix.rect(10, 19, 14, 7, R.t[2], R.o);
  pix.rect(10, 19, 14, 2, R.t[4]);
  pix.outline();
  return { pix, ax: 17, ay: 31 };
}

export const rodCrateSprite = (kind) => sprite(`torre2:caixote:${kind}`, () => buildRodCrate(kind));

/* ---------- Lâmpada de andar (apagada, certa, errada) ---------- */

function buildLamp(state) {
  const pix = new Pix(14, 18);
  const glass = state === 'on' ? ramp('#6cff8a') : state === 'bad' ? ramp('#ff6b5b') : ramp('#5a5470');
  pix.rect(4, 0, 6, 2, BRASS.t[3], BRASS.o);
  pix.ellipsoid(7, 8, 6, 6.5, glass, { test: (x, y) => y >= 2 });
  if (state !== 'off') {
    pix.set(4, 5, '#ffffff');
    pix.set(5, 4, '#ffffff');
  }
  pix.rect(2, 14, 10, 3, BRASS.t[2], BRASS.o);
  pix.outline();
  return { pix, ax: 7, ay: 17 };
}

export const lampSprite = (state) => sprite(`torre2:lampada:${state}`, () => buildLamp(state));
export const lampKey = (state) => `torre2:lampada:${state}`;

/* ---------- Objetos já existentes, desenhados num canvas próprio ---------- */

const drawn = new Map();

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

export const cartSprite = () => drawnSprite('torre2:carrinho', 36, 30, 18, 28, (ctx, x, y) => drawMineCart(ctx, x, y, 0));
export const leverSprite = (pulled, color) => drawnSprite(`torre2:alavanca:${pulled}:${color}`, 22, 28, 11, 26, (ctx, x, y) => drawLever(ctx, x, y, pulled, color));
