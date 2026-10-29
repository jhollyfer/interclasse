# Interclasse

Os Jogos Estudantis do CMEI Cosme Jean: turmas, inscrições de atletas, sorteio
automático das chaves, tabela de jogos, placar, classificação e avisos.

O backend foi copiado do adacaibs e o domínio trocado.

- `backend/` - AdonisJS 7 + Lucid/Postgres. Ver `backend/CLAUDE.md`.
- `frontend/` - TanStack Start + Router + Query, shadcn sobre Base UI. Ver `frontend/CLAUDE.md`.

## A régua: padrão Maiyu

`_standards/`, `_doc-lib/`, `SKILLS-MAP.md` e as skills `maiyu-*`/`code-pattern` em
`.claude/skills/` são **cópia** do upstream `jhollyfer/maiyu-pattern`. Não se editam
aqui: a mudança é feita lá e trazida com
`node ../maiyu-pattern/scripts/sync-to-project.mjs .`; `pnpm sync:check` (backend)
reprova a cópia divergente.

Autoridade: `_doc-lib/` (doc oficial) > tipo instalado > `_standards/` > código.
Antes de implementar ou decidir:

1. Padrão da camada em `_standards/`: `arquitetura.md`, `typescript.md` e `solid.md`
   sempre; `backend.md`, `frontend.md`, `tooling.md`, `openapi.md` conforme a tarefa.
2. Doc da biblioteca pelo índice `_doc-lib.md` → `_doc-lib/<lib>.md` → a entrada exata
   (nunca o arquivo inteiro: `grep -n '^#### '` e leia só o trecho).
3. Tipo instalado (`node_modules/<pkg>/**/*.d.ts`) quando a doc não cobre.
4. Só então o código existente. Código que contradiz 1–3 está errado.

O que ainda falta migrar está em `_standards/MIGRATIONS.md`, seção do interclasse.

## Papéis

| Papel | Área | Faz |
|---|---|---|
| `ADMINISTRATOR` | `/administrator` | turmas, modalidades, contas, sorteio, agenda, placar, cartões, avisos; recebe o aviso de atleta tirado de modalidade |
| `ADVISOR` | `/advisor` | alunos e inscrições das turmas que aconselha, inclusive depois do sorteio (tirar atleta exige motivo) |
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
