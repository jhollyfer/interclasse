# Arquitetura da casa

Uma arquitetura só para todo projeto, **independente da tecnologia**. Mesma filosofia, mesmas
camadas, mesmos diretórios, mesmos nomes. O framework (AdonisJS, Fastify, ou o que vier) muda o
**como** dentro de cada camada — nunca o **onde** nem o **o quê**. Os arquivos de perfil
(`backend.md`, `backend-fastify.md`, `frontend.md`) descrevem só esse "como".

Autoridade continua a mesma: `_doc-lib/` (doc oficial) é o contrato de cada lib. Esta estrutura
é **escolha** que todas as docs da stack permitem — nenhuma delas impõe árvore de diretório
para feature — e por isso é marcada *(opinião da casa)* onde a doc não fala.

---

## 1. Filosofia

1. **Fatia vertical.** Uma operação é uma pasta com tudo dela: entrada, regra, teste. Achar o
   código de "arquivar post" é abrir uma pasta, não cinco.
2. **Regra de negócio mora no use-case.** Controller só traduz HTTP; service só faz I/O; model
   só descreve dado; policy só autoriza.
3. **Falha esperada é valor** (`Either<HTTPException, T>`), exceção é bug.
4. **Dependência entra pelo construtor**; I/O externo entra por contrato (`solid.md`).
5. **Dado de fora é `unknown` até o validator** — o mesmo validator, nos dois lados.
6. **Toda função tem casa** (`typescript.md` §6). Pasta genérica (`utils/`, `helpers/`) não existe.
7. **Doc oficial é contrato**; padrão aplica a doc; código segue o padrão.
8. **Mesmo nome para a mesma coisa** em todo projeto: quem abre um projeto novo já sabe onde está tudo.
9. **Sem duplicidade; procure antes de criar** *(opinião da casa)*. Antes de escrever função,
   hook, componente, service, regra de validator ou tipo, procure o que já existe
   (code-review-graph, `grep`, `core/`, `components/common/`, `lib/`) e reuse ou estenda. A
   mesma lógica em dois lugares sobe para a casa dela (`_shared`, service, `core/`, `lib/`,
   `components/common/`). Vale para a régua também: regra escrita uma vez, os outros arquivos
   apontam. **Por quê:** cópia diverge na primeira mudança, e o bug corrigido num lugar segue
   vivo no outro.

## 2. Camadas

| Camada | Responsabilidade | Pode depender de | Nunca |
|---|---|---|---|
| `core/` | tipos e mecanismos transversais: `Either`, entidades/enums, exceção HTTP, VineJS configurado, envelope de resposta, OpenAPI | nada do projeto | importar de `features/` ou `services/` |
| `features/` | operações (controller + use-case + validator + spec) | `core`, `services` (contratos), `models`, `policies` | importar de outra feature (compartilhado vai para `_shared` ou service) |
| `services/` | I/O e políticas com dependência (e-mail, storage, fila, API externa) | `core`, `models` | importar de `features/` |
| `models/` | forma do dado e acesso (ORM ou driver) | `core` | regra de negócio |
| `policies/` | "quem pode" por registro | `core`, `models` | consultar banco por conta própria além do alvo recebido |
| `middleware/` | transversal de requisição (auth, papel, tenant) | `core`, `services` | regra de negócio de uma feature |
| `exceptions/` | tradução de erro → resposta HTTP | `core` | — |

A seta é sempre para dentro: `features → services/models/policies → core`.

## 3. Árvore do backend

```
backend/
├── app/
│   ├── core/
│   │   ├── either.ts
│   │   ├── entity.ts              # enums `as const`, Merge, constantes (PAGINATION…)
│   │   ├── validator.ts           # vine configurado + regras compartilhadas (cpf, slug…), mensagens pt-BR
│   │   ├── response.ts            # envelope { message, status, code, errors? }, Paginated<T>
│   │   └── openapi/
│   ├── features/
│   │   ├── health-check.controller.ts   # GET /health-check, infra pura, sem módulo (§7)
│   │   └── <módulo>/              # papel ou domínio: administrator, account, catalog…
│   │       ├── _shared.<tema>.ts  # função pura usada por 2+ recursos do módulo
│   │       └── <recurso>/         # users, posts…
│   │           ├── <recurso>.validator.ts
│   │           └── <ação>/        # create, paginate, show, update, archive…
│   │               ├── <ação>.controller.ts
│   │               ├── <ação>.use-case.ts
│   │               └── <ação>.spec.ts
│   ├── services/
│   │   └── <nome>/
│   │       ├── <nome>-contract.service.ts   # abstract class (só para I/O externo)
│   │       └── <nome>.service.ts
│   ├── models/<entidade>.ts
│   ├── policies/<entidade>.policy.ts
│   ├── middleware/<nome>.middleware.ts
│   └── exceptions/
│       ├── http.exception.ts
│       └── handler.ts
├── start/                         # boot: env.ts, rotas/kernel, registro de DI
├── config/
├── database/
│   ├── migrations/
│   ├── seeders/                   # <nome>.seed.ts; dev/ = seed manual (backend.md §3)
│   └── factories/                 # <entidade>.factory.ts, só para spec
└── tests/                         # só infraestrutura de teste: helpers, fixtures, setup
```

Regras da árvore:

- **Ação é pasta**, sempre, inclusive a trivial. O nome da pasta é o verbo em kebab-case e os
  três arquivos repetem o verbo (`archive/archive.controller.ts`).
- **Validator é um por recurso** (`<recurso>.validator.ts`), com um export por ação
  (`PostCreateValidator`, `PostUpdateValidator`). Bloco reusável entre recursos é **função** em
  `core/validator.ts`. Ninguém importa `@vinejs/vine` direto: o `vine` configurado sai de
  `core/validator.ts`.
- **Spec fica ao lado da ação.** `tests/` guarda só o que serve a várias specs.
- **Nome de arquivo é kebab-case com sufixo de papel**: `.controller.ts`, `.use-case.ts`,
  `.validator.ts`, `.service.ts`, `-contract.service.ts`, `.policy.ts`, `.middleware.ts`,
  `.spec.ts`. Gerador de framework que produza outro formato (snake_case) é renomeado —
  exceto migration, cujo nome o framework registra (`backend.md` §3).
- **Classe deriva do caminho**: `features/administrator/users/archive/` →
  `AdministratorUserArchiveController`, `AdministratorUserArchiveUseCase`.
- Alias de import por subpath imports do `package.json` (`#core/*`, `#features/*`, `#services/*`,
  `#models/*`, `#policies/*`, `#middleware/*`, `#exceptions/*`, `#start/*`, `#config/*`) —
  nativo do Node, igual em qualquer framework.

### 3.1 Camadas opcionais — só quando o projeto precisa *(opinião da casa)*

Não nascem vazias "para depois" (YAGNI). Entram quando a necessidade aparece, com esta forma:

| Camada | Forma | Quando |
|---|---|---|
| `app/extensions/<grupo>/<nome>/` | `manifest.json` (metadados), `boot.ts` (registro), `<nome>.service.ts`, `<nome>.types.ts` (contrato de dado da extensão) | produto com funcionalidade instalável/opcional (plugin). Descoberta por varredura de pasta no boot, nunca lista manual; DI pelo mesmo registro de `services/` |
| `app/hooks/<nome>/` | `<nome>-contract.service.ts` + `<nome>.service.ts`, igual a `services/` | lógica de ciclo de vida do framework que não é uma requisição (`onReady`, `onRequest` global, carga de extensões). Registrada no boot pelo mesmo mecanismo de DI |
| `app/core/tenant-scope.ts` | escopo de execução por `AsyncLocalStorage` (`node:async_hooks`), lido por toda consulta | app multi-tenant. Falta de escopo no contexto **lança** (erro fechado), nunca vira "sem filtro" — escopo vazio que filtra tudo é vazamento entre tenants |

Varredura de pasta por convenção (controllers, contrato/impl, extensões) usa **um** utilitário de
listagem em `core/` — não um `readdir` por mecanismo —, e o log de carga (`✓` sucesso, `⚠`
aviso) só imprime fora de produção.

## 4. Árvore do frontend

Já é a mesma nos projetos; a regra completa está em `frontend.md` §1. Resumo:

```
frontend/src/
├── routes/<grupo>/<área>/{index.tsx, index.lazy.tsx, -components/}
├── components/{ui,common}/
├── hooks/
├── integrations/{tanstack-query,react-hook-form}/
├── validators/<módulo>/<recurso>.validator.ts   # espelho do backend, mesmo nome de export
├── lib/
├── routes/health-check.ts   # GET /health-check, rota de servidor (§7)
└── env.ts
```

O validator do frontend tem o **mesmo caminho lógico e o mesmo nome de export** do backend
(`features/catalog/posts/posts.validator.ts` ↔ `validators/catalog/posts.validator.ts`). Um
script de paridade compara os dois (`tooling.md`).

## 5. Adaptadores por tecnologia

O que muda por framework, e só isto:

| Ponto | AdonisJS | Fastify + fastify-decorators |
|---|---|---|
| Registro de rota | `start/routes.ts`, apontando para `#features/.../<ação>/<ação>.controller` | decorator no controller (`@Controller`, `@POST`), bootstrap por diretório `app/features` |
| DI | `@inject()` + container; contrato ligado em provider | `@Service()` + `injectablesHolder`/registry de contratos |
| Model | Lucid (`models/<entidade>.ts` estende o schema gerado) | driver `mongodb` tipado (`models/<entidade>.ts` exporta tipo + coleção) |
| Policy | `BasePolicy` + `ctx.bouncer` (doc do Bouncer) | classe injetável *(opinião da casa)* |
| Teste | Japa, suíte com glob `app/**/*.spec.ts` | Vitest, mesmo glob |
| Env | `Env.create` em `start/env.ts` | leitor síncrono em `start/env.ts` |
| Erro → HTTP | `exceptions/handler.ts` | `setErrorHandler` registrado no boot, em `exceptions/handler.ts` |
| Health check | `router.get('/health-check', …)` em `start/routes.ts` → `#features/health-check.controller` | `@Controller` + `@GET('/health-check')` em `features/health-check.controller.ts` |

Tecnologia nova entra na casa adicionando **uma coluna** nesta tabela, não uma árvore nova.

## 6. Como verificar

- `pattern:check` cobra a árvore: ação fora de pasta, validator fora de `<recurso>.validator.ts`,
  import de `@vinejs/vine` fora de `core/validator.ts`, feature importando outra feature, nome de
  classe que não deriva do caminho, sufixo de arquivo errado.
- Projeto atual que diverge migra; o roteiro está em `MIGRACOES.md`.

## 7. Health check — independente em `/health-check` *(opinião da casa)*

Backend e frontend expõem **cada um o seu** `GET /health-check`. Nenhum consulta o outro para
responder: o do frontend não chama a API, o do backend não chama o frontend. **Por quê**: os dois
sobem e caem sozinhos (`tooling.md` §1); probe que depende do vizinho reinicia um app saudável
porque o outro caiu.

- Resposta: `200`, `Cache-Control: no-store`, corpo mínimo `{ "status": "ok" }`. Sem auth, sem
  detalhe de infraestrutura (versão, banco, memória).
- É **liveness**. Checagem detalhada (no Adonis, `HealthChecks` com `DbCheck`/`MemoryHeapCheck`) é
  opcional e, quando existe, vai para outra rota **protegida** — a resposta expõe infraestrutura
  interna. _doc-lib/adonisjs.md#guides/digging-deeper/health-checks.
- Backend: controller solto em `app/features/health-check.controller.ts` (sem módulo, infra pura);
  registro por framework na tabela do §5.
- Frontend (TanStack Start): `src/routes/health-check.ts` com `server.handlers.GET` devolvendo
  `Response` crua, sem componente nem hidratação. _doc-lib/tanstack-start.md#guide/server-routes.
  Sem Start, rota Nitro `server/routes/health-check.get.ts`. _doc-lib/nitro.md#docs/routing.

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
projeto, igual nos dois lados (`DECISOES.md` #102).
