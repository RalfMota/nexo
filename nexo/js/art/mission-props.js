/* NEXO — Objetos das missões da Oficina, das Rotas, da Torre e do Núcleo, em pixel art
 *
 * Mesmo motor e mesmas regras dos outros objetos (art/pixel.js). (x, y) é sempre o ponto
 * em que o objeto encosta no chão. Números e etiquetas são escritos à parte, por cima.
 */

import { Pix, ramp, customRamp, lightOf, toneOf, sprite, blit, pixelShadow, noise } from './pixel.js';

const METAL = ramp('#6c6890');
const STEEL = ramp('#8f96aa');
const IRON = customRamp('#0e0c14', ['#1a1722', '#29253a', '#3b3650', '#5a5470', '#8c88a8']);
const WOOD = ramp('#9a6232');
const WOOD_LIGHT = ramp('#b98448');
const WOOD_DARK = ramp('#6e4422');
const STONE = ramp('#a39d92');
const STONE_DARK = ramp('#857f75');
const BRASS = ramp('#d9a640');
const GLASS = ramp('#5fd6e8');
const CRYSTAL = ramp('#5fe3d0');
const SCREEN = customRamp('#05040a', ['#0c0b18', '#14122a', '#1d1a38', '#2a2650', '#3a3570']);
const PAPER = ramp('#f1e6cb');

/* ---------- Peças pequenas ---------- */

function crystalPixel(pix, x, y, R = CRYSTAL, h = 4) {
  for (let j = 0; j < h; j++) {
    const w = j === h - 1 ? 0 : j === 0 ? 1 : 1;
    for (let i = -w; i <= w; i++) pix.set(x + i, y - j, R.t[i < 0 ? 4 : i === 0 ? 3 : 1], R.o);
  }
}

function rivet(pix, x, y) {
  pix.set(x, y, STEEL.t[4]);
  pix.set(x + 1, y + 1, STEEL.t[0]);
}

/* ---------- Máquina de cristais com manivela (Oficina) ---------- */

function buildCrankMachine(frame) {
  const pix = new Pix(40, 46);
  // Pés e corpo
  pix.rect(5, 42, 4, 3, IRON.t[1], IRON.o);
  pix.rect(25, 42, 4, 3, IRON.t[1], IRON.o);
  pix.box(3, 8, 28, 35, METAL, { top: 4, light: 0.75, grain: 3 });
  for (const [rx, ry] of [[5, 13], [28, 13], [5, 40], [28, 40]]) rivet(pix, rx, ry);
  // Visor com engrenagens (girando conforme o quadro)
  pix.rect(7, 15, 20, 14, SCREEN.t[1], SCREEN.o);
  const gear = (cx, cy, r, phase, R) => {
    for (let y = cy - r - 1; y <= cy + r + 1; y++) {
      for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        const tooth = Math.cos(Math.atan2(dy, dx) * 6 + phase) > 0.2 ? 1 : 0;
        if (d <= r - 1.5 && d > 1) pix.set(x, y, toneOf(lightOf(dx / r, dy / r, 0.7), x, y, R));
        else if (d <= r - 0.5 + tooth) pix.set(x, y, R.t[2]);
      }
    }
    pix.set(cx, cy, SCREEN.t[0]);
  };
  gear(14, 22, 5, frame * 0.6, BRASS);
  gear(22, 19, 3, -frame * 1.1, ramp('#c97a2a'));
  // Contador e fenda da fita
  pix.rect(9, 31, 16, 5, SCREEN.t[0], SCREEN.o);
  pix.rect(10, 37, 14, 2, IRON.t[0]);
  // Calha de saída (para a direita, onde fica o carrinho)
  pix.line(31, 30, 37, 36, STEEL.t[3], STEEL.o);
  pix.line(31, 31, 37, 37, STEEL.t[1], STEEL.o);
  // Manivela na lateral esquerda
  const angle = (frame / 4) * Math.PI * 2;
  const hx = 2 + Math.round(Math.cos(angle) * 3);
  const hy = 20 + Math.round(Math.sin(angle) * 3);
  pix.set(2, 20, IRON.t[2], IRON.o);
  pix.line(2, 20, hx, hy, IRON.t[3], IRON.o);
  pix.rect(hx - 1, hy - 1, 2, 2, ramp('#c2453b').t[3], ramp('#c2453b').o);
  // Chaminé com tampa
  pix.cylinder(23, 1, 4, 7, IRON, { min: 1 });
  pix.rect(22, 1, 6, 1, IRON.t[4], IRON.o);
  pix.outline();
  return { pix, ax: 17, ay: 45 };
}

export function drawCrankMachine(ctx, x, y, t, running) {
  pixelShadow(ctx, x, y, 16, 2);
  const frame = running ? Math.floor(t * 12) % 4 : 0;
  blit(ctx, sprite(`crank-machine:${frame}`, () => buildCrankMachine(frame)), x, y);
}

/* ---------- Carrinho de mina com cristais ---------- */

function buildCart(fill) {
  const pix = new Pix(30, 24);
  // Cristais aparecendo acima da borda (até 3 fileiras)
  const shown = Math.min(30, fill);
  for (let i = 0; i < shown; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    crystalPixel(pix, 5 + col * 2 + (row % 2), 9 - row * 2, i % 4 === 0 ? ramp('#b48cff') : CRYSTAL, 3);
  }
  // Caçamba afunilada
  for (let y = 9; y <= 18; y++) {
    const inset = Math.round((y - 9) * 0.35);
    for (let x = 2 + inset; x <= 27 - inset; x++) {
      const band = y === 11 || y === 16;
      const level = 0.78 - (x - 2) / 40 + (band ? -0.2 : 0);
      pix.set(x, y, toneOf(level, x, y, band ? IRON : STEEL), STEEL.o);
    }
  }
  for (let x = 1; x <= 28; x++) pix.set(x, 8, x < 20 ? STEEL.t[4] : STEEL.t[3], STEEL.o);
  rivet(pix, 4, 13);
  rivet(pix, 24, 13);
  // Rodas
  for (const wx of [8, 21]) {
    for (let y = 17; y <= 23; y++) {
      for (let x = wx - 3; x <= wx + 3; x++) {
        const d = Math.hypot(x + 0.5 - wx - 0.5, y + 0.5 - 20.5);
        if (d <= 3.2) pix.set(x, y, d < 1.2 ? STEEL.t[4] : d > 2.4 ? IRON.t[1] : IRON.t[3], IRON.o);
      }
    }
  }
  pix.outline();
  return { pix, ax: 15, ay: 23 };
}

export function drawMineCart(ctx, x, y, crystals, scale = 1) {
  if (scale === 1) pixelShadow(ctx, x, y, 14, 2);
  const fill = Math.min(30, crystals);
  blit(ctx, sprite(`cart:${fill}`, () => buildCart(fill)), x, y, scale);
}

/* ---------- Ponte de carga (pilares, prancha que abaixa, medidor) ---------- */

function buildBridge(lowered, state) {
  const pix = new Pix(56, 44);
  // Pilares de pedra
  for (const px of [3, 45]) {
    for (let y = 14; y <= 43; y++) {
      for (let x = px; x < px + 8; x++) {
        const row = Math.floor((y - 14) / 5);
        const seam = (y - 14) % 5 === 4 || (x - px + row * 3) % 8 === 0;
        const level = 0.8 - (x - px) * 0.06 + (seam ? -0.3 : 0) + (noise(x, y, 4) - 0.5) * 0.1;
        pix.set(x, y, toneOf(level, x, y, row % 2 ? STONE : STONE_DARK), STONE.o);
      }
    }
  }
  // Prancha: levantada (inclinada) ou abaixada (reta entre os pilares)
  const plank = WOOD_LIGHT;
  if (lowered) {
    for (let y = 16; y <= 19; y++) for (let x = 7; x <= 49; x++) pix.set(x, y, plank.t[y === 16 ? 4 : y === 19 ? 1 : (x % 6 === 0 ? 1 : 3)], plank.o);
  } else {
    for (let i = 0; i <= 30; i++) {
      const x = 9 + Math.round(i * 0.55);
      const y = 16 - Math.round(i * 0.5);
      for (let k = 0; k < 4; k++) pix.set(x + k, y, plank.t[k === 0 ? 4 : k === 3 ? 1 : 3], plank.o);
      if (i % 6 === 0) pix.set(x + 1, y, plank.t[1]);
    }
  }
  // Correntes
  pix.line(46, 14, lowered ? 46 : 26, lowered ? 15 : 1, IRON.t[3]);
  // Medidor de carga no pilar da direita
  const light = state === 'ok' ? '#6cff8a' : state === 'over' ? '#ff6b5b' : state === 'under' ? '#ffcf4a' : '#5b5f73';
  pix.rect(44, 4, 10, 9, IRON.t[2], IRON.o);
  pix.rect(45, 5, 8, 5, SCREEN.t[2]);
  pix.rect(48, 11, 2, 1, light);
  pix.set(48, 10, light);
  pix.set(49, 10, light);
  pix.outline();
  return { pix, ax: 28, ay: 43 };
}

export function drawCargoBridge(ctx, x, y, lowered, state) {
  pixelShadow(ctx, x, y, 26, 2);
  blit(ctx, sprite(`bridge:${lowered}:${state}`, () => buildBridge(lowered, state)), x, y);
}

/* ---------- Conversor de energia e tubo de saída ---------- */

function buildConverter() {
  const pix = new Pix(34, 44);
  // Base
  pix.box(3, 30, 28, 13, METAL, { top: 3, light: 0.7 });
  rivet(pix, 5, 35);
  rivet(pix, 27, 35);
  // Cúpula de vidro
  pix.ellipsoid(17, 20, 12, 12, GLASS, { test: (x, y) => y <= 30, min: 1 });
  for (let y = 12; y <= 22; y += 5) pix.set(10, y, GLASS.t[4]);
  // Anéis de cobre
  for (let x = 4; x <= 29; x++) pix.set(x, 30, x < 17 ? BRASS.t[4] : BRASS.t[2], BRASS.o);
  // Canos de entrada (esquerda) e saída (direita)
  pix.cylinder(0, 34, 3, 4, STEEL);
  pix.cylinder(31, 34, 3, 4, STEEL);
  pix.outline();
  return { pix, ax: 17, ay: 43 };
}

export function drawConverter(ctx, x, y, t, active) {
  pixelShadow(ctx, x, y, 16, 2);
  blit(ctx, sprite('converter', buildConverter), x, y);
  // Energia girando dentro da cúpula
  const speed = active ? 6 : 1.2;
  for (let i = 0; i < 10; i++) {
    const a = t * speed + (i * Math.PI) / 5;
    const r = 6 + (i % 3) * 2;
    ctx.fillStyle = i % 2 ? '#e3fffb' : '#7ff0e0';
    ctx.globalAlpha = active ? 1 : 0.55;
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y - 23 + Math.sin(a) * r * 0.45), 2, 1);
  }
  ctx.globalAlpha = 1;
}

/** Tubo de vidro graduado que mostra a saída (enche até `value` de `max`). */
export function drawOutputTube(ctx, x, y, value, max, predicted) {
  const h = 46;
  const top = y - h;
  ctx.fillStyle = '#29253a';
  ctx.fillRect(Math.round(x - 5), top - 1, 10, h + 2);
  ctx.fillStyle = '#0c0b18';
  ctx.fillRect(Math.round(x - 4), top, 8, h);
  const level = Math.round(Math.min(1, Math.max(0, value / max)) * (h - 2));
  ctx.fillStyle = '#3fbfae';
  ctx.fillRect(Math.round(x - 3), y - 1 - level, 6, level);
  ctx.fillStyle = '#7ff0e0';
  ctx.fillRect(Math.round(x - 3), y - 1 - level, 2, level);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let v = 0; v <= max; v += 4) ctx.fillRect(Math.round(x + 2), Math.round(y - 1 - (v / max) * (h - 2)), 2, 1);
  if (predicted != null) {
    const py = Math.round(y - 1 - Math.min(1, predicted / max) * (h - 2));
    ctx.fillStyle = '#ffcf4a';
    ctx.fillRect(Math.round(x - 7), py, 14, 1);
  }
}

/* ---------- Estante de células de energia e célula avulsa ---------- */

function cellPixels(pix, x, y) {
  pix.rect(x, y + 1, 4, 7, GLASS.t[2], GLASS.o);
  pix.rect(x, y + 1, 1, 7, GLASS.t[4]);
  pix.rect(x + 3, y + 1, 1, 7, GLASS.t[1]);
  pix.rect(x + 1, y, 2, 1, BRASS.t[3], BRASS.o);
  pix.rect(x, y + 4, 4, 1, BRASS.t[2]);
}

function buildCellRack() {
  const pix = new Pix(30, 28);
  pix.box(1, 6, 28, 21, WOOD, { top: 3, light: 0.6, grain: 5 });
  for (let row = 0; row < 2; row++) {
    pix.rect(3, 9 + row * 9, 24, 1, WOOD_DARK.t[1]);
    for (let i = 0; i < 5; i++) cellPixels(pix, 4 + i * 5, 10 + row * 9 - 9 + 9);
  }
  pix.outline();
  return { pix, ax: 15, ay: 27 };
}

export function drawCellRack(ctx, x, y) {
  pixelShadow(ctx, x, y, 14, 2);
  blit(ctx, sprite('cell-rack', buildCellRack), x, y);
}

function buildCell() {
  const pix = new Pix(6, 10);
  cellPixels(pix, 1, 1);
  pix.outline();
  return { pix, ax: 3, ay: 9 };
}

export function drawEnergyCells(ctx, x, y, count) {
  const shown = Math.min(count, 5);
  for (let i = 0; i < shown; i++) blit(ctx, sprite('cell', buildCell), x - (shown - 1) * 2.5 + i * 5, y);
}

/* ---------- Alavanca ---------- */

function buildLever(pulled, color) {
  const pix = new Pix(16, 24);
  const K = ramp(color);
  // Base de ferro
  pix.box(2, 17, 12, 6, IRON, { top: 2, light: 0.75 });
  // Haste
  const tipX = pulled ? 12 : 4;
  pix.line(8, 18, tipX, 4, STEEL.t[3], STEEL.o);
  pix.line(9, 18, tipX + 1, 4, STEEL.t[1], STEEL.o);
  // Manopla
  pix.ellipsoid(tipX + 0.5, 3.5, 3, 3, K);
  pix.outline();
  return { pix, ax: 8, ay: 23 };
}

export function drawLever(ctx, x, y, pulled, color = '#c2453b') {
  pixelShadow(ctx, x, y, 7, 1);
  blit(ctx, sprite(`lever:${pulled}:${color}`, () => buildLever(pulled, color)), x, y);
}

/* ---------- Mostrador com setas (para girar números no mundo) ---------- */

function buildDialPanel() {
  const pix = new Pix(44, 26);
  // Pedestal
  pix.box(16, 18, 12, 7, STONE, { top: 2, light: 0.7 });
  // Painel com moldura de latão
  pix.box(2, 2, 40, 16, BRASS, { top: 2, light: 0.75 });
  pix.rect(13, 5, 18, 10, SCREEN.t[1], SCREEN.o);
  // Botões ▼ (esquerda) e ▲ (direita)
  const down = ramp('#4f7fc4');
  const up = ramp('#4f9a3f');
  for (let j = 0; j < 4; j++) {
    for (let i = j; i < 7 - j; i++) {
      pix.set(4 + i, 8 + j, down.t[j === 0 ? 4 : 3], down.o);
      pix.set(33 + i, 11 - j, up.t[j === 3 ? 4 : 3], up.o);
    }
  }
  pix.outline();
  return { pix, ax: 22, ay: 25 };
}

export function drawDialPanel(ctx, x, y, value, { highlight = null } = {}) {
  pixelShadow(ctx, x, y, 12, 1);
  blit(ctx, sprite('dial-panel', buildDialPanel), x, y);
  ctx.font = '700 9px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7ff0e0';
  ctx.fillText(String(value), Math.round(x), Math.round(y - 15));
  if (highlight) {
    ctx.fillStyle = 'rgba(255, 240, 160, .35)';
    ctx.fillRect(Math.round(x + (highlight === 'up' ? 9 : -20)), Math.round(y - 19), 11, 9);
  }
}

/* ---------- Marco de légua (Rotas) ---------- */

function buildMilestone() {
  const pix = new Pix(14, 18);
  for (let y = 2; y <= 16; y++) {
    const hw = y < 5 ? 3 + (y - 2) : 6;
    for (let x = 7 - hw; x < 7 + hw; x++) {
      const level = 0.85 - (x - (7 - hw)) / (hw * 2) * 0.4 + (noise(x, y, 7) - 0.5) * 0.12;
      pix.set(x, y, toneOf(level, x, y, STONE), STONE.o);
    }
  }
  pix.rect(3, 7, 8, 5, PAPER.t[3]);
  pix.outline();
  return { pix, ax: 7, ay: 16 };
}

export function drawMilestone(ctx, x, y, label, read) {
  pixelShadow(ctx, x, y, 6, 1);
  blit(ctx, sprite('milestone', buildMilestone), x, y);
  ctx.font = '700 6px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = read ? '#2f6b2a' : '#3a2416';
  ctx.fillText(String(label), Math.round(x), Math.round(y - 6.5));
}

/* ---------- Carroça das rotas (A vermelha, B azul) ---------- */

function buildWagon(color) {
  const pix = new Pix(40, 34);
  const C = ramp(color);
  // Toldo arredondado
  for (let y = 2; y <= 15; y++) {
    for (let x = 5; x <= 30; x++) {
      const nx = (x + 0.5 - 17.5) / 13;
      const top = 2 + Math.round((1 - Math.sqrt(Math.max(0, 1 - nx * nx))) * 9);
      if (y < top) continue;
      const stripe = (x - 5) % 7 === 0;
      pix.set(x, y, toneOf(lightOf(nx, (y - 9) / 9, 0.7) + (stripe ? -0.2 : 0), x, y, C), C.o);
    }
  }
  // Caixa de madeira
  pix.box(3, 15, 30, 10, WOOD, { top: 2, light: 0.72, grain: 9 });
  for (let x = 4; x <= 31; x += 7) pix.rect(x, 17, 1, 8, WOOD_DARK.t[1]);
  // Lança (para o lado)
  pix.line(33, 22, 38, 24, WOOD_DARK.t[2], WOOD_DARK.o);
  // Rodas raiadas
  for (const wx of [9, 27]) {
    for (let y = 22; y <= 33; y++) {
      for (let x = wx - 6; x <= wx + 6; x++) {
        const d = Math.hypot(x + 0.5 - wx - 0.5, y + 0.5 - 27.5);
        if (d > 5.3) continue;
        if (d >= 4.2) pix.set(x, y, IRON.t[2], IRON.o);
        else if (d < 1.2) pix.set(x, y, STEEL.t[3], STEEL.o);
        else if (Math.abs(x - wx) < 1 || Math.abs(y - 27) < 1 || Math.abs(x - wx - (y - 27)) < 1) pix.set(x, y, WOOD.t[3], WOOD.o);
      }
    }
  }
  pix.outline();
  return { pix, ax: 18, ay: 33 };
}

export function drawWagon(ctx, x, y, color, letter) {
  pixelShadow(ctx, x, y, 18, 2);
  blit(ctx, sprite(`wagon:${color}`, () => buildWagon(color)), x, y);
  ctx.font = '700 9px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6dc';
  ctx.fillText(letter, Math.round(x - 1), Math.round(y - 24));
}

/* ---------- Caixote pequeno de entrega ---------- */

function buildParcel() {
  const pix = new Pix(16, 15);
  pix.box(1, 1, 14, 13, WOOD_LIGHT, { top: 3, light: 0.75, grain: 6 });
  pix.rect(1, 7, 14, 1, WOOD_DARK.t[2]);
  pix.rect(7, 4, 1, 10, WOOD_DARK.t[2]);
  pix.outline();
  return { pix, ax: 8, ay: 14 };
}

export function drawParcel(ctx, x, y, label) {
  blit(ctx, sprite('parcel', buildParcel), x, y);
  if (label != null) {
    ctx.font = '700 6px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff6dc';
    ctx.fillRect(Math.round(x - 6), Math.round(y - 13), 12, 6);
    ctx.fillStyle = '#3a2416';
    ctx.fillText(String(label), Math.round(x), Math.round(y - 10));
  }
}

/* ---------- Corneta num poste e placa de mudança ---------- */

function buildHorn() {
  const pix = new Pix(20, 30);
  pix.cylinder(8, 8, 3, 21, WOOD_DARK);
  for (let i = 0; i < 9; i++) {
    const hw = 1 + Math.round(i * 0.45);
    for (let j = -hw; j <= hw; j++) pix.set(10 + i, 7 + j, toneOf(lightOf(0, j / (hw + 1), 0.7) + 0.1, 10 + i, 7 + j, BRASS), BRASS.o);
  }
  pix.rect(5, 5, 5, 4, BRASS.t[2], BRASS.o);
  pix.outline();
  return { pix, ax: 9, ay: 29 };
}

export function drawHornPost(ctx, x, y) {
  pixelShadow(ctx, x, y, 5, 1);
  blit(ctx, sprite('horn', buildHorn), x, y);
}

function buildSignFlag() {
  const pix = new Pix(16, 26);
  pix.cylinder(7, 4, 2, 21, WOOD_DARK);
  const flag = ramp('#f2b84b');
  for (let y = 4; y <= 12; y++) for (let x = 9; x <= 15 - Math.abs(y - 8); x++) pix.set(x, y, flag.t[y < 8 ? 3 : 2], flag.o);
  pix.rect(1, 13, 13, 6, WOOD_LIGHT.t[3], WOOD_LIGHT.o);
  pix.rect(3, 15, 9, 1, WOOD_DARK.t[1]);
  pix.outline();
  return { pix, ax: 8, ay: 25 };
}

export function drawSignFlag(ctx, x, y) {
  pixelShadow(ctx, x, y, 5, 1);
  blit(ctx, sprite('sign-flag', buildSignFlag), x, y);
}

/* ---------- Hastes de luz (Torre) ---------- */

function buildRodPile(bundles) {
  const pix = new Pix(30, 18);
  const ROD = ramp('#7fe6ff');
  const count = bundles ? 4 : 9;
  for (let i = 0; i < count; i++) {
    const y = 15 - Math.floor(i / 3) * 3 - (bundles ? 0 : (i % 2));
    const x = 3 + (i % 3) * (bundles ? 8 : 7) + Math.floor(i / 3) * 3;
    const len = bundles ? 8 : 12;
    if (bundles) {
      pix.rect(x, y - 3, len, 4, ROD.t[3], ROD.o);
      pix.rect(x, y - 3, len, 1, ROD.t[4]);
      pix.rect(x + 3, y - 3, 2, 4, ROPE_COLOR);
    } else {
      pix.line(x, y, x + len, y - 3, ROD.t[3], ROD.o);
    }
  }
  pix.outline();
  return { pix, ax: 15, ay: 17 };
}
const ROPE_COLOR = '#b07a42';

export function drawRodPile(ctx, x, y, bundles) {
  pixelShadow(ctx, x, y, 13, 2);
  blit(ctx, sprite(`rods:${bundles}`, () => buildRodPile(bundles)), x, y);
}

/** Grade de hastes de luz no chão: `modules` quadrados lado a lado; hastes faltando ficam apagadas. */
export function drawLightGrid(ctx, left, bottom, modules, { cell = 10, rods = null, t = 0 } = {}) {
  const needed = 3 * modules + 1;
  const lit = rods == null ? needed : Math.min(rods, needed);
  let drawn = 0;
  const glow = 0.75 + Math.sin(t * 3) * 0.2;
  const seg = (x, y, w, h) => {
    const on = drawn < lit;
    drawn++;
    ctx.fillStyle = on ? `rgba(127, 230, 255, ${glow})` : 'rgba(60, 70, 90, .7)';
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const top = bottom - cell;
  seg(left, top, 1, cell + 1); // primeira haste vertical
  for (let i = 0; i < modules; i++) {
    const x = left + i * cell;
    seg(x, top, cell + 1, 1);
    seg(x, bottom, cell + 1, 1);
    seg(x + cell, top, 1, cell + 1);
  }
  if (rods != null && rods > needed) {
    // Hastes que sobraram, jogadas no chão
    ctx.fillStyle = 'rgba(127, 230, 255, .8)';
    for (let i = 0; i < Math.min(8, rods - needed); i++) ctx.fillRect(Math.round(left + modules * cell + 6 + i * 3), Math.round(bottom - 2 - (i % 2) * 2), 2, 1);
  }
}

/* ---------- Pedestal de pedra com tabuleta (Torre e Núcleo) ---------- */

function buildPedestal(lit) {
  const pix = new Pix(34, 36);
  // Coluna
  pix.box(10, 22, 14, 13, STONE, { top: 2, light: 0.75, grain: 8 });
  // Tabuleta
  const face = lit ? ramp('#d8f6ef') : PAPER;
  pix.box(2, 2, 30, 21, STONE_DARK, { top: 2, light: 0.65 });
  pix.rect(4, 5, 26, 16, face.t[3], face.o);
  pix.rect(4, 5, 26, 1, face.t[4]);
  pix.outline();
  return { pix, ax: 17, ay: 35 };
}

export function drawPedestal(ctx, x, y, lit = false) {
  pixelShadow(ctx, x, y, 10, 1);
  blit(ctx, sprite(`pedestal:${lit}`, () => buildPedestal(lit)), x, y);
}

/** Área do rosto da tabuleta (para escrever números ou desenhar um gráfico). */
export const pedestalFace = (x, y) => ({ left: x - 13, top: y - 30, w: 26, h: 16 });

/* ---------- Pilha de cristais (Núcleo) ---------- */

function buildCrystalPile() {
  const pix = new Pix(30, 22);
  pix.ellipsoid(15, 19, 13, 4, STONE_DARK, { test: (x, y) => y >= 16 });
  const spots = [[6, 17, 5], [10, 16, 7], [15, 17, 8], [20, 16, 6], [24, 17, 5], [12, 13, 5], [18, 13, 6]];
  spots.forEach(([x, y, h], i) => {
    const R = i % 3 === 0 ? ramp('#b48cff') : CRYSTAL;
    for (let j = 0; j < h; j++) {
      const w = j > h - 3 ? 0 : 1;
      for (let k = -w; k <= w; k++) pix.set(x + k, y - j, R.t[k < 0 ? 4 : k === 0 ? 3 : 1], R.o);
    }
  });
  pix.outline();
  return { pix, ax: 15, ay: 21 };
}

export function drawCrystalPile(ctx, x, y, t) {
  pixelShadow(ctx, x, y, 14, 2);
  blit(ctx, sprite('crystal-pile', buildCrystalPile), x, y);
  const phase = (t * 0.8) % 1;
  ctx.fillStyle = `rgba(230, 255, 250, ${1 - phase})`;
  ctx.fillRect(Math.round(x - 4 + phase * 8), Math.round(y - 14 - phase * 6), 1, 1);
}

/** Cristais avulsos (o que o jogador carrega). */
export function drawCrystalHandful(ctx, x, y, count) {
  const shown = Math.min(count, 6);
  for (let i = 0; i < shown; i++) {
    const cx = Math.round(x - (shown - 1) * 2 + i * 4);
    const cy = Math.round(y - (i % 2) * 2);
    ctx.fillStyle = '#2b5f6a';
    ctx.fillRect(cx - 2, cy - 5, 5, 6);
    ctx.fillStyle = i % 3 === 0 ? '#b48cff' : '#5fe3d0';
    ctx.fillRect(cx - 1, cy - 4, 3, 4);
    ctx.fillStyle = '#e3fffb';
    ctx.fillRect(cx - 1, cy - 4, 1, 2);
  }
}

/* ---------- Medidor de energia (tubo alto) ---------- */

export function drawEnergyMeter(ctx, x, y, value, max, target) {
  const h = 70;
  const top = y - h;
  ctx.fillStyle = '#29253a';
  ctx.fillRect(Math.round(x - 7), top - 2, 14, h + 4);
  ctx.fillStyle = '#5a5470';
  ctx.fillRect(Math.round(x - 7), top - 2, 14, 2);
  ctx.fillStyle = '#0c0b18';
  ctx.fillRect(Math.round(x - 5), top, 10, h);
  const level = Math.round(Math.min(1, Math.max(0, value / max)) * (h - 2));
  ctx.fillStyle = '#3fbfae';
  ctx.fillRect(Math.round(x - 4), y - 1 - level, 8, level);
  ctx.fillStyle = '#9ffff0';
  ctx.fillRect(Math.round(x - 4), y - 1 - level, 2, level);
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  for (let v = 0; v <= max; v += 10) ctx.fillRect(Math.round(x + 3), Math.round(y - 1 - (v / max) * (h - 2)), 2, 1);
  if (target != null) {
    const ty = Math.round(y - 1 - (target / max) * (h - 2));
    ctx.fillStyle = '#ffcf4a';
    ctx.fillRect(Math.round(x - 9), ty, 18, 1);
  }
}
