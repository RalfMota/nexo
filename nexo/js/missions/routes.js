/* NEXO — Rotas de Nexo: "Prever antes de escolher"
 * Comparação de duas relações com valor inicial; ponto em que a vantagem se inverte.
 */

import { createPlayfield } from './playfield.js';
import { artScout, artCrate, artFlagSign, artHorn } from './props-art.js';
import { paintSky } from './widgets.js';
import { roundRect, outlinedText, drawCoin } from '../art/shapes.js';
import { prefersCalm } from '../core/state.js';

const font = (size) => `700 ${size}px "Pixelify Sans", sans-serif`;

const costA = (distance) => 5 + 3 * distance;
const costB = (distance) => 15 + 2 * distance;
const MAX_DISTANCE = 30;
const START_X = 120;
const LEAGUE = 26; // pixels por légua
const ROADS = { A: { y: 150, color: '#e0523d', label: 'Rota A' }, B: { y: 300, color: '#3f63d6', label: 'Rota B' } };
const xOf = (distance) => START_X + distance * LEAGUE;
const distanceAt = (x) => Math.max(0, Math.min(MAX_DISTANCE, Math.round((x - START_X) / LEAGUE)));

/**
 * Mapa com as duas rotas e o batedor (marcador que se arrasta pela estrada).
 * Enquanto o batedor anda, cada rota mostra quantas moedas a viagem custaria até ali.
 */
function mountRouteMap(stage, api, { drawExtra } = {}) {
  const rows = [];
  let scoutD = 5;

  const field = createPlayfield(stage, {
    draw(ctx, t) {
      paintSky(ctx, 960, 540, '#bfe6c4', '#e8f5d9');
      ctx.fillStyle = '#d8b57c';
      ctx.fillRect(0, 420, 960, 120);
      for (const [key, road] of Object.entries(ROADS)) drawRoad(ctx, key, road);
      drawScoutReadings(ctx, scoutD);
      drawExtra?.(ctx, t);
    },
  }, api);

  const scout = field.addToken({
    x: xOf(scoutD) - 20, y: 80, w: 40, h: 290, mode: 'item', stay: true, className: 'act',
    label: 'Batedor: arraste pela estrada (ou use as setas) para ver quanto cada rota custaria',
    art: artScout,
    onDrop: () => false,
    onTap: () => {},
    constrain: (x) => ({ x: Math.max(START_X - 20, Math.min(xOf(MAX_DISTANCE) - 20, x)), y: 80 }),
    onMove: (x) => {
      scoutD = distanceAt(x + 20);
    },
    onRelease: () => {
      scout.moveTo(xOf(scoutD) - 20, 80, { animate: false });
      rows.push([scoutD, costA(scoutD), costB(scoutD)]);
      api.record(['Distância', 'Rota A', 'Rota B'], rows);
      api.log('interaction', { d: scoutD, a: costA(scoutD), b: costB(scoutD) });
    },
  });

  // Teclado: setas movem o batedor uma légua por vez
  scout.el.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    scoutD = Math.max(0, Math.min(MAX_DISTANCE, scoutD + step));
    scout.opts.onRelease();
  });

  api.record(['Distância', 'Rota A', 'Rota B'], rows);
  return field;
}

function drawRoad(ctx, key, road) {
  const y = road.y;
  ctx.fillStyle = '#c49c63';
  roundRect(ctx, START_X - 10, y - 18, xOf(MAX_DISTANCE) - START_X + 20, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#d8b57c';
  roundRect(ctx, START_X - 6, y - 14, xOf(MAX_DISTANCE) - START_X + 12, 28, 14);
  ctx.fill();
  for (let d = 0; d <= MAX_DISTANCE; d++) {
    ctx.fillStyle = '#7d5530';
    const big = d % 5 === 0;
    ctx.fillRect(xOf(d) - 1, y + 16, 2, big ? 12 : 6);
    if (big) outlinedText(ctx, String(d), xOf(d), y + 40, { font: font(13) });
  }
  ctx.fillStyle = road.color;
  roundRect(ctx, START_X - 112, y - 18, 96, 36, 10);
  ctx.fill();
  outlinedText(ctx, road.label, START_X - 64, y, { font: font(15) });
  outlinedText(ctx, key === 'A' ? 'taxa 5 · 3 por légua' : 'taxa 15 · 2 por légua', START_X + 120, y - 32, { font: '600 13px "Lexend", sans-serif', fill: '#2b1d14', stroke: '#e8f5d9' });
}

function drawScoutReadings(ctx, distance) {
  for (const [key, road] of Object.entries(ROADS)) {
    const cost = key === 'A' ? costA(distance) : costB(distance);
    const x = Math.min(xOf(distance) + 30, 860);
    ctx.fillStyle = 'rgba(30, 20, 10, .82)';
    roundRect(ctx, x, road.y - 64, 92, 34, 10);
    ctx.fill();
    drawCoin(ctx, x + 18, road.y - 47, 9);
    outlinedText(ctx, String(cost), x + 58, road.y - 47, { font: font(18), fill: '#ffe08a' });
  }
  outlinedText(ctx, `${distance} léguas`, Math.min(xOf(distance), 880), 396, { font: font(15) });
}

/* ---------- r4b: Custo de Viagem ---------- */

const DELIVERIES = [4, 12, 20];

function mountTravelCost(stage, api) {
  const placed = {}; // distância → 'A' | 'B'
  let result = null; // { [distance]: 'ok' | 'bad' }

  const field = mountRouteMap(stage, api, {
    drawExtra(ctx) {
      for (const d of DELIVERIES) {
        for (const road of Object.values(ROADS)) {
          ctx.fillStyle = '#6b4226';
          ctx.fillRect(xOf(d) - 1, road.y - 40, 3, 24);
          ctx.fillStyle = '#c2453b';
          ctx.beginPath();
          ctx.moveTo(xOf(d) + 2, road.y - 40);
          ctx.lineTo(xOf(d) + 18, road.y - 34);
          ctx.lineTo(xOf(d) + 2, road.y - 28);
          ctx.fill();
        }
        if (result && placed[d]) {
          const road = ROADS[placed[d]];
          const cost = placed[d] === 'A' ? costA(d) : costB(d);
          ctx.fillStyle = result[d] === 'ok' ? 'rgba(44, 138, 74, .92)' : 'rgba(180, 60, 30, .92)';
          roundRect(ctx, xOf(d) - 34, road.y + 52, 68, 28, 8);
          ctx.fill();
          outlinedText(ctx, `${cost}`, xOf(d), road.y + 66, { font: font(16) });
        }
      }
      outlinedText(ctx, 'entregas do dia', 380, 432, { font: font(15) });
    },
  });

  const roadZones = Object.entries(ROADS).map(([key, road]) => ({
    key,
    zone: field.addZone({ x: START_X - 10, y: road.y - 30, w: xOf(MAX_DISTANCE) - START_X + 20, h: 60, label: `${road.label}: enviar uma entrega por aqui`, accepts: (token) => token.data.crate }),
  }));

  DELIVERIES.forEach((d, i) => {
    const home = { x: 260 + i * 120, y: 448 };
    const crate = field.addToken({
      ...home, w: 76, h: 76, mode: 'item', className: 'act',
      label: `Entrega de ${d} léguas: leve até a Rota A ou a Rota B`,
      art: artCrate(d), data: { crate: true },
      onDrop: (zone) => {
        const road = roadZones.find((item) => item.zone === zone)?.key;
        if (!road) return false;
        placed[d] = road;
        result = null;
        crate.moveTo(xOf(d) - 26, ROADS[road].y - 26, { w: 52, h: 52 });
        return true;
      },
    });
  });

  field.addToken({
    x: 800, y: 440, w: 110, h: 80, mode: 'button', label: 'Tocar a corneta: mandar as caravanas', className: 'act', art: artHorn,
    onTap: () => {
      if (DELIVERIES.some((d) => !placed[d])) {
        api.say('Coloque cada caixa numa rota antes de tocar a corneta.', 'warn');
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
        api.win('As três entregas fecharam com o menor gasto. A rota foi recalibrada.');
      } else {
        const list = wrong.length > 1 ? `${wrong.slice(0, -1).join(', ')} e ${wrong.at(-1)}` : wrong[0];
        api.fail(`${wrong.length > 1 ? 'Nas entregas' : 'Na entrega'} ${list}, a caravana gastou mais moedas do que gastaria pela outra rota.`);
      }
    },
  });
}

/* ---------- r4d: Ponto de Mudança ---------- */

function mountTurningPoint(stage, api) {
  const field = mountRouteMap(stage, api, {
    drawExtra(ctx) {
      outlinedText(ctx, 'finque a placa onde a rota mais barata muda', 400, 470, { font: font(15) });
    },
  });

  const signZone = field.addZone({
    x: START_X - 10, y: ROADS.A.y - 30, w: xOf(MAX_DISTANCE) - START_X + 20, h: ROADS.B.y - ROADS.A.y + 60,
    label: 'Estradas: fincar a placa nesta distância', accepts: (token) => token.data.sign,
  });

  const sign = field.addToken({
    x: 700, y: 430, w: 70, h: 90, mode: 'item', className: 'act',
    label: 'Placa de mudança de rota: finque na estrada',
    art: artFlagSign, data: { sign: true },
    onDrop: (zone) => {
      if (zone !== signZone) return false;
      const d = distanceAt(sign.x + 35);
      sign.moveTo(xOf(d) - 35, ROADS.A.y + 20, { animate: !prefersCalm() });
      check(d);
      return true;
    },
  });

  function check(d) {
    if (api.attempt(d === 10 || d === 11, { d })) {
      api.win(d === 10
        ? 'Nesta distância as rotas custam igual; a partir da seguinte, a Rota B compensa. O mapa foi recalibrado.'
        : 'A partir daqui a Rota B compensa. O mapa foi recalibrado.');
    } else {
      api.fail(d < 10 ? `Em ${d} léguas a Rota A ainda é a mais barata.` : `Em ${d} léguas a Rota B já era a mais barata antes desse ponto.`);
    }
  }
}

export default {
  r4b: {
    title: 'Custo de Viagem',
    region: 'r4',
    npc: 'serah',
    greeting: 'Três entregas hoje. Arraste o batedor pela estrada para comparar, depois ponha cada caixa numa rota e toque a corneta.',
    context: 'As rotas foram recalibradas. A Rota A cobra uma taxa inicial baixa; a Rota B cobra mais para começar, mas fica mais barata a cada légua. Serah precisa fechar o dia com o menor gasto.',
    goal: 'Escolher a rota mais econômica para cada uma das três entregas (4, 12 e 20 léguas).',
    concept: 'Comparação de duas relações com valor inicial (retomada, em outro contexto, da dependência vista na Oficina)',
    prerequisites: 'Operações; leitura de registro; ideia de dependência (Oficina)',
    relation: 'Rota A: C = 5 + 3d; Rota B: C = 15 + 2d',
    categories: ['relações entre grandezas', 'previsão', 'função'],
    hints: [
      'Arraste o batedor até distâncias diferentes e compare as moedas das duas rotas.',
      'Uma rota começa mais cara, mas cresce mais devagar. Observe como a diferença entre elas muda com a distância.',
      'Para cada caixa, leve o batedor exatamente até aquela distância e escolha a rota de menor custo.',
    ],
    mount: mountTravelCost,
  },
  r4d: {
    title: 'Ponto de Mudança',
    region: 'r4',
    npc: 'serah',
    greeting: 'Em algum ponto da estrada, a rota mais barata troca de lado. Finque a placa exatamente ali.',
    context: 'Serah percebeu que a rota mais vantajosa nem sempre é a mesma. Ela quer saber em que ponto a vantagem muda para planejar as caravanas.',
    goal: 'Encontrar a distância em que a escolha mais econômica muda e marcar esse ponto.',
    concept: 'Comparação de relações; ponto em que a vantagem se inverte',
    prerequisites: 'Custo de Viagem; leitura de registro',
    relation: '5 + 3d = 15 + 2d em d = 10',
    categories: ['função', 'previsão'],
    hints: [
      'Compare as rotas com o batedor em distâncias curtas e longas. Quem leva vantagem muda?',
      'Procure duas distâncias vizinhas em que a rota mais barata é diferente.',
      'Aproxime o batedor do ponto em que as moedas das duas rotas ficam iguais ou se invertem, e finque a placa ali.',
    ],
    mount: mountTurningPoint,
  },
};

