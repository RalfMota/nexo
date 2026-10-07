/* NEXO — Tela de título do aluno: novo jogo, continuar, trocar de perfil, Modo Pesquisa e opções */

import { qs, escapeHtml } from '../core/dom.js';
import { state, DEBUG, saveState, startNewGame, activeStudent, resetStudent, signOut } from '../core/state.js';
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
