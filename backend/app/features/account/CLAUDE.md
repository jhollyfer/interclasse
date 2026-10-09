# `account/`

Rota base: `/account`. 2 operacoes.

O agrupamento e por papel: rota nova aqui dentro nasce com a protecao deste
grupo. A regra de quem alcanca o que esta em `start/routes.ts`, e a tabela
abaixo mostra o resultado dela, lido do `openapi.json`.

## Operacoes do proprio modulo

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Ler a própria conta | `GET /account` | Sim | — |
| Atualizar a própria conta | `PUT /account` | Sim | — |

## Erros Possiveis

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 404 | `USER_NOT_FOUND` | Usuário não encontrado |
| 409 | `USER_ALREADY_EXISTS` | Usuário já existe |
| 422 | `CURRENT_PASSWORD_INVALID` | — |
| 422 | `PASSWORD_SAME_AS_CURRENT` | — |
| 422 | `STORAGE_NOT_FOUND` | — |
| 422 | `VALIDATION_ERROR` | — |
| 500 | `ACCOUNT_SHOW_ERROR` | Erro interno do servidor |
| 500 | `ACCOUNT_UPDATE_ERROR` | Erro interno do servidor |

## Testes

- `tests/functional/account.spec.ts`
