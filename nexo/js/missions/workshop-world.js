/* NEXO — Oficina dos Construtores, jogada no próprio mapa: "Quando uma coisa muda, outra também muda"
 *
 * r3a Máquina de Produção (cristais = 3 × ciclos): o jogador gira a manivela da máquina,
 *   pega o carrinho e leva até a ponte de carga, que pede exatamente 24 cristais.
 * r3d Previsão (saída = 2 × energia + 4): leva células da estante ao conversor e faz até
 *   3 testes; depois gira o mostrador com a previsão e puxa a alavanca para conferir.
 *
 * Os eventos registrados para a pesquisa são os mesmos da versão em janela.
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst } from '../world/quest-layer.js';
import { drawCrankMachine, drawMineCart, drawCargoBridge, drawConverter, drawOutputTube, drawCellRack, drawEnergyCells } from '../art/mission-props.js';
import { tileFoot, drawTag, drawArrow, addLever, addDial } from './world-kit.js';
import { prefersCalm } from '../core/state.js';

/* ======================================================================
 * r3a: Máquina de Produção (y = 3x)
 * ==================================================================== */

const BRIDGE_LOAD = 24;
const PER_CYCLE = 3;
const MAX_CYCLES = 10;
const MACHINE = tileFoot(22, 8);
const CART_HOME = { x: MACHINE.x + 50, y: MACHINE.y + 2 }; // embaixo da calha de saída
const BRIDGE = { x: 33 * 32, y: 10 * 32 + 30 }; // entre a estrada e o poste (35, 9)

function mountProductionWorld(api) {
  let cycles = 0;
  let cartCarried = false;
  let bridgeState = 'idle'; // idle | ok | under | over
  let spinUntil = 0;
  let clock = 0;
  const rows = [];

  const crystals = () => cycles * PER_CYCLE;
  const tape = () => {
    const printed = Array.from({ length: cycles }, (_, i) => [i + 1, (i + 1) * PER_CYCLE]);
    api.record(['Ciclos', 'Cristais'], [...rows, ...printed.slice(-6)], 'Fita da máquina e entregas');
  };

  const cartItem = {
    label: 'carrinho de cristais',
    draw: (ctx) => {
      drawMineCart(ctx, 0, 8, crystals(), 0.75);
      drawTag(ctx, 0, -14, `${crystals()} cristais`);
    },
  };

  addQuestObject({
    id: 'crank-machine',
    x: MACHINE.x,
    y: MACHINE.y,
    reach: 40,
    get label() {
      return cartCarried ? 'Devolver os cristais à máquina' : 'Manivela da máquina';
    },
    draw: (ctx, t) => {
      clock = t;
      drawCrankMachine(ctx, MACHINE.x, MACHINE.y, t, t < spinUntil);
      drawTag(ctx, MACHINE.x, MACHINE.y - 82, `ciclos: ${cycles}`, { fill: '#1d1a38', ink: '#7ff0e0' });
    },
    onInteract: useMachine,
  });

  addQuestObject({
    id: 'mine-cart',
    x: CART_HOME.x,
    y: CART_HOME.y,
    reach: 30,
    label: 'Carrinho de cristais',
    enabled: () => !cartCarried,
    draw: (ctx) => {
      if (cartCarried) return;
      drawMineCart(ctx, CART_HOME.x, CART_HOME.y, crystals());
      if (cycles > 0) drawTag(ctx, CART_HOME.x, CART_HOME.y - 30, `${crystals()}`);
    },
    onInteract: () => {
      cartCarried = true;
      playAction('crouch');
      setCarried(cartItem);
    },
  });

  addQuestObject({
    id: 'cargo-bridge',
    x: BRIDGE.x,
    y: BRIDGE.y + 2,
    reach: 40,
    label: 'Ponte de carga',
    draw: (ctx, t) => {
      drawCargoBridge(ctx, BRIDGE.x, BRIDGE.y, bridgeState === 'ok', bridgeState);
      drawTag(ctx, BRIDGE.x + 21, BRIDGE.y - 52, `pede ${BRIDGE_LOAD}`, { fill: '#1d1a38', ink: '#ffe08a' });
      if (cartCarried) drawArrow(ctx, BRIDGE.x, BRIDGE.y - 64, t);
    },
    onInteract: deliver,
  });

  function useMachine() {
    if (cartCarried) {
      // Devolver: os cristais voltam para a máquina e o carrinho fica vazio no lugar
      cycles = 0;
      cartCarried = false;
      setCarried(null);
      bridgeState = 'idle';
      burst(MACHINE.x, MACHINE.y - 30, 'sparkle', 8);
      api.say('Os cristais voltaram para a máquina. O carrinho está vazio de novo.');
      tape();
      return;
    }
    if (cycles >= MAX_CYCLES) {
      api.say('O carrinho já está cheio.', 'warn');
      return;
    }
    cycles++;
    bridgeState = 'idle';
    spinUntil = clock + 0.5;
    playAction('use');
    burst(CART_HOME.x, CART_HOME.y - 16, 'sparkle', PER_CYCLE * 2);
    tape();
  }

  function deliver() {
    if (!cartCarried) {
      api.say('Traga o carrinho de cristais até a ponte.', 'warn');
      return;
    }
    const x = cycles;
    const y = crystals();
    if (y === 0) {
      api.say('O carrinho está vazio. Gire a manivela da máquina primeiro.', 'warn');
      return;
    }
    cartCarried = false;
    setCarried(null);
    playAction('crouch');
    rows.push([x, { value: `${y} → ponte`, tone: y === BRIDGE_LOAD ? 'good' : 'bad' }]);
    const ok = api.attempt(y === BRIDGE_LOAD, { x, y });
    bridgeState = ok ? 'ok' : y < BRIDGE_LOAD ? 'under' : 'over';
    tape();
    if (ok) {
      burst(BRIDGE.x, BRIDGE.y - 20, 'success', 24);
      api.win('A ponte recebeu a carga certa, abaixou e voltou a se conectar.');
      return;
    }
    burst(BRIDGE.x, BRIDGE.y - 20, 'dust', 10);
    api.fail(y < BRIDGE_LOAD
      ? `A ponte recebeu ${y} cristais: carga insuficiente, ela nem se moveu. O carrinho voltou vazio para a máquina.`
      : `A ponte recebeu ${y} cristais: carga demais, ela travou. O carrinho voltou vazio para a máquina.`);
    setTimeout(() => {
      if (!api.isActive()) return;
      cycles = 0;
      bridgeState = 'idle';
      tape();
    }, prefersCalm() ? 0 : 1200);
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective(`Gire a manivela, pegue o carrinho e leve exatamente ${BRIDGE_LOAD} cristais até a ponte.`);
  tape();
}

/* ======================================================================
 * r3d: Previsão (y = 2x + 4)
 * ==================================================================== */

const TEST_LIMIT = 3;
const MAX_CELLS = 10;
const convert = (energy) => 2 * energy + 4;
const PREDICTION_SETS = [[9, 14, 6, 11, 17], [7, 12, 15, 8, 16]];
const CONVERTER = tileFoot(36, 7);
const TUBE = { x: CONVERTER.x + 36, y: CONVERTER.y - 2 };
const TEST_LEVER = tileFoot(38, 7);
const RACK = tileFoot(34, 10);
const DIAL = { x: 37 * 32 + 16, y: 10 * 32 + 26 };
const LAUNCH_LEVER = tileFoot(33, 10);
const TUBE_MAX = 44;

function mountPredictionWorld(api) {
  const rows = [];
  let inHand = 0;
  let loaded = 0;
  let testsUsed = 0;
  let setIndex = 0;
  let itemIndex = 0;
  let correct = 0;
  let output = 0;
  let outputTarget = 0;
  let predicted = null;
  let activeUntil = 0;
  let clock = 0;
  let stage = 0;

  const kaelEnergy = () => PREDICTION_SETS[setIndex][itemIndex];
  const record = () => api.record(['Energia', 'Saída'], rows);

  const handItem = {
    label: 'células de energia',
    draw: (ctx) => {
      drawEnergyCells(ctx, 0, 6, inHand);
      drawTag(ctx, 0, -10, String(inHand));
    },
  };
  const refreshHands = () => setCarried(inHand > 0 ? handItem : null);

  addQuestObject({
    id: 'cell-rack',
    x: RACK.x,
    y: RACK.y,
    reach: 30,
    label: 'Estante de células de energia',
    draw: (ctx) => drawCellRack(ctx, RACK.x, RACK.y),
    onInteract: () => {
      if (inHand + loaded >= MAX_CELLS) {
        api.say(`O conversor aceita no máximo ${MAX_CELLS} células.`, 'warn');
        return;
      }
      inHand++;
      playAction('crouch');
      refreshHands();
    },
  });

  addQuestObject({
    id: 'converter',
    x: CONVERTER.x,
    y: CONVERTER.y + 2,
    reach: 36,
    label: 'Conversor de energia',
    draw: (ctx, t) => {
      clock = t;
      output += (outputTarget - output) * Math.min(1, (1 / 60) * 3);
      drawConverter(ctx, CONVERTER.x, CONVERTER.y, t, t < activeUntil);
      drawOutputTube(ctx, TUBE.x, TUBE.y, output, TUBE_MAX, predicted);
      drawTag(ctx, CONVERTER.x - 26, CONVERTER.y - 38, `entrada: ${loaded}`, { fill: '#1d1a38', ink: '#7ff0e0' });
      drawTag(ctx, TUBE.x + 4, TUBE.y - 78, `saída: ${Math.round(output)}`, { fill: '#1d1a38', ink: '#7ff0e0' });
      if (stage === 1) drawTag(ctx, CONVERTER.x - 6, CONVERTER.y - 92, `bilhete do Kael: ${kaelEnergy()} células`, { fill: '#fff6dc' });
    },
    onInteract: () => {
      if (inHand > 0) {
        loaded += inHand;
        inHand = 0;
        playAction('use');
        burst(CONVERTER.x - 20, CONVERTER.y - 22, 'sparkle', 6);
        refreshHands();
        return;
      }
      if (loaded > 0) {
        loaded--;
        inHand++;
        refreshHands();
        return;
      }
      api.say('Pegue células na estante e traga até o conversor.', 'warn');
    },
  });

  addLever({
    id: 'test-lever',
    ...TEST_LEVER,
    label: 'Alavanca de teste',
    color: '#f2b84b',
    visible: () => stage === 0,
    onPull: runTest,
  });

  const dial = addDial({ id: 'prediction', ...DIAL, label: 'Previsão da saída', max: 60, visible: () => stage === 1, caption: 'sua previsão' });

  addLever({
    id: 'launch-lever',
    ...LAUNCH_LEVER,
    label: 'Ligar com a previsão do mostrador',
    visible: () => stage === 1,
    onPull: confirmPrediction,
  });

  function runTest() {
    if (testsUsed >= TEST_LIMIT) return;
    const x = loaded;
    testsUsed++;
    rows.push([x, convert(x)]);
    record();
    api.log('interaction', { teste: x, saida: convert(x) });
    predicted = null;
    output = 0;
    outputTarget = convert(x);
    activeUntil = clock + 1;
    loaded = 0;
    burst(TUBE.x, TUBE.y - 30, 'sparkle', 8);
    const left = TEST_LIMIT - testsUsed;
    if (left > 0) {
      api.say(`Com ${x} ${x === 1 ? 'célula' : 'células'} saíram ${convert(x)} de energia. ${left === 1 ? 'Resta 1 teste.' : `Restam ${left} testes.`}`);
      return;
    }
    setTimeout(() => {
      if (!api.isActive()) return;
      stage = 1;
      api.setStage(1);
      api.setObjective('Leia o bilhete do Kael, gire o mostrador com a sua previsão e puxe a alavanca vermelha.');
      api.say(`Os testes acabaram. Agora diga antes: quanto vai sair com ${kaelEnergy()} células? Gire o mostrador e puxe a alavanca vermelha.`);
    }, prefersCalm() ? 0 : 900);
  }

  function confirmPrediction() {
    const guess = dial.get();
    const e = kaelEnergy();
    const real = convert(e);
    const good = api.attempt(guess === real, { energia: e, previsao: guess, real });
    rows.push([e, real]);
    record();
    predicted = guess;
    output = 0;
    outputTarget = real;
    activeUntil = clock + 1;
    itemIndex++;
    if (good) correct++;

    if (correct >= 2) {
      itemIndex--;
      burst(CONVERTER.x, CONVERTER.y - 30, 'success', 24);
      api.win('Suas previsões coincidiram e o conversor estabilizou.');
      return;
    }
    if (itemIndex >= PREDICTION_SETS[setIndex].length) {
      itemIndex = 0;
      correct = 0;
      setIndex = (setIndex + 1) % PREDICTION_SETS.length;
      api.fail('As previsões ainda não bateram. Kael trouxe novas energias; observe o Registro.');
    } else if (good) {
      api.say(`A previsão coincidiu: saiu ${real}. Mais uma! Próximo bilhete: ${kaelEnergy()} células.`, 'ok');
    } else {
      api.fail(`Saiu ${real}, e você previu ${guess}: o conversor oscilou. O valor real entrou no Registro. Próximo bilhete: ${kaelEnergy()} células.`);
    }
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective('Pegue células na estante, coloque no conversor e puxe a alavanca amarela. São 3 testes.');
  record();
}

export default {
  r3a: {
    title: 'Máquina de Produção',
    region: 'r3',
    npc: 'kael',
    mode: 'world',
    stages: ['Carga exata'],
    greeting: `A ponte pede ${BRIDGE_LOAD} cristais, nem um a mais. Gire a manivela da máquina, pegue o carrinho e leve até a ponte.`,
    context: `Após a Ruptura, a máquina de cristais da oficina produz quantidades que ninguém consegue prever. Kael precisa de uma carga exata de ${BRIDGE_LOAD} cristais para reativar a ponte.`,
    goal: 'Descobrir quantos ciclos da máquina entregam exatamente a carga que a ponte pede.',
    concept: 'Regularidade e covariação entre ciclos e produção',
    prerequisites: 'Multiplicação; leitura de registro em tabela',
    relation: 'y = 3x (cristais = 3 × ciclos)',
    categories: ['proporcionalidade', 'relações entre grandezas'],
    hints: [
      'Gire a manivela uma vez e veja o carrinho. Olhe a fita da máquina no Registro: o que acontece com os cristais a cada giro?',
      'Compare duas linhas da fita. Quanto muda a produção quando os ciclos aumentam em 1?',
      'Cada ciclo acrescenta sempre a mesma quantidade de cristais. Use isso para chegar à carga que a ponte pede. Se errar, a máquina aceita o carrinho de volta.',
    ],
    mountWorld: mountProductionWorld,
  },
  r3d: {
    title: 'Previsão',
    region: 'r3',
    npc: 'kael',
    mode: 'world',
    stages: ['Testar', 'Prever'],
    greeting: 'Você tem três testes com as células da estante. Depois, gire o mostrador e diga quanto vai sair antes de eu ligar.',
    context: 'O Conversor de Energia transforma energia de entrada em saída útil. Antes de cada acionamento, Kael exige que você diga o que vai acontecer.',
    goal: 'Usar até 3 testes para entender o conversor e depois prever a saída para energias novas.',
    concept: 'Dependência entre grandezas, previsão e valor inicial fixo',
    prerequisites: 'Multiplicação; leitura de registro em tabela',
    relation: 'y = 2x + 4 (saída = 2 × energia + 4)',
    categories: ['relações entre grandezas', 'previsão', 'representação'],
    hints: [
      'Faça testes com quantidades diferentes de células e compare as saídas no Registro. Dá até para testar sem nenhuma célula.',
      'Observe quanto a saída cresce a cada célula a mais, e o que sai com 0 células.',
      'A saída cresce sempre o mesmo tanto por célula, a partir de um valor inicial. Use isso para a energia do bilhete. Segure E nas setas do mostrador para girar mais rápido.',
    ],
    mountWorld: mountPredictionWorld,
  },
};
