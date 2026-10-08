/* NEXO — Legendas dos sons: um aviso escrito curto, embaixo da tela, a cada efeito sonoro
 * (opção "Legendas dos sons"). Lido também por leitores de tela (região ao vivo).
 */

import { onSfxCaption } from '../core/sfx.js';

let box = null;
let timer = null;

function ensureBox() {
  if (box && document.body.contains(box)) return box;
  box = document.createElement('div');
  box.className = 'sfx-caption';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  document.body.appendChild(box);
  return box;
}

export function initCaptions() {
  onSfxCaption((text) => {
    const element = ensureBox();
    element.textContent = `♪ ${text}`;
    element.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => element.classList.remove('is-on'), 1600);
  });
}
