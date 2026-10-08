/* NEXO — HUD: cartão do jogador, objetivo atual e barra de ferramentas */

import { state } from '../core/state.js';
import { escapeHtml, qs, qsa } from '../core/dom.js';
import { playerLook } from '../data/characters.js';
import { REGIONS } from '../data/regions.js';
import { drawPortrait } from '../art/characters.js';
import { objectiveText, isRegionDone } from '../game/progress.js';
import { ICONS } from './icons.js';

/** Ferramentas da barra inferior. "needs" indica o artefato exigido. */
export const TOOLS = [
  { action: 'map', key: 'M', label: 'Mapa', icon: ICONS.map },
  { action: 'journal', key: 'J', label: 'Diário', icon: ICONS.journal },
  { action: 'items', key: 'I', label: 'Itens', icon: ICONS.items },
  { action: 'codex', key: 'K', label: 'Códice', icon: ICONS.codex },
  { action: 'calculator', key: 'C', label: 'Calcular', icon: ICONS.calculator, needs: 'Calculador Arcano' },
  { action: 'compass', key: 'Q', label: 'Compasso', icon: ICONS.compass, needs: 'Compasso de Nexo' },
  { action: 'menu', key: 'Esc', label: 'Menu', icon: ICONS.menu },
];

let root = null;

export function hudMarkup() {
  return `
    <div class="hud">
      <div class="hud-card">
        <canvas width="96" height="96" aria-hidden="true"></canvas>
        <div>
          <span class="hud-card__name"></span>
          <span class="hud-card__zone"></span>
          <span class="hud-card__weather" aria-live="polite"></span>
        </div>
      </div>
      <div class="hud-quest" aria-live="polite">
        <span class="hud-quest__label">Objetivo</span>
        <span class="hud-quest__text"></span>
        <div class="hud-quest__progress" aria-hidden="true"></div>
      </div>
    </div>
    <nav class="hotbar" aria-label="Ferramentas">
      ${TOOLS.map((tool) => `
        <button type="button" class="slot" data-action="${tool.action}" title="${tool.label} (${tool.key})">
          <kbd>${tool.key}</kbd>${tool.icon}<span>${tool.label}</span>
        </button>`).join('')}
    </nav>`;
}

/** Liga o HUD já inserido na tela de jogo. */
export function mountHud(gameElement, onAction) {
  root = gameElement;
  for (const button of qsa('.hotbar .slot', root)) {
    button.addEventListener('click', () => onAction(button.dataset.action));
  }
  refreshHud();
}

export function refreshHud() {
  if (!root || !root.isConnected) return;
  const player = state.player;
  qs('.hud-card__name', root).textContent = player?.name ?? '';
  drawPortrait(qs('.hud-card canvas', root), playerLook(player), 'happy', player?.col ?? '#5fe3d0');

  qs('.hud-quest__text', root).textContent = objectiveText();
  qs('.hud-quest__progress', root).innerHTML = REGIONS.map(
    (region) => `<i class="${isRegionDone(region) ? 'done' : ''}" title="${escapeHtml(region.name)}"></i>`,
  ).join('');

  for (const tool of TOOLS) {
    const slot = qs(`.slot[data-action="${tool.action}"]`, root);
    slot.disabled = Boolean(tool.needs) && !state.inv.includes(tool.needs);
  }
  qs('.slot[data-action="compass"]', root).setAttribute('aria-pressed', String(document.body.classList.contains('compass')));
}

export function setWeatherLabel(text) {
  if (!root || !root.isConnected) return;
  qs('.hud-card__weather', root).textContent = text;
}

export function setZoneName(name) {
  if (!root || !root.isConnected) return;
  qs('.hud-card__zone', root).textContent = name;
}
