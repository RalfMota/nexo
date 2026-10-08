/* NEXO — Missões jogadas do início ao fim, por script, no jogo de verdade */

import { test, expect } from '@playwright/test';
import { enterGame, startMission, useObject, useInside, waitForFloor, missionDone, wait } from './helpers.js';

test('todas as missões montam sem erro', async ({ page }) => {
  const errors = await enterGame(page);
  const ids = await page.evaluate(async () => {
    const st = await import('/js/core/state.js');
    st.state.dbg = true; // libera todas as regiões, só neste teste
    const M = await import('/js/missions/index.js');
    return Object.keys(M.MISSIONS);
  });
  expect(ids.length).toBeGreaterThanOrEqual(15);
  for (const id of ids) {
    await startMission(page, id);
    await wait(page, 900);
    const mounted = await page.evaluate(async () => {
      const Q = await import('/js/world/quest-layer.js');
      const S = await import('/js/engine/engine-state.js');
      return Q.questObjects().length > 0 || S.engineState.game.scene.isActive('Interior');
    });
    expect(mounted, `a missão ${id} não montou nada`).toBe(true);
    await page.evaluate(async () => {
      const Ses = await import('/js/game/session.js');
      Ses.leaveMission();
    });
    await wait(page, 1200);
  }
  expect(errors).toEqual([]);
});

test('Prólogo: artefatos, Compasso, cristal e Lyra', async ({ page }) => {
  const errors = await enterGame(page);
  await startMission(page, 'p0');
  await useObject(page, 'artefato-compass');
  await useObject(page, 'artefato-calculator');
  const inventory = await page.evaluate(async () => (await import('/js/core/state.js')).state.inv);
  expect(inventory).toEqual(['Compasso de Nexo', 'Calculador Arcano']);
  // Sem o Compasso, o cristal não responde
  await useObject(page, 'cristal-instavel');
  await page.evaluate(async () => (await import('/js/ui/tools.js')).toggleCompass());
  await useObject(page, 'cristal-instavel');
  await page.evaluate(async () => (await import('/js/core/runtime.js')).runtime.session.talk());
  expect(await missionDone(page, 'p0')).toBe(true);
  expect(errors).toEqual([]);
});

test('Comportas do Vale: metade, terço e o resto em três reservatórios', async ({ page }) => {
  const errors = await enterGame(page);
  await startMission(page, 'r1b');
  const pour = async (field, count) => {
    for (let left = count; left > 0; left -= 3) {
      const take = Math.min(3, left);
      await useObject(page, 'bucket-rack', take);
      await useObject(page, `field-${field}`, take);
    }
  };
  // Primeira tentativa errada: o trigo recebe demais
  await pour('trigo', 5);
  await pour('ervas', 3);
  await useObject(page, 'valve');
  expect(await missionDone(page, 'r1b')).toBe(false);
  await useObject(page, 'field-trigo'); // recolhe um balde (mãos vazias)
  await useObject(page, 'field-ervas');
  await useObject(page, 'valve');
  await wait(page, 2800);
  for (const [trigo, ervas, pomar] of [[6, 4, 2], [9, 6, 3]]) {
    await pour('trigo', trigo);
    await pour('ervas', ervas);
    await pour('pomar', pomar);
    await useObject(page, 'valve');
    await wait(page, 2800);
  }
  expect(await missionDone(page, 'r1b')).toBe(true);
  expect(errors).toEqual([]);
});

test('Previsão (Oficina): três testes e duas previsões certas', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r3d');
  for (const cells of [1, 2, 5]) {
    await useObject(page, 'cell-rack', cells);
    await useObject(page, 'converter');
    await useObject(page, 'test-lever');
  }
  await wait(page, 1200);
  // Bilhetes do Kael: 9, 14 e 6 células → 22, 32 e 16 (saída = 2 × energia + 4)
  await useObject(page, 'mark-up', 20); // marca baixa: transborda
  await useObject(page, 'launch-lever');
  expect(await missionDone(page, 'r3d')).toBe(false);
  await useObject(page, 'mark-up', 12); // 32
  await useObject(page, 'launch-lever');
  await useObject(page, 'mark-down', 16); // 16
  await useObject(page, 'launch-lever');
  expect(await missionDone(page, 'r3d')).toBe(true);
  expect(errors).toEqual([]);
});

test('Caldeirão de Orin: 2, 4 e 5 frascos na proporção da receita', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r2b');
  await expect.poll(() => page.evaluate(async () => {
    const S = await import('/js/engine/engine-state.js');
    return S.engineState.game.scene.isActive('Interior');
  }), { timeout: 10_000 }).toBe(true);
  await wait(page, 400);
  for (const [leaves, dew] of [[4, 6], [8, 12], [10, 15]]) {
    await useInside(page, 'Armário de folhas-lunares', leaves);
    await useInside(page, 'Caldeirão', leaves);
    await useInside(page, 'Armário de orvalho', dew);
    await useInside(page, 'Caldeirão', dew);
    await useInside(page, 'Caldeirão'); // mãos vazias: mexe
    await wait(page, 2900);
  }
  expect(await missionDone(page, 'r2b')).toBe(true);
  expect(errors).toEqual([]);
});

test('Grade de Energia: os cinco andares da Torre', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r5a');
  await waitForFloor(page, 1);
  for (let floor = 1; floor <= 3; floor++) {
    const rods = 3 * floor + 1;
    await useInside(page, 'Pegar haste', rods);
    await useInside(page, 'Encaixar haste', rods);
    await wait(page, 400);
    await useInside(page, 'Subir');
    await waitForFloor(page, floor + 1);
  }
  // 4º andar: primeiro uma previsão errada (21), depois a certa (31)
  await useInside(page, 'Pegar feixe de 10', 2);
  await useInside(page, 'Pegar haste solta');
  await useInside(page, 'Carrinho');
  await useInside(page, 'Acender a grade');
  await wait(page, 4500); // a grade pisca os buracos e depois se apaga
  await useInside(page, 'Pegar feixe de 10');
  await useInside(page, 'Carrinho');
  await useInside(page, 'Acender a grade');
  await wait(page, 2200);
  await useInside(page, 'Subir');
  await waitForFloor(page, 5);
  // Topo: primeiro uma regra errada (2 azuis e 1 dourada), depois a certa (3 e 1)
  await useInside(page, 'Pegar haste azul', 2);
  await useInside(page, 'Tubo da Máquina da Regra', 2, 0);
  await useInside(page, 'Pegar haste dourada');
  await useInside(page, 'Tubo da Máquina da Regra', 1, 1);
  await useInside(page, 'Testar a regra');
  expect(await missionDone(page, 'r5a')).toBe(false);
  await useInside(page, 'Pegar haste azul');
  await useInside(page, 'Tubo da Máquina da Regra', 1, 0);
  await useInside(page, 'Testar a regra');
  expect(await missionDone(page, 'r5a')).toBe(true);
  expect(errors).toEqual([]);
});

test('Bancas do Mercado: pedidos exatos de 12 e de 17 cristais', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r2a');
  await useObject(page, 'stall-lua', 3); // 12
  await useObject(page, 'counter');
  await wait(page, 2700);
  await useObject(page, 'stall-sol', 3); // 18: passou
  await useObject(page, 'counter');
  expect(await missionDone(page, 'r2a')).toBe(false);
  await useObject(page, 'return-crate');
  await useObject(page, 'stall-sol', 2); // 12 + 5 = 17
  await useObject(page, 'stall-estrela');
  await useObject(page, 'counter');
  expect(await missionDone(page, 'r2a')).toBe(true);
  expect(errors).toEqual([]);
});

test('Promoção: preço por cristal e depois o desconto de 20%', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r2c');
  await useObject(page, 'stall-sol', 4); // 24 cristais por 72 moedas: passou da bolsa
  await useObject(page, 'counter');
  await useObject(page, 'return-crate');
  await useObject(page, 'stall-lua', 5); // 20 por 50
  await useObject(page, 'counter');
  await wait(page, 2700);
  await useObject(page, 'stall-lua', 5); // 50 moedas: passou de 48
  await useObject(page, 'counter');
  await useObject(page, 'return-crate');
  await useObject(page, 'stall-estrela', 4); // 20 por 4 × 12 = 48
  await useObject(page, 'counter');
  expect(await missionDone(page, 'r2c')).toBe(true);
  expect(errors).toEqual([]);
});

test('Custo de Viagem: cada caixa na rota mais barata, com o quadro de custos', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r4b');
  for (const d of [4, 12, 20]) await useObject(page, `milestone-${d}`);
  const plotted = await page.evaluate(async () => (await import('/js/world/quest-layer.js')).questObjects().some((o) => o.id === 'cost-board'));
  expect(plotted).toBe(true);
  // Erro: a caixa de 20 léguas na Rota A
  for (const [d, route] of [[4, 'A'], [12, 'B'], [20, 'A']]) {
    await useObject(page, `parcel-${d}`);
    await useObject(page, `wagon-${route}`);
  }
  await useObject(page, 'horn');
  expect(await missionDone(page, 'r4b')).toBe(false);
  await useObject(page, 'wagon-A'); // tira a última caixa (20) da Rota A
  await useObject(page, 'wagon-B');
  await useObject(page, 'horn');
  expect(await missionDone(page, 'r4b')).toBe(true);
  expect(errors).toEqual([]);
});

test('Ponto de Mudança: a placa no marco onde as retas se cruzam', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'r4d');
  for (const d of [2, 18]) await useObject(page, `milestone-${d}`);
  await useObject(page, 'turn-sign');
  await useObject(page, 'milestone-6');
  expect(await missionDone(page, 'r4d')).toBe(false);
  await wait(page, 1600);
  await useObject(page, 'turn-sign');
  await useObject(page, 'milestone-10');
  expect(await missionDone(page, 'r4d')).toBe(true);
  expect(errors).toEqual([]);
});

test('Reacender o Núcleo: testes, gráfico pelos próprios pontos e energia 50', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    (await import('/js/core/state.js')).state.dbg = true;
  });
  await startMission(page, 'f1');
  for (const crystals of [2, 6]) { // energia 14 e 30
    await useObject(page, 'crystal-pile', crystals);
    await useObject(page, 'core-socket');
    await useObject(page, 'core-lever');
  }
  await useObject(page, 'reading-0'); // reta errada: não passa pelos pontos
  await useObject(page, 'light-board');
  await useObject(page, 'reading-1'); // E = 4c + 6
  await useObject(page, 'light-board');
  await useObject(page, 'crystal-pile', 10); // 46: falta energia
  await useObject(page, 'core-socket');
  await useObject(page, 'core-lever');
  expect(await missionDone(page, 'f1')).toBe(false);
  await useObject(page, 'crystal-pile', 11); // 50
  await useObject(page, 'core-socket');
  await useObject(page, 'core-lever');
  expect(await missionDone(page, 'f1')).toBe(true);
  expect(errors).toEqual([]);
});
