/* NEXO — Plantas dos interiores: tamanho, paredes, piso, janelas e móveis de cada prédio
 *
 * Coordenadas em pixels do cômodo, com (x, y) na base de cada móvel. A Torre também tem um
 * "registro" para a missão dos andares (ver setBuildingHandler): enquanto a missão estiver
 * ativa, é ela que diz como é cada andar e o que existe nele.
 */

import { WALL_H } from '../art/interior-art.js';

const NAMES = {
  house: 'Casa',
  farmhouse: 'Celeiro',
  workshop: 'Oficina dos Construtores',
  station: 'Estação das Rotas',
  tower: 'Torre dos Padrões',
  lab: 'Laboratório de Poções do Orin',
};

export const buildingName = (building) => NAMES[building.kind] ?? 'Prédio';

const handlers = new Map();

/** Uma missão assume o interior de um tipo de prédio (ex.: a Torre durante a Grade de Energia). */
export function setBuildingHandler(kind, handler) {
  if (handler) handlers.set(kind, handler);
  else handlers.delete(kind);
}

export const buildingHandler = (kind) => handlers.get(kind) ?? null;

const along = (y) => WALL_H + y; // y medido a partir do pé da parede

/** Planta padrão de cada tipo de prédio. */
export function defaultRoom(building) {
  const accent = building.roof ?? '#8b5fc0';
  switch (building.kind) {
    case 'farmhouse':
      return {
        key: 'celeiro',
        name: NAMES.farmhouse,
        cols: 12, rows: 9,
        wall: '#a8473a', wallStyle: 'plank', floor: 'straw', accent: '#c2453b',
        windows: [52],
        wallArt: [{ type: 'tools', x: 230 }],
        furniture: [
          { type: 'hay', x: 64, y: along(64) }, { type: 'hay', x: 100, y: along(54) }, { type: 'hay', x: 320, y: along(40) },
          { type: 'crate', x: 296, y: along(160) }, { type: 'crate', x: 326, y: along(150) }, { type: 'barrel', x: 40, y: along(170) },
        ],
      };
    case 'workshop':
      return {
        key: 'oficina',
        name: NAMES.workshop,
        cols: 14, rows: 9,
        wall: '#a8634a', wallStyle: 'brick', floor: 'stone', accent: '#d9781f',
        windows: [50, 380],
        wallArt: [{ type: 'tools', x: 160 }, { type: 'shelf', x: 280 }],
        furniture: [
          { type: 'workbench', x: 130, y: along(56) }, { type: 'workbench', x: 316, y: along(56) },
          { type: 'crate', x: 40, y: along(166) }, { type: 'crate', x: 70, y: along(172) }, { type: 'barrel', x: 410, y: along(160) },
          { type: 'lampPost', x: 224, y: along(140) },
        ],
      };
    case 'station':
      return {
        key: 'estacao',
        name: NAMES.station,
        cols: 12, rows: 9,
        wall: '#ece0c4', wallStyle: 'paper', floor: 'checker', accent: '#2a9d8f',
        windows: [36, 330],
        wallArt: [{ type: 'map', x: 150 }, { type: 'clock', x: 258 }],
        furniture: [
          { type: 'counter', x: 192, y: along(66) },
          { type: 'chair', x: 80, y: along(150) }, { type: 'chair', x: 104, y: along(150) },
          { type: 'crate', x: 312, y: along(160) }, { type: 'crate', x: 340, y: along(150) }, { type: 'plant', x: 30, y: along(178) },
        ],
      };
    case 'tower':
      return towerHall();
    case 'lab':
      return potionLab();
    default:
      return {
        key: `casa-${building.x}-${building.y}`,
        name: NAMES.house,
        cols: 11, rows: 9,
        wall: building.wall ?? '#f0dcb4', wallStyle: 'paper', floor: 'wood', accent,
        windows: [40, 276],
        wallArt: [{ type: 'frame', x: 128 }, { type: 'clock', x: 230 }],
        rug: { x: 112, y: along(56), w: 112, h: 72, color: accent },
        furniture: [
          { type: 'bed', variant: accent, x: 300, y: along(74) },
          { type: 'bookshelf', x: 52, y: along(12) },
          { type: 'fireplace', x: 178, y: along(12) },
          { type: 'table', x: 168, y: along(110) },
          { type: 'chair', x: 136, y: along(114) }, { type: 'chair', x: 200, y: along(114) },
          { type: 'plant', x: 26, y: along(176) },
        ],
      };
  }
}

/** Laboratório de poções do Orin: armários de ingredientes, caldeirão no meio e a receita na parede. */
export function potionLab() {
  return {
    key: 'laboratorio',
    name: NAMES.lab,
    cols: 12, rows: 9,
    wall: '#7a5a8e', wallStyle: 'plank', floor: 'wood', accent: '#8b5fc0',
    windows: [330],
    wallArt: [{ type: 'recipe', x: 150 }, { type: 'potions', x: 244 }],
    rug: { x: 152, y: along(64), w: 80, h: 64, color: '#8b5fc0' },
    furniture: [
      { type: 'cabinet', variant: 'leaf-closed', x: 46, y: along(12) },
      { type: 'cabinet', variant: 'dew-closed', x: 96, y: along(12) },
      { type: 'cauldron', variant: '#2b3550', x: 192, y: along(104) },
      { type: 'worktable', x: 316, y: along(84) },
      { type: 'plant', x: 26, y: along(176) }, { type: 'barrel', x: 360, y: along(170) },
    ],
  };
}

/** Saguão da Torre (sem missão): pedra, estandartes e a escada fechada. */
export function towerHall() {
  return {
    key: 'torre-saguao',
    name: NAMES.tower,
    cols: 13, rows: 10,
    wall: '#8e93a8', wallStyle: 'stone', floor: 'stone', accent: '#5a3fc4',
    wallArt: [{ type: 'slit', x: 40 }, { type: 'banner', x: 120 }, { type: 'banner', x: 276 }, { type: 'slit', x: 366 }],
    rug: { x: 178, y: along(20), w: 60, h: 190, color: '#5a3fc4' },
    furniture: [
      { type: 'bookshelf', x: 64, y: along(12) }, { type: 'bookshelf', x: 352, y: along(12) },
      { type: 'lampPost', x: 120, y: along(150) }, { type: 'lampPost', x: 296, y: along(150) },
    ],
  };
}
