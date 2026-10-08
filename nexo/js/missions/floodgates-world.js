/* NEXO — Comportas do Vale (Vale dos Recursos), jogada no próprio mapa
 *
 * O jogador enche baldes no lago, carrega até as plantações (até 3 de uma vez) e despeja
 * um por vez. Cada plantação tem uma placa com a parte da água que lhe cabe. Quando
 * achar que acertou, abre a comporta e vê a consequência: plantação encharcada,
 * seca nas pontas ou brilhando. A dificuldade cresce em três etapas:
 *   1. Metade: 8 baldes, trigo com 1/2 e ervas com o resto.
 *   2. Metade e terço: 12 baldes, trigo 1/2, ervas 1/3, pomar com o resto.
 *   3. Depois da chuva: 18 baldes, as mesmas partes com um reservatório maior.
 */

import { addQuestObject, clearQuestLayer, playAction, burst } from '../world/quest-layer.js';
import { drawWoodBucket, drawValveWheel } from '../art/items.js';
import { drawTag } from './world-kit.js';
import { createHands } from './kit/hands.js';

const TILE = 32;
const MAX_IN_HAND = 3;

/** Plantações: área no mapa e ponto de despejo (canal de entrada). */
const FIELDS = {
  trigo: { name: 'trigo', area: { x: 96, y: 800, w: 160, h: 160 }, inlet: { x: 176, y: 812 }, color: '#f2b84b' },
  ervas: { name: 'ervas', area: { x: 288, y: 800, w: 160, h: 160 }, inlet: { x: 368, y: 812 }, color: '#5aa84a' },
  pomar: { name: 'pomar', area: { x: 96, y: 968, w: 352, h: 56 }, inlet: { x: 272, y: 1000 }, color: '#e86fa8' },
};

const RACK = { x: 11 * TILE + 16, y: 18 * TILE + 20 };
const VALVE = { x: 8 * TILE + 16, y: 18 * TILE + 20 };

const STAGES = [
  {
    label: 'Metade',
    total: 8,
    shares: { trigo: { sign: '1/2', part: (n) => n / 2 }, ervas: { sign: 'o resto', part: (n) => n / 2 } },
    objective: 'Leve baldes do lago: metade da água para o trigo e o resto para as ervas. Depois abra a comporta.',
    intro: 'Cada plantação tem uma placa com a parte da água que precisa. Comece com 8 baldes: metade para o trigo, o resto para as ervas.',
  },
  {
    label: 'Metade e terço',
    total: 12,
    shares: {
      trigo: { sign: '1/2', part: (n) => n / 2 },
      ervas: { sign: '1/3', part: (n) => n / 3 },
      pomar: { sign: 'o resto', part: (n) => n / 6 },
    },
    objective: 'Divida os 12 baldes: trigo 1/2, ervas 1/3 e o pomar com o resto. Depois abra a comporta.',
    intro: 'Muito bem! Agora o pomar também precisa de água: 12 baldes, metade para o trigo, um terço para as ervas e o resto para o pomar.',
  },
  {
    label: 'Depois da chuva',
    total: 18,
    shares: {
      trigo: { sign: '1/2', part: (n) => n / 2 },
      ervas: { sign: '1/3', part: (n) => n / 3 },
      pomar: { sign: 'o resto', part: (n) => n / 6 },
    },
    objective: 'Choveu: são 18 baldes. As partes são as mesmas. Distribua e abra a comporta.',
    intro: 'Choveu e o lago encheu: agora são 18 baldes. As partes continuam as mesmas, mas quantos baldes é cada uma?',
  },
];

const PHRASES = {
  trigo: { flood: 'o trigo encharcou', dry: 'o trigo secou nas pontas' },
  ervas: { flood: 'as ervas encharcaram', dry: 'as ervas secaram nas pontas' },
  pomar: { flood: 'o pomar encharcou', dry: 'o pomar secou nas pontas' },
};

const joinList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`);

function mountFloodgatesWorld(api) {
  let stageIndex = 0;
  let inLake = 0;
  let status = {}; // trigo/ervas/pomar → 'ok' | 'flood' | 'dry'
  const poured = { trigo: 0, ervas: 0, pomar: 0 };
  const rows = [];

  const stage = () => STAGES[stageIndex];
  const activeFields = () => Object.keys(stage().shares);
  const record = () => api.record(['Baldes', 'Trigo', 'Ervas', 'Pomar', ''], rows);

  const hands = createHands({
    say: api.say,
    limit: MAX_IN_HAND,
    kinds: { balde: { name: 'baldes', draw: (ctx) => drawBuckets(ctx, 0, 0, hands.count, 0.75, true) } },
    messages: { full: () => `Dá para carregar ${MAX_IN_HAND} baldes de cada vez.` },
  });

  /* ---------- Objetos no mapa ---------- */

  addQuestObject({
    id: 'bucket-rack',
    x: RACK.x,
    y: RACK.y,
    label: 'Baldes cheios na beira do lago',
    draw: (ctx) => {
      drawBuckets(ctx, RACK.x, RACK.y, Math.min(inLake, 6), 1, false);
      drawTag(ctx, RACK.x, RACK.y - 34, `${inLake} no lago`);
    },
    onInteract: fillBucket,
  });

  addQuestObject({
    id: 'valve',
    x: VALVE.x,
    y: VALVE.y,
    label: 'Comporta',
    draw: (ctx, t) => drawValve(ctx, VALVE.x, VALVE.y, t),
    onInteract: openGates,
  });

  Object.entries(FIELDS).forEach(([id, field]) => {
    addQuestObject({
      id: `field-${id}`,
      x: field.inlet.x,
      y: field.inlet.y,
      reach: 40,
      label: `Plantação de ${field.name}`,
      enabled: () => activeFields().includes(id),
      draw: (ctx, t) => {
        if (!activeFields().includes(id)) return;
        drawField(ctx, field, poured[id], status[id] ?? 'idle', stage().shares[id].sign, t);
      },
      onInteract: () => useField(id),
    });
  });

  /* ---------- Ações ---------- */

  function fillBucket() {
    if (inLake === 0) {
      api.say('Não há mais baldes cheios no lago.', 'warn');
      return;
    }
    if (!hands.take('balde')) return;
    inLake--;
    status = {};
    playAction('crouch');
    burst(RACK.x, RACK.y - 8, 'sparkle', 4);
  }

  function useField(id) {
    const field = FIELDS[id];
    status = {};
    if (hands.drop() !== null) {
      poured[id]++;
      playAction('crouch');
      burst(field.inlet.x, field.inlet.y - 4, 'sparkle', 6);
      return;
    }
    // Mãos vazias: recolhe um balde de água de volta
    if (poured[id] > 0 && hands.take('balde')) {
      poured[id]--;
      playAction('crouch');
      return;
    }
    api.say('Pegue baldes cheios na beira do lago primeiro.', 'warn');
  }

  function openGates() {
    const total = stage().total;
    const counts = { trigo: poured.trigo, ervas: poured.ervas, pomar: poured.pomar };
    const left = inLake + hands.count;
    const data = { etapa: stageIndex + 1, reservatorio: total, ...counts };
    playAction('use');

    if (left > 0) {
      api.attempt(false, data);
      rows.push([total, counts.trigo, counts.ervas, activeFields().includes('pomar') ? counts.pomar : '–', { value: 'sobrou água', tone: 'bad' }]);
      record();
      api.fail(`Ainda há ${left} ${left === 1 ? 'balde' : 'baldes'} fora das plantações. Toda a água precisa chegar a elas antes de abrir a comporta.`);
      return;
    }

    const problems = [];
    status = {};
    for (const id of activeFields()) {
      const needed = stage().shares[id].part(total);
      status[id] = counts[id] === needed ? 'ok' : counts[id] > needed ? 'flood' : 'dry';
      if (status[id] !== 'ok') problems.push(PHRASES[id][status[id]]);
      burst(FIELDS[id].inlet.x, FIELDS[id].inlet.y, status[id] === 'ok' ? 'success' : 'dust', 10);
    }
    const ok = api.attempt(problems.length === 0, data);
    rows.push([total, counts.trigo, counts.ervas, activeFields().includes('pomar') ? counts.pomar : '–', { value: ok ? 'certo' : 'desigual', tone: ok ? 'good' : 'bad' }]);
    record();

    if (!ok) {
      api.fail(`A água correu, mas ${joinList(problems)}. Com as mãos vazias, dá para recolher um balde de uma plantação.`);
      return;
    }
    if (stageIndex === STAGES.length - 1) {
      api.win('Mesmo com o lago maior, cada plantação recebeu a sua parte. O Vale está irrigado!');
      return;
    }
    api.say(STAGES[stageIndex + 1].intro, 'ok');
    setTimeout(() => api.isActive() && startStage(stageIndex + 1, false), 2400);
  }

  function startStage(index, announce = true) {
    stageIndex = index;
    inLake = stage().total;
    hands.dropAll();
    status = {};
    Object.keys(poured).forEach((id) => {
      poured[id] = 0;
    });
    api.setStage(index);
    api.setObjective(stage().objective);
    if (announce) api.say(stage().intro);
    if (index === 2) burst(RACK.x, RACK.y - 40, 'sparkle', 20);
  }

  api.onCleanup(clearQuestLayer);
  record();
  startStage(0);
}

/* ---------- Desenho ---------- */

function drawBucket(ctx, x, y) {
  drawWoodBucket(ctx, x, y);
}

/** Pilha de baldes (no lago) ou baldes nas mãos, com contador. */
function drawBuckets(ctx, x, y, count, scale, withTag) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (!withTag) {
    ctx.fillStyle = 'rgba(30, 20, 40, .25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < count; i++) {
    const row = i < 3 ? 0 : 1;
    const col = row === 0 ? i - 1 : i - 4;
    drawBucket(ctx, col * 11 + (row ? 5 : 0), -row * 10);
  }
  ctx.restore();
  if (withTag && count > 0) drawTag(ctx, x, y - 22, String(count));
}

function drawValve(ctx, x, y, t) {
  drawValveWheel(ctx, x, y, t);
  drawTag(ctx, x, y - 32, 'comporta');
}

function drawField(ctx, field, buckets, status, sign, t) {
  const { x, y, w, h } = field.area;
  // Água acumulada: escurece a terra conforme os baldes chegam
  if (buckets > 0 || status !== 'idle') {
    const alpha = Math.min(0.45, buckets * 0.05);
    ctx.fillStyle = status === 'flood' ? 'rgba(90, 160, 230, .45)' : `rgba(40, 70, 110, ${alpha})`;
    ctx.fillRect(x, y, w, h);
  }
  if (status === 'dry') {
    ctx.fillStyle = 'rgba(220, 180, 110, .45)';
    ctx.fillRect(x, y, w, h);
  }
  if (status === 'flood') {
    ctx.fillStyle = 'rgba(200, 235, 255, .7)';
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 10 + i * (w / 6), y + h / 2 + Math.sin(t * 3 + i) * 3, 14, 2);
  }
  if (status === 'ok') {
    for (let i = 0; i < 8; i++) {
      const glow = 0.5 + Math.sin(t * 4 + i) * 0.4;
      ctx.fillStyle = `rgba(255, 245, 190, ${glow})`;
      ctx.fillRect(x + 8 + ((i * 37) % (w - 16)), y + 6 + ((i * 23) % (h - 12)), 2, 2);
    }
  }
  // Borda da plantação
  ctx.strokeStyle = status === 'idle' ? `rgba(255, 224, 138, ${0.35 + Math.sin(t * 2) * 0.15})` : field.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Placa com a parte da água e contador de baldes
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(field.inlet.x - 1, field.inlet.y - 18, 2, 18);
  drawTag(ctx, field.inlet.x, field.inlet.y - 22, `${field.name}: ${sign}`);
  drawTag(ctx, field.inlet.x, field.inlet.y + 10, `${buckets} ${buckets === 1 ? 'balde' : 'baldes'}`);
}

export default {
  r1b: {
    title: 'Comportas do Vale',
    region: 'r1',
    npc: 'taina',
    mode: 'world',
    stages: STAGES.map((stage) => stage.label),
    greeting: STAGES[0].intro,
    context: 'O lago do Vale guarda baldes de água-luz. Cada plantação precisa de uma parte da água, indicada na placa. Depois da chuva, o lago enche mais.',
    goal: 'Distribuir os baldes conforme as partes indicadas (1/2, 1/3 e o resto), com 8, 12 e 18 baldes.',
    concept: 'Fração de uma quantidade; partes de um mesmo todo; a parte muda quando o todo muda',
    prerequisites: 'Divisão; ideia de metade e de terço (Partilha das Sementes)',
    relation: 'Etapa 1: 8 ÷ 2 = 4. Etapas 2 e 3: trigo = total ÷ 2; ervas = total ÷ 3; pomar = total ÷ 6',
    categories: ['frações', 'operações'],
    hints: [
      'Na beira do lago, aperte E para pegar um balde cheio (até 3 de uma vez). Na placa de cada plantação, aperte E para despejar um balde.',
      'Metade é dividir todos os baldes em 2 grupos iguais. Um terço é dividir em 3 grupos iguais e pegar um. O resto é o que sobra depois disso.',
      'Quando o lago muda de tamanho, as partes continuam 1/2 e 1/3, mas a quantidade de baldes de cada uma muda junto. Com as mãos vazias, dá para recolher um balde de uma plantação.',
    ],
    mountWorld: mountFloodgatesWorld,
  },
};
