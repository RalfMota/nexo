/* NEXO — Janelas modais (Mapa, Diário, Itens, Opções) */

import { escapeHtml, qs, toElement } from '../core/dom.js';

let backdrop = null;
let onKeyDown = null;
let closeCallback = null;

export const isModalOpen = () => Boolean(backdrop);

/**
 * Abre uma janela e devolve o elemento do corpo, para a tela preencher.
 * @param {{ title: string, body?: string, wide?: boolean, onClose?: () => void }} options
 */
export function openModal({ title, body = '', wide = false, onClose }) {
  closeModal();
  backdrop = toElement(`
    <div class="modal-backdrop">
      <section class="modal frame ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__head">
          <h2 id="modal-title">${escapeHtml(title)}</h2>
          <button type="button" class="btn btn--ghost btn--small modal__close">Fechar</button>
        </header>
        <div class="modal__body">${body}</div>
      </section>
    </div>`);
  closeCallback = onClose ?? null;

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeModal();
  });
  qs('.modal__close', backdrop).addEventListener('click', closeModal);
  onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeModal();
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  document.body.appendChild(backdrop);
  qs('.modal__close', backdrop).focus({ preventScroll: true });
  return qs('.modal__body', backdrop);
}

export function closeModal() {
  if (!backdrop) return;
  backdrop.remove();
  backdrop = null;
  window.removeEventListener('keydown', onKeyDown, true);
  onKeyDown = null;
  const callback = closeCallback;
  closeCallback = null;
  callback?.();
}
