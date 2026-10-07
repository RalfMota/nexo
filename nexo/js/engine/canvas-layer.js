/* NEXO — Camada de desenho livre dentro de uma cena do Phaser
 *
 * Alguns efeitos continuam sendo pintados com a API de canvas (etiquetas, balões, partículas
 * de poeira, chuva, luz do sol, objetos das missões no mapa). Esta camada é um canvas do
 * tamanho da tela, colocado no mundo exatamente onde a câmera está olhando, com escala
 * 1/zoom: cada pixel do canvas cai em um pixel da tela, então os textos ficam nítidos.
 */

export class CanvasLayer {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} key  nome da textura (único no jogo)
   * @param {number} depth profundidade da camada entre os objetos da cena
   */
  constructor(scene, key, depth) {
    this.scene = scene;
    this.key = key;
    this.depth = depth;
    this.texture = null;
    this.image = null;
    this.resize();
  }

  /** Recria o canvas quando o tamanho do jogo muda. */
  resize() {
    const width = Math.max(1, Math.round(this.scene.scale.width));
    const height = Math.max(1, Math.round(this.scene.scale.height));
    if (this.texture && this.texture.width === width && this.texture.height === height) return;
    this.image?.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    this.texture = this.scene.textures.createCanvas(this.key, width, height);
    this.image = this.scene.add.image(0, 0, this.key).setOrigin(0).setDepth(this.depth);
  }

  /**
   * Começa um quadro: limpa a camada e devolve o contexto já em coordenadas do mundo.
   * @param {{ x: number, y: number }} view canto superior esquerdo visível (mundo)
   * @param {number} zoom pixels de tela por pixel do mundo
   */
  begin(view, zoom) {
    const ctx = this.texture.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.texture.width, this.texture.height);
    ctx.setTransform(zoom, 0, 0, zoom, -view.x * zoom, -view.y * zoom);
    ctx.imageSmoothingEnabled = false;
    this.image.setPosition(view.x, view.y).setScale(1 / zoom);
    return ctx;
  }

  end() {
    this.texture.refresh();
  }

  destroy() {
    this.image?.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    this.image = null;
    this.texture = null;
  }
}
