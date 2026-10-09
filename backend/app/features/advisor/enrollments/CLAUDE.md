# `advisor/enrollments`

Rota base: `/advisor/enrollments`. 2 acoes: `show`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Detalhar turma | `GET /advisor/enrollments` | Sim | `ADMINISTRATOR`, `ADVISOR` |
| Atualizar turma | `PUT /advisor/enrollments` | Sim | `ADMINISTRATOR`, `ADVISOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR, ADVISOR. |
| 404 | `CLASSROOM_NOT_FOUND` | Turma não encontrada |
| 409 | `ENROLLMENT_LOCKED` | Conflito com o estado atual |
| 422 | `ENROLLMENT_LIMIT_EXCEEDED` | — |
| 422 | `SPORT_NOT_FOUND` | — |
| 422 | `STUDENT_NOT_FOUND` | — |
| 422 | `VALIDATION_ERROR` | — |
| 500 | `ENROLLMENT_SHOW_ERROR` | Erro interno do servidor |
| 500 | `ENROLLMENT_UPDATE_ERROR` | Erro interno do servidor |
