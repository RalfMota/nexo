/* NEXO — Opções de acessibilidade e Modo Pesquisa (usados na tela de título e na pausa) */

import { state, saveState, applySettings } from '../core/state.js';
import { escapeHtml, qs } from '../core/dom.js';
import { exportResearchData, researchSummary } from '../core/research-log.js';
import { musicSettings, setMusicEnabled, setMusicVolume } from '../core/music.js';

export function accessibilityMarkup() {
  return `
    <label class="row"><input type="checkbox" data-setting="big" ${state.set.big ? 'checked' : ''}> Texto maior</label>
    <label class="row"><input type="checkbox" data-setting="calm" ${state.set.calm ? 'checked' : ''}> Reduzir animações</label>
    <label class="row"><input type="checkbox" data-music="on" ${musicSettings().on ? 'checked' : ''}> Música</label>
    <label class="row">Volume <input type="range" data-music="volume" min="0" max="100" value="${Math.round(musicSettings().volume * 100)}" aria-label="Volume da música"></label>`;
}

export function bindAccessibility(root) {
  root.querySelector('[data-music="on"]')?.addEventListener('change', (event) => setMusicEnabled(event.target.checked));
  root.querySelector('[data-music="volume"]')?.addEventListener('input', (event) => setMusicVolume(Number(event.target.value) / 100));
  root.querySelectorAll('[data-setting]').forEach((input) => {
    input.addEventListener('change', () => {
      state.set[input.dataset.setting] = input.checked;
      applySettings();
      saveState();
    });
  });
}

export function researchMarkup() {
  return `
    <label class="row"><input type="checkbox" id="research-on" ${state.research.on ? 'checked' : ''}> Registrar os dados desta sessão</label>
    <label class="field">ID do participante <input id="research-id" maxlength="20" value="${escapeHtml(state.research.id)}" autocomplete="off"></label>
    <p class="small muted">Use apenas um código, sem nome, CPF, e-mail ou telefone. Os dados ficam neste navegador: exporte ao final de cada sessão.</p>
    <p class="small" id="research-message" role="status"></p>
    <div class="row">
      <button type="button" class="btn btn--ghost btn--small" data-export="json">Exportar JSON</button>
      <button type="button" class="btn btn--ghost btn--small" data-export="csv">Exportar CSV</button>
    </div>`;
}

export function bindResearch(root) {
  const toggle = qs('#research-on', root);
  const idInput = qs('#research-id', root);
  const message = qs('#research-message', root);

  const update = () => {
    const id = idInput.value.trim().replace(/[^\w-]/g, '');
    if (toggle.checked && !id) {
      toggle.checked = false;
      message.textContent = 'Informe um ID para ativar o Modo Pesquisa.';
      state.research = { ...state.research, on: false, id: '' };
    } else {
      state.research = { ...state.research, on: toggle.checked, id };
    }
    saveState();
  };

  // Quantos registros há e quantos ainda não foram exportados
  const showSummary = async () => {
    const { total, pending } = await researchSummary();
    if (!total) {
      message.textContent = '';
      return;
    }
    message.textContent = pending
      ? `${total} registros neste navegador; ${pending} ainda não exportados.`
      : `${total} registros neste navegador, todos já exportados.`;
  };
  showSummary();
  toggle.addEventListener('change', update);
  idInput.addEventListener('change', update);

  root.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', async () => {
      const warning = await exportResearchData(button.dataset.export);
      if (warning) message.textContent = warning;
      else showSummary();
    });
  });
}
