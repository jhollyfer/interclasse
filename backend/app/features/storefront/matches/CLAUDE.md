# `storefront/matches`

Rota base: `/storefront/matches`. 1 acoes: `paginate`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar itens | `GET /storefront/matches` | Não | — |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `MATCH_LIST_ERROR` | Erro interno do servidor |
