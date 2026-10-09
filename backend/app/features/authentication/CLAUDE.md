# `authentication/`

Rota base: `/authentication`. 3 operacoes.

O agrupamento e por papel: rota nova aqui dentro nasce com a protecao deste
grupo. A regra de quem alcanca o que esta em `start/routes.ts`, e a tabela
abaixo mostra o resultado dela, lido do `openapi.json`.

## Operacoes do proprio modulo

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Renovar sessão | `POST /authentication/refresh` | Nao | — |
| Abrir sessão | `POST /authentication/sign-in` | Nao | — |
| Encerrar sessão | `POST /authentication/sign-out` | Sim | — |

## Erros Possiveis

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `INVALID_CREDENTIALS` | Credenciais inválidas |
| 401 | `REFRESH_TOKEN_INVALID` | — |
| 401 | `REFRESH_TOKEN_MISSING` | — |
| 401 | `UNAUTHORIZED` | Não autorizado |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `REFRESH_TOKEN_ERROR` | Erro interno do servidor |
| 500 | `SIGN_IN_ERROR` | Erro interno do servidor |
| 500 | `SIGN_OUT_ERROR` | Erro interno do servidor |

## Testes

- `tests/functional/authentication.spec.ts`
