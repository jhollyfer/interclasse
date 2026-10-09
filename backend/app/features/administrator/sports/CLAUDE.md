# `administrator/sports`

Rota base: `/administrator/sports`. 5 acoes: `create`, `delete`, `paginate`, `show`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar modalidades | `GET /administrator/sports` | Sim | `ADMINISTRATOR` |
| Criar modalidade | `POST /administrator/sports` | Sim | `ADMINISTRATOR` |
| Detalhar modalidade | `GET /administrator/sports/{id}` | Sim | `ADMINISTRATOR` |
| Atualizar modalidade | `PUT /administrator/sports/{id}` | Sim | `ADMINISTRATOR` |
| Remover modalidade | `DELETE /administrator/sports/{id}` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 404 | `SPORT_NOT_FOUND` | Modalidade não encontrada |
| 409 | `SPORT_ALREADY_EXISTS` | Há turma com mais atletas inscritos que o novo máximo |
| 409 | `SPORT_IN_USE` | A modalidade tem inscrições |
| 409 | `SPORT_ROSTER_ABOVE_LIMIT` | Modalidade já existe |
| 422 | `SPORT_INVALID_LIMITS` | Dados inválidos |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `SPORT_CREATE_ERROR` | Erro interno do servidor |
| 500 | `SPORT_DELETE_ERROR` | Erro interno do servidor |
| 500 | `SPORT_LIST_ERROR` | Erro interno do servidor |
| 500 | `SPORT_SHOW_ERROR` | Erro interno do servidor |
| 500 | `SPORT_UPDATE_ERROR` | Erro interno do servidor |
