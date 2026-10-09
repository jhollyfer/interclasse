# `advisor/classrooms`

Rota base: `/advisor/classrooms`. 1 acoes: `paginate`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar turmas | `GET /advisor/classrooms` | Sim | `ADMINISTRATOR`, `ADVISOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR, ADVISOR. |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `CLASSROOM_LIST_ERROR` | Erro interno do servidor |
