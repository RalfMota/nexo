/* NEXO — Torre dos Padrões, jogada no próprio mapa: "Representar aquilo que você descobriu"
 *
 * r5a Grade de Energia (hastes = 3 × módulos + 1):
 *   1. No chão há grades de exemplo (1, 2 e 3 módulos). O jogador carrega o carrinho com
 *      feixes de 10 hastes e hastes soltas e manda montar a grade de 10 módulos.
 *   2. Escreve a regra geral em dois mostradores (hastes por módulo, hastes fixas) e testa
 *      no elevador da Torre, que acende os 12 andares onde a regra acerta.
 * r5b Arquivo da Torre: três pedestais com registros de relações já vividas; para cada um,
 *   o jogador gira os mostradores com a regra e grava no selo.
 *
 * Os eventos registrados para a pesquisa são os mesmos da versão em janela.
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst } from '../world/quest-layer.js';
import { drawRodPile, drawLightGrid, drawMineCart, drawPedestal, pedestalFace } from '../art/mission-props.js';
import { TILE, tileFoot, drawTag, drawArrow, addLever, addDial } from './world-kit.js';
import { prefersCalm } from '../core/state.js';

const DIAL_A = { x: 46 * TILE + 16, y: 22 * TILE + 26 };
const DIAL_B = { x: 54 * TILE + 16, y: 22 * TILE + 26 };
const RULE_LEVER = tileFoot(56, 22);
const ELEVATOR = { x: 53 * TILE + 6, bottom: 17 * TILE + 28 }; // coluna de luzes ao lado da Torre

/** Coluna de 12 andares: cinza (sem teste), verde (a regra acerta) ou vermelho (erra). */
function drawElevator(ctx, marks, t) {
  ctx.fillStyle = '#29253a';
  ctx.fillRect(ELEVATOR.x - 2, ELEVATOR.bottom - 12 * 9 - 2, 9, 12 * 9 + 3);
  for (let i = 0; i < 12; i++) {
    const mark = marks[i];
    const pulse = 0.75 + Math.sin(t * 4 + i) * 0.2;
    ctx.fillStyle = mark == null ? '#3b3650' : mark ? `rgba(108, 255, 138, ${pulse})` : `rgba(255, 107, 91, ${pulse})`;
    ctx.fillRect(ELEVATOR.x, ELEVATOR.bottom - (i + 1) * 9 + 1, 5, 7);
  }
}

/* ======================================================================
 * r5a: Grade de Energia (h = 3n + 1)
 * ==================================================================== */

const rods = (modules) => 3 * modules + 1;
const BIG_GRID = 10;
const FLOORS = 12;
const MAX_IN_HAND = 40;
const EXAMPLES = { left: 45 * TILE, bottom: 25 * TILE + 22, cell: 14 };
const BUNDLES = tileFoot(51, 27);
const LOOSE = tileFoot(53, 27);
const ROD_CART = tileFoot(55, 27);
const BUILD_LEVER = tileFoot(56, 29);
const SITE = { left: 45 * TILE + 8, bottom: 32 * TILE + 20, cell: 12 };

function mountEnergyGridWorld(api) {
  let stage = 0;
  let hand = []; // 10 (feixe) ou 1 (haste solta), na ordem em que foram pegos
  let load = [];
  let built = null;
  let marks = [];
  const guesses = [];

  const sum = (list) => list.reduce((a, b) => a + b, 0);
  const examplesRows = () => [[1, rods(1)], [2, rods(2)], [3, rods(3)]];
  const recordOne = () => api.record(['Módulos', 'Hastes'], [...examplesRows(), ...guesses]);

  const handItem = {
    label: 'hastes de luz',
    draw: (ctx) => {
      drawRodPile(ctx, 0, 8, hand.some((n) => n === 10));
      drawTag(ctx, 0, -14, `${sum(hand)} hastes`);
    },
  };
  const refreshHands = () => setCarried(hand.length ? handItem : null);

  const take = (amount) => {
    if (sum(hand) + amount > MAX_IN_HAND) {
      api.say('Suas mãos estão cheias. Ponha as hastes no carrinho primeiro.', 'warn');
      return;
    }
    hand.push(amount);
    playAction('crouch');
    refreshHands();
  };

  // Grades de exemplo no chão
  addQuestObject({
    id: 'grid-examples',
    x: EXAMPLES.left + 30,
    y: EXAMPLES.bottom + 6,
    reach: 0,
    label: 'Grades de exemplo',
    enabled: () => false,
    draw: (ctx, t) => {
      let left = EXAMPLES.left;
      [1, 2, 3].forEach((n) => {
        drawLightGrid(ctx, left, EXAMPLES.bottom, n, { cell: EXAMPLES.cell, t });
        drawTag(ctx, left + (n * EXAMPLES.cell) / 2, EXAMPLES.bottom - EXAMPLES.cell - 10 - (n === 2 ? 12 : 0), `${n} módulo${n > 1 ? 's' : ''}: ${rods(n)} hastes`);
        left += n * EXAMPLES.cell + 16;
      });
    },
    onInteract: () => {},
  });

  addQuestObject({
    id: 'rod-bundles',
    ...BUNDLES,
    reach: 24,
    label: 'Feixes de 10 hastes',
    enabled: () => stage === 0,
    draw: (ctx) => {
      drawRodPile(ctx, BUNDLES.x, BUNDLES.y, true);
      drawTag(ctx, BUNDLES.x, BUNDLES.y - 26, 'feixes de 10');
    },
    onInteract: () => take(10),
  });

  addQuestObject({
    id: 'rod-loose',
    ...LOOSE,
    reach: 24,
    label: 'Hastes soltas',
    enabled: () => stage === 0,
    draw: (ctx) => {
      drawRodPile(ctx, LOOSE.x, LOOSE.y, false);
      drawTag(ctx, LOOSE.x, LOOSE.y - 26, 'soltas');
    },
    onInteract: () => take(1),
  });

  addQuestObject({
    id: 'rod-cart',
    ...ROD_CART,
    reach: 28,
    label: 'Carrinho da grade',
    enabled: () => stage === 0,
    draw: (ctx, t) => {
      drawMineCart(ctx, ROD_CART.x, ROD_CART.y, 0);
      if (sum(load)) drawRodPile(ctx, ROD_CART.x, ROD_CART.y - 12, load.includes(10));
      drawTag(ctx, ROD_CART.x, ROD_CART.y - 36, `${sum(load)} hastes`);
      if (hand.length) drawArrow(ctx, ROD_CART.x, ROD_CART.y - 50, t);
    },
    onInteract: () => {
      if (hand.length) {
        load = load.concat(hand);
        hand = [];
        playAction('crouch');
        burst(ROD_CART.x, ROD_CART.y - 14, 'sparkle', 6);
        refreshHands();
        return;
      }
      if (load.length) {
        const last = load.pop();
        api.say(last === 10 ? 'Você tirou um feixe de 10 do carrinho.' : 'Você tirou uma haste solta do carrinho.');
        return;
      }
      api.say('Pegue hastes nos montes e ponha no carrinho.', 'warn');
    },
  });

  addLever({ id: 'build-lever', ...BUILD_LEVER, label: 'Montar a grade de 10 módulos', color: '#5fe3d0', visible: () => stage === 0, onPull: buildGrid });

  // Canteiro onde a grade de 10 módulos é montada
  addQuestObject({
    id: 'grid-site',
    x: SITE.left + (BIG_GRID * SITE.cell) / 2,
    y: SITE.bottom + 8,
    reach: 0,
    label: 'Grade de 10 módulos',
    enabled: () => false,
    draw: (ctx, t) => {
      if (built == null) {
        ctx.fillStyle = 'rgba(40, 30, 60, .25)';
        ctx.fillRect(SITE.left - 2, SITE.bottom - SITE.cell - 2, BIG_GRID * SITE.cell + 5, SITE.cell + 5);
      } else {
        drawLightGrid(ctx, SITE.left, SITE.bottom, BIG_GRID, { cell: SITE.cell, rods: built, t });
      }
      drawTag(ctx, SITE.left + (BIG_GRID * SITE.cell) / 2, SITE.bottom - SITE.cell - 12, 'grade de 10 módulos');
    },
    onInteract: () => {},
  });

  // Etapa 2: regra no elevador
  const dialA = addDial({ id: 'rule-a', ...DIAL_A, label: 'Hastes por módulo', max: 20, visible: () => stage === 1, caption: 'hastes por módulo' });
  const dialB = addDial({ id: 'rule-b', ...DIAL_B, label: 'Hastes fixas', max: 20, visible: () => stage === 1, caption: 'hastes fixas' });
  addLever({ id: 'rule-lever', ...RULE_LEVER, label: 'Gravar a regra no elevador', color: '#5fe3d0', visible: () => stage === 1, onPull: testRule });
  addQuestObject({
    id: 'elevator',
    x: ELEVATOR.x,
    y: ELEVATOR.bottom + 4,
    reach: 0,
    label: 'Elevador da Torre',
    enabled: () => false,
    draw: (ctx, t) => {
      if (stage !== 1) return;
      drawElevator(ctx, marks, t);
      drawTag(ctx, (DIAL_A.x + DIAL_B.x) / 2, DIAL_A.y - 40, 'hastes = A × módulos + B', { fill: '#1d1a38', ink: '#cfe0ff' });
    },
    onInteract: () => {},
  });

  function buildGrid() {
    const amount = sum(load);
    if (amount === 0) {
      api.say('O carrinho está vazio. Carregue hastes antes de montar.', 'warn');
      return;
    }
    const real = rods(BIG_GRID);
    built = amount;
    const ok = api.attempt(amount === real, { modulos: BIG_GRID, previsao: amount, real });
    guesses.push([BIG_GRID, { value: `${amount} ${ok ? '(completa)' : amount < real ? '(faltaram)' : '(sobraram)'}`, tone: ok ? 'good' : 'bad' }]);
    recordOne();
    if (ok) {
      burst(SITE.left + (BIG_GRID * SITE.cell) / 2, SITE.bottom - 10, 'success', 24);
      api.say('A grade ficou completa, sem sobrar haste! Agora o elevador precisa de uma regra que sirva para qualquer quantidade de módulos.', 'ok');
      setTimeout(() => {
        if (!api.isActive()) return;
        stage = 1;
        api.setStage(1);
        api.setObjective('Gire os dois mostradores com a regra (hastes = A × módulos + B) e puxe a alavanca.');
        api.record(['Módulos', 'Sua regra', 'Grade real'], []);
      }, prefersCalm() ? 0 : 1800);
    } else if (amount < real) {
      api.fail(`Com ${amount} hastes, as hastes acabaram antes do fim: os últimos módulos ficaram abertos.`);
    } else {
      api.fail(`Com ${amount} hastes, a grade ficou pronta e ainda sobraram hastes no chão.`);
    }
  }

  function testRule() {
    const a = dialA.get();
    const b = dialB.get();
    const floors = Array.from({ length: FLOORS }, (_, i) => i + 1);
    marks = floors.map((n) => a * n + b === rods(n));
    const hits = marks.filter(Boolean).length;
    api.record(['Módulos', 'Sua regra', 'Grade real'], floors.map((n) => [n, { value: a * n + b, tone: a * n + b === rods(n) ? 'good' : 'bad' }, rods(n)]));
    if (api.attempt(hits === FLOORS, { a, b, acertos: hits })) {
      burst(ELEVATOR.x, ELEVATOR.bottom - 60, 'success', 24);
      api.win('O elevador montou todos os andares com a regra que você escreveu. A Torre guardou a regra no arquivo.');
    } else {
      api.fail(`A regra acertou ${hits} de ${FLOORS} andares. As luzes vermelhas ao lado da Torre mostram onde ela se afasta da grade real.`);
    }
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective('Olhe as grades de exemplo, carregue o carrinho com as hastes que a grade de 10 módulos pede e puxe a alavanca.');
  recordOne();
}

/* ======================================================================
 * r5b: Arquivo da Torre
 * ==================================================================== */

const SEALS = [
  { name: 'Máquina de Produção', input: 'ciclos', output: 'cristais', rows: [[1, 3], [4, 12], [7, 21]], color: '#e8a33d', at: tileFoot(46, 26) },
  { name: 'Conversor de Energia', input: 'energia', output: 'saída', rows: [[1, 6], [3, 10], [8, 20]], color: '#5fe3d0', at: tileFoot(50, 26) },
  { name: 'Rota B', input: 'distância', output: 'custo', rows: [[2, 19], [5, 25], [10, 35]], color: '#6f8ff0', at: tileFoot(54, 26) },
];

function mountArchiveWorld(api) {
  let current = 0;
  const written = [];

  const seal = () => SEALS[Math.min(current, SEALS.length - 1)];
  const record = () => api.record([seal().input, seal().output], seal().rows, `Registro: ${seal().name}`);

  SEALS.forEach((item, index) => {
    addQuestObject({
      id: `seal-${index}`,
      x: item.at.x,
      y: item.at.y + 2,
      reach: 28,
      label: `Pedestal: ${item.name}`,
      draw: (ctx, t) => {
        drawPedestal(ctx, item.at.x, item.at.y, Boolean(written[index]));
        const face = pedestalFace(item.at.x, item.at.y);
        ctx.fillStyle = item.color;
        ctx.fillRect(face.left + 10, face.top + 4, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(face.left + 11, face.top + 5, 2, 2);
        // Linhas do registro, escritas acima do pedestal
        item.rows.forEach(([x, y], i) => drawTag(ctx, item.at.x, item.at.y - 68 + i * 12, `${x} → ${y}`));
        drawTag(ctx, item.at.x, item.at.y - 82, written[index] ?? item.name, written[index] ? { fill: '#c8f5c0' } : undefined);
        if (index === current) drawArrow(ctx, item.at.x, item.at.y - 98, t);
      },
      onInteract: () => {
        if (index < current) api.say(`Este selo já guarda a regra ${written[index]}.`, 'ok');
        else if (index > current) api.say(`Primeiro grave o selo “${seal().name}”.`);
        else api.say(`Registro de ${item.name}: ${item.rows.map(([x, y]) => `${x} → ${y}`).join(', ')}. Gire os mostradores e puxe a alavanca.`);
      },
    });
  });

  const dialA = addDial({ id: 'seal-a', ...DIAL_A, label: 'Quanto cada unidade acrescenta', max: 30, caption: 'multiplica a entrada' });
  const dialB = addDial({ id: 'seal-b', ...DIAL_B, label: 'Número fixo da regra', max: 30, caption: 'número fixo' });
  addLever({ id: 'seal-lever', ...RULE_LEVER, label: 'Gravar a regra no selo', color: '#5fe3d0', onPull: engrave });
  addQuestObject({
    id: 'seal-formula',
    x: 0,
    y: 0,
    reach: 0,
    label: 'Regra',
    enabled: () => false,
    draw: (ctx) => drawTag(ctx, (DIAL_A.x + DIAL_B.x) / 2, DIAL_A.y - 40, `${seal().output} = A × ${seal().input} + B`, { fill: '#1d1a38', ink: '#cfe0ff' }),
    onInteract: () => {},
  });

  function engrave() {
    if (current >= SEALS.length) return;
    const item = SEALS[current];
    const a = dialA.get();
    const b = dialB.get();
    const mismatch = item.rows.find(([x, y]) => a * x + b !== y);
    if (!api.attempt(!mismatch, { selo: item.name, a, b })) {
      const [x, y] = mismatch;
      api.fail(`O selo rejeitou a regra: para ${item.input} = ${x}, ela dá ${a * x + b}, mas o registro mostra ${y}.`);
      return;
    }
    written[current] = `${item.output} = ${a} × ${item.input}${b ? ` + ${b}` : ''}`;
    burst(item.at.x, item.at.y - 30, 'success', 16);
    current++;
    if (current < SEALS.length) {
      const left = SEALS.length - current;
      api.setStage(current);
      api.say(`O selo “${item.name}” brilhou! ${left === 1 ? 'Falta um.' : `Faltam ${left}.`}`, 'ok');
      dialA.set(0);
      dialB.set(0);
      record();
    } else {
      api.win('Os três selos brilham. O arquivo da Torre guardou as regras das máquinas e das rotas.');
    }
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective('Para cada pedestal, gire os mostradores com a regra do registro e puxe a alavanca.');
  record();
}

export default {
  r5a: {
    title: 'Grade de Energia',
    region: 'r5',
    npc: 'nyla',
    mode: 'world',
    stages: ['Grade de 10', 'Regra geral'],
    greeting: 'Carregue o carrinho com as hastes que a grade de 10 módulos vai pedir e mande montar. Olhe as grades de exemplo no chão.',
    context: 'A Torre é alimentada por grades de hastes de luz. Cada módulo é um quadrado, e módulos vizinhos compartilham uma haste. O elevador da Torre só funciona se souber quantas hastes cada andar exige.',
    goal: 'Descobrir quantas hastes uma grade de 10 módulos exige e depois escrever a regra que vale para qualquer quantidade de módulos.',
    concept: 'Generalização de padrão; expressão algébrica com variável',
    prerequisites: 'Regularidade e covariação (Oficina); previsão (Rotas)',
    relation: 'h = 3n + 1 (hastes = 3 × módulos + 1)',
    categories: ['linguagem algébrica', 'representação', 'previsão'],
    hints: [
      'Compare uma grade de exemplo com a seguinte: quantas hastes novas aparecem quando entra mais um módulo?',
      'O primeiro módulo é diferente dos outros: ele precisa de uma haste a mais para fechar o quadrado.',
      'Cada módulo novo acrescenta sempre a mesma quantidade de hastes. Pense no número que multiplica os módulos e no número que fica fixo. Com as mãos vazias, dá para tirar hastes do carrinho.',
    ],
    mountWorld: mountEnergyGridWorld,
  },
  r5b: {
    title: 'Arquivo da Torre',
    region: 'r5',
    npc: 'nyla',
    mode: 'world',
    stages: SEALS.map((item) => item.name),
    greeting: 'Cada selo só fecha com a regra do registro escrito sobre o pedestal. Gire os mostradores e grave.',
    context: 'O arquivo da Torre guarda as regras de funcionamento do Nexo. Três registros chegaram sem regra: a Máquina de Produção, o Conversor de Energia e a Rota B.',
    goal: 'Escrever, para cada registro, a regra que liga a entrada à saída.',
    concept: 'Variável e expressão algébrica como representação de relações já vividas',
    prerequisites: 'Missões da Oficina e das Rotas; Grade de Energia',
    relation: 'cristais = 3 × ciclos; saída = 2 × energia + 4; custo = 2 × distância + 15',
    categories: ['linguagem algébrica', 'representação', 'função'],
    hints: [
      'Compare duas linhas do registro: quanto muda a saída quando a entrada muda? Atenção: as entradas não vão de 1 em 1.',
      'Divida a mudança da saída pela mudança da entrada para saber quanto a saída cresce a cada unidade. Esse é o número que multiplica.',
      'Depois de achar o número que multiplica, veja quanto falta para chegar ao valor do registro: esse é o número fixo da regra.',
    ],
    mountWorld: mountArchiveWorld,
  },
};
