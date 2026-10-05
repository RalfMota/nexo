/* NEXO — Mesa de jogo das missões
 *
 * Uma cena animada (canvas de fundo) com objetos que o jogador pega e leva até outro lugar.
 * Tudo é feito com as mãos, sem formulários:
 *   - token "item":   objeto que se arrasta e solta numa zona (ou se toca e depois se toca a zona);
 *   - token "source": pilha inesgotável; arrastar leva uma cópia, tocar (ou segurar) entrega uma unidade;
 *   - token "button": alavanca, manivela, sino... só se toca (segurar repete, se permitido);
 *   - zona:           lugar que recebe objetos (canteiro, caldeirão, carrinho...).
 * Coordenadas lógicas: 960 × 540 por padrão; a mesa se adapta à largura da tela.
 */

import { setupCanvas, toElement, escapeHtml } from '../core/dom.js';
import { prefersCalm } from '../core/state.js';
import { createScene } from './widgets.js';

const HOLD_DELAY = 380;
const REPEAT_EVERY = 110;
const DRAG_THRESHOLD = 6;

export function createPlayfield(stage, { width = 960, height = 540, draw } = {}, api) {
  const root = toElement(`
    <div class="playfield" style="aspect-ratio:${width} / ${height}">
      <canvas class="playfield__bg" aria-hidden="true"></canvas>
      <div class="playfield__zones"></div>
      <div class="playfield__tokens"></div>
    </div>`);
  stage.appendChild(root);
  const zoneLayer = root.querySelector('.playfield__zones');
  const tokenLayer = root.querySelector('.playfield__tokens');
  let drawScene = draw ?? (() => {});
  createScene(root.querySelector('canvas'), width, height, (ctx, t, dt) => drawScene(ctx, t, dt), api);

  const zones = [];
  let selected = null;
  let hovered = null;

  const place = (element, x, y, w, h) => {
    element.style.left = `${(x / width) * 100}%`;
    element.style.top = `${(y / height) * 100}%`;
    element.style.width = `${(w / width) * 100}%`;
    element.style.height = `${(h / height) * 100}%`;
  };

  const toLogical = (event) => {
    const rect = root.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height };
  };

  const contains = (zone, x, y) => x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;

  function zoneAt(x, y, token) {
    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i];
      if (zone.enabled && contains(zone, x, y) && (!zone.accepts || zone.accepts(token))) return zone;
    }
    return null;
  }

  function setHovered(zone) {
    hovered?.el.classList.remove('is-over');
    hovered = zone;
    hovered?.el.classList.add('is-over');
  }

  function setSelected(token) {
    selected?.el.classList.remove('is-selected');
    selected = token;
    selected?.el.classList.add('is-selected');
    root.classList.toggle('has-selection', Boolean(token));
    for (const zone of zones) zone.el.classList.toggle('is-target', Boolean(token) && zone.enabled && (!zone.accepts || zone.accepts(token)));
  }

  /** Entrega um objeto a uma zona. Devolve true se a zona aceitou. */
  function deliver(token, zone) {
    return Boolean(token.opts.onDrop?.(zone, token));
  }

  function drawInto(canvas, art, w, h) {
    const ctx = setupCanvas(canvas, w, h);
    ctx.clearRect(0, 0, w, h);
    art?.(ctx, w, h);
  }

  /* ---------- Zonas ---------- */

  function addZone({ x, y, w, h, label, accepts, onTap }) {
    const el = toElement(`<button type="button" class="pf-zone" aria-label="${escapeHtml(label)}"></button>`);
    place(el, x, y, w, h);
    zoneLayer.appendChild(el);
    const zone = {
      x, y, w, h, el, accepts, enabled: true,
      setEnabled(value) {
        zone.enabled = value;
        el.hidden = !value;
      },
      remove() {
        el.remove();
        zones.splice(zones.indexOf(zone), 1);
      },
    };
    el.addEventListener('click', () => {
      if (selected) {
        const token = selected;
        setSelected(null);
        if (!zone.accepts || zone.accepts(token)) deliver(token, zone);
        return;
      }
      onTap?.(zone);
    });
    zones.push(zone);
    return zone;
  }

  /* ---------- Objetos ---------- */

  function addToken(opts) {
    const { mode = 'item', label = '' } = opts;
    const el = toElement(`<button type="button" class="pf-token pf-token--${mode} ${opts.className ?? ''}" aria-label="${escapeHtml(label)}"><canvas aria-hidden="true"></canvas></button>`);
    tokenLayer.appendChild(el);
    const token = {
      el, opts, data: opts.data ?? {},
      x: opts.x, y: opts.y, w: opts.w, h: opts.h,
      redraw(art = opts.art) {
        opts.art = art;
        drawInto(el.querySelector('canvas'), art, token.w, token.h);
      },
      moveTo(x, y, { animate = true, w = token.w, h = token.h } = {}) {
        const resized = w !== token.w || h !== token.h;
        Object.assign(token, { x, y, w, h });
        el.classList.toggle('is-moving', animate && !prefersCalm());
        place(el, x, y, w, h);
        if (resized) token.redraw();
      },
      setLabel(text) {
        el.setAttribute('aria-label', text);
      },
      remove() {
        if (selected === token) setSelected(null);
        el.remove();
      },
    };
    place(el, opts.x, opts.y, opts.w, opts.h);
    token.redraw();

    let press = null;

    const tap = () => {
      if (mode === 'item' && opts.onDrop && !opts.onTap) {
        setSelected(selected === token ? null : token);
        return;
      }
      opts.onTap?.(token);
    };

    el.addEventListener('pointerdown', (event) => {
      if (el.disabled || event.button > 0) return;
      event.preventDefault();
      el.setPointerCapture(event.pointerId);
      press = { start: toLogical(event), origin: { x: token.x, y: token.y }, dragging: false, repeated: false, ghost: null, timer: 0 };
      if (opts.repeat && opts.onTap) {
        const tick = () => {
          if (!press || el.disabled) return;
          press.repeated = true;
          opts.onTap(token);
          press.timer = setTimeout(tick, REPEAT_EVERY);
        };
        press.timer = setTimeout(tick, HOLD_DELAY);
      }
    });

    el.addEventListener('pointermove', (event) => {
      if (!press || el.disabled) return;
      const point = toLogical(event);
      if (!press.dragging) {
        const moved = Math.hypot(point.x - press.start.x, point.y - press.start.y) * (root.clientWidth / width);
        if (mode === 'button' || !opts.onDrop || moved < DRAG_THRESHOLD) return;
        press.dragging = true;
        clearTimeout(press.timer);
        setSelected(null);
        root.classList.add('is-dragging');
        if (mode === 'source') {
          press.ghost = toElement('<div class="pf-ghost"><canvas></canvas></div>');
          const ghostSize = opts.ghostSize ?? { w: token.w, h: token.h };
          press.ghostSize = ghostSize;
          drawInto(press.ghost.querySelector('canvas'), opts.ghostArt ?? opts.art, ghostSize.w, ghostSize.h);
          tokenLayer.appendChild(press.ghost);
        } else {
          el.classList.add('is-dragging');
          el.classList.remove('is-moving');
        }
      }
      const size = press.ghostSize ?? { w: token.w, h: token.h };
      let position = { x: point.x - size.w / 2, y: point.y - size.h / 2 };
      if (opts.constrain) position = opts.constrain(position.x, position.y);
      if (press.ghost) place(press.ghost, position.x, position.y, size.w, size.h);
      else {
        token.x = position.x;
        token.y = position.y;
        place(el, position.x, position.y, token.w, token.h);
      }
      opts.onMove?.(position.x, position.y, token);
      setHovered(zoneAt(point.x, point.y, token));
    });

    const finish = (event, cancelled = false) => {
      if (!press) return;
      clearTimeout(press.timer);
      const current = press;
      press = null;
      root.classList.remove('is-dragging');
      el.classList.remove('is-dragging');
      setHovered(null);
      if (!current.dragging) {
        if (!current.repeated && !cancelled) tap();
        return;
      }
      current.ghost?.remove();
      const point = toLogical(event);
      const zone = cancelled ? null : zoneAt(point.x, point.y, token);
      const accepted = zone ? deliver(token, zone) : false;
      if (opts.stay) {
        if (!zone) opts.onRelease?.(token);
        return;
      }
      if (mode === 'item' && !accepted) token.moveTo(current.origin.x, current.origin.y);
    };
    el.addEventListener('pointerup', (event) => finish(event));
    el.addEventListener('pointercancel', (event) => finish(event, true));
    // Teclado: Enter/Espaço geram "click" sem ponteiro (detail === 0)
    el.addEventListener('click', (event) => {
      if (event.detail === 0) tap();
    });

    return token;
  }

  /* ---------- Mostrador giratório (números sem campo de texto) ---------- */

  function addDial({ x, y, value = 0, min = 0, max = 99, label, onChange }) {
    const el = toElement(`
      <div class="pf-dial" role="group" aria-label="${escapeHtml(label)}">
        <button type="button" class="act" data-step="1" aria-label="Aumentar ${escapeHtml(label)}">▲</button>
        <output aria-live="polite">${value}</output>
        <button type="button" class="act" data-step="-1" aria-label="Diminuir ${escapeHtml(label)}">▼</button>
      </div>`);
    el.style.left = `${(x / width) * 100}%`;
    el.style.top = `${(y / height) * 100}%`;
    tokenLayer.appendChild(el);
    let current = value;
    const output = el.querySelector('output');
    const set = (next) => {
      current = Math.max(min, Math.min(max, next));
      output.textContent = current;
      onChange?.(current);
    };
    for (const button of el.querySelectorAll('[data-step]')) {
      const step = Number(button.dataset.step);
      let timer = 0;
      const stop = () => clearTimeout(timer);
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        set(current + step);
        const repeat = () => {
          set(current + step);
          timer = setTimeout(repeat, REPEAT_EVERY);
        };
        timer = setTimeout(repeat, HOLD_DELAY);
      });
      button.addEventListener('pointerup', stop);
      button.addEventListener('pointerleave', stop);
      button.addEventListener('click', (event) => event.detail === 0 && set(current + step));
    }
    return { el, get: () => current, set, remove: () => el.remove() };
  }

  /* ---------- Efeitos ---------- */

  /** Um objeto voa de um ponto a outro (só visual). */
  function fly(art, from, to, { w = 36, h = 36, duration = 420, delay = 0 } = {}) {
    if (prefersCalm()) return Promise.resolve();
    const el = toElement('<div class="pf-fly"><canvas></canvas></div>');
    drawInto(el.querySelector('canvas'), art, w, h);
    place(el, from.x - w / 2, from.y - h / 2, w, h);
    tokenLayer.appendChild(el);
    const pct = (value, total) => `${(value / total) * 100}%`;
    const animation = el.animate(
      [
        { left: pct(from.x - w / 2, width), top: pct(from.y - h / 2, height) },
        { left: pct((from.x + to.x) / 2 - w / 2, width), top: pct(Math.min(from.y, to.y) - 60 - h / 2, height), offset: 0.5 },
        { left: pct(to.x - w / 2, width), top: pct(to.y - h / 2, height) },
      ],
      { duration, delay, easing: 'ease-in-out', fill: 'both' },
    );
    return animation.finished.then(() => el.remove(), () => el.remove());
  }

  /** Remove todos os objetos, zonas e mostradores (troca de etapa). */
  function reset() {
    setSelected(null);
    tokenLayer.innerHTML = '';
    zoneLayer.innerHTML = '';
    zones.length = 0;
  }

  return {
    root, width, height, addZone, addToken, addDial, fly, reset,
    setDraw(fn) {
      drawScene = fn;
    },
    clearSelection: () => setSelected(null),
  };
}

/** Centro de uma zona ou objeto. */
export const centerOf = (box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
