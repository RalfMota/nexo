/* NEXO — Caixa de diálogo no mundo (retrato, fala com efeito de digitação e escolhas) */

import { CHARACTERS } from '../data/characters.js';
import { REGIONS } from '../data/regions.js';
import { drawPortrait } from '../art/characters.js';
import { escapeHtml, qs } from '../core/dom.js';
import { prefersCalm } from '../core/state.js';

let container = null;
let typingTimer = 0;
let onKeyDown = null;

export function mountDialogue(element) {
  container = element;
}

export const isDialogueOpen = () => Boolean(container && !container.hidden);

const accentFor = (npcId) => REGIONS.find((region) => region.npc === npcId)?.accent ?? '#8a5a33';

/**
 * Mostra uma fala.
 * @param {{ npcId?: string, speaker?: { name: string, role: string, look: object, accent: string },
 *           title?: string, text: string,
 *           choices?: { label: string, done?: boolean, onSelect?: () => void }[] }} options
 *   npcId: personagem de missão; speaker: qualquer outro falante com retrato (moradores).
 */
export function showDialogue({ npcId, speaker, title, text, choices = [{ label: 'Fechar' }] }) {
  if (!container) return;
  const npc = npcId ? CHARACTERS[npcId] : speaker ?? null;
  const accent = npcId ? accentFor(npcId) : speaker?.accent ?? '#8a5a33';
  container.style.setProperty('--accent', accent);
  container.classList.toggle('dialogue--plain', !npc);
  container.innerHTML = `
    ${npc ? '<canvas class="portrait" width="128" height="128" aria-hidden="true"></canvas>' : ''}
    <div class="dialogue__body">
      <span class="dialogue__name">${escapeHtml(npc ? npc.name : title)}</span>
      ${npc ? `<span class="dialogue__role">${escapeHtml(npc.role)}</span>` : ''}
      <p class="dialogue__text" aria-live="polite"></p>
      <div class="dialogue__choices"></div>
    </div>`;

  if (npc) drawPortrait(qs('canvas', container), npc.look, 'neutral', accent);

  const choiceBox = qs('.dialogue__choices', container);
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--small ${index === choices.length - 1 && choices.length > 1 ? 'btn--ghost' : ''} ${choice.done ? 'done' : ''}`;
    button.textContent = choice.label;
    button.addEventListener('click', () => {
      closeDialogue();
      choice.onSelect?.();
    });
    choiceBox.appendChild(button);
  });

  typeText(qs('.dialogue__text', container), text);
  container.hidden = false;

  onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialogue();
      return;
    }
    const number = Number(event.key);
    if (number >= 1 && number <= choices.length) {
      event.preventDefault();
      choiceBox.children[number - 1].click();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  choiceBox.firstElementChild?.focus({ preventScroll: true });
}

function typeText(element, text) {
  clearInterval(typingTimer);
  if (prefersCalm()) {
    element.textContent = text;
    return;
  }
  let shown = 0;
  element.textContent = '';
  element.setAttribute('aria-label', text);
  element.onclick = () => {
    shown = text.length;
  };
  typingTimer = setInterval(() => {
    shown = Math.min(text.length, shown + 2);
    element.textContent = text.slice(0, shown);
    if (shown >= text.length) clearInterval(typingTimer);
  }, 16);
}

export function closeDialogue() {
  if (!container) return;
  clearInterval(typingTimer);
  container.hidden = true;
  container.innerHTML = '';
  if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
  onKeyDown = null;
}
