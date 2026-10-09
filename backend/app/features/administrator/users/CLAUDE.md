# `administrator/users`

Rota base: `/administrator/users`. 7 acoes: `archive`, `create`, `delete`, `paginate`, `show`, `unarchive`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar usuários | `GET /administrator/users` | Sim | `ADMINISTRATOR` |
| Criar usuário | `POST /administrator/users` | Sim | `ADMINISTRATOR` |
| Ver um usuário | `GET /administrator/users/{id}` | Sim | `ADMINISTRATOR` |
| Atualizar usuário | `PUT /administrator/users/{id}` | Sim | `ADMINISTRATOR` |
| Apagar usuário | `DELETE /administrator/users/{id}` | Sim | `ADMINISTRATOR` |
| Arquivar usuário | `PATCH /administrator/users/{id}/archive` | Sim | `ADMINISTRATOR` |
| Restaurar usuário | `PATCH /administrator/users/{id}/unarchive` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 403 | `SELF_ACCESS_FORBIDDEN` | — |
| 403 | `SELF_ARCHIVE_FORBIDDEN` | — |
| 403 | `SELF_DELETE_FORBIDDEN` | — |
| 404 | `USER_NOT_FOUND` | Usuário não encontrado |
| 409 | `USER_ALREADY_EXISTS` | Usuário já existe |
| 409 | `USER_NOT_ARCHIVED` | Usuário não está arquivado |
| 422 | `STORAGE_NOT_FOUND` | — |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `USER_ARCHIVE_ERROR` | Erro interno do servidor |
| 500 | `USER_CREATE_ERROR` | Erro interno do servidor |
| 500 | `USER_DELETE_ERROR` | Erro interno do servidor |
| 500 | `USER_LIST_ERROR` | Erro interno do servidor |
| 500 | `USER_SHOW_ERROR` | Erro interno do servidor |
| 500 | `USER_UNARCHIVE_ERROR` | Erro interno do servidor |
| 500 | `USER_UPDATE_ERROR` | Erro interno do servidor |
