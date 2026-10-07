/* NEXO — Arquivo da Torre (Torre dos Padrões), jogado no próprio mapa
 *
 * r5b Arquivo da Torre: três pedestais com registros de relações já vividas; para cada um,
 *   o jogador gira os mostradores com a regra e grava no selo.
 * (A Grade de Energia, r5a, acontece por dentro da Torre: ver tower-floors.js.)
 *
 * Os eventos registrados para a pesquisa são os mesmos da versão em janela.
 */

import { addQuestObject, clearQuestLayer, burst } from '../world/quest-layer.js';
import { drawPedestal, pedestalFace } from '../art/mission-props.js';
import { TILE, tileFoot, drawTag, drawArrow, addLever, addDial } from './world-kit.js';

const DIAL_A = { x: 46 * TILE + 16, y: 22 * TILE + 26 };
const DIAL_B = { x: 54 * TILE + 16, y: 22 * TILE + 26 };
const RULE_LEVER = tileFoot(56, 22);

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
