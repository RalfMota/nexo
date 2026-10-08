/* NEXO — Códice das Leis do Nexo e o Diário da Ruptura
 *
 * Leis: cada regra que o aluno descobre numa missão entra no Códice e vira ferramenta. No
 * Códice e no Calculador Arcano, o aluno escolhe uma lei, dá uma entrada e a lei calcula a
 * saída (a álgebra passa a ser poder, não só resposta).
 *
 * Diário da Ruptura: uma página aparece a cada região reconectada. Juntas, contam quem rompeu
 * o Núcleo e por quê: alguém que tentava adivinhar um número em vez de descobrir a regra.
 */

const fmt = (value) => (Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100).replace('.', ','));

/**
 * mission: a lei entra no Códice quando esta missão é concluída.
 * input: nome da entrada; apply(x) devolve o texto da saída.
 */
export const LAWS = [
  {
    id: 'partes',
    mission: 'r1b',
    title: 'Partes do lago',
    rule: 'trigo = total ÷ 2 · ervas = total ÷ 3 · pomar = o resto',
    input: 'baldes no lago',
    apply: (x) => `trigo ${fmt(x / 2)}, ervas ${fmt(x / 3)}, pomar ${fmt(x - x / 2 - x / 3)}`,
  },
  {
    id: 'receita',
    mission: 'r2b',
    title: 'Receita do Orin',
    rule: 'folhas = 2 × frascos · gotas = 3 × frascos',
    input: 'frascos',
    apply: (x) => `${fmt(2 * x)} folhas e ${fmt(3 * x)} gotas`,
  },
  {
    id: 'desconto',
    mission: 'r2c',
    title: 'Desconto de 20%',
    rule: 'preço com desconto = preço × 0,8',
    input: 'preço (moedas)',
    apply: (x) => `${fmt(x * 0.8)} moedas (economia de ${fmt(x * 0.2)})`,
  },
  {
    id: 'producao',
    mission: 'r3a',
    title: 'Máquina de Produção',
    rule: 'cristais = 3 × ciclos',
    input: 'ciclos',
    apply: (x) => `${fmt(3 * x)} cristais`,
  },
  {
    id: 'conversor',
    mission: 'r3d',
    title: 'Conversor de Energia',
    rule: 'saída = 2 × energia + 4',
    input: 'células de energia',
    apply: (x) => `saída ${fmt(2 * x + 4)}`,
  },
  {
    id: 'rotas',
    mission: 'r4d',
    title: 'Rotas A e B',
    rule: 'Rota A = 5 + 3 × léguas · Rota B = 15 + 2 × léguas',
    input: 'léguas',
    apply: (x) => {
      const a = 5 + 3 * x;
      const b = 15 + 2 * x;
      return `Rota A ${fmt(a)}, Rota B ${fmt(b)}: ${a === b ? 'empate' : a < b ? 'A é mais barata' : 'B é mais barata'}`;
    },
  },
  {
    id: 'grade',
    mission: 'r5a',
    title: 'Grade de Energia',
    rule: 'hastes = 3 × módulos + 1',
    input: 'módulos',
    apply: (x) => `${fmt(3 * x + 1)} hastes`,
  },
  {
    id: 'nucleo',
    mission: 'f1',
    title: 'Núcleo do Nexo',
    rule: 'energia = 4 × cristais + 6',
    input: 'cristais',
    apply: (x) => `energia ${fmt(4 * x + 6)}`,
  },
];

/** Páginas do Diário da Ruptura: aparecem quando a região indicada é reconectada. */
export const PAGES = [
  {
    region: 'p',
    title: 'Página achada no chão da praça',
    text: '“Se eu fizer o Núcleo dar energia infinita, ninguém mais vai rir das minhas contas. É só acertar o número mágico.” Está assinada só com um V.',
  },
  {
    region: 'r1',
    title: 'Página presa numa comporta do Vale',
    text: '“Tentei 7. Tentei 70. Tentei 700. O Núcleo tremeu inteiro. Ainda não é o número.” Alguém andou chutando números no Núcleo.',
  },
  {
    region: 'r2',
    title: 'Página manchada de poção',
    text: '“O Orin diz que receita não é chute, é proporção. Bobagem. Amanhã eu ponho o dobro de tudo de uma vez só.” A mancha tem cheiro de mistura desandada.',
  },
  {
    region: 'r3',
    title: 'Página dentro da máquina da Oficina',
    text: '“O Núcleo fez um barulho de máquina de lavar e as estradas racharam. Acho que fui eu. Vou me esconder na Torre até entender o que fiz.” — V.',
  },
  {
    region: 'r4',
    title: 'Página num marco de légua',
    text: '“A Serah me viu na estrada. Ela disse que toda rota tem uma regra, e que quem lê a regra não precisa chutar. Estou começando a entender.”',
  },
  {
    region: 'r5',
    title: 'Página no observatório da Torre',
    text: '“As máquinas não querem um número mágico. Querem a regra. Passei semanas chutando, quando era só descobrir como elas funcionam.” — V.',
  },
  {
    region: 'f',
    title: 'Carta deixada no Núcleo',
    text: '“Reconector: fui eu, Vesper, aprendiz da Torre, quem rompeu o Núcleo, tentando adivinhar um número que não existia. Você fez o contrário: descobriu as regras, uma por uma. Obrigado por consertar o que eu quebrei. Prometo aprender do seu jeito.”',
  },
];
