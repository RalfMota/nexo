/* NEXO — Escolha de perfil: Aluno (jogar) ou Professor (painel de relatórios)
 *
 * Os alunos escolhem o próprio nome na lista (ou se cadastram) e seguem para o jogo.
 * A área do professor pede a senha (criada no primeiro acesso). Atalho: Ctrl + Shift + P.
 *
 * Observação: tudo fica neste navegador. A senha impede que um aluno entre no painel por
 * engano, mas não é uma proteção forte contra quem tem acesso ao computador.
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';
import { listStudents, createStudent, selectStudent, hasTeacherPin, setTeacherPin, checkTeacherPin } from '../core/state.js';
import { playerLook } from '../data/characters.js';
import { drawPortrait } from '../art/characters.js';
import { studentReport } from '../game/assessment.js';
import { openModal, closeModal } from './modal.js';
import { animateVillageBackground, stopVillageBackground, showTitle } from './title-screen.js';
import { showCreate } from './create-screen.js';
import { showTeacher } from './teacher-screen.js';

const MIN_PIN = 4;
let removeShortcut = null;

/** Retrato do aluno (ou as iniciais, antes de ele criar o personagem). */
export function studentAvatar(student, size = 56) {
  const player = student.save?.player;
  if (player) return `<canvas class="avatar" width="${size}" height="${size}" data-avatar="${escapeHtml(student.id)}" aria-hidden="true"></canvas>`;
  const initials = student.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return `<span class="avatar avatar--initials" style="width:${size}px;height:${size}px" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

export function paintAvatars(root, students) {
  qsa('canvas[data-avatar]', root).forEach((canvas) => {
    const student = students.find((item) => item.id === canvas.dataset.avatar);
    if (student?.save?.player) drawPortrait(canvas, playerLook(student.save.player), 'happy', '#3a3370');
  });
}

/** Atalho de teclado para a área do professor (Ctrl + Shift + P). */
export function bindTeacherShortcut() {
  removeShortcut?.();
  const onKey = (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      openTeacherLogin();
    }
  };
  window.addEventListener('keydown', onKey);
  removeShortcut = () => {
    window.removeEventListener('keydown', onKey);
    removeShortcut = null;
  };
}

function leaveProfiles() {
  removeShortcut?.();
}

export function showProfiles() {
  const students = listStudents();
  const app = qs('#app');
  app.innerHTML = `
    <div class="screen">
      <canvas class="screen__bg" aria-hidden="true"></canvas>
      <div class="screen__shade"></div>
      <main class="screen__content">
        <header class="logo">
          <h1 class="logo__name">NE<span>X</span>O</h1>
          <p class="logo__tagline">Uma Jornada Matemática</p>
        </header>
        <section class="profiles frame" aria-labelledby="profiles-title">
          <h2 id="profiles-title" class="profiles__title">Quem vai jogar?</h2>
          <div class="profiles__grid" role="list">
            ${students.map((student) => profileCard(student)).join('')}
            <form class="profile-card profile-card--new" data-role="new-student" role="listitem">
              <span class="avatar avatar--add" aria-hidden="true">+</span>
              <label class="profile-card__new">
                <span class="profile-card__name">Novo aluno</span>
                <input name="name" maxlength="24" placeholder="Seu nome" autocomplete="off" aria-label="Nome do novo aluno">
              </label>
              <button type="submit" class="btn btn--crystal btn--small">Entrar</button>
            </form>
          </div>
        </section>
        <button type="button" class="btn btn--ghost teacher-entry" data-role="teacher">
          <span aria-hidden="true">🔒</span> Área do professor
        </button>
        <p class="title-footer">Protótipo de pesquisa em Educação Matemática. O uso com estudantes depende de autorização institucional, consentimento dos responsáveis e assentimento dos participantes.</p>
      </main>
    </div>`;

  animateVillageBackground(qs('.screen__bg', app));
  paintAvatars(app, students);
  bindTeacherShortcut();

  qsa('[data-student]', app).forEach((button) => {
    button.addEventListener('click', () => enterAsStudent(button.dataset.student));
  });
  qs('[data-role="new-student"]', app).addEventListener('submit', (event) => {
    event.preventDefault();
    const input = qs('input', event.currentTarget);
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    const existing = students.find((student) => student.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'));
    if (existing && !confirm(`Já existe um aluno chamado ${existing.name}. Criar outro perfil com o mesmo nome?`)) return;
    enterAsStudent(createStudent(name));
  });
  qs('[data-role="teacher"]', app).addEventListener('click', openTeacherLogin);
}

function profileCard(student) {
  const report = studentReport(student);
  const detail = report.hasCharacter
    ? `${report.doneCount} de ${report.missionCount} missões · ${escapeHtml(report.levelName)}`
    : 'Ainda não começou';
  return `
    <button type="button" class="profile-card" data-student="${escapeHtml(student.id)}" role="listitem">
      ${studentAvatar(student)}
      <span class="profile-card__text">
        <span class="profile-card__name">${escapeHtml(student.name)}</span>
        <span class="profile-card__detail">${detail}</span>
        <span class="meter" aria-hidden="true"><span style="width:${Math.round(report.progress * 100)}%"></span></span>
      </span>
    </button>`;
}

function enterAsStudent(id) {
  if (!selectStudent(id)) return;
  leaveProfiles();
  // Sem personagem ainda: vai direto ao criador; com personagem: tela de título (continuar)
  if (listStudents().find((student) => student.id === id)?.save?.player) {
    showTitle();
  } else {
    showCreate();
  }
}

/** Janela de senha do professor (criação da senha no primeiro acesso). */
export function openTeacherLogin() {
  const firstTime = !hasTeacherPin();
  const body = openModal({
    title: 'Área do professor',
    body: `
      <form class="stack pin-form" data-role="pin-form">
        <p class="muted">${firstTime
          ? `Primeiro acesso: crie a senha do professor (pelo menos ${MIN_PIN} caracteres). Ela fica guardada só neste navegador.`
          : 'Digite a senha do professor.'}</p>
        <label class="field">Senha <input type="password" name="pin" autocomplete="${firstTime ? 'new-password' : 'current-password'}" required minlength="${MIN_PIN}"></label>
        ${firstTime ? '<label class="field">Repita a senha <input type="password" name="confirm" autocomplete="new-password" required></label>' : ''}
        <p class="pin-form__error" role="alert" hidden></p>
        <button type="submit" class="btn btn--magic">${firstTime ? 'Criar senha e entrar' : 'Entrar'}</button>
      </form>`,
  });
  const form = qs('[data-role="pin-form"]', body);
  const error = qs('.pin-form__error', form);
  const showError = (text) => {
    error.textContent = text;
    error.hidden = false;
  };
  qs('input', form).focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const pin = form.elements.pin.value;
    if (pin.length < MIN_PIN) return showError(`A senha precisa ter pelo menos ${MIN_PIN} caracteres.`);
    if (firstTime) {
      if (pin !== form.elements.confirm.value) return showError('As duas senhas não são iguais.');
      await setTeacherPin(pin);
    } else if (!(await checkTeacherPin(pin))) {
      form.elements.pin.value = '';
      form.elements.pin.focus();
      return showError('Senha incorreta.');
    }
    closeModal();
    leaveProfiles();
    stopVillageBackground();
    showTeacher();
  });
}
