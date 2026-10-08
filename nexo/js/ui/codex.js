/* NEXO — Códice das Leis do Nexo (tecla K): as regras descobertas, usáveis como ferramenta,
 * e as páginas do Diário da Ruptura encontradas até agora.
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';
import { LAWS, PAGES } from '../data/codex.js';
import { MISSIONS } from '../missions/index.js';
import { regionById } from '../data/regions.js';
import { isMissionDone, isRegionDone } from '../game/progress.js';
import { logEvent } from '../core/research-log.js';
import { countCalculatorUse } from '../game/session.js';
import { openModal } from './modal.js';

export const unlockedLaws = () => LAWS.filter((law) => isMissionDone(law.mission));
export const foundPages = () => PAGES.filter((page) => isRegionDone(regionById(page.region)));

/** Usa uma lei: calcula, conta como uso do Calculador Arcano e registra para a pesquisa. */
export function applyLaw(law, value) {
  const x = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(x)) return '—';
  const result = law.apply(x);
  countCalculatorUse();
  logEvent('calculator_use', { lei: law.id, entrada: x });
  return result;
}

export function openCodex() {
  const laws = LAWS.map((law) => {
    if (!isMissionDone(law.mission)) {
      return `<li class="codex-law is-locked"><b>???</b><span class="small muted">Conclua “${escapeHtml(MISSIONS[law.mission]?.title ?? law.mission)}” para descobrir esta lei.</span></li>`;
    }
    return `
      <li class="codex-law" data-law="${law.id}">
        <b>${escapeHtml(law.title)}</b>
        <code>${escapeHtml(law.rule)}</code>
        <span class="row">
          <label class="small">${escapeHtml(law.input)} <input type="number" step="any" min="0" aria-label="${escapeHtml(law.input)}"></label>
          <button type="button" class="btn btn--crystal btn--small">usar a lei</button>
          <output class="small" aria-live="polite"></output>
        </span>
      </li>`;
  }).join('');

  const pages = foundPages();
  const diary = pages.length
    ? pages.map((page, i) => `<details ${i === pages.length - 1 ? 'open' : ''}><summary>${escapeHtml(page.title)}</summary><p>${escapeHtml(page.text)}</p></details>`).join('')
    : '<p class="muted small">Nenhuma página ainda. Elas aparecem quando você reconecta uma região.</p>';

  const body = openModal({
    title: 'Códice das Leis do Nexo',
    wide: true,
    body: `
      <div class="codex">
        <section>
          <h3>Leis descobertas (${unlockedLaws().length} de ${LAWS.length})</h3>
          <p class="small muted">Cada regra que você descobre vira uma ferramenta: escolha um valor e a lei calcula para você. Também dá para usar as leis no Calculador Arcano (tecla C).</p>
          <ul class="codex-laws">${laws}</ul>
        </section>
        <section>
          <h3>Diário da Ruptura (${pages.length} de ${PAGES.length} páginas)</h3>
          <p class="small muted">Alguém deixou páginas espalhadas pelo Nexo. Quem rompeu o Núcleo?</p>
          ${diary}
        </section>
      </div>`,
  });

  qsa('[data-law]', body).forEach((item) => {
    const law = LAWS.find((entry) => entry.id === item.dataset.law);
    const input = qs('input', item);
    const output = qs('output', item);
    const run = () => {
      output.textContent = input.value === '' ? 'digite um valor' : applyLaw(law, input.value);
    };
    qs('button', item).addEventListener('click', run);
    input.addEventListener('keydown', (event) => event.key === 'Enter' && run());
  });
}
