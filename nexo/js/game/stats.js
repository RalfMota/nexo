/* NEXO — Estatísticas de desempenho por missão (para o Painel do Professor)
 *
 * Diferente do Modo Pesquisa (que só registra quando ligado), estas contagens são sempre
 * guardadas no save do aluno: inícios, conclusões, abandonos, acertos e erros (no total
 * e por etapa), dicas, apoios automáticos e tempo.
 */

import { state, saveState } from '../core/state.js';

const blank = () => ({
  starts: 0,
  wins: 0,
  abandons: 0,
  correct: 0,
  wrong: 0,
  hints: 0,
  supports: 0,
  sec: 0,
  bestSec: null,
  first: null,
  last: null,
  stages: {},
});

function entry(missionId) {
  state.stats ||= {};
  return (state.stats[missionId] ||= blank());
}

function stageEntry(stats, stage) {
  const step = (stats.stages[stage] ||= { correct: 0, wrong: 0 });
  step.hints ??= 0;
  step.supports ??= 0;
  return step;
}

export function statStart(missionId) {
  const stats = entry(missionId);
  stats.starts++;
  stats.first ??= Date.now();
  stats.last = Date.now();
  saveState();
}

/** Uma resposta conferida pela missão: certa ou errada, na etapa atual (quando houver). */
export function statAttempt(missionId, ok, stage) {
  const stats = entry(missionId);
  stats[ok ? 'correct' : 'wrong']++;
  if (stage != null) stageEntry(stats, stage)[ok ? 'correct' : 'wrong']++;
  stats.last = Date.now();
  saveState();
}

export function statHint(missionId, automatic, stage) {
  const stats = entry(missionId);
  stats.hints++;
  if (automatic) stats.supports++;
  if (stage != null) {
    const step = stageEntry(stats, stage);
    step.hints++;
    if (automatic) step.supports++;
  }
  saveState();
}

export function statWin(missionId, sec) {
  const stats = entry(missionId);
  stats.wins++;
  stats.sec += sec;
  stats.bestSec = stats.bestSec == null ? sec : Math.min(stats.bestSec, sec);
  stats.last = Date.now();
  saveState();
}

export function statAbandon(missionId, sec) {
  const stats = entry(missionId);
  stats.abandons++;
  stats.sec += sec;
  saveState();
}
