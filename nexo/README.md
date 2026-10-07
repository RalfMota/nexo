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

**Desafios extras** (aparecem no menu do personagem; não travam as regiões):

| Desafio | Personagem | Liberado depois de | Conteúdo |
|---|---|---|---|
| Jardim Espelhado | Tainá | Vale dos Recursos | Simetria de reflexão (eixo vertical e horizontal) |
| Cercas do Vale | Tainá | Mercado das Trocas | Perímetro e área: mesmo perímetro com áreas diferentes e vice-versa |
| Jardim de Nyla | Nyla | Torre dos Padrões | Equação do 2º grau como problema de área (x² = 36; x(x + 2) = 48; x² − 4 = 45) |

## Como as missões funcionam

Todas as missões de Matemática acontecem **no próprio mapa**, sem janela: os objetos aparecem perto do personagem da região, o jogador anda até eles e aperta **E** (ou toca) para pegar, levar, plantar, puxar alavancas e girar mostradores. Um rastreador no HUD mostra a etapa, a fala do personagem, as dicas e o Registro técnico. Só o Prólogo (aprender a usar o jogo) ainda é uma cena em janela.

- **Pegar e levar:** pilhas, cestos e estantes entregam uma unidade por toque; segurar E pega várias. Com as mãos vazias, dá para tirar de volta o que foi colocado.
- **Alavancas, manivelas e corneta:** disparam o que foi montado (abrir a comporta, rodar a máquina, mandar as caravanas, assentar lajotas).
- **Mostradores (▼ ▲):** números de previsão e de regras, sem campo de digitação; segurar E gira depressa.

| Missão | O que o jogador faz no mapa |
|---|---|
| Partilha das Sementes | pega sementes no saco, leva aos canteiros e se agacha para plantar. Etapas: contar (3 em cada um de 2 canteiros), repartir (12 em 3) e dividir com resto (50 em 6 com a semeadeira; o resto vai no saco até o celeiro) |
| Comportas do Vale | enche baldes no lago (até 3 de uma vez), despeja nas plantações conforme a placa (1/2, 1/3, o resto) e gira a comporta. Etapas: 8, 12 e 18 baldes |
| Bancas do Mercado | encosta nas bancas para pôr pacotes no cesto e paga no balcão do Orin. Etapas: exatamente 12 cristais; depois 20 cristais com 48 moedas (desconto de 20% numa banca) |
| Caldeirão de Orin | colhe folhas no cesto e orvalho no chafariz, põe no caldeirão e mexe com as mãos vazias. Receita 4 folhas + 6 gotas → 2 frascos; pedidos de 2, 4 e 5 frascos |
| Máquina de Produção | gira a manivela da máquina (a fita no Registro mostra ciclo → cristais), pega o carrinho e leva até a ponte de carga, que pede exatamente 24 |
| Previsão | leva células da estante ao conversor e faz 3 testes; depois lê o bilhete do Kael, gira o mostrador com a previsão e puxa a alavanca |
| Custo de Viagem | encosta nos marcos de légua (0 a 26) para comparar as rotas; leva cada caixa (4, 12 e 20 léguas) à carroça da Rota A ou B e toca a corneta |
| Ponto de Mudança | finca a placa no marco em que a rota mais barata muda (10 léguas) |
| Grade de Energia | olha as grades de exemplo no chão, carrega o carrinho com feixes de 10 e hastes soltas e manda montar a grade de 10 módulos; depois grava a regra em dois mostradores e vê os 12 andares do elevador acenderem |
| Arquivo da Torre | lê o registro sobre cada pedestal e grava a regra nos mostradores |
| Reacender o Núcleo | leva cristais da pilha ao Núcleo e puxa a alavanca (2 testes); gera exatamente 50 de energia; leva ao Núcleo a tabuleta com o gráfico certo |
| Jardim Espelhado | pega mudas nos cestos e planta do outro lado do caminho de pedras para espelhar o jardim |
| Cercas do Vale | leva ao carrinho as tábuas exatas para cercar o canteiro 5 × 3; depois gira largura e comprimento para o cercado de maior área com 20 tábuas e a horta de 24 quadradinhos com menos cerca |
| Jardim de Nyla | gira o lado x do jardim e manda assentar as lajotas: sobram ou faltam até a área bater com as lajotas que existem |

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
api/                  funções da Vercel: turmas online (turma.js, sync.js, _turmas.js)
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
                      (alavancas, mostradores, etiquetas); prologue.js + playfield.js (cena em janela)
  world/              mapa, renderização, entrada do jogador, história (falas)
  art/                desenho em pixel art: terreno, construções, personagens
  ui/                 telas, HUD, diálogo, janelas, Mapa, Diário, ferramentas
```

Cada missão é um objeto com textos (`context`, `goal`, `hints`), dados da Visão pedagógica (`concept`, `prerequisites`, `relation`, `categories`) e uma função `mount(stage, api)`, que monta a cena com `createPlayfield` e informa tentativas (`api.attempt`), erros (`api.fail`), conclusão (`api.win`) e o Registro técnico (`api.record`).

### Objetos em pixel art

`js/art/pixel.js` é o motor de pixel art dos objetos: cada um é pintado pixel a pixel (1 pixel da grade = 1 pixel do mundo) com rampas de 5 tons, luz pela normal da superfície (esfera, cilindro, caixa), pontilhado só na troca de tom e contorno na cor escura do material. Os desenhos ficam em cache. `js/art/items.js` tem os objetos das missões (saco de sementes, cuia, semeadeira, baldes, comporta, cesto, caldeirão, pacotes, canteiros e brotos) `js/art/mission-props.js` e `js/art/garden-props.js` os das missões da Oficina, Rotas, Torre, Núcleo e dos desafios extras, e `js/art/props.js` os objetos do mapa (postes, caixotes, barris, cercas, placas, mural, bancas, chafariz, bases dos cristais e das engrenagens). Partes que se mexem (roda da semeadeira, volante da comporta, fogo) têm quadros próprios.

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

Sem turma online, tudo fica no `localStorage` deste navegador (chave `nexo_escola_v1`). A senha guarda só um resumo (SHA-256), mas é uma proteção simples: evita que um aluno entre no painel por engano, não protege contra quem tem acesso ao computador. Um save antigo (de antes dos perfis) vira um aluno automaticamente.

### Turma online (dados reunidos de vários computadores)

No site publicado, o professor pode juntar a turma inteira, de qualquer computador:

1. No Painel do Professor, **☁ Turma online → Criar uma turma nova** (nome e senha da turma, mínimo de 6 caracteres). O jogo mostra um **código de 6 letras e números** (sem 0/O nem 1/I, fáceis de ditar). A turma já fica ligada a este computador.
2. Em cada computador da escola, o professor abre a turma e marca **Usar esta turma para os alunos deste computador**. Em casa, o aluno digita o código na tela de título (**Turma online**).
3. Enquanto o aluno joga, o progresso é enviado sozinho alguns segundos depois de cada mudança (e ao fechar a aba).
4. No painel, **Abrir uma turma** (código + senha) lista os alunos deste computador e os que jogaram em outros computadores (☁), com o mesmo relatório. **Atualizar alunos** busca de novo.

**O que vai para a internet:** apenas o apelido, a aparência do personagem, as missões concluídas e as estatísticas. Os registros do Modo Pesquisa e o ID de participante ficam no computador. Por isso o cadastro pede **apelido ou código**, não o nome completo.

**Onde fica:** um armazenamento **privado** da Vercel Blob (loja `nexo-turmas`, região de São Paulo, `gru1`), ligado ao projeto `nexo-jornada-matematica`. Nada é acessível por link; só as funções do próprio site leem e escrevem. Organização: `turmas/<CÓDIGO>/turma.json` (nome e resumo scrypt da senha, com sal) e `turmas/<CÓDIGO>/alunos/<ID>.json`.

**Rotas** (pasta `api/`, funções da Vercel):

| Rota | Quem usa | O que faz |
|---|---|---|
| `POST /api/turma` `{acao: 'criar', nome, senha}` | professor | cria a turma e devolve o código |
| `POST /api/turma` `{acao: 'ler', codigo, senha}` | professor | devolve os alunos da turma (só com a senha certa) |
| `POST /api/turma` `{acao: 'remover', codigo, senha, id}` | professor | apaga um aluno da turma |
| `POST /api/sync` `{codigo, aluno}` | jogo do aluno | regrava o arquivo daquele aluno (o servidor descarta qualquer campo fora do esperado) |

Limites conhecidos: quem tem o código pode enviar progresso para a turma (não pode ler); a senha da turma é a única proteção da leitura. A turma online só funciona no site publicado (ou com `npx vercel dev`); no servidor local simples (`python -m http.server`), o jogo avisa que não conseguiu enviar e continua normalmente.

### Grade curricular

`js/data/curriculum.js` lista os tópicos do Ensino Fundamental em ordem de progressão e diz em quais missões (e em quais etapas das missões de mundo) cada um é observado:

| Faixa | Tópicos | Missões |
|---|---|---|
| Anos Iniciais | contagem, adição, subtração, multiplicação, divisão, frações (metade, terço) | Partilha das Sementes, Comportas do Vale, Bancas do Mercado, Máquina de Produção |
| Anos Finais | frações de quantidades, razão, porcentagem, proporcionalidade, relações entre grandezas, linguagem algébrica, equação do 1º grau, função afim | Comportas, Bancas, Caldeirão, Oficina, Rotas, Torre, Núcleo |
| Desafios extras | simetria de reflexão; perímetro e área; equação do 2º grau | Jardim Espelhado, Cercas do Vale, Jardim de Nyla |

O motor de missões (`js/game/session.js`) grava em `js/game/stats.js`, para cada missão e etapa, acertos (`api.attempt(true)`), erros (`api.attempt(false)`), dicas, apoios automáticos e tempo. `js/game/assessment.js` cruza essas contagens com a grade para montar o relatório. As etapas são informadas pelas missões com `api.setStage(i)`.

## Modo Pesquisa

Na tela de título, abra **Modo Pesquisa**, informe um ID (sem nome real) e ative o registro. Só então os eventos são gravados no navegador. Exporte JSON ou CSV ao fim de cada sessão e use um ID por estudante. Os tipos de evento são os mesmos das versões anteriores (os dados de algumas tentativas mudaram junto com as mecânicas): `attempt`, `hint_request`, `support_triggered`, `success`, `retry`, `mission_start`, `mission_end`, `region_enter`, `region_return`, `interaction`, `calculator_use`.

## Reset e debug

**Opções > Apagar meu progresso** (tela de título do aluno) zera o progresso daquele aluno. **Apagar todos os dados** (Painel do Professor) remove todos os alunos, registros e a senha. Com `index.html?debug=1` aparece o botão que libera todas as regiões.

Os dados do Diário são indícios situados, não nota nem diagnóstico. O uso com estudantes depende de autorização institucional, consentimento dos responsáveis e assentimento dos participantes.
