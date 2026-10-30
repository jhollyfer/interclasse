# Domínio, persistência e camadas *(opinião da casa)*

Como a regra de negócio, a persistência e os testes se organizam no backend. A árvore está em
`architecture.md` §3; aqui está a forma de cada peça. Base: DDD tático, SOLID, Clean Architecture e
TDD das skills `tactical-ddd`, `solid`, `codebase-design`, `tdd` e `tlc-spec-driven` (extração em
`_map/scan-2026-10/FOUNDATIONS.md`), aplicados dentro do que as docs da stack permitem.

**Onde a régua sai da doc oficial, e por quê.** O Lucid é Active Record e a doc do Adonis usa o
model direto no service/controller; nenhuma doc da stack define repository nem camada de domínio.
A casa põe as duas por cima (`DECISIONS.md` #111) para isolar a regra de negócio do ORM e testar
use-case sem banco. Tudo o que fica **dentro** de cada camada segue a doc: `@inject()` e container,
`{ client: trx }` e `db.transaction()` do Lucid, driver `mongodb`, Japa e Vitest como a doc
configura. *Página oficial não conferida nesta revisão (rede bloqueada): conferir as entradas
citadas antes de usar o exemplo como contrato.*

---

## 1. Entidade

Classe com comportamento: o dado e a regra que o protege moram juntos. Verbo do negócio
(`archive`, não `setStatus`).

```ts
// app/domain/post/post.entity.ts
import { left, right, type Either } from '@<projeto>/shared/either'
import type { Slug } from '@<projeto>/shared/value-objects/slug'
import { POST_STATUS, type PostStatus } from '@<projeto>/shared/enums/post-status'
import type { PostError } from './post.errors.js'

export type PostProps = {
  readonly id: string
  readonly authorId: string          // outro agregado entra só por id
  title: string
  slug: Slug
  status: PostStatus
  archivedAt: Date | null
}

export class Post {
  private constructor(private readonly props: PostProps) {}

  // nascimento: valida invariantes; id e relógio chegam de fora (domínio sem I/O)
  static create(input: { id: string; authorId: string; title: string; slug: Slug }): Either<PostError, Post> {
    if (input.title.trim().length === 0) return left({ code: 'POST_TITLE_EMPTY' })
    return right(new Post({ ...input, status: POST_STATUS.DRAFT, archivedAt: null }))
  }

  // reidratação pelo repository: o dado já passou pelas invariantes quando foi gravado
  static restore(props: PostProps): Post {
    return new Post({ ...props })
  }

  archive(at: Date): Either<PostError, Post> {
    if (this.props.status === POST_STATUS.ARCHIVED) return left({ code: 'POST_ALREADY_ARCHIVED' })
    this.props.status = POST_STATUS.ARCHIVED
    this.props.archivedAt = at
    return right(this)
  }

  canDelete(): boolean {
    return this.props.status === POST_STATUS.ARCHIVED
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<PostProps> {
    return { ...this.props }
  }
}
```

- Construtor **privado**: só `create` (valida) ou `restore` (persistência) produzem a entidade.
- Toda transição devolve `Either<fato de domínio, …>`; `throw` só para bug.
- Sem setter público, sem getter "por garantia"; leitura em bloco por `snapshot()`.
- Entidade nunca importa model, `db`, `HttpContext`, `HTTPException`, Zod, VineJS nem framework.
- Sem classe base genérica (`Entity<T>`, `AggregateRoot`) antes do segundo uso real.
- Intensidade proporcional: recurso sem invariante tem entidade fina, e isso não é anemia.
- **Id que sai para fora (URL, payload) não é sequencial**: UUID (v4/v7) ou ObjectId, gerado fora
  da entidade e passado no `create`. Inteiro autoincremento revela volume e convida a adivinhar.
  Código curto que humano digita é outra coisa (`backend.md` §5).
- **Transição de estado é tabela na entidade**, não classe por estado: as transições permitidas
  moram num objeto `satisfies Record<Status, readonly Status[]>` no arquivo da entidade, e o
  método verbo consulta a tabela (§11).
- **Hook de model só faz mecânica de persistência** (`@beforeCreate` para UUID, `@beforeSave` para
  hash de senha). Invariante de negócio mora aqui, na entidade: hook não dispara em update em
  massa nem no teste unitário. A doc chama hook de lugar "para invariantes do model"
  (_doc-lib/lucid.md#model-hooks); a casa lê isso como invariante **da linha**, e a regra de
  negócio fica na entidade *(opinião da casa sobre a doc, `DECISIONS.md` #111)*.

## 2. Fatos de domínio e tradução para HTTP

O domínio fala em fatos, sem status HTTP nem texto de tela. O use-case traduz por tabela, e o
compilador cobra que todo fato tenha tradução:

```ts
// app/domain/post/post.errors.ts
export type PostError =
  | { readonly code: 'POST_TITLE_EMPTY' }
  | { readonly code: 'POST_ALREADY_ARCHIVED' }
  | { readonly code: 'POST_HAS_COMMENTS'; readonly count: number }

// features/administrator/posts/archive/archive.use-case.ts
private static readonly HTTP = {
  POST_TITLE_EMPTY: () => HTTPException.BadRequest(t('posts.title_empty'), 'POST_TITLE_EMPTY'),
  POST_ALREADY_ARCHIVED: () => HTTPException.Conflict(t('posts.already_archived'), 'POST_ALREADY_ARCHIVED'),
  POST_HAS_COMMENTS: () => HTTPException.Conflict(t('posts.has_comments'), 'POST_HAS_COMMENTS'),
} satisfies Record<PostError['code'], () => HTTPException>
```

Quando a mesma tradução serve a várias ações do recurso, ela sobe para
`features/<módulo>/<recurso>/_shared.<recurso>-refusal.ts` (`DECISIONS.md` #113, C6). A mensagem
sai pela chave i18n (`i18n.md`); o `code` é o contrato.

**Falha que precisa sobreviver à requisição** (entrega, sincronização, cobrança que falhou) não é
só um `left`: fica registrada no próprio registro (`failedAt`, `failureCode`), consultável e
reprocessável. O `left` responde à requisição; o registro responde a quem vai reprocessar.

**Evento de domínio** é valor que a transição devolve, não chamada que a entidade faz. O despacho,
quando existe consumidor, é do use-case (§11, Observer).

## 3. Value object

Imutável, valida ao nascer, igualdade por valor. O que roda igual no front mora em
`shared/src/value-objects/`; o que só o backend usa, em `app/domain/shared/`.

```ts
// shared/src/value-objects/email.ts
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Either<{ readonly code: 'EMAIL_INVALID' }, Email> {
    const normalized = raw.trim().toLowerCase()
    if (!Email.isValid(normalized)) return left({ code: 'EMAIL_INVALID' })
    return right(new Email(normalized))
  }

  static isValid(raw: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
```

A regra custom do schema chama o predicado do VO (`Email.isValid`): no Zod, um `refine` (_doc-lib/zod.md#api);
no VineJS do Adonis, uma regra custom (_doc-lib/vinejs.md#extend/custom_rules). A regra existe num lugar só.

## 4. Agregado

Só quando um grupo precisa ficar consistente na mesma transação: `Order` guarda
`items: OrderItem[]`, e `addItem` recusa fora de `OPEN`. O filho só muda pela raiz e não tem
repository próprio; outro agregado entra por id (`productId`). Um agregado por transação é a regra;
gravar dois na mesma unidade de trabalho (§6) exige o motivo no JSDoc do use-case.

## 5. Repository

### 5.1 Contrato por intenção

```ts
// app/repositories/post/post.repository.ts
export type PostListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly status?: PostStatus
}

export abstract class PostRepository {
  abstract findById(id: string): Promise<Post | null>
  abstract existsBySlug(slug: Slug): Promise<boolean>
  abstract save(post: Post): Promise<void>
  abstract delete(post: Post): Promise<void>
  abstract paginate(criteria: PostListCriteria): Promise<Paginated<PostListItem>>
}
```

- `abstract class`: é o token do container e o tipo ao mesmo tempo (`solid.md` §2;
  _doc-lib/adonisjs.md#guides/concepts/dependency-injection; _doc-lib/fastify-decorators.md).
- Poucos métodos, um por intenção. Proibido `find(where)` genérico (vaza o ORM) e método por
  combinação de filtro: filtro de listagem é critério tipado.
- Caminho de escrita devolve **entidade**. Listagem e detalhe sem regra devolvem o tipo de
  `shared/src/responses/` direto da query, sem hidratar entidade (leitura leve).
- Model nunca atravessa o contrato. Soft delete continua por query scope (`backend.md` §4.8),
  aplicado dentro da implementação.
- **Um escritor por tabela: o repository da entidade dona.** Nenhum outro arquivo escreve nela
  (`db.from('posts').update`, `Post.query().update` fora de `repositories/post/`). Feature que
  precisa mudar dado de outro agregado chama o repository dele, nunca a tabela.
- **Escopo de posse dentro da consulta**: busca de recurso que tem dono recebe o dono no critério
  (`findOwned({ id, ownerId })`), e o id alheio volta `null` (404 igual ao inexistente,
  `backend.md` §4.6). Nunca "busca por id e depois confere o dono".

### 5.2 Implementação e mapper

```ts
// app/repositories/post/post.lucid.repository.ts
@inject()
export class PostLucidRepository extends PostRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string): Promise<Post | null> {
    const row = await PostModel.query({ client: this.transaction.client() }).where('id', id).first()
    if (!row) return null
    return this.toEntity(row)
  }

  async save(post: Post): Promise<void> {
    await PostModel.updateOrCreate({ id: post.id }, this.toRow(post), { client: this.transaction.client() })
  }

  private toEntity(row: PostModel): Post { /* coluna → prop, primitivo → VO */ }
  private toRow(post: Post): ModelAttributes<PostModel> { /* snapshot → colunas */ }
}
```

O mapper é **método privado** da implementação: cada implementação conhece a própria forma de
persistência, e nenhuma função fica solta (`typescript.md` §6). `{ client }` é o mecanismo da doc
para a query usar a transação (_doc-lib/lucid.md#transactions). No Fastify,
`post.mongo.repository.ts` sobre o driver `mongodb` (_doc-lib/mongodb.md).

### 5.3 Implementação em memória

`PostMemoryRepository extends PostRepository` guarda um `Map<string, PostProps>` e grava e devolve
`structuredClone` do `snapshot()`, para o teste não alterar o "banco" por referência. É uma segunda
implementação de verdade, não um mock: é ela que o teste unitário do use-case usa.

### 5.4 Teste de contrato

`<entidade>.repository.e2e.spec.ts` roda **os mesmos casos** nas duas implementações. É o que
garante que o unitário do use-case não passa contra um dublê que mente (Liskov).

```ts
const IMPLEMENTATIONS = {
  lucid: () => app.container.make(PostLucidRepository),
  memory: async () => new PostMemoryRepository(),
} satisfies Record<string, () => Promise<PostRepository>>

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`PostRepository (${name})`, (group) => {
    group.each.setup(() => testUtils.db().withGlobalTransaction())
    test('save then findById returns the same entity', async ({ assert }) => { /* … */ })
  })
}
```

No Fastify, a mesma tabela com `describe.each` do Vitest.

## 6. Transação

O use-case delimita a transação sem conhecer o ORM, por um contrato:

```ts
// app/repositories/unit-of-work/unit-of-work.ts
export abstract class UnitOfWork {
  // commit em right, rollback em left: falha de negócio desfaz a escrita sem throw
  abstract run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>>
}
```

- `unit-of-work.lucid.ts`: abre transação manual (`db.transaction()`), põe o `trx` num
  `AsyncLocalStorage` que os repositories leem em `transaction.client()`, faz `commit` em `right`,
  `rollback` em `left` e em exceção (_doc-lib/lucid.md#transactions). No Mongo, sessão com
  `withTransaction` (exige replica set).
- `unit-of-work.memory.ts`: só executa `work`.
- **Só com duas ou mais escritas.** Uma escrita já é atômica, e transação aninhada dentro do
  `withGlobalTransaction` dos testes é armadilha
  (_doc-lib/adonisjs.md#guides/testing/resetting-state-between-tests).
- **Garantia de que algo não acontece duas vezes tem mecanismo nomeado**: índice único no banco
  (a violação vira o resultado já existente, não erro), a transação ou o `Either` que impede.
  `find` antes do `insert` perde a corrida e não conta como garantia.

## 7. Use-case

```ts
// features/administrator/posts/archive/archive.use-case.ts
type Payload = { actor: Actor; postId: string }

@inject()
export default class AdministratorPostArchiveUseCase {
  constructor(
    private readonly posts: PostRepository,
    private readonly clock: ClockContract,
  ) {}

  async execute(payload: Payload): Promise<Either<HTTPException, PostShowResponse>> {
    try {
      const post = await this.posts.findById(payload.postId)
      if (!post) return left(HTTPException.NotFound(t('posts.not_found'), 'POST_NOT_FOUND'))

      const archived = post.archive(this.clock.now())
      if (archived.isLeft()) return left(AdministratorPostArchiveUseCase.HTTP[archived.value.code]())

      await this.posts.save(archived.value)
      return right(PostPresenter.show(archived.value))
    } catch (error) {
      logger.error({ err: error }, '[administrator/posts > archive][error]')
      return left(HTTPException.InternalServerError(t('errors.internal'), 'ADMINISTRATOR_POST_ARCHIVE_ERROR'))
    }
  }
}
```

Orquestra e só: carrega pelo repository, chama a entidade, grava, traduz. Regra de negócio dentro
do use-case (um `if` sobre status, um cálculo) é sinal de entidade anêmica: a regra desce para a
entidade. O `actor` vem no payload (`backend.md` §4.3).

## 8. Camadas e cobrança

A tabela de quem importa quem está em `architecture.md` §2. A cobrança automática:

- **dependency-cruiser** só com as regras de camada daquela tabela e `no-circular`. Regra nova só
  entra depois de provar que reprova um import proibido. Toda regra de `forbidden` leva
  `severity: 'error'`: o padrão é `warn`, e o código de saída é o número de violações `error`, então
  regra sem severidade passa o CI verde (_doc-lib/dependency-cruiser.md#doc/rules-reference.md,
  #doc/cli.md). `options.tsPreCompilationDeps: true` e `tsConfig` do app: sem a opção, o `import type`
  some do grafo e a camada pode depender de outra só por tipo sem ninguém ver
  (_doc-lib/dependency-cruiser.md#doc/options-reference.md). Barrel de pacote fica fora: o Adonis
  desaconselha barrel (_doc-lib/adonisjs.md#guides/concepts/barrel-files) e no Fastify o barrel faz
  a injeção chegar `undefined`.
- **`pattern:check`** fica com a árvore, os nomes e o ENV (`backend.md` §10).

## 9. SOLID na árvore

| Letra | Onde aparece |
|---|---|
| **S** | controller traduz HTTP; use-case orquestra; entidade decide; repository persiste e mapeia. Mudar a regra de arquivar toca só a entidade |
| **O** | fato novo = entrada nova na tabela `satisfies`, e o compilador aponta o use-case sem tradução. Banco novo = implementação nova do repository, nenhum use-case muda |
| **L** | memória e Lucid passam no mesmo teste de contrato; o `.fake.ts` do service honra o mesmo `Either` da implementação real |
| **I** | use-case que só lê recebe o repository de leitura; contrato só se divide quando o segundo consumidor existir |
| **D** | use-case recebe `PostRepository` e `ClockContract` pelo construtor; o provider (Adonis) ou o registry (Fastify) liga a implementação |

## 10. TDD

Ciclo vermelho → verde → refatorar, uma fatia por vez; refatoração em passo separado de
comportamento novo. **Refatoração começa travando o comportamento** (`DECISIONS.md` #242): antes do
primeiro passo, testes de caracterização (E2E do fluxo, `backend.md` §7) registram o que o código
faz hoje, bug incluso. Cada passo move um pedaço, mantém nomes públicos, rotas e colunas, e roda os
testes. Bug achado no caminho não se corrige ali: vira linha em `docs/TASKS.md` e entra depois, com
o próprio teste que falha antes. Uma refatoração por vez, nunca em paralelo com correção de bug na
mesma área. Skill: `safe-refactor` (verificação antes e depois); troca de camada por Branch by
Abstraction com `legacy-migration-planner` (`backend.md` §11.1). Os pontos de teste são fixos por camada (`architecture.md` §8):

| Ponto | Teste | Dublês |
|---|---|---|
| entidade, value object | unitário puro: toda invariante e transição, `left` e `right` | nenhum |
| use-case | unitário: cada ramo do `Either` e cada tradução | `new` com repository em memória e `.fake.ts` (`DECISIONS.md` #116) |
| repository | contrato nas duas implementações | banco real em container |
| service externo | unitário da implementação com o cliente dublado | dublê só na fronteira |
| ação | E2E: sucesso, 401, 403, 404, 409, 422 e o estado no banco | `mail.fake()`, `drive.fake()` (_doc-lib/adonisjs.md#guides/testing/test-doubles) |

- **Mock só na fronteira** (API externa, relógio, aleatório). Classe nossa nunca é mockada: usa-se
  a implementação em memória ou o `.fake.ts`. Tempo vem do `ClockContract` injetado; `Date.now()`
  cru na asserção é teste que falha à meia-noite.
- Teste não conta chamada, não recalcula o esperado do mesmo jeito que o código, não é horizontal.
  O resultado se prova lendo **estado real** (a linha gravada, o corpo devolvido, o que o fake
  guardou). Verificar a chamada só vale quando a proposição **é** a chamada externa ("envia o
  e-mail", "cobra no gateway").
- Código de produção não ganha método, flag nem ramo só para o teste passar.
- **Critério de aceite em EARS**, um comportamento por critério, com os cinco padrões: ubíquo
  (`o sistema SHALL …`), `WHEN` (evento), `WHILE` (estado), `WHERE` (capacidade opcional) e
  `IF … THEN` (erro). Percentil, média e uptime não são critério, porque nenhuma execução de teste
  os decide: o comportamento vira critério e o alvo vai para a observabilidade. O teste deriva do
  critério, nunca do código, e o título começa pelo ID do requisito:
  `test('POST-03: archiving an archived post returns 409')`.

```
IF the post is already archived THEN the system SHALL respond 409 with code POST_ALREADY_ARCHIVED
WHILE the account is suspended the system SHALL refuse POST /posts with 403
```

- Matriz requisito × teste em `docs/TEST-PLAN.md`; especificação da feature em
  `.specs/features/<f>/` (`tlc-spec-driven`). Enfraquecer, pular ou apagar teste para passar é
  proibido.
- Feature grande termina com **verificador independente** (autor ≠ verificador) que injeta falhas
  numa cópia isolada (`git worktree`, nunca `git stash`), uma por superfície de asserção distinta, e
  exige que os testes as peguem; mutante que sobrevive reprova. Até três rodadas de correção, depois
  escala ao dono. Relatório em `.specs/features/<f>/validation.md`.

## 11. Padrões de projeto: onde cada um mora

O catálogo clássico (GoF) serve de mapa, não de receita: a casa já tem lugar para cada padrão
útil, escrito no estilo dela (`abstract class`, `Either`, DI por construtor, lookup `satisfies`).
Exemplo de skill que usa `interface`, `throw`, `setStrategy` ou `switch` com `new` se reescreve
nesta forma antes de entrar no código.

### 11.1 Adotados

| Padrão | Forma na casa | Onde mora |
|---|---|---|
| Command | o use-case: um objeto, um `execute(payload)` | `features/<m>/<r>/<ação>/<ação>.use-case.ts` |
| Command serializado | comando de CLI; job de fila com payload só de ids | `commands/<recurso>-<verbo>.command.ts`; `app/jobs/<nome>.job.ts` |
| Factory method | `static create()` (valida) e `static restore()` (reidrata), construtor privado | entidade (§1) e value object (§3) |
| Factory por status | fábricas de `HTTPException` (`HTTPException.NotFound(msg, code)`) | `exceptions/http.exception.ts` |
| Factory de teste | model factory | `database/factories/<entidade>.factory.ts` |
| Factory de ligação | `bind`/`singleton` com closure no container | `providers/<nome>.provider.ts` (Adonis), registry (Fastify) |
| Strategy sem I/O | lookup `satisfies Record<União, …>` no arquivo que decide | `private static readonly` do use-case, entidade, `lib/labels.ts` |
| Strategy com I/O | contrato `abstract class` + N implementações; **a escolha é do composition root** | `services/<nome>/` ou `repositories/<entidade>/`; ligação no provider/registry |
| Template method | `abstract class` com o fluxo e passos `protected abstract`; um nível de herança | `<nome>.base.ts` (`session-scoped-policy.base.ts`; em `features/`, `_shared.<tema>.base.ts`) |
| Adapter / anticorruption layer | implementação do contrato que traduz o fornecedor | `services/<nome>/<nome>.service.ts` e `.fake.ts` (`solid.md` §2); `repositories/<e>/*.{lucid,mongo,memory}.repository.ts` |
| Observer (backend) | emitter do framework, só para efeito colateral que tolera perda | listener registrado no boot (camada opcional, ver abaixo) |
| Observer (frontend) | cache do TanStack Query; `useSyncExternalStore` para fonte externa | `integrations/tanstack-query/invalidate.ts`, hook em `hooks/` ou `lib/` |
| State | união discriminada + tabela de transições na entidade | arquivo da entidade; o enum em `shared/src/enums/` |
| Mediator | pipeline de middleware do framework | `middleware/<nome>.middleware.ts` |
| Facade | delegação pura sobre `internal/` | `services/<nome>/<nome>.service.ts` (`solid.md` §2) |

**Strategy: chave fechada não tem fallback.** Quando a chave é união fechada, o `Record` exaustivo
já cobra a chave que falta; `?.`/`??` de fallback (`HANDLERS[action]?.()`, `LABEL[x] ?? 'Unknown'`)
esconde a falta. Fallback só quando a chave vem de fora e ainda é `string`. Variante com I/O é
escolhida por quem liga o container, lendo a configuração; o use-case nunca faz
`if (driver === 's3')`:

```ts
// providers/storage.provider.ts, register(): the composition root picks the implementation
const STORAGE_DRIVERS = {
  local: LocalStorageService,
  s3: S3StorageService,
} satisfies Record<StorageDriver, new (...args: never[]) => StorageContract>

this.app.container.bind(StorageContract, () => this.app.container.make(STORAGE_DRIVERS[env.get('STORAGE_DRIVER')]))
```

Escolha que muda por requisição (configuração do tenant) é um service resolvedor injetado com o
mesmo mapa, nunca `new` dentro do use-case.

**State: tabela de transições.**

```ts
// app/domain/post/post.entity.ts
const TRANSITIONS = {
  DRAFT: [POST_STATUS.PUBLISHED, POST_STATUS.ARCHIVED],
  PUBLISHED: [POST_STATUS.ARCHIVED],
  ARCHIVED: [POST_STATUS.DRAFT],
} as const satisfies Record<PostStatus, readonly PostStatus[]>
```

O método verbo (`publish`, `archive`) confere `TRANSITIONS[this.props.status]` e devolve `left` com
o fato (`POST_INVALID_TRANSITION`). Classe por estado (o State do GoF) não entra.

**Template method: um nível, algoritmo idêntico.** Vale quando três ou mais peças repetem o mesmo
fluxo (`try/catch`, log, tradução) e só um passo varia. A subclasse preenche o passo e não
sobrescreve o fluxo; acima de um nível de herança, composição.

**Observer no backend: evento só para efeito colateral.** O emitter do Adonis desacopla o que vem
depois do fluxo (e-mail depois do cadastro) e se testa com `emitter.fake()`
(_doc-lib/adonisjs.md#guides/digging-deeper/emitter, que avisa: evento demais deixa o fluxo difícil
de seguir).

- Nome `<recurso>:<particípio>` como na doc (`post:archived`); payload só ids e primitivos, nunca
  entidade nem model; listener idempotente.
- Efeito que **não pode** se perder (cobrança, estoque) não vai por emitter em memória: vai por fila
  (`app/jobs/`) ou por outbox com decisão própria em `DECISIONS.md`.
- Evento não é canal entre features: o que uma ação precisa de outra sobe para domínio, repository
  ou service.
- A casa do listener ainda não está na árvore de `architecture.md` §3.1; até entrar, não se cria.
  A doc já fixa o lugar: `node ace make:listener` grava em `app/listeners/`, e o registro fica em
  `start/events.ts` (`_doc-lib/adonisjs.md#guides/digging-deeper/emitter`, conferida em 2026-10-14).
  Falta só a decisão (`final-review.md` §5, item 5).

**Observer no frontend é o cache.** Nada de event bus próprio, `window.dispatchEvent` de evento da
aplicação ou `Observable` feito à mão: dado do servidor propaga por `invalidateQueries`/
`setQueryData`; fonte externa (storage, `matchMedia`, SSE) entra por `useSyncExternalStore` num
hook. SSE só sinaliza "mudou", e o Query busca.

### 11.2 Proibidos

| Padrão | Por quê | No lugar |
|---|---|---|
| Singleton fora do container (`getInstance()`, `static instance`) | esconde dependência do construtor e não se troca no teste | `container.singleton` no provider; `@Service()` (singleton por padrão no Fastify) |
| Estado mutável no escopo do módulo, no servidor e no SSR (`let cache = new Map()` exportado, campo com dado de requisição em classe compartilhada, `QueryClient` criado no módulo) | o módulo é memória do processo: vaza dado de um usuário para outro e entre requisições | estado por requisição (`AsyncLocalStorage`, `getRouter()` cria o `QueryClient`; _doc-lib/tanstack-query.md#guides/ssr); constante `as const` imutável no módulo continua permitida |
| Mixin próprio e mexida em `prototype` (`Object.assign(X.prototype, …)`, `Object.create` para herança) | herança escondida que nenhum tipo descreve | composição: service injetado, função de `_shared`, hook. Exceção única: o mixin que o framework entrega ao model (`compose(BaseModel, withAuthFinder(…))`, _doc-lib/adonisjs.md#guides/auth/verifying-user-credentials) |
| `Proxy` do JS em código de produção | comportamento invisível no tipo e no stack trace | validação é schema (Zod; VineJS no Adonis), autorização é policy, carga preguiçosa é `import()` ou container. Único uso aceito: o helper de dublê tipado de `backend-fastify.md` §8 |
| CommandBus, QueryBus, mediador próprio | indireção sem ganho: o controller já sabe qual use-case chamar | controller chama o use-case injetado; CQRS só o leve (repository de leitura, §5.1) e só quando leitura e escrita divergem de verdade |
| Builder (e prototype/flyweight próprios) | objeto montado em passos aceita estado incompleto | parâmetro objeto tipado com default; query builder é o do ORM/driver; dado de teste é factory; cópia é `structuredClone` ou spread |
| Factory que dá `new` em colaborador (`switch` que instancia `XService`/`XRepository`) | é o `new` que o lint proíbe com outro nome, e o `throw` do `default` vira erro de runtime | o container cria (Strategy com I/O acima); a chave é união e o `Record` é exaustivo |

## 12. Contextos e fronteiras (DDD estratégico)

O §1–§7 é o DDD tático. Do estratégico, a casa usa o que cabe num monólito modular com um banco:

- **A fronteira segue a linguagem.** O mesmo termo com dois sentidos indica dois contextos. Nome de
  conceito é único em `app/domain/`: `Plan` de assinatura e `Plan` de aula não convivem; o segundo
  ganha o prefixo do contexto (`BillingPlan`, `LessonPlan`) e o termo rejeitado entra como "Evitar"
  na seção "Linguagem do domínio" de `docs/ARCHITECTURE.md` (`DECISIONS.md` #118).
- **Contexto não é camada técnica nem público.** `features/<módulo>/` agrupa a borda HTTP por
  público (`administrator`, `storefront`); o conceito de negócio se agrupa em `domain/<entidade>/`
  e `repositories/<entidade>/`. Critério de coesão (linguagem, dado e motivo de mudança comuns)
  serve para nomear e separar entidade, não para criar pasta de feature.
- **Entre contextos, o contrato, nunca o modelo.** Outro agregado entra por id (§4); o que sai de um
  use-case é o tipo de `shared/src/responses/` (`architecture.md` §10), nunca a entidade, o model
  ou o documento cru, e enum interno que não está em `shared/` não vaza na resposta.
- **Shared kernel é pequeno.** Em `shared/` entram value object pequeno e puro (`Email`, `Money`),
  enum e contrato de endpoint; entidade nunca (`architecture.md` §9).
- **Sem barramento entre módulos.** O monólito da casa não tem contexto com banco próprio, então
  feature não fala com feature por evento: o que é comum sobe para domínio, repository ou service
  (§11).
- **Import circular é proibido em qualquer camada** (§8): ciclo entre módulos é acoplamento
  escondido e, no Fastify, injeção que chega `undefined`.
