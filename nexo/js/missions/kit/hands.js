/* NEXO — Mãos do jogador numa missão (componente comum)
 *
 * Quase toda missão tem o mesmo gesto: pegar coisas num lugar, carregar (com limite) e
 * largar em outro. Antes, cada missão refazia essa lógica do seu jeito. Este componente
 * guarda o que o jogador segura (um tipo de coisa por vez, cada item com um valor: 1 para
 * um balde, 10 para um feixe de hastes...), avisa quando as mãos estão cheias ou ocupadas
 * com outra coisa e mostra o que é carregado acima da cabeça do personagem.
 *
 *   const hands = createHands({
 *     say: api.say,
 *     limit: 3,
 *     kinds: { balde: { name: 'baldes', label: 'baldes', draw: (ctx, hands) => ... } },
 *   });
 *   hands.take('balde');   // true se pegou
 *   hands.drop();          // valor do último item largado, ou null
 */

import { setCarried } from '../../world/quest-layer.js';

/**
 * @param {object} options
 * @param {(message: string, tone?: string) => void} options.say  fala da missão (api.say)
 * @param {Record<string, { name: string, label?: string, limit?: number, draw: (ctx: CanvasRenderingContext2D, hands: object, t: number) => void }>} options.kinds
 *   tipos de coisa que podem ser carregados; `limit` é a soma máxima dos valores (padrão: options.limit)
 * @param {number} [options.limit] limite padrão para todos os tipos
 * @param {{ busy?: (current: string, wanted: string) => string, full?: (limit: number, kind: string) => string }} [options.messages]
 * @param {() => void} [options.onChange] chamado sempre que o conteúdo das mãos muda
 */
export function createHands({ say, kinds, limit = Infinity, messages = {}, onChange }) {
  let kind = null;
  let items = [];

  const total = () => items.reduce((sum, value) => sum + value, 0);
  const limitOf = (name) => kinds[name]?.limit ?? limit;

  const hands = {
    /** Tipo do que está nas mãos (ou null). */
    get kind() {
      return kind;
    },
    /** Soma dos valores carregados (ex.: 2 feixes de 10 + 3 soltas = 23). */
    get count() {
      return total();
    },
    /** Quantos itens (sem somar valores). */
    get size() {
      return items.length;
    },
    /** Cópia dos valores carregados, na ordem em que foram pegos. */
    get items() {
      return [...items];
    },
    get empty() {
      return items.length === 0;
    },
    /** true se as mãos têm itens deste tipo. */
    holds: (name) => kind === name && items.length > 0,
    /** Quantos itens com este valor estão nas mãos. */
    countOf: (value) => items.filter((item) => item === value).length,

    /** Pega um item. Devolve false (e explica ao jogador) quando não dá. */
    take(name, value = 1) {
      if (!kinds[name]) throw new Error(`Tipo desconhecido nas mãos: ${name}`);
      if (kind && kind !== name && items.length) {
        say(messages.busy?.(kind, name) ?? `Suas mãos estão com ${kinds[kind].name}. Use ou largue antes de pegar outra coisa.`, 'warn');
        return false;
      }
      const max = limitOf(name);
      if (total() + value > max) {
        say(messages.full?.(max, name) ?? `Suas mãos estão cheias (no máximo ${max}).`, 'warn');
        return false;
      }
      kind = name;
      items.push(value);
      refresh();
      return true;
    },

    /** Larga o último item pego e devolve o valor dele (ou null com as mãos vazias). */
    drop() {
      if (!items.length) return null;
      const value = items.pop();
      if (!items.length) kind = null;
      refresh();
      return value;
    },

    /** Larga tudo e devolve os valores. */
    dropAll() {
      const dropped = items;
      items = [];
      kind = null;
      refresh();
      return dropped;
    },

    /** Coloca diretamente um conteúdo (ex.: tirar uma peça de um lugar com as mãos vazias). */
    set(name, values) {
      kind = values.length ? name : null;
      items = [...values];
      refresh();
    },

    /** Redesenha o que é carregado (chame quando o desenho depender de algo de fora). */
    refresh,
  };

  // Um objeto de desenho estável por tipo: o personagem só "ergue os braços" ao pegar a primeira coisa
  const carriedItems = Object.fromEntries(Object.entries(kinds).map(([name, info]) => [name, {
    label: info.label ?? info.name,
    draw: (ctx, t) => info.draw(ctx, hands, t),
  }]));

  function refresh() {
    setCarried(items.length ? carriedItems[kind] : null);
    onChange?.(hands);
  }

  return hands;
}
