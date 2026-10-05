/* NEXO — Partilha das Sementes (Vale dos Recursos), jogada no próprio mapa
 *
 * Nada de janela: o jogador anda até o saco, pega sementes, leva aos canteiros e se agacha
 * para plantar. A dificuldade cresce em três etapas:
 *   1. Contar: 3 sementes em cada um de 2 canteiros (a estaca mostra quantas).
 *   2. Repartir: 12 sementes em 3 canteiros, a mesma quantidade em cada um.
 *   3. Dividir com resto: 50 sementes em 6 canteiros com a semeadeira (uma rodada por vez);
 *      o que não dá para todos volta no saco, carregado até o celeiro.
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst } from '../world/quest-layer.js';
import { circle } from '../art/shapes.js';

const TILE = 32;
const MAX_IN_HAND = 10;

/** Canteiros sobre a terra arada do Vale (centro de cada um, em pixels do mundo). */
const BEDS = [
  [176, 828], [368, 828],
  [176, 880], [368, 880],
  [176, 932], [368, 932],
].map(([x, y]) => ({ x, y, w: 112, h: 28 }));

const SACK = { x: 11 * TILE, y: 21 * TILE + 20 };
const SEEDER = { x: 8 * TILE + 16, y: 24 * TILE + 26 };
const BARN_DOOR = { x: 5 * TILE + 16, y: 17 * TILE + 12 };

const STAGES = [
  {
    label: 'Contar',
    kind: 'count',
    beds: [0, 1],
    seeds: 6,
    target: 3,
    objective: 'Pegue sementes no saco e plante 3 em cada canteiro com estaca.',
    intro: 'Vamos começar pequeno: pegue sementes no saco aqui do meu lado e plante 3 em cada canteiro com estaca.',
  },
  {
    label: 'Repartir',
    kind: 'share',
    beds: [0, 1, 2],
    seeds: 12,
    objective: 'Reparta as 12 sementes do saco igualmente entre os 3 canteiros.',
    intro: 'Brotaram! Agora são 12 sementes para 3 canteiros, a mesma quantidade em cada um.',
  },
  {
    label: 'Dividir com resto',
    kind: 'remainder',
    beds: [0, 1, 2, 3, 4, 5],
    seeds: 50,
    objective: 'Use a semeadeira nos 6 canteiros. O que não der para todos, leve no saco até o celeiro.',
    intro: 'Agora o desafio de verdade: 50 sementes para os 6 canteiros. A semeadeira planta uma rodada. O que sobrar, leve no saco até a porta do celeiro.',
  },
];

function mountSeedsWorld(api) {
  let stageIndex = 0;
  let inSack = 0;
  let inHand = 0;
  let sackCarried = false;
  let sprouting = 0;
  const counts = Array(BEDS.length).fill(0);
  const rows = [];

  const stage = () => STAGES[stageIndex];
  const activeBeds = () => stage().beds;
  const record = () => api.record(['Etapa', 'Canteiros', 'No saco'], rows);

  /* ---------- O que o jogador segura ---------- */

  const handItem = {
    label: 'sementes',
    draw: (ctx) => drawHandful(ctx, inHand),
  };
  const sackItem = {
    label: 'saco de sementes',
    draw: (ctx) => {
      ctx.translate(0, -4);
      drawSack(ctx, 0, 10, inSack, 0.8);
    },
  };

  function refreshHands() {
    if (sackCarried) setCarried(sackItem);
    else setCarried(inHand > 0 ? handItem : null);
  }

  /* ---------- Objetos no mapa ---------- */

  addQuestObject({
    id: 'seed-sack',
    x: SACK.x,
    y: SACK.y,
    label: 'Saco de sementes',
    enabled: () => !sackCarried,
    draw: (ctx) => {
      if (!sackCarried) drawSack(ctx, SACK.x, SACK.y, inSack, 1);
    },
    onInteract: takeFromSack,
  });

  BEDS.forEach((bed, index) => {
    addQuestObject({
      id: `bed-${index}`,
      x: bed.x,
      y: bed.y + 20,
      reach: 44,
      label: `Canteiro ${index + 1}`,
      enabled: () => activeBeds().includes(index),
      draw: (ctx, t) => drawBed(ctx, bed, counts[index], {
        active: activeBeds().includes(index),
        target: stage().target,
        sprout: activeBeds().includes(index) ? sprouting : 0,
        t,
      }),
      onInteract: () => useBed(index),
    });
  });

  addQuestObject({
    id: 'seeder',
    x: SEEDER.x,
    y: SEEDER.y,
    label: 'Semeadeira',
    enabled: () => stage().kind === 'remainder',
    draw: (ctx, t) => {
      if (stage().kind === 'remainder') drawSeeder(ctx, SEEDER.x, SEEDER.y, t);
    },
    onInteract: useSeeder,
  });

  addQuestObject({
    id: 'barn-door',
    x: BARN_DOOR.x,
    y: BARN_DOOR.y,
    label: 'Porta do celeiro',
    enabled: () => sackCarried,
    draw: (ctx, t) => {
      if (sackCarried) drawArrow(ctx, BARN_DOOR.x, BARN_DOOR.y - 46, t);
    },
    onInteract: deliverSack,
  });

  /* ---------- Ações ---------- */

  function takeFromSack() {
    if (stage().kind === 'remainder') {
      // Na etapa 3 o saco vai junto: sementes na mão voltam para ele
      inSack += inHand;
      inHand = 0;
      sackCarried = true;
      playAction('crouch');
      refreshHands();
      return;
    }
    if (inSack === 0) {
      api.say('O saco está vazio.', 'warn');
      return;
    }
    if (inHand >= MAX_IN_HAND) {
      api.say('Suas mãos estão cheias. Plante algumas antes de pegar mais.', 'warn');
      return;
    }
    inSack--;
    inHand++;
    playAction('crouch');
    burst(SACK.x, SACK.y - 14, 'sparkle', 5);
    refreshHands();
  }

  function useBed(index) {
    const bed = BEDS[index];
    if (inHand > 0) {
      inHand--;
      counts[index]++;
      playAction('dig');
      burst(bed.x, bed.y, 'dust', 6);
      refreshHands();
      checkAllPlaced();
      return;
    }
    // Mãos vazias: tira uma semente do canteiro (para a mão, ou para o saco se ele estiver junto)
    if (counts[index] > 0) {
      counts[index]--;
      if (sackCarried) inSack++;
      else inHand++;
      playAction('crouch');
      refreshHands();
      return;
    }
    api.say(stage().kind === 'remainder' ? 'Use a semeadeira para plantar uma rodada.' : 'Pegue sementes no saco primeiro.', 'warn');
  }

  function useSeeder() {
    if (inHand > 0) {
      api.say('Guarde as sementes da mão num canteiro antes de usar a semeadeira.', 'warn');
      return;
    }
    if (inSack === 0) {
      api.say('O saco está vazio: não há sementes para a semeadeira.', 'warn');
      return;
    }
    playAction('use');
    activeBeds().forEach((index) => {
      if (inSack === 0) return;
      inSack--;
      counts[index]++;
      burst(BEDS[index].x, BEDS[index].y, 'sparkle', 4);
    });
    refreshHands();
  }

  /** Etapas 1 e 2: quando todas as sementes saíram do saco e das mãos, Tainá confere. */
  function checkAllPlaced() {
    const kind = stage().kind;
    if (kind === 'remainder' || inSack > 0 || inHand > 0) return;
    const values = activeBeds().map((index) => counts[index]);
    const ok = kind === 'count'
      ? values.every((value) => value === stage().target)
      : values.every((value) => value === values[0]);
    rows.push([stageIndex + 1, values.join(' / '), 0]);
    record();
    if (!api.attempt(ok, { etapa: stageIndex + 1, canteiros: values.join('/') })) {
      api.fail(kind === 'count'
        ? `Tainá olhou: os canteiros ficaram com ${values.join(' e ')} sementes, e a estaca pede ${stage().target} em cada. Chegue perto de um canteiro com as mãos vazias para tirar uma semente.`
        : `Os canteiros ficaram diferentes: ${values.join(', ')} sementes. Assim a colheita sai desigual.`);
      return;
    }
    stageSucceeded();
  }

  function deliverSack() {
    if (inHand > 0) {
      api.say('Plante as sementes da mão antes de guardar o saco.', 'warn');
      return;
    }
    const values = activeBeds().map((index) => counts[index]);
    const equal = values.every((value) => value === values[0]);
    const per = values[0];
    const used = values.reduce((a, b) => a + b, 0);
    rows.push([3, equal ? per : values.join(' / '), inSack]);
    record();
    const ok = api.attempt(equal && per > 0 && inSack < activeBeds().length, {
      etapa: 3, porCanteiro: equal ? per : values.join('/'), usadas: used, sobra: inSack,
    });
    if (ok) {
      sackCarried = false;
      refreshHands();
      sprouting = 0.01;
      grow();
      burst(BARN_DOOR.x, BARN_DOOR.y - 20, 'success', 20);
      api.win(`Cada canteiro ficou com ${per} sementes e ${inSack} voltaram ao celeiro. O Vale vai florescer!`);
      return;
    }
    if (!equal) api.fail('Tainá olhou os canteiros: uns ficaram com mais sementes que outros. Assim a colheita sai desigual.');
    else if (per === 0) api.fail('Os canteiros ainda estão vazios. Use a semeadeira antes de guardar o saco.');
    else api.fail(`Os canteiros estão iguais, mas ${inSack} sementes voltariam ao celeiro: ainda dá mais uma rodada.`);
  }

  /* ---------- Etapas ---------- */

  function grow() {
    const tick = () => {
      if (sprouting <= 0 || sprouting >= 1) return;
      sprouting = Math.min(1, sprouting + 0.04);
      setTimeout(tick, 30);
    };
    tick();
  }

  function stageSucceeded() {
    sprouting = 0.01;
    grow();
    activeBeds().forEach((index) => burst(BEDS[index].x, BEDS[index].y - 6, 'success', 10));
    const next = STAGES[stageIndex + 1];
    api.say(next.intro, 'ok');
    setTimeout(() => {
      if (!api.isActive()) return;
      counts.fill(0);
      sprouting = 0;
      activeBeds().forEach((index) => burst(BEDS[index].x, BEDS[index].y, 'dust', 8));
      startStage(stageIndex + 1, false);
    }, 2200);
  }

  function startStage(index, announce = true) {
    stageIndex = index;
    inSack = stage().seeds;
    inHand = 0;
    sackCarried = false;
    refreshHands();
    api.setStage(index);
    api.setObjective(stage().objective);
    if (announce) api.say(stage().intro);
  }

  api.onCleanup(clearQuestLayer);
  record();
  startStage(0);
}

/* ---------- Desenho ---------- */

function drawSack(ctx, x, y, count, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(30, 20, 40, .25)';
  ctx.fillRect(-9, -2, 18, 3);
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(-9, -18, 18, 17);
  ctx.fillStyle = '#c9a26b';
  ctx.fillRect(-8, -17, 16, 15);
  ctx.fillStyle = '#b48a55';
  ctx.fillRect(-8, -8, 16, 6);
  ctx.fillStyle = '#e0bd85';
  ctx.fillRect(-6, -16, 4, 6);
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(-5, -22, 10, 4);
  ctx.fillStyle = '#ffe9a0';
  ctx.fillRect(-3, -23, 2, 2);
  ctx.fillRect(1, -24, 2, 2);
  ctx.restore();
  drawTag(ctx, x, y - 30 * scale, String(count));
}

function drawHandful(ctx, count) {
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(-7, -4, 14, 7);
  ctx.fillStyle = '#c9a26b';
  ctx.fillRect(-6, -3, 12, 5);
  for (let i = 0; i < Math.min(count, 6); i++) {
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(-5 + (i % 3) * 4, -5 - Math.floor(i / 3) * 2, 2, 2);
  }
  drawTag(ctx, 0, -12, String(count));
}

/** Etiqueta com número, sempre legível sobre o mapa. */
function drawTag(ctx, x, y, text) {
  ctx.font = '700 8px "Pixelify Sans", sans-serif';
  const width = Math.ceil(ctx.measureText(text).width) + 8;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - 6);
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(left - 1, top - 1, width + 2, 12);
  ctx.fillStyle = '#fbf3df';
  ctx.fillRect(left, top, width, 10);
  ctx.fillStyle = '#2b1d14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.round(x), top + 5.5);
}

function drawBed(ctx, bed, count, { active, target, sprout, t }) {
  const left = bed.x - bed.w / 2;
  const top = bed.y - bed.h / 2;
  // Monte de terra com sulcos
  ctx.fillStyle = 'rgba(40, 20, 10, .35)';
  ctx.fillRect(left + 2, top + bed.h, bed.w, 3);
  ctx.fillStyle = '#6e4226';
  ctx.fillRect(left, top, bed.w, bed.h);
  ctx.fillStyle = '#8a5634';
  ctx.fillRect(left + 1, top + 1, bed.w - 2, bed.h - 3);
  ctx.fillStyle = '#a06a40';
  ctx.fillRect(left + 2, top + 1, bed.w - 4, 2);
  ctx.fillStyle = '#5e3820';
  for (let row = 8; row < bed.h - 3; row += 8) ctx.fillRect(left + 4, top + row, bed.w - 8, 1);
  // Canteiro ativo: brilho suave na borda
  if (active && sprout === 0) {
    ctx.strokeStyle = `rgba(255, 224, 138, ${0.45 + Math.sin(t * 3) * 0.25})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(left - 1.5, top - 1.5, bed.w + 3, bed.h + 3);
  }
  // Sementes (ou brotos)
  for (let i = 0; i < Math.min(count, 14); i++) {
    const sx = left + 14 + (i % 7) * 14;
    const sy = top + 8 + Math.floor(i / 7) * 10;
    if (sprout > 0) {
      ctx.fillStyle = '#3f8a35';
      ctx.fillRect(sx, sy - 7 * sprout, 1, 7 * sprout);
      ctx.fillStyle = '#7fd36a';
      ctx.fillRect(sx - 3 * sprout, sy - 7 * sprout, 3 * sprout, 2);
      ctx.fillRect(sx + 1, sy - 5 * sprout, 3 * sprout, 2);
    }
    circle(ctx, sx + 0.5, sy, 2.5, `rgba(255, 236, 140, ${0.25 + Math.sin(t * 3 + i) * 0.12})`);
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
  // Estaca com a quantidade pedida (etapa de contagem) e contador do canteiro
  if (active && target) {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(left - 6, top - 10, 2, 22);
    drawTag(ctx, left - 5, top - 14, String(target));
  }
  if (active || count > 0) drawTag(ctx, left + bed.w - 8, top - 4, String(count));
}

function drawSeeder(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(30, 20, 40, .3)';
  ctx.fillRect(x - 14, y - 1, 28, 3);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(x - 13, y - 20, 26, 19);
  ctx.fillStyle = '#a0703f';
  ctx.fillRect(x - 12, y - 19, 24, 9);
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(x - 12, y - 10, 24, 8);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#5b5f73';
    ctx.fillRect(x - 11 + i * 4, y - 2, 2, 3);
  }
  // Manivela girando
  const angle = t * 2;
  ctx.fillStyle = '#c9862a';
  ctx.fillRect(x + 13, y - 14, 3, 3);
  ctx.fillRect(Math.round(x + 14 + Math.cos(angle) * 5), Math.round(y - 13 + Math.sin(angle) * 5), 3, 3);
  drawTag(ctx, x, y - 30, 'semeadeira');
}

function drawArrow(ctx, x, y, t) {
  const bob = Math.round(Math.sin(t * 5) * 2);
  ctx.fillStyle = '#4f3019';
  ctx.fillRect(x - 5, y - 9 + bob, 10, 8);
  ctx.fillRect(x - 8, y - 2 + bob, 16, 2);
  ctx.fillRect(x - 6, y + bob, 12, 2);
  ctx.fillRect(x - 4, y + 2 + bob, 8, 2);
  ctx.fillRect(x - 2, y + 4 + bob, 4, 2);
  ctx.fillStyle = '#ffd84a';
  ctx.fillRect(x - 4, y - 8 + bob, 8, 7);
  ctx.fillRect(x - 6, y - 1 + bob, 12, 1);
  ctx.fillRect(x - 4, y + 1 + bob, 8, 1);
  ctx.fillRect(x - 2, y + 3 + bob, 4, 1);
}

export default {
  r1a: {
    title: 'Partilha das Sementes',
    region: 'r1',
    npc: 'taina',
    mode: 'world',
    stages: STAGES.map((stage) => stage.label),
    greeting: STAGES[0].intro,
    context: 'A Ruptura espalhou as sementes-luz do Vale. Tainá precisa replantá-las nos canteiros, sempre com a mesma quantidade em cada um. A missão cresce em três etapas: contar, repartir igualmente e dividir com resto.',
    goal: 'Contar 3 sementes por canteiro; repartir 12 sementes em 3 canteiros; plantar o máximo possível de 50 sementes igualmente em 6 canteiros e devolver o resto ao celeiro.',
    concept: 'Contagem; partilha equitativa; divisão com resto',
    prerequisites: 'Contagem e operações com números naturais',
    relation: 'Etapa 1: 2 × 3 = 6. Etapa 2: 12 ÷ 3 = 4. Etapa 3: 50 = 6 × 8 + 2',
    categories: ['operações'],
    hints: [
      'Perto do saco, aperte E (ou toque nele) para pegar uma semente. Perto de um canteiro, aperte E para plantar a semente que está na sua mão.',
      'Para repartir igualmente, plante uma semente em cada canteiro, depois outra em cada um, até o saco acabar. Com as mãos vazias, aperte E num canteiro para tirar uma semente dele.',
      'Na última etapa, cada uso da semeadeira gasta uma semente por canteiro. Quando o saco tiver menos sementes do que canteiros, pare e leve o saco à porta do celeiro.',
    ],
    mountWorld: mountSeedsWorld,
  },
};

