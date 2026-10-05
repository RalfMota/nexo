/* NEXO — Personagens em pixel art
 * O sprite do mundo fica em sprite.js (alta densidade, sombreado, em cache).
 * Aqui fica o retrato usado nos diálogos, no HUD e nas missões.
 */

import { shade } from './shapes.js';

export { drawCharacter } from './sprite.js';

const EYE = '#1b1b2e';
const BLUSH = 'rgba(230, 110, 110, .45)';
const UNDERSHIRT = '#f4f0e6';

/**
 * Retrato do personagem (grade 32 × 32) com expressão.
 * @param {'neutral'|'happy'|'worried'|'thinking'} mood
 */
export function drawPortrait(canvas, look, mood = 'neutral', background = '#5fe3d0') {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const P = size / 32;
  const px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * P), Math.round(y * P), Math.ceil(w * P), Math.ceil(h * P));
  };

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, shade(background, 0.35));
  gradient.addColorStop(1, shade(background, -0.15));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  // Pontos de luz no fundo
  px(3, 4, 1, 1, 'rgba(255,255,255,.6)');
  px(27, 8, 1, 1, 'rgba(255,255,255,.6)');
  px(5, 20, 1, 1, 'rgba(255,255,255,.4)');

  const skin = look.skin;
  const skinDark = shade(skin, -0.14);
  const hair = look.hair;
  const hairDark = shade(hair, -0.25);
  const shirt = look.shirt;

  // Cabelo longo atrás
  if (look.hairStyle === 'long') px(6, 8, 20, 18, hairDark);
  if (look.hairStyle === 'braid') px(22, 12, 4, 14, hairDark);

  // Ombros, roupa e pescoço
  const top = look.top ?? 'tee';
  const shirtDark = shade(shirt, -0.2);
  if (top === 'hoodie') px(7, 21, 18, 5, shirtDark);
  px(3, 25, 26, 7, shirt);
  px(3, 25, 26, 1, shade(shirt, 0.18));
  if (top === 'tank') {
    px(3, 25, 7, 7, skin);
    px(22, 25, 7, 7, skin);
  }
  px(12, 24, 8, 2, shirtDark);
  px(13, 20, 6, 5, skinDark);
  if (top === 'jacket') {
    px(13, 25, 6, 7, UNDERSHIRT);
    px(11, 25, 2, 7, shirtDark);
    px(19, 25, 2, 7, shirtDark);
  }
  if (top === 'hoodie') {
    px(14, 26, 1, 4, UNDERSHIRT);
    px(17, 26, 1, 4, UNDERSHIRT);
  }

  // Cabeça
  px(9, 7, 14, 14, skin);
  px(8, 9, 1, 10, skin);
  px(23, 9, 1, 10, skin);
  px(10, 21, 12, 1, skin);
  px(7, 13, 1, 3, skin);
  px(24, 13, 1, 3, skin);

  // Cabelo
  px(8, 5, 16, 4, hair);
  px(7, 7, 2, 6, hair);
  px(23, 7, 2, 6, hair);
  px(9, 9, 6, 2, hair);
  px(17, 9, 5, 1, hair);
  px(9, 5, 14, 1, shade(hair, 0.2));
  switch (look.hairStyle) {
    case 'spiky':
      px(9, 3, 2, 2, hair);
      px(13, 2, 2, 3, hair);
      px(17, 3, 2, 2, hair);
      px(21, 4, 2, 2, hair);
      break;
    case 'bun':
      px(13, 1, 6, 5, hair);
      px(14, 1, 3, 1, shade(hair, 0.2));
      break;
    case 'long':
      px(6, 9, 3, 15, hair);
      px(23, 9, 3, 15, hair);
      break;
    case 'braid':
      px(23, 9, 3, 6, hair);
      px(23, 20, 3, 1, '#e8c65a');
      break;
    default:
      break;
  }

  // Sobrancelhas
  if (mood === 'worried') {
    px(11, 11, 1, 1, hairDark);
    px(12, 10, 2, 1, hairDark);
    px(18, 10, 2, 1, hairDark);
    px(20, 11, 1, 1, hairDark);
  } else if (mood === 'thinking') {
    px(11, 10, 3, 1, hairDark);
    px(18, 11, 3, 1, hairDark);
  } else {
    px(11, 11, 3, 1, hairDark);
    px(18, 11, 3, 1, hairDark);
  }

  // Olhos
  if (mood === 'happy') {
    for (const ex of [11, 18]) {
      px(ex, 14, 1, 1, EYE);
      px(ex + 1, 13, 1, 1, EYE);
      px(ex + 2, 14, 1, 1, EYE);
    }
  } else {
    const lookUp = mood === 'thinking' ? -1 : 0;
    for (const ex of [11, 18]) {
      px(ex, 13, 3, 3, '#ffffff');
      px(ex + 1, 13 + lookUp, 2, 3, EYE);
      px(ex + 1, 13 + lookUp, 1, 1, '#ffffff');
    }
  }

  // Nariz, bochechas e boca
  px(15, 16, 2, 2, skinDark);
  px(10, 17, 2, 1, BLUSH);
  px(20, 17, 2, 1, BLUSH);
  const mouth = '#8a3b3b';
  if (mood === 'happy') {
    px(13, 18, 1, 1, mouth);
    px(14, 19, 4, 1, mouth);
    px(18, 18, 1, 1, mouth);
    px(14, 18, 4, 1, '#fff');
  } else if (mood === 'worried') {
    px(14, 19, 4, 1, mouth);
    px(13, 20, 1, 1, mouth);
    px(18, 20, 1, 1, mouth);
  } else if (mood === 'thinking') {
    px(15, 19, 3, 1, mouth);
  } else {
    px(14, 19, 4, 1, mouth);
  }

  drawPortraitAccessory(px, look.accessory, hair);
}

function drawPortraitAccessory(px, accessory, hair) {
  switch (accessory) {
    case 'pendant':
      px(15, 26, 2, 1, '#e8e0ff');
      px(14, 27, 4, 3, '#5fe3d0');
      px(15, 27, 1, 1, '#e3fffb');
      break;
    case 'visor':
      px(8, 9, 16, 2, '#e8e0ff');
      px(8, 10, 16, 1, '#b8aee0');
      break;
    case 'goggles':
      px(7, 8, 18, 2, '#3b3b5c');
      px(10, 7, 4, 4, '#5fe3d0');
      px(18, 7, 4, 4, '#5fe3d0');
      px(11, 7, 1, 1, '#e3fffb');
      px(19, 7, 1, 1, '#e3fffb');
      break;
    case 'hat':
      px(4, 6, 24, 2, '#e3c26a');
      px(9, 1, 14, 5, '#e3c26a');
      px(9, 4, 14, 1, '#b5452f');
      px(10, 1, 12, 1, '#f1d98c');
      break;
    case 'circlet':
      px(8, 8, 16, 1, '#ffe08a');
      px(15, 7, 2, 2, '#b48cff');
      break;
    case 'glasses':
      px(10, 12, 5, 5, '#cfd6ff');
      px(17, 12, 5, 5, '#cfd6ff');
      px(11, 13, 3, 3, 'rgba(255,255,255,.35)');
      px(18, 13, 3, 3, 'rgba(255,255,255,.35)');
      px(15, 14, 2, 1, '#cfd6ff');
      break;
    case 'beard':
      px(9, 17, 14, 4, hair);
      px(11, 21, 10, 2, hair);
      px(14, 18, 4, 1, '#8a3b3b');
      break;
    case 'scarf':
      px(9, 22, 14, 3, '#f2b84b');
      px(18, 24, 3, 5, '#e0a12f');
      break;
    default:
      break;
  }
}
