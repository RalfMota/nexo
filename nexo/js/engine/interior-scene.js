/* NEXO — Cena de interior (Phaser): o lado de dentro de um prédio
 *
 * Entra com fade quando o jogador aperta E na porta; sai pela porta de baixo (andando
 * pelo vão ou com E). Paredes e móveis são corpos estáticos da Arcade Physics. Uma missão
 * pode assumir o interior de um tipo de prédio (setBuildingHandler): ela diz como é cada
 * andar, coloca objetos, pontos de interação e desenha suas etiquetas.
 */

import Phaser from './phaser.js';
import { engineState } from './engine-state.js';
import { CanvasLayer } from './canvas-layer.js';
import { ActorView, ensureCanvasTexture } from './actor-view.js';
import { createFx } from './fx.js';
import { REACH, createPlayerBody, createMover, animatePlayer, footOf, setImpactSource } from './player.js';
import { defaultRoom, buildingHandler, buildingName } from './interiors.js';
import { doorFoot } from './world-scene.js';
import { paintRoom, furnitureSprite, FURNITURE_SOLID, WALL_H, DOOR_W, TILE } from '../art/interior-art.js';
import { drawPrompt } from '../world/renderer.js';
import { drawCarried, drawEffects, updateQuestLayer, footstep, setSpawnHook } from '../world/quest-layer.js';
import { outlinedText } from '../art/shapes.js';
import { playerLook } from '../data/characters.js';
import { state } from '../core/state.js';
import { setZoneName } from '../ui/hud.js';

const SIDE = 10;
const FRONT = 10;

export class InteriorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Interior', active: false });
  }

  init(data) {
    this.building = data.building;
    this.handler = buildingHandler(this.building.kind);
    this.floor = data.floor ?? this.handler?.startFloor?.() ?? 0;
    this.spawn = data.spawn ?? null;
  }

  create() {
    const spec = this.handler?.room?.(this.floor, this.building) ?? defaultRoom(this.building);
    this.spec = spec;
    const W = spec.cols * TILE;
    const H = spec.rows * TILE;
    this.room = { W, H, doorLeft: Math.round(W / 2 - DOOR_W / 2) };

    ensureCanvasTexture(this, `sala:${spec.key}`, () => paintRoom(spec));
    this.add.image(0, 0, `sala:${spec.key}`).setOrigin(0).setDepth(-1e7);

    // Paredes (corpos estáticos) e o gatilho da saída, logo depois do vão da porta
    this.physics.world.setBounds(0, 0, W, H + 40);
    this.solids = [];
    const wall = (x, y, w, h) => {
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(zone, true);
      this.solids.push(zone);
      return zone;
    };
    wall(0, 0, W, WALL_H + 4);
    wall(0, 0, SIDE, H + 40);
    wall(W - SIDE, 0, SIDE, H + 40);
    wall(0, H - FRONT, this.room.doorLeft, FRONT + 40);
    wall(this.room.doorLeft + DOOR_W, H - FRONT, W - this.room.doorLeft - DOOR_W, FRONT + 40);

    // Móveis (guardados para uma missão poder animá-los: abrir armário, trocar o líquido do caldeirão)
    this.furniture = [];
    for (const item of spec.furniture ?? []) this.furniture.push({ ...item, image: this.addFurniture(item) });

    // Jogador
    const start = this.spawn ?? { x: W / 2, y: H - FRONT - 16 };
    this.playerBody = createPlayerBody(this, start.x, start.y);
    this.physics.add.collider(this.playerBody, this.solids);
    this.mover = createMover(this.playerBody, { interact: (target) => target.onInteract() });
    this.playerView = new ActorView(this);
    this.me = { x: start.x, y: start.y, dir: 'up', moving: false };
    const exitZone = this.add.zone(W / 2, H + 14, DOOR_W, 10);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.playerBody, exitZone, () => this.leave());

    this.overlayLayer = new CanvasLayer(this, 'interior-topo', 1e7);
    this.fx = createFx(this, 1e7 - 1);
    setSpawnHook((x, y) => this.fx.sprout(x, y, 10));
    setImpactSource(() => this.me, () => 'dust');

    this.npcs = (spec.npcs ?? []).map((npc) => ({ ...npc, view: new ActorView(this) }));
    this.interactables = [];
    this.addInteractable({
      x: W / 2,
      y: H - FRONT - 8,
      reach: 26,
      promptY: H - FRONT - 58,
      label: this.handler?.exitLabel?.(this.floor) ?? 'Sair',
      onInteract: () => this.leave(),
    });
    for (const action of spec.actions ?? []) this.addInteractable(action);

    this.overlays = [];
    this.handler?.build?.(this, this.floor);

    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.fx.destroy();
      this.overlayLayer.destroy();
    });
    this.onResize();
    setZoneName(this.handler?.zoneName?.(this.floor) ?? spec.name ?? buildingName(this.building));
    this.cameras.main.fadeFrom(380, 18, 15, 42, true);
    engineState.transitioning = false;
  }

  /* ---------- Construção ---------- */

  addFurniture({ type, variant, x, y }) {
    const s = furnitureSprite(type, variant);
    ensureCanvasTexture(this, s.key, s.canvas);
    const image = this.add.image(x, y, s.key).setOrigin(s.ax / s.canvas.width, s.ay / s.canvas.height).setDepth(y);
    const solid = FURNITURE_SOLID[type];
    if (solid) {
      const zone = this.add.zone(x, y - solid.h / 2, solid.w, solid.h);
      this.physics.add.existing(zone, true);
      this.solids.push(zone);
    }
    if (type === 'fireplace') this.addFire(x, y - 14, y + 1);
    return image;
  }

  /** Fogo da lareira: chamas que tremulam (tween) e faíscas subindo; `depth` fica na frente da lareira. */
  addFire(x, y, depth) {
    const flames = [0, 1, 2].map((i) => this.add.ellipse(x - 7 + i * 7, y, 7, 12, [0xff7a2a, 0xffb43a, 0xffe08a][i]).setOrigin(0.5, 1).setDepth(depth));
    flames.forEach((flame, i) => this.tweens.add({ targets: flame, scaleY: 1.35, scaleX: 0.8, duration: 160 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    this.time.addEvent({ delay: 420, loop: true, callback: () => this.fx?.sparkle(x, y - 6, 2) });
  }

  /** Ponto de interação: { x, y, reach?, label, promptY?, onInteract, enabled? }. */
  addInteractable(item) {
    this.interactables.push(item);
    return item;
  }

  removeInteractable(item) {
    this.interactables = this.interactables.filter((other) => other !== item);
  }

  /** Desenho livre por cima de tudo (etiquetas de missão), em coordenadas do cômodo. */
  addOverlay(draw) {
    this.overlays.push(draw);
  }

  /* ---------- Câmera, entrada e saída ---------- */

  onResize() {
    const cssW = this.scale.width / engineState.dpr;
    const cssH = this.scale.height / engineState.dpr;
    const fit = Math.min(cssW / (this.room.W + 48), cssH / (this.room.H + 64));
    this.zoom = Math.max(1, Math.min(3, fit)) * engineState.dpr;
    this.cameras.main.setZoom(this.zoom);
    this.overlayLayer.resize();
  }

  updateCamera() {
    const cam = this.cameras.main;
    const w = cam.width / this.zoom;
    const h = cam.height / this.zoom;
    const clamp = (value, size, limit) => (size >= limit ? (limit - size) / 2 : Math.max(0, Math.min(limit - size, value)));
    const x = Math.round(clamp(this.me.x - w / 2, w, this.room.W) * this.zoom) / this.zoom;
    const y = Math.round(clamp(this.me.y - 20 - h / 2, h, this.room.H + 8) * this.zoom) / this.zoom;
    cam.scrollX = x - (cam.width - w) / 2;
    cam.scrollY = y - (cam.height - h) / 2;
    this.view = { x, y, w, h };
    return this.view;
  }

  tapAt(cssX, cssY) {
    if (!this.view) return;
    const worldX = this.view.x + (cssX * engineState.dpr) / this.zoom;
    const worldY = this.view.y + (cssY * engineState.dpr) / this.zoom;
    const touched = this.activeInteractables().find((item) => Math.hypot(worldX - item.x, worldY - (item.y - 16)) < 24);
    if (touched) {
      if (Math.hypot(this.me.x - touched.x, this.me.y - touched.y) < (touched.reach ?? REACH)) touched.onInteract();
      else this.mover.walkTo(touched.x, touched.y + 18, touched);
      return;
    }
    this.mover.walkTo(worldX, worldY);
  }

  activeInteractables() {
    return this.interactables.filter((item) => !item.enabled || item.enabled());
  }

  interactFocus() {
    this.focus?.onInteract();
  }

  /** Sai do prédio (volta ao mapa, em frente à porta) ou desce um andar, conforme a missão. */
  leave({ toWorld = false } = {}) {
    if (engineState.transitioning) return;
    const below = toWorld ? null : this.handler?.floorBelow?.(this.floor);
    if (below != null) {
      this.changeFloor(below, this.handler.descendSpawn?.() ?? { x: this.room.W / 2, y: WALL_H + 30 });
      return;
    }
    engineState.transitioning = true;
    this.mover.stop();
    this.cameras.main.fade(320, 18, 15, 42, true);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.wake('Mundo', { spawn: doorFoot(this.building) });
      engineState.transitioning = false;
    });
  }

  /** Vai para outro andar do mesmo prédio (fade, a cena recomeça com o novo andar). */
  changeFloor(floor, spawn = null) {
    if (engineState.transitioning) return;
    engineState.transitioning = true;
    this.mover.stop();
    this.cameras.main.fade(320, 18, 15, 42, true);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ building: this.building, floor, spawn });
    });
  }

  /* ---------- Atualização ---------- */

  update(_, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    engineState.time += dt;
    const t = engineState.time;
    const busy = engineState.isBusy() || engineState.transitioning;
    updateQuestLayer(dt);

    const step = this.mover.update(dt, { busy });
    Object.assign(this.me, { x: step.x, y: step.y, dir: step.dir, moving: step.moving });
    this.focus = null;
    if (!busy) {
      let best = Infinity;
      for (const item of this.activeInteractables()) {
        const distance = Math.hypot(this.me.x - item.x, this.me.y - item.y);
        if (distance < (item.reach ?? REACH) && distance < best) {
          best = distance;
          this.focus = item;
        }
      }
    }
    const view = this.updateCamera();

    const frame = animatePlayer(dt, step.moving, () => footstep(this.me.x, this.me.y, 'dirt'));
    this.playerView.update({
      x: this.me.x,
      y: this.me.y,
      look: playerLook(state.player),
      pose: { dir: this.me.dir, pose: frame.pose, scaleX: frame.scaleX, scaleY: frame.scaleY, lift: frame.lift },
    });
    for (const npc of this.npcs) npc.view.update({ x: npc.x, y: npc.y, look: npc.look, pose: { dir: npc.dir ?? 'down' } });
    this.handler?.update?.(this, dt, t);

    const ctx = this.overlayLayer.begin(view, this.zoom);
    for (const npc of this.npcs) if (npc.label) outlinedText(ctx, npc.label, npc.x, npc.y + 10, { font: '700 10px "Fredoka", sans-serif' });
    for (const draw of this.overlays) draw(ctx, t);
    drawCarried(ctx, this.me.x, this.me.y, t, frame);
    drawEffects(ctx);
    if (this.focus) drawPrompt(ctx, this.focus.x, this.focus.promptY ?? this.focus.y - 72, t);
    // Luz quente do interior e vinheta
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const { width, height } = this.overlayLayer.texture;
    const glow = ctx.createRadialGradient(width / 2, height * 0.4, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.7);
    glow.addColorStop(0, 'rgba(255, 220, 160, .06)');
    glow.addColorStop(1, 'rgba(10, 8, 30, .45)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    this.overlayLayer.end();
  }

  /** Posição do jogador dentro do cômodo. */
  get playerFoot() {
    return footOf(this.playerBody);
  }
}
