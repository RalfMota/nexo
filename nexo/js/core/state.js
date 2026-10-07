/* NEXO — Estado do jogo e salvamento local (localStorage), com perfis de aluno
 *
 * Um único registro guarda a "escola" deste navegador:
 *   students: cada aluno com nome, datas e o próprio save (progresso, estatísticas, registros);
 *   active:   o aluno que está jogando agora;
 *   teacher:  a senha do professor (só o resumo SHA-256, nunca o texto);
 *   set:      opções do computador (acessibilidade, música), iguais para todos os alunos.
 *
 * `state` é sempre o save do aluno ativo (ou um save vazio, sem aluno). Os módulos do jogo
 * continuam importando a mesma referência; trocar de aluno troca o conteúdo dela.
 */

const SCHOOL_KEY = 'nexo_escola_v1';
const LEGACY_KEY = 'nexo_v1';

export const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

const DEFAULT_SETTINGS = { big: false, calm: false, music: true, volume: 0.45 };

function createFreshState() {
  return {
    player: null,          // { name, av, col, hair, hairStyle, skin }
    done: {},              // missões concluídas: { [id]: { sup, tries, hints, sec, reps } }
    stats: {},             // desempenho por missão, para o Painel do Professor (ver game/stats.js)
    inv: [],               // artefatos recebidos
    seen: {},              // regiões já visitadas
    research: { on: false, id: '' },
    log: [],               // eventos do Modo Pesquisa
    set: null,             // aponta para as opções do computador (school.set)
    session: Date.now(),
    dbg: false,
  };
}

function createSchool() {
  return { version: 1, students: {}, active: null, teacher: { pin: null }, set: { ...DEFAULT_SETTINGS } };
}

const newId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeSchool() {
  try {
    localStorage.setItem(SCHOOL_KEY, JSON.stringify(school));
  } catch {
    // Sem armazenamento disponível (modo privado, por exemplo): o jogo segue sem salvar.
  }
}

/** Save antigo (de antes dos perfis) vira um aluno. Roda sempre que o registro antigo aparece. */
function migrateLegacy(target) {
  const legacy = readJson(LEGACY_KEY);
  if (!legacy) return;
  if (legacy.player) {
    const id = target.legacyId && target.students[target.legacyId] ? target.legacyId : newId();
    const { set, ...save } = legacy;
    const previous = target.students[id];
    target.students[id] = {
      id,
      name: previous?.name ?? legacy.player.name ?? 'Aluno',
      created: previous?.created ?? Date.now(),
      lastSeen: Date.now(),
      save: Object.assign(createFreshState(), save, { set: null }),
    };
    target.legacyId = id;
    if (set) target.set = { ...DEFAULT_SETTINGS, ...set };
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // nada a fazer
  }
}

function loadSchool() {
  const loaded = Object.assign(createSchool(), readJson(SCHOOL_KEY));
  loaded.set = { ...DEFAULT_SETTINGS, ...loaded.set };
  migrateLegacy(loaded);
  if (loaded.active && !loaded.students[loaded.active]) loaded.active = null;
  return loaded;
}

const school = loadSchool();

function stateFor(studentId) {
  const saved = studentId ? school.students[studentId]?.save : null;
  const next = Object.assign(createFreshState(), saved);
  next.stats ||= {};
  next.set = school.set;
  return next;
}

/** Objeto único e mutável: os módulos importam sempre a mesma referência. */
export const state = stateFor(school.active);
writeSchool();

function replaceState(next) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
}

/** Cópia do save sem as opções do computador. */
function snapshot(source) {
  const { set, ...save } = source;
  return JSON.parse(JSON.stringify(save));
}

export function saveState() {
  const student = school.students[school.active];
  if (student) {
    student.save = snapshot(state);
    student.lastSeen = Date.now();
  }
  writeSchool();
}

/* ---------- Alunos ---------- */

export const activeStudent = () => school.students[school.active] ?? null;

/** Alunos em ordem alfabética, cada um com o save (somente leitura para relatórios). */
export function listStudents() {
  if (school.active && school.students[school.active]) school.students[school.active].save = snapshot(state);
  return Object.values(school.students).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function createStudent(name) {
  const id = newId();
  const clean = name.trim().slice(0, 24) || 'Aluno';
  school.students[id] = { id, name: clean, created: Date.now(), lastSeen: Date.now(), save: snapshot(createFreshState()) };
  writeSchool();
  return id;
}

/** Entra como um aluno: o jogo passa a ler e salvar o progresso dele. */
export function selectStudent(id) {
  if (!school.students[id]) return false;
  saveState();
  school.active = id;
  replaceState(stateFor(id));
  saveState();
  return true;
}

/** Sai do perfil atual (volta à escolha de perfil). */
export function signOut() {
  saveState();
  school.active = null;
  replaceState(stateFor(null));
  writeSchool();
}

export function renameStudent(id, name) {
  const student = school.students[id];
  if (!student || !name.trim()) return;
  student.name = name.trim().slice(0, 24);
  writeSchool();
}

/** Apaga o progresso de um aluno (o cadastro continua). */
export function resetStudent(id) {
  const student = school.students[id];
  if (!student) return;
  student.save = snapshot(createFreshState());
  if (school.active === id) replaceState(stateFor(id));
  writeSchool();
}

export function deleteStudent(id) {
  if (!school.students[id]) return;
  delete school.students[id];
  if (school.legacyId === id) delete school.legacyId;
  if (school.active === id) {
    school.active = null;
    replaceState(stateFor(null));
  }
  writeSchool();
}

/* ---------- Professor ---------- */

async function digest(text) {
  const bytes = new TextEncoder().encode(`nexo:${text}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const hasTeacherPin = () => Boolean(school.teacher.pin);

export async function setTeacherPin(pin) {
  school.teacher.pin = await digest(pin);
  writeSchool();
}

export async function checkTeacherPin(pin) {
  return Boolean(school.teacher.pin) && (await digest(pin)) === school.teacher.pin;
}

/* ---------- Novo jogo e limpeza ---------- */

/** Novo jogo: apaga o progresso do aluno ativo, mas mantém estatísticas, registros de pesquisa e opções. */
export function startNewGame() {
  const kept = { research: state.research, log: state.log, stats: state.stats };
  replaceState(Object.assign(stateFor(null), kept));
  saveState();
}

/** Apaga todos os alunos, a senha do professor e os registros deste navegador. */
export function wipeAll() {
  try {
    localStorage.removeItem(SCHOOL_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // nada a fazer
  }
  const fresh = createSchool();
  for (const key of Object.keys(school)) delete school[key];
  Object.assign(school, fresh);
  replaceState(stateFor(null));
}

export function applySettings() {
  document.body.classList.toggle('big', state.set.big);
  document.body.classList.toggle('calm', state.set.calm);
}

export const prefersCalm = () =>
  state.set.calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
