/* NEXO — Testes de ponta a ponta (npm run test:e2e)
 *
 * Abre o jogo de verdade num navegador (o Chrome ou o Edge já instalados no computador, sem
 * baixar nada) servido pelo Vite a partir do código-fonte, e joga as missões por script.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1, // um jogo por vez: os testes compartilham o servidor e o navegador
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5520',
    channel: process.env.NEXO_BROWSER ?? 'chrome',
    viewport: { width: 1280, height: 760 },
  },
  webServer: {
    command: 'npx vite --port 5520 --strictPort',
    url: 'http://localhost:5520',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
