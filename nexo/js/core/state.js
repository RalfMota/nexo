/* NEXO — Estado do jogo e salvamento local (localStorage) */

const STORAGE_KEY = 'nexo_v1';

export const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

function createFreshState() {
  return {
    player: null,          // { name, av, col, hair, hairStyle, skin }
    done: {},              // missões concluídas: { [id]: { sup, tries, hints, sec, reps } }
    inv: [],               // artefatos recebidos
    seen: {},              // regiões já visitadas
    research: { on: false, id: '' },
    log: [],               // eventos do Modo Pesquisa
    set: { big: false, calm: false, music: true, volume: 0.45 },
    session: Date.now(),
    dbg: false,
  };
}

function loadState() {
  try {
    return Object.assign(createFreshState(), JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return createFreshState();
  }
}

/** Objeto único e mutável: os módulos importam sempre a mesma referência. */
export const state = loadState();

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sem armazenamento disponível (modo privado, por exemplo): o jogo segue sem salvar.
  }
}

function replaceState(next) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
}

/** Novo jogo: apaga o progresso, mas mantém os registros de pesquisa e as opções. */
export function startNewGame() {
  const kept = { research: state.research, log: state.log, set: state.set };
  replaceState(Object.assign(createFreshState(), kept));
  saveState();
}

/** Apaga progresso e registros deste navegador. */
export function wipeAll() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada a fazer
  }
  replaceState(createFreshState());
}

export function applySettings() {
  document.body.classList.toggle('big', state.set.big);
  document.body.classList.toggle('calm', state.set.calm);
}

export const prefersCalm = () =>
  state.set.calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
