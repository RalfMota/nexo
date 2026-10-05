/* NEXO — Sprite de personagem em alta densidade (estilo RPG de fazenda)
 *
 * Grade de 22 × 42 pixels (corpo em 20 × 40), 1 pixel do mundo por pixel do sprite.
 * Cada material tem uma rampa de tons (contorno, sombra, base, luz, brilho) com a luz
 * vindo de cima e da esquerda. O contorno é gerado no fim: cada pixel vazio vizinho do
 * corpo recebe uma versão escura da cor ao lado (contorno colorido, não preto).
 *
 * As camadas seguem a ordem: cabelo de trás → pernas → sapatos → tronco e braços →
 * saia → cabeça e rosto → cabelo → acessório. Cada desenho fica em cache por visual,
 * direção e passo, então o custo por quadro é um único drawImage.
 */

const GRID_W = 22;
const GRID_H = 42;
const FOOT_ROW = 40; // linha logo abaixo dos sapatos

const EYE_DARK = '#2a1d3a';
const EYE_IRIS = '#4a6fb0';
const MOUTH = '#a0524a';
const UNDERSHIRT = '#f4f0e6';
const BUCKLE = '#e8c65a';

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

/**
 * Rampa de tons de um material. As sombras puxam para o roxo e as luzes para o amarelo,
 * como na pixel art de fazenda (nunca só "mais preto" ou "mais branco").
 */
function ramp(hex) {
  return {
    o: mix(mix(hex, '#2a1640', 0.35), '#000000', 0.45),
    d: mix(hex, '#3a2560', 0.3),
    m: hex,
    l: mix(hex, '#fff2c0', 0.28),
    h: mix(hex, '#fffbe8', 0.55),
  };
}

/* ---------- Grade de pixels ---------- */

class PixelGrid {
  constructor() {
    this.cells = new Array(GRID_W * GRID_H).fill(null);
  }

  set(x, y, color) {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;
    this.cells[y * GRID_W + x] = color;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
    return this.cells[y * GRID_W + x];
  }

  rect(x, y, w, h, color) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
  }

  /** Linha horizontal de x0 a x1 (inclusive). */
  span(y, x0, x1, color) {
    for (let x = x0; x <= x1; x++) this.set(x, y, color);
  }

  /** Contorno colorido em volta de tudo o que foi pintado. */
  outline() {
    const source = this.cells.slice();
    const at = (x, y) => (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H ? null : source[y * GRID_W + x]);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (at(x, y)) continue;
        const neighbor = at(x, y - 1) ?? at(x, y + 1) ?? at(x - 1, y) ?? at(x + 1, y);
        if (neighbor) this.set(x, y, mix(mix(neighbor, '#2a1640', 0.4), '#000000', 0.5));
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
  const full = { top: 'tee', bottom: 'pants', shoes: '#3a2618', accessory: 'none', ...look };
  return {
    ...full,
    K: ramp(full.skin),
    R: ramp(full.hair),
    S: ramp(full.shirt),
    P: ramp(full.pants),
    Z: ramp(full.shoes),
    U: ramp(UNDERSHIRT),
  };
}

/* ---------- Camadas (vista de frente: dir "down") ---------- */

function hairBack(g, L, view, bob) {
  const { R } = L;
  if (view === 'down' || view === 'side') {
    if (L.hairStyle === 'long') {
      g.rect(view === 'side' ? 5 : 4, 9 + bob, view === 'side' ? 7 : 14, 15, R.d);
      g.rect(view === 'side' ? 6 : 5, 9 + bob, view === 'side' ? 5 : 12, 13, R.m);
    }
    if (L.top === 'hoodie') g.span(17 + bob, 6, 15, L.S.d);
  }
}

function legs(g, L, view, frame, crouch = false) {
  const { P, K } = L;
  const hip = crouch ? 33 : 30;
  const liftL = frame === 1 ? 1 : 0;
  const liftR = frame === 3 ? 1 : 0;
  const cloth = (row) => !(L.bottom === 'skirt' || (L.bottom === 'shorts' && row > 31));

  const leg = (x0, lift, shadeSide) => {
    for (let y = hip; y <= 36 - lift; y++) {
      const covered = cloth(y);
      const base = covered ? P : K;
      g.span(y, x0, x0 + 3, base.m);
      g.set(shadeSide === 'left' ? x0 : x0 + 3, y, shadeSide === 'left' ? base.l : base.d);
      if (covered && y === 33) g.set(x0 + 1, y, P.l); // brilho do joelho
    }
  };

  if (view === 'side') {
    const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    leg(8 - stride, 0, 'right');
    leg(9 + stride, 0, 'left');
    return;
  }
  leg(crouch ? 6 : 7, liftL, 'left');
  leg(crouch ? 12 : 11, liftR, 'right');
  if (!crouch && cloth(31)) for (let y = 30; y <= 35; y++) g.set(10, y, P.d); // costura entre as pernas
}

function shoes(g, L, view, frame) {
  const { Z } = L;
  const shoe = (x0, lift) => {
    const top = 37 - lift;
    g.span(top, x0, x0 + 4, Z.m);
    g.set(x0 + 1, top, Z.l);
    g.set(x0 + 2, top, Z.h);
    g.span(top + 1, x0, x0 + 4, Z.m);
    g.span(top + 2, x0, x0 + 4, Z.d);
  };
  if (view === 'side') {
    const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    shoe(7 - stride, 0);
    shoe(9 + stride, 0);
    return;
  }
  shoe(6, frame === 1 ? 1 : 0);
  shoe(11, frame === 3 ? 1 : 0);
}

function torso(g, L, view, pose, bob) {
  const arms = pose.arms;
  const { S, K, P, U } = L;
  const y0 = 18 + bob;
  const longSleeves = L.top === 'jacket' || L.top === 'hoodie';
  const sleeveRows = L.top === 'tank' ? 0 : longSleeves ? 9 : 3;

  if (view === 'side') {
    g.rect(7, y0, 8, 11, S.m);
    for (let y = y0; y < y0 + 11; y++) {
      g.set(7, y, S.d);
      g.set(14, y, S.l);
    }
    g.span(y0 + 10, 7, 14, S.d);
    if (L.bottom !== 'skirt') {
      g.span(y0 + 11, 7, 14, P.d);
    }
    if (arms === 'tool-up' || arms === 'tool-down') {
      sideTool(g, L, y0, arms === 'tool-up');
      return;
    }
    if (arms === 'raised' || arms === 'half') {
      const length = arms === 'raised' ? 9 : 5;
      for (let i = 0; i < length; i++) g.span(y0 + 1 - i, 10, 12, i < sleeveRows ? S.m : K.m);
      g.span(y0 - length, 10, 12, K.l);
      return;
    }
    // Braço da frente balançando (ou esticado para a frente)
    const swing = arms === 'swingB' ? 1 : arms === 'swingA' ? -1 : arms === 'forward' ? 2 : 0;
    for (let i = 0; i < 9; i++) {
      const sleeve = i < sleeveRows;
      g.span(y0 + 1 + i, 10 + swing, 12 + swing, sleeve ? S.m : K.m);
      g.set(10 + swing, y0 + 1 + i, sleeve ? S.d : K.d);
    }
    g.span(y0 + 10, 10 + swing, 12 + swing, K.m);
    g.set(12 + swing, y0 + 10, K.d);
    return;
  }

  // Tronco: luz à esquerda, sombra à direita, dobras de tecido
  g.span(y0, 6, 15, S.m);
  g.rect(6, y0 + 1, 10, 10, S.m);
  for (let y = y0 + 1; y <= y0 + 9; y++) {
    g.set(6, y, S.l);
    g.set(14, y, S.d);
    g.set(15, y, S.d);
  }
  g.span(y0, 7, 9, S.h);
  g.span(y0 + 10, 6, 15, S.d);
  [[9, 5], [10, 6], [12, 4], [13, 5], [8, 8]].forEach(([x, dy]) => g.set(x, y0 + dy, S.d));
  [[7, 3], [8, 4]].forEach(([x, dy]) => g.set(x, y0 + dy, S.l));

  // Detalhes de cada peça
  if (L.top === 'tee') {
    g.span(y0, 9, 12, K.d);
    g.span(y0 + 1, 10, 11, K.m);
    g.set(8, y0, S.d);
    g.set(13, y0, S.d);
  } else if (L.top === 'jacket') {
    for (let y = y0; y <= y0 + 10; y++) {
      g.set(10, y, U.m);
      g.set(11, y, U.d);
    }
    for (let y = y0; y <= y0 + 3; y++) {
      g.set(9, y, S.d);
      g.set(12, y, S.d);
    }
    g.set(9, y0 + 6, S.h);
  } else if (L.top === 'hoodie') {
    g.span(y0, 6, 15, S.d);
    g.span(y0, 8, 13, S.m);
    for (let y = y0 + 1; y <= y0 + 3; y++) {
      g.set(9, y, U.l);
      g.set(12, y, U.l);
    }
    g.span(y0 + 6, 7, 14, S.d);
    g.rect(8, y0 + 7, 6, 2, S.m);
    g.set(7, y0 + 7, S.d);
    g.set(14, y0 + 7, S.d);
  } else if (L.top === 'tank') {
    g.rect(6, y0, 2, 3, K.m);
    g.rect(14, y0, 2, 3, K.d);
    g.span(y0, 9, 12, K.d);
  }

  // Cinto
  if (L.bottom !== 'skirt') {
    g.span(y0 + 11, 6, 15, P.d);
    g.span(y0 + 11, 10, 11, BUCKLE);
  }

  // Braços (balançam no passo), erguidos ou segurando a enxada
  if (arms === 'raised' || arms === 'half') {
    raisedArms(g, L, y0, sleeveRows, arms === 'raised' ? 9 : 5);
    return;
  }
  if (arms === 'tool-up' || arms === 'tool-down') {
    frontTool(g, L, y0, sleeveRows, arms === 'tool-up');
    return;
  }
  const reach = arms === 'forward' ? 2 : 0;
  const arm = (x0, dy, outer) => {
    dy += reach;
    for (let i = 0; i < 9; i++) {
      const sleeve = i < sleeveRows;
      const tone = sleeve ? S : K;
      g.span(y0 + 1 + i + dy, x0, x0 + 1, tone.m);
      g.set(outer, y0 + 1 + i + dy, tone.d);
    }
    if (longSleeves) g.span(y0 + 9 + dy, x0, x0 + 1, S.d);
    g.span(y0 + 10 + dy, x0, x0 + 1, K.m);
    g.span(y0 + 11 + dy, x0, x0 + 1, K.d);
  };
  arm(4, arms === 'swingA' ? 1 : 0, 4);
  arm(16, arms === 'swingB' ? 1 : 0, 17);
}

const HANDLE = '#8a5a33';
const HANDLE_DARK = '#5e3a1f';
const BLADE = '#b5bccb';
const BLADE_DARK = '#6e7488';

/** Enxada vista de frente: erguida acima da cabeça ou batendo no chão à frente. */
function frontTool(g, L, y0, sleeveRows, up) {
  const { S, K } = L;
  const sleeve = (i) => (i < sleeveRows ? S : K);
  if (up) {
    // Braços sobem pelos lados da cabeça até o alto; o cabo atravessa acima do cabelo
    // e a lâmina pende na ponta (pose de preparar o golpe)
    g.span(1, 2, 19, HANDLE);
    g.span(2, 3, 18, HANDLE_DARK);
    g.rect(19, 1, 2, 6, BLADE);
    g.rect(20, 1, 1, 6, BLADE_DARK);
    g.set(19, 1, '#e8ecf5');
    [[4, 4], [16, 17]].forEach(([x0, outer]) => {
      for (let y = y0 + 1, i = 0; y >= 4; y--, i++) {
        const tone = sleeve(i);
        g.span(y, x0, x0 + 1, tone.m);
        g.set(outer, y, tone.d);
      }
      g.span(3, x0, x0 + 1, K.m);
      g.span(2, x0, x0 + 1, K.l);
    });
    return;
  }

  // Mãos juntas na frente da barriga, cabo descendo até a lâmina no chão
  for (let i = 0; i < 8; i++) {
    const tone = sleeve(i);
    g.span(y0 + 1 + i, i < 5 ? 4 : 5 + (i - 5), i < 5 ? 5 : 6 + (i - 5), tone.m);
    g.span(y0 + 1 + i, i < 5 ? 16 : 15 - (i - 5), i < 5 ? 17 : 16 - (i - 5), tone.d);
  }
  g.span(y0 + 9, 9, 12, K.m);
  g.span(y0 + 10, 9, 12, K.d);
  for (let y = y0 + 11; y <= 38; y++) g.span(y, 10, 11, y % 2 ? HANDLE : HANDLE_DARK);
  g.span(38, 6, 15, BLADE);
  g.span(39, 6, 15, BLADE_DARK);
  g.span(38, 7, 8, '#e8ecf5');
}

/** Enxada vista de lado (personagem virado para a direita). */
function sideTool(g, L, y0, up) {
  const { K } = L;
  if (up) {
    for (let i = 0; i < 6; i++) g.span(y0 - i, 11 + Math.floor(i / 2), 12 + Math.floor(i / 2), K.m);
    for (let i = 0; i < 10; i++) g.span(y0 - 6 - i, 13 + Math.floor(i / 3), 14 + Math.floor(i / 3), i % 2 ? HANDLE : HANDLE_DARK);
    g.rect(16, y0 - 19, 4, 2, BLADE);
    g.rect(19, y0 - 19, 1, 5, BLADE_DARK);
    return;
  }
  for (let i = 0; i < 7; i++) g.span(y0 + 1 + i, 11 + Math.floor(i / 3), 12 + Math.floor(i / 3), K.m);
  for (let i = 0; i < 12; i++) g.span(y0 + 7 + i, 13 + Math.floor(i / 2), 14 + Math.floor(i / 2), i % 2 ? HANDLE : HANDLE_DARK);
  g.rect(18, 36, 3, 3, BLADE);
  g.rect(18, 39, 3, 1, BLADE_DARK);
}

/** Braços erguidos segurando algo acima da cabeça (pose de carregar). */
function raisedArms(g, L, y0, sleeveRows, length = 9) {
  const { S, K } = L;
  [[4, 4], [16, 17]].forEach(([x0, outer]) => {
    for (let i = 0; i < length; i++) {
      const y = y0 + 1 - i;
      const sleeve = i < sleeveRows;
      const tone = sleeve ? S : K;
      g.span(y, x0, x0 + 1, tone.m);
      g.set(outer, y, tone.d);
    }
    g.span(y0 + 1 - length, x0, x0 + 1, K.m);
    g.span(y0 - length, x0, x0 + 1, K.l);
  });
}

function skirt(g, L, view, bob) {
  if (L.bottom !== 'skirt') return;
  const { P } = L;
  const y0 = 29 + bob;
  if (view === 'side') {
    g.rect(6, y0, 10, 3, P.m);
    g.span(y0, 6, 15, P.d);
    g.span(y0 + 3, 5, 16, P.d);
    return;
  }
  g.span(y0, 6, 15, P.d);
  g.span(y0 + 1, 6, 15, P.m);
  g.span(y0 + 2, 5, 16, P.m);
  g.span(y0 + 3, 4, 17, P.m);
  g.span(y0 + 4, 4, 17, P.d);
  [7, 10, 13].forEach((x) => {
    g.set(x, y0 + 2, P.d);
    g.set(x, y0 + 3, P.d);
  });
  g.set(6, y0 + 2, P.l);
  g.set(5, y0 + 3, P.l);
}

/** Linhas da cabeça (x inicial e final de cada linha), de y = 5 a 16. */
const HEAD_ROWS = [[8, 13], [7, 14], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [7, 14], [8, 13]];

function head(g, L, view, bob, blink = false) {
  const { K, R } = L;
  const top = 5 + bob;

  if (view === 'up') {
    HEAD_ROWS.forEach(([x0, x1], i) => g.span(top + i, x0, x1, R.m));
    for (let i = 2; i < 10; i++) g.set(15, top + i, R.d);
    g.span(top + 2, 8, 10, R.l);
    g.span(top + 1, 9, 10, R.h);
    [[8, 5], [11, 6], [13, 4], [9, 8]].forEach(([x, dy]) => g.set(x, top + dy, R.d));
    g.rect(5, top + 5, 1, 3, K.d);
    g.rect(16, top + 5, 1, 3, K.d);
    g.span(top + 12, 9, 12, K.d); // nuca
    if (L.hairStyle === 'long') {
      g.rect(6, top + 12, 10, 8, R.m);
      for (let y = top + 12; y < top + 20; y++) g.set(14, y, R.d);
      g.set(9, top + 14, R.l);
    }
    if (L.hairStyle === 'braid') {
      for (let y = top + 12; y < top + 22; y++) g.span(y, 10, 11, y % 2 ? R.m : R.d);
      g.span(top + 21, 10, 11, BUCKLE);
    }
    if (L.top === 'hoodie') {
      g.rect(7, top + 11, 8, 3, L.S.d);
      g.span(top + 11, 8, 13, L.S.m);
    }
    return;
  }

  if (view === 'side') {
    HEAD_ROWS.forEach(([x0, x1], i) => g.span(top + i, x0, x1, K.m));
    for (let i = 2; i < 10; i++) g.set(6, top + i, K.d);
    g.set(16, top + 8, K.m); // nariz
    g.set(16, top + 9, K.d);
    g.span(top + 11, 9, 12, K.d);
    // Olho de perfil (fechado quando pisca)
    if (blink) {
      g.span(top + 7, 13, 14, EYE_DARK);
    } else {
      g.set(13, top + 6, EYE_DARK);
      g.set(13, top + 7, EYE_IRIS);
      g.set(14, top + 6, '#ffffff');
    }
    g.set(14, top + 5, R.d);
    g.set(14, top + 10, MOUTH);
    g.set(13, top + 8, mix(K.m, '#ff7a7a', 0.35));
    // Orelha
    g.rect(9, top + 5, 2, 3, K.m);
    g.set(10, top + 6, K.d);
    g.span(top + 12, 9, 11, K.d); // pescoço
    return;
  }

  // Frente
  HEAD_ROWS.forEach(([x0, x1], i) => g.span(top + i, x0, x1, K.m));
  for (let i = 2; i < 10; i++) {
    g.set(15, top + i, K.d);
    g.set(14, top + i, i > 4 ? K.d : K.m);
  }
  g.set(7, top + 3, K.l);
  g.set(7, top + 4, K.l);
  g.span(top + 11, 8, 13, K.d);
  // Orelhas
  g.rect(5, top + 5, 1, 3, K.m);
  g.set(5, top + 6, K.d);
  g.rect(16, top + 5, 1, 3, K.d);
  // Sobrancelhas
  g.span(top + 5, 8, 9, R.d);
  g.span(top + 5, 12, 13, R.d);
  // Olhos: brilho, pupila e íris; piscando, viram uma linha
  [[8, 9], [12, 13]].forEach(([a, b]) => {
    if (blink) {
      g.span(top + 7, a, b, EYE_DARK);
      return;
    }
    g.set(a, top + 6, '#ffffff');
    g.set(b, top + 6, EYE_DARK);
    g.set(a, top + 7, EYE_DARK);
    g.set(b, top + 7, EYE_IRIS);
  });
  // Nariz, bochechas e boca
  g.set(11, top + 8, K.d);
  const blush = mix(K.m, '#ff7a7a', 0.35);
  g.span(top + 8, 7, 8, blush);
  g.span(top + 8, 13, 14, blush);
  g.span(top + 10, 10, 11, MOUTH);
  // Pescoço
  g.span(top + 12, 9, 12, K.d);
}

function hairFront(g, L, view, bob) {
  const { R } = L;
  const t = bob;
  if (view === 'up') return;

  if (view === 'side') {
    g.span(3 + t, 8, 13, R.m);
    g.span(4 + t, 7, 14, R.m);
    g.rect(6, 5 + t, 9, 3, R.m);
    g.rect(5, 6 + t, 6, 7, R.m);
    g.span(8 + t, 13, 15, R.m);
    g.set(15, 9 + t, R.d);
    g.span(4 + t, 9, 11, R.l);
    g.set(10, 3 + t, R.h);
    [[7, 9], [6, 11], [12, 6]].forEach(([x, y]) => g.set(x, y + t, R.d));
    if (L.hairStyle === 'long') g.rect(5, 13 + t, 5, 10, R.m);
    if (L.hairStyle === 'braid') for (let y = 13; y < 26; y++) g.span(y + t, 6, 7, y % 2 ? R.m : R.d);
    hairExtras(g, L, t);
    return;
  }

  // Frente: topo, franja em mechas e laterais
  g.span(3 + t, 8, 13, R.m);
  g.span(4 + t, 7, 14, R.m);
  g.span(5 + t, 6, 15, R.m);
  g.span(6 + t, 5, 16, R.m);
  g.span(7 + t, 5, 16, R.m);
  g.span(8 + t, 5, 16, R.m);
  [5, 6, 7, 10, 11, 14, 15, 16].forEach((x) => g.set(x, 9 + t, R.m));
  g.rect(5, 10 + t, 1, 1, R.m);
  g.rect(16, 10 + t, 1, 1, R.d);
  // Volume: brilho no alto, mechas escuras
  g.span(4 + t, 9, 11, R.l);
  g.span(5 + t, 8, 9, R.h);
  g.span(5 + t, 10, 12, R.l);
  [[9, 7], [12, 7], [7, 8], [10, 8], [14, 8], [15, 7], [16, 9], [6, 9]].forEach(([x, y]) => g.set(x, y + t, R.d));

  if (L.hairStyle === 'long') {
    g.rect(4, 9 + t, 2, 13, R.m);
    g.rect(16, 9 + t, 2, 13, R.d);
    g.set(4, 12 + t, R.l);
  }
  if (L.hairStyle === 'braid') {
    for (let y = 10; y < 26; y++) g.span(y + t, 16, 17, y % 2 ? R.m : R.d);
    g.span(25 + t, 16, 17, BUCKLE);
  }
  hairExtras(g, L, t);
}

function hairExtras(g, L, t) {
  const { R } = L;
  if (L.hairStyle === 'bun') {
    g.span(0 + t, 9, 12, R.m);
    g.rect(8, 1 + t, 6, 2, R.m);
    g.span(1 + t, 9, 10, R.h);
    g.set(13, 2 + t, R.d);
  }
  if (L.hairStyle === 'spiky') {
    [[6, 3], [7, 2], [9, 1], [10, 2], [12, 1], [13, 2], [15, 3]].forEach(([x, y]) => g.set(x, y + t, R.m));
    g.set(9, 2 + t, R.l);
    g.set(12, 2 + t, R.l);
  }
}

function accessory(g, L, view, bob) {
  const t = bob;
  const front = view === 'down';
  const accent = (hex) => ramp(hex);
  switch (L.accessory) {
    case 'pendant': {
      if (view === 'up') break;
      const C = accent('#5fe3d0');
      g.set(9, 19 + t, '#cfd6ff');
      g.set(12, 19 + t, '#cfd6ff');
      g.span(20 + t, 10, 11, C.m);
      g.set(10, 20 + t, C.h);
      g.span(21 + t, 10, 11, C.d);
      break;
    }
    case 'visor': {
      const C = accent('#e8e0ff');
      g.span(8 + t, 5, 16, C.m);
      g.span(8 + t, 6, 9, C.h);
      break;
    }
    case 'goggles': {
      g.span(8 + t, 5, 16, '#3b3b5c');
      if (front) {
        const C = accent('#5fe3d0');
        [[7, 9], [12, 14]].forEach(([a, b]) => {
          g.rect(a, 7 + t, b - a + 1, 2, C.m);
          g.set(a, 7 + t, C.h);
        });
      }
      break;
    }
    case 'hat': {
      const C = accent('#e3c26a');
      g.span(7 + t, 3, 18, C.d);
      g.span(6 + t, 4, 17, C.m);
      g.rect(6, 2 + t, 10, 4, C.m);
      g.span(5 + t, 6, 15, '#b5452f');
      g.span(2 + t, 7, 10, C.l);
      break;
    }
    case 'circlet': {
      g.span(7 + t, 6, 15, '#ffe08a');
      if (front) g.span(7 + t, 10, 11, '#b48cff');
      break;
    }
    case 'glasses': {
      if (!front) break;
      const frame = '#cfd6ff';
      [[7, 10], [11, 14]].forEach(([a, b]) => {
        g.span(10 + t, a, b, frame);
        g.span(13 + t, a, b, frame);
        g.set(a, 11 + t, frame);
        g.set(a, 12 + t, frame);
        g.set(b, 11 + t, frame);
        g.set(b, 12 + t, frame);
      });
      break;
    }
    case 'beard': {
      if (view === 'up') break;
      const { R } = L;
      if (front) {
        g.rect(6, 13 + t, 10, 3, R.m);
        g.span(16 + t, 8, 13, R.m);
        g.span(15 + t, 10, 11, MOUTH);
        g.set(7, 13 + t, R.l);
        g.span(16 + t, 12, 13, R.d);
      } else {
        g.rect(11, 13 + t, 5, 3, R.m);
      }
      break;
    }
    case 'scarf': {
      if (view === 'up') break;
      const C = accent('#f2b84b');
      g.span(17 + t, 6, 15, C.m);
      g.span(18 + t, 6, 15, C.d);
      g.span(17 + t, 7, 9, C.l);
      if (front) g.rect(13, 19 + t, 2, 5, C.m);
      break;
    }
    default:
      break;
  }
}

/* ---------- Montagem e cache ---------- */

/**
 * Pose de um quadro de animação:
 *   legs   0..3  passo da caminhada (0 = parado)
 *   crouch bool  joelhos dobrados
 *   bob    int   quanto o corpo desce (-1 sobe; 3 = agachado)
 *   arms   'rest' | 'swingA' | 'swingB' | 'forward' | 'half' | 'raised' | 'tool-up' | 'tool-down'
 *   blink  bool  olhos fechados
 */
const DEFAULT_POSE = { legs: 0, crouch: false, bob: 0, arms: 'rest', blink: false };

function paintSprite(look, dir, pose) {
  const L = resolve(look);
  const view = dir === 'left' || dir === 'right' ? 'side' : dir;
  const bob = pose.bob;
  const g = new PixelGrid();
  hairBack(g, L, view, bob);
  legs(g, L, view, pose.crouch ? 0 : pose.legs, pose.crouch);
  shoes(g, L, view, pose.crouch ? 0 : pose.legs);
  torso(g, L, view, pose, bob);
  skirt(g, L, view, bob);
  head(g, L, view, bob, pose.blink);
  hairFront(g, L, view, bob);
  accessory(g, L, view, bob);
  // A enxada de frente fica por cima do corpo
  if (view !== 'side' && pose.arms.startsWith('tool')) {
    frontTool(g, L, 18 + bob, L.top === 'tank' ? 0 : L.top === 'tee' ? 3 : 9, pose.arms === 'tool-up');
  }
  g.outline();
  // Os sprites de lado são desenhados virados para a direita; "left" é o espelho
  return g.toCanvas(dir === 'left');
}

const cache = new Map();
const MAX_CACHE = 600;

function spriteFor(look, dir, pose) {
  const key = `${look.skin}|${look.hair}|${look.hairStyle}|${look.shirt}|${look.top}|${look.pants}|${look.bottom}|${look.shoes}|${look.accessory}|${dir}|${pose.legs}|${pose.crouch}|${pose.bob}|${pose.arms}|${pose.blink}`;
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
  const frame = moving ? Math.floor(step) % 4 : 0;
  if (action === 'crouch') return { ...DEFAULT_POSE, crouch: true, bob: 3, arms: 'forward' };
  return {
    ...DEFAULT_POSE,
    legs: frame,
    bob: frame % 2 === 1 ? -1 : 0,
    arms: action === 'carry' ? 'raised' : frame === 1 ? 'swingB' : frame === 3 ? 'swingA' : 'rest',
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
  ctx.fillStyle = 'rgba(30, 20, 40, .28)';
  ctx.beginPath();
  ctx.ellipse(footX, footY - 1, 9 * shadow, 3.5 * shadow, 0, 0, Math.PI * 2);
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
