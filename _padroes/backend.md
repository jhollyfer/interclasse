# Padrão de backend

A régua de todo backend da casa, qualquer que seja o framework. A árvore, as camadas e os nomes
estão em [`arquitetura.md`](arquitetura.md); este arquivo diz **como** cada camada se escreve e
por quê. O que só vale para um framework aparece como **nota de adaptador** *(Adonis)* ou
*(Fastify)*; o perfil Fastify completo está em [`backend-fastify.md`](backend-fastify.md).

Este repositório é o **upstream**: projetos recebem `_padroes/`, `_doc-lib/` e as skills por
`node scripts/sync-to-project.mjs <dir>` e cobram a cópia no CI com `--check` (§11).

---

## 0. A hierarquia de autoridade

Quando duas fontes discordam, esta é a ordem:

1. **`_doc-lib/`** — snapshots das docs oficiais. Manda acima de tudo.
2. **O tipo instalado** (`node_modules/<pkg>/**/*.d.ts`) — quando o snapshot não cobre o
   ponto. É prova, não opinião.
3. **Este documento** (e `arquitetura.md`).
4. **O código existente.**

Se o código contradiz a doc oficial, o código está errado — mesmo que esteja assim em todo
projeto. Três decisões deste documento nasceram exatamente desse conflito (soft delete,
paginação e autorização); estão marcadas abaixo.

Quando nem o snapshot nem o tipo instalado cobrem o assunto, diga "não coberto" e decida
com o critério declarado aqui. Não invente prescrição de doc.

---

## 1. Organização

### 1.1 `app/`

A árvore é a de [`arquitetura.md` §3](arquitetura.md#3-árvore-do-backend), igual em todo
backend. Obrigatórios, mesmo que mínimos ou quase vazios:

| Diretório | Conteúdo |
|---|---|
| `app/core/` | `either.ts`, `entity.ts`, `validator.ts`, `response.ts`, `openapi/`. Nada de feature. |
| `app/features/` | `<módulo>/<recurso>/<ação>/` (§1.2), `<recurso>.validator.ts` (§4.4) e `_shared.<tema>.ts` |
| `app/exceptions/` | só `http.exception.ts` e `handler.ts` |
| `app/models/` | um arquivo por entidade, `<entidade>.ts` |
| `app/services/` | `<nome>/<nome>.service.ts` (+ `<nome>-contract.service.ts` quando é I/O externo). Piso da casa: `cookie`, `multipart`, `slug`, `storage` |
| `app/middleware/` | `<nome>.middleware.ts`: os transversais (auth, papel, CORS) e os de domínio |
| `app/policies/` | `<entidade>.policy.ts`. `user.policy.ts` é obrigatório — todo projeto opera contas, e a regra por registro mora aqui, não num `if` por caso de uso (§4.6) |

*(Adonis)* `app/abilities/main.ts` sempre presente — `node ace add @adonisjs/bouncer` cria o
arquivo e registra o middleware que dá `ctx.bouncer` em todo controller. O guard de sessão por
cookie mora em `app/guards/cookie-access-tokens.guard.ts`. `app/jobs/` nasce com
`@adonisjs/queue`.

**A policy usa o mecanismo que a doc do framework documenta.** *(Adonis)* `@adonisjs/bouncer` é
dependência de baseline — não condicional —, porque `app/policies/` já é obrigatório e a doc
oficial resolve autorização por registro exatamente com esse pacote
(`_doc-lib/adonisjs.md#guides/auth/authorization`). Ver §4.6.

**Regra de criação:** diretório transversal nasce *vazio-mas-presente* quando o mecanismo
é transversal (`policies/`); nasce *junto com a dependência* quando o mecanismo é opcional
(`jobs/`, config de e-mail, config de fila). O `pattern:check` cobra a primeira lista e ignora
a segunda.

### 1.2 Fatia vertical, uma pasta por ação, sem repositório

Uma operação HTTP é **uma pasta**: `app/features/<módulo>/<recurso>/<ação>/`, com
`<ação>.controller.ts`, `<ação>.use-case.ts` e `<ação>.spec.ts`. Ação é pasta sempre, inclusive
a trivial — é onde a spec dela mora e onde quem procura "arquivar post" encontra tudo
*(opinião da casa)*. **Não existe camada de repositório** — o use-case fala direto com o model.

A pasta não define a rota. O prefixo vem do registro de rotas do framework (adaptador em
`arquitetura.md` §5).

### 1.3 Dependência entre camadas

A seta é para dentro (`arquitetura.md` §2):

- `app/core/**` não importa de `#features/*` nem de `#services/*`.
- `app/services/**` não importa de `#features/*` (exceção: `_shared.<tema>`, §4.9).
- Uma feature não importa de outra; o compartilhado vai para `_shared.<tema>` ou para service.

Cobrado por `pattern:check`.

---

## 2. Convenções de escrita

Valem para todo `.ts` do repositório, incluindo `database/`, `config/`, `tests/`.
As quatro primeiras são cobradas por ESLint; as demais, por `pattern:check` ou revisão.

1. **Sem ternário** de atribuição ou controle de fluxo → `if` clássico. `??`, `?.` e o
   short-circuit `&&` continuam válidos.
2. **Sem `any` desnecessário** → `unknown` mais narrow. `any` só onde a lib força, com
   comentário dizendo qual.
3. **Sem `as`** → `satisfies`, ou corrigir o tipo na origem. `as const` é permitido.
   Cast de fronteira real leva `eslint-disable-next-line` e justificativa em pt-BR.
4. **Sempre `type`, nunca `interface`** — exceto em `declare module`, onde o TypeScript
   exige `interface` para o declaration merging. É **escolha** que a doc permite: o Handbook
   diz que, na maior parte dos casos, a escolha é de preferência
   (typescriptlang.org/docs/handbook/2/everyday-types.html, "Differences Between Type Aliases
   and Interfaces"); a casa fixa `type` para ter uma forma só.
5. **`Merge<A, B>` no lugar de `A & B`** para tipos objeto *(opinião da casa — ver
   `typescript.md` §8)*. Exceção: interseção com `Array<T>`, onde `Merge` destruiria a
   semântica de array.
6. **Lookup object** no lugar de cadeia de `if/else if` com 3+ casos que mapeia um
   discriminante para valor ou handler *(opinião da casa, sem regra de ESLint — ver
   `tooling.md` §4)*. Lógica booleana arbitrária continua `if`.
7. **`async/await`, nunca cadeia `.then/.catch/.finally`.** *(opinião da casa)* Combinadores
   seguem válidos com `await Promise.all([...])`.

### 2.1 DI sempre, `new Classe()` nunca

Injeção por construtor em todo código de produção **e em teste funcional**.

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
| `new SimpleMessagesProvider(...)` | API do VineJS, atribuída a `vine.messagesProvider` no boot |
| `new Bouncer(actor, ...)` *(Adonis)* | API pública do `@adonisjs/bouncer` (ver §4.6) |
| `*.unit.spec.ts` *(Fastify)* | o unit test não sobe container nem `reflect-metadata`; instanciar com dublê explícito é o padrão declarado |
| `database/{migrations,seeders,remodels}/**` *(Fastify)* | migration/seeder/remodel não sobe kernel nem container por desenho — roda isolado, antes ou fora do boot da aplicação; o guard real é revisão, não lint |

**Teste funcional pede o objeto ao container (`app.container.make(X)` no Adonis), nunca
`new X()`.** Com `new`, o teste não quebra quando o construtor ganha uma dependência — ele
passa testando um objeto meio construído. É falha silenciosa, e é o motivo de não haver isenção
para spec funcional.

---

## 3. Nomenclatura

Todo nome de arquivo é **kebab-case com sufixo de papel** (`arquitetura.md` §3). Gerador de
framework que produza outro formato (snake_case) é renomeado na hora — exceto migration (tabela).

| Coisa | Forma |
|---|---|
| pasta de ação | `<ação>/`, verbo em kebab-case (`archive/`, `sign-in/`) |
| arquivos da ação | `<ação>.controller.ts`, `<ação>.use-case.ts`, `<ação>.spec.ts` |
| validator | `<recurso>.validator.ts`, um por recurso, na pasta do recurso |
| classe de controller | `<Módulo><Recurso><Ação>Controller`, derivada do caminho |
| classe de use-case | `<Módulo><Recurso><Ação>UseCase` |
| export de validator | `<Recurso><Ação>Validator` (`PostCreateValidator`) |
| arquivo de model | `<entidade>.ts` em kebab-case (`team-member.ts`, nunca `team_member.ts`) |
| arquivo de service | `<nome>/<nome>.service.ts`; contrato em `<nome>/<nome>-contract.service.ts` |
| arquivo de middleware | `<nome>.middleware.ts` (`auth.middleware.ts`) |
| arquivo de policy | `<entidade>.policy.ts` (`user.policy.ts`) |
| classe base de template method | `<nome>.base.ts` (`queue-worker.base.ts`): `abstract class` com o algoritmo, subclasse preenche o passo. Não é contrato: `-contract.service.ts` é fronteira de I/O trocável em teste; `.base.ts` não se troca. Par de use-cases continua em `_shared.<tema>.ts` (§4.2) |
| comando de CLI | `commands/<recurso>-<verbo>.command.ts`, invocado como `<recurso>:<verbo>`; mutante aceita `--dry-run` (§10). _doc-lib/adonisjs.md#guides/ace/creating-commands |
| seeder | `database/seeders/<nome>.seed.ts`: o sufixo é o contrato de descoberta do boot/`db:seed`. Seed manual (dado de demo, carga pontual) fica em `database/seeders/dev/` sem o sufixo, com o motivo no topo, e roda por script nomeado. Seeder que grava credencial restringe onde roda (`static environment`, _doc-lib/lucid.md#seeders) |
| factory | `database/factories/<entidade>.factory.ts`, uma por entidade, usada só por spec; espelha o model, sem regra de negócio. _doc-lib/lucid.md#model-factories |
| provider | `providers/<nome>.provider.ts`: `register()` liga contrato → concreto, `shutdown()` libera pool/conexão; `singleton` quando o cliente guarda conexão, `bind` quando é sem estado. _doc-lib/adonisjs.md#guides/concepts/service-providers |
| socket | por feature, no contrato do service do socket: `<FEATURE>_NAMESPACE` (constante) e `<feature>Room(scopeId)` (única função que monta o nome da sala) — quem entra e quem emite montam a mesma string. _doc-lib/socket-io.md#namespaces, #rooms |
| migration | **exceção ao kebab**: o nome é o que o framework ordena e registra. Adonis: o gerado por `make:migration` (`<timestamp>_<verbo>_<entidade>.ts`), nunca renomeado — a tabela de controle guarda o nome, renomear reexecuta (_doc-lib/lucid.md#migrations). Script standalone (Fastify): `<sequencial>-migrate-<descrição>.ts` — §7 |
| código de erro de negócio | literal no `HTTPException` do use-case (`'POST_NOT_FOUND'`), nunca constante importada — o `openapi:generate` só lê literal (`openapi.md` #erros-do-use-case). Catálogo central (`core/error-code.ts`, `as const`) só se o gerador do projeto resolver a constante até o literal, provado pelo `openapi:check` mostrando o `code` |
| lógica compartilhada solta | `app/features/<módulo>/_shared.<tema>.ts`; entre módulos, `app/features/_shared.<tema>.ts` |
| mensagem de erro | pt-BR, sempre |
| identificador de código | inglês (`team`, `membership`); o comentário é em pt-BR |
| alias de import do irmão | o nome da classe, sempre (`import AdministratorUserPaginateUseCase from './paginate.use-case.ts'`) |
| tag de log do caso de uso | `[<recurso> > <ação>][error]`; passo intermediário num colchete próprio (`[storages > create][abort][error]`) |
| código de 500 | `<RECURSO>_<AÇÃO>_ERROR`, com o módulo na frente só onde o mesmo recurso existe em dois módulos (`ACCOUNT_POST_SHOW_ERROR`) |
| import que é só tipo | `import type` (`HttpContext` em controller, `User` em Payload) |
| alias de import | subpath imports do `package.json` (`#core/*`, `#features/*`, …), nativo do Node |

`features/account/profile/show/show.controller.ts` declara `AccountProfileShowController`, não
`ProfileController`. `features/administrator/users/paginate/paginate.controller.ts` declara
`AdministratorUserPaginateController`, não `UserListController`. Cobrado por `pattern:check`.

---

## 4. Camadas

### 4.1 Controller

Não contém regra de negócio. Faz: validar, chamar o use-case, escolher o status.

```ts
// app/features/<módulo>/<recurso>/<ação>/<ação>.controller.ts  (Adonis)
@inject()
export default class <Módulo><Recurso><Ação>Controller {
  static docs = defineDocs({ /* summary quando a ação não for derivável */ })

  constructor(private readonly useCase: <Módulo><Recurso><Ação>UseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(<Recurso><Ação>Validator)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.getUserOrFail() })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
```

- **`summary` é obrigatório** quando a ação não está em `ACTION_SUMMARY` de
  `app/core/openapi/` (`openapi.md`). As derivadas (`create`, `paginate`, `show`, `update`,
  `archive`, `unarchive`, `delete`, `sign-in`, `sign-out`, `refresh`, `complete`,
  `parts`, `download`) não precisam.
- **`errors:` só para o que nasce fora da pasta da ação.** O introspector do OpenAPI colhe por
  AST os `HTTPException` escritos no use-case irmão — esses **não** se declaram, senão viram
  uma segunda fonte que envelhece. Mas o gerador não enxerga o que um service injetado
  ou um `_shared.<tema>` levanta: `STORAGE_NOT_FOUND` vem do `StorageService`,
  `INVITE_EXPIRED` do `InviteService`, e sem a declaração somem do contrato. Quando
  declarar, diga no comentário de onde o código nasce. A prosa da `description` **não**
  lista códigos: é a segunda fonte que envelhece.
- **O `HTTPException` do use-case é escrito com argumentos literais.** Embrulhá-lo numa
  função (`slugConflict({...})`) tira o código do contrato, porque o gerador lê o texto.
  O que se compartilha é a pergunta (`slugErrorField`, `emailTaken`), não a resposta.
- Import do use-case irmão por caminho relativo com extensão; do validator do recurso por
  `#features/<módulo>/<recurso>/<recurso>.validator`.

### 4.2 Use-case

```ts
type Payload = Merge<Infer<typeof <Recurso><Ação>Validator>, { actor: User }>
type Response = Either<HTTPException, T>

@inject()
export default class <Módulo><Recurso><Ação>UseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      if (!ok) return left(HTTPException.BadRequest('mensagem pt-BR', 'CODE'))
      return right(entidade)
    } catch (error) {
      logger.error({ err: error }, '[<recurso> > <ação>][error]')
      return left(HTTPException.InternalServerError('Erro interno do servidor', '<OP>_ERROR'))
    }
  }
}
```

- **Falha de negócio é `left`, nunca `throw`.** Quem transforma em resposta é o controller.
  Método `*OrFail()` do ORM (`findOrFail()`, `firstOrFail()`, `findByOrFail()`) conta como
  `throw`: cai no `catch` global e vira 500 genérico onde deveria haver um 404 de negócio.
  Cobrado por `pattern:check`.
- **O `try` global começa antes da primeira ida ao banco.** Trabalho fora dele sobe sem
  a tag de log do caso de uso.
- **Duas escritas, uma transação** (`lucid.md`, *transactions*; no driver `mongodb`,
  `session.withTransaction`): soltas, a segunda falhando deixa a primeira gravada — um pedido
  sem o item que o justifica, um placar sem a resposta que o mudou.
- `try/catch` global obrigatório, com a tag de log no formato acima.
- **Escopo de sessão nunca vem do body.** `actor`, `owner` e afins entram pelo tipo,
  a partir da sessão autenticada.
- **Idempotência explícita em operação atrás de rede não confiável** *(opinião da casa)*:
  toda operação que finaliza um upload, confirma um pagamento, ou processa um webhook trata a
  segunda chamada com o mesmo identificador como sucesso, não como erro — nunca assume que o
  cliente chamou uma vez só. Exemplo: `storages/complete` (confirmar duas vezes devolve o mesmo
  registro) e `storages/delete` (cancelar um `PENDING` já cancelado não falha).
- **Template method para pares de operação quase idênticos** *(opinião da casa)*: quando
  dois use-cases diferem só num detalhe (`archive`/`unarchive`, `bulk-trash`/`bulk-restore`),
  um use-case base com `guard`/`patch`/`logTag` abstratos é mais seco que repetir `try/catch`
  e `errorCode` em cada arquivo. A base mora em `_shared.<tema>.ts` do módulo.

### 4.3 `actor` é o objeto `User`, não o id *(opinião da casa)*

A policy recebe `(actor, target)`. Com `actor: string` o use-case teria que refazer uma
consulta que o middleware de autenticação já fez, e `actor.role` — o dado que praticamente
toda checagem quer — exigiria ir ao banco. *(Fastify)* A exceção deliberada do perfil está em
`backend-fastify.md` §3.

**E chama-se `actor`.** `user`, `userId`, `createdBy` e `ownerId` no `Payload` são o
mesmo dado com outro nome, e escapam da policy `(actor, target)` e da regra acima.
Cobrado por `pattern:check`. A própria conta (`/account`) também é o `actor`: o guard
já a leu com os filtros de sessão nesta requisição, e refazer a consulta por `id` é
pagar duas vezes a mesma pergunta.

### 4.4 Validator

**Um arquivo por recurso:** `app/features/<módulo>/<recurso>/<recurso>.validator.ts`, com um
export por ação (`PostCreateValidator`, `PostUpdateValidator`, `PostPaginateValidator`). O que
é de todos fica em **`app/core/validator.ts`**: o `vine` configurado, as regras
compartilhadas (`cpf`, `slug`, `phone`…), `LIST_LIMITS`, `PageValidator`/`PaginationValidator`
e as mensagens pt-BR. A doc cita `app/core/validator.ts` só como exemplo de módulo
(`_doc-lib/vinejs.md`, "Quando usar a biblioteca"); a divisão por recurso é *(opinião da
casa)* — o recurso é a unidade que se lê inteira, e o arquivo único cresce até ninguém
achar nada.

- **Ninguém importa `@vinejs/vine` direto.** O `vine` configurado sai de
  `#core/validator`; é por ele que as mensagens e as regras da casa valem em todo schema.
- **As meta-specs varrem `app/features/**/*.validator.ts`** (todo export `*Validator` tem
  mensagem para cada regra usada, e todo campo tem paridade com o espelho do frontend). O
  glob substitui o arquivo único: quebrar o validator por recurso não custa a rede.
- Bloco reusável é **função** em `core/validator.ts`, não constante — nó de schema
  compartilhado vaza `.optional()` entre validators. Bloco usado por um recurso só fica no
  validator dele.
- Validator final é constante: `export const <X>Validator = vine.create({...})`.
  Criar fora do handler; `vine.create()` dentro do handler recompila a cada requisição.
  `vine.compile()` está `@deprecated` desde a 4.x (`_doc-lib/vinejs.md`, getting_started).
- Tipo derivado por `Infer<typeof X>`; escopo agregado com `Merge<Infer<...>, { actor: User }>`.
- Mensagens em `app/core/validator.ts`, espelhando `frontend/src/lib/validator-messages.ts`.
  **Regra que serve a mais de um campo tem nome próprio** (`cpfLength`, `phone`,
  `personName`): a chave do provider é `campo.regra`, e `cpf.fixedLength` não é chave
  de campo nenhum — o CPF curto recebia "Informe 11 caracteres".
- **Unicidade fica no use-case**, como `left(Conflict)` com o erro sob o campo, e não na
  regra `unique()` do ORM (`lucid.md`, *validation*). Divergência deliberada: a
  mensagem por campo e o 409 com `code` estável são o contrato do cliente, e a regra do
  ORM devolveria um 422 genérico de validação. A corrida entre a consulta e o INSERT
  é coberta por `isUniqueViolation` de `_shared.database`.
- **Quem não filtra por `search` não o aceita.** `PageValidator` (página e tamanho) para
  a listagem que não busca; `PaginationValidator` só para quem lê `payload.search`. O
  parâmetro aceito e ignorado promete no OpenAPI um filtro que não existe.
- O frontend espelha o arquivo em `src/validators/<módulo>/<recurso>.validator.ts`, mesmos
  nomes de export (`frontend.md`, `arquitetura.md` §4).
- **Schema definido em runtime** (campo que o usuário final configura) não cabe em
  `vine.create()` fixo: vira service injetável (`payload-validator.service.ts`) que monta o
  schema da definição salva, ainda com o `vine` de `#core/validator`. São as duas formas
  válidas de validator; a fixa é a regra, a dinâmica só onde o campo é dado *(opinião da casa)*.

### 4.5 Response e paginação

Envelope de erro único: `{ message, status, code, errors? }`. `code` é o identificador
estável que o cliente compara; `message` é texto de UI em pt-BR e nunca é comparado;
`errors` é `campo → mensagem`, com a chave `root` para o formulário inteiro.

**Paginação devolve `Paginated<T>`, montado do paginator:**

```ts
type Response = Either<HTTPException, Paginated<ModelObject>>

const rows = await Model.query().withScopes((s) => s.notDeleted())
  .paginate(payload.page ?? PAGINATION.PAGE, payload.perPage ?? PAGINATION.PER_PAGE)

return right({ meta: rows.getMeta(), data: rows.all() })
```

*(Adonis)* A doc do Lucid (`lucid.md`, *pagination*) mostra `.serialize()`, que no runtime
devolve o mesmo envelope — e as duas formas passam nos mesmos testes. A montagem à mão é
decisão registrada em `app/core/entity.ts`, e ela vence: `toJSON()` devolve
`{ meta: any; data: ModelObject[] }`, perdendo o tipo do item, e devolver o paginator cru
faz o registry de rotas tipadas inferir a classe inteira em vez do JSON. `all()` mantém `T[]`,
e o `any` morre na fronteira do `Response` declarado.

É o caso em que o projeto sabe algo que a doc da biblioteca não cobre — e a regra da
seção 0 se aplica ao contrário do que parece: a doc descreve o mecanismo, a casa decidiu
a forma, e a decisão está escrita com o porquê.

O que **não** se repete é o default: `PAGINATION` mora em `app/core/entity.ts`, e não há
`const PAGE`/`PER_PAGE` por caso de uso.

**Resposta de arquivo** (exportar CSV) sai de um helper único de resposta (`sendCsv`), que põe
`Content-Type: text/csv`, `Content-Disposition: attachment` e `Cache-Control: no-store` — nunca os
três cabeçalhos à mão por rota *(opinião da casa)*.

### 4.6 Autorização

Três camadas que compõem, e cada regra mora numa só:

| Camada | Onde | Cobre |
|---|---|---|
| Alcance de rota | middleware no grupo (`role()`) | papel errado nem entra |
| Forma do payload | validator | campo que aquele papel não pode enviar |
| Regra por registro | **policy** (`app/policies/<entidade>.policy.ts`) | "só o dono edita", "ninguém edita a si mesmo" |

**Correção sobre a doc** *(Adonis)*. Uma versão anterior desta seção prescrevia uma classe
comum sem o Bouncer, chamada direto por construtor no use-case, para não quebrar o contrato
`Payload → Either` (que exigiria `HttpContext` dentro do use-case). Era divergência
documentada, mas ia contra o mecanismo que a doc oficial recomenda para exatamente esse
caso — políticas por recurso são o caminho para regras do tipo "só o dono do registro edita"
(`_doc-lib/adonisjs.md#guides/auth/authorization`). A policy segue a doc ao pé da letra:
estende `BasePolicy`, é gerada por `node ace make:policy` (e renomeada para
`<entidade>.policy.ts`), e a checagem passa por `ctx.bouncer`, não por chamada direta de
método.

```ts
// app/policies/user.policy.ts
import User from '#models/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class UserPolicy extends BasePolicy {
  update(actor: User, target: User): AuthorizerResponse {
    return actor.id === target.id
  }
}
```

```ts
// app/features/account/users/update/update.controller.ts
import UserPolicy from '#policies/user.policy'
import AccountUserUpdateUseCase from './update.use-case.ts'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountUserUpdateController {
  constructor(private readonly useCase: AccountUserUpdateUseCase) {}

  async handle({ bouncer, params, request }: HttpContext) {
    const target = await User.findOrFail(params.id)
    await bouncer.with(UserPolicy).authorize('update', target)

    const result = await this.useCase.execute({ target, ...request.body() })
    // ...
  }
}
```

`bouncer.with(Policy).authorize(acao, registro)` lança `AuthorizationException` quando
nega — a mesma exceção que `app/exceptions/handler.ts` já converte para 403, sem mapeamento
próprio. `allows`/`denies` servem para o caso em que a negação não deve interromper o
fluxo (retornar algo diferente de 403); `execute` devolve `AuthorizationResponse`
(`authorized`, `message`, `status`) para quando a mensagem/código variam por regra. Fora
desses quatro métodos, não existe quinto caminho — nenhum lugar chama `UserPolicy.update`
direto nem constrói `new Bouncer(...)` fora do middleware de inicialização do Bouncer
(composition root gerado por `node ace add @adonisjs/bouncer`, a única exceção já listada em
§2.1).

**Onde a doc e o formato do use-case se encontram.** A doc carrega o registro e autoriza
no controller, no mesmo lugar, porque é lá que existe `ctx` — AdonisJS não tem conceito
de use-case. A casa escolhe esse formato (autorizar no controller, com `ctx.bouncer`) em
vez de carregar e autorizar dentro do use-case, porque é o mecanismo exato que a doc
documenta, sem reimplementar o mapeamento de `AuthorizationException` para 403 à mão. O
use-case recebe o registro já autorizado e continua tratando falha de negócio (ex.:
conflito) como `Either` — o preço é o controller buscar o registro antes do use-case buscar
de novo para a própria lógica, e vale pagá-lo para não desviar do caminho que a doc prescreve.

`ctx.bouncer` **é obrigatório** em toda rota que precisa de regra por registro. Cobrado
por `pattern:check`. *(Fastify)* A policy é classe injetável com a mesma assinatura
`(actor, target)` (`arquitetura.md` §5).

**403 antes de 404** *(opinião da casa)*: quando a checagem de posse e a checagem de
existência cairiam na mesma consulta, a ordem importa — responder 404 a quem não tem posse
vazaria "este registro existe, mas não é seu" pela diferença entre os dois códigos. O
`archive` canônico checa a policy primeiro, com o registro ainda não confirmado como existente
no response, e só então decide 403 ou 404.

**Policy de domínio além de `User`** *(opinião da casa)*: a mesma assinatura `(actor, target)`
de `UserPolicy` serve para qualquer entidade com dono — `TeamPolicy`, `PostPolicy`. Não existe
"só usuário tem policy".

**Compor guard + sanitização num só objeto de decisão** *(opinião da casa)*: quando a
autorização de escrita e a sanitização do payload compartilham a mesma origem de regra (ex.:
campo que só certos papéis podem setar), devolver `{ decision, reason }` de uma função só
(`composeWriteDecision`) é mais seco que duas chamadas booleanas separadas que o use-case
tem que combinar.

### 4.7 Model

*(Adonis)* O model estende a classe gerada em `database/schema.ts`, que é **reescrita a cada
`migration:run`**. Só estas coisas entram no arquivo do model, porque só elas sobrevivem:

1. Relações.
2. Estreitamento de enum, **com `@column()`** — sem o decorator o Lucid não hidrata.
3. `prepare`/`consume` de coluna `jsonb` ou `bigint`.
4. Query scopes (§4.8).
5. `@computed` que só lê as próprias colunas ou o `$extras` de um `aggregate()` —
   `membersCount`, `age`. É contrato de resposta, e não regra de negócio: a regra
   (`canPublish`, `requiresApproval`) é função em `_shared.<tema>`.

O model de autenticação é a exceção declarada: `withAuthFinder` e `accessTokens` são
exigência do `@adonisjs/auth`. Redeclarar o tipo de uma coluna que o gerador já declara
certo (`@column.date()`) é ruído; correção de tipo que o gerador erra vai para
`database/schema_rules.ts` (nome do framework, não se renomeia).

`serializeAs: null` para campo sensível vive em `database/schema_rules.ts`, nunca no model.
Todo campo que é credencial — hash de token, token de convite — entra lá.

*(Fastify)* `models/<entidade>.ts` exporta o tipo do documento e o acesso à coleção
(`backend-fastify.md`).

### 4.8 Soft delete por query scope

*Correção sobre a doc — `lucid.md`, query scopes.*

```ts
export default class User extends UserSchema {
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })
}

const rows = await User.query().withScopes((scopes) => scopes.notDeleted())
```

A doc define o gatilho: assim que o mesmo filtro aparece pela terceira vez, vira scope —
especialmente filtro de segurança, que centralizado não depende de cada consulta lembrar dele.

O scope vive no arquivo do model, que não é regerado — sobrevive ao `migration:run`.

Descartados: `@beforeFetch()`, pela ressalva da própria doc (hooks não disparam em update ou
delete em massa via query builder); e scope global, que a doc confirma não existir no Lucid.

O espelho é `onlyDeleted`, no mesmo model: a tela de restauração e o `unarchive` o
usam, e `whereNotNull('deletedAt')` à mão é cobrado por `pattern:check` como o
`whereNull` é. O `?trashed` das listagens passa por `applyTrashed(query, mode)` de
`_shared.trashed`.

Consulta que precisa ver o arquivado usa `TrashedModes` explicitamente. A exceção
legítima se registra na lista `softDeleteExempt` da configuração do `pattern:check` do
projeto, com o porquê no código — ausência vira decisão registrada, não esquecimento.

### 4.9 Service ou `_shared`? *(opinião da casa)*

**O critério é dependência ou estado.**

- **Service injetável** quando precisa de outra dependência (banco, drive, outro service)
  ou de configuração. Teste rápido: se a função recebe uma dependência como *parâmetro*,
  ela é um service disfarçado.
- **`_shared.<tema>.ts`** quando é função pura sobre model ou query já em mãos.
- **Service injetável, mesmo sem dependência,** quando o que ele guarda é uma *política* e
  ele **constrói** a consulta em vez de modificar uma recebida. `publishedPosts()` nasce de
  `Post.query()` e devolve o recorte público inteiro; não há "dado em mãos" sobre o qual ser
  função pura. Injetável porque a política é o que um teste quer trocar.

A diferença entre os dois últimos é quem é dono da consulta. `visibleTeams(query)` recebe a
consulta e acrescenta condição — é `_shared`. `publishedPosts()` é a origem da consulta — é
service. Os dois formatos estão certos; o que não vale é um service sem dependência que apenas
recebe e devolve.

`_shared` não é depósito. Função que cresceu e passou a tocar o banco migra para service.

Dois complementos:

- **O piso da §1.1 é service por contrato.** `slug.service.ts` não tem dependência e só
  recebe e devolve; existe porque a régua o exige, e a normalização pura mora em
  `_shared.slug` (`normalizeSlug`), de onde o service e o script de importação a leem.
- **`app/services/**` pode importar `_shared.<tema>`.** `_shared` é o lugar declarado da
  função pura, e importá-la não acopla o service a nenhuma feature. O que a regra recusa é
  `#features/<módulo>/<recurso>/...`.

**Exemplos canônicos:**

- **Função pura sobre erro de driver**: `isUniqueViolation(error)` de `_shared.database.ts`
  recebe o erro que o banco já devolveu e só classifica — nenhuma consulta nova.
- **"Linha vs. coluna" como dois services irmãos, cada um por sua razão de mudar**:
  `PostVisibilityService` recorta quais registros aparecem, `PostShapeService` recorta quais
  colunas aparecem — a mesma pergunta de "quem é dono da consulta" acima, com dois arquivos em
  vez de um método condicional.
- **Tabela declarativa para referência cruzada de FK**: `storage.service.ts#REFERENCES`
  resolve "quem usa este arquivo" e "quem é dono dele" com um objeto nomeado coluna→tabela,
  no lugar do par de arrays paralelos que §5.2 proíbe.

---

## 5. Módulos de infraestrutura

Os arquivos de `core/` (`either.ts`, `response.ts`, `openapi/`), `exceptions/*`, os services
do piso (`cookie`, `multipart`, `storage`) e os middlewares transversais têm **a mesma API
pública e a mesma estrutura** em todo projeto da casa; o conteúdo de domínio (enums em
`entity.ts`, lista `REFERENCES` do storage) varia *(opinião da casa)*. Quem abre um projeto
novo já sabe o que `left`, `HTTPException.NotFound` e `Paginated<T>` fazem.

**Código curto que humano lê ou digita** (convite, lote, passaporte) sai de um gerador com
alfabeto fixo sem caracteres ambíguos (`O`/`0`, `I`/`1`) e um laço de `N` tentativas contra
unicidade — nunca UUID nem sequência crua na tela *(opinião da casa)*.

### 5.1 Comentário em módulo de infraestrutura é genérico

O módulo tem a mesma forma em todo projeto, então o texto dentro dele também. Num módulo de
infraestrutura, um comentário **não** cita:

- **instalação, domínio ou cliente** — não "o caso desta instalação, `api.cliente.com` com
  `cliente.com`", e sim "onde os dois estão sob o mesmo domínio-pai";
- **identificador de requisito** (`RN-09`, `AD-010`, `RF-*`) — esses vivem no documento de
  requisitos de **um** projeto, e a referência não resolve nos outros. Diga a regra, não o
  número dela;
- **contagem que depende do domínio** — "a contagem de uma das dez consultas" vira mentira
  no projeto que tem cinco.

O comentário explica o mecanismo e o defeito que a regra evita. Quando o texto só faz
sentido num projeto, ou ele é reescrito de forma genérica, ou o código não é infraestrutura.

**O mesmo princípio vale para divergência temporária** *(opinião da casa)*: uma migração em
andamento (ex.: troca de biblioteca de validação, mudança de árvore pela `MIGRACOES.md`) que
deixa código antigo e novo convivendo por um tempo ganha um comentário
`ponytail: <o que é temporário> — <quando remover>`, nomeando o prazo de vida da divergência
em vez de deixá-la implícita.

### 5.2 Tabela declarativa, não arrays paralelos

Onde uma lista de tabelas ou colunas alimenta uma varredura, use **uma tabela de
objetos**, nunca dois arrays casados por índice:

```ts
// Errado — uma inserção no meio de uma delas troca o rótulo de todas as seguintes,
// e o compilador não tem como perceber.
const counts = await Promise.all([q1, q2, q3, q4, q5])
const labels = ['a', 'b', 'c', 'd']

// Certo
const REFERENCES = [
  { table: 'users', column: 'avatar_id', label: 'avatar de usuário' },
  // ...
] as const
```

Isto não é preferência estética: a variante com arrays paralelos já produziu um
`undefined` numa resposta 409 de produção.

---

## 6. Variáveis de ambiente *(opinião da casa)*

Um só leitor, `start/env.ts` (`Env.create` no Adonis; leitor síncrono no Fastify —
`arquitetura.md` §5), com blocos nesta ordem: `# Node` · `# App` · `# Session` · `# CORS` ·
`# Banco de dados` · `# Armazenamento` · `# Semeadura` · `# Envio de e-mail` ·
`# Endereço do site` · `# Fila`, e depois os blocos de domínio do projeto. Chave da casa tem o
mesmo nome, validador e comentário em todo projeto.

Regras:

- **Toda chave lida pelo leitor é declarada no schema**, e vice-versa. Cobrado por
  `pattern:check`.
- **Chave morta sai.** Chave declarada que nenhum código lê é removida. O que nunca passa pelo
  leitor fica listado à parte na configuração do `pattern:check`: `PORT` e `HOST` (lidas em
  `process.env` pelo framework), `NODE_ENV` (lida pelo carregador antes de haver serviço de
  env) e `TZ` (lida pelo próprio Node). Sem esse registro a regra acusaria as quatro como mortas.
- **Chave opcional por instalação** (integração que só um cliente usa) é obrigatória onde a
  funcionalidade existe e opcional onde não existe — exigi-la derrubaria o boot de quem não a usa.
- **Segredo e credencial não têm default.** A aplicação para em vez de subir com um valor
  que ninguém escolheu: `SEED_OWNER_PASSWORD`, `MAIL_FROM`, `SMTP_HOST`, chave de gateway de
  pagamento. Um default de código para a chave que recebe dinheiro é um bug, não uma
  conveniência.
- **Default inseguro é declarado no comentário**, com o motivo. `DATABASE_SSL` ausente
  significa TLS desligado, e isso está escrito.
- `.env` e variantes de ambiente real **não são versionados**. Versionam-se `.env.example`
  e `.env.test` — o segundo só tem endereço de container local e senha de banco de teste,
  e sem ele ninguém roda a suíte sem adivinhar o que preencher.

---

## 7. Testes

**A spec fica ao lado da ação:** `app/features/<módulo>/<recurso>/<ação>/<ação>.spec.ts`. A
suíte funcional usa o glob `app/**/*.spec.ts` (Japa no Adonis, Vitest no Fastify —
`arquitetura.md` §5). `tests/` guarda só infraestrutura: helpers, fixtures, setup.

Spec transversal fica ao lado do que cobre: `app/core/validator.spec.ts` (a meta-spec da §4.4),
`app/core/openapi/openapi.spec.ts` (documentação), `app/middleware/<nome>.middleware.spec.ts`
(cookie, CORS, papéis). Piso obrigatório: autenticação, conta, papéis, cookie, CORS,
documentação, mensagens, storage, multipart, validator.

Meta: **≥ 2,0 specs de asserção por controller**, medida por relatório *(opinião da
casa — métrica interna, sem doc de terceiro a favor ou contra)*.

- Toda correção de segurança nasce com uma spec que **falha antes do fix**.
- Objeto real em teste vem do container (§2.1).
- Fixture que se repete em duas specs vira `tests/<tema>-fixtures.ts`; dado de model vem da
  factory (§3).
- **Migration standalone** (perfil sem runner do framework) *(opinião da casa)*: processo próprio,
  sem subir kernel/container, idempotente, `process.exit(1)` na falha. A spec roda o arquivo por
  `child_process` contra banco isolado — nunca `import` direto, que derruba o runner se falhar.
- **Spec de script de guard-rail** (§10) fica ao lado do script: `scripts/<nome>.unit.spec.ts`,
  sem container.
- **Suíte E2E sequencial** *(opinião da casa)*: só quando o cenário é caro de montar (tenant,
  extensões, dado dinâmico) e isolar por teste o recriaria a cada spec. Mora fora de `app/`
  (`tests-e2e/`), arquivos com prefixo numérico de ordem (`01-<tema>.spec.ts`) e `zz-` para o que
  roda por último; estado compartilhado entre arquivos é explícito. A suíte isolada ao lado da
  ação continua obrigatória — a sequencial soma, não substitui.

---

## 8. Documentação

Só três arquivos de instrução para agente, cada um assumindo o de cima e nunca o repetindo:

| Nível | Arquivo | Responde |
|---|---|---|
| Raiz | `/CLAUDE.md` ou `/AGENTS.md` | ponteiro para backend e frontend, comandos de topo |
| Backend | `backend/CLAUDE.md` ou `AGENTS.md` | o que foge de `arquitetura.md` neste projeto, comandos, ponteiro para a régua |
| Frontend | `frontend/CLAUDE.md` ou `AGENTS.md` | idem para o frontend |

Não existe `CLAUDE.md` por camada, módulo, recurso ou operação *(opinião da casa)*. A árvore é
a mesma em todo projeto (`arquitetura.md`), então explicá-la em cada pasta é repetir a régua;
e a pasta da ação já é autoexplicativa (controller, use-case, spec).

**Doc de operação é derivada do OpenAPI — por comando, não por promessa.** Endpoint, auth,
permissão, payload e tabela de erros saem do `openapi.json`, que é gerado do router de verdade
(`openapi.md`). Quem quer saber o que uma operação faz lê a UI do OpenAPI ou o `openapi.json`;
o porquê de uma regra mora no comentário do use-case, ao lado do código. Tabela redigida à
parte envelhece na primeira mudança — versão de lib citada quatro minor atrás da instalada,
"as tabelas abaixo saem do `openapi.json`" escrito sobre tabela que não sai.

Quando dois campos derivados existem mas não se correspondem, **não se correlaciona**: o
`code` e a descrição de um status com mais de um erro vêm em ordens diferentes, então a
coluna `Quando` fica vazia em vez de afirmar um pareamento que ninguém garante.

Seção sem conteúdo é **omitida**, nunca preenchida com "N/A". Sem código no `CLAUDE.md`: ele
descreve, o arquivo implementa. Número que um comando gera (quantidade de rotas, de
controllers) não se escreve à mão; se precisar aparecer, a frase avisa que envelhece:
"N operações no `openapi.json` — se divergir do comando, o texto é que envelheceu"
*(opinião da casa)*.

---

## 9. Commits

Conventional Commits, **em pt-BR**, atômicos. Um commit é uma mudança lógica completa que
compila e passa nos testes.

```
feat(posts): aceita anexo de imagem na publicacao
fix(arquivos): exige sessao e posse no download
refactor(nucleo): remove o serializador de API que ninguem chama
docs(padrao): registra a arquitetura unica
```

O tipo reflete o que mudou de fato: correção de bug é `fix`, não `chore`; rearranjo sem
mudança de comportamento é `refactor`, não `feat`. Cobrado por `commitlint`.

---

## 10. Guard-rails *(opinião da casa)*

```
check = lint + typecheck + openapi:check + pattern:check + sync:check + authz:check
```

| Script | O que reprova |
|---|---|
| `lint` | as quatro regras de escrita e `new` fora da allowlist (§2.1) |
| `typecheck` | `tsc --noEmit` |
| `openapi:check` | `openapi:generate --check --strict`: documento desatualizado, ou operação sem resposta descrita |
| `pattern:check` | o que o ESLint não alcança porque depende de *onde* o arquivo está. A árvore de `arquitetura.md` §6 — ação fora de pasta, validator fora de `<recurso>.validator.ts`, import de `@vinejs/vine` fora de `core/validator.ts`, feature importando outra feature, classe que não deriva do caminho, sufixo/kebab de arquivo errado — mais: camada que importa outra (§1.3), chamada de policy fora do mecanismo do framework (§4.6), `throw` e `*OrFail()` em use-case, `actor: string` e o escopo de sessão com outro nome, tag de log fora da ação, filtro de `deletedAt` fora do model, diretórios obrigatórios, e as checagens de ENV (§6) |
| `sync:check` | `node <upstream>/scripts/sync-to-project.mjs . --check`: cópia local de `_padroes/`, `_doc-lib/` ou das skills divergindo do upstream (§11) |
| `authz:check` | mudança na cadeia de autorização de qualquer rota, contra `app/core/openapi/authz-baseline.json` |
| `di:check` | constrói todo service e policy pelo container e reprova o que não sobe |

`pre-commit` roda `pnpm check && pnpm test`. `di:check` fica fora do `check` porque boota
a aplicação — o CI o roda no job que já tem banco e bucket de pé, junto da suíte.
*(Fastify)* `di:check` depende de container real; com DI por decorator precisa de adaptação
equivalente (resolver cada registro do `injectablesHolder`), não é portável como está.

**Dois guardas que não existem, com o motivo.** `boot:check` ("kernel que sobe mas não
responde") é redundante: toda spec funcional boota a aplicação, e uma que não sobe reprova a
suíte inteira antes de chegar a qualquer asserção. `openapi:verify` (comparar resposta real com
o schema publicado) tem valor e custo alto — exige factory por model e uma segunda serialização
—, e o `--strict` do `openapi:check` mais a spec de documentação já cobrem o caso comum. Entram
quando um defeito real passar por essas duas redes.

**Formato de saída de todo `scripts/<nome>-check.ts`** *(opinião da casa)*: cada achado é
`{ arquivo, linha, regra, secao, mensagem }` (`secao` = seção do `_padroes` violada); a saída
agrupa por `secao` e o processo sai com código 1 se a lista não for vazia, 0 se for. Guard novo
copia o formato, não inventa outro — o CI e quem lê comparam um formato só.

**Comando de CLI que grava dado declara `--dry-run`** *(opinião da casa)*: todo comando mutante
(expiração, limpeza de storage, reprocessamento) aceita a flag e, com ela, só loga o que
faria — convenção de interface de CLI, não um guard automatizado.

---

## 11. Mudar o padrão

Este repositório é o upstream único. Projeto não edita a própria cópia de `_padroes/`,
`_doc-lib/` nem das skills da casa — o `sync:check` reprovaria.

1. A necessidade aparece num projeto → a mudança é feita **aqui**, com linha nova em
   `_padroes/DECISOES.md` (o quê, onde, por quê).
2. `node scripts/sync-to-project.mjs <dir-do-projeto>` copia para cada projeto.
3. Um commit por projeto, Conventional em pt-BR (`docs(padrao): …`).
4. Código do projeto que passa a divergir migra pelo roteiro de `MIGRACOES.md`; enquanto
   convive, leva o comentário `ponytail:` da §5.1.

Divergência permanente de projeto não existe: ou a régua muda para todos, ou o projeto migra.
