/* NEXO — Testes do componente de mãos das missões (js/missions/kit/hands.js) */

import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let carried = null;
mock.module('../js/world/quest-layer.js', {
  exports: {
    setCarried: (item) => {
      carried = item;
    },
  },
});

const { createHands } = await import('../js/missions/kit/hands.js');

let said = [];
const say = (message, tone) => said.push([message, tone]);
const kinds = {
  balde: { name: 'baldes', draw: () => {} },
  haste: { name: 'hastes', limit: 40, draw: () => {} },
};

beforeEach(() => {
  carried = null;
  said = [];
});

test('pega até o limite e avisa quando as mãos estão cheias', () => {
  const hands = createHands({ say, kinds, limit: 3 });
  assert.equal(hands.take('balde'), true);
  assert.equal(hands.take('balde'), true);
  assert.equal(hands.take('balde'), true);
  assert.equal(hands.take('balde'), false);
  assert.equal(hands.count, 3);
  assert.equal(said.at(-1)[1], 'warn');
  assert.match(said.at(-1)[0], /no máximo 3/);
});

test('não mistura tipos: avisa e mantém o que já estava nas mãos', () => {
  const hands = createHands({ say, kinds, limit: 3 });
  hands.take('balde');
  assert.equal(hands.take('haste'), false);
  assert.equal(hands.kind, 'balde');
  assert.match(said.at(-1)[0], /baldes/);
});

test('soma valores (feixes de 10 e hastes soltas) e respeita o limite do tipo', () => {
  const hands = createHands({ say, kinds, limit: 3 });
  hands.take('haste', 10);
  hands.take('haste', 10);
  hands.take('haste', 1);
  assert.equal(hands.count, 21);
  assert.equal(hands.size, 3);
  assert.equal(hands.countOf(10), 2);
  assert.equal(hands.take('haste', 20), false); // passaria de 40
});

test('largar devolve o último item e esvazia o tipo no fim', () => {
  const hands = createHands({ say, kinds });
  hands.take('haste', 10);
  hands.take('haste', 1);
  assert.equal(hands.drop(), 1);
  assert.equal(hands.drop(), 10);
  assert.equal(hands.drop(), null);
  assert.equal(hands.kind, null);
  assert.equal(hands.empty, true);
});

test('o desenho acima da cabeça acompanha as mãos, com um objeto estável por tipo', () => {
  const hands = createHands({ say, kinds });
  hands.take('balde');
  const first = carried;
  assert.equal(first.label, 'baldes');
  hands.take('balde');
  assert.equal(carried, first); // o mesmo objeto: o personagem não "pega de novo" a cada item
  hands.dropAll();
  assert.equal(carried, null);
});

test('mensagens próprias da missão substituem as padrão', () => {
  const hands = createHands({ say, kinds, limit: 1, messages: { full: (max) => `Só ${max} balde.` } });
  hands.take('balde');
  hands.take('balde');
  assert.equal(said.at(-1)[0], 'Só 1 balde.');
});

test('set coloca um conteúdo direto e onChange é avisado', () => {
  let changes = 0;
  const hands = createHands({ say, kinds, onChange: () => changes++ });
  hands.set('haste', [1, 1]);
  assert.equal(hands.count, 2);
  assert.equal(hands.kind, 'haste');
  hands.set('haste', []);
  assert.equal(hands.kind, null);
  assert.equal(changes, 2);
});
