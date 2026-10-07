/* NEXO — Estado comum do motor (sem dependências, para evitar importações circulares)
 *
 * dpr:    pixels do aparelho por pixel CSS (até 2), para tudo ficar nítido em telas densas;
 * cssZoom: quantos pixels CSS mostram um pixel do mundo (o zoom da câmera é cssZoom × dpr);
 * time:   relógio do jogo em segundos;
 * transitioning: true durante o fade de entrar/sair de um prédio (o jogador não anda).
 */

export const engineState = {
  game: null,
  dpr: 1,
  cssZoom: 1,
  time: 0,
  transitioning: false,
  isBusy: () => false,
};

export const worldZoom = () => engineState.cssZoom * engineState.dpr;
