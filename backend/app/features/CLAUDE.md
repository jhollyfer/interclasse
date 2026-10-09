# Features

Vertical slice por **papel + recurso + acao**: um arquivo por acao, e o par
`<verbo>.controller.ts` / `<verbo>.use-case.ts` lado a lado. Sem validator, policy
nem serializer por pasta - o schema mora em `#core/validator`, a resposta em
`#core/response`, a regra por registro em `app/policies/`.

O agrupamento e por **papel**, e nao por recurso: rota nova nasce protegida pelo
modulo onde foi colocada, e nao por alguem lembrar de pendurar um middleware nela.
O mesmo recurso em dois papeis sao dois casos de uso, com autorizacao diferente.

A regua esta em `../../../PADRAO-BACKEND.md`. Este arquivo assume tudo o que ela
diz e nao repete nada.

## Modulos

| Modulo | Rota base | Controllers | O que e |
|---|---|---|---|
| `account/` | `/account` | 2 | A propria conta de quem esta autenticado. Escopo de sessao, nao de papel. |
| `administrator/` | `/administrator` | 29 | A organizacao dos jogos: turmas, modalidades, contas, sorteio, placar, avisos. |
| `advisor/` | `/advisor` | 7 | O professor conselheiro: alunos e inscricoes das proprias turmas. |
| `authentication/` | `/authentication` | 3 | Entrar, sair, renovar. Nao ha auto-cadastro: toda conta nasce no painel. |
| `representative/` | `/representative` | 2 | O aluno representante: a lista de atletas da propria turma. |
| `storages/` | `/storages` | 7 | Arquivos. Upload em tres passos, com o binario indo direto para o bucket. |
| `storefront/` | `/storefront` | 5 | O site publico. Leitura anonima, nenhuma escrita. |

55 controllers, 55 operacoes no `openapi.json`. A contagem sai do documento
gerado, e nao desta tabela: se as duas divergirem, a tabela e que envelheceu.

## Recursos por modulo

- **`administrator/`** — `announcements`, `brackets`, `classrooms`, `matches`, `sports`, `users`
- **`advisor/`** — `classrooms`, `enrollments`, `students`
- **`representative/`** — `enrollments`
- **`storefront/`** — `announcements`, `brackets`, `matches`, `sports`

## `_shared.<tema>.ts`

Funcao pura sobre model ou query ja em maos, compartilhada entre modulos. O que
tem dependencia ou estado e service, nao entra aqui - o criterio esta na secao
4.9 da regua, com a distincao de quem e dono da consulta.

- `_shared.tournament.ts` — sorteio, folgas e avanco do vencedor no mata-mata.
  Coberto por `tests/functional/torneio.spec.ts`, sem banco.

## O que nao existe aqui

- **Repositorio.** O caso de uso consulta o model Lucid direto: a indirecao so se
  paga com mais de uma implementacao, e nunca houve outra.
- **Validator por pasta.** `app/core/validator.ts` e arquivo unico, e e o que as
  meta-specs conseguem varrer inteiro.
- **`errors:` no `defineDocs`,** exceto para codigo que nasce fora do par
  controller/use-case - o `openapi/introspect.ts` colhe o resto por AST.
