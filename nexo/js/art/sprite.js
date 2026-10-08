/* NEXO — Sprite de personagem em pixel art detalhada (estilo RPG de fazenda)
 *
 * Grade de 26 × 51 pixels (corpo em 24 × 49), 1 pixel do mundo por pixel do sprite.
 * Proporção de RPG de fazenda: cabeça grande e expressiva, corpo compacto.
 *
 * Cada material tem uma rampa de 5 tons (contorno, sombra, base, luz, brilho), com a luz
 * vindo de cima e da esquerda. As sombras puxam para o roxo e as luzes para o amarelo.
 * O contorno é gerado no fim, na cor escura do vizinho (nunca preto puro).
 *
 * O desenho é montado por camadas a partir de uma POSE (ver DEFAULT_POSE), em 3 vistas:
 * frente ("down"), costas ("up") e perfil ("right"; "left" é o espelho).
 * Cada combinação de visual + direção + pose é desenhada uma vez e fica em cache.
 */

const GRID_W = 26;
const GRID_H = 51;
const FOOT_ROW = 49; // primeira linha abaixo dos sapatos
const HEAD_TOP = 8; // primeira linha da pele da cabeça (sem balanço)
const TORSO_TOP = 25;

const EYE_DARK = '#1f1530';
const EYE_WHITE = '#ffffff';
const EYE_SOFT = '#e6e0f0';
const MOUTH = '#9a4a44';
const LIP = '#c97a6c';
const UNDERSHIRT = '#f4f0e6';
const BUCKLE = '#e8c65a';
const BUCKLE_LIGHT = '#fff3b0';
const LACE = '#efe6d2';
const HANDLE = '#8a5a33';
const HANDLE_DARK = '#5e3a1f';
const BLADE = '#b5bccb';
const BLADE_DARK = '#6e7488';
const BLADE_SHINE = '#eef2fa';

/* ---------- Cores ---------- */

function toRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const toHex = (r, g, b) => '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');

/** Mistura duas cores hex (t = 0 → a, t = 1 → b). */
export function mix(a, b, t) {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Rampa de tons: contorno, sombra, base, luz e brilho. */
function ramp(hex) {
  return {
    o: mix(mix(hex, '#2a1640', 0.4), '#000000', 0.45),
    d: mix(hex, '#3a2560', 0.32),
    m: hex,
    l: mix(hex, '#fff2c0', 0.3),
    h: mix(hex, '#fffbe8', 0.58),
  };
}

/* ---------- Grade de pixels ---------- */

class PixelGrid {
  constructor() {
    this.cells = new Array(GRID_W * GRID_H).fill(null);
  }

  set(x, y, color) {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H || !color) return;
    this.cells[y * GRID_W + x] = color;
  }

  rect(x, y, w, h, color) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
  }

  /** Linha horizontal de x0 a x1 (inclusive). */
  span(y, x0, x1, color) {
    for (let x = x0; x <= x1; x++) this.set(x, y, color);
  }

  /** Linha vertical de y0 a y1 (inclusive). */
  column(x, y0, y1, color) {
    for (let y = y0; y <= y1; y++) this.set(x, y, color);
  }

  /**
   * Passe de volume: cada trecho contínuo da silhueta (tronco, braço, perna, cabeça) é
   * sombreado como um cilindro, com a luz vindo de cima e da esquerda. Os pixels da borda
   * iluminada ganham um fio de luz (rim light) e os da borda oposta escurecem para o roxo,
   * como sombra própria. Cores muito escuras (olhos, contornos internos) quase não mudam.
   */
  volume(strength = 1, mirrored = false) {
    const side = mirrored ? -1 : 1; // o perfil "left" é espelhado depois: a luz continua vindo da esquerda da tela
    const src = this.cells.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H ? null : src[y * GRID_W + x]);
    const across = new Float32Array(GRID_W * GRID_H);
    const down = new Float32Array(GRID_W * GRID_H);
    // Posição de cada pixel dentro do seu trecho horizontal (-1 à esquerda, 1 à direita)
    for (let y = 0; y < GRID_H; y++) {
      let x = 0;
      while (x < GRID_W) {
        if (!at(x, y)) {
          x++;
          continue;
        }
        const start = x;
        while (x < GRID_W && at(x, y)) x++;
        const end = x - 1;
        for (let i = start; i <= end; i++) across[y * GRID_W + i] = end > start + 1 ? ((i - start) / (end - start)) * 2 - 1 : 0;
      }
    }
    // E dentro do trecho vertical (-1 em cima, 1 embaixo)
    for (let x = 0; x < GRID_W; x++) {
      let y = 0;
      while (y < GRID_H) {
        if (!at(x, y)) {
          y++;
          continue;
        }
        const start = y;
        while (y < GRID_H && at(x, y)) y++;
        const end = y - 1;
        for (let j = start; j <= end; j++) down[j * GRID_W + x] = end > start + 1 ? ((j - start) / (end - start)) * 2 - 1 : 0;
      }
    }
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const color = at(x, y);
        if (!color) continue;
        const [r, g, b] = toRgb(color);
        const luminance = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
        if (luminance < 0.16) continue; // olhos, sobrancelhas, linhas escuras
        const index = y * GRID_W + x;
        let light = -0.62 * side * across[index] - 0.22 * down[index];
        const litEdge = !at(x - side, y) || !at(x, y - 1);
        const darkEdge = !at(x + side, y) || !at(x, y + 1);
        if (litEdge && !darkEdge) light += 0.35;
        if (darkEdge && !litEdge) light -= 0.3;
        const amount = Math.min(0.42, Math.abs(light) * 0.3 * strength);
        if (amount < 0.03) continue;
        this.cells[index] = light > 0 ? mix(color, '#fff3d6', amount) : mix(color, '#2a1d4a', amount);
      }
    }
  }

  /** Contorno colorido em volta de tudo o que foi pintado. */
  outline() {
    const source = this.cells.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H ? null : source[y * GRID_W + x]);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (at(x, y)) continue;
        const neighbor = at(x, y - 1) ?? at(x, y + 1) ?? at(x - 1, y) ?? at(x + 1, y);
        if (neighbor) this.set(x, y, mix(mix(neighbor, '#2a1640', 0.45), '#000000', 0.5));
      }
    }
  }

  toCanvas(mirror = false) {
    const canvas = document.createElement('canvas');
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const color = this.cells[y * GRID_W + x];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(mirror ? GRID_W - 1 - x : x, y, 1, 1);
      }
    }
    return canvas;
  }
}

/* ---------- Visual ---------- */

function resolve(look) {
  const full = { top: 'tee', bottom: 'pants', shoes: '#3a2618', accessory: 'none', eyes: '#4a6fb0', ...look };
  return {
    ...full,
    K: ramp(full.skin),
    R: ramp(full.hair),
    S: ramp(full.shirt),
    P: ramp(full.pants),
    Z: ramp(full.shoes),
    U: ramp(UNDERSHIRT),
    E: ramp(full.eyes),
    blush: mix(full.skin, '#ff7070', 0.32),
    sleeveRows: full.top === 'tank' ? 0 : full.top === 'tee' ? 4 : 10,
  };
}

/* ---------- Caminhada (6 quadros) ---------- */

/**
 * Para cada quadro do passo: quanto cada pé sobe (vista de frente/costas),
 * o afastamento das pernas (perfil) e o balanço dos braços.
 */
const WALK = [
  { liftL: 0, liftR: 0, stride: 3, swing: 1 }, // contato: pé direito à frente
  { liftL: 0, liftR: 1, stride: 1, swing: 1 }, // apoio: pé de trás sobe
  { liftL: 0, liftR: 2, stride: -1, swing: 0 }, // passagem
  { liftL: 0, liftR: 0, stride: -3, swing: -1 }, // contato: pé esquerdo à frente
  { liftL: 1, liftR: 0, stride: -1, swing: -1 },
  { liftL: 2, liftR: 0, stride: 1, swing: 0 },
];

/* ======================================================================
 * Vista de frente e de costas
 * ==================================================================== */

/** Cabelo que fica atrás do corpo (longo, trança vista de costas, capuz). */
function hairBehind(g, L, view, top) {
  const { R } = L;
  if (L.hairStyle === 'long' && view !== 'up') {
    if (view === 'side') {
      g.rect(5, top + 4, 7, 24, R.d);
      g.rect(6, top + 4, 5, 22, R.m);
      g.column(7, top + 8, top + 22, R.l);
    } else {
      g.rect(4, top + 5, 18, 24, R.d);
      g.rect(5, top + 5, 16, 22, R.m);
    }
  }
  if (L.top === 'hoodie' && view !== 'up') {
    const S = L.S;
    if (view === 'side') g.rect(6, top + 14, 6, 4, S.d);
    else g.span(top + 16, 7, 18, S.d);
  }
}

function legsFront(g, L, view, pose) {
  const { P, K, Z } = L;
  const walk = WALK[pose.legs % 6];
  const covered = (row) => L.bottom === 'pants' || (L.bottom === 'shorts' && row <= 40);
  const tone = (row) => (covered(row) ? P : K);

  if (pose.crouch) {
    // Joelhos dobrados e afastados
    [[6, 11, 'l'], [14, 19, 'r']].forEach(([x0, x1, side]) => {
      for (let y = 41; y <= 45; y++) {
        const t = tone(y);
        g.span(y, x0, x1, t.m);
        g.set(side === 'l' ? x0 : x1, y, side === 'l' ? t.l : t.d);
      }
      const t = tone(41);
      g.span(41, x0 + 1, x1 - 1, t.l);
    });
    shoe(g, Z, 5, 46, 'l');
    shoe(g, Z, 15, 46, 'r');
    return;
  }

  if (covered(38)) g.span(38, 8, 17, P.m);
  const leg = (x0, lift, side) => {
    for (let y = 38; y <= 45 - lift; y++) {
      const t = tone(y);
      g.span(y, x0, x0 + 3, t.m);
      g.set(side === 'l' ? x0 : x0 + 3, y, side === 'l' ? t.l : t.d);
      if (y === 41) g.set(x0 + 1, y, t.l); // brilho do joelho
      if (y === 43 && covered(y)) g.set(side === 'l' ? x0 + 2 : x0 + 1, y, t.d); // dobra do tecido
    }
  };
  leg(8, walk.liftL, 'l');
  leg(14, walk.liftR, 'r');
  if (covered(38)) {
    g.column(12, 38, 39, P.d);
    g.column(13, 38, 39, P.d);
  }
  shoe(g, Z, 7, 46 - walk.liftL, 'l', view === 'up');
  shoe(g, Z, 13, 46 - walk.liftR, 'r', view === 'up');
}

/** Sapato com brilho, cadarço e sola (5 × 3). */
function shoe(g, Z, x0, y0, side, heel = false) {
  g.span(y0, x0, x0 + 4, Z.m);
  g.span(y0 + 1, x0, x0 + 4, Z.m);
  g.span(y0 + 2, x0, x0 + 4, Z.o);
  if (heel) {
    g.span(y0, x0 + 1, x0 + 3, Z.d);
    return;
  }
  g.set(side === 'l' ? x0 + 1 : x0 + 2, y0, Z.l);
  g.set(side === 'l' ? x0 + 1 : x0 + 3, y0 + 1, Z.h);
  g.set(x0 + 2, y0, LACE);
}

function torsoFront(g, L, view, pose, y0) {
  const { S, K, P, U } = L;
  const front = view === 'down';

  // Tronco: ombros arredondados, luz à esquerda, sombra à direita
  g.span(y0, 8, 17, S.m);
  g.rect(7, y0 + 1, 12, 11, S.m);
  for (let y = y0 + 1; y <= y0 + 10; y++) {
    g.set(7, y, S.l);
    g.set(17, y, S.d);
    g.set(18, y, S.d);
  }
  g.span(y0, 9, 12, S.h);
  g.span(y0 + 1, 8, 10, S.l);
  g.span(y0 + 11, 7, 18, S.d);
  // Dobras do tecido
  [[11, 6], [12, 7], [15, 5], [16, 6], [10, 9], [14, 9]].forEach(([x, dy]) => g.set(x, y0 + dy, S.d));
  [[9, 5], [10, 6], [13, 4]].forEach(([x, dy]) => g.set(x, y0 + dy, S.l));

  if (front) {
    if (L.top === 'tee') {
      g.span(y0, 10, 15, K.d);
      g.span(y0 + 1, 11, 14, K.m);
      g.set(9, y0, S.d);
      g.set(16, y0, S.d);
      g.span(y0 + 2, 11, 14, S.d);
    } else if (L.top === 'jacket') {
      for (let y = y0; y <= y0 + 11; y++) {
        g.set(12, y, U.l);
        g.set(13, y, U.d);
      }
      for (let i = 0; i < 4; i++) {
        g.set(11 - Math.floor(i / 2), y0 + i, S.d);
        g.set(14 + Math.floor(i / 2), y0 + i, S.d);
      }
      g.span(y0 + 7, 8, 10, S.d);
      g.span(y0 + 7, 15, 17, S.d);
      g.set(13, y0 + 5, BUCKLE);
    } else if (L.top === 'hoodie') {
      g.span(y0, 8, 17, S.d);
      g.span(y0, 10, 15, S.o);
      // Cordões do capuz: finos, curtos e na cor do tecido clareada
      const cord = mix(U.l, S.m, 0.35);
      for (let y = y0 + 1; y <= y0 + 3; y++) {
        g.set(10, y, cord);
        g.set(15, y, cord);
      }
      g.set(10, y0 + 4, U.d);
      g.set(15, y0 + 4, U.d);
      g.span(y0 + 7, 9, 16, S.d);
      g.rect(10, y0 + 8, 6, 2, S.m);
      g.set(9, y0 + 8, S.d);
      g.set(16, y0 + 8, S.d);
    } else if (L.top === 'tank') {
      g.rect(7, y0, 3, 3, K.m);
      g.set(7, y0, K.l);
      g.rect(16, y0, 3, 3, K.d);
      g.span(y0, 10, 15, K.d);
      g.span(y0 + 1, 11, 14, K.m);
    }
  } else if (L.top === 'hoodie') {
    // Capuz caído nas costas
    g.rect(9, y0, 8, 4, S.d);
    g.span(y0, 10, 15, S.m);
    g.span(y0 + 3, 10, 15, S.o);
  } else {
    g.column(12, y0 + 2, y0 + 10, S.d); // costura das costas
  }

  if (L.bottom !== 'skirt') {
    g.span(y0 + 12, 7, 18, P.d);
    if (front) {
      g.span(y0 + 12, 12, 13, BUCKLE);
      g.set(12, y0 + 12, BUCKLE_LIGHT);
    }
  }

  armsFront(g, L, pose, y0);
}

/** Braço reto (3 de largura) com manga, punho e mão de 3 linhas. */
function straightArm(g, L, x0, y0, dy, side) {
  const { S, K } = L;
  for (let i = 0; i < 10; i++) {
    const t = i < L.sleeveRows ? S : K;
    const y = y0 + 1 + i + dy;
    g.span(y, x0, x0 + 2, t.m);
    if (side === 'l') {
      g.set(x0, y, t.l);
      g.set(x0 + 2, y, t.d);
    } else {
      g.set(x0 + 2, y, t.d);
    }
  }
  if (L.sleeveRows === 10) g.span(y0 + 10 + dy, x0, x0 + 2, S.d); // punho
  else if (L.sleeveRows > 0) g.span(y0 + L.sleeveRows + dy, x0, x0 + 2, S.d); // barra da manga
  // Mão
  g.span(y0 + 11 + dy, x0, x0 + 2, K.m);
  g.span(y0 + 12 + dy, x0, x0 + 2, K.m);
  g.span(y0 + 13 + dy, x0, x0 + 2, K.d);
  g.set(side === 'l' ? x0 : x0 + 2, y0 + 11 + dy, K.l);
}

function armsFront(g, L, pose, y0) {
  const { K } = L;
  const swing = pose.arms === 'swing' ? WALK[pose.legs % 6].swing : 0;
  switch (pose.arms) {
    case 'raised':
    case 'tool-up': {
      // Braços sobem pelos lados da cabeça até o alto
      const topRow = pose.arms === 'tool-up' ? 4 : 5;
      [[3, 'l'], [20, 'r']].forEach(([x0, side]) => {
        for (let y = y0 + 1, i = 0; y >= topRow + 2; y--, i++) {
          const t = i < L.sleeveRows ? L.S : K;
          g.span(y, x0, x0 + 2, t.m);
          g.set(side === 'l' ? x0 : x0 + 2, y, side === 'l' ? t.l : t.d);
        }
        g.span(topRow + 1, x0, x0 + 2, K.m);
        g.span(topRow, x0, x0 + 2, K.l);
      });
      if (pose.arms === 'tool-up') {
        g.span(2, 1, 24, HANDLE);
        g.span(3, 2, 23, HANDLE_DARK);
        g.rect(23, 1, 2, 8, BLADE);
        g.column(24, 1, 8, BLADE_DARK);
        g.set(23, 1, BLADE_SHINE);
      }
      return;
    }
    case 'half': {
      // Antebraços dobrados para cima, mãos na altura do queixo
      [[4, 'l'], [19, 'r']].forEach(([x0, side]) => {
        for (let i = 0; i < 5; i++) {
          const t = i < L.sleeveRows ? L.S : K;
          g.span(y0 + 1 + i, x0, x0 + 2, t.m);
          g.set(side === 'l' ? x0 : x0 + 2, y0 + 1 + i, side === 'l' ? t.l : t.d);
        }
        for (let i = 0; i < 5; i++) {
          const t = i + 5 < L.sleeveRows ? L.S : K;
          g.span(y0 - i, side === 'l' ? x0 + 1 : x0 - 1, side === 'l' ? x0 + 3 : x0 + 1, t.m);
        }
        g.span(y0 - 5, side === 'l' ? x0 + 1 : x0 - 1, side === 'l' ? x0 + 3 : x0 + 1, K.l);
      });
      return;
    }
    case 'forward': {
      // Braços à frente e para baixo, mãos juntas perto do chão
      straightArm(g, L, 5, y0, 2, 'l');
      straightArm(g, L, 18, y0, 2, 'r');
      return;
    }
    case 'tool-down': {
      // Mãos juntas na barriga; o cabo desce até a lâmina no chão, à frente dos pés
      for (let i = 0; i < 9; i++) {
        const t = i < L.sleeveRows ? L.S : K;
        const lx = 4 + Math.min(i, 6) * 1;
        const rx = 19 - Math.min(i, 6) * 1;
        g.span(y0 + 1 + i, lx, lx + 2, t.m);
        g.span(y0 + 1 + i, rx, rx + 2, t.d);
      }
      for (let y = y0 + 12; y <= 46; y++) g.span(y, 12, 13, y % 2 ? HANDLE : HANDLE_DARK);
      g.span(y0 + 10, 10, 15, K.m);
      g.span(y0 + 11, 10, 15, K.d);
      g.span(47, 7, 18, BLADE);
      g.span(48, 7, 18, BLADE_DARK);
      g.span(47, 8, 10, BLADE_SHINE);
      return;
    }
    default:
      straightArm(g, L, 4, y0, swing, 'l');
      straightArm(g, L, 19, y0, -swing, 'r');
  }
}

function skirt(g, L, view, y0) {
  if (L.bottom !== 'skirt') return;
  const { P } = L;
  if (view === 'side') {
    g.rect(7, y0, 12, 4, P.m);
    g.span(y0, 7, 18, P.d);
    g.span(y0 + 4, 6, 19, P.d);
    g.set(9, y0 + 2, P.d);
    g.set(14, y0 + 2, P.d);
    return;
  }
  g.span(y0, 7, 18, P.d);
  g.span(y0 + 1, 7, 18, P.m);
  g.span(y0 + 2, 6, 19, P.m);
  g.span(y0 + 3, 5, 20, P.m);
  g.span(y0 + 4, 5, 20, P.m);
  g.span(y0 + 5, 5, 20, P.d);
  [8, 11, 14, 17].forEach((x) => g.column(x, y0 + 2, y0 + 4, P.d));
  g.column(6, y0 + 2, y0 + 4, P.l);
  g.set(7, y0 + 1, P.l);
}

/** Linhas da cabeça (x inicial e final), 16 linhas a partir do topo da pele. */
const HEAD_ROWS = [[10, 15], [8, 17], [7, 18], [6, 19], [6, 19], [6, 19], [6, 19], [6, 19], [6, 19], [6, 19], [6, 19], [6, 19], [6, 19], [7, 18], [8, 17], [10, 15]];

function headFront(g, L, top, blink) {
  const { K, R, E } = L;
  HEAD_ROWS.forEach(([x0, x1], i) => g.span(top + i, x0, x1, K.m));
  // Volume do rosto: luz na testa e bochecha esquerda, sombra à direita e no queixo
  for (let i = 3; i <= 12; i++) {
    g.set(19, top + i, K.d);
    if (i >= 6) g.set(18, top + i, K.d);
  }
  g.span(top + 3, 7, 8, K.l);
  g.set(7, top + 4, K.l);
  g.span(top + 13, 15, 18, K.d);
  g.span(top + 14, 9, 17, K.d);
  g.span(top + 15, 10, 15, K.d);
  // Orelhas
  [[5, K.m, K.d], [20, K.d, K.o]].forEach(([x, base, inner]) => {
    g.column(x, top + 7, top + 10, base);
    g.set(x, top + 8, inner);
  });
  // Pescoço
  g.rect(10, top + 16, 6, 2, K.d);
  g.span(top + 16, 10, 15, mix(K.d, '#3a2560', 0.25));

  // Sobrancelhas
  g.span(top + 6, 8, 10, R.d);
  g.span(top + 6, 15, 17, R.d);
  // Olhos: cílio, brilho, íris e pupila (ou fechados, piscando)
  [[8, 'l'], [15, 'r']].forEach(([x0, side]) => {
    if (blink) {
      g.span(top + 8, x0, x0 + 2, EYE_DARK);
      g.set(side === 'l' ? x0 : x0 + 2, top + 9, mix(L.skin, EYE_DARK, 0.3));
      return;
    }
    // Cílio em cima; branco do olho do lado de fora; íris com reflexo; pupila embaixo
    const outer = side === 'l' ? x0 : x0 + 2;
    const inner = side === 'l' ? x0 + 2 : x0;
    g.span(top + 7, x0, x0 + 2, EYE_DARK);
    g.set(side === 'l' ? x0 - 1 : x0 + 3, top + 7, mix(L.skin, EYE_DARK, 0.5));
    g.set(outer, top + 8, EYE_WHITE);
    g.set(x0 + 1, top + 8, mix(E.l, EYE_WHITE, 0.55));
    g.set(inner, top + 8, E.m);
    g.set(outer, top + 9, EYE_SOFT);
    g.set(x0 + 1, top + 9, EYE_DARK);
    g.set(inner, top + 9, E.d);
  });
  // Nariz, bochechas e boca
  g.set(12, top + 10, K.l);
  g.set(13, top + 11, K.d);
  g.span(top + 11, 7, 9, L.blush);
  g.span(top + 11, 16, 18, L.blush);
  g.span(top + 13, 12, 13, MOUTH);
  g.set(11, top + 13, LIP);
  g.set(14, top + 13, LIP);
}

function headBack(g, L, top) {
  const { K, R } = L;
  HEAD_ROWS.forEach(([x0, x1], i) => g.span(top + i, x0, x1, R.m));
  g.column(5, top + 7, top + 10, K.m);
  g.column(20, top + 7, top + 10, K.d);
  g.rect(10, top + 14, 6, 4, K.d);
  g.span(top + 14, 10, 15, K.m);
}

/** Cabelo de frente (volume, mechas e franja recortada). */
function hairFront(g, L, top) {
  const { R } = L;
  g.span(top - 3, 10, 15, R.m);
  g.span(top - 2, 8, 17, R.m);
  g.span(top - 1, 7, 18, R.m);
  for (let y = top; y <= top + 4; y++) g.span(y, 6, 19, R.m);
  // Laterais sobre as têmporas
  g.rect(5, top + 3, 2, 6, R.m);
  g.rect(19, top + 3, 2, 6, R.d);
  // Franja em mechas de comprimentos diferentes
  const locks = { 7: 7, 8: 6, 9: 6, 10: 7, 11: 5, 12: 5, 13: 6, 14: 7, 15: 6, 16: 6, 17: 7, 18: 5 };
  Object.entries(locks).forEach(([x, bottom]) => {
    g.column(Number(x), top + 5, top + bottom, R.m);
    g.set(Number(x), top + bottom, R.d);
  });
  // Brilho em arco e fios escuros
  g.span(top - 2, 10, 13, R.l);
  g.span(top - 1, 9, 11, R.h);
  g.span(top - 1, 12, 15, R.l);
  g.span(top, 8, 10, R.l);
  g.set(8, top + 1, R.l);
  [[12, 1], [12, 2], [16, 0], [16, 1], [16, 2], [9, 2], [9, 3], [14, 3], [14, 4], [7, 4]].forEach(([x, dy]) => g.set(x, top + dy, R.d));
  g.column(18, top, top + 4, R.d);
  hairStyleFront(g, L, top);
}

function hairStyleFront(g, L, top) {
  const { R } = L;
  switch (L.hairStyle) {
    case 'long':
      g.rect(3, top + 4, 4, 22, R.m);
      g.rect(19, top + 4, 4, 22, R.d);
      g.column(4, top + 6, top + 22, R.l);
      g.column(21, top + 6, top + 22, R.o);
      [3, 5, 19, 21].forEach((x, i) => g.set(x, top + 26 - (i % 2), R.d));
      break;
    case 'bun':
      g.rect(10, top - 8, 6, 5, R.m);
      g.span(top - 9, 11, 14, R.m);
      g.span(top - 7, 11, 12, R.h);
      g.set(11, top - 8, R.l);
      g.column(15, top - 8, top - 4, R.d);
      g.span(top - 4, 10, 15, '#b5452f');
      break;
    case 'spiky':
      [[6, 3], [7, 4], [9, 5], [10, 6], [12, 6], [13, 5], [15, 6], [16, 5], [18, 4], [19, 3]].forEach(([x, h]) => g.column(x, top - h, top - 1, R.m));
      [9, 12, 16].forEach((x) => g.set(x, top - 4, R.l));
      break;
    case 'braid':
      g.rect(19, top + 4, 3, 4, R.d);
      for (let y = top + 8; y <= top + 30; y++) g.span(y, 20, 22, (y - top) % 3 === 0 ? R.d : (y - top) % 3 === 1 ? R.m : R.l);
      g.span(top + 31, 20, 22, '#e8c65a');
      g.span(top + 32, 20, 22, R.m);
      break;
    default:
      break;
  }
}

function hairBackView(g, L, top) {
  const { R } = L;
  g.span(top - 3, 10, 15, R.m);
  g.span(top - 2, 8, 17, R.m);
  g.span(top - 1, 7, 18, R.m);
  g.rect(5, top + 3, 2, 8, R.m);
  g.rect(19, top + 3, 2, 8, R.d);
  g.span(top - 2, 10, 13, R.l);
  g.span(top - 1, 9, 12, R.l);
  [[11, 3], [11, 4], [14, 6], [14, 7], [9, 8], [16, 9], [12, 11]].forEach(([x, dy]) => g.set(x, top + dy, R.d));
  for (let i = 3; i <= 12; i++) g.set(19, top + i, R.d);
  g.span(top + 13, 8, 17, R.d);
  if (L.hairStyle === 'long') {
    g.rect(5, top + 13, 16, 16, R.m);
    g.column(19, top + 13, top + 28, R.d);
    g.column(7, top + 14, top + 26, R.l);
    g.span(top + 28, 5, 20, R.d);
  }
  if (L.hairStyle === 'braid') {
    for (let y = top + 13; y <= top + 32; y++) g.span(y, 11, 14, (y - top) % 3 === 0 ? R.d : R.m);
    g.span(top + 33, 11, 14, '#e8c65a');
  }
  if (L.hairStyle === 'bun') {
    g.rect(10, top - 8, 6, 5, R.m);
    g.span(top - 7, 11, 13, R.l);
    g.span(top - 4, 10, 15, '#b5452f');
  }
  if (L.hairStyle === 'spiky') {
    [[7, 3], [10, 5], [13, 5], [16, 4], [18, 3]].forEach(([x, h]) => g.column(x, top - h, top - 1, R.m));
  }
}

/* ======================================================================
 * Perfil (virado para a direita)
 * ==================================================================== */

function legsSide(g, L, pose) {
  const { P, K, Z } = L;
  const covered = (row) => L.bottom === 'pants' || (L.bottom === 'shorts' && row <= 40);
  if (pose.crouch) {
    for (let y = 41; y <= 45; y++) {
      const t = covered(y) ? P : K;
      g.span(y, 9, 16, t.m);
      g.set(16, y, t.l);
    }
    g.span(46, 9, 17, Z.m);
    g.span(47, 9, 17, Z.m);
    g.span(48, 9, 17, Z.o);
    return;
  }
  const walk = WALK[pose.legs % 6];
  const leg = (offset, lift, back) => {
    const x0 = 10 + offset;
    for (let y = 38; y <= 45 - lift; y++) {
      const t = covered(y) ? P : K;
      g.span(y, x0, x0 + 3, back ? t.d : t.m);
      if (!back) g.set(x0 + 3, y, t.l);
    }
    const sy = 46 - lift;
    g.span(sy, x0, x0 + 5, back ? Z.d : Z.m);
    g.span(sy + 1, x0, x0 + 5, back ? Z.d : Z.m);
    g.span(sy + 2, x0, x0 + 5, Z.o);
    if (!back) {
      g.set(x0 + 4, sy, Z.l);
      g.set(x0 + 2, sy, LACE);
    }
  };
  const backLift = walk.liftR || walk.liftL;
  leg(-walk.stride, walk.stride < 0 ? backLift : 0, true);
  leg(walk.stride, walk.stride > 0 ? 0 : backLift, false);
}

function torsoSide(g, L, pose, y0) {
  const { S, K, P } = L;
  const walk = WALK[pose.legs % 6];
  const swing = pose.arms === 'swing' ? walk.swing * 2 : 0;

  // Braço de trás (mais escuro), atrás do tronco
  if (!['raised', 'tool-up', 'tool-down', 'half'].includes(pose.arms)) {
    for (let i = 0; i < 10; i++) {
      const t = i < L.sleeveRows ? S : K;
      g.span(y0 + 1 + i, 11 - swing, 13 - swing, t.d);
    }
    g.span(y0 + 11, 11 - swing, 13 - swing, K.d);
    g.span(y0 + 12, 11 - swing, 13 - swing, K.o);
  }

  g.span(y0, 9, 16, S.m);
  g.rect(8, y0 + 1, 10, 11, S.m);
  for (let y = y0 + 1; y <= y0 + 10; y++) {
    g.set(8, y, S.d);
    g.set(17, y, S.l);
  }
  g.span(y0, 12, 15, S.h);
  g.span(y0 + 11, 8, 17, S.d);
  [[12, 6], [13, 7], [11, 9]].forEach(([x, dy]) => g.set(x, y0 + dy, S.d));
  if (L.top === 'jacket') g.column(16, y0 + 1, y0 + 11, L.U.l);
  if (L.top === 'hoodie') g.rect(8, y0, 4, 4, S.d);
  if (L.bottom !== 'skirt') {
    g.span(y0 + 12, 8, 17, P.d);
    g.set(16, y0 + 12, BUCKLE);
  }

  switch (pose.arms) {
    case 'raised':
    case 'tool-up': {
      for (let y = y0 + 1, i = 0; y >= 6; y--, i++) g.span(y, 12, 14, i < L.sleeveRows ? S.m : K.m);
      g.span(5, 12, 14, K.l);
      if (pose.arms === 'tool-up') {
        for (let i = 0; i < 12; i++) g.span(5 - Math.floor(i / 3), 14 + i, 14 + i, i % 2 ? HANDLE : HANDLE_DARK);
        g.rect(23, 0, 2, 7, BLADE);
        g.column(24, 0, 6, BLADE_DARK);
      }
      return;
    }
    case 'half': {
      for (let i = 0; i < 5; i++) g.span(y0 + 1 + i, 12, 14, i < L.sleeveRows ? S.m : K.m);
      for (let i = 0; i < 5; i++) g.span(y0 + 4 - i, 14 + Math.floor(i / 2), 16 + Math.floor(i / 2), i + 5 < L.sleeveRows ? S.m : K.m);
      g.span(y0 - 1, 16, 18, K.l);
      return;
    }
    case 'tool-down': {
      for (let i = 0; i < 8; i++) g.span(y0 + 1 + i, 13 + Math.floor(i / 2), 15 + Math.floor(i / 2), i < L.sleeveRows ? S.m : K.m);
      for (let i = 0; i < 16; i++) g.span(y0 + 9 + i, 17 + Math.floor(i / 2), 18 + Math.floor(i / 2), i % 2 ? HANDLE : HANDLE_DARK);
      g.rect(23, 44, 3, 5, BLADE);
      g.column(25, 44, 48, BLADE_DARK);
      return;
    }
    default: {
      const reach = pose.arms === 'forward' ? 3 : swing;
      for (let i = 0; i < 10; i++) {
        const t = i < L.sleeveRows ? S : K;
        const dx = Math.round((reach * i) / 10);
        g.span(y0 + 1 + i, 12 + dx, 14 + dx, t.m);
        g.set(14 + dx, y0 + 1 + i, t.l);
        g.set(12 + dx, y0 + 1 + i, t.d);
      }
      g.span(y0 + 11, 12 + reach, 14 + reach, K.m);
      g.span(y0 + 12, 12 + reach, 14 + reach, K.m);
      g.span(y0 + 13, 12 + reach, 14 + reach, K.d);
      g.set(14 + reach, y0 + 11, K.l);
    }
  }
}

function headSide(g, L, top, blink) {
  const { K, R, E } = L;
  HEAD_ROWS.forEach(([x0, x1], i) => g.span(top + i, x0, x1, K.m));
  for (let i = 3; i <= 12; i++) g.set(6, top + i, K.d);
  // Nariz, boca e queixo para a frente
  g.set(20, top + 9, K.m);
  g.set(20, top + 10, K.d);
  g.span(top + 13, 17, 18, MOUTH);
  g.set(18, top + 12, LIP);
  g.span(top + 14, 10, 17, K.d);
  g.set(16, top + 11, L.blush);
  g.set(17, top + 11, L.blush);
  // Olho de perfil
  if (blink) {
    g.span(top + 8, 15, 17, EYE_DARK);
  } else {
    g.span(top + 7, 15, 17, EYE_DARK);
    g.set(15, top + 8, E.m);
    g.set(16, top + 8, EYE_DARK);
    g.set(17, top + 8, EYE_WHITE);
    g.set(15, top + 9, E.d);
    g.set(16, top + 9, E.m);
    g.set(15, top + 8, EYE_WHITE);
  }
  g.span(top + 6, 15, 17, R.d);
  // Orelha
  g.rect(10, top + 7, 2, 4, K.m);
  g.set(11, top + 8, K.d);
  g.set(10, top + 9, K.d);
  // Pescoço
  g.rect(10, top + 16, 5, 2, K.d);
}

function hairSide(g, L, top) {
  const { R } = L;
  g.span(top - 3, 9, 14, R.m);
  g.span(top - 2, 7, 16, R.m);
  g.span(top - 1, 6, 18, R.m);
  for (let y = top; y <= top + 4; y++) g.span(y, 5, 19, R.m);
  g.rect(5, top + 5, 5, 8, R.m); // nuca
  g.rect(9, top + 5, 1, 2, R.m);
  // Franja caindo para a frente
  [[14, 6], [15, 7], [16, 6], [17, 7], [18, 5], [19, 6]].forEach(([x, bottom]) => {
    g.column(x, top + 5, top + bottom, R.m);
    g.set(x, top + bottom, R.d);
  });
  g.span(top - 2, 10, 13, R.l);
  g.span(top - 1, 11, 14, R.h);
  g.span(top, 12, 15, R.l);
  [[8, 2], [8, 3], [11, 4], [6, 8], [7, 10]].forEach(([x, dy]) => g.set(x, top + dy, R.d));
  g.column(5, top, top + 12, R.d);
  switch (L.hairStyle) {
    case 'long':
      g.rect(4, top + 12, 6, 14, R.m);
      g.column(4, top + 12, top + 25, R.d);
      g.column(7, top + 13, top + 23, R.l);
      break;
    case 'braid':
      for (let y = top + 12; y <= top + 30; y++) g.span(y, 5, 7, (y - top) % 3 === 0 ? R.d : R.m);
      g.span(top + 31, 5, 7, '#e8c65a');
      break;
    case 'bun':
      g.rect(6, top - 7, 6, 5, R.m);
      g.span(top - 6, 7, 9, R.l);
      g.span(top - 3, 6, 11, '#b5452f');
      break;
    case 'spiky':
      [[7, 4], [10, 5], [13, 5], [16, 4], [18, 2]].forEach(([x, h]) => g.column(x, top - h, top - 1, R.m));
      break;
    default:
      break;
  }
}

/* ======================================================================
 * Acessórios
 * ==================================================================== */

function accessory(g, L, view, top, y0) {
  const front = view === 'down';
  const side = view === 'side';
  const C = (hex) => ramp(hex);
  switch (L.accessory) {
    case 'pendant': {
      if (view === 'up') break;
      const gem = C('#5fe3d0');
      if (front) {
        g.set(10, y0 + 1, '#cfd6ff');
        g.set(15, y0 + 1, '#cfd6ff');
        g.set(11, y0 + 2, '#cfd6ff');
        g.set(14, y0 + 2, '#cfd6ff');
        g.span(y0 + 3, 12, 13, gem.m);
        g.span(y0 + 4, 12, 13, gem.d);
        g.set(12, y0 + 3, gem.h);
      } else {
        g.span(y0 + 3, 15, 16, gem.m);
      }
      break;
    }
    case 'visor': {
      const band = C('#e8e0ff');
      g.span(top + 3, side ? 5 : 5, side ? 19 : 20, band.m);
      g.span(top + 4, side ? 5 : 5, side ? 19 : 20, band.d);
      if (!side) g.span(top + 3, 7, 10, band.h);
      break;
    }
    case 'goggles': {
      g.span(top + 4, 5, side ? 19 : 20, '#3b3b5c');
      const lens = C('#5fe3d0');
      if (front) {
        [[8, 11], [14, 17]].forEach(([a, b]) => {
          g.rect(a, top + 2, b - a + 1, 3, lens.m);
          g.span(top + 2, a, b, '#3b3b5c');
          g.set(a + 1, top + 3, lens.h);
          g.set(b, top + 4, lens.d);
        });
      } else if (side) {
        g.rect(15, top + 2, 4, 3, lens.m);
        g.set(16, top + 3, lens.h);
      }
      break;
    }
    case 'hat': {
      const straw = C('#e3c26a');
      g.span(top, 2, 23, straw.d);
      g.span(top - 1, 3, 22, straw.m);
      g.rect(7, top - 6, 12, 5, straw.m);
      g.span(top - 2, 7, 18, '#b5452f');
      g.span(top - 6, 8, 12, straw.l);
      g.set(9, top - 5, straw.h);
      [10, 13, 16].forEach((x) => g.set(x, top - 4, straw.d));
      break;
    }
    case 'circlet': {
      g.span(top + 3, 6, 19, '#ffe08a');
      g.span(top + 3, 6, 8, '#fff3c0');
      if (front) {
        g.span(top + 2, 12, 13, '#b48cff');
        g.span(top + 3, 12, 13, '#8d6bff');
      }
      break;
    }
    case 'glasses': {
      // Armação escura e fina; a lente deixa o olho aparecer
      const frame = '#3b3550';
      const glint = '#dfe6ff';
      if (side) {
        g.span(top + 7, 14, 18, frame);
        g.span(top + 10, 14, 18, frame);
        g.column(18, top + 7, top + 10, frame);
        g.span(top + 8, 11, 13, frame);
        g.set(17, top + 8, glint);
        break;
      }
      if (!front) break;
      [[7, 11], [14, 18]].forEach(([a, b]) => {
        g.span(top + 6, a, b, frame);
        g.span(top + 10, a, b, frame);
        g.column(a, top + 7, top + 9, frame);
        g.column(b, top + 7, top + 9, frame);
        g.set(a + 1, top + 7, glint);
      });
      g.span(top + 7, 12, 13, frame);
      break;
    }
    case 'beard': {
      if (view === 'up') break;
      const { R } = L;
      if (front) {
        g.rect(6, top + 11, 14, 4, R.m);
        g.rect(8, top + 15, 10, 2, R.m);
        g.span(top + 17, 10, 15, R.d);
        g.span(top + 13, 11, 14, MOUTH);
        g.set(7, top + 11, R.l);
        g.set(8, top + 12, R.l);
        g.column(18, top + 11, top + 16, R.d);
      } else {
        g.rect(11, top + 11, 9, 5, R.m);
        g.set(18, top + 13, MOUTH);
      }
      break;
    }
    case 'scarf': {
      if (view === 'up') {
        g.span(y0 - 1, 8, 17, '#f2b84b');
        break;
      }
      const cloth = C('#f2b84b');
      g.span(y0 - 1, 8, 17, cloth.m);
      g.span(y0, 7, 18, cloth.d);
      g.span(y0 - 1, 8, 11, cloth.l);
      if (front) {
        g.rect(15, y0 + 1, 3, 7, cloth.m);
        g.column(17, y0 + 1, y0 + 7, cloth.d);
        g.span(y0 + 8, 15, 17, cloth.d);
      }
      break;
    }
    default:
      break;
  }
}

/* ======================================================================
 * Montagem, cache e desenho
 * ==================================================================== */

/**
 * Pose de um quadro de animação:
 *   legs   0..5  quadro do passo (0 = contato; usado também parado)
 *   crouch bool  joelhos dobrados
 *   bob    int   quanto o corpo desce (-1 sobe; 4 = agachado)
 *   arms   'rest' | 'swing' | 'forward' | 'half' | 'raised' | 'tool-up' | 'tool-down'
 *   blink  bool  olhos fechados
 */
const DEFAULT_POSE = { legs: 0, crouch: false, bob: 0, arms: 'rest', blink: false };

function paintSprite(look, dir, pose) {
  const L = resolve(look);
  const view = dir === 'left' || dir === 'right' ? 'side' : dir;
  const top = HEAD_TOP + pose.bob;
  const y0 = TORSO_TOP + pose.bob;
  const g = new PixelGrid();

  hairBehind(g, L, view, top);
  if (view === 'side') {
    legsSide(g, L, pose);
    torsoSide(g, L, pose, y0);
    skirt(g, L, view, y0 + 12);
    headSide(g, L, top, pose.blink);
    hairSide(g, L, top);
  } else {
    legsFront(g, L, view, pose);
    torsoFront(g, L, view, pose, y0);
    skirt(g, L, view, y0 + 12);
    if (view === 'up') {
      headBack(g, L, top);
      hairBackView(g, L, top);
    } else {
      headFront(g, L, top, pose.blink);
      hairFront(g, L, top);
    }
    // Braços erguidos passam por cima do cabelo
    if (pose.arms === 'raised' || pose.arms === 'tool-up') armsFront(g, L, pose, y0);
  }
  accessory(g, L, view, top, y0);
  g.volume(1, dir === 'left');
  g.outline();
  // O perfil é desenhado virado para a direita; "left" é o espelho
  return g.toCanvas(dir === 'left');
}

const cache = new Map();
const MAX_CACHE = 800;

const spriteKey = (look, dir, pose) =>
  `${look.skin}|${look.hair}|${look.hairStyle}|${look.shirt}|${look.top}|${look.pants}|${look.bottom}|${look.shoes}|${look.accessory}|${look.eyes}|${dir}|${pose.legs}|${pose.crouch}|${pose.bob}|${pose.arms}|${pose.blink}`;

function spriteFor(look, dir, pose) {
  const key = spriteKey(look, dir, pose);
  let canvas = cache.get(key);
  if (!canvas) {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    canvas = paintSprite(look, dir, pose);
    cache.set(key, canvas);
  }
  return canvas;
}

/** Converte os parâmetros antigos (passo, andando, ação) numa pose. */
function legacyPose({ step = 0, moving = false, action = null }) {
  if (action === 'crouch') return { ...DEFAULT_POSE, crouch: true, bob: 4, arms: 'forward' };
  const frame = moving ? Math.floor(step * 1.5) % 6 : 0;
  return {
    ...DEFAULT_POSE,
    legs: frame,
    bob: moving && (frame === 1 || frame === 2 || frame === 4 || frame === 5) ? -1 : 0,
    arms: action === 'carry' ? 'raised' : moving ? 'swing' : 'rest',
  };
}

/**
 * Desenha um personagem com os pés em (footX, footY).
 * Com o motor de animação, recebe { dir, pose, scaleX, scaleY, lift }:
 * a pose escolhe o desenho; escala e elevação dão o squash and stretch.
 * Sem pose, aceita os parâmetros antigos { dir, step, moving, action }.
 */
export function drawCharacter(ctx, footX, footY, look, options = {}) {
  const { dir = 'down', scaleX = 1, scaleY = 1, lift = 0 } = options;
  const pose = options.pose ? { ...DEFAULT_POSE, ...options.pose } : legacyPose(options);

  // Sombra: alarga quando o corpo achata, encolhe quando ele sobe
  const shadow = Math.max(0.6, 1 - lift / 20) * scaleX;
  ctx.fillStyle = 'rgba(30, 20, 40, .3)';
  ctx.beginPath();
  ctx.ellipse(footX, footY - 1, 10 * shadow, 3.5 * shadow, 0, 0, Math.PI * 2);
  ctx.fill();

  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(Math.round(footX), Math.round(footY - lift));
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
  ctx.drawImage(spriteFor(look, dir, pose), -GRID_W / 2, -FOOT_ROW);
  ctx.restore();
  ctx.imageSmoothingEnabled = smoothing;
}

/** Altura do sprite acima dos pés (para posicionar nomes e balões). */
export const SPRITE_HEIGHT = FOOT_ROW;

/**
 * Quadro pronto para o motor (Phaser): o canvas em cache, uma chave estável para a textura
 * e a âncora nos pés. Aceita as mesmas opções de drawCharacter ({ dir, pose } ou as antigas).
 */
export function characterSprite(look, options = {}) {
  const { dir = 'down' } = options;
  const pose = options.pose ? { ...DEFAULT_POSE, ...options.pose } : legacyPose(options);
  return {
    key: `chr|${spriteKey(look, dir, pose)}`,
    canvas: spriteFor(look, dir, pose),
    originX: 0.5,
    originY: FOOT_ROW / GRID_H,
  };
}
