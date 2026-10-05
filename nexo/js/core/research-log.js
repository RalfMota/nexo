/* NEXO — Modo Pesquisa: registro de eventos e exportação (JSON e CSV) */

import { state, saveState } from './state.js';
import { runtime } from './runtime.js';

/** Registra um evento. Só grava quando o Modo Pesquisa está ligado. */
export function logEvent(type, data = {}) {
  if (!state.research.on) return;
  state.log.push({
    ts: new Date().toISOString(),
    id: state.research.id,
    session: state.session,
    type,
    mission: runtime.session ? runtime.session.id : '',
    data,
  });
  saveState();
}

function download(filename, text, mimeType) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: mimeType }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

const csvCell = (value) => '"' + String(value).replace(/"/g, '""') + '"';

/**
 * Exporta os registros. Devolve uma mensagem de aviso quando não há o que exportar.
 * @param {'json'|'csv'} format
 */
export function exportResearchData(format) {
  if (!state.log.length) {
    return 'Ainda não há registros. Ative o Modo Pesquisa e jogue uma sessão.';
  }
  const fileId = (state.research.id || 'sessao').replace(/\W/g, '');

  if (format === 'json') {
    const payload = { id: state.research.id, done: state.done, log: state.log };
    download(`nexo_${fileId}.json`, JSON.stringify(payload, null, 1), 'application/json');
    return '';
  }

  const header = 'ts,id,session,type,mission,data';
  const lines = state.log.map((event) =>
    [event.ts, event.id, event.session, event.type, event.mission, JSON.stringify(event.data)]
      .map(csvCell)
      .join(','),
  );
  download(`nexo_${fileId}.csv`, '﻿' + [header, ...lines].join('\n'), 'text/csv');
  return '';
}
