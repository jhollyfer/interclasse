# Migrações pendentes por projeto

## Todos os projetos — nomes em inglês (`DECISIONS.md` #120)

| Hoje | Vira | Como |
|---|---|---|
| `_padroes/` | `_standards/` | `node <maiyu-pattern>/scripts/sync-to-project.mjs .` cria a pasta nova; apagar `_padroes/` no mesmo commit |
| `.claude/skills/maiyu-padrao/` | `.claude/skills/maiyu-standards/` | idem; apagar a pasta antiga |
| referência a `_padroes/…`, `arquitetura.md`, `DECISOES.md`, `MIGRACOES.md` em `CLAUDE.md`, `AGENTS.md`, comentários e scripts (`sync:check`, `pattern:check`) | nome novo | busca e troca no mesmo commit |

## lowcodejs — rows tipadas (`architecture.md` §10)

| Hoje | Vira |
|---|---|
| valor de row como objeto solto, conferido com `typeof`/`instanceof` nas rotas de rows, no model-builder e no front | `FieldValue` (união discriminada por `FieldType`) e `Row`, em `shared/src/dynamic/` |
| schema da tabela dinâmica montado em lugares diferentes no back e no front | um `RowSchemaBuilder.build(fields)` em `shared/`, usado pelos dois lados |
| conversão para Mongo/Postgres espalhada | lookup por `FieldType` dentro do repository da row de cada driver |

## Todos os projetos — versões (`DECISIONS.md` #121)

| Projeto | Hoje | Vira |
|---|---|---|
| adacaibs (backend e frontend) | `typescript-native: npm:typescript@^7` para o typecheck | sai o alias; typecheck com `typescript@~6` |
| interclasse (backend e frontend) | `npm:@typescript/typescript6` | `typescript@~6` direto |
| lowcodejs backend | `typescript@^7` | `typescript@~6`, corrigindo o que o 7 permitiu |
| lowcodejs frontend, matiscraft | `typescript@^5.x` | `typescript@~6` |
| lowcodejs backend | `mongodb@^7.7` | última major do driver, ajustando a API |


## Todos os projetos: régua de 2026-10 (`_map/scan-2026-10/application/`)

Vale para o projeto que tiver o item; cada linha aponta a regra dona.

| Hoje | Vira | Regra |
|---|---|---|
| tipo `I<Nome>`, enum `E_<NOME>` (ex.: `E_AREA_CAPABILITY` no lowcodejs) | sem prefixo: `AreaCapability`, `AREA_CAPABILITY` | `typescript.md` §4 |
| enum em `lib/entity.ts` ou `core/entity.ts` | `shared/src/enums/<nome>.ts`; rótulo em `lib/labels.ts` | `typescript.md` §4 |
| `lib/utils.ts` com `cn()` | `lib/cn.ts`, só com `cn()` | `typescript.md` §6 |
| `src/validators/`, `lib/validator.ts` no frontend e script `validators:check` de paridade | validator único em `shared/`; o script sai | `architecture.md` §9 |
| tipo de resposta montado pelo model ou redigitado no frontend | schema `…Response` em `shared/src/responses/` e presenter no backend | `architecture.md` §10 |
| `ensureQueryData` no loader | `context.queryClient.query()` com a fábrica de `queryOptions` | `frontend.md` §1.3 |
| `data-test-id` | `data-testid`, só quando não há papel e nome acessível | `frontend.md` §11 |
| edição por `?mode=edit` | rota `$id/edit` | `frontend.md` §1.2 |
| `robots.txt` em `public/` | rota de servidor `robots[.]txt.ts` | `frontend.md` §9.7 |
| E2E `<ação>.spec.ts` | `<ação>.e2e.spec.ts` | `architecture.md` §3 |
| `<nome>-contract.service.ts` | `<nome>.contract.ts`; contrato só para I/O externo, o resto vira classe concreta | `solid.md` §2 |
| hook em `backend/.husky` | `.husky/` na raiz, um para o repositório | `tooling.md` §6 |
| `npx commitlint@N` no CI | `pnpm exec commitlint`, versão da devDependency da raiz | `tooling.md` §7 |
| espera do MinIO por `sleep` no CI | espera pelo estado (o bucket existe e responde) | `tooling.md` §7 |
| deploy sem `deployment_uuid` ou sem smoke test de revisão | deploy que espera o `deployment_uuid` e confere a revisão | `tooling.md` §8.3 |
| action por tag móvel (`@v4`) | action pinada por SHA com a versão em comentário | `tooling.md` §9 |
| `docs/adr/`, `<projeto>-threat-model.md`, `.specs/STATE.md` (`AD-xxx`), `LESSONS.md` | `docs/DECISIONS.md`, `docs/SECURITY.md` §2, `docs/MEMORY.md` | `documentation.md` §1 |


Gerado a partir de `_standards/_map/*.md` (seções Desvios do padrão) e de `architecture.md` (tabelas
"Migração estrutural"). Linhas
ordenadas por risco — segurança/comportamento primeiro, estilo depois.

Vale para todos: `.claude/settings.json` ganha `enabledPlugins` com `superpowers`,
`claude-code-setup` e `claude-security` (`@claude-plugins-official`, `AGENTS.md`); `.gitignore` ganha
`CLAUDE-SECURITY-*/` (`tooling.md` §9, §10.4).

Vale para todos: data só por Luxon e ícone só por Phosphor (`tooling.md` §0.1). `date-fns` sai dos
frontends de simple-hub, adacaibs, matiscraft, academy, lowcodejs e manganga e dos backends de
matiscraft e lowcodejs; `lucide-react` sai do matiscraft (e do `frontend-old` do manganga, que
deve ser removido); `zod` deixa de ser proibido (`DECISIONS.md` #241): fica no matiscraft (Fastify), onde já é o schema, e entra no frontend e no `shared/` de todos. O `frontend-old` do manganga sai pelo motivo acima, não pelo `zod`.

Vale para todos, schema (`DECISIONS.md` #241): Zod no frontend e em `shared/`, em qualquer projeto;
VineJS só no backend Adonis (simple-hub, adacaibs, interclasse, academy). No Fastify (lowcodejs,
matiscraft) o Zod vale também no backend. `@vinejs/vine` sai de frontend, `shared/` e Fastify, e o
ESLint ganha `no-restricted-imports` dele nesses três lugares; `yup` segue proibido. Cada schema
Zod é lido na doc em `_doc-lib/zod.md#basics` e `#api`.

Vale para todos: backend e frontend que ainda não expõem o próprio `GET /health-check`
independente criam o seu (`architecture.md` §7, obrigatório). Estado em 2026-10-14:

| Projeto | Backend | Frontend | O que fazer |
|---|---|---|---|
| simple-hub | `/health-check` | `/health-check` | Nada |
| adacaibs | `/health-check` | `/health-check` | Nada |
| interclasse | `/health-check` | `/health-check` | Nada |
| lowcodejs | `/health-check` | `/health-check` | Nada |
| academy | `/health-check` + `GET /health` (revisão da imagem) | `/health-check` + alias `src/routes/health.ts` | Revisão vai para `/revision.txt` (`tooling.md` §8); remover `/health` dos dois lados e trocar o probe do deploy e do `main-docker-backend.yml` |
| manganga | (API em `jhollyfer/manganga.api`, não auditada) | `src/routes/health.ts` | Renomear para `health-check.ts`; `Dockerfile-production` e deploy apontam para `/health-check` |
| matiscraft | **sem rota**; o compose de produção sonda `/health-check` e o container nunca fica saudável | sem rota; o compose sonda `/` | Criar as duas rotas; probe do frontend para `/health-check` |

---

## simple-hub

| Item | Onde | Regra | Correção |
|---|---|---|---|
| `userId: string` no Payload em vez de `actor` | 79 use-cases/controllers, ex. `features/producer/products/update.use-case.ts:1`, `features/company/**` (62x), `features/customer/orders/**` | backend.md §4.3 | Trocar `userId` por `actor: Actor` (tipo do `ActorSchema` de `shared/`); o middleware de autenticação deixa `ctx.actor` e o controller o repassa |
| `pre-commit` não roda nada | `.husky/pre-commit:20` (`#pnpm check && pnpm test`) | tooling.md §6 | Descomentar, ou documentar a exceção com o porquê |
| `new DemoSeeder(...)` fora do container em teste | `tests/functional/{lote,storefront,storefront-organizations,storefront-privacy,storefront-qrcode,company-identity,demo_seeder,origin,prova}.spec.ts` (50 ocorrências, 9 arquivos) | backend.md §2.1 | `app.container.make(DemoSeeder)`; ESLint não pega porque `Seeder` não está no seletor — ver tooling.md §4 atualizado |
| I/O externo sem contrato | `services/storage.service.ts`, `brasil-api.service.ts`, `opentimestamps.service.ts`, `rfc3161.service.ts` | solid.md §2 | `abstract class *Contract`; dívida aceitável até um teste precisar trocar fornecedor |
| Posse de empresa/produtor fora de policy nomeada | `features/_shared.organization.ts:38` (`companyOf`), 70+ use-cases | backend.md §4.6 | `CompanyPolicy`/`ProducerPolicy` no formato de `UserPolicy`, se virar padrão citado em revisão |
| `_shared` fazendo I/O (consulta ao banco) | `_shared.organization.ts`, `_shared.impact.ts` | backend.md §4.9 | Mover para service injetável (`SessionScopeService`); `_shared` é só função pura sobre dado já em mãos |
| `tsconfig.json` sem `noUncheckedIndexedAccess`/`noImplicitOverride` (frontend) | `frontend/tsconfig.json:14-29` | tooling.md §3 | Somar as duas flags — `noUncheckedIndexedAccess` importa aqui pelo uso de `Record<string,string>` em `HTTPError.errors` |
| `form-edit.tsx` não reflete produto carregado depois do primeiro render | `producer/products/-components/form-edit.tsx:50-55` | frontend.md §4 | `useState(product?.category ?? null)` → mover para `values:` do RHF, como o resto do mesmo form |
| Formulário de autenticação repete `onError` cru (sem retry/código) | `authentication/_sign-in/-components/sign-in-form.tsx:70,82`, `sign-up/customer-sign-up.tsx:69,79`, `producer-sign-up.tsx`, `multi-step-form.tsx` | frontend.md §4 | Extrair o mesmo helper de `use-resource-form.ts` (`applyHTTPErrorToForm`) |
| `Merge<A,B>` substituído por `&` (gerado) | `components/ui/native-select.tsx:6` | typescript.md §1 | Baixa prioridade — saída de `shadcn add`, isento por desenho |
| `pnpm@11.21.0` | `backend/package.json:7`, `frontend/package.json` | tooling.md §0 | Confirmar `12.x` publicado e migrar |

### Migração estrutural — simple-hub

| Atual | Alvo (`architecture.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,unit.spec,e2e.spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Backend continua VineJS (nativo do Adonis), um validator por recurso com o mesmo caminho e nome do schema Zod de `shared/src/validators/<módulo>/<recurso>.validator.ts`; regras compartilhadas, `PAGINATION` e mensagens nos três idiomas ficam em `app/core/validator.ts` (`architecture.md` §3, §9; `DECISIONS.md` #241) | Quebrar por recurso; spec de paridade VineJS × Zod confere os campos dos dois lados; a meta-spec varre os dois antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.e2e.spec.ts` (e `<ação>.unit.spec.ts`) ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.unit.spec.ts`, `app/middleware/<nome>.middleware.e2e.spec.ts`); `tests/` só fixtures | Quebrar cada spec de recurso por ação; suítes do Japa `unit` (`app/**/*.unit.spec.ts`) e `functional` (`app/**/*.e2e.spec.ts`), `architecture.md` §3.2 |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>.contract.ts` e `<nome>.fake.ts`, só se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_standards/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; `--check` à mão a partir do `maiyu-pattern`, nunca no CI | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`, com par de caminho e nome no validator VineJS do backend; `z.config` com as mensagens pt-BR/es/en, formulário por `zodResolver` (`architecture.md` §9; `DECISIONS.md` #241; `_doc-lib/zod.md#error-customization`) | Reescrever cada validator em Zod no `shared/`; apagar a cópia local e trocar `vineResolver` por `zodResolver` (`@hookform/resolvers/zod`); o spec de paridade substitui o script antigo |

### Versões — simple-hub

| Pacote | Atual | Última |
|---|---|---|
| `@adonisjs/core` | ^7.5.0 | 7.6.0 |
| `@adonisjs/lucid` | ^22.4.2 | 22.4.2 |
| `@adonisjs/drive` | ^4.0.0 | 4.0.0 |
| `@vinejs/vine` | ^4.4.0 | 4.4.0 |
| `zod` | (novo, frontend e `shared/`) | 4.6.7 |
| `react-hook-form` | ^7.82.0 | 7.89.0 |
| `@hookform/resolvers` | ^5.4.0 | 5.9.1 |
| `shadcn` | ^4.13.1 | 4.21.4 |
| `tailwindcss` | ^4.1.18 | 4.3.3 |
| `@tanstack/react-query` | ^5.101.4 | 5.104.1 |
| `@tanstack/react-router` | ^1.170.23 | 1.170.42 |
| `@tanstack/react-start` | ^1.168.40 | 1.168.61 |
| `@tanstack/react-table` | ^9.1.0 | 9.2.8 |
| `@tiptap/core` | 3.30.5 | 3.31.4 |
| `use-mask-input` | ^3.13.0 | 3.14.2 |
| `vite` | ^8.0.0 | 8.3.4 |
| `vitest` | ^4.1.5 | 5.0.3 |
| `@base-ui/react` | ^1.6.0 | 1.9.0 |

---

## adacaibs

| Item | Onde | Regra | Correção |
|---|---|---|---|
| `!` sem narrowing em código sem `Either` | `app/services/cookie.service.ts:162-163` (`accessToken.value!.release()`, `refreshToken.value!.release()`) | typescript.md §1 | `if (!accessToken.value) throw new Error(...)` antes do `.release()` |
| `!` sem narrowing em teste | `tests/helpers.ts:49-50` | backend.md §2 + typescript.md §1 | `if (!cookie) throw new Error('cookie ausente na resposta de sign-in')` |
| `whereNotNull('deletedAt')` escrito à mão (7 arquivos, `unarchive.use-case.ts`) | `app/features/administrator/{albums,events,notices,podcasts,testimonials,users,videos}/unarchive.use-case.ts` | backend.md §4.8 | Criar `static onlyDeleted = scope(...)` por model, usar `withScopes` |
| idem, em `paginate.use-case.ts` (7 arquivos) | mesmos módulos, `paginate.use-case.ts:25` | backend.md §4.8 | `applyTrashed(query, mode)` de `_shared.trashed` |
| `pattern-check.ts` só cobre `whereNull`, não `whereNotNull` | `scripts/pattern-check.ts:525` (módulo congelado, espelhado nos 4 repos) | backend.md §10 | Estender o regex nos quatro repositórios (régua §11) |
| `padrao.manifest.json::softDeleteExempt` com entradas de outro projeto | `padrao.manifest.json` | backend.md §4.8 | Reduzir à lista real deste repositório, ou nomear por projeto |
| `VITE_API_URL` lido direto por `import.meta.env`, sem `env.ts` | `frontend/src/integrations/tanstack-query/http.ts:143` (idem em maiyu.com.br) | frontend.md §3 | Extrair para `src/env.ts` (`architecture.md` §4) com checagem explícita |
| Fábrica de query key centralizada (não por módulo) | `frontend/src/hooks/tanstack-query/_query-keys.ts` (164 linhas, 13 recursos) | frontend.md §2.1 (divergência já registrada) | Documentar como 3º projeto que diverge, ou migrar |

### Migração estrutural — adacaibs

| Atual | Alvo (`architecture.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,unit.spec,e2e.spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Backend continua VineJS (nativo do Adonis), um validator por recurso com o mesmo caminho e nome do schema Zod de `shared/src/validators/<módulo>/<recurso>.validator.ts`; regras compartilhadas, `PAGINATION` e mensagens nos três idiomas ficam em `app/core/validator.ts` (`architecture.md` §3, §9; `DECISIONS.md` #241) | Quebrar por recurso; spec de paridade VineJS × Zod confere os campos dos dois lados; a meta-spec varre os dois antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.e2e.spec.ts` (e `<ação>.unit.spec.ts`) ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.unit.spec.ts`, `app/middleware/<nome>.middleware.e2e.spec.ts`); `tests/` só fixtures | Quebrar cada spec de recurso por ação; suítes do Japa `unit` (`app/**/*.unit.spec.ts`) e `functional` (`app/**/*.e2e.spec.ts`), `architecture.md` §3.2 |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>.contract.ts` e `<nome>.fake.ts`, só se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_standards/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; `--check` à mão a partir do `maiyu-pattern`, nunca no CI | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`, com par de caminho e nome no validator VineJS do backend; `z.config` com as mensagens pt-BR/es/en, formulário por `zodResolver` (`architecture.md` §9; `DECISIONS.md` #241; `_doc-lib/zod.md#error-customization`) | Reescrever cada validator em Zod no `shared/`; apagar a cópia local e trocar `vineResolver` por `zodResolver` (`@hookform/resolvers/zod`); o spec de paridade substitui o script antigo |

### Versões — adacaibs

| Pacote | Atual | Última |
|---|---|---|
| `@adonisjs/core` | ^7.5.0 | 7.6.0 |
| `@adonisjs/lucid` | ^22.4.2 | 22.4.2 |
| `@adonisjs/drive` | ^4.0.0 | 4.0.0 |
| `react-hook-form` | ^7.82.0 | 7.89.0 |
| `@hookform/resolvers` | ^5.4.0 | 5.9.1 |
| `shadcn` | ^4.13.1 | 4.21.4 |
| `tailwindcss` | ^4.1.18 | 4.3.3 |
| `@tanstack/react-query` | ^5.101.4 | 5.104.1 |
| `@tanstack/react-router` | ^1.170.23 | 1.170.42 |
| `@tanstack/react-table` | ^9.1.0 | 9.2.8 |
| `@tiptap/core` | 3.30.5 | 3.31.4 |
| `vite` | ^8.0.0 | 8.3.4 |
| `vitest` | ^4.1.5 | 5.0.3 |
| `@base-ui/react` | ^1.6.0 | 1.9.0 |

---

## lowcodejs

| Item | Onde | Regra | Correção |
|---|---|---|---|
| `apiKey!`/`baseUrl!` sem checagem prévia (5x) | `application/services/chat/internal/llm-chat/llm-chat.service.ts:98,103,109,118,125` | typescript.md §1 | Validar antes de montar `PROVIDERS`, ou estreitar `ResolvedLlmConfig` por provider |
| `messages[i]!` em loop indexado | `application/services/chat/internal/providers/claude-provider.service.ts:158` | typescript.md §1 | `for...of` ou `if (!msg) continue` |
| `mcpClient!` sem checagem na mesma função | `application/services/chat/chat-socket/chat-socket.service.ts:556` | typescript.md §1 | Guard antes da chamada |
| `process.env.NODE_ENV` lido fora de `env.ts` | `application/services/email/email.service.ts:227` | backend-fastify.md §7 | Expor via `Env`/flag dedicada |
| `new X()` em migration/seeder/remodel sem exceção registrada na régua geral | `database/migrations/{08,29,72}*.ts`, `remodels/migrate-fieldgroup-to-relationship.ts`, `seeders/1786000000-default-workspace.seed.ts`, `shared/task-logger.ts`, `migrations/13-*.ts` | backend.md §2.1 | Nenhuma correção de código — registrar a isenção de `database/` na tabela de isenções nomeadas de §2.1 (hoje só no `CLAUDE.md` local) |
| `no-restricted-syntax` de `new *Service\|...` ausente do `eslint.config.js` | `eslint.config.js` (raiz) | tooling.md §4 | Adicionar o bloco; incluir override de `files` para `database/**` |
| Sem `.env.example` | raiz do backend | backend.md §6 | Criar, ou registrar que `.env.test`/`.env.test.import.example` cobrem o papel |
| `userId: string` em vez de `actor` (perfil Fastify) | `notification/_shared.validator.ts:29,36,38,42` + 4 consumidores | backend.md §4.3 | `actor` sai das claims do JWT validadas pelo `ActorSchema`, sem consulta extra por rota (`backend-fastify.md` §3, `DECISIONS.md` #115) |
| Mesmo dado, três nomes (`actorUserId`/`userId`/`ownerId`) | `table/show/show.use-case.ts:22`, `setting/base/show/show.use-case.ts:142`, `table/schema-import/schema-import.use-case.ts:268`, `table/file-import/commit/commit.use-case.ts:71,198` | backend.md §4.3 | Padronizar em `actor` |
| `try/catch` global ausente em use-case | `storage/files/download/download.use-case.ts:39`, `storage/files/changes/changes.use-case.ts`, `storage/migration/status/status.use-case.ts` | backend.md §4.2 | Envolver em `try/catch` com tag `[módulo > recurso > verbo][error]` |
| `as <Tipo>` em fixture de teste sem helper | `extension/toggle/toggle.controller.spec.ts:50,230` | typescript.md §1/§4 | Helper de fixture tipado em vez de `as` |
| 17 `CLAUDE.md` de operação fora do formato (sem `## Endpoint`/`## Testes`, ou com JSON embutido) | 11 arquivos com JSON (`menu/base/bulk-*`, `user-group/base/bulk-*`, `user/base/bulk-*`) + 6 fora do esqueleto (`row/base/bulk-delete`, `row/base/bulk-move-list`, `row/base/empty-trash`, `logger/errors/paginated`, `logger/errors/resolve`, `setting/setup/database`) | backend.md §8 | Remover JSON (forma deriva do validator/model); reformatar os 6 para `## Endpoint`/`## Fluxo`/`## Erros Possiveis`/`## Testes` |
| `as` em frontend sem `satisfies` na origem (3x) | `_private/settings/-components/card-ai-assistant.tsx:50,121`, `table-forum-view.tsx:510` | typescript.md §1 | Tipar na origem em vez de assertar |
| `!` sem guard único (12 acessos no mesmo bloco) | `_private/tables/$slug/-components/field-management/use-table-field-management.ts:93-107` | typescript.md §1 | Um `if (!field.relationship) return` no topo troca os 12 `!` |
| `!` sem narrowing (demais ocorrências) | `calendar-event-dialog.tsx:575,583,594`, `kanban-row-dialog.tsx:1027,1232,1235`, `table-calendar-view.tsx:107`, `table-kanban-view.tsx:794,802` | typescript.md §1 | Guard no topo da função ou type guard no `.filter` |
| `value!`/`children!` sem narrowing (frontend core) | `tree-node.tsx:227`, `tree-list.tsx:201`, `table-field-validations-field.tsx:234,258`, `calendar-helpers.ts:199,200,215`, `menu-ref.ts:43`, `-value-map-sheet.tsx:115`, `cascade-dropdown/index.tsx:329` | typescript.md §1 | Narrow explícito antes do uso, caso a caso (ver `_map/lowcodejs-frontend-core.md`) |
| `useEffect` sincronizando dado de servidor já disponível | `_private/tables/$slug/-components/table-row/field-form-sections.tsx:369-376` | frontend.md §4 | Mover para `onSuccess` da query ou `defaultValues` |
| `pnpm@12.4.1` vs. demais projetos em `11.21.0` | `package.json:7` | tooling.md §0/§1 | Alinhar todos os projetos na mais nova publicada |
| `health-check.*` solto em `features/`, path não conferido | `application/features/health-check.*` | architecture.md §7 | Conferir `GET /health-check`, `200` + `Cache-Control: no-store`, corpo mínimo e sem consulta a banco/frontend |

### Migração estrutural — lowcodejs

| Atual | Alvo (`architecture.md`) | Como |
|---|---|---|
| Raiz `application/` | Raiz `app/` | `git mv application app`; bootstrap do `fastify-decorators` passa a varrer `app/features` |
| Alias `@application/*`, `@database/*`, `@extensions/*` em `tsconfig.json#paths` | Subpath imports `#core/*`, `#features/*`, `#services/*`, `#models/*`, `#middleware/*`, … no `package.json#imports` | Reescrever imports por codemod; remover `paths`; conferir que SWC/Vitest resolvem `#` (nativo do Node) |
| `application/model/` | `app/models/<entidade>.ts` | Mover |
| `application/middlewares/` | `app/middleware/<nome>.middleware.ts` | Mover + sufixo kebab |
| Ação em `features/<x>/<ação>/<verbo>.{controller,use-case}.ts` (um nível só acima da ação) | `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,unit.spec,e2e.spec}.ts` | Introduzir o nível que faltar (`<módulo>` ou `<recurso>`); arquivo repete o nome da pasta da ação |
| `_shared.validator.ts` por módulo, em VineJS | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`; regra de 2+ recursos vira função em `shared/src/validator.ts` | Reescrever em Zod, separar por recurso; ninguém importa `@vinejs/vine` no backend Fastify, no frontend nem em `shared/` (ESLint `no-restricted-imports`, `DECISIONS.md` #241; `_doc-lib/zod.md#api`) |
| E2E `*.controller.spec.ts` | `<ação>/<ação>.e2e.spec.ts`; unit continua `*.unit.spec.ts` | Renomear; configs do Vitest `unit` e `e2e` (`architecture.md` §8) |
| `start/schema.generated.ts` | `app/core/openapi/schema.generated.ts` | Mover; `openapi:check` confere (`openapi.md`) |
| Middleware em tripla (`-middleware-contract.service.ts` + `-middleware.service.ts` + `.middleware.ts`) | Classe `@Service()` + `hook()` estático em `<nome>.middleware.ts` | `backend-fastify.md` §1 |
| Schema de rota em `@vinejs/vine` 4.4.0 (backend) e `start/env.ts` manual | Zod: rota por `fastify-type-provider-zod` (`validatorCompiler`, `serializerCompiler`, `jsonSchemaTransform` para o `@fastify/swagger`); `start/env.ts` vira `z.object(...).safeParse(process.env)`, síncrono no import, com todas as falhas listadas de uma vez | `DECISIONS.md` #241; `_doc-lib/zod.md#basics`, `#error-formatting`, `#json-schema`; `_doc-lib/fastify-plugins.md#fastify-type-provider-zod`; resposta do OpenAPI por `z.toJSONSchema` |
| Store sobre a collection | Repository Mongo (`<entidade>.mongo.repository.ts`) com contrato e memória | `domain.md` §5 |
| Contrato para service sem I/O (20 ou mais) | Classe `@Service()` concreta | `backend-fastify.md` §3 |
| `actorUserId` no Payload | `actor` | `backend.md` §4.3 |
| `CLAUDE.md` por operação/recurso | Só raiz, backend e frontend; operação pelo OpenAPI (`backend.md` §8) | Apagar depois de mover o porquê para comentário do use-case |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`, o mesmo schema nos dois lados (Fastify); `z.config` com as mensagens pt-BR/es/en, formulário por `zodResolver` (`@hookform/resolvers/zod`) (`architecture.md` §9; `DECISIONS.md` #241; `_doc-lib/zod.md#error-customization`) | Mover junto com o corte do backend do mesmo recurso; apagar a cópia do frontend e o script de paridade, que deixa de existir quando o schema é um só |

### Versões — lowcodejs

| Pacote | Atual | Última |
|---|---|---|
| `fastify` | 5.12.3 | 5.12.5 |
| `mongodb` | ^7.6.0 | 7.7.0 |
| `zod` | (novo) | 4.6.7 |
| `fastify-type-provider-zod` | (novo) | 7.0.0 |
| `@vinejs/vine` | ^4.4.0 | sai (`DECISIONS.md` #241) |
| `bullmq` | ^6.3.2 | 6.3.12 |
| `socket.io` | ^4.8.3 | 4.8.4 |
| `isolated-vm` | ^7.0.1 | 7.0.1 |
| `vitest` (backend) | ^5.0.0 | 5.0.3 |
| `react-hook-form` | ^7.68.0 | 7.89.0 |
| `@hookform/resolvers` | ^5.2.2 | 5.9.1 |
| `shadcn` | ^4.21.2 | 4.21.4 |
| `tailwindcss` | ^4.0.6 | 4.3.3 |
| `@tanstack/react-query` | ^5.66.5 | 5.104.1 |
| `@tanstack/react-router` | ~1.170.1 | 1.170.42 |
| `@tanstack/react-start` | ~1.168.1 | 1.168.61 |
| `@tanstack/react-table` | ^9.2.4 | 9.2.8 |
| `@tiptap/core` | 3.31.3 | 3.31.4 |
| `vite` | ^8.3.0 | 8.3.4 |
| `vitest` (frontend) | ^5.0.1 | 5.0.3 |
| `@base-ui/react` | ^1.0.0 | 1.9.0 |

---

## interclasse

| Item | Onde | Regra | Correção |
|---|---|---|---|
| `!` sem narrow (5 pontos, mesmos do padrão canônico) | `cookie-access-tokens.guard.ts:17` (tipo `A & B`), `account/show.controller.ts:20`, `account/update.controller.ts:32`, `account/update.use-case.ts:64`, `administrator/users/update.controller.ts:40`, `cookie.service.ts:162-163` | typescript.md §1 | `Merge<A,B>` no guard; `if (!value)` nos demais |
| `whereNotNull('deletedAt')` à mão | `administrator/users/unarchive.use-case.ts:25`, `paginate.use-case.ts:33` | backend.md §4.8 | `onlyDeleted` + `withScopes`/`applyTrashed` |
| `as unknown as X` em frontend | `hooks/use-resource-form.ts:196`, `http.ts:407`, `components/ui/sonner.tsx:19`, `components/ui/sidebar.tsx:167,223,666` | typescript.md §1 | Tipar na origem; `sidebar.tsx` é saída de shadcn, baixa prioridade |
| Ternário em teste (não isento aqui) | `validator-messages.test.ts:61,84`, `http.test.ts:38` | backend.md §2 (vale para `tests/`) | Extrair variável com `if` antes |
| `PADRAO-BACKEND.md` local ~119 linhas atrás da régua canônica | `/PADRAO-BACKEND.md` | — (meta, `sync-check.ts`) | Copiar a versão atual (onlyDeleted, docs:check, `actor`, §4.6 Bouncer) |
| `padrao.manifest.json::softDeleteExempt` com 4 entradas mortas | `backend/padrao.manifest.json` | backend.md §4.8 | Remover ou confirmar intenção |
| Manifesto não lista o próprio projeto como irmão | `backend/padrao.manifest.json::irmaos` | — (meta) | Adicionar `../../interclasse/backend` ou documentar que o fork não participa do `--propagate` |
| **Autorização sem Bouncer** (gap estrutural, não só estilo) | `backend/app/policies/user_policy.ts`, `backend/app/guards/**` | backend.md §4.6 (reescrito, decisão #20/#21 de `DECISIONS.md`) | Adotar `@adonisjs/bouncer`: policy estende `BasePolicy`, checagem via `ctx.bouncer.with(Policy).authorize/allows/denies/execute`; registrar `app/abilities/main.ts` |

### Migração estrutural — interclasse

| Atual | Alvo (`architecture.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,unit.spec,e2e.spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Backend continua VineJS (nativo do Adonis), um validator por recurso com o mesmo caminho e nome do schema Zod de `shared/src/validators/<módulo>/<recurso>.validator.ts`; regras compartilhadas, `PAGINATION` e mensagens nos três idiomas ficam em `app/core/validator.ts` (`architecture.md` §3, §9; `DECISIONS.md` #241) | Quebrar por recurso; spec de paridade VineJS × Zod confere os campos dos dois lados; a meta-spec varre os dois antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.e2e.spec.ts` (e `<ação>.unit.spec.ts`) ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.unit.spec.ts`, `app/middleware/<nome>.middleware.e2e.spec.ts`); `tests/` só fixtures | Quebrar cada spec de recurso por ação; suítes do Japa `unit` (`app/**/*.unit.spec.ts`) e `functional` (`app/**/*.e2e.spec.ts`), `architecture.md` §3.2 |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>.contract.ts` e `<nome>.fake.ts`, só se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_standards/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; `--check` à mão a partir do `maiyu-pattern`, nunca no CI | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`, com par de caminho e nome no validator VineJS do backend; `z.config` com as mensagens pt-BR/es/en, formulário por `zodResolver` (`architecture.md` §9; `DECISIONS.md` #241; `_doc-lib/zod.md#error-customization`) | Reescrever cada validator em Zod no `shared/`; apagar a cópia local e trocar `vineResolver` por `zodResolver` (`@hookform/resolvers/zod`); o spec de paridade substitui o script antigo |

### Versões — interclasse

| Pacote | Atual | Última |
|---|---|---|
| `@adonisjs/core` | ^7.5.0 | 7.6.0 |
| `@adonisjs/lucid` | ^22.4.2 | 22.4.2 |
| `@adonisjs/drive` | ^4.0.0 | 4.0.0 |
| `react-hook-form` | ^7.82.0 | 7.89.0 |
| `@hookform/resolvers` | ^5.4.0 | 5.9.1 |
| `shadcn` | ^4.13.1 | 4.21.4 |
| `tailwindcss` | ^4.1.18 | 4.3.3 |
| `@tanstack/react-query` | ^5.101.4 | 5.104.1 |
| `@tanstack/react-router` | ^1.170.23 | 1.170.42 |
| `@tanstack/react-table` | ^9.1.0 | 9.2.8 |
| `vite` | ^8.0.0 | 8.3.4 |
| `vitest` | ^4.1.5 | 5.0.3 |
| `@base-ui/react` | ^1.6.0 | 1.9.0 |

---

## maiyu.com.br (frontend)

| Item | Onde | Regra | Correção |
|---|---|---|---|
| `VITE_API_URL` lido direto, sem `env.ts` | `src/integrations/tanstack-query/http.ts:143` | frontend.md §3 | Extrair para `src/env.ts` (`architecture.md` §4) |
| Health check em `GET /health` | `src/routes/health.ts` | architecture.md §7 | Renomear para `src/routes/health-check.ts` (`GET /health-check`); atualizar o probe do deploy junto |
| Ternário só em código gerado (`paraglide`), fora de autoria do time | `src/paraglide/runtime.js`, `server.js` (20 ocorrências) | typescript.md §2 | Nenhuma ação — fora do critério de autoria |

### Migração estrutural — maiyu.com.br (frontend)

| Atual | Alvo (`architecture.md`) | Como |
|---|---|---|
| Validators do frontend num arquivo só (`src/lib/validator.ts`), onde houver formulário | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`, com par de caminho e nome no validator VineJS do backend; `z.config` com as mensagens pt-BR/es/en, formulário por `zodResolver` (`architecture.md` §9; `DECISIONS.md` #241; `_doc-lib/zod.md#error-customization`) | Reescrever cada validator em Zod no `shared/`; apagar a cópia local e trocar `vineResolver` por `zodResolver` (`@hookform/resolvers/zod`); o spec de paridade substitui o script antigo |

### Versões — maiyu.com.br (frontend)

| Pacote | Atual | Última |
|---|---|---|
| `react-hook-form` | ^7.82.0 | 7.89.0 |
| `@hookform/resolvers` | ^5.4.0 | 5.9.1 |
| `shadcn` | ^4.13.1 | 4.21.4 |
| `tailwindcss` | ^4.1.18 | 4.3.3 |
| `@tanstack/react-query` | ^5.101.4 | 5.104.1 |
| `@tanstack/react-router` | ^1.170.23 | 1.170.42 |
| `@tanstack/react-start` | ^1.168.40 | 1.168.61 |
| `@tanstack/react-table` | ^9.1.0 | 9.2.8 |
| `@tiptap/core` | 3.30.5 | 3.31.4 |
| `use-mask-input` | ^3.13.0 | 3.14.2 |
| `vite` | ^8.0.0 | 8.3.4 |
| `vitest` | ^4.1.5 | 5.0.3 |
| `@base-ui/react` | ^1.6.0 | 1.9.0 |

---

## academy

Backend AdonisJS + Lucid, mesma forma dos outros projetos Adonis; sem mapa em `_map/`, então só
a migração estrutural.

### Migração estrutural — academy

| Atual | Alvo (`architecture.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,unit.spec,e2e.spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Backend continua VineJS (nativo do Adonis), um validator por recurso com o mesmo caminho e nome do schema Zod de `shared/src/validators/<módulo>/<recurso>.validator.ts`; regras compartilhadas, `PAGINATION` e mensagens nos três idiomas ficam em `app/core/validator.ts` (`architecture.md` §3, §9; `DECISIONS.md` #241) | Quebrar por recurso; spec de paridade VineJS × Zod confere os campos dos dois lados; a meta-spec varre os dois antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.e2e.spec.ts` (e `<ação>.unit.spec.ts`) ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.unit.spec.ts`, `app/middleware/<nome>.middleware.e2e.spec.ts`); `tests/` só fixtures | Quebrar cada spec de recurso por ação; suítes do Japa `unit` (`app/**/*.unit.spec.ts`) e `functional` (`app/**/*.e2e.spec.ts`), `architecture.md` §3.2 |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>.contract.ts` e `<nome>.fake.ts`, só se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_standards/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; `--check` à mão a partir do `maiyu-pattern`, nunca no CI | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | Zod em `shared/src/validators/<módulo>/<recurso>.validator.ts`, com par de caminho e nome no validator VineJS do backend; `z.config` com as mensagens pt-BR/es/en, formulário por `zodResolver` (`architecture.md` §9; `DECISIONS.md` #241; `_doc-lib/zod.md#error-customization`) | Reescrever cada validator em Zod no `shared/`; apagar a cópia local e trocar `vineResolver` por `zodResolver` (`@hookform/resolvers/zod`); o spec de paridade substitui o script antigo |

