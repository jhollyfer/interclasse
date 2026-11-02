# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual                                   | Progresso | Status                                           |
| ---------- | -------------------------------------------- | --------- | ------------------------------------------------ |
| 2026-11-02 | Fase 10: chaves de ambiente no catálogo      | 100%      | Feita na branch, falta CI e merge |

## Já feito

- Pedidos do Geison (29/10): menu da conta, sorteio idempotente, excluir chave, classificação em abas, turmas em cartões, conselheiro com uma turma, Sobre/regulamento/Instagram editáveis, fotos com aprovação, relatórios com CSV.
- Régua inteira: workspace com `shared/`, backend em domínio/repositório/presenter com i18n, frontend com Zod do `shared/`, textos em pt-BR/es/en, E2E Playwright, `docs/` preenchidos.

## Parou em

Fase 10 (chaves de ambiente no catálogo da régua, `DECISIONS.md` #276) feita na branch `chore/env-catalogo-padrao`, com PR aberto e sem merge. `SEED_OWNER_*` no lugar de `SEED_ADMINISTRATOR_*`; os seeds do administrador e da demonstração ligam pela presença da senha, em qualquer ambiente; contas de demonstração `advisor@example.com`, `advisor-2@example.com`, `representative@example.com`. O E2E lê só `E2E_BASE_URL`, `E2E_API_URL`, `E2E_OWNER_*` e `E2E_DEMO_PASSWORD`. O CSP sai de `src/server.ts`, com `STORAGE_PUBLIC_URL` lida por requisição (substitui `VITE_STORAGE_URL`). O deploy lê os secrets `COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_API_UUID` e `COOLIFY_APP_UUID`. O E2E (Playwright) não rodou nesta sessão por falta de Docker; o job do CI é a prova.

## Próximos passos

1. No GitHub, criar os secrets `COOLIFY_URL` (base do painel, sem caminho), `COOLIFY_API_UUID` e `COOLIFY_APP_UUID` (o `COOLIFY_TOKEN` já existe) **antes** do merge: o deploy reprova com o nome do secret vazio.
2. No Coolify: trocar `SEED_ADMINISTRATOR_*` por `SEED_OWNER_*` na API e `VITE_STORAGE_URL` por `STORAGE_PUBLIC_URL` (runtime, no site). Sem `STORAGE_PUBLIC_URL` o CSP bloqueia o upload.
3. Deploy: a API responde 503 no Coolify desde o #25. Abrir os logs do container da API no último deploy e conferir as variáveis (`CORS_ORIGINS`, `TRUSTED_PROXIES`, `DATABASE_URL`, `STORAGE_*`, `APP_KEY`), o *Post-deployment* (`node ace migration:run --force`) e o healthcheck.
4. Tarefa 7.10: estreitar o left dos métodos de domínio por operação, para o `openapi.json` não listar código de outra operação.
5. Tela que use `VITE_UPLOAD_MAX_SIZE` (recusa por tamanho no cliente, com texto nos três idiomas); hoje a chave só é lida e validada.
6. Medir o `size-adjust` das fontes de reserva e ajuste visual das turmas quando chegarem os prints do Geison.

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
| Smoke test do deploy: a API responde 503 por 5 minutos no Coolify desde o #25 (o #24 subiu) | `main-deploy-coolify.yml`, Coolify | entre o #24 e o #25 o boot só mudou em comentário e texto (env, config, migrations e Dockerfile iguais), e a mesma imagem de produção sobe no E2E do CI; a causa está no ambiente do Coolify e só os logs do container confirmam |

## Links úteis

- Repositório: https://github.com/jhollyfer/interclasse · Produção: https://interclass.maiyu.com.br · Design: `docs/DESIGN.md`
