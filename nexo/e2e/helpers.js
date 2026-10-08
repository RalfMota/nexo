/* NEXO — Ajudantes dos testes de ponta a ponta: entram no jogo e operam as missões pelos
 * mesmos pontos de interação que o "E" do jogador usa (objetos do mapa e dos interiores).
 */

import { expect } from '@playwright/test';

export const wait = (page, ms) => page.waitForTimeout(ms);

/** Abre o jogo com um aluno novo, já no mapa, e começa a vigiar erros da página. */
export async function enterGame(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#app')?.children.length > 0);
  await page.evaluate(async () => {
    localStorage.clear();
    const st = await import('/js/core/state.js');
    const id = st.createStudent('Teste E2E');
    st.selectStudent(id);
    const { stopVillageBackground } = await import('/js/ui/title-screen.js');
    stopVillageBackground();
    const G = await import('/js/ui/game-screen.js');
    G.showGame();
  });
  await page.waitForFunction(async () => {
    const S = await import('/js/engine/engine-state.js');
    return Boolean(S.engineState.game?.scene.isActive('Mundo'));
  });
  return errors;
}

export async function startMission(page, id) {
  await page.evaluate(async (missionId) => {
    const Ses = await import('/js/game/session.js');
    Ses.startMission(missionId);
  }, id);
  await wait(page, 600);
}

/** Interage `times` vezes com um objeto de missão do mapa (pelo id). */
export async function useObject(page, id, times = 1) {
  await page.evaluate(async ({ objectId, n }) => {
    const Q = await import('/js/world/quest-layer.js');
    for (let i = 0; i < n; i++) {
      const object = Q.questObjects().find((item) => item.id === objectId);
      if (!object) throw new Error(`Objeto de missão não encontrado: ${objectId}`);
      object.onInteract();
    }
  }, { objectId: id, n: times });
}

/** Interage `times` vezes com um ponto de interação do interior (rótulo exato ou começo dele). */
export async function useInside(page, label, times = 1, index = 0) {
  await page.evaluate(async ({ text, n, at }) => {
    const S = await import('/js/engine/engine-state.js');
    const scene = S.engineState.game.scene.getScene('Interior');
    for (let i = 0; i < n; i++) {
      const items = scene.interactables.filter((item) => item.label.startsWith(text) && (!item.enabled || item.enabled()));
      if (!items[at]) throw new Error(`Ponto de interação não encontrado: ${text}`);
      items[at].onInteract();
    }
  }, { text: label, n: times, at: index });
}

export const insideFloor = (page) => page.evaluate(async () => {
  const S = await import('/js/engine/engine-state.js');
  const scene = S.engineState.game.scene.getScene('Interior');
  return S.engineState.game.scene.isActive('Interior') ? scene.floor : null;
});

/** Espera a cena de interior ficar ativa no andar pedido (as transições têm fade). */
export async function waitForFloor(page, floor) {
  await expect.poll(() => insideFloor(page), { timeout: 10_000 }).toBe(floor);
  await wait(page, 300);
}

export const missionDone = (page, id) => page.evaluate(async (missionId) => {
  const P = await import('/js/game/progress.js');
  return P.isMissionDone(missionId);
}, id);

/** Texto do rastreador da missão (objetivo, fala e dicas). */
export const trackerText = (page) => page.evaluate(() => document.querySelector('.quest')?.innerText ?? document.body.innerText);
