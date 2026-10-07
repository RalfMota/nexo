/* NEXO — Rotas de Nexo, jogadas no próprio mapa: "Prever antes de escolher"
 *
 * Na frente da Estação há uma fileira de marcos de légua (0 a 26, de 2 em 2). Encostar
 * num marco mostra quanto a viagem até ali custaria por cada rota.
 * r4b Custo de Viagem: três caixas (4, 12 e 20 léguas) vão para a carroça da Rota A ou
 *   da Rota B; a corneta manda as caravanas e confere o gasto.
 * r4d Ponto de Mudança: o jogador finca a placa no marco em que a rota mais barata muda.
 *
 * Os eventos registrados para a pesquisa são os mesmos da versão em janela.
 */

import { addQuestObject, clearQuestLayer, setCarried, playAction, burst, showBubble } from '../world/quest-layer.js';
import { drawMilestone, drawWagon, drawParcel, drawHornPost, drawSignFlag } from '../art/mission-props.js';
import { TILE, tileFoot, drawTag, drawArrow } from './world-kit.js';
import { prefersCalm } from '../core/state.js';

const costA = (distance) => 5 + 3 * distance;
const costB = (distance) => 15 + 2 * distance;
const LEAGUES_PER_TILE = 2;
const FIRST_TILE = 2;
const MILESTONES = Array.from({ length: 14 }, (_, i) => ({ d: i * LEAGUES_PER_TILE, x: (FIRST_TILE + i) * TILE + 16, y: 8 * TILE + 26 }));
const ROADS = {
  A: { ...tileFoot(10, 10), color: '#d6493b', name: 'Rota A' },
  B: { ...tileFoot(12, 10), color: '#3f63d6', name: 'Rota B' },
};
const DELIVERIES = [4, 12, 20];
const PARCEL_HOMES = [tileFoot(5, 10), tileFoot(6, 10), tileFoot(7, 10)];
const HORN = tileFoot(14, 10);
const SIGN_HOME = tileFoot(9, 10);

/** Marcos de légua com a leitura das duas rotas (comum às duas missões). */
function addMilestones(api, { onRead, onUse, isRead }) {
  MILESTONES.forEach((stone) => {
    addQuestObject({
      id: `milestone-${stone.d}`,
      x: stone.x,
      y: stone.y + 2,
      reach: 18,
      label: `Marco de ${stone.d} léguas`,
      draw: (ctx) => drawMilestone(ctx, stone.x, stone.y, stone.d, isRead(stone.d)),
      onInteract: () => {
        if (onUse?.(stone)) return;
        showBubble(stone.x, stone.y - 18, `${stone.d} léguas: Rota A ${costA(stone.d)} moedas · Rota B ${costB(stone.d)} moedas`, 5);
        onRead(stone.d);
      },
    });
  });
}

/** Registro das leituras dos marcos (mesmo formato da versão em janela). */
function createReadings(api) {
  const rows = [];
  const read = new Set();
  return {
    rows,
    isRead: (d) => read.has(d),
    read(d) {
      read.add(d);
      rows.push([d, costA(d), costB(d)]);
      api.record(['Distância', 'Rota A', 'Rota B'], rows);
      api.log('interaction', { d, a: costA(d), b: costB(d) });
    },
  };
}

/* ======================================================================
 * r4b: Custo de Viagem
 * ==================================================================== */

function mountTravelCostWorld(api) {
  const readings = createReadings(api);
  const placed = {}; // distância → 'A' | 'B'
  let carrying = null; // distância da caixa nas mãos
  let result = null; // distância → 'ok' | 'bad'

  const parcelItem = {
    label: 'caixa de entrega',
    draw: (ctx) => drawParcel(ctx, 0, 10, `${carrying} lg`),
  };

  addMilestones(api, { onRead: readings.read, isRead: readings.isRead });

  DELIVERIES.forEach((d, i) => {
    const home = PARCEL_HOMES[i];
    addQuestObject({
      id: `parcel-${d}`,
      x: home.x,
      y: home.y,
      reach: 22,
      label: `Entrega de ${d} léguas`,
      enabled: () => carrying == null && !placed[d],
      draw: (ctx) => {
        if (carrying !== d && !placed[d]) drawParcel(ctx, home.x, home.y, `${d} lg`);
      },
      onInteract: () => {
        carrying = d;
        result = null;
        playAction('crouch');
        setCarried(parcelItem);
      },
    });
  });

  for (const [key, road] of Object.entries(ROADS)) {
    addQuestObject({
      id: `wagon-${key}`,
      x: road.x,
      y: road.y + 2,
      reach: 30,
      label: `Carroça da ${road.name}`,
      draw: (ctx, t) => {
        drawWagon(ctx, road.x, road.y, road.color, key);
        const loaded = DELIVERIES.filter((d) => placed[d] === key);
        loaded.forEach((d, i) => {
          const px = road.x - 8 + i * 9;
          drawTag(ctx, px, road.y - 40 - (i % 2) * 2, `${d}`, result ? { fill: result[d] === 'ok' ? '#c8f5c0' : '#ffd0c8' } : undefined);
        });
        drawTag(ctx, road.x, road.y - 52 - (loaded.length ? 6 : 0), road.name);
        if (carrying != null) drawArrow(ctx, road.x, road.y - 70, t);
      },
      onInteract: () => {
        if (carrying != null) {
          placed[carrying] = key;
          carrying = null;
          setCarried(null);
          playAction('crouch');
          burst(road.x, road.y - 20, 'dust', 6);
          return;
        }
        // Mãos vazias: tira de volta a última caixa desta carroça
        const loaded = DELIVERIES.filter((d) => placed[d] === key);
        if (!loaded.length) {
          api.say('Pegue uma caixa de entrega e traga até a carroça da rota que você escolheu.', 'warn');
          return;
        }
        const d = loaded.at(-1);
        delete placed[d];
        carrying = d;
        result = null;
        setCarried(parcelItem);
      },
    });
  }

  addQuestObject({
    id: 'horn',
    x: HORN.x,
    y: HORN.y,
    reach: 26,
    label: 'Corneta: mandar as caravanas',
    draw: (ctx) => drawHornPost(ctx, HORN.x, HORN.y),
    onInteract: () => {
      playAction('use');
      if (DELIVERIES.some((d) => !placed[d])) {
        api.say('Coloque cada caixa numa carroça antes de tocar a corneta.', 'warn');
        return;
      }
      const choices = DELIVERIES.map((d) => placed[d]);
      result = {};
      const wrong = [];
      DELIVERIES.forEach((d, i) => {
        const best = costA(d) <= costB(d) ? 'A' : 'B';
        result[d] = placed[d] === best ? 'ok' : 'bad';
        if (result[d] === 'bad') wrong.push(i + 1);
      });
      if (api.attempt(!wrong.length, { escolhas: choices })) {
        burst(ROADS.A.x + 32, ROADS.A.y - 24, 'success', 24);
        api.win('As três entregas fecharam com o menor gasto. A rota foi recalibrada.');
      } else {
        const list = wrong.length > 1 ? `${wrong.slice(0, -1).join(', ')} e ${wrong.at(-1)}` : wrong[0];
        api.fail(`${wrong.length > 1 ? 'Nas entregas' : 'Na entrega'} ${list}, a caravana gastou mais moedas do que gastaria pela outra rota. As caixas em vermelho podem trocar de carroça.`);
      }
    },
  });

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective('Encoste nos marcos para comparar as rotas. Leve cada caixa à carroça mais barata e toque a corneta.');
  api.record(['Distância', 'Rota A', 'Rota B'], readings.rows);
}

/* ======================================================================
 * r4d: Ponto de Mudança
 * ==================================================================== */

function mountTurningPointWorld(api) {
  const readings = createReadings(api);
  let carryingSign = false;
  let plantedAt = null;

  const signItem = { label: 'placa de mudança de rota', draw: (ctx) => drawSignFlag(ctx, 0, 12) };

  addMilestones(api, {
    onRead: readings.read,
    isRead: readings.isRead,
    onUse: (stone) => {
      if (!carryingSign) return false;
      plant(stone);
      return true;
    },
  });

  addQuestObject({
    id: 'turn-sign',
    x: SIGN_HOME.x,
    y: SIGN_HOME.y,
    reach: 24,
    label: 'Placa de mudança de rota',
    enabled: () => !carryingSign && plantedAt == null,
    draw: (ctx, t) => {
      if (plantedAt != null) {
        const stone = MILESTONES.find((item) => item.d === plantedAt);
        drawSignFlag(ctx, stone.x + 9, stone.y + 2);
      } else if (!carryingSign) {
        drawSignFlag(ctx, SIGN_HOME.x, SIGN_HOME.y);
      }
      if (carryingSign) MILESTONES.forEach((stone, i) => i % 2 === 0 && drawArrow(ctx, stone.x, stone.y - 26, t + i * 0.2));
    },
    onInteract: () => {
      carryingSign = true;
      playAction('crouch');
      setCarried(signItem);
    },
  });

  function plant(stone) {
    const d = stone.d;
    carryingSign = false;
    plantedAt = d;
    setCarried(null);
    playAction('dig');
    burst(stone.x + 9, stone.y, 'dust', 8);
    if (api.attempt(d === 10 || d === 12, { d })) {
      burst(stone.x, stone.y - 20, 'success', 24);
      api.win(d === 10
        ? 'No marco de 10 léguas as rotas custam igual; depois dele, a Rota B compensa. O mapa foi recalibrado.'
        : 'A partir deste marco a Rota B compensa (no de 10 léguas as duas custam igual). O mapa foi recalibrado.');
      return;
    }
    api.fail(d < 10 ? `No marco de ${d} léguas a Rota A ainda é a mais barata.` : `No marco de ${d} léguas a Rota B já era a mais barata antes desse ponto.`);
    setTimeout(() => {
      if (!api.isActive()) return;
      plantedAt = null;
    }, prefersCalm() ? 0 : 1400);
  }

  api.onCleanup(clearQuestLayer);
  api.setStage(0);
  api.setObjective('Compare as rotas nos marcos e finque a placa no marco em que a rota mais barata muda.');
  api.record(['Distância', 'Rota A', 'Rota B'], readings.rows);
}

export default {
  r4b: {
    title: 'Custo de Viagem',
    region: 'r4',
    npc: 'serah',
    mode: 'world',
    stages: ['Três entregas'],
    greeting: 'Três entregas hoje. Encoste nos marcos da estrada para comparar as rotas, ponha cada caixa numa carroça e toque a corneta.',
    context: 'As rotas foram recalibradas. A Rota A cobra uma taxa inicial baixa; a Rota B cobra mais para começar, mas fica mais barata a cada légua. Serah precisa fechar o dia com o menor gasto.',
    goal: 'Escolher a rota mais econômica para cada uma das três entregas (4, 12 e 20 léguas).',
    concept: 'Comparação de duas relações com valor inicial (retomada, em outro contexto, da dependência vista na Oficina)',
    prerequisites: 'Operações; leitura de registro; ideia de dependência (Oficina)',
    relation: 'Rota A: C = 5 + 3d; Rota B: C = 15 + 2d',
    categories: ['relações entre grandezas', 'previsão', 'função'],
    hints: [
      'Encoste em marcos de distâncias diferentes e compare as moedas das duas rotas no Registro.',
      'Uma rota começa mais cara, mas cresce mais devagar. Observe como a diferença entre elas muda com a distância.',
      'Para cada caixa, vá até o marco daquela distância e leve a caixa à carroça da rota mais barata. Com as mãos vazias, dá para tirar uma caixa da carroça.',
    ],
    mountWorld: mountTravelCostWorld,
  },
  r4d: {
    title: 'Ponto de Mudança',
    region: 'r4',
    npc: 'serah',
    mode: 'world',
    stages: ['Fincar a placa'],
    greeting: 'Em algum ponto da estrada, a rota mais barata troca de lado. Pegue a placa e finque no marco certo.',
    context: 'Serah percebeu que a rota mais vantajosa nem sempre é a mesma. Ela quer saber em que ponto a vantagem muda para planejar as caravanas.',
    goal: 'Encontrar a distância em que a escolha mais econômica muda e marcar esse ponto.',
    concept: 'Comparação de relações; ponto em que a vantagem se inverte',
    prerequisites: 'Custo de Viagem; leitura de registro',
    relation: '5 + 3d = 15 + 2d em d = 10',
    categories: ['função', 'previsão'],
    hints: [
      'Compare as rotas em marcos perto e longe da Estação. Quem leva vantagem muda?',
      'Procure dois marcos vizinhos em que a rota mais barata é diferente.',
      'Procure o marco em que as moedas das duas rotas ficam iguais, ou o primeiro em que a Rota B fica mais barata, e finque a placa ali.',
    ],
    mountWorld: mountTurningPointWorld,
  },
};
