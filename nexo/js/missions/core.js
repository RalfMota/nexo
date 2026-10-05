/* NEXO — Núcleo do Nexo: "Reconstruir o sistema"
 * Desafio final: testar uma relação nova, encontrar a entrada para uma saída pedida e ler o gráfico.
 */

import { createPlayfield, centerOf } from './playfield.js';
import { artLever, artCrystalToken, artCrystalPile, artReading } from './props-art.js';
import { tween, paintPanel } from './widgets.js';
import { roundRect, circle, outlinedText, drawCrystal } from '../art/shapes.js';
import { prefersCalm } from '../core/state.js';

const font = (size) => `700 ${size}px "Pixelify Sans", sans-serif`;
const energyOf = (crystals) => 4 * crystals + 6;
const crystalsLabel = (count) => `${count} ${count === 1 ? 'cristal' : 'cristais'}`;
const TESTS = 2;
const TARGET = 50;
const MAX_CRYSTALS = 15;
const CORE = { x: 300, y: 70, w: 320, h: 330 };
const METER = { x: 820, y: 40, w: 80, h: 420, max: 70 };

/** Leituras mostradas na última etapa (apenas uma corresponde ao Núcleo). */
const READINGS = [
  { label: 'Leitura 1', rule: (c) => 6 * c + 4 },
  { label: 'Leitura 2', rule: energyOf },
  { label: 'Leitura 3', rule: (c) => 4 * c },
];
const CORRECT_READING = 1;

function mountCore(stage, api) {
  const rows = [];
  let level = 0;
  let inserted = 0;
  let testsUsed = 0;
  let energy = 0;
  let energyTarget = 0;
  let pulseUntil = 0;
  let clock = 0;

  const field = createPlayfield(stage, {
    draw(ctx, t, dt) {
      clock = t;
      paintPanel(ctx, 0, 0, 960, 540, '#1b1f3b');
      energy = tween(energy, energyTarget, dt, 2);
      drawCore(ctx, inserted, level === 3 ? 1 : Math.min(1, energy / TARGET), t < pulseUntil, t);
      drawMeter(ctx, energy, level >= 1);
      if (level === 0) {
        for (let i = 0; i < TESTS; i++) circle(ctx, 692 + i * 28, 316, 10, i < TESTS - testsUsed ? '#5fe3d0' : '#3b3b5c');
        outlinedText(ctx, 'testes', 706, 344, { font: font(13) });
      }
    },
  }, api);

  let coreZone = null;

  function addCrystal() {
    if (inserted >= MAX_CRYSTALS) return false;
    inserted++;
    field.fly(artCrystalToken, { x: 110, y: 420 }, centerOf(CORE), { w: 34, h: 34, duration: 320 });
    return true;
  }

  function setupMachine() {
    field.reset();
    coreZone = field.addZone({
      ...CORE, label: 'Núcleo. Toque para tirar um cristal.',
      accepts: (token) => token.data.crystal || token.data.reading !== undefined,
      onTap: () => {
        if (inserted > 0) inserted--;
      },
    });
    field.addToken({
      x: 40, y: 360, w: 150, h: 150, mode: 'source', repeat: true, className: 'act',
      label: 'Pilha de cristais: toque ou arraste para colocar um no Núcleo',
      art: artCrystalPile('cristais'), ghostArt: artCrystalToken, ghostSize: { w: 40, h: 40 }, data: { crystal: true },
      onTap: () => addCrystal(),
      onDrop: (zone) => zone === coreZone && addCrystal(),
    });
    field.addToken({
      x: 660, y: 350, w: 96, h: 140, mode: 'button', className: 'act', label: 'Acionar o Núcleo',
      art: artLever(false, '#5fe3d0'),
      onTap: activate,
    });
  }

  function activate() {
    const c = inserted;
    const e = energyOf(c);
    energy = 0;
    energyTarget = e;
    pulseUntil = clock + 1.2;
    rows.push([c, e]);
    api.record(['Cristais', 'Energia'], rows);

    if (level === 0) {
      testsUsed++;
      api.log('interaction', { teste: c, energia: e });
      inserted = 0;
      if (testsUsed >= TESTS) {
        level = 1;
        api.say(`Os testes acabaram. A vila precisa de exatamente ${TARGET} de energia: veja a marca no medidor.`);
      }
      return;
    }

    if (api.attempt(e === TARGET, { cristais: c, energia: e })) {
      api.say(`${TARGET} de energia, exatamente o que a vila precisa! Falta uma coisa: leve até o Núcleo a leitura que descreve como ele funciona.`, 'ok');
      setTimeout(() => api.isActive() && setupReadings(), prefersCalm() ? 0 : 1600);
    } else {
      api.fail(e < TARGET
        ? `Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia: faltou energia para a vila.`
        : `Com ${crystalsLabel(c)} o Núcleo gerou ${e} de energia: passou do que a rede aguenta, e o excesso se dissipou.`);
    }
  }

  function setupReadings() {
    level = 2;
    field.reset();
    coreZone = field.addZone({ ...CORE, label: 'Núcleo: encaixar uma leitura', accepts: (token) => token.data.reading !== undefined });
    READINGS.forEach((reading, index) => {
      field.addToken({
        x: 30, y: 30 + index * 165, w: 220, h: 150, mode: 'item', className: 'act',
        label: `${reading.label}: arraste até o Núcleo`,
        art: artReading(reading.rule, reading.label), data: { reading: index },
        onDrop: (zone) => {
          if (zone !== coreZone) return false;
          chooseReading(index);
          return false;
        },
      });
    });
  }

  function chooseReading(index) {
    const reading = READINGS[index];
    if (api.attempt(index === CORRECT_READING, { leitura: index + 1 })) {
      level = 3;
      api.win('O Núcleo voltou a pulsar num ritmo estável, e a energia chegou a todas as regiões do Nexo.');
      return;
    }
    const [c, e] = rows.find(([x, y]) => reading.rule(x) !== y) ?? [0, energyOf(0)];
    api.fail(`Na ${reading.label}, ${crystalsLabel(c)} ${c === 1 ? 'daria' : 'dariam'} ${reading.rule(c)} de energia, mas o Registro mostra ${e}.`);
  }

  setupMachine();
  api.record(['Cristais', 'Energia'], rows);
}

function drawCore(ctx, inserted, glow, active, t) {
  const cx = CORE.x + CORE.w / 2;
  const cy = CORE.y + 150;
  const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 170);
  halo.addColorStop(0, `rgba(120, 240, 225, ${0.15 + glow * 0.35})`);
  halo.addColorStop(1, 'rgba(120, 240, 225, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 180, cy - 180, 360, 360);
  ctx.fillStyle = '#8e88a6';
  ctx.beginPath();
  ctx.ellipse(cx, CORE.y + CORE.h - 20, 150, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = `rgba(150, 255, 240, ${0.4 + glow * 0.4})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 9]);
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.rotate(t * (i ? -0.5 : 0.35) * (active ? 4 : 1));
    ctx.beginPath();
    ctx.ellipse(0, 0, 120 + i * 20, 40 + i * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  drawCrystal(ctx, cx, cy + Math.sin(t * 1.6) * 5, 70, { glow: 0.5 + glow, color: glow >= 1 ? '#7ff0e0' : '#8f86b8' });
  // Cristais colocados, girando em volta
  for (let i = 0; i < inserted; i++) {
    const angle = t * 0.8 + (i / Math.max(inserted, 1)) * Math.PI * 2;
    drawCrystal(ctx, cx + Math.cos(angle) * 120, cy + Math.sin(angle) * 40, 9, { glow: 0.8 });
  }
  ctx.fillStyle = 'rgba(20, 16, 40, .8)';
  roundRect(ctx, cx - 70, CORE.y + CORE.h + 4, 140, 34, 10);
  ctx.fill();
  outlinedText(ctx, crystalsLabel(inserted), cx, CORE.y + CORE.h + 21, { font: font(17) });
}

function drawMeter(ctx, energy, showTarget) {
  const { x, y, w, h, max } = METER;
  ctx.fillStyle = '#10142a';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  const scale = (v) => y + h - 6 - Math.min(1, v / max) * (h - 12);
  const top = scale(energy);
  ctx.fillStyle = Math.round(energy) === TARGET ? '#5fe3d0' : showTarget && energy > TARGET ? '#e0523d' : '#f2b84b';
  roundRect(ctx, x + 6, top, w - 12, y + h - 6 - top, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let v = 0; v <= max; v += 10) ctx.fillRect(x + w - 16, scale(v), 10, 2);
  if (showTarget) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 14, scale(TARGET) - 2, w + 28, 4);
    outlinedText(ctx, String(TARGET), x - 30, scale(TARGET), { font: font(16) });
  }
  outlinedText(ctx, `${Math.round(energy)}`, x + w / 2, y + h + 20, { font: font(18) });
  outlinedText(ctx, 'energia', x + w / 2, y - 14, { font: font(13) });
}

export default {
  f1: {
    title: 'Reacender o Núcleo',
    region: 'f',
    npc: 'lyra',
    greeting: 'Coloque cristais no Núcleo e acione a alavanca. Ele só aceita dois testes antes de pedir uma resposta.',
    context: 'Com todas as regiões reconectadas, o Núcleo do Nexo pode voltar a funcionar. Ele transforma cristais em energia, mas ninguém sabe como ele responde depois da Ruptura.',
    goal: `Testar o Núcleo, gerar exatamente ${TARGET} de energia para a vila e escolher a leitura que descreve o Núcleo.`,
    concept: 'Função afim: testar, encontrar a entrada para uma saída pedida e ler o gráfico',
    prerequisites: 'Todas as regiões anteriores',
    relation: 'E = 4c + 6 (energia = 4 × cristais + 6)',
    categories: ['função', 'previsão', 'representação'],
    hints: [
      'Use os dois testes com quantidades diferentes de cristais e compare: quanto a energia muda a cada cristal?',
      'Com 0 cristais o Núcleo já tem alguma energia. Descubra quanto, a partir dos testes.',
      `Para chegar a ${TARGET}, tire a energia fixa e veja quantos cristais completam o restante. Na leitura certa, os pontos passam pelos valores do seu Registro.`,
    ],
    mount: mountCore,
  },
};
