/* NEXO — Empacotamento para a publicação (npm run build → pasta dist/)
 *
 * O código-fonte continua rodando direto, sem build, em qualquer servidor local (Live Server,
 * python -m http.server). O Vite só gera a versão publicada: junta os módulos, minifica e põe
 * um resumo (hash) no nome de cada arquivo, para que o navegador nunca use uma versão velha
 * depois de um deploy. O Phaser fica num arquivo próprio, que quase nunca muda e por isso
 * continua no cache dos computadores da escola entre uma versão e outra.
 */

import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';

/** A trilha sonora é carregada pelo nome (js/core/music.js): copia a pasta audio/ como está. */
const copyAudio = () => ({
  name: 'nexo-copiar-audio',
  apply: 'build',
  closeBundle() {
    cpSync('audio', 'dist/audio', { recursive: true });
  },
});

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1300, // o Phaser inteiro tem ~1,2 MB (330 KB comprimido)
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('vendor/phaser') ? 'phaser' : undefined),
      },
    },
  },
  plugins: [copyAudio()],
});
