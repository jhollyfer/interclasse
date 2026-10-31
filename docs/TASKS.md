# Tarefas do projeto

**Interclasse** · divididas em fases

> Roteiro do projeto. Detalhe de uma feature feita com `tlc-spec-driven` mora em
> `.specs/features/<feature>/tasks.md`; aqui a linha aponta para lá.
> Atualiza no mesmo commit em que a tarefa começa ou termina.

**Resumo:** fases 1 a 6 feitas, CI verde na `main` e régua sincronizada — atualizado 2026-10-31

Status: `A fazer` · `Em andamento` · `Feita` · `Bloqueada` (com motivo nas notas).
Prioridade: `Alta` · `Média` · `Baixa`.

## Fase 1 · Régua (11/12)

Trazer o projeto para o padrão Maiyu inteiro.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 1.1 | Sync do `maiyu-pattern` (`_standards/`, `docs/`, `AGENTS.md`) | Alta | Feita | `_padroes/` removido |
| 1.2 | Workspace pnpm na raiz + `shared/` (Either, `z`, enums, envelope) | Alta | Feita | lockfile único, imagem da API pela raiz |
| 1.3 | Fundação backend: specs unit/e2e, `app/validators/`, i18n por requisição, UnitOfWork | Alta | Feita | |
| 1.4 | Módulo de referência `sports` (entidade, repositório, presenter, Zod no `shared/`) | Alta | Feita | |
| 1.5 | Demais módulos do backend na forma da referência | Alta | Feita | 911 testes |
| 1.6 | Frontend: Paraglide pt-BR/es/en e troca de idioma | Alta | Feita | |
| 1.7 | Frontend: queries/mutations por módulo, `-search.ts`, guard por área | Alta | Feita | |
| 1.8 | Frontend: tipos e validators do `shared/` (Zod + zodResolver) | Alta | Feita | VineJS saiu do frontend |
| 1.9 | Frontend: todos os textos nos três idiomas | Alta | Feita | 600 chaves por idioma |
| 1.11 | Suíte E2E (Playwright) dos fluxos críticos | Alta | Feita | 14 testes, `pnpm test:e2e` |
| 1.12 | E2E no CI (API e banco em container no job) | Média | Feita | job Playwright em `main-check-frontend.yml` (5.1); roda de verdade no primeiro PR |
| 1.10 | Docs do projeto preenchidos a partir do código | Média | Feita | |

## Fase 2 · Pedidos do Geison, 29/10 (9/9)

| #   | Tarefa                                                                                                    | Prioridade | Status | Notas                                           |
| --- | --------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------- |
| 2.1 | Menu da conta derrubava a tela ("Algo quebrou", 500)                                                      | Alta       | Feita  | `DropdownMenuLabel` fora de `DropdownMenuGroup` |
| 2.2 | Sorteio da chave mostra erro mas cria a chave                                                             | Alta       | Feita  | sorteio idempotente + retry no cliente          |
| 2.3 | Excluir chave pela lista                                                                                  | Média      | Feita  | menu da linha                                   |
| 2.4 | Classificação na home com abas por categoria e modalidade, sem sair da página                             | Alta       | Feita  | `StandingsExplorer`                             |
| 2.5 | Turmas do admin em cartões (F1/F2), detalhe com conselheiro e representante; conselheiro com uma turma só | Alta       | Feita  | `components/common/classroom-detail`            |
| 2.6 | Página "Sobre o JIC" e Instagram no rodapé                                                                | Média      | Feita  | conteúdo editável em Painel › Site              |
| 2.7 | Regulamento em PDF enviado pelo admin, para baixar no site                                                | Média      | Feita  |                                                 |
| 2.8 | Carrossel de fotos: conselheiro envia, admin aprova                                                       | Média      | Feita  |                                                 |
| 2.9 | Relatórios (turmas, alunos, atletas) com CSV                                                              | Média      | Feita  |                                                 |

## Fase 3 · Achados da auditoria (0/2)

| #   | Tarefa                                                                         | Prioridade | Status  | Notas                       |
| --- | ------------------------------------------------------------------------------ | ---------- | ------- | --------------------------- |
| 3.1 | Itens de `maiyu-pattern/_findings/interclasse.md` (B1–B4, I1–I5, T1–T4, C1–C6) | Média      | A fazer |                             |
| 3.2 | Segurança SEC-1..SEC-9 do mesmo arquivo                                        | Alta       | A fazer | SEC-1 `trustProxy` primeiro |

## Fase 4 · Pendências conhecidas

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 4.1 | Índice único que garanta uma linha só em `site_settings` | Baixa | Feito | migration `add_site_settings_singleton_index` (índice sobre `(true)`); `current()` insere com `on conflict do nothing` e lê a vencedora |
| 4.2 | Tipo do `scheduledAt` do VineJS (`DateTime \| null`, chega `undefined`) | Baixa | Feito | o retorno do `transform` diz os três estados; spec em `matches.validator.unit.spec.ts` |
| 4.3 | Tema por cookie no servidor e tamanhos de fonte em token | Baixa | Concluída | tema por cookie no `loader` da raiz, `--text-*` por papel e fonte com `size-adjust` (`DESIGN.md` §3, §5) |
| 4.4 | Fixar a imagem `node:24-alpine` por digest nos Dockerfiles | Média | Feita | digest pela API do registry (5.1) |

## Fase 5 · Régua estrita, auditoria de 30/10 (0/8)

Auditoria completa contra `_standards/` (backend+shared, frontend, raiz/CI/docs): ~95 desvios, incluindo
tudo o que os `CLAUDE.md` dos apps chamavam de exceção. Cada frente fecha os itens dela e os achados
(`_findings/interclasse.md`, SEC-1..9) que caem no seu escopo.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 5.1 | Raiz, tooling e CI: TS `~6` nos três, tsconfig piso, eslint/prettier no `shared`, scripts `check`/`test:unit`/`test:e2e`, hooks e commitlint, workflows (`pnpm/setup`, SHA, permissions, E2E, audit), Docker (digest, `.dockerignore` único, MinIO compilado), dependabot, `.gitignore` único, libs na última versão | Alta | Feita, com ressalvas | I1, I4, 1.12, 4.4. Feito: `.claude/settings.json`, hooks, commitlint 72, TS `~6` e piso de tsconfig nos três, eslint/prettier no `shared`, scripts `check`/`test:unit`/`test:e2e`, workflows (SHA, `pnpm/setup`, permissions, concurrency, audit, gitleaks, E2E Playwright, autor/trailer), digest `node:24-alpine@sha256:8a32c8cf…`, `.dockerignore` e `.gitignore` únicos, MinIO compilado + `app-rw`, Postgres 18, dependabot, axe nos E2E da home e das turmas, libs atuais. Ressalvas: (a) imagens Docker e workflows não executados (sem dockerd nem Actions); job E2E do frontend assume `ace` compilado em `database/seeders/dev/demo.js` e contas `raimunda.tananta`/`joelson.cruz` como conselheiras do E2E, a confirmar na 5.8; (b) `pnpm depcruise` novo acusa 18 violações reais (policies/guard/session service → model, controllers de sessão → `CookieService`, ciclos entre models), a corrigir na 5.4; (c) `pnpm/setup` fica em v2.0.0 (SHA da régua), há v3.1.2; (d) `@inlang/cli` em 3.4.4 até a 3.4.5 passar de um dia; (e) `shared` sem `test:e2e` (não tem E2E); (f) `frontend/.env.production` segue versionado (`VITE_API_URL` público), a revisar; (g) changelog do `@hookform/resolvers` 6 inacessível, conferido por diff do npm: `zodResolver` inalterado; (h) `backend` ainda tem `compositionRoot` no eslint e `sync:check` fora do `check`, a cargo da 5.3/5.4 |
| 5.2 | Docs: par `AGENTS.md`+`CLAUDE.md` por app sem "foge da régua", textos que legitimam desvio, `MEMORY.md` sem placeholder, `.claude/settings.json` | Alta | Feita | documentation.md §3. `backend/` e `frontend/` com `AGENTS.md` (ponteiros e comandos) + `CLAUDE.md` só `@AGENTS.md`; textos que legitimavam desvio saíram de `AGENTS.md`, `ARCHITECTURE.md`, `RULES.md` e `DESIGN.md` (a correção do tema por cookie e dos tokens de texto fica na 5.7); `MEMORY.md` sem placeholder; `.claude/settings.json` na 5.1 |
| 5.3 | Backend borda e segurança: `trustProxy`, bodyparser, origem/CSRF, cookie em `config/`, handler (429, 500, fábricas), throttles, CSV, multipart assinado, sessão do Adonis fora, mensagens por chave | Alta | Feito (e2e pendente) | SEC-1..8, B1, B2, C1, C2, C4, C5, I5 |
| 5.4 | Backend arquitetura: `ctx.actor` + Bouncer/policies com entidade, session repository, storage sem hook, `core/openapi` sem Lucid, resposta pelo schema, recusas em tabela, unicidade no repository, nomes de log/erro, árvore, `pattern:check` completo, `site_settings` único, `scheduledAt` | Alta | Feito (falta rodar E2E com banco) | T1, 4.1, 4.2; `ActorSchema`, `SessionRepository`, `RefusalBase`, `PostgresError`, gerador OpenAPI em `scripts/openapi/` |
| 5.5 | Backend testes: unit/e2e faltando, matriz de status, redes obrigatórias, specs no alvo | Média | Feita | T2, T3. Depcruise só com a violação do guard (proposta ao upstream abaixo): a URL de leitura é assinada no use-case (`StorageContract.withUrl`), a isenção de spec saiu, a spec lê o banco por `tests/stored-fixtures.ts` e pega o repositório em memória de `tests/memory-fixtures.ts`. Matriz de status completa nas ações de `storages/files/*` e nas de painel e conselheiro que faltavam 422/401/403 |
| 5.6 | Frontend estrutura: `_authentication/`, `request` por schema, `local-store`, `lib/` na árvore, kit comum completo, molde de recurso, sufixo `Mutation`, assets e sitemap/robots | Alta | Feita | login em `/sign-in`; `request(path, schema)`; kit comum completo; `robots`/`sitemap` por rota de servidor |
| 5.7 | Frontend código e UI: ESLint completo (incl. `ui/`), dialogs uncontrolled, Luxon, sem memo manual, pending/notFound, SEO, tokens (z-index, texto, tema por cookie), cabeçalhos do Nitro, busca infinita, testes | Alta | Parcial | B4, C3, T4, SEC-9, 4.3 feitos; teste de toda peça de `components/common`, `BreadcrumbList` e `SportsEvent` na chave pública, grades arbitrárias como `@utility` e o pedido de motivo da remoção por handle feitos; falta o `size-adjust` das fontes de reserva medido e o E2E (5.8) |
| 5.8 | Verificação final: todos os portões, suíte e2e do backend e E2E Playwright | Alta | Feita | E2E 14/14 duas vezes seguidas (2,3 min); backend 462 unit + 691/692 e2e (falha só do moto, que não expira URL); frontend 413 unit, build, ciclos; shared 21; depcruise só com o guard (proposta ao upstream) |

### Propostas ao upstream (`maiyu-pattern`)

Nada vira exceção local: a régua muda e volta pelo sync.

| Item | Situação |
|---|---|
| Guard importa o model da conta (`GuardContract<User>` do `@adonisjs/auth`) | Na régua (decisão #247, maiyu-pattern#4); aqui, regra `guard-so-model-da-conta` no `scripts/depcruise.config.ts`. `pnpm depcruise` sem violação |
| Spec de comando Ace em `commands/_<nome>.command.e2e.spec.ts` | Na régua (decisão #248, maiyu-pattern#4) |
| Modelos de `docs/` sem "desvio aceito" | Na régua (maiyu-pattern#4) |
| `pnpm/setup` v3 | Na régua (decisão #249, maiyu-pattern#4) |
| Passo de autor do CI até o head do PR | Na régua (decisão #250, maiyu-pattern#5); aqui desde o #18 |
| Parte do multipart assina só o tamanho; arquivo inteiro sobe com `Content-Type` | Na régua (decisão #251, maiyu-pattern#5); aqui no #20 |
| Japa sem worker e sem `merge-reports`: `tooling.md` §10.6 pede banco clonado por worker (template do Postgres) e relatório juntado de shards, e o Japa roda em série num processo e não junta relatório (`_doc-lib/japa.md#docs/test-suites`, `#docs/filtering-tests`, https://japa.dev/docs/filtering-tests) | Proposta ao upstream (#253): dizer na régua que, no Japa, o paralelismo é o shard com banco por job e não há relatório juntado. Aqui, sem exceção local: shards com banco por job |
| `tooling.md` §10.6 manda shard sempre e `playwright.md#docs/test-sharding` só quando o job passa do tempo aceitável | Proposta ao upstream (#253): alinhar as duas frases. Aqui, o Playwright fica num job |

Resolvidos aqui: arquivar e restaurar respondem 409 de estado (`USER_ALREADY_ARCHIVED`, `USER_NOT_ARCHIVED`); `account/profile/show` não tem 404 alcançável pela rota (o guard responde 401 antes), coberto no unitário.

## Fase 6 · CI de verdade (7/7)

Primeira execução real dos workflows da fase 5, PR a PR.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 6.1 | `pnpm/setup` v3 lê o pnpm travado no lockfile | Alta | Feita | #17 |
| 6.2 | Passo de autor até o head do PR, Prettier no header, guard no depcruise | Alta | Feita | #18 |
| 6.3 | Setup do MinIO de teste pelo `sh` | Alta | Feita | #19 |
| 6.4 | Upload aceito pelo S3 de verdade (parte sem tipo, arquivo inteiro com `Content-Type`) | Alta | Feita | #20; e2e 692/692 e Playwright 14/14 contra MinIO da release do CI |
| 6.5 | Régua sincronizada com o maiyu-pattern#4 | Média | Feita | sync sem divergência |
| 6.6 | Régua com autor no CI e assinatura da parte | Média | Feita | maiyu-pattern#5 sincronizado |
| 6.7 | API do E2E em produção e seeds de demonstração pelo workspace | Alta | Feita | #22; primeiro run inteiro verde |

## Fase 7 · Régua: lições do adacaibs (0/9)

Aplica ao projeto as decisões #252 a #260 da régua (maiyu-pattern, sync de 31/10), sem exceção local.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 7.1 | `maiyu-guard` habilitado e `AGENTS.md` da raiz no modelo novo | Alta | Feita | #254 |
| 7.2 | Migration no *Post-deployment command* do Coolify | Alta | Feita | #252; `docs/ENV.md`, `docs/ARCHITECTURE.md` §9.1, Dockerfile, workflows |
| 7.3 | Casa dos arquivos de apoio (`.editorconfig`, `.gitleaks.toml`, `.prettierignore`, depcruise, `infra/`, `core/`) | Alta | Feita | #256; `architecture.md` §3.4 |
| 7.4 | Campos dos checks em inglês e `reason` nas exceções | Média | Feita | #258 |
| 7.5 | OpenAPI lê o `*-refusal.ts`; `errors:` só para o que nasce em outra camada | Média | Feita | #259; o gerador usa o tipo do fato (`Refusal.http(fato)`), então o que o tipo de domínio declara largo aparece largo no `openapi.json` (ex.: `ensureDeletable(): Either<BracketError, …>`). Estreitar o left por operação fica como 7.10 |
| 7.6 | `.env.example` e `.env.test` em inglês | Baixa | Feita | #260 |
| 7.7 | Frontend: `new.tsx` com `head` em toda tela e escala de z-index | Alta | Feita | #257; z-index na escala nova. `new.tsx` só existe em tela com `head` por rota (`frontend.md` §1.2): aqui o título das telas privadas vem do `head` do `_private/layout.tsx` pela trilha, então nenhuma `new.lazy.tsx` precisa do par |
| 7.8 | Suíte rápida: banco clonado por worker, shards no CI, merge de relatórios | Alta | Feita | #253. Backend: o Japa roda em série num processo (migration e kernel uma vez, `_doc-lib/japa.md#docs/test-suites`), então o que a régua chama de worker é o shard: job `e2e` do `main-check-backend.yml` em matriz `--shard=i/3`, banco e MinIO por job (692 = 209+253+230 conferido); `disallowPinnedTests` no CI. Frontend: Vitest em dois projetos, `shared` com `isolate: false` e `isolated` para o que usa `vi.mock`, global ou DOM. Playwright segue num job (14 jornadas, ~2 min; a doc só manda shard quando passa do tempo aceitável) |
| 7.9 | Lições do adacaibs conferidas contra o código | Média | Em andamento | #255 |
| 7.10 | Estreitar o left dos métodos de domínio por operação (`Extract<BracketError, …>`) para o `openapi.json` não listar código de outra operação | Baixa | A fazer | efeito da 7.5 |

## Fase N · Ideias (fora do escopo atual)

- Ajuste visual fino das turmas com os prints do Geison — Geison, 29/10
