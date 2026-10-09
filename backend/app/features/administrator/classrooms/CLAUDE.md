# `administrator/classrooms`

Rota base: `/administrator/classrooms`. 5 acoes: `create`, `delete`, `paginate`, `show`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar turmas | `GET /administrator/classrooms` | Sim | `ADMINISTRATOR` |
| Criar turma | `POST /administrator/classrooms` | Sim | `ADMINISTRATOR` |
| Detalhar turma | `GET /administrator/classrooms/{id}` | Sim | `ADMINISTRATOR` |
| Atualizar turma | `PUT /administrator/classrooms/{id}` | Sim | `ADMINISTRATOR` |
| Remover turma | `DELETE /administrator/classrooms/{id}` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 404 | `CLASSROOM_NOT_FOUND` | Turma não encontrada |
| 409 | `CLASSROOM_ALREADY_EXISTS` | — |
| 409 | `CLASSROOM_IN_COMPETITION` | A turma já está numa chave sorteada |
| 409 | `REPRESENTATIVE_TAKEN` | — |
| 422 | `ADVISOR_NOT_FOUND` | — |
| 422 | `REPRESENTATIVE_NOT_FOUND` | — |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `CLASSROOM_CREATE_ERROR` | Erro interno do servidor |
| 500 | `CLASSROOM_DELETE_ERROR` | Erro interno do servidor |
| 500 | `CLASSROOM_LIST_ERROR` | Erro interno do servidor |
| 500 | `CLASSROOM_SHOW_ERROR` | Erro interno do servidor |
| 500 | `CLASSROOM_UPDATE_ERROR` | Erro interno do servidor |
