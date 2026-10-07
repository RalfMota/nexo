/* NEXO — Painel do Professor: lista de alunos e relatório individual
 *
 * Para cada aluno: nível na jornada, métricas (acertos, erros, tempo, dicas), avaliação
 * de conhecimento por tópico da grade curricular e a tabela de missões. Também cadastra,
 * renomeia, zera e exclui alunos, troca a senha e exporta a turma em CSV.
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';
import {
  listStudents, createStudent, renameStudent, resetStudent, deleteStudent,
  setTeacherPin, checkTeacherPin, wipeAll, applySettings,
} from '../core/state.js';
import { studentReport, STATUS, formatSeconds, formatPercent } from '../game/assessment.js';
import { TOPICS } from '../data/curriculum.js';
import { MISSIONS } from '../missions/index.js';
import { openModal, closeModal } from './modal.js';
import { studentAvatar, paintAvatars, showProfiles } from './profile-screen.js';

const SUPPORT_LABELS = { autonomo: 'sem apoio', dicas: 'com dicas', apoio: 'com apoio' };

let selectedId = null;
let filter = '';

const formatDate = (time) =>
  time ? new Date(time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';

export function showTeacher() {
  const app = qs('#app');
  app.innerHTML = `
    <div class="screen teacher-screen">
      <div class="teacher">
        <header class="teacher__bar frame">
          <div>
            <h1 class="teacher__title">Painel do Professor</h1>
            <p class="muted small" data-role="count"></p>
          </div>
          <div class="row">
            <button type="button" class="btn btn--ghost btn--small" data-role="export">Exportar turma (CSV)</button>
            <button type="button" class="btn btn--ghost btn--small" data-role="pin">Alterar senha</button>
            <button type="button" class="btn btn--magic btn--small" data-role="exit">Sair do painel</button>
          </div>
        </header>
        <div class="teacher__body">
          <aside class="teacher__list frame" aria-label="Alunos">
            <input type="search" placeholder="Buscar aluno" aria-label="Buscar aluno" data-role="search" value="${escapeHtml(filter)}">
            <ul class="student-list" data-role="students"></ul>
            <form class="row teacher__add" data-role="add">
              <input name="name" maxlength="24" placeholder="Nome do aluno" aria-label="Nome do novo aluno" autocomplete="off">
              <button type="submit" class="btn btn--crystal btn--small">Cadastrar</button>
            </form>
            <button type="button" class="btn btn--danger btn--small teacher__wipe" data-role="wipe">Apagar todos os dados</button>
          </aside>
          <main class="teacher__report frame" data-role="report" aria-live="polite"></main>
        </div>
      </div>
    </div>`;

  qs('[data-role="search"]', app).addEventListener('input', (event) => {
    filter = event.target.value;
    renderList();
  });
  qs('[data-role="add"]', app).addEventListener('submit', (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.name;
    if (!input.value.trim()) return input.focus();
    selectedId = createStudent(input.value);
    input.value = '';
    refresh();
  });
  qs('[data-role="export"]', app).addEventListener('click', exportClass);
  qs('[data-role="pin"]', app).addEventListener('click', changePin);
  qs('[data-role="exit"]', app).addEventListener('click', () => showProfiles());
  qs('[data-role="wipe"]', app).addEventListener('click', () => {
    if (!confirm('Apagar TODOS os alunos, progressos, registros e a senha do professor deste navegador? Exporte a turma antes.')) return;
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    wipeAll();
    applySettings();
    selectedId = null;
    showProfiles();
  });
  refresh();
}

function refresh() {
  const students = listStudents();
  if (!students.find((student) => student.id === selectedId)) selectedId = students[0]?.id ?? null;
  qs('[data-role="count"]').textContent = `${students.length} ${students.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'} neste computador`;
  renderList();
  renderReport();
}

function renderList() {
  const students = listStudents();
  const term = filter.trim().toLocaleLowerCase('pt-BR');
  const visible = students.filter((student) => student.name.toLocaleLowerCase('pt-BR').includes(term));
  const list = qs('[data-role="students"]');
  list.innerHTML = visible.length
    ? visible.map((student) => {
      const report = studentReport(student);
      return `
        <li>
          <button type="button" class="student-row" data-id="${escapeHtml(student.id)}" aria-current="${student.id === selectedId}">
            ${studentAvatar(student, 40)}
            <span class="student-row__text">
              <b>${escapeHtml(student.name)}</b>
              <small>${report.doneCount}/${report.missionCount} missões${report.needs.length ? ` · <span class="tone-warn">${report.needs.length} para reforçar</span>` : ''}</small>
              <span class="meter" aria-hidden="true"><span style="width:${Math.round(report.progress * 100)}%"></span></span>
            </span>
          </button>
        </li>`;
    }).join('')
    : `<li class="muted small">${students.length ? 'Nenhum aluno com esse nome.' : 'Nenhum aluno cadastrado ainda.'}</li>`;
  paintAvatars(list, students);
  qsa('[data-id]', list).forEach((button) => {
    button.addEventListener('click', () => {
      selectedId = button.dataset.id;
      renderList();
      renderReport();
    });
  });
}

function topicDetail(item) {
  if (item.status === 'planejado') return escapeHtml(item.topic.planned);
  if (item.status === 'nao_iniciado') return 'Ainda sem respostas nas missões deste tópico.';
  const parts = [`${item.correct} ${item.correct === 1 ? 'acerto' : 'acertos'}`, `${item.wrong} ${item.wrong === 1 ? 'erro' : 'erros'}`];
  if (item.accuracy != null) parts.push(`${formatPercent(item.accuracy)} de acerto`);
  if (item.supports) parts.push(`${item.supports} ${item.supports === 1 ? 'apoio automático' : 'apoios automáticos'}`);
  return parts.join(' · ');
}

/** Missão sugerida para retomar um tópico: a primeira ligada a ele. */
const suggestedMission = (topic) => MISSIONS[topic.links[0]?.mission]?.title;

function renderReport() {
  const root = qs('[data-role="report"]');
  const student = listStudents().find((item) => item.id === selectedId);
  if (!student) {
    root.innerHTML = '<div class="teacher__empty"><h2>Nenhum aluno selecionado</h2><p class="muted">Cadastre um aluno ao lado ou peça que ele entre pelo perfil de aluno.</p></div>';
    return;
  }
  const report = studentReport(student);
  const { totals } = report;

  root.innerHTML = `
    <header class="report__head">
      ${studentAvatar(student, 72)}
      <div class="report__who">
        <h2>${escapeHtml(student.name)}</h2>
        <p class="muted small">Último acesso: ${formatDate(report.last)} · cadastrado em ${formatDate(student.created).slice(0, 10)}</p>
      </div>
      <div class="row report__actions">
        <button type="button" class="btn btn--ghost btn--small" data-act="rename">Renomear</button>
        <button type="button" class="btn btn--ghost btn--small" data-act="reset">Zerar progresso</button>
        <button type="button" class="btn btn--danger btn--small" data-act="delete">Excluir</button>
      </div>
    </header>

    <section class="report__level" aria-label="Progressão">
      <div class="level-badge"><span>Nível</span><b>${Math.min(report.level + 1, report.levelCount)}</b><small>de ${report.levelCount}</small></div>
      <div class="report__progress">
        <p><b>${escapeHtml(report.levelName)}</b> · ${report.doneCount} de ${report.missionCount} missões de Matemática concluídas</p>
        <span class="meter meter--big" aria-hidden="true"><span style="width:${Math.round(report.progress * 100)}%"></span></span>
      </div>
    </section>

    <section class="kpis" aria-label="Métricas">
      ${kpi('Acertos', totals.correct, 'ok')}
      ${kpi('Erros', totals.wrong, 'warn')}
      ${kpi('Taxa de acerto', formatPercent(totals.accuracy))}
      ${kpi('Tempo médio por missão', formatSeconds(report.avgSec))}
      ${kpi('Tempo total em missões', formatSeconds(totals.sec))}
      ${kpi('Dicas pedidas', totals.hints)}
    </section>

    <section class="report__section">
      <h3>Avaliação de conhecimento</h3>
      <div class="summary-row">
        <div class="summary summary--ok"><b>Domina</b><span>${report.strengths.length ? report.strengths.map((item) => escapeHtml(item.topic.name)).join(', ') : 'ainda sem tópicos dominados'}</span></div>
        <div class="summary summary--warn"><b>Precisa de reforço</b><span>${report.needs.length
          ? report.needs.map((item) => `${escapeHtml(item.topic.name)}${suggestedMission(item.topic) ? ` <small>(retomar: ${escapeHtml(suggestedMission(item.topic))})</small>` : ''}`).join('<br>')
          : 'nenhum tópico com sinal de dificuldade'}</span></div>
      </div>
      <div class="bands">
        ${report.bands.map((band) => `
          <div class="band">
            <h4>${escapeHtml(band.name)} <small>${escapeHtml(band.years)}</small></h4>
            <ul class="topic-list">
              ${band.topics.map((item) => `
                <li class="topic topic--${STATUS[item.status].tone}">
                  <div class="topic__top">
                    <span class="topic__name">${escapeHtml(item.topic.name)}</span>
                    <span class="chip chip--${STATUS[item.status].tone}">${STATUS[item.status].label}</span>
                  </div>
                  <small class="topic__meta">${escapeHtml(item.topic.years)} · ${escapeHtml(item.topic.unit)}</small>
                  <small class="topic__detail">${topicDetail(item)}</small>
                </li>`).join('')}
            </ul>
          </div>`).join('')}
      </div>
    </section>

    <section class="report__section">
      <h3>Missões</h3>
      <div class="table-scroll">
        <table class="report-table">
          <thead><tr><th>Missão</th><th>Região</th><th>Situação</th><th>Acertos</th><th>Erros</th><th>Dicas</th><th>Melhor tempo</th><th>Tempo total</th></tr></thead>
          <tbody>
            ${report.missions.filter((mission) => mission.id !== 'p0').map((mission) => `
              <tr>
                <td>${escapeHtml(mission.title)}</td>
                <td>${escapeHtml(mission.region?.name ?? '')}</td>
                <td>${mission.done ? `<span class="chip chip--ok">concluída ${SUPPORT_LABELS[mission.support] ?? ''}</span>` : mission.starts ? '<span class="chip chip--mid">em andamento</span>' : '<span class="chip chip--idle">não iniciada</span>'}</td>
                <td>${mission.correct}</td>
                <td>${mission.wrong}</td>
                <td>${mission.hints}</td>
                <td>${formatSeconds(mission.bestSec)}</td>
                <td>${mission.sec ? formatSeconds(mission.sec) : '–'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <p class="report__note small muted">Estes resultados são indícios a partir das missões jogadas neste computador, não uma nota nem um diagnóstico. "Acertos" e "erros" contam cada resposta conferida pelo jogo (por exemplo, abrir a comporta ou entregar a poção). Use junto com a observação em sala.</p>`;

  paintAvatars(root, [student]);
  qs('[data-act="rename"]', root).addEventListener('click', () => {
    const name = prompt('Novo nome do aluno:', student.name);
    if (name?.trim()) {
      renameStudent(student.id, name);
      refresh();
    }
  });
  qs('[data-act="reset"]', root).addEventListener('click', () => {
    if (!confirm(`Zerar todo o progresso e as estatísticas de ${student.name}? O cadastro continua.`)) return;
    resetStudent(student.id);
    refresh();
  });
  qs('[data-act="delete"]', root).addEventListener('click', () => {
    if (!confirm(`Excluir ${student.name} e todos os dados dele deste computador?`)) return;
    deleteStudent(student.id);
    selectedId = null;
    refresh();
  });
}

const kpi = (label, value, tone = '') => `
  <div class="kpi ${tone ? `kpi--${tone}` : ''}">
    <span class="kpi__value">${escapeHtml(String(value))}</span>
    <span class="kpi__label">${label}</span>
  </div>`;

/* ---------- Senha e exportação ---------- */

function changePin() {
  const body = openModal({
    title: 'Alterar senha do professor',
    body: `
      <form class="stack pin-form" data-role="change">
        <label class="field">Senha atual <input type="password" name="current" autocomplete="current-password" required></label>
        <label class="field">Nova senha <input type="password" name="next" autocomplete="new-password" required minlength="4"></label>
        <label class="field">Repita a nova senha <input type="password" name="confirm" autocomplete="new-password" required></label>
        <p class="pin-form__error" role="alert" hidden></p>
        <button type="submit" class="btn btn--magic">Salvar nova senha</button>
      </form>`,
  });
  const form = qs('form', body);
  const error = qs('.pin-form__error', form);
  qs('input', form).focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fail = (text) => {
      error.textContent = text;
      error.hidden = false;
    };
    if (!(await checkTeacherPin(form.elements.current.value))) return fail('A senha atual está incorreta.');
    if (form.elements.next.value.length < 4) return fail('A nova senha precisa ter pelo menos 4 caracteres.');
    if (form.elements.next.value !== form.elements.confirm.value) return fail('As duas senhas novas não são iguais.');
    await setTeacherPin(form.elements.next.value);
    closeModal();
  });
}

const csvCell = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

/** Uma linha por aluno e missão, mais a situação de cada tópico da grade. */
function exportClass() {
  const students = listStudents();
  if (!students.length) {
    alert('Ainda não há alunos cadastrados.');
    return;
  }
  const header = ['aluno', 'nivel', 'regiao_atual', 'missao', 'concluida', 'apoio', 'acertos', 'erros', 'dicas', 'apoios_automaticos', 'melhor_tempo_s', 'tempo_total_s'];
  const topicHeader = TOPICS.map((topic) => `topico_${topic.id}`);
  const lines = [header.concat(topicHeader).map(csvCell).join(',')];
  for (const student of students) {
    const report = studentReport(student);
    const topicCells = report.topics.map((item) => STATUS[item.status].label);
    for (const mission of report.missions.filter((item) => item.id !== 'p0')) {
      lines.push([
        student.name, report.level + 1, report.levelName, mission.title, mission.done ? 'sim' : 'não', mission.support ?? '',
        mission.correct, mission.wrong, mission.hints, mission.supports, mission.bestSec ?? '', mission.sec,
        ...topicCells,
      ].map(csvCell).join(','));
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
  link.download = `nexo_turma_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}
