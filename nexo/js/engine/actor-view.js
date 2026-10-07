/* NEXO — Personagem dentro do Phaser: sprite com sombra, ordenado pela altura dos pés
 *
 * O desenho continua vindo do gerador de pixel art (art/sprite.js); cada quadro vira uma
 * textura do Phaser na primeira vez que aparece. Escala e elevação dão o squash and stretch.
 */

import { characterSprite } from '../art/sprite.js';

/** Garante a textura de um canvas e devolve a chave. */
export function ensureCanvasTexture(scene, key, makeCanvas) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, typeof makeCanvas === 'function' ? makeCanvas() : makeCanvas);
  return key;
}

export class ActorView {
  constructor(scene) {
    this.scene = scene;
    this.shadow = scene.add.ellipse(0, 0, 20, 7, 0x1e1428, 0.3);
    this.sprite = scene.add.image(0, 0, '__DEFAULT');
  }

  /**
   * @param {{ x: number, y: number, look: object, pose: { dir, pose, scaleX, scaleY, lift } }} actor
   */
  update({ x, y, look, pose = {} }) {
    const frame = characterSprite(look, pose);
    ensureCanvasTexture(this.scene, frame.key, frame.canvas);
    const lift = pose.lift ?? 0;
    const scaleX = pose.scaleX ?? 1;
    const scaleY = pose.scaleY ?? 1;
    this.sprite
      .setTexture(frame.key)
      .setOrigin(frame.originX, frame.originY)
      .setPosition(Math.round(x), Math.round(y - lift))
      .setScale(scaleX, scaleY)
      .setDepth(y)
      .setVisible(true);
    const shadow = Math.max(0.6, 1 - lift / 20) * scaleX;
    this.shadow.setPosition(x, y - 1).setScale(shadow).setDepth(y - 0.5).setVisible(true);
  }

  hide() {
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
