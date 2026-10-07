/* NEXO — Motor do jogo (Phaser 3): cria o jogo, troca de cena e expõe o mundo ao resto
 *
 * Cenas: "Mundo" (mapa aberto) e "Interior" (dentro dos prédios). As funções exportadas
 * aqui são as mesmas que o jogo usava antes (startWorld, getPlayerPosition, placePlayer...),
 * então HUD, missões, Diário e Painel do Professor não precisam saber qual cena está ativa.
 *
 * O jogo usa o renderizador de canvas do Phaser: as camadas de canvas (água, etiquetas,
 * chuva, luz) não precisam ser reenviadas à placa de vídeo a cada quadro.
 */

import Phaser from './phaser.js';
import { engineState } from './engine-state.js';
import { WorldScene } from './world-scene.js';
import { InteriorScene } from './interior-scene.js';
import { player, getPlayerFrame as currentFrame } from './player.js';
import { bindInput, clearInput } from '../world/input.js';
import { runtime } from '../core/runtime.js';
import { isDialogueOpen } from '../ui/dialogue.js';
import { isModalOpen } from '../ui/modal.js';
import { BUILDINGS } from '../world/map.js';

let game = null;
let unbindInput = null;
let resizeObserver = null;
let busyElement = null;
let busyTimer = 0;

/**
 * O personagem fica parado enquanto há diálogo, janela ou missão em janela aberta.
 * Missões de mundo (session.inWorld) acontecem no mapa: o jogador continua andando.
 */
export const isWorldBusy = () =>
  Boolean(runtime.session && !runtime.session.inWorld) || isDialogueOpen() || isModalOpen() || engineState.transitioning;

engineState.isBusy = () => Boolean(runtime.session && !runtime.session.inWorld) || isDialogueOpen() || isModalOpen();

const worldScene = () => game?.scene.getScene('Mundo') ?? null;
const interiorScene = () => (game?.scene.isActive('Interior') ? game.scene.getScene('Interior') : null);
const activeScene = () => interiorScene() ?? worldScene();

/** Liga o motor dentro do elemento informado (o Phaser cria o próprio canvas lá dentro). */
export function startWorld(container, { touchPad, touchAction, gameElement }) {
  stopWorld();
  const { width, height } = container.getBoundingClientRect();
  engineState.dpr = Math.min(window.devicePixelRatio || 1, 2);
  engineState.cssZoom = zoomFor(width, height);
  engineState.transitioning = false;

  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: container,
    backgroundColor: '#2d5a33',
    width: Math.max(1, Math.round(width * engineState.dpr)),
    height: Math.max(1, Math.round(height * engineState.dpr)),
    scale: { mode: Phaser.Scale.NONE },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true },
    banner: false,
    scene: [WorldScene, InteriorScene],
  });
  engineState.game = game;
  fitCanvas(width, height);

  resizeObserver = new ResizeObserver(() => {
    const rect = container.getBoundingClientRect();
    engineState.cssZoom = zoomFor(rect.width, rect.height);
    game.scale.resize(Math.max(1, Math.round(rect.width * engineState.dpr)), Math.max(1, Math.round(rect.height * engineState.dpr)));
    fitCanvas(rect.width, rect.height);
  });
  resizeObserver.observe(container);

  unbindInput = bindInput({
    canvas: container,
    touchPad,
    touchAction,
    canMove: () => !isWorldBusy(),
    onInteract: () => activeScene()?.interactFocus?.(),
    onTap: (x, y) => activeScene()?.tapAt?.(x, y),
  });

  busyElement = gameElement;
  busyTimer = setInterval(() => busyElement?.classList.toggle('is-busy', isWorldBusy()), 150);
}

export function stopWorld() {
  unbindInput?.();
  resizeObserver?.disconnect();
  clearInterval(busyTimer);
  game?.destroy(true);
  game = null;
  engineState.game = null;
  engineState.transitioning = false;
  unbindInput = null;
  resizeObserver = null;
  busyElement = null;
  clearInput();
}

/** Cerca de 20 blocos de largura no computador; no celular, escala mínima 1. */
function zoomFor(width, height) {
  return Math.max(1, Math.min(2.5, Math.min(width / 640, height / 400)));
}

/** O canvas tem a resolução do aparelho, mas ocupa o tamanho CSS do contêiner. */
function fitCanvas(width, height) {
  const canvas = game?.canvas;
  if (!canvas) return;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.imageRendering = 'pixelated';
  game.scale.updateBounds();
}

/* ---------- Prédios ---------- */

/** Entra num prédio (fade). `options.floor` escolhe o andar (Torre). */
export function enterBuilding(building, options = {}) {
  const inside = interiorScene();
  if (inside) {
    if (inside.building === building) inside.changeFloor(options.floor ?? inside.floor);
    return;
  }
  worldScene()?.enterBuilding(building, options);
}

/** Sai do prédio em que o jogador está, direto para o mapa (se estiver dentro de um). */
export function exitBuilding() {
  interiorScene()?.leave({ toWorld: true });
}

export const buildingOfKind = (kind) => BUILDINGS.find((building) => building.kind === kind);
export const isInside = (kind) => (kind ? interiorScene()?.building.kind === kind : Boolean(interiorScene()));

/* ---------- Mesmas funções do mundo antigo ---------- */

/** Posição do jogador na cena ativa (dentro de um prédio, em coordenadas do cômodo). */
export function getPlayerPosition() {
  const inside = interiorScene();
  return inside ? { x: inside.me.x, y: inside.me.y } : { x: player.x, y: player.y };
}

/** Posição do jogador no mapa da vila (fora ou, se estiver num prédio, a porta dele). */
export const getMapPosition = () => ({ x: player.x, y: player.y });

/** Põe o personagem num ponto do mapa (viagem rápida, testes). */
export function placePlayer(x, y, dir = 'down') {
  Object.assign(player, { x, y, dir, moving: false });
  worldScene()?.placePlayer?.(x, y, dir);
}

export const getWorldTime = () => engineState.time;

/** Quadro de animação atual do jogador (pose, escala, elevação). */
export const getPlayerFrame = () => currentFrame();
