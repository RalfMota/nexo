/* NEXO — Clima da vila
 *
 * Quatro tempos: ensolarado, nublado, chuva e neblina. O clima muda sozinho a cada um a
 * dois minutos e meio, com transição suave de alguns segundos. Cada tempo define:
 *   tint      cor que cobre a tela (luz do dia, céu fechado, chuva azulada...)
 *   clouds    força das sombras de nuvem no chão
 *   wind      força do vento (árvores e grama balançam mais)
 *   rain      intensidade da chuva (riscos na tela e respingos no chão)
 *   fog       densidade da neblina
 *   sun       raios de sol
 */

import { prefersCalm } from '../core/state.js';

export const WEATHERS = {
  sun: { label: 'Ensolarado', icon: '☀', tint: [255, 214, 140, 0.04], clouds: 0.06, wind: 0.8, rain: 0, fog: 0, sun: 1 },
  cloudy: { label: 'Nublado', icon: '☁', tint: [70, 80, 110, 0.16], clouds: 0.16, wind: 1.3, rain: 0, fog: 0.05, sun: 0.15 },
  rain: { label: 'Chuva', icon: '🌧', tint: [40, 60, 110, 0.26], clouds: 0.22, wind: 2.1, rain: 1, fog: 0.08, sun: 0 },
  fog: { label: 'Neblina', icon: '🌫', tint: [190, 200, 215, 0.14], clouds: 0.05, wind: 0.5, rain: 0, fog: 0.45, sun: 0.1 },
};

const SEQUENCE_WEIGHTS = [['sun', 0.4], ['cloudy', 0.25], ['rain', 0.2], ['fog', 0.15]];
const TRANSITION = 7;

let current = 'sun';
let previous = 'sun';
let blend = 1;
let timeLeft = 70;
let listeners = [];
const drops = [];
const splashes = [];

function pickNext() {
  const options = SEQUENCE_WEIGHTS.filter(([id]) => id !== current);
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of options) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return 'sun';
}

/** Muda o clima (com transição). Também usado para testar um clima específico. */
export function setWeather(id, duration = 70 + Math.random() * 80) {
  if (!WEATHERS[id]) return;
  previous = current;
  current = id;
  blend = 0;
  timeLeft = duration;
  listeners.forEach((listener) => listener(WEATHERS[id]));
}

export function onWeatherChange(listener) {
  listeners.push(listener);
  listener(WEATHERS[current]);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export const currentWeather = () => ({ id: current, ...WEATHERS[current] });

/** Valores do clima agora, misturando o anterior e o atual durante a transição. */
export function weatherNow() {
  const a = WEATHERS[previous];
  const b = WEATHERS[current];
  const u = blend;
  const lerp = (x, y) => x + (y - x) * u;
  return {
    tint: a.tint.map((value, i) => lerp(value, b.tint[i])),
    clouds: lerp(a.clouds, b.clouds),
    wind: lerp(a.wind, b.wind),
    rain: lerp(a.rain, b.rain),
    fog: lerp(a.fog, b.fog),
    sun: lerp(a.sun, b.sun),
  };
}

export function updateWeather(dt, view) {
  blend = Math.min(1, blend + dt / TRANSITION);
  timeLeft -= dt;
  if (timeLeft <= 0) setWeather(pickNext());

  const { rain, wind } = weatherNow();
  // Respingos no chão visível
  for (let i = splashes.length - 1; i >= 0; i--) {
    splashes[i].age += dt;
    if (splashes[i].age > 0.35) splashes.splice(i, 1);
  }
  if (rain > 0.05 && view.w && !prefersCalm()) {
    const count = Math.floor(rain * 26 * dt * 10);
    for (let i = 0; i < count; i++) {
      splashes.push({ x: view.x + Math.random() * view.w, y: view.y + Math.random() * view.h, age: 0 });
    }
  }
  // Gotas na tela (coordenadas de 0 a 1, para não depender do tamanho da tela)
  const wanted = prefersCalm() ? 0 : Math.floor(rain * 220);
  while (drops.length < wanted) drops.push({ x: Math.random(), y: Math.random(), speed: 1.1 + Math.random() * 0.6, length: 0.025 + Math.random() * 0.025 });
  drops.length = Math.min(drops.length, wanted);
  for (const drop of drops) {
    drop.y += drop.speed * dt;
    drop.x += wind * 0.06 * dt;
    if (drop.y > 1.05) {
      drop.y = -0.05;
      drop.x = Math.random() * 1.2 - 0.1;
    }
  }
}

/** Respingos no chão (coordenadas do mundo, depois dos personagens). */
export function drawSplashes(ctx) {
  ctx.lineWidth = 1;
  for (const splash of splashes) {
    const u = splash.age / 0.35;
    ctx.strokeStyle = `rgba(200, 225, 255, ${0.55 * (1 - u)})`;
    ctx.beginPath();
    ctx.ellipse(splash.x, splash.y, 1 + u * 4, 0.6 + u * 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Efeitos de tela: cor do céu, neblina e chuva. */
export function drawWeatherScreen(ctx, width, height, t) {
  const now = weatherNow();
  const [r, g, b, a] = now.tint;
  if (a > 0.005) {
    ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (now.fog > 0.01) {
    // Faixas de neblina que deslizam devagar
    for (let i = 0; i < 4; i++) {
      const y = height * (0.15 + i * 0.25) + Math.sin(t * 0.2 + i) * height * 0.04;
      const gradient = ctx.createLinearGradient(0, y - height * 0.18, 0, y + height * 0.18);
      gradient.addColorStop(0, 'rgba(225, 232, 240, 0)');
      gradient.addColorStop(0.5, `rgba(225, 232, 240, ${now.fog * 0.55})`);
      gradient.addColorStop(1, 'rgba(225, 232, 240, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y - height * 0.18, width, height * 0.36);
    }
  }
  if (drops.length) {
    ctx.strokeStyle = `rgba(190, 215, 255, ${0.35 + now.rain * 0.25})`;
    ctx.lineWidth = Math.max(1, width / 900);
    ctx.beginPath();
    const slant = now.wind * 0.012;
    for (const drop of drops) {
      const x = drop.x * width;
      const y = drop.y * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + slant * width * drop.length * 10, y + drop.length * height);
    }
    ctx.stroke();
  }
}
