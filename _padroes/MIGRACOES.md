# Migrações pendentes por projeto

Gerado a partir de `_padroes/_mapa/*.md` (seções Desvios do padrão) e de `arquitetura.md` (tabelas
"Migração estrutural"). Linhas
ordenadas por risco — segurança/comportamento primeiro, estilo depois.

Vale para todos: backend e frontend que ainda não expõem o próprio `GET /health-check`
independente criam o seu (`arquitetura.md` §7). Abaixo só os casos já mapeados com path diferente.

---

## simple-hub

| Item | Onde | Regra | Correção |
|---|---|---|---|
| `userId: string` no Payload em vez de `actor: User` | 79 use-cases/controllers, ex. `features/producer/products/update.use-case.ts:1`, `features/company/**` (62x), `features/customer/orders/**` | backend.md §4.3 | Trocar `userId` por `actor: User`; controller repassa `context.auth.user!` inteiro, como já fazem os 4 controllers de `administrator/administrators/*` |
| `pre-commit` não roda nada | `.husky/pre-commit:20` (`#pnpm check && pnpm test`) | backend.md §10 | Descomentar, ou documentar a exceção com o porquê |
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

| Atual | Alvo (`arquitetura.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Um por recurso: `app/features/<módulo>/<recurso>/<recurso>.validator.ts`; `app/core/validator.ts` fica com `vine` configurado, regras compartilhadas (funções), `LIST_LIMITS`, `PageValidator`/`PaginationValidator` e mensagens pt-BR | Mover cada `<Recurso><Ação>Validator` para o arquivo do recurso; meta-spec passa a varrer `app/features/**/*.validator.ts` antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.spec.ts` ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.spec.ts`, `app/middleware/<nome>.middleware.spec.ts`); `tests/` só helpers/fixtures | Quebrar cada spec de recurso por ação; glob do Japa vira `app/**/*.spec.ts` |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>-contract.service.ts` se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_padroes/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; CI com `--check` | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | `src/validators/<módulo>/<recurso>.validator.ts`, mesmo export do backend; `src/lib/validator.ts` só com `vine` configurado, regras e mensagens | Mover junto com o corte do backend do mesmo recurso; script de paridade compara os dois |

### Versões — simple-hub

| Pacote | Atual | Última |
|---|---|---|
| `@adonisjs/core` | ^7.5.0 | 7.6.0 |
| `@adonisjs/lucid` | ^22.4.2 | 22.4.2 |
| `@adonisjs/drive` | ^4.0.0 | 4.0.0 |
| `@vinejs/vine` | ^4.4.0 | 4.4.0 |
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
| `VITE_API_URL` lido direto por `import.meta.env`, sem `env.ts` | `frontend/src/integrations/tanstack-query/http.ts:143` (idem em maiyu.com.br) | frontend.md §3 | Extrair para `lib/env.ts` com checagem explícita |
| Fábrica de query key centralizada (não por módulo) | `frontend/src/hooks/tanstack-query/_query-keys.ts` (164 linhas, 13 recursos) | frontend.md §2.1 (divergência já registrada) | Documentar como 3º projeto que diverge, ou migrar |

### Migração estrutural — adacaibs

| Atual | Alvo (`arquitetura.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Um por recurso: `app/features/<módulo>/<recurso>/<recurso>.validator.ts`; `app/core/validator.ts` fica com `vine` configurado, regras compartilhadas (funções), `LIST_LIMITS`, `PageValidator`/`PaginationValidator` e mensagens pt-BR | Mover cada `<Recurso><Ação>Validator` para o arquivo do recurso; meta-spec passa a varrer `app/features/**/*.validator.ts` antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.spec.ts` ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.spec.ts`, `app/middleware/<nome>.middleware.spec.ts`); `tests/` só helpers/fixtures | Quebrar cada spec de recurso por ação; glob do Japa vira `app/**/*.spec.ts` |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>-contract.service.ts` se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_padroes/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; CI com `--check` | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | `src/validators/<módulo>/<recurso>.validator.ts`, mesmo export do backend; `src/lib/validator.ts` só com `vine` configurado, regras e mensagens | Mover junto com o corte do backend do mesmo recurso; script de paridade compara os dois |

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
| `userId: string` em vez de `actor: User` (perfil Fastify, decisão a confirmar) | `notification/_shared.validator.ts:29,36,38,42` + 4 consumidores | backend.md §4.3 | Ver nota de design: perfil Fastify só tem `request.user.sub` (claim JWT), carregar `User` custaria uma consulta extra em toda rota — ver promoção em `backend-fastify.md` |
| Mesmo dado, três nomes (`actorUserId`/`userId`/`ownerId`) | `table/show/show.use-case.ts:22`, `setting/base/show/show.use-case.ts:142`, `table/schema-import/schema-import.use-case.ts:268`, `table/file-import/commit/commit.use-case.ts:71,198` | backend.md §4.3 | Padronizar em `actorUserId` |
| `try/catch` global ausente em use-case | `storage/files/download/download.use-case.ts:39`, `storage/files/changes/changes.use-case.ts`, `storage/migration/status/status.use-case.ts` | backend.md §4.2 | Envolver em `try/catch` com tag `[módulo > recurso > verbo][error]` |
| `as <Tipo>` em fixture de teste sem helper | `extension/toggle/toggle.controller.spec.ts:50,230` | typescript.md §1/§4 | Helper de fixture tipado em vez de `as` |
| 17 `CLAUDE.md` de operação fora do formato (sem `## Endpoint`/`## Testes`, ou com JSON embutido) | 11 arquivos com JSON (`menu/base/bulk-*`, `user-group/base/bulk-*`, `user/base/bulk-*`) + 6 fora do esqueleto (`row/base/bulk-delete`, `row/base/bulk-move-list`, `row/base/empty-trash`, `logger/errors/paginated`, `logger/errors/resolve`, `setting/setup/database`) | backend.md §8 | Remover JSON (forma deriva do validator/model); reformatar os 6 para `## Endpoint`/`## Fluxo`/`## Erros Possiveis`/`## Testes` |
| `as` em frontend sem `satisfies` na origem (3x) | `_private/settings/-components/card-ai-assistant.tsx:50,121`, `table-forum-view.tsx:510` | typescript.md §1 | Tipar na origem em vez de assertar |
| `!` sem guard único (12 acessos no mesmo bloco) | `_private/tables/$slug/-components/field-management/use-table-field-management.ts:93-107` | typescript.md §1 | Um `if (!field.relationship) return` no topo troca os 12 `!` |
| `!` sem narrowing (demais ocorrências) | `calendar-event-dialog.tsx:575,583,594`, `kanban-row-dialog.tsx:1027,1232,1235`, `table-calendar-view.tsx:107`, `table-kanban-view.tsx:794,802` | typescript.md §1 | Guard no topo da função ou type guard no `.filter` |
| `value!`/`children!` sem narrowing (frontend core) | `tree-node.tsx:227`, `tree-list.tsx:201`, `table-field-validations-field.tsx:234,258`, `calendar-helpers.ts:199,200,215`, `menu-ref.ts:43`, `-value-map-sheet.tsx:115`, `cascade-dropdown/index.tsx:329` | typescript.md §1 | Narrow explícito antes do uso, caso a caso (ver `_mapa/lowcodejs-frontend-core.md`) |
| `useEffect` sincronizando dado de servidor já disponível | `_private/tables/$slug/-components/table-row/field-form-sections.tsx:369-376` | frontend.md §4 | Mover para `onSuccess` da query ou `defaultValues` |
| `pnpm@12.4.1` vs. demais projetos em `11.21.0` | `package.json:7` | tooling.md §0/§1 | Alinhar todos os projetos na mais nova publicada |
| `health-check.*` solto em `features/`, path não conferido | `application/features/health-check.*` | arquitetura.md §7 | Conferir `GET /health-check`, `200` + `Cache-Control: no-store`, corpo mínimo e sem consulta a banco/frontend |

### Migração estrutural — lowcodejs

| Atual | Alvo (`arquitetura.md`) | Como |
|---|---|---|
| Raiz `application/` | Raiz `app/` | `git mv application app`; bootstrap do `fastify-decorators` passa a varrer `app/features` |
| Alias `@application/*`, `@database/*`, `@extensions/*` em `tsconfig.json#paths` | Subpath imports `#core/*`, `#features/*`, `#services/*`, `#models/*`, `#middleware/*`, … no `package.json#imports` | Reescrever imports por codemod; remover `paths`; conferir que SWC/Vitest resolvem `#` (nativo do Node) |
| `application/model/` | `app/models/<entidade>.ts` | Mover |
| `application/middlewares/` | `app/middleware/<nome>.middleware.ts` | Mover + sufixo kebab |
| Ação em `features/<x>/<ação>/<verbo>.{controller,use-case}.ts` (um nível só acima da ação) | `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,spec}.ts` | Introduzir o nível que faltar (`<módulo>` ou `<recurso>`); arquivo repete o nome da pasta da ação |
| `_shared.validator.ts` por módulo | `app/features/<módulo>/<recurso>/<recurso>.validator.ts`; regra de 2+ recursos vira função em `app/core/validator.ts` | Separar por recurso; ninguém importa `@vinejs/vine` fora de `core/validator.ts` |
| E2E `*.controller.spec.ts` | `<ação>/<ação>.spec.ts`; unit continua `*.unit.spec.ts` | Renomear; glob do Vitest `app/**/*.spec.ts` |
| `CLAUDE.md` por operação/recurso | Só raiz, backend e frontend; operação pelo OpenAPI (`backend.md` §8) | Apagar depois de mover o porquê para comentário do use-case |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | `src/validators/<módulo>/<recurso>.validator.ts`, mesmo export do backend; `src/lib/validator.ts` só com `vine` configurado, regras e mensagens | Mover junto com o corte do backend do mesmo recurso; script de paridade compara os dois |

### Versões — lowcodejs

| Pacote | Atual | Última |
|---|---|---|
| `fastify` | 5.12.3 | 5.12.5 |
| `mongodb` | ^7.6.0 | 7.7.0 |
| `@vinejs/vine` | ^4.4.0 | 4.4.0 |
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
| **Autorização sem Bouncer** (gap estrutural, não só estilo) | `backend/app/policies/user_policy.ts`, `backend/app/guards/**` | backend.md §4.6 (reescrito, decisão #20/#21 de `DECISOES.md`) | Adotar `@adonisjs/bouncer`: policy estende `BasePolicy`, checagem via `ctx.bouncer.with(Policy).authorize/allows/denies/execute`; registrar `app/abilities/main.ts` |

### Migração estrutural — interclasse

| Atual | Alvo (`arquitetura.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Um por recurso: `app/features/<módulo>/<recurso>/<recurso>.validator.ts`; `app/core/validator.ts` fica com `vine` configurado, regras compartilhadas (funções), `LIST_LIMITS`, `PageValidator`/`PaginationValidator` e mensagens pt-BR | Mover cada `<Recurso><Ação>Validator` para o arquivo do recurso; meta-spec passa a varrer `app/features/**/*.validator.ts` antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.spec.ts` ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.spec.ts`, `app/middleware/<nome>.middleware.spec.ts`); `tests/` só helpers/fixtures | Quebrar cada spec de recurso por ação; glob do Japa vira `app/**/*.spec.ts` |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>-contract.service.ts` se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_padroes/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; CI com `--check` | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | `src/validators/<módulo>/<recurso>.validator.ts`, mesmo export do backend; `src/lib/validator.ts` só com `vine` configurado, regras e mensagens | Mover junto com o corte do backend do mesmo recurso; script de paridade compara os dois |

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
| `VITE_API_URL` lido direto, sem `env.ts` | `src/integrations/tanstack-query/http.ts:143` | frontend.md §3 | Extrair para `lib/env.ts` |
| Health check em `GET /health` | `src/routes/health.ts` | arquitetura.md §7 | Renomear para `src/routes/health-check.ts` (`GET /health-check`); atualizar o probe do deploy junto |
| Ternário só em código gerado (`paraglide`), fora de autoria do time | `src/paraglide/runtime.js`, `server.js` (20 ocorrências) | typescript.md §2 | Nenhuma ação — fora do critério de autoria |

### Migração estrutural — maiyu.com.br (frontend)

| Atual | Alvo (`arquitetura.md`) | Como |
|---|---|---|
| Validators do frontend num arquivo só (`src/lib/validator.ts`), onde houver formulário | `src/validators/<módulo>/<recurso>.validator.ts`, mesmo export do backend; `src/lib/validator.ts` só com `vine` configurado, regras e mensagens | Mover junto com o corte do backend do mesmo recurso; script de paridade compara os dois |

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

Backend AdonisJS + Lucid, mesma forma dos outros projetos Adonis; sem mapa em `_mapa/`, então só
a migração estrutural.

### Migração estrutural — academy

| Atual | Alvo (`arquitetura.md`) | Como |
|---|---|---|
| Ação como par de arquivos no recurso: `app/features/<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` | Pasta por ação: `app/features/<módulo>/<recurso>/<ação>/<ação>.{controller,use-case,spec}.ts` | `git mv` por recurso; `start/routes.ts` aponta para `#features/.../<ação>/<ação>.controller`; import do use-case irmão continua relativo (`./<ação>.use-case.ts`) |
| Validators num arquivo só: `app/core/validator.ts` | Um por recurso: `app/features/<módulo>/<recurso>/<recurso>.validator.ts`; `app/core/validator.ts` fica com `vine` configurado, regras compartilhadas (funções), `LIST_LIMITS`, `PageValidator`/`PaginationValidator` e mensagens pt-BR | Mover cada `<Recurso><Ação>Validator` para o arquivo do recurso; meta-spec passa a varrer `app/features/**/*.validator.ts` antes do corte |
| Mensagens do provider em `start/validator.ts` | `app/core/validator.ts` | Mover; `start/` só registra o provider no boot |
| Specs em `tests/functional/<tema>.spec.ts` | `<ação>/<ação>.spec.ts` ao lado da ação; transversais ao lado do que cobrem (`app/core/validator.spec.ts`, `app/middleware/<nome>.middleware.spec.ts`); `tests/` só helpers/fixtures | Quebrar cada spec de recurso por ação; glob do Japa vira `app/**/*.spec.ts` |
| Middleware e policy em snake_case: `app/middleware/<nome>_middleware.ts`, `app/policies/<entidade>_policy.ts` | `app/middleware/<nome>.middleware.ts`, `app/policies/<entidade>.policy.ts` | Renomear + atualizar `start/kernel.ts` e imports `#middleware/*`/`#policies/*` |
| Model em snake_case, se houver | `app/models/<entidade>.ts` em kebab-case | Renomear |
| Service solto: `app/services/<nome>.service.ts` | `app/services/<nome>/<nome>.service.ts` (+ `<nome>-contract.service.ts` se I/O externo) | Mover; subpath import `#services/*` cobre a profundidade nova |
| `CLAUDE.md` por camada/módulo/recurso + `docs:sync`/`docs:check` | Só `/CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`; operação documentada pelo OpenAPI | Apagar os `CLAUDE.md` internos depois de mover para comentário de use-case o porquê que não está no OpenAPI |
| `PADRAO-BACKEND.md` local + `padrao.manifest.json`/`sync:check` entre irmãos | `_padroes/`, `_doc-lib/` e skills via `node scripts/sync-to-project.mjs <dir>`; CI com `--check` | Remover o manifesto e o `PADRAO-BACKEND.md`; `softDeleteExempt` e a lista de ENV fora do leitor vão para a config do `pattern:check` |
| Validators do frontend num arquivo só (`src/lib/validator.ts`) | `src/validators/<módulo>/<recurso>.validator.ts`, mesmo export do backend; `src/lib/validator.ts` só com `vine` configurado, regras e mensagens | Mover junto com o corte do backend do mesmo recurso; script de paridade compara os dois |

