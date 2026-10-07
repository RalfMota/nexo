/* NEXO — Jogador: estado compartilhado entre as cenas e movimento com a física do Phaser
 *
 * O corpo do jogador é uma caixa de 14 × 7 px nos pés (Arcade Physics). A cena liga essa
 * caixa às suas paredes (camada de colisão do mapa ou paredes do interior) e o Phaser
 * resolve as colisões. Teclado, direcional de toque e "clicar para andar" pedem a direção.
 */

import { createAnimator } from '../art/animator.js';
import { movementVector } from '../world/input.js';
import { getCarried, setActionPlayer, burst } from '../world/quest-layer.js';
import { SPAWN } from '../world/map.js';

export const SPEED = 115; // pixels do mundo por segundo
export const REACH = 46;  // distância para conversar/interagir
const FOOT_W = 14;
const FOOT_H = 7;

/** Onde o jogador está no mapa aberto (guardado enquanto ele visita um interior). */
export const player = { x: SPAWN.x, y: SPAWN.y, dir: 'down', moving: false };

export const playerAnimator = createAnimator();
let frame = playerAnimator.frame;
let impactKind = () => 'sparkle';
let impactAt = () => ({ x: player.x, y: player.y });

export const getPlayerFrame = () => frame;

/** A cena ativa informa de que chão é o ponto de impacto (brilho na grama, poeira na terra). */
export function setImpactSource(at, kind) {
  impactAt = at;
  impactKind = kind;
}

setActionPlayer((name) => {
  playerAnimator.play(name, (event) => {
    if (event !== 'impact') return;
    const { x, y, dir } = impactAt();
    burst(x + (dir === 'left' ? -8 : dir === 'right' ? 8 : 0), y - 2, impactKind(x, y), 8);
  });
});

/** Cria o corpo físico do jogador com os pés em (x, y). */
export function createPlayerBody(scene, x, y) {
  const body = scene.add.zone(x, y - FOOT_H / 2, FOOT_W, FOOT_H);
  scene.physics.add.existing(body);
  body.body.setCollideWorldBounds(true);
  return body;
}

export const footOf = (body) => ({ x: body.x, y: body.y + FOOT_H / 2 });

export function placeBody(body, x, y) {
  body.body.reset(x, y - FOOT_H / 2);
}

/**
 * Controla um corpo de jogador a cada quadro.
 * @returns {{ update(dt, { busy, onArrive }): { x, y, dir, moving }, walkTo(x, y, target?), stop() }}
 */
export function createMover(body, { interact, reachOf = (target) => target.reach ?? REACH }) {
  let tapTarget = null;
  let last = footOf(body);
  let stuck = 0;
  let dir = player.dir;

  return {
    walkTo(x, y, target = null) {
      tapTarget = { x, y, target };
      stuck = 0;
    },
    stop() {
      tapTarget = null;
      body.body.setVelocity(0, 0);
    },
    update(dt, { busy }) {
      const foot = footOf(body);
      const moved = Math.hypot(foot.x - last.x, foot.y - last.y);
      last = foot;
      if (busy) {
        tapTarget = null;
        body.body.setVelocity(0, 0);
        return { ...foot, dir, moving: false };
      }

      let { dx, dy } = movementVector();
      if (dx || dy) {
        tapTarget = null;
      } else if (tapTarget) {
        const target = tapTarget.target;
        if (target && Math.hypot(foot.x - target.x, foot.y - target.y) < reachOf(target) - 4) {
          tapTarget = null;
          body.body.setVelocity(0, 0);
          interact(target);
          return { ...foot, dir, moving: false };
        }
        const vx = tapTarget.x - foot.x;
        const vy = tapTarget.y - foot.y;
        const distance = Math.hypot(vx, vy);
        if (distance < 3) {
          tapTarget = null;
        } else {
          dx = vx / distance;
          dy = vy / distance;
          // Caminho bloqueado por muito tempo: desiste do toque
          stuck = moved < 0.2 ? stuck + dt : 0;
          if (stuck > 0.35) tapTarget = null;
        }
      }
      if (dx && dy && Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      body.body.setVelocity(dx * SPEED, dy * SPEED);
      const moving = (dx || dy) && moved > 0.2;
      if (dx || dy) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      return { ...foot, dir, moving: Boolean(moving) };
    },
  };
}

/** Avança a animação do jogador e devolve o quadro (pose, escala, elevação). */
export function animatePlayer(dt, moving, onStep) {
  frame = playerAnimator.update(dt, {
    moving,
    carrying: Boolean(getCarried()),
    onEvent: (event) => {
      if (event === 'step') onStep?.();
    },
  });
  return frame;
}
