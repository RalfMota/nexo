/* NEXO — Modo Pesquisa: registro de eventos e exportação (JSON e CSV)
 *
 * Cada evento vai para o IndexedDB (core/log-store.js), numa fila que preserva a ordem.
 * O formato de cada evento e dos arquivos exportados é o mesmo das versões anteriores.
 * Sem IndexedDB, os eventos ficam no save do aluno, como antes.
 */

import { state, saveState, activeStudent, studentsWithSavedLog, dropSavedLog } from './state.js';
import { runtime } from './runtime.js';
import { appendEvents, readEvents, logStoreAvailable, checkStorage } from './log-store.js';

let queue = Promise.resolve();

/** Grava em ordem: cada gravação espera a anterior terminar. */
function enqueue(task) {
  queue = queue.then(task, task);
  return queue;
}

/** Registra um evento. Só grava quando o Modo Pesquisa está ligado. */
export function logEvent(type, data = {}) {
  if (!state.research.on) return;
  const event = {
    ts: new Date().toISOString(),
    id: state.research.id,
    session: state.session,
    type,
    mission: runtime.session ? runtime.session.id : '',
    data,
  };
  const student = activeStudent();
  if (student && logStoreAvailable()) {
    enqueue(async () => {
      if (await appendEvents(student.id, [event])) return;
      // O banco falhou: guarda no save, como antes, para não perder o evento
      state.log.push(event);
      saveState();
    });
    return;
  }
  state.log.push(event);
  saveState();
}

/**
 * Leva para o IndexedDB os eventos que ainda estão dentro dos saves (versões anteriores ou
 * gravados enquanto o banco estava indisponível). Só tira do save o que foi gravado.
 */
export function migrateSavedLogs() {
  checkStorage();
  if (!logStoreAvailable()) return queue;
  return enqueue(async () => {
    for (const { id, log } of studentsWithSavedLog()) {
      if (await appendEvents(id, log)) dropSavedLog(id, log.length);
    }
  });
}

/** Todos os eventos do aluno ativo: os do banco e os que ainda estão no save. */
async function eventsOfActiveStudent() {
  await queue;
  const student = activeStudent();
  let stored = [];
  if (student && logStoreAvailable()) {
    try {
      stored = await readEvents(student.id);
    } catch {
      stored = [];
    }
  }
  return [...stored, ...state.log];
}

/** Quantos eventos o aluno ativo tem e quantos ainda não foram exportados. */
export async function researchSummary() {
  const total = (await eventsOfActiveStudent()).length;
  const exported = Math.min(total, state.research.exported ?? 0);
  return { total, pending: total - exported };
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
export async function exportResearchData(format) {
  const log = await eventsOfActiveStudent();
  if (!log.length) {
    return 'Ainda não há registros. Ative o Modo Pesquisa e jogue uma sessão.';
  }
  const fileId = (state.research.id || 'sessao').replace(/\W/g, '');

  if (format === 'json') {
    const payload = { id: state.research.id, done: state.done, log };
    download(`nexo_${fileId}.json`, JSON.stringify(payload, null, 1), 'application/json');
  } else {
    const header = 'ts,id,session,type,mission,data';
    const lines = log.map((event) =>
      [event.ts, event.id, event.session, event.type, event.mission, JSON.stringify(event.data)]
        .map(csvCell)
        .join(','),
    );
    download(`nexo_${fileId}.csv`, '﻿' + [header, ...lines].join('\n'), 'text/csv');
  }
  state.research.exported = log.length;
  saveState();
  return '';
}
