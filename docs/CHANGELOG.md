# Changelog

Mudanças de Interclasse que quem usa percebe. Formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/). Regras em `_standards/documentation.md` §7.

## [Não lançado]

### Alterado

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
