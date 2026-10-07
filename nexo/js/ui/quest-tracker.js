/* NEXO — Rastreador de missão de mundo
 *
 * Substitui a janela de missão quando a missão acontece no próprio mapa.
 * Fica preso ao HUD (não cobre o mundo): etapa atual, o que fazer agora, a última fala
 * do personagem, dicas, Registro técnico e a opção de desistir.
 * Tem a mesma interface da janela de missão (say, showHint, setNotebook, complete, close).
 */

import { escapeHtml, qs, qsa, toElement } from '../core/dom.js';
import { drawPortrait } from '../art/characters.js';
import { tileFoot } from '../world/map.js';
import { showBubble, burst } from '../world/quest-layer.js';
import { getPlayerPosition } from '../world/world.js';

const TONES = { ok: 'happy', warn: 'worried', hint: 'thinking' };
const AUTO_CLOSE_SECONDS = 6;

export function openQuestTracker({ mission, region, npc, onHint, onLeave }) {
  const game = qs('.game');
  const stages = mission.stages ?? [];
  const tracker = toElement(`
    <aside class="quest-tracker" style="--accent:${region.accent}" aria-label="Missão em andamento: ${escapeHtml(mission.title)}">
      <header class="quest-tracker__head">
        <span class="quest-tracker__region">${escapeHtml(region.name)}</span>
        <h2>${escapeHtml(mission.title)}</h2>
        <button type="button" class="quest-tracker__fold" data-role="fold" aria-expanded="true" aria-label="Recolher o rastreador">▾</button>
      </header>
      ${stages.length ? `<ol class="quest-tracker__stages">${stages.map((label) => `<li>${escapeHtml(label)}</li>`).join('')}</ol>` : ''}
      <p class="quest-tracker__objective" aria-live="polite"></p>
      <div class="quest-tracker__npc">
        <canvas width="64" height="64" aria-hidden="true"></canvas>
        <p aria-live="polite"><b>${escapeHtml(npc.name)}:</b> <span></span></p>
      </div>
      <ol class="quest-tracker__hints" aria-label="Dicas recebidas"></ol>
      <details class="quest-tracker__notebook"><summary>Registro técnico</summary><div></div></details>
      <div class="quest-tracker__actions">
        <button type="button" class="btn btn--magic btn--small" data-role="hint">Pedir dica</button>
        <button type="button" class="btn btn--ghost btn--small" data-role="leave">Desistir</button>
      </div>
    </aside>`);
  game.appendChild(tracker);
  game.classList.add('has-quest');

  const portrait = qs('canvas', tracker);
  const speech = qs('.quest-tracker__npc span', tracker);
  const npcFoot = tileFoot(npc.tile);
  let lastLine = mission.greeting ?? '';
  let closeTimer = 0;

  const fold = qs('[data-role="fold"]', tracker);
  fold.addEventListener('click', () => {
    const collapsed = tracker.classList.toggle('is-collapsed');
    fold.setAttribute('aria-expanded', String(!collapsed));
    fold.setAttribute('aria-label', collapsed ? 'Abrir o rastreador' : 'Recolher o rastreador');
  });
  qs('[data-role="hint"]', tracker).addEventListener('click', onHint);
  qs('[data-role="leave"]', tracker).addEventListener('click', onLeave);

  function say(text, tone = '') {
    lastLine = text;
    speech.textContent = text;
    tracker.dataset.tone = tone;
    drawPortrait(portrait, npc.look, TONES[tone] ?? 'neutral', region.accent);
    showBubble(npcFoot.x, npcFoot.y - 54, text);
    tracker.classList.remove('is-pulsing');
    void tracker.offsetWidth;
    tracker.classList.add('is-pulsing');
  }

  function setObjective(text) {
    qs('.quest-tracker__objective', tracker).textContent = text;
  }

  function setStage(index) {
    qsa('.quest-tracker__stages li', tracker).forEach((item, i) => {
      item.className = i < index ? 'done' : i === index ? 'current' : '';
    });
  }

  function showHint(level, text, automatic) {
    const list = qs('.quest-tracker__hints', tracker);
    if (!qsa('li', list)[level - 1]) {
      const item = document.createElement('li');
      item.innerHTML = `<b>Dica ${level}${automatic ? ' (automática)' : ''}:</b> ${escapeHtml(text)}`;
      list.appendChild(item);
    }
    if (!automatic) say(text, 'hint');
  }

  function setNotebook(html) {
    qs('.quest-tracker__notebook div', tracker).innerHTML = html;
  }

  function complete(message) {
    say(message, 'ok');
    setObjective('Missão concluída!');
    setStage(stages.length);
    tracker.classList.add('is-complete');
    const player = getPlayerPosition();
    burst(player.x, player.y - 30, 'success', 26);
    const leave = qs('[data-role="leave"]', tracker);
    leave.textContent = 'Fechar';
    qs('[data-role="hint"]', tracker).disabled = true;
    closeTimer = setTimeout(onLeave, AUTO_CLOSE_SECONDS * 1000);
  }

  function close() {
    clearTimeout(closeTimer);
    game.classList.remove('has-quest');
    tracker.classList.add('is-leaving');
    setTimeout(() => tracker.remove(), 200);
  }

  /** O jogador falou de novo com o personagem: ele repete a última orientação. */
  function repeat() {
    say(lastLine);
  }

  say(lastLine);
  return { say, setObjective, setStage, showHint, setNotebook, complete, close, repeat, stage: null };
}
