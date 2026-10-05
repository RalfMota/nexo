/* NEXO — Torre dos Padrões: "Representar aquilo que você descobriu"
 * Generalização de padrões, variável e expressão algébrica de relações já vividas.
 */

import { createPlayfield, centerOf } from './playfield.js';
import { artLever, artRod, artRodBundle } from './props-art.js';
import { paintPanel } from './widgets.js';
import { roundRect, outlinedText, drawCrystal } from '../art/shapes.js';
import { prefersCalm } from '../core/state.js';

const font = (size) => `700 ${size}px "Pixelify Sans", sans-serif`;

/* ---------- r5a: Grade de Energia (h = 3n + 1) ---------- */

const rods = (modules) => 3 * modules + 1;
const BIG_GRID = 10;
const FLOORS = 12;
const CART = { x: 280, y: 320, w: 300, h: 190 };

function mountEnergyGrid(stage, api) {
  let level = 0;
  let load = []; // 10 (feixe) ou 1 (haste solta), na ordem em que entraram
  let built = null;
  let rule = null;
  const guesses = [];

  const loaded = () => load.reduce((a, b) => a + b, 0);

  const field = createPlayfield(stage, {
    draw(ctx, t) {
      paintPanel(ctx, 0, 0, 960, 540, '#1f2547');
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(200, 220, 255, ${0.15 + (i % 3) * 0.1})`;
        ctx.fillRect((i * 83) % 960, (i * 47) % 540, 2, 2);
      }
      drawExamples(ctx, t);
      if (level === 0) drawStageOne(ctx, t);
      else drawStageTwo(ctx, t);
    },
  }, api);

  function drawStageOne(ctx, t) {
    outlinedText(ctx, `grade de ${BIG_GRID} módulos`, 640, 160, { font: font(16) });
    if (built === null) {
      ctx.strokeStyle = 'rgba(200, 220, 255, .35)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.strokeRect(350, 186, BIG_GRID * 58, 58);
      ctx.setLineDash([]);
    } else {
      drawRodGrid(ctx, 350, 186, BIG_GRID, 58, built, t, true);
    }
    // Carrinho com feixes e hastes soltas
    ctx.fillStyle = '#5a4a7a';
    roundRect(ctx, CART.x, CART.y + 40, CART.w, CART.h - 70, 12);
    ctx.fill();
    ctx.fillStyle = '#3b3550';
    ctx.fillRect(CART.x, CART.y + 40, CART.w, 10);
    let x = CART.x + 14;
    for (const item of load) {
      ctx.save();
      ctx.translate(x, CART.y + 52);
      if (item === 10) artRodBundle(ctx, 44, 70);
      else artRod(ctx, 16, 70);
      ctx.restore();
      x += item === 10 ? 48 : 16;
    }
    ctx.fillStyle = '#3b3b46';
    ctx.beginPath();
    ctx.arc(CART.x + 60, CART.y + CART.h - 22, 18, 0, Math.PI * 2);
    ctx.arc(CART.x + CART.w - 60, CART.y + CART.h - 22, 18, 0, Math.PI * 2);
    ctx.fill();
    outlinedText(ctx, `${loaded()} hastes no carrinho`, CART.x + CART.w / 2, CART.y + 20, { font: font(16) });
  }

  function drawStageTwo(ctx, t) {
    ctx.fillStyle = '#3b3550';
    roundRect(ctx, 30, 190, 620, 170, 18);
    ctx.fill();
    ctx.strokeStyle = '#c9862a';
    ctx.lineWidth = 4;
    ctx.stroke();
    outlinedText(ctx, 'regra do elevador', 340, 214, { font: font(15), fill: '#ffe08a' });
    outlinedText(ctx, 'hastes =', 120, 290, { font: font(26), fill: '#cfe0ff' });
    outlinedText(ctx, '× módulos +', 410, 290, { font: font(26), fill: '#cfe0ff' });
    for (let n = 1; n <= FLOORS; n++) {
      const y = 500 - n * 36;
      const status = !rule ? 'idle' : rule.a * n + rule.b === rods(n) ? 'ok' : 'bad';
      ctx.fillStyle = status === 'ok' ? '#3fbf7f' : status === 'bad' ? '#d9573f' : '#4a5480';
      roundRect(ctx, 780, y, 160, 30, 6);
      ctx.fill();
      outlinedText(ctx, rule ? `${n}: ${rule.a * n + rule.b} hastes` : `andar ${n}`, 860, y + 15, { font: font(13) });
    }
    drawCrystal(ctx, 860, 30 + Math.sin(t * 2) * 3, 14, { glow: rule && rule.a === 3 && rule.b === 1 ? 1.6 : 0.4, color: '#9fc2ff' });
  }

  function setupStageOne() {
    field.reset();
    const cartZone = field.addZone({
      ...CART, label: 'Carrinho de hastes. Toque para tirar a última que entrou.',
      accepts: (token) => token.data.rods,
      onTap: () => {
        load.pop();
        built = null;
      },
    });
    const addLoad = (amount, from) => {
      if (loaded() + amount > 60) return false;
      load.push(amount);
      built = null;
      field.fly(amount === 10 ? artRodBundle : artRod, from, centerOf(CART), { w: amount === 10 ? 44 : 16, h: 70, duration: 300 });
      return true;
    };
    field.addToken({
      x: 40, y: 330, w: 120, h: 150, mode: 'source', className: 'act', label: 'Feixe com 10 hastes: leve ao carrinho',
      art: artRodBundle, data: { rods: 10 },
      onTap: () => addLoad(10, { x: 100, y: 400 }),
      onDrop: (zone) => zone === cartZone && addLoad(10, { x: 100, y: 400 }),
    });
    field.addToken({
      x: 180, y: 330, w: 50, h: 150, mode: 'source', repeat: true, className: 'act', label: 'Haste solta: leve ao carrinho',
      art: artRod, data: { rods: 1 },
      onTap: () => addLoad(1, { x: 205, y: 400 }),
      onDrop: (zone) => zone === cartZone && addLoad(1, { x: 205, y: 400 }),
    });
    field.addToken({
      x: 620, y: 360, w: 90, h: 130, mode: 'button', className: 'act', label: 'Montar a grade com as hastes do carrinho',
      art: artLever(false, '#5fe3d0'),
      onTap: buildGrid,
    });
    api.record(['Módulos', 'Hastes'], [[1, rods(1)], [2, rods(2)], [3, rods(3)], ...guesses]);
  }

  function setupStageTwo() {
    field.reset();
    const dialA = field.addDial({ x: 255, y: 236, value: 0, min: 0, max: 20, label: 'Hastes por módulo' });
    const dialB = field.addDial({ x: 570, y: 236, value: 0, min: 0, max: 20, label: 'Hastes fixas' });
    field.addToken({
      x: 670, y: 220, w: 90, h: 130, mode: 'button', className: 'act', label: 'Gravar a regra no elevador',
      art: artLever(false, '#5fe3d0'),
      onTap: () => testRule(dialA.get(), dialB.get()),
    });
    api.record(['Módulos', 'Sua regra', 'Grade real'], []);
  }

  function buildGrid() {
    const amount = loaded();
    if (amount === 0) {
      api.say('O carrinho está vazio. Carregue hastes antes de montar.', 'warn');
      return;
    }
    const real = rods(BIG_GRID);
    built = amount;
    const ok = api.attempt(amount === real, { modulos: BIG_GRID, previsao: amount, real });
    guesses.push([BIG_GRID, { value: `${amount} ${ok ? '(completa)' : amount < real ? '(faltaram)' : '(sobraram)'}`, tone: ok ? 'good' : 'bad' }]);
    api.record(['Módulos', 'Hastes'], [[1, rods(1)], [2, rods(2)], [3, rods(3)], ...guesses]);
    if (ok) {
      api.say('A grade ficou completa, sem sobrar haste! Agora o elevador precisa de uma regra que sirva para qualquer quantidade de módulos.', 'ok');
      setTimeout(() => {
        if (!api.isActive()) return;
        level = 1;
        setupStageTwo();
      }, prefersCalm() ? 0 : 1800);
    } else if (amount < real) {
      api.fail('As hastes acabaram antes do fim: os últimos módulos ficaram abertos.');
    } else {
      api.fail('A grade ficou pronta e ainda sobraram hastes no chão.');
    }
  }

  function testRule(a, b) {
    rule = { a, b };
    const floors = Array.from({ length: FLOORS }, (_, i) => i + 1);
    const hits = floors.filter((n) => a * n + b === rods(n)).length;
    api.record(['Módulos', 'Sua regra', 'Grade real'], floors.map((n) => [n, { value: a * n + b, tone: a * n + b === rods(n) ? 'good' : 'bad' }, rods(n)]));
    if (api.attempt(hits === FLOORS, { a, b, acertos: hits })) {
      api.win('O elevador montou todos os andares com a regra que você escreveu. A Torre guardou a regra no arquivo.');
    } else {
      api.fail(`A regra acertou ${hits} de ${FLOORS} andares. Os andares em vermelho mostram onde ela se afasta da grade real.`);
    }
  }

  setupStageOne();
}

function drawExamples(ctx, t) {
  outlinedText(ctx, 'grades de exemplo', 150, 22, { font: font(14) });
  [1, 2, 3].forEach((n, index) => {
    const x = 30 + [0, 60, 150][index];
    drawRodGrid(ctx, x, 50, n, 26, rods(n), t);
    outlinedText(ctx, `${n}`, x + (n * 26) / 2, 96, { font: font(13) });
  });
}

/**
 * Grade de módulos quadrados com hastes compartilhadas.
 * Hastes disponíveis são usadas na ordem; as que faltam aparecem tracejadas, as que sobram, empilhadas.
 */
function drawRodGrid(ctx, x, y, modules, size, available, t, showMissing = false) {
  const segments = [[x, y, x, y + size]];
  for (let i = 0; i < modules; i++) {
    const left = x + i * size;
    segments.push([left, y, left + size, y], [left, y + size, left + size, y + size], [left + size, y, left + size, y + size]);
  }
  ctx.lineCap = 'round';
  segments.forEach(([x1, y1, x2, y2], index) => {
    const placed = index < available;
    if (!placed && !showMissing) return;
    ctx.save();
    if (placed) {
      ctx.strokeStyle = '#7ff0e0';
      ctx.shadowColor = '#5fe3d0';
      ctx.shadowBlur = 6 + Math.sin(t * 3 + index) * 3;
      ctx.lineWidth = size > 40 ? 5 : 3;
    } else {
      ctx.strokeStyle = 'rgba(255, 120, 90, .85)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 3;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  });
  const extra = available - segments.length;
  for (let i = 0; i < Math.min(extra, 30); i++) {
    ctx.save();
    ctx.translate(x + 40 + (i % 10) * 14, y + size + 34 + Math.floor(i / 10) * 8);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#7ff0e0';
    ctx.fillRect(-14, -2, 28, 4);
    ctx.restore();
  }
}

/* ---------- r5b: Arquivo da Torre ---------- */

const SEALS = [
  { name: 'Máquina de Produção', input: 'ciclos', output: 'cristais', rows: [[1, 3], [4, 12], [7, 21]], color: '#e8a33d' },
  { name: 'Conversor de Energia', input: 'energia', output: 'saída', rows: [[1, 6], [3, 10], [8, 20]], color: '#5fe3d0' },
  { name: 'Rota B', input: 'distância', output: 'custo', rows: [[2, 19], [5, 25], [10, 35]], color: '#6f8ff0' },
];

function mountArchive(stage, api) {
  let current = 0;
  const written = [];
  let dialA = null;
  let dialB = null;

  const field = createPlayfield(stage, {
    draw(ctx, t) {
      paintPanel(ctx, 0, 0, 960, 540, '#1f2547');
      const seal = SEALS[Math.min(current, SEALS.length - 1)];
      drawTablet(ctx, seal);
      SEALS.forEach((item, index) => drawSeal(ctx, item, index, written[index], index === current, t));
      // Placa da regra
      ctx.fillStyle = '#3b3550';
      roundRect(ctx, 30, 340, 720, 180, 18);
      ctx.fill();
      ctx.strokeStyle = '#c9862a';
      ctx.lineWidth = 4;
      ctx.stroke();
      outlinedText(ctx, `${seal.output} =`, 140, 430, { font: font(28), fill: '#cfe0ff' });
      outlinedText(ctx, `× ${seal.input} +`, 435, 430, { font: font(28), fill: '#cfe0ff' });
    },
  }, api);

  function setupSeal() {
    field.reset();
    dialA = field.addDial({ x: 275, y: 376, value: 0, min: 0, max: 30, label: `Quanto cada unidade de ${SEALS[current].input} acrescenta` });
    dialB = field.addDial({ x: 610, y: 376, value: 0, min: 0, max: 30, label: 'Número fixo da regra' });
    field.addToken({
      x: 790, y: 370, w: 90, h: 130, mode: 'button', className: 'act', label: 'Gravar a regra no selo',
      art: artLever(false, '#5fe3d0'),
      onTap: engrave,
    });
    const seal = SEALS[current];
    api.record([seal.input, seal.output], seal.rows, `Registro: ${seal.name}`);
  }

  function engrave() {
    const seal = SEALS[current];
    const a = dialA.get();
    const b = dialB.get();
    const mismatch = seal.rows.find(([x, y]) => a * x + b !== y);
    if (!api.attempt(!mismatch, { selo: seal.name, a, b })) {
      const [x, y] = mismatch;
      api.fail(`O selo rejeitou a regra: para ${seal.input} = ${x}, ela dá ${a * x + b}, mas o registro mostra ${y}.`);
      return;
    }
    written[current] = `${seal.output} = ${a} × ${seal.input}${b ? ` + ${b}` : ''}`;
    current++;
    if (current < SEALS.length) {
      const left = SEALS.length - current;
      api.say(`O selo “${seal.name}” brilhou! ${left === 1 ? 'Falta um.' : `Faltam ${left}.`}`, 'ok');
      setupSeal();
    } else {
      api.win('Os três selos brilham. O arquivo da Torre guardou as regras das máquinas e das rotas.');
    }
  }

  setupSeal();
}

function drawTablet(ctx, seal) {
  ctx.fillStyle = '#8a8fb0';
  roundRect(ctx, 30, 24, 380, 290, 22);
  ctx.fill();
  ctx.fillStyle = '#a9b0cf';
  roundRect(ctx, 44, 38, 352, 262, 16);
  ctx.fill();
  outlinedText(ctx, seal.name, 220, 66, { font: font(18), fill: '#2b2f4a', stroke: '#a9b0cf' });
  outlinedText(ctx, seal.input, 140, 110, { font: font(20), fill: '#2b2f4a', stroke: '#a9b0cf' });
  outlinedText(ctx, seal.output, 300, 110, { font: font(20), fill: '#2b2f4a', stroke: '#a9b0cf' });
  ctx.fillStyle = '#2b2f4a';
  ctx.fillRect(70, 128, 300, 3);
  ctx.fillRect(218, 92, 3, 190);
  seal.rows.forEach(([x, y], i) => {
    outlinedText(ctx, String(x), 140, 160 + i * 44, { font: font(28), fill: '#1f2547', stroke: '#a9b0cf' });
    outlinedText(ctx, String(y), 300, 160 + i * 44, { font: font(28), fill: '#1f2547', stroke: '#a9b0cf' });
  });
}

function drawSeal(ctx, seal, index, written, active, t) {
  const x = 510 + index * 160;
  const y = 130;
  ctx.save();
  ctx.translate(x, y);
  if (written || active) {
    ctx.shadowColor = seal.color;
    ctx.shadowBlur = written ? 26 : 10 + Math.sin(t * 4) * 8;
  }
  ctx.fillStyle = written ? seal.color : active ? '#3a4380' : '#2a3060';
  ctx.beginPath();
  ctx.arc(0, 0, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = written ? '#fff' : 'rgba(200, 210, 255, .5)';
  ctx.lineWidth = 3;
  ctx.rotate(t * (written ? 0.4 : 0.1) * (index % 2 ? -1 : 1));
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(7, -56);
    ctx.lineTo(-7, -56);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  outlinedText(ctx, seal.name, x, y + 88, { font: font(12) });
  if (written) outlinedText(ctx, written, x, y, { font: font(10), fill: '#1f2547', stroke: '#fff' });
  else outlinedText(ctx, '?', x, y, { font: font(30), fill: active ? '#ffe08a' : '#7d86b8' });
}

export default {
  r5a: {
    title: 'Grade de Energia',
    region: 'r5',
    npc: 'nyla',
    greeting: 'Carregue o carrinho com as hastes que a grade de 10 módulos vai pedir e mande montar. Olhe as grades de exemplo.',
    context: 'A Torre é alimentada por grades de hastes de luz. Cada módulo é um quadrado, e módulos vizinhos compartilham uma haste. O elevador da Torre só funciona se souber quantas hastes cada andar exige.',
    goal: 'Descobrir quantas hastes uma grade de 10 módulos exige e depois escrever a regra que vale para qualquer quantidade de módulos.',
    concept: 'Generalização de padrão; expressão algébrica com variável',
    prerequisites: 'Regularidade e covariação (Oficina); previsão (Rotas)',
    relation: 'h = 3n + 1 (hastes = 3 × módulos + 1)',
    categories: ['linguagem algébrica', 'representação', 'previsão'],
    hints: [
      'Compare uma grade de exemplo com a seguinte: quantas hastes novas aparecem quando entra mais um módulo?',
      'O primeiro módulo é diferente dos outros: ele precisa de uma haste a mais para fechar o quadrado.',
      'Cada módulo novo acrescenta sempre a mesma quantidade de hastes. Pense no número que multiplica os módulos e no número que fica fixo.',
    ],
    mount: mountEnergyGrid,
  },
  r5b: {
    title: 'Arquivo da Torre',
    region: 'r5',
    npc: 'nyla',
    greeting: 'Cada selo só fecha com a regra do registro na pedra. Gire os mostradores e grave.',
    context: 'O arquivo da Torre guarda as regras de funcionamento do Nexo. Três registros chegaram sem regra: a Máquina de Produção, o Conversor de Energia e a Rota B.',
    goal: 'Escrever, para cada registro, a regra que liga a entrada à saída.',
    concept: 'Variável e expressão algébrica como representação de relações já vividas',
    prerequisites: 'Missões da Oficina e das Rotas; Grade de Energia',
    relation: 'cristais = 3 × ciclos; saída = 2 × energia + 4; custo = 2 × distância + 15',
    categories: ['linguagem algébrica', 'representação', 'função'],
    hints: [
      'Compare duas linhas da pedra: quanto muda a saída quando a entrada muda? Atenção: as entradas não vão de 1 em 1.',
      'Divida a mudança da saída pela mudança da entrada para saber quanto a saída cresce a cada unidade. Esse é o número que multiplica.',
      'Depois de achar o número que multiplica, veja quanto falta para chegar ao valor da pedra: esse é o número fixo da regra.',
    ],
    mount: mountArchive,
  },
};
