/* NEXO — Jardim de Nyla (Torre dos Padrões), desafio extra jogado no próprio mapa
 *
 * r5c Jardim de Nyla (equação do 2º grau), liberado depois da Torre:
 *   o jogador gira o mostrador com o lado do jardim e manda assentar as lajotas de musgo.
 *   Sobram lajotas se o jardim ficou pequeno, e faltam se ficou grande.
 *   1. Quadrado com 36 lajotas:              x × x = 36
 *   2. Retângulo com um lado 2 maior, 48:    x × (x + 2) = 48
 *   3. Quadrado com uma fonte 2 × 2 no meio: x × x − 4 = 45
 */

import { addQuestObject, clearQuestLayer, burst } from '../world/quest-layer.js';
import { drawMossTile, drawTilePile, drawMiniFountain } from '../art/garden-props.js';
import { TILE, tileFoot, drawTag, addLever, addDial } from './world-kit.js';
import { prefersCalm } from '../core/state.js';

const TILE_SIZE = 10;
const GARDEN = { left: 47 * TILE, top: 28 * TILE + 20 };
const PILE = tileFoot(45, 32);
const SIDE_DIAL = { x: 53 * TILE + 16, y: 30 * TILE + 26 };
const LAY_LEVER = tileFoot(55, 29);

const STAGES = [
  {
    label: 'Quadrado',
    tiles: 36,
    size: (x) => [x, x],
    holes: () => 0,
    equation: 'x × x = 36',
    objective: 'Assente as 36 lajotas num jardim quadrado, sem sobrar nem faltar. Gire o mostrador com o lado e puxe a alavanca.',
    intro: 'Tenho 36 lajotas de musgo e quero um jardim quadrado, sem sobrar nenhuma. Quantas lajotas vai ter cada lado?',
  },
  {
    label: 'Lado + 2',
    tiles: 48,
    size: (x) => [x + 2, x],
    holes: () => 0,
    equation: 'x × (x + 2) = 48',
    objective: 'Agora o jardim é retangular: o comprido tem 2 lajotas a mais que o curto. São 48 lajotas.',
    intro: 'Um jardim retangular, com o lado comprido 2 lajotas maior que o curto, usando 48 lajotas. Qual é o lado curto?',
  },
  {
    label: 'Com fonte',
    tiles: 45,
    size: (x) => [x, x],
    holes: (x) => (x >= 4 ? 4 : 0),
    equation: 'x × x − 4 = 45',
    objective: 'Jardim quadrado com uma fonte 2 × 2 no meio (sem lajota). São 45 lajotas.',
    intro: 'Por último: um jardim quadrado com uma fontezinha de 2 por 2 no meio, onde não vai lajota. Tenho 45 lajotas. Qual é o lado?',
  },
];

function mountQuadraticWorld(api) {
  let stageIndex = 0;
  let laid = null; // { x, used, missing, left }
  const rows = [];

  const stage = () => STAGES[stageIndex];
  const record = () => api.record(['Etapa', 'Lado x', 'Lajotas usadas', 'Lajotas que havia'], rows);

  const dial = addDial({ id: 'garden-side', ...SIDE_DIAL, label: 'Lado do jardim (x)', min: 1, max: 9, value: 1, caption: 'lado x' });

  addQuestObject({
    id: 'tile-pile',
    ...PILE,
    reach: 0,
    label: 'Lajotas de musgo',
    enabled: () => false,
    draw: (ctx) => {
      drawTilePile(ctx, PILE.x, PILE.y);
      const left = laid ? laid.left : stage().tiles;
      drawTag(ctx, PILE.x, PILE.y - 24, `${left} lajotas`);
    },
    onInteract: () => {},
  });

  addQuestObject({
    id: 'nyla-garden',
    x: 0,
    y: 0,
    reach: 0,
    label: 'Jardim de Nyla',
    enabled: () => false,
    draw: (ctx, t) => {
      const s = stage();
      drawTag(ctx, SIDE_DIAL.x, SIDE_DIAL.y - 48, s.equation, { fill: '#1d1a38', ink: '#cfe0ff' });
      const x = laid ? laid.x : dial.get();
      const [w, h] = s.size(x);
      const fountain = s.holes(x) > 0 ? { col: Math.floor((w - 2) / 2), row: Math.floor((h - 2) / 2) } : null;
      // Marcas do terreno do tamanho escolhido (antes de assentar) ou as lajotas assentadas
      let placed = 0;
      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const px = GARDEN.left + col * TILE_SIZE;
          const py = GARDEN.top + row * TILE_SIZE;
          const inFountain = fountain && col >= fountain.col && col < fountain.col + 2 && row >= fountain.row && row < fountain.row + 2;
          if (inFountain) continue;
          if (!laid) {
            ctx.fillStyle = 'rgba(90, 60, 30, .3)';
            ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            continue;
          }
          drawMossTile(ctx, px, py, TILE_SIZE, placed >= laid.used);
          placed++;
        }
      }
      if (fountain) drawMiniFountain(ctx, GARDEN.left + fountain.col * TILE_SIZE, GARDEN.top + fountain.row * TILE_SIZE, TILE_SIZE * 2, t);
      drawTag(ctx, GARDEN.left + (w * TILE_SIZE) / 2, GARDEN.top - 10, `${w} × ${h}`);
    },
    onInteract: () => {},
  });

  addLever({ id: 'lay-lever', ...LAY_LEVER, label: 'Assentar as lajotas', color: '#5f9e4a', onPull: lay });

  function lay() {
    const s = stage();
    const x = dial.get();
    const [w, h] = s.size(x);
    const needed = w * h - s.holes(x);
    const used = Math.min(needed, s.tiles);
    laid = { x, used, missing: Math.max(0, needed - s.tiles), left: Math.max(0, s.tiles - needed) };
    rows.push([stageIndex + 1, x, { value: needed, tone: needed === s.tiles ? 'good' : 'bad' }, s.tiles]);
    record();
    const ok = api.attempt(needed === s.tiles, { etapa: stageIndex + 1, x, lajotas: needed, total: s.tiles });
    if (ok) {
      burst(GARDEN.left + (w * TILE_SIZE) / 2, GARDEN.top + (h * TILE_SIZE) / 2, 'success', 24);
      if (stageIndex === STAGES.length - 1) {
        api.win('Os três jardins ficaram perfeitos. Nyla guardou as equações no arquivo da Torre, ao lado das outras regras.');
        return;
      }
      api.say(`Exato: x = ${x}, e nenhuma lajota sobrou. ${STAGES[stageIndex + 1].intro}`, 'ok');
      setTimeout(() => {
        if (!api.isActive()) return;
        stageIndex++;
        laid = null;
        dial.set(1);
        api.setStage(stageIndex);
        api.setObjective(stage().objective);
      }, prefersCalm() ? 0 : 2400);
      return;
    }
    api.fail(needed < s.tiles
      ? `Com x = ${x}, o jardim usa ${needed} lajotas e sobram ${s.tiles - needed} no monte. O jardim pode ser maior.`
      : `Com x = ${x}, o jardim pediria ${needed} lajotas, mas só há ${s.tiles}. Faltaram ${needed - s.tiles} (as apagadas).`);
    setTimeout(() => {
      if (api.isActive()) laid = null;
    }, prefersCalm() ? 0 : 2600);
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective(stage().objective);
  record();
}

export default {
  r5c: {
    title: 'Jardim de Nyla',
    region: 'r5',
    npc: 'nyla',
    mode: 'world',
    extra: true,
    unlockAfter: 'r5',
    stages: STAGES.map((item) => item.label),
    greeting: STAGES[0].intro,
    context: 'Nyla quer jardins de lajotas de musgo ao redor da Torre. Ela sabe quantas lajotas tem, mas não o tamanho do jardim: o lado é o número desconhecido.',
    goal: 'Encontrar o lado de jardins quadrados e retangulares a partir da quantidade de lajotas (equações do 2º grau).',
    concept: 'Equação do 2º grau como problema de área; solução positiva como medida de comprimento',
    prerequisites: 'Área de retângulos (Cercas do Vale); linguagem algébrica (Torre)',
    relation: 'x² = 36 → x = 6; x(x + 2) = 48 → x = 6; x² − 4 = 45 → x = 7',
    categories: ['linguagem algébrica', 'geometria'],
    hints: [
      'Gire o mostrador com o lado e puxe a alavanca: as lajotas que sobram ou faltam mostram se o jardim ficou pequeno ou grande.',
      'Um quadrado de lado x usa x × x lajotas. Que número vezes ele mesmo dá a quantidade de lajotas?',
      'Nas etapas 2 e 3, escreva a área: x × (x + 2) ou x × x menos a fonte. Teste valores de x até a área bater com as lajotas. Um lado nunca é negativo.',
    ],
    mountWorld: mountQuadraticWorld,
  },
};
