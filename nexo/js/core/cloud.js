/* NEXO — Turma online: sincroniza o progresso dos alunos e lê a turma no Painel do Professor
 *
 * Só funciona no site publicado (as rotas /api rodam na Vercel). Vai para a internet apenas
 * o apelido, a aparência do personagem, as missões concluídas e as estatísticas; os
 * registros do Modo Pesquisa continuam só neste computador.
 *
 * O envio espera alguns segundos depois da última mudança (para não mandar a cada passo)
 * e também acontece quando a aba é escondida ou fechada.
 */

import { onStateSaved, turmaOf, activeStudent, cloudKeyOf } from './state.js';

const SYNC_DELAY = 4000;
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** Envios esperando o fim do intervalo, um por aluno (trocar de aluno não cancela o do anterior). */
const pending = new Map(); // id do aluno → { timer, student }
let lastStatus = { ok: null, at: null, message: '' };
const statusListeners = new Set();

export const normalizeCode = (value) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isValidCode = (value) => CODE_RE.test(normalizeCode(value));

/** O que sai do computador: nada de registros de pesquisa nem do ID de participante. */
function payload(student) {
  const save = student.save ?? {};
  return {
    codigo: turmaOf(student),
    aluno: {
      id: student.id,
      chave: cloudKeyOf(student),
      apelido: student.name,
      criado: student.created,
      dados: {
        player: save.player ?? null,
        done: save.done ?? {},
        stats: save.stats ?? {},
        seen: save.seen ?? {},
        dbg: Boolean(save.dbg), // regiões liberadas pelo modo de teste: o professor fica sabendo
      },
    },
  };
}

function setStatus(ok, message = '') {
  lastStatus = { ok, at: Date.now(), message };
  statusListeners.forEach((listener) => listener(lastStatus));
}

export const syncStatus = () => lastStatus;

export function onSyncStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

async function post(path, body) {
  let response;
  try {
    response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Sem conexão com a internet.');
  }
  const data = await response.json().catch(() => null);
  if (!data) throw new Error('A turma online só funciona no site publicado do jogo.');
  if (!response.ok) throw new Error(data.erro ?? 'Falha ao falar com o servidor.');
  return data;
}

/** Envia agora o progresso de um aluno (se ele estiver numa turma). */
export async function syncStudent(student = activeStudent()) {
  if (!student || !turmaOf(student)) return false;
  const waiting = pending.get(student.id);
  if (waiting) {
    clearTimeout(waiting.timer);
    pending.delete(student.id);
  }
  try {
    await post('/api/sync', payload(student));
    setStatus(true);
    return true;
  } catch (error) {
    setStatus(false, error.message);
    return false;
  }
}

/** Liga a sincronização automática (chamada uma vez, na inicialização). */
export function initCloudSync() {
  onStateSaved((student) => {
    if (!turmaOf(student)) return;
    clearTimeout(pending.get(student.id)?.timer);
    pending.set(student.id, { student, timer: setTimeout(() => syncStudent(student), SYNC_DELAY) });
  });
  // Ao esconder ou fechar a aba, envia tudo o que estiver pendente (de todos os alunos)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !pending.size) return;
    for (const { timer, student } of pending.values()) {
      clearTimeout(timer);
      if (!turmaOf(student)) continue;
      const body = new Blob([JSON.stringify(payload(student))], { type: 'application/json' });
      if (!navigator.sendBeacon?.('/api/sync', body)) syncStudent(student);
    }
    pending.clear();
  });
}

/* ---------- Professor ---------- */

export const createClass = (nome, senha, convite) => post('/api/turma', { acao: 'criar', nome, senha, convite });
export const readClass = (codigo, senha) => post('/api/turma', { acao: 'ler', codigo: normalizeCode(codigo), senha });
export const removeFromClass = (codigo, senha, id) => post('/api/turma', { acao: 'remover', codigo: normalizeCode(codigo), senha, id });
