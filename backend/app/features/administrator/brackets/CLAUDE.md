# `administrator/brackets`

Rota base: `/administrator/brackets`. 4 acoes: `create`, `delete`, `paginate`, `show`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar chaves | `GET /administrator/brackets` | Sim | `ADMINISTRATOR` |
| Sortear chave | `POST /administrator/brackets` | Sim | `ADMINISTRATOR` |
| Detalhar chave | `GET /administrator/brackets/{id}` | Sim | `ADMINISTRATOR` |
| Remover chave | `DELETE /administrator/brackets/{id}` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 404 | `BRACKET_NOT_FOUND` | Chave não encontrada |
| 409 | `BRACKET_ALREADY_DRAWN` | — |
| 409 | `NOT_ENOUGH_TEAMS` | — |
| 409 | `TOO_MANY_TEAMS` | — |
| 422 | `SPORT_NOT_FOUND` | — |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `BRACKET_CREATE_ERROR` | Erro interno do servidor |
| 500 | `BRACKET_DELETE_ERROR` | Erro interno do servidor |
| 500 | `BRACKET_LIST_ERROR` | Erro interno do servidor |
| 500 | `BRACKET_SHOW_ERROR` | Erro interno do servidor |
