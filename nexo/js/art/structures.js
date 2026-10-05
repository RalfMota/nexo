/* NEXO — Construções e objetos do cenário
 * paint*: partes fixas, pintadas uma vez na camada de fundo.
 * draw*:  partes animadas, desenhadas a cada quadro.
 */

import { shade, roundRect, circle, drawCrystal, drawGear } from './shapes.js';

const T = 32;
const SIGN_FONT = '700 9px "Pixelify Sans", monospace';

/* ---------- Construções ---------- */

export function paintBuilding(ctx, building) {
  switch (building.kind) {
    case 'tower':
      paintTower(ctx, building);
      break;
    case 'workshop':
      paintHouse(ctx, building, { wall: '#a8634a', roof: '#5a4a7a', brick: true, bigDoor: true });
      break;
    case 'station':
      paintHouse(ctx, building, { wall: '#ece0c4', roof: '#2a9d8f' });
      paintAntenna(ctx, building);
      break;
    case 'farmhouse':
      paintHouse(ctx, building, { wall: '#ead6ac', roof: '#b8432f', chimney: true });
      break;
    default:
      paintHouse(ctx, building, { wall: building.wall, roof: building.roof, chimney: true });
  }
}

function paintHouse(ctx, b, { wall, roof, brick = false, bigDoor = false, chimney = false }) {
  const X = b.x * T;
  const Y = b.y * T;
  const W = b.w * T;
  const H = b.h * T;
  const roofH = Math.round(H * 0.52);

  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(X + 6, Y + H - 6, W, 10);

  // Parede
  ctx.fillStyle = wall;
  ctx.fillRect(X + 3, Y + roofH - 6, W - 6, H - roofH + 6);
  ctx.fillStyle = shade(wall, -0.1);
  if (brick) {
    for (let row = Y + roofH; row < Y + H - 6; row += 6) {
      ctx.fillRect(X + 3, row, W - 6, 1);
      const offset = ((row - Y) / 6) % 2 ? 6 : 0;
      for (let col = X + 3 + offset; col < X + W - 3; col += 12) ctx.fillRect(col, row, 1, 6);
    }
  } else {
    for (let row = Y + roofH; row < Y + H - 6; row += 6) ctx.fillRect(X + 3, row, W - 6, 1);
  }
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(X + 3, Y + H - 6, W - 6, 6);

  // Chaminé
  if (chimney) {
    ctx.fillStyle = '#8b4a3a';
    ctx.fillRect(X + W - 28, Y - 8, 10, 20);
    ctx.fillStyle = '#6e3a2d';
    ctx.fillRect(X + W - 30, Y - 10, 14, 4);
  }

  // Telhado com telhas
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(X - 5, Y + roofH);
  ctx.lineTo(X + W + 5, Y + roofH);
  ctx.lineTo(X + W - 8, Y + 2);
  ctx.lineTo(X + 8, Y + 2);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = shade(roof, -0.18);
  for (let row = Y + 8; row < Y + roofH; row += 7) ctx.fillRect(X - 5, row, W + 10, 2);
  ctx.fillStyle = shade(roof, 0.2);
  ctx.fillRect(X, Y + 2, W, 3);
  ctx.restore();
  ctx.fillStyle = shade(roof, -0.35);
  ctx.fillRect(X - 5, Y + roofH, W + 10, 3);

  // Janelas
  if (W >= 96) {
    for (const wx of [X + 12, X + W - 34]) paintWindow(ctx, wx, Y + roofH + 8);
  }

  // Porta
  const doorW = bigDoor ? 44 : 20;
  const doorX = X + W / 2 - doorW / 2;
  const doorY = Y + H - 28;
  ctx.fillStyle = '#4a2a16';
  ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, 28);
  ctx.fillStyle = bigDoor ? '#7a7f96' : '#6a3f22';
  ctx.fillRect(doorX, doorY, doorW, 26);
  if (bigDoor) {
    ctx.fillStyle = '#5c6075';
    for (let row = doorY + 4; row < doorY + 26; row += 5) ctx.fillRect(doorX, row, doorW, 1);
  } else {
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(doorX + doorW - 6, doorY + 13, 3, 3);
  }

  if (b.label) paintSignBoard(ctx, X + W / 2, Y + roofH - 2, b.label);
}

function paintWindow(ctx, x, y) {
  ctx.fillStyle = '#4a2a16';
  ctx.fillRect(x - 2, y - 2, 24, 20);
  ctx.fillStyle = '#ffd98a';
  ctx.fillRect(x, y, 20, 16);
  ctx.fillStyle = '#ffeebf';
  ctx.fillRect(x + 2, y + 2, 6, 4);
  ctx.fillStyle = '#4a2a16';
  ctx.fillRect(x + 9, y, 2, 16);
  ctx.fillRect(x, y + 7, 20, 2);
}

function paintSignBoard(ctx, centerX, y, text) {
  ctx.font = SIGN_FONT;
  const width = Math.ceil(ctx.measureText(text).width) + 12;
  ctx.fillStyle = '#4a2a16';
  ctx.fillRect(centerX - width / 2 - 1, y - 1, width + 2, 15);
  ctx.fillStyle = '#7a4a28';
  ctx.fillRect(centerX - width / 2, y, width, 13);
  ctx.fillStyle = '#ffe9b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, centerX, y + 7);
}

function paintAntenna(ctx, b) {
  const x = b.x * T + b.w * T - 22;
  const y = b.y * T - 6;
  ctx.fillStyle = '#5b5f73';
  ctx.fillRect(x, y, 3, 22);
  ctx.fillStyle = '#c9cede';
  ctx.beginPath();
  ctx.arc(x + 1, y, 8, Math.PI * 0.1, Math.PI * 0.9);
  ctx.fill();
}

function paintTower(ctx, b) {
  const X = b.x * T;
  const Y = b.y * T;
  const W = b.w * T;
  const H = b.h * T;
  const left = X + 14;
  const right = X + W - 14;

  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(X + 10, Y + H - 6, W - 6, 10);

  // Corpo de pedra
  ctx.fillStyle = '#9097b8';
  ctx.fillRect(left, Y + 30, right - left, H - 30);
  ctx.fillStyle = '#7a81a3';
  ctx.fillRect(right - 18, Y + 30, 18, H - 30);
  ctx.fillStyle = '#a9b0cf';
  ctx.fillRect(left, Y + 30, 10, H - 30);
  ctx.fillStyle = 'rgba(40,40,70,.25)';
  for (let row = Y + 36; row < Y + H; row += 10) {
    ctx.fillRect(left, row, right - left, 1);
    const offset = ((row - Y) / 10) % 2 ? 10 : 0;
    for (let col = left + offset; col < right; col += 20) ctx.fillRect(col, row, 1, 10);
  }

  // Janelas em arco com luz azul
  for (let wy = Y + 52; wy < Y + H - 50; wy += 46) {
    const wx = X + W / 2 - 8;
    ctx.fillStyle = '#2e3358';
    roundRect(ctx, wx - 2, wy - 2, 20, 26, [10, 10, 2, 2]);
    ctx.fill();
    ctx.fillStyle = '#9fd8ff';
    roundRect(ctx, wx, wy, 16, 22, [8, 8, 1, 1]);
    ctx.fill();
  }

  // Ameias e telhado cônico
  ctx.fillStyle = '#7a81a3';
  for (let col = left - 4; col < right + 4; col += 12) ctx.fillRect(col, Y + 26, 8, 8);
  ctx.fillStyle = '#3a4fb0';
  ctx.beginPath();
  ctx.moveTo(left - 8, Y + 28);
  ctx.lineTo(X + W / 2, Y - 26);
  ctx.lineTo(right + 8, Y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5470d8';
  ctx.beginPath();
  ctx.moveTo(left - 8, Y + 28);
  ctx.lineTo(X + W / 2, Y - 26);
  ctx.lineTo(X + W / 2 - 6, Y + 28);
  ctx.closePath();
  ctx.fill();

  // Porta em arco
  const doorX = X + W / 2 - 13;
  ctx.fillStyle = '#2e2440';
  roundRect(ctx, doorX - 2, Y + H - 36, 30, 36, [14, 14, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#5a3d7a';
  roundRect(ctx, doorX, Y + H - 34, 26, 34, [12, 12, 0, 0]);
  ctx.fill();
  paintSignBoard(ctx, X + W / 2, Y + H - 54, b.label);
}

/* ---------- Objetos: partes fixas ---------- */

export function paintProp(ctx, prop) {
  const X = prop.x * T;
  const Y = prop.y * T;
  switch (prop.type) {
    case 'lamp':
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(X + 10, Y + 27, 12, 4);
      ctx.fillStyle = '#3b3b46';
      ctx.fillRect(X + 14, Y + 4, 4, 26);
      ctx.fillRect(X + 11, Y + 27, 10, 3);
      break;
    case 'crystal':
      ctx.fillStyle = '#7d7f8c';
      roundRect(ctx, X + 6, Y + 20, 20, 10, 4);
      ctx.fill();
      ctx.fillStyle = '#9a9cab';
      ctx.fillRect(X + 9, Y + 21, 8, 3);
      break;
    case 'gear':
      ctx.fillStyle = '#4b4560';
      ctx.fillRect(X + 4, Y + 22, 24, 8);
      ctx.fillStyle = '#5d5775';
      ctx.fillRect(X + 14, Y + 8, 4, 16);
      break;
    case 'crate':
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(X + 4, Y + 26, 26, 5);
      ctx.fillStyle = '#b98a52';
      ctx.fillRect(X + 4, Y + 6, 24, 22);
      ctx.fillStyle = '#8a6136';
      ctx.fillRect(X + 4, Y + 6, 24, 3);
      ctx.fillRect(X + 4, Y + 25, 24, 3);
      ctx.fillRect(X + 4, Y + 6, 3, 22);
      ctx.fillRect(X + 25, Y + 6, 3, 22);
      ctx.fillRect(X + 14, Y + 9, 3, 16);
      break;
    case 'barrel':
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(X + 6, Y + 26, 22, 5);
      ctx.fillStyle = '#9a6337';
      roundRect(ctx, X + 7, Y + 6, 18, 23, 6);
      ctx.fill();
      ctx.fillStyle = '#5b5f73';
      ctx.fillRect(X + 7, Y + 10, 18, 2);
      ctx.fillRect(X + 7, Y + 22, 18, 2);
      ctx.fillStyle = '#b97c47';
      ctx.fillRect(X + 10, Y + 13, 3, 8);
      break;
    case 'fence':
      for (let i = 0; i < prop.w; i++) {
        const fx = X + i * T;
        ctx.fillStyle = '#a0703f';
        ctx.fillRect(fx, Y + 12, T, 4);
        ctx.fillRect(fx, Y + 21, T, 4);
        ctx.fillStyle = '#7d5530';
        ctx.fillRect(fx + 4, Y + 8, 5, 22);
        ctx.fillRect(fx + 22, Y + 8, 5, 22);
      }
      break;
    case 'stall':
      paintStall(ctx, prop);
      break;
    case 'fountain':
      ctx.fillStyle = '#9b958a';
      roundRect(ctx, X + 2, Y + 4, prop.w * T - 4, prop.h * T - 6, 14);
      ctx.fill();
      ctx.fillStyle = '#4f9fd9';
      roundRect(ctx, X + 10, Y + 12, prop.w * T - 20, prop.h * T - 22, 10);
      ctx.fill();
      ctx.fillStyle = '#b5afa3';
      ctx.fillRect(X + prop.w * T / 2 - 5, Y + 16, 10, 24);
      break;
    case 'board':
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(X + 6, Y + 14, 4, 18);
      ctx.fillRect(X + prop.w * T - 10, Y + 14, 4, 18);
      ctx.fillStyle = '#efe0bb';
      ctx.fillRect(X + 2, Y, prop.w * T - 4, 22);
      ctx.strokeStyle = '#a0703f';
      ctx.lineWidth = 3;
      ctx.strokeRect(X + 2, Y, prop.w * T - 4, 22);
      ctx.strokeStyle = '#c2453b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X + 10, Y + 16);
      ctx.lineTo(X + 24, Y + 6);
      ctx.lineTo(X + 38, Y + 14);
      ctx.lineTo(X + 54, Y + 5);
      ctx.stroke();
      break;
    case 'sign':
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(X + 14, Y + 12, 4, 18);
      ctx.fillStyle = '#4a2a16';
      ctx.fillRect(X + 3, Y + 3, 26, 14);
      ctx.fillStyle = '#a0703f';
      ctx.fillRect(X + 4, Y + 4, 24, 12);
      ctx.fillStyle = '#ffe9b8';
      ctx.fillRect(X + 8, Y + 8, 16, 2);
      ctx.fillRect(X + 8, Y + 12, 11, 1);
      break;
    default:
      break;
  }
}

function paintStall(ctx, prop) {
  const X = prop.x * T;
  const Y = prop.y * T;
  const W = prop.w * T;
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fillRect(X + 4, Y + 58, W, 6);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(X + 4, Y + 10, 4, 50);
  ctx.fillRect(X + W - 8, Y + 10, 4, 50);
  // Balcão com mercadorias
  ctx.fillStyle = '#a0703f';
  ctx.fillRect(X + 2, Y + 36, W - 4, 24);
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(X + 2, Y + 36, W - 4, 4);
  const goods = ['#5fe3d0', '#ff9fc0', '#f2b84b', '#b48cff'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = goods[(i + prop.x) % goods.length];
    ctx.fillRect(X + 10 + i * 12, Y + 28, 8, 8);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(X + 11 + i * 12, Y + 29, 3, 2);
  }
  // Toldo listrado
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#fff6dc' : prop.color;
    ctx.fillRect(X + i * (W / 8), Y + 2, W / 8, 16);
    ctx.beginPath();
    ctx.arc(X + i * (W / 8) + W / 16, Y + 18, W / 16, 0, Math.PI);
    ctx.fill();
  }
}

/** Base de pedra do Núcleo (parte fixa). */
export function paintCoreBase(ctx, core) {
  const X = core.x * T;
  const Y = core.y * T;
  const W = core.w * T;
  const H = core.h * T;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(X + W / 2, Y + H - 6, W / 2, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8e88a6';
  ctx.beginPath();
  ctx.ellipse(X + W / 2, Y + H - 16, W / 2 - 2, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a9a3c2';
  ctx.beginPath();
  ctx.ellipse(X + W / 2, Y + H - 22, W / 2 - 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6e6890';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(X + W / 2, Y + H - 22, W / 2 - 26, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Pilares
  ctx.fillStyle = '#6e6890';
  ctx.fillRect(X + 12, Y + 18, 8, H - 40);
  ctx.fillRect(X + W - 20, Y + 18, 8, H - 40);
  ctx.fillStyle = '#c0bad8';
  ctx.fillRect(X + 12, Y + 18, 3, H - 40);
  ctx.fillRect(X + W - 20, Y + 18, 3, H - 40);
}

/* ---------- Partes animadas ---------- */

export function drawLampLight(ctx, prop, lit, t) {
  const x = prop.x * T + 16;
  const y = prop.y * T + 6;
  if (lit) {
    const pulse = 0.85 + Math.sin(t * 3 + prop.x) * 0.08;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 40);
    glow.addColorStop(0, `rgba(255, 214, 120, ${0.55 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 40, y - 40, 80, 80);
  }
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x - 6, y - 4, 12, 13);
  ctx.fillStyle = lit ? '#ffe08a' : '#5b5f73';
  ctx.fillRect(x - 4, y - 2, 8, 9);
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x - 7, y - 6, 14, 3);
}

export function drawCrystalProp(ctx, prop, t, energy = 1) {
  const glow = (0.6 + 0.4 * Math.sin(t * 2.4 + prop.x * 3 + prop.y)) * energy;
  const x = prop.x * T + 16;
  const y = prop.y * T + 14 + Math.sin(t * 1.5 + prop.x) * 1.5;
  drawCrystal(ctx, x - 5, y + 4, 7, { glow, color: '#79e6ff' });
  drawCrystal(ctx, x + 3, y, 10, { glow });
}

export function drawGearProp(ctx, prop, t, speed = 1) {
  const x = prop.x * T + 16;
  const y = prop.y * T + 8;
  drawGear(ctx, x, y, 11, t * speed, '#e8a33d');
  drawGear(ctx, x + 14, y + 10, 6, -t * speed * 1.8, '#c97a2a');
}

export function drawFountainWater(ctx, prop, t) {
  const cx = prop.x * T + (prop.w * T) / 2;
  const top = prop.y * T + 10;
  for (let i = 0; i < 6; i++) {
    const phase = (t * 1.6 + i / 6) % 1;
    const spread = (i - 2.5) * 6 * phase;
    const height = Math.sin(phase * Math.PI) * 18;
    ctx.fillStyle = `rgba(210, 240, 255, ${1 - phase})`;
    ctx.fillRect(cx + spread - 1, top + 14 - height, 3, 3);
  }
}

/** Ruptura: parede de energia instável. */
export function drawBarrier(ctx, tiles, t) {
  for (const [tx, ty] of tiles) {
    const x = tx * T;
    const y = ty * T;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + ty);
    ctx.fillStyle = `rgba(110, 50, 190, ${0.35 + pulse * 0.2})`;
    ctx.fillRect(x + 4, y - 10, 24, 42);
    ctx.strokeStyle = `rgba(214, 170, 255, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let px = x + 16;
    ctx.moveTo(px, y - 10);
    for (let step = 1; step <= 6; step++) {
      px = x + 16 + Math.sin(t * 9 + step * 2.3 + tx * 5 + ty) * 9;
      ctx.lineTo(px, y - 10 + step * 7);
    }
    ctx.stroke();
  }
  // Fagulhas
  for (let i = 0; i < 4; i++) {
    const [tx, ty] = tiles[i % tiles.length];
    const phase = (t * 0.8 + i * 0.27) % 1;
    ctx.fillStyle = `rgba(230, 200, 255, ${1 - phase})`;
    ctx.fillRect(tx * T + 8 + ((i * 7) % 16), ty * T + 20 - phase * 36, 2, 2);
  }
}

/** Cristal do Núcleo: brilho e anéis crescem com as regiões reconectadas (0 a 1). */
export function drawCoreCrystal(ctx, core, energy, t) {
  const cx = core.x * T + (core.w * T) / 2;
  const cy = core.y * T + 20 + Math.sin(t * 1.6) * 3;
  const intensity = 0.25 + energy * 0.75;

  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70 + energy * 40);
  halo.addColorStop(0, `rgba(120, 240, 225, ${0.45 * intensity})`);
  halo.addColorStop(1, 'rgba(120, 240, 225, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 110, cy - 110, 220, 220);

  // Anéis tecnológicos
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = `rgba(150, 255, 240, ${0.35 + energy * 0.5})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    ctx.save();
    ctx.rotate(t * (i ? -0.6 : 0.4) * (0.3 + energy));
    ctx.beginPath();
    ctx.ellipse(0, 0, 36 + i * 8, 12 + i * 4, 0, 0, Math.PI * 2);
    ctx.setLineDash([10, 6]);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  const color = energy >= 1 ? '#7ff0e0' : energy > 0.4 ? '#5fc8d8' : '#8f86b8';
  drawCrystal(ctx, cx, cy, 24, { glow: intensity * 1.6, color, light: '#f2fffd' });

  // Rachaduras enquanto o Núcleo não estiver restaurado
  if (energy < 1) {
    ctx.strokeStyle = `rgba(60, 30, 90, ${0.8 * (1 - energy)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 18);
    ctx.lineTo(cx + 4, cy - 6);
    ctx.lineTo(cx - 2, cy + 4);
    ctx.lineTo(cx + 3, cy + 12);
    ctx.stroke();
  }
}

export function drawTowerCrystal(ctx, tower, energy, t) {
  const cx = tower.x * T + (tower.w * T) / 2;
  const cy = tower.y * T - 36 + Math.sin(t * 2) * 2;
  drawCrystal(ctx, cx, cy, 10, { glow: 0.4 + energy, color: energy ? '#9fc2ff' : '#7d82a8' });
}

export function drawStationSignal(ctx, station, active, t) {
  if (!active) return;
  const x = station.x * T + station.w * T - 21;
  const y = station.y * T - 8;
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.7 + i / 3) % 1;
    ctx.strokeStyle = `rgba(95, 227, 208, ${1 - phase})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6 + phase * 22, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

export function drawSmoke(ctx, building, t) {
  const x = building.x * T + building.w * T - 23;
  const y = building.y * T - 12;
  for (let i = 0; i < 4; i++) {
    const phase = (t * 0.35 + i / 4) % 1;
    circle(ctx, x + Math.sin(phase * 6 + i) * 4, y - phase * 30, 3 + phase * 6, `rgba(235, 235, 240, ${0.55 * (1 - phase)})`);
  }
}
