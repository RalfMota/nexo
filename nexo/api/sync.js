/* NEXO — POST /api/sync: o jogo de um aluno envia o próprio progresso para a turma
 *   { codigo, aluno: { id, apelido, criado, dados: { player, done, stats, seen } } } → { ok: true }
 * Só regrava o arquivo daquele aluno; não lê nada da turma.
 */

import { route, send, readClass, writeStudent, cleanStudent, CODE_RE, STUDENT_RE } from './_turmas.js';

export default route(async (body, res) => {
  const codigo = String(body.codigo ?? '').trim().toUpperCase();
  const id = String(body.aluno?.id ?? '');
  if (!CODE_RE.test(codigo)) return send(res, 400, { erro: 'Código de turma inválido.' });
  if (!STUDENT_RE.test(id)) return send(res, 400, { erro: 'Aluno inválido.' });
  if (!(await readClass(codigo))) return send(res, 404, { erro: 'Turma não encontrada. Confira o código com o professor.' });
  await writeStudent(codigo, id, cleanStudent(id, body.aluno));
  return send(res, 200, { ok: true });
});
