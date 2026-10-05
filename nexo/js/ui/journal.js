/* NEXO — Diário (antigo Painel): percurso nas missões, conceitos e visão pedagógica
 * Os dados são indícios situados em poucas tarefas: não são nota nem diagnóstico.
 */

import { state } from '../core/state.js';
import { escapeHtml } from '../core/dom.js';
import { MISSIONS } from '../missions/index.js';
import { openModal } from './modal.js';

const SUPPORT_LABELS = {
  autonomo: 'realizou sem apoio',
  dicas: 'concluiu com dicas',
  apoio: 'necessitou apoio',
};

export const CATEGORIES = [
  'operações', 'frações', 'proporcionalidade', 'porcentagem', 'linguagem algébrica',
  'relações entre grandezas', 'previsão', 'representação', 'função',
];

function categorySummary(category, missionIds) {
  const supports = missionIds
    .filter((id) => MISSIONS[id].categories.includes(category) && state.done[id])
    .map((id) => state.done[id].sup);
  if (!supports.length) return 'ainda sem evidência';
  if (supports.every((sup) => sup === 'autonomo')) return 'realizou sem apoio';
  if (supports.includes('apoio')) return 'necessitou apoio';
  return 'em desenvolvimento';
}

export function openJournal() {
  const allIds = Object.keys(MISSIONS);
  const mathIds = allIds.filter((id) => id !== 'p0');

  const missionRows = allIds.map((id) => {
    const record = state.done[id];
    return `<tr>
      <td>${escapeHtml(MISSIONS[id].title)}</td>
      <td>${record ? SUPPORT_LABELS[record.sup] : 'não concluída'}</td>
      <td>${record ? record.tries : '–'}</td>
      <td>${record ? record.hints : '–'}</td>
      <td>${record ? record.reps : '–'}</td>
    </tr>`;
  }).join('');

  const concepts = CATEGORIES.map((category) =>
    `<li><b>${escapeHtml(category)}</b>${categorySummary(category, mathIds)}</li>`).join('');

  const pedagogy = mathIds.map((id) => {
    const mission = MISSIONS[id];
    const record = state.done[id];
    const evidence = record
      ? `${record.tries} tentativa(s), ${record.hints} dica(s), ${record.sec}s, ${SUPPORT_LABELS[record.sup]} (primeira conclusão)`
      : 'nenhuma ainda';
    return `<details>
      <summary>${escapeHtml(mission.title)}</summary>
      <p><b>Conceito:</b> ${escapeHtml(mission.concept)}<br>
      <b>Conhecimentos prévios:</b> ${escapeHtml(mission.prerequisites)}<br>
      <b>Relação subjacente:</b> ${escapeHtml(mission.relation)}<br>
      <b>Evidências:</b> ${evidence}</p>
    </details>`;
  }).join('');

  openModal({
    title: 'Diário do Reconector',
    wide: true,
    body: `
      <div class="journal">
        <p class="muted">Indícios situados em poucas tarefas. Não são nota nem diagnóstico.</p>
        <table class="ledger">
          <thead><tr><th>Missão</th><th>Estado</th><th>Tent.</th><th>Dicas</th><th>Repet.</th></tr></thead>
          <tbody>${missionRows}</tbody>
        </table>
        <h3>Conceitos relacionados</h3>
        <ul class="concepts">${concepts}</ul>
        <h3>Visão pedagógica</h3>
        ${pedagogy}
      </div>`,
  });
}
