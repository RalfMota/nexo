/* NEXO — Mundo explorável: laço de jogo, movimento, câmera e interação */

import { TILE, MAP_W, MAP_H, BARRIERS, SIGNS, CORE, SPAWN, ground, isStaticSolid, tileFoot, zoneAt } from './map.js';
import { renderWorld, createAmbient, updateAmbient } from './renderer.js';
import { bindInput, movementVector, clearInput } from './input.js';
import { interact } from './story.js';
import { CHARACTERS, playerLook } from '../data/characters.js';
import { REGIONS } from '../data/regions.js';
import { state } from '../core/state.js';
import { runtime } from '../core/runtime.js';
import { isRegionOpenById, isRegionDone, currentRegion } from '../game/progress.js';
import { isDialogueOpen } from '../ui/dialogue.js';
import { isModalOpen } from '../ui/modal.js';
import { setZoneName } from '../ui/hud.js';
import {
  questInteractables, updateQuestLayer, getCarried, setActionPlayer, footstep, burst,
} from './quest-layer.js';
import { createAnimator } from '../art/animator.js';
import { updateWeather, weatherNow } from './weather.js';
import { setWindStrength } from './scenery.js';
import { updateVillagers, villagerActors, villagerInteractables } from './villagers.js';

const SPEED = 115;     // pixels do mundo por segundo
const REACH = 46;      // distância para conversar/interagir
const FACE_RANGE = 90; // personagens olham para o jogador quando ele chega perto

const player = { x: SPAWN.x, y: SPAWN.y, dir: 'down', moving: false, step: 0 };
const camera = { x: 0, y: 0, ready: false };
const ambient = createAmbient();

/* Animadores: o do jogador troca de clipe conforme anda, carrega ou age; os moradores
 * respiram e piscam, cada um no seu ritmo. */
const playerAnimator = createAnimator();
const npcAnimators = Object.fromEntries(Object.keys(CHARACTERS).map((id, i) => [id, createAnimator({ phase: i * 0.37 })]));
let playerFrame = playerAnimator.frame;
const npcFrames = {};

/** Tipo de chão sob um ponto (para a poeira dos passos). */
function groundAt(x, y) {
  const char = ground[Math.floor(y / TILE)]?.[Math.floor(x / TILE)];
  if (char === '=' || char === 'p') return 'dirt';
  if (char === '#') return 'soil';
  return 'grass';
}

setActionPlayer((name) => {
  playerAnimator.play(name, (event) => {
    if (event === 'impact') burst(player.x + (player.dir === 'left' ? -8 : player.dir === 'right' ? 8 : 0), player.y - 2, groundAt(player.x, player.y) === 'grass' ? 'sparkle' : 'dust', 8);
  });
});

let canvas = null;
let ctx = null;
let frameId = 0;
let lastTime = 0;
let time = 0;
let zoom = 1;
let pixelRatio = 1;
let unbindInput = null;
let resizeObserver = null;
let tapTarget = null;
let focus = null;
let interactables = [];
let lockedTiles = new Set();
let zoneName = '';

/**
 * O personagem fica parado enquanto há diálogo, janela ou missão em janela aberta.
 * Missões de mundo (session.inWorld) acontecem no mapa: o jogador continua andando.
 */
export const isWorldBusy = () =>
  Boolean(runtime.session && !runtime.session.inWorld) || isDialogueOpen() || isModalOpen();

export const getPlayerPosition = () => ({ x: player.x, y: player.y });

/** Põe o personagem num ponto do mapa (viagem rápida, testes). */
export function placePlayer(x, y, dir = 'down') {
  Object.assign(player, { x, y, dir, moving: false });
  tapTarget = null;
}

export const getWorldTime = () => time;

/** Quadro de animação atual do jogador (pose, escala, elevação). */
export const getPlayerFrame = () => playerFrame;

/** Ativa o mundo dentro do canvas informado. */
export function startWorld(canvasElement, { touchPad, touchAction, gameElement }) {
  stopWorld();
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  camera.ready = false;
  zoneName = '';

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  unbindInput = bindInput({
    canvas,
    touchPad,
    touchAction,
    canMove: () => !isWorldBusy(),
    onInteract: () => focus && interact(focus),
    onTap: handleTap,
  });

  const loop = (now) => {
    frameId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
    lastTime = now;
    time += dt;
    gameElement.classList.toggle('is-busy', isWorldBusy());
    update(dt);
    draw();
  };
  frameId = requestAnimationFrame(loop);
}

export function stopWorld() {
  cancelAnimationFrame(frameId);
  unbindInput?.();
  resizeObserver?.disconnect();
  unbindInput = null;
  resizeObserver = null;
  canvas = null;
  ctx = null;
  lastTime = 0;
  tapTarget = null;
  clearInput();
}

function resize() {
  if (!canvas) return;
  const { width, height } = canvas.getBoundingClientRect();
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * pixelRatio));
  canvas.height = Math.max(1, Math.round(height * pixelRatio));
  // Cerca de 20 blocos de largura no computador; no celular, escala mínima 1
  zoom = Math.max(1, Math.min(2.5, Math.min(width / 640, height / 400)));
}

function viewSize() {
  return { w: canvas.width / pixelRatio / zoom, h: canvas.height / pixelRatio / zoom };
}

function viewRect() {
  if (!canvas) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: camera.x, y: camera.y, ...viewSize() };
}

/* ---------- Atualização ---------- */

function update(dt) {
  updateAmbient(ambient, dt, time, viewRect());
  updateWeather(dt, viewRect());
  setWindStrength(weatherNow().wind);
  updateQuestLayer(dt);
  updateVillagers(dt, player);
  lockedTiles = new Set(
    BARRIERS.filter((barrier) => !isRegionOpenById(barrier.region)).flatMap((barrier) => barrier.tiles.map(([x, y]) => `${x},${y}`)),
  );
  interactables = buildInteractables();

  if (isWorldBusy()) {
    player.moving = false;
    tapTarget = null;
  } else {
    movePlayer(dt);
  }

  focus = isWorldBusy() ? null : nearestInteractable();
  updateCamera(dt);

  playerFrame = playerAnimator.update(dt, {
    moving: player.moving,
    carrying: Boolean(getCarried()),
    onEvent: (event) => {
      if (event === 'step') footstep(player.x, player.y, groundAt(player.x, player.y));
    },
  });
  for (const [id, animator] of Object.entries(npcAnimators)) npcFrames[id] = animator.update(dt, { moving: false, carrying: false });

  const currentZone = zoneAt(player.x, player.y);
  if (currentZone !== zoneName) {
    zoneName = currentZone;
    setZoneName(zoneName);
  }
}

function movePlayer(dt) {
  let { dx, dy } = movementVector();
  if (dx || dy) {
    tapTarget = null;
    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
  } else if (tapTarget) {
    const target = tapTarget.target;
    if (target && distanceTo(target) < (target.reach ?? REACH) - 4) {
      tapTarget = null;
      interact(target);
      return;
    }
    const vx = tapTarget.x - player.x;
    const vy = tapTarget.y - player.y;
    const distance = Math.hypot(vx, vy);
    if (distance < 3) {
      tapTarget = null;
    } else {
      dx = vx / distance;
      dy = vy / distance;
    }
  }

  const before = { x: player.x, y: player.y };
  const step = SPEED * dt;
  if (dx && !isBlocked(player.x + dx * step, player.y)) player.x += dx * step;
  if (dy && !isBlocked(player.x, player.y + dy * step)) player.y += dy * step;

  const moved = Math.hypot(player.x - before.x, player.y - before.y);
  player.moving = moved > 0.01;
  if (player.moving) {
    player.step += dt * 8;
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  } else if (tapTarget && (dx || dy)) {
    tapTarget = null; // caminho bloqueado: desiste do toque
  }
}

/** Caixa dos pés do personagem (14 × 7 px) contra blocos sólidos. */
function isBlocked(x, y) {
  const corners = [[x - 7, y - 7], [x + 7, y - 7], [x - 7, y - 1], [x + 7, y - 1]];
  return corners.some(([cx, cy]) => {
    const tx = Math.floor(cx / TILE);
    const ty = Math.floor(cy / TILE);
    return isStaticSolid(tx, ty) || lockedTiles.has(`${tx},${ty}`);
  });
}

function buildInteractables() {
  const list = Object.entries(CHARACTERS).map(([id, npc]) => ({ kind: 'npc', id, ...tileFoot(npc.tile) }));
  for (const sign of SIGNS) {
    list.push({ kind: 'sign', sign, x: sign.x * TILE + 16, y: sign.y * TILE + 28, promptY: sign.y * TILE - 16 });
  }
  for (const barrier of BARRIERS) {
    if (isRegionOpenById(barrier.region)) continue;
    const [tx, ty] = barrier.tiles[1];
    list.push({ kind: 'barrier', barrier, x: tx * TILE + 16, y: ty * TILE + 28, reach: 56 });
  }
  list.push({
    kind: 'core',
    x: CORE.x * TILE + (CORE.w * TILE) / 2,
    y: (CORE.y + CORE.h) * TILE + 2,
    reach: 64,
    promptY: CORE.y * TILE - 34,
  });
  list.push(...questInteractables());
  list.push(...villagerInteractables());
  return list;
}

const distanceTo = (item) => Math.hypot(player.x - item.x, player.y - item.y);

function nearestInteractable() {
  let best = null;
  let bestDistance = Infinity;
  for (const item of interactables) {
    const distance = distanceTo(item);
    if (distance < (item.reach ?? REACH) && distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

/** Toque ou clique no mundo: anda até o ponto ou até o personagem/objeto tocado. */
function handleTap(cssX, cssY) {
  const worldX = camera.x + cssX / zoom;
  const worldY = camera.y + cssY / zoom;
  const touched = interactables.find((item) => Math.hypot(worldX - item.x, worldY - (item.y - 16)) < 26);
  if (touched) {
    if (distanceTo(touched) < (touched.reach ?? REACH)) {
      interact(touched);
      return;
    }
    tapTarget = { x: touched.x, y: touched.y + 22, target: touched };
    return;
  }
  tapTarget = { x: worldX, y: worldY };
}

function updateCamera(dt) {
  const { w, h } = viewSize();
  const clampAxis = (value, size, limit) => (size >= limit ? (limit - size) / 2 : Math.max(0, Math.min(limit - size, value)));
  const targetX = clampAxis(player.x - w / 2, w, MAP_W * TILE);
  const targetY = clampAxis(player.y - 16 - h / 2, h, MAP_H * TILE);
  if (!camera.ready) {
    camera.x = targetX;
    camera.y = targetY;
    camera.ready = true;
    return;
  }
  const follow = Math.min(1, dt * 8);
  camera.x += (targetX - camera.x) * follow;
  camera.y += (targetY - camera.y) * follow;
}

/* ---------- Desenho ---------- */

function faceToward(from) {
  const dx = player.x - from.x;
  const dy = player.y - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

function buildActors() {
  const alertNpc = currentRegion()?.npc;
  const actors = Object.entries(CHARACTERS).map(([id, npc]) => {
    const foot = tileFoot(npc.tile);
    const near = Math.hypot(player.x - foot.x, player.y - foot.y) < FACE_RANGE;
    const frame = npcFrames[id] ?? {};
    return {
      ...foot,
      look: npc.look,
      pose: { dir: near ? faceToward(foot) : npc.facing, pose: frame.pose, scaleX: frame.scaleX, scaleY: frame.scaleY, lift: frame.lift },
      label: npc.name,
      alert: id === alertNpc && isRegionOpenForNpc(id),
    };
  });
  actors.push(...villagerActors(player));
  actors.push({
    x: player.x,
    y: player.y,
    look: playerLook(state.player),
    pose: { dir: player.dir, pose: playerFrame.pose, scaleX: playerFrame.scaleX, scaleY: playerFrame.scaleY, lift: playerFrame.lift },
    frame: playerFrame,
    isPlayer: true,
  });
  return actors;
}

const isRegionOpenForNpc = (npcId) => REGIONS.some((region) => region.npc === npcId && isRegionOpenById(region.id));

function draw() {
  if (!ctx) return;
  const { w, h } = viewSize();
  const doneRegions = new Set(REGIONS.filter(isRegionDone).map((region) => region.id));
  const share = doneRegions.size / REGIONS.length;
  renderWorld(ctx, {
    view: { x: camera.x, y: camera.y, w, h },
    scale: zoom * pixelRatio,
    t: time,
    world: { interactables, ambient },
    actors: buildActors(),
    focus,
    compass: document.body.classList.contains('compass'),
    progress: {
      isDone: (regionId) => doneRegions.has(regionId),
      isOpen: isRegionOpenById,
      energy: share,
      gloom: 0.16 * (1 - share),
    },
  });
}
