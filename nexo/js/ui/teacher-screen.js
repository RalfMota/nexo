/* NEXO — Painel do Professor: lista de alunos e relatório individual
 *
 * Para cada aluno: nível na jornada, métricas (acertos, erros, tempo, dicas), avaliação
 * de conhecimento por tópico da grade curricular e a tabela de missões. Também cadastra,
 * renomeia, zera e exclui alunos, troca a senha e exporta a turma em CSV.
 *
 * Turma online: o professor cria ou abre uma turma (código + senha) e vê, junto com os
 * alunos deste computador, os alunos que sincronizaram de outros computadores (☁).
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';
import {
  listStudents, createStudent, renameStudent, resetStudent, deleteStudent,
  setTeacherPin, checkTeacherPin, wipeAll, applySettings,
  teacherTurma, setTeacherTurma, computerTurma, setComputerTurma, turmaOf,
} from '../core/state.js';
import { createClass, readClass, removeFromClass, normalizeCode } from '../core/cloud.js';
import { studentReport, STATUS, formatSeconds, formatPercent } from '../game/assessment.js';
import { TOPICS } from '../data/curriculum.js';
import { MISSIONS } from '../missions/index.js';
import { openModal, closeModal } from './modal.js';
import { studentAvatar, paintAvatars, showProfiles } from './profile-screen.js';

const SUPPORT_LABELS = { autonomo: 'sem apoio', dicas: 'com dicas', apoio: 'com apoio' };

let selectedId = null;
let filter = '';
/** Turma online aberta neste painel: { codigo, nome, senha, alunos, at } (a senha fica só na memória). */
let online = null;

/** Alunos deste computador + alunos da turma online que não estão aqui (marcados com origin). */
function allStudents() {
  const local = listStudents().map((student) => ({ ...student, origin: 'local', cloud: Boolean(online && turmaOf(student) === online.codigo) }));
  const localIds = new Set(local.map((student) => student.id));
  const remote = (online?.alunos ?? []).filter((student) => !localIds.has(student.id)).map((student) => ({ ...student, origin: 'online', cloud: true }));
  return [...local, ...remote].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

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
            <button type="button" class="btn btn--crystal btn--small" data-role="online">☁ Turma online</button>
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
              <input name="name" maxlength="24" placeholder="Apelido ou código" aria-label="Apelido ou código do novo aluno" autocomplete="off">
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
  qs('[data-role="online"]', app).addEventListener('click', openClassPanel);
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
  const students = allStudents();
  if (!students.find((student) => student.id === selectedId)) selectedId = students[0]?.id ?? null;
  const local = students.filter((student) => student.origin === 'local').length;
  const remote = students.length - local;
  const saved = teacherTurma();
  const time = online ? new Date(online.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  let line = `${local} ${local === 1 ? 'aluno' : 'alunos'} neste computador`;
  if (online) line += ` · turma online ${online.nome} (${online.codigo}): ${online.alunos.length} sincronizados${remote ? `, ${remote} de outros computadores` : ''} · atualizada às ${time}`;
  else if (saved) line += ` · turma online ${saved.codigo}: abra em "Turma online" para carregar`;
  qs('[data-role="count"]').textContent = line;
  renderList();
  renderReport();
}

function renderList() {
  const students = allStudents();
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
              <b>${escapeHtml(student.name)}${student.cloud ? ' <span class="cloud-badge" title="Na turma online">☁</span>' : ''}</b>
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
  const student = allStudents().find((item) => item.id === selectedId);
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
        <p class="muted small">Último acesso: ${formatDate(report.last)} · cadastrado em ${formatDate(student.created).slice(0, 10)}${student.origin === 'online' ? ' · jogou em outro computador (turma online)' : ''}</p>
      </div>
      <div class="row report__actions">${student.origin === 'online' ? `
        <button type="button" class="btn btn--danger btn--small" data-act="unlink">Remover da turma online</button>` : `
        <button type="button" class="btn btn--ghost btn--small" data-act="rename">Renomear</button>
        <button type="button" class="btn btn--ghost btn--small" data-act="reset">Zerar progresso</button>
        <button type="button" class="btn btn--danger btn--small" data-act="delete">Excluir</button>`}
      </div>
    </header>

    <section class="report__level" aria-label="Progressão">
      <div class="level-badge"><span>Nível</span><b>${Math.min(report.level + 1, report.levelCount)}</b><small>de ${report.levelCount}</small></div>
      <div class="report__progress">
        <p><b>${escapeHtml(report.levelName)}</b> · ${report.doneCount} de ${report.missionCount} missões de Matemática concluídas · ${report.extrasDone} de ${report.extrasCount} desafios extras</p>
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
                <td>${escapeHtml(mission.title)}${mission.extra ? ' <span class="chip chip--soon">extra</span>' : ''}</td>
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

    <p class="report__note small muted">Estes resultados são indícios a partir das missões jogadas, não uma nota nem um diagnóstico. "Acertos" e "erros" contam cada resposta conferida pelo jogo (por exemplo, abrir a comporta ou entregar a poção). Use junto com a observação em sala.</p>`;

  paintAvatars(root, [student]);
  if (student.origin === 'online') {
    qs('[data-act="unlink"]', root).addEventListener('click', async () => {
      if (!confirm(`Remover ${student.name} e o progresso dele da turma online ${online.codigo}? Se o aluno jogar de novo com o código, ele volta a aparecer.`)) return;
      try {
        await removeFromClass(online.codigo, online.senha, student.id);
        online.alunos = online.alunos.filter((item) => item.id !== student.id);
        selectedId = null;
        refresh();
      } catch (error) {
        alert(error.message);
      }
    });
    return;
  }
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

/* ---------- Turma online ---------- */

async function loadClass(codigo, senha) {
  const data = await readClass(codigo, senha);
  online = { codigo: data.codigo, nome: data.nome, senha, alunos: data.alunos, at: Date.now() };
  setTeacherTurma({ codigo: data.codigo, nome: data.nome });
}

const PRIVACY_NOTE = 'Na turma online, o jogo envia para um armazenamento privado (na Vercel, região de São Paulo) só o <b>apelido</b>, a aparência do personagem, as missões concluídas e as estatísticas. Os registros do Modo Pesquisa ficam no computador. Peça aos alunos que usem apelido ou código, não o nome completo.';

function connectedMarkup() {
  const usingHere = computerTurma() === online.codigo;
  return `
    <div class="stack">
      <p>Turma <b>${escapeHtml(online.nome)}</b>. Código para os alunos:</p>
      <p class="class-code" aria-label="Código da turma">${escapeHtml(online.codigo)}</p>
      <p class="muted small">Os alunos digitam este código na tela de título (Turma online), ou você liga a turma neste computador para todos os alunos daqui sincronizarem.</p>
      <label class="row"><input type="checkbox" data-role="here" ${usingHere ? 'checked' : ''}> Usar esta turma para os alunos deste computador</label>
      <div class="row">
        <button type="button" class="btn btn--crystal btn--small" data-role="reload">Atualizar alunos</button>
        <button type="button" class="btn btn--ghost btn--small" data-role="close-class">Fechar a turma neste painel</button>
      </div>
      <p class="pin-form__error" role="alert" hidden></p>
    </div>`;
}

function connectMarkup() {
  const saved = teacherTurma();
  return `
    <div class="stack">
      <p class="muted small">${PRIVACY_NOTE}</p>
      <form class="stack pin-form" data-role="open">
        <h3>Abrir uma turma</h3>
        <label class="field">Código da turma <input name="codigo" maxlength="6" autocomplete="off" value="${escapeHtml(saved?.codigo ?? '')}" style="text-transform:uppercase"></label>
        <label class="field">Senha da turma <input type="password" name="senha" autocomplete="current-password" required></label>
        <button type="submit" class="btn btn--magic">Abrir turma</button>
      </form>
      <form class="stack pin-form" data-role="create">
        <h3>Criar uma turma nova</h3>
        <label class="field">Nome da turma <input name="nome" maxlength="40" placeholder="Ex.: 6º ano B" autocomplete="off" required></label>
        <label class="field">Senha da turma (mínimo 6) <input type="password" name="senha" autocomplete="new-password" minlength="6" required></label>
        <button type="submit" class="btn btn--crystal">Criar turma</button>
      </form>
      <p class="pin-form__error" role="alert" hidden></p>
    </div>`;
}

/** Executa uma ação de rede travando os botões e mostrando o erro na própria janela. */
function withBusy(root, action) {
  const error = qs('.pin-form__error', root);
  return async (event) => {
    event?.preventDefault();
    const buttons = qsa('button', root);
    buttons.forEach((button) => {
      button.disabled = true;
    });
    error.hidden = true;
    try {
      await action(event);
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  };
}

function openClassPanel() {
  const body = openModal({ title: 'Turma online', body: online ? connectedMarkup() : connectMarkup() });

  if (online) {
    qs('[data-role="here"]', body).addEventListener('change', (event) => {
      setComputerTurma(event.target.checked ? online.codigo : null);
      refresh();
    });
    qs('[data-role="reload"]', body).addEventListener('click', withBusy(body, async () => {
      await loadClass(online.codigo, online.senha);
      refresh();
      closeModal();
    }));
    qs('[data-role="close-class"]', body).addEventListener('click', () => {
      online = null;
      setTeacherTurma(null);
      closeModal();
      refresh();
    });
    return;
  }

  qs('[data-role="open"]', body).addEventListener('submit', withBusy(body, async (event) => {
    const form = event.target;
    await loadClass(normalizeCode(form.elements.codigo.value), form.elements.senha.value);
    closeModal();
    refresh();
  }));
  qs('[data-role="create"]', body).addEventListener('submit', withBusy(body, async (event) => {
    const form = event.target;
    const { codigo } = await createClass(form.elements.nome.value.trim(), form.elements.senha.value);
    await loadClass(codigo, form.elements.senha.value);
    setComputerTurma(codigo);
    refresh();
    openClassPanel();
  }));
}

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
  const students = allStudents();
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
