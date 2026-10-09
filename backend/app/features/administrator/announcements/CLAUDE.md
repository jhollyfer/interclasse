# `administrator/announcements`

Rota base: `/administrator/announcements`. 5 acoes: `create`, `delete`, `paginate`, `show`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar avisos | `GET /administrator/announcements` | Sim | `ADMINISTRATOR` |
| Criar aviso | `POST /administrator/announcements` | Sim | `ADMINISTRATOR` |
| Detalhar aviso | `GET /administrator/announcements/{id}` | Sim | `ADMINISTRATOR` |
| Atualizar aviso | `PUT /administrator/announcements/{id}` | Sim | `ADMINISTRATOR` |
| Remover aviso | `DELETE /administrator/announcements/{id}` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 404 | `ANNOUNCEMENT_NOT_FOUND` | Aviso não encontrado |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `ANNOUNCEMENT_CREATE_ERROR` | Erro interno do servidor |
| 500 | `ANNOUNCEMENT_DELETE_ERROR` | Erro interno do servidor |
| 500 | `ANNOUNCEMENT_LIST_ERROR` | Erro interno do servidor |
| 500 | `ANNOUNCEMENT_SHOW_ERROR` | Erro interno do servidor |
| 500 | `ANNOUNCEMENT_UPDATE_ERROR` | Erro interno do servidor |
