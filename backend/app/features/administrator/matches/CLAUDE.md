# `administrator/matches`

Rota base: `/administrator/matches`. 4 acoes: `paginate`, `score`, `unscore`, `update`.

Cada acao e um par `<verbo>.controller.ts` / `<verbo>.use-case.ts`. As tabelas
abaixo saem do `openapi.json`, que e gerado do router de verdade: se divergirem
do codigo, sao elas que envelheceram.

## Operacoes

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar partidas | `GET /administrator/matches` | Sim | `ADMINISTRATOR` |
| Agendar partida | `PUT /administrator/matches/{id}` | Sim | `ADMINISTRATOR` |
| Lançar placar | `PUT /administrator/matches/{id}/score` | Sim | `ADMINISTRATOR` |
| Desfazer placar | `DELETE /administrator/matches/{id}/score` | Sim | `ADMINISTRATOR` |

## Erros Possiveis

`Cause` e o `code` do envelope - a string que o cliente compara.

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 403 | `ACCESS_DENIED` | Acesso negado. Exige um destes papéis: ADMINISTRATOR. |
| 404 | `MATCH_NOT_FOUND` | Partida não encontrada |
| 409 | `MATCH_NOT_PLAYED` | A partida ainda não tem placar |
| 409 | `MATCH_TEAMS_PENDING` | A partida ainda não tem os dois times definidos |
| 409 | `NEXT_MATCH_PLAYED` | A partida seguinte já tem placar: desfaça-a antes |
| 422 | `MATCH_WINNER_REQUIRED` | Dados inválidos |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `MATCH_LIST_ERROR` | Erro interno do servidor |
| 500 | `MATCH_SCORE_ERROR` | Erro interno do servidor |
| 500 | `MATCH_UNSCORE_ERROR` | Erro interno do servidor |
| 500 | `MATCH_UPDATE_ERROR` | Erro interno do servidor |
