/* NEXO — Tela de título do aluno: novo jogo, continuar, trocar de perfil, Modo Pesquisa e opções */

import { qs, escapeHtml } from '../core/dom.js';
import { state, DEBUG, saveState, startNewGame, activeStudent, resetStudent, signOut, turmaOf, computerTurma, setStudentTurma } from '../core/state.js';
import { syncStudent, syncStatus, onSyncStatus, isValidCode, normalizeCode } from '../core/cloud.js';
import { getBaseLayer } from '../world/renderer.js';
import { openJournal } from './journal.js';
import { accessibilityMarkup, bindAccessibility, researchMarkup, bindResearch } from './options.js';
import { showCreate } from './create-screen.js';
import { showGame } from './game-screen.js';
import { showProfiles, bindTeacherShortcut } from './profile-screen.js';

let stopBackground = null;

/** Fundo das telas iniciais: a própria vila, deslizando devagar. */
export function animateVillageBackground(canvas) {
  stopBackground?.();
  const base = getBaseLayer();
  const ctx = canvas.getContext('2d');
  let frameId = 0;
  let start = 0;
  const draw = (now) => {
    frameId = requestAnimationFrame(draw);
    start ||= now;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth * ratio;
    const height = canvas.clientHeight * ratio;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const scale = Math.max(height / (base.height * 0.55), width / (base.width * 0.7));
    const travel = base.width * scale - width;
    const phase = (Math.sin((now - start) / 26000) + 1) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, -travel * phase, -(base.height * scale - height) * 0.45, base.width * scale, base.height * scale);
  };
  frameId = requestAnimationFrame(draw);
  stopBackground = () => {
    cancelAnimationFrame(frameId);
    stopBackground = null;
  };
}

export function stopVillageBackground() {
  stopBackground?.();
}

/* ---------- Turma online do aluno ---------- */

function classStatusText() {
  const status = syncStatus();
  if (status.ok === true) return `Progresso enviado às ${new Date(status.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
  if (status.ok === false) return `Não deu para enviar: ${status.message}`;
  return 'O progresso é enviado sozinho enquanto você joga.';
}

function classMarkup(student) {
  const code = turmaOf(student);
  const fromComputer = !student.turma && computerTurma();
  return `
    <p class="small">${code
      ? `Você está na turma <b class="class-code class-code--small">${escapeHtml(code)}</b>${fromComputer ? ' (turma deste computador)' : ''}.`
      : 'Se o professor deu um código de turma, digite aqui para ele acompanhar o seu progresso de qualquer computador.'}</p>
    <form class="row" data-role="class-form">
      <input name="code" maxlength="6" placeholder="Código" aria-label="Código da turma" autocomplete="off" value="${escapeHtml(student.turma ?? '')}" style="text-transform:uppercase;width:8em">
      <button type="submit" class="btn btn--crystal btn--small">${student.turma ? 'Trocar' : 'Entrar'}</button>
      ${student.turma ? '<button type="button" class="btn btn--ghost btn--small" data-role="class-leave">Sair da turma</button>' : ''}
    </form>
    <p class="small muted" data-role="class-status" aria-live="polite">${code ? classStatusText() : ''}</p>
    <p class="small muted">Vai para a internet só o seu apelido, o personagem e o progresso nas missões.</p>`;
}

let stopClassStatus = null;

function bindClass(root, student) {
  const rerender = () => {
    root.innerHTML = classMarkup(activeStudent() ?? student);
    bindClass(root, activeStudent() ?? student);
  };
  stopClassStatus?.();
  stopClassStatus = onSyncStatus(() => {
    const line = qs('[data-role="class-status"]', root);
    if (line && line.isConnected) line.textContent = classStatusText();
  });
  qs('[data-role="class-form"]', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = normalizeCode(event.currentTarget.elements.code.value);
    if (!isValidCode(code)) {
      qs('[data-role="class-status"]', root).textContent = 'O código tem 6 letras e números. Confira com o professor.';
      return;
    }
    setStudentTurma(student.id, code);
    rerender();
    await syncStudent(activeStudent());
  });
  qs('[data-role="class-leave"]', root)?.addEventListener('click', () => {
    setStudentTurma(student.id, null);
    rerender();
  });
}

export function showTitle() {
  const student = activeStudent();
  if (!student) {
    showProfiles();
    return;
  }
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
        <nav class="title-menu frame" aria-label="Menu principal">
          <p class="title-menu__who">Aluno: <b>${escapeHtml(student.name)}</b></p>
          <button type="button" class="btn btn--crystal" data-role="new">Novo jogo</button>
          <button type="button" class="btn" data-role="continue" ${state.player ? '' : 'disabled'}>Continuar${state.player ? ` como ${state.player.name}` : ''}</button>
          <button type="button" class="btn btn--ghost" data-role="journal">Diário</button>
          <button type="button" class="btn btn--ghost btn--small" data-role="switch">Trocar de perfil</button>
        </nav>
        <div class="title-panels">
          <details class="frame title-card" ${state.research.on ? 'open' : ''}>
            <summary>Modo Pesquisa</summary>
            <div class="stack" data-role="research">${researchMarkup()}</div>
          </details>
          <details class="frame title-card">
            <summary>Turma online</summary>
            <div class="stack" data-role="class">${classMarkup(student)}</div>
          </details>
          <details class="frame title-card">
            <summary>Opções</summary>
            <div class="stack" data-role="options">
              ${accessibilityMarkup()}
              <div class="row">
                <button type="button" class="btn btn--ghost btn--small" data-role="wipe">Apagar meu progresso</button>
                ${DEBUG ? '<button type="button" class="btn btn--ghost btn--small" data-role="debug">Debug: liberar regiões</button>' : ''}
              </div>
            </div>
          </details>
        </div>
        <p class="title-footer">Protótipo de pesquisa em Educação Matemática. O uso com estudantes depende de autorização institucional, consentimento dos responsáveis e assentimento dos participantes.</p>
      </main>
    </div>`;

  animateVillageBackground(qs('.screen__bg', app));
  bindResearch(qs('[data-role="research"]', app));
  bindAccessibility(qs('[data-role="options"]', app));
  bindClass(qs('[data-role="class"]', app), student);
  bindTeacherShortcut();

  qs('[data-role="new"]', app).addEventListener('click', () => {
    if (state.player && !confirm('Começar um novo jogo? O progresso atual será apagado. Os registros de pesquisa são mantidos.')) return;
    startNewGame();
    showCreate();
  });
  qs('[data-role="continue"]', app).addEventListener('click', () => {
    stopVillageBackground();
    showGame();
  });
  qs('[data-role="journal"]', app).addEventListener('click', openJournal);
  qs('[data-role="switch"]', app).addEventListener('click', () => {
    signOut();
    showProfiles();
  });
  qs('[data-role="wipe"]', app).addEventListener('click', () => {
    if (!confirm(`Apagar todo o progresso de ${student.name}? Exporte os dados de pesquisa antes.`)) return;
    resetStudent(student.id);
    showTitle();
  });
  qs('[data-role="debug"]', app)?.addEventListener('click', () => {
    state.dbg = true;
    saveState();
    if (!state.player) {
      showCreate();
      return;
    }
    stopVillageBackground();
    showGame();
  });
}
