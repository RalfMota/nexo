/* NEXO — Testes das leis do Códice e das páginas do Diário da Ruptura (js/data/codex.js) */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAWS, PAGES } from '../js/data/codex.js';
import { REGIONS } from '../js/data/regions.js';

const law = (id) => LAWS.find((item) => item.id === id);

test('as leis calculam as mesmas relações das missões', () => {
  assert.equal(law('producao').apply(8), '24 cristais');
  assert.equal(law('conversor').apply(9), 'saída 22');
  assert.equal(law('grade').apply(10), '31 hastes');
  assert.equal(law('nucleo').apply(11), 'energia 50');
  assert.equal(law('receita').apply(5), '10 folhas e 15 gotas');
  assert.equal(law('desconto').apply(15), '12 moedas (economia de 3)');
  assert.equal(law('partes').apply(18), 'trigo 9, ervas 6, pomar 3');
});

test('a lei das rotas diz qual é a mais barata e o empate no ponto de mudança', () => {
  assert.equal(law('rotas').apply(4), 'Rota A 17, Rota B 23: A é mais barata');
  assert.equal(law('rotas').apply(10), 'Rota A 35, Rota B 35: empate');
  assert.equal(law('rotas').apply(20), 'Rota A 65, Rota B 55: B é mais barata');
});

test('decimais aparecem com vírgula', () => {
  assert.equal(law('partes').apply(8), 'trigo 4, ervas 2,67, pomar 1,33');
});

test('cada lei e cada página têm identificador único e região existente', () => {
  assert.equal(new Set(LAWS.map((item) => item.id)).size, LAWS.length);
  const regions = new Set(REGIONS.map((region) => region.id));
  for (const page of PAGES) assert.ok(regions.has(page.region), page.region);
  assert.equal(PAGES.length, REGIONS.length);
});
