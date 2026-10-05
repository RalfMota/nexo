/* NEXO — Prólogo: A Ruptura (familiarização, sem conteúdo matemático)
 * Ensina os gestos do jogo: tocar em alguém, arrastar um objeto até um lugar, usar o Compasso.
 */

import { createPlayfield, centerOf } from './playfield.js';
import { artArtifact } from './props-art.js';
import { paintSky } from './widgets.js';
import { drawCrystal, roundRect, circle } from '../art/shapes.js';
import { drawCharacter } from '../art/characters.js';
import { CHARACTERS } from '../data/characters.js';
import { state, saveState } from '../core/state.js';
import { refreshHud } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';

const LINES = [
  'O Núcleo do Nexo se rompeu, e tudo na vila saiu do equilíbrio. Toque em mim quando estiver pronto.',
  'Leve estes artefatos. Arraste cada um até a sua bolsa.',
  'Agora ative o Compasso (tecla Q ou na barra de baixo) e toque no cristal que pulsa.',
  'O cristal respondeu a você! Quando precisar, peça uma dica. Toque em mim para seguir viagem.',
];

const BAG = { x: 760, y: 320, w: 170, h: 170 };
const LYRA = { x: 110, y: 200, w: 170, h: 260 };
const CRYSTAL = { x: 400, y: 110, w: 160, h: 230 };

function mountPrologue(stage, api) {
  let step = 0;
  let stored = 0;
  let touched = false;

  const field = createPlayfield(stage, {
    draw(ctx, t) {
      paintSky(ctx, 960, 540, '#241d48', '#4b3a7a');
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(190, 255, 245, ${0.25 + (i % 4) * 0.15})`;
        ctx.fillRect((i * 97) % 960, 540 - ((i * 53 + t * 14 * (1 + (i % 3))) % 540), 2, 2);
      }
      ctx.fillStyle = '#2f5a36';
      ctx.fillRect(0, 450, 960, 90);
      ctx.fillStyle = '#3a2f5e';
      ctx.beginPath();
      ctx.ellipse(480, 420, 170, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lyra
      ctx.save();
      ctx.translate(195, 455);
      ctx.scale(6, 6);
      drawCharacter(ctx, 0, 0, CHARACTERS.lyra.look, { dir: 'right' });
      ctx.restore();
      if (step === 0 || step === 3) {
        ctx.fillStyle = '#fbf1d9';
        roundRect(ctx, 210, 150 + Math.sin(t * 4) * 3, 60, 34, 10);
        ctx.fill();
        for (let i = 0; i < 3; i++) circle(ctx, 226 + i * 14, 167 + Math.sin(t * 4) * 3, 4, '#4f3019');
      }

      // Cristal instável
      const calling = step === 2;
      const pulse = calling ? 1 + Math.sin(t * 6) * 0.1 : 1;
      if (calling) {
        ctx.strokeStyle = `rgba(255, 207, 107, ${0.5 + Math.sin(t * 6) * 0.4})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(480, 230, 100 + Math.sin(t * 6) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawCrystal(ctx, 480, 230 + Math.sin(t * 2) * 6, 80 * pulse, {
        glow: touched ? 1.6 : 0.7 + Math.sin(t * 9) * 0.3,
        color: touched ? '#7ff0e0' : '#9a7ff0',
      });
      if (!touched) {
        ctx.strokeStyle = 'rgba(40, 20, 70, .85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(468, 160);
        ctx.lineTo(492, 205);
        ctx.lineTo(472, 245);
        ctx.lineTo(490, 280);
        ctx.stroke();
      }

      // Bolsa do jogador
      ctx.fillStyle = '#8a5a33';
      roundRect(ctx, BAG.x + 10, BAG.y + 40, BAG.w - 20, BAG.h - 50, 30);
      ctx.fill();
      ctx.fillStyle = '#6b4226';
      roundRect(ctx, BAG.x + 10, BAG.y + 40, BAG.w - 20, 50, [30, 30, 8, 8]);
      ctx.fill();
      ctx.strokeStyle = '#6b4226';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(BAG.x + BAG.w / 2, BAG.y + 44, 50, Math.PI, 0);
      ctx.stroke();
      circle(ctx, BAG.x + BAG.w / 2, BAG.y + 92, 8, '#f2b84b');
      for (let i = 0; i < stored; i++) circle(ctx, BAG.x + 60 + i * 50, BAG.y + 130, 14, i ? '#3b3b5c' : '#c9862a');
    },
  }, api);

  const lyra = field.addToken({
    ...LYRA, mode: 'button', label: 'Falar com Lyra', className: 'act',
    onTap: () => {
      if (step === 0) goTo(1);
      else if (step === 3) {
        api.attempt(true, {});
        api.win('Prólogo concluído. A ruptura a oeste se fechou: procure Tainá no Vale dos Recursos.');
      }
    },
  });

  const bag = field.addZone({ ...BAG, label: 'Sua bolsa', accepts: (token) => token.data.artifact });

  function spawnArtifacts() {
    ['compass', 'calculator'].forEach((kind, index) => {
      field.addToken({
        x: 420 + index * 90, y: 390, w: 76, h: 76, mode: 'item', className: 'act',
        label: kind === 'compass' ? 'Compasso de Nexo' : 'Calculador Arcano',
        art: artArtifact(kind),
        data: { artifact: kind },
        onDrop: (zone, token) => {
          if (zone !== bag) return false;
          field.fly(artArtifact(kind), centerOf(token), centerOf(BAG));
          token.remove();
          stored++;
          if (stored === 2) {
            giveArtifacts();
            goTo(2);
          }
          return true;
        },
      });
    });
  }

  const crystal = field.addToken({
    ...CRYSTAL, mode: 'button', label: 'Cristal instável', className: 'act',
    onTap: () => {
      if (step !== 2) return;
      touched = true;
      api.log('interaction', { alvo: 'cristal', compasso: document.body.classList.contains('compass') });
      goTo(3);
    },
  });

  function giveArtifacts() {
    if (state.inv.length) return;
    state.inv = ['Compasso de Nexo', 'Calculador Arcano'];
    saveState();
    refreshHud();
    api.log('interaction', { item: 'inventario' });
    showToast('Artefatos recebidos:', 'Compasso de Nexo e Calculador Arcano.');
  }

  function goTo(next) {
    step = next;
    api.say(LINES[step]);
    lyra.el.disabled = !(step === 0 || step === 3);
    crystal.el.disabled = step !== 2;
    if (step === 1) {
      if (state.inv.length) {
        stored = 2;
        goTo(2);
        return;
      }
      spawnArtifacts();
    }
  }

  goTo(0);
}

export default {
  p0: {
    title: 'A Ruptura',
    region: 'p',
    npc: 'lyra',
    greeting: LINES[0],
    context: 'Uma falha de energia atingiu o Nexo e rompeu os caminhos entre as regiões.',
    goal: 'Aprender a se mover, tocar, arrastar objetos, pedir dica e usar o mapa.',
    concept: 'Familiarização com a interface (sem conteúdo matemático)',
    prerequisites: '—',
    relation: '—',
    categories: [],
    hints: [
      'Toque na Lyra para ouvir o que ela tem a dizer.',
      'Segure um artefato e solte em cima da bolsa. Também dá para tocar no artefato e depois na bolsa.',
      'Ative o Compasso (tecla Q) e toque no cristal grande que pulsa no meio da cena.',
    ],
    mount: mountPrologue,
  },
};
