/* NEXO — Desenho dos objetos manipuláveis das missões
 * Cada função recebe (ctx, w, h) e desenha o objeto ocupando a área toda.
 * As que dependem de um valor devolvem a função de desenho: artCart(9)(ctx, w, h).
 */

import { roundRect, circle, drawCrystal, outlinedText } from '../art/shapes.js';

const pixelFont = (size) => `700 ${size}px "Pixelify Sans", sans-serif`;

export const artLever = (pulled = false, color = '#c2453b') => (ctx, w, h) => {
  ctx.fillStyle = '#4b4560';
  roundRect(ctx, w * 0.15, h * 0.72, w * 0.7, h * 0.24, 8);
  ctx.fill();
  ctx.save();
  ctx.translate(w / 2, h * 0.78);
  ctx.rotate(pulled ? 0.7 : -0.7);
  ctx.fillStyle = '#9ca0b8';
  ctx.fillRect(-w * 0.07, -h * 0.6, w * 0.14, h * 0.6);
  circle(ctx, 0, -h * 0.6, w * 0.22, color);
  circle(ctx, -w * 0.07, -h * 0.66, w * 0.07, 'rgba(255,255,255,.6)');
  ctx.restore();
};

export const artCart = (crystals, capacity = 30) => (ctx, w, h) => {
  ctx.fillStyle = '#7a5a3a';
  roundRect(ctx, w * 0.04, h * 0.3, w * 0.92, h * 0.5, 8);
  ctx.fill();
  ctx.fillStyle = '#5c4229';
  ctx.fillRect(w * 0.04, h * 0.3, w * 0.92, h * 0.08);
  for (let i = 0; i < Math.min(crystals, capacity); i++) {
    drawCrystal(ctx, w * (0.12 + (i % 10) * 0.085), h * (0.3 - Math.floor(i / 10) * 0.12), w * 0.04, { glow: 0.5 });
  }
  circle(ctx, w * 0.24, h * 0.86, h * 0.12, '#3b3b46');
  circle(ctx, w * 0.76, h * 0.86, h * 0.12, '#3b3b46');
  outlinedText(ctx, `${crystals}`, w / 2, h * 0.56, { font: pixelFont(Math.round(h * 0.24)) });
};

export function artCell(ctx, w, h) {
  ctx.fillStyle = '#3b3b5c';
  roundRect(ctx, w * 0.2, h * 0.14, w * 0.6, h * 0.82, 6);
  ctx.fill();
  ctx.fillStyle = '#9ca0b8';
  ctx.fillRect(w * 0.38, h * 0.04, w * 0.24, h * 0.1);
  ctx.fillStyle = '#f2b84b';
  roundRect(ctx, w * 0.28, h * 0.3, w * 0.44, h * 0.56, 4);
  ctx.fill();
  ctx.fillStyle = '#fff1b8';
  ctx.beginPath();
  ctx.moveTo(w * 0.54, h * 0.36);
  ctx.lineTo(w * 0.38, h * 0.6);
  ctx.lineTo(w * 0.5, h * 0.6);
  ctx.lineTo(w * 0.44, h * 0.8);
  ctx.lineTo(w * 0.62, h * 0.54);
  ctx.lineTo(w * 0.5, h * 0.54);
  ctx.closePath();
  ctx.fill();
}

export const artCrate = (distance) => (ctx, w, h) => {
  ctx.fillStyle = '#b98a52';
  ctx.fillRect(w * 0.08, h * 0.3, w * 0.84, h * 0.66);
  ctx.fillStyle = '#8a6136';
  ctx.fillRect(w * 0.08, h * 0.3, w * 0.84, h * 0.08);
  ctx.fillRect(w * 0.08, h * 0.88, w * 0.84, h * 0.08);
  ctx.fillRect(w * 0.08, h * 0.3, w * 0.08, h * 0.66);
  ctx.fillRect(w * 0.84, h * 0.3, w * 0.08, h * 0.66);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(w * 0.7, 0, 3, h * 0.32);
  ctx.fillStyle = '#c2453b';
  ctx.beginPath();
  ctx.moveTo(w * 0.7 + 3, 2);
  ctx.lineTo(w * 0.98, h * 0.1);
  ctx.lineTo(w * 0.7 + 3, h * 0.2);
  ctx.fill();
  outlinedText(ctx, `${distance}`, w / 2, h * 0.64, { font: pixelFont(Math.round(h * 0.34)) });
};

export function artScout(ctx, w, h) {
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(w / 2 - 2, 0, 4, h);
  ctx.fillStyle = '#ffcf6b';
  ctx.beginPath();
  ctx.moveTo(w / 2 + 2, 4);
  ctx.lineTo(w - 2, 14);
  ctx.lineTo(w / 2 + 2, 24);
  ctx.fill();
  circle(ctx, w / 2, h - 6, 6, '#4f3019');
}

export function artFlagSign(ctx, w, h) {
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(w / 2 - 3, h * 0.3, 6, h * 0.7);
  ctx.fillStyle = '#efe0bb';
  roundRect(ctx, w * 0.06, h * 0.04, w * 0.88, h * 0.36, 6);
  ctx.fill();
  ctx.strokeStyle = '#a0703f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = '#c2453b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.22);
  ctx.lineTo(w * 0.78, h * 0.22);
  ctx.moveTo(w * 0.62, h * 0.12);
  ctx.lineTo(w * 0.78, h * 0.22);
  ctx.lineTo(w * 0.62, h * 0.32);
  ctx.stroke();
}

export function artHorn(ctx, w, h) {
  ctx.fillStyle = '#f2b84b';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.42);
  ctx.lineTo(w * 0.6, h * 0.3);
  ctx.lineTo(w * 0.92, h * 0.08);
  ctx.lineTo(w * 0.92, h * 0.92);
  ctx.lineTo(w * 0.6, h * 0.7);
  ctx.lineTo(w * 0.1, h * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9862a';
  ctx.fillRect(w * 0.06, h * 0.38, w * 0.1, h * 0.24);
}

export function artRod(ctx, w, h) {
  ctx.save();
  ctx.shadowColor = '#5fe3d0';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#7ff0e0';
  roundRect(ctx, w * 0.42, h * 0.04, w * 0.16, h * 0.92, 4);
  ctx.fill();
  ctx.restore();
}

export function artRodBundle(ctx, w, h) {
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#7ff0e0' : '#5fe3d0';
    roundRect(ctx, w * (0.12 + i * 0.078), h * 0.06, w * 0.06, h * 0.88, 3);
    ctx.fill();
  }
  ctx.fillStyle = '#c2453b';
  ctx.fillRect(w * 0.06, h * 0.3, w * 0.88, h * 0.08);
  ctx.fillRect(w * 0.06, h * 0.62, w * 0.88, h * 0.08);
  outlinedText(ctx, '10', w / 2, h * 0.5, { font: pixelFont(Math.round(h * 0.22)) });
}

export function artCrystalToken(ctx, w, h) {
  drawCrystal(ctx, w / 2, h * 0.5, Math.min(w, h) * 0.38, { glow: 0.8 });
}

export const artCrystalPile = (label) => (ctx, w, h) => {
  ctx.fillStyle = '#6e6890';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.86, w * 0.46, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  const spots = [[0.3, 0.62], [0.5, 0.56], [0.7, 0.62], [0.4, 0.4], [0.6, 0.4], [0.5, 0.24]];
  for (const [x, y] of spots) drawCrystal(ctx, w * x, h * y, Math.min(w, h) * 0.14, { glow: 0.7 });
  if (label) outlinedText(ctx, label, w / 2, h * 0.94, { font: pixelFont(Math.round(w * 0.11)) });
};

export const artArtifact = (kind) => (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w * 0.46, 'rgba(255, 224, 138, .35)');
  if (kind === 'compass') {
    circle(ctx, w / 2, h / 2, w * 0.34, '#c9862a');
    circle(ctx, w / 2, h / 2, w * 0.27, '#fbf1d9');
    ctx.fillStyle = '#c2453b';
    ctx.fillRect(w * 0.46, h * 0.26, w * 0.08, h * 0.24);
    ctx.fillStyle = '#3b3b5c';
    ctx.fillRect(w * 0.46, h * 0.5, w * 0.08, h * 0.24);
  } else {
    ctx.fillStyle = '#3b3b5c';
    roundRect(ctx, w * 0.24, h * 0.16, w * 0.52, h * 0.68, 6);
    ctx.fill();
    ctx.fillStyle = '#5fe3d0';
    ctx.fillRect(w * 0.32, h * 0.24, w * 0.36, h * 0.16);
    ctx.fillStyle = '#fbf1d9';
    for (let i = 0; i < 4; i++) ctx.fillRect(w * (0.32 + (i % 2) * 0.22), h * (0.48 + Math.floor(i / 2) * 0.16), w * 0.14, h * 0.1);
  }
};

/** Tela com um gráfico de pontos (leituras do Núcleo). */
export const artReading = (rule, title) => (ctx, w, h) => {
  ctx.fillStyle = '#4f3019';
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  roundRect(ctx, 5, 5, w - 10, h - 10, 7);
  ctx.fill();
  const left = 24;
  const bottom = h - 24;
  const right = w - 12;
  const top = 26;
  const maxY = 70;
  const sx = (c) => left + (c / 10) * (right - left);
  const sy = (e) => bottom - (e / maxY) * (bottom - top);
  ctx.strokeStyle = '#e3d9c4';
  ctx.lineWidth = 1;
  for (let e = 0; e <= maxY; e += 10) {
    ctx.beginPath();
    ctx.moveTo(left, sy(e));
    ctx.lineTo(right, sy(e));
    ctx.stroke();
  }
  ctx.strokeStyle = '#4f3019';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.fillStyle = '#6b5440';
  ctx.font = '600 9px Lexend, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let e = 0; e <= maxY; e += 20) ctx.fillText(String(e), left - 3, sy(e));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let c = 0; c <= 10; c += 5) ctx.fillText(String(c), sx(c), bottom + 3);
  ctx.fillStyle = '#118a80';
  for (let c = 0; c <= 10; c++) {
    const e = rule(c);
    if (e > maxY) break;
    circle(ctx, sx(c), sy(e), 3, '#118a80');
  }
  outlinedText(ctx, title, w / 2, 14, { font: pixelFont(12), fill: '#4f3019', stroke: '#fffaf0' });
};

/** Bilhete de pedido preso na cena: desenho + quantidade. */
export function drawOrderNote(ctx, x, y, w, h, drawContent) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.03);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
  ctx.fillStyle = '#fbf1d9';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#e8d2a4';
  ctx.fillRect(-w / 2, -h / 2, w, 6);
  circle(ctx, 0, -h / 2 + 3, 5, '#c2453b');
  ctx.translate(-w / 2, -h / 2);
  drawContent(ctx, w, h);
  ctx.restore();
}

