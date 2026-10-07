/* NEXO — Moradores que passeiam pela vila
 *
 * Cada morador caminha entre os pontos da sua rota, para um pouco em cada um, desvia de
 * obstáculos (se travar, escolhe outro ponto) e para para conversar quando o jogador fala
 * com ele. Usa o mesmo motor de animação do jogador (andar, parado, piscar).
 */

import { TILE, isStaticSolid } from './map.js';
import { VILLAGERS } from '../data/villagers.js';
import { createAnimator } from '../art/animator.js';
import { showDialogue, isDialogueOpen } from '../ui/dialogue.js';

const FACE_RANGE = 70;

const tileCenter = ([tx, ty]) => ({ x: tx * TILE + 16, y: ty * TILE + 26 });

const villagers = VILLAGERS.map((data, index) => {
  const start = tileCenter(data.route[0]);
  return {
    ...data,
    x: start.x,
    y: start.y,
    dir: 'down',
    target: null,
    routeIndex: 0,
    wait: 1 + index * 0.4,
    stuck: 0,
    lineIndex: 0,
    talking: false,
    animator: createAnimator({ phase: index * 0.53 }),
    frame: null,
  };
});

/** Caixa dos pés contra blocos sólidos (mesma regra do jogador, um pouco menor). */
function blocked(x, y) {
  return [[x - 6, y - 6], [x + 6, y - 6], [x - 6, y - 1], [x + 6, y - 1]].some(([cx, cy]) => isStaticSolid(Math.floor(cx / TILE), Math.floor(cy / TILE)));
}

function faceToward(villager, player) {
  const dx = player.x - villager.x;
  const dy = player.y - villager.y;
  villager.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

function nextTarget(villager) {
  // Pula para um ponto diferente do atual (de vez em quando, aleatório)
  const step = Math.random() < 0.7 ? 1 : 1 + Math.floor(Math.random() * (villager.route.length - 1));
  villager.routeIndex = (villager.routeIndex + step) % villager.route.length;
  villager.target = tileCenter(villager.route[villager.routeIndex]);
  villager.stuck = 0;
}

export function updateVillagers(dt, player) {
  for (const villager of villagers) {
    let moving = false;
    if (villager.talking && !isDialogueOpen()) villager.talking = false;

    const near = Math.hypot(player.x - villager.x, player.y - villager.y) < FACE_RANGE;
    if (villager.talking) {
      faceToward(villager, player);
    } else if (villager.wait > 0) {
      villager.wait -= dt;
      if (near) faceToward(villager, player);
      if (villager.wait <= 0) nextTarget(villager);
    } else if (villager.target) {
      const dx = villager.target.x - villager.x;
      const dy = villager.target.y - villager.y;
      const distance = Math.hypot(dx, dy);
      // Jogador no caminho (perto e à frente): desvia escolhendo outro destino
      const px = player.x - villager.x;
      const py = player.y - villager.y;
      const inTheWay = Math.hypot(px, py) < 26 && px * dx + py * dy > 0;
      // Outro morador no caminho: espera um instante
      const crowded = villagers.some((other) => other !== villager && Math.hypot(other.x - villager.x, other.y - villager.y) < 16 && (other.x - villager.x) * dx + (other.y - villager.y) * dy > 0);
      if (distance < 3) {
        villager.target = null;
        villager.wait = 1.5 + Math.random() * 3.5;
      } else if (inTheWay) {
        villager.wait = 0.4 + Math.random() * 0.6;
        villager.target = null;
      } else if (crowded) {
        villager.stuck += dt;
        if (villager.stuck > 0.8) nextTarget(villager);
      } else {
        const step = villager.speed * dt;
        const mx = (dx / distance) * step;
        const my = (dy / distance) * step;
        const before = { x: villager.x, y: villager.y };
        if (mx && !blocked(villager.x + mx, villager.y)) villager.x += mx;
        if (my && !blocked(villager.x, villager.y + my)) villager.y += my;
        moving = Math.hypot(villager.x - before.x, villager.y - before.y) > 0.01;
        if (moving) {
          villager.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        } else {
          villager.stuck += dt;
          if (villager.stuck > 0.8) nextTarget(villager);
        }
      }
    }
    villager.frame = villager.animator.update(dt, { moving, carrying: false, speed: villager.speed / 60 });
  }
}

/** Atores para desenhar (o nome aparece só no morador mais próximo do jogador). */
export function villagerActors(player) {
  const distance = (villager) => Math.hypot(player.x - villager.x, player.y - villager.y);
  const closest = villagers.reduce((best, villager) => (!best || distance(villager) < distance(best) ? villager : best), null);
  return villagers.map((villager) => {
    const frame = villager.frame ?? {};
    return {
      x: villager.x,
      y: villager.y,
      look: villager.look,
      label: villager === closest && distance(villager) < FACE_RANGE ? villager.name : null,
      pose: { dir: villager.dir, pose: frame.pose, scaleX: frame.scaleX, scaleY: frame.scaleY, lift: frame.lift },
    };
  });
}

/** Moradores como alvos de interação ("E" para conversar). */
export function villagerInteractables() {
  return villagers.map((villager) => ({ kind: 'villager', villager, x: villager.x, y: villager.y, reach: 40 }));
}

/** O jogador falou com um morador: ele para, olha e diz a próxima fala. */
export function talkToVillager(villager) {
  villager.talking = true;
  villager.target = null;
  villager.wait = 2;
  const text = villager.lines[villager.lineIndex % villager.lines.length];
  villager.lineIndex++;
  showDialogue({ speaker: villager, text });
}
