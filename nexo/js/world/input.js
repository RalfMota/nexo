/* NEXO — Entrada do jogador no mundo: teclado, toque (direcional), clique para andar e
 * controle de videogame (direcional ou alavanca esquerda para andar; botão A ou X para interagir),
 * o que também serve a controles adaptados de acessibilidade. */

import { isTypingTarget } from '../core/dom.js';

const MOVE_KEYS = {
  w: [0, -1], arrowup: [0, -1],
  s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0],
  d: [1, 0], arrowright: [1, 0],
};
const INTERACT_KEYS = ['e', ' ', 'enter'];

const pressed = new Set();
const DEAD_ZONE = 0.4;
const GAMEPAD_INTERACT = [0, 2]; // A e X (no padrão do navegador)

/** Direção do primeiro controle de videogame conectado: alavanca esquerda ou direcional. */
function gamepadVector() {
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (!pad) continue;
    let dx = Math.abs(pad.axes[0] ?? 0) > DEAD_ZONE ? Math.sign(pad.axes[0]) : 0;
    let dy = Math.abs(pad.axes[1] ?? 0) > DEAD_ZONE ? Math.sign(pad.axes[1]) : 0;
    if (pad.buttons[14]?.pressed) dx = -1;
    if (pad.buttons[15]?.pressed) dx = 1;
    if (pad.buttons[12]?.pressed) dy = -1;
    if (pad.buttons[13]?.pressed) dy = 1;
    if (dx || dy) return { dx, dy };
  }
  return null;
}

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
  if (!dx && !dy && gamepadActive) {
    const pad = gamepadVector();
    if (pad) return pad;
  }
  return { dx: Math.sign(dx), dy: Math.sign(dy) };
}

let gamepadActive = false;

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

  // Controle de videogame: o botão de interagir dispara uma vez por aperto
  let wasPressed = false;
  const pollGamepad = () => {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = [...pads].find(Boolean);
    gamepadActive = Boolean(pad);
    const down = Boolean(pad && GAMEPAD_INTERACT.some((index) => pad.buttons[index]?.pressed));
    if (down && !wasPressed && canMove()) onInteract();
    wasPressed = down;
  };
  const gamepadTimer = 'getGamepads' in navigator ? setInterval(pollGamepad, 50) : null;

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
    clearInterval(gamepadTimer);
    gamepadActive = false;
    pressed.clear();
  };
}
