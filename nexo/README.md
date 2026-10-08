# NEXO — Uma Jornada Matemática (protótipo v0.4)

Jogo de aventura em navegador: o jogador explora a vila de Nexo, conversa com os moradores e resolve missões em que a Matemática faz parte da ação. A trilha vai de operações e frações, passa por razão e proporcionalidade e chega à linguagem algébrica e a funções.

## Como abrir

O jogo usa módulos JavaScript (`import`/`export`), que o navegador bloqueia quando o `index.html` é aberto direto da pasta. É preciso um servidor local:

- **VS Code:** abra a pasta `nexo` (Arquivo > Abrir Pasta), clique com o botão direito em `index.html` e escolha **Open with Live Server**.
- **Python:** dentro da pasta, rode `python -m http.server 5510` e acesse `http://localhost:5510`.

As fontes vêm do Google Fonts. Sem internet, o jogo funciona com fontes do sistema.

**Versão publicada (empacotada):** `npm install` uma vez e depois `npm run build` gera a pasta `dist/` com o Vite (`vite.config.js`): os ~90 módulos viram um arquivo só, minificado, e cada arquivo leva um resumo (hash) no nome. Assim o navegador nunca fica com uma versão velha depois de um deploy (não é mais preciso Ctrl+F5) e os arquivos podem ficar em cache por um ano (`vercel.json`). O Phaser vai num arquivo separado, que quase nunca muda. `npm run preview` abre a versão empacotada em `http://localhost:5512`. A Vercel roda o build sozinha a cada deploy. Para desenvolver, continua valendo o servidor local simples acima, sem build.

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

**Trilhas.** Ao criar o personagem, o aluno informa o ano escolar. A **trilha completa** (2º ao 7º ano, padrão) abre as regiões em ordem, todas obrigatórias. A **trilha rápida** (8º e 9º anos) transforma o Vale e o Mercado, de conteúdos dos anos iniciais, em **aquecimento opcional**: depois do Prólogo, Vale, Mercado e Oficina ficam abertos, e o caminho obrigatório segue pela Oficina, Rotas, Torre e Núcleo. O professor vê e muda a trilha de cada aluno no Painel (a trilha também vai para a turma online). A troca fica registrada no Modo Pesquisa como `interaction { trilha }`.

| # | Região | Personagem | Missões | Conteúdo |
|---|---|---|---|---|
| 0 | Praça do Nexo (prólogo) | Lyra | A Ruptura | Familiarização |
| 1 | Vale dos Recursos (oeste) | Tainá | Partilha das Sementes; Comportas do Vale | Divisão com resto; frações de uma quantidade |
| 2 | Mercado das Trocas (sul) | Orin | Bancas do Mercado; Caldeirão de Orin; Promoção | Agrupamento; proporcionalidade direta; preço por unidade e porcentagem |
| 3 | Oficina dos Construtores (norte) | Kael | Máquina de Produção; Previsão | y = 3x; y = 2x + 4 |
| 4 | Estação das Rotas (noroeste) | Serah | Custo de Viagem; Ponto de Mudança | Comparação de 5 + 3d e 15 + 2d |
| 5 | Torre dos Padrões (leste) | Nyla | Grade de Energia; Arquivo da Torre | Generalização (h = 3n + 1); escrita de regras |
| 6 | Núcleo do Nexo (praça) | Lyra | Reacender o Núcleo | Função afim: teste, valor de entrada, gráfico |

**Desafios extras** (aparecem no menu do personagem; não travam as regiões):

| Desafio | Personagem | Liberado depois de | Conteúdo |
|---|---|---|---|
| Jardim Espelhado | Tainá | Vale dos Recursos | Simetria de reflexão (eixo vertical e horizontal) |
| Cercas do Vale | Tainá | Mercado das Trocas | Perímetro e área: mesmo perímetro com áreas diferentes e vice-versa |
| Jardim de Nyla | Nyla | Torre dos Padrões | Equação do 2º grau como problema de área (x² = 36; x(x + 2) = 48; x² − 4 = 45) |

## Como as missões funcionam

Todas as missões, inclusive o Prólogo, acontecem **no próprio mapa** (a Grade de Energia, por dentro da Torre; o Caldeirão de Orin, no laboratório de poções), sem janela: os objetos aparecem perto do personagem da região, o jogador anda até eles e aperta **E** (ou toca) para pegar, levar, plantar, puxar alavancas e girar mostradores. Um rastreador no HUD mostra a etapa, a fala do personagem, as dicas e o Registro técnico. No Prólogo, na praça, o jogador pega os dois artefatos que brotam no chão, liga o Compasso (Q) para examinar o cristal rachado ao lado do Núcleo e volta a falar com a Lyra.

- **Pegar e levar:** pilhas, cestos e estantes entregam uma unidade por toque; segurar E pega várias. Com as mãos vazias, dá para tirar de volta o que foi colocado.
- **Alavancas, manivelas e corneta:** disparam o que foi montado (abrir a comporta, rodar a máquina, mandar as caravanas, assentar lajotas).
- **Mostradores (▼ ▲):** números de previsão e de regras, sem campo de digitação; segurar E gira depressa.

| Missão | O que o jogador faz no mapa |
|---|---|
| Partilha das Sementes | pega sementes no saco, leva aos canteiros e se agacha para plantar. Etapas: contar (3 em cada um de 2 canteiros), repartir (12 em 3) e dividir com resto (50 em 6 com a semeadeira; o resto vai no saco até o celeiro) |
| Comportas do Vale | enche baldes no lago (até 3 de uma vez), despeja nas plantações conforme a placa (1/2, 1/3, o resto) e gira a comporta. Etapas: 8, 12 e 18 baldes |
| Bancas do Mercado | encosta nas bancas para pôr pacotes no cesto e paga no balcão do Orin. Etapas: exatamente 12 cristais; depois exatamente 17 (pacotes de 4, 6 e 5, mais de um jeito certo) |
| Promoção | as mesmas bancas, depois do Caldeirão: pelo menos 20 cristais com 50 moedas (só a banca mais barata por cristal serve); depois com 48 moedas e 20% de desconto na Banca da Estrela. Antes, agrupar e comparar preços com desconto estavam na mesma missão (um salto do 3º para o 7º ano). Quem concluiu as Bancas na versão antiga recebe a Promoção como concluída (`migrada`) |
| Caldeirão de Orin | **no laboratório de poções do Orin** (prédio "Poções" no sul do Mercado): pega folhas-lunares e orvalho nos armários de vidro (as portas abrem), põe no caldeirão e mexe com as mãos vazias. A receita fica na parede: 4 folhas + 6 gotas → 2 frascos; pedidos de 2, 4 e 5 frascos. Os frascos prontos aparecem na bancada |
| Máquina de Produção | gira a manivela da máquina (a fita no Registro mostra ciclo → cristais), pega o carrinho e leva até a ponte de carga, que pede exatamente 24 |
| Previsão | leva células da estante ao conversor e faz 3 testes; depois lê o bilhete do Kael, gira o mostrador com a previsão e puxa a alavanca |
| Custo de Viagem | encosta nos marcos de légua (0 a 26) para comparar as rotas; leva cada caixa (4, 12 e 20 léguas) à carroça da Rota A ou B e toca a corneta |
| Ponto de Mudança | finca a placa no marco em que a rota mais barata muda (10 léguas). Nas duas missões das Rotas, cada marco lido acende dois pontos no **quadro de custos** ao lado da Estação (custo × distância, Rota A em vermelho e B em azul), e os pontos se ligam em retas: é o primeiro gráfico do jogo, antes do Núcleo. Ao fincar a placa certa, o quadro marca o cruzamento das retas |
| Grade de Energia | **por dentro da Torre, andar por andar**, com uma só linguagem de cores: a haste **dourada** é a de partida e as **azuis** são as 3 que cada módulo acrescenta. Nos três primeiros andares o aluno pega hastes no suporte e encaixa uma por vez no painel embaixo da grade (1, 2 e 3 módulos, numerados); cada módulo fechado mostra "+3" e a conta embaixo da grade cresce (1 + 3 + 3 = 7). Um quadro-negro guarda o registro (1 → 4, 2 → 7, 3 → 10). No 4º, o quadro pergunta "10 → ?": o aluno carrega o carrinho com feixes de 10 e hastes soltas (a etiqueta soma: "3 feixes de 10 + 1 solta = 31") e puxa a alavanca. No topo, monta a regra na Máquina da Regra (tubo azul "por módulo", tubo dourado "de partida"); o visor mostra "hastes = 3 × módulos + 1" e, ao puxar a alavanca de teste, as 12 lâmpadas (grades de 1 a 12 módulos) mostram o valor da regra em verde ou vermelho. As lâmpadas só acendem no teste, e mexer nos tubos apaga o resultado: antes, elas mudavam ao vivo e dava para acertar só ajustando os tubos até tudo ficar verde. A alavanca mostra quantos testes já foram feitos |
| Arquivo da Torre | lê o registro sobre cada pedestal e grava a regra nos mostradores |
| Reacender o Núcleo | leva cristais da pilha ao Núcleo e puxa a alavanca (2 testes); gera exatamente 50 de energia; leva ao Núcleo a tabuleta com o gráfico certo |
| Jardim Espelhado | pega mudas nos cestos e planta do outro lado do caminho de pedras para espelhar o jardim |
| Cercas do Vale | leva ao carrinho as tábuas exatas para cercar o canteiro 5 × 3; depois gira largura e comprimento para o cercado de maior área com 20 tábuas e a horta de 24 quadradinhos com menos cerca |
| Jardim de Nyla | gira o lado x do jardim e manda assentar as lajotas: sobram ou faltam até a área bater com as lajotas que existem |

O contexto completo e o objetivo de cada missão continuam no código e aparecem no Diário (Visão pedagógica).

As regiões se abrem em ordem: uma ruptura de energia bloqueia cada caminho até a região anterior ser concluída. As missões podem ser refeitas. Os números das missões são escolhas de design e precisam passar por teste com estudantes antes de valerem como instrumento.

## Motor do jogo (Phaser 3)

O mundo roda no **Phaser 3.90** (`vendor/phaser.esm.min.js`, licença MIT em `vendor/PHASER-LICENSE.md`; o arquivo fica no projeto, sem depender de CDN). O código fica em `js/engine/`:

| Arquivo | O que faz |
|---|---|
| `engine.js` | cria o jogo, ajusta a resolução (telas densas), liga teclado/toque à cena ativa e expõe as mesmas funções de antes (`startWorld`, `getPlayerPosition`, `placePlayer`...) |
| `world-scene.js` | cena **Mundo**: mapa (textura), colisão com camada de blocos + Arcade Physics (as rupturas entram e saem da camada), câmera, personagens e árvores ordenados pela altura dos pés, copas balançando com o vento, portas dos prédios |
| `interior-scene.js` | cena **Interior**: cômodo com paredes e móveis como corpos estáticos, saída pela porta de baixo, andares (a cena recomeça no novo andar) |
| `interiors.js` | planta de cada tipo de prédio (casas, celeiro, oficina, estação, laboratório de poções, saguão da torre) e o registro para uma missão assumir um interior |
| `player.js` | estado do jogador entre as cenas, corpo físico (caixa de 14 × 7 px nos pés), movimento, clicar para andar |
| `actor-view.js` | personagem como sprite do Phaser (a pixel art continua vindo de `art/sprite.js`) com sombra e squash and stretch |
| `fx.js` | partículas do Phaser (brilho e terra) e o efeito de **brotar** (tween com quique) |
| `canvas-layer.js` | camadas de canvas do tamanho da tela para o que ainda é pintado com a API de canvas (água, grama, objetos das missões no mapa, etiquetas, chuva, luz); os textos ficam nítidos. Três camadas no mundo: chão (abaixo dos personagens), frente (objetos de missão mais abaixo que o jogador, com profundidade igual aos pés dele, para que máquinas altas o cubram quando ele passa por trás) e topo |

**Entrar num prédio:** perto da porta, aperte **E**: a tela escurece (fade), o interior carrega e clareia. Para sair, ande pelo vão da porta de baixo ou aperte E nela. Na Torre, durante a Grade de Energia, a porta de cima leva ao andar seguinte e a de baixo desce um andar.

**Objetos que brotam:** os objetos das missões não aparecem "secos": ao começar uma missão (ou numa nova etapa) eles brotam do chão com um quique, e o Phaser solta partículas de terra e brilho no ponto.

O jogo usa o renderizador de canvas do Phaser, para que as camadas de canvas não precisem ser reenviadas à placa de vídeo a cada quadro. A tela de título, a criação de personagem e as janelas (Diário, Painel) continuam em HTML.

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
api/                  funções da Vercel: turmas online (turma.js, sync.js, _turmas.js)
vendor/               Phaser 3.90 (módulo ES) e a licença MIT dele
package.json          dependência das funções (@vercel/blob); o site em si não tem build
css/
  base.css            cores, tipografia, botões, formulários
  screens.css         título e criação de personagem
  game.css            HUD, barra de ferramentas, diálogos, janelas
  mission.css         janela de missão e componentes das mecânicas
  profiles.css        escolha de perfil e Painel do Professor
js/
  main.js             inicialização
  core/               estado e salvamento, turma online (cloud.js), registro de pesquisa, DOM
  data/               regiões, personagens, moradores e grade curricular
  game/               progresso (regiões abertas), sessão de missão (tentativas, dicas, conclusão),
                      estatísticas por missão/etapa e avaliação por tópico (Painel do Professor)
  missions/           um arquivo por região (*-world.js: missões no mapa) + world-kit.js
                      (alavancas, mostradores, etiquetas); prologue.js (Prólogo na praça);
                      kit/hands.js: mãos do jogador (pegar com limite, um tipo por vez, largar
                      e o desenho acima da cabeça), usado pelas Comportas, Previsão, Caldeirão e Torre
  engine/             motor Phaser: cenas Mundo e Interior, jogador, efeitos (ver "Motor do jogo")
  world/              mapa, camadas de desenho, entrada (teclado/toque), história (falas), moradores, clima
  art/                desenho em pixel art: terreno, construções, personagens
  ui/                 telas, HUD, diálogo, janelas, Mapa, Diário, ferramentas
```

Cada missão é um objeto com textos (`context`, `goal`, `hints`), dados da Visão pedagógica (`concept`, `prerequisites`, `relation`, `categories`) e uma função `mount(stage, api)`, que monta a cena com `createPlayfield` e informa tentativas (`api.attempt`), erros (`api.fail`), conclusão (`api.win`) e o Registro técnico (`api.record`).

### Objetos em pixel art

`js/art/pixel.js` é o motor de pixel art dos objetos: cada um é pintado pixel a pixel (1 pixel da grade = 1 pixel do mundo); os personagens recebem uma passada de volume (sombreamento cilíndrico por faixa, com luz de borda) com rampas de 5 tons, luz pela normal da superfície (esfera, cilindro, caixa), pontilhado só na troca de tom e contorno na cor escura do material. Os desenhos ficam em cache. `js/art/items.js` tem os objetos das missões (saco de sementes, cuia, semeadeira, baldes, comporta, cesto, caldeirão, pacotes, canteiros e brotos) `js/art/mission-props.js` e `js/art/garden-props.js` os das missões da Oficina, Rotas, Torre, Núcleo e dos desafios extras, e `js/art/props.js` os objetos do mapa (postes, caixotes, barris, cercas, placas, mural, bancas, chafariz, bases dos cristais e das engrenagens). Partes que se mexem (roda da semeadeira, volante da comporta, fogo) têm quadros próprios.

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

Sem turma online, tudo fica no `localStorage` deste navegador (chave `nexo_escola_v1`). A senha do professor (mínimo de 6 caracteres) guarda só um resumo PBKDF2 com sal aleatório (senhas antigas, em SHA-256, são convertidas no próximo login), mas é uma trava de tela: evita que um aluno entre no painel por engano, não protege contra quem tem acesso ao computador. Um save antigo (de antes dos perfis) vira um aluno automaticamente.

### Turma online (dados reunidos de vários computadores)

No site publicado, o professor pode juntar a turma inteira, de qualquer computador:

1. No Painel do Professor, **☁ Turma online → Criar uma turma nova** (nome, senha da turma com pelo menos 10 caracteres e o **código de convite** do site, definido na variável de ambiente `NEXO_CONVITE` da Vercel; sem ela configurada, ninguém cria turma). O jogo mostra um **código de 6 letras e números** (sem 0/O nem 1/I, fáceis de ditar). A turma já fica ligada a este computador.
2. Em cada computador da escola, o professor abre a turma e marca **Usar esta turma para os alunos deste computador**. Em casa, o aluno digita o código na tela de título (**Turma online**).
3. Enquanto o aluno joga, o progresso é enviado sozinho alguns segundos depois de cada mudança (e ao fechar a aba).
4. No painel, **Abrir uma turma** (código + senha) lista os alunos deste computador e os que jogaram em outros computadores (☁), com o mesmo relatório. **Atualizar alunos** busca de novo.

**O que vai para a internet:** apenas o apelido, a aparência do personagem, as missões concluídas e as estatísticas. Os registros do Modo Pesquisa e o ID de participante ficam no computador. Por isso o cadastro pede **apelido ou código**, não o nome completo.

**Onde fica:** um armazenamento **privado** da Vercel Blob (loja `nexo-turmas`, região de São Paulo, `gru1`), ligado ao projeto `nexo-jornada-matematica`. Nada é acessível por link; só as funções do próprio site leem e escrevem. Organização: `turmas/<CÓDIGO>/turma.json` (nome e resumo scrypt da senha, com sal), `turmas/<CÓDIGO>/alunos/<ID>.json` e `turmas/<CÓDIGO>/tentativas.json` (horários das últimas senhas erradas).

**Rotas** (pasta `api/`, funções da Vercel):

| Rota | Quem usa | O que faz |
|---|---|---|
| `POST /api/turma` `{acao: 'criar', nome, senha, convite}` | professor | cria a turma e devolve o código |
| `POST /api/turma` `{acao: 'ler', codigo, senha}` | professor | devolve os alunos da turma (só com a senha certa) |
| `POST /api/turma` `{acao: 'remover', codigo, senha, id}` | professor | apaga um aluno da turma |
| `POST /api/sync` `{codigo, aluno}` | jogo do aluno | regrava o arquivo daquele aluno, só com a chave secreta dele (o servidor descarta qualquer campo fora do esperado) |

**Proteções:**
- **Chave por aluno:** na primeira sincronização, o jogo cria uma chave secreta para o aluno (guardada só no computador dele); o servidor guarda o resumo e recusa gravações daquele aluno sem a mesma chave. Saber o código da turma não basta para sobrescrever o progresso de um colega.
- **Bloqueio de senha:** 8 senhas erradas em 15 minutos bloqueiam a turma por 15 minutos.
- **Limite:** no máximo 80 alunos por turma.
- **Avisos ao professor (⚠):** regiões liberadas pelo modo de teste, ou missão concluída sem tentativa ou em menos de 5 segundos. Não bloqueiam nada: o progresso vem do navegador do aluno e, num jogo que roda no navegador, não dá para impedir por completo que alguém o forje; os avisos ajudam a conferir.

Limites conhecidos: quem tem o código da turma ainda pode criar alunos novos nela (até o limite); a senha da turma é a única proteção da leitura. A turma online só funciona no site publicado (ou com `npx vercel dev`); no servidor local simples (`python -m http.server`), o jogo avisa que não conseguiu enviar e continua normalmente.

### Grade curricular

`js/data/curriculum.js` lista os tópicos do Ensino Fundamental em ordem de progressão e diz em quais missões (e em quais etapas das missões de mundo) cada um é observado:

| Faixa | Tópicos | Missões |
|---|---|---|
| Anos Iniciais | contagem, adição, subtração, multiplicação, divisão, frações (metade, terço) | Partilha das Sementes, Comportas do Vale, Bancas do Mercado, Máquina de Produção |
| Anos Finais | frações de quantidades, razão, porcentagem, proporcionalidade, relações entre grandezas, linguagem algébrica, equação do 1º grau, função afim | Comportas, Bancas, Caldeirão, Oficina, Rotas, Torre, Núcleo |
| Desafios extras | simetria de reflexão; perímetro e área; equação do 2º grau | Jardim Espelhado, Cercas do Vale, Jardim de Nyla |

O motor de missões (`js/game/session.js`) grava em `js/game/stats.js`, para cada missão e etapa, acertos (`api.attempt(true)`), erros (`api.attempt(false)`), dicas, apoios automáticos e tempo. `js/game/assessment.js` cruza essas contagens com a grade para montar o relatório. As etapas são informadas pelas missões com `api.setStage(i)`.

## Modo Pesquisa

Na tela de título, abra **Modo Pesquisa**, informe um ID (sem nome real) e ative o registro. Só então os eventos são gravados no navegador. Exporte JSON ou CSV ao fim de cada sessão e use um ID por estudante.

Os eventos ficam no **IndexedDB** do navegador (banco `nexo_registros`, `js/core/log-store.js`), um por linha, separados do save: gravar um evento não reescreve mais o registro inteiro da escola, e o limite de ~5 MB do localStorage deixou de valer para eles. Registros de versões anteriores são levados para lá na primeira abertura. O jogo pede ao navegador armazenamento persistente e **avisa na tela** quando não consegue salvar o progresso ou os registros, ou quando o espaço passa de 80%. A seção Modo Pesquisa mostra quantos registros ainda não foram exportados, e trocar de aluno com registros pendentes pede confirmação. Zerar o progresso de um aluno mantém os registros; só **Excluir** o aluno ou **Apagar todos os dados** os remove. Os tipos de evento são os mesmos das versões anteriores (os dados de algumas tentativas mudaram junto com as mecânicas): `attempt`, `hint_request`, `support_triggered`, `success`, `retry`, `mission_start`, `mission_end`, `region_enter`, `region_return`, `interaction`, `calculator_use`.

## Reset e debug

**Opções > Apagar meu progresso** (tela de título do aluno) zera o progresso daquele aluno (os registros de pesquisa continuam). **Apagar todos os dados** (Painel do Professor) remove todos os alunos, registros e a senha. Com `index.html?debug=1` aparece o botão que libera todas as regiões, **só no servidor local** (localhost); no site publicado o parâmetro é ignorado. Se um aluno tiver regiões liberadas assim, o Painel do Professor mostra o aviso ⚠ "modo de teste".

**Testes:**
- `npm test`: testes de unidade (rotas da turma online com a Vercel Blob simulada em memória, e o componente de mãos das missões), em `tests/`.
- `npm run test:e2e`: testes de ponta a ponta com Playwright (`e2e/`), no Chrome já instalado (ou no Edge, com `NEXO_BROWSER=msedge`), sem baixar navegadores. Abrem o jogo servido pelo Vite e jogam por script: todas as missões montam sem erro, e Prólogo, Comportas do Vale, Previsão, Caldeirão de Orin e a Torre são jogados do início ao fim, com tentativas erradas no meio. Rode antes de cada publicação.

**Renderizador:** o padrão é o Canvas 2D do Phaser. `?render=webgl` (ou `?render=canvas`) troca para comparar: na medição feita, o WebGL ficou mais lento (16,3 ms contra ~9 ms por quadro) porque as camadas de canvas de tela inteira são reenviadas à placa de vídeo a cada quadro.

Os dados do Diário são indícios situados, não nota nem diagnóstico. O uso com estudantes depende de autorização institucional, consentimento dos responsáveis e assentimento dos participantes.
