/* NEXO — Mercado das Trocas, jogado no próprio mapa: "Nem toda quantidade vale o mesmo"
 *
 * Bancas do Mercado: o jogador encosta nas bancas para pôr pacotes no cesto que carrega
 * e paga no balcão do Orin.
 *   1. Agrupar: exatamente 12 cristais (pacotes de 4, 6 e 5).
 *   2. Comparar preços: pelo menos 20 cristais sem passar de 48 moedas (uma banca com 20% de desconto).
 *
 * Caldeirão de Orin: colhe folhas no cesto, pega orvalho no chafariz, leva ao caldeirão
 * e mexe com as mãos vazias. A receita do bilhete: 4 folhas + 6 gotas → 2 frascos.
 *   1. Receita: 2 frascos.  2. Dobro: 4 frascos.  3. Proporção: 5 frascos.
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst } from '../world/quest-layer.js';
import { drawCrystal } from '../art/shapes.js';
import { drawCrystalPack, drawWickerBasket, drawIronCauldron } from '../art/items.js';

const TILE = 32;

/* ---------- Desenho compartilhado ---------- */

function drawTag(ctx, x, y, text, { fill = '#fbf3df', ink = '#2b1d14' } = {}) {
  ctx.font = '700 8px "Fredoka", sans-serif';
  const width = Math.ceil(ctx.measureText(text).width) + 8;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - 6);
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(left - 1, top - 1, width + 2, 12);
  ctx.fillStyle = fill;
  ctx.fillRect(left, top, width, 10);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.round(x), top + 5.5);
}

function drawPack(ctx, x, y, color) {
  drawCrystalPack(ctx, x, y, color);
}

/* ======================================================================
 * r2a: Bancas do Mercado
 * ==================================================================== */

const STALLS = [
  { id: 'lua', name: 'Banca da Lua', size: 4, price: 10, discount: 0, color: '#3f8fd6', x: 24 * TILE, y: 36 * TILE + 10 },
  { id: 'sol', name: 'Banca do Sol', size: 6, price: 18, discount: 0, color: '#e0a12f', x: 27 * TILE, y: 36 * TILE + 10 },
  { id: 'estrela', name: 'Banca da Estrela', size: 5, price: 15, discount: 0.2, color: '#e0523d', x: 34 * TILE, y: 36 * TILE + 10 },
];
const packCost = (stall) => Math.round(stall.price * (1 - stall.discount));
const COUNTER = { x: 35 * TILE + 16, y: 37 * TILE + 28 };
const RETURN_CRATE = { x: 38 * TILE + 16, y: 40 * TILE + 8 };

const STALL_STAGES = [
  {
    label: 'Agrupar',
    objective: 'Junte exatamente 12 cristais no cesto e leve ao balcão do Orin.',
    intro: 'Vamos começar pelos pacotes: preciso de exatamente 12 cristais. Encoste nas bancas para pôr pacotes no cesto e me pague no balcão.',
    purse: null,
    check: (crystals) => (crystals === 12 ? null : crystals < 12 ? `O cesto tem ${crystals} cristais: faltam alguns para chegar a 12.` : `O cesto tem ${crystals} cristais: passou de 12.`),
  },
  {
    label: 'Comparar preços',
    objective: 'Compre pelo menos 20 cristais sem passar de 48 moedas.',
    intro: 'Agora o difícil: preciso de 20 cristais para os lampiões e só tenho 48 moedas. Nem todo pacote grande sai barato!',
    purse: 48,
    check: (crystals, cost) => {
      if (cost > 48) return `O total deu ${cost} moedas: faltaram ${cost - 48} na bolsa.`;
      if (crystals < 20) return `A compra custaria ${cost} moedas e daria ${crystals} cristais. Os lampiões precisam de 20.`;
      return null;
    },
  },
];

function mountStallsWorld(api) {
  let stageIndex = 0;
  let basket = []; // ids das bancas, um por pacote
  let receipt = null;
  const rows = [];

  const stage = () => STALL_STAGES[stageIndex];
  const crystals = () => basket.reduce((sum, id) => sum + STALLS.find((s) => s.id === id).size, 0);
  const cost = () => basket.reduce((sum, id) => sum + packCost(STALLS.find((s) => s.id === id)), 0);
  const record = () => api.record(['Etapa', 'Lua', 'Sol', 'Estrela', 'Cristais', 'Moedas'], rows);

  const basketItem = {
    label: 'cesto',
    draw: (ctx) => {
      // Pacotes atrás da borda da frente do cesto
      basket.slice(0, 6).forEach((id, i) => {
        ctx.save();
        ctx.translate(-5 + (i % 3) * 5, -5 - Math.floor(i / 3) * 3);
        ctx.scale(0.62, 0.62);
        drawPack(ctx, 0, 0, STALLS.find((s) => s.id === id).color);
        ctx.restore();
      });
      ctx.save();
      ctx.translate(0, 2);
      ctx.scale(0.8, 0.8);
      drawWickerBasket(ctx, 0, 0, { leaves: false, shadow: false });
      ctx.restore();
      drawTag(ctx, 0, -20, `${crystals()} cristais`);
    },
  };
  const refreshHands = () => setCarried(basket.length ? basketItem : null);

  STALLS.forEach((stall) => {
    addQuestObject({
      id: `stall-${stall.id}`,
      x: stall.x,
      y: stall.y,
      label: `${stall.name}: ${stall.size} cristais por ${stall.price} moedas`,
      draw: (ctx) => {
        drawTag(ctx, stall.x, stall.y - 58, `${stall.size} por ${stall.price}`);
        if (stall.discount) drawTag(ctx, stall.x + 22, stall.y - 70, `-${stall.discount * 100}%`, { fill: '#c2453b', ink: '#fff6dc' });
      },
      onInteract: () => {
        if (basket.length >= 10) {
          api.say('O cesto está cheio.', 'warn');
          return;
        }
        basket.push(stall.id);
        receipt = null;
        playAction('use');
        burst(stall.x, stall.y - 20, 'sparkle', 5);
        refreshHands();
      },
    });
  });

  addQuestObject({
    id: 'return-crate',
    x: RETURN_CRATE.x,
    y: RETURN_CRATE.y,
    label: 'Caixa de devolução: esvazia o cesto',
    draw: (ctx) => drawTag(ctx, RETURN_CRATE.x, RETURN_CRATE.y - 40, 'devolver'),
    onInteract: () => {
      if (!basket.length) return;
      basket = [];
      receipt = null;
      playAction('crouch');
      burst(RETURN_CRATE.x, RETURN_CRATE.y - 10, 'dust', 6);
      refreshHands();
    },
  });

  addQuestObject({
    id: 'counter',
    x: COUNTER.x,
    y: COUNTER.y,
    label: 'Balcão do Orin: pagar',
    draw: (ctx) => {
      const purse = stage().purse;
      drawTag(ctx, COUNTER.x, COUNTER.y - 40, purse ? `bolsa: ${purse} moedas` : 'balcão');
      if (receipt) drawTag(ctx, COUNTER.x, COUNTER.y - 54, `${receipt.cost} moedas`, { fill: receipt.ok ? '#e9fbe8' : '#fff0e6' });
    },
    onInteract: pay,
  });

  function pay() {
    if (!basket.length) {
      api.say('O cesto está vazio. Encoste nas bancas para pegar pacotes.', 'warn');
      return;
    }
    const counts = Object.fromEntries(STALLS.map((s) => [s.id, basket.filter((id) => id === s.id).length]));
    const total = crystals();
    const price = cost();
    const problem = stage().check(total, price);
    const ok = api.attempt(!problem, { etapa: stageIndex + 1, ...counts, cristais: total, moedas: price });
    receipt = { cost: price, ok };
    rows.push([stageIndex + 1, counts.lua, counts.sol, counts.estrela, total, { value: price, tone: stage().purse && price > stage().purse ? 'bad' : '' }]);
    record();
    if (!ok) {
      api.fail(`${problem} Use a caixa de devolução para esvaziar o cesto.`);
      return;
    }
    burst(COUNTER.x, COUNTER.y - 20, 'success', 18);
    basket = [];
    refreshHands();
    if (stageIndex === STALL_STAGES.length - 1) {
      api.win(`Com ${price} moedas vieram ${total} cristais. Os lampiões do Mercado voltaram a acender!`);
      return;
    }
    api.say(STALL_STAGES[stageIndex + 1].intro, 'ok');
    setTimeout(() => api.isActive() && startStage(stageIndex + 1, false), 2400);
  }

  function startStage(index, announce = true) {
    stageIndex = index;
    basket = [];
    receipt = null;
    refreshHands();
    api.setStage(index);
    api.setObjective(stage().objective);
    if (announce) api.say(stage().intro);
  }

  api.onCleanup(clearQuestLayer);
  record();
  startStage(0);
}

/* ======================================================================
 * r2b: Caldeirão de Orin
 * ==================================================================== */

const RECIPE = { flasks: 2, leaves: 4, dew: 6 }; // razão folhas : gotas = 2 : 3
const MAX_IN_HAND = 15;
const LEAF_BASKET = { x: 23 * TILE, y: 38 * TILE + 24 };
const FOUNTAIN = { x: 30 * TILE + 16, y: 41 * TILE + 6 };
const CAULDRON = { x: 26 * TILE + 16, y: 38 * TILE + 24 };

const BREW_STAGES = [
  { label: 'Receita', order: 2, intro: 'Siga o bilhete da receita: 4 folhas e 6 gotas de orvalho fazem 2 frascos. Quando tudo estiver no caldeirão, mexa com as mãos vazias.' },
  { label: 'Dobro', order: 4, intro: 'Saiu no ponto! Agora um cliente quer 4 frascos.' },
  { label: 'Proporção', order: 5, intro: 'Mais um pedido, e esse é chato: 5 frascos. Não dá para só dobrar a receita.' },
];

function mountCauldronWorld(api) {
  let stageIndex = 0;
  let hand = { kind: null, count: 0 };
  let leaves = 0;
  let dew = 0;
  let mood = 'idle'; // idle | ok | spoiled
  const rows = [];

  const stage = () => BREW_STAGES[stageIndex];
  const record = () => api.record(['Pedido', 'Folhas', 'Gotas', 'Resultado'], rows);

  const handItem = {
    label: 'ingredientes',
    draw: (ctx) => {
      for (let i = 0; i < Math.min(hand.count, 5); i++) {
        if (hand.kind === 'leaf') {
          ctx.fillStyle = i % 2 ? '#7fd36a' : '#5aa84a';
          ctx.fillRect(-7 + i * 3, -4 - (i % 2), 4, 2);
        } else {
          ctx.fillStyle = '#8fd0f5';
          ctx.fillRect(-6 + i * 3, -5, 2, 3);
          ctx.fillStyle = '#e6f7ff';
          ctx.fillRect(-6 + i * 3, -5, 1, 1);
        }
      }
      drawTag(ctx, 0, -14, `${hand.count} ${hand.kind === 'leaf' ? 'folhas' : 'gotas'}`);
    },
  };
  const refreshHands = () => setCarried(hand.count ? handItem : null);

  function gather(kind, x, y) {
    if (hand.count && hand.kind !== kind) {
      api.say(`Suas mãos estão com ${hand.kind === 'leaf' ? 'folhas' : 'gotas'}. Ponha no caldeirão antes de pegar outra coisa.`, 'warn');
      return;
    }
    if (hand.count >= MAX_IN_HAND) {
      api.say('Suas mãos estão cheias.', 'warn');
      return;
    }
    hand = { kind, count: hand.count + 1 };
    playAction('harvest');
    burst(x, y - 10, 'sparkle', 3);
    refreshHands();
  }

  addQuestObject({
    id: 'leaf-basket',
    x: LEAF_BASKET.x,
    y: LEAF_BASKET.y,
    label: 'Cesto de folhas-lunares',
    draw: (ctx) => drawLeafBasket(ctx, LEAF_BASKET.x, LEAF_BASKET.y),
    onInteract: () => gather('leaf', LEAF_BASKET.x, LEAF_BASKET.y),
  });

  addQuestObject({
    id: 'fountain-dew',
    x: FOUNTAIN.x,
    y: FOUNTAIN.y,
    label: 'Orvalho do chafariz',
    draw: (ctx) => drawTag(ctx, FOUNTAIN.x, FOUNTAIN.y - 14, 'orvalho'),
    onInteract: () => gather('dew', FOUNTAIN.x, FOUNTAIN.y),
  });

  addQuestObject({
    id: 'cauldron',
    x: CAULDRON.x,
    y: CAULDRON.y,
    label: 'Caldeirão: pôr ingredientes ou, com as mãos vazias, mexer',
    draw: (ctx, t) => drawCauldron(ctx, CAULDRON.x, CAULDRON.y, leaves, dew, mood, stage().order, t),
    onInteract: useCauldron,
  });

  function useCauldron() {
    if (hand.count) {
      if (hand.kind === 'leaf') leaves++;
      else dew++;
      hand = hand.count > 1 ? { kind: hand.kind, count: hand.count - 1 } : { kind: null, count: 0 };
      mood = 'idle';
      playAction('use');
      burst(CAULDRON.x, CAULDRON.y - 18, 'sparkle', 3);
      refreshHands();
      return;
    }
    stir();
  }

  function stir() {
    if (!leaves || !dew) {
      api.say('Ponha folhas e orvalho no caldeirão antes de mexer.', 'warn');
      return;
    }
    playAction('use');
    const order = stage().order;
    const balance = leaves * RECIPE.dew - dew * RECIPE.leaves; // zero quando a razão é a da receita
    const flasks = (leaves / RECIPE.leaves) * RECIPE.flasks;
    const ok = api.attempt(balance === 0 && flasks === order, { etapa: stageIndex + 1, encomenda: order, folhas: leaves, gotas: dew });
    rows.push([order, leaves, dew, balance === 0 ? { value: `${flasks} frascos`, tone: ok ? 'good' : 'bad' } : { value: 'desandou', tone: 'bad' }]);
    record();

    if (balance !== 0) {
      mood = 'spoiled';
      burst(CAULDRON.x, CAULDRON.y - 20, 'dust', 12);
      api.fail(balance > 0
        ? 'A mistura desandou: ficou verde-escura e grossa, com folha demais para tanto orvalho. Orin jogou fora; comece de novo.'
        : 'A mistura desandou: ficou rala e sem brilho, com orvalho demais para tão poucas folhas. Orin jogou fora; comece de novo.');
      setTimeout(() => {
        leaves = 0;
        dew = 0;
        mood = 'idle';
      }, 1200);
      return;
    }
    if (!ok) {
      mood = 'idle';
      api.fail(`A mistura ficou no ponto e rendeu ${flasks} frascos, mas o pedido é de ${order}. Orin guardou e esvaziou o caldeirão.`);
      leaves = 0;
      dew = 0;
      return;
    }
    mood = 'ok';
    burst(CAULDRON.x, CAULDRON.y - 24, 'success', 20);
    if (stageIndex === BREW_STAGES.length - 1) {
      api.win('Os três pedidos saíram no ponto. A banca de poções de Orin reabriu!');
      return;
    }
    api.say(BREW_STAGES[stageIndex + 1].intro, 'ok');
    setTimeout(() => api.isActive() && startStage(stageIndex + 1), 2400);
  }

  function startStage(index) {
    stageIndex = index;
    leaves = 0;
    dew = 0;
    mood = 'idle';
    hand = { kind: null, count: 0 };
    refreshHands();
    api.setStage(index);
    api.setObjective(`Pedido: ${stage().order} frascos. Receita: 4 folhas + 6 gotas → 2 frascos.`);
    if (index === 0) api.say(stage().intro);
  }

  api.onCleanup(clearQuestLayer);
  record();
  startStage(0);
}

function drawLeafBasket(ctx, x, y) {
  drawWickerBasket(ctx, x, y);
  drawTag(ctx, x, y - 26, 'folhas');
}

function drawCauldron(ctx, x, y, leaves, dew, mood, order, t) {
  const liquid = mood === 'ok' ? '#5fe3d0' : mood === 'spoiled' ? '#3d6b2a' : leaves || dew ? '#4f7f9a' : '#2b3550';
  drawIronCauldron(ctx, x, y, liquid, t, mood === 'ok' ? 1.6 : 0.7);
  if (mood === 'ok') drawCrystal(ctx, x, y - 34 + Math.sin(t * 3) * 2, 4, { glow: 1.4 });
  drawTag(ctx, x - 22, y - 38, `${leaves} folhas`);
  drawTag(ctx, x + 22, y - 38, `${dew} gotas`);
  drawTag(ctx, x, y - 54, `pedido: ${order} frascos`, { fill: '#fff6dc' });
}

export default {
  r2a: {
    title: 'Bancas do Mercado',
    region: 'r2',
    npc: 'orin',
    mode: 'world',
    stages: STALL_STAGES.map((stage) => stage.label),
    greeting: STALL_STAGES[0].intro,
    context: 'Cada banca do Mercado vende pacotes de tamanho e preço diferentes, e uma delas está com desconto. Orin precisa primeiro de uma quantidade exata de cristais e depois de 20 cristais com só 48 moedas.',
    goal: 'Juntar exatamente 12 cristais; depois comprar pelo menos 20 cristais sem passar de 48 moedas.',
    concept: 'Agrupamento e multiplicação; razão entre preço e quantidade; comparação de razões; desconto percentual',
    prerequisites: 'Multiplicação e divisão; ideia de porcentagem',
    relation: 'Etapa 1: 12 = 3 × 4 = 2 × 6. Etapa 2: Lua 2,5 moedas por cristal; Sol 3; Estrela 15 × 0,8 ÷ 5 = 2,4',
    categories: ['operações', 'proporcionalidade', 'porcentagem'],
    hints: [
      'Encoste numa banca e aperte E para pôr um pacote no cesto. A etiqueta mostra quantos cristais vêm no pacote e quanto custa. A caixa de devolução esvazia o cesto.',
      'Pacotes maiores nem sempre saem mais baratos. Compare quanto custa cada cristal em cada banca, lembrando o desconto de 20% da Banca da Estrela.',
      'Escolha a banca em que cada cristal sai mais barato e veja quantos pacotes dela chegam a 20 cristais.',
    ],
    mountWorld: mountStallsWorld,
  },
  r2b: {
    title: 'Caldeirão de Orin',
    region: 'r2',
    npc: 'orin',
    mode: 'world',
    stages: BREW_STAGES.map((stage) => stage.label),
    greeting: BREW_STAGES[0].intro,
    context: 'A poção de brilho de Orin só fica no ponto quando folhas-lunares e gotas de orvalho entram na medida da receita: 4 folhas e 6 gotas rendem 2 frascos. Os pedidos mudam de tamanho.',
    goal: 'Preparar 2, 4 e 5 frascos mantendo a proporção da receita.',
    concept: 'Proporcionalidade direta: manter a razão entre ingredientes ao mudar a quantidade',
    prerequisites: 'Razão; multiplicação e divisão (Bancas do Mercado)',
    relation: 'folhas = 2 × frascos; gotas = 3 × frascos (folhas : gotas = 2 : 3)',
    categories: ['proporcionalidade', 'relações entre grandezas'],
    hints: [
      'Pegue folhas no cesto e orvalho no chafariz (segure E para pegar várias). Leve ao caldeirão e aperte E para pôr. Com as mãos vazias, E no caldeirão mexe a poção.',
      'Se a quantidade de frascos dobra, os dois ingredientes dobram juntos. Se só um muda, a mistura desanda.',
      'Descubra quanto de cada ingrediente vai em 1 frasco e multiplique pela quantidade do pedido.',
    ],
    mountWorld: mountCauldronWorld,
  },
};
