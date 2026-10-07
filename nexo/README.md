# NEXO — Uma Jornada Matemática (protótipo v0.4)

Jogo de aventura em navegador: o jogador explora a vila de Nexo, conversa com os moradores e resolve missões em que a Matemática faz parte da ação. A trilha vai de operações e frações, passa por razão e proporcionalidade e chega à linguagem algébrica e a funções.

## Como abrir

O jogo usa módulos JavaScript (`import`/`export`), que o navegador bloqueia quando o `index.html` é aberto direto da pasta. É preciso um servidor local:

- **VS Code:** abra a pasta `nexo` (Arquivo > Abrir Pasta), clique com o botão direito em `index.html` e escolha **Open with Live Server**.
- **Python:** dentro da pasta, rode `python -m http.server 5510` e acesse `http://localhost:5510`.

As fontes vêm do Google Fonts. Sem internet, o jogo funciona com fontes do sistema.

## Trilha sonora

As músicas ficam na pasta `audio/` e tocam em sequência, na ordem da lista `TRACKS` em `js/core/music.js`; ao fim da lista, recomeçam. Na troca de faixa há um crossfade de 4 segundos (a que termina some enquanto a próxima entra em fade-in). Para incluir, tirar ou reordenar faixas, edite a lista `TRACKS` (MP3, MP4 ou OGG). Uma faixa que não carregar é pulada. Os navegadores só permitem som depois de um gesto do jogador, por isso a trilha começa no primeiro clique, toque ou tecla. Ela pausa quando a aba fica escondida. Em **Opções** (tela de título ou pausa) dá para desligar a música e ajustar o volume; a escolha fica salva.

## Controles

| Ação | Teclado | Mouse / toque |
|---|---|---|
| Andar | WASD ou setas | clicar no destino / direcional na tela |
| Conversar, interagir | E (ou Espaço) | clicar no personagem / botão E |
| Mapa, Diário, Itens | M, J, I | barra inferior |
| Calculador, Compasso | C, Q | barra inferior |
| Pausa | Esc | botão Menu |

## Regiões e missões

| # | Região | Personagem | Missões | Conteúdo |
|---|---|---|---|---|
| 0 | Praça do Nexo (prólogo) | Lyra | A Ruptura | Familiarização |
| 1 | Vale dos Recursos (oeste) | Tainá | Partilha das Sementes; Comportas do Vale | Divisão com resto; frações de uma quantidade |
| 2 | Mercado das Trocas (sul) | Orin | Bancas do Mercado; Caldeirão de Orin | Comparação de razões, porcentagem; proporcionalidade direta |
| 3 | Oficina dos Construtores (norte) | Kael | Máquina de Produção; Previsão | y = 3x; y = 2x + 4 |
| 4 | Estação das Rotas (noroeste) | Serah | Custo de Viagem; Ponto de Mudança | Comparação de 5 + 3d e 15 + 2d |
| 5 | Torre dos Padrões (leste) | Nyla | Grade de Energia; Arquivo da Torre | Generalização (h = 3n + 1); escrita de regras |
| 6 | Núcleo do Nexo (praça) | Lyra | Reacender o Núcleo | Função afim: teste, valor de entrada, gráfico |

## Como as missões funcionam

As missões não têm formulários nem enunciados longos. O personagem fala uma frase curta, e o jogador age na cena:

- **Arrastar e soltar:** pegar um objeto (balde, saco, pacote, carrinho, caixa, leitura) e soltar onde ele deve ir.
- **Tocar e depois tocar no destino:** a mesma ação sem arrastar, para celular e teclado (Tab e Enter).
- **Pilhas:** cestos, frascos e pilhas entregam uma unidade por toque; segurar entrega várias.
- **Alavancas, manivelas e corneta:** disparam o que foi montado (abrir a comporta, rodar a máquina, mandar as caravanas).
- **Mostradores giratórios (▲ ▼):** números de previsão e de regras, sem campo de digitação.

| Missão | O que o jogador faz |
|---|---|
| Partilha das Sementes | **jogada no próprio mapa, sem janela**: pega sementes no saco (E), leva aos canteiros e se agacha para plantar. Três etapas: contar (3 em cada um de 2 canteiros), repartir (12 em 3) e dividir com resto (50 em 6 com a semeadeira; o resto vai no saco até o celeiro) |
| Comportas do Vale | **no mapa**: enche baldes no lago (até 3 de uma vez), despeja nas plantações conforme a placa (1/2, 1/3, o resto) e gira a comporta. Etapas: 8, 12 e 18 baldes |
| Bancas do Mercado | **no mapa**: encosta nas bancas para pôr pacotes no cesto e paga no balcão do Orin. Etapas: exatamente 12 cristais; depois 20 cristais com 48 moedas (desconto de 20% numa banca) |
| Caldeirão de Orin | **no mapa**: colhe folhas no cesto e orvalho no chafariz, põe no caldeirão e mexe com as mãos vazias. Receita 4 folhas + 6 gotas → 2 frascos; pedidos de 2, 4 e 5 frascos |
| Máquina de Produção | gira a manivela (a fita imprime ciclo → cristais) e leva o carrinho até a ponte |
| Previsão | encaixa células e testa (3 vezes); depois gira o mostrador para prever a saída |
| Custo de Viagem | arrasta o batedor pela estrada para comparar custos; põe cada caixa numa rota e toca a corneta |
| Ponto de Mudança | finca a placa na distância em que a rota mais barata muda |
| Grade de Energia | carrega feixes de 10 e hastes soltas e manda montar; depois ajusta a regra do elevador |
| Arquivo da Torre | lê a pedra com o registro e ajusta a regra de cada selo |
| Reacender o Núcleo | põe cristais no Núcleo e aciona; gera 50 de energia; leva a leitura gráfica certa até o Núcleo |

Missões de mundo (Vale e Mercado) não abrem janela: os objetos aparecem no mapa, o personagem carrega e planta com animações, e um rastreador no HUD mostra a etapa, a fala do personagem, as dicas e o Registro técnico.

O contexto completo e o objetivo de cada missão continuam no código e aparecem no Diário (Visão pedagógica).

As regiões se abrem em ordem: uma ruptura de energia bloqueia cada caminho até a região anterior ser concluída. As missões podem ser refeitas. Os números das missões são escolhas de design e precisam passar por teste com estudantes antes de valerem como instrumento.

## Animação e cenário

- **Personagens** (`js/art/sprite.js`): pixel art de 24 × 48 em três vistas (frente, costas e perfil), com cabelo em mechas, olhos com cílio, íris e brilho, dobras de roupa, mãos e sapatos com cadarço. Caminhada de 6 quadros.
- **Árvores** (`js/art/trees.js`): carvalhos, pinheiros, macieiras, árvores floridas e de outono. A copa é feita de tufos sombreados; o vento entorta mais o topo que a base, e o personagem passa atrás delas.
- **Enfeites** (`js/art/decor.js`, posições em `js/world/map.js`): arbustos, pedras com musgo, tocos, troncos, cogumelos, flores, feno, abóboras e bancos. Os grandes ficam só na borda das clareiras, sem fechar caminhos.
- **Moradores** (`js/data/villagers.js`, `js/world/villagers.js`): 9 moradores passeiam pela praça, Vale, Mercado, Oficina e Torre, olham para o jogador e conversam (E).
- **Clima** (`js/world/weather.js`): ensolarado, nublado, chuva e neblina, com transição suave. Muda a luz, as sombras das nuvens, a força do vento, a chuva com respingos e a neblina. O clima atual aparece no HUD.


- `js/art/sprite.js` desenha o personagem (20 × 40 pixels, sombreado em 5 tons) a partir de uma **pose**: passo das pernas, quanto o corpo desce, braços (descansando, balançando, à frente, a meio caminho, erguidos, enxada em cima ou no chão) e olhos (abertos ou piscando). Cada pose fica em cache.
- `js/art/animator.js` toca **clipes de keyframes**: parado (respiração), andar, levantar, cavar, colher e manusear. A pose troca a cada quadro; a escala e a elevação são interpoladas entre quadros (squash and stretch). Eventos de passo e impacto soltam poeira, terra ou grama.
- `js/world/scenery.js` deixa o mapa vivo: grama balançando com rajadas de vento (e se afastando dos pés do jogador), água com ondas, reflexos e anéis, folhas caindo e raios de sol suaves.
- Tudo respeita a opção "Reduzir animações".

## Estrutura do código

```
index.html            página (carrega css/ e js/main.js)
css/
  base.css            cores, tipografia, botões, formulários
  screens.css         título e criação de personagem
  game.css            HUD, barra de ferramentas, diálogos, janelas
  mission.css         janela de missão e componentes das mecânicas
  profiles.css        escolha de perfil e Painel do Professor
js/
  main.js             inicialização
  core/               estado e salvamento, registro de pesquisa, utilidades de DOM
  data/               regiões, personagens, moradores e grade curricular
  game/               progresso (regiões abertas), sessão de missão (tentativas, dicas, conclusão),
                      estatísticas por missão/etapa e avaliação por tópico (Painel do Professor)
  missions/           um arquivo por região + playfield.js (mesa de jogo: arrastar, soltar,
                      alavancas, mostradores), props-art.js (desenho dos objetos) e widgets.js
  world/              mapa, renderização, entrada do jogador, história (falas)
  art/                desenho em pixel art: terreno, construções, personagens
  ui/                 telas, HUD, diálogo, janelas, Mapa, Diário, ferramentas
```

Cada missão é um objeto com textos (`context`, `goal`, `hints`), dados da Visão pedagógica (`concept`, `prerequisites`, `relation`, `categories`) e uma função `mount(stage, api)`, que monta a cena com `createPlayfield` e informa tentativas (`api.attempt`), erros (`api.fail`), conclusão (`api.win`) e o Registro técnico (`api.record`).

### Objetos em pixel art

`js/art/pixel.js` é o motor de pixel art dos objetos: cada um é pintado pixel a pixel (1 pixel da grade = 1 pixel do mundo) com rampas de 5 tons, luz pela normal da superfície (esfera, cilindro, caixa), pontilhado só na troca de tom e contorno na cor escura do material. Os desenhos ficam em cache. `js/art/items.js` tem os objetos das missões (saco de sementes, cuia, semeadeira, baldes, comporta, cesto, caldeirão, pacotes, canteiros e brotos) e `js/art/props.js` os objetos do mapa (postes, caixotes, barris, cercas, placas, mural, bancas, chafariz, bases dos cristais e das engrenagens). Partes que se mexem (roda da semeadeira, volante da comporta, fogo) têm quadros próprios.

## Perfis: Aluno e Professor

Ao abrir o jogo aparece **Quem vai jogar?**:

- **Aluno**: cada aluno escolhe o próprio nome na lista ou se cadastra em **Novo aluno**. No primeiro acesso ele vai direto para a criação do personagem; depois, para a tela de título (continuar, diário, **Trocar de perfil**). Cada aluno tem o seu progresso salvo separadamente.
- **Professor**: botão **Área do professor** (ou o atalho **Ctrl + Shift + P**). No primeiro acesso o professor cria uma senha (mínimo de 4 caracteres). Depois, entra no **Painel do Professor**.

O Painel mostra a lista de alunos (com busca e cadastro) e, para cada um:

- **nível** na jornada (região atual) e missões concluídas;
- **métricas**: acertos, erros, taxa de acerto, tempo médio por missão, tempo total e dicas pedidas;
- **avaliação de conhecimento** por tópico da grade curricular: *Dominado*, *Em desenvolvimento*, *Precisa de reforço*, *Não iniciado* ou *Em breve no jogo*, com a missão sugerida para retomar o que precisa de reforço;
- **tabela de missões** com situação, acertos, erros, dicas e tempos.

Também dá para renomear, zerar o progresso ou excluir um aluno, trocar a senha, **exportar a turma em CSV** (uma linha por aluno e missão, com a situação de cada tópico) e apagar todos os dados do computador.

Tudo fica no `localStorage` deste navegador (chave `nexo_escola_v1`). A senha guarda só um resumo (SHA-256), mas é uma proteção simples: evita que um aluno entre no painel por engano, não protege contra quem tem acesso ao computador. Um save antigo (de antes dos perfis) vira um aluno automaticamente.

### Grade curricular

`js/data/curriculum.js` lista os tópicos do Ensino Fundamental em ordem de progressão e diz em quais missões (e em quais etapas das missões de mundo) cada um é observado:

| Faixa | Tópicos | Missões |
|---|---|---|
| Anos Iniciais | contagem, adição, subtração, multiplicação, divisão, frações (metade, terço) | Partilha das Sementes, Comportas do Vale, Bancas do Mercado, Máquina de Produção |
| Anos Finais | frações de quantidades, razão, porcentagem, proporcionalidade, relações entre grandezas, linguagem algébrica, equação do 1º grau, função afim | Comportas, Bancas, Caldeirão, Oficina, Rotas, Torre, Núcleo |
| Em breve | geometria (formas e simetria; perímetro e área), equação do 2º grau | ainda sem missão: o painel mostra a ideia planejada |

O motor de missões (`js/game/session.js`) grava em `js/game/stats.js`, para cada missão e etapa, acertos (`api.attempt(true)`), erros (`api.attempt(false)`), dicas, apoios automáticos e tempo. `js/game/assessment.js` cruza essas contagens com a grade para montar o relatório. As etapas são informadas pelas missões com `api.setStage(i)`.

## Modo Pesquisa

Na tela de título, abra **Modo Pesquisa**, informe um ID (sem nome real) e ative o registro. Só então os eventos são gravados no navegador. Exporte JSON ou CSV ao fim de cada sessão e use um ID por estudante. Os tipos de evento são os mesmos das versões anteriores (os dados de algumas tentativas mudaram junto com as mecânicas): `attempt`, `hint_request`, `support_triggered`, `success`, `retry`, `mission_start`, `mission_end`, `region_enter`, `region_return`, `interaction`, `calculator_use`.

## Reset e debug

**Opções > Apagar meu progresso** (tela de título do aluno) zera o progresso daquele aluno. **Apagar todos os dados** (Painel do Professor) remove todos os alunos, registros e a senha. Com `index.html?debug=1` aparece o botão que libera todas as regiões.

Os dados do Diário são indícios situados, não nota nem diagnóstico. O uso com estudantes depende de autorização institucional, consentimento dos responsáveis e assentimento dos participantes.
