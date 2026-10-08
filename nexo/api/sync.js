/* NEXO — POST /api/sync: o jogo de um aluno envia o próprio progresso para a turma
 *   { codigo, aluno: { id, chave, apelido, criado, dados: { player, done, stats, seen, dbg } } } → { ok: true }
 *
 * Só regrava o arquivo daquele aluno e não lê nada da turma. A primeira gravação guarda o
 * resumo da chave secreta do aluno; as seguintes só são aceitas com a mesma chave. Assim,
 * saber o código da turma não basta para sobrescrever o progresso de um colega.
 */

import {
  route, send, readClass, readStudent, writeStudent, countStudents, cleanStudent, keyHash,
  CODE_RE, STUDENT_RE, KEY_RE, MAX_STUDENTS,
} from './_turmas.js';

export default route(async (body, res) => {
  const codigo = String(body.codigo ?? '').trim().toUpperCase();
  const id = String(body.aluno?.id ?? '');
  const chave = String(body.aluno?.chave ?? '');
  if (!CODE_RE.test(codigo)) return send(res, 400, { erro: 'Código de turma inválido.' });
  if (!STUDENT_RE.test(id)) return send(res, 400, { erro: 'Aluno inválido.' });
  if (!KEY_RE.test(chave)) return send(res, 400, { erro: 'Atualize a página do jogo para sincronizar com a turma.' });
  if (!(await readClass(codigo))) return send(res, 404, { erro: 'Turma não encontrada. Confira o código com o professor.' });

  const existing = await readStudent(codigo, id);
  const hash = keyHash(chave);
  if (existing?.keyHash && existing.keyHash !== hash) {
    return send(res, 403, { erro: 'Este aluno já está na turma por outro computador.' });
  }
  if (!existing && (await countStudents(codigo)) >= MAX_STUDENTS) {
    return send(res, 409, { erro: `A turma já tem ${MAX_STUDENTS} alunos. Fale com o professor.` });
  }
  // Arquivo antigo sem chave (de antes desta versão): adota a chave da primeira gravação
  await writeStudent(codigo, id, { ...cleanStudent(id, body.aluno), keyHash: hash });
  return send(res, 200, { ok: true });
});
