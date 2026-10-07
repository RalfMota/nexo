/* NEXO — Mapa da vila: terreno, construções, objetos, rupturas e zonas
 *
 * Legenda do terreno:
 *   T árvore (bloqueia)   . grama   = estrada de terra   p calçamento da praça
 *   ~ água (bloqueia)     # canteiro de terra
 */

import { CHARACTERS } from '../data/characters.js';
import { hash } from '../art/shapes.js';

export const TILE = 32;
export const MAP_W = 60;
export const MAP_H = 44;

export const ground = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('T'));

function fill(char, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) ground[y][x] = char;
  }
}

/** Zonas abertas na floresta. Retângulos inclusivos: [x0, y0, x1, y1]. */
export const ZONES = [
  { region: 'p', name: 'Praça do Nexo', rect: [20, 15, 39, 28] },
  { region: 'r1', name: 'Vale dos Recursos', rect: [2, 13, 14, 32] },
  { region: 'r2', name: 'Mercado das Trocas', rect: [21, 32, 39, 41] },
  { region: 'r3', name: 'Oficina dos Construtores', rect: [21, 2, 38, 11] },
  { region: 'r4', name: 'Estação das Rotas', rect: [2, 2, 15, 11] },
  { region: 'r5', name: 'Torre dos Padrões', rect: [44, 8, 57, 36] },
];

for (const zone of ZONES) fill('.', ...zone.rect);

// Corredores que ligam as zonas
fill('.', 14, 21, 20, 23); // praça ↔ vale
fill('.', 29, 28, 31, 32); // praça ↔ mercado
fill('.', 29, 11, 31, 15); // praça ↔ oficina
fill('.', 39, 21, 44, 23); // praça ↔ torre
fill('.', 15, 6, 22, 8); //   oficina ↔ estação das rotas

// Estradas
fill('=', 4, 22, 56, 22);
fill('=', 30, 7, 30, 38);
fill('=', 4, 7, 30, 7);
fill('=', 50, 18, 50, 22);
fill('=', 5, 17, 5, 21); // porta da casa do vale
fill('=', 6, 6, 6, 6); //   porta da estação

// Praça calçada
fill('p', 24, 18, 35, 26);

// Vale: lago e canteiros
fill('~', 9, 14, 13, 17);
fill('#', 3, 25, 7, 29);
fill('#', 9, 25, 13, 29);

/** Construções (bloqueiam a passagem em toda a área). */
export const BUILDINGS = [
  { kind: 'farmhouse', x: 3, y: 14, w: 4, h: 3, label: 'CELEIRO' },
  { kind: 'house', x: 21, y: 15, w: 4, h: 3, wall: '#f0dcb4', roof: '#4f7fc4' },
  { kind: 'house', x: 35, y: 15, w: 4, h: 3, wall: '#e7cfa6', roof: '#c45a4f' },
  { kind: 'house', x: 21, y: 26, w: 3, h: 3, wall: '#efe1c6', roof: '#5d9a52' },
  { kind: 'house', x: 36, y: 26, w: 3, h: 3, wall: '#e9d6b0', roof: '#8b5fc0' },
  { kind: 'workshop', x: 26, y: 3, w: 8, h: 4, label: 'OFICINA' },
  { kind: 'station', x: 4, y: 3, w: 5, h: 3, label: 'ESTAÇÃO' },
  { kind: 'tower', x: 48, y: 10, w: 5, h: 8, label: 'TORRE' },
  { kind: 'lab', x: 33, y: 39, w: 3, h: 2, label: 'POÇÕES' }, // laboratório do Orin, no Mercado
];

/** Núcleo do Nexo: estrutura central da praça. */
export const CORE = { x: 28, y: 20, w: 4, h: 3 };

/**
 * Objetos do cenário. "region" nos postes indica de qual região eles dependem para acender.
 * Tipos: lamp, crystal, gear, crate, barrel, stall, fountain, fence, board, sign.
 */
export const PROPS = [
  // Praça
  { type: 'lamp', x: 24, y: 18, region: 'p' },
  { type: 'lamp', x: 35, y: 18, region: 'p' },
  { type: 'lamp', x: 24, y: 26, region: 'f' },
  { type: 'lamp', x: 35, y: 26, region: 'f' },
  { type: 'barrel', x: 25, y: 16 },
  { type: 'crate', x: 34, y: 16 },
  // Vale
  { type: 'lamp', x: 8, y: 23, region: 'r1' },
  { type: 'lamp', x: 13, y: 20, region: 'r1' },
  { type: 'crystal', x: 3, y: 31 },
  { type: 'crystal', x: 13, y: 31 },
  { type: 'barrel', x: 7, y: 15 },
  // Mercado
  { type: 'stall', x: 23, y: 34, w: 2, h: 2, color: '#e0523d' },
  { type: 'stall', x: 26, y: 34, w: 2, h: 2, color: '#3f8fd6' },
  { type: 'stall', x: 33, y: 34, w: 2, h: 2, color: '#f2b84b' },
  { type: 'stall', x: 36, y: 34, w: 2, h: 2, color: '#5aa84a' },
  { type: 'fountain', x: 29, y: 39, w: 3, h: 2 },
  { type: 'lamp', x: 24, y: 37, region: 'r2' },
  { type: 'lamp', x: 37, y: 37, region: 'r2' },
  { type: 'barrel', x: 22, y: 39 },
  { type: 'crate', x: 38, y: 39 },
  // Oficina
  { type: 'gear', x: 23, y: 4 },
  { type: 'gear', x: 36, y: 4 },
  { type: 'crate', x: 24, y: 9 },
  { type: 'crate', x: 25, y: 9 },
  { type: 'barrel', x: 37, y: 9 },
  { type: 'lamp', x: 27, y: 9, region: 'r3' },
  { type: 'lamp', x: 35, y: 9, region: 'r3' },
  // Estação das Rotas
  { type: 'board', x: 11, y: 3, w: 2, h: 1 },
  { type: 'lamp', x: 3, y: 9, region: 'r4' },
  { type: 'lamp', x: 13, y: 9, region: 'r4' },
  { type: 'crate', x: 9, y: 4 },
  // Torre
  { type: 'crystal', x: 46, y: 13 },
  { type: 'crystal', x: 55, y: 15 },
  { type: 'crystal', x: 46, y: 29 },
  { type: 'crystal', x: 55, y: 31 },
  { type: 'lamp', x: 47, y: 20, region: 'r5' },
  { type: 'lamp', x: 53, y: 24, region: 'r5' },
];

/** Placas: interagir mostra o texto. */
export const SIGNS = [
  { x: 22, y: 20, text: '← Vale dos Recursos. Terras de colheita e água-luz.' },
  { x: 32, y: 16, text: '↑ Oficina dos Construtores. Máquinas, engrenagens e Kael.' },
  { x: 32, y: 28, text: '↓ Mercado das Trocas. Bancas, poções e o mercador Orin.' },
  { x: 38, y: 20, text: '→ Torre dos Padrões. Quem sobe aprende a escrever o que viu.' },
  { x: 23, y: 6, text: '← Estação das Rotas. Mapas, caravanas e a cartógrafa Serah.' },
];
for (const sign of SIGNS) PROPS.push({ type: 'sign', x: sign.x, y: sign.y });

/** Rupturas: bloqueiam o caminho até a região abrir. */
export const BARRIERS = [
  { region: 'r1', tiles: [[17, 21], [17, 22], [17, 23]] },
  { region: 'r2', tiles: [[29, 30], [30, 30], [31, 30]] },
  { region: 'r3', tiles: [[29, 13], [30, 13], [31, 13]] },
  { region: 'r4', tiles: [[18, 6], [18, 7], [18, 8]] },
  { region: 'r5', tiles: [[41, 21], [41, 22], [41, 23]] },
];

export const SPAWN = { x: 30 * TILE + 16, y: 24 * TILE + 28 };

/* ---------- Enfeites do cenário ----------
 * Grandes (arbustos, pedras, tocos, troncos) só na borda das clareiras, longe de estradas,
 * entradas e objetos de missão: bloqueiam a passagem sem fechar caminhos.
 * Pequenos (flores, cogumelos, pedrinhas, touceiras) espalhados na grama: não bloqueiam.
 */
export const DECOR = [];

/** Pontos de missão e de passagem que precisam ficar livres (raio de 2 blocos). */
const RESERVED = [
  [11, 21], [8, 24], [5, 17], [11, 18], [8, 18], [8, 31], [5, 25], [11, 25],
  [24, 36], [27, 36], [34, 36], [35, 37], [38, 40], [23, 38], [30, 41], [26, 38], [34, 41],
];
const occupied = new Set();
const mark = (x, y, w = 1, h = 1) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) occupied.add(`${i},${j}`);
};
BUILDINGS.forEach((b) => mark(b.x - 1, b.y - 1, b.w + 2, b.h + 2));
PROPS.forEach((prop) => mark(prop.x - 1, prop.y - 1, (prop.w ?? 1) + 2, (prop.h ?? 1) + 2));
Object.values(CHARACTERS).forEach((npc) => mark(npc.tile.x - 1, npc.tile.y - 1, 3, 3));
mark(CORE.x - 1, CORE.y - 1, CORE.w + 2, CORE.h + 2);
mark(Math.floor(SPAWN.x / TILE) - 1, Math.floor(SPAWN.y / TILE) - 1, 3, 3);

const insideZone = (zone, x, y) => x >= zone.rect[0] && x <= zone.rect[2] && y >= zone.rect[1] && y <= zone.rect[3];
const nearReserved = (x, y) => RESERVED.some(([rx, ry]) => Math.abs(rx - x) <= 2 && Math.abs(ry - y) <= 2);
/** Perto de estrada, calçada ou de uma entrada (grama fora da zona = corredor). */
function nearPassage(zone, x, y) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const char = ground[y + dy]?.[x + dx];
      if (char === '=' || char === 'p') return true;
      if (char === '.' && !ZONES.some((z) => insideZone(z, x + dx, y + dy))) return true;
    }
  }
  return false;
}

const BIG = ['bush', 'bush', 'berryBush', 'rock', 'rock', 'stump', 'log'];
const SMALL = ['flowers', 'flowers', 'flowers', 'mushrooms', 'pebbles', 'tallGrass', 'tallGrass'];

for (const zone of ZONES) {
  const [x0, y0, x1, y1] = zone.rect;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (ground[y][x] !== '.' || occupied.has(`${x},${y}`) || nearReserved(x, y)) continue;
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      const r = hash(x, y, 700);
      if (edge && r < 0.38 && !nearPassage(zone, x, y)) {
        DECOR.push({ type: BIG[Math.floor(hash(x, y, 701) * BIG.length)], x, y, solid: true });
        mark(x, y);
      } else if (!edge && r < 0.1) {
        DECOR.push({ type: SMALL[Math.floor(hash(x, y, 702) * SMALL.length)], x, y, solid: false });
      }
    }
  }
}

// Enfeites de cada região
[
  { type: 'hay', x: 8, y: 14, solid: true },
  { type: 'hay', x: 2, y: 19, solid: true },
  { type: 'pumpkin', x: 13, y: 24, solid: false },
  { type: 'pumpkin', x: 4, y: 30, solid: false },
  { type: 'pumpkin', x: 10, y: 31, solid: false },
  { type: 'bench', x: 25, y: 18, solid: true },
  { type: 'bench', x: 34, y: 18, solid: true },
  { type: 'flowers', x: 22, y: 22, solid: false },
  { type: 'flowers', x: 37, y: 22, solid: false },
].forEach((item) => DECOR.push(item));

/* Mapa de bloqueios estáticos (terreno, construções, objetos, personagens) */
const solid = Array.from({ length: MAP_H }, (_, y) => ground[y].map((char) => char === 'T' || char === '~'));

function block(x, y, w = 1, h = 1) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) solid[j][i] = true;
  }
}

for (const b of BUILDINGS) block(b.x, b.y, b.w, b.h);
for (const prop of PROPS) block(prop.x, prop.y, prop.w ?? 1, prop.h ?? 1);
for (const npc of Object.values(CHARACTERS)) block(npc.tile.x, npc.tile.y);
block(CORE.x, CORE.y, CORE.w, CORE.h);
for (const item of DECOR) if (item.solid) block(item.x, item.y);

export function isStaticSolid(tileX, tileY) {
  if (tileX < 0 || tileY < 0 || tileX >= MAP_W || tileY >= MAP_H) return true;
  return solid[tileY][tileX];
}

/** Ponto dos pés de um personagem parado num bloco. */
export const tileFoot = (tile) => ({ x: tile.x * TILE + 16, y: tile.y * TILE + 28 });

export function zoneAt(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  const zone = ZONES.find(({ rect: [x0, y0, x1, y1] }) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1);
  return zone ? zone.name : 'Trilhas do Nexo';
}
