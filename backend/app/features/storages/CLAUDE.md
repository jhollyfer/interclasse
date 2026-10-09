# `storages/`

Rota base: `/storages`. 7 operacoes.

O agrupamento e por papel: rota nova aqui dentro nasce com a protecao deste
grupo. A regra de quem alcanca o que esta em `start/routes.ts`, e a tabela
abaixo mostra o resultado dela, lido do `openapi.json`.

## Operacoes do proprio modulo

| Operacao | Endpoint | Auth | Permission |
|---|---|---|---|
| Listar arquivos | `GET /storages` | Sim | — |
| Abrir upload de arquivo | `POST /storages` | Sim | — |
| Apagar arquivo do armazenamento | `DELETE /storages/{id}` | Sim | — |
| Ver um arquivo | `GET /storages/{id}` | Sim | — |
| Confirmar upload de arquivo | `POST /storages/{id}/complete` | Sim | — |
| Baixar arquivo com o nome original | `GET /storages/{id}/download` | Sim | — |
| Retomar upload de arquivo | `GET /storages/{id}/parts` | Sim | — |

## Erros Possiveis

| Code | Cause | Quando |
|------|-------|--------|
| 401 | `UNAUTHORIZED` | Não autorizado |
| 404 | `STORAGE_NOT_FOUND` | Arquivo não encontrado |
| 409 | `STORAGE_IN_USE` | Arquivo em uso |
| 422 | `STORAGE_SIZE_MISMATCH` | — |
| 422 | `VALIDATION_ERROR` | Dados inválidos |
| 500 | `STORAGE_COMPLETE_ERROR` | Erro interno do servidor |
| 500 | `STORAGE_CREATE_ERROR` | Erro interno do servidor |
| 500 | `STORAGE_DELETE_ERROR` | Erro interno do servidor |
| 500 | `STORAGE_DOWNLOAD_ERROR` | Erro interno do servidor |
| 500 | `STORAGE_LIST_ERROR` | Erro interno do servidor |
| 500 | `STORAGE_PARTS_ERROR` | Erro interno do servidor |
| 500 | `STORAGE_SHOW_ERROR` | Erro interno do servidor |

## Testes

- `tests/functional/storages.spec.ts`
