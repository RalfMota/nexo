/* NEXO — Núcleo do Nexo, jogado no próprio mapa: "Reconstruir o sistema"
 *
 * f1 Reacender o Núcleo (energia = 4 × cristais + 6):
 *   1. Testar: o jogador leva cristais da pilha ao Núcleo e puxa a alavanca (2 testes).
 *   2. Energia 50: com o mesmo gesto, gera exatamente a energia que a vila pede.
 *   3. Leitura: três tabuletas com gráficos aparecem na praça; a certa é levada ao Núcleo.
 *
 * Os eventos registrados para a pesquisa são os mesmos da versão em janela.
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst } from '../world/quest-layer.js';
import { drawCrystalPile, drawCrystalHandful, drawEnergyMeter, drawPedestal, pedestalFace } from '../art/mission-props.js';
import { TILE, tileFoot, drawTag, drawArrow, addLever } from './world-kit.js';
import { CORE } from '../world/map.js';
import { prefersCalm } from '../core/state.js';

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

function mountCoreWorld(api) {
  const rows = [];
  let stage = 0; // 0 testar, 1 energia 50, 2 leitura, 3 concluído
  let inHand = 0;
  let inserted = 0;
  let testsUsed = 0;
  let energy = 0;
  let energyTarget = 0;
  let carryingReading = null;

  const record = () => api.record(['Cristais', 'Energia'], rows);

  const crystalItem = {
    label: 'cristais',
    draw: (ctx) => {
      drawCrystalHandful(ctx, 0, 6, inHand);
      drawTag(ctx, 0, -10, String(inHand));
    },
  };
  const readingItem = {
    label: 'tabuleta de leitura',
    draw: (ctx) => {
      ctx.fillStyle = '#857f75';
      ctx.fillRect(-11, -14, 22, 16);
      ctx.fillStyle = '#f1e6cb';
      ctx.fillRect(-10, -13, 20, 14);
      drawMiniGraph(ctx, -10, -13, 20, 14, READINGS[carryingReading].rule);
    },
  };
  const refreshHands = () => {
    if (carryingReading != null) setCarried(readingItem);
    else setCarried(inHand > 0 ? crystalItem : null);
  };

  addQuestObject({
    id: 'crystal-pile',
    ...PILE,
    reach: 28,
    label: 'Pilha de cristais',
    enabled: () => stage < 2,
    draw: (ctx, t) => drawCrystalPile(ctx, PILE.x, PILE.y, t),
    onInteract: () => {
      if (inHand + inserted >= MAX_CRYSTALS) {
        api.say(`O Núcleo aceita no máximo ${MAX_CRYSTALS} cristais.`, 'warn');
        return;
      }
      inHand++;
      playAction('crouch');
      refreshHands();
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
      if (stage < 2) drawTag(ctx, CORE_POINT.x, CORE_POINT.y - 120, `no Núcleo: ${crystalsLabel(inserted)}`, { fill: '#1d1a38', ink: '#7ff0e0' });
      if (stage === 0) drawTag(ctx, LEVER.x, LEVER.y - 34, `testes: ${TESTS - testsUsed}`);
      if (carryingReading != null || inHand > 0) drawArrow(ctx, CORE_POINT.x, CORE_POINT.y - 132, t);
    },
    onInteract: () => {
      if (carryingReading != null) {
        chooseReading(carryingReading);
        return;
      }
      if (inHand > 0) {
        inserted += inHand;
        inHand = 0;
        playAction('use');
        burst(CORE_POINT.x, CORE_POINT.y - 60, 'sparkle', 8);
        refreshHands();
        return;
      }
      if (inserted > 0 && stage < 2) {
        inserted--;
        inHand++;
        refreshHands();
        return;
      }
      api.say(stage < 2 ? 'Pegue cristais na pilha e traga até o Núcleo.' : 'Traga a tabuleta com a leitura que descreve o Núcleo.', 'warn');
    },
  });

  addLever({ id: 'core-lever', ...LEVER, label: 'Acionar o Núcleo', color: '#5fe3d0', visible: () => stage < 2, onPull: activate });

  READINGS.forEach((reading, index) => {
    addQuestObject({
      id: `reading-${index}`,
      x: reading.at.x,
      y: reading.at.y + 2,
      reach: 26,
      label: `${reading.label}: pegar a tabuleta`,
      enabled: () => stage === 2 && carryingReading == null,
      draw: (ctx) => {
        if (stage !== 2) return;
        drawPedestal(ctx, reading.at.x, reading.at.y);
        if (carryingReading !== index) {
          const face = pedestalFace(reading.at.x, reading.at.y);
          drawMiniGraph(ctx, face.left, face.top, face.w, face.h, reading.rule);
        }
        drawTag(ctx, reading.at.x, reading.at.y - 44, reading.label);
      },
      onInteract: () => {
        carryingReading = index;
        playAction('crouch');
        refreshHands();
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
        api.setObjective(`Gere exatamente ${TARGET} de energia: a marca amarela no medidor.`);
        api.say(`Os testes acabaram. A vila precisa de exatamente ${TARGET} de energia: veja a marca amarela no medidor.`);
      } else {
        api.say(`Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia. Resta 1 teste.`);
      }
      return;
    }

    if (api.attempt(e === TARGET, { cristais: c, energia: e })) {
      api.say(`${TARGET} de energia, exatamente o que a vila precisa! Falta uma coisa: leve até o Núcleo a tabuleta com a leitura que descreve como ele funciona.`, 'ok');
      setTimeout(() => {
        if (!api.isActive()) return;
        stage = 2;
        inserted = 0;
        api.setStage(2);
        api.setObjective('Leve até o Núcleo a tabuleta cujo gráfico passa pelos valores do seu Registro.');
      }, prefersCalm() ? 0 : 1600);
    } else {
      inserted = 0;
      api.fail(e < TARGET
        ? `Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia: faltou energia para a vila. Os cristais se apagaram.`
        : `Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia: passou do que a rede aguenta, e o excesso se dissipou.`);
    }
  }

  function chooseReading(index) {
    const reading = READINGS[index];
    carryingReading = null;
    refreshHands();
    if (api.attempt(index === CORRECT_READING, { leitura: index + 1 })) {
      stage = 3;
      burst(CORE_POINT.x, CORE_POINT.y - 70, 'success', 30);
      api.win('O Núcleo voltou a pulsar num ritmo estável, e a energia chegou a todas as regiões do Nexo.');
      return;
    }
    const [c, e] = rows.find(([x, y]) => reading.rule(x) !== y) ?? [0, energyOf(0)];
    api.fail(`Na ${reading.label}, ${crystalsLabel(c)} ${c === 1 ? 'daria' : 'dariam'} ${reading.rule(c)} de energia, mas o Registro mostra ${e}. A tabuleta voltou ao pedestal.`);
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
    stages: ['Testar', `Energia ${TARGET}`, 'Leitura'],
    greeting: 'Leve cristais da pilha até o Núcleo e puxe a alavanca. Ele só aceita dois testes antes de pedir uma resposta.',
    context: 'Com todas as regiões reconectadas, o Núcleo do Nexo pode voltar a funcionar. Ele transforma cristais em energia, mas ninguém sabe como ele responde depois da Ruptura.',
    goal: `Testar o Núcleo, gerar exatamente ${TARGET} de energia para a vila e escolher a leitura que descreve o Núcleo.`,
    concept: 'Função afim: testar, encontrar a entrada para uma saída pedida e ler o gráfico',
    prerequisites: 'Todas as regiões anteriores',
    relation: 'E = 4c + 6 (energia = 4 × cristais + 6)',
    categories: ['função', 'previsão', 'representação'],
    hints: [
      'Use os dois testes com quantidades diferentes de cristais e compare: quanto a energia muda a cada cristal?',
      'Com 0 cristais o Núcleo já tem alguma energia. Descubra quanto, a partir dos testes.',
      `Para chegar a ${TARGET}, tire a energia fixa e veja quantos cristais completam o restante. Na leitura certa, os pontos do gráfico passam pelos valores do seu Registro.`,
    ],
    mountWorld: mountCoreWorld,
  },
};
