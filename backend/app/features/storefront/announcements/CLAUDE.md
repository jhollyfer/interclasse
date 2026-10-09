# `storefront/announcements`

Rota base: `/storefront/announcements`. 1 acoes: `paginate`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar itens | `GET /storefront/announcements` | Não | — |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `ANNOUNCEMENT_LIST_ERROR` | Erro interno do servidor |
