# Changelog

Mudanças de Interclasse que quem usa percebe. Formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/). Regras em `_standards/documentation.md` §7.

## [Não lançado]

### Segurança

- A API passa a ler o IP do cliente atrás do proxy (`TRUSTED_PROXIES`), então o limite de tentativas de login conta cada pessoa e não o servidor todo.
- Toda escrita confere a origem (`CORS_ORIGINS`), qualquer que seja o tipo de conteúdo; `CORS_ORIGIN` foi renomeada.
- O cookie de sessão fica sempre `SameSite=Lax`.
- Excesso de tentativas responde 429 com código estável; erro interno nunca mais devolve a mensagem crua do banco.
- Upload prende o tamanho de cada parte na URL assinada e confere o conteúdo do arquivo antes de confirmar.
- Limite por usuário em upload, troca de conta e exportação do relatório; limite por IP na renovação da sessão.
- `SESSION_DRIVER` deixa de existir.

### Adicionado

- O tema pode ser escolhido em qualquer tela (claro, escuro ou o do sistema): o seletor agora também está no cabeçalho do site (inclusive no menu do celular) e na tela de entrada.
- Componentes de interface novos para as telas (calendário, seleção, interruptor, grupo de opções, barra de progresso, paleta de comandos, gaveta, entre outros).

### Alterado (interface)

- O menu do site no celular passa a abrir como painel lateral, com o mesmo conteúdo (páginas, entrar, idioma e tema), e fecha sozinho ao escolher uma página.
- Avisos de "nada por aqui", cartões de aviso e de remoção, o aviso de remoções do painel e o quadro de inscrição de atletas usam os componentes padrão da interface, sem mudar o que aparece.
- Botões e avisos internos que só tinham texto em português ("Fechar", "Carregando", "Mais páginas") agora seguem o idioma escolhido.

### Corrigido

- Na tela de um usuário do painel, o título agora é só o nome; o papel e a situação ("Professor conselheiro", "Ativo") ficam logo abaixo e deixam de ser lidos como parte do título pelos leitores de tela.
- O contrato da API (`openapi.json`) passa a descrever a resposta 429 das rotas com limite de tentativas (entrar, renovar sessão, enviar arquivo, trocar a conta e exportar o relatório).

- Endereço que não existe (`/admin`, `/teams`, `/nao-existe`) responde 404 de verdade, e não mais 200 com a tela de erro; a tela continua com o menu e o rodapé do site.
- "Sobre" não aparece no menu, no rodapé nem no mapa do site enquanto a organização não escreveu a apresentação dos jogos; o endereço `/about` continua abrindo, com o aviso de que ainda não há texto.
- Menu do celular mostra o idioma ("PT-BR") ao lado do ícone, em vez de só o ícone.
- Leitores de tela: nas páginas de jogos, classificação, chave e avisos os títulos seguem a ordem (1, 2, 3), sem pular nível, e a barra lateral do painel é uma região de navegação nomeada.
- Login com a senha em branco acusa "Preencha este campo" na hora, sem enviar nada ao servidor; o campo de senha não traz mais os pontinhos de exemplo (pareciam senha digitada) e o texto de apoio dos campos ficou mais escuro, com contraste melhor.

### Alterado

- Chaves de ambiente no catálogo da casa: a conta do primeiro administrador volta a ser `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD` (o nome `SEED_ADMINISTRATOR_*` deixa de existir); o seed do administrador e o da demonstração ligam quando a senha tem valor, em qualquer ambiente, e sem ela são pulados com uma linha de log. As contas de demonstração passam a ser `advisor@example.com`, `advisor-2@example.com` e `representative@example.com`, entre outras.
- `STORAGE_PUBLIC_URL` (lida pelo servidor do site a cada requisição) substitui `VITE_STORAGE_URL` na política de segurança de conteúdo; a mesma imagem serve qualquer ambiente. Quem implanta precisa trocar a variável no Coolify, senão o upload é bloqueado.
- O deploy lê os secrets `COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_API_UUID` e `COOLIFY_APP_UUID`, sem endereço nem uuid escritos no workflow.
- O botão Salvar da inscrição de atletas fica legível no tema escuro mesmo quando não há nada para salvar.
- Todas as telas cabem no celular, do site público ao painel: botões e campos com 44 px para o dedo, diálogos que sobem do rodapé e tabelas que viram cartões.
- Site público mais limpo: início sem logo repetida, faixa de resultados que se rola com o dedo ou o teclado, chave com uma fase por vez no celular e página de erro curta.
- Login sem enfeite e com o formulário no topo no celular; menu do representante com atletas e perfil juntos.
- Painel do administrador no celular: jogos do painel com botões em grade, relatório com dois destaques e tabelas que rolam com o teclado, "Apagar chave" em zona de perigo no fim da chave e salvar do site fixo no rodapé.
- Inscrição de atletas (administrador, conselheiro e representante): modalidades em blocos recolhíveis, linhas de aluno clicáveis inteiras e botão de salvar sempre à vista.
- A página pública de uma chave passa a declarar a trilha de navegação (início, classificação, chave) e o evento esportivo para os buscadores.
- O tema claro/escuro vem de um cookie lido no servidor: a página já abre no tema escolhido, sem piscar.
- Fora de produção o site responde `noindex` e o `robots.txt` bloqueia tudo; produção precisa de `SITE_ENV=production` (`ENV.md`). Painel e telas de entrada ficam sempre fora dos buscadores.
- O site manda cabeçalhos de segurança (CSP com `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS); o CSP precisa de `STORAGE_PUBLIC_URL` para o upload de fotos.
- Formulário com alteração não salva pergunta antes de sair da tela.
- Listas do sorteio e das turmas buscam contas e modalidades no servidor, 20 por vez, com "Carregar mais".
- Listas mostram um esqueleto enquanto carregam e telas de detalhe têm página própria de "não encontrado".
- A tela de entrada do painel passa de `/authentication` para `/sign-in`.
- `robots.txt` e `sitemap.xml` passam a ser gerados pelo servidor: o mapa do site lista as páginas públicas e as chaves, uma entrada por idioma, e fora de produção o `robots.txt` proíbe a indexação.
- O layout salvo das tabelas (colunas escondidas, ordem, largura) volta ao padrão uma vez, porque a chave de armazenamento mudou.
- Os endereços do site passam para inglês, sem redirecionamento: `/classificacao` vira `/standings`, `/jogos` vira `/matches`, `/avisos` vira `/announcements`, `/sobre` vira `/about` (com os prefixos `/es` e `/en`), e a entrada do painel `/painel` vira `/dashboard`. Link salvo com o endereço antigo deixa de abrir.

## [0.1.0] - 2026-10-29

### Adicionado

- Página "Sobre" no site, com o texto, o organizador e a edição dos jogos. A organização edita tudo em Painel › Site.
- Regulamento em PDF: a organização envia o arquivo e o site mostra o link para baixar.
- Link do Instagram da escola e do desenvolvedor no rodapé do site.
- Carrossel de fotos no site. O conselheiro envia fotos dos jogos e elas só aparecem depois que a organização aprova. A organização também pode recusar, ou tirar do ar uma foto já aprovada.
- Relatórios de turmas, alunos e atletas no painel, com exportação em CSV que abre direto no Excel, com acentos corretos.
- Troca de idioma no site e no painel (português, espanhol e inglês). A API passa a responder as mensagens de erro e de validação na língua escolhida; os textos das telas ainda estão só em português.
- Excluir uma chave pela lista de chaves, no menu da linha. A chave só sai se nenhuma partida tiver placar.
- Turmas em cartões separados por Fundamental 1 (3º ao 5º ano) e Fundamental 2 (6º ao 9º), com a página da turma mostrando conselheiro e representante.

### Alterado

- A classificação do site agora tem abas por categoria e por modalidade, e muda de aba sem sair da página.
- Cada conselheiro cuida de uma turma só. Quem já aconselhava mais de uma ficou com a mais antiga, e as outras voltaram para "Sem conselheiro", para a organização indicar outro professor.
- O texto da página Sobre deixou de ser fixo: vem do que a organização salvar em Painel › Site.

### Corrigido

- Abrir o menu da conta derrubava a tela com a mensagem "Algo quebrou". O menu abre normalmente.
- O sorteio mostrava erro mesmo com a chave criada. Agora repetir o sorteio devolve a chave que já existe, sem erro e sem novo sorteio.

[Não lançado]: https://github.com/jhollyfer/interclasse/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jhollyfer/interclasse/releases/tag/v0.1.0
