/* NEXO — Motor de pixel art para objetos (saco, semeadeira, baldes, postes, caixotes...)
 *
 * Cada objeto é pintado pixel a pixel numa grade pequena (1 pixel da grade = 1 pixel do
 * mundo) e guardado em cache como canvas. Regras do estilo, as mesmas dos personagens:
 *   - rampas de 5 tons por material (sombra funda, sombra, base, luz, brilho) + contorno;
 *   - luz vindo de cima e da esquerda: o tom de cada pixel sai da normal da superfície
 *     (esfera, cilindro, caixa), com um pontilhado leve só na passagem entre dois tons;
 *   - contorno gerado no fim, na cor escura do material vizinho (nunca preto puro).
 */

/* ---------- Cores ---------- */

function toRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const toHex = (r, g, b) =>
  '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');

export function mix(a, b, t) {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Rampa: t[0] sombra funda … t[4] brilho; o = contorno. Sombras puxam para o roxo, luzes para o amarelo. */
export function ramp(base) {
  return {
    o: mix(mix(base, '#2a1640', 0.45), '#000000', 0.5),
    t: [
      mix(base, '#2a1d4a', 0.5),
      mix(base, '#3a2560', 0.28),
      base,
      mix(base, '#fff2c0', 0.28),
      mix(base, '#fffbe8', 0.55),
    ],
  };
}

/** Rampa montada à mão (para materiais com cores muito específicas). */
export const customRamp = (o, t) => ({ o, t });

/* ---------- Luz ---------- */

const LIGHT = (() => {
  const v = [-0.55, -0.7, 0.55];
  const len = Math.hypot(...v);
  return v.map((c) => c / len);
})();

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

/** Intensidade de luz (0 a 1) para uma normal. */
export function lightOf(nx, ny, nz) {
  const len = Math.hypot(nx, ny, nz) || 1;
  const d = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / len;
  return Math.max(0, Math.min(1, 0.18 + d * 0.82));
}

/** Escolhe o tom da rampa para uma intensidade, com pontilhado só perto da troca de tom. */
export function toneOf(level, x, y, R, { min = 0, max = 4 } = {}) {
  const span = max - min;
  const t = min + Math.max(0, Math.min(1, level)) * span;
  let i = Math.floor(t);
  const frac = t - i;
  const threshold = 0.5 + (BAYER[y & 3][x & 3] - 0.5) * 0.45;
  if (frac > threshold) i++;
  return R.t[Math.max(min, Math.min(max, i))];
}

/* ---------- Grade ---------- */

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.color = new Array(w * h).fill(null);
    this.edge = new Array(w * h).fill(null);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    return this.inside(x, y) ? this.color[y * this.w + x] : null;
  }

  /** Pinta um pixel; `edge` é a cor de contorno que esse pixel deixa para fora. */
  set(x, y, color, edge) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y) || !color) return;
    this.color[y * this.w + x] = color;
    if (edge !== undefined) this.edge[y * this.w + x] = edge;
  }

  rect(x, y, w, h, color, edge) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color, edge);
  }

  /** Linha de pixels (Bresenham). */
  line(x0, y0, x1, y1, color, edge) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, typeof color === 'function' ? color(x0, y0) : color, edge);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Preenche onde `test(x, y)` for verdadeiro, com a cor de `paint(x, y)`. */
  fill(test, paint, edge) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (test(x, y)) this.set(x, y, paint(x, y), edge);
      }
    }
  }

  /** Elipsoide (bolha, saco, caldeirão): luz pela normal da esfera achatada. */
  ellipsoid(cx, cy, rx, ry, R, { test = () => true, shift = () => 0, min, max } = {}) {
    this.fill(
      (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && test(x, y),
      (x, y) => {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        return toneOf(lightOf(nx, ny, nz + 0.25) + shift(x, y), x, y, R, { min, max });
      },
      R.o,
    );
  }

  /** Cilindro em pé (barril, cano, poste): luz pela posição horizontal. */
  cylinder(x0, y0, w, h, R, { shift = () => 0, min, max } = {}) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const nx = ((x + 0.5 - x0) / w) * 2 - 1;
        const level = lightOf(nx, -0.15, Math.sqrt(Math.max(0, 1 - nx * nx)) + 0.2) + shift(x, y);
        this.set(x, y, toneOf(level, x, y, R, { min, max }), R.o);
      }
    }
  }

  /** Caixa vista de frente e um pouco de cima: tampa clara (`top` pixels) e frente com luz da esquerda. */
  box(x0, y0, w, h, R, { top = 3, light = 0.72, grain = 0 } = {}) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const isTop = y < y0 + top;
        let level = isTop ? 0.92 - ((x - x0) / w) * 0.15 : light - ((x - x0) / w) * 0.3;
        if (!isTop && x >= x0 + w - 2) level -= 0.18;
        if (y === y0 + top) level -= 0.12;
        if (grain && noise(x, y, grain) > 0.88) level -= 0.12;
        this.set(x, y, toneOf(level, x, y, R), R.o);
      }
    }
  }

  /** Contorno: cada pixel vazio encostado no desenho recebe a cor de contorno do vizinho. */
  outline({ diagonal = false } = {}) {
    const color = this.color.slice();
    const edge = this.edge.slice();
    const at = (x, y) => (this.inside(x, y) && color[y * this.w + x] ? y * this.w + x : -1);
    const offsets = diagonal
      ? [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]
      : [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (color[y * this.w + x]) continue;
        for (const [ox, oy] of offsets) {
          const index = at(x + ox, y + oy);
          if (index >= 0) {
            this.color[y * this.w + x] = edge[index] ?? mix(color[index], '#1a1028', 0.7);
            break;
          }
        }
      }
    }
  }

  toCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(this.w, this.h);
    this.color.forEach((hex, index) => {
      if (!hex) return;
      const [r, g, b] = toRgb(hex);
      image.data.set([r, g, b, 255], index * 4);
    });
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
}

/* ---------- Cache e desenho ---------- */

const cache = new Map();

/** Desenha (uma vez) e guarda o sprite de `key`. `build` devolve { pix, ax, ay } (âncora no chão). */
export function sprite(key, build) {
  let entry = cache.get(key);
  if (!entry) {
    const { pix, ax, ay } = build();
    entry = { canvas: pix.toCanvas(), ax, ay };
    cache.set(key, entry);
  }
  return entry;
}

/** Desenha um sprite com a âncora em (x, y), sem suavizar os pixels. */
export function blit(ctx, entry, x, y, scale = 1) {
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(entry.canvas, Math.round(x - entry.ax * scale), Math.round(y - entry.ay * scale), entry.canvas.width * scale, entry.canvas.height * scale);
  ctx.imageSmoothingEnabled = smoothing;
}

/** Sombra de contato no chão, em pixels (elipse achatada e translúcida). */
export function pixelShadow(ctx, x, y, rx, ry = 2) {
  ctx.fillStyle = 'rgba(30, 22, 40, .28)';
  for (let j = -ry; j <= ry; j++) {
    const half = Math.round(rx * Math.sqrt(1 - (j / (ry + 0.5)) ** 2));
    ctx.fillRect(Math.round(x - half), Math.round(y + j), half * 2, 1);
  }
}

/** Ruído estável por pixel (0 a 1). */
export function noise(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
