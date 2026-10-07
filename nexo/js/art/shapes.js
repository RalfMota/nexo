/* NEXO — Primitivas de desenho compartilhadas (mundo e cenas das missões) */

/** Número pseudoaleatório estável para cada (x, y): o mapa fica igual a cada carregamento. */
export function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor hexadecimal. */
export function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const mix = (channel) => Math.round(channel + (target - channel) * Math.abs(amount));
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  return `rgb(${r},${g},${b})`;
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

export function circle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Cristal facetado com brilho. (x, y) é o centro. */
export function drawCrystal(ctx, x, y, size, { glow = 1, color = '#5fe3d0', light = '#e3fffb' } = {}) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 * glow;
  const top = [x, y - size];
  const right = [x + size * 0.58, y - size * 0.15];
  const bottom = [x, y + size * 0.75];
  const left = [x - size * 0.58, y - size * 0.15];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...top);
  ctx.lineTo(...right);
  ctx.lineTo(...bottom);
  ctx.lineTo(...left);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = light;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(...top);
  ctx.lineTo(x, y - size * 0.15);
  ctx.lineTo(...bottom);
  ctx.lineTo(...left);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Engrenagem girando. */
export function drawGear(ctx, x, y, radius, angle, color, holeColor = '#2a1d3d') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  const teeth = Math.max(6, Math.round(radius / 2));
  for (let i = 0; i < teeth; i++) {
    ctx.rotate((Math.PI * 2) / teeth);
    ctx.fillRect(-radius * 0.18, -radius - 4, radius * 0.36, 8);
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = holeColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Texto com contorno, para legendas sobre cenas. */
export function outlinedText(ctx, text, x, y, { font = '700 14px "Fredoka", sans-serif', fill = '#fff', stroke = 'rgba(20,16,40,.85)', align = 'center' } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
