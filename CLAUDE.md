# Interclasse

Os Jogos Estudantis do CMEI Cosme Jean: turmas, inscrições de atletas, sorteio
automático das chaves, tabela de jogos, placar, classificação e avisos.

Mesmo stack e mesma régua de `../adacaibs` e `../simple-hub` - o backend foi
copiado do adacaibs e o domínio trocado. **A régua do backend é
`PADRAO-BACKEND.md`**, byte-idêntica nos irmãos; `_doc-lib/` manda acima dela.

- `backend/` - AdonisJS 7 + Lucid/Postgres. Ver `backend/CLAUDE.md`.
- `frontend/` - TanStack Start + Router + Query, shadcn sobre Base UI.

## Papéis

| Papel | Área | Faz |
|---|---|---|
| `ADMINISTRATOR` | `/administrator` | turmas, modalidades, contas, sorteio, agenda, placar, avisos |
| `ADVISOR` | `/advisor` | alunos e inscrições das turmas que aconselha |
| `REPRESENTATIVE` | `/representative` | lista de atletas da própria turma |

O site público (`/storefront` na API, `_public` no front) não exige conta.

## Rodar

```
cd backend && docker compose up -d     # Postgres 5434, MinIO 9004/9005
cd backend && node ace migration:run && node ace db:seed
pnpm dev:backend                        # API em http://localhost:3333
pnpm dev:frontend                       # site em http://localhost:3001
```

Portas deslocadas de propósito: os irmãos ocupam 3000, 5432 e 5433 nesta máquina.
O MinIO vem do fork `pgsty/*` - as imagens `minio/*` saíram do Docker Hub.

## Fora do escopo por enquanto

- Galeria de fotos e página "Sobre"/edições do site anterior.

## Deploy

`main.yml` no push para `main`: checa o backend, builda o frontend, publica
`interclasse-api` e `interclasse-app` no Docker Hub e dispara o Coolify
(`coolify.maiyu.com.br`). Site em `https://interclass.maiyu.com.br`, API em
`https://api-interclass.maiyu.com.br`. Secrets do repositório:
`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` e `COOLIFY_TOKEN`; os uuids das
aplicações ficam em `main-deploy-coolify.yml`.
Na API: `CORS_ORIGIN=https://interclass.maiyu.com.br` e
`COOKIE_DOMAIN=.maiyu.com.br`.
