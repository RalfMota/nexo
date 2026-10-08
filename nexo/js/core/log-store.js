/* NEXO — Registros do Modo Pesquisa guardados no IndexedDB
 *
 * Antes, os eventos ficavam dentro do save de cada aluno, no localStorage: a cada evento o
 * registro inteiro da escola era reescrito e, perto do limite de ~5 MB do navegador, os
 * registros paravam de ser gravados sem aviso. Agora cada evento é uma linha própria do
 * banco "nexo_registros" (só acrescenta, nunca reescreve), com o ID do aluno do computador.
 *
 * Sem IndexedDB (alguns modos privados), os eventos voltam a ficar no save do aluno, como
 * antes, e o jogo avisa que o espaço é limitado.
 */

const DB_NAME = 'nexo_registros';
const STORE = 'eventos';

let dbPromise = null;
let available = typeof indexedDB !== 'undefined';
const problemListeners = new Set();

/** Avisa a interface quando algo impede de guardar registros (sem banco, cota cheia). */
export function onLogProblem(listener) {
  problemListeners.add(listener);
  return () => problemListeners.delete(listener);
}

function reportProblem(message) {
  problemListeners.forEach((listener) => listener(message));
}

function openDb() {
  if (!available) return Promise.reject(new Error('IndexedDB indisponível'));
  dbPromise ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'seq', autoIncrement: true });
      store.createIndex('student', 'student');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Banco de registros bloqueado por outra aba.'));
  }).catch((error) => {
    available = false;
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

/** Roda uma transação e resolve quando ela termina de verdade (gravada em disco). */
async function transact(mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Gravação cancelada.'));
    result = work(tx.objectStore(STORE));
  });
}

const requestResult = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const logStoreAvailable = () => available;

/** Acrescenta eventos de um aluno. Resolve true se foram gravados. */
export async function appendEvents(studentId, events) {
  if (!events.length) return true;
  try {
    await transact('readwrite', (store) => {
      for (const event of events) store.add({ student: studentId, ...event });
    });
    return true;
  } catch (error) {
    const full = error?.name === 'QuotaExceededError';
    reportProblem(full
      ? 'O espaço deste navegador para registros de pesquisa acabou. Exporte os dados agora e libere espaço.'
      : 'Não foi possível guardar os registros de pesquisa neste navegador. Exporte os dados ao final da sessão.');
    return false;
  }
}

/** Eventos de um aluno, na ordem em que aconteceram (sem os campos internos). */
export async function readEvents(studentId) {
  const rows = await transact('readonly', (store) => requestResult(store.index('student').getAll(studentId)));
  return rows.sort((a, b) => a.seq - b.seq).map(({ seq, student, ...event }) => event);
}

export async function countEvents(studentId) {
  try {
    return await transact('readonly', (store) => requestResult(store.index('student').count(studentId)));
  } catch {
    return 0;
  }
}

/** Apaga os eventos de um aluno (quando o aluno é excluído do computador). */
export async function deleteEvents(studentId) {
  try {
    await transact('readwrite', (store) => {
      const cursorRequest = store.index('student').openKeyCursor(IDBKeyRange.only(studentId));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
    });
  } catch {
    // Sem banco: não há o que apagar
  }
}

export async function clearAllEvents() {
  try {
    await transact('readwrite', (store) => store.clear());
  } catch {
    // Sem banco: não há o que apagar
  }
}

/**
 * Pede ao navegador para não apagar os dados deste site por falta de espaço e avisa
 * quando o uso passa de 80% da cota.
 */
export async function checkStorage() {
  if (!navigator.storage) return;
  try {
    if (navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (quota && usage / quota > 0.8) {
      reportProblem('O armazenamento deste navegador está quase cheio. Exporte os registros de pesquisa e apague os de alunos que já saíram.');
    }
  } catch {
    // Navegador sem a API de armazenamento: segue sem o aviso
  }
}
