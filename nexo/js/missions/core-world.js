/* NEXO — Núcleo do Nexo, jogado no próprio mapa: "Reconstruir o sistema"
 *
 * f1 Reacender o Núcleo (energia = 4 × cristais + 6):
 *   1. Testar: o jogador leva cristais da pilha ao Núcleo e puxa a alavanca (2 testes). Cada
 *      teste acende um ponto no painel de luz ao lado do Núcleo.
 *   2. Leitura: três tabuletas com gráficos aparecem na praça. Levada ao painel, cada uma
 *      projeta a sua reta sobre os pontos do aluno: a certa é a que passa por eles.
 *   3. Energia 50: o painel mostra uma linha amarela na energia 50; o aluno usa o gráfico
 *      para descobrir quantos cristais pôr e gera exatamente essa energia.
 * Antes, a leitura era a última etapa e só pedia escolher 1 de 3 tabuletas; agora o gráfico
 * é construído com os dados do próprio aluno e vira ferramenta para a etapa seguinte.
 *
 * Os eventos registrados para a pesquisa são os mesmos da versão em janela.
 */

import { addQuestObject, clearQuestLayer, playAction, burst } from '../world/quest-layer.js';
import { createHands } from './kit/hands.js';
import { drawCrystalPile, drawCrystalHandful, drawEnergyMeter, drawPedestal, pedestalFace } from '../art/mission-props.js';
import { TILE, tileFoot, drawTag, drawArrow, addLever } from './world-kit.js';
import { CORE } from '../world/map.js';

const energyOf = (crystals) => 4 * crystals + 6;
const crystalsLabel = (count) => `${count} ${count === 1 ? 'cristal' : 'cristais'}`;
const TESTS = 2;
const TARGET = 50;
const MAX_CRYSTALS = 15;
const METER_MAX = 70;
const PILE = tileFoot(25, 23);
const CORE_POINT = { x: (CORE.x + CORE.w / 2) * TILE, y: (CORE.y + CORE.h) * TILE + 6 };
const LEVER = tileFoot(33, 22);
const METER = { x: 34 * TILE + 20, y: 22 * TILE + 28 };
const BOARD = tileFoot(22, 23); // painel de luz, à esquerda do Núcleo
const GRAPH = { w: 104, h: 66, maxC: 12 };

/** Leituras da última etapa (apenas uma corresponde ao Núcleo). */
const READINGS = [
  { label: 'Leitura 1', rule: (c) => 6 * c + 4, at: tileFoot(26, 26) },
  { label: 'Leitura 2', rule: energyOf, at: tileFoot(29, 26) },
  { label: 'Leitura 3', rule: (c) => 4 * c, at: tileFoot(32, 26) },
];
const CORRECT_READING = 1;

/** Gráfico minúsculo (cristais 0 a 10 → energia) no rosto de uma tabuleta. */
function drawMiniGraph(ctx, left, top, w, h, rule) {
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(left + 2, top + h - 3, w - 4, 1);
  ctx.fillRect(left + 2, top + 1, 1, h - 3);
  for (let c = 0; c <= 10; c += 2) {
    const px = left + 3 + (c / 10) * (w - 6);
    const py = top + h - 3 - Math.min(1, rule(c) / METER_MAX) * (h - 4);
    ctx.fillStyle = '#c2453b';
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
}

/**
 * Painel de luz com o gráfico do Núcleo: os pontos medidos pelo aluno, a reta da tabuleta
 * encaixada (por um instante, ou para sempre quando é a certa) e a linha da energia pedida.
 */
function drawLightBoard(ctx, { points, rule, ruleOk, target, t }) {
  const left = Math.round(BOARD.x - GRAPH.w / 2 - 14);
  const top = Math.round(BOARD.y - GRAPH.h - 40);
  const width = GRAPH.w + 26;
  const height = GRAPH.h + 28;
  ctx.fillStyle = '#2b2b48';
  ctx.fillRect(left + 12, top + height, 4, BOARD.y - top - height);
  ctx.fillRect(left + width - 16, top + height, 4, BOARD.y - top - height);
  ctx.fillStyle = '#14122a';
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  ctx.fillStyle = '#5a5470';
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = '#8a87a6';
  ctx.fillRect(left, top, width, 2);
  ctx.fillStyle = '#0c0b1e';
  ctx.fillRect(left + 4, top + 4, width - 8, height - 8);
  const gx = left + 16;
  const gy = top + 7;
  const px = (c) => gx + (c / GRAPH.maxC) * GRAPH.w;
  const py = (e) => gy + GRAPH.h - (Math.min(e, METER_MAX) / METER_MAX) * GRAPH.h;
  // Grade
  ctx.fillStyle = 'rgba(127, 230, 255, .1)';
  for (let c = 1; c <= GRAPH.maxC; c++) ctx.fillRect(Math.round(px(c)), gy, 1, GRAPH.h);
  for (let e = 10; e <= METER_MAX; e += 10) ctx.fillRect(gx, Math.round(py(e)), GRAPH.w, 1);
  ctx.fillStyle = '#cfe0ff';
  ctx.fillRect(gx, gy, 1, GRAPH.h + 1);
  ctx.fillRect(gx, gy + GRAPH.h, GRAPH.w, 1);
  ctx.font = '600 6px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#9fb4d8';
  for (const c of [0, 4, 8, 12]) ctx.fillText(String(c), Math.round(px(c)), gy + GRAPH.h + 2);
  ctx.fillText('cristais', Math.round(px(GRAPH.maxC) - 10), gy + GRAPH.h + 8);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const e of [0, 30, 60]) ctx.fillText(String(e), gx - 2, Math.round(py(e)));
  ctx.save();
  ctx.translate(left + 5, gy + GRAPH.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('energia', 0, 0);
  ctx.restore();
  // Linha da energia pedida
  if (target != null) {
    ctx.fillStyle = '#ffcf4a';
    for (let x = gx; x < gx + GRAPH.w; x += 4) ctx.fillRect(x, Math.round(py(target)), 2, 1);
    ctx.textAlign = 'left';
    ctx.fillText(String(target), gx + GRAPH.w + 2, Math.round(py(target)));
  }
  // Reta da tabuleta encaixada
  if (rule) {
    ctx.strokeStyle = ruleOk ? '#8cff9e' : '#ff8a7a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= GRAPH.maxC; c += 0.5) (c ? ctx.lineTo : ctx.moveTo).call(ctx, px(c) + 0.5, py(rule(c)) + 0.5);
    ctx.stroke();
  }
  // Pontos medidos pelo aluno (piscam de leve)
  const glow = 0.75 + Math.sin(t * 4) * 0.25;
  for (const [c, e] of points) {
    ctx.fillStyle = `rgba(127, 230, 255, ${glow})`;
    ctx.fillRect(Math.round(px(c)) - 2, Math.round(py(e)) - 2, 5, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px(c)) - 1, Math.round(py(e)) - 1, 3, 3);
  }
  drawTag(ctx, BOARD.x, top - 6, 'painel de luz do Núcleo', { fill: '#1d1a38', ink: '#cfe0ff' });
}

function mountCoreWorld(api) {
  const rows = [];
  let stage = 0; // 0 testar, 1 leitura, 2 energia 50, 3 concluído
  let inserted = 0;
  let testsUsed = 0;
  let energy = 0;
  let energyTarget = 0;
  let clock = 0;
  let projected = null; // { index, until }: tabuleta errada projetada por um instante
  let chosenRule = null; // a reta certa, que fica no painel

  const record = () => api.record(['Cristais', 'Energia'], rows);

  // Mãos: cristais (um por vez, até o limite do Núcleo) ou uma tabuleta de leitura
  const hands = createHands({
    say: api.say,
    kinds: {
      cristal: {
        name: 'cristais',
        draw: (ctx, held) => {
          drawCrystalHandful(ctx, 0, 6, held.count);
          drawTag(ctx, 0, -10, String(held.count));
        },
      },
      tabuleta: {
        name: 'uma tabuleta',
        label: 'tabuleta de leitura',
        draw: (ctx, held) => {
          ctx.fillStyle = '#857f75';
          ctx.fillRect(-11, -14, 22, 16);
          ctx.fillStyle = '#f1e6cb';
          ctx.fillRect(-10, -13, 20, 14);
          drawMiniGraph(ctx, -10, -13, 20, 14, READINGS[held.items[0]].rule);
        },
      },
    },
    messages: { busy: () => 'Suas mãos já estão ocupadas. Use o que está carregando antes de pegar outra coisa.' },
  });
  const inHand = () => (hands.holds('cristal') ? hands.count : 0);
  const carrying = () => (hands.holds('tabuleta') ? hands.items[0] : null);

  addQuestObject({
    id: 'crystal-pile',
    ...PILE,
    reach: 28,
    label: 'Pilha de cristais',
    enabled: () => stage === 0 || stage === 2,
    draw: (ctx, t) => drawCrystalPile(ctx, PILE.x, PILE.y, t),
    onInteract: () => {
      if (inHand() + inserted >= MAX_CRYSTALS) {
        api.say(`O Núcleo aceita no máximo ${MAX_CRYSTALS} cristais.`, 'warn');
        return;
      }
      if (hands.take('cristal')) playAction('crouch');
    },
  });

  addQuestObject({
    id: 'core-socket',
    ...CORE_POINT,
    reach: 40,
    label: 'Núcleo do Nexo',
    draw: (ctx, t) => {
      energy += (energyTarget - energy) * Math.min(1, (1 / 60) * 2.2);
      drawEnergyMeter(ctx, METER.x, METER.y, energy, METER_MAX, stage >= 1 ? TARGET : null);
      drawTag(ctx, METER.x, METER.y - 82, `energia: ${Math.round(energy)}`, { fill: '#1d1a38', ink: '#7ff0e0' });
      if (stage !== 1 && stage < 3) drawTag(ctx, CORE_POINT.x, CORE_POINT.y - 120, `no Núcleo: ${crystalsLabel(inserted)}`, { fill: '#1d1a38', ink: '#7ff0e0' });
      if (stage === 0) drawTag(ctx, LEVER.x, LEVER.y - 34, `testes: ${TESTS - testsUsed}`);
      if (inHand() > 0) drawArrow(ctx, CORE_POINT.x, CORE_POINT.y - 132, t);
    },
    onInteract: () => {
      if (carrying() != null) {
        api.say('As tabuletas se encaixam no painel de luz, à esquerda do Núcleo.', 'warn');
        return;
      }
      if (inHand() > 0) {
        inserted += hands.dropAll().length;
        playAction('use');
        burst(CORE_POINT.x, CORE_POINT.y - 60, 'sparkle', 8);
        return;
      }
      if (inserted > 0 && stage !== 1 && hands.take('cristal')) {
        inserted--;
        return;
      }
      api.say(stage === 1 ? 'Leve uma tabuleta ao painel de luz, à esquerda do Núcleo.' : 'Pegue cristais na pilha e traga até o Núcleo.', 'warn');
    },
  });

  addLever({ id: 'core-lever', ...LEVER, label: 'Acionar o Núcleo', color: '#5fe3d0', visible: () => stage === 0 || stage === 2, onPull: activate });

  addQuestObject({
    id: 'light-board',
    x: BOARD.x,
    y: BOARD.y,
    reach: 34,
    label: 'Painel de luz do Núcleo',
    draw: (ctx, t) => {
      clock = t;
      const showing = projected && t < projected.until ? READINGS[projected.index].rule : null;
      drawLightBoard(ctx, {
        points: rows,
        rule: chosenRule ?? showing,
        ruleOk: Boolean(chosenRule),
        target: stage >= 2 ? TARGET : null,
        t,
      });
      if (carrying() != null) drawArrow(ctx, BOARD.x, BOARD.y - GRAPH.h - 62, t);
    },
    onInteract: () => {
      if (carrying() != null) {
        projectReading(carrying());
        return;
      }
      api.say(stage === 0
        ? 'Cada teste do Núcleo acende um ponto aqui: cristais na horizontal, energia na vertical.'
        : stage === 1 ? 'Traga uma tabuleta: ela projeta o gráfico dela sobre os seus pontos.'
          : `A linha amarela é a energia ${TARGET}. Siga-a até a reta do Núcleo e desça até os cristais.`);
    },
  });

  READINGS.forEach((reading, index) => {
    addQuestObject({
      id: `reading-${index}`,
      x: reading.at.x,
      y: reading.at.y + 2,
      reach: 26,
      label: `${reading.label}: pegar a tabuleta`,
      enabled: () => stage === 1 && carrying() == null,
      draw: (ctx) => {
        if (stage !== 1) return;
        drawPedestal(ctx, reading.at.x, reading.at.y);
        if (carrying() !== index) {
          const face = pedestalFace(reading.at.x, reading.at.y);
          drawMiniGraph(ctx, face.left, face.top, face.w, face.h, reading.rule);
        }
        drawTag(ctx, reading.at.x, reading.at.y - 44, reading.label);
      },
      onInteract: () => {
        hands.set('tabuleta', [index]);
        playAction('crouch');
      },
    });
  });

  function activate() {
    const c = inserted;
    const e = energyOf(c);
    energy = 0;
    energyTarget = e;
    rows.push([c, e]);
    record();
    burst(CORE_POINT.x, CORE_POINT.y - 70, 'sparkle', 12);

    if (stage === 0) {
      testsUsed++;
      api.log('interaction', { teste: c, energia: e });
      inserted = 0;
      if (testsUsed >= TESTS) {
        stage = 1;
        api.setStage(1);
        api.setObjective('Leve ao painel de luz a tabuleta cujo gráfico passa pelos pontos dos seus testes.');
        api.say('Os testes acenderam dois pontos no painel de luz. Três tabuletas apareceram na praça: leve cada uma ao painel e veja se o gráfico dela passa pelos seus pontos.');
      } else {
        api.say(`Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia. Resta 1 teste.`);
      }
      return;
    }

    if (api.attempt(e === TARGET, { cristais: c, energia: e })) {
      stage = 3;
      burst(CORE_POINT.x, CORE_POINT.y - 70, 'success', 30);
      api.win(`${TARGET} de energia, lida no gráfico e conferida no Núcleo! Ele voltou a pulsar num ritmo estável, e a energia chegou a todas as regiões do Nexo.`);
    } else {
      inserted = 0;
      api.fail(e < TARGET
        ? `Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia: faltou energia para a vila. Os cristais se apagaram.`
        : `Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia: passou do que a rede aguenta, e o excesso se dissipou.`);
    }
  }

  /** Encaixa a tabuleta no painel: a reta dela aparece sobre os pontos medidos. */
  function projectReading(index) {
    const reading = READINGS[index];
    hands.dropAll();
    playAction('use');
    if (api.attempt(index === CORRECT_READING, { leitura: index + 1 })) {
      chosenRule = reading.rule;
      stage = 2;
      inserted = 0;
      burst(BOARD.x, BOARD.y - 60, 'success', 18);
      api.setStage(2);
      api.setObjective(`Use o gráfico do painel: quantos cristais levam a energia até a linha amarela (${TARGET})? Leve os cristais ao Núcleo e acione.`);
      api.say(`A reta da ${reading.label} passa pelos seus pontos: esse é o gráfico do Núcleo! A vila precisa de exatamente ${TARGET} de energia, a linha amarela no painel. Leia no gráfico quantos cristais dão ${TARGET}.`, 'ok');
      return;
    }
    projected = { index, until: clock + 3 };
    const [c, e] = rows.find(([x, y]) => reading.rule(x) !== y) ?? [0, energyOf(0)];
    api.fail(`A reta da ${reading.label} não passa pelos seus pontos: com ${crystalsLabel(c)}, ela daria ${reading.rule(c)} de energia, mas o seu teste deu ${e}. A tabuleta voltou ao pedestal.`);
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective('Leve cristais da pilha até o Núcleo e puxe a alavanca. São 2 testes.');
  record();
}

export default {
  f1: {
    title: 'Reacender o Núcleo',
    region: 'f',
    npc: 'lyra',
    mode: 'world',
    stages: ['Testar', 'Leitura', `Energia ${TARGET}`],
    greeting: 'Leve cristais da pilha até o Núcleo e puxe a alavanca. Ele só aceita dois testes, e cada um acende um ponto no painel de luz.',
    context: 'Com todas as regiões reconectadas, o Núcleo do Nexo pode voltar a funcionar. Ele transforma cristais em energia, mas ninguém sabe como ele responde depois da Ruptura.',
    goal: `Testar o Núcleo, achar o gráfico que passa pelos pontos medidos e usá-lo para gerar exatamente ${TARGET} de energia.`,
    concept: 'Função afim: testar, reconhecer o gráfico pelos pontos medidos e usá-lo para achar a entrada de uma saída pedida',
    prerequisites: 'Todas as regiões anteriores',
    relation: 'E = 4c + 6 (energia = 4 × cristais + 6)',
    categories: ['função', 'previsão', 'representação'],
    hints: [
      'Use os dois testes com quantidades diferentes de cristais: cada teste acende um ponto no painel de luz.',
      'A tabuleta certa é a que tem a reta passando pelos dois pontos acesos. Compare também com o Registro: com 0 cristais o Núcleo já tem alguma energia.',
      `No painel, siga a linha amarela (${TARGET}) até a reta e desça até os cristais. Ou pela conta: tire a energia fixa e veja quantos cristais completam o resto.`,
    ],
    mountWorld: mountCoreWorld,
  },
};
