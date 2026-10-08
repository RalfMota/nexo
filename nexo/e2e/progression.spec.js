/* NEXO — Progressão: trilha completa e trilha rápida (8º e 9º anos) */

import { test, expect } from '@playwright/test';
import { enterGame, startMission, useObject } from './helpers.js';

async function finishPrologue(page) {
  await startMission(page, 'p0');
  await useObject(page, 'artefato-compass');
  await useObject(page, 'artefato-calculator');
  await page.evaluate(async () => (await import('/js/ui/tools.js')).toggleCompass());
  await useObject(page, 'cristal-instavel');
  await page.evaluate(async () => (await import('/js/core/runtime.js')).runtime.session.talk());
}

const progress = (page) => page.evaluate(async () => {
  const P = await import('/js/game/progress.js');
  const R = await import('/js/data/regions.js');
  return {
    abertas: R.REGIONS.filter((_, i) => P.isRegionOpen(i)).map((region) => region.id),
    atual: P.currentRegion()?.id ?? null,
    extrasVale: P.unlockedExtras(R.regionById('r1')),
  };
});

test('trilha completa: depois do Prólogo, só o Vale abre', async ({ page }) => {
  const errors = await enterGame(page);
  await finishPrologue(page);
  expect(await progress(page)).toEqual({ abertas: ['p', 'r1'], atual: 'r1', extrasVale: [] });
  expect(errors).toEqual([]);
});

test('trilha rápida: Vale e Mercado viram aquecimento e a Oficina abre direto', async ({ page }) => {
  const errors = await enterGame(page);
  await page.evaluate(async () => {
    const st = await import('/js/core/state.js');
    st.state.track = 'rapida';
    st.saveState();
  });
  await finishPrologue(page);
  const result = await progress(page);
  expect(result.abertas).toEqual(['p', 'r1', 'r2', 'r3']);
  expect(result.atual).toBe('r3');
  expect(result.extrasVale).toEqual(['r1c', 'r1d']);
  expect(errors).toEqual([]);
});

test('save antigo com as Bancas concluídas ganha a Promoção, sem fechar o caminho', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const save = { player: { name: 'Antigo' }, done: { p0: { tries: 1, sec: 60 }, r1a: { tries: 2, sec: 90 }, r1b: { tries: 3, sec: 90 }, r2a: { tries: 2, sec: 120, sup: 'autonomo' }, r2b: { tries: 4, sec: 200 } }, stats: {}, inv: [], seen: {}, research: { on: false, id: '' }, log: [] };
    localStorage.setItem('nexo_escola_v1', JSON.stringify({ version: 1, students: { aantigo1: { id: 'aantigo1', name: 'Antigo', created: 1, lastSeen: 1, save } }, active: 'aantigo1', teacher: { pin: null }, set: {} }));
  });
  await page.reload();
  const result = await page.evaluate(async () => {
    const P = await import('/js/game/progress.js');
    const st = await import('/js/core/state.js');
    return { r2c: st.state.done.r2c?.migrada ?? false, oficinaAberta: P.isRegionOpenById('r3') };
  });
  expect(result).toEqual({ r2c: true, oficinaAberta: true });
});
