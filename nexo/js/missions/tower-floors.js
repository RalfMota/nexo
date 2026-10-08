/* NEXO — Grade de Energia (Torre dos Padrões), jogada por dentro da Torre, andar por andar
 *
 * hastes = 3 × módulos + 1. Linguagem visual única nos 5 andares:
 *   haste DOURADA = a haste de partida (só existe uma);  hastes AZUIS = as 3 que cada módulo acrescenta.
 *
 *   1º, 2º e 3º andares (1, 2 e 3 módulos): o jogador pega hastes no suporte e as encaixa,
 *     uma por vez, no painel embaixo da grade da parede. A primeira acende dourada; cada módulo
 *     fechado mostra "+3" e a conta embaixo da grade cresce: 1 + 3 + 3 = 7. Grade completa: a porta abre.
 *   4º andar (previsão, 10 módulos): a grade está coberta e só acende de uma vez. O quadro do
 *     registro mostra 1 → 4, 2 → 7, 3 → 10 e 10 → ?. O jogador carrega o carrinho com feixes de 10
 *     e hastes soltas e puxa a alavanca: faltando, as vazias piscam em vermelho; sobrando, caem no chão.
 *   5º andar (regra): a Máquina da Regra tem um tubo azul (hastes por módulo) e um dourado (hastes
 *     de partida). O visor mostra "hastes = □ × módulos + □" e as 12 lâmpadas (uma por grade de
 *     1 a 12 módulos) ficam verdes onde a regra acerta. Todas verdes + alavanca: o observatório abre.
 *
 * Eventos de pesquisa: previsão { modulos, previsao, real } e regra { a, b, acertos }, como antes.
 */

import { setBuildingHandler } from '../engine/interiors.js';
import { enterBuilding, exitBuilding, isInside, buildingOfKind } from '../engine/engine.js';
import { ensureCanvasTexture } from '../engine/actor-view.js';
import { popIn } from '../engine/fx.js';
import { clearQuestLayer, playAction } from '../world/quest-layer.js';
import { createHands } from './kit/hands.js';
import { drawTag, drawArrow } from './world-kit.js';
import { WALL_H } from '../art/interior-art.js';
import {
  CELL, rodSprite, rodKey, glowCanvas, doorSprite, doorKey, rackSprite, rackKey, bundleCrateSprite, socketPanelSprite,
  ruleMachineSprite, RULE_TUBES, rodCrateSprite, lampSprite, lampKey, cartSprite, leverSprite,
} from '../art/tower-art.js';

const rods = (modules) => 3 * modules + 1;
const BIG = 10;
const LAMPS = 12;
const MAX_HAND = 40;
const MAX_PIECES = 8;
const W = 13 * 32;
const H = 10 * 32;
const DOOR = { x: 380, y: WALL_H };
const GRID_TOP = 24;
const GRID_CX = 208;
const PANEL = { x: GRID_CX, y: 150 };

const FLOOR_NAMES = ['', '1º andar', '2º andar', '3º andar', '4º andar', 'Topo da Torre'];
const COLORS = { gold: '#ffc34a', cyan: '#7fe6ff', ink: '#e8e4ff', dim: '#8c86b4', good: '#8cff9e', bad: '#ff8a7a' };

/** Hastes de uma grade de n módulos, na ordem em que acendem: a de partida (de pé), depois 3 por módulo. */
function gridSegments(modules) {
  const left = Math.round(GRID_CX - (modules * CELL) / 2);
  const segs = [{ x: left - 3, y: GRID_TOP - 2, horizontal: false, module: 0 }];
  for (let i = 0; i < modules; i++) {
    const cellLeft = left + i * CELL;
    segs.push({ x: cellLeft - 2, y: GRID_TOP - 3, horizontal: true, module: i + 1 });
    segs.push({ x: cellLeft - 2, y: GRID_TOP + CELL - 3, horizontal: true, module: i + 1 });
    segs.push({ x: cellLeft + CELL - 3, y: GRID_TOP - 2, horizontal: false, module: i + 1 });
  }
  return segs.map((seg) => ({ ...seg, cx: seg.horizontal ? seg.x + (CELL + 4) / 2 : seg.x + 3.5, cy: seg.horizontal ? seg.y + 3.5 : seg.y + (CELL + 4) / 2 }));
}

const cellCenter = (modules, index) => ({
  x: Math.round(GRID_CX - (modules * CELL) / 2) + index * CELL + CELL / 2,
  y: GRID_TOP + CELL / 2,
});

/** Imagem de um sprite de pixel art na cena (textura criada na primeira vez). */
function place(scene, key, entry, x, y, depth = y) {
  ensureCanvasTexture(scene, key, entry.canvas);
  return scene.add.image(x, y, key).setOrigin(entry.ax / entry.canvas.width, entry.ay / entry.canvas.height).setDepth(depth);
}

/** Texto em pedaços coloridos, centrado em x (ex.: a conta "1 + 3 + 3 = 7"). */
function drawParts(ctx, x, y, parts, { size = 9, box = true } = {}) {
  ctx.font = `700 ${size}px "Fredoka", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const widths = parts.map(([text]) => ctx.measureText(text).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let left = Math.round(x - total / 2);
  if (box) {
    ctx.fillStyle = '#4f3019';
    ctx.fillRect(left - 6, Math.round(y - size / 2 - 4), Math.ceil(total) + 12, size + 8);
    ctx.fillStyle = '#1d1a38';
    ctx.fillRect(left - 5, Math.round(y - size / 2 - 3), Math.ceil(total) + 10, size + 6);
  }
  parts.forEach(([text, color], i) => {
    ctx.fillStyle = color;
    ctx.fillText(text, left, Math.round(y) + 0.5);
    left += widths[i];
  });
}

function createTowerMission(api) {
  const s = {
    active: true,
    won: false,
    maxFloor: 1,
    lit: { 1: 0, 2: 0, 3: 0 },
    done: { 1: false, 2: false, 3: false, 4: false },
    load: [],
    a: 0,
    b: 0,
    floorRows: [],
    guesses: [],
  };
  let now = 0; // relógio das camadas de desenho (segundos)
  let popups = []; // textos que sobem e somem ("+3", "+1")

  let floorNow = 1; // andar montado agora (o limite de hastes nas mãos muda no 4º andar)
  const loadText = (items) => {
    const bundles = items.filter((v) => v === 10).length;
    const loose = items.filter((v) => v === 1).length;
    const total = bundles * 10 + loose;
    if (!total) return 'carrinho vazio';
    const parts = [];
    if (bundles) parts.push(`${bundles} ${bundles === 1 ? 'feixe' : 'feixes'} de 10`);
    if (loose) parts.push(`${loose} ${loose === 1 ? 'solta' : 'soltas'}`);
    return `${parts.join(' + ')} = ${total} hastes`;
  };

  /* ---------- O que o jogador carrega ---------- */

  /** Hastes nas mãos: feixes de 10 aparecem mais grossos e amarrados. */
  const drawRods = (color) => (ctx, hands) => {
    const bundles = hands.countOf(10);
    const shown = Math.min(4, hands.size);
    for (let i = 0; i < shown; i++) {
      const thick = i < bundles ? 5 : 3;
      const y = 4 - i * 4;
      ctx.fillStyle = '#1a1028';
      ctx.fillRect(-10, y - 1, 20, thick + 2);
      ctx.fillStyle = color[1];
      ctx.fillRect(-9, y, 18, thick);
      ctx.fillStyle = color[2];
      ctx.fillRect(-9, y, 18, 1);
      if (i < bundles) {
        ctx.fillStyle = '#c8a070';
        ctx.fillRect(-2, y - 1, 4, thick + 2);
      }
    }
    drawTag(ctx, 0, -16, String(hands.count));
  };
  const BLUE = ['#127a86', '#2fb8c8', '#c8f8ff'];
  const GOLDEN = ['#8a5a12', '#ffc34a', '#fffbe8'];

  const hands = createHands({
    say: api.say,
    kinds: {
      rod: {
        name: 'hastes de luz',
        get limit() {
          return floorNow <= 3 ? 12 : MAX_HAND;
        },
        draw: drawRods(BLUE),
      },
      cyan: { name: 'hastes azuis (por módulo)', limit: MAX_PIECES, draw: drawRods(BLUE) },
      gold: { name: 'hastes douradas (de partida)', limit: MAX_PIECES, draw: drawRods(GOLDEN) },
    },
    messages: {
      busy: () => 'Suas mãos já estão com hastes de outra cor. Use ou devolva antes.',
      full: (limit) => `Suas mãos estão cheias (no máximo ${limit} hastes).`,
    },
  });

  function take(kind, value) {
    if (!hands.take(kind, value)) return false;
    playAction('crouch');
    return true;
  }

  /* ---------- Registro ---------- */

  const recordFloors = () => api.record(['Módulos', 'Hastes'], s.floorRows, 'Registro dos andares');
  const recordPrediction = () => api.record(['Módulos', 'Hastes'], [...s.floorRows, ...s.guesses], 'Registro dos andares');

  /* ---------- Peças comuns ---------- */

  function popup(x, y, text, color) {
    popups.push({ x, y, text, color, born: now });
  }

  function drawPopups(ctx) {
    popups = popups.filter((p) => now - p.born < 1.6);
    for (const p of popups) {
      const age = (now - p.born) / 1.6;
      ctx.globalAlpha = Math.max(0, 1 - age * age);
      drawParts(ctx, p.x, p.y - age * 16, [[p.text, p.color]], { size: 10 });
      ctx.globalAlpha = 1;
    }
  }

  function buildDoor(scene, isOpen, onEnter) {
    const door = place(scene, doorKey(isOpen()), doorSprite(isOpen()), DOOR.x, DOOR.y, 5);
    const glow = scene.add.image(DOOR.x, DOOR.y - 26, ensureCanvasTexture(scene, 'torre2:brilho-porta', () => glowCanvas(70, '255, 220, 140'))).setDepth(6).setBlendMode('ADD').setAlpha(isOpen() ? 0.6 : 0);
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
        door.setTexture(ensureCanvasTexture(scene, doorKey(true), doorSprite(true).canvas));
        scene.tweens.add({ targets: glow, alpha: { from: 1, to: 0.6 }, duration: 900 });
        scene.tweens.add({ targets: door, scaleX: { from: 1.15, to: 1 }, duration: 380, ease: 'Back.Out' });
        scene.fx.sparkle(DOOR.x, DOOR.y - 30, 22);
        scene.cameras.main.shake(180, 0.002);
      },
    };
  }

  /** Grade da parede: sulcos, hastes acesas (dourada a de partida, azuis as dos módulos) e brilhos. */
  function buildGrid(scene, modules, { hidden = false } = {}) {
    const segs = gridSegments(modules);
    const glowKey = ensureCanvasTexture(scene, 'torre2:brilho', () => glowCanvas(30));
    const parts = segs.map((seg, i) => {
      const state = i === 0 ? 'gold' : 'cyan';
      const socket = place(scene, rodKey(seg.horizontal, 'off'), rodSprite(seg.horizontal, 'off'), seg.x, seg.y, 3).setOrigin(0).setAlpha(hidden ? 0 : 1);
      const rod = place(scene, rodKey(seg.horizontal, state), rodSprite(seg.horizontal, state), seg.x, seg.y, 4).setOrigin(0).setAlpha(0);
      const bad = place(scene, rodKey(seg.horizontal, 'bad'), rodSprite(seg.horizontal, 'bad'), seg.x, seg.y, 4).setOrigin(0).setAlpha(0);
      const glow = scene.add.image(seg.cx, seg.cy, glowKey).setDepth(5).setBlendMode('ADD').setAlpha(0);
      return { seg, socket, rod, bad, glow, lit: false };
    });
    let plate = null;
    if (hidden) {
      const left = Math.round(GRID_CX - (modules * CELL) / 2) - 8;
      plate = scene.add.rectangle(left, GRID_TOP - 10, modules * CELL + 16, CELL + 20, 0x14122a, 0.92).setOrigin(0).setDepth(2);
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
          part.glow.setAlpha(0.3);
          return;
        }
        scene.tweens.add({ targets: part.rod, alpha: 1, duration: 160, delay });
        scene.tweens.add({ targets: part.glow, alpha: { from: 1, to: 0.3 }, duration: 600, delay, onStart: () => scene.fx.sparkle(part.seg.cx, part.seg.cy, 4) });
      },
      showMissing(from) {
        parts.slice(from).forEach((part) => {
          part.socket.setAlpha(1);
          scene.tweens.add({ targets: part.bad, alpha: { from: 0, to: 1 }, duration: 260, yoyo: true, repeat: 3 });
        });
      },
      reveal(on) {
        plate?.setAlpha(on ? 0 : 1);
      },
      reset() {
        parts.forEach((part) => {
          part.lit = false;
          part.rod.setAlpha(0);
          part.glow.setAlpha(0);
          if (hidden) part.socket.setAlpha(0);
        });
        if (hidden) plate?.setAlpha(1);
      },
    };
  }

  /** Hastes que sobraram caem da parede e quicam no chão. */
  function dropExtras(scene, count) {
    const pieces = [];
    for (let i = 0; i < Math.min(count, 12); i++) {
      const x = GRID_CX - 60 + Math.random() * 120;
      const rod = place(scene, rodKey(true, 'cyan'), rodSprite(true, 'cyan'), x, GRID_TOP, 200).setOrigin(0.5).setAngle(Math.random() * 60 - 30);
      scene.tweens.add({ targets: rod, y: WALL_H + 30 + Math.random() * 30, angle: Math.random() * 180, duration: 700 + i * 40, ease: 'Bounce.Out' });
      pieces.push(rod);
    }
    return pieces;
  }

  /** Números dos módulos dentro dos quadrados da grade (a grade "conta" os módulos para o aluno). */
  function drawModuleNumbers(ctx, modules, completeUpTo = 0) {
    ctx.font = '700 9px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < modules; i++) {
      const c = cellCenter(modules, i);
      ctx.fillStyle = i < completeUpTo ? COLORS.cyan : 'rgba(207, 224, 255, .4)';
      ctx.fillText(String(i + 1), c.x, c.y + 1);
    }
  }

  /** Quadro-negro do registro: o que cada andar já mostrou, e a pergunta do andar atual. */
  function drawLedger(ctx, extraRow) {
    const rows = s.floorRows.map(([m, h]) => [`${m}`, `${h}`, COLORS.ink]);
    if (extraRow) rows.push(extraRow);
    if (!rows.length) return;
    const x = 10;
    const y = WALL_H + 8;
    const w = 66;
    const h = 24 + rows.length * 11;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(x - 2, y - 2, w + 4, 1);
    ctx.fillStyle = '#23402f';
    ctx.fillRect(x, y, w, h);
    ctx.font = '700 7px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9a0';
    ctx.fillText('REGISTRO', x + w / 2, y + 6);
    ctx.fillStyle = '#b6d8c0';
    ctx.fillText('módulos → hastes', x + w / 2, y + 15);
    ctx.font = '700 8px "Fredoka", sans-serif';
    rows.forEach(([m, hastes, color], i) => {
      ctx.fillStyle = color;
      ctx.fillText(`${m}  →  ${hastes}`, x + w / 2, y + 27 + i * 11);
    });
  }

  /* ---------- 1º a 3º andares: encaixar as hastes uma por vez ---------- */

  function equationParts(lit) {
    if (!lit) return [['encaixe a primeira haste', COLORS.dim]];
    const complete = Math.floor((lit - 1) / 3);
    const partial = (lit - 1) % 3;
    const parts = [['1', COLORS.gold]];
    for (let i = 0; i < complete; i++) parts.push([' + ', COLORS.ink], ['3', COLORS.cyan]);
    if (partial) parts.push([' + ', COLORS.ink], [String(partial), COLORS.cyan]);
    parts.push([` = ${lit} ${lit === 1 ? 'haste' : 'hastes'}`, COLORS.ink]);
    return parts;
  }

  function buildCountingFloor(scene, floor) {
    const modules = floor;
    const need = rods(modules);
    const grid = buildGrid(scene, modules);
    for (let i = 0; i < s.lit[floor]; i++) grid.light(i, { instant: true });
    const door = buildDoor(scene, () => s.done[floor], () => goUp(scene, floor));

    const rack = place(scene, rackKey('cyan'), rackSprite('cyan'), 64, 262);
    const panel = place(scene, 'torre2:painel', socketPanelSprite(), PANEL.x, PANEL.y);
    popIn(scene, rack, scene.fx, { delay: 200 });
    popIn(scene, panel, scene.fx, { delay: 350 });

    scene.addInteractable({ x: 64, y: 272, reach: 30, promptY: 206, label: 'Pegar haste', enabled: () => !s.done[floor], onInteract: () => take('rod', 1) });
    scene.addInteractable({
      x: PANEL.x,
      y: PANEL.y + 10,
      reach: 30,
      promptY: PANEL.y - 52,
      label: 'Encaixar haste',
      onInteract: () => {
        if (s.done[floor]) {
          api.say('Esta grade já está completa. Suba pela porta acesa.', 'ok');
          return;
        }
        if (!hands.holds('rod')) {
          api.say('Primeiro pegue hastes no suporte (à esquerda). Depois volte aqui e encaixe uma de cada vez.', 'warn');
          return;
        }
        hands.drop();
        playAction('use');
        const index = s.lit[floor];
        grid.light(index);
        s.lit[floor]++;
        const seg = grid.parts[index].seg;
        if (index === 0) {
          popup(seg.cx, seg.cy + 26, 'haste de partida', COLORS.gold);
        } else if ((index - 1) % 3 === 2) {
          const c = cellCenter(modules, seg.module - 1);
          popup(c.x, c.y + 24, `módulo ${seg.module}: +3`, COLORS.cyan);
        }
        if (s.lit[floor] === need) completeFloor(scene, floor, door);
      },
    });

    scene.addOverlay((ctx, t) => {
      now = t;
      drawTag(ctx, GRID_CX, 8, `${FLOOR_NAMES[floor]} · grade de ${modules} ${modules === 1 ? 'módulo' : 'módulos'}`, { fill: '#1d1a38', ink: '#cfe0ff' });
      drawModuleNumbers(ctx, modules, Math.max(0, Math.floor((s.lit[floor] - 1) / 3)));
      drawParts(ctx, GRID_CX, GRID_TOP + CELL + 20, equationParts(s.lit[floor]));
      if (s.done[floor]) drawTag(ctx, GRID_CX, GRID_TOP + CELL + 36, 'grade completa! suba pela porta', { fill: '#c8f5c0' });
      drawTag(ctx, 64, 214, 'suporte de hastes');
      drawLedger(ctx);
      drawPopups(ctx);
      if (!s.done[floor]) {
        if (hands.holds('rod')) drawArrow(ctx, PANEL.x, PANEL.y - 46, t);
        else if (!s.lit[floor]) drawArrow(ctx, 64, 222, t);
      } else {
        drawArrow(ctx, DOOR.x, DOOR.y - 66, t);
      }
    });
  }

  function completeFloor(scene, floor, door) {
    s.done[floor] = true;
    const need = rods(floor);
    s.floorRows.push([floor, need]);
    recordFloors();
    api.log('interaction', { andar: floor, modulos: floor, hastes: need });
    if (!hands.empty) {
      hands.dropAll();
      api.say('As hastes que sobraram na sua mão voltaram para o suporte.');
    }
    door.open();
    const lines = {
      1: 'Um módulo: a haste dourada de partida + 3 azuis = 4 hastes. A porta abriu! Suba para ver o que muda com 2 módulos.',
      2: '2 módulos: 1 + 3 + 3 = 7 hastes. O segundo módulo aproveitou a parede do primeiro, por isso pediu só 3 hastes novas.',
      3: '3 módulos: 1 + 3 + 3 + 3 = 10 hastes. Cada módulo novo pede sempre 3. Lá em cima tem uma grade de 10 módulos, grande demais para encaixar uma por uma...',
    };
    api.say(lines[floor], 'ok');
  }

  /* ---------- 4º andar: prever a grade de 10 módulos ---------- */

  function buildPredictionFloor(scene) {
    const grid = buildGrid(scene, BIG, { hidden: !s.done[4] });
    if (s.done[4]) grid.parts.forEach((_, i) => grid.light(i, { instant: true }));
    const door = buildDoor(scene, () => s.done[4], () => goUp(scene, 4));
    let extras = [];
    let busy = false;
    const CRATE = { x: 46, y: 226 };
    const RACK = { x: 46, y: 292 };
    const CART = { x: 300, y: 252 };
    const LEVER = { x: 352, y: 196 };

    const bundles = place(scene, 'torre2:caixa-feixes', bundleCrateSprite(), CRATE.x, CRATE.y);
    const loose = place(scene, rackKey('cyan'), rackSprite('cyan'), RACK.x, RACK.y);
    const cart = place(scene, 'torre2:carrinho', cartSprite(), CART.x, CART.y);
    const lever = place(scene, 'torre2:alavanca:false', leverSprite(false, '#5fe3d0'), LEVER.x, LEVER.y);
    [bundles, loose, cart, lever].forEach((item, i) => popIn(scene, item, scene.fx, { delay: 150 + i * 120 }));

    scene.addInteractable({ x: CRATE.x, y: CRATE.y + 10, reach: 28, label: 'Pegar feixe de 10', enabled: () => !s.done[4], onInteract: () => take('rod', 10) });
    scene.addInteractable({ x: RACK.x, y: RACK.y + 8, reach: 28, promptY: RACK.y - 56, label: 'Pegar haste solta', enabled: () => !s.done[4], onInteract: () => take('rod', 1) });
    scene.addInteractable({
      x: CART.x,
      y: CART.y + 12,
      reach: 30,
      label: 'Carrinho',
      enabled: () => !s.done[4] && !busy,
      onInteract: () => {
        if (hands.holds('rod')) {
          s.load = s.load.concat(hands.dropAll());
          playAction('crouch');
          scene.fx.sparkle(CART.x, CART.y - 16, 6);
          return;
        }
        if (s.load.length) {
          const last = s.load.pop();
          api.say(last === 10 ? 'Você tirou um feixe de 10 do carrinho.' : 'Você tirou uma haste solta do carrinho.');
          return;
        }
        api.say('Pegue feixes de 10 (na caixa) ou hastes soltas (no suporte) e ponha no carrinho.', 'warn');
      },
    });
    scene.addInteractable({
      x: LEVER.x,
      y: LEVER.y + 12,
      reach: 28,
      label: 'Acender a grade',
      enabled: () => !s.done[4] && !busy,
      onInteract: () => {
        const amount = s.load.reduce((sum, value) => sum + value, 0);
        if (!amount) {
          api.say('O carrinho está vazio. Carregue as hastes que você acha que a grade de 10 módulos vai pedir.', 'warn');
          return;
        }
        busy = true;
        playAction('use');
        lever.setTexture(ensureCanvasTexture(scene, 'torre2:alavanca:true', leverSprite(true, '#5fe3d0').canvas));
        grid.reveal(true);
        const real = rods(BIG);
        const lit = Math.min(amount, real);
        for (let i = 0; i < lit; i++) grid.light(i, { delay: i * 45 });
        scene.time.delayedCall(lit * 45 + 400, () => {
          lever.setTexture('torre2:alavanca:false');
          const ok = api.attempt(amount === real, { modulos: BIG, previsao: amount, real });
          s.guesses.push([BIG, { value: `${amount} ${ok ? '(completa)' : amount < real ? '(faltaram)' : '(sobraram)'}`, tone: ok ? 'good' : 'bad' }]);
          recordPrediction();
          if (ok) {
            s.done[4] = true;
            busy = false;
            s.load = [];
            door.open();
            api.say(`1 + 3 × 10 = ${real} hastes: a grade de 10 módulos acendeu inteira, sem sobrar nenhuma! Suba: no topo, a Torre quer a regra que vale para qualquer grade.`, 'ok');
            return;
          }
          if (amount < real) {
            grid.showMissing(lit);
            api.fail(`Com ${amount} hastes, ficaram ${real - amount} buracos (em vermelho). Lembre: 1 haste de partida e mais 3 para cada módulo.`);
          } else {
            extras = dropExtras(scene, amount - real);
            api.fail(`A grade acendeu inteira, mas ${amount - real} ${amount - real === 1 ? 'haste sobrou e caiu' : 'hastes sobraram e caíram'} no chão. Tire algumas do carrinho.`);
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
      now = t;
      drawTag(ctx, GRID_CX, 8, '4º andar · grade de 10 módulos', { fill: '#1d1a38', ink: '#cfe0ff' });
      if (!s.done[4]) {
        if (!busy) {
          drawModuleNumbers(ctx, BIG);
          drawParts(ctx, GRID_CX, GRID_TOP + CELL + 20, [['coberta: só acende de uma vez, pela alavanca', COLORS.dim]], { size: 8 });
        }
        drawTag(ctx, CRATE.x, CRATE.y - 44, 'feixes de 10');
        drawTag(ctx, RACK.x, RACK.y - 52, 'hastes soltas');
        drawTag(ctx, CART.x, CART.y - 38, loadText(s.load), s.load.length ? { fill: '#cfeefd' } : undefined);
        drawTag(ctx, LEVER.x, LEVER.y - 34, 'alavanca');
        if (hands.holds('rod')) drawArrow(ctx, CART.x, CART.y - 52, t);
        else if (s.load.length && !busy) drawArrow(ctx, LEVER.x, LEVER.y - 46, t);
      } else {
        drawArrow(ctx, DOOR.x, DOOR.y - 66, t);
      }
      drawLedger(ctx, s.done[4] ? [`${BIG}`, `${rods(BIG)}`, COLORS.good] : [`${BIG}`, '?', COLORS.gold]);
      drawPopups(ctx);
    });
  }

  /* ---------- 5º andar: a Máquina da Regra e as 12 lâmpadas ---------- */

  function buildRuleFloor(scene) {
    const lampX = (i) => GRID_CX + (i - (LAMPS - 1) / 2) * 24;
    const LAMP_Y = 48;
    const lamps = Array.from({ length: LAMPS }, (_, i) => place(scene, lampKey('off'), lampSprite('off'), lampX(i), LAMP_Y, 4));
    const door = buildDoor(scene, () => s.won, () => api.say('O observatório da Nyla: aqui ficam guardadas as regras que você descobriu.', 'ok'));
    const MACHINE = { x: GRID_CX, y: 214 };
    const tubeAt = (which) => {
      const tube = RULE_TUBES[which === 'a' ? 'cyan' : 'gold'];
      return { x: MACHINE.x + tube.x, y: MACHINE.y + tube.y, w: tube.w, h: tube.h, cx: MACHINE.x + tube.x + tube.w / 2 };
    };
    const CRATES = { cyan: { x: 56, y: 252 }, gold: { x: 360, y: 252 } };
    const LEVER = { x: MACHINE.x + 84, y: 222 };

    // As lâmpadas só acendem no teste (alavanca), com a regra testada. Mexer nos tubos apaga o
    // resultado: assim não dá para ajustar a regra olhando as lâmpadas mudarem ao vivo.
    let tested = null; // { a, b } da regra testada por último
    const lampState = (n) => {
      if (!tested) return 'off';
      return tested.a * n + tested.b === rods(n) ? 'on' : 'bad';
    };
    function refreshLamps(animate) {
      lamps.forEach((lamp, i) => {
        const state = lampState(i + 1);
        const key = lampKey(state);
        if (lamp.texture.key === key) return;
        lamp.setTexture(ensureCanvasTexture(scene, key, lampSprite(state).canvas));
        if (animate) scene.tweens.add({ targets: lamp, scaleX: { from: 1.4, to: 1 }, scaleY: { from: 1.4, to: 1 }, duration: 260, delay: i * 25, ease: 'Back.Out' });
      });
    }

    function useTube(which) {
      const kind = which === 'a' ? 'cyan' : 'gold';
      if (hands.empty) {
        if (s[which] > 0) {
          // Mãos vazias: tira uma haste do tubo
          s[which]--;
          hands.take(kind);
          tested = null;
          refreshLamps(false);
          return;
        }
        api.say(which === 'a'
          ? 'Tubo azul: quantas hastes cada módulo novo acrescenta. Pegue hastes azuis no caixote da esquerda.'
          : 'Tubo dourado: quantas hastes de partida a grade tem antes do primeiro módulo. Pegue hastes douradas no caixote da direita.', 'warn');
        return;
      }
      if (hands.kind !== kind) {
        api.say(which === 'a' ? 'O tubo azul só recebe hastes azuis.' : 'O tubo dourado só recebe hastes douradas.', 'warn');
        return;
      }
      if (s[which] >= MAX_PIECES) {
        api.say('Este tubo está cheio.', 'warn');
        return;
      }
      hands.drop();
      playAction('use');
      s[which]++;
      const tube = tubeAt(which);
      scene.fx.sparkle(tube.cx, tube.y + tube.h - s[which] * 3, 5);
      tested = null;
      refreshLamps(false);
    }

    const machine = place(scene, 'torre2:maquina-regra2', ruleMachineSprite(), MACHINE.x, MACHINE.y);
    const cyan = place(scene, 'torre2:caixote:cyan', rodCrateSprite('cyan'), CRATES.cyan.x, CRATES.cyan.y);
    const gold = place(scene, 'torre2:caixote:gold', rodCrateSprite('gold'), CRATES.gold.x, CRATES.gold.y);
    const lever = place(scene, 'torre2:alavanca:false', leverSprite(false, '#5fe3d0'), LEVER.x, LEVER.y);
    [machine, cyan, gold, lever].forEach((item, i) => popIn(scene, item, scene.fx, { delay: 150 + i * 110 }));
    refreshLamps(false);

    scene.addInteractable({ x: CRATES.cyan.x, y: CRATES.cyan.y + 10, reach: 28, label: 'Pegar haste azul', enabled: () => !s.won, onInteract: () => take('cyan', 1) });
    scene.addInteractable({ x: CRATES.gold.x, y: CRATES.gold.y + 10, reach: 28, label: 'Pegar haste dourada', enabled: () => !s.won, onInteract: () => take('gold', 1) });
    for (const which of ['a', 'b']) {
      const tube = tubeAt(which);
      scene.addInteractable({
        x: tube.cx,
        y: MACHINE.y + 6,
        reach: 20,
        promptY: MACHINE.y - 84,
        label: 'Tubo da Máquina da Regra',
        enabled: () => !s.won,
        onInteract: () => useTube(which),
      });
    }
    scene.addInteractable({
      x: LEVER.x,
      y: LEVER.y + 10,
      reach: 24,
      label: 'Testar a regra',
      enabled: () => !s.won,
      onInteract: () => {
        playAction('use');
        lever.setTexture(ensureCanvasTexture(scene, 'torre2:alavanca:true', leverSprite(true, '#5fe3d0').canvas));
        scene.time.delayedCall(300, () => lever.setTexture('torre2:alavanca:false'));
        const floors = Array.from({ length: LAMPS }, (_, i) => i + 1);
        const hits = floors.filter((n) => s.a * n + s.b === rods(n)).length;
        tested = { a: s.a, b: s.b };
        s.ruleTests = (s.ruleTests ?? 0) + 1;
        refreshLamps(true);
        api.record(['Módulos', 'Sua regra', 'Grade real'], floors.map((n) => [n, { value: s.a * n + s.b, tone: s.a * n + s.b === rods(n) ? 'good' : 'bad' }, rods(n)]));
        lamps.forEach((lamp, i) => scene.tweens.add({ targets: lamp, y: { from: LAMP_Y - 4, to: LAMP_Y }, duration: 200, delay: i * 40, ease: 'Bounce.Out' }));
        if (api.attempt(hits === LAMPS, { a: s.a, b: s.b, acertos: hits })) {
          s.won = true;
          hands.dropAll();
          door.open();
          lamps.forEach((lamp, i) => scene.time.delayedCall(i * 60, () => scene.fx.sparkle(lamp.x, lamp.y - 8, 6)));
          api.win('Todas as lâmpadas acenderam: hastes = 3 × módulos + 1. Essa regra vale para qualquer grade, até uma de 100 módulos (301 hastes)! O observatório abriu e guardou a sua regra.');
          return;
        }
        const tip = s.a !== 3
          ? 'Confira o tubo azul: quantas hastes novas cada módulo pediu nos andares de baixo?'
          : 'O tubo azul está certo! Agora confira o dourado: quantas hastes de partida a grade tem?';
        api.fail(`A regra acendeu ${hits} de ${LAMPS} lâmpadas (as vermelhas erram a grade daquele tamanho). ${tip}`);
      },
    });

    scene.addOverlay((ctx, t) => {
      now = t;
      drawTag(ctx, GRID_CX, 8, 'uma lâmpada para cada grade, de 1 a 12 módulos', { fill: '#1d1a38', ink: '#cfe0ff' });
      // Faixa escura atrás dos números (módulos e o que a regra calcula)
      ctx.fillStyle = '#4f3019';
      ctx.fillRect(lampX(0) - 64, LAMP_Y + 3, lampX(LAMPS - 1) - lampX(0) + 76, tested ? 22 : 11);
      ctx.fillStyle = '#1d1a38';
      ctx.fillRect(lampX(0) - 63, LAMP_Y + 4, lampX(LAMPS - 1) - lampX(0) + 74, tested ? 20 : 9);
      ctx.font = '700 7px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lamps.forEach((lamp, i) => {
        const n = i + 1;
        const state = lampState(n);
        ctx.fillStyle = '#cfe0ff';
        ctx.fillText(String(n), lamp.x, LAMP_Y + 9);
        if (state !== 'off') {
          ctx.fillStyle = state === 'on' ? COLORS.good : COLORS.bad;
          ctx.fillText(String(tested.a * n + tested.b), lamp.x, LAMP_Y + 19);
        }
      });
      ctx.fillStyle = '#8c86b4';
      ctx.textAlign = 'right';
      ctx.fillText('módulos', lampX(0) - 12, LAMP_Y + 9);
      if (tested) ctx.fillText('regra testada', lampX(0) - 12, LAMP_Y + 19);
      // Visor da máquina: a regra com os números dos tubos
      drawParts(ctx, MACHINE.x, MACHINE.y - 58, [
        ['hastes = ', COLORS.ink],
        [String(s.a), COLORS.cyan],
        [' × módulos + ', COLORS.ink],
        [String(s.b), COLORS.gold],
      ], { size: 8, box: false });
      // Hastes empilhadas dentro dos tubos
      for (const which of ['a', 'b']) {
        const tube = tubeAt(which);
        const color = which === 'a' ? ['#2fb8c8', '#c8f8ff'] : ['#d08a1a', '#ffe9a0'];
        for (let i = 0; i < s[which]; i++) {
          const y = tube.y + tube.h - 4 - i * 3.5;
          ctx.fillStyle = color[0];
          ctx.fillRect(tube.x + 2, Math.round(y), tube.w - 4, 3);
          ctx.fillStyle = color[1];
          ctx.fillRect(tube.x + 2, Math.round(y), tube.w - 4, 1);
        }
        drawTag(ctx, tube.cx, MACHINE.y + 10, which === 'a' ? 'por módulo' : 'de partida', which === 'a' ? { fill: '#cfeefd' } : { fill: '#ffe9a0' });
      }
      drawTag(ctx, CRATES.cyan.x, CRATES.cyan.y - 40, 'hastes azuis', { fill: '#cfeefd' });
      drawTag(ctx, CRATES.gold.x, CRATES.gold.y - 40, 'hastes douradas', { fill: '#ffe9a0' });
      if (!s.won) {
        drawTag(ctx, LEVER.x, LEVER.y - 34, s.ruleTests ? `testar (${s.ruleTests} ${s.ruleTests === 1 ? 'teste' : 'testes'})` : 'testar');
        if (!tested) drawTag(ctx, GRID_CX, LAMP_Y - 24, 'as lâmpadas acendem quando você testa a regra', { fill: '#1d1a38', ink: '#9a93c4' });
        if (hands.holds('cyan')) drawArrow(ctx, tubeAt('a').cx, MACHINE.y - 72, t);
        if (hands.holds('gold')) drawArrow(ctx, tubeAt('b').cx, MACHINE.y - 72, t);
      } else {
        drawArrow(ctx, DOOR.x, DOOR.y - 66, t);
      }
      drawLedger(ctx, [`${BIG}`, `${rods(BIG)}`, COLORS.ink]);
      drawPopups(ctx);
    });
  }

  /* ---------- Andares ---------- */

  function goUp(scene, floor) {
    const next = floor + 1;
    if (next > 5) return;
    s.maxFloor = Math.max(s.maxFloor, next);
    hands.dropAll();
    popups = [];
    scene.changeFloor(next, { x: W / 2, y: H - 26 });
  }

  function announce(floor) {
    if (floor <= 3) {
      api.setStage(0);
      api.setObjective(`Pegue hastes no suporte e encaixe uma por vez no painel embaixo da grade. A grade tem ${floor} ${floor === 1 ? 'módulo (quadrado)' : 'módulos (quadrados)'}: conte quantas hastes ela pede. Grade completa abre a porta.`);
    } else if (floor === 4) {
      api.setStage(1);
      api.setObjective('Quantas hastes tem a grade de 10 módulos? Use o quadro do registro, carregue o carrinho com feixes de 10 e hastes soltas e puxe a alavanca.');
    } else {
      api.setStage(2);
      api.setObjective('Monte a regra na Máquina: hastes azuis no tubo "por módulo" e douradas no tubo "de partida". Puxe a alavanca para testar: as lâmpadas mostram em quais grades a regra acerta. Pense antes de testar!');
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
      wallArt: [],
      rug: { x: GRID_CX - 26, y: WALL_H + 70, w: 52, h: 150, color: '#5a3fc4' },
      furniture: [],
    }),
    zoneName: (floor) => `Torre · ${FLOOR_NAMES[floor]}`,
    exitLabel: (floor) => (floor > 1 ? 'Descer' : 'Sair da Torre'),
    floorBelow: (floor) => (floor > 1 ? floor - 1 : null),
    descendSpawn: () => ({ x: DOOR.x, y: WALL_H + 26 }),
    build(scene, floor) {
      popups = [];
      floorNow = floor;
      if (!s.active) return;
      if (floor > s.maxFloor) s.maxFloor = floor;
      if (floor === s.maxFloor) announce(floor);
      if (floor <= 3) buildCountingFloor(scene, floor);
      else if (floor === 4) buildPredictionFloor(scene);
      else buildRuleFloor(scene);
    },
    finish({ abandoned }) {
      s.active = false;
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
    greeting: 'Suba a Torre comigo! Em cada andar há uma grade de quadrados na parede. Encaixe as hastes de luz e conte: quantas hastes cada quadrado novo pede?',
    context: 'A Torre é alimentada por grades de hastes de luz. Cada módulo é um quadrado, e módulos vizinhos compartilham uma haste. A grade começa com uma haste dourada de partida; cada módulo acrescenta hastes azuis. Para abrir o topo da Torre, é preciso descobrir a regra que diz quantas hastes qualquer grade exige.',
    goal: 'Acender as grades de 1, 2 e 3 módulos, prever as hastes da grade de 10 módulos e montar na Máquina da Regra a regra que acende as 12 lâmpadas.',
    concept: 'Generalização de padrão; expressão algébrica com variável',
    prerequisites: 'Regularidade e covariação (Oficina); previsão (Rotas)',
    relation: 'h = 3n + 1 (hastes = 3 × módulos + 1)',
    categories: ['linguagem algébrica', 'representação', 'previsão'],
    hints: [
      'Olhe a conta embaixo da grade: ela começa com 1 (a haste dourada) e cada módulo fechado soma mais 3 (as azuis).',
      'Para 10 módulos: 1 haste dourada + 3 azuis para cada um dos 10 módulos. Um feixe tem 10 hastes: quantos feixes e quantas soltas isso dá?',
      'No topo, o tubo azul guarda o "3 de cada módulo" e o tubo dourado guarda o "1 de partida". Cada teste acende as lâmpadas: verdes onde a regra acerta, vermelhas onde erra. Use o Registro dos andares para pensar antes de testar de novo.',
    ],
    mountWorld: mountTowerFloors,
  },
};
