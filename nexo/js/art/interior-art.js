/* NEXO — Pixel art dos interiores: sala (paredes, piso, janelas) e móveis
 *
 * A sala é pintada uma vez num canvas do tamanho do cômodo; os móveis são sprites
 * separados (com âncora no chão e a área que bloqueia a passagem), para o Phaser
 * ordenar a profundidade com o jogador. Mesmas regras de luz e contorno do resto do jogo.
 */

import { Pix, ramp, lightOf, toneOf, noise, sprite, mix } from './pixel.js';
import { cauldronSprite } from './items.js';

export const TILE = 32;
export const WALL_H = 88;  // altura da parede de fundo, em pixels
const SIDE = 10;           // espessura das paredes laterais vistas de cima
const FRONT = 10;          // parede da frente (embaixo)
export const DOOR_W = 52;  // vão da porta de saída

const WOOD = ramp('#9a6232');
const WOOD_LIGHT = ramp('#b98448');
const WOOD_DARK = ramp('#6e4422');
const STONE = ramp('#8e93a8');
const SLATE = ramp('#6f7488');
const BRICK = ramp('#a8634a');
const STRAW = ramp('#d8b25a');
const GLASS = ramp('#7fc8f0');
const FABRIC_DEFAULT = '#c2453b';

/* ======================================================================
 * Sala
 * ==================================================================== */

/**
 * Pinta o cômodo.
 * @param {{ cols: number, rows: number, wall: string, wallStyle: 'paper'|'brick'|'stone'|'plank',
 *           floor: 'wood'|'stone'|'straw'|'checker', accent?: string, windows?: number[],
 *           rug?: { x, y, w, h, color }, wallArt?: { type, x }[] }} spec
 */
export function paintRoom(spec) {
  const W = spec.cols * TILE;
  const H = spec.rows * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const px = (x, y, color, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // Piso
  paintFloor(ctx, spec.floor, W, H);
  if (spec.rug) paintRug(ctx, spec.rug);

  // Parede de fundo
  paintWall(ctx, spec, W);
  (spec.windows ?? []).forEach((x) => paintWindow(ctx, x, 22, spec));
  (spec.wallArt ?? []).forEach((art) => paintWallArt(ctx, art, spec));

  // Sombra que a parede projeta no piso
  const shadow = ctx.createLinearGradient(0, WALL_H, 0, WALL_H + 16);
  shadow.addColorStop(0, 'rgba(20, 12, 30, .45)');
  shadow.addColorStop(1, 'rgba(20, 12, 30, 0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, WALL_H, W, 16);

  // Paredes laterais e da frente (vistas de cima), com a porta de saída no meio da frente
  const sideColor = spec.wallStyle === 'stone' ? '#3a3d52' : spec.wallStyle === 'brick' ? '#4a2a22' : '#3d2a1e';
  px(0, 0, sideColor, SIDE, H);
  px(W - SIDE, 0, sideColor, SIDE, H);
  px(SIDE - 2, WALL_H, mix(sideColor, '#ffffff', 0.15), 2, H - WALL_H - FRONT);
  px(W - SIDE, WALL_H, mix(sideColor, '#000000', 0.3), 2, H - WALL_H - FRONT);
  const doorLeft = Math.round(W / 2 - DOOR_W / 2);
  px(0, H - FRONT, sideColor, doorLeft, FRONT);
  px(doorLeft + DOOR_W, H - FRONT, sideColor, W - doorLeft - DOOR_W, FRONT);
  px(0, H - FRONT, mix(sideColor, '#ffffff', 0.18), doorLeft, 2);
  px(doorLeft + DOOR_W, H - FRONT, mix(sideColor, '#ffffff', 0.18), W - doorLeft - DOOR_W, 2);
  // Batentes e tapete da porta
  px(doorLeft - 3, H - FRONT - 4, WOOD_DARK.t[2], 3, FRONT + 4);
  px(doorLeft + DOOR_W, H - FRONT - 4, WOOD_DARK.t[2], 3, FRONT + 4);
  const mat = ramp(spec.accent ?? '#8a5a33');
  px(doorLeft + 6, H - FRONT - 12, mat.o, DOOR_W - 12, 12);
  px(doorLeft + 7, H - FRONT - 11, mat.t[2], DOOR_W - 14, 10);
  for (let x = doorLeft + 9; x < doorLeft + DOOR_W - 9; x += 4) px(x, H - FRONT - 10, mat.t[3], 2, 8);
  // Luz de fora entrando pela porta
  const light = ctx.createLinearGradient(0, H, 0, H - 40);
  light.addColorStop(0, 'rgba(255, 240, 190, .35)');
  light.addColorStop(1, 'rgba(255, 240, 190, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(doorLeft, H - 40, DOOR_W, 40);
  // Topo da parede de fundo (beiral escuro)
  px(0, 0, '#1d1428', W, 4);
  return canvas;
}

function paintFloor(ctx, style, W, H) {
  for (let y = WALL_H; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let color;
      if (style === 'stone' || style === 'checker') {
        const size = style === 'checker' ? 16 : 20;
        const offset = Math.floor(y / size) % 2 ? size / 2 : 0;
        const gx = (x + offset) % size;
        const gy = (y - WALL_H) % size;
        const cell = Math.floor((x + offset) / size) + Math.floor(y / size) * 31;
        if (gx === 0 || gy === 0) color = style === 'checker' ? '#3a3448' : SLATE.t[0];
        else {
          const base = style === 'checker' ? ((Math.floor((x + offset) / size) + Math.floor(y / size)) % 2 ? ramp('#e8dcc0') : ramp('#5a7f8a')) : (noise(cell, 1, 3) > 0.5 ? SLATE : STONE);
          const level = 0.62 + (gx === 1 || gy === 1 ? 0.2 : 0) + (gx === size - 1 || gy === size - 1 ? -0.2 : 0) + (noise(x, y, 5) - 0.5) * 0.12;
          color = toneOf(level, x, y, base, { max: 3 });
        }
      } else if (style === 'straw') {
        const n = noise(x, y, 7);
        color = toneOf(0.55 + (n - 0.5) * 0.5, x, y, STRAW, { max: 3 });
        if (noise(x >> 2, y, 8) > 0.92) color = STRAW.t[4];
      } else {
        // Tábuas de madeira com emendas desencontradas
        const row = Math.floor((y - WALL_H) / 8);
        const inRow = (y - WALL_H) % 8;
        const seamAt = Math.floor(noise(row, 0, 9) * 40);
        const plank = Math.floor((x + seamAt) / 56);
        let level = 0.6 + (noise(plank, row, 4) - 0.5) * 0.2;
        if (inRow === 0) level -= 0.35;
        if (inRow === 1) level += 0.12;
        if ((x + seamAt) % 56 === 0) level -= 0.35;
        if (noise(x, y, 6) > 0.93) level -= 0.1;
        color = toneOf(level, x, y, WOOD, { max: 3 });
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function paintWall(ctx, spec, W) {
  const base = ramp(spec.wall);
  for (let y = 4; y < WALL_H; y++) {
    for (let x = 0; x < W; x++) {
      let level;
      if (spec.wallStyle === 'stone') {
        const row = Math.floor(y / 14);
        const off = row % 2 ? 12 : 0;
        const bx = (x + off) % 24;
        const by = y % 14;
        const block = Math.floor((x + off) / 24) + row * 41;
        level = 0.58 + (noise(block, 2, 5) - 0.5) * 0.25 + (bx === 1 || by === 1 ? 0.15 : 0) + (noise(x, y, 4) - 0.5) * 0.1;
        if (bx === 0 || by === 0) level = 0.12;
      } else if (spec.wallStyle === 'brick') {
        const row = Math.floor(y / 8);
        const off = row % 2 ? 8 : 0;
        const bx = (x + off) % 16;
        const by = y % 8;
        level = 0.6 + (noise(Math.floor((x + off) / 16), row, 3) - 0.5) * 0.25 + (by === 1 ? 0.15 : 0);
        if (bx === 0 || by === 0) level = 0.15;
      } else if (spec.wallStyle === 'plank') {
        const board = Math.floor(x / 10);
        level = 0.6 + (noise(board, 3, 2) - 0.5) * 0.2 + (x % 10 === 1 ? 0.15 : 0) + (noise(x, y >> 3, 9) > 0.9 ? -0.12 : 0);
        if (x % 10 === 0) level = 0.18;
      } else {
        // Papel de parede com listras e florzinhas
        level = 0.66 + ((x >> 3) % 2 ? 0.06 : -0.02);
        if ((x % 16 === 8) && (y % 12 === 6)) level = 0.95;
      }
      ctx.fillStyle = toneOf(level, x, y, base);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Rodapé de madeira e lambri (papel de parede) ou faixa de pedra
  if (spec.wallStyle === 'paper') {
    const panel = ramp(spec.accent ? mix(spec.accent, '#6e4422', 0.5) : '#8a5a33');
    for (let y = WALL_H - 30; y < WALL_H - 6; y++) {
      for (let x = 0; x < W; x++) {
        const inPanel = (x % 40) > 3 && (x % 40) < 37 && y > WALL_H - 27 && y < WALL_H - 9;
        ctx.fillStyle = toneOf(inPanel ? 0.62 : 0.48 + ((x % 40) === 3 ? 0.2 : 0), x, y, panel);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = panel.t[4];
    ctx.fillRect(0, WALL_H - 31, W, 2);
  }
  ctx.fillStyle = WOOD_DARK.t[1];
  ctx.fillRect(0, WALL_H - 6, W, 6);
  ctx.fillStyle = WOOD_DARK.t[3];
  ctx.fillRect(0, WALL_H - 6, W, 1);
  ctx.fillStyle = WOOD_DARK.o;
  ctx.fillRect(0, WALL_H - 1, W, 1);
}

function paintWindow(ctx, x, y, spec) {
  const w = 34;
  const h = 34;
  const frame = WOOD_DARK;
  ctx.fillStyle = frame.o;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = frame.t[3];
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#9fd8ff');
  sky.addColorStop(0.7, '#d8f0ff');
  sky.addColorStop(0.71, '#7fbf5a');
  sky.addColorStop(1, '#5a9a44');
  ctx.fillStyle = sky;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 4 + i, y + 3 + i, 2, 1);
  ctx.fillStyle = frame.t[3];
  ctx.fillRect(x + w / 2 - 1, y, 2, h);
  ctx.fillRect(x, y + h / 2 - 1, w, 2);
  // Cortinas
  const curtain = ramp(spec.accent ?? FABRIC_DEFAULT);
  for (const side of [x - 6, x + w - 2]) {
    for (let j = 0; j < h + 4; j++) {
      for (let i = 0; i < 8; i++) {
        const fold = (i + (j >> 2)) % 4 === 0 ? -0.2 : 0;
        ctx.fillStyle = toneOf(0.6 + fold - j * 0.004, side + i, y - 3 + j, curtain);
        ctx.fillRect(side + i, y - 3 + j, 1, 1);
      }
    }
  }
  ctx.fillStyle = WOOD_DARK.t[1];
  ctx.fillRect(x - 8, y - 5, w + 16, 3);
  // Peitoril
  ctx.fillStyle = frame.t[2];
  ctx.fillRect(x - 3, y + h + 1, w + 6, 4);
}

function paintWallArt(ctx, art, spec) {
  const { type, x } = art;
  if (type === 'frame') {
    ctx.fillStyle = '#4a2a16';
    ctx.fillRect(x, 26, 26, 22);
    ctx.fillStyle = '#c9a050';
    ctx.fillRect(x + 1, 27, 24, 20);
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(x + 3, 29, 20, 16);
    ctx.fillStyle = '#5aa84a';
    ctx.fillRect(x + 3, 38, 20, 7);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(x + 16, 32, 4, 4);
  } else if (type === 'clock') {
    ctx.fillStyle = '#3a2212';
    ctx.beginPath();
    ctx.arc(x + 9, 34, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4ecdc';
    ctx.beginPath();
    ctx.arc(x + 9, 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b1d14';
    ctx.fillRect(x + 8, 28, 2, 7);
    ctx.fillRect(x + 9, 33, 5, 2);
  } else if (type === 'shelf') {
    ctx.fillStyle = WOOD.t[1];
    ctx.fillRect(x, 44, 44, 4);
    ctx.fillStyle = WOOD.t[3];
    ctx.fillRect(x, 44, 44, 1);
    ['#c2453b', '#3f8fd6', '#f2b84b', '#5aa84a', '#8b5fc0'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + 3 + i * 8, 34 + (i % 2) * 2, 6, 10 - (i % 2) * 2);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.fillRect(x + 4 + i * 8, 35 + (i % 2) * 2, 1, 6);
    });
  } else if (type === 'map') {
    ctx.fillStyle = '#4a2a16';
    ctx.fillRect(x, 18, 70, 46);
    ctx.fillStyle = '#efe0bb';
    ctx.fillRect(x + 2, 20, 66, 42);
    ctx.strokeStyle = '#c2453b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, 52);
    ctx.lineTo(x + 24, 34);
    ctx.lineTo(x + 40, 44);
    ctx.lineTo(x + 60, 26);
    ctx.stroke();
    ctx.strokeStyle = '#3f63d6';
    ctx.beginPath();
    ctx.moveTo(x + 8, 40);
    ctx.lineTo(x + 30, 48);
    ctx.lineTo(x + 60, 46);
    ctx.stroke();
    for (const [mx, my] of [[x + 8, 52], [x + 60, 26], [x + 60, 46]]) {
      ctx.fillStyle = '#2b1d14';
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }
  } else if (type === 'tools') {
    ctx.fillStyle = WOOD_DARK.t[2];
    ctx.fillRect(x, 26, 60, 30);
    ctx.fillStyle = WOOD_DARK.t[1];
    for (let i = 0; i < 60; i += 6) ctx.fillRect(x + i, 26, 1, 30);
    // Ferramentas penduradas
    ctx.fillStyle = '#9aa0b4';
    ctx.fillRect(x + 6, 30, 3, 18);
    ctx.fillRect(x + 4, 30, 7, 4);
    ctx.fillRect(x + 20, 32, 2, 16);
    ctx.fillRect(x + 17, 46, 8, 3);
    ctx.fillStyle = '#c2453b';
    ctx.fillRect(x + 34, 30, 4, 12);
    ctx.fillStyle = '#5b5f73';
    ctx.fillRect(x + 33, 42, 6, 8);
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(x + 50, 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WOOD_DARK.t[2];
    ctx.beginPath();
    ctx.arc(x + 50, 40, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'banner') {
    const color = ramp(art.color ?? spec.accent ?? '#5a3fc4');
    for (let j = 0; j < 44; j++) {
      const w = j > 36 ? 20 - (j - 36) * 2.5 : 20;
      for (let i = 0; i < w; i++) {
        ctx.fillStyle = toneOf(0.62 + (i < 3 ? 0.15 : i > w - 4 ? -0.18 : 0), x + i + (20 - w) / 2, 10 + j, color);
        ctx.fillRect(x + i + (20 - w) / 2, 10 + j, 1, 1);
      }
    }
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(x + 7, 22, 6, 6);
    ctx.fillStyle = WOOD_DARK.t[2];
    ctx.fillRect(x - 3, 8, 26, 3);
  } else if (type === 'potions') {
    // Prateleiras com frascos coloridos
    for (const shelfY of [34, 58]) {
      ctx.fillStyle = WOOD_DARK.t[1];
      ctx.fillRect(x, shelfY, 64, 4);
      ctx.fillStyle = WOOD_DARK.t[3];
      ctx.fillRect(x, shelfY, 64, 1);
      ['#5fe3d0', '#e86fa8', '#b48cff', '#f2b84b', '#7fd36a', '#3f8fd6'].forEach((color, i) => {
        const C = ramp(color);
        const fx = x + 3 + i * 10;
        const tall = (i + shelfY) % 3 === 0;
        const h = tall ? 14 : 10;
        ctx.fillStyle = C.o;
        ctx.fillRect(fx - 1, shelfY - h - 1, 9, h + 1);
        ctx.fillStyle = C.t[2];
        ctx.fillRect(fx, shelfY - h + 3, 7, h - 3);
        ctx.fillStyle = 'rgba(230, 240, 255, .55)';
        ctx.fillRect(fx, shelfY - h, 7, 3);
        ctx.fillStyle = C.t[4];
        ctx.fillRect(fx + 1, shelfY - h + 4, 1, h - 6);
        ctx.fillStyle = WOOD.t[3];
        ctx.fillRect(fx + 2, shelfY - h - 3, 3, 3);
      });
    }
  } else if (type === 'recipe') {
    // Bilhete da receita: 4 folhas + 6 gotas → 2 frascos (em desenhos)
    ctx.fillStyle = '#4a2a16';
    ctx.fillRect(x, 16, 78, 44);
    ctx.fillStyle = '#f3e7cb';
    ctx.fillRect(x + 2, 18, 74, 40);
    ctx.fillStyle = '#e2cf9f';
    ctx.fillRect(x + 2, 56, 74, 2);
    ctx.fillStyle = '#c2453b';
    ctx.fillRect(x + 37, 15, 4, 4);
    for (let i = 0; i < 4; i++) {
      const lx = x + 6 + (i % 2) * 8;
      const ly = 24 + Math.floor(i / 2) * 9;
      ctx.fillStyle = '#2e5e2a';
      ctx.fillRect(lx, ly, 7, 5);
      ctx.fillStyle = i % 2 ? '#7fd36a' : '#5aa84a';
      ctx.fillRect(lx + 1, ly + 1, 5, 3);
    }
    ctx.fillStyle = '#4a2a16';
    ctx.fillRect(x + 23, 31, 5, 1);
    ctx.fillRect(x + 25, 29, 1, 5);
    for (let i = 0; i < 6; i++) {
      const dx = x + 31 + (i % 3) * 6;
      const dy = 24 + Math.floor(i / 3) * 9;
      ctx.fillStyle = '#2b5f8a';
      ctx.fillRect(dx, dy, 5, 6);
      ctx.fillStyle = '#8fd0f5';
      ctx.fillRect(dx + 1, dy + 1, 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dx + 1, dy + 1, 1, 1);
    }
    ctx.fillStyle = '#4a2a16';
    ctx.fillRect(x + 51, 31, 5, 1);
    ctx.fillRect(x + 54, 30, 2, 3);
    for (let i = 0; i < 2; i++) {
      const fx = x + 60 + i * 7;
      ctx.fillStyle = '#0f6e66';
      ctx.fillRect(fx, 25, 6, 13);
      ctx.fillStyle = '#5fe3d0';
      ctx.fillRect(fx + 1, 29, 4, 8);
      ctx.fillStyle = '#c8a070';
      ctx.fillRect(fx + 2, 23, 2, 3);
    }
    ctx.fillStyle = '#6b5440';
    ctx.fillRect(x + 8, 46, 62, 1);
    ctx.fillRect(x + 8, 50, 44, 1);
  } else if (type === 'slit') {
    ctx.fillStyle = '#1d1428';
    ctx.fillRect(x, 20, 10, 40);
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(x + 2, 24, 6, 32);
    ctx.fillStyle = '#d8f0ff';
    ctx.fillRect(x + 2, 24, 2, 32);
    ctx.fillStyle = '#1d1428';
    ctx.fillRect(x + 4, 20, 2, 4);
  }
}

/** Tapete com borda e padrão em losangos. */
function paintRug(ctx, { x, y, w, h, color = FABRIC_DEFAULT }) {
  const R = ramp(color);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const border = i < 3 || j < 3 || i >= w - 3 || j >= h - 3;
      const pattern = ((i >> 2) + (j >> 2)) % 3 === 0;
      let level = border ? 0.35 : pattern ? 0.75 : 0.58;
      if (i === 1 || j === 1) level = 0.85;
      ctx.fillStyle = toneOf(level + (noise(i, j, 3) - 0.5) * 0.08, x + i, y + j, R);
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  ctx.fillStyle = 'rgba(20, 12, 30, .25)';
  ctx.fillRect(x + 2, y + h, w, 2);
}
/* ======================================================================
 * Móveis (sprites com âncora no chão e área que bloqueia)
 * ==================================================================== */

function bed(color) {
  const pix = new Pix(46, 62);
  const Q = ramp(color);
  pix.box(1, 0, 44, 16, WOOD, { top: 3, light: 0.75, grain: 3 }); // cabeceira
  pix.box(3, 14, 40, 44, WOOD_DARK, { top: 2, light: 0.6 });       // estrado
  // Lençol e travesseiro
  pix.rect(5, 15, 36, 14, '#f4ecdc', '#8a7a6a');
  pix.rect(9, 17, 28, 9, '#ffffff', '#b9ae9c');
  pix.rect(9, 24, 28, 2, '#d8cfc0');
  // Colcha com padrão
  for (let y = 28; y < 56; y++) {
    for (let x = 5; x < 41; x++) {
      const check = ((x >> 2) + (y >> 2)) % 2;
      const level = 0.62 + (check ? 0.1 : -0.06) - (x - 5) * 0.004 + (y === 28 ? 0.2 : 0);
      pix.set(x, y, toneOf(level, x, y, Q), Q.o);
    }
  }
  pix.rect(5, 55, 36, 2, Q.t[1]);
  pix.rect(3, 58, 4, 4, WOOD_DARK.t[1], WOOD_DARK.o);
  pix.rect(39, 58, 4, 4, WOOD_DARK.t[1], WOOD_DARK.o);
  pix.outline();
  return { pix, ax: 23, ay: 61 };
}

function table() {
  const pix = new Pix(46, 34);
  // Toalha redonda
  for (let y = 0; y < 22; y++) {
    for (let x = 0; x < 46; x++) {
      const nx = (x + 0.5 - 23) / 22;
      const ny = (y + 0.5 - 11) / 11;
      if (nx * nx + ny * ny > 1) continue;
      pix.set(x, y, toneOf(lightOf(nx * 0.6, ny - 0.4, 0.7), x, y, WOOD_LIGHT), WOOD_LIGHT.o);
    }
  }
  // Pés
  pix.rect(8, 18, 4, 14, WOOD_DARK.t[2], WOOD_DARK.o);
  pix.rect(34, 18, 4, 14, WOOD_DARK.t[1], WOOD_DARK.o);
  // Vaso de flores e xícara
  pix.rect(20, 3, 6, 6, '#5f8fc8', '#2e4a6a');
  pix.set(21, 1, '#f25f7a');
  pix.set(23, 0, '#ffd34d');
  pix.set(25, 1, '#f25f7a');
  pix.rect(32, 8, 4, 3, '#f4ecdc', '#8a7a6a');
  pix.outline();
  return { pix, ax: 23, ay: 33 };
}

function chair() {
  const pix = new Pix(16, 26);
  pix.box(2, 0, 12, 12, WOOD, { top: 2, light: 0.7 });
  pix.box(1, 11, 14, 5, WOOD_LIGHT, { top: 2, light: 0.8 });
  pix.rect(2, 16, 2, 9, WOOD_DARK.t[2], WOOD_DARK.o);
  pix.rect(12, 16, 2, 9, WOOD_DARK.t[1], WOOD_DARK.o);
  pix.outline();
  return { pix, ax: 8, ay: 25 };
}

function bookshelf() {
  const pix = new Pix(42, 60);
  pix.box(1, 0, 40, 59, WOOD_DARK, { top: 3, light: 0.6, grain: 4 });
  const colors = ['#c2453b', '#3f8fd6', '#f2b84b', '#5aa84a', '#8b5fc0', '#e86fa8', '#f4ecdc'];
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = 5 + shelf * 13;
    pix.rect(4, y, 34, 11, WOOD_DARK.t[0]);
    let x = 5;
    let i = shelf * 3;
    while (x < 36) {
      const w = 3 + Math.floor(noise(i, shelf, 2) * 3);
      const h = 7 + Math.floor(noise(i, shelf, 5) * 4);
      const C = ramp(colors[i % colors.length]);
      for (let k = 0; k < w && x + k < 37; k++) {
        for (let j = 0; j < h; j++) pix.set(x + k, y + 11 - h + j, C.t[k === 0 ? 4 : k === w - 1 ? 1 : 3]);
      }
      pix.set(x + 1, y + 11 - h + 2, C.t[1]);
      x += w + (noise(i, 9, 1) > 0.8 ? 2 : 0);
      i++;
    }
    pix.rect(3, y + 11, 36, 2, WOOD.t[3]);
  }
  pix.outline();
  return { pix, ax: 21, ay: 59 };
}

function fireplace() {
  const pix = new Pix(54, 62);
  for (let y = 0; y < 62; y++) {
    for (let x = 0; x < 54; x++) {
      const row = Math.floor(y / 8);
      const bx = (x + (row % 2 ? 6 : 0)) % 12;
      let level = 0.6 + (noise(Math.floor((x + (row % 2 ? 6 : 0)) / 12), row, 4) - 0.5) * 0.25 - x * 0.004;
      if (bx === 0 || y % 8 === 0) level = 0.2;
      pix.set(x, y, toneOf(level, x, y, STONE), STONE.o);
    }
  }
  // Boca da lareira (o fogo é animado pelo motor)
  for (let y = 26; y < 58; y++) {
    for (let x = 12; x < 42; x++) {
      const r = ((x + 0.5 - 27) / 15) ** 2 + ((y - 34) / 10) ** 2;
      if (y < 34 && r > 1) continue;
      pix.set(x, y, y > 52 ? '#3a2416' : '#14101c');
    }
  }
  pix.rect(0, 20, 54, 4, WOOD.t[3], WOOD.o);
  pix.rect(0, 20, 54, 1, WOOD.t[4]);
  // Lenha
  pix.rect(16, 52, 22, 3, WOOD.t[2], WOOD.o);
  pix.rect(18, 49, 18, 3, WOOD_DARK.t[3], WOOD.o);
  pix.outline();
  return { pix, ax: 27, ay: 61 };
}

function plant() {
  const pix = new Pix(22, 34);
  const leaf = ramp('#4f9e44');
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.38;
    for (let s = 0; s < 13; s++) {
      const x = 11 + Math.cos(a) * s;
      const y = 19 + Math.sin(a) * s * 1.1;
      pix.set(x, y, leaf.t[s > 9 ? 4 : i % 2 ? 3 : 2], leaf.o);
      if (s > 3 && s < 10) pix.set(x + 1, y, leaf.t[1], leaf.o);
    }
  }
  pix.box(5, 20, 12, 13, ramp('#c8693a'), { top: 3, light: 0.75 });
  pix.outline();
  return { pix, ax: 11, ay: 33 };
}

function crate() {
  const pix = new Pix(28, 26);
  pix.box(1, 1, 26, 24, WOOD_LIGHT, { top: 6, light: 0.72, grain: 7 });
  for (let i = 0; i <= 16; i++) {
    pix.set(3 + Math.round(i * 1.3), 23 - i, WOOD_DARK.t[2]);
    pix.set(4 + Math.round(i * 1.3), 23 - i, WOOD_DARK.t[2]);
  }
  pix.rect(1, 7, 26, 2, WOOD_DARK.t[2]);
  pix.outline();
  return { pix, ax: 14, ay: 25 };
}

function barrel() {
  const pix = new Pix(22, 28);
  pix.ellipsoid(11, 15, 9, 13, WOOD, { test: (x, y) => y >= 3 });
  for (const y of [8, 21]) for (let x = 2; x < 20; x++) if (pix.get(x, y)) pix.set(x, y, '#3d3a48');
  for (let x = 4; x < 18; x++) pix.set(x, 3, WOOD_LIGHT.t[3]);
  pix.outline();
  return { pix, ax: 11, ay: 27 };
}

function workbench() {
  const pix = new Pix(66, 40);
  pix.box(1, 8, 64, 14, WOOD, { top: 5, light: 0.75, grain: 11 });
  pix.rect(4, 22, 4, 16, WOOD_DARK.t[2], WOOD_DARK.o);
  pix.rect(58, 22, 4, 16, WOOD_DARK.t[1], WOOD_DARK.o);
  pix.rect(4, 32, 58, 3, WOOD_DARK.t[2], WOOD_DARK.o);
  // Morsa, engrenagem e martelo sobre a bancada
  pix.box(6, 0, 12, 10, ramp('#5b5f73'), { top: 3, light: 0.75 });
  pix.ellipsoid(40, 6, 6, 4, ramp('#e8a33d'));
  pix.set(40, 6, '#3a2416');
  pix.rect(48, 9, 12, 2, WOOD_DARK.t[3], WOOD_DARK.o);
  pix.rect(56, 6, 5, 4, ramp('#9aa0b4').t[3], ramp('#9aa0b4').o);
  pix.outline();
  return { pix, ax: 33, ay: 39 };
}

function counter() {
  const pix = new Pix(80, 34);
  pix.box(1, 0, 78, 33, ramp('#2a9d8f'), { top: 6, light: 0.68 });
  pix.rect(1, 0, 78, 6, WOOD_LIGHT.t[3], WOOD_LIGHT.o);
  pix.rect(1, 0, 78, 1, WOOD_LIGHT.t[4]);
  for (let x = 6; x < 76; x += 14) pix.rect(x, 10, 10, 18, ramp('#2a9d8f').t[1]);
  // Sineta e livro de registro
  pix.ellipsoid(66, 3, 3, 3, ramp('#d9a640'));
  pix.rect(14, 1, 14, 4, '#f4ecdc', '#8a7a6a');
  pix.outline();
  return { pix, ax: 40, ay: 33 };
}

function hay() {
  const pix = new Pix(34, 26);
  pix.box(1, 2, 32, 23, STRAW, { top: 7, light: 0.72 });
  for (let i = 0; i < 40; i++) {
    const x = 2 + Math.floor(noise(i, 1, 2) * 30);
    const y = 3 + Math.floor(noise(i, 2, 2) * 21);
    pix.set(x, y, STRAW.t[noise(i, 3, 2) > 0.5 ? 4 : 1]);
  }
  pix.rect(1, 12, 32, 2, WOOD_DARK.t[2]);
  pix.outline();
  return { pix, ax: 17, ay: 25 };
}

function lampPost() {
  const pix = new Pix(14, 40);
  pix.cylinder(5, 10, 4, 28, ramp('#3d3b48'));
  pix.rect(2, 36, 10, 3, ramp('#3d3b48').t[2], '#121019');
  pix.box(1, 0, 12, 11, ramp('#d9a640'), { top: 2, light: 0.8 });
  pix.rect(3, 3, 8, 6, '#ffe08a');
  pix.outline();
  return { pix, ax: 7, ay: 39 };
}

/** Armário com portas de vidro: folhas-lunares (verde) ou orvalho (azul); aberto mostra as prateleiras. */
function cabinet(variant) {
  const [contents, state] = variant.split('-');
  const open = state === 'open';
  const pix = new Pix(46, 66);
  pix.box(4, 0, 38, 64, WOOD_DARK, { top: 4, light: 0.62, grain: 6 });
  // Coroa no topo
  pix.rect(2, 0, 42, 3, WOOD.t[3], WOOD.o);
  pix.rect(2, 0, 42, 1, WOOD.t[4]);
  const item = contents === 'leaf' ? ramp('#5aa84a') : ramp('#5fb8f0');
  // Interior com prateleiras e os ingredientes
  for (let shelf = 0; shelf < 3; shelf++) {
    const y0 = 7 + shelf * 18;
    pix.rect(8, y0, 30, 15, WOOD_DARK.t[0]);
    for (let i = 0; i < 5; i++) {
      const x0 = 10 + i * 6;
      if (contents === 'leaf') {
        // Maços de folhas amarrados
        pix.rect(x0, y0 + 4, 4, 9, item.t[2], item.o);
        pix.rect(x0, y0 + 4, 4, 2, item.t[4]);
        pix.rect(x0 + 1, y0 + 10, 2, 1, '#8a5a2c');
      } else {
        // Garrafinhas de orvalho
        pix.rect(x0, y0 + 6, 4, 7, item.t[2], item.o);
        pix.rect(x0, y0 + 6, 1, 7, item.t[4]);
        pix.rect(x0 + 1, y0 + 4, 2, 2, '#c8a070');
      }
    }
    pix.rect(8, y0 + 13, 30, 2, WOOD.t[3]);
  }
  if (open) {
    // Portas abertas para os lados
    pix.rect(0, 4, 5, 58, WOOD.t[2], WOOD.o);
    pix.rect(41, 4, 5, 58, WOOD.t[1], WOOD.o);
  } else {
    // Portas de vidro com caixilho: o vidro deixa ver o que tem dentro
    for (let y = 6; y < 58; y++) {
      for (let x = 7; x < 39; x++) {
        const frame = x === 7 || x === 38 || x === 22 || x === 23 || y === 6 || y === 57;
        if (frame) pix.set(x, y, WOOD.t[x < 23 ? 3 : 2]);
        else if ((x - y) % 9 === 0 || (x - y) % 9 === 1) pix.set(x, y, mix(pix.get(x, y) ?? '#000000', '#ffffff', 0.35));
      }
    }
    pix.rect(19, 30, 2, 4, '#d9a640', '#5a3e12');
    pix.rect(25, 30, 2, 4, '#d9a640', '#5a3e12');
  }
  pix.outline();
  return { pix, ax: 23, ay: 65 };
}

function worktable() {
  const pix = new Pix(70, 40);
  pix.box(1, 10, 68, 14, WOOD, { top: 6, light: 0.75, grain: 13 });
  pix.rect(4, 24, 4, 14, WOOD_DARK.t[2], WOOD_DARK.o);
  pix.rect(62, 24, 4, 14, WOOD_DARK.t[1], WOOD_DARK.o);
  // Pilão com folhas e livro de receitas aberto
  pix.ellipsoid(14, 9, 7, 5, ramp('#9a958c'), { test: (x, y) => y >= 5 });
  pix.rect(11, 5, 6, 2, '#5aa84a');
  pix.rect(16, 0, 2, 7, WOOD.t[3], WOOD.o);
  pix.rect(46, 6, 18, 6, '#f3e7cb', '#8a7a6a');
  pix.rect(54, 6, 1, 6, '#c9bfae');
  pix.outline();
  return { pix, ax: 35, ay: 39 };
}

const BUILDERS = { bed, table, chair, bookshelf, fireplace, plant, crate, barrel, workbench, counter, hay, lampPost, worktable };

/**
 * Sprite de um móvel. `variant` muda a cor (colcha da cama, por exemplo).
 * @returns {{ canvas, ax, ay, key }}
 */
export function furnitureSprite(type, variant = '') {
  const key = `movel:${type}:${variant}`;
  if (type === 'cauldron') return { ...cauldronSprite(variant || '#2b3550'), key };
  const entry = sprite(key, () => (type === 'bed' ? bed(variant || FABRIC_DEFAULT) : type === 'cabinet' ? cabinet(variant || 'leaf-closed') : BUILDERS[type]()));
  return { ...entry, key };
}

/** Área de cada móvel que bloqueia a passagem (largura e altura a partir da base). */
export const FURNITURE_SOLID = {
  bed: { w: 42, h: 46 }, table: { w: 40, h: 16 }, chair: { w: 12, h: 8 }, bookshelf: { w: 40, h: 12 },
  fireplace: { w: 52, h: 14 }, plant: { w: 14, h: 8 }, crate: { w: 24, h: 12 }, barrel: { w: 18, h: 10 },
  workbench: { w: 62, h: 14 }, counter: { w: 78, h: 16 }, hay: { w: 30, h: 12 }, lampPost: { w: 8, h: 6 },
  cabinet: { w: 42, h: 12 }, worktable: { w: 66, h: 14 }, cauldron: { w: 30, h: 12 },
};
