/* NEXO — Avisos rápidos no topo da tela (itens recebidos, regiões abertas) */

import { escapeHtml } from '../core/dom.js';

let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.className = 'toasts';
  container.setAttribute('role', 'status');
  document.body.appendChild(container);
  return container;
}

export function showToast(title, text = '', duration = 3600) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span aria-hidden="true">✦</span><span><b>${escapeHtml(title)}</b> ${escapeHtml(text)}</span>`;
  ensureContainer().appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}
