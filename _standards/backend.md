# Padrão de backend

A régua de todo backend da casa, qualquer que seja o framework. A árvore, as camadas e os nomes
estão em [`architecture.md`](architecture.md); a forma de entidade, repository, presenter e
transação está em [`domain.md`](domain.md); este arquivo diz **como** cada camada da borda
(controller, use-case, policy, middleware, service, model) se escreve e por quê. O que só vale
para um framework aparece como **nota de adaptador** *(Adonis)* ou *(Fastify)*; o perfil Fastify
completo está em [`backend-fastify.md`](backend-fastify.md).

Este repositório é o **upstream**: projetos recebem `_standards/`, `_doc-lib/` e as skills por
`node scripts/sync-to-project.mjs <dir>`, rodado à mão a partir daqui. O CI/CD do projeto não
busca nem consulta este repositório (§11).

---

## 0. A hierarquia de autoridade

Quando duas fontes discordam, esta é a ordem:

1. **`_doc-lib/`** e a página oficial que a entrada cita: o contrato. A entrada é índice; a
   decisão lê a página (`DECISIONS.md` #114).
2. **O tipo instalado** (`node_modules/<pkg>/**/*.d.ts`), quando a doc não cobre o ponto. É
   prova, não opinião.
3. **Este documento** (e `architecture.md`, `domain.md`).
4. **O código existente.**

Se o código contradiz a doc oficial, o código está errado, mesmo que esteja assim em todo
projeto. Quando nem a doc nem o tipo instalado cobrem o assunto, diga "não coberto" e decida com o
critério declarado aqui. Não invente prescrição de doc. Regra desta página que depende de página
oficial que não pôde ser aberta sai marcada *página oficial não conferida*.

---

## 1. Organização

### 1.1 `app/`

A árvore fechada (o que entra em `core/`, `domain/`, `repositories/`, `services/`, `policies/`,
`middleware/`, `exceptions/`, `features/`) é a de
[`architecture.md` §3](architecture.md#3-árvore-do-backend), com as camadas opcionais de §3.1 e as
pastas de framework de §3.2/§3.3. Este arquivo não a repete. Três pontos dela que mudam como se
escreve:

- **`Either` vem de `shared/`** (`shared/src/either.ts`, `DECISIONS.md` #117), não de `core/`.
- **`exceptions/` é fechado** em `http.exception.ts` e `handler.ts`. Tradução de fato de domínio
  ou de service para HTTP não abre arquivo ali: mora em
  `features/<módulo>/<recurso>/_shared.<recurso>-refusal.ts` (`domain.md` §2, C6).
- **`services/` é só I/O externo**, sempre com contrato (`<nome>.contract.ts`, `<nome>.service.ts`,
  `<nome>.fake.ts`; §5.3, `solid.md` §2, C20). Piso da casa: `storage` (inclui o upload
  multipart, §5.4) e `mail`. Persistência é repository (`domain.md` §5); função pura é entidade,
  value object ou `_shared` (§4.9). Atributo de cookie é configuração (§4.10); normalizar slug é o
  value object `Slug`.

*(Adonis)* `app/abilities/main.ts` sempre presente: `node ace add @adonisjs/bouncer` cria o
arquivo e registra o middleware que dá `ctx.bouncer` em todo controller. O guard de sessão por
cookie mora em `app/guards/cookie-access-tokens.guard.ts`. `app/jobs/` nasce com
`@adonisjs/queue`.

**A policy usa o mecanismo que a doc do framework documenta.** *(Adonis)* `@adonisjs/bouncer` é
dependência de baseline, não condicional, porque `app/policies/` é obrigatório e a doc oficial
resolve autorização por registro exatamente com esse pacote
(`_doc-lib/adonisjs.md#guides/auth/authorization`). Ver §4.6.

**Regra de criação:** diretório transversal nasce *vazio-mas-presente* quando o mecanismo é
transversal (`policies/`, `repositories/`, `domain/`); nasce *junto com a dependência* quando o
mecanismo é opcional (`jobs/`, config de e-mail, config de fila). O `pattern:check` cobra a
primeira lista e ignora a segunda.

### 1.2 Fatia vertical, uma pasta por ação

Uma operação HTTP é **uma pasta**: `app/features/<módulo>/<recurso>/<ação>/`, com
`<ação>.controller.ts`, `<ação>.use-case.ts`, `<ação>.unit.spec.ts` e `<ação>.e2e.spec.ts`. Ação é
pasta sempre, inclusive a trivial: é onde os testes dela moram e onde quem procura "arquivar post"
encontra tudo *(opinião da casa)*. Sempre três níveis, nenhum módulo sem recurso, nenhum
`.service.ts` dentro da ação (`architecture.md` §3).

O use-case fala com o **repository** (contrato) e com a **entidade** de domínio, nunca com o model
(`domain.md` §7). A pasta não define a rota: o prefixo vem do registro de rotas do framework
(`architecture.md` §5).

### 1.3 Dependência entre camadas

A tabela de quem importa quem está em `architecture.md` §2. Três consequências que se escrevem no
código desta camada:

- **Uma tabela, um escritor.** Só o repository da entidade dona grava na tabela dela. Feature que
  precisa mudar dado de outro agregado chama o repository (e a entidade) dele, nunca
  `db.from('posts').update(...)` nem `PostModel.query().update(...)` fora de
  `repositories/post/` *(opinião da casa)*. Escritor espalhado é invariante que ninguém garante.
- **Sem import circular**, em camada nenhuma: no Fastify, ciclo faz a injeção chegar `undefined`
  (`domain.md` §8).
- Uma feature não importa outra; o compartilhado sobe para `_shared.<tema>`, domínio ou service.

Cobrado por dependency-cruiser e `pattern:check` (`domain.md` §8).

---

## 2. Convenções de escrita

Valem para todo `.ts` do repositório, incluindo `database/`, `config/`, `tests/`. São a fonte das
regras de estilo que `typescript.md` cita sem repetir. As cinco primeiras são cobradas por ESLint
(`tooling.md` §4); as demais, por `pattern:check` ou revisão.

1. **Sem ternário** de atribuição ou controle de fluxo → `if` clássico. `??`, `?.` e o
   short-circuit `&&` com booleano continuam válidos.
2. **Sem `any`** → `unknown` mais narrowing na fronteira (`typescript.md` §2.1). Lib com tipo
   errado é cast de fronteira registrado (`typescript.md` §1), nunca `any`.
3. **Sem `as`** → `satisfies`, ou corrigir o tipo na origem. `as const` é permitido. Cast de
   fronteira real leva `eslint-disable-next-line` com justificativa em inglês (`typescript.md` §12).
4. **Sem `!` non-null** → guard no topo (`typescript.md` §1).
5. **Sempre `type`, nunca `interface`** *(opinião da casa)*, exceto em `declare module`, onde o
   TypeScript exige `interface` para o declaration merging (tipagem de eventos, `ctx.actor`,
   _doc-lib/typescript.md#docs/handbook/declaration-merging). A doc **permite** e **não recomenda**:
   o Handbook diz que, na maior parte dos casos, a escolha é de preferência, mas a heurística dele é
   a oposta ("use interface until you need to use features from type") e registra que `interface`
   com `extends` costuma ser mais rápida para o compilador que interseção
   (_doc-lib/typescript.md#docs/handbook/2/everyday-types, "Differences Between Type Aliases and
   Interfaces"). A casa fica com `type` para ter uma forma só, que também cobre união, tupla e tipo
   mapeado, e aceita o custo de compilação; tipo que fica lento se quebra em tipos nomeados
   (`typescript.md` §8).
6. **`Merge<A, B>` no lugar de `A & B`** para tipos objeto *(opinião da casa, `typescript.md` §8)*.
   Onde `&` continua certo (`Array<T>`, união discriminada): `typescript.md` §8.
7. **Lookup object** no lugar de cadeia de `if/else if` com 3+ casos que mapeia um discriminante
   para valor ou handler, `satisfies Record<União, V>` e sem `??` de fallback quando a chave é
   união fechada *(opinião da casa)*. Lógica booleana arbitrária continua `if`.
8. **`async/await`, nunca cadeia `.then/.catch/.finally`** *(opinião da casa)*. Combinadores
   seguem válidos com `await Promise.all([...])`.
9. **Logger do framework, nunca `console.*`** em `app/`, `commands/`, `start/` e `config/`
   (`_doc-lib/adonisjs.md#guides/digging-deeper/logger`; `_doc-lib/fastify.md#Reference/Logging`).
   `console` só em `scripts/`. Lint `no-console`.

### 2.1 DI sempre, `new Classe()` nunca

Injeção por construtor em todo código de produção **e em teste E2E**.

`new X()` onde `X` termina em `Service`, `UseCase`, `Policy`, `Controller`, `Repository` ou
`Seeder` é recusado por `eslint.config.js` **em todo arquivo**, sem isenção por diretório.
Isenção por diretório (`start/`, `config/`, `providers/`, `commands/`, middlewares, na tese de
que ali é o composition root) é exatamente por onde passa o defeito: um callback de evento faz
`new XService()` tendo o contexto em mãos para pedir ao container. O composition root de
verdade instancia classes que não casam com o seletor (`Guard`, `Provider`, `Bouncer`); o que
precisar de exceção entra na allowlist do `eslint.config.js`, por símbolo. As isenções são
nomeadas e fechadas:

| Isenção | Por quê |
|---|---|
| `new CookieAccessTokensGuard(context)` *(Adonis)* | factory que `config/auth.ts` exige; o guard recebe o `HttpContext` da requisição, não do container |
| `new SimpleMessagesProvider(...)` *(Adonis)* | API do VineJS, atribuída a `vine.messagesProvider` no boot |
| `new Bouncer(() => ctx.actor, ...)` *(Adonis)* | API pública do `@adonisjs/bouncer`, só no middleware que o inicializa (§4.6) |
| `*.unit.spec.ts` (os dois perfis) | o unitário instancia o use-case com a implementação em memória do contrato (`<entidade>.memory.repository.ts`, `<nome>.fake.ts`); a implementação real só aparece no E2E (`DECISIONS.md` #116) |
| `database/{migrations,seeders,remodels}/**` *(Fastify)* | migration/seeder/remodel não sobe kernel nem container por desenho; o guard real é revisão, não lint |

**Teste E2E pede o objeto ao container (`app.container.make(X)` no Adonis), nunca
`new X()`.** Com `new`, o teste não quebra quando o construtor ganha uma dependência: passa
testando um objeto meio construído. No unitário o risco não existe: o construtor recebe tudo
explícito, e o compilador acusa a dependência que faltar.

- **Factory que dá `new` em colaborador e singleton fora do container** são proibidos; a regra, o
  porquê e a forma no lugar (lookup no composition root, `singleton` no provider) estão em
  `domain.md` §11.1 (Strategy com I/O) e §11.2.

---

## 3. Nomenclatura

Todo nome de arquivo é **kebab-case com sufixo de papel** (lista fechada em `architecture.md`
§3). Gerador de framework que produza outro formato (snake_case) é renomeado na hora, exceto
migration. Identificador, rota e comentário em inglês; texto que o usuário vê por chave i18n
(`typescript.md` §12, `i18n.md`).

**Tudo que nomeia a ação deriva do caminho** `features/<módulo>/<recurso>/<ação>/` (C1, C11),
e o `pattern:check` gera cada nome do caminho e compara:

| Coisa | Forma | Exemplo (`features/administrator/posts/archive/`) |
|---|---|---|
| classe de controller | `<Módulo><Recurso><Ação>Controller`, recurso no singular | `AdministratorPostArchiveController` |
| classe de use-case | `<Módulo><Recurso><Ação>UseCase` | `AdministratorPostArchiveUseCase` |
| export de validator (request) | `<Módulo><Recurso><Ação>Validator` + `type <…>Payload` | `AdministratorPostArchiveValidator` |
| schema de resposta | `<Módulo><Recurso><Ação>Response` (`architecture.md` §10) | `AdministratorPostShowResponse` |
| código de 500 | `<MÓDULO>_<RECURSO>_<AÇÃO>_ERROR`, sempre com o módulo | `ADMINISTRATOR_POST_ARCHIVE_ERROR` |
| tag de log do use-case | `[<módulo>/<recurso> > <ação>][error]`, recurso como a pasta; passo intermediário num colchete próprio | `[administrator/posts > archive][error]`, `[account/storages > create][abort][error]` |

O módulo vai **sempre**: "só quando o recurso existe em dois módulos" muda de resposta no dia em
que nasce o segundo módulo, e as tags e códigos sem prefixo colidem (administrator × storefront).

| Coisa | Forma |
|---|---|
| pasta de ação | `<ação>/`, verbo em kebab-case (`archive/`, `sign-in/`); ciclo de vida com o vocabulário de §4.8 |
| arquivos da ação | `<ação>.controller.ts`, `<ação>.use-case.ts`, `<ação>.unit.spec.ts`, `<ação>.e2e.spec.ts` |
| validator e resposta | `shared/src/validators/<módulo>/<recurso>.validator.ts` e `shared/src/responses/<módulo>/<recurso>.response.ts`, um arquivo por recurso (`architecture.md` §9, §10) |
| entidade, fato, value object | `domain/<entidade>/<entidade>.entity.ts`, `<entidade>.errors.ts`; `<nome>.value-object.ts` (`domain.md` §1–§3) |
| repository | contrato `<Entidade>Repository` em `<entidade>.repository.ts`; `<Entidade>LucidRepository`/`MongoRepository`/`MemoryRepository` (`domain.md` §5) |
| presenter | `<Entidade>Presenter` em `features/<módulo>/<recurso>/<recurso>.presenter.ts`, um método por forma de resposta (`architecture.md` §10) |
| tradutor de recusa | `features/<módulo>/<recurso>/_shared.<recurso>-refusal.ts` (`domain.md` §2) |
| service de I/O | `services/<nome>/<nome>.contract.ts` (`abstract class <Nome>Contract`), `<nome>.service.ts`, `<nome>.fake.ts` |
| arquivo de model | `models/<entidade>.ts` em kebab-case (`team-member.ts`, nunca `team_member.ts`) |
| middleware | `<nome>.middleware.ts` (`auth.middleware.ts`) |
| policy | `<entidade>.policy.ts`; base comum `session-scoped-policy.base.ts` (§4.6) |
| classe base de template method | `abstract class` com o algoritmo, subclasse preenche o passo, **um nível** de herança. Em `services/` e `policies/`, `<nome>.base.ts`; entre recursos de um módulo, `_shared.<tema>.base.ts` (`architecture.md` §3). Não é contrato: o contrato é fronteira de I/O trocável em teste, a base não se troca |
| comando de CLI | `commands/<recurso>-<verbo>.command.ts`, invocado como `<recurso>:<verbo>`; mutante aceita `--dry-run` (§4.12). _doc-lib/adonisjs.md#guides/ace/creating-commands |
| evento | `<recurso>:<particípio>` (`post:archived`), como a doc (`_doc-lib/adonisjs.md#guides/digging-deeper/emitter`) |
| seeder | `database/seeders/<nome>.seed.ts`: o sufixo é o contrato de descoberta do boot/`db:seed`. Seed manual (dado de demo, carga pontual) fica em `database/seeders/dev/` sem o sufixo, com o motivo no topo, e roda por script nomeado. Seeder que grava credencial restringe onde roda (`static environment`, _doc-lib/lucid.md#seeders) |
| factory | `database/factories/<entidade>.factory.ts`, uma por entidade viva, usada só por spec; espelha o model, sem regra de negócio, nasce com o papel menos privilegiado (§7). _doc-lib/lucid.md#model-factories |
| provider | `providers/<nome>.provider.ts`: `register()` liga contrato → implementação, `shutdown()` libera pool/conexão; `singleton` quando o cliente guarda conexão, `bind` quando é sem estado, comentário do porquê. _doc-lib/adonisjs.md#guides/concepts/service-providers |
| socket | por feature, no contrato do service do socket: `<FEATURE>_NAMESPACE` (constante) e `<feature>Room(scopeId)` (única função que monta o nome da sala): quem entra e quem emite montam a mesma string. _doc-lib/socket-io.md#namespaces, #rooms |
| migration | **exceção ao kebab**: o nome é o que o framework ordena e registra. Adonis: o gerado por `make:migration` (`<timestamp>_<verbo>_<entidade>.ts`), nunca renomeado (a tabela de controle guarda o nome, renomear reexecuta; _doc-lib/lucid.md#migrations). Script standalone (Fastify): `<sequencial>-migrate-<descrição>.ts` (§7) |
| código de erro de negócio | literal, em inglês maiúsculo, no `HTTPException` (`'POST_NOT_FOUND'`), nunca constante importada: o `openapi:generate` só lê literal (`openapi.md` #erros-do-use-case). Um código por conflito: a mesma recusa tem o mesmo código no pré-check e no `catch` da corrida (§4.4) |
| mensagem de erro | chave i18n, nunca literal (`i18n.md` §3); o `code` é o contrato e não se traduz |
| lógica pura compartilhada | `features/<módulo>/_shared.<tema>.ts`; entre módulos, `features/_shared.<tema>.ts` (§4.9) |
| alias de import do irmão | o nome da classe, sempre (`import AdministratorUserPaginateUseCase from './paginate.use-case.ts'`) |
| import que é só tipo | `import type` (`HttpContext` em controller, `Actor` em `Payload`) |
| alias de import | subpath imports do `package.json` (`#core/*`, `#domain/*`, …, `architecture.md` §3), nativo do Node; o pacote compartilhado entra como `@<projeto>/shared` |

---

## 4. Camadas

### 4.1 Controller

Não contém regra de negócio. Faz: validar, autorizar quando há regra por registro (§4.6), chamar
o use-case, escolher o status.

```ts
// app/features/administrator/posts/update/update.controller.ts  (Adonis)
@inject()
export default class AdministratorPostUpdateController {
  static docs = defineDocs({ /* summary when the action is not derivable */ })

  constructor(private readonly useCase: AdministratorPostUpdateUseCase) {}

  async handle(context: HttpContext) {
    const body = await context.request.validateUsing(AdministratorPostUpdateValidator)
    const { id } = await context.request.validateUsing(IdentifierValidator, { data: context.params })
    const result = await this.useCase.execute({ ...body, postId: id, actor: context.actor })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
```

- **Uma forma de ler a entrada.** Body por `validateUsing(<Validator>)`; params por
  `validateUsing(IdentifierValidator, { data: context.params })`; os dois fundidos no payload.
  Nunca `request.input()`, `request.body()`, `request.all()` nem `V.validate(request.body())`
  (`_doc-lib/adonisjs.md#guides/basics/validation`). A página, conferida em 2026-10-14, documenta
  outro caminho para params: o bloco `params: vine.object({...})` (VineJS, Adonis) dentro do schema, que o
  `validateUsing` extrai sozinho. A opção `data` não está na página; existe no tipo
  `RequestValidationOptions` de `@adonisjs/core@7.6.0` (`data?: any`). Qual dos dois a casa adota
  está em aberto (`_map/scan-2026-10/application/final-review.md` §5, item 3).
- **O use-case só recebe a saída do validator** mais o `actor`. Espalhar `request.body()` ou
  `request.all()` no payload é mass assignment: o cliente manda `role`, `ownerId` ou um operador
  Mongo (`$ne`) e o use-case grava. Cobrado por `pattern:check` (spread de corpo cru em
  controller).
- **`summary` é obrigatório** quando a ação não está em `ACTION_SUMMARY` de
  `app/core/openapi/` (`openapi.md`). As derivadas (`create`, `paginate`, `show`, `update`,
  `archive`, `unarchive`, `delete`, `sign-in`, `sign-out`, `refresh`, `complete`, `parts`,
  `download`) não precisam.
- **`errors:` só para o que nasce fora da pasta da ação.** O introspector do OpenAPI colhe por
  AST os `HTTPException` escritos no use-case irmão; esses **não** se declaram, senão viram uma
  segunda fonte que envelhece. O gerador não enxerga o que um `_shared.<recurso>-refusal.ts` ou
  um service traduzido levanta: esses se declaram, com comentário dizendo de onde o código nasce.
  A prosa da `description` **não** lista códigos.
- Import do use-case irmão por caminho relativo com extensão.

**`HTTPException`** (`exceptions/http.exception.ts`): construtor `protected`; criação só pelas
fábricas estáticas por status, com argumentos posicionais `(message, code, errors?)`
(`HTTPException.NotFound(t('posts.not_found'), 'POST_NOT_FOUND')`); `handle()` próprio que
devolve o envelope de §4.5 (`_doc-lib/adonisjs.md#guides/basics/exception-handling`). O `code` é
literal no ponto de uso: embrulhar a fábrica numa função (`slugConflict({...})`) tira o código do
contrato, porque o gerador lê o texto. O que se compartilha é a pergunta (`emailTaken`), não a
resposta.

### 4.2 Use-case

A forma inteira (carregar pelo repository, chamar a entidade, gravar, traduzir o fato, devolver
pelo presenter) está em `domain.md` §7. O esqueleto que o `pattern:check` cobra:

```ts
type Payload = Merge<AdministratorPostUpdatePayload, { actor: Actor; postId: string }>
type Response = Either<HTTPException, AdministratorPostShowResponse>

@inject()
export default class AdministratorPostUpdateUseCase {
  constructor(private readonly posts: PostRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // repository, entity, presenter: domain.md §7
    } catch (error) {
      logger.error({ err: error }, '[administrator/posts > update][error]')
      return left(HTTPException.InternalServerError(t('errors.internal'), 'ADMINISTRATOR_POST_UPDATE_ERROR'))
    }
  }
}
```

- **Falha de negócio é `left`, nunca `throw`.** Quem transforma em resposta é o controller.
  Método `*OrFail()` do ORM conta como `throw` (cai no `catch` global e vira 500 onde deveria
  haver 404) e não aparece nem na implementação do repository: o contrato devolve `null` e o
  use-case decide. Cobrado por `pattern:check`.
- **`try/catch` global obrigatório**, começando antes da primeira ida ao repository, com a tag de
  log e o código de 500 derivados do caminho (§3). O 500 sai com mensagem genérica; o detalhe só
  no log (§5.5).
- **Nunca engolir erro.** `catch` que só loga e devolve `false`/`null`/lista vazia é proibido: ou
  traduz para `left`, ou registra a falha durável no próprio registro (`failedAt`,
  `failureCode`, consultável e reprocessável), ou relança. A exceção é o efeito colateral que
  tolera perda, e esse sai do fluxo por evento ou fila (§4.12).
- **Mais de uma escrita, uma unidade de trabalho**: `UnitOfWork.run` (`domain.md` §6), com
  `commit` em `right` e `rollback` em `left`. A saída da transação é `Either`, nunca sentinela
  (`'CONFLICT'` devolvido como string para o chamador interpretar). Bloqueio de linha-pai
  (`forUpdate()`) é método por intenção do repository (`findByIdForUpdate`), não query no
  use-case.
- **Escopo de sessão nunca vem do body.** `actor` e o que dele deriva (dono, tenant) entram pelo
  tipo, a partir da sessão autenticada (§4.3).
- **Idempotência** em toda operação atrás de rede não confiável: §4.11.
- **Template method para ações quase idênticas** *(opinião da casa)*: quando dois use-cases
  diferem só num passo (`archive`/`unarchive`, `bulk-archive`/`bulk-unarchive`), uma base
  `abstract` com o fluxo (`try/catch`, log, tradução) e passos `protected abstract`
  (`logTag`, `notFound`, `failure`) em `_shared.<tema>.ts` do módulo. **Obrigatória** quando três
  ou mais recursos do módulo repetem o mesmo molde: a terceira cópia é onde o bug corrigido em
  uma segue vivo nas outras.

### 4.3 `actor` vai no payload, tipado por schema *(opinião da casa)*

O use-case recebe quem age no próprio payload, como `actor` (`DECISIONS.md` #115). O tipo nasce
de um schema Zod em `shared/`, nunca de `type` redigitado nem do model do ORM:

```ts
// shared/src/validators/authentication/actor.validator.ts
export const ActorSchema = z.object({
  id: z.string(),
  roles: z.array(z.enum(ROLES)),
  teamId: z.string().nullable(),
  locale: z.enum(LOCALES),
})
export type Actor = z.infer<typeof ActorSchema>

// features/administrator/posts/archive/archive.use-case.ts
type Payload = { actor: Actor; postId: string }
```

- **Quem monta é o middleware de autenticação.** Ele autentica (guard do framework), valida o
  usuário contra o `ActorSchema` e deixa o `actor` no contexto (`ctx.actor`, tipado por
  `declare module`); o controller só o repassa. Use-case não importa model (`architecture.md`
  §2), por isso o `actor` não é o `User` do Lucid.
- A policy recebe `(actor, target)`. `actor.roles` e `actor.teamId` resolvem a checagem comum sem
  nova consulta; o que exigir mais dado pede ao repository.
- **E chama-se `actor`.** `user`, `userId`, `createdBy` e `ownerId` no `Payload` são o mesmo dado
  com outro nome, e escapam da policy `(actor, target)`. Cobrado por `pattern:check`. A própria
  conta (`/account`) também é o `actor`.

### 4.4 Validator

**O servidor valida sempre**, mesmo quando o formulário já validou: a validação do frontend é
experiência de uso e se contorna com uma requisição direta. Toda entrada (body, params, query,
cabeçalho que vira dado) passa pelo validator no controller antes do use-case, e o use-case confere
de novo o que é regra de negócio (existência, unicidade, posse).

O validator de request é **Zod e mora em `shared/`**, um arquivo por recurso
(`shared/src/validators/<módulo>/<recurso>.validator.ts`), com um export por ação e o tipo ao
lado; o schema de resposta mora em `shared/src/responses/` (`architecture.md` §9, §10). O backend
Fastify os importa de `@<projeto>/shared`; `app/core/validator.ts` reexporta o `z` configurado e
guarda só regra que depende do backend (`architecture.md` §3). **No backend Adonis o validator de
request é VineJS** (nativo do framework), em `app/validators/<módulo>/<recurso>.validator.ts`, com o
mesmo caminho e o mesmo nome do Zod do `shared/`, que o frontend usa; o spec de paridade
(`validators:check`) reprova par faltando e campo, tipo ou teto divergente (`architecture.md` §10;
`DECISIONS.md` #241).

```ts
// shared/src/validators/administrator/posts.validator.ts (Zod; Fastify e frontend)
const postFields = () => ({
  title: z.string().trim().max(160),
  body: z.string().trim().max(20_000),
})

export const AdministratorPostCreateValidator = z.object(postFields())
export type AdministratorPostCreatePayload = z.infer<typeof AdministratorPostCreateValidator>

export const AdministratorPostUpdateValidator = AdministratorPostCreateValidator.partial()
```

```ts
// backend/app/validators/administrator/posts.validator.ts (VineJS; só Adonis)
const postFields = () => ({
  title: vine.string().trim().maxLength(160),
  body: vine.string().trim().maxLength(20_000),
})

export const AdministratorPostCreateValidator = vine.create(vine.object(postFields()))

export const AdministratorPostUpdateValidator = vine.create(
  vine.object(mapFields(postFields(), (field) => field.optional().use(notNull()))),
)
```

- **Ninguém importa `zod` direto nos validators** nem `@vinejs/vine`, nem os subpaths
  (`@vinejs/vine/types`). O `z` configurado sai de `shared/src/validator.ts`; no Adonis, o `vine`
  configurado e o `Infer` saem de `#core/validator`. É por eles que as mensagens e as regras da casa
  valem em todo schema. O sensor do `pattern:check` casa `@vinejs/vine` e `@vinejs/vine/*`; o
  ESLint barra `@vinejs/vine` fora do Adonis (`tooling.md` §0.1, §4.1).
- **Todo dado de fora passa pelo validator (Zod; VineJS no Adonis) antes da regra**: params, query, body, cabeçalho usado em
  decisão, payload de webhook, mensagem de socket, payload de job, resposta de API externa
  (`typescript.md` §2). Query é tratada como possivelmente array ou objeto até o schema dizer o
  contrário.
- **Validator é forma e formato.** Unicidade e existência são do use-case via repository (409 e
  404), não da regra `unique()`/`exists()` do ORM: a mensagem por campo e o 409 com `code`
  estável são o contrato do cliente, e a regra do ORM devolveria um 422 genérico (divergência
  deliberada de `_doc-lib/lucid.md#validation`).
- **A invariante dura mora no banco também.** Toda unicidade tem índice único; todo obrigatório,
  `NOT NULL`; todo domínio fechado, `check` ou FK. O validator dá a mensagem, o índice garante.
  A corrida entre o pré-check e o INSERT cai no `catch` do repository, que reconhece a violação de
  unicidade e devolve o **mesmo** fato do pré-check (um código por conflito). Unicidade sem
  índice único é defeito.
- **Bloco reusável é função**, não constante: no VineJS, nó de schema compartilhado vaza
  `.optional()` entre validators; o Zod é imutável e não vaza, mas a casa mantém a função nos dois
  lados para os pares ficarem iguais (`paginationFields()`, `trashedField()`, `sortFields(tupla)`,
  `password()`, `email()`). Bloco usado por um recurso só fica no arquivo dele.
- **`Update` não repete o `Create` campo a campo**: no Zod, `.partial()` do create; no VineJS, os
  campos nascem de uma função do recurso e o update os torna opcionais com `notNull()` (exemplos
  acima). `convertEmptyStringsToNull` ligado no `vine` configurado do Adonis; opcional de update
  usa `notNull()` para não aceitar `null` como "apagar" (`_doc-lib/vinejs.md#getting_started`,
  `#types/object`; Zod: _doc-lib/zod.md#api).
- Validator final é constante: `export const <X>Validator = z.object(...)` ou, no Adonis,
  `vine.create(...)`, criado fora do handler. `vine.compile()` está `@deprecated` desde a 4.x.
- **Todo texto tem teto** (`maxLength`). **Quem não filtra por `search` não o aceita**:
  parâmetro aceito e ignorado promete no OpenAPI um filtro que não existe.
- **Regra que serve a mais de um campo tem nome próprio** (`cpfLength`, `phone`): a chave do
  provider é `campo.regra`, e `cpf.fixedLength` não é chave de campo nenhum. Regra que valida
  formato de value object chama o predicado do VO (`Email.isValid`, `domain.md` §3).
- **Meta-spec dos validators** (`core/validator.unit.spec.ts`, `architecture.md` §3; o mesmo no
  `shared/`) varre todo export `*Validator` e reprova: mensagem que escapou sem tradução, campo de
  texto sem teto, campo sem rótulo, rótulo órfão. Os schemas `*Response` ficam fora dela pelo
  sufixo (C7). Onde moram as mensagens e os rótulos nos três idiomas: `architecture.md` §9 e
  `i18n.md` §3–§4.
- **Schema definido em runtime** (campo que o usuário configura) não cabe em validator fixo: o
  construtor de schema mora em `shared/` (Zod) e monta da definição salva; o Adonis monta o par
  VineJS em `app/validators/` (`architecture.md` §10).

### 4.5 Response e paginação

Envelope de erro único: `{ message, status, code, errors? }` (`shared/src/responses/envelope.ts`,
`architecture.md` §10). `code` é o identificador estável que o cliente compara; `message` é texto
no idioma da requisição e nunca é comparado; `errors` é `campo → mensagem`, com a chave `root`
para o formulário inteiro. Validação reprovada é 422 com `errors`.

**Toda resposta passa por schema**, inclusive 201 e 204: o `http.ts` serializa pelo schema de
`shared/src/responses/` e o que não está nele não sai. Resposta montada à mão (`response.created(model)`,
spread de registro) é como o hash de senha e o token chegam ao cliente.

**O que sai do use-case é contrato, nunca modelo.** O tipo de `shared/src/responses/`, montado
pelo presenter a partir da entidade, ou devolvido direto pela consulta de leitura do repository
(`domain.md` §5.1). Entidade, model Lucid ou documento Mongo cru na resposta é acoplamento ao
modelo interno: renomear coluna quebra o frontend. Projeção é por allowlist (o presenter escolhe
cada campo), nunca "tudo menos a senha".

**Paginação devolve `Paginated<T>`**, montado pela implementação do repository a partir do
paginator do ORM:

```ts
// app/repositories/post/post.lucid.repository.ts
async paginate(criteria: PostListCriteria): Promise<Paginated<PostListItem>> {
  const page = await PostModel.query({ client: this.transaction.client() })
    .withScopes((scopes) => scopes.trashed(criteria.trashed))
    .where((builder) => this.applySearch(builder, criteria.search))
    .orderBy(criteria.sortField, criteria.sortOrder)
    .paginate(criteria.page, criteria.perPage)

  return { meta: page.getMeta(), data: page.all().map((row) => this.toListItem(row)) }
}
```

*(Adonis)* A doc do Lucid (`_doc-lib/lucid.md#pagination`) mostra `.serialize()`, que devolve o
mesmo envelope. A montagem à mão é decisão da casa: `toJSON()` devolve `{ meta: any; data:
ModelObject[] }`, perdendo o tipo do item; `all()` mantém `T[]`, e o `any` do `getMeta()` morre
na fronteira do `Paginated<T>` declarado.

- **Filtro, ordenação e paginação na consulta**, nunca em memória depois do `find`. Toda listagem
  é paginada.
- **`OR` de busca dentro de `where((builder) => …)`**: solto, o `OR` escapa do filtro de lixeira e
  de posse e devolve linha que não deveria.
- **Ordenação por tupla fechada**: `<RECURSO>_SORT_COLUMNS` (`as const`) no arquivo do validator do
  recurso, lida por `sortFields(tupla)`; a coluna nunca é string livre do cliente.
- O default (`PAGINATION`) mora junto de `paginationFields()` em `shared/src/validator.ts`; não há
  `const PAGE`/`PER_PAGE` por caso de uso.

**Resposta de arquivo** (exportar CSV) sai de um helper único de resposta (`sendCsv`), que põe
`Content-Type: text/csv`, `Content-Disposition: attachment` e `Cache-Control: no-store`, nunca os
três cabeçalhos à mão por rota *(opinião da casa)*.

### 4.6 Autorização

Quatro barreiras que compõem, e cada regra mora numa só:

| Barreira | Onde | Cobre | Nega com |
|---|---|---|---|
| Sessão | middleware de autenticação; negar por padrão (§4.10) | quem não está logado | 401 |
| Alcance de rota | middleware no grupo, `role(ROLE.ADMINISTRATOR)` | papel errado nem entra | 403 |
| Forma do payload | validator | campo que aquele papel não pode enviar | 422 |
| Registro | escopo de posse na consulta, ou **policy** (`app/policies/<entidade>.policy.ts`) | "só o dono vê", "editor não apaga", "ninguém rebaixa a si mesmo" | 404 ou 403 (abaixo) |

O papel na rota é sempre a constante de `shared/src/enums/` (`ROLE.ADMINISTRATOR`), nunca o
literal `'ADMINISTRATOR'`: literal não quebra o build quando o papel muda de nome.

**404 uniforme quando a existência é segredo** (C4, reescreve `DECISIONS.md` #28). Registro de
outro dono, de outro tenant ou conta oculta responde **exatamente** como registro inexistente:
mesmo status 404, mesmo `code`, mesma mensagem. Responder 403 para "existe mas não é seu" e 404
para "não existe" é o que vaza a existência, e permite enumerar ids. 403 fica para quem **vê** o
registro e não pode agir sobre ele, e para papel errado no alcance de rota, onde não há registro a
revelar. Dois mecanismos, nesta ordem de preferência:

1. **Escopo de posse dentro da consulta** quando a regra é só posse. O contrato do repository tem
   o método por intenção que já filtra: `findOwned(input: { readonly id: string; readonly ownerId:
   string }): Promise<Order | null>` (contrato por intenção, `domain.md` §5.1). Id alheio volta `null` e vira o 404 do próprio use-case; não
   existe leitura cruzada que depois é negada. É o padrão para recurso do `actor` (`/account`).
2. **Policy que recebe `Entidade | null`** quando a regra é mais que posse (papel, tenant, conta
   oculta). Nega com status 404 o que for segredo e com 403 o resto.

*(Adonis)* A policy segue a doc: estende `BasePolicy`, é gerada por `node ace make:policy` (e
renomeada para `<entidade>.policy.ts`), e a checagem passa por `ctx.bouncer`, nunca por chamada
direta de método (`_doc-lib/adonisjs.md#guides/auth/authorization`). O Bouncer é inicializado com
o `actor` do contexto, não com o model (§2.1), e a policy só importa `core/`, `domain/` e
`shared/`. A base `session-scoped-policy.base.ts` concentra o "nulo ou de outro tenant nega com 404" (a regra aqui é tenant + papel; se fosse só posse, o mecanismo 1 bastaria):

```ts
// app/policies/session-scoped-policy.base.ts
export default abstract class SessionScopedPolicy extends BasePolicy {
  // missing and foreign answer the same 404, so the response never reveals existence
  protected visibleTo(actor: Actor, teamId: string | null, notFound: string): AuthorizerResponse {
    if (teamId !== actor.teamId) return AuthorizationResponse.deny(notFound, 404)
    return true
  }
}

// app/policies/post.policy.ts
export default class PostPolicy extends SessionScopedPolicy {
  update(actor: Actor, post: Post | null): AuthorizerResponse {
    if (!post) return this.visibleTo(actor, null, t('posts.not_found'))
    const visible = this.visibleTo(actor, post.snapshot().teamId, t('posts.not_found'))
    if (visible !== true) return visible
    return actor.roles.includes(ROLE.EDITOR)   // seen but not allowed: 403
  }
}
```

```ts
// app/features/account/posts/update/update.controller.ts
async handle(context: HttpContext) {
  const body = await context.request.validateUsing(AccountPostUpdateValidator)
  const { id } = await context.request.validateUsing(IdentifierValidator, { data: context.params })
  const post = await this.posts.findById(id)          // repository contract; never *OrFail
  await context.bouncer.with(PostPolicy).authorize('update', post)

  const result = await this.useCase.execute({ ...body, postId: id, actor: context.actor })
  if (result.isLeft()) throw result.value
  return context.response.ok(result.value)
}
```

`bouncer.with(Policy).authorize(acao, registro)` lança `AuthorizationException` quando nega,
com o status que a resposta declarou; `app/exceptions/handler.ts` a converte no envelope, com o
`code` de "não encontrado" do recurso quando o status é 404, para a resposta ser idêntica à do
inexistente. `allows`/`denies` servem para quando a negação não deve interromper o fluxo;
`execute` devolve `AuthorizationResponse` para quando mensagem e código variam por regra. Não
existe quinto caminho: nenhum lugar chama `PostPolicy.update` direto. O status no `deny` é da
doc: `AuthorizationResponse.deny('Post not found', 404)`, "útil para esconder a existência do
recurso" (`_doc-lib/adonisjs.md#guides/auth/authorization`, conferida em 2026-10-14).

**Onde a doc e o formato do use-case se encontram.** A doc carrega o registro e autoriza no
controller, porque é lá que existe `ctx`; o AdonisJS não tem conceito de use-case. A casa segue
esse formato em vez de reimplementar o mapeamento para HTTP dentro do use-case. O preço é a
segunda leitura (o controller carrega para autorizar, o use-case carrega para a regra), e vale
pagá-lo; quando a regra é só posse, o mecanismo 1 dispensa a leitura no controller.

- `ctx.bouncer` **é obrigatório** em toda rota com regra por registro que não seja só posse. A
  lista dessas rotas é dado do projeto, em `scripts/pattern-check.config.ts`
  (`BOUNCER_REQUIRED`), e o `pattern:check` a cobra.
- **Leitura escopada por papel é fail-closed** *(opinião da casa)*: lookup
  `SCOPES[role] ?? NOTHING`, onde `NOTHING` devolve nenhuma linha (`whereRaw('1 = 0')` dentro da
  implementação do repository). Papel novo sem escopo vê nada, não tudo.
- Policy serve a qualquer entidade com dono (`TeamPolicy`, `PostPolicy`), não só a `User`.
- **Compor guard + sanitização num só objeto de decisão** *(opinião da casa)*: quando a
  autorização de escrita e o corte de campos que só certos papéis podem setar vêm da mesma regra,
  uma função devolve `{ decision, reason }` em vez de duas chamadas booleanas que o use-case
  combina.
- Autorização no frontend é UX; quem barra é a API, e o E2E de cada policy prova a negação pela
  rota, sem passar pela tela.
- *(Fastify)* A policy é classe injetável com a mesma assinatura `(actor, target | null)`
  (`backend-fastify.md` §3).

### 4.7 Model

O model só é importado por `repositories/` (`architecture.md` §2): ele descreve a tabela, e a
regra de negócio mora na entidade (`domain.md` §1).

*(Adonis)* O model estende a classe gerada em `database/schema.ts`, que é **reescrita a cada
`migration:run`**. Só estas coisas entram no arquivo do model, porque só elas sobrevivem:

1. Relações.
2. Estreitamento de enum, **com `@column()`**; sem o decorator o Lucid não hidrata.
3. `prepare`/`consume` de coluna `jsonb` ou `bigint`, compartilhados em `app/core/column.ts`
   (`architecture.md` §3.2), recebendo o valor do banco como `unknown` e convertendo pelo schema.
4. Query scopes (§4.8).
5. Hook só de mecânica de persistência: `@beforeCreate` para id, `@beforeSave` para hash de senha
   (`_doc-lib/lucid.md#model-hooks`). Invariante de negócio é da entidade: hook não dispara em
   update em massa, e a doc o chama de "invariante do model", isto é, da linha *(opinião da casa
   sobre a doc)*.

O model de autenticação é a exceção declarada: `withAuthFinder` e `accessTokens` são exigência do
`@adonisjs/auth`. Redeclarar o tipo de uma coluna que o gerador já declara certo é ruído; correção
de tipo que o gerador erra (inclusive o tipo de `jsonb`) vai para `database/schema_rules.ts`
(nome do framework, não se renomeia). `serializeAs: null` para credencial (hash de senha, hash de
token, token de convite) também vive ali, como defesa em profundidade: a resposta já sai pelo
presenter.

Dentro da implementação do repository:

- **`refresh()` depois de `create`** quando a coluna tem `DEFAULT` do banco: sem ele, a entidade
  reidratada não tem o valor que o banco gerou (`_doc-lib/lucid.md#crud-operations`).
- **Relação lida em laço é carregada antes** (`preload`) para não gerar N+1
  (`_doc-lib/lucid.md#relationships`: `query().preload('posts')`, conferida em 2026-10-14).
- **SQL só pelo query builder ou `db.rawQuery(sql, bindings)`.** Template literal com valor de fora
  dentro de `rawQuery` é injeção (`_doc-lib/lucid.md#raw-query-builder`); cobrável por
  `no-restricted-syntax`.
- Coluna qualificada pela tabela (`posts.id`) em todo join: a coluna ambígua só falha em runtime.

*(Fastify)* `models/<entidade>.ts` exporta o tipo do documento e o acesso à coleção; a consulta
Mongo se monta campo a campo a partir do validado, nunca `find(request.body)`
(`backend-fastify.md` §4).

### 4.8 Soft delete e ciclo de vida

*Correção sobre a doc: `_doc-lib/lucid.md#model-query-scopes`.*

```ts
export default class PostModel extends PostSchema {
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })
  static onlyDeleted = scope((query) => {
    query.whereNotNull('deletedAt')
  })
}
```

O filtro de lixeira é scope no model, aplicado **só dentro da implementação do repository**. A
doc define o gatilho: assim que o mesmo filtro aparece pela terceira vez, vira scope, sobretudo
filtro de segurança. O scope vive no arquivo do model, que não é regerado. Descartados:
`@beforeFetch()` (a doc avisa que hook não dispara em update ou delete em massa) e scope global
(não existe no Lucid). Listagem que mostra a lixeira recebe o modo no critério tipado do contrato
(`trashed: TrashedMode`, de `shared/src/enums/`), e a implementação escolhe o scope.
`whereNull('deletedAt')`/`whereNotNull('deletedAt')` fora do model é cobrado por `pattern:check`
(sensor qualificado, que pega também `posts.deleted_at`). Exceção legítima entra em
`softDeleteExempt` da configuração do `pattern:check`, com o porquê.

**Vocabulário único do ciclo de vida** (C5):

| Ação | Faz | Recusa |
|---|---|---|
| `archive` | grava `deletedAt` (transição da entidade) | já arquivado: 409 `<RECURSO>_ALREADY_ARCHIVED` |
| `unarchive` | limpa `deletedAt` | não arquivado: 409 |
| `delete` | apaga de vez, **só o arquivado** | não arquivado: 409 `<RECURSO>_NOT_ARCHIVED` |
| `bulk-archive`, `bulk-unarchive`, `bulk-delete` | o mesmo em lote | o mesmo, por item |
| `purge` | esvazia a lixeira | — |

`delete` e `purge` ficam restritos por papel no grupo de rotas. Nomes como `send-to-trash`,
`remove-from-trash` e `permanent-delete` migram para estes (a rota pública pode manter o caminho
antigo por compatibilidade, com `ponytail:`, §5.1).

**Revive-on-create** *(opinião da casa)*: quando a chave natural tem `UNIQUE` global e a linha que
a ocupa está arquivada, `create` reaproveita a linha (desarquiva e sobrescreve) em vez de
responder 409 por um registro que o usuário não vê.

### 4.9 Onde mora a lógica *(opinião da casa)*

| A lógica | Mora em |
|---|---|
| invariante, transição, cálculo do agregado | entidade ou value object (`domain.md` §1, §3) |
| consulta, recorte de linhas ou de colunas, "quem usa este arquivo" | método por intenção do repository (`domain.md` §5) |
| falar com o mundo de fora (SMTP, bucket, gateway, API de terceiro) | service com contrato (§5.3) |
| função pura sobre dado já em mãos, usada por 2+ ações | `_shared.<tema>.ts` do módulo; entre módulos, `features/_shared.<tema>.ts` |
| traduzir fato para `HTTPException` em 2+ ações do recurso | `_shared.<recurso>-refusal.ts` (`domain.md` §2) |
| montar a resposta a partir da entidade | presenter do recurso (`architecture.md` §10) |

- **`_shared` é só função pura**: não importa model, `db`, `drive`, repository concreto nem
  service. Função que passou a precisar de dependência migra para a casa dela. O `pattern:check`
  recusa `_shared` que importa model, `db` ou `drive` como valor.
- **Política que constrói a consulta é do repository.** "Posts publicados" (`paginatePublished`)
  é método por intenção, não service sem dependência que monta `Post.query()`, nem `_shared`
  que modifica uma query recebida (a feature não vê query).
- **Recorte de linha e recorte de coluna são perguntas diferentes**: quais registros aparecem é
  critério do repository; quais campos aparecem é o presenter.
- **Referência cruzada de FK é tabela declarativa** dentro da implementação do repository
  (`REFERENCES` coluna → tabela, §5.2), nunca arrays paralelos.
- **Teste de deleção**: se apagar o arquivo só move três linhas para o chamador, ele era
  passagem e não devia existir (`solid.md` §2).

### 4.10 Sessão e borda HTTP

**Autenticação nega por padrão.** Toda rota exige sessão, exceto as declaradas públicas **num
lugar só** (grupo público no registro de rotas do Adonis; marca pública no decorator do Fastify).
O `authz:check` reprova rota nova que não está em nenhum dos dois.

**Sessão por cookie.** *(Adonis)* Par de access tokens opacos (acesso curto, refresh longo) em
cookie `httpOnly`, emitidos pelo guard `cookie-access-tokens`; o refresh é **rotativo**: usar um
refresh apaga-o e emite outro, e o `DELETE` do token antigo é a seção crítica (dois refresh
concorrentes com o mesmo token: um ganha, o outro recebe 401) (`_doc-lib/adonisjs.md#guides/auth/access-tokens-guard`).
*(Fastify)* JWT assinado com RS256 e `algorithms: ['RS256']` fixo na verificação, refresh como
registro revogável no banco (`backend-fastify.md`).

- **Atributos do cookie num lugar só**, em `config/` (configuração, não service): `httpOnly`,
  `sameSite: 'lax'`, `path: '/'`, `secure` pelo getter de ambiente do leitor de ENV (nunca
  `process.env.NODE_ENV` solto), `domain` só com `COOKIE_DOMAIN` quando app e API ficam em hosts
  irmãos do mesmo domínio-pai. Sem `COOKIE_DOMAIN`, o cookie nasce host-only e o SSR do frontend
  nunca o recebe. `sameSite` é `'lax'`; vira `'none'` (sempre com `secure: true`) só quando o
  deploy põe app e API em **sites diferentes** (domínio registrável distinto, como o domínio
  próprio de cada cliente), decidido no boot comparando as URLs obrigatórias do app e da API,
  nunca derivado de ENV ausente: configuração faltando cai em `lax`, porque `none` por engano
  manda o cookie em toda requisição de outro site. Com `none`, a checagem de origem (CSRF, abaixo)
  é a única barreira e é obrigatória (`_doc-lib/fastify-plugins.md#@fastify/cookie`).
- **Sessão morre no servidor**: logout, troca de senha e mudança de papel apagam os tokens da
  conta. Token que só expira não é logout.
- **Token nunca no corpo da resposta nem em `localStorage`**: o cookie viaja sozinho.
- **Sem enumeração de conta.** Login, recuperação de senha, reenvio de confirmação e convite
  respondem igual (status, `code`, mensagem e tempo aproximado) para conta que existe e que não
  existe. "E-mail não cadastrado" é um oráculo de contas. Vale para o **cadastro**: e-mail já em
  uso não devolve 409 a quem não tem sessão; a resposta é a mesma do sucesso e o aviso vai para a
  caixa do dono do e-mail. Login com conta inexistente ainda roda a verificação de hash contra um
  hash fixo, para o tempo de resposta não separar os dois casos.
- **Link compartilhável é token opaco** (pedido, certificado, convite, recuperação): gerado com
  `randomBytes`, guardado como hash, com expiração; nunca o id interno na URL. Id público de
  registro é UUID ou ObjectId, nunca inteiro sequencial.

**CSRF** *(opinião da casa sobre a doc)*. Com sessão em cookie, `SameSite=Lax` é o mínimo e não
basta: um subdomínio irmão comprometido é *same-site* e envia o cookie. Por isso
`app/middleware/origin.middleware.ts` confere `Origin` (ou `Sec-Fetch-Site`) contra a mesma
allowlist do CORS em todo método que não é `GET`/`HEAD`, **antes do bodyparser**, e nenhum `GET`
altera estado. A checagem não olha `Content-Type` nem presença de corpo: `text/plain`,
`multipart/form-data` e `POST` vazio passam pelo navegador sem preflight e são justamente o vetor.
Requisição de escrita sem `Origin` e sem `Sec-Fetch-Site` é recusada (403 com `code`); cliente
servidor a servidor legítimo (webhook, integração) entra por rota própria com assinatura (§4.11),
não por exceção no middleware. O exemplo da doc desliga o CSRF do Shield pensando em token em cabeçalho
(`_doc-lib/adonisjs.md#guides/security/securing-ssr-applications`); a casa também o desliga, porque
a checagem de origem cobre o caso do cookie sem token de formulário. Token CSRF só entra se houver
formulário HTML servido por outro site do mesmo domínio-pai.

**CORS** com lista explícita de origens vinda do ENV e `credentials: true`; nunca `*`, nunca
refletir `Origin` sem conferir; métodos e `exposeHeaders` só os usados
(`_doc-lib/adonisjs.md#guides/security/cors`).

**Rate limit nomeado** em `start/limiter.ts`, um `limiter.define` por política, citado na rota
(`_doc-lib/adonisjs.md#guides/security/rate-limiting`; *(Fastify)* `@fastify/rate-limit`, §5 de
`backend-fastify.md`):

- Obrigatório em toda rota que aceita escrita sem sessão: sign-in, sign-up, recuperação de senha,
  reenvio de e-mail, código de verificação (OTP), upload anônimo.
- Obrigatório também em rota **cara** ou **sensível**, mesmo autenticada: chamada a IA, envio de
  e-mail ou SMS, exportação, geração de relatório, criação de cobrança (pagamento), refresh de
  sessão e troca de e-mail ou senha (`PUT /account`). Limite por usuário, para um usuário não esgotar a cota de todos.
- Sign-in com chave dupla: IP **e** conta (e-mail normalizado), com `blockFor`. Só por IP, quem tem
  muitos IPs passa; só por e-mail, dá para trancar a conta de alguém de propósito.
- Mais de uma réplica: contador em Redis.
- Excedeu: 429 com `code` estável, e o bloqueio vai para o log com a tag da rota e a chave do
  limite (sem o e-mail em claro, §5.5). Pico de 429 é sinal de ataque e entra no alerta do projeto
  (`docs/SECURITY.md`).
- **`trustProxy` para a topologia real** (número de saltos ou sub-rede do proxy, `TRUSTED_PROXIES`
  no ENV), nunca `true` às cegas: sem ele o limite conta o IP do proxy e vira global; com `true`
  exposto, o cliente forja `X-Forwarded-For`.

**Cabeçalhos de segurança na raiz**: Shield (`csp`, `xFrame`, `contentTypeSniffing`) no Adonis,
`@fastify/helmet` no Fastify. HSTS fica no default, sem `preload`; `preload` só com decisão
registrada.

**Ordem da cadeia** *(opinião da casa)*: id de requisição e logger → cabeçalhos de segurança →
CORS → origem (CSRF) → limite global, se houver → parser de corpo com teto → autenticação →
papel (grupo) → limite da rota → policy (controller) → validator → use-case. Cada middleware faz
uma coisa e termina em `return next()`. O parser de corpo tem teto explícito por grupo; corpo cru
só na rota de webhook que confere assinatura (§4.11).

### 4.11 Webhook, idempotência e transação

**Idempotência explícita** em operação atrás de rede não confiável *(opinião da casa)*: finalizar
upload, confirmar pagamento, processar webhook, aceitar convite. A segunda chamada com o mesmo
identificador é sucesso que devolve o mesmo resultado, nunca erro (`complete` duas vezes devolve
o mesmo registro; cancelar um `PENDING` já cancelado não falha).

- **Claim atômico**, nunca "ler e depois gravar": a transição é um `UPDATE … WHERE status =
  'PENDING'` (ou `findOneAndUpdate` condicional no Mongo) num método por intenção do repository
  (`claimPending`), e o número de linhas afetadas diz quem ganhou
  (`_doc-lib/mongodb.md#crud/compound-operations`). `find` antes do `insert` perde a corrida.
- A garantia final é o **índice único** no banco: a violação vira sucesso idempotente, não 500.

**Webhook de entrada** *(opinião da casa; página do provedor não conferida)*:

1. **Assinatura antes de tudo.** HMAC sobre o **corpo cru**, comparado em tempo constante
   (`timingSafeEqual`), com janela de timestamp, antes de qualquer leitura de banco. Assinatura
   inválida: 401, sem tocar em nada.
2. **Inbox de chave única.** O evento é gravado numa tabela-inbox com índice único na chave natural
   do provedor (id do evento) **antes** do efeito; reentrega bate no índice e é no-op 2xx.
3. **Resposta rápida.** 2xx assim que o evento está gravado; o efeito roda fora da requisição
   (fila, §4.12). Falha ao gravar responde 5xx para o provedor reenviar.
4. **Fora de ordem é normal.** Antes de aplicar, o handler compara um watermark (`eventAt` contra
   o último aplicado) ou busca o estado atual na API do provedor; evento velho não desfaz estado
   novo.

**Recurso limitado: corrida resolvida no banco** *(opinião da casa; `DECISIONS.md` #242)*. Todo fluxo
que lê, decide e grava sobre algo finito (estoque, cupom, saldo, crédito, vaga, convite, horário de
agenda, contador) assume que duas requisições iguais chegam no mesmo milissegundo. A proteção mora no
banco, nesta ordem de preferência:

1. **índice único** que impede o registro duplicado (reserva por horário, cupom por usuário);
2. **escrita condicional atômica** num método por intenção do repository
   (`UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0`, ou `findOneAndUpdate` com o filtro no
   Mongo), e o número de linhas afetadas decide: zero vira `left` 409;
3. **transação com lock da linha** (`forUpdate()`, `findByIdForUpdate`) quando a regra precisa ler
   mais de um valor antes de decidir.

Contrato: `forUpdate()` no select query builder e a transação gerenciada do Lucid
(`_doc-lib/lucid.md#select-query-builder`, `#transactions`); no Mongo, operação composta atômica
(`_doc-lib/mongodb.md#crud/compound-operations`: "combine read and write operations in a single atomic
statement") e índice único (`#indexes`).

Redis, fila, lock em memória, mutex no processo e leitura de cache **não** protegem: o lock em memória
não vale com duas réplicas, e o lock com expiração solta antes de a escrita acabar. Só entra se o
banco não resolve, com o motivo em `docs/DECISIONS.md`. Desabilitar o botão no frontend é conforto
de quem clica, não proteção (`frontend.md` §4). Toda escrita dessas tem o E2E de duas requisições
simultâneas (§7).

**Chave de idempotência de entrada**: rota que cria pedido, cobrança ou pagamento aceita o cabeçalho
`Idempotency-Key` (UUID gerado pelo cliente uma vez por intenção de compra, reaproveitado no retry),
grava a chave com índice único junto do actor e devolve a mesma resposta quando ela se repete. Chave
nunca é dado pessoal (e-mail, CPF). A chave de saída para o gateway é a de §5.3. *O cabeçalho
`Idempotency-Key` não tem entrada na `_doc-lib`: não coberto, opinião da casa; o mecanismo de
gravação é o índice único de cima.*

**Transação**: mais de uma escrita, uma unidade de trabalho (`domain.md` §6; neste arquivo, §4.2). Efeito
externo (e-mail, cobrança) nunca fica dentro da transação do banco: ou vai depois do commit, por
evento ou fila, ou o fluxo é idempotente para poder repetir.

### 4.12 Fora da requisição: evento, fila e comando

- **Evento de domínio** é valor que a entidade devolve; o despacho é pelo emitter do framework
  (`emitter.emit('post:archived', { postId })`), **só para efeito colateral que tolera perda**
  (e-mail de boas-vindas, aviso)
  (`_doc-lib/adonisjs.md#guides/digging-deeper/emitter`). Payload só de ids e primitivos, nunca
  entidade nem model; listener idempotente; teste com `emitter.fake()` + `assertEmitted`. Evento
  não é canal entre features: o que uma ação precisa de outra sobe para domínio, repository ou
  service. A doc avisa: evento demais deixa o fluxo impossível de seguir.
- **Efeito que não pode se perder** (cobrança, estoque, entrega de webhook de saída) vai por
  **fila** (`app/jobs/`), nunca por emitter em memória. Payload de job só de ids, validado por
  schema (Zod; VineJS no Adonis) no consumidor (`typescript.md` §2; *(Fastify)* `backend-fastify.md` §9). Falha final do
  job é registrada no registro (`failedAt`, `failureCode`) para reprocessar.
- **Comando de CLI** reusa o use-case pelo container (nunca regra própria), aceita `--dry-run`
  quando grava dado (só loga o que faria), e é repetido pelo **cron do orquestrador**. Nada de
  `setInterval` no processo web: morre no primeiro deploy e roda N vezes com N réplicas
  (`_doc-lib/adonisjs.md#guides/ace/creating-commands`, `#guides/ace/flags`).

### 4.13 Migration de banco *(opinião da casa)*

- **Mudança em produção em dois passos (expandir e contrair).** Coluna nova nasce anulável; backfill
  em lote; `NOT NULL` numa migration seguinte. Coluna removida só sai depois do deploy que parou de
  lê-la. Renomear é adicionar, copiar, trocar a leitura, remover.
- **Perda de dado é explícita**: migration que apaga dado declara `down` que recusa
  (irreversível) e é autorizada à parte, nunca contração implícita.
- **Tabela criada na branch tem a forma inteira numa migration só**: antes do merge, corrige-se a
  migration da branch em vez de empilhar migrations corretivas da mesma tabela.
- Invariante no banco (índice único, `NOT NULL`, FK, `check`): §4.4.
- Pré-deploy roda `migration:run --force`; o `Dockerfile-production` não tem `ENTRYPOINT` que
  migra (`tooling.md`).

---

## 5. Módulos de infraestrutura

Os arquivos de `core/`, `exceptions/*`, os services do piso (`storage`, `mail`) e os middlewares
transversais têm **a mesma API pública e a mesma estrutura** em todo projeto da casa; o conteúdo
de domínio varia *(opinião da casa)*. Quem abre um projeto novo já sabe o que `left`,
`HTTPException.NotFound` e `Paginated<T>` fazem.

**Código curto que humano lê ou digita** (convite, lote, passaporte) sai de um gerador com
alfabeto fixo sem caracteres ambíguos (`O`/`0`, `I`/`1`) e um laço de `N` tentativas contra
unicidade, nunca UUID nem sequência crua na tela *(opinião da casa)*. Link que não se digita usa
token opaco (§4.10).

### 5.1 Comentário em módulo de infraestrutura é genérico

O módulo tem a mesma forma em todo projeto, então o texto dentro dele também. Num módulo de
infraestrutura, um comentário **não** cita:

- **instalação, domínio ou cliente**: não "o caso desta instalação, `api.cliente.com` com
  `cliente.com`", e sim "onde os dois estão sob o mesmo domínio-pai";
- **identificador de requisito** (`RN-09`, `AD-010`, `RF-*`): esses vivem no documento de
  requisitos de **um** projeto, e a referência não resolve nos outros. Diga a regra, não o número;
- **contagem que depende do domínio**: "a contagem de uma das dez consultas" vira mentira no
  projeto que tem cinco.

O comentário (em inglês, `typescript.md` §12) explica o mecanismo e o defeito que a regra evita.
Quando o texto só faz sentido num projeto, ou ele é reescrito de forma genérica, ou o código não é
infraestrutura.

**Divergência temporária** *(opinião da casa)*: migração em andamento (troca de biblioteca,
mudança de árvore pela `MIGRATIONS.md`) que deixa código antigo e novo convivendo ganha um
comentário `ponytail: <what is temporary> — <when to remove>`, nomeando o prazo de vida da
divergência.

### 5.2 Tabela declarativa, não arrays paralelos

Onde uma lista de tabelas ou colunas alimenta uma varredura, use **uma tabela de objetos**, nunca
dois arrays casados por índice:

```ts
// wrong: inserting in the middle of one shifts every label after it, and the compiler can't tell
const counts = await Promise.all([q1, q2, q3, q4, q5])
const labels = ['a', 'b', 'c', 'd']

// right
const REFERENCES = [
  { table: 'users', column: 'avatar_id', label: 'user avatar' },
  // ...
] as const
```

Não é preferência estética: a variante com arrays paralelos já produziu um `undefined` numa
resposta 409 de produção. Mais de três parâmetros posicionais vira objeto nomeado pelo mesmo motivo.

### 5.3 Service de I/O externo: adapter

O service é o **adapter** (anticorrupção) entre a aplicação e o fornecedor (`solid.md` §2):

```ts
// app/services/payment-gateway/payment-gateway.contract.ts
export type PaymentGatewayError =
  | { readonly code: 'PAYMENT_GATEWAY_UNAVAILABLE' }
  | { readonly code: 'PAYMENT_GATEWAY_REFUSED'; readonly status: number; readonly reason: string }

export abstract class PaymentGatewayContract {
  abstract createCharge(input: { readonly orderId: string; readonly amountInCents: number }):
    Promise<Either<PaymentGatewayError, { readonly chargeId: string; readonly checkoutUrl: string }>>
}
// never: createCharge(input: Stripe.CheckoutSessionCreateParams): Promise<Stripe.Checkout.Session>
```

- **O contrato fala a língua da aplicação**: capacidade (`createCharge`, `upload`, `lookupCnpj`),
  nunca a forma da API do fornecedor. **Tipo do SDK não sai de `<nome>.service.ts`**: nem na
  assinatura do contrato, nem em `features/`, nem em `domain/`. Trocar de fornecedor é escrever
  outro `.service.ts`.
- **Falha esperada é fato da aplicação em `Either`**, declarado no contrato como união de
  `{ code }` (sem prefixo `E_`). O service nunca importa `HTTPException`; o use-case traduz pela
  tabela de `domain.md` §2.
- **Erro do fornecedor carrega status e motivo** do corpo da resposta; "Request failed" sozinho
  não serve para diagnóstico.
- **Resposta do fornecedor é `unknown` até passar por schema Zod** (`typescript.md` §2).
- **Toda chamada de saída tem teto de tempo**: `AbortSignal.timeout(ms)` (stdlib), estouro vira
  `left`. Sem timeout, um fornecedor lento segura a requisição e o pool até cair.
- **Retry só em operação idempotente** (leitura, ou escrita com chave de idempotência
  `idempotency_key = order.id`), numa camada só, com backoff exponencial e jitter. Disjuntor
  (circuit breaker) só depois que um fornecedor instável já derrubou um fluxo.
- **URL vinda do usuário** (webhook de teste, importação por URL, prévia) passa por allowlist de
  esquema `https:` e bloqueio de IP privado, loopback e metadata (SSRF), com timeout.
- **Processo externo sem shell**: `spawn(binary, [args], { shell: false })`, valor de usuário
  depois de `--`.
- O `.fake.ts` honra o mesmo `Either` da implementação real (`domain.md` §9, L) e é o que o
  unitário do use-case usa; a implementação real tem unitário contra o cliente dublado e E2E
  contra o serviço em container (`architecture.md` §8).

### 5.4 Upload e storage

- **Binário nunca atravessa a API.** Upload em três passos (`create`, `parts`, `complete`) com URL
  pré-assinada multipart; o registro nasce `PENDING` e não é anexável até o `complete`; o
  `storages:prune --dry-run` limpa o pendente abandonado.
- **Tamanho e extensão no validator** antes de assinar; a URL de escrita prende **tipo e tamanho** na
  assinatura com `signableHeaders: new Set(['content-type', 'content-length'])` no `getSignedUrl` do
  `@aws-sdk/s3-request-presigner` (o mesmo vale para a URL de cada parte do multipart, com o tamanho da
  parte). Sem isso o storage aceita qualquer tipo: o padrão do SDK não assina `content-type`, e a
  FlyDrive 2.2 (`getSignedUploadUrl` do driver S3) chama o `getSignedUrl` sem `signableHeaders`; com
  ela, a assinatura passa pelo `urlBuilder.generateSignedUploadURL` do disco. Provado no MinIO de teste
  em 2026-10-14: sem a opção, `PUT` de SVG numa URL emitida para PNG deu 200; com ela, tipo errado e
  tamanho errado deram 403 (`_doc-lib/adonisjs.md#guides/basics/file-uploads`, `_doc-lib/flydrive.md`). No multipart cada parte
  tem a própria URL, então a assinatura **não** limita o tamanho total: ele é provado no `complete`,
  lendo o tamanho real do objeto gravado (`getMetaData().contentLength`) e apagando o que passar do
  teto.
- **Conteúdo conferido no `complete`**: magic bytes (ou o `Content-Type` do objeto gravado) contra
  a allowlist, não só a extensão declarada.
- **Chave do objeto gerada no servidor** (`randomUUID()`); nome original só como metadado. Nunca
  caminho montado com entrada do usuário (path traversal).
- **Tipo ativo (HTML, SVG, XML) nunca servido inline da origem do app**: fora da allowlist, ou
  servido com `Content-Disposition: attachment` de bucket ou domínio separado.
- **Bucket privado por padrão**; leitura por URL assinada de expiração curta (`getSignedUrl`).
  Público só o prefixo de mídia de vitrine, declarado. Credencial do bucket com escopo mínimo e
  CORS do bucket com `ETag` exposto ficam em `docs/SECURITY.md` e `docs/ENV.md` do projeto.
- Upload anônimo não existe: todo arquivo tem dono (`actor`) desde o `create`.
- **Toda regra acima tem teste e2e contra o MinIO local** (`tooling.md` §8.4), e o teste falha se a
  regra quebrar:

  | Regra | Teste |
  |---|---|
  | bucket privado | `GET` anônimo no objeto: 403 |
  | sem upload anônimo | `create` sem sessão: 401 |
  | tamanho e extensão no validator | `create` acima do teto ou fora da allowlist: 422, sem URL gerada |
  | tipo e tamanho na assinatura | `PUT` com `Content-Type` ou tamanho diferente do assinado: 403 do storage |
  | URL expira | `PUT` depois do prazo: 403 |
  | conteúdo conferido | `.png` com bytes de SVG: recusado no `complete` e objeto apagado |
  | tamanho total | soma das partes acima do teto: recusada no `complete` |
  | chave do servidor | nome com `../` vira metadado; a chave é UUID |
  | tipo ativo nunca inline | leitura de SVG/HTML com `Content-Disposition: attachment` |
  | escopo mínimo | usuário da app recebe 403 em outro bucket |
  | pendente abandonado | `storages:prune` marca o `PENDING` velho |
  | CORS do upload | resposta com `Origin` permitida traz `ETag` em `Access-Control-Expose-Headers` |

  Resultado contra o MinIO de teste (2026-10-14): GET anônimo 403; URL expirada 403; tipo e tamanho
  fora da assinatura 403 (com `signableHeaders`); leitura assinada com `attachment`; usuário da app
  com 403 em outro bucket e ao criar bucket; `ETag` exposto. O tamanho real do multipart sai no
  `HeadObject` do `complete`.

### 5.5 Log

- **Redação configurada no boot** (`config/logger.ts`): `password`, `*.password`, `token`,
  `*.token`, `refreshToken`, `headers.authorization`, `headers.cookie`, `set-cookie`, documento
  (CPF/CNPJ) (`_doc-lib/adonisjs.md#guides/digging-deeper/logger`). Nunca o body inteiro.
- **Log registra decisão e resultado com identificadores** (`order=… amount=… reason=…`), não
  narra passo. Nível: `info` resultado normal, `warn` sucesso anômalo ou recusa relevante, `error`
  quebra.
- **Evento de segurança tem linha própria e estável** *(opinião da casa)*: login falho, bloqueio
  por limite, negação de policy, troca de senha ou papel, com tag `[security > <event>]`, id da
  requisição e id do ator, sem PII.
- **Handler global único**: produção nunca devolve stack, SQL, caminho de arquivo nem mensagem de
  exceção desconhecida; o 500 sai genérico, o detalhe vai para o log
  (`_doc-lib/adonisjs.md#guides/basics/exception-handling`). Só `HTTPException` e erro de validação
  saem com a própria mensagem; qualquer outro erro vira o envelope 500 com `code` fixo **antes** de
  chegar ao `super.handle` ou ao `reply.send`, porque o renderer padrão do framework repassa
  `error.message` cru (mensagem de driver com nome de tabela, coluna e valor). O mesmo vale para
  worker, job e stream (SSE, chat): o que vai para o cliente é `code` + mensagem traduzida.

### 5.6 Runtime Node *(opinião da casa sobre a doc do Node 24)*

O que o framework não decide e o Node deixa aberto. Contrato: `_doc-lib/nodejs.md`; o roteiro de
uso é a skill `maiyu-node`. Decisões #215 a #223.

1. **Erro relançado leva a causa; decisão é pelo `code`.** Erro de infraestrutura que sobe como
   outro erro nasce com `new Error(mensagem, { cause: erroOriginal })`, nunca concatenando a
   mensagem e nunca perdendo a pilha original. Decisão sobre erro (status, retry, tradução) compara
   `error.code`, nunca `error.message`: a doc diz que `code` é a forma mais estável de identificar o
   erro e que a mensagem pode mudar entre versões. _doc-lib/nodejs.md#api/errors.
2. **Erro que escapou derruba o processo.** O modo padrão de `--unhandled-rejections` (`throw`)
   fica como está. Ouvinte de `uncaughtException` ou `unhandledRejection` só registra no log e sai
   com `process.exitCode = 1`; nunca segue atendendo, porque a doc diz que depois de um
   `uncaughtException` a aplicação está em estado indefinido e não é seguro retomar. Quem sobe de
   novo é o orquestrador. _doc-lib/nodejs.md#api/process.
3. **Stream se encadeia com `pipeline`.** `pipeline` de `node:stream/promises` em todo
   encadeamento (upload, export, descompressão, proxy de arquivo): ele propaga o erro e destrói
   todos os streams quando um falha. `.pipe()` não faz isso e deixa descritor e memória presos; o
   ESLint recusa (`tooling.md` §4, `no-restricted-properties`). _doc-lib/nodejs.md#api/stream,
   #api/stream#streams-promises-api, #learn/modules/backpressuring-in-streams.
4. **Id da requisição chega ao log sem passar de mão em mão.** É o id que a §5.5 exige.
   - Adonis: `generateRequestId: true` no `http` de `config/app.ts` (aceita o `X-Request-Id` que o
     proxy manda) e `useAsyncLocalStorage: true`; o `ctx.logger` já sai marcado com o id, e quem está
     fora do controller lê o contexto por `HttpContext.get()` dentro de um ponto só do `core/`
     (_doc-lib/adonisjs.md, páginas `guides/basics/request` e `guides/basics/http-context`).
   - Fastify: `genReqId` com `randomUUID()` e `requestIdHeader` só quando o proxy de confiança
     manda o cabeçalho (default `false`); fora do handler, `app/core/request-context.ts` guarda o
     `request.log` num `AsyncLocalStorage`, preenchido no hook `onRequest`
     (_doc-lib/fastify.md#Reference/Server, #Reference/Logging).
   - Job e comando, que não têm requisição: logger filho com o id do job.
   - `AsyncLocalStorage`, nunca `async_hooks` cru: a doc recomenda o primeiro por desempenho e
     segurança de memória. _doc-lib/nodejs.md#api/async_context.
5. **Desligamento limpo, com teto.** No Adonis o Ignitor ouve o sinal e chama o `shutdown()` dos
   providers; o que a aplicação abre (fila, cliente externo) fecha ali. No Fastify,
   `bin/server.ts`, nesta ordem, ao receber `SIGTERM` ou `SIGINT`:
   1. `app.close()`: para de aceitar conexão, responde 503 ao que chega depois
      (`return503OnClosing`, default `true`) e fecha as conexões ociosas
      (`forceCloseConnections`, default `"idle"`);
   2. fecha os workers de fila, deixando o job em curso terminar;
   3. fecha banco e Redis;
   4. `process.exitCode = 0` e deixa o processo esvaziar, sem `process.exit()`, que corta escrita
      de log pendente.

   Um `setTimeout(...).unref()` arma o teto: estourado, loga e sai com `exitCode = 1`. O teto fica
   abaixo do prazo de parada do orquestrador. `unref` porque o próprio timer não pode segurar o
   processo vivo. _doc-lib/nodejs.md#api/process, #api/timers, #api/http.
6. **Hash de senha no Fastify é `scrypt` da stdlib.** O Adonis já traz `hash.use('scrypt')`
   (_doc-lib/adonisjs.md, entrada do `withAuthFinder`); o Fastify não traz nada. A casa usa o
   mesmo algoritmo nos dois:
   - `crypto.scrypt` com sal de `randomBytes(16)` e os parâmetros gravados junto do hash, para
     poder subir o custo sem invalidar senha antiga;
   - comparação por `crypto.timingSafeEqual`;
   - um service injetável (`app/services/hash/`), nunca função solta.

   `crypto.argon2` existe desde a 24.7; troca de algoritmo é decisão nova, não preferência de
   quem escreve. Biblioteca de hash não entra: a stdlib resolve (`ponytail`).
   _doc-lib/nodejs.md#api/crypto.
7. **Tetos do servidor HTTP.** O `keepAliveTimeout` da API fica **acima** do tempo ocioso do
   proxy na frente: quem fecha a conexão ociosa é o proxy, e não a API no meio de uma requisição
   que o proxy reaproveitou (o sintoma é 502 esporádico). No Fastify, `requestTimeout` diferente de
   zero (o default é `0`, sem limite, e a doc manda definir para não ficar exposto sem proxy). No
   Adonis valem os defaults do Node (`requestTimeout` 300 s, `headersTimeout` 60 s,
   `keepAliveTimeout` 5 s); como mudar o `keepAliveTimeout` lá a doc do Adonis não cobre: o projeto
   registra a escolha em `docs/ARCHITECTURE.md`. _doc-lib/nodejs.md#api/http,
   _doc-lib/fastify.md#Reference/Server.
8. **Entrada de fora tem teto.** Descompressão de dado que veio de fora (upload `.gz`, corpo
   comprimido, import) passa `maxOutputLength` ao `zlib`; sem ele, um arquivo pequeno vira gigabytes
   em memória. O bloqueio de IP da URL vinda do usuário (§5.3) se faz com `net.BlockList`, sobre o
   endereço **resolvido** pelo `dns`, não sobre o texto da URL: hostname que aponta para
   `127.0.0.1` passa por qualquer filtro de texto. _doc-lib/nodejs.md#api/zlib, #api/net, #api/dns.
9. **Recursos do runtime antes de pacote.**
   - Script de CI ou de manutenção que lê e escreve arquivo roda com `--permission` e só os
     `--allow-fs-*` de que precisa. A doc chama isso de cinto de segurança contra erro de código
     confiável, **não** de proteção contra código malicioso; não substitui o isolamento de
     `isolated-vm`.
   - Observabilidade (tempo de consulta, chamada HTTP de saída) assina `diagnostics_channel`, que é
     estável, em vez de remendar o módulo.
   - Alias de import segue o `"imports"` do `package.json` (`architecture.md` §3). A forma `#/`
     só é aceita a partir da 24.14, e o piso da casa é o 24, então alias novo continua no formato
     `#<nome>/*`.

   _doc-lib/nodejs.md#api/permissions, #api/diagnostics_channel, #api/packages.

### 5.7 Segurança por classe de ataque *(opinião da casa sobre a skill `security-audit`)*

Lacunas que a skill `security-audit` (Cloudflare, `.claude/skills/security-audit/`) aponta para esta
stack e que as seções acima não fechavam. Cada item completa a seção citada, sem repeti-la, e a fonte
é a página da skill entre parênteses. `DECISIONS.md` #230.

**Entrada e dado**

1. **Nome de identificador vindo de fora** (§4.7). Coluna, tabela ou chave de documento criada a
   partir de configuração do usuário tem nome gerado pelo servidor (`f_<uuid>`) ou casa
   `^[a-z][a-z0-9_]{0,62}$` fora de uma lista de reservados (`__proto__`, `constructor`,
   `prototype`, `_id`, prefixo `$`, ponto). Entra no SQL só por binding de identificador do Knex
   (`??`), nunca interpolado. *(ATTACK-CLASSES.md, Injection; segunda ordem.)*
2. **Prototype pollution** (§4.4). Nada de merge recursivo nem atribuição por caminho com chave
   vinda de fora; objeto indexado por chave dinâmica é `Map` ou `Object.create(null)`. *(CLIENT-SIDE.md,
   Prototype pollution.)*
3. **Valor confiado ao cliente** (§4.4, `domain.md` §3). Preço, desconto e total saem do banco
   dentro do use-case, nunca do payload. Dinheiro é inteiro em centavos; quantidade é inteiro `>= 1`
   com teto no validator. Teste com negativo, zero e acima do teto. *(ATTACK-CLASSES.md, Business logic.)*
4. **Fórmula em CSV** (§4.5, `sendCsv`). Célula que começa com `=`, `+`, `-`, `@`, tab ou CR sai
   prefixada com `'`, como já faz o `backend-fastify.md`. *(ATTACK-CLASSES.md, Injection em sistema secundário.)*

**Sessão, conta e borda**

5. **URL absoluta não nasce de cabeçalho** (§4.10). Link de e-mail, recuperação, convite,
   `success_url` de pagamento e sitemap se montam da variável de endereço do site (§6), nunca de
   `request.host()` nem de `X-Forwarded-Host`. E2E com `Host` forjado. *(WEB-PROTOCOL-AND-AUTH.md,
   Host and forwarded-header trust.)*
6. **Token de recuperação e de verificação** (§4.10). Consumo é claim atômico de uso único; o sucesso
   apaga os outros tokens pendentes da conta e encerra as sessões. Reuso responde igual a token
   inválido, com E2E. *(WEB-PROTOCOL-AND-AUTH.md, Password reset.)*
7. **Troca de senha e de e-mail** (§4.10). Exige a senha atual. E-mail novo só vale depois de
   confirmado por link no próprio endereço, com aviso ao antigo e sessões rotacionadas.
   *(WEB-PROTOCOL-AND-AUTH.md, Account linking; Step-up.)*
8. **Resposta autenticada não é cacheável** (§4.10). Middleware global põe
   `Cache-Control: private, no-store` em toda resposta com sessão, com E2E. *(WEB-PROTOCOL-AND-AUTH.md,
   Cache deception.)*
9. **SSRF por redirect e DNS rebinding** (§5.3, §5.6 item 8). Busca de URL do usuário com
   `redirect: 'manual'`, revalidando cada salto, e conexão feita ao IP já conferido (resolve uma
   vez e fixa). *(ATTACK-CLASSES.md, Resource and file handling.)*

**Autorização e ciclo de vida**

10. **Exportação, importação e lote** (§4.6). Export usa o mesmo método escopado da listagem (posse,
    tenant, lixeira); import passa cada linha por validator, policy e use-case; lote autoriza item
    por item, com E2E de id alheio no meio do lote. *(DATA-ISOLATION-AND-LIFECYCLE.md, Export and
    backup scope; Import and restore authority.)*
11. **Reaproveitar linha arquivada** (§4.8). Só quando é do mesmo dono e tenant, zerando relações,
    anexos e campos antigos; fora disso, linha nova. *(DATA-ISOLATION-AND-LIFECYCLE.md, Soft-delete
    bypass; Restore.)*
12. **Purge sem cópia derivada** (§4.8). `delete` definitivo e `purge` apagam o objeto do storage,
    cancelam os jobs pendentes do registro e invalidam o cache, com teste de que nada o recria.
    *(DATA-ISOLATION-AND-LIFECYCLE.md, Retention and queued-work overrun.)*

**Fora da requisição** (§4.12)

13. **Job relê antes de agir.** O worker relê registro e actor na execução e aborta se o registro foi
    arquivado ou se o actor perdeu tenant ou papel. Payload só de ids, sem PII; `removeOnFail` com
    retenção finita. *(DATA-ISOLATION-AND-LIFECYCLE.md, Stale authorization; PROTOCOLS-RPC-AND-MESSAGING.md,
    Dead-letter.)*
14. **Job idempotente.** Efeito não idempotente leva `jobId` determinístico (`charge:<orderId>`),
    `attempts` e `backoff` explícitos, e o efeito usa o claim atômico de §4.11.
    *(PROTOCOLS-RPC-AND-MESSAGING.md, Duplicate delivery.)*
15. **Chave de Redis com namespace.** `prefix` da fila, chave de cache e chave de limite levam projeto
    e ambiente; chave de cache por recurso leva tenant e actor. *(DATA-ISOLATION-AND-LIFECYCLE.md,
    Namespace collision.)*
16. **Canal de tempo real autorizado.** Todo canal privado de SSE (Transmit) tem `authorize` que
    chama a policy do actor sobre o id do canal. *Transmit sem entrada na `_doc-lib`: não coberto,
    conferir a API ao adotar.* *(PROTOCOLS-RPC-AND-MESSAGING.md, Streaming authorization.)*

**Segredo** (§6)

17. Credencial guardada em banco no Adonis segue a cifra de `backend-fastify.md` §10 (HKDF, AAD,
    `enc:vN`). *(CLOUD-AND-DEPLOYMENT.md, Secret exposure.)*

---

## 6. Variáveis de ambiente *(opinião da casa)*

Um só leitor, `start/env.ts` (`Env.create` no Adonis; leitor síncrono no Fastify,
`architecture.md` §5), com blocos nesta ordem: `# Node` · `# App` · `# Session` · `# CORS` ·
`# Banco de dados` · `# Armazenamento` · `# Semeadura` · `# Envio de e-mail` ·
`# Endereço do site` · `# Fila`, e depois os blocos de domínio do projeto. Chave da casa tem o
mesmo nome, validador e comentário em todo projeto.

Regras:

- **Toda chave lida pelo leitor é declarada no schema**, e vice-versa. Cobrado por
  `pattern:check`.
- **Chave morta sai.** Chave declarada que nenhum código lê é removida. O que nunca passa pelo
  leitor fica listado à parte na configuração do `pattern:check`: `PORT` e `HOST` (lidas em
  `process.env` pelo framework), `NODE_ENV` (lida pelo carregador antes de haver serviço de env)
  e `TZ` (lida pelo próprio Node).
- **Chave opcional por instalação** (integração que só um cliente usa) é obrigatória onde a
  funcionalidade existe e opcional onde não existe.
- **Segredo e credencial não têm default.** A aplicação para em vez de subir com um valor que
  ninguém escolheu: `SEED_OWNER_PASSWORD`, `MAIL_FROM`, `SMTP_HOST`, chave de gateway de
  pagamento, chave de assinatura de webhook.
- **Default inseguro é declarado no comentário**, com o motivo. `DATABASE_SSL` ausente significa
  TLS desligado, e isso está escrito.
- **Chaves de borda da casa**: `CORS_ORIGINS` (lista explícita, nunca `*`), `COOKIE_DOMAIN`
  (opcional, §4.10), `TRUSTED_PROXIES` (bloco `# App`, §4.10).
- **`config/` só exporta valor.** Decisão sobre configuração (ambiente é produção?) é getter do
  leitor de ENV; configuração que vem do banco (preferência da instância) é repository.
- `.env` e variantes de ambiente real **não são versionados**. Versionam-se `.env.example` e
  `.env.test`; o segundo só tem endereço de container local e senha de banco de teste.

---

## 7. Testes

Onde cada teste mora e o que cada camada leva é de `architecture.md` §8; o ciclo TDD, os dublês e
o critério de aceite em EARS são de `domain.md` §10. Japa no Adonis (suítes `unit` e
`functional`), Vitest no Fastify (configs `unit` e `e2e`). Aqui fica o que é próprio da borda
HTTP.

**Matriz mínima do E2E por tipo de ação** *(opinião da casa)*:

| Tipo | Casos |
|---|---|
| leitura pública | 200; 404 |
| leitura privada | 200; 401; 404 para inexistente **e** para alheio, com corpo idêntico (§4.6) |
| criação | 201; 401; 403 de papel; 422 com o campo; 409 de unicidade |
| atualização | 200; 401; 403; 404 (inexistente e alheio); 422; 409 |
| ciclo de vida | 200; 401; 403; 404; 409 de estado (`ALREADY_ARCHIVED`, `NOT_ARCHIVED`) |
| sign-in e afins | 200; 401 uniforme para conta inexistente e senha errada; 429 na N+1-ésima tentativa |
| webhook, job, comando | duas execuções com o mesmo identificador deixam o mesmo estado, em sequência **e** simultâneas (`Promise.all`) |
| recurso limitado e pagamento | duas requisições simultâneas iguais: só uma tem efeito, a outra recebe 409 ou a mesma resposta (`Idempotency-Key`); estoque, saldo e contador nunca ficam negativos (§4.11) |

- **Depois de todo 4xx de escrita, a asserção "não gravou"**: o estado no banco é o de antes.
- **Par recusa + aceita** para toda regra de recusa: só o teste da recusa passa também contra um
  endpoint que recusa tudo.
- **Toda correção de segurança nasce com uma spec que falha antes do fix.**
- **Spec que prova a redação de log**: loga um sign-up e afirma que a senha não aparece.
- **Factory nasce com o papel menos privilegiado**; privilégio é `state` explícito
  (`_doc-lib/lucid.md#model-factories`). Dublê de I/O trocado no container (`swap`/`restore`,
  `_doc-lib/adonisjs.md#guides/testing/test-doubles`).
- **Fixtures por tema em `tests/<tema>-fixtures.ts`** (`session-fixtures.ts`,
  `database-fixtures.ts`), nenhum `helpers.ts` (C12, `typescript.md` §6). Helper usado por uma
  spec fica nela; por duas ou mais, sobe. O mesmo vale para `tests-e2e/support/<tema>.ts`.
- Objeto real em teste E2E vem do container (§2.1).
- **E2E nunca toca banco de produção.** O bootstrap dos testes recusa subir se o banco não for o de
  teste (nome com sufixo `_test`, host do compose de teste, §8.4 de `tooling.md`) e sai com erro
  antes da primeira migration. A doc do Adonis manda banco e storage separados, com `.env.test`, e
  limpeza entre testes por `testUtils.db().truncate()` (`_doc-lib/adonisjs.md#guides/testing/resetting-state-between-tests`);
  no Fastify a guarda mora no `globalSetup` do Vitest (`_doc-lib/vitest.md#config/globalsetup`). Mock só do que é externo (gateway, e-mail, API de terceiro); banco,
  regra e policy rodam de verdade.
- **O `it` é a frase do comportamento**, em pt-BR, no formato "quando …, …" ("quando o mesmo
  evento chega 2 vezes, libera o plano 1 vez só"). O dono lê e aprova a frase; o corpo é do agente
  (`_doc-lib/japa.md#docs/grouping-tests`, `_doc-lib/vitest.md#api/test`).
- Meta: **≥ 2,0 specs de asserção por controller**, medida por relatório *(opinião da casa)*.

**Redes obrigatórias** (meta-specs que cobram o que ninguém lembra), ao lado do que cobrem:

| Spec | Reprova |
|---|---|
| `core/validator.unit.spec.ts` | as quatro checagens de §4.4 |
| `core/openapi/openapi.e2e.spec.ts` | rota fora do documento, operação sem resposta, id duplicado |
| `middleware/<nome>.middleware.e2e.spec.ts` | matriz de papéis, cookie, CORS, origem (CSRF), idioma |
| vazamento por allowlist | resposta que contém chave proibida (`password`, hash de token) em qualquer nível da árvore |
| coluna qualificada | join com coluna ambígua |
| SDK só no adaptador | import de SDK de fornecedor fora de `services/<nome>/<nome>.service.ts` |
| vitrine só leitura | rota pública que não é `GET` sem estar na lista declarada |
| mensagens i18n | chave faltando ou sobrando em `pt-BR`/`es`/`en` (`i18n.md` §4) |

Piso de specs de ação: autenticação, conta, papéis, cookie, CORS, documentação, mensagens,
storage, validator, limite de login.

- **Migration standalone** (perfil sem runner do framework) *(opinião da casa)*: processo próprio,
  sem subir kernel/container, idempotente, `process.exit(1)` na falha. A spec roda o arquivo por
  `child_process` contra banco isolado, nunca `import` direto, que derruba o runner se falhar.
- **Spec de script de guard-rail** (§10) fica ao lado do script: `scripts/<nome>.unit.spec.ts`,
  sem container (`architecture.md` §8).
- **Suíte E2E sequencial** *(opinião da casa)*: só quando o cenário é caro de montar (tenant,
  extensões, dado dinâmico). Mora em `tests-e2e/`, arquivos com prefixo numérico de ordem
  (`01-<tema>.e2e.spec.ts`) e `zz-` para o que roda por último; estado compartilhado entre
  arquivos é explícito. A spec ao lado da ação continua obrigatória: a sequencial soma.

---

## 8. Documentação

Onde moram `AGENTS.md`, `CLAUDE.md` e `docs/` é de `documentation.md` §3 (raiz com `AGENTS.md` e
`CLAUDE.md` = `@AGENTS.md`); o que cada arquivo de `docs/` guarda, de `documentation.md` §1. Não
existe `CLAUDE.md`/`AGENTS.md` por camada, módulo, recurso ou operação *(opinião da casa)*: a
árvore é a mesma em todo projeto, e a pasta da ação já é autoexplicativa.

**Doc de operação é derivada do OpenAPI, por comando.** Endpoint, auth, permissão, payload e
tabela de erros saem do `openapi.json`, gerado do router de verdade (`openapi.md`). O porquê de uma
regra mora no comentário do use-case, ao lado do código. Tabela redigida à parte envelhece na
primeira mudança. Número que um comando gera (rotas, controllers) não se escreve à mão.

---

## 9. Commits

Formato, idioma, autoria e hooks: `tooling.md` §6. O que é próprio do backend:

- Um commit é uma mudança lógica completa que compila e passa nos testes.
- Todo `fix` leva o teste de regressão escrito antes da correção (`tooling.md` §10.3).
- O tipo reflete o que mudou: correção de bug é `fix`, não `chore`; rearranjo sem mudança de
  comportamento é `refactor`, não `feat`.
- **`refactor` não muda contrato.** Rota, status, `code` de erro, forma de resposta e ordem ficam
  iguais; a prova é o mesmo E2E verde antes e depois e o `openapi:check` sem diff. Uma fronteira
  de dono por commit (mover um recurso, extrair um repository), cada estado intermediário
  compilando e verde *(opinião da casa)*.

```
feat(posts): aceita anexo de imagem na publicacao
fix(files): exige sessao e posse no download
refactor(posts): extrai o repository de post
```

---

## 10. Guard-rails *(opinião da casa)*

```
check = lint + typecheck + openapi:check + pattern:check + authz:check + test:unit
```

| Script | O que reprova |
|---|---|
| `lint` | as regras de §2, `new` fora da allowlist (§2.1), ordem de import e `eslint-disable` sem motivo (bloco comum de `tooling.md` §4.1) |
| `typecheck` | `tsc --noEmit` |
| `openapi:check` | `openapi:generate --check --strict`: documento desatualizado, ou operação sem resposta descrita |
| `pattern:check` | o que o ESLint não alcança porque depende de *onde* o arquivo está: a árvore inteira de `architecture.md` §6; nomes derivados do caminho (§3); camada que importa outra (§1.3); `@vinejs/vine` e subpaths fora do `vine` configurado do Adonis; validator do Adonis sem par no `shared/`; spread de corpo cru em controller (§4.1); `throw` e `*OrFail()` em use-case e repository; `actor` com outro nome; policy fora do mecanismo do framework e `BOUNCER_REQUIRED` (§4.6); filtro de `deletedAt` fora do model, inclusive qualificado (§4.8); `_shared` com I/O (§4.9); diretórios obrigatórios; as checagens de ENV (§6) |
| `authz:check` | mudança na cadeia de autorização de qualquer rota, e rota nova fora da lista pública e sem sessão (§4.10), contra `app/core/openapi/authz-baseline.json` |
| `test:unit` | a suíte `unit`, sem banco |
| `di:check` | constrói todo service, repository e policy pelo container e reprova o que não sobe; **reprova também se encontrar zero alvos** (varredura vazia é guard que não guarda) |

O hook de `pre-commit` é de `tooling.md` §6. `di:check` e a suíte E2E ficam fora do `check`
porque bootam a aplicação com banco: o CI os roda no job que tem banco e bucket de pé
(`tooling.md` §7). *(Fastify)* `di:check` resolve cada registro do registry, e `openapi:verify`
(comparar resposta real com o schema publicado) **existe**: o serializer do Fastify coage em
silêncio o que não bate (`openapi.md` #verificacao-de-serializacao). *(Adonis)* `openapi:verify`
não existe: o `--strict` e a spec de documentação cobrem o caso comum, e ele entra quando um
defeito real passar pelas duas.

`boot:check` não existe: toda spec E2E boota a aplicação, e uma que não sobe reprova a suíte
inteira antes de qualquer asserção.

**Formato de saída de todo `scripts/<nome>-check.ts`** *(opinião da casa)*: cada achado é
`{ arquivo, linha, regra, secao, mensagem }` (`secao` = seção do `_standards` violada); a saída
agrupa por `secao` e o processo sai com código 1 se a lista não for vazia. Exceção de qualquer
check entra em `scripts/pattern-check.config.ts` tipado, cada uma com `motivo`; exceção sem uso
reprova (`architecture.md` §6).

**Revisão de diff de backend** (o que nenhum guard pega): a lista de segurança comum está em
`tooling.md` §10.2. Próprio do backend: rota pública nova sem limite e resposta que expõe campo fora
do presenter.

---

## 11. Mudar o padrão

Este repositório é o upstream único. Projeto não edita a própria cópia de `_standards/`,
`_doc-lib/` nem das skills da casa: a próxima sincronização sobrescreve.

**CI/CD do projeto nunca depende deste repositório** *(opinião da casa)*: nenhum workflow, script
de `package.json`, Dockerfile ou deploy do projeto clona, baixa ou chama `maiyu-pattern`. A cópia
de `_standards/`/`_doc-lib/`/skills é commitada no projeto e basta para ele construir, testar e
publicar sozinho. A conferência `node scripts/sync-to-project.mjs <dir> --check` roda **à mão,
daqui**, quando a régua muda. **Por quê:** CI que depende de outro repositório quebra quando ele
muda, sai do ar ou fecha o acesso, e trava o deploy de um projeto por causa de um documento que
nem afeta o código dele.

1. A necessidade aparece num projeto → a mudança é feita **aqui**, com linha nova em
   `_standards/DECISIONS.md` (o quê, onde, por quê).
2. `node scripts/sync-to-project.mjs <dir-do-projeto>` copia para cada projeto.
3. Um commit por projeto, Conventional (`docs(standards): …`).
4. Código do projeto que passa a divergir migra pelo roteiro de `MIGRATIONS.md`; enquanto convive,
   leva o comentário `ponytail:` da §5.1.

Divergência permanente de projeto não existe: ou a régua muda para todos, ou o projeto migra.

### 11.1 Migrar model direto para repository *(opinião da casa)*

Projeto que usa o model no use-case migra **por módulo, ao mexer** (`DECISIONS.md` #111), por
Branch by Abstraction:

1. **Caracterização**: o E2E da ação existente registra o comportamento atual, bug incluso, sem
   corrigir nada.
2. **Contrato + implementação ORM** que embrulha as consultas atuais, sem mudar o que fazem.
3. **Use-cases trocados um a um** para o contrato, cada troca num commit verde.
4. **Implementação em memória + teste de contrato** nas duas (`domain.md` §5.3–§5.4); o unitário do
   use-case passa a existir.
5. **Remove a exceção** do `pattern-check.config.ts` que permitia o model na feature.

Enquanto convivem, o código antigo leva `ponytail:` (§5.1). Correção de bug achado na caracterização
é um `fix` separado, depois.
