/* NEXO — Criador de personagem (Reconector)
 * Abas por camada do visual (Corpo, Cabelo, Roupa, Artefato), setas para estilos,
 * grades de cor e prévia animada num pedestal.
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';
import { state, saveState, activeStudent } from '../core/state.js';
import {
  PLAYER_ARTIFACTS, SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, HAIR_STYLES,
  TOP_STYLES, BOTTOM_STYLES, BOTTOM_COLORS, SHOE_COLORS, playerLook,
} from '../data/characters.js';
import { drawCharacter, drawPortrait } from '../art/characters.js';
import { animateVillageBackground, stopVillageBackground, showTitle } from './title-screen.js';
import { showGame } from './game-screen.js';

const DIRECTIONS = ['down', 'right', 'up', 'left'];

/** Estilos escolhidos com setas: campo do save → lista de opções. */
const STYLE_OPTIONS = { hairStyle: HAIR_STYLES, top: TOP_STYLES, bottom: BOTTOM_STYLES };

const TABS = [
  { id: 'body', name: 'Corpo' },
  { id: 'hair', name: 'Cabelo' },
  { id: 'outfit', name: 'Roupa' },
  { id: 'artifact', name: 'Artefato' },
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function showCreate() {
  const draft = {
    name: activeStudent()?.name ?? '',
    skin: SKIN_TONES[1],
    hairStyle: 'short',
    hair: HAIR_COLORS[0],
    top: 'tee',
    col: OUTFIT_COLORS[0],
    bottom: 'pants',
    bottomColor: BOTTOM_COLORS[0],
    shoes: SHOE_COLORS[0],
    av: 0,
  };

  const swatches = (field, colors, label) => `
    <div class="option">
      <span class="option__label">${label}</span>
      <div class="swatch-grid" role="group" aria-label="${label}">
        ${colors.map((color) => `<button type="button" class="swatch" data-field="${field}" data-value="${color}" style="background:${color}" aria-label="${label}: cor ${color}" aria-pressed="${draft[field] === color}"></button>`).join('')}
      </div>
    </div>`;

  const picker = (field, label) => `
    <div class="option">
      <span class="option__label">${label}</span>
      <div class="picker" data-picker="${field}">
        <button type="button" class="btn btn--ghost btn--icon btn--small" data-step="-1" aria-label="${label}: anterior">◀</button>
        <output aria-live="polite"></output>
        <button type="button" class="btn btn--ghost btn--icon btn--small" data-step="1" aria-label="${label}: próximo">▶</button>
      </div>
    </div>`;

  const panels = {
    body: swatches('skin', SKIN_TONES, 'Tom de pele'),
    hair: picker('hairStyle', 'Corte') + swatches('hair', HAIR_COLORS, 'Cor do cabelo'),
    outfit: picker('top', 'Parte de cima') + swatches('col', OUTFIT_COLORS, 'Cor de cima')
      + picker('bottom', 'Parte de baixo') + swatches('bottomColor', BOTTOM_COLORS, 'Cor de baixo')
      + swatches('shoes', SHOE_COLORS, 'Sapatos'),
    artifact: `
      <p class="muted">O artefato de origem acompanha você na jornada.</p>
      <div class="artifact-grid" role="group" aria-label="Artefato de origem">
        ${PLAYER_ARTIFACTS.map((artifact) => `
          <button type="button" class="artifact-card" data-field="av" data-value="${artifact.id}" aria-pressed="${draft.av === artifact.id}">
            <canvas width="96" height="96" aria-hidden="true"></canvas>
            <b>${escapeHtml(artifact.name)}</b>
            <small>${escapeHtml(artifact.text)}</small>
          </button>`).join('')}
      </div>`,
  };

  const app = qs('#app');
  app.innerHTML = `
    <div class="screen">
      <canvas class="screen__bg" aria-hidden="true"></canvas>
      <div class="screen__shade"></div>
      <main class="screen__content">
        <section class="creator frame" aria-labelledby="creator-title">
          <header class="creator__head">
            <h2 id="creator-title">Crie seu Reconector</h2>
            <p class="muted">Monte o visual de quem vai consertar o Nexo.</p>
          </header>
          <div class="creator__body">
            <div class="creator__stage">
              <div class="pedestal"><canvas width="320" height="320" aria-label="Prévia do personagem"></canvas></div>
              <div class="creator__turn">
                <button type="button" class="btn btn--ghost btn--icon btn--small" data-turn="-1" aria-label="Girar para a esquerda">◀</button>
                <span>girar</span>
                <button type="button" class="btn btn--ghost btn--icon btn--small" data-turn="1" aria-label="Girar para a direita">▶</button>
              </div>
              <label class="creator__name">
                <span class="option__label">Nome</span>
                <input id="player-name" maxlength="20" placeholder="Reconector" autocomplete="off" value="${escapeHtml(draft.name.slice(0, 20))}">
              </label>
            </div>
            <div class="creator__editor">
              <div class="tabs" role="tablist" aria-label="Partes do visual">
                ${TABS.map((tab, i) => `<button type="button" class="tab" role="tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${tab.name}</button>`).join('')}
              </div>
              ${TABS.map((tab, i) => `<div class="tab-panel" role="tabpanel" id="panel-${tab.id}" aria-labelledby="tab-${tab.id}" ${i === 0 ? '' : 'hidden'}>${panels[tab.id]}</div>`).join('')}
            </div>
          </div>
          <footer class="creator__foot">
            <button type="button" class="btn btn--ghost" data-role="back">Voltar</button>
            <span class="spacer"></span>
            <button type="button" class="btn btn--magic" data-role="random">Sortear visual</button>
            <button type="button" class="btn btn--crystal" data-role="start">Começar a jornada</button>
          </footer>
        </section>
      </main>
    </div>`;

  animateVillageBackground(qs('.screen__bg', app));
  const pedestal = qs('.pedestal', app);

  /* Abas (setas do teclado trocam de aba, como em um tablist padrão) */
  const tabs = qsa('[role="tab"]', app);
  const selectTab = (tab) => {
    for (const other of tabs) {
      const active = other === tab;
      other.setAttribute('aria-selected', String(active));
      other.tabIndex = active ? 0 : -1;
      qs(`#${other.getAttribute('aria-controls')}`, app).hidden = !active;
    }
    tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      selectTab(tabs[(index + step + tabs.length) % tabs.length]);
    });
  });

  /* Atualiza tudo o que mostra o visual */
  function refresh() {
    for (const button of qsa('[data-field]', app)) {
      const value = button.dataset.field === 'av' ? Number(button.dataset.value) : button.dataset.value;
      button.setAttribute('aria-pressed', String(draft[button.dataset.field] === value));
    }
    for (const control of qsa('[data-picker]', app)) {
      const field = control.dataset.picker;
      qs('output', control).textContent = STYLE_OPTIONS[field].find((option) => option.id === draft[field]).name;
    }
    qsa('.artifact-card canvas', app).forEach((canvas, index) => {
      drawPortrait(canvas, playerLook({ ...draft, av: index }), 'happy', draft.col);
    });
    pedestal.classList.remove('is-changed');
    void pedestal.offsetWidth;
    pedestal.classList.add('is-changed');
  }

  for (const button of qsa('[data-field]', app)) {
    button.addEventListener('click', () => {
      const field = button.dataset.field;
      draft[field] = field === 'av' ? Number(button.dataset.value) : button.dataset.value;
      refresh();
    });
  }
  for (const control of qsa('[data-picker]', app)) {
    const field = control.dataset.picker;
    const options = STYLE_OPTIONS[field];
    for (const button of qsa('[data-step]', control)) {
      button.addEventListener('click', () => {
        const index = options.findIndex((option) => option.id === draft[field]);
        draft[field] = options[(index + Number(button.dataset.step) + options.length) % options.length].id;
        refresh();
      });
    }
  }
  qs('[data-role="random"]', app).addEventListener('click', () => {
    Object.assign(draft, {
      skin: pick(SKIN_TONES),
      hairStyle: pick(HAIR_STYLES).id,
      hair: pick(HAIR_COLORS),
      top: pick(TOP_STYLES).id,
      col: pick(OUTFIT_COLORS),
      bottom: pick(BOTTOM_STYLES).id,
      bottomColor: pick(BOTTOM_COLORS),
      shoes: pick(SHOE_COLORS),
      av: pick(PLAYER_ARTIFACTS).id,
    });
    refresh();
  });

  /* Prévia: o personagem anda no lugar e gira sozinho até o jogador girar com as setas */
  const preview = qs('.pedestal canvas', app);
  const ctx = preview.getContext('2d');
  let directionIndex = 0;
  let frameId = 0;
  let step = 0;
  let last = 0;
  let sinceTurn = 0;
  let manual = false;
  for (const button of qsa('[data-turn]', app)) {
    button.addEventListener('click', () => {
      manual = true;
      directionIndex = (directionIndex + Number(button.dataset.turn) + DIRECTIONS.length) % DIRECTIONS.length;
    });
  }
  const draw = (now) => {
    frameId = requestAnimationFrame(draw);
    if (!preview.isConnected) {
      cancelAnimationFrame(frameId);
      return;
    }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    step += dt * 6;
    sinceTurn += dt;
    if (!manual && sinceTurn > 1.6) {
      sinceTurn = 0;
      directionIndex = (directionIndex + 1) % DIRECTIONS.length;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 320, 320);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(5, 0, 0, 5, 0, 0);
    drawCharacter(ctx, 32, 58, playerLook(draft), { dir: DIRECTIONS[directionIndex], step, moving: true });
  };
  frameId = requestAnimationFrame(draw);

  qs('[data-role="back"]', app).addEventListener('click', () => {
    cancelAnimationFrame(frameId);
    showTitle();
  });
  qs('[data-role="start"]', app).addEventListener('click', () => {
    cancelAnimationFrame(frameId);
    state.player = { ...draft, name: qs('#player-name', app).value.trim() || 'Reconector' };
    saveState();
    stopVillageBackground();
    showGame();
  });

  refresh();
  qs('#player-name', app).focus();
}
