/* NEXO — Registro técnico das missões: a tabela que aparece no rastreador do HUD */

import { escapeHtml } from '../core/dom.js';

/**
 * Tabela do Registro técnico. A última linha recebe destaque.
 * Cada célula pode ser um valor ou { value, tone: 'good'|'bad' }.
 */
export function registerTable(headers, rows, caption = 'Registro técnico') {
  const cell = (item) =>
    item && typeof item === 'object'
      ? `<td class="${item.tone ?? ''}">${escapeHtml(item.value)}</td>`
      : `<td>${escapeHtml(item)}</td>`;
  const body = rows.length
    ? rows.map((row, index) => `<tr class="${index === rows.length - 1 ? 'is-new' : ''}">${row.map(cell).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="muted">Ainda sem registros.</td></tr>`;
  return `<table class="ledger"><caption>${escapeHtml(caption)}</caption>
    <thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody></table>`;
}
