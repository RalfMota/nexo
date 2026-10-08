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
