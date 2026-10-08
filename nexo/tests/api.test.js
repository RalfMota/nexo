/* NEXO — Testes das rotas /api da turma online, com a Vercel Blob simulada em memória.
 * Rodar: npm test
 */

import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const files = new Map();

mock.module('@vercel/blob', {
  exports: {
    put: async (pathname, body) => {
      files.set(pathname, String(body));
      return { pathname };
    },
    get: async (pathname) => (files.has(pathname) ? { stream: new Blob([files.get(pathname)]).stream() } : null),
    list: async ({ prefix }) => ({
      blobs: [...files.keys()].filter((key) => key.startsWith(prefix)).map((pathname) => ({ pathname })),
      hasMore: false,
    }),
    del: async (pathname) => {
      files.delete(pathname);
    },
  },
});

process.env.NEXO_CONVITE = 'convite-de-teste';
const { default: turma } = await import('../api/turma.js');
const { default: sync } = await import('../api/sync.js');

/** Chama uma rota como a Vercel chamaria e devolve { status, body }. */
async function call(handler, body) {
  const result = { status: 0, body: null };
  const res = {
    setHeader() {},
    status(code) {
      result.status = code;
      return { json: (payload) => { result.body = payload; } };
    },
  };
  await handler({ method: 'POST', body }, res);
  return result;
}

const SENHA = 'senha-forte-123';
const KEY_A = 'a'.repeat(48);
const KEY_B = 'b'.repeat(48);
const aluno = (chave, extra = {}) => ({
  id: 'aabc123', chave, apelido: 'Lia', criado: 1,
  dados: { player: null, done: { r1a: { tries: 2, sec: 90 } }, stats: {}, seen: {}, ...extra },
});

async function newClass() {
  const { body } = await call(turma, { acao: 'criar', nome: '9º A', senha: SENHA, convite: 'convite-de-teste' });
  return body.codigo;
}

beforeEach(() => files.clear());

test('criar turma exige o código de convite e senha de 10 caracteres', async () => {
  assert.equal((await call(turma, { acao: 'criar', nome: 'X', senha: SENHA, convite: 'errado' })).status, 403);
  assert.equal((await call(turma, { acao: 'criar', nome: 'X', senha: 'curta', convite: 'convite-de-teste' })).status, 400);
  const ok = await call(turma, { acao: 'criar', nome: 'X', senha: SENHA, convite: 'convite-de-teste' });
  assert.equal(ok.status, 201);
  assert.match(ok.body.codigo, /^[A-HJ-NP-Z2-9]{6}$/);
});

test('sem NEXO_CONVITE configurado, ninguém cria turma', async () => {
  const saved = process.env.NEXO_CONVITE;
  delete process.env.NEXO_CONVITE;
  try {
    assert.equal((await call(turma, { acao: 'criar', nome: 'X', senha: SENHA, convite: '' })).status, 503);
  } finally {
    process.env.NEXO_CONVITE = saved;
  }
});

test('o aluno grava o próprio progresso e o professor lê sem ver o resumo da chave', async () => {
  const codigo = await newClass();
  assert.equal((await call(sync, { codigo, aluno: aluno(KEY_A) })).status, 200);
  const { status, body } = await call(turma, { acao: 'ler', codigo, senha: SENHA });
  assert.equal(status, 200);
  assert.equal(body.alunos.length, 1);
  assert.equal(body.alunos[0].name, 'Lia');
  assert.equal(body.alunos[0].keyHash, undefined);
  assert.deepEqual(body.alunos[0].flags, []);
});

test('outra chave não sobrescreve o progresso de um aluno já registrado', async () => {
  const codigo = await newClass();
  await call(sync, { codigo, aluno: aluno(KEY_A) });
  const intruso = await call(sync, { codigo, aluno: { ...aluno(KEY_B), apelido: 'Falso' } });
  assert.equal(intruso.status, 403);
  const { body } = await call(turma, { acao: 'ler', codigo, senha: SENHA });
  assert.equal(body.alunos[0].name, 'Lia');
});

test('sincronizar sem chave é recusado (versão antiga do jogo)', async () => {
  const codigo = await newClass();
  assert.equal((await call(sync, { codigo, aluno: aluno('') })).status, 400);
});

test('arquivo antigo sem chave adota a chave da primeira gravação', async () => {
  const codigo = await newClass();
  files.set(`turmas/${codigo}/alunos/aabc123.json`, JSON.stringify({ id: 'aabc123', name: 'Lia' }));
  assert.equal((await call(sync, { codigo, aluno: aluno(KEY_A) })).status, 200);
  assert.equal((await call(sync, { codigo, aluno: aluno(KEY_B) })).status, 403);
});

test('modo de teste e conclusão sem tentativa aparecem como avisos para o professor', async () => {
  const codigo = await newClass();
  await call(sync, { codigo, aluno: aluno(KEY_A, { dbg: true, done: { r1a: { tries: 0, sec: 1 } } }) });
  const { body } = await call(turma, { acao: 'ler', codigo, senha: SENHA });
  assert.deepEqual(body.alunos[0].flags, ['modo de teste', 'conclusão improvável']);
});

test('8 senhas erradas bloqueiam a turma, inclusive para a senha certa', async () => {
  const codigo = await newClass();
  for (let i = 0; i < 8; i++) assert.equal((await call(turma, { acao: 'ler', codigo, senha: `errada${i}` })).status, 403);
  assert.equal((await call(turma, { acao: 'ler', codigo, senha: SENHA })).status, 429);
});

test('a senha certa antes do limite zera a contagem de erros', async () => {
  const codigo = await newClass();
  for (let i = 0; i < 7; i++) await call(turma, { acao: 'ler', codigo, senha: 'errada' });
  assert.equal((await call(turma, { acao: 'ler', codigo, senha: SENHA })).status, 200);
  for (let i = 0; i < 7; i++) await call(turma, { acao: 'ler', codigo, senha: 'errada' });
  assert.equal((await call(turma, { acao: 'ler', codigo, senha: SENHA })).status, 200);
});

test('turma inexistente e senha errada dão a mesma resposta', async () => {
  const codigo = await newClass();
  const wrong = await call(turma, { acao: 'ler', codigo, senha: 'errada' });
  const missing = await call(turma, { acao: 'ler', codigo: 'ZZZZZZ', senha: SENHA });
  assert.equal(wrong.status, missing.status);
  assert.deepEqual(wrong.body, missing.body);
});
