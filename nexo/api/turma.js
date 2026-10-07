/* NEXO — POST /api/turma: ações do professor
 *   { acao: 'criar',   nome, senha }      → { codigo }
 *   { acao: 'ler',     codigo, senha }    → { nome, alunos: [...] }
 *   { acao: 'remover', codigo, senha, id } → { ok: true }
 */

import {
  route, send, newCode, hashPassword, checkPassword, readClass, writeClass,
  readStudents, removeStudent, CODE_RE, STUDENT_RE, MIN_PASSWORD,
} from './_turmas.js';

const normalizeCode = (value) => String(value ?? '').trim().toUpperCase();

export default route(async (body, res) => {
  if (body.acao === 'criar') {
    const nome = String(body.nome ?? '').trim().slice(0, 40);
    if (!nome) return send(res, 400, { erro: 'Dê um nome para a turma.' });
    if (String(body.senha ?? '').length < MIN_PASSWORD) return send(res, 400, { erro: `A senha da turma precisa ter pelo menos ${MIN_PASSWORD} caracteres.` });
    let codigo = newCode();
    for (let i = 0; i < 5 && (await readClass(codigo)); i++) codigo = newCode();
    await writeClass(codigo, { codigo, nome, criada: Date.now(), ...hashPassword(body.senha) });
    return send(res, 201, { codigo, nome });
  }

  const codigo = normalizeCode(body.codigo);
  if (!CODE_RE.test(codigo)) return send(res, 400, { erro: 'Código de turma inválido.' });
  const meta = await readClass(codigo);
  // A mesma resposta para turma inexistente e senha errada: não revela quais códigos existem
  if (!meta || !checkPassword(body.senha, meta)) return send(res, 403, { erro: 'Código ou senha da turma incorretos.' });

  if (body.acao === 'ler') {
    const alunos = await readStudents(codigo);
    return send(res, 200, { codigo, nome: meta.nome, alunos });
  }
  if (body.acao === 'remover') {
    if (!STUDENT_RE.test(String(body.id ?? ''))) return send(res, 400, { erro: 'Aluno inválido.' });
    await removeStudent(codigo, body.id);
    return send(res, 200, { ok: true });
  }
  return send(res, 400, { erro: 'Ação desconhecida.' });
});
