# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual                                   | Progresso | Status                                           |
| ---------- | -------------------------------------------- | --------- | ------------------------------------------------ |
| 2026-10-31 | Fase 7: lições do adacaibs (#252 a #260)     | 95%       | Feita na branch, falta PR e CI |

## Já feito

- Pedidos do Geison (29/10): menu da conta, sorteio idempotente, excluir chave, classificação em abas, turmas em cartões, conselheiro com uma turma, Sobre/regulamento/Instagram editáveis, fotos com aprovação, relatórios com CSV.
- Régua inteira: workspace com `shared/`, backend em domínio/repositório/presenter com i18n, frontend com Zod do `shared/`, textos em pt-BR/es/en, E2E Playwright, `docs/` preenchidos.

## Parou em

Fase 7 feita na branch `frente-regua-adacaibs` (sem push): migration no *Post-deployment* (#252), shards do e2e do backend e Vitest em dois projetos (#253), `maiyu-guard` (#254), arquivos de apoio nas casas novas (#256), z-index com o dropdown acima do modal (#257), checks com `file`/`section` e `reason` (#258), gerador de OpenAPI lendo o `*-refusal.ts` (#259) e `.env` em inglês (#260). Portões locais: backend 465 unit + 692 e2e, depcruise limpo; frontend 414+ unit, build e ciclos; Playwright 14/14; sync sem divergência. Os workflows novos não rodaram (sem Actions).

## Próximos passos

1. Abrir o PR da fase 7 e conferir a matriz `e2e` (3 shards) do `main-check-backend.yml` no primeiro run; o nome dos checks mudou (`Backend - E2E 1/3`…), então ajustar a proteção da `main` se ela exige o nome antigo.
2. Tarefa 7.10: estreitar o left dos métodos de domínio por operação, para o `openapi.json` não listar código de outra operação.
3. Antes do deploy no Coolify: `CORS_ORIGINS`, `TRUSTED_PROXIES`, `SEED_ADMINISTRATOR_*`, `SITE_ENV=production` (runtime) e `VITE_STORAGE_URL` (build). No painel, migration no *Post-deployment command* e *Pre-deployment* vazio. Sem `SITE_ENV` o site sai `noindex`; sem `VITE_STORAGE_URL` o CSP bloqueia o upload. O bucket de produção precisa aceitar `PUT` com `Content-Type` e expor `ETag` no CORS.
4. Medir o `size-adjust` das fontes de reserva.
5. Ajuste visual das turmas quando chegarem os prints do Geison.

## Contexto importante

- Geison (professor, usuário do painel) vai mandar prints das turmas para ajuste visual fino.
- Cada conselheiro aconselha uma turma só (decisão do Jhollyfer com o Geison, 29/10).
- Quem criou os jogos e desde quando não está no código: a organização preenche em Painel › Site.
- Infraestrutura (banco, VPS) é do Jhollyfer.
- Um merge desta branch saiu com a mensagem padrão do git citando o nome do branch temporário; corrigir exige force push, que não foi autorizado.

## Lições

> Uma linha por correção do dono (`AGENTS.md`, "Modo de trabalho" item 3). Lida no início de toda
> sessão. Lição que vale para todo projeto sobe para a régua e sai daqui.

| Data       | Erro                                                                                                                                                                     | Regra que evita                                                                                                       | Vale para                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 2026-10-29 | Índice único de conselheiro entrou com só as specs da feature rodadas; duas specs de `advisor/classrooms` que davam duas turmas ao mesmo conselheiro só quebraram depois | Mudança de regra de dado (índice, unique, enum) roda a suíte inteira antes do commit, não só a spec da feature        | backend, migration e regra de domínio |
| 2026-10-29 | `DropdownMenuLabel` sem `DropdownMenuGroup` no menu da conta: abrir o menu lançava e virava a página de erro 500 (já tinha acontecido no `table-column-toggle`)          | Todo `DropdownMenuLabel` (`Menu.GroupLabel`) dentro de `DropdownMenuGroup`; reproduzir no navegador antes de teorizar | frontend, qualquer menu do Base UI    |
| 2026-10-31 | Upload verificado só contra o moto, que aceita qualquer assinatura: a parte assinada com `content-type` e o PUT sem `Content-Type` passaram local e quebraram no MinIO do CI | Teste de upload roda contra o MinIO da release do CI (`backend/infra/minio/`), nunca contra fake de S3 | backend e frontend, upload |

## Problemas conhecidos

| Problema | Onde | Contorno |
|---|---|---|
| O projeto ainda escreve comentário, título de teste e mensagem de commit de código em português; `typescript.md` §12 manda inglês | todo o código | desvio antigo, fora da fase 7; migrar por área em fase própria |
| Dockerfiles, job E2E do frontend e workflows novos escritos sem acesso a Docker daemon nem a GitHub Actions | `.github/workflows/`, `*/Dockerfile-production` | validar no primeiro PR e na tarefa 5.8 |

## Links úteis

- Repositório: https://github.com/jhollyfer/interclasse · Produção: https://interclass.maiyu.com.br · Design: `docs/DESIGN.md`
