/* NEXO — Caldeirão de Orin, jogado no laboratório de poções (Mercado das Trocas)
 *
 * A receita na parede: 4 folhas-lunares + 6 gotas de orvalho → 2 frascos. O jogador entra no
 * laboratório do Orin, pega os ingredientes nos armários (as portas de vidro abrem), põe no
 * caldeirão e, com as mãos vazias, mexe. A poção sai no ponto só na proporção da receita.
 *   1. Receita: 2 frascos.  2. Dobro: 4 frascos.  3. Proporção: 5 frascos.
 * Os frascos prontos aparecem na bancada. Os eventos de pesquisa são os mesmos de antes.
 */

import { setBuildingHandler, potionLab } from '../engine/interiors.js';
import { enterBuilding, exitBuilding, isInside, buildingOfKind } from '../engine/engine.js';
import { ensureCanvasTexture } from '../engine/actor-view.js';
import { popIn } from '../engine/fx.js';
import { setCarried, clearQuestLayer, playAction } from '../world/quest-layer.js';
import { drawTag } from './world-kit.js';
import { WALL_H } from '../art/interior-art.js';
import { cauldronSprite, fireSprite } from '../art/items.js';
import { furnitureSprite } from '../art/interior-art.js';
import { Pix, ramp, sprite } from '../art/pixel.js';
import { CHARACTERS } from '../data/characters.js';
import { runtime } from '../core/runtime.js';

const RECIPE = { leaves: 4, dew: 6, flasks: 2 };
const MAX_IN_HAND = 15;
const LIQUID = { empty: '#2b3550', mixing: '#4f7f9a', ok: '#5fe3d0', spoiled: '#3d6b2a' };

const STAGES = [
  { label: 'Receita', order: 2, intro: 'Bem-vindo ao meu laboratório! Siga o bilhete da receita na parede: 4 folhas e 6 gotas de orvalho fazem 2 frascos. Os ingredientes ficam nos armários. Quando tudo estiver no caldeirão, mexa com as mãos vazias.' },
  { label: 'Dobro', order: 4, intro: 'Saiu no ponto! Agora um cliente quer 4 frascos.' },
  { label: 'Proporção', order: 5, intro: 'Mais um pedido, e esse é chato: 5 frascos. Não dá para só dobrar a receita.' },
];

const along = (y) => WALL_H + y;
const CAULDRON = { x: 192, y: along(104) };
const CABINETS = { leaf: { x: 46, y: along(12) }, dew: { x: 96, y: along(12) } };
const TABLE = { x: 316, y: along(84) };
const ORIN = { x: 262, y: along(118) };

function buildFlask() {
  const pix = new Pix(10, 14);
  const P = ramp('#5fe3d0');
  pix.rect(3, 0, 4, 3, '#c8a070', '#5a3e12');
  pix.rect(4, 3, 2, 2, '#d8f0ff', '#5a7a8a');
  pix.ellipsoid(5, 9, 4.5, 4.5, P, { test: (x, y) => y >= 5 });
  pix.set(3, 7, '#ffffff');
  pix.outline();
  return { pix, ax: 5, ay: 13 };
}
const flaskSprite = () => sprite('lab:frasco', buildFlask);

function createLab(api) {
  const s = {
    active: true,
    won: false,
    stageIndex: 0,
    hand: { kind: null, count: 0 },
    leaves: 0,
    dew: 0,
    mood: 'empty',
    rows: [],
  };
  let ui = null;

  const stage = () => STAGES[s.stageIndex];
  const record = () => api.record(['Pedido', 'Folhas', 'Gotas', 'Resultado'], s.rows);

  /* ---------- Mãos ---------- */

  function refreshHands() {
    if (!s.hand.count) {
      s.hand.kind = null;
      setCarried(null);
      return;
    }
    const kind = s.hand.kind;
    setCarried({
      label: 'ingredientes',
      draw: (ctx) => {
        for (let i = 0; i < Math.min(s.hand.count, 5); i++) {
          if (kind === 'leaf') {
            ctx.fillStyle = '#2e5e2a';
            ctx.fillRect(-8 + i * 3, -5 - (i % 2), 5, 4);
            ctx.fillStyle = i % 2 ? '#7fd36a' : '#5aa84a';
            ctx.fillRect(-7 + i * 3, -4 - (i % 2), 3, 2);
          } else {
            ctx.fillStyle = '#2b5f8a';
            ctx.fillRect(-7 + i * 3, -6, 3, 5);
            ctx.fillStyle = '#8fd0f5';
            ctx.fillRect(-6 + i * 3, -5, 1, 3);
          }
        }
        drawTag(ctx, 0, -14, `${s.hand.count} ${kind === 'leaf' ? 'folhas' : 'gotas'}`);
      },
    });
  }

  /* ---------- Caldeirão (no Phaser) ---------- */

  function setLiquid(mood) {
    s.mood = mood;
    if (!ui) return;
    const color = LIQUID[mood];
    const key = `movel:cauldron:${color}`;
    ui.cauldron.setTexture(ensureCanvasTexture(ui.scene, key, cauldronSprite(color).canvas));
    if (mood === 'ok') ui.bubbles.setFrequency(60);
    else if (mood === 'spoiled') ui.bubbles.setFrequency(-1);
    else ui.bubbles.setFrequency(s.leaves || s.dew ? 160 : 400);
  }

  function openCabinet(kind) {
    if (!ui) return;
    const entry = ui.cabinets[kind];
    const variant = `${kind}-open`;
    const sprite2 = furnitureSprite('cabinet', variant);
    entry.image.setTexture(ensureCanvasTexture(ui.scene, sprite2.key, sprite2.canvas));
    entry.closeTimer?.remove();
    entry.closeTimer = ui.scene.time.delayedCall(900, () => {
      const closed = furnitureSprite('cabinet', `${kind}-closed`);
      entry.image.setTexture(ensureCanvasTexture(ui.scene, closed.key, closed.canvas));
    });
  }

  function gather(kind) {
    if (s.hand.count && s.hand.kind !== kind) {
      api.say(`Suas mãos estão com ${s.hand.kind === 'leaf' ? 'folhas' : 'gotas'}. Ponha no caldeirão antes de pegar outra coisa.`, 'warn');
      return;
    }
    if (s.hand.count >= MAX_IN_HAND) {
      api.say('Suas mãos estão cheias.', 'warn');
      return;
    }
    s.hand = { kind, count: s.hand.count + 1 };
    playAction('harvest');
    openCabinet(kind);
    const spot = CABINETS[kind];
    ui?.scene.fx.sparkle(spot.x, spot.y - 34, 3);
    refreshHands();
  }

  function useCauldron() {
    if (s.hand.count) {
      if (s.hand.kind === 'leaf') s.leaves++;
      else s.dew++;
      s.hand = s.hand.count > 1 ? { kind: s.hand.kind, count: s.hand.count - 1 } : { kind: null, count: 0 };
      playAction('use');
      ui?.scene.fx.sparkle(CAULDRON.x, CAULDRON.y - 22, 4);
      refreshHands();
      setLiquid('mixing');
      return;
    }
    stir();
  }

  function stir() {
    if (!s.leaves || !s.dew) {
      api.say('Ponha folhas e orvalho no caldeirão antes de mexer.', 'warn');
      return;
    }
    playAction('use');
    const order = stage().order;
    const balance = s.leaves * RECIPE.dew - s.dew * RECIPE.leaves; // zero quando a razão é a da receita
    const flasks = (s.leaves / RECIPE.leaves) * RECIPE.flasks;
    const ok = api.attempt(balance === 0 && flasks === order, { etapa: s.stageIndex + 1, encomenda: order, folhas: s.leaves, gotas: s.dew });
    s.rows.push([order, s.leaves, s.dew, balance === 0 ? { value: `${flasks} frascos`, tone: ok ? 'good' : 'bad' } : { value: 'desandou', tone: 'bad' }]);
    record();
    if (ui) ui.scene.tweens.add({ targets: ui.cauldron, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => ui?.cauldron.setAngle(0) });

    if (balance !== 0) {
      setLiquid('spoiled');
      if (ui) {
        ui.scene.fx.sprout(CAULDRON.x, CAULDRON.y - 26, 16);
        ui.scene.cameras.main.shake(200, 0.003);
      }
      api.fail(balance > 0
        ? 'A mistura desandou: ficou verde-escura e grossa, com folha demais para tanto orvalho. Orin jogou fora; comece de novo.'
        : 'A mistura desandou: ficou rala e sem brilho, com orvalho demais para tão poucas folhas. Orin jogou fora; comece de novo.');
      setTimeout(() => {
        if (!s.active) return;
        s.leaves = 0;
        s.dew = 0;
        setLiquid('empty');
      }, 1300);
      return;
    }
    if (!ok) {
      api.fail(`A mistura ficou no ponto e rendeu ${flasks} frascos, mas o pedido é de ${order}. Orin guardou e esvaziou o caldeirão.`);
      s.leaves = 0;
      s.dew = 0;
      setLiquid('empty');
      return;
    }
    setLiquid('ok');
    serveFlasks(order);
    if (s.stageIndex === STAGES.length - 1) {
      s.won = true;
      api.win('Os três pedidos saíram no ponto. O laboratório de poções do Orin voltou a funcionar!');
      return;
    }
    api.say(STAGES[s.stageIndex + 1].intro, 'ok');
    setTimeout(() => s.active && startStage(s.stageIndex + 1), 2600);
  }

  /** Os frascos prontos brotam na bancada, um por um. */
  function serveFlasks(count) {
    if (!ui) return;
    ui.flasks.forEach((flask) => flask.destroy());
    const entry = flaskSprite();
    ensureCanvasTexture(ui.scene, 'lab:frasco', entry.canvas);
    ui.flasks = Array.from({ length: count }, (_, i) => {
      const flask = ui.scene.add.image(TABLE.x - 24 + i * 9, TABLE.y - 26, 'lab:frasco').setOrigin(0.5, 1).setDepth(TABLE.y + 2);
      popIn(ui.scene, flask, ui.scene.fx, { delay: 300 + i * 160, duration: 380 });
      return flask;
    });
  }

  function startStage(index) {
    s.stageIndex = index;
    s.leaves = 0;
    s.dew = 0;
    s.hand = { kind: null, count: 0 };
    refreshHands();
    setLiquid('empty');
    api.setStage(index);
    api.setObjective(`Pedido: ${stage().order} frascos. Receita na parede: 4 folhas + 6 gotas → 2 frascos.`);
    if (index === 0) api.say(stage().intro);
  }

  return {
    get won() {
      return s.won;
    },
    start: () => startStage(0),
    room: () => ({
      ...potionLab(),
      npcs: [{ look: CHARACTERS.orin.look, x: ORIN.x, y: ORIN.y, dir: 'left', label: 'Orin' }],
    }),
    zoneName: () => 'Laboratório de Poções do Orin',
    build(scene) {
      if (!s.active) return;
      const find = (type, variant) => scene.furniture.find((item) => item.type === type && (!variant || item.variant === variant));
      const cauldron = find('cauldron').image;
      const fire = scene.add.image(CAULDRON.x, CAULDRON.y - 1, ensureCanvasTexture(scene, 'fire:0', fireSprite(0).canvas)).setOrigin(fireSprite(0).ax / fireSprite(0).canvas.width, fireSprite(0).ay / fireSprite(0).canvas.height).setDepth(CAULDRON.y - 1);
      let frame = 0;
      scene.time.addEvent({
        delay: 110,
        loop: true,
        callback: () => {
          frame = (frame + 1) % 4;
          fire.setTexture(ensureCanvasTexture(scene, `fire:${frame}`, fireSprite(frame).canvas));
        },
      });
      const glow = scene.add.ellipse(CAULDRON.x, CAULDRON.y - 2, 50, 14, 0xff9a3c, 0.22).setDepth(CAULDRON.y - 2);
      scene.tweens.add({ targets: glow, alpha: { from: 0.12, to: 0.3 }, duration: 300, yoyo: true, repeat: -1 });
      const bubbles = scene.add.particles(CAULDRON.x, CAULDRON.y - 24, 'faiscas', {
        frame: ['c2', 'c1'],
        x: { min: -9, max: 9 },
        speedY: { min: -26, max: -12 },
        lifespan: { min: 600, max: 1100 },
        scale: { start: 1.2, end: 0.3 },
        alpha: { start: 0.9, end: 0 },
        frequency: 400,
      }).setDepth(CAULDRON.y + 5);

      ui = {
        scene,
        cauldron,
        bubbles,
        flasks: [],
        cabinets: { leaf: find('cabinet', 'leaf-closed'), dew: find('cabinet', 'dew-closed') },
      };
      scene.events.once('shutdown', () => {
        if (ui?.scene === scene) ui = null;
      });
      setLiquid(s.mood === 'ok' ? 'ok' : s.leaves || s.dew ? 'mixing' : 'empty');

      scene.addInteractable({ x: CABINETS.leaf.x, y: CABINETS.leaf.y + 14, reach: 26, label: 'Armário de folhas-lunares', enabled: () => !s.won, onInteract: () => gather('leaf') });
      scene.addInteractable({ x: CABINETS.dew.x, y: CABINETS.dew.y + 14, reach: 26, label: 'Armário de orvalho', enabled: () => !s.won, onInteract: () => gather('dew') });
      scene.addInteractable({ x: CAULDRON.x, y: CAULDRON.y + 12, reach: 32, label: 'Caldeirão: pôr ingredientes ou, com as mãos vazias, mexer', enabled: () => !s.won, onInteract: useCauldron });
      scene.addInteractable({ x: ORIN.x, y: ORIN.y, reach: 30, label: 'Orin', promptY: ORIN.y - 70, onInteract: () => runtime.session?.talk?.() });

      scene.addOverlay((ctx) => {
        drawTag(ctx, 189, 70, 'receita: 4 folhas + 6 gotas = 2 frascos', { fill: '#f3e7cb' });
        if (s.won) return;
        drawTag(ctx, CAULDRON.x, CAULDRON.y - 62, `pedido: ${stage().order} frascos`, { fill: '#fff6dc' });
        drawTag(ctx, CAULDRON.x - 24, CAULDRON.y - 48, `${s.leaves} folhas`, { fill: '#d8f5c8' });
        drawTag(ctx, CAULDRON.x + 24, CAULDRON.y - 48, `${s.dew} gotas`, { fill: '#d8ecff' });
        drawTag(ctx, CABINETS.leaf.x, CABINETS.leaf.y + 10, 'folhas', { fill: '#d8f5c8' });
        drawTag(ctx, CABINETS.dew.x, CABINETS.dew.y + 10, 'orvalho', { fill: '#d8ecff' });
      });
    },
    finish({ abandoned }) {
      s.active = false;
      setBuildingHandler('lab', null);
      if (abandoned && isInside('lab')) exitBuilding();
    },
  };
}

function mountPotionLab(api) {
  const lab = createLab(api);
  setBuildingHandler('lab', lab);
  api.onCleanup(() => {
    clearQuestLayer();
    lab.finish({ abandoned: !lab.won });
  });
  lab.start();
  enterBuilding(buildingOfKind('lab'));
}

export default {
  r2b: {
    title: 'Caldeirão de Orin',
    region: 'r2',
    npc: 'orin',
    mode: 'world',
    stages: STAGES.map((item) => item.label),
    greeting: STAGES[0].intro,
    context: 'A poção de brilho de Orin só fica no ponto quando folhas-lunares e gotas de orvalho entram na medida da receita: 4 folhas e 6 gotas rendem 2 frascos. Os pedidos mudam de tamanho. Tudo acontece no laboratório de poções do Orin, no Mercado.',
    goal: 'Preparar 2, 4 e 5 frascos mantendo a proporção da receita.',
    concept: 'Proporcionalidade direta: manter a razão entre ingredientes ao mudar a quantidade',
    prerequisites: 'Razão; multiplicação e divisão (Bancas do Mercado)',
    relation: 'folhas = 2 × frascos; gotas = 3 × frascos (folhas : gotas = 2 : 3)',
    categories: ['proporcionalidade', 'relações entre grandezas'],
    hints: [
      'Pegue folhas no armário verde e orvalho no armário azul (segure E para pegar várias). Leve ao caldeirão e aperte E para pôr. Com as mãos vazias, E no caldeirão mexe a poção.',
      'Se a quantidade de frascos dobra, os dois ingredientes dobram juntos. Se só um muda, a mistura desanda.',
      'Descubra quanto de cada ingrediente vai em 1 frasco e multiplique pela quantidade do pedido.',
    ],
    mountWorld: mountPotionLab,
  },
};
