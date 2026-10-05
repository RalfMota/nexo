/* NEXO — Oficina dos Construtores: "Quando uma coisa muda, outra também muda"
 * Regularidade e covariação; dependência entre grandezas com valor inicial.
 */

import { createPlayfield, centerOf } from './playfield.js';
import { artLever, artCart, artCell, drawOrderNote } from './props-art.js';
import { tween, paintPanel } from './widgets.js';
import { roundRect, circle, outlinedText, drawCrystal, drawGear } from '../art/shapes.js';
import { prefersCalm } from '../core/state.js';

const font = (size) => `700 ${size}px "Pixelify Sans", sans-serif`;

/* ---------- r3a: Máquina de Produção (y = 3x) ---------- */

const BRIDGE_LOAD = 24;
const PER_CYCLE = 3;
const CART_HOME = { x: 380, y: 400, w: 200, h: 110 };
const BRIDGE = { x: 640, y: 250, w: 300, h: 270 };
const RETURN_CHUTE = { x: 30, y: 440, w: 170, h: 90 };

function mountProduction(stage, api) {
  const rows = [];
  let cycles = 0;
  let spinUntil = 0;
  let clock = 0;
  let bridge = 0;
  let bridgeState = 'idle'; // idle | ok | under | over

  const field = createPlayfield(stage, {
    draw(ctx, t, dt) {
      clock = t;
      paintPanel(ctx, 0, 0, 960, 540, '#2b2340');
      ctx.fillStyle = '#3a3052';
      ctx.fillRect(0, 470, 960, 70);
      const running = t < spinUntil;
      drawMachine(ctx, cycles, running, t);
      drawTape(ctx, cycles);
      drawReturnChute(ctx);
      bridge = tween(bridge, bridgeState === 'ok' ? 1 : 0, dt, 2.5);
      drawBridge(ctx, bridge, bridgeState, t);
    },
  }, api);

  const bridgeZone = field.addZone({ ...BRIDGE, label: 'Ponte: entregar a carga', accepts: (token) => token === cart });
  const chuteZone = field.addZone({ ...RETURN_CHUTE, label: 'Devolver os cristais à máquina', accepts: (token) => token === cart });

  field.addToken({
    x: 300, y: 150, w: 90, h: 140, mode: 'button', label: 'Manivela: um ciclo da máquina', className: 'act',
    art: artLever(false, '#e8a33d'),
    onTap: (lever) => {
      if (cycles >= 10) {
        api.say('O carrinho já está cheio.', 'warn');
        return;
      }
      cycles++;
      bridgeState = 'idle';
      spinUntil = clock + 0.5;
      lever.redraw(artLever(true, '#e8a33d'));
      setTimeout(() => lever.redraw(artLever(false, '#e8a33d')), 220);
      for (let i = 0; i < PER_CYCLE; i++) {
        field.fly((ctx, w, h) => drawCrystal(ctx, w / 2, h / 2, 10, { glow: 1 }), { x: 270, y: 330 }, centerOf(CART_HOME), { w: 26, h: 26, delay: i * 90, duration: 380 });
      }
      refreshCart();
    },
  });

  const cart = field.addToken({
    ...CART_HOME, mode: 'item', label: 'Carrinho de cristais: leve até a ponte', className: 'act',
    art: artCart(0),
    onDrop: (zone) => {
      if (zone === bridgeZone) deliver();
      if (zone === chuteZone) {
        cycles = 0;
        bridgeState = 'idle';
        refreshCart();
      }
      return false;
    },
  });

  function refreshCart() {
    cart.redraw(artCart(cycles * PER_CYCLE));
    cart.setLabel(`Carrinho com ${cycles * PER_CYCLE} cristais: leve até a ponte`);
  }

  function deliver() {
    const x = cycles;
    const y = cycles * PER_CYCLE;
    if (y === 0) {
      api.say('O carrinho está vazio. Gire a manivela da máquina primeiro.', 'warn');
      return;
    }
    rows.push([x, y]);
    api.record(['Ciclos', 'Cristais'], rows);
    const ok = api.attempt(y === BRIDGE_LOAD, { x, y });
    bridgeState = ok ? 'ok' : y < BRIDGE_LOAD ? 'under' : 'over';
    if (ok) {
      api.win('A ponte recebeu a carga certa e voltou a se conectar.');
      return;
    }
    api.fail(y < BRIDGE_LOAD ? 'A ponte recebeu carga insuficiente e não se moveu.' : 'A ponte recebeu carga demais e travou.');
    setTimeout(() => {
      if (!api.isActive()) return;
      cycles = 0;
      refreshCart();
    }, prefersCalm() ? 0 : 1200);
  }

  api.record(['Ciclos', 'Cristais'], rows);
}

function drawMachine(ctx, cycles, running, t) {
  ctx.fillStyle = '#5a4a7a';
  roundRect(ctx, 40, 60, 250, 300, 20);
  ctx.fill();
  ctx.fillStyle = '#1d1830';
  roundRect(ctx, 62, 84, 206, 150, 12);
  ctx.fill();
  drawGear(ctx, 130, 160, 42, t * (running ? 5 : 0.3), '#e8a33d');
  drawGear(ctx, 210, 134, 24, -t * (running ? 8 : 0.5), '#c97a2a');
  drawGear(ctx, 214, 196, 16, t * (running ? 10 : 0.6), '#ffcf6b');
  ctx.fillStyle = '#15122a';
  roundRect(ctx, 90, 254, 150, 40, 8);
  ctx.fill();
  outlinedText(ctx, `ciclos: ${cycles}`, 165, 274, { font: font(18), fill: '#7ff0e0' });
  // Calha de saída
  ctx.fillStyle = '#6e6890';
  ctx.beginPath();
  ctx.moveTo(250, 320);
  ctx.lineTo(300, 320);
  ctx.lineTo(380, 410);
  ctx.lineTo(350, 420);
  ctx.closePath();
  ctx.fill();
}

/** Fita impressa pela máquina: um registro por ciclo. */
function drawTape(ctx, cycles) {
  const x = 410;
  const y = 30;
  const rowsShown = Math.min(cycles, 9);
  const height = 40 + rowsShown * 30;
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x, y, 170, height);
  ctx.fillStyle = '#e8d2a4';
  for (let i = 0; i < 6; i++) ctx.fillRect(x + i * 30, y + height, 15, 6);
  outlinedText(ctx, 'ciclo → cristais', x + 85, y + 18, { font: font(13), fill: '#4f3019', stroke: '#fffaf0' });
  const first = cycles - rowsShown + 1;
  for (let i = 0; i < rowsShown; i++) {
    const n = first + i;
    outlinedText(ctx, `${n}  →  ${n * PER_CYCLE}`, x + 85, y + 50 + i * 30, { font: font(17), fill: '#2b1d14', stroke: '#fffaf0' });
  }
}

function drawReturnChute(ctx) {
  const { x, y, w, h } = RETURN_CHUTE;
  ctx.fillStyle = '#4b4560';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = '#1d1830';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 30, w * 0.36, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  outlinedText(ctx, 'devolver', x + w / 2, y + 66, { font: font(14) });
}

function drawBridge(ctx, extension, state, t) {
  const x = BRIDGE.x;
  const y = 330;
  ctx.fillStyle = '#4f9fd9';
  ctx.fillRect(x + 20, y + 80, 270, 90);
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(x, y + 30, 40, 140);
  ctx.fillRect(x + 260, y + 30, 40, 140);
  // Medidor de carga da ponte
  ctx.fillStyle = '#1d1830';
  roundRect(ctx, x + 110, y - 70, 90, 50, 10);
  ctx.fill();
  outlinedText(ctx, `pede ${BRIDGE_LOAD}`, x + 155, y - 45, { font: font(16), fill: '#ffe08a' });
  ctx.save();
  ctx.translate(x + 30, y + 36);
  ctx.rotate(-1.15 * (1 - extension));
  ctx.fillStyle = state === 'over' ? '#a85a4a' : '#a0703f';
  ctx.fillRect(0, -8, 240, 16);
  ctx.fillStyle = '#7d5530';
  for (let i = 10; i < 240; i += 22) ctx.fillRect(i, -8, 4, 16);
  ctx.restore();
  if (state === 'over') {
    for (let i = 0; i < 6; i++) {
      const phase = (t * 3 + i / 6) % 1;
      ctx.fillStyle = `rgba(255, 140, 80, ${1 - phase})`;
      ctx.fillRect(x + 20 + i * 8, y + 20 - phase * 30, 4, 4);
    }
  }
  if (state === 'under') outlinedText(ctx, 'não se moveu', x + 150, y + 6, { font: font(15), fill: '#ffcf6b' });
}

/* ---------- r3d: Previsão (y = 2x + 4) ---------- */

const TEST_LIMIT = 3;
const MAX_CELLS = 10;
const convert = (energy) => 2 * energy + 4;
const PREDICTION_SETS = [[9, 14, 6, 11, 17], [7, 12, 15, 8, 16]];
const SLOT = { x: 130, y: 290, w: 220, h: 170 };
const TUBE = { x: 700, y: 60, w: 70, h: 400, max: 44 };

function mountPrediction(stage, api) {
  const rows = [];
  let cells = 0;
  let testsUsed = 0;
  let setIndex = 0;
  let itemIndex = 0;
  let correct = 0;
  let output = 0;
  let outputTarget = 0;
  let predicted = null;
  let spinUntil = 0;
  let clock = 0;

  const kaelEnergy = () => PREDICTION_SETS[setIndex][itemIndex];

  const field = createPlayfield(stage, {
    draw(ctx, t, dt) {
      clock = t;
      paintPanel(ctx, 0, 0, 960, 540, '#232a44');
      output = tween(output, outputTarget, dt, 2.5);
      drawOrderNote(ctx, 24, 18, 300, 120, (note) => {
        outlinedText(note, 'Próximo acionamento', 150, 26, { font: font(15), fill: '#4f3019', stroke: '#fbf1d9' });
        note.save();
        note.translate(70, 50);
        artCell(note, 40, 60);
        note.restore();
        outlinedText(note, `× ${kaelEnergy()}`, 170, 82, { font: font(34), fill: '#4f3019', stroke: '#fbf1d9' });
      });
      drawSlot(ctx, cells);
      drawConverter(ctx, t < spinUntil, t);
      drawTube(ctx, output, predicted);
      for (let i = 0; i < TEST_LIMIT; i++) circle(ctx, 380 + i * 26, 300, 9, i < TEST_LIMIT - testsUsed ? '#5fe3d0' : '#3b3b5c');
      outlinedText(ctx, 'testes', 406, 326, { font: font(13) });
      outlinedText(ctx, 'sua previsão', 862, 104, { font: font(14) });
    },
  }, api);

  const slotZone = field.addZone({
    ...SLOT,
    label: 'Entrada do conversor. Toque para tirar uma célula.',
    accepts: (token) => token.data.cell,
    onTap: () => {
      if (cells > 0) cells--;
    },
  });

  field.addToken({
    x: 30, y: 330, w: 80, h: 120, mode: 'source', repeat: true, className: 'act',
    label: 'Células de energia: arraste ou toque para encaixar uma na entrada',
    art: artCell, data: { cell: true },
    onTap: () => addCell(),
    onDrop: (zone) => zone === slotZone && addCell(),
  });

  const testLever = field.addToken({
    x: 370, y: 340, w: 80, h: 120, mode: 'button', label: 'Alavanca de teste: liga o conversor com as suas células', className: 'act',
    art: artLever(false, '#f2b84b'),
    onTap: runTest,
  });

  const dial = field.addDial({ x: 862, y: 120, value: 0, min: 0, max: 60, label: 'Previsão da saída' });

  field.addToken({
    x: 815, y: 330, w: 94, h: 130, mode: 'button', label: 'Ligar com a previsão do mostrador', className: 'act',
    art: artLever(false, '#c2453b'),
    onTap: confirmPrediction,
  });

  function addCell() {
    if (cells >= MAX_CELLS) return false;
    cells++;
    field.fly(artCell, { x: 70, y: 390 }, centerOf(SLOT), { w: 30, h: 44, duration: 300 });
    return true;
  }

  function runTest() {
    if (testsUsed >= TEST_LIMIT) {
      api.say('Os testes acabaram. Agora é com a previsão.', 'warn');
      return;
    }
    const x = cells;
    testsUsed++;
    rows.push([x, convert(x)]);
    api.record(['Energia', 'Saída'], rows);
    api.log('interaction', { teste: x, saida: convert(x) });
    predicted = null;
    output = 0;
    outputTarget = convert(x);
    spinUntil = clock + 1;
    cells = 0;
    if (testsUsed >= TEST_LIMIT) testLever.el.disabled = true;
  }

  function confirmPrediction() {
    const guess = dial.get();
    const e = kaelEnergy();
    const real = convert(e);
    const good = api.attempt(guess === real, { energia: e, previsao: guess, real });
    rows.push([e, real]);
    api.record(['Energia', 'Saída'], rows);
    predicted = guess;
    output = 0;
    outputTarget = real;
    spinUntil = clock + 1;
    itemIndex++;
    if (good) correct++;

    if (correct >= 2) {
      itemIndex--;
      api.win('Suas previsões coincidiram e o conversor estabilizou.');
      return;
    }
    if (itemIndex >= PREDICTION_SETS[setIndex].length) {
      itemIndex = 0;
      correct = 0;
      setIndex = (setIndex + 1) % PREDICTION_SETS.length;
      api.fail('As previsões ainda não bateram. Novas energias serão testadas; observe o Registro.');
    } else if (good) {
      api.say('A previsão coincidiu: o conversor respondeu como esperado.', 'ok');
    } else {
      api.fail('A saída real foi diferente da prevista e o conversor oscilou. O valor real entrou no Registro.');
    }
  }

  api.record(['Energia', 'Saída'], rows);
}

function drawSlot(ctx, cells) {
  const { x, y, w, h } = SLOT;
  ctx.fillStyle = '#151a2e';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  for (let i = 0; i < MAX_CELLS; i++) {
    const cx = x + 14 + (i % 5) * 40;
    const cy = y + 16 + Math.floor(i / 5) * 72;
    if (i < cells) {
      ctx.save();
      ctx.translate(cx, cy);
      artCell(ctx, 36, 60);
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.15)';
      ctx.lineWidth = 2;
      roundRect(ctx, cx + 6, cy + 8, 24, 50, 5);
      ctx.stroke();
    }
  }
  outlinedText(ctx, `entrada: ${cells}`, x + w / 2, y + h + 18, { font: font(16) });
}

function drawConverter(ctx, active, t) {
  ctx.fillStyle = '#3f4a78';
  roundRect(ctx, 400, 60, 240, 210, 24);
  ctx.fill();
  ctx.save();
  ctx.translate(520, 165);
  ctx.strokeStyle = '#5fe3d0';
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    ctx.rotate(t * (active ? 3 : 0.4) + i);
    ctx.beginPath();
    ctx.ellipse(0, 0, 80 - i * 18, 28 - i * 5, 0, 0, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
  drawCrystal(ctx, 520, 165, 22, { glow: active ? 1.6 : 0.6 });
  ctx.fillStyle = '#5b5f73';
  ctx.fillRect(350, 160, 50, 12);
  ctx.fillRect(640, 160, 60, 12);
}

function drawTube(ctx, value, predicted) {
  const { x, y, w, h, max } = TUBE;
  ctx.fillStyle = '#151a2e';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  const scale = (v) => y + h - 6 - Math.min(1, Math.max(0, v / max)) * (h - 12);
  ctx.fillStyle = '#5fe3d0';
  const top = scale(value);
  roundRect(ctx, x + 6, top, w - 12, y + h - 6 - top, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = '600 11px Lexend, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= max; v += 4) {
    ctx.fillRect(x + w - 14, scale(v), 8, 2);
    ctx.fillText(String(v), x - 6, scale(v));
  }
  if (predicted !== null) {
    const py = scale(predicted);
    ctx.strokeStyle = '#ffcf6b';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 10, py);
    ctx.lineTo(x + w + 10, py);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  outlinedText(ctx, `saída: ${Math.round(value)}`, x + w / 2, y + h + 20, { font: font(16) });
}

export default {
  r3a: {
    title: 'Máquina de Produção',
    region: 'r3',
    npc: 'kael',
    greeting: `A ponte pede ${BRIDGE_LOAD} cristais, nem um a mais. Gire a manivela e leve o carrinho até a ponte.`,
    context: `Após a Ruptura, a máquina de cristais da oficina produz quantidades que ninguém consegue prever. Kael precisa de uma carga exata de ${BRIDGE_LOAD} cristais para reativar a ponte.`,
    goal: 'Descobrir quantos ciclos da máquina entregam exatamente a carga que a ponte pede.',
    concept: 'Regularidade e covariação entre ciclos e produção',
    prerequisites: 'Multiplicação; leitura de registro em tabela',
    relation: 'y = 3x (cristais = 3 × ciclos)',
    categories: ['proporcionalidade', 'relações entre grandezas'],
    hints: [
      'Olhe a fita que sai da máquina: o que acontece com os cristais a cada giro da manivela?',
      'Compare duas linhas da fita. Quanto muda a produção quando os ciclos aumentam em 1?',
      'Cada ciclo acrescenta sempre a mesma quantidade de cristais. Use isso para chegar à carga que a ponte pede.',
    ],
    mount: mountProduction,
  },
  r3d: {
    title: 'Previsão',
    region: 'r3',
    npc: 'kael',
    greeting: 'Você tem três testes com suas células. Depois, gire o mostrador e diga quanto vai sair antes de eu ligar.',
    context: 'O Conversor de Energia transforma energia de entrada em saída útil. Antes de cada acionamento, Kael exige que você diga o que vai acontecer.',
    goal: 'Usar até 3 testes para entender o conversor e depois prever a saída para energias novas.',
    concept: 'Dependência entre grandezas, previsão e valor inicial fixo',
    prerequisites: 'Multiplicação; leitura de registro em tabela',
    relation: 'y = 2x + 4 (saída = 2 × energia + 4)',
    categories: ['relações entre grandezas', 'previsão', 'representação'],
    hints: [
      'Encaixe células diferentes em cada teste e compare as saídas no Registro.',
      'Observe quanto a saída cresce a cada célula a mais, e o que sai com 0 células.',
      'A saída cresce sempre o mesmo tanto por célula, a partir de um valor inicial. Use isso para chegar à energia do bilhete.',
    ],
    mount: mountPrediction,
  },
};
