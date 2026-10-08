/* NEXO — Cena do mapa aberto (Phaser): vila, regiões, personagens e missões no mundo
 *
 * O que é do Phaser aqui:
 *   - laço de jogo, câmera com zoom e acompanhamento suave;
 *   - colisão: camada de blocos (Tilemap) gerada do mapa + Arcade Physics no corpo do
 *     jogador; as rupturas de energia entram e saem da camada conforme as regiões abrem;
 *   - personagens (jogador, guardiões e moradores) e árvores como objetos ordenados pela
 *     altura dos pés; as copas balançam com o vento;
 *   - partículas e transições (fade ao entrar num prédio).
 * Água, grama, objetos das missões, chuva e luz continuam pintados nas duas camadas de
 * canvas (chão e topo), por cima/abaixo dos objetos do Phaser.
 */

import { playSfx } from '../core/sfx.js';
import Phaser from './phaser.js';
import { engineState, worldZoom } from './engine-state.js';
import { CanvasLayer } from './canvas-layer.js';
import { ActorView, ensureCanvasTexture } from './actor-view.js';
import { createFx } from './fx.js';
import { player, REACH, createPlayerBody, createMover, animatePlayer, placeBody, setImpactSource, getPlayerFrame } from './player.js';
import { TILE, MAP_W, MAP_H, BARRIERS, SIGNS, CORE, BUILDINGS, ground, isStaticSolid, tileFoot, zoneAt } from '../world/map.js';
import { getBaseLayer, drawGroundLayer, drawFrontLayer, inFrontOfPlayer, drawOverlayLayer, createAmbient, updateAmbient, TREES, treeSway } from '../world/renderer.js';
import { interact } from '../world/story.js';
import { CHARACTERS, playerLook } from '../data/characters.js';
import { REGIONS } from '../data/regions.js';
import { state } from '../core/state.js';
import { isRegionOpenById, isRegionDone, currentRegion } from '../game/progress.js';
import { setZoneName } from '../ui/hud.js';
import { questInteractables, questObjects, updateQuestLayer, footstep, setSpawnHook } from '../world/quest-layer.js';
import { createAnimator } from '../art/animator.js';
import { updateWeather, weatherNow } from '../world/weather.js';
import { setWindStrength } from '../world/scenery.js';
import { updateVillagers, villagerActors, villagerInteractables } from '../world/villagers.js';
import { treeParts } from '../art/trees.js';

const FACE_RANGE = 90;
const DEPTH = { base: -1e7, ground: -5e6, overlay: 1e7 };

/** Tipo de chão sob um ponto (para a poeira dos passos). */
function groundAt(x, y) {
  const char = ground[Math.floor(y / TILE)]?.[Math.floor(x / TILE)];
  if (char === '=' || char === 'p') return 'dirt';
  if (char === '#') return 'soil';
  return 'grass';
}

/** Ponto em frente à porta de um prédio (onde o jogador para para entrar e reaparece ao sair). */
export const doorFoot = (b) => ({ x: (b.x + b.w / 2) * TILE, y: (b.y + b.h) * TILE + 14 });

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Mundo', active: true });
  }

  create() {
    const width = MAP_W * TILE;
    const height = MAP_H * TILE;

    ensureCanvasTexture(this, 'mundo-base', getBaseLayer());
    this.add.image(0, 0, 'mundo-base').setOrigin(0).setDepth(DEPTH.base);

    this.physics.world.setBounds(0, 0, width, height);
    this.buildCollision();
    this.playerBody = createPlayerBody(this, player.x, player.y);
    this.physics.add.collider(this.playerBody, this.collisionLayer);
    this.mover = createMover(this.playerBody, { interact: (target) => interact(target) });

    this.groundLayer = new CanvasLayer(this, 'mundo-chao', DEPTH.ground);
    this.overlayLayer = new CanvasLayer(this, 'mundo-topo', DEPTH.overlay);
    this.frontLayer = new CanvasLayer(this, 'mundo-frente', DEPTH.ground);
    this.frontUsed = false;
    this.fx = createFx(this, DEPTH.overlay - 1);
    setSpawnHook((x, y) => this.fx.sprout(x, y, 10));

    this.playerView = new ActorView(this);
    this.npcViews = Object.fromEntries(Object.keys(CHARACTERS).map((id) => [id, new ActorView(this)]));
    this.npcAnimators = Object.fromEntries(Object.keys(CHARACTERS).map((id, i) => [id, createAnimator({ phase: i * 0.37 })]));
    this.npcFrames = {};
    this.villagerViews = [];
    this.treePool = [];

    this.ambient = createAmbient();
    this.view = { x: 0, y: 0, w: 0, h: 0 };
    this.cameraReady = false;
    this.focus = null;
    this.interactables = [];
    this.zoneName = '';
    this.lockedKey = '';

    setImpactSource(() => player, (x, y) => (groundAt(x, y) === 'grass' ? 'sparkle' : 'dust'));
    this.scale.on('resize', this.onResize, this);
    this.events.on('wake', this.onWake, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      setSpawnHook(null);
    });
    this.onResize();
    this.cameras.main.fadeFrom(350, 18, 15, 42, true);
  }

  /* ---------- Colisão ---------- */

  buildCollision() {
    if (!this.textures.exists('colisao')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, TILE * 2, TILE);
      g.generateTexture('colisao', TILE * 2, TILE);
      g.destroy();
    }
    // Índice 0 = bloco sólido do mapa; 1 = ruptura (entra e sai conforme as regiões abrem)
    const data = Array.from({ length: MAP_H }, (_, ty) => Array.from({ length: MAP_W }, (_, tx) => (isStaticSolid(tx, ty) ? 0 : -1)));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tiles = map.addTilesetImage('colisao', 'colisao', TILE, TILE, 0, 0);
    this.collisionLayer = map.createLayer(0, tiles, 0, 0).setVisible(false);
    this.collisionLayer.setCollision([0, 1]);
  }

  updateBarriers() {
    const locked = BARRIERS.filter((barrier) => !isRegionOpenById(barrier.region));
    const key = locked.map((barrier) => barrier.region).join(',');
    if (key === this.lockedKey) return;
    this.lockedKey = key;
    for (const barrier of BARRIERS) {
      const isLocked = locked.includes(barrier);
      for (const [tx, ty] of barrier.tiles) {
        if (isLocked) this.collisionLayer.putTileAt(1, tx, ty);
        else if (!isStaticSolid(tx, ty)) this.collisionLayer.removeTileAt(tx, ty);
      }
    }
  }

  /* ---------- Tamanho, câmera e entrada ---------- */

  onResize() {
    this.zoom = worldZoom();
    this.cameras.main.setZoom(this.zoom);
    this.groundLayer.resize();
    this.overlayLayer.resize();
    this.frontLayer.resize();
    this.cameraReady = false;
  }

  onWake(_, data = {}) {
    if (data.spawn) {
      placeBody(this.playerBody, data.spawn.x, data.spawn.y);
      Object.assign(player, { x: data.spawn.x, y: data.spawn.y, dir: 'down' });
    }
    this.mover.stop();
    this.cameraReady = false;
    this.onResize();
    this.cameras.main.fadeFrom(350, 18, 15, 42, true);
    setImpactSource(() => player, (x, y) => (groundAt(x, y) === 'grass' ? 'sparkle' : 'dust'));
    setSpawnHook((x, y) => this.fx.sprout(x, y, 10));
    this.zoneName = '';
  }

  /** Coloca o jogador num ponto (viagem rápida, testes, volta de um interior). */
  placePlayer(x, y, dir = 'down') {
    placeBody(this.playerBody, x, y);
    Object.assign(player, { x, y, dir, moving: false });
    this.mover.stop();
  }

  updateCamera(dt) {
    const cam = this.cameras.main;
    const w = cam.width / this.zoom;
    const h = cam.height / this.zoom;
    const clamp = (value, size, limit) => (size >= limit ? (limit - size) / 2 : Math.max(0, Math.min(limit - size, value)));
    const targetX = clamp(player.x - w / 2, w, MAP_W * TILE);
    const targetY = clamp(player.y - 16 - h / 2, h, MAP_H * TILE);
    if (!this.cameraReady) {
      this.view.x = targetX;
      this.view.y = targetY;
      this.cameraReady = true;
    } else {
      const follow = Math.min(1, dt * 8);
      this.view.x += (targetX - this.view.x) * follow;
      this.view.y += (targetY - this.view.y) * follow;
    }
    // Alinhado à grade de pixels da tela: o mundo e as camadas de canvas não escorregam
    const left = Math.round(this.view.x * this.zoom) / this.zoom;
    const top = Math.round(this.view.y * this.zoom) / this.zoom;
    this.view.w = w;
    this.view.h = h;
    cam.scrollX = left - (cam.width - w) / 2;
    cam.scrollY = top - (cam.height - h) / 2;
    return { x: left, y: top, w, h };
  }

  /** Toque ou clique (em pixels CSS do canvas): anda até o ponto ou até o que foi tocado. */
  tapAt(cssX, cssY) {
    const worldX = this.view.x + (cssX * engineState.dpr) / this.zoom;
    const worldY = this.view.y + (cssY * engineState.dpr) / this.zoom;
    const touched = this.interactables.find((item) => Math.hypot(worldX - item.x, worldY - (item.y - 16)) < 26);
    if (touched) {
      if (Math.hypot(player.x - touched.x, player.y - touched.y) < (touched.reach ?? REACH)) {
        interact(touched);
        return;
      }
      this.mover.walkTo(touched.x, touched.y + 22, touched);
      return;
    }
    this.mover.walkTo(worldX, worldY);
  }

  interactFocus() {
    if (this.focus) interact(this.focus);
  }

  /* ---------- Atualização ---------- */

  buildInteractables() {
    const list = Object.entries(CHARACTERS).map(([id, npc]) => ({ kind: 'npc', id, ...tileFoot(npc.tile) }));
    for (const sign of SIGNS) list.push({ kind: 'sign', sign, x: sign.x * TILE + 16, y: sign.y * TILE + 28, promptY: sign.y * TILE - 16 });
    for (const barrier of BARRIERS) {
      if (isRegionOpenById(barrier.region)) continue;
      const [tx, ty] = barrier.tiles[1];
      list.push({ kind: 'barrier', barrier, x: tx * TILE + 16, y: ty * TILE + 28, reach: 56 });
    }
    list.push({ kind: 'core', x: CORE.x * TILE + (CORE.w * TILE) / 2, y: (CORE.y + CORE.h) * TILE + 2, reach: 64, promptY: CORE.y * TILE - 34 });
    for (const building of BUILDINGS) {
      const foot = doorFoot(building);
      list.push({ kind: 'door', building, ...foot, reach: 24, promptY: foot.y - 50 });
    }
    list.push(...questInteractables());
    list.push(...villagerInteractables());
    return list;
  }

  nearestInteractable() {
    let best = null;
    let bestDistance = Infinity;
    for (const item of this.interactables) {
      const distance = Math.hypot(player.x - item.x, player.y - item.y);
      if (distance < (item.reach ?? REACH) && distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  update(_, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    engineState.time += dt;
    const t = engineState.time;
    const busy = engineState.isBusy() || engineState.transitioning;

    updateAmbient(this.ambient, dt, t, this.view);
    updateWeather(dt, this.view);
    setWindStrength(weatherNow().wind);
    updateQuestLayer(dt);
    updateVillagers(dt, player);
    this.updateBarriers();
    this.interactables = this.buildInteractables();

    const step = this.mover.update(dt, { busy });
    Object.assign(player, { x: step.x, y: step.y, dir: step.dir, moving: step.moving });
    this.focus = busy ? null : this.nearestInteractable();
    const view = this.updateCamera(dt);

    const frame = animatePlayer(dt, step.moving, () => footstep(player.x, player.y, groundAt(player.x, player.y)));
    for (const [id, animator] of Object.entries(this.npcAnimators)) this.npcFrames[id] = animator.update(dt, { moving: false, carrying: false });

    const zone = zoneAt(player.x, player.y);
    if (zone !== this.zoneName) {
      this.zoneName = zone;
      setZoneName(zone);
    }

    const actors = this.updateActors(frame, t);
    this.updateTrees(t, view);
    this.drawLayers(t, view, actors);
  }

  faceToward(from) {
    const dx = player.x - from.x;
    const dy = player.y - from.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  /** Atualiza os sprites dos personagens e devolve a lista (para nomes e alertas na camada de cima). */
  updateActors(frame) {
    const alertNpc = currentRegion()?.npc;
    const actors = [];
    for (const [id, npc] of Object.entries(CHARACTERS)) {
      const foot = tileFoot(npc.tile);
      const near = Math.hypot(player.x - foot.x, player.y - foot.y) < FACE_RANGE;
      const f = this.npcFrames[id] ?? {};
      const actor = {
        ...foot,
        look: npc.look,
        pose: { dir: near ? this.faceToward(foot) : npc.facing, pose: f.pose, scaleX: f.scaleX, scaleY: f.scaleY, lift: f.lift },
        label: npc.name,
        alert: id === alertNpc && REGIONS.some((region) => region.npc === id && isRegionOpenById(region.id)),
      };
      this.npcViews[id].update(actor);
      actors.push(actor);
    }
    const villagers = villagerActors(player);
    while (this.villagerViews.length < villagers.length) this.villagerViews.push(new ActorView(this));
    villagers.forEach((actor, i) => this.villagerViews[i].update(actor));
    actors.push(...villagers);

    const me = {
      x: player.x,
      y: player.y,
      look: playerLook(state.player),
      pose: { dir: player.dir, pose: frame.pose, scaleX: frame.scaleX, scaleY: frame.scaleY, lift: frame.lift },
      frame,
      isPlayer: true,
    };
    this.playerView.update(me);
    actors.push(me);
    return actors;
  }

  /** Árvores visíveis: um conjunto reaproveitado de objetos (só o que a câmera vê existe na cena). */
  updateTrees(t, view) {
    const strength = weatherNow().wind;
    const visible = TREES.filter((tree) => tree.x > view.x - 40 && tree.x < view.x + view.w + 40 && tree.y > view.y - 4 && tree.y < view.y + view.h + 80);
    while (this.treePool.length < visible.length) this.treePool.push(this.makeTree());
    this.treePool.forEach((view3, i) => {
      const tree = visible[i];
      if (!tree) {
        view3.container.setVisible(false);
        return;
      }
      if (view3.variant !== tree.variant) this.dressTree(view3, tree.variant);
      const sway = treeSway(tree, t, strength);
      const bend = [sway, sway * 0.55, sway * 0.2];
      view3.slices.forEach((slice, k) => slice.setX(view3.parts.slices[k].x + Math.round(bend[k])));
      view3.container.setPosition(tree.x, tree.y).setDepth(tree.y).setVisible(true);
    });
  }

  makeTree() {
    const shadow = this.add.ellipse(3, -2, 40, 12, 0x142814, 0.28);
    const trunk = this.add.image(0, 0, '__DEFAULT').setOrigin(0);
    const slices = [0, 1, 2].map(() => this.add.image(0, 0, '__DEFAULT').setOrigin(0));
    const container = this.add.container(0, 0, [shadow, trunk, ...slices]);
    return { container, trunk, slices, variant: -1, parts: null };
  }

  dressTree(view, variant) {
    const parts = treeParts(variant);
    view.parts = parts;
    view.variant = variant;
    view.trunk.setTexture(ensureCanvasTexture(this, `arvore-${variant}-tronco`, parts.art.trunk)).setPosition(parts.trunk.x, parts.trunk.y);
    view.slices.forEach((slice, k) => {
      slice.setTexture(ensureCanvasTexture(this, `arvore-${variant}-copa${k}`, parts.art.slices[k])).setPosition(parts.slices[k].x, parts.slices[k].y);
    });
  }

  drawLayers(t, view, actors) {
    const doneRegions = new Set(REGIONS.filter(isRegionDone).map((region) => region.id));
    const share = doneRegions.size / REGIONS.length;
    const frame = {
      view,
      t,
      world: { interactables: this.interactables, ambient: this.ambient },
      actors,
      player: actors.find((actor) => actor.isPlayer),
      focus: this.focus,
      compass: document.body.classList.contains('compass'),
      progress: {
        isDone: (regionId) => doneRegions.has(regionId),
        isOpen: isRegionOpenById,
        energy: share,
        gloom: 0.16 * (1 - share),
      },
    };
    const groundCtx = this.groundLayer.begin(view, this.zoom);
    drawGroundLayer(groundCtx, frame);
    this.groundLayer.end();
    // Objetos na frente do jogador: a camada fica logo acima dos pés dele. Sem nenhum objeto
    // na frente (o caso comum), a camada nem é limpa nem redesenhada.
    const front = frame.player && questObjects().some((object) => inFrontOfPlayer(object, frame.player));
    if (front || this.frontUsed) {
      const frontCtx = this.frontLayer.begin(view, this.zoom);
      if (front) drawFrontLayer(frontCtx, frame);
      this.frontLayer.end();
      this.frontUsed = front;
    }
    this.frontLayer.image.setDepth(frame.player ? frame.player.y + 0.25 : DEPTH.ground);
    const overlayCtx = this.overlayLayer.begin(view, this.zoom);
    drawOverlayLayer(overlayCtx, frame, this.overlayLayer.texture);
    this.overlayLayer.end();
  }

  /* ---------- Entrar num prédio ---------- */

  enterBuilding(building, options = {}) {
    if (engineState.transitioning) return;
    playSfx('porta');
    engineState.transitioning = true;
    this.mover.stop();
    this.cameras.main.fade(320, 18, 15, 42, true);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep();
      this.scene.run('Interior', { building, ...options });
    });
  }

  get frame() {
    return getPlayerFrame();
  }
}
