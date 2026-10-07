/* NEXO — Catálogo de missões, na ordem das regiões */

import prologue from './prologue.js';
import seedsWorld from './seeds-world.js';
import floodgatesWorld from './floodgates-world.js';
import marketWorld from './market-world.js';
import workshop from './workshop.js';
import routes from './routes.js';
import tower from './tower.js';
import core from './core.js';
import { topicsForMission, bandForMission } from '../data/curriculum.js';

/**
 * Cada missão tem: title, region, npc, greeting, context, goal,
 * concept, prerequisites, relation, categories (Visão pedagógica do Diário),
 * hints (três níveis) e mount(stage, api), que monta a mecânica numa janela.
 * Missões com mode: 'world' acontecem no mapa: têm stages e mountWorld(api) no lugar de mount.
 * topics e band vêm da grade curricular (data/curriculum.js): quais conteúdos a missão observa.
 */
export const MISSIONS = { ...prologue, ...seedsWorld, ...floodgatesWorld, ...marketWorld, ...workshop, ...routes, ...tower, ...core };

for (const [id, mission] of Object.entries(MISSIONS)) {
  mission.topics = topicsForMission(id).map((topic) => topic.id);
  mission.band = bandForMission(id);
}
