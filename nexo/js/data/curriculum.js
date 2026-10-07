/* NEXO — Grade curricular do Ensino Fundamental, em ordem de progressão
 *
 * Cada tópico diz em quais missões (e, nas missões de mundo, em quais etapas) o jogo
 * observa aquele conhecimento. É a ponte entre o motor de missões e o Painel do Professor:
 * os acertos e erros de cada etapa viram indícios sobre o tópico.
 *
 * Tópicos com `planned` ainda não têm missão: aparecem no painel como "em breve",
 * com a ideia da missão que vai cobri-los.
 *
 * Etapas das missões de mundo (índice começa em 0):
 *   r1a Partilha das Sementes: 0 contar, 1 repartir, 2 dividir com resto
 *   r1b Comportas do Vale:     0 metade (8 baldes), 1 metade e terço (12), 2 depois da chuva (18)
 *   r2a Bancas do Mercado:     0 juntar 12 cristais, 1 comparar preços com desconto
 *   r2b Caldeirão de Orin:     0 receita, 1 dobro, 2 proporção (5 frascos)
 *   r1c Jardim Espelhado:      0 eixo vertical, 1 duas cores, 2 eixo horizontal (extra)
 *   r1d Cercas do Vale:        0 perímetro, 1 mesmo perímetro e mais área, 2 mesma área e menos cerca (extra)
 *   r5c Jardim de Nyla:        0 x² = 36, 1 x(x + 2) = 48, 2 x² − 4 = 45 (extra)
 */

export const BANDS = [
  { id: 'iniciais', name: 'Anos Iniciais', years: '1º ao 5º ano' },
  { id: 'finais', name: 'Anos Finais', years: '6º ao 9º ano' },
];

export const TOPICS = [
  // Anos Iniciais
  {
    id: 'contagem',
    name: 'Contagem e agrupamento',
    band: 'iniciais',
    years: '1º e 2º ano',
    unit: 'Números',
    links: [{ mission: 'r1a', stages: [0] }],
  },
  {
    id: 'adicao',
    name: 'Adição',
    band: 'iniciais',
    years: '1º ao 3º ano',
    unit: 'Números',
    links: [{ mission: 'r2a', stages: [0] }],
  },
  {
    id: 'subtracao',
    name: 'Subtração (o que sobra, o que falta)',
    band: 'iniciais',
    years: '1º ao 3º ano',
    unit: 'Números',
    links: [{ mission: 'r1a', stages: [2] }, { mission: 'r1b', stages: [0] }],
  },
  {
    id: 'multiplicacao',
    name: 'Multiplicação',
    band: 'iniciais',
    years: '2º ao 5º ano',
    unit: 'Números',
    links: [{ mission: 'r2a', stages: [0] }, { mission: 'r3a' }],
  },
  {
    id: 'divisao',
    name: 'Divisão (partilha e divisão com resto)',
    band: 'iniciais',
    years: '3º ao 5º ano',
    unit: 'Números',
    links: [{ mission: 'r1a', stages: [1, 2] }],
  },
  {
    id: 'fracoes',
    name: 'Frações: metade, terço e partes de um todo',
    band: 'iniciais',
    years: '4º e 5º ano',
    unit: 'Números',
    links: [{ mission: 'r1b', stages: [0, 1] }],
  },
  {
    id: 'geometria_formas',
    name: 'Geometria: simetria de reflexão',
    band: 'iniciais',
    years: '4º e 5º ano',
    unit: 'Geometria',
    links: [{ mission: 'r1c' }],
  },

  // Anos Finais
  {
    id: 'fracoes_quantidade',
    name: 'Frações de quantidades (o todo muda, a parte muda)',
    band: 'finais',
    years: '6º ano',
    unit: 'Números',
    links: [{ mission: 'r1b', stages: [1, 2] }],
  },
  {
    id: 'razao',
    name: 'Razão e preço por unidade',
    band: 'finais',
    years: '6º e 7º ano',
    unit: 'Números',
    links: [{ mission: 'r2a', stages: [1] }],
  },
  {
    id: 'porcentagem',
    name: 'Porcentagem e desconto',
    band: 'finais',
    years: '6º e 7º ano',
    unit: 'Números',
    links: [{ mission: 'r2a', stages: [1] }],
  },
  {
    id: 'proporcao',
    name: 'Proporcionalidade direta',
    band: 'finais',
    years: '7º ano',
    unit: 'Álgebra',
    links: [{ mission: 'r2b' }, { mission: 'r3a' }],
  },
  {
    id: 'relacoes',
    name: 'Relação entre grandezas e previsão',
    band: 'finais',
    years: '7º e 8º ano',
    unit: 'Álgebra',
    links: [{ mission: 'r3d' }, { mission: 'r4b' }],
  },
  {
    id: 'expressoes',
    name: 'Linguagem algébrica: variável e expressão',
    band: 'finais',
    years: '7º e 8º ano',
    unit: 'Álgebra',
    links: [{ mission: 'r5a' }, { mission: 'r5b' }],
  },
  {
    id: 'equacao1',
    name: 'Equação do 1º grau',
    band: 'finais',
    years: '7º e 8º ano',
    unit: 'Álgebra',
    links: [{ mission: 'r4d' }, { mission: 'f1' }],
  },
  {
    id: 'funcao_afim',
    name: 'Função afim e leitura de gráfico',
    band: 'finais',
    years: '9º ano',
    unit: 'Álgebra',
    links: [{ mission: 'f1' }],
  },
  {
    id: 'geometria_medidas',
    name: 'Geometria: perímetro e área',
    band: 'finais',
    years: '6º ao 8º ano',
    unit: 'Grandezas e medidas',
    links: [{ mission: 'r1d' }],
  },
  {
    id: 'equacao2',
    name: 'Equação do 2º grau',
    band: 'finais',
    years: '9º ano',
    unit: 'Álgebra',
    links: [{ mission: 'r5c' }],
  },
];

export const topicById = (id) => TOPICS.find((topic) => topic.id === id);

/** Tópicos observados numa missão (usado pelo motor de missões e pelo Diário). */
export const topicsForMission = (missionId) =>
  TOPICS.filter((topic) => topic.links.some((link) => link.mission === missionId));

/** Faixa curricular de uma missão: Anos Iniciais se observa algum tópico dessa faixa. */
export function bandForMission(missionId) {
  const topics = topicsForMission(missionId);
  if (!topics.length) return null;
  return topics.every((topic) => topic.band === 'finais') ? 'finais' : 'iniciais';
}
