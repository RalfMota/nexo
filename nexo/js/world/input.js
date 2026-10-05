/* NEXO — Entrada do jogador no mundo: teclado, toque (direcional) e clique para andar */

import { isTypingTarget } from '../core/dom.js';

const MOVE_KEYS = {
  w: [0, -1], arrowup: [0, -1],
  s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0],
  d: [1, 0], arrowright: [1, 0],
};
const INTERACT_KEYS = ['e', ' ', 'enter'];

const pressed = new Set();

/** Direção pedida pelo jogador no momento: { dx, dy } com valores -1, 0 ou 1. */
export function movementVector() {
  let dx = 0;
  let dy = 0;
  for (const key of pressed) {
    const vector = MOVE_KEYS[key];
    if (!vector) continue;
    dx += vector[0];
    dy += vector[1];
  }
  return { dx: Math.sign(dx), dy: Math.sign(dy) };
}

export const clearInput = () => pressed.clear();

/**
 * Liga os controles. Devolve uma função que desliga todos.
 * @param {{ canvas: HTMLCanvasElement, touchPad: HTMLElement, touchAction: HTMLElement,
 *           canMove: () => boolean, onInteract: () => void, onTap: (x: number, y: number) => void }} options
 */
export function bindInput({ canvas, touchPad, touchAction, canMove, onInteract, onTap }) {
  const onKeyDown = (event) => {
    if (isTypingTarget(event.target)) return;
    const key = event.key.toLowerCase();
    if (MOVE_KEYS[key]) {
      if (!canMove()) return;
      if (key.startsWith('arrow')) event.preventDefault();
      pressed.add(key);
      return;
    }
    if (INTERACT_KEYS.includes(key)) {
      // Espaço/Enter sobre um botão focado devem apenas acionar o botão
      if (key !== 'e' && event.target instanceof HTMLButtonElement) return;
      if (!canMove()) return;
      event.preventDefault();
      onInteract();
    }
  };
  const onKeyUp = (event) => pressed.delete(event.key.toLowerCase());
  const onBlur = () => pressed.clear();

  const onPointerDown = (event) => {
    if (!canMove()) return;
    const rect = canvas.getBoundingClientRect();
    onTap(event.clientX - rect.left, event.clientY - rect.top);
  };

  // Direcional de toque: cada botão "segura" a tecla correspondente
  const padHandlers = [];
  for (const button of touchPad.querySelectorAll('[data-key]')) {
    const key = button.dataset.key;
    const press = (event) => {
      event.preventDefault();
      if (canMove()) pressed.add(key);
    };
    const release = () => pressed.delete(key);
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('pointercancel', release);
    padHandlers.push(() => {
      button.removeEventListener('pointerdown', press);
      button.removeEventListener('pointerup', release);
      button.removeEventListener('pointerleave', release);
      button.removeEventListener('pointercancel', release);
    });
  }
  const onActionTap = () => canMove() && onInteract();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  touchAction.addEventListener('click', onActionTap);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
    touchAction.removeEventListener('click', onActionTap);
    padHandlers.forEach((unbind) => unbind());
    pressed.clear();
  };
}
