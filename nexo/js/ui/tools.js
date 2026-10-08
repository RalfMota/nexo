/* NEXO — Ferramentas da barra: Calculador Arcano, Compasso de Nexo e Itens */

import { qs, toElement } from '../core/dom.js';
import { state } from '../core/state.js';
import { logEvent } from '../core/research-log.js';
import { countCalculatorUse } from '../game/session.js';
import { openModal } from './modal.js';
import { refreshHud } from './hud.js';
import { ICONS } from './icons.js';
import { unlockedLaws, applyLaw } from './codex.js';
import { escapeHtml } from '../core/dom.js';

const ITEMS = {
  'Compasso de Nexo': { icon: ICONS.compass, text: 'Destaca o que pode ser tocado, no mundo e nas missões. Tecla Q.' },
  'Calculador Arcano': { icon: ICONS.calculator, text: 'Faz as quatro operações e usa as leis do Códice. Tecla C.' },
};

let calculator = null;

export function toggleCalculator() {
  if (calculator) {
    closeCalculator();
    return;
  }
  calculator = toElement(`
    <section class="calculator frame" aria-label="Calculador Arcano">
      <div class="row"><h3>Calculador Arcano</h3><span class="spacer"></span>
        <button type="button" class="btn btn--ghost btn--small" data-role="close" aria-label="Fechar calculador">×</button></div>
      <div class="row">
        <input id="calc-a" type="number" step="any" aria-label="Primeiro número">
        <select id="calc-op" aria-label="Operação"><option>+</option><option>−</option><option>×</option><option>÷</option></select>
        <input id="calc-b" type="number" step="any" aria-label="Segundo número">
        <button type="button" class="btn btn--crystal btn--small" id="calc-go">=</button>
        <output id="calc-out" aria-live="polite">—</output>
      </div>
      ${lawsRow()}
    </section>`);
  (qs('.game') ?? document.body).appendChild(calculator);

  const compute = () => {
    const a = Number(qs('#calc-a', calculator).value);
    const b = Number(qs('#calc-b', calculator).value);
    const o = qs('#calc-op', calculator).value;
    const operations = { '+': a + b, '−': a - b, '×': a * b, '÷': b ? a / b : NaN };
    const value = operations[o];
    qs('#calc-out', calculator).textContent = Number.isNaN(value) ? '—' : Math.round(value * 1e6) / 1e6;
    countCalculatorUse();
    logEvent('calculator_use', { a, o, b });
  };
  qs('#calc-go', calculator).addEventListener('click', compute);
  qs('#calc-b', calculator).addEventListener('keydown', (event) => event.key === 'Enter' && compute());
  qs('[data-role="close"]', calculator).addEventListener('click', closeCalculator);
  const lawSelect = qs('#calc-law', calculator);
  if (lawSelect) {
    const runLaw = () => {
      const law = unlockedLaws().find((item) => item.id === lawSelect.value);
      const value = qs('#calc-law-in', calculator).value;
      qs('#calc-law-out', calculator).textContent = law && value !== '' ? applyLaw(law, value) : '—';
    };
    qs('#calc-law-go', calculator).addEventListener('click', runLaw);
    qs('#calc-law-in', calculator).addEventListener('keydown', (event) => event.key === 'Enter' && runLaw());
  }
  qs('#calc-a', calculator).focus();
}

/** Linha "usar uma lei" do Calculador (só aparece depois da primeira lei descoberta). */
function lawsRow() {
  const laws = unlockedLaws();
  if (!laws.length) return '';
  return `
      <div class="row">
        <select id="calc-law" aria-label="Lei do Códice">${laws.map((law) => `<option value="${law.id}">${escapeHtml(law.title)}: ${escapeHtml(law.rule)}</option>`).join('')}</select>
        <input id="calc-law-in" type="number" step="any" min="0" aria-label="Entrada da lei">
        <button type="button" class="btn btn--crystal btn--small" id="calc-law-go">usar a lei</button>
        <output id="calc-law-out" aria-live="polite">—</output>
      </div>`;
}

export function closeCalculator() {
  calculator?.remove();
  calculator = null;
}

export function toggleCompass() {
  document.body.classList.toggle('compass');
  logEvent('interaction', { compasso: document.body.classList.contains('compass') });
  refreshHud();
}

export function openInventory() {
  const body = state.inv.length
    ? `<div class="items">${state.inv.map((name) => `
        <div class="item">${ITEMS[name]?.icon ?? ICONS.crystal}<div><b>${name}</b><p class="small muted">${ITEMS[name]?.text ?? ''}</p></div></div>`).join('')}</div>`
    : '<p>Vazio por enquanto. Conclua o prólogo para receber seus artefatos.</p>';
  openModal({ title: 'Itens', body });
}
