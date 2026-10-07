/* NEXO — Avaliação de conhecimento a partir do save de um aluno (Painel do Professor)
 *
 * Tudo aqui é calculado a partir do save, sem alterar nada. Os resultados são indícios
 * situados nas missões jogadas, não nota nem diagnóstico: o painel diz isso ao professor.
 *
 * Situação de cada tópico:
 *   dominado        todas as etapas ligadas a ele concluídas, com ≥ 60% de acerto e sem apoio automático;
 *   desenvolvimento há progresso, mas ainda sem as condições de "dominado";
 *   reforco         ≥ 3 respostas com menos de 40% de acerto, ou 2 ou mais apoios automáticos;
 *   nao_iniciado    nenhuma resposta ainda;
 *   planejado       o jogo ainda não tem missão para o tópico.
 */

import { REGIONS } from '../data/regions.js';
import { TOPICS, BANDS } from '../data/curriculum.js';
import { MISSIONS } from '../missions/index.js';

export const STATUS = {
  dominado: { label: 'Dominado', tone: 'ok' },
  desenvolvimento: { label: 'Em desenvolvimento', tone: 'mid' },
  reforco: { label: 'Precisa de reforço', tone: 'warn' },
  nao_iniciado: { label: 'Não iniciado', tone: 'idle' },
  planejado: { label: 'Em breve no jogo', tone: 'soon' },
};

const MATH_MISSIONS = REGIONS.flatMap((region) => region.missions).filter((id) => id !== 'p0');

const ratio = (correct, wrong) => (correct + wrong ? correct / (correct + wrong) : null);

/** Respostas certas e erradas de um vínculo (só as etapas indicadas, quando houver). */
function linkCounts(save, link) {
  const stats = save.stats?.[link.mission];
  if (!stats) return { correct: 0, wrong: 0, passed: Boolean(save.done?.[link.mission]), hints: 0, supports: 0 };
  let { correct, wrong, hints, supports } = stats;
  let passed = Boolean(save.done?.[link.mission]);
  // Só as etapas ligadas ao tópico contam (acertos, erros, dicas e apoios de cada etapa)
  if (link.stages) {
    correct = wrong = hints = supports = 0;
    passed = passed || link.stages.every((stage) => stats.stages?.[stage]?.correct > 0);
    for (const stage of link.stages) {
      const step = stats.stages?.[stage] ?? {};
      correct += step.correct ?? 0;
      wrong += step.wrong ?? 0;
      hints += step.hints ?? 0;
      supports += step.supports ?? 0;
    }
  }
  return { correct, wrong, passed, hints, supports };
}

export function assessTopic(save, topic) {
  if (!topic.links.length) return { topic, status: 'planejado', correct: 0, wrong: 0, accuracy: null, hints: 0, supports: 0 };
  const counts = topic.links.map((link) => linkCounts(save, link));
  const correct = counts.reduce((sum, c) => sum + c.correct, 0);
  const wrong = counts.reduce((sum, c) => sum + c.wrong, 0);
  const hints = counts.reduce((sum, c) => sum + c.hints, 0);
  const supports = counts.reduce((sum, c) => sum + c.supports, 0);
  const passed = counts.every((c) => c.passed);
  const accuracy = ratio(correct, wrong);
  let status = 'desenvolvimento';
  if (!correct && !wrong && !counts.some((c) => c.passed)) status = 'nao_iniciado';
  else if ((correct + wrong >= 3 && accuracy < 0.4) || supports >= 2) status = 'reforco';
  else if (passed && (accuracy == null || accuracy >= 0.6) && supports === 0) status = 'dominado';
  return { topic, status, correct, wrong, accuracy, hints, supports, passed };
}

/** Relatório completo de um aluno. */
export function studentReport(student) {
  const save = student.save ?? {};
  const done = save.done ?? {};
  const stats = save.stats ?? {};

  const missions = MATH_MISSIONS.concat('p0').map((id) => {
    const entry = stats[id] ?? {};
    const record = done[id];
    return {
      id,
      title: MISSIONS[id]?.title ?? id,
      region: REGIONS.find((region) => region.missions.includes(id)),
      done: Boolean(record),
      support: record?.sup ?? null,
      starts: entry.starts ?? 0,
      correct: entry.correct ?? 0,
      wrong: entry.wrong ?? 0,
      hints: entry.hints ?? 0,
      supports: entry.supports ?? 0,
      sec: entry.sec ?? 0,
      bestSec: entry.bestSec ?? record?.sec ?? null,
      last: entry.last ?? null,
    };
  });
  const math = missions.filter((mission) => mission.id !== 'p0');

  const totals = math.reduce(
    (sum, mission) => ({
      correct: sum.correct + mission.correct,
      wrong: sum.wrong + mission.wrong,
      hints: sum.hints + mission.hints,
      sec: sum.sec + mission.sec,
    }),
    { correct: 0, wrong: 0, hints: 0, sec: 0 },
  );
  const doneCount = math.filter((mission) => mission.done).length;
  const solved = math.filter((mission) => mission.bestSec != null && mission.done);

  // Nível: a primeira região ainda não concluída (as regiões abrem em ordem)
  const levelIndex = REGIONS.findIndex((region) => !region.missions.every((id) => done[id]));
  const level = levelIndex === -1 ? REGIONS.length : levelIndex;

  const topics = TOPICS.map((topic) => assessTopic(save, topic));
  const bands = BANDS.map((band) => ({ ...band, topics: topics.filter((item) => item.topic.band === band.id) }));

  return {
    student,
    hasCharacter: Boolean(save.player),
    level,
    levelName: REGIONS[level]?.name ?? 'Jornada concluída',
    levelCount: REGIONS.length,
    doneCount,
    missionCount: math.length,
    progress: math.length ? doneCount / math.length : 0,
    totals: { ...totals, accuracy: ratio(totals.correct, totals.wrong) },
    avgSec: solved.length ? Math.round(solved.reduce((sum, mission) => sum + mission.bestSec, 0) / solved.length) : null,
    missions,
    topics,
    bands,
    strengths: topics.filter((item) => item.status === 'dominado'),
    needs: topics.filter((item) => item.status === 'reforco'),
    last: Math.max(student.lastSeen ?? 0, ...math.map((mission) => mission.last ?? 0)) || null,
  };
}

export function formatSeconds(sec) {
  if (sec == null) return '–';
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ${String(sec % 60).padStart(2, '0')} s`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

export const formatPercent = (value) => (value == null ? '–' : `${Math.round(value * 100)}%`);
