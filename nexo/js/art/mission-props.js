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

const CAST = customRamp('#14101c', ['#24202f', '#3a3548', '#57516a', '#7a7494', '#a9a3c4']);
const COPPER = ramp('#c8743a');
const AMBER = ['#3a1c08', '#7a3a0e', '#c86a1a', '#ffb43a', '#ffe08a'];
const PURPLE_CRYSTAL = ramp('#b48cff');

/** Painel chanfrado: borda clara em cima/à esquerda, escura embaixo/à direita, rebites nos cantos. */
function panel(pix, x0, y0, w, h, R, { rivets = true, light = 0.62 } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const top = y === y0 || x === x0;
      const bottom = y === y0 + h - 1 || x === x0 + w - 1;
      let level = light - ((x - x0) / w) * 0.18 - ((y - y0) / h) * 0.12 + (noise(x, y, 31) - 0.5) * 0.06;
      if (top) level += 0.28;
      if (bottom) level -= 0.3;
      pix.set(x, y, toneOf(level, x, y, R), R.o);
    }
  }
  if (rivets) {
    for (const [rx, ry] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) {
      pix.set(rx, ry, R.t[4]);
      pix.set(rx + 1, ry + 1, R.t[0]);
    }
  }
}

function ring(pix, cx, cy, r0, r1, paint) {
  for (let y = Math.floor(cy - r1 - 1); y <= cy + r1 + 1; y++) {
    for (let x = Math.floor(cx - r1 - 1); x <= cx + r1 + 1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d >= r0 && d <= r1) paint(x, y, dx, dy, d);
    }
  }
}

function buildCrankMachine(frame) {
  const pix = new Pix(70, 74);
  const cx = 34;
  // Pés e base com faixa de atenção
  for (const fx of [12, 50]) {
    pix.rect(fx, 68, 8, 5, CAST.t[1], CAST.o);
    pix.rect(fx, 68, 8, 1, CAST.t[3]);
  }
  panel(pix, 8, 60, 54, 9, CAST, { light: 0.45 });
  for (let x = 10; x < 60; x++) for (let y = 62; y < 66; y++) pix.set(x, y, Math.floor((x + y) / 3) % 2 ? '#f2b84b' : '#2b2b33');
  // Corpo: gabinete com o topo arredondado
  for (let y = 16; y < 61; y++) {
    for (let x = 10; x < 60; x++) {
      const corner = y < 22 ? ((x < 16 ? (16 - x) : x > 53 ? x - 53 : 0) ** 2 + (22 - y) ** 2) > 36 : false;
      if (corner) continue;
      const nx = ((x - 10) / 50) * 2 - 1;
      const level = lightOf(nx, y < 24 ? -0.6 : 0, 0.75) + (noise(x, y, 12) - 0.5) * 0.06;
      pix.set(x, y, toneOf(level, x, y, CAST, { min: 1 }), CAST.o);
    }
  }
  // Emendas de painéis e rebites
  for (const sy of [30, 48]) for (let x = 11; x < 59; x++) {
    pix.set(x, sy, CAST.t[1]);
    pix.set(x, sy + 1, CAST.t[3]);
  }
  for (let x = 13; x < 58; x += 7) for (const ry of [18, 33, 51, 58]) {
    pix.set(x, ry, CAST.t[4]);
    pix.set(x + 1, ry + 1, CAST.t[0]);
  }
  // Escotilha redonda com as engrenagens em luz âmbar
  ring(pix, cx, 40, 0, 10.5, (x, y, dx, dy, d) => pix.set(x, y, AMBER[Math.max(0, Math.min(4, Math.round(3.4 - d / 3.5 - dy / 12)))]));
  const gear = (gx, gy, r, phase, R) => {
    ring(pix, gx, gy, 1.2, r + 1.4, (x, y, dx, dy, d) => {
      const tooth = Math.cos(Math.atan2(dy, dx) * 7 + phase) > 0.25;
      if (d <= r - 0.4 || (tooth && d <= r + 1.4)) pix.set(x, y, toneOf(lightOf(dx / r, dy / r, 0.6), x, y, R));
    });
    pix.set(Math.floor(gx), Math.floor(gy), AMBER[0]);
  };
  gear(cx - 3, 42, 5, frame * 0.45, BRASS);
  gear(cx + 5, 36, 3, -frame * 0.8, COPPER);
  ring(pix, cx, 40, 10.5, 13, (x, y, dx, dy, d) => pix.set(x, y, toneOf(lightOf(dx / d, dy / d, 0.4) + (d < 11.5 ? -0.25 : 0.05), x, y, BRASS), BRASS.o));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pix.set(Math.round(cx - 0.5 + Math.cos(a) * 11.8), Math.round(39.5 + Math.sin(a) * 11.8), BRASS.t[4]);
  }
  pix.set(cx - 6, 33, '#fff6c8');
  pix.set(cx - 5, 32, '#fff6c8');
  // Manômetro com ponteiro e luzes de aviso
  ring(pix, 52, 24, 0, 4.2, (x, y, dx, dy, d) => pix.set(x, y, d > 3.2 ? BRASS.t[d > 3.8 ? 1 : 3] : '#f4ecdc', BRASS.o));
  const needle = -2.2 + frame * 0.35;
  pix.line(52, 24, 52 + Math.round(Math.cos(needle) * 3), 24 + Math.round(Math.sin(needle) * 3), '#c2453b');
  pix.rect(14, 22, 3, 3, frame % 2 ? '#6cff8a' : '#2f6b3a', CAST.o);
  pix.rect(19, 22, 3, 3, frame % 2 ? '#5a2020' : '#ff6b5b', CAST.o);
  // Contador (janelinha escura com 3 roletes)
  pix.rect(cx - 9, 53, 18, 6, '#0c0b18', CAST.o);
  for (let i = 0; i < 3; i++) pix.rect(cx - 7 + i * 5, 54, 4, 4, i === 2 ? '#3a3570' : '#1d1a38');
  // Funil de cristais no topo (vidro com cristais brutos)
  for (let y = 4; y < 17; y++) {
    const hw = 4 + (16 - y) * 0.75;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const edge = x === Math.round(cx - hw) || x === Math.round(cx + hw);
      pix.set(x, y, edge ? '#9fd8ff' : y > 8 && noise(x, y, 4) > 0.45 ? (noise(x, y, 6) > 0.5 ? CRYSTAL.t[3] : PURPLE_CRYSTAL.t[3]) : '#2a3a5a', '#1d2a48');
    }
  }
  for (let x = cx - 13; x <= cx + 13; x++) pix.set(x, 3, x < cx ? BRASS.t[4] : BRASS.t[2], BRASS.o);
  pix.rect(cx - 5, 15, 11, 2, BRASS.t[2], BRASS.o);
  for (let i = 0; i < 4; i++) crystalPixel(pix, cx - 6 + i * 4, 8 - (i % 2), i % 2 ? PURPLE_CRYSTAL : CRYSTAL, 3);
  // Chaminé com tampa e anel de cobre
  pix.cylinder(50, 2, 5, 16, CAST, { min: 1 });
  pix.rect(48, 1, 9, 2, CAST.t[4], CAST.o);
  pix.cylinder(50, 9, 5, 2, COPPER);
  // Cano de cobre com válvula na lateral direita
  pix.cylinder(60, 26, 3, 22, COPPER);
  ring(pix, 61.5, 30, 0, 2.6, (x, y, dx, dy, d) => pix.set(x, y, d > 1.4 ? '#c2453b' : '#f4ecdc', '#5a1a14'));
  // Calha de saída de latão até o carrinho
  for (let i = 0; i <= 10; i++) {
    const x = 60 + i;
    const y = 50 + Math.round(i * 0.7);
    if (x >= pix.w) break;
    pix.set(x, y, BRASS.t[4], BRASS.o);
    pix.set(x, y + 1, BRASS.t[2], BRASS.o);
    pix.set(x, y + 2, BRASS.t[0], BRASS.o);
  }
  // Manivela: roda raiada na lateral esquerda
  const wx = 6;
  const wy = 40;
  ring(pix, wx, wy, 4.4, 6.2, (x, y, dx, dy, d) => pix.set(x, y, toneOf(lightOf(dx / d, dy / d, 0.4), x, y, CAST, { min: 1 }), CAST.o));
  const angle = (frame / 4) * Math.PI * 2;
  for (let k = 0; k < 4; k++) {
    const a = angle + (k * Math.PI) / 2;
    pix.line(wx, wy, wx + Math.round(Math.cos(a) * 4.4), wy + Math.round(Math.sin(a) * 4.4), CAST.t[3]);
  }
  pix.rect(wx - 1, wy - 1, 3, 3, BRASS.t[3], BRASS.o);
  const hx = wx + Math.round(Math.cos(angle) * 5.5);
  const hy = wy + Math.round(Math.sin(angle) * 5.5);
  pix.rect(hx - 1, hy - 2, 3, 4, ramp('#c2453b').t[3], ramp('#c2453b').o);
  pix.set(hx - 1, hy - 2, '#ff9f8a');
  pix.outline();
  return { pix, ax: cx, ay: 72 };
}

export function drawCrankMachine(ctx, x, y, t, running) {
  pixelShadow(ctx, x + 2, y, 28, 3);
  const frame = running ? Math.floor(t * 12) % 4 : Math.floor(t * 1.5) % 2;
  blit(ctx, sprite(`crank-machine2:${frame}`, () => buildCrankMachine(frame)), x, y);
  // Fumacinha da chaminé
  for (let i = 0; i < 3; i++) {
    const phase = (t * (running ? 0.9 : 0.4) + i / 3) % 1;
    ctx.fillStyle = `rgba(235, 235, 245, ${0.5 * (1 - phase)})`;
    const size = 2 + Math.round(phase * 3);
    ctx.fillRect(Math.round(x + 18 + Math.sin(phase * 5 + i) * 2), Math.round(y - 74 - phase * 18), size, size);
  }
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

const PLASMA = ['#0b3a44', '#127a86', '#2fb8c8', '#7fe6ff', '#e8fdff'];

function buildConverter(frame, active) {
  const pix = new Pix(56, 72);
  const cx = 28;
  // Base octogonal de metal com faixas de cobre
  for (let y = 54; y < 71; y++) {
    const inset = y < 57 ? 57 - y : y > 68 ? y - 68 : 0;
    for (let x = 4 + inset; x < 52 - inset; x++) {
      const nx = ((x - 4) / 48) * 2 - 1;
      const band = y === 58 || y === 59 || y === 66;
      const R = band ? COPPER : CAST;
      pix.set(x, y, toneOf(lightOf(nx, y < 58 ? -0.7 : 0.1, 0.7) + (band ? 0.1 : 0), x, y, R, { min: band ? 0 : 1 }), R.o);
    }
  }
  // Mostrador na frente da base
  ring(pix, cx, 63, 0, 3.4, (x, y, dx, dy, d) => pix.set(x, y, d > 2.4 ? BRASS.t[2] : '#f4ecdc', BRASS.o));
  pix.line(cx, 63, cx + (active ? 2 : -2), 61, '#c2453b');
  // Entrada de células (fenda à esquerda) e saída (cano à direita)
  pix.rect(4, 44, 9, 12, CAST.t[2], CAST.o);
  pix.rect(6, 46, 5, 8, '#0c0b18');
  pix.rect(7, 47, 3, 6, GLASS.t[active ? 3 : 1]);
  pix.rect(44, 47, 12, 5, COPPER.t[2], COPPER.o);
  pix.rect(44, 47, 12, 1, COPPER.t[4]);
  // Cilindro de vidro com bobinas de cobre e o núcleo de plasma
  for (let y = 24; y < 55; y++) {
    for (let x = 12; x < 44; x++) {
      const nx = ((x - 12) / 32) * 2 - 1;
      const coil = (y - 24) % 6 < 2;
      if (coil) {
        pix.set(x, y, toneOf(lightOf(nx, 0, Math.sqrt(1 - nx * nx) + 0.2) + ((y - 24) % 6 === 0 ? 0.15 : -0.1), x, y, COPPER), COPPER.o);
        continue;
      }
      const d = Math.abs(x + 0.5 - cx) / 9;
      const pulse = active ? 1 : 0.55;
      const wave = Math.sin(y * 0.6 + frame * 1.6) * 0.15;
      let level = (1 - d) * pulse + wave;
      if (d > 1) level = 0.05 + (noise(x, y, 3) > 0.92 ? 0.15 : 0);
      const tone = Math.max(0, Math.min(4, Math.round(level * 4.2)));
      pix.set(x, y, d > 1 ? (nx < -0.75 ? '#5a7090' : '#1d2a40') : PLASMA[tone], '#0c1a2a');
    }
  }
  // Reflexo no vidro
  for (let y = 26; y < 52; y += 1) if ((y - 24) % 6 >= 2) pix.set(15, y, '#cfe8ff');
  // Anéis de latão em cima e embaixo do cilindro
  for (const ry of [22, 54]) for (let x = 10; x < 46; x++) {
    pix.set(x, ry, toneOf(lightOf(((x - 10) / 36) * 2 - 1, -0.5, 0.6), x, ry, BRASS), BRASS.o);
    pix.set(x, ry + 1, BRASS.t[1], BRASS.o);
  }
  // Cúpula de vidro com arcos elétricos e a esfera terminal
  for (let y = 6; y < 22; y++) {
    for (let x = 12; x < 44; x++) {
      const nx = (x + 0.5 - cx) / 16;
      const ny = (y + 0.5 - 22) / 16;
      if (nx * nx + ny * ny > 1) continue;
      pix.set(x, y, nx < -0.55 && ny < -0.2 ? '#cfe8ff' : '#1a2a44', '#0c1a2a');
    }
  }
  const arc = (seed) => {
    let x = cx;
    for (let y = 9; y < 22; y++) {
      x += Math.round((noise(seed, y, frame + 7) - 0.5) * 3);
      x = Math.max(16, Math.min(40, x));
      pix.set(x, y, active ? '#ffffff' : '#7fe6ff');
      if (active) pix.set(x + 1, y, '#7fe6ff');
    }
  };
  arc(1);
  if (active || frame % 2) arc(5);
  ring(pix, cx, 5, 0, 3.6, (x, y, dx, dy, d) => pix.set(x, y, toneOf(lightOf(dx / 3.6, dy / 3.6, 0.6), x, y, BRASS), BRASS.o));
  pix.rect(cx - 1, 8, 3, 2, BRASS.t[1], BRASS.o);
  pix.outline();
  return { pix, ax: cx, ay: 70 };
}

export function drawConverter(ctx, x, y, t, active) {
  pixelShadow(ctx, x, y, 24, 3);
  const frame = Math.floor(t * (active ? 14 : 4)) % 4;
  blit(ctx, sprite(`converter2:${frame}:${active}`, () => buildConverter(frame, active)), x, y);
  // Brilho do núcleo
  const glow = ctx.createRadialGradient(x, y - 36, 2, x, y - 36, active ? 34 : 22);
  glow.addColorStop(0, `rgba(127, 230, 255, ${active ? 0.35 : 0.14})`);
  glow.addColorStop(1, 'rgba(127, 230, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 36, y - 72, 72, 72);
}

/** Tubo de vidro graduado (marcas a cada 4, números a cada 8) que enche até `value` de `max`. */
export function drawOutputTube(ctx, x, y, value, max, predicted) {
  const h = 62;
  const top = y - h;
  const X = Math.round(x);
  // Tampas de latão
  ctx.fillStyle = '#5a3e12';
  ctx.fillRect(X - 8, top - 5, 16, 5);
  ctx.fillRect(X - 8, y, 16, 5);
  ctx.fillStyle = '#d9a640';
  ctx.fillRect(X - 7, top - 4, 14, 3);
  ctx.fillRect(X - 7, y + 1, 14, 3);
  ctx.fillStyle = '#fff0b0';
  ctx.fillRect(X - 7, top - 4, 6, 1);
  // Vidro
  ctx.fillStyle = '#0c0b18';
  ctx.fillRect(X - 6, top, 12, h);
  const level = Math.round(Math.min(1, Math.max(0, value / max)) * (h - 2));
  const liquid = ctx.createLinearGradient(X - 5, 0, X + 5, 0);
  liquid.addColorStop(0, '#7ff0e0');
  liquid.addColorStop(0.5, '#3fbfae');
  liquid.addColorStop(1, '#1f7f78');
  ctx.fillStyle = liquid;
  ctx.fillRect(X - 5, y - 1 - level, 10, level);
  ctx.fillStyle = '#e8fdff';
  if (level > 2) ctx.fillRect(X - 5, y - 1 - level, 10, 1);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(X - 4, top + 2, 2, h - 4);
  // Marcas e números
  ctx.font = '700 5px "Fredoka", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= max; v += 4) {
    const my = Math.round(y - 1 - (v / max) * (h - 2));
    ctx.fillStyle = v % 8 === 0 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.35)';
    ctx.fillRect(X + 3, my, v % 8 === 0 ? 3 : 2, 1);
    if (v % 8 === 0) {
      ctx.fillStyle = '#cfe0ff';
      ctx.fillText(String(v), X + 8, my);
    }
  }
  if (predicted != null) {
    const py = Math.round(y - 1 - Math.min(1, predicted / max) * (h - 2));
    ctx.fillStyle = '#ffcf4a';
    ctx.fillRect(X - 9, py, 18, 1);
    ctx.fillRect(X - 10, py - 1, 2, 3);
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
