# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual                                   | Progresso | Status                                           |
| ---------- | -------------------------------------------- | --------- | ------------------------------------------------ |
| 2026-10-30 | Régua aplicada e pedidos do Geison entregues | 90%       | Concluída, CI verde na `main` |

## Já feito

- Pedidos do Geison (29/10): menu da conta, sorteio idempotente, excluir chave, classificação em abas, turmas em cartões, conselheiro com uma turma, Sobre/regulamento/Instagram editáveis, fotos com aprovação, relatórios com CSV.
- Régua inteira: workspace com `shared/`, backend em domínio/repositório/presenter com i18n, frontend com Zod do `shared/`, textos em pt-BR/es/en, E2E Playwright, `docs/` preenchidos.

## Parou em

Tudo fechado: régua aplicada por inteiro (fase 5, #16), CI rodando de verdade e verde na `main` (fase 6, #17 a #22) e régua sincronizada com o maiyu-pattern#5. Backend 462 unit + 692 e2e e Playwright 14/14 contra o MinIO da release do CI.

## Próximos passos

1. Antes do deploy no Coolify: `CORS_ORIGINS`, `TRUSTED_PROXIES`, `SEED_ADMINISTRATOR_*`, `SITE_ENV=production` (runtime) e `VITE_STORAGE_URL` (build). Sem `SITE_ENV` o site sai `noindex`; sem `VITE_STORAGE_URL` o CSP bloqueia o upload. O bucket de produção precisa aceitar `PUT` com `Content-Type` e expor `ETag` no CORS.
2. Medir o `size-adjust` das fontes de reserva.
3. Ajuste visual das turmas quando chegarem os prints do Geison.

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
| `pnpm depcruise` acusa 18 violações de camada e ciclo (policies, guard e session service importando model; controllers de sessão importando o `CookieService`; ciclos entre models) | `backend/app` | corrigir na tarefa 5.4; o passo do CI falha até lá |
| Dockerfiles, job E2E do frontend e workflows novos escritos sem acesso a Docker daemon nem a GitHub Actions | `.github/workflows/`, `*/Dockerfile-production` | validar no primeiro PR e na tarefa 5.8 |

## Links úteis

- Repositório: https://github.com/jhollyfer/interclasse · Produção: https://interclass.maiyu.com.br · Design: `docs/DESIGN.md`
