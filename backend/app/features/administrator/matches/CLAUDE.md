# `administrator/matches`

Rota base: `/administrator/matches`. 3 acoes: `paginate`, `score`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar partidas | `GET /administrator/matches` | Sim | `ADMINISTRATOR` |
| Agendar partida | `PUT /administrator/matches/{id}` | Sim | `ADMINISTRATOR` |
| Lançar placar | `PUT /administrator/matches/{id}/score` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 404 | `MATCH_NOT_FOUND` | Partida não encontrada |
| 409 | `GROUP_STAGE_CLOSED` | — |
| 409 | `MATCH_TEAMS_PENDING` | — |
| 409 | `NEXT_MATCH_PLAYED` | — |
| 422 | `MATCH_WINNER_REQUIRED` | — |
| 422 | `VALIDATION_ERROR` | — |
| 500 | `MATCH_LIST_ERROR` | Erro interno do servidor |
| 500 | `MATCH_SCORE_ERROR` | Erro interno do servidor |
| 500 | `MATCH_UPDATE_ERROR` | Erro interno do servidor |
