/* NEXO — Personagens: aparência, função e posição na vila (em blocos do mapa) */

export const CHARACTERS = {
  lyra: {
    name: 'Lyra',
    role: 'Guardiã do Nexo',
    tile: { x: 26, y: 21 },
    facing: 'right',
    look: { skin: '#f1c9a5', hair: '#d6c4ff', hairStyle: 'long', shirt: '#7b4fd6', pants: '#3d2a6b', accessory: 'circlet' },
  },
  taina: {
    name: 'Tainá',
    role: 'Guardiã do Vale',
    tile: { x: 9, y: 20 },
    facing: 'down',
    look: { skin: '#a86b45', hair: '#2e1c12', hairStyle: 'braid', shirt: '#4f9a4a', pants: '#5a4632', accessory: 'hat' },
  },
  orin: {
    name: 'Orin',
    role: 'Mercador',
    tile: { x: 32, y: 37 },
    facing: 'down',
    look: { skin: '#d9a066', hair: '#1d1a24', hairStyle: 'short', shirt: '#c2453b', pants: '#3a2a20', accessory: 'beard' },
  },
  kael: {
    name: 'Kael',
    role: 'Engenheiro da Oficina',
    tile: { x: 33, y: 8 },
    facing: 'down',
    look: { skin: '#f0c8a0', hair: '#6b3414', hairStyle: 'spiky', shirt: '#ff9f5a', pants: '#3b3b5c', accessory: 'goggles' },
  },
  serah: {
    name: 'Serah',
    role: 'Cartógrafa das Rotas',
    tile: { x: 11, y: 6 },
    facing: 'down',
    look: { skin: '#c98d62', hair: '#10303a', hairStyle: 'long', shirt: '#34d3c1', pants: '#1f4a52', accessory: 'scarf' },
  },
  nyla: {
    name: 'Nyla',
    role: 'Sábia da Torre',
    tile: { x: 52, y: 19 },
    facing: 'left',
    look: { skin: '#7a4a2e', hair: '#eeeeee', hairStyle: 'bun', shirt: '#3a5bd6', pants: '#22306b', accessory: 'glasses' },
  },
};

/** Artefatos que o jogador pode escolher na criação do personagem (campo "av" do save). */
export const PLAYER_ARTIFACTS = [
  { id: 0, name: 'Cristal', accessory: 'pendant', text: 'Um pingente que brilha perto de energia.' },
  { id: 1, name: 'Rota', accessory: 'visor', text: 'Uma faixa de viajante para longas estradas.' },
  { id: 2, name: 'Engrenagem', accessory: 'goggles', text: 'Óculos de oficina para ver máquinas por dentro.' },
];

export const SKIN_TONES = ['#f6d5b8', '#e9b892', '#c98d62', '#a86b45', '#7a4a2e'];
export const HAIR_COLORS = ['#2b1b12', '#6b3414', '#c98a3a', '#e8d7a0', '#1d1a24', '#c2453b', '#5b8de0', '#d6c4ff'];
export const OUTFIT_COLORS = ['#5fe3d0', '#7b4fd6', '#ff9f5a', '#4f9a4a', '#c2453b', '#3a5bd6', '#f2b84b', '#e86fa8'];
export const HAIR_STYLES = [
  { id: 'short', name: 'Curto' },
  { id: 'long', name: 'Longo' },
  { id: 'spiky', name: 'Arrepiado' },
  { id: 'bun', name: 'Coque' },
  { id: 'braid', name: 'Trança' },
];

export const TOP_STYLES = [
  { id: 'tee', name: 'Camiseta' },
  { id: 'jacket', name: 'Jaqueta' },
  { id: 'hoodie', name: 'Moletom' },
  { id: 'tank', name: 'Regata' },
];
export const BOTTOM_STYLES = [
  { id: 'pants', name: 'Calça' },
  { id: 'shorts', name: 'Bermuda' },
  { id: 'skirt', name: 'Saia' },
];
export const BOTTOM_COLORS = ['#2b2b48', '#3b5bb5', '#5a4632', '#2f6b4a', '#7b4fd6', '#c2453b', '#d9c8a0', '#1d1a24'];
export const SHOE_COLORS = ['#3a2618', '#1d1a24', '#f4f0e6', '#c2453b', '#3f8fd6', '#f2b84b'];

/**
 * Aparência completa do jogador, em camadas (pele, cabelo, parte de cima, parte de baixo,
 * sapatos, acessório), com valores padrão para saves antigos.
 */
export function playerLook(player) {
  const artifact = PLAYER_ARTIFACTS[player?.av ?? 0] ?? PLAYER_ARTIFACTS[0];
  return {
    skin: player?.skin ?? SKIN_TONES[1],
    hair: player?.hair ?? HAIR_COLORS[0],
    hairStyle: player?.hairStyle ?? 'short',
    shirt: player?.col ?? '#5fe3d0',
    top: player?.top ?? 'tee',
    pants: player?.bottomColor ?? BOTTOM_COLORS[0],
    bottom: player?.bottom ?? 'pants',
    shoes: player?.shoes ?? SHOE_COLORS[0],
    accessory: artifact.accessory,
  };
}
