/* NEXO — Mercado das Trocas, jogado no próprio mapa: "Nem toda quantidade vale o mesmo"
 *
 * As mesmas três bancas servem a duas missões. O jogador encosta nas bancas para pôr
 * pacotes no cesto que carrega e paga no balcão do Orin.
 *   r2a Bancas do Mercado (agrupar): pedidos exatos de 12 e de 17 cristais, com pacotes de
 *       4, 6 e 5 (há mais de um jeito certo).
 *   r2c Promoção (depois do Caldeirão): pelo menos 20 cristais com a bolsa limitada.
 *       1. Preço por cristal: 50 moedas, sem desconto (só a banca mais barata por cristal serve).
 *       2. Desconto: 48 moedas, com 20% de desconto na Banca da Estrela.
 * Antes, agrupar e comparar preços com desconto ficavam na mesma missão: um salto do 3º
 * para o 7º ano de uma etapa para a outra.
 *
 * (O Caldeirão de Orin, r2b, acontece no laboratório de poções: ver potion-lab.js.)
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst } from '../world/quest-layer.js';
import { drawCrystalPack, drawWickerBasket } from '../art/items.js';
import { drawTag } from './world-kit.js';

const TILE = 32;

function drawPack(ctx, x, y, color) {
  drawCrystalPack(ctx, x, y, color);
}

/* ======================================================================
 * Bancas (compartilhadas por r2a e r2c)
 * ==================================================================== */

const STALLS = [
  { id: 'lua', name: 'Banca da Lua', size: 4, price: 10, color: '#3f8fd6', x: 24 * TILE, y: 36 * TILE + 10 },
  { id: 'sol', name: 'Banca do Sol', size: 6, price: 18, color: '#e0a12f', x: 27 * TILE, y: 36 * TILE + 10 },
  { id: 'estrela', name: 'Banca da Estrela', size: 5, price: 15, color: '#e0523d', x: 34 * TILE, y: 36 * TILE + 10 },
];
/** Preço de um pacote na etapa (o desconto, quando há, vem da etapa). */
const packCost = (stall, stage) => Math.round(stall.price * (1 - (stage.discounts?.[stall.id] ?? 0)));
const COUNTER = { x: 35 * TILE + 16, y: 37 * TILE + 28 };
const RETURN_CRATE = { x: 38 * TILE + 16, y: 40 * TILE + 8 };

const exactly = (target) => (crystals) =>
  crystals === target ? null : crystals < target ? `O cesto tem ${crystals} cristais: faltam alguns para chegar a ${target}.` : `O cesto tem ${crystals} cristais: passou de ${target}.`;

const atLeastWithin = (target, purse) => (crystals, cost) => {
  if (cost > purse) return `O total deu ${cost} moedas: faltaram ${cost - purse} na bolsa.`;
  if (crystals < target) return `A compra custaria ${cost} moedas e daria ${crystals} cristais. Os lampiões precisam de ${target}.`;
  return null;
};

/** r2a: agrupar (quantidade exata). */
const GROUP_STAGES = [
  {
    label: 'Pedido de 12',
    objective: 'Junte exatamente 12 cristais no cesto e leve ao balcão do Orin.',
    intro: 'Vamos começar pelos pacotes: preciso de exatamente 12 cristais. Encoste nas bancas para pôr pacotes no cesto e me pague no balcão.',
    purse: null,
    check: exactly(12),
  },
  {
    label: 'Pedido de 17',
    objective: 'Agora junte exatamente 17 cristais e leve ao balcão.',
    intro: 'Agora um pedido esquisito: exatamente 17 cristais. Com pacotes de 4, 6 e 5, será que dá? Tem mais de um jeito!',
    purse: null,
    check: exactly(17),
  },
];

/** r2c: preço por cristal e desconto (bolsa limitada). */
const PRICE_STAGES = [
  {
    label: 'Preço por cristal',
    objective: 'Compre pelo menos 20 cristais sem passar de 50 moedas.',
    intro: 'Preciso de 20 cristais para os lampiões e tenho 50 moedas. Os pacotes são de tamanhos diferentes: em qual banca cada cristal sai mais barato?',
    purse: 50,
    discounts: {},
    check: atLeastWithin(20, 50),
  },
  {
    label: 'Desconto',
    objective: 'A Banca da Estrela entrou em promoção (20% de desconto). Compre pelo menos 20 cristais sem passar de 48 moedas.',
    intro: 'Notícia boa: a Banca da Estrela está com 20% de desconto! Mas minha bolsa encolheu para 48 moedas. E agora, qual banca compensa?',
    purse: 48,
    discounts: { estrela: 0.2 },
    check: atLeastWithin(20, 48),
  },
];

function mountStalls(api, STALL_STAGES, winMessage) {
  let stageIndex = 0;
  let basket = []; // ids das bancas, um por pacote
  let receipt = null;
  const rows = [];

  const stage = () => STALL_STAGES[stageIndex];
  const crystals = () => basket.reduce((sum, id) => sum + STALLS.find((s) => s.id === id).size, 0);
  const cost = () => basket.reduce((sum, id) => sum + packCost(STALLS.find((s) => s.id === id), stage()), 0);
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
        const discount = stage().discounts?.[stall.id];
        if (discount) drawTag(ctx, stall.x + 22, stall.y - 70, `-${discount * 100}%`, { fill: '#c2453b', ink: '#fff6dc' });
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
      api.win(winMessage(total, price));
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

const mountGroupingWorld = (api) => mountStalls(api, GROUP_STAGES, (total) => `${total} cristais, sem sobrar nenhum! As encomendas do Mercado estão em dia.`);
const mountPricesWorld = (api) => mountStalls(api, PRICE_STAGES, (total, price) => `Com ${price} moedas vieram ${total} cristais. Os lampiões do Mercado voltaram a acender!`);

export default {
  r2a: {
    title: 'Bancas do Mercado',
    region: 'r2',
    npc: 'orin',
    mode: 'world',
    stages: GROUP_STAGES.map((stage) => stage.label),
    greeting: GROUP_STAGES[0].intro,
    context: 'Cada banca do Mercado vende pacotes de tamanho diferente: 4, 6 ou 5 cristais. Orin precisa de quantidades exatas para as encomendas.',
    goal: 'Juntar exatamente 12 cristais e depois exatamente 17, combinando pacotes de 4, 6 e 5.',
    concept: 'Agrupamento, adição de parcelas iguais e multiplicação; decomposição de um número',
    prerequisites: 'Adição e multiplicação',
    relation: '12 = 3 × 4 = 2 × 6; 17 = 2 × 6 + 5 = 3 × 4 + 5',
    categories: ['operações'],
    hints: [
      'Encoste numa banca e aperte E para pôr um pacote no cesto. A etiqueta mostra quantos cristais vêm no pacote. A caixa de devolução esvazia o cesto.',
      'Para 12, tente usar pacotes de um só tamanho: quantos de 4? Quantos de 6?',
      'Para 17, que é ímpar, você vai precisar de um número ímpar de pacotes de 5. Comece com um pacote de 5 e veja quanto falta.',
    ],
    mountWorld: mountGroupingWorld,
  },
  r2c: {
    title: 'Promoção',
    region: 'r2',
    npc: 'orin',
    mode: 'world',
    stages: PRICE_STAGES.map((stage) => stage.label),
    greeting: PRICE_STAGES[0].intro,
    context: 'As bancas vendem pacotes de tamanho e preço diferentes. Com a bolsa limitada, Orin precisa descobrir em que banca cada cristal sai mais barato, e depois uma das bancas entra em promoção.',
    goal: 'Comprar pelo menos 20 cristais com 50 moedas (sem desconto) e depois com 48 moedas (com 20% de desconto na Banca da Estrela).',
    concept: 'Razão entre preço e quantidade (preço por unidade); comparação de razões; desconto percentual',
    prerequisites: 'Bancas do Mercado; Caldeirão de Orin (proporcionalidade)',
    relation: 'Etapa 1: Lua 10 ÷ 4 = 2,5 moedas por cristal; Sol 18 ÷ 6 = 3; Estrela 15 ÷ 5 = 3. Etapa 2: Estrela 15 × 0,8 = 12 por 5 cristais = 2,4 por cristal',
    categories: ['proporcionalidade', 'porcentagem'],
    hints: [
      'Pacotes maiores nem sempre saem mais baratos. Divida o preço do pacote pelo número de cristais para saber quanto custa cada cristal em cada banca.',
      'Na primeira compra, só uma banca deixa 20 cristais caberem em 50 moedas. Na segunda, calcule o preço da Estrela com 20% de desconto: 20% de 15 moedas são 3 moedas.',
      'Com o desconto, o pacote da Estrela custa 12 moedas por 5 cristais. Quantos pacotes dão 20 cristais, e quanto isso custa?',
    ],
    mountWorld: mountPricesWorld,
  },
};
