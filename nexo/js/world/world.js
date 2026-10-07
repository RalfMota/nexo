/* NEXO — Mundo explorável
 *
 * O laço de jogo, a câmera, a colisão e o desenho agora ficam no motor Phaser
 * (js/engine/). Este módulo continua existindo para quem já importava o mundo daqui.
 */

export {
  startWorld, stopWorld, isWorldBusy, getPlayerPosition, getMapPosition, placePlayer,
  getWorldTime, getPlayerFrame, enterBuilding, exitBuilding, isInside,
} from '../engine/engine.js';
