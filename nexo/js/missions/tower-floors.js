/* NEXO — Grade de Energia (Torre dos Padrões), jogada por dentro da Torre, andar por andar
 *
 * hastes = 3 × módulos + 1. Em vez de mostradores, a relação acende na parede:
 *   1º, 2º e 3º andares (1, 2 e 3 módulos): o jogador pega hastes no monte e acende a grade
 *     da parede no pedestal de energia, uma haste por vez. A ordem em que as hastes acendem
 *     (a primeira, e depois 3 por módulo) mostra o padrão. Grade completa: a porta abre.
 *   4º andar (previsão, 10 módulos): a grade está apagada. Carrega o carrinho com feixes de
 *     10 e hastes soltas e puxa a alavanca: as hastes acendem em sequência; faltando, as
 *     vazias piscam em vermelho; sobrando, as extras caem no chão.
 *   5º andar (regra): põe blocos de energia (quanto cada módulo acrescenta) e engrenagens
 *     (hastes fixas) nos pedestais; as 12 lâmpadas dos andares acendem em tempo real
 *     (verde: a regra acerta aquele andar). Todas verdes + alavanca: o observatório abre.
 *
 * Eventos de pesquisa: previsão { modulos, previsao, real } e regra { a, b, acertos }, como antes.
 */

import { setBuildingHandler } from '../engine/interiors.js';
import { enterBuilding, exitBuilding, isInside, buildingOfKind } from '../engine/engine.js';
import { ensureCanvasTexture } from '../engine/actor-view.js';
import { popIn } from '../engine/fx.js';
import { setCarried, clearQuestLayer, playAction } from '../world/quest-layer.js';
import { drawTag } from './world-kit.js';
import { WALL_H } from '../art/interior-art.js';
import { drawRodPile } from '../art/mission-props.js';
import {
  CELL, rodSprite, glowCanvas, doorSprite, blockSprite, gearSprite, crateSprite, lampSprite,
  rodPileSprite, cartSprite, leverSprite, pedestalSprite,
} from '../art/tower-art.js';

const rods = (modules) => 3 * modules + 1;
const BIG = 10;
const LAMPS = 12;
const MAX_HAND = 40;
const MAX_PIECES = 8;
const W = 13 * 32;
const H = 10 * 32;
const DOOR = { x: 372, y: WALL_H };
const GRID_TOP = 30;
const GRID_CX = 196;

const FLOOR_NAMES = ['', '1º andar', '2º andar', '3º andar', '4º andar', 'Topo da Torre'];

/** Hastes de uma grade de n módulos, na ordem em que acendem: a primeira de pé, depois 3 por módulo. */
function gridSegments(modules) {
  const left = Math.round(GRID_CX - (modules * CELL) / 2);
  const segs = [{ x: left - 3, y: GRID_TOP - 2, horizontal: false }];
  for (let i = 0; i < modules; i++) {
    const cellLeft = left + i * CELL;
    segs.push({ x: cellLeft - 2, y: GRID_TOP - 3, horizontal: true });
    segs.push({ x: cellLeft - 2, y: GRID_TOP + CELL - 3, horizontal: true });
    segs.push({ x: cellLeft + CELL - 3, y: GRID_TOP - 2, horizontal: false });
  }
  return segs.map((seg) => ({ ...seg, cx: seg.horizontal ? seg.x + (CELL + 4) / 2 : seg.x + 3, cy: seg.horizontal ? seg.y + 3 : seg.y + (CELL + 4) / 2 }));
}

/** Imagem de um sprite de pixel art na cena (textura criada na primeira vez). */
function place(scene, key, entry, x, y, depth = y) {
  ensureCanvasTexture(scene, key, entry.canvas);
  return scene.add.image(x, y, key).setOrigin(entry.ax / entry.canvas.width, entry.ay / entry.canvas.height).setDepth(depth);
}

function createTowerMission(api) {
  const s = {
    active: true,
    won: false,
    maxFloor: 1,
    lit: { 1: 0, 2: 0, 3: 0 },
    done: { 1: false, 2: false, 3: false, 4: false },
    hand: { kind: null, items: [] }, // kind: 'rod' | 'block' | 'gear'; items: valores (10 ou 1 para hastes)
    load: [],
    a: 0,
    b: 0,
    floorRows: [],
    guesses: [],
  };
  let ui = null; // objetos do andar atual (recriados a cada visita)

  const handCount = () => s.hand.items.reduce((sum, value) => sum + value, 0);

  /* ---------- O que o jogador carrega ---------- */

  function refreshHands() {
    if (!s.hand.items.length) {
      s.hand.kind = null;
      setCarried(null);
      return;
    }
    const kind = s.hand.kind;
    setCarried({
      label: kind === 'rod' ? 'hastes de luz' : kind === 'block' ? 'blocos de energia' : 'engrenagens',
      draw: (ctx) => {
        if (kind === 'rod') {
          drawRodPile(ctx, 0, 8, s.hand.items.includes(10));
        } else {
          const entry = kind === 'block' ? blockSprite() : gearSprite();
          const shown = Math.min(3, s.hand.items.length);
          for (let i = 0; i < shown; i++) ctx.drawImage(entry.canvas, -entry.ax - 6 + i * 6, 6 - entry.ay - (i % 2) * 3);
        }
        drawTag(ctx, 0, -14, String(handCount()));
      },
    });
  }

  function take(kind, value, limit) {
    if (s.hand.kind && s.hand.kind !== kind) {
      api.say('Suas mãos já estão ocupadas com outra coisa. Use ou devolva antes.', 'warn');
      return false;
    }
    if (handCount() + value > limit) {
      api.say('Suas mãos estão cheias.', 'warn');
      return false;
    }
    s.hand.kind = kind;
    s.hand.items.push(value);
    playAction('crouch');
    refreshHands();
    return true;
  }

  function emptyHands() {
    s.hand = { kind: null, items: [] };
    refreshHands();
  }

  /* ---------- Registro ---------- */

  const recordFloors = () => api.record(['Módulos', 'Hastes'], s.floorRows, 'Registro dos andares');
  const recordPrediction = () => api.record(['Módulos', 'Hastes'], [...s.floorRows, ...s.guesses], 'Registro dos andares');

  /* ---------- Peças comuns de um andar ---------- */

  function buildDoor(scene, floor, isOpen, onEnter) {
    const door = place(scene, `torre:porta:${isOpen()}`, doorSprite(isOpen()), DOOR.x, DOOR.y, 5);
    const glow = scene.add.image(DOOR.x, DOOR.y - 26, ensureCanvasTexture(scene, 'torre:brilho-porta', () => glowCanvas(70, '255, 220, 140'))).setDepth(6).setBlendMode('ADD').setAlpha(isOpen() ? 0.6 : 0);
    scene.addInteractable({
      x: DOOR.x,
      y: WALL_H + 16,
      reach: 26,
      promptY: WALL_H - 64,
      label: 'Subir',
      enabled: isOpen,
      onInteract: onEnter,
    });
    return {
      open() {
        const entry = doorSprite(true);
        door.setTexture(ensureCanvasTexture(scene, 'torre:porta:true', entry.canvas));
        scene.tweens.add({ targets: glow, alpha: { from: 1, to: 0.6 }, duration: 900 });
        scene.tweens.add({ targets: door, scaleX: { from: 1.15, to: 1 }, duration: 380, ease: 'Back.Out' });
        scene.fx.sparkle(DOOR.x, DOOR.y - 30, 22);
        scene.cameras.main.shake(180, 0.002);
      },
    };
  }

  /** Grade da parede: soquetes, hastes acesas e brilhos. */
  function buildGrid(scene, modules, { hidden = false } = {}) {
    const segs = gridSegments(modules);
    const glowKey = ensureCanvasTexture(scene, 'torre:brilho', () => glowCanvas(30));
    const parts = segs.map((seg) => {
      const socket = place(scene, `torre:haste:${seg.horizontal ? 'h' : 'v'}:off`, rodSprite(seg.horizontal, 'off'), seg.x, seg.y, 3).setOrigin(0).setAlpha(hidden ? 0 : 1);
      const rod = place(scene, `torre:haste:${seg.horizontal ? 'h' : 'v'}:on`, rodSprite(seg.horizontal, 'on'), seg.x, seg.y, 4).setOrigin(0).setAlpha(0);
      const bad = place(scene, `torre:haste:${seg.horizontal ? 'h' : 'v'}:bad`, rodSprite(seg.horizontal, 'bad'), seg.x, seg.y, 4).setOrigin(0).setAlpha(0);
      const glow = scene.add.image(seg.cx, seg.cy, glowKey).setDepth(5).setBlendMode('ADD').setAlpha(0);
      return { seg, socket, rod, bad, glow, lit: false };
    });
    if (hidden) {
      // Placa escura cobrindo a grade (só a moldura aparece)
      const left = Math.round(GRID_CX - (modules * CELL) / 2) - 8;
      const plate = scene.add.rectangle(left, GRID_TOP - 10, modules * CELL + 16, CELL + 20, 0x14122a, 0.85).setOrigin(0).setDepth(2);
      plate.setStrokeStyle(2, 0x5a3fc4, 1);
    }
    return {
      parts,
      light(index, { instant = false, delay = 0 } = {}) {
        const part = parts[index];
        if (!part || part.lit) return;
        part.lit = true;
        part.socket.setAlpha(1);
        if (instant) {
          part.rod.setAlpha(1);
          part.glow.setAlpha(0.35);
          return;
        }
        scene.tweens.add({ targets: part.rod, alpha: 1, duration: 160, delay });
        scene.tweens.add({ targets: part.glow, alpha: { from: 1, to: 0.35 }, duration: 600, delay, onStart: () => scene.fx.sparkle(part.seg.cx, part.seg.cy, 4) });
      },
      showMissing(from) {
        parts.slice(from).forEach((part) => {
          part.socket.setAlpha(1);
          scene.tweens.add({ targets: part.bad, alpha: { from: 0, to: 1 }, duration: 260, yoyo: true, repeat: 3 });
        });
      },
      reset() {
        parts.forEach((part) => {
          part.lit = false;
          part.rod.setAlpha(0);
          part.glow.setAlpha(0);
          if (hidden) part.socket.setAlpha(0);
        });
      },
    };
  }

  /** Hastes que sobraram caem da parede e quicam no chão. */
  function dropExtras(scene, count) {
    const pieces = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      const x = GRID_CX - 60 + Math.random() * 120;
      const rod = place(scene, 'torre:haste:h:on', rodSprite(true, 'on'), x, GRID_TOP, 200).setOrigin(0.5).setAngle(Math.random() * 60 - 30);
      scene.tweens.add({ targets: rod, y: WALL_H + 30 + Math.random() * 30, angle: Math.random() * 180, duration: 700 + i * 40, ease: 'Bounce.Out' });
      pieces.push(rod);
    }
    return pieces;
  }

  /* ---------- 1º a 3º andares: acender a grade uma haste por vez ---------- */

  function buildCountingFloor(scene, floor) {
    const modules = floor;
    const need = rods(modules);
    const grid = buildGrid(scene, modules);
    for (let i = 0; i < s.lit[floor]; i++) grid.light(i, { instant: true });
    const door = buildDoor(scene, floor, () => s.done[floor], () => goUp(scene, floor));

    const rack = place(scene, 'torre:monte:false', rodPileSprite(false), 64, 250);
    popIn(scene, rack, scene.fx, { delay: 200 });
    scene.addInteractable({ x: 64, y: 262, reach: 30, label: 'Monte de hastes', onInteract: () => take('rod', 1, 12) });

    const pedestal = place(scene, 'torre:pedestal', pedestalSprite(), GRID_CX, 152);
    popIn(scene, pedestal, scene.fx, { delay: 350 });
    scene.addInteractable({
      x: GRID_CX,
      y: 164,
      reach: 30,
      label: 'Pedestal de energia',
      onInteract: () => {
        if (s.done[floor]) {
          api.say('Esta grade já está completa. Suba pela porta acesa.', 'ok');
          return;
        }
        if (s.hand.kind !== 'rod' || !s.hand.items.length) {
          api.say('Pegue hastes no monte e traga até o pedestal de energia.', 'warn');
          return;
        }
        s.hand.items.pop();
        refreshHands();
        playAction('use');
        grid.light(s.lit[floor]);
        s.lit[floor]++;
        if (s.lit[floor] === need) completeFloor(scene, floor, door);
      },
    });

    scene.addOverlay((ctx, t) => {
      drawTag(ctx, GRID_CX, 14, `${FLOOR_NAMES[floor]} · ${modules} ${modules === 1 ? 'módulo' : 'módulos'}`, { fill: '#1d1a38', ink: '#cfe0ff' });
      drawTag(ctx, GRID_CX, GRID_TOP + CELL + 14, s.done[floor] ? `${modules} ${modules === 1 ? 'módulo' : 'módulos'} = ${need} hastes` : `hastes acesas: ${s.lit[floor]}`, s.done[floor] ? { fill: '#c8f5c0' } : undefined);
      drawPlaque(ctx);
      if (!s.done[floor] && s.hand.kind === 'rod') drawBounce(ctx, GRID_CX, 104, t);
    });
  }

  function completeFloor(scene, floor, door) {
    s.done[floor] = true;
    const need = rods(floor);
    s.floorRows.push([floor, need]);
    recordFloors();
    api.log('interaction', { andar: floor, modulos: floor, hastes: need });
    if (s.hand.items.length) {
      emptyHands();
      api.say('As hastes que sobraram na sua mão voltaram para o monte.');
    }
    door.open();
    const lines = {
      1: 'Um módulo fechado: 4 hastes. A porta abriu! Suba e veja o que muda com 2 módulos.',
      2: '2 módulos: 7 hastes. Repare na ordem em que elas acenderam: o segundo módulo pediu só 3 hastes novas.',
      3: '3 módulos: 10 hastes. Cada módulo novo pede as mesmas 3 hastes. Lá em cima, a grade é grande demais para ir acendendo uma por uma...',
    };
    api.say(lines[floor], 'ok');
  }

  /* ---------- 4º andar: prever a grade de 10 módulos ---------- */

  function buildPredictionFloor(scene) {
    const grid = buildGrid(scene, BIG, { hidden: !s.done[4] });
    if (s.done[4]) grid.parts.forEach((_, i) => grid.light(i, { instant: true }));
    const door = buildDoor(scene, 4, () => s.done[4], () => goUp(scene, 4));
    let extras = [];
    let busy = false;

    const bundles = place(scene, 'torre:monte:true', rodPileSprite(true), 60, 214);
    const loose = place(scene, 'torre:monte:false', rodPileSprite(false), 60, 272);
    const cart = place(scene, 'torre:carrinho', cartSprite(), 304, 252);
    const leverOff = leverSprite(false, '#5fe3d0');
    const lever = place(scene, 'torre:alavanca:false', leverOff, 356, 168);
    [bundles, loose, cart, lever].forEach((item, i) => popIn(scene, item, scene.fx, { delay: 150 + i * 120 }));

    scene.addInteractable({ x: 60, y: 226, reach: 28, label: 'Feixes de 10 hastes', enabled: () => !s.done[4], onInteract: () => take('rod', 10, MAX_HAND) });
    scene.addInteractable({ x: 60, y: 284, reach: 28, label: 'Hastes soltas', enabled: () => !s.done[4], onInteract: () => take('rod', 1, MAX_HAND) });
    scene.addInteractable({
      x: 304,
      y: 264,
      reach: 30,
      label: 'Carrinho',
      enabled: () => !s.done[4],
      onInteract: () => {
        if (s.hand.kind === 'rod' && s.hand.items.length) {
          s.load = s.load.concat(s.hand.items);
          emptyHands();
          playAction('crouch');
          scene.fx.sparkle(304, 236, 6);
          return;
        }
        if (s.load.length) {
          const last = s.load.pop();
          api.say(last === 10 ? 'Você tirou um feixe de 10 do carrinho.' : 'Você tirou uma haste solta do carrinho.');
          return;
        }
        api.say('Pegue feixes ou hastes soltas e ponha no carrinho.', 'warn');
      },
    });
    scene.addInteractable({
      x: 356,
      y: 180,
      reach: 28,
      label: 'Acender a grade',
      enabled: () => !s.done[4] && !busy,
      onInteract: () => {
        const amount = s.load.reduce((sum, value) => sum + value, 0);
        if (!amount) {
          api.say('O carrinho está vazio. Carregue as hastes antes de acender.', 'warn');
          return;
        }
        busy = true;
        playAction('use');
        lever.setTexture(ensureCanvasTexture(scene, 'torre:alavanca:true', leverSprite(true, '#5fe3d0').canvas));
        const real = rods(BIG);
        const lit = Math.min(amount, real);
        for (let i = 0; i < lit; i++) grid.light(i, { delay: i * 45 });
        scene.time.delayedCall(lit * 45 + 400, () => {
          lever.setTexture('torre:alavanca:false');
          const ok = api.attempt(amount === real, { modulos: BIG, previsao: amount, real });
          s.guesses.push([BIG, { value: `${amount} ${ok ? '(completa)' : amount < real ? '(faltaram)' : '(sobraram)'}`, tone: ok ? 'good' : 'bad' }]);
          recordPrediction();
          if (ok) {
            s.done[4] = true;
            busy = false;
            door.open();
            api.say(`${real} hastes: a grade de 10 módulos acendeu inteira, sem sobrar nenhuma! Suba: lá em cima a Torre quer a regra.`, 'ok');
            return;
          }
          if (amount < real) {
            grid.showMissing(lit);
            api.fail(`Com ${amount} hastes, a grade ficou com ${real - amount} buracos (em vermelho). Os últimos módulos ficaram abertos.`);
          } else {
            extras = dropExtras(scene, amount - real);
            api.fail(`A grade acendeu inteira, mas ${amount - real} hastes sobraram e caíram no chão.`);
          }
          scene.time.delayedCall(2400, () => {
            grid.reset();
            extras.forEach((piece) => piece.destroy());
            extras = [];
            busy = false;
          });
        });
      },
    });

    scene.addOverlay((ctx, t) => {
      drawTag(ctx, GRID_CX, 14, '4º andar · grade de 10 módulos', { fill: '#1d1a38', ink: '#cfe0ff' });
      if (!s.done[4]) {
        drawTag(ctx, GRID_CX, GRID_TOP + 10, 'a grade só acende de uma vez', { fill: '#1d1a38', ink: '#9a93c4' });
        drawTag(ctx, 60, 190, 'feixes de 10');
        drawTag(ctx, 60, 248, 'soltas');
        drawTag(ctx, 304, 216, `${s.load.reduce((sum, value) => sum + value, 0)} hastes no carrinho`);
        if (s.hand.kind === 'rod') drawBounce(ctx, 304, 206, t);
      }
      drawPlaque(ctx);
    });
  }

  /* ---------- 5º andar: a regra nas lâmpadas ---------- */

  function buildRuleFloor(scene) {
    const lampX = (i) => GRID_CX + (i - (LAMPS - 1) / 2) * 22;
    const lamps = Array.from({ length: LAMPS }, (_, i) => place(scene, 'torre:lampada:off', lampSprite('off'), lampX(i), 62, 4));
    const door = buildDoor(scene, 5, () => s.won, () => api.say('O observatório da Nyla: aqui ficam guardadas as regras que você descobriu.', 'ok'));
    const stacks = { a: [], b: [] };
    const PED = { a: { x: 146, y: 176 }, b: { x: 252, y: 176 } };

    const lampState = (n) => {
      if (!s.a && !s.b) return 'off';
      return s.a * n + s.b === rods(n) ? 'on' : 'bad';
    };
    function refreshLamps(animate) {
      lamps.forEach((lamp, i) => {
        const state = lampState(i + 1);
        const key = `torre:lampada:${state}`;
        if (lamp.texture.key === key) return;
        lamp.setTexture(ensureCanvasTexture(scene, key, lampSprite(state).canvas));
        if (animate) scene.tweens.add({ targets: lamp, scaleX: { from: 1.4, to: 1 }, scaleY: { from: 1.4, to: 1 }, duration: 260, delay: i * 25, ease: 'Back.Out' });
      });
    }

    function stackImage(which, index) {
      const ped = PED[which];
      const entry = which === 'a' ? blockSprite() : gearSprite();
      const key = which === 'a' ? 'torre:bloco' : 'torre:engrenagem';
      const x = ped.x - 12 + (index % 3) * 12;
      const y = ped.y - 34 - Math.floor(index / 3) * 12;
      return place(scene, key, entry, x, y, ped.y + 1 + index);
    }

    function rebuildStacks() {
      for (const which of ['a', 'b']) {
        stacks[which].forEach((image) => image.destroy());
        stacks[which] = Array.from({ length: s[which] }, (_, i) => stackImage(which, i));
      }
    }

    function addPiece(which) {
      const kind = which === 'a' ? 'block' : 'gear';
      if (s.hand.kind !== kind || !s.hand.items.length) {
        if (s[which] > 0 && !s.hand.items.length) {
          // Mãos vazias: tira uma peça do pedestal
          s[which]--;
          stacks[which].pop()?.destroy();
          s.hand.kind = kind;
          s.hand.items.push(1);
          refreshHands();
          refreshLamps(true);
          return;
        }
        api.say(which === 'a' ? 'Este pedestal recebe blocos de energia (o que cada módulo acrescenta).' : 'Este pedestal recebe engrenagens (as hastes fixas).', 'warn');
        return;
      }
      if (s[which] >= MAX_PIECES) {
        api.say('O pedestal está cheio.', 'warn');
        return;
      }
      s.hand.items.pop();
      refreshHands();
      playAction('use');
      const image = stackImage(which, s[which]);
      popIn(scene, image, scene.fx, { duration: 360 });
      stacks[which].push(image);
      s[which]++;
      refreshLamps(true);
    }

    const blocks = place(scene, 'torre:caixote:block', crateSprite('block'), 56, 238);
    const gears = place(scene, 'torre:caixote:gear', crateSprite('gear'), 360, 238);
    const pedA = place(scene, 'torre:pedestal', pedestalSprite(), PED.a.x, PED.a.y);
    const pedB = place(scene, 'torre:pedestal', pedestalSprite(), PED.b.x, PED.b.y);
    const lever = place(scene, 'torre:alavanca:false', leverSprite(false, '#5fe3d0'), GRID_CX, 270);
    [blocks, gears, pedA, pedB, lever].forEach((item, i) => popIn(scene, item, scene.fx, { delay: 150 + i * 110 }));
    rebuildStacks();
    refreshLamps(false);

    scene.addInteractable({ x: 56, y: 250, reach: 28, label: 'Caixote de blocos de energia', enabled: () => !s.won, onInteract: () => take('block', 1, MAX_PIECES) });
    scene.addInteractable({ x: 360, y: 250, reach: 28, label: 'Caixote de engrenagens', enabled: () => !s.won, onInteract: () => take('gear', 1, MAX_PIECES) });
    scene.addInteractable({ x: PED.a.x, y: PED.a.y + 12, reach: 28, label: 'Pedestal dos blocos', enabled: () => !s.won, onInteract: () => addPiece('a') });
    scene.addInteractable({ x: PED.b.x, y: PED.b.y + 12, reach: 28, label: 'Pedestal das engrenagens', enabled: () => !s.won, onInteract: () => addPiece('b') });
    scene.addInteractable({
      x: GRID_CX,
      y: 282,
      reach: 28,
      label: 'Testar a regra',
      enabled: () => !s.won,
      onInteract: () => {
        playAction('use');
        lever.setTexture(ensureCanvasTexture(scene, 'torre:alavanca:true', leverSprite(true, '#5fe3d0').canvas));
        scene.time.delayedCall(300, () => lever.setTexture('torre:alavanca:false'));
        const floors = Array.from({ length: LAMPS }, (_, i) => i + 1);
        const hits = floors.filter((n) => s.a * n + s.b === rods(n)).length;
        api.record(['Módulos', 'Sua regra', 'Grade real'], floors.map((n) => [n, { value: s.a * n + s.b, tone: s.a * n + s.b === rods(n) ? 'good' : 'bad' }, rods(n)]));
        lamps.forEach((lamp, i) => scene.tweens.add({ targets: lamp, y: { from: 58, to: 62 }, duration: 200, delay: i * 40, ease: 'Bounce.Out' }));
        if (api.attempt(hits === LAMPS, { a: s.a, b: s.b, acertos: hits })) {
          s.won = true;
          emptyHands();
          door.open();
          lamps.forEach((lamp, i) => scene.time.delayedCall(i * 60, () => scene.fx.sparkle(lamp.x, lamp.y - 8, 6)));
          api.win('Todas as lâmpadas acenderam: hastes = 3 × módulos + 1. O observatório da Torre abriu e guardou a sua regra.');
          return;
        }
        api.fail(`A regra acendeu ${hits} de ${LAMPS} lâmpadas. As vermelhas mostram os andares em que ela se afasta da grade real. Olhe o Registro dos andares.`);
      },
    });

    scene.addOverlay((ctx, t) => {
      drawTag(ctx, GRID_CX, 14, `hastes = ${s.a} × módulos + ${s.b}`, { fill: '#1d1a38', ink: '#cfe0ff' });
      lamps.forEach((lamp, i) => drawTag(ctx, lamp.x, 72, String(i + 1), { fill: '#2a2640', ink: '#cfe0ff' }));
      drawTag(ctx, PED.a.x, PED.a.y + 18, `× ${s.a} por módulo`);
      drawTag(ctx, PED.b.x, PED.b.y + 18, `+ ${s.b} fixas`);
      drawTag(ctx, 56, 204, 'blocos de energia');
      drawTag(ctx, 360, 204, 'engrenagens');
      drawPlaque(ctx);
      if (s.hand.kind === 'block') drawBounce(ctx, PED.a.x, PED.a.y - 60, t);
      if (s.hand.kind === 'gear') drawBounce(ctx, PED.b.x, PED.b.y - 60, t);
    });
  }

  /* ---------- Placa do registro e seta ---------- */

  function drawPlaque(ctx) {
    if (!s.floorRows.length) return;
    drawTag(ctx, 40, 106, 'andares', { fill: '#2a2640', ink: '#ffcf6b' });
    s.floorRows.forEach(([modules, hastes], i) => drawTag(ctx, 40, 118 + i * 12, `${modules} → ${hastes}`));
  }

  function drawBounce(ctx, x, y, t) {
    const bob = Math.round(Math.sin(t * 5) * 2);
    ctx.fillStyle = '#4f3019';
    ctx.fillRect(x - 5, y - 6 + bob, 10, 6);
    ctx.fillRect(x - 3, y + bob, 6, 2);
    ctx.fillRect(x - 1, y + 2 + bob, 2, 2);
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(x - 4, y - 5 + bob, 8, 4);
    ctx.fillRect(x - 2, y - 1 + bob, 4, 2);
  }

  /* ---------- Andares ---------- */

  function goUp(scene, floor) {
    const next = floor + 1;
    if (next > 5) return;
    s.maxFloor = Math.max(s.maxFloor, next);
    emptyHands();
    scene.changeFloor(next, { x: W / 2, y: H - 26 });
  }

  function announce(floor) {
    if (floor <= 3) {
      api.setStage(0);
      api.setObjective(`Pegue hastes no monte e acenda a grade de ${floor} ${floor === 1 ? 'módulo' : 'módulos'} no pedestal de energia. Depois suba pela porta.`);
    } else if (floor === 4) {
      api.setStage(1);
      api.setObjective('A grade de 10 módulos só acende de uma vez. Carregue o carrinho com as hastes que ela vai pedir e puxe a alavanca.');
    } else {
      api.setStage(2);
      api.setObjective('Ponha blocos (quanto cada módulo acrescenta) e engrenagens (hastes fixas) nos pedestais até as 12 lâmpadas ficarem verdes. Puxe a alavanca.');
    }
  }

  return {
    get active() {
      return s.active;
    },
    get won() {
      return s.won;
    },
    startFloor: () => s.maxFloor,
    room: (floor) => ({
      key: `torre-andar-${floor}`,
      name: `Torre dos Padrões · ${FLOOR_NAMES[floor]}`,
      cols: 13, rows: 10,
      wall: '#8e93a8', wallStyle: 'stone', floor: 'stone', accent: '#5a3fc4',
      wallArt: [{ type: 'slit', x: 14 }],
      rug: { x: GRID_CX - 26, y: WALL_H + 70, w: 52, h: 150, color: '#5a3fc4' },
      furniture: [],
    }),
    zoneName: (floor) => `Torre · ${FLOOR_NAMES[floor]}`,
    exitLabel: (floor) => (floor > 1 ? 'Descer' : 'Sair da Torre'),
    floorBelow: (floor) => (floor > 1 ? floor - 1 : null),
    descendSpawn: () => ({ x: DOOR.x, y: WALL_H + 26 }),
    build(scene, floor) {
      ui = { floor };
      if (!s.active) return;
      if (floor > s.maxFloor) s.maxFloor = floor;
      if (floor === s.maxFloor) announce(floor);
      if (floor <= 3) buildCountingFloor(scene, floor);
      else if (floor === 4) buildPredictionFloor(scene);
      else buildRuleFloor(scene);
    },
    finish({ abandoned }) {
      s.active = false;
      ui = null;
      setBuildingHandler('tower', null);
      if (abandoned && isInside('tower')) exitBuilding();
    },
  };
}

function mountTowerFloors(api) {
  const mission = createTowerMission(api);
  setBuildingHandler('tower', mission);
  api.onCleanup(() => {
    clearQuestLayer();
    mission.finish({ abandoned: !mission.won });
  });
  api.record(['Módulos', 'Hastes'], [], 'Registro dos andares');
  enterBuilding(buildingOfKind('tower'), { floor: mission.startFloor() });
}

export default {
  r5a: {
    title: 'Grade de Energia',
    region: 'r5',
    npc: 'nyla',
    mode: 'world',
    stages: ['Andares 1 a 3', 'Previsão: 10 módulos', 'Regra nas lâmpadas'],
    greeting: 'Suba a Torre comigo! Em cada andar, acenda a grade de hastes da parede. Repare quantas hastes cada módulo novo pede.',
    context: 'A Torre é alimentada por grades de hastes de luz na parede de cada andar. Cada módulo é um quadrado, e módulos vizinhos compartilham uma haste. Para abrir o topo da Torre, é preciso descobrir a regra que diz quantas hastes qualquer grade exige.',
    goal: 'Acender as grades de 1, 2 e 3 módulos, prever as hastes da grade de 10 módulos e montar a regra que acende as 12 lâmpadas dos andares.',
    concept: 'Generalização de padrão; expressão algébrica com variável',
    prerequisites: 'Regularidade e covariação (Oficina); previsão (Rotas)',
    relation: 'h = 3n + 1 (hastes = 3 × módulos + 1)',
    categories: ['linguagem algébrica', 'representação', 'previsão'],
    hints: [
      'Repare na ordem em que as hastes acendem: a primeira fica de pé, e depois cada módulo pede sempre o mesmo número de hastes novas.',
      'O primeiro módulo é diferente dos outros: ele precisa de uma haste a mais para fechar o quadrado. Use a placa "andares" na parede.',
      'No topo, os blocos de energia dizem quanto cada módulo acrescenta e as engrenagens, quantas hastes ficam fixas. As lâmpadas verdes mostram os andares em que a sua regra já acerta.',
    ],
    mountWorld: mountTowerFloors,
  },
};
