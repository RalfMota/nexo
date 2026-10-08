/* NEXO — Estado do jogo e salvamento local (localStorage), com perfis de aluno
 *
 * Um único registro guarda a "escola" deste navegador:
 *   students: cada aluno com nome, datas e o próprio save (progresso, estatísticas, registros);
 *   active:   o aluno que está jogando agora;
 *   teacher:  a senha do professor (só o resumo PBKDF2 com sal, nunca o texto);
 *   set:      opções do computador (acessibilidade, música), iguais para todos os alunos;
 *   turma:    código da turma online deste computador (cada aluno pode ter o seu, em student.turma).
 *
 * `state` é sempre o save do aluno ativo (ou um save vazio, sem aluno). Os módulos do jogo
 * continuam importando a mesma referência; trocar de aluno troca o conteúdo dela.
 */

import { deleteEvents, clearAllEvents } from './log-store.js';

const SCHOOL_KEY = 'nexo_escola_v1';
const LEGACY_KEY = 'nexo_v1';

/** Modo de teste (?debug=1): só no computador do desenvolvedor, nunca no site publicado. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
export const DEBUG = new URLSearchParams(location.search).get('debug') === '1' && LOCAL_HOSTS.includes(location.hostname);

const DEFAULT_SETTINGS = { big: false, calm: false, music: true, volume: 0.45 };

function createFreshState() {
  return {
    player: null,          // { name, av, col, hair, hairStyle, skin }
    done: {},              // missões concluídas: { [id]: { sup, tries, hints, sec, reps } }
    stats: {},             // desempenho por missão, para o Painel do Professor (ver game/stats.js)
    inv: [],               // artefatos recebidos
    seen: {},              // regiões já visitadas
    track: 'completa',     // 'completa' ou 'rapida' (8º e 9º anos: Vale e Mercado opcionais)
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

const saveProblemListeners = new Set();
let lastSaveFailed = false;

/** Avisa a interface quando o progresso não pôde ser salvo (armazenamento cheio ou bloqueado). */
export function onSaveProblem(listener) {
  saveProblemListeners.add(listener);
  return () => saveProblemListeners.delete(listener);
}

function writeSchool() {
  try {
    localStorage.setItem(SCHOOL_KEY, JSON.stringify(school));
    lastSaveFailed = false;
  } catch (error) {
    // Avisa uma vez por sequência de falhas (o jogo segue, mas o progresso pode se perder)
    if (lastSaveFailed) return;
    lastSaveFailed = true;
    const full = error?.name === 'QuotaExceededError';
    saveProblemListeners.forEach((listener) => listener(full
      ? 'O armazenamento deste navegador está cheio: o progresso não está sendo salvo. Avise o professor.'
      : 'Este navegador não deixa o jogo salvar (modo privado?). O progresso se perde ao fechar a aba.'));
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

const saveListeners = new Set();

/** Avisa quem precisa saber que o progresso mudou (a sincronização com a turma online). */
export function onStateSaved(listener) {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

export function saveState() {
  const student = school.students[school.active];
  if (student) {
    student.save = snapshot(state);
    student.lastSeen = Date.now();
  }
  writeSchool();
  if (student) saveListeners.forEach((listener) => listener(student));
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

/** Muda a trilha de um aluno (pelo Painel do Professor). */
export function setStudentTrack(id, track) {
  const value = track === 'rapida' ? 'rapida' : 'completa';
  if (id === school.active) {
    state.track = value;
    saveState();
    return;
  }
  const student = school.students[id];
  if (!student?.save) return;
  student.save.track = value;
  writeSchool();
}

/** Apaga o progresso de um aluno (o cadastro e os registros de pesquisa continuam). */
export function resetStudent(id) {
  const student = school.students[id];
  if (!student) return;
  const { research, log, track } = student.save ?? {};
  student.save = snapshot(Object.assign(createFreshState(), research ? { research, log: log ?? [] } : {}, track ? { track } : {}));
  if (school.active === id) replaceState(stateFor(id));
  writeSchool();
}

export function deleteStudent(id) {
  if (!school.students[id]) return;
  delete school.students[id];
  deleteEvents(id);
  if (school.legacyId === id) delete school.legacyId;
  if (school.active === id) {
    school.active = null;
    replaceState(stateFor(null));
  }
  writeSchool();
}

/* ---------- Registros de pesquisa antigos (de antes do IndexedDB) ---------- */

/** Alunos que ainda têm eventos de pesquisa guardados dentro do save. */
export function studentsWithSavedLog() {
  if (school.active && school.students[school.active]) school.students[school.active].save = snapshot(state);
  return Object.values(school.students)
    .filter((student) => student.save?.log?.length)
    .map((student) => ({ id: student.id, log: student.save.log }));
}

/** Tira do save os primeiros `count` eventos (depois que eles já foram para o IndexedDB). */
export function dropSavedLog(id, count) {
  const student = school.students[id];
  if (!student?.save?.log) return;
  student.save.log = student.save.log.slice(count);
  if (id === school.active) state.log = state.log.slice(count);
  writeSchool();
}

/* ---------- Turma online ---------- */

/**
 * Chave secreta do aluno na turma online: criada na primeira sincronização e enviada em
 * todas as seguintes. O servidor guarda só o resumo dela e recusa gravações sem a chave,
 * para que ninguém sobrescreva o progresso de outro aluno só sabendo o código da turma.
 */
export function cloudKeyOf(student) {
  if (!student) return '';
  if (!student.cloudKey) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    student.cloudKey = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    writeSchool();
  }
  return student.cloudKey;
}

/** Código da turma em que um aluno sincroniza: o dele, ou o do computador. */
export const turmaOf = (student) => student?.turma || school.turma || null;
export const computerTurma = () => school.turma ?? null;

export function setComputerTurma(code) {
  school.turma = code || null;
  writeSchool();
}

export function setStudentTurma(id, code) {
  const student = school.students[id];
  if (!student) return;
  student.turma = code || null;
  writeSchool();
}

/** Turma que o professor abriu no painel (o código fica salvo; a senha nunca é salva). */
export const teacherTurma = () => school.teacherTurma ?? null;

export function setTeacherTurma(info) {
  school.teacherTurma = info || null;
  writeSchool();
}

/* ---------- Professor ---------- */

/*
 * A senha do professor protege a abertura do painel neste computador. Ela é guardada como
 * resumo PBKDF2 (SHA-256, 150 mil rodadas, sal aleatório). Os dados dos alunos continuam em
 * texto aberto no navegador: a senha é uma trava de tela, não criptografia.
 * Versões antigas guardavam um SHA-256 simples; ele ainda é aceito e é trocado ao entrar.
 */
const PIN_ROUNDS = 150_000;
const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

async function legacyDigest(text) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`nexo:${text}`)));
}

async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PIN_ROUNDS }, key, 256);
  return toHex(bits);
}

export const hasTeacherPin = () => Boolean(school.teacher.pin);

export async function setTeacherPin(pin) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  school.teacher.pin = { v: 2, salt, hash: await pinHash(pin, salt) };
  writeSchool();
}

export async function checkTeacherPin(pin) {
  const saved = school.teacher.pin;
  if (!saved) return false;
  if (typeof saved === 'string') {
    if ((await legacyDigest(pin)) !== saved) return false;
    await setTeacherPin(pin); // atualiza para o formato novo
    return true;
  }
  return (await pinHash(pin, saved.salt)) === saved.hash;
}

/* ---------- Novo jogo e limpeza ---------- */

/** Novo jogo: apaga o progresso do aluno ativo, mas mantém estatísticas, registros de pesquisa e opções. */
export function startNewGame() {
  const kept = { research: state.research, log: state.log, stats: state.stats, track: state.track };
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
  clearAllEvents();
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
