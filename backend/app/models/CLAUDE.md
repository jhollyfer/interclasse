# `app/models/`

A ponte com o banco, e so o que sobrevive a regeneracao.

O model estende a classe gerada em `database/schema.ts`, que e **reescrita a cada**
`migration:run`. So quatro coisas entram no arquivo do model, porque so elas
sobrevivem: relacoes, estreitamento de enum **com `@column()`**, `prepare`/`consume`
de coluna `jsonb` ou `bigint`, e query scopes.

`serializeAs: null` para campo sensivel vive em `database/schema_rules.ts`, nunca
aqui - escrito no model, ele desaparece na proxima geracao.

Todo model com `deleted_at` (hoje só `users` e `storages`) declara `static notDeleted = scope(...)`. O filtro e de
seguranca, e escrito a mao em cada consulta ele depende de alguem lembrar: eram 273
repeticoes nos tres projetos antes de virar scope.

## Arquivos

| Arquivo | Proposito |
|---|---|
| `announcement.ts` | Aviso dos jogos: troca de horário, local, regra |
| `bracket.ts` | A competição de uma modalidade numa categoria: os times e as partidas |
| `classroom.ts` | A turma: a unidade que compete. Cada modalidade forma um time por turma |
| `enrollment.ts` | O aluno inscrito como atleta numa modalidade |
| `match.ts` | Uma partida do mata-mata: marcada ou com placar |
| `sport.ts` | A modalidade: futsal, vôlei, queimada... |
| `storage.ts` | Registro neutro de arquivo: nome da chave, rótulo original, tipo, tamanho e onde o binário vive (`path`) |
| `student.ts` | O aluno de uma turma. Só vira atleta quando inscrito numa modalidade |
| `team.ts` | A turma dentro de uma competição |
| `user.ts` | O mixin faz duas coisas que precisam andar juntas: gera o hash da senha antes de gravar e expõe `verifyCredentials` |

A coluna de proposito e a primeira frase do JSDoc de cada arquivo, extraida do
proprio arquivo. Um travessao ali quer dizer que o arquivo nao se explicou.
