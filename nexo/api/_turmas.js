/* NEXO — Turmas online: funções comuns das rotas /api (armazenamento privado na Vercel Blob)
 *
 * Arquivos começados por "_" não viram rota: este módulo só é importado por api/turma.js e
 * api/sync.js. Organização no armazenamento (privado, região de São Paulo):
 *   turmas/<CÓDIGO>/turma.json        nome da turma, sal e resumo da senha do professor
 *   turmas/<CÓDIGO>/alunos/<ID>.json  apelido e progresso de um aluno (sem registros de pesquisa)
 *
 * A senha nunca é guardada: só o resumo scrypt com sal próprio. Os alunos só conseguem
 * escrever o próprio arquivo; ler a turma exige o código e a senha do professor.
 */

import { put, get, list, del } from '@vercel/blob';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ACCESS = 'private';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I: fáceis de ditar em sala
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const STUDENT_RE = /^a[a-z0-9]{4,24}$/;
export const MIN_PASSWORD = 6;
const MAX_BODY = 200_000;

const classPath = (code) => `turmas/${code}/turma.json`;
const studentPrefix = (code) => `turmas/${code}/alunos/`;

export function newCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
}

export function checkPassword(password, meta) {
  if (typeof password !== 'string' || !meta?.salt || !meta?.hash) return false;
  const attempt = scryptSync(password, meta.salt, 32);
  const expected = Buffer.from(meta.hash, 'hex');
  return attempt.length === expected.length && timingSafeEqual(attempt, expected);
}

async function readJson(pathname) {
  const result = await get(pathname, { access: ACCESS, useCache: false });
  if (!result) return null;
  return JSON.parse(await new Response(result.stream).text());
}

const writeJson = (pathname, data) =>
  put(pathname, JSON.stringify(data), { access: ACCESS, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });

export const readClass = (code) => readJson(classPath(code)).catch(() => null);
export const writeClass = (code, meta) => writeJson(classPath(code), meta);
export const writeStudent = (code, id, data) => writeJson(`${studentPrefix(code)}${id}.json`, data);
export const removeStudent = (code, id) => del(`${studentPrefix(code)}${id}.json`);

/** Todos os alunos de uma turma (lê os arquivos em paralelo, de 20 em 20). */
export async function readStudents(code) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: studentPrefix(code), cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const students = [];
  for (let i = 0; i < blobs.length; i += 20) {
    const batch = await Promise.all(blobs.slice(i, i + 20).map((blob) => readJson(blob.pathname).catch(() => null)));
    students.push(...batch.filter(Boolean));
  }
  return students;
}

/* ---------- Limpeza do que chega dos alunos ---------- */

const clip = (value, max) => String(value ?? '').slice(0, max);
const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const LOOK_FIELDS = ['skin', 'hairStyle', 'hair', 'top', 'col', 'bottom', 'bottomColor', 'shoes', 'av'];

/** Mantém só o necessário para o Painel do Professor: aparência, missões concluídas e estatísticas. */
export function cleanStudent(id, body) {
  const data = isPlainObject(body?.dados) ? body.dados : {};
  const player = isPlainObject(data.player)
    ? Object.fromEntries(LOOK_FIELDS.filter((key) => key in data.player).map((key) => [key, typeof data.player[key] === 'number' ? data.player[key] : clip(data.player[key], 16)]))
    : null;
  const pick = (object) => (isPlainObject(object) ? object : {});
  return {
    id,
    name: clip(body?.apelido, 24).trim() || 'Aluno',
    created: Number(body?.criado) || Date.now(),
    lastSeen: Date.now(),
    save: { player, done: pick(data.done), stats: pick(data.stats), seen: pick(data.seen) },
  };
}

/* ---------- HTTP ---------- */

export function readBody(req) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  if (JSON.stringify(body).length > MAX_BODY) throw Object.assign(new Error('Dados grandes demais.'), { status: 413 });
  return body;
}

export function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(payload);
}

/** Envolve uma rota: só POST, corpo JSON, erros viram mensagens em português. */
export const route = (handler) => async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { erro: 'Use POST.' });
  try {
    return await handler(readBody(req), res);
  } catch (error) {
    console.error(error);
    return send(res, error.status ?? 500, { erro: error.status ? error.message : 'Falha no servidor. Tente de novo.' });
  }
};
