/* NEXO — Desafios extras de geometria no Vale dos Recursos, jogados no próprio mapa
 *
 * r1c Jardim Espelhado (simetria de reflexão), liberado depois do Vale:
 *   um lado do canteiro já tem flores; o jogador planta do outro lado do caminho de pedras
 *   para que o jardim fique espelhado. Etapas: eixo vertical, duas cores, eixo horizontal.
 * r1d Cercas do Vale (perímetro e área), liberado depois do Mercado:
 *   1. Perímetro: levar ao carrinho exatamente as tábuas que cercam o canteiro 5 × 3.
 *   2. Mesmo perímetro, mais área: com 20 tábuas, o cercado com mais espaço (5 × 5).
 *   3. Mesma área, menos cerca: 24 quadradinhos gastando o mínimo de tábuas (4 × 6).
 */

import { addQuestObject, clearQuestLayer, playAction, burst } from '../world/quest-layer.js';
import { createHands } from './kit/hands.js';
import {
  FLOWER_COLORS, drawPlot, drawStonePath, drawFlower, drawSeedlingBasket,
  drawBoardPile, drawBoardHandful, drawFence, drawAreaSquares,
} from '../art/garden-props.js';
import { drawMineCart } from '../art/mission-props.js';
import { tileFoot, drawTag, drawArrow, addLever, addDial } from './world-kit.js';
import { prefersCalm } from '../core/state.js';

/* ======================================================================
 * r1c: Jardim Espelhado
 * ==================================================================== */

const CELL = 16;
const PATH = 8;
const GARDEN = { x: 208, y: 968 };
const BASKETS = { red: tileFoot(11, 30), yellow: tileFoot(13, 30) };
const COLOR_NAMES = { red: 'vermelha', yellow: 'amarela' };
const MAX_SEEDLINGS = 6;

/**
 * Cada etapa: eixo ('v' entre colunas, 'h' entre linhas), tamanho e flores do lado já plantado.
 * flowers: [coluna, linha, cor] no lado do modelo (esquerda no eixo vertical, em cima no horizontal).
 */
const MIRROR_STAGES = [
  {
    label: 'Eixo vertical',
    axis: 'v', cols: 8, rows: 3,
    flowers: [[0, 1, 'red'], [2, 0, 'red'], [3, 2, 'red']],
    objective: 'Plante flores vermelhas do lado direito do caminho para o jardim ficar espelhado.',
    intro: 'O caminho de pedras é o espelho do jardim. Do lado esquerdo já tem flores; plante do lado direito para ficar igualzinho, como num espelho.',
  },
  {
    label: 'Duas cores',
    axis: 'v', cols: 8, rows: 3,
    flowers: [[0, 0, 'red'], [1, 1, 'red'], [2, 0, 'yellow'], [3, 2, 'yellow'], [1, 2, 'yellow']],
    objective: 'Agora com duas cores: espelhe as flores vermelhas e amarelas do lado esquerdo.',
    intro: 'Lindo! Agora com duas cores. Cada flor do outro lado tem que ter a mesma cor da flor que ela espelha.',
  },
  {
    label: 'Eixo horizontal',
    axis: 'h', cols: 6, rows: 4,
    flowers: [[0, 0, 'red'], [2, 1, 'red'], [5, 0, 'red'], [3, 0, 'yellow'], [4, 1, 'yellow']],
    objective: 'O caminho agora atravessa o jardim deitado. Espelhe as flores de cima na parte de baixo.',
    intro: 'Último canteiro: o caminho agora é deitado. O espelho fica embaixo: o que está perto do caminho em cima fica perto do caminho embaixo.',
  },
];

const mirrorOf = (stage, [col, row]) => (stage.axis === 'v' ? [stage.cols - 1 - col, row] : [col, stage.rows - 1 - row]);

/** Canto superior esquerdo de uma célula, pulando o caminho de pedras. */
function cellOrigin(stage, col, row) {
  const half = stage.axis === 'v' ? stage.cols / 2 : stage.rows / 2;
  const x = GARDEN.x + col * CELL + (stage.axis === 'v' && col >= half ? PATH : 0);
  const y = GARDEN.y + row * CELL + (stage.axis === 'h' && row >= half ? PATH : 0);
  return { x, y };
}

function mountMirrorWorld(api) {
  let stageIndex = 0;
  let planted = {}; // "col,row" → cor, no lado que o jogador planta
  let wrong = new Set();
  let blooming = 0;
  const rows = [];

  const stage = () => MIRROR_STAGES[stageIndex];
  const key = (col, row) => `${col},${row}`;
  const isTargetSide = (col, row) => {
    const s = stage();
    return s.axis === 'v' ? col >= s.cols / 2 : row >= s.rows / 2;
  };
  const record = () => api.record(['Etapa', 'Flores espelhadas'], rows);

  const drawSeedlings = (color) => (ctx, hands) => {
    for (let i = 0; i < Math.min(hands.count, 3); i++) drawFlower(ctx, -4 + i * 4, 6, FLOWER_COLORS[color]);
    drawTag(ctx, 0, -12, String(hands.count));
  };
  const hands = createHands({
    say: api.say,
    limit: MAX_SEEDLINGS,
    kinds: Object.fromEntries(Object.keys(BASKETS).map((color) => [color, { name: `mudas ${COLOR_NAMES[color]}s`, label: 'mudas de flor', draw: drawSeedlings(color) }])),
    messages: {
      busy: (current) => `Você está com mudas ${COLOR_NAMES[current]}s. Plante ou devolva antes de pegar outra cor.`,
      full: () => 'Suas mãos estão cheias de mudas.',
    },
  });

  // Caminho de pedras e flores-modelo
  addQuestObject({
    id: 'mirror-garden',
    x: 0,
    y: 0,
    reach: 0,
    label: 'Jardim',
    enabled: () => false,
    draw: (ctx, t) => {
      const s = stage();
      for (let row = 0; row < s.rows; row++) {
        for (let col = 0; col < s.cols; col++) {
          if (isTargetSide(col, row)) continue;
          const o = cellOrigin(s, col, row);
          drawPlot(ctx, o.x, o.y, CELL);
        }
      }
      if (s.axis === 'v') drawStonePath(ctx, GARDEN.x + (s.cols / 2) * CELL, GARDEN.y - 4, PATH, s.rows * CELL + 8);
      else drawStonePath(ctx, GARDEN.x - 4, GARDEN.y + (s.rows / 2) * CELL, s.cols * CELL + 8, PATH);
      s.flowers.forEach(([col, row, color], i) => {
        const o = cellOrigin(s, col, row);
        drawFlower(ctx, o.x + CELL / 2, o.y + CELL - 3, FLOWER_COLORS[color], Math.round(Math.sin(t * 2 + i) * blooming));
      });
    },
    onInteract: () => {},
  });

  // Covas do lado a plantar (um ponto de interação por cova)
  const maxCols = Math.max(...MIRROR_STAGES.map((s) => s.cols));
  const maxRows = Math.max(...MIRROR_STAGES.map((s) => s.rows));
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < maxCols; col++) {
      const inStage = () => col < stage().cols && row < stage().rows && isTargetSide(col, row);
      addQuestObject({
        id: `mirror-cell-${col}-${row}`,
        get x() {
          return cellOrigin(stage(), col, row).x + CELL / 2;
        },
        get y() {
          return cellOrigin(stage(), col, row).y + CELL - 2;
        },
        reach: 13,
        label: 'Cova do jardim',
        enabled: inStage,
        draw: (ctx, t) => {
          if (!inStage()) return;
          const o = cellOrigin(stage(), col, row);
          drawPlot(ctx, o.x, o.y, CELL, { highlight: wrong.has(key(col, row)) ? 'bad' : null });
          const color = planted[key(col, row)];
          if (color) drawFlower(ctx, o.x + CELL / 2, o.y + CELL - 3, FLOWER_COLORS[color], Math.round(Math.sin(t * 2 + col + row) * blooming));
        },
        onInteract: () => useCell(col, row),
      });
    }
  }

  for (const color of Object.keys(BASKETS)) {
    const spot = BASKETS[color];
    addQuestObject({
      id: `basket-${color}`,
      ...spot,
      reach: 26,
      label: `Cesto de mudas (${COLOR_NAMES[color]})`,
      enabled: () => stage().flowers.some(([, , c]) => c === color),
      draw: (ctx, t) => {
        if (!stage().flowers.some(([, , c]) => c === color)) return;
        drawSeedlingBasket(ctx, spot.x, spot.y, FLOWER_COLORS[color]);
        if (hands.empty && Object.keys(planted).length === 0) drawArrow(ctx, spot.x, spot.y - 26, t);
      },
      onInteract: () => {
        if (hands.take(color)) playAction('crouch');
      },
    });
  }

  function useCell(col, row) {
    const k = key(col, row);
    wrong.delete(k);
    if (planted[k]) {
      if (!hands.empty && hands.kind !== planted[k]) {
        api.say('Essa cova já tem uma flor de outra cor. Com as mãos vazias, você pode tirá-la.', 'warn');
        return;
      }
      if (!hands.take(planted[k])) return;
      delete planted[k];
      playAction('crouch');
      return;
    }
    if (hands.empty) {
      api.say('Pegue mudas no cesto primeiro.', 'warn');
      return;
    }
    planted[k] = hands.kind;
    hands.drop();
    playAction('dig');
    const o = cellOrigin(stage(), col, row);
    burst(o.x + CELL / 2, o.y + CELL / 2, 'dust', 5);
    check();
  }

  /** Quando há tantas flores plantadas quanto no modelo, Tainá confere o espelho. */
  function check() {
    const s = stage();
    if (Object.keys(planted).length !== s.flowers.length) return;
    const expected = new Map(s.flowers.map(([col, row, color]) => [key(...mirrorOf(s, [col, row])), color]));
    wrong = new Set(Object.entries(planted).filter(([k, color]) => expected.get(k) !== color).map(([k]) => k));
    const hits = s.flowers.length - wrong.size;
    rows.push([stageIndex + 1, { value: `${hits} de ${s.flowers.length}`, tone: wrong.size ? 'bad' : 'good' }]);
    record();
    if (!api.attempt(!wrong.size, { etapa: stageIndex + 1, eixo: s.axis, certas: hits, total: s.flowers.length })) {
      api.fail(`Tainá olhou do caminho: ${wrong.size === 1 ? 'uma flor não está' : `${wrong.size} flores não estão`} no lugar do espelho (marcadas em vermelho). ${s.axis === 'v' ? 'Conte a distância de cada flor até o caminho.' : 'Conte quantas fileiras cada flor está longe do caminho.'}`);
      return;
    }
    blooming = 1;
    Object.keys(planted).forEach((k) => {
      const [col, row] = k.split(',').map(Number);
      const o = cellOrigin(s, col, row);
      burst(o.x + CELL / 2, o.y, 'success', 6);
    });
    if (stageIndex === MIRROR_STAGES.length - 1) {
      api.win('O jardim ficou espelhado dos dois jeitos. As borboletas já descobriram o Vale!');
      return;
    }
    api.say(MIRROR_STAGES[stageIndex + 1].intro, 'ok');
    setTimeout(() => {
      if (!api.isActive()) return;
      startStage(stageIndex + 1, false);
    }, prefersCalm() ? 0 : 2200);
  }

  function startStage(index, announce = true) {
    stageIndex = index;
    planted = {};
    wrong = new Set();
    hands.dropAll();
    blooming = 0;
    api.setStage(index);
    api.setObjective(stage().objective);
    if (announce) api.say(stage().intro);
  }

  api.onCleanup(clearQuestLayer);
  record();
  startStage(0);
}

/* ======================================================================
 * r1d: Cercas do Vale
 * ==================================================================== */

const UNIT = 12;
const PLOT = { left: 216, top: 962 };
// A fileira 33 é de árvores: tudo fica nas fileiras 30 e 31 para não sumir atrás delas
const BOARD_PILE = tileFoot(11, 31);
const BOARD_CART = tileFoot(12, 30);
const FENCE_LEVER = tileFoot(14, 30);
const DIAL_W = { x: 10 * 32 + 16, y: 30 * 32 + 26 };
const DIAL_H = { x: 12 * 32 + 16, y: 30 * 32 + 26 };
const MAX_BOARDS = 30;
const perimeter = (w, h) => 2 * (w + h);

const FENCE_STAGES = [
  {
    label: 'Perímetro',
    objective: 'Leve ao carrinho exatamente as tábuas que cercam o canteiro 5 × 3 e puxe a alavanca.',
    intro: 'Esse canteiro de 5 por 3 precisa de cerca. Cada tábua cobre o lado de um quadradinho. Traga só as tábuas certas: madeira não dá em árvore... quer dizer, dá, mas demora!',
  },
  {
    label: 'Mais espaço',
    objective: 'Com exatamente 20 tábuas, monte o cercado com mais quadradinhos dentro. Gire os mostradores e puxe a alavanca.',
    intro: 'As galinhas querem um cercado novo. Temos 20 tábuas. Com a mesma cerca, que formato deixa mais espaço lá dentro?',
  },
  {
    label: 'Menos cerca',
    objective: 'Monte uma horta com 24 quadradinhos gastando o mínimo de tábuas.',
    intro: 'Agora o contrário: a horta nova precisa de 24 quadradinhos de terra. Qual formato gasta menos tábuas de cerca?',
  },
];

function mountFenceWorld(api) {
  let stageIndex = 0;
  let inCart = 0;
  let built = null; // { w, h, boards }
  const rows = [];

  const stage = () => FENCE_STAGES[stageIndex];
  const record = () => api.record(['Etapa', 'Cercado', 'Tábuas', 'Quadradinhos'], rows);

  const hands = createHands({
    say: api.say,
    kinds: {
      tabua: {
        name: 'tábuas',
        draw: (ctx, held) => {
          drawBoardHandful(ctx, 0, 6, held.count);
          drawTag(ctx, 0, -12, String(held.count));
        },
      },
    },
  });

  const dialW = addDial({ id: 'fence-w', ...DIAL_W, label: 'Largura', min: 1, max: 8, value: 3, visible: () => stageIndex > 0, caption: 'largura' });
  const dialH = addDial({ id: 'fence-h', ...DIAL_H, label: 'Comprimento', min: 1, max: 7, value: 3, visible: () => stageIndex > 0, caption: 'comprimento' });

  addQuestObject({
    id: 'fence-plot',
    x: 0,
    y: 0,
    reach: 0,
    label: 'Cercado',
    enabled: () => false,
    draw: (ctx) => {
      const [w, h] = stageIndex === 0 ? [5, 3] : [dialW.get(), dialH.get()];
      drawAreaSquares(ctx, PLOT.left, PLOT.top, w, h, UNIT);
      if (built) {
        drawFence(ctx, PLOT.left, PLOT.top, built.w, built.h, UNIT, built.boards);
      } else {
        // Estacas nos cantos mostram onde a cerca vai ficar
        ctx.fillStyle = 'rgba(80, 40, 20, .6)';
        for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) ctx.fillRect(PLOT.left + cx * UNIT - 1, PLOT.top + cy * UNIT - 3, 2, 4);
      }
      drawTag(ctx, PLOT.left + (w * UNIT) / 2, PLOT.top - 12, `${w} × ${h}`);
      if (stageIndex === 1) drawTag(ctx, FENCE_LEVER.x, FENCE_LEVER.y - 34, '20 tábuas');
      if (stageIndex === 2) drawTag(ctx, FENCE_LEVER.x, FENCE_LEVER.y - 34, '24 quadradinhos');
    },
    onInteract: () => {},
  });

  addQuestObject({
    id: 'board-pile',
    ...BOARD_PILE,
    reach: 26,
    label: 'Pilha de tábuas',
    enabled: () => stageIndex === 0,
    draw: (ctx) => {
      if (stageIndex === 0) drawBoardPile(ctx, BOARD_PILE.x, BOARD_PILE.y);
    },
    onInteract: () => {
      if (hands.count + inCart >= MAX_BOARDS) {
        api.say('Já tem tábua demais por aqui.', 'warn');
        return;
      }
      hands.take('tabua');
      playAction('crouch');
    },
  });

  addQuestObject({
    id: 'board-cart',
    ...BOARD_CART,
    reach: 28,
    label: 'Carrinho de tábuas',
    enabled: () => stageIndex === 0,
    draw: (ctx, t) => {
      if (stageIndex !== 0) return;
      drawMineCart(ctx, BOARD_CART.x, BOARD_CART.y, 0);
      if (inCart) drawBoardHandful(ctx, BOARD_CART.x, BOARD_CART.y - 12, inCart);
      drawTag(ctx, BOARD_CART.x, BOARD_CART.y - 36, `${inCart} tábuas`);
      if (!hands.empty) drawArrow(ctx, BOARD_CART.x, BOARD_CART.y - 50, t);
    },
    onInteract: () => {
      if (!hands.empty) {
        inCart += hands.dropAll().length;
        playAction('crouch');
        return;
      }
      if (inCart) {
        inCart--;
        hands.take('tabua');
        return;
      }
      api.say('Pegue tábuas na pilha e ponha no carrinho.', 'warn');
    },
  });

  addLever({ id: 'fence-lever', ...FENCE_LEVER, label: 'Levantar a cerca', color: '#8a5a33', onPull: build });

  function build() {
    if (stageIndex === 0) {
      if (!inCart) {
        api.say('O carrinho está vazio. Traga as tábuas primeiro.', 'warn');
        return;
      }
      const need = perimeter(5, 3);
      built = { w: 5, h: 3, boards: inCart };
      rows.push([1, '5 × 3', { value: inCart, tone: inCart === need ? 'good' : 'bad' }, 15]);
      record();
      if (!api.attempt(inCart === need, { etapa: 1, tabuas: inCart, perimetro: need })) {
        api.fail(inCart < need
          ? `Com ${inCart} tábuas a cerca ficou aberta: as galinhas fugiriam! Conte quantos lados de quadradinho ficam na borda.`
          : `A cerca fechou e ainda sobraram ${inCart - need} tábuas no chão. Com as mãos vazias, dá para tirar tábuas do carrinho.`);
        return;
      }
      nextStage('O canteiro ficou cercado sem sobrar nem faltar tábua!');
      return;
    }

    const w = dialW.get();
    const h = dialH.get();
    const p = perimeter(w, h);
    const area = w * h;

    if (stageIndex === 1) {
      built = { w, h, boards: 20 };
      rows.push([2, `${w} × ${h}`, { value: p, tone: p === 20 ? 'good' : 'bad' }, { value: area, tone: area === 25 ? 'good' : 'bad' }]);
      record();
      const ok = api.attempt(p === 20 && area === 25, { etapa: 2, largura: w, altura: h, perimetro: p, area });
      if (ok) {
        nextStage('Um quadrado de 5 × 5: 25 quadradinhos com as mesmas 20 tábuas. As galinhas aprovaram!');
        return;
      }
      api.fail(p !== 20
        ? `Esse cercado de ${w} × ${h} precisaria de ${p} tábuas, e temos exatamente 20. ${p > 20 ? 'Ficou um pedaço aberto.' : 'Sobrou tábua no chão.'}`
        : `Com ${w} × ${h} cabem ${area} quadradinhos. Usa as 20 tábuas certinho, mas dá para caber mais! Experimente formatos mais "quadrados".`);
      return;
    }

    built = { w, h, boards: p };
    rows.push([3, `${w} × ${h}`, { value: p, tone: area === 24 && p === 20 ? 'good' : 'bad' }, { value: area, tone: area === 24 ? 'good' : 'bad' }]);
    record();
    const ok = api.attempt(area === 24 && p === 20, { etapa: 3, largura: w, altura: h, perimetro: p, area });
    if (ok) {
      burst(PLOT.left + (w * UNIT) / 2, PLOT.top + (h * UNIT) / 2, 'success', 24);
      api.win(`Uma horta de ${w} × ${h}: 24 quadradinhos com só 20 tábuas. O Vale agradece, Reconector!`);
      return;
    }
    api.fail(area !== 24
      ? `A horta de ${w} × ${h} tem ${area} quadradinhos, e precisamos de 24.`
      : `Deu 24 quadradinhos, mas gastou ${p} tábuas. Tem um formato que gasta menos.`);
  }

  function nextStage(message) {
    burst(PLOT.left + 40, PLOT.top + 20, 'success', 20);
    api.say(`${message} ${FENCE_STAGES[stageIndex + 1].intro}`, 'ok');
    setTimeout(() => {
      if (!api.isActive()) return;
      stageIndex++;
      built = null;
      hands.dropAll();
      inCart = 0;
      api.setStage(stageIndex);
      api.setObjective(stage().objective);
    }, prefersCalm() ? 0 : 2400);
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective(stage().objective);
  record();
}

export default {
  r1c: {
    title: 'Jardim Espelhado',
    region: 'r1',
    npc: 'taina',
    mode: 'world',
    extra: true,
    unlockAfter: 'r1',
    stages: MIRROR_STAGES.map((item) => item.label),
    greeting: MIRROR_STAGES[0].intro,
    context: 'Tainá quer um jardim de flores ao lado do Vale, com um caminho de pedras no meio. Os dois lados precisam ficar iguais, como se o caminho fosse um espelho.',
    goal: 'Plantar as flores do outro lado do caminho para que o jardim fique simétrico, com eixo vertical e horizontal.',
    concept: 'Simetria de reflexão: figura e imagem à mesma distância do eixo',
    prerequisites: 'Contagem; noções de posição (esquerda, direita, em cima, embaixo)',
    relation: 'Cada flor e a sua imagem ficam à mesma distância do eixo, em lados opostos',
    categories: ['geometria'],
    hints: [
      'Pegue mudas no cesto, chegue perto de uma cova e aperte E para plantar. Com as mãos vazias, E numa flor tira ela de volta.',
      'Escolha uma flor do modelo e conte quantas covas ela está longe do caminho. A flor espelhada fica a essa mesma distância, do outro lado.',
      'No espelho, o que está perto do caminho continua perto, e o que está longe continua longe. A fileira (ou a coluna) de cada flor não muda.',
    ],
    mountWorld: mountMirrorWorld,
  },
  r1d: {
    title: 'Cercas do Vale',
    region: 'r1',
    npc: 'taina',
    mode: 'world',
    extra: true,
    unlockAfter: 'r2',
    stages: FENCE_STAGES.map((item) => item.label),
    greeting: FENCE_STAGES[0].intro,
    context: 'Depois do Mercado, Tainá ganhou tábuas novas para cercar canteiros e um galinheiro. Tábua não pode faltar nem sobrar, e o espaço lá dentro tem que ser bem aproveitado.',
    goal: 'Calcular a cerca de um canteiro (perímetro), achar o cercado de maior área com 20 tábuas e a horta de 24 quadradinhos com menos cerca.',
    concept: 'Perímetro e área de retângulos; mesmo perímetro com áreas diferentes e vice-versa',
    prerequisites: 'Multiplicação; contagem de quadradinhos (Vale e Mercado)',
    relation: 'Perímetro = 2 × (largura + comprimento); área = largura × comprimento',
    categories: ['geometria', 'operações'],
    hints: [
      'Cada tábua cobre o lado de um quadradinho que fica na borda. Conte os lados de cima, de baixo e dos dois lados.',
      'Para a mesma cerca, compare formatos compridos e formatos mais "quadrados". Qual deixa mais quadradinhos lá dentro?',
      'Para 24 quadradinhos, liste os retângulos possíveis (largura × comprimento = 24) e calcule a cerca de cada um.',
    ],
    mountWorld: mountFenceWorld,
  },
};
