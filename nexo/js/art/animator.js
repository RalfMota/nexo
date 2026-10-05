/* NEXO — Motor de animação dos personagens
 *
 * Cada animação é um "clipe" de keyframes. Um keyframe diz:
 *   dur    quanto tempo dura (segundos)
 *   pose   o desenho do quadro (pernas, braços, quanto o corpo desce; ver sprite.js)
 *   sx sy  escala horizontal/vertical (squash and stretch)
 *   lift   quantos pixels o corpo sobe
 *   event  aviso disparado quando o quadro começa ('step', 'impact', 'grab')
 * A pose troca de quadro em quadro (pixel art), mas a escala e a elevação são
 * interpoladas suavemente até o keyframe seguinte: esses são os quadros intermediários.
 *
 * Locomoção (parado, andando, carregando) é escolhida sozinha a cada quadro;
 * ações (levantar, cavar, colher, manusear) tocam uma vez e voltam à locomoção.
 */

import { prefersCalm } from '../core/state.js';

const k = (dur, pose, sx = 1, sy = 1, lift = 0, event = null) => ({ dur, pose, sx, sy, lift, event });

export const CLIPS = {
  // Respiração: o tronco "enche" e "esvazia" devagar
  idle: {
    loop: true,
    keys: [
      k(1.0, { bob: 0 }, 1, 1),
      k(0.25, { bob: 0 }, 1.012, 0.988),
      k(1.0, { bob: 1 }, 1.016, 0.984),
      k(0.25, { bob: 0 }, 1.006, 0.994),
    ],
  },
  // Passos: o corpo sobe no passo e achata um pouco ao pisar
  walk: {
    loop: true,
    keys: [
      k(0.13, { legs: 1, bob: -1, arms: 'swingB' }, 0.985, 1.025, 1),
      k(0.13, { legs: 2, bob: 0, arms: 'rest' }, 1.02, 0.975, 0, 'step'),
      k(0.13, { legs: 3, bob: -1, arms: 'swingA' }, 0.985, 1.025, 1),
      k(0.13, { legs: 0, bob: 0, arms: 'rest' }, 1.02, 0.975, 0, 'step'),
    ],
  },
  // Agacha, pega e ergue o objeto acima da cabeça
  lift: {
    keys: [
      k(0.07, { bob: 1, arms: 'forward' }, 1.03, 0.97),
      k(0.09, { crouch: true, bob: 3, arms: 'forward' }, 1.1, 0.88, 0, 'grab'),
      k(0.07, { bob: 1, arms: 'half' }, 0.96, 1.06, 1),
      k(0.12, { bob: 0, arms: 'raised' }, 0.97, 1.05, 2),
      k(0.1, { bob: 0, arms: 'raised' }, 1, 1),
    ],
  },
  // Ergue a enxada, bate no chão (impacto), recolhe
  dig: {
    keys: [
      k(0.08, { arms: 'half' }, 0.98, 1.03),
      k(0.16, { bob: -1, arms: 'tool-up' }, 0.95, 1.07, 1),
      k(0.06, { arms: 'tool-up' }, 0.97, 1.04),
      k(0.08, { bob: 1, arms: 'tool-down' }, 1.12, 0.88, 0, 'impact'),
      k(0.18, { bob: 1, arms: 'tool-down' }, 1.04, 0.96),
      k(0.1, { arms: 'rest' }, 1, 1),
    ],
  },
  // Agacha até o chão (plantar, colher, despejar) e levanta
  harvest: {
    keys: [
      k(0.06, { bob: 1, arms: 'forward' }, 1.03, 0.97),
      k(0.08, { crouch: true, bob: 3, arms: 'forward' }, 1.1, 0.88, 0, 'impact'),
      k(0.16, { crouch: true, bob: 3, arms: 'forward' }, 1.04, 0.95),
      k(0.08, { bob: 1, arms: 'half' }, 0.97, 1.04, 1),
      k(0.08, { bob: 0, arms: 'rest' }, 1, 1),
    ],
  },
  // Mexe em algo na altura das mãos (máquina, balcão, caldeirão)
  use: {
    keys: [
      k(0.08, { arms: 'forward' }, 1.02, 0.98),
      k(0.18, { bob: 1, arms: 'forward' }, 1.05, 0.95, 0, 'impact'),
      k(0.1, { arms: 'rest' }, 1, 1),
    ],
  },
};

const ease = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;

/**
 * Cria o animador de um personagem.
 * @param {{ phase?: number }} options phase desencontra a respiração de vários personagens
 */
export function createAnimator({ phase = 0 } = {}) {
  let clipName = 'idle';
  let action = null; // { name, onEvent }
  let keyIndex = 0;
  let keyTime = phase;
  let blinkIn = 2 + Math.random() * 3;
  let blinkLeft = 0;
  let current = { pose: {}, scaleX: 1, scaleY: 1, lift: 0 };

  function enter(name) {
    clipName = name;
    keyIndex = 0;
    keyTime = 0;
  }

  return {
    /** Toca uma ação uma vez (levantar, cavar, colher, manusear). */
    play(name, onEvent = null) {
      if (!CLIPS[name]) return;
      action = { name, onEvent };
      enter(name);
    },

    get busy() {
      return Boolean(action);
    },

    /**
     * Avança o tempo e devolve o quadro atual: { pose, scaleX, scaleY, lift }.
     * @param {{ moving: boolean, carrying: boolean, speed?: number, onEvent?: (name: string) => void }} context
     */
    update(dt, { moving, carrying, speed = 1, onEvent }) {
      // Sem ação, a locomoção decide o clipe
      if (!action) {
        const wanted = moving ? 'walk' : 'idle';
        if (wanted !== clipName) enter(wanted);
      }
      const clip = CLIPS[clipName];
      keyTime += dt * (clipName === 'walk' ? speed : 1);

      while (keyTime >= clip.keys[keyIndex].dur) {
        keyTime -= clip.keys[keyIndex].dur;
        keyIndex++;
        if (keyIndex >= clip.keys.length) {
          if (clip.loop) keyIndex = 0;
          else {
            action = null;
            enter(moving ? 'walk' : 'idle');
            return this.update(0, { moving, carrying, speed, onEvent });
          }
        }
        const event = CLIPS[clipName].keys[keyIndex].event;
        if (event) {
          onEvent?.(event);
          action?.onEvent?.(event);
        }
      }

      const keys = CLIPS[clipName].keys;
      const key = keys[keyIndex];
      const next = keys[(keyIndex + 1) % keys.length];
      const target = !CLIPS[clipName].loop && keyIndex === keys.length - 1 ? key : next;
      const u = ease(Math.min(1, keyTime / key.dur));
      const calm = prefersCalm();

      // Piscar: olhos fechados por um instante a cada poucos segundos
      blinkIn -= dt;
      if (blinkIn <= 0) {
        blinkLeft = 0.12;
        blinkIn = 2.5 + Math.random() * 3.5;
      }
      blinkLeft = Math.max(0, blinkLeft - dt);

      const pose = { ...key.pose, blink: blinkLeft > 0 };
      // Carregando algo: na locomoção, os braços ficam erguidos
      if (carrying && !action) pose.arms = 'raised';

      current = {
        pose,
        scaleX: calm ? 1 : lerp(key.sx, target.sx, u),
        scaleY: calm ? 1 : lerp(key.sy, target.sy, u),
        lift: calm ? 0 : lerp(key.lift, target.lift, u),
        arms: pose.arms ?? 'rest',
      };
      return current;
    },

    get frame() {
      return current;
    },
  };
}
