/* NEXO — Prólogo: A Ruptura (familiarização, sem conteúdo matemático), jogado no próprio mapa
 *
 * Ensina os gestos do jogo na praça, ao lado da Lyra:
 *   1. andar até os dois artefatos que brotam no chão e pegá-los com E (vão para a bolsa);
 *   2. ativar o Compasso (tecla Q ou o botão na barra de baixo) e examinar o cristal rachado;
 *   3. voltar a falar com a Lyra (e saber que dá para pedir dica a qualquer momento).
 *
 * Eventos de pesquisa como na versão em janela: interaction { item: 'inventario' } e
 * interaction { alvo: 'cristal', compasso }.
 */

import { addQuestObject, clearQuestLayer, burst, playAction } from '../world/quest-layer.js';
import { drawArtifact, drawUnstableCrystal } from '../art/prologue-art.js';
import { tileFoot, drawTag, drawArrow } from './world-kit.js';
import { CHARACTERS } from '../data/characters.js';
import { state, saveState } from '../core/state.js';
import { refreshHud } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';

const ARTIFACTS = [
  { kind: 'compass', name: 'Compasso de Nexo', at: tileFoot(25, 24) },
  { kind: 'calculator', name: 'Calculador Arcano', at: tileFoot(27, 25) },
];
const CRYSTAL = tileFoot(34, 23);
const LYRA = tileFoot(CHARACTERS.lyra.tile.x, CHARACTERS.lyra.tile.y);

const compassOn = () => document.body.classList.contains('compass');

function mountPrologueWorld(api) {
  let step = 0;
  let healed = false;
  const picked = new Set(ARTIFACTS.filter((item) => state.inv.includes(item.name)).map((item) => item.kind));

  ARTIFACTS.forEach((item) => {
    addQuestObject({
      id: `artefato-${item.kind}`,
      x: item.at.x,
      y: item.at.y,
      reach: 30,
      label: `Pegar ${item.name}`,
      visible: () => !picked.has(item.kind),
      enabled: () => !picked.has(item.kind),
      draw: (ctx, t) => {
        drawArtifact(ctx, item.kind, item.at.x, item.at.y, t);
        drawTag(ctx, item.at.x, item.at.y - 30, item.name);
        if (step === 0) drawArrow(ctx, item.at.x, item.at.y - 44, t);
      },
      onInteract: () => pick(item),
    });
  });

  addQuestObject({
    id: 'cristal-instavel',
    x: CRYSTAL.x,
    y: CRYSTAL.y,
    reach: 34,
    label: 'Cristal instável',
    visible: () => step >= 1,
    draw: (ctx, t) => {
      drawUnstableCrystal(ctx, CRYSTAL.x, CRYSTAL.y, t, healed);
      if (step === 1) {
        drawTag(ctx, CRYSTAL.x, CRYSTAL.y - 62, compassOn() ? 'aperte E no cristal' : 'ative o Compasso: tecla Q', compassOn() ? { fill: '#c8f5c0' } : undefined);
        drawArrow(ctx, CRYSTAL.x, CRYSTAL.y - 76, t);
      }
    },
    onInteract: examineCrystal,
  });

  // Seta sobre a Lyra na última etapa
  addQuestObject({
    id: 'seta-lyra',
    x: 0,
    y: 0,
    reach: 0,
    label: 'Lyra',
    enabled: () => false,
    draw: (ctx, t) => {
      if (step !== 2) return;
      drawTag(ctx, LYRA.x, LYRA.y - 62, 'fale com a Lyra (E)');
      drawArrow(ctx, LYRA.x, LYRA.y - 76, t);
    },
    onInteract: () => {},
  });

  function pick(item) {
    if (picked.has(item.kind)) return;
    picked.add(item.kind);
    playAction('crouch');
    burst(item.at.x, item.at.y - 10, 'sparkle', 12);
    if (!state.inv.includes(item.name)) state.inv.push(item.name);
    saveState();
    refreshHud();
    if (picked.size < ARTIFACTS.length) {
      api.say(`${item.name} foi para a sua bolsa. Falta pegar o outro artefato.`, 'ok');
      return;
    }
    api.log('interaction', { item: 'inventario' });
    showToast('Artefatos recebidos:', 'Compasso de Nexo e Calculador Arcano.');
    goTo(1);
  }

  function examineCrystal() {
    if (step !== 1) {
      if (healed) api.say('O cristal pulsa calmo agora. Volte a falar com a Lyra.', 'ok');
      return;
    }
    api.log('interaction', { alvo: 'cristal', compasso: compassOn() });
    if (!compassOn()) {
      api.say('O cristal treme, mas você não consegue ver de onde vem a energia. Ative o Compasso (tecla Q ou o botão "Compasso" na barra de baixo) e tente de novo.', 'warn');
      return;
    }
    healed = true;
    playAction('use');
    burst(CRYSTAL.x, CRYSTAL.y - 26, 'success', 22);
    goTo(2);
  }

  function goTo(next) {
    step = next;
    api.setStage(step);
    if (step === 0) {
      api.setObjective('Ande até os dois artefatos brilhando no chão da praça e aperte E (ou toque) em cada um para guardar na bolsa.');
      api.say('Leve estes artefatos: estão no chão, perto de mim. Ande até cada um e aperte E para guardar na bolsa.');
    } else if (step === 1) {
      api.setObjective('Ative o Compasso (tecla Q ou o botão na barra de baixo) e aperte E no cristal rachado ao lado do Núcleo.');
      api.say('Agora ative o Compasso: ele mostra o que pode ser tocado. Depois examine o cristal rachado, à direita do Núcleo.');
    } else {
      api.setObjective('Volte e fale com a Lyra (aperte E perto dela).');
      api.say('O cristal respondeu a você! Quando precisar, use o botão "Pedir dica". Venha falar comigo para seguir viagem.', 'ok');
    }
  }

  api.onTalk(() => {
    if (step < 2) {
      api.say(step === 0 ? 'Primeiro pegue os dois artefatos que brilham no chão.' : 'Ative o Compasso (Q) e examine o cristal rachado ao lado do Núcleo.');
      return;
    }
    api.attempt(true, {});
    api.win('Prólogo concluído. A ruptura a oeste se fechou: procure Tainá no Vale dos Recursos.');
  });

  api.onCleanup(clearQuestLayer);
  goTo(picked.size === ARTIFACTS.length ? 1 : 0);
}

export default {
  p0: {
    title: 'A Ruptura',
    region: 'p',
    npc: 'lyra',
    mode: 'world',
    stages: ['Artefatos', 'Compasso e cristal', 'Falar com a Lyra'],
    greeting: 'O Núcleo do Nexo se rompeu, e tudo na vila saiu do equilíbrio. Vou mostrar como as coisas funcionam por aqui.',
    context: 'Uma falha de energia atingiu o Nexo e rompeu os caminhos entre as regiões.',
    goal: 'Aprender a se mover, pegar objetos, usar o Compasso, pedir dica e conversar.',
    concept: 'Familiarização com a interface (sem conteúdo matemático)',
    prerequisites: '—',
    relation: '—',
    categories: [],
    hints: [
      'Use as setas ou W A S D para andar. Chegue perto de um artefato brilhando e aperte E (ou toque nele).',
      'O Compasso liga e desliga com a tecla Q ou com o botão "Compasso" na barra de baixo.',
      'O cristal rachado fica à direita do Núcleo, no meio da praça. Com o Compasso ligado, chegue perto dele e aperte E.',
    ],
    mountWorld: mountPrologueWorld,
  },
};
