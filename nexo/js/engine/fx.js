/* NEXO — Efeitos do Phaser compartilhados pelas cenas: partículas e surgimento de objetos
 *
 * Como o jogo usa o renderizador de canvas do Phaser (sem tint de cor), as cores das
 * faíscas são quadros diferentes de uma mesma textura pequena.
 */

const SPARK_COLORS = ['#fff3a8', '#7ff0e0', '#ffffff', '#ff9fc0', '#b89cff'];
const DUST_COLORS = ['#c9a26b', '#a57f4b', '#93c74a', '#6e4226'];

function ensureSparkTexture(scene) {
  if (scene.textures.exists('faiscas')) return;
  const colors = [...SPARK_COLORS, ...DUST_COLORS];
  const texture = scene.textures.createCanvas('faiscas', colors.length * 4, 4);
  colors.forEach((color, i) => {
    texture.context.fillStyle = color;
    texture.context.fillRect(i * 4, 0, 3, 3);
    texture.add(`c${i}`, 0, i * 4, 0, 3, 3);
  });
  texture.refresh();
}

/**
 * Cria os emissores de uma cena.
 * @returns {{ sparkle(x, y, count?), sprout(x, y, count?), destroy() }}
 */
export function createFx(scene, depth = 1e6) {
  ensureSparkTexture(scene);
  const sparkFrames = SPARK_COLORS.map((_, i) => `c${i}`);
  const dustFrames = DUST_COLORS.map((_, i) => `c${SPARK_COLORS.length + i}`);
  const sparks = scene.add.particles(0, 0, 'faiscas', {
    frame: sparkFrames,
    speed: { min: 30, max: 90 },
    angle: { min: 200, max: 340 },
    gravityY: 140,
    lifespan: { min: 450, max: 900 },
    scale: { start: 1, end: 0.2 },
    alpha: { start: 1, end: 0 },
    emitting: false,
  }).setDepth(depth);
  const dust = scene.add.particles(0, 0, 'faiscas', {
    frame: dustFrames,
    speed: { min: 10, max: 40 },
    angle: { min: 180, max: 360 },
    gravityY: 60,
    lifespan: { min: 300, max: 600 },
    scale: { start: 1.2, end: 0.4 },
    alpha: { start: 0.9, end: 0 },
    emitting: false,
  }).setDepth(depth);
  return {
    /** Brilho que sobe e cai (algo apareceu, deu certo). */
    sparkle(x, y, count = 14) {
      sparks.explode(count, x, y);
    },
    /** Terra e folhinhas saindo do chão (algo brotou). */
    sprout(x, y, count = 10) {
      dust.explode(count, x, y);
      sparks.explode(Math.ceil(count / 2), x, y - 4);
    },
    destroy() {
      sparks.destroy();
      dust.destroy();
    },
  };
}

/**
 * Faz um objeto do Phaser "brotar": começa achatado e transparente e cresce com um
 * pequeno quique, com partículas saindo do chão.
 */
export function popIn(scene, target, fx, { delay = 0, duration = 520, sprout = true } = {}) {
  const finalScaleX = target.scaleX ?? 1;
  const finalScaleY = target.scaleY ?? 1;
  target.setAlpha(0).setScale(finalScaleX * 0.6, finalScaleY * 0.1);
  scene.tweens.add({
    targets: target,
    alpha: 1,
    scaleX: finalScaleX,
    scaleY: finalScaleY,
    delay,
    duration,
    ease: 'Back.Out',
    onStart: () => {
      if (sprout && fx) fx.sprout(target.x, target.y, 8);
    },
  });
}
