# Arquitetura da casa

Uma arquitetura só para todo projeto, **independente da tecnologia**. Mesma filosofia, mesmas
camadas, mesmos diretórios, mesmos nomes. O framework (AdonisJS, Fastify, ou o que vier) muda o
**como** dentro de cada camada — nunca o **onde** nem o **o quê**. Os arquivos de perfil
(`backend.md`, `backend-fastify.md`, `frontend.md`) descrevem só esse "como"; domínio e
persistência estão em `domain.md`.

**É guia obrigatório.** A árvore desta página é fechada: pasta, arquivo ou sufixo que não
aparece aqui é desvio, e o `pattern:check` cobra (§6). A raiz do repositório e o pacote
`shared/` estão no §9.

Autoridade continua a mesma: `_doc-lib/` (doc oficial) é o contrato de cada lib. Esta estrutura
é **escolha** que todas as docs da stack permitem — nenhuma delas impõe árvore de diretório
para feature — e por isso é marcada *(opinião da casa)* onde a doc não fala.

---

## 1. Filosofia

1. **Fatia vertical.** Uma operação é uma pasta com tudo dela: entrada, regra, teste. Achar o
   código de "arquivar post" é abrir uma pasta, não cinco.
2. **Cada camada tem um papel só.** Controller traduz HTTP; use-case orquestra; a **entidade de
   domínio** guarda a regra de negócio e as invariantes; o repository persiste; o service fala
   com o mundo de fora; a policy autoriza; o model só descreve a tabela.
3. **A dependência aponta para dentro** (Clean Architecture): `features → domain`, e o use-case
   conhece só contratos (repository, service). Quem liga contrato a implementação é o container.
4. **Falha esperada é valor** (`Either`), exceção é bug. O domínio devolve fato; o use-case
   traduz para `HTTPException`.
5. **Dependência entra pelo construtor**; persistência e I/O externo entram por contrato
   (`solid.md`, `domain.md`).
6. **Dado de fora é `unknown` até o validator** — o mesmo schema Zod, nos dois lados, num arquivo
   só em `shared/` (§9). No backend Adonis o validator é VineJS (nativo do framework), com par de
   caminho e nome no Zod do `shared/` e spec de paridade (§9; `DECISIONS.md` #241).
7. **Toda função tem casa** (`typescript.md` §6). Pasta genérica (`utils/`, `helpers/`) não existe.
8. **Doc oficial é contrato**; padrão aplica a doc; código segue o padrão.
9. **Mesmo nome para a mesma coisa** em todo projeto: quem abre um projeto novo já sabe onde está tudo.
10. **Sem duplicidade; procure antes de criar** *(opinião da casa)*. Antes de escrever função,
    hook, componente, service, regra de validator ou tipo, procure o que já existe
    (code-review-graph, `grep`, `shared/`, `core/`, `domain/`, `components/common/`, `lib/`) e
    reuse ou estenda. A mesma lógica em dois lugares sobe para a casa dela. Vale para a régua
    também: regra escrita uma vez, os outros arquivos apontam. **Por quê:** cópia diverge na
    primeira mudança, e o bug corrigido num lugar segue vivo no outro.

## 2. Camadas

| Camada | Responsabilidade | Pode importar | Nunca |
|---|---|---|---|
| `shared/` (pacote) | o que roda igual nos dois lados: `Either`, validators, mensagens, enums, value objects puros, tipos de registro, tipos de resposta | `zod`; `@tiptap/*` só em `src/rich-text-schema.ts` | banco, HTTP, framework |
| `core/` | mecanismos transversais do backend: envelope de resposta, OpenAPI, validator do backend (Fastify: o `z` configurado; Adonis: o `vine` do backend) (o `Either` vem de `shared/`; o `HTTPException`, de `exceptions/`) | `shared` | qualquer outra camada do app |
| `domain/` | entidades com comportamento, value objects do backend, fatos de domínio | `core`, `shared` | model, repository, service, HTTP, framework |
| `repositories/` | contrato de persistência e suas implementações (ORM e memória) | `domain`, `models`, `core` | regra de negócio, HTTP |
| `models/` | schema da tabela/coleção (Lucid ou driver Mongo) | `core` | ser importado fora de `repositories/` |
| `services/` | integração externa (e-mail, storage, fila, CEP, CNPJ, pagamento) atrás de contrato | `core`, `shared` | regra de negócio, `features/` |
| `policies/` | "quem pode" sobre um registro | `core`, `domain` | consultar banco por conta própria |
| `middleware/` | transversal de requisição (auth, papel, tenant, idioma) | `core`, contratos | regra de uma feature |
| `features/` | operações: controller + use-case + testes | `domain`, contratos de `repositories/` e `services/`, `policies`, `core`, `exceptions` (`HTTPException`), `shared` | importar outra feature; importar `models/` ou implementação concreta |
| `exceptions/` | `HTTPException` e a tradução de erro → resposta HTTP | `core` | — |

A seta é sempre para dentro:

```
controller → use-case → domain
                │
                └→ contratos (repository, service)  ←  implementações (Lucid/Mongo, memória, API externa)
                                                        ligadas no container (provider / registry)
```

`domain/` e `shared/` são o centro: não sabem que existe banco, HTTP ou framework.

## 3. Árvore do backend

```
backend/
├── package.json  tsconfig.json  eslint.config.js  prettier.config.js
├── Dockerfile-production  .dockerignore  docker-compose.yml   # compose = só infra local
├── .env.example  .env.test                                     # backend.md §6
├── openapi.json                                                # artefato commitado (openapi.md)
├── app/
│   ├── core/
│   │   ├── response.ts              # envelope { message, status, code, errors? }, Paginated<T>
│   │   ├── validator.ts             # Fastify: reexporta o z de shared/ + regras só do backend; Adonis: o vine do backend (arquivo)
│   │   ├── validator.unit.spec.ts   # meta-spec dos validators (backend.md §4.4)
│   │   └── openapi/                 # defineDocs, registro de resposta, authz-baseline.json
│   ├── domain/
│   │   ├── <entidade>/
│   │   │   ├── <entidade>.entity.ts       # classe rica: create/restore, transições, invariantes
│   │   │   ├── <entidade>.errors.ts       # fatos de domínio (sem status HTTP)
│   │   │   └── <entidade>.unit.spec.ts
│   │   └── shared/<nome>.value-object.ts  # value object só do backend (Money, Slug com unicidade…)
│   ├── repositories/
│   │   └── <entidade>/
│   │       ├── <entidade>.repository.ts            # contrato: abstract class, métodos por intenção
│   │       ├── <entidade>.lucid.repository.ts      # implementação (Adonis); .mongo. no Fastify
│   │       ├── <entidade>.memory.repository.ts     # implementação em memória para unit
│   │       └── <entidade>.repository.e2e.spec.ts   # o mesmo teste de contrato nas duas
│   ├── models/<entidade>.ts         # schema; só repositories/ importa
│   ├── services/
│   │   └── <nome>/                  # um por integração externa: mail, storage, cep, cnpj, pix…
│   │       ├── <nome>.contract.ts   # abstract class: o que a aplicação precisa
│   │       ├── <nome>.service.ts    # implementação (provedor real)
│   │       ├── <nome>.fake.ts       # dublê em memória para unit
│   │       └── <nome>.unit.spec.ts
│   ├── policies/<entidade>.policy.ts (+ .unit.spec.ts)   # base comum: session-scoped-policy.base.ts
│   ├── middleware/<nome>.middleware.ts (+ .e2e.spec.ts)
│   ├── exceptions/{http.exception.ts, handler.ts}   # HTTPException e fábricas por status (backend.md §4.2); handler → envelope
│   └── features/
│       ├── health-check.controller.ts (+ .e2e.spec.ts)    # infra pura, sem módulo (§7)
│       ├── documentation/openapi/show/                     # /openapi.json como ação
│       ├── _shared.<tema>.ts        # só função pura, usada por 2+ módulos (backend.md §4.9)
│       └── <módulo>/                # público ou contexto: administrator, storefront, authentication, account
│           ├── _shared.<tema>.ts    # só função pura, usada por 2+ recursos do módulo
│           ├── _shared.<tema>.base.ts   # abstract class de template method de 2+ recursos (backend.md §3)
│           └── <recurso>/           # substantivo no plural: posts, users, sessions, profile
│               ├── _shared.<recurso>-refusal.ts   # tradutor fato de domínio → HTTPException (se houver)
│               ├── <recurso>.presenter.ts         # entidade → response do shared/ (§10)
│               └── <ação>/          # verbo kebab: create, paginate, show, update, archive, sign-up…
│                   ├── <ação>.controller.ts
│                   ├── <ação>.use-case.ts
│                   ├── <ação>.unit.spec.ts        # use-case com memory repository + fakes
│                   └── <ação>.e2e.spec.ts         # rota real, banco real
├── commands/<recurso>-<verbo>.command.ts
├── config/<nome>.ts                 # só configuração
├── database/
│   ├── migrations/                  # nome do framework (backend.md §3)
│   ├── seeders/{<nome>.seed.ts, dev/<nome>.ts}
│   ├── factories/<entidade>.factory.ts   # só para teste
│   └── data/<nome>.ts               # dado de seed/conteúdo, fora de seeders/
├── scripts/{pattern-check.ts, pattern-check.config.ts, authz-check.ts, <nome>-check.ts} (+ .unit.spec.ts)
├── start/{env.ts, kernel.ts, limiter.ts}
└── tests/
    ├── bootstrap.ts | setup.<suíte>.ts
    └── <tema>-fixtures.ts           # helper usado por 2+ specs; sem helpers.ts genérico
```

Regras da árvore:

- **Sempre três níveis em `features/`**: `<módulo>/<recurso>/<ação>/`. O módulo é o público ou o
  contexto (`administrator`, `storefront`, `authentication`, `account`); o recurso é substantivo
  no plural; a ação é verbo. Quando módulo e recurso coincidem, repete-se (`account/profile/`).
  Nenhum módulo sem recurso.
- **Ação é pasta**, sempre, inclusive a trivial. Os arquivos repetem o verbo
  (`archive/archive.controller.ts`). Não existe `.service.ts` dentro da ação: persistência é
  repository, regra é domínio, mundo de fora é `services/`.
- **Validator mora em `shared/`** (§9), um arquivo por recurso, em Zod. Ninguém importa `zod`
  direto nos validators: o `z` configurado (locale e mensagens da casa) sai de `shared/src/validator.ts`.
  **No backend Adonis** o validator de request é VineJS, em `app/validators/<módulo>/<recurso>.validator.ts`
  (§3), e ninguém importa `@vinejs/vine` direto: o `vine` configurado sai de `core/validator.ts`.
  Validator é forma e formato; unicidade e existência são do use-case via repository (409/404).
- **`_shared` é só função pura** (sem model, `db`, `drive` nem estado; o `pattern:check` recusa).
  Base de template method compartilhada é `abstract class` em `_shared.<tema>.base.ts`, nunca em
  `_shared.<tema>.ts`.
- **Teste fica ao lado do que cobre**: `<x>.unit.spec.ts` e `<x>.e2e.spec.ts` (§8). `tests/` guarda
  só o que serve a várias specs.
- **Nome de arquivo é kebab-case com sufixo de papel**: `.controller.ts`, `.use-case.ts`,
  `.entity.ts`, `.value-object.ts`, `.errors.ts`, `.repository.ts`, `.lucid.repository.ts`,
  `.mongo.repository.ts`, `.memory.repository.ts`, `.contract.ts`, `.service.ts`, `.fake.ts`,
  `.policy.ts`, `.base.ts`, `.presenter.ts`, `.middleware.ts`, `.validator.ts`, `.unit.spec.ts`,
  `.e2e.spec.ts`. Gerador de
  framework que produza outro formato é renomeado — exceto migration (`backend.md` §3).
- **Classe deriva do caminho**: `features/administrator/posts/archive/` →
  `AdministratorPostArchiveController`. Validator, código de 500 e tag de log também derivam; a
  tabela completa é a de `backend.md` §3.
- Alias de import por subpath imports do `package.json` (`#core/*`, `#domain/*`,
  `#repositories/*`, `#models/*`, `#services/*`, `#policies/*`, `#middleware/*`, `#features/*`,
  `#exceptions/*`, `#start/*`, `#config/*`) — nativo do Node, igual em qualquer framework. O
  pacote compartilhado entra como `@<projeto>/shared`.

### 3.1 Camadas opcionais — só quando o projeto precisa *(opinião da casa)*

Não nascem vazias "para depois" (YAGNI). Entram quando a necessidade aparece, com esta forma:

| Camada | Forma | Quando |
|---|---|---|
| `app/extensions/<grupo>/<tipo>/<id>/` | `manifest.json`, `boot.ts`, e dentro a mesma fatia vertical (`<recurso>/<ação>/…`, validators em `shared/`; no Adonis, o VineJS em `app/validators/`) | produto com funcionalidade instalável (plugin). Descoberta por varredura de pasta no boot; o `pattern:check` aplica as mesmas regras com raiz na extensão |
| `frontend/src/extensions/<grupo>/<tipo>/<id>/index.tsx` | tela da extensão do backend, mesmo caminho lógico; componente em `export default`, achado por `import.meta.glob` em `lib/extensions-registry.ts` e carregado sob demanda (_doc-lib/vitejs.md#features); dado pela mesma camada de API do app (`integrations/tanstack-query/`), nunca uma própria | extensão do backend que tem tela; nada fora de `extensions/` e do registry importa de lá |
| `app/hooks/<nome>/` | `<nome>.contract.ts` + `<nome>.service.ts` | ciclo de vida do framework que não é requisição (`onReady`, carga de extensões) |
| `app/core/tenant-scope.ts` | escopo por `AsyncLocalStorage` (`node:async_hooks`), lido por todo repository | app multi-tenant. Falta de escopo **lança** (erro fechado), nunca vira "sem filtro" |
| `app/core/request-context.ts` | `AsyncLocalStorage` com o `request.log` da requisição, preenchido no `onRequest` | só Fastify, quando código fora do handler loga (`backend.md` §5.6, item 4). No Adonis o `HttpContext` já cumpre esse papel |
| `app/services/<nome>/internal/<sub>/` | sub-service não injetável de fora | integração grande que se divide por dentro |

Varredura de pasta por convenção usa **um** utilitário de listagem em `core/` — não um `readdir`
por mecanismo.

### 3.2 Só no AdonisJS

```
backend/
├── adonisrc.ts  ace.js  bin/{console,server,test}.ts
├── app/
│   ├── core/column.ts               # prepare/consume compartilhados das colunas
│   ├── guards/<nome>.guard.ts
│   ├── validators/<módulo>/<recurso>.validator.ts   # VineJS, par de caminho e nome do Zod em shared/ (§9)
│   └── jobs/<nome>.job.ts
├── providers/<nome>.provider.ts     # composition root: liga contrato → implementação
├── database/{schema.ts (gerado), schema_rules.ts}
├── resources/lang/{pt-BR,es,en}/*.json   # i18n.md
└── start/{routes.ts, validator.ts}
```

Suítes Japa: `unit` (`app/**/*.unit.spec.ts`, `scripts/**/*.unit.spec.ts`) e `functional`
(`app/**/*.e2e.spec.ts`). _doc-lib/adonisjs.md#guides/testing/introduction.

### 3.3 Só no Fastify

```
backend/
├── bin/server.ts                    # boot HTTP + workers + shutdown
├── tsup.config.ts  vitest.unit.config.ts  vitest.e2e.config.ts
├── app/core/{di-registry.ts, openapi/schema.generated.ts}
├── app/services/i18n/               # service de i18n injetado (i18n.md §3)
├── resources/lang/{pt-BR,es,en}/*.json   # mensagens de negócio (i18n.md §3)
├── database/
│   ├── migrations/<NN>-migrate-<descrição>.ts
│   ├── remodels/<descrição>.ts      # manual, destrutivo, dry-run por padrão
│   └── runners/{migration,remodel}-runner.ts
└── tests/{setup.unit.ts, setup.e2e.ts, <tema>-fixtures.ts}
```

Repository Mongo: `<entidade>.mongo.repository.ts` sobre o driver `mongodb`
(_doc-lib/mongodb.md). Detalhes do perfil em `backend-fastify.md`.

## 4. Árvore do frontend

```
frontend/
├── package.json  tsconfig.json  eslint.config.js  prettier.config.js
├── vite.config.ts  vitest.config.ts  components.json  Dockerfile-production
├── .env.example                     # só VITE_* público
├── public/                          # só nome estável: favicon, manifest (frontend.md §9.6)
├── project.inlang/settings.json  messages/{pt-BR,es,en}.json   # i18n.md
├── scripts/check-chunk-cycles.mjs (+ .test.ts)
├── e2e/{playwright.config.ts, <fluxo>.spec.ts, support/{test.ts, <tema>.ts}}
└── src/
    ├── router.tsx  start.ts  env.ts  styles.css
    ├── server.ts                    # paraglideMiddleware(req, () => handler.fetch(req)), i18n.md §2
    ├── routeTree.gen.ts             # gerado, commitado
    ├── assets/                      # imagem e fonte importadas (frontend.md §9.6)
    ├── extensions/                  # opcional: tela de extensão (§3.1)
    ├── paraglide/                   # gerado, não versionado
    ├── test/<nome>.setup.ts         # setupFiles do Vitest: stub que precisa existir antes de todo teste
    ├── routes/
    │   ├── __root.tsx  health-check.ts  sitemap[.]xml.ts  robots[.]txt.ts   # frontend.md §9.7
    │   ├── _authentication/{layout.tsx, <tela>/{index,index.lazy}.tsx, -components/}
    │   ├── _public/{layout.tsx, <área>/…, -components/}
    │   └── _private/
    │       ├── layout.tsx           # portão único: sessão
    │       └── <área>/
    │           ├── layout.tsx       # guard de capacidade da área
    │           └── <recurso>/
    │               ├── index.tsx  index.lazy.tsx  new.lazy.tsx
    │               ├── $id/{index,edit}.tsx  $id/{index,edit}.lazy.tsx
    │               ├── -search.ts   # validateSearch da rota (nunca inline)
    │               ├── -use-<nome>.ts   # hook de uma rota só (frontend.md §1.1)
    │               └── -components/{table,columns,filters,row-actions,bulk-actions,detail,
    │                                form-fields,form-create,form-edit}.tsx  (+ <peça>/index.ts)
    ├── components/
    │   ├── ui/                      # shadcn (Base UI); só variante cva e rótulo, marcados // casa:
    │   └── common/<peça>/{<peça>.tsx, <peça>-<parte>.tsx, <peça>-context.ts, index.ts, <peça>.test.tsx}
    ├── hooks/
    │   ├── use-<nome>.ts
    │   └── tanstack-query/_query-keys.ts
    ├── integrations/
    │   ├── tanstack-query/{http.ts, http.server.ts, query-context.ts, invalidate.ts,
    │   │                   queries/<módulo>.ts, mutations/<módulo>.ts}
    │   └── react-hook-form/app-field.tsx
    └── lib/{cn,labels,i18n,form-errors,form-a11y,list-search,redirect-search,page-head,sitemap,
             load-or-not-found,local-store,bulk,chunking,upload-transport,upload-resume,dialog-handle}.ts
             + <tema>.ts, cada um com .test.ts ao lado
```

Validators (Zod), enums, value objects e tipos de resposta **não** existem no frontend: vêm de
`@<projeto>/shared` (§9), também em projeto Adonis. A regra completa de cada pasta está em `frontend.md`.

## 5. Adaptadores por tecnologia

O que muda por framework, e só isto:

| Ponto | AdonisJS | Fastify + fastify-decorators |
|---|---|---|
| Registro de rota | `start/routes.ts`, apontando para o controller da ação | decorator no controller (`@Controller`, `@POST`), bootstrap por diretório `app/features` |
| DI | `@inject()` + container; contrato ligado em provider | `@Service()` + registry de contratos |
| Model | Lucid (`models/<entidade>.ts` estende o schema gerado) | driver `mongodb` tipado |
| Repository | `<entidade>.lucid.repository.ts` | `<entidade>.mongo.repository.ts` |
| Transação | `db.transaction()` dentro da implementação (`domain.md`) | sessão do driver `mongodb` dentro da implementação |
| Policy | `BasePolicy` + `ctx.bouncer` | classe injetável *(opinião da casa)* |
| Teste | Japa: suítes `unit` e `functional` (§8) | Vitest: configs `unit` e `e2e` (§8) |
| Env | `Env.create` em `start/env.ts` | leitor síncrono em `start/env.ts` |
| i18n | `@adonisjs/i18n` | service injetado (`i18n.md`) |
| Erro → HTTP | `exceptions/handler.ts` | `setErrorHandler` em `exceptions/handler.ts` |
| Health check | `router.get('/health-check', …)` → `#features/health-check.controller` | `@GET('/health-check')` em `features/health-check.controller.ts` |

Tecnologia nova entra na casa adicionando **uma coluna** nesta tabela, não uma árvore nova.

## 6. Como verificar

- `pattern:check` cobra a árvore inteira (raiz, `shared/`, backend, frontend): pasta ou sufixo fora
  deste documento, ação fora de pasta, feature importando outra feature, classe/código/tag que
  não derivam do caminho, import de `zod` nos validators fora de `shared/src/validator.ts`, import de `@vinejs/vine` fora de `core/validator.ts` e `app/validators/` do Adonis, validator do Adonis sem par no `shared/`.
- A **direção das camadas** (§2) é cobrada por regra de import: `features/` não importa `models/`
  nem implementação concreta de repository/service; `domain/` não importa nada além de `core/` e
  `shared/`; `models/` só é importado por `repositories/`. *(opinião da casa; ferramenta:
  `pattern:check` ou dependency-cruiser)*
- Exceção da regra fica em `scripts/pattern-check.config.ts`, cada uma com motivo; exceção sem
  uso reprova o check.
- Projeto atual que diverge migra; o roteiro está em `MIGRATIONS.md`.

## 7. Health check — obrigatório e independente em `/health-check` *(opinião da casa)*

**Obrigatório nos dois apps.** Todo backend e todo frontend da casa expõem **cada um o seu**
`GET /health-check`, com esse nome exato. Não há alias: `/health`, `/healthz`, `/status`, `/ping`
ou `/` como sonda são desvio, e a rota antiga sai no mesmo commit que troca o probe. Nenhum consulta
o outro para responder: o do frontend não chama a API, o do backend não chama o frontend.
**Por quê**: os dois sobem e caem sozinhos; probe que depende do vizinho reinicia um app saudável
porque o outro caiu. Probe em `/` do frontend mede "o SSR e a API responderam a tempo" e tira do ar
um frontend vivo quando a API está lenta.

Quem aponta para a rota, sempre o mesmo path:

- `HEALTHCHECK` do `Dockerfile-production` e `healthcheck:` do compose de produção (`tooling.md` §8);
- healthcheck configurado no painel da plataforma (Coolify), que **sobrepõe** o do Dockerfile:
  anotado em `docs/ARCHITECTURE.md` (seção de produção) do projeto;
- smoke test do deploy (`tooling.md` §8).

Cobrança: o `pattern:check` reprova backend sem `router.get('/health-check', …)` (Adonis) ou
`@GET('/health-check')` (Fastify), frontend sem `src/routes/health-check.ts`, e qualquer rota,
`HEALTHCHECK` ou `healthcheck:` de compose com outro path de sonda. O `.e2e.spec.ts` do controller
confere `200`, `Cache-Control: no-store` e o corpo.

- Resposta: `200`, `Cache-Control: no-store`, corpo mínimo `{ "status": "ok" }`. Sem auth, sem
  detalhe de infraestrutura (versão, banco, memória).
- É **liveness**. Checagem detalhada (no Adonis, `HealthChecks` com `DbCheck`/`MemoryHeapCheck`) é
  opcional e, quando existe, vai para outra rota **protegida** — a resposta expõe infraestrutura
  interna. _doc-lib/adonisjs.md#guides/digging-deeper/health-checks.
- Backend: controller solto em `app/features/health-check.controller.ts` (sem módulo, infra pura);
  registro por framework na tabela do §5.
- Frontend (TanStack Start): `src/routes/health-check.ts` com `server.handlers.GET` devolvendo
  `Response` crua, sem componente nem hidratação. _doc-lib/tanstack-start.md#guide/server-routes.

```ts
// frontend: src/routes/health-check.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health-check')({
  server: {
    handlers: {
      GET: () =>
        Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } }),
    },
  },
})
```

O path diverge do `/health` dos exemplos da doc (Adonis, Nitro) de propósito: um nome só em todo
projeto, igual nos dois lados (`DECISIONS.md` #102).

## 8. Testes por camada — unitário e E2E *(opinião da casa)*

Toda camada tem teste, escrito antes do código (TDD: `domain.md` §6). **Unitário** roda sem
banco, sem HTTP e sem container de serviço; **E2E** sobe a aplicação de verdade e fala com banco
e serviços reais em container. Um não substitui o outro: o unitário pega a regra (ramo, limite,
cálculo) rápido; o E2E pega a costura (rota, middleware, policy, banco, serialização). Na sessão que
executa um plano, o unitário acompanha cada fase e o E2E roda só na fase final (`tooling.md` §10.1).

| Perfil | Unitário | E2E | Base |
|---|---|---|---|
| Backend AdonisJS | **Japa**, suíte `unit`: `<x>.unit.spec.ts` | **Japa**, suíte `functional`: `<x>.e2e.spec.ts` com `@japa/api-client` | _doc-lib/adonisjs.md#guides/testing/introduction, #guides/testing/api-tests |
| Backend Fastify | **Vitest**, config `unit`: `<x>.unit.spec.ts` | **Vitest**, config `e2e`: `<x>.e2e.spec.ts` | _doc-lib/vitest.md#guide |
| `shared/` | **Vitest**: `<x>.test.ts` ao lado | — | _doc-lib/vitest.md#guide |
| Frontend | **Vitest**: `<x>.test.ts(x)` ao lado | **Playwright**: `e2e/<fluxo>.spec.ts`, contra o backend real em container | _doc-lib/vitest.md#guide; _doc-lib/playwright.md#docs/intro |

O sufixo separa o runner: a suíte E2E nunca pega `*.unit.spec.ts`, e a unitária nunca sobe banco.

**E2E não divide banco entre processos.** O Japa roda os testes em série num processo; suíte em
paralelo (`concurrently`) só junta a `unit`, que não abre banco, a uma `functional`
(_doc-lib/japa.md#docs/test-suites). `--shard` só em job de CI separado, cada um com o próprio
banco em `services:` (_doc-lib/japa.md#docs/filtering-tests). No Fastify, a config `e2e` do Vitest
desliga `fileParallelism` no project que fala com o banco (_doc-lib/vitest.md#config/fileparallelism).

**O que cada camada leva:**

| Camada | Unitário | E2E |
|---|---|---|
| entidade e value object | toda transição e invariante, sem dublê nenhum | — |
| use-case | cada ramo do `Either`, com memory repository e fakes dos services | a ação pela rota: sucesso, 401, 403, 404, 409, 422 (`backend.md` §7) |
| repository | — | **teste de contrato**: a mesma suíte roda na implementação real e na de memória |
| controller | — (controller é fino) | coberto pelo E2E da ação |
| validator (`shared/`; no Adonis também o VineJS do backend, e o spec de paridade) | regra, mensagem nos três idiomas, teto de tamanho | 422 com o campo, no E2E da ação |
| policy | matriz papel × ação | 403/404 no E2E da ação |
| service de I/O | implementação contra dublê do cliente externo | contra o serviço real em container (MinIO, Redis, SMTP de teste) |
| model, migration | — | contra o banco real, via teste do repository |
| middleware | lógica pura, se houver | `<nome>.middleware.e2e.spec.ts` (cookie, CORS, papéis, idioma) |
| `_shared`, `core/`, `lib/` puros | sempre | — |
| script de guard-rail (`pattern:check`, `authz:check`) | `scripts/<nome>.unit.spec.ts` | — |
| frontend hook e componente de `common/` | comportamento, com Testing Library | — |
| frontend rota e fluxo de `USER-FLOWS.md` | — | um spec por fluxo crítico (`documentation.md`) |

"—" quer dizer que a outra coluna já cobre aquela camada, não que ela fica sem teste.

## 9. Raiz do repositório e `shared/`

Um repositório por produto, monorepo com **pnpm workspace** (`DECISIONS.md` #110).

```
<projeto>/
├── AGENTS.md  CLAUDE.md             # documentation.md §3
├── README.md                        # opcional, pt-BR
├── package.json                     # scripts de topo + devDeps de repositório (commitlint, husky)
├── pnpm-workspace.yaml              # packages: backend, frontend, shared
├── pnpm-lock.yaml                   # um lockfile, na raiz
├── .commitlintrc.json  .gitignore
├── .husky/{pre-commit,commit-msg}   # um hook para o repositório inteiro (tooling.md)
├── .github/
│   ├── dependabot.yml               # tooling.md §9
│   └── workflows/{ci,commitlint,main,main-check-backend,main-check-frontend,main-build-frontend,
│                  main-docker-backend,main-docker-frontend,main-deploy-coolify}.yml   # tooling.md §8.1
├── docs/{PRD,ARCHITECTURE,RULES,DESIGN,USER-FLOWS,TASKS,MEMORY,ENV,CHANGELOG,DECISIONS,SECURITY,TEST-PLAN}.md
├── .specs/features/<feature>/       # tlc-spec-driven, durante a feature
├── _standards/  _doc-lib/  _doc-lib.md  SKILLS-MAP.md  .claude/skills/   # cópia da régua, não se edita
├── shared/                          # @<projeto>/shared
├── backend/                         # §3
└── frontend/                        # §4
```

```
shared/
├── package.json                     # "@<projeto>/shared", "private": true, exports e files em dist/ (tooling.md §1); dependência: zod (+ @tiptap/* do texto rico)
├── tsconfig.json  tsconfig.build.json  vitest.config.ts   # build: src/ → dist/ (.js + .d.ts), dist/ no .gitignore
└── src/
    ├── index.ts                     # o que o pacote exporta, e só isto
    ├── either.ts                    # Either<L, R>, left, right: usado por value objects, domínio e use-case
    ├── validator.ts                 # z configurado (z.config + locale) + regras compartilhadas + mensagens das regras (pt-BR/es/en)
    ├── validators/<módulo>/<recurso>.validator.ts   # um arquivo por recurso, schema Zod usado pelos dois lados (Adonis: só pelo frontend; o backend tem o par em app/validators/)
    ├── enums/<nome>.ts              # POST_STATUS / PostStatus / POST_STATUSES
    ├── value-objects/<nome>.ts      # Cpf, Cnpj, Email, Phone: create() devolve Either; formatação pura
    ├── records/<contexto>.ts        # tipo de registro e constante que os dois lados leem (Table, Row, User); sem schema
    ├── rich-text-schema.ts          # lista única de extensões do Tiptap + conversão HTML/Markdown → JSON (editor e migration)
    └── responses/<módulo>/<recurso>.response.ts     # schemas Zod de resposta + tipos (§10)
```

- **Onde mora cada mensagem** (`i18n.md` §3): mensagens de regra Zod ficam em
  `shared/src/validator.ts`, nos três idiomas, e valem igual nos dois lados (no Adonis, as do VineJS
  ficam no backend, em `start/validator.ts`); mensagens de erro de
  negócio do backend (`HTTPException.message`) ficam em `resources/lang/{pt-BR,es,en}/` e saem pelo
  i18n do backend.
- **Entra em `shared/` só o que é puro e roda igual nos dois lados.** Entidade com comportamento,
  model, repository e service ficam no backend: dependem de banco ou de API externa e nunca vão
  para o navegador.
- Backend e frontend dependem de `"@<projeto>/shared": "workspace:*"`. Cada app continua com o
  próprio build e o próprio deploy; o Dockerfile de cada um constrói a partir da raiz para enxergar
  `shared/`.
- **`shared/` nunca se publica** (npm, registry ou imagem Docker própria): vai compilado dentro da
  imagem de cada app pelo `pnpm deploy` (`tooling.md` §1 e §8.2, `DECISIONS.md` #224).
- Fora da árvore (desvio): `.idea/`, `.vscode/`, `.claude/worktrees/` versionados; relatórios de
  rodada e pastas de resultado na raiz; docs soltos (`*-MAP.md`, `MIGRACAO-*.md`, `_doc-*.md`), que
  viram `docs/`; pacote de teste separado na raiz (`backend-test/`, `frontend-test/`).

## 10. Contrato de endpoint — request e response tipados uma vez *(opinião da casa)*

Toda rota do frontend e todo formulário falam com um endpoint do backend. O **contrato** desse
endpoint (o que entra e o que sai) é definido **uma vez**, em `shared/`, e os dois lados usam o
mesmo tipo. Tipo de request ou de response redigitado à mão, no front ou no back, é desvio.

| Parte | Onde | Forma |
|---|---|---|
| request (body, params, query) | `shared/src/validators/<módulo>/<recurso>.validator.ts` | schema Zod `<Módulo><Recurso><Ação>Validator` + `type <Módulo><Recurso><Ação>Payload = z.infer<typeof …>` (Adonis: o backend valida com o par VineJS de `app/validators/`, mesmo caminho e nome) |
| response | `shared/src/responses/<módulo>/<recurso>.response.ts` | schema Zod `<Módulo><Recurso><Ação>Response` + `type … = z.infer<typeof …>` |
| envelope de erro e paginação | `shared/src/responses/envelope.ts` | `ErrorEnvelope`, `Paginated<T>` |

```ts
// shared/src/responses/administrator/posts.response.ts
export const AdministratorPostShowResponse = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(POST_STATUSES),
  archivedAt: z.string().nullable(),
})
export type AdministratorPostShowResponse = z.infer<typeof AdministratorPostShowResponse>
```

- **Paridade Adonis (VineJS x Zod):** o validator do backend e o do `shared/` têm o mesmo caminho
  (`app/validators/…` espelha `shared/src/validators/…`) e o mesmo nome. Um spec de paridade
  (`validators:check`) reprova validator sem par, de caminho ou de nome, e campo, tipo ou teto que
  divergem entre os dois. No Fastify não há par: o schema é um só.
- **Backend:** o controller valida o request com o validator; o use-case devolve
  `Either<HTTPException, AdministratorPostShowResponse>`; o registro de resposta do OpenAPI aponta
  o mesmo schema (`openapi.md`). Quem monta a resposta a partir da entidade é um *presenter* do
  recurso (`<recurso>.presenter.ts` na pasta do recurso), um método por forma de resposta.
- **Frontend:** `queryOptions`/mutation tipam pelo mesmo tipo; o formulário usa o validator Zod do `shared/`
  (`frontend.md` §4). O corpo da resposta vira tipo num **único ponto**, em
  `integrations/tanstack-query/http.ts`, nunca `as` espalhado (`typescript.md` §2).
- **Dado dinâmico** (campos definidos pelo usuário, como as tabelas e as rows do lowcodejs): o tipo
  continua controlado, porque o esquema é montado em tempo de execução **a partir da definição dos
  campos, que é conhecida**. Não há desculpa para `any`, `Record<string, unknown>` solto ou
  `typeof` sobre o valor (`typescript.md` §2.1). A forma:

```ts
// shared/src/dynamic/field.ts — o vocabulário fechado de tipos de campo
export const FIELD_TYPE = { TEXT: 'TEXT', NUMBER: 'NUMBER', DATE: 'DATE', BOOLEAN: 'BOOLEAN', RELATION: 'RELATION' } as const
export type FieldType = (typeof FIELD_TYPE)[keyof typeof FIELD_TYPE]

// cada tipo de campo diz exatamente que valor aceita
export type FieldValueMap = {
  TEXT: string
  NUMBER: number
  DATE: string            // ISO 8601
  BOOLEAN: boolean
  RELATION: readonly string[]
}

export type FieldDefinition = { readonly slug: string; readonly type: FieldType; readonly required: boolean }

// valor de célula: união discriminada pelo tipo do campo (o switch sobre `type` é o tipo declarado)
export type FieldValue = { [T in FieldType]: { readonly type: T; readonly value: FieldValueMap[T] | null } }[FieldType]

// linha: slug do campo → valor tipado
export type Row = { readonly id: string; readonly values: Readonly<Record<string, FieldValue>> }
```

```ts
// shared/src/dynamic/row-schema.ts — um construtor de schema, o mesmo nos dois lados
export class RowSchemaBuilder {
  private static readonly RULES = {
    TEXT: () => z.string().trim(),
    NUMBER: () => z.number(),
    DATE: () => z.iso.datetime(),
    BOOLEAN: () => z.boolean(),
    RELATION: () => z.array(z.string()),
  } satisfies Record<FieldType, () => z.ZodType>

  static build(fields: readonly FieldDefinition[]) {
    // regra por tipo vem do lookup; obrigatoriedade vem da definição
    return z.object(Object.fromEntries(fields.map((field) => [field.slug, RowSchemaBuilder.rule(field)])))
  }

  private static rule(field: FieldDefinition) {
    const rule = RowSchemaBuilder.RULES[field.type]()
    if (field.required) return rule
    return rule.optional()
  }
}
```

  - A **definição da tabela** (`FieldDefinition[]`) é dado tipado como qualquer outro: vem do banco
    pelo repository, validada por schema próprio.
  - O **payload de criar/editar row** é validado pelo schema que `RowSchemaBuilder.build(fields)`
    monta para aquela tabela, no backend e no formulário do frontend. No projeto Adonis o backend monta o par em VineJS (`vine.object` a partir da mesma definição, em `app/validators/`) e o spec de paridade cobre os dois construtores. Depois da validação, o valor é
    `FieldValue`, e quem precisa do valor de um campo faz `switch` em `value.type`.
  - O **driver** (Mongo ou Postgres) converte `FieldValue` ↔ coluna/documento dentro do repository
    da row, num lookup por `FieldType`. Tipo de campo novo entra no `FIELD_TYPE`, no `FieldValueMap`,
    no `RULES` do builder e no lookup do driver; o `satisfies Record<FieldType, …>` faz o compilador
    apontar cada lugar que faltou.
