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
- `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD` viram `SEED_ADMINISTRATOR_EMAIL` e `SEED_ADMINISTRATOR_PASSWORD`; `SESSION_DRIVER` deixa de existir.

### Alterado

- A página pública de uma chave passa a declarar a trilha de navegação (início, classificação, chave) e o evento esportivo para os buscadores.
- O tema claro/escuro vem de um cookie lido no servidor: a página já abre no tema escolhido, sem piscar.
- Fora de produção o site responde `noindex` e o `robots.txt` bloqueia tudo; produção precisa de `SITE_ENV=production` (`ENV.md`). Painel e telas de entrada ficam sempre fora dos buscadores.
- O site manda cabeçalhos de segurança (CSP com `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS); o CSP precisa de `VITE_STORAGE_URL` para o upload de fotos.
- Formulário com alteração não salva pergunta antes de sair da tela.
- Listas do sorteio e das turmas buscam contas e modalidades no servidor, 20 por vez, com "Carregar mais".
- Listas mostram um esqueleto enquanto carregam e telas de detalhe têm página própria de "não encontrado".
- A tela de entrada do painel passa de `/authentication` para `/sign-in`.
- `robots.txt` e `sitemap.xml` passam a ser gerados pelo servidor: o mapa do site lista as páginas públicas e as chaves, uma entrada por idioma, e fora de produção o `robots.txt` proíbe a indexação.
- O layout salvo das tabelas (colunas escondidas, ordem, largura) volta ao padrão uma vez, porque a chave de armazenamento mudou.

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
