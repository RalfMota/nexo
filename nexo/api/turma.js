/* NEXO — POST /api/turma: ações do professor
 *   { acao: 'criar',   nome, senha, convite } → { codigo }
 *   { acao: 'ler',     codigo, senha }        → { nome, alunos: [...] }
 *   { acao: 'remover', codigo, senha, id }    → { ok: true }
 *
 * Criar turma exige o código de convite (variável de ambiente NEXO_CONVITE). Depois de
 * 8 senhas erradas em 15 minutos, a turma fica 15 minutos sem aceitar tentativas.
 */

import {
  route, send, newCode, hashPassword, checkPassword, readClass, writeClass, readStudents, removeStudent,
  isLocked, registerFail, clearFails, sameText, CODE_RE, STUDENT_RE, MIN_PASSWORD,
} from './_turmas.js';

const normalizeCode = (value) => String(value ?? '').trim().toUpperCase();

/** O que o painel recebe de cada aluno (sem o resumo da chave secreta). */
const publicStudent = ({ keyHash, ...student }) => student;

export default route(async (body, res) => {
  if (body.acao === 'criar') {
    const invite = process.env.NEXO_CONVITE;
    if (!invite) return send(res, 503, { erro: 'A criação de turmas não está configurada neste site.' });
    if (!sameText(String(body.convite ?? '').trim(), invite)) return send(res, 403, { erro: 'Código de convite incorreto.' });
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
  if (meta && (await isLocked(codigo))) {
    return send(res, 429, { erro: 'Muitas senhas erradas para esta turma. Espere 15 minutos e tente de novo.' });
  }
  // A mesma resposta para turma inexistente e senha errada: não revela quais códigos existem
  if (!meta || !checkPassword(body.senha, meta)) {
    if (meta) await registerFail(codigo);
    return send(res, 403, { erro: 'Código ou senha da turma incorretos.' });
  }
  await clearFails(codigo);

  if (body.acao === 'ler') {
    const alunos = (await readStudents(codigo)).map(publicStudent);
    return send(res, 200, { codigo, nome: meta.nome, alunos });
  }
  if (body.acao === 'remover') {
    if (!STUDENT_RE.test(String(body.id ?? ''))) return send(res, 400, { erro: 'Aluno inválido.' });
    await removeStudent(codigo, body.id);
    return send(res, 200, { ok: true });
  }
  return send(res, 400, { erro: 'Ação desconhecida.' });
});
