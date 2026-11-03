# Memória do projeto

**Interclasse** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual                                   | Progresso | Status                                           |
| ---------- | -------------------------------------------- | --------- | ------------------------------------------------ |
| 2026-11-03 | Fase 11: teste do site no ar e polimento    | 90%       | 9 de 10 feitas; 11.6 depende do Coolify |

## Já feito

- Pedidos do Geison (29/10): menu da conta, sorteio idempotente, excluir chave, classificação em abas, turmas em cartões, conselheiro com uma turma, Sobre/regulamento/Instagram editáveis, fotos com aprovação, relatórios com CSV.
- Régua inteira: workspace com `shared/`, backend em domínio/repositório/presenter com i18n, frontend com Zod do `shared/`, textos em pt-BR/es/en, E2E Playwright, `docs/` preenchidos.

## Parou em

Atualização de 03/11: kit `components/ui` completo (sem `chart`), tema claro/escuro/sistema em site, login e painel, responsivo revisado em 768 e 1440 (o dono quer responsivo em todos os tamanhos, não "cara de app"). CI da `main` verde até `26820db` com deploy; `validators:check` e `format:check` entraram no backend. Fase 11 (`TASKS.md`): 404 real no curinga público (`beforeLoad` com `notFound()`), "Sobre" fora do menu, do rodapé e do sitemap enquanto vazio (`lib/site-about.ts`), login com senha obrigatória no `shared`, `--muted-foreground` claro a 0,44, títulos em ordem (`headingLevel`), `<aside>` na barra lateral do painel e idioma visível no menu do celular. Verificado em navegador (Chromium, 1280 e 390) por papel: todas as rotas do administrador, do conselheiro e do representante carregam sem erro de rede nem de console, e o axe fecha limpo no site e no painel. O botão de 44x16 sem nome do achado (e) é o do TanStack Devtools, que só existe no `pnpm dev`. Prints em `.screenshots/` (fora do git). O E2E de `photos` precisa de MinIO e não roda sem Docker. A Fase 10 segue com PR aberto.

## Próximos passos

0. Definir `SITE_ENV=production` nas variáveis do site no Coolify: sem ela o `robots.txt` responde `Disallow: /` e o site sai dos buscadores (o código e o `ENV.md` já dizem isso; 11.6). Com a API de pé o `sitemap.xml` lista as páginas e as chaves.
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
