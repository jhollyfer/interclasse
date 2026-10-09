# `storefront/brackets`

Rota base: `/storefront/brackets`. 2 acoes: `paginate`, `show`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar itens | `GET /storefront/brackets` | Não | — |
| Detalhar item | `GET /storefront/brackets/{id}` | Não | — |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 404 | `BRACKET_NOT_FOUND` | Chave não encontrada |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `BRACKET_LIST_ERROR` | Erro interno do servidor |
| 500 | `BRACKET_SHOW_ERROR` | Erro interno do servidor |
