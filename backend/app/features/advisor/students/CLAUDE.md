# `advisor/students`

Rota base: `/advisor/students`. 4 acoes: `create`, `delete`, `paginate`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar turmas | `GET /advisor/students` | Sim | `ADMINISTRATOR`, `ADVISOR` |
| Criar turma | `POST /advisor/students` | Sim | `ADMINISTRATOR`, `ADVISOR` |
| Atualizar turma | `PUT /advisor/students/{id}` | Sim | `ADMINISTRATOR`, `ADVISOR` |
| Remover turma | `DELETE /advisor/students/{id}` | Sim | `ADMINISTRATOR`, `ADVISOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR, ADVISOR. |
| 404 | `CLASSROOM_NOT_FOUND` | Turma não encontrada |
| 404 | `STUDENT_NOT_FOUND` | Aluno não encontrado |
| 409 | `STUDENT_IN_COMPETITION` | O aluno está inscrito numa modalidade já sorteada |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `STUDENT_CREATE_ERROR` | Erro interno do servidor |
| 500 | `STUDENT_DELETE_ERROR` | Erro interno do servidor |
| 500 | `STUDENT_LIST_ERROR` | Erro interno do servidor |
| 500 | `STUDENT_UPDATE_ERROR` | Erro interno do servidor |
