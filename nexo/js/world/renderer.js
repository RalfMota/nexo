/* NEXO — Desenho do mundo: camada fixa (pintada uma vez) e camadas animadas
 *
 * Com o Phaser, personagens e árvores são objetos da cena (ordenados pela altura dos pés).
 * Este módulo pinta o resto: a camada fixa do mapa (vira uma textura), a camada de chão
 * (abaixo dos personagens) e a camada de cima (acima deles), além da miniatura do Mapa.
 */

import { TILE, MAP_W, MAP_H, ground, BUILDINGS, PROPS, CORE, BARRIERS, DECOR } from './map.js';
import { paintDecor } from '../art/decor.js';
import { paintTerrain } from '../art/terrain.js';
import {
  paintBuilding, paintProp, paintCoreBase,
  drawLampLight, drawCrystalProp, drawGearProp, drawFountainWater, drawBarrier,
  drawCoreCrystal, drawTowerCrystal, drawStationSignal, drawSmoke,
} from '../art/structures.js';
import { outlinedText } from '../art/shapes.js';
import { drawQuestObjects, drawCarried, drawEffects, isAnchored } from './quest-layer.js';
import { drawGrass, drawWater, drawLeaves, drawLight, updateScenery, wind } from './scenery.js';
import { TREE_VARIANTS } from '../art/trees.js';
import { weatherNow, drawSplashes, drawWeatherScreen } from './weather.js';
import { hash } from '../art/shapes.js';
import { prefersCalm } from '../core/state.js';

/* Árvores: uma por bloco de mata, com pequenas variações de posição e de espécie.
 * São desenhadas a cada quadro, junto com os personagens, para o vento e a profundidade. */
export const TREES = [];
ground.forEach((row, ty) => row.forEach((char, tx) => {
  if (char !== 'T') return;
  const r = hash(tx, ty, 500);
  const variant = r < 0.24 ? 3 + (hash(tx, ty, 501) > 0.5 ? 1 : 0) // pinheiros
    : r < 0.3 ? 2 // macieira
      : r < 0.33 ? 5 // florida
        : r < 0.36 ? 6 // outono
          : hash(tx, ty, 502) > 0.5 ? 0 : 1;
  TREES.push({
    x: tx * TILE + 16 + Math.round((hash(tx, ty, 503) - 0.5) * 10),
    y: ty * TILE + 28 + Math.round(hash(tx, ty, 504) * 5),
    variant: variant % TREE_VARIANTS,
    phase: hash(tx, ty, 505) * 3,
  });
}));

let baseLayer = null;

/** Camada fixa do mapa inteiro: terreno, árvores, construções e partes paradas dos objetos. */
export function getBaseLayer() {
  if (baseLayer) return baseLayer;
  baseLayer = document.createElement('canvas');
  baseLayer.width = MAP_W * TILE;
  baseLayer.height = MAP_H * TILE;
  const ctx = baseLayer.getContext('2d');
  paintTerrain(ctx, ground);

  // Objetos e construções de cima para baixo, para que o que está mais ao sul fique na frente
  const drawables = [
    ...DECOR.map((item) => ({ bottom: item.y + (item.solid ? 1 : 0.5), paint: () => paintDecor(ctx, item) })),
    ...PROPS.map((prop) => ({ bottom: prop.y + (prop.h ?? 1), paint: () => paintProp(ctx, prop) })),
    ...BUILDINGS.map((b) => ({ bottom: b.y + b.h, paint: () => paintBuilding(ctx, b) })),
    { bottom: CORE.y + CORE.h, paint: () => paintCoreBase(ctx, CORE) },
  ];
  drawables.sort((a, b) => a.bottom - b.bottom).forEach((item) => item.paint());
  return baseLayer;
}

const isVisible = (x, y, w, h, view) =>
  x + w > view.x - 64 && x < view.x + view.w + 64 && y + h > view.y - 64 && y < view.y + view.h + 64;

/** Balanço de uma árvore com o vento (pixels no topo da copa). */
export function treeSway(tree, t, strength = 1) {
  if (prefersCalm()) return 0;
  return (wind(tree.x, tree.y, t + tree.phase) * 1.3 + Math.sin(t * 2.3 + tree.phase * 4) * 0.5) * strength;
}

/**
 * Camada de chão (abaixo de personagens e árvores, que são objetos do Phaser):
 * água e grama animadas, fumaça, luzes dos postes, cristais, engrenagens, rupturas,
 * o cristal do Núcleo e os objetos das missões no mapa.
 * @param {object} frame { view, t, world, focus, compass, progress, player }
 */
export function drawGroundLayer(ctx, frame) {
  const { view, t, world, compass, progress, player } = frame;
  drawWater(ctx, t, view);
  drawGrass(ctx, t, view, player);

  for (const b of BUILDINGS) {
    if (b.kind === 'house' || b.kind === 'lab') drawSmoke(ctx, b, t + b.x);
    if (b.kind === 'tower') drawTowerCrystal(ctx, b, progress.isDone('r5') ? 1 : 0, t);
    if (b.kind === 'station') drawStationSignal(ctx, b, progress.isDone('r4'), t);
  }

  for (const prop of PROPS) {
    if (!isVisible(prop.x * TILE, prop.y * TILE, TILE * 2, TILE * 2, view)) continue;
    if (prop.type === 'lamp') drawLampLight(ctx, prop, progress.isDone(prop.region), t);
    else if (prop.type === 'crystal') drawCrystalProp(ctx, prop, t);
    else if (prop.type === 'gear') drawGearProp(ctx, prop, t, progress.isDone('r3') ? 1.4 : 0.35);
    else if (prop.type === 'fountain') drawFountainWater(ctx, prop, t);
  }

  for (const barrier of BARRIERS) {
    if (!progress.isOpen(barrier.region)) drawBarrier(ctx, barrier.tiles, t);
  }

  drawCoreCrystal(ctx, CORE, progress.energy, t);
  drawQuestObjects(ctx, t, (object) => !inFrontOfPlayer(object, player));
  if (compass) drawCompassRings(ctx, world.interactables, t);
}

/** Objeto de missão com os pés mais abaixo que os do jogador: aparece na frente dele. */
export const inFrontOfPlayer = (object, player) => Boolean(player) && isAnchored(object) && object.y > player.y;

/**
 * Camada da frente: objetos de missão que estão mais perto da câmera que o jogador. A cena
 * põe esta camada logo acima do jogador (profundidade = altura dos pés dele), então máquinas
 * altas cobrem o personagem quando ele passa por trás delas.
 */
export function drawFrontLayer(ctx, frame) {
  drawQuestObjects(ctx, frame.t, (object) => inFrontOfPlayer(object, frame.player));
}

/**
 * Camada de cima: nomes e alertas dos personagens, o que o jogador carrega, partículas,
 * folhas, respingos, o "E" de interação, ambiente e, por fim, os efeitos de tela.
 * @param {object} frame { view, t, world, actors, focus, progress, zoom }
 * @param {{ width: number, height: number }} screen tamanho do canvas da camada
 */
export function drawOverlayLayer(ctx, frame, screen) {
  const { view, t, world, actors, focus, progress } = frame;
  for (const actor of actors) {
    if (actor.label) outlinedText(ctx, actor.label, actor.x, actor.y + 10, { font: '700 10px "Fredoka", sans-serif' });
    if (actor.alert) drawAlert(ctx, actor.x, actor.y - 64 + Math.sin(t * 4) * 3);
    if (actor.isPlayer) drawCarried(ctx, actor.x, actor.y, t, actor.frame);
  }

  drawEffects(ctx);
  drawLeaves(ctx);
  drawSplashes(ctx);
  if (focus) drawPrompt(ctx, focus.x, focus.promptY ?? focus.y - 72, t);
  drawAmbient(ctx, world.ambient, t, view);

  // Efeitos de tela (sem câmera)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawScreenEffects(ctx, screen.width, screen.height, t, progress.gloom);
}

/** Luz do sol, clima, penumbra das regiões desligadas e vinheta. */
export function drawScreenEffects(ctx, width, height, t, gloom = 0) {
  const weather = weatherNow();
  drawLight(ctx, width, height, t, weather.sun);
  drawWeatherScreen(ctx, width, height, t);
  if (gloom > 0) {
    ctx.fillStyle = `rgba(60, 36, 110, ${gloom})`;
    ctx.fillRect(0, 0, width, height);
  }
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75);
  vignette.addColorStop(0, 'rgba(10, 8, 30, 0)');
  vignette.addColorStop(1, 'rgba(10, 8, 30, .38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export function drawAlert(ctx, x, y) {
  ctx.fillStyle = '#4f3019';
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf6b';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(x - 1, y - 5, 3, 6);
  ctx.fillRect(x - 1, y + 3, 3, 2);
}

export function drawPrompt(ctx, x, y, t) {
  const bob = Math.sin(t * 5) * 2;
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(x - 12, y - 12 + bob, 24, 22);
  ctx.fillStyle = '#fbf1d9';
  ctx.fillRect(x - 10, y - 10 + bob, 20, 18);
  outlinedText(ctx, 'E', x, y + bob, { font: '700 13px "Fredoka", sans-serif', fill: '#4f3019', stroke: '#fbf1d9' });
}

function drawCompassRings(ctx, interactables, t) {
  ctx.lineWidth = 2;
  for (const item of interactables) {
    const pulse = (t * 1.2 + item.x * 0.01) % 1;
    ctx.strokeStyle = `rgba(255, 207, 107, ${1 - pulse})`;
    ctx.beginPath();
    ctx.ellipse(item.x, item.y - 2, 12 + pulse * 16, 5 + pulse * 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* Ambiente: partículas de energia, borboletas e sombras de nuvens */
export function createAmbient() {
  const random = (min, max) => min + Math.random() * (max - min);
  const W = MAP_W * TILE;
  const H = MAP_H * TILE;
  return {
    motes: Array.from({ length: 90 }, () => ({ x: random(0, W), y: random(0, H), speed: random(8, 22), phase: random(0, 6) })),
    butterflies: Array.from({ length: 14 }, (_, i) => ({ x: random(80, W - 80), y: random(80, H - 80), phase: random(0, 6), color: ['#fff3a8', '#ff9fc0', '#c6b4ff', '#ffffff'][i % 4] })),
    clouds: Array.from({ length: 6 }, () => ({ x: random(0, W), y: random(0, H), r: random(90, 160) })),
  };
}

export function updateAmbient(ambient, dt, t, view = { x: 0, y: 0, w: 0, h: 0 }) {
  updateScenery(dt, t, view);
  const W = MAP_W * TILE;
  const H = MAP_H * TILE;
  for (const mote of ambient.motes) {
    mote.y -= mote.speed * dt;
    mote.x += Math.sin(t + mote.phase) * 8 * dt;
    if (mote.y < 0) {
      mote.y = H;
      mote.x = Math.random() * W;
    }
  }
  for (const butterfly of ambient.butterflies) {
    butterfly.x += Math.cos(t * 0.7 + butterfly.phase) * 22 * dt;
    butterfly.y += Math.sin(t * 1.1 + butterfly.phase * 2) * 16 * dt;
  }
  for (const cloud of ambient.clouds) {
    cloud.x += 14 * dt;
    if (cloud.x - cloud.r > W) cloud.x = -cloud.r;
  }
}

function drawAmbient(ctx, ambient, t, view) {
  ctx.fillStyle = `rgba(30, 40, 60, ${weatherNow().clouds})`;
  for (const cloud of ambient.clouds) {
    if (!isVisible(cloud.x - cloud.r, cloud.y - cloud.r, cloud.r * 2, cloud.r * 2, view)) continue;
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.r, cloud.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const butterfly of ambient.butterflies) {
    if (!isVisible(butterfly.x, butterfly.y, 4, 4, view)) continue;
    const flap = Math.abs(Math.sin(t * 14 + butterfly.phase)) * 3 + 1;
    ctx.fillStyle = butterfly.color;
    ctx.fillRect(butterfly.x - flap, butterfly.y, flap, 3);
    ctx.fillRect(butterfly.x + 1, butterfly.y, flap, 3);
  }
  ctx.fillStyle = 'rgba(170, 255, 240, .75)';
  for (const mote of ambient.motes) {
    if (isVisible(mote.x, mote.y, 2, 2, view)) ctx.fillRect(mote.x, mote.y, 2, 2);
  }
}

/** Miniatura do mapa para a janela "Mapa". */
export function renderMinimap(canvas, { playerX, playerY, isOpen }) {
  const base = getBaseLayer();
  const scale = canvas.width / base.width;
  canvas.height = Math.round(base.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
  for (const barrier of BARRIERS) {
    if (isOpen(barrier.region)) continue;
    ctx.fillStyle = '#8a4fe0';
    for (const [x, y] of barrier.tiles) ctx.fillRect(x * TILE * scale, y * TILE * scale, TILE * scale, TILE * scale);
  }
  ctx.fillStyle = '#ff5a3d';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(playerX * scale, playerY * scale, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

