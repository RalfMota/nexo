/* NEXO — História: o que cada personagem, placa e ruptura diz conforme o progresso */

import { CHARACTERS } from '../data/characters.js';
import { REGIONS, regionById, regionIndexOf } from '../data/regions.js';
import { MISSIONS } from '../missions/index.js';
import { isMissionDone, isRegionDone, isRegionOpen, isRegionOpenById, currentRegion, countDoneRegions } from '../game/progress.js';
import { startMission } from '../game/session.js';
import { showDialogue } from '../ui/dialogue.js';
import { runtime } from '../core/runtime.js';

/** Falas dos guardiões de região: primeira conversa, retorno e região concluída. */
const LINES = {
  taina: {
    intro: 'Você deve ser o Reconector de quem Lyra falou. Desde a Ruptura, a água-luz e as sementes do Vale não chegam a todos os canteiros. Pode me ajudar a dividir o que temos?',
    back: 'Ainda há trabalho no Vale. O que você quer resolver agora?',
    done: 'Os canteiros brotaram e a água chega a cada plantação. Se quiser, refaça uma tarefa do Vale.',
  },
  orin: {
    intro: 'Bem-vindo ao Mercado! Desde a Ruptura, ninguém sabe mais o que vale quanto: tem pacote que parece barato e não é, e minhas receitas desandam. Me dá uma mão?',
    back: 'O Mercado ainda está bagunçado. Por onde começamos?',
    done: 'As bancas voltaram a funcionar e as poções saem no ponto. Volte quando quiser refazer uma troca.',
  },
  kael: {
    intro: 'As máquinas dispararam números estranhos. Antes de consertar qualquer uma, precisamos entender o que ela faz. Qual você quer ver primeiro?',
    back: 'Ainda tem máquina fora do eixo. Qual vamos testar?',
    done: 'A ponte e o conversor responderam como esperado. A Oficina está trabalhando de novo.',
  },
  serah: {
    intro: 'As rotas foram recalibradas errado e as caravanas gastam moedas à toa. Me ajude a escolher bem.',
    back: 'Ainda faltam rotas para recalibrar. Qual você quer ver?',
    done: 'As caravanas voltaram a sair no horário e sem gastar à toa. Obrigada, Reconector.',
  },
  nyla: {
    intro: 'Você já viu máquinas, rotas e receitas funcionando. Aqui na Torre, guardamos as regras de tudo isso por escrito, para que qualquer pessoa consiga prever o que vai acontecer. Vamos registrar o que você observou?',
    back: 'Os registros da Torre esperam por você. Qual selo vamos trabalhar?',
    done: 'Os selos da Torre brilham de novo. As regras que você escreveu estão guardadas no arquivo.',
  },
};

/** Ponto de entrada: o jogador interagiu com algo no mundo. */
export function interact(target) {
  // Durante uma missão de mundo, o personagem da missão repete a orientação atual
  const session = runtime.session;
  if (target.kind === 'npc' && session?.inWorld && session.npc === target.id) return session.talk();
  switch (target.kind) {
    case 'quest':
      return target.object.onInteract();
    case 'npc':
      return target.id === 'lyra' ? talkToLyra() : talkToGuardian(target.id);
    case 'sign':
      return showDialogue({ title: 'Placa', text: target.sign.text });
    case 'barrier':
      return showDialogue({ title: 'Ruptura', text: barrierText(target.barrier.region) });
    case 'core':
      return touchCore();
    default:
      return undefined;
  }
}

function missionChoices(missionIds) {
  return [
    ...missionIds.map((id) => ({ label: MISSIONS[id].title, done: isMissionDone(id), onSelect: () => startMission(id) })),
    { label: 'Depois' },
  ];
}

/** Frase que leva o jogador à próxima região, quando ela é de outro personagem. */
function nextStepHint(exceptNpc) {
  const region = currentRegion();
  if (!region || region.npc === exceptNpc) return '';
  const npc = CHARACTERS[region.npc];
  if (region.id === 'f') return ` Lyra espera por você ao lado do Núcleo, ${region.direction}.`;
  return ` Dizem que ${npc.name} precisa de ajuda em ${region.name}, ${region.direction}.`;
}

function talkToGuardian(npcId) {
  const region = REGIONS.find((item) => item.npc === npcId);
  const lines = LINES[npcId];
  if (!isRegionOpenById(region.id)) {
    return showDialogue({ npcId, text: 'Ainda não é hora. Uma ruptura separa esta região do resto do Nexo.' });
  }
  if (isRegionDone(region)) {
    return showDialogue({ npcId, text: lines.done + nextStepHint(npcId), choices: missionChoices(region.missions) });
  }
  const started = region.missions.some(isMissionDone);
  return showDialogue({ npcId, text: started ? lines.back : lines.intro, choices: missionChoices(region.missions) });
}

function talkToLyra() {
  const final = regionById('f');
  if (!isMissionDone('p0')) {
    return showDialogue({
      npcId: 'lyra',
      text: 'Reconector! O Núcleo do Nexo, que alimentava cristais, máquinas e rotas, se rompeu. Deixe-me mostrar como as coisas funcionam por aqui.',
      choices: [{ label: 'Ouvir Lyra', onSelect: () => startMission('p0') }, { label: 'Depois' }],
    });
  }
  if (isRegionDone(final)) {
    return showDialogue({
      npcId: 'lyra',
      text: 'O Núcleo voltou a pulsar e as estradas do Nexo estão abertas. As missões continuam disponíveis para quem quiser refazê-las.',
      choices: [...missionChoices(['p0', 'f1'])],
    });
  }
  if (isRegionOpen(regionIndexOf('f'))) {
    return showDialogue({
      npcId: 'lyra',
      text: 'Todas as regiões voltaram a responder. O Núcleo está pronto para ser religado, mas ele não aceita tentativas às cegas: é preciso entender como ele responde.',
      choices: missionChoices(['f1']),
    });
  }
  const done = countDoneRegions();
  return showDialogue({
    npcId: 'lyra',
    text: `As rupturas ainda separam o Nexo. ${done} de ${REGIONS.length - 1} regiões já respondem ao Núcleo.${nextStepHint('lyra')}`,
  });
}

function touchCore() {
  if (isRegionOpen(regionIndexOf('f')) && !isRegionDone(regionById('f'))) {
    return showDialogue({
      title: 'Núcleo do Nexo',
      text: 'O cristal vibra quando você se aproxima. Ele está pronto para ser religado.',
      choices: missionChoices(['f1']),
    });
  }
  if (isRegionDone(regionById('f'))) {
    return showDialogue({ title: 'Núcleo do Nexo', text: 'O Núcleo pulsa num ritmo estável, e cada região recebe a energia de que precisa.' });
  }
  return showDialogue({
    title: 'Núcleo do Nexo',
    text: `O cristal pulsa fraco e rachaduras atravessam a superfície. Ele só poderá ser religado quando todas as regiões estiverem reconectadas (${countDoneRegions()} de ${REGIONS.length - 1}).`,
  });
}

function barrierText(regionId) {
  const index = regionIndexOf(regionId);
  const blocking = REGIONS.slice(0, index).find((region) => !isRegionDone(region));
  const target = REGIONS[index];
  const reason = !blocking ? '' : blocking.id === 'p'
    ? ' Ela se fecha quando você concluir o prólogo com Lyra.'
    : ` Ela se fecha quando a região ${blocking.name} estiver reconectada.`;
  return `Uma ruptura de energia bloqueia o caminho para ${target.name}.${reason}`;
}
