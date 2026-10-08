/* NEXO — Progresso: regiões abertas, concluídas e objetivo atual */

import { REGIONS, regionById, regionIndexOf } from '../data/regions.js';
import { MISSIONS } from '../missions/index.js';
import { CHARACTERS } from '../data/characters.js';
import { state } from '../core/state.js';

export const isMissionDone = (missionId) => Boolean(state.done[missionId]);

export const isRegionDone = (region) => region.missions.length > 0 && region.missions.every(isMissionDone);

/**
 * Trilhas: na completa (padrão), todas as regiões são obrigatórias, em ordem. Na rápida,
 * pensada para o 8º e o 9º ano, o Vale e o Mercado (conteúdos dos anos iniciais) viram
 * aquecimento opcional: ficam abertos depois do Prólogo, mas não seguram o caminho.
 */
export const TRACKS = {
  completa: { name: 'Trilha completa', detail: 'todas as regiões, em ordem (do 2º ao 9º ano)' },
  rapida: { name: 'Trilha rápida', detail: 'para o 8º e o 9º ano: Vale e Mercado viram aquecimento opcional' },
};

export const currentTrack = () => (state.track === 'rapida' ? 'rapida' : 'completa');

/** Região de aquecimento opcional na trilha do aluno. */
export const isWarmup = (region) => currentTrack() === 'rapida' && Boolean(region?.warmup);

/** As regiões se abrem em ordem: cada uma exige as anteriores obrigatórias concluídas (ou o modo debug). */
export function isRegionOpen(index) {
  if (!REGIONS[index]) return false;
  if (index === 0 || state.dbg) return true;
  return REGIONS.slice(0, index).filter((region) => !isWarmup(region)).every(isRegionDone);
}

export const isRegionOpenById = (regionId) => isRegionOpen(regionIndexOf(regionId));

/** Desafio extra liberado: a região indicada em unlockAfter já foi concluída (ou modo debug). */
export function isExtraUnlocked(missionId) {
  const mission = MISSIONS[missionId];
  if (!mission?.extra) return false;
  const after = regionById(mission.unlockAfter);
  // Na trilha rápida, o desafio de uma região de aquecimento abre junto com ela
  return state.dbg || isRegionDone(after) || (isWarmup(after) && isRegionOpenById(after.id));
}

/** Desafios extras de uma região que já estão liberados. */
export const unlockedExtras = (region) => (region.extras ?? []).filter(isExtraUnlocked);

export const countDoneRegions = () => REGIONS.filter(isRegionDone).length;

/** Primeira região obrigatória aberta e ainda não concluída (ou null quando tudo foi concluído). */
export function currentRegion() {
  return REGIONS.find((region, index) => isRegionOpen(index) && !isRegionDone(region) && !isWarmup(region)) ?? null;
}

export function objectiveText() {
  const region = currentRegion();
  if (!region) return 'O Nexo está reconectado. Visite os moradores e refaça missões quando quiser.';
  const npc = CHARACTERS[region.npc];
  if (region.id === 'p') return `Fale com ${npc.name}, ${region.direction}.`;
  if (region.id === 'f') return `Volte a ${npc.name} e reacenda o Núcleo do Nexo, ${region.direction}.`;
  return `Encontre ${npc.name} em ${region.name}, ${region.direction}.`;
}
