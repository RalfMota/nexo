/* NEXO — Pixel art do Prólogo no mapa: os dois artefatos (Compasso de Nexo e Calculador
 * Arcano) e o cristal instável, rachado e depois curado.
 */

import { Pix, ramp, customRamp, lightOf, toneOf, sprite, blit, pixelShadow } from './pixel.js';

const BRASS = ramp('#d9a640');
const LEATHER = ramp('#6b4226');
const SLATE = customRamp('#14101c', ['#24203a', '#36325a', '#4a4578', '#6a64a0', '#9a94cc']);
const TEAL = ramp('#5fe3d0');
const VIOLET = customRamp('#1e0f3a', ['#3a1f6e', '#6a3fc4', '#9a7ff0', '#c9b8ff', '#f1ebff']);
const HEALED = customRamp('#0b3a44', ['#127a86', '#2fb8c8', '#7ff0e0', '#c8fff6', '#ffffff']);

/* ---------- Compasso de Nexo ---------- */

function buildCompass() {
  const pix = new Pix(20, 20);
  const c = 10;
  // Aro de latão (luz de cima à esquerda) e mostrador de pergaminho
  pix.fill(
    (x, y) => Math.hypot(x + 0.5 - c, y + 0.5 - 11) <= 8.5,
    (x, y) => {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - 11;
      const d = Math.hypot(dx, dy);
      if (d > 6.5) return toneOf(lightOf(dx / d, dy / d, 0.5), x, y, BRASS);
      return d > 5.8 ? BRASS.t[0] : dy < -2 && dx < -1 ? '#fffbe8' : '#f4ecdc';
    },
    BRASS.o,
  );
  pix.rect(c - 1, 1, 3, 3, BRASS.t[3], BRASS.o);
  pix.set(c - 1, 1, BRASS.t[4]);
  // Agulha: vermelha para cima, escura para baixo
  pix.rect(c - 1, 6, 2, 5, '#c2453b');
  pix.set(c - 1, 6, '#ff8a7a');
  pix.rect(c - 1, 11, 2, 5, '#3b3b5c');
  pix.set(c - 1, 11, '#d9a640');
  // Marcas dos pontos cardeais
  for (const [x, y] of [[c - 1, 4], [c - 1, 17], [3, 11], [16, 11]]) pix.set(x, y, '#5a3e12');
  pix.outline();
  return { pix, ax: 10, ay: 19 };
}

/* ---------- Calculador Arcano (tabuinha com visor e teclas) ---------- */

function buildCalculator() {
  const pix = new Pix(18, 22);
  for (let y = 1; y < 21; y++) {
    for (let x = 2; x < 16; x++) {
      let l = 0.55 - (x - 2) / 60;
      if (y === 1 || x === 2) l += 0.3;
      if (y === 20 || x === 15) l -= 0.3;
      pix.set(x, y, toneOf(l, x, y, SLATE, { min: 1 }), SLATE.o);
    }
  }
  // Visor que brilha
  pix.rect(4, 3, 10, 5, '#0b2a30', SLATE.o);
  pix.rect(5, 4, 8, 3, TEAL.t[2]);
  pix.rect(5, 4, 8, 1, TEAL.t[4]);
  // Teclas 3 × 3
  for (let i = 0; i < 9; i++) {
    const x = 4 + (i % 3) * 4;
    const y = 10 + Math.floor(i / 3) * 3;
    pix.rect(x, y, 3, 2, i === 8 ? '#f2b84b' : '#e8e0f8');
    pix.set(x, y + 1, i === 8 ? '#a8742a' : '#9a94cc');
  }
  // Runa de latão no canto
  pix.set(13, 18, BRASS.t[4]);
  pix.outline();
  return { pix, ax: 9, ay: 21 };
}

/* ---------- Cristal instável (rachado) e curado ---------- */

function buildBigCrystal(healed, frame) {
  const pix = new Pix(34, 50);
  const R = healed ? HEALED : VIOLET;
  // Três pontas: a central alta e duas menores
  const shard = (cx, base, top, half) => {
    for (let y = top; y <= base; y++) {
      const k = (y - top) / Math.max(1, base - top);
      const w = Math.max(1, Math.round(half * Math.min(1, k * 2.2)));
      for (let x = cx - w; x <= cx + w; x++) {
        const nx = (x + 0.5 - cx) / (w + 0.5);
        const facet = nx < -0.15 ? 0.95 : nx < 0.35 ? 0.62 : 0.32;
        const pulse = healed ? 0.05 : (frame % 2 ? 0.06 : -0.04);
        pix.set(x, y, toneOf(facet - k * 0.12 + pulse, x, y, R), R.o);
      }
    }
  };
  shard(9, 44, 22, 5);
  shard(25, 44, 18, 5);
  shard(17, 45, 2, 7);
  // Brilho no canto da ponta central
  pix.set(14, 12, '#ffffff');
  pix.set(14, 13, R.t[4]);
  if (!healed) {
    // Rachadura escura em zigue-zague
    const crack = [[18, 8], [17, 12], [19, 16], [16, 21], [18, 26], [16, 31], [17, 36]];
    for (let i = 0; i < crack.length - 1; i++) pix.line(...crack[i], ...crack[i + 1], '#1a0c30');
  }
  // Base de pedra
  for (let y = 44; y < 49; y++) {
    for (let x = 3; x < 31; x++) {
      if ((y === 44 && (x < 5 || x > 28)) || (y === 48 && (x < 4 || x > 29))) continue;
      pix.set(x, y, toneOf(y === 44 ? 0.8 : 0.5 - (x - 3) / 70, x, y, ramp('#8a8fa8')), '#2e3358');
    }
  }
  pix.outline();
  return { pix, ax: 17, ay: 49 };
}

export function drawArtifact(ctx, kind, x, y, t) {
  const bob = Math.round(Math.sin(t * 3 + (kind === 'compass' ? 0 : 1.5)) * 1.5);
  pixelShadow(ctx, x, y, 7, 2);
  // Brilho dourado no chão, para chamar a atenção
  ctx.fillStyle = `rgba(255, 224, 138, ${0.18 + Math.sin(t * 4) * 0.08})`;
  ctx.fillRect(x - 10, y - 2, 20, 4);
  const entry = kind === 'compass' ? sprite('prologo:compasso', buildCompass) : sprite('prologo:calculador', buildCalculator);
  blit(ctx, entry, x, y - 3 + bob);
}

export function drawUnstableCrystal(ctx, x, y, t, healed) {
  pixelShadow(ctx, x, y, 16, 3);
  const frame = Math.floor(t * 6) % 2;
  const glow = ctx.createRadialGradient(x, y - 26, 4, x, y - 26, 44);
  const color = healed ? '127, 240, 224' : '154, 127, 240';
  glow.addColorStop(0, `rgba(${color}, ${healed ? 0.45 : 0.25 + frame * 0.1})`);
  glow.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(x - 44, y - 70, 88, 88);
  const jitter = healed ? 0 : (Math.floor(t * 12) % 7 === 0 ? 1 : 0);
  blit(ctx, sprite(`prologo:cristal:${healed}:${frame}`, () => buildBigCrystal(healed, frame)), x + jitter, y + Math.round(Math.sin(t * 2) * (healed ? 1 : 0)));
}
