/* NEXO — Progresso: regiões abertas, concluídas e objetivo atual */

import { REGIONS, regionIndexOf } from '../data/regions.js';
import { CHARACTERS } from '../data/characters.js';
import { state } from '../core/state.js';

export const isMissionDone = (missionId) => Boolean(state.done[missionId]);

export const isRegionDone = (region) => region.missions.length > 0 && region.missions.every(isMissionDone);

/** As regiões se abrem em ordem: cada uma exige as anteriores concluídas (ou o modo debug). */
export function isRegionOpen(index) {
  if (!REGIONS[index]) return false;
  if (index === 0 || state.dbg) return true;
  return REGIONS.slice(0, index).every(isRegionDone);
}

export const isRegionOpenById = (regionId) => isRegionOpen(regionIndexOf(regionId));

export const countDoneRegions = () => REGIONS.filter(isRegionDone).length;

/** Primeira região aberta que ainda não foi concluída (ou null quando tudo foi concluído). */
export function currentRegion() {
  return REGIONS.find((region, index) => isRegionOpen(index) && !isRegionDone(region)) ?? null;
}

export function objectiveText() {
  const region = currentRegion();
  if (!region) return 'O Nexo está reconectado. Visite os moradores e refaça missões quando quiser.';
  const npc = CHARACTERS[region.npc];
  if (region.id === 'p') return `Fale com ${npc.name}, ${region.direction}.`;
  if (region.id === 'f') return `Volte a ${npc.name} e reacenda o Núcleo do Nexo, ${region.direction}.`;
  return `Encontre ${npc.name} em ${region.name}, ${region.direction}.`;
}
