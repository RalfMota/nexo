/* NEXO — Tela de jogo: monta mundo, HUD, diálogo e camada de missões; atalhos de teclado */

import { qs, isTypingTarget } from '../core/dom.js';
import { state } from '../core/state.js';
import { runtime } from '../core/runtime.js';
import { startWorld, stopWorld } from '../world/world.js';
import { leaveMission } from '../game/session.js';
import { hudMarkup, mountHud, setWeatherLabel } from './hud.js';
import { onWeatherChange } from '../world/weather.js';
import { mountDialogue, closeDialogue, isDialogueOpen } from './dialogue.js';
import { mountMissionLayer } from './mission-view.js';
import { openModal, closeModal, isModalOpen } from './modal.js';
import { openMapView } from './map-view.js';
import { openJournal } from './journal.js';
import { toggleCalculator, closeCalculator, toggleCompass, openInventory } from './tools.js';
import { accessibilityMarkup, bindAccessibility } from './options.js';
import { showTitle } from './title-screen.js';

const SHORTCUTS = { m: 'map', j: 'journal', i: 'items', c: 'calculator', q: 'compass', escape: 'menu' };

let onShortcut = null;
let stopWeatherLabel = null;

export function showGame() {
  const app = qs('#app');
  app.innerHTML = `
    <div class="game">
      <div class="game__world" role="img" aria-label="Vila de Nexo. Ande com WASD ou setas, ou clique no destino. Pressione E perto de alguém ou de uma porta para conversar ou entrar."></div>
      ${hudMarkup()}
      <div class="touch-pad" aria-hidden="true">
        <button type="button" class="up" data-key="w">▲</button>
        <button type="button" class="left" data-key="a">◀</button>
        <button type="button" class="right" data-key="d">▶</button>
        <button type="button" class="down" data-key="s">▼</button>
      </div>
      <button type="button" class="btn btn--crystal touch-action" aria-label="Interagir">E</button>
      <div class="dialogue frame" hidden></div>
      <div class="mission-layer"></div>
    </div>`;

  const game = qs('.game', app);
  mountDialogue(qs('.dialogue', game));
  mountMissionLayer(qs('.mission-layer', game));
  mountHud(game, runAction);
  stopWeatherLabel = onWeatherChange((weather) => setWeatherLabel(`${weather.icon} ${weather.label}`));
  startWorld(qs('.game__world', game), {
    touchPad: qs('.touch-pad', game),
    touchAction: qs('.touch-action', game),
    gameElement: game,
  });

  onShortcut = (event) => {
    if (isTypingTarget(event.target) || isModalOpen() || isDialogueOpen()) return;
    const action = SHORTCUTS[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    runAction(action);
  };
  window.addEventListener('keydown', onShortcut);
}

function leaveGame() {
  stopWorld();
  stopWeatherLabel?.();
  window.removeEventListener('keydown', onShortcut);
  onShortcut = null;
  closeCalculator();
  closeModal();
  closeDialogue();
}

const hasItem = (name) => state.inv.includes(name);

function runAction(action) {
  switch (action) {
    case 'map':
      return openMapView();
    case 'journal':
      return openJournal();
    case 'items':
      return openInventory();
    case 'calculator':
      return hasItem('Calculador Arcano') && toggleCalculator();
    case 'compass':
      return hasItem('Compasso de Nexo') && toggleCompass();
    case 'menu':
      return openPauseMenu();
    default:
      return undefined;
  }
}

function openPauseMenu() {
  const body = openModal({
    title: 'Pausa',
    body: `
      <div class="stack">
        <div class="row">
          <button type="button" class="btn btn--crystal" data-role="resume">Continuar</button>
          <button type="button" class="btn btn--ghost" data-role="title">Voltar ao título</button>
        </div>
        <h3>Opções</h3>
        ${accessibilityMarkup()}
        <h3>Controles</h3>
        <p class="small">
          <b>WASD</b> ou <b>setas</b>: andar · <b>clique</b> ou <b>toque</b>: andar até o ponto ·
          <b>E</b>: conversar e interagir · <b>M</b>: mapa · <b>J</b>: diário · <b>I</b>: itens ·
          <b>C</b>: calculador · <b>Q</b>: compasso · <b>Esc</b>: pausa
        </p>
      </div>`,
  });
  bindAccessibility(body);
  qs('[data-role="resume"]', body).addEventListener('click', closeModal);
  qs('[data-role="title"]', body).addEventListener('click', goToTitle);
}

function goToTitle() {
  const session = runtime.session;
  if (session && !session.done && !confirm('Sair da missão? A tentativa atual será perdida.')) return;
  leaveMission();
  leaveGame();
  showTitle();
}

