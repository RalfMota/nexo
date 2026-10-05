/* NEXO — Janela de missão: a cena ocupa o centro; ao lado, o personagem e o caderno
 * O contexto longo e o objetivo escrito ficam fora da tela (seguem no Diário, na Visão pedagógica).
 */

import { escapeHtml, qs, qsa } from '../core/dom.js';
import { drawPortrait } from '../art/characters.js';

const MOODS = { ok: 'happy', warn: 'worried', hint: 'thinking' };

let layer = null;

export function mountMissionLayer(element) {
  layer = element;
}

/**
 * Abre a janela e devolve os controles que a sessão usa.
 * @returns {{ stage: HTMLElement, say: Function, showHint: Function, setNotebook: Function, complete: Function, close: Function }}
 */
export function openMissionView({ mission, region, npc, onHint, onLeave, onNext }) {
  layer.innerHTML = `
    <section class="mission frame" style="--accent:${region.accent}" role="dialog" aria-labelledby="mission-title">
      <header class="mission__head">
        <span class="mission__region">${escapeHtml(region.name)}</span>
        <h2 id="mission-title">${escapeHtml(mission.title)}</h2>
        <button type="button" class="btn btn--ghost btn--small" data-role="leave">Voltar à vila</button>
      </header>
      <div class="mission__body">
        <div class="mission__play">
          <div class="mission__stage"></div>
          <div class="mission-complete" role="status">
            <b>Missão concluída</b>
            <span class="spacer"></span>
            <button type="button" class="btn btn--crystal" data-role="next" hidden>Próxima missão</button>
            <button type="button" class="btn" data-role="back">Voltar à vila</button>
          </div>
        </div>
        <aside class="mission__side">
          <div class="mission__npc-id">
            <canvas class="portrait" width="128" height="128" aria-hidden="true"></canvas>
            <div><b>${escapeHtml(npc.name)}</b><small>${escapeHtml(npc.role)}</small></div>
          </div>
          <div class="speech" aria-live="polite"><p></p></div>
          <button type="button" class="btn btn--magic btn--small" data-role="hint">Pedir dica</button>
          <ol class="hints" aria-label="Dicas recebidas"></ol>
          <div class="notebook" aria-live="polite"></div>
        </aside>
      </div>
    </section>`;

  const section = qs('.mission', layer);
  const portrait = qs('.portrait', section);
  const speech = qs('.speech', section);
  const hintList = qs('.hints', section);
  const notebook = qs('.notebook', section);
  const stage = qs('.mission__stage', section);
  let nextId = null;

  const setMood = (mood) => drawPortrait(portrait, npc.look, mood, region.accent);

  qs('[data-role="leave"]', section).addEventListener('click', onLeave);
  qs('[data-role="back"]', section).addEventListener('click', onLeave);
  qs('[data-role="hint"]', section).addEventListener('click', onHint);
  qs('[data-role="next"]', section).addEventListener('click', () => nextId && onNext(nextId));

  function say(text, tone = '') {
    qs('p', speech).textContent = text;
    speech.className = `speech ${tone ? `tone-${tone}` : ''}`;
    setMood(MOODS[tone] ?? 'neutral');
  }

  /** Mostra a dica do nível indicado. Dicas automáticas (após erros) não substituem a fala. */
  function showHint(level, text, automatic) {
    const existing = qsa('li', hintList)[level - 1];
    if (existing) {
      existing.style.animation = 'none';
      void existing.offsetWidth;
      existing.style.animation = '';
    } else {
      const item = document.createElement('li');
      item.innerHTML = `<b>Dica ${level}${automatic ? ' (automática)' : ''}:</b> ${escapeHtml(text)}`;
      hintList.appendChild(item);
    }
    if (!automatic) say(text, 'hint');
  }

  function setNotebook(html) {
    notebook.innerHTML = html;
  }

  function complete(message, nextMissionId) {
    say(message, 'ok');
    section.classList.add('is-complete');
    qsa('button, input, select', stage).forEach((element) => {
      element.disabled = true;
    });
    qs('[data-role="hint"]', section).disabled = true;
    nextId = nextMissionId;
    const nextButton = qs('[data-role="next"]', section);
    nextButton.hidden = !nextMissionId;
    (nextMissionId ? nextButton : qs('[data-role="back"]', section)).focus({ preventScroll: true });
  }

  function close() {
    layer.innerHTML = '';
  }

  say(mission.greeting ?? 'Vamos lá.');
  return { stage, say, showHint, setNotebook, complete, close };
}
