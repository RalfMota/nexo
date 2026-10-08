/* NEXO — Regiões do Nexo, na ordem em que se abrem */

export const REGIONS = [
  {
    id: 'p',
    name: 'Prólogo — A Ruptura',
    place: 'Praça do Nexo',
    motto: 'Aprender a usar o jogo',
    missions: ['p0'],
    npc: 'lyra',
    accent: '#7c4fe0',
    direction: 'na praça, ao lado do Núcleo',
  },
  {
    id: 'r1',
    warmup: true, // na trilha rápida (8º e 9º anos), região de aquecimento opcional
    name: 'Vale dos Recursos',
    place: 'Vale dos Recursos',
    motto: 'Fazer o suficiente chegar a todos',
    missions: ['r1a', 'r1b'],
    extras: ['r1c', 'r1d'],
    npc: 'taina',
    accent: '#4f9a3f',
    direction: 'a oeste da praça',
  },
  {
    id: 'r2',
    warmup: true, // na trilha rápida (8º e 9º anos), região de aquecimento opcional
    name: 'Mercado das Trocas',
    place: 'Mercado das Trocas',
    motto: 'Nem toda quantidade vale o mesmo',
    missions: ['r2a', 'r2b'],
    npc: 'orin',
    accent: '#cf4f33',
    direction: 'ao sul da praça',
  },
  {
    id: 'r3',
    name: 'Oficina dos Construtores',
    place: 'Oficina dos Construtores',
    motto: 'Quando uma coisa muda, outra também muda',
    missions: ['r3a', 'r3d'],
    npc: 'kael',
    accent: '#d9781f',
    direction: 'ao norte da praça',
  },
  {
    id: 'r4',
    name: 'Rotas de Nexo',
    place: 'Estação das Rotas',
    motto: 'Prever antes de escolher',
    missions: ['r4b', 'r4d'],
    npc: 'serah',
    accent: '#14998b',
    direction: 'a oeste da Oficina',
  },
  {
    id: 'r5',
    name: 'Torre dos Padrões',
    place: 'Torre dos Padrões',
    motto: 'Representar aquilo que você descobriu',
    missions: ['r5a', 'r5b'],
    extras: ['r5c'],
    npc: 'nyla',
    accent: '#3f63d6',
    direction: 'a leste da praça',
  },
  {
    id: 'f',
    name: 'Núcleo do Nexo',
    place: 'Praça do Nexo',
    motto: 'Reconstruir o sistema',
    missions: ['f1'],
    npc: 'lyra',
    accent: '#c98a12',
    direction: 'no centro da praça',
  },
];

export const regionById = (id) => REGIONS.find((region) => region.id === id);
export const regionIndexOf = (id) => REGIONS.findIndex((region) => region.id === id);
