/* NEXO — Desenho dos objetos manipuláveis da missão em janela (Prólogo)
 * Cada função recebe (ctx, w, h) e desenha o objeto ocupando a área toda.
 * As que dependem de um valor devolvem a função de desenho: artArtifact('compass')(ctx, w, h).
 * Os objetos das missões no mapa ficam em art/items.js e art/mission-props.js.
 */

import { roundRect, circle } from '../art/shapes.js';

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
