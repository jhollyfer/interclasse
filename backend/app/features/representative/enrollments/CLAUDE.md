# `representative/enrollments`

Rota base: `/representative/enrollments`. 2 acoes: `show`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Detalhar inscrição | `GET /representative/enrollments` | Sim | `REPRESENTATIVE` |
| Atualizar inscrição | `PUT /representative/enrollments` | Sim | `REPRESENTATIVE` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: REPRESENTATIVE. |
| 404 | `CLASSROOM_NOT_FOUND` | Nenhuma turma vinculada |
| 409 | `ENROLLMENT_LOCKED` | Conflito com o estado atual |
| 422 | `ENROLLMENT_LIMIT_EXCEEDED` | — |
| 422 | `SPORT_NOT_FOUND` | — |
| 422 | `STUDENT_NOT_FOUND` | — |
| 422 | `VALIDATION_ERROR` | — |
| 500 | `ENROLLMENT_SHOW_ERROR` | Erro interno do servidor |
| 500 | `ENROLLMENT_UPDATE_ERROR` | Erro interno do servidor |
