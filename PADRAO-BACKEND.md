# Padrão de backend

A régua única dos quatro backends: `academy`, `adacaibs`, `simple-hub` e `lowcodejs`.

Este arquivo é **byte-idêntico nos quatro repositórios** e é cobrado por `sync:check`.
Alterá-lo em um só reprova o CI daquele repositório. O fluxo de mudança está no fim.

- `academy`, `adacaibs` e `simple-hub` são AdonisJS 7 + Lucid e seguem tudo aqui, com
  **código idêntico** nos módulos congelados.
- `lowcodejs` é Fastify + Mongoose. Segue as mesmas convenções — camadas, envelope,
  `Either`, nomes, ENV, commits, documentação — com implementação própria. As seções
  marcadas *(Adonis)* não se aplicam a ele.

---

## 0. A hierarquia de autoridade

Quando duas fontes discordam, esta é a ordem:

1. **`_doc-lib/` na raiz do projeto** — snapshots das docs oficiais. Manda acima de tudo.
2. **O tipo instalado** (`node_modules/<pkg>/**/*.d.ts`) — quando o snapshot não cobre o
   ponto. É prova, não opinião.
3. **Este documento.**
4. **O código existente.**

Se o código contradiz a doc oficial, o código está errado — mesmo que esteja assim nos
quatro projetos. Três decisões deste documento nasceram exatamente desse conflito
(soft delete, paginação e autorização); estão marcadas abaixo.

Quando nem o snapshot nem o tipo instalado cobrem o assunto, diga "não coberto" e decida
com o critério declarado aqui. Não invente prescrição de doc.

---

## 1. Organização

### 1.1 `app/` *(Adonis)*

Obrigatórios nos três, mesmo que mínimos ou quase vazios:

| Diretório | Conteúdo |
|---|---|
| `app/core/` | `either.ts`, `entity.ts`, `validator.ts`, `response.ts`, `aggregate.ts`, `openapi/`. Nada além disso. |
| `app/features/` | `<módulo>/<recurso>/<verbo>.{controller,use-case}.ts` e `_shared.<tema>.ts` |
| `app/exceptions/` | só `http.exception.ts` e `handler.ts` |
| `app/models/` | um arquivo por tabela, estendendo a classe gerada em `database/schema.ts` |
| `app/services/` | piso obrigatório: `cookie`, `multipart`, `slug`, `storage` |
| `app/middleware/` | os transversais congelados, mais os de domínio |
| `app/guards/` | só `cookie-access-tokens.guard.ts` |
| `app/policies/` | `user_policy.ts` é obrigatório — os três operam contas pelo painel, e a regra por registro mora aqui, não num `if` por caso de uso |

Condicionais, nascem com a dependência: `app/jobs/` (só com `@adonisjs/queue`) e
`app/abilities/main.ts` (só com `@adonisjs/bouncer` — é o que
`initialize_bouncer_middleware` importa).

**A policy não precisa do Bouncer.** Ela é uma classe injetável comum: o pacote traria
`ctx.bouncer`, que obriga o caso de uso a receber `HttpContext` e quebra o contrato
`Payload → Either`. O que se quer dele — a regra fora do caso de uso, testável e
reusável — uma classe simples já entrega, sem dependência nova em projeto que não a tem.

**Regra de criação:** diretório transversal nasce *vazio-mas-presente* quando o mecanismo
é transversal (`policies/`, `abilities/`); nasce *junto com a dependência* quando o
mecanismo é opcional (`jobs/`, `config/mail.ts`, `config/queue.ts`). O `pattern:check`
cobra a primeira lista e ignora a segunda.

### 1.2 Vertical slice, sem repositório

Uma operação HTTP é um par de arquivos: `<verbo>.controller.ts` e `<verbo>.use-case.ts`,
dentro de `app/features/<módulo>/<recurso>/`. **Não existe camada de repositório** — o
use-case fala direto com o model.

A pasta não define a rota. O prefixo vem de `start/routes.ts` *(Adonis)* ou do decorator
`@Controller({ route })` *(lowcodejs)*.

### 1.3 Dependência entre camadas

- `app/core/**` não importa de `#features/*` nem de `#services/*`.
- `app/services/**` não importa de `#features/*`.
- Nada em `application/`, `hooks/`, `bin/` ou `start/` importa de `extensions/` *(lowcodejs)*.

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
   exige `interface` para o declaration merging.
5. **`Merge<A, B>` no lugar de `A & B`** para tipos objeto. Exceção: interseção com
   `Array<T>`, onde `Merge` destruiria a semântica de array.
6. **Lookup object** no lugar de cadeia de `if/else if` com 3+ casos que mapeia um
   discriminante para valor ou handler. Lógica booleana arbitrária continua `if`.
7. **`async/await`, nunca cadeia `.then/.catch/.finally`.** Combinadores seguem válidos
   com `await Promise.all([...])`.

### 2.1 DI sempre, `new Classe()` nunca

Injeção por construtor em todo código de produção **e em teste funcional**.

`new X()` onde `X` termina em `Service`, `UseCase`, `Policy`, `Controller` ou
`Repository` é recusado por `eslint.config.js`. As isenções são nomeadas e fechadas:

| Isenção | Por quê |
|---|---|
| `new CookieAccessTokensGuard(context)` | factory que `config/auth.ts` exige; o guard recebe o `HttpContext` da requisição, não do container |
| `new SimpleMessagesProvider(...)` | API do VineJS, atribuída a `vine.messagesProvider` no boot |
| `new Bouncer(actor, ...)` | API pública do `@adonisjs/bouncer` (ver §4.6) |
| `*.unit.spec.ts` *(lowcodejs)* | o unit test não sobe container nem `reflect-metadata`; instanciar com dublê explícito é o padrão declarado |

**Teste funcional usa `app.container.make(X)`, nunca `new X()`.** Com `new`, o teste não
quebra quando o construtor ganha uma dependência — ele passa testando um objeto meio
construído. É falha silenciosa, e é o motivo de a isenção de `tests/` ter sido removida.

---

## 3. Nomenclatura

| Coisa | Forma |
|---|---|
| arquivo de feature | `<verbo>.controller.ts` / `<verbo>.use-case.ts`, verbo em kebab-case |
| classe de controller | `<Feature><Verbo>Controller`, derivado do caminho |
| classe de use-case | `<Feature><Verbo>UseCase` |
| arquivo de model | kebab-case (`course-module.ts`, nunca `course_module.ts`) |
| arquivo de service | kebab-case + `.service.ts` |
| arquivo de middleware | snake_case + `_middleware.ts` — é a convenção do Adonis, não se briga |
| lógica compartilhada solta | `app/features/_shared.<tema>.ts` |
| mensagem de erro | pt-BR, sempre |

`account/show.controller.ts` declara `AccountShowController`, não `ProfileController`.
`administrator/users/paginate.controller.ts` declara `AdministratorUserPaginateController`,
não `UserListController`. Cobrado por `pattern:check`.

---

## 4. Camadas

### 4.1 Controller

Não contém regra de negócio. Faz: validar, chamar o use-case, escolher o status.

```ts
@inject()
export default class <Feature><Verbo>Controller {
  static docs = defineDocs({ /* summary quando a ação não for derivável */ })

  constructor(private readonly useCase: <Feature><Verbo>UseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(<X>Validator)
    const result = await this.useCase.execute({ ...payload, actor: context.auth.user! })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
```

- **`summary` é obrigatório** quando a ação não está em `ACTION_SUMMARY` de
  `app/core/openapi/document.ts`. As derivadas (`create`, `paginate`, `show`, `update`,
  `archive`, `unarchive`, `delete`, `sign-in`, `sign-out`, `refresh`, `complete`,
  `parts`, `download`) não precisam.
- **`errors:` só para o que nasce fora do par.** O `openapi/introspect.ts` colhe por AST
  os `HTTPException` escritos no use-case irmão — esses **não** se declaram, senão viram
  uma segunda fonte que envelhece. Mas o gerador não enxerga o que um service injetado
  levanta: `STORAGE_NOT_FOUND` vem do `StorageService`, e sem a declaração some do
  contrato. Quando declarar, diga no comentário de onde o código nasce.
- Import do use-case irmão por caminho relativo com extensão.

### 4.2 Use-case

```ts
type Payload = Merge<<X>Payload, { actor: User }>
type Response = Either<HTTPException, T>

@inject()
export default class <Feature><Verbo>UseCase {
  async execute(payload: Payload): Promise<Response> {
    try {
      if (!ok) return left(HTTPException.BadRequest('mensagem pt-BR', 'CODE'))
      return right(entidade)
    } catch (error) {
      logger.error({ err: error }, '[<módulo> > <verbo>][error]')
      return left(HTTPException.InternalServerError('Erro interno do servidor', '<OP>_ERROR'))
    }
  }
}
```

- **Falha de negócio é `left`, nunca `throw`.** Quem transforma em resposta é o controller.
- `try/catch` global obrigatório, com a tag de log no formato acima.
- **Escopo de sessão nunca vem do body.** `actor`, `owner` e afins entram pelo tipo,
  a partir de `context.auth.user`.

### 4.3 `actor` é o objeto `User`, não o id

A policy recebe `(actor, target)`. Com `actor: string` o use-case teria que refazer uma
consulta que o `auth_middleware` já fez, e `actor.role` — o dado que praticamente toda
checagem quer — exigiria ir ao banco.

### 4.4 Validator

Todos os validators num arquivo só: **`app/core/validator.ts`**.

`vinejs.md:37-38` cita esse caminho literalmente, e é o que as meta-specs
(`tests/functional/validator.spec.ts` e `mensagens.spec.ts`) conseguem varrer. Não se
quebra por tamanho: quebrar custa as duas redes.

- Bloco reusável é **função**, não constante — nó de schema compartilhado vaza
  `.optional()` entre validators.
- Validator final é constante: `export const <X>Validator = vine.compile(vine.object({...}))`.
  Compilar fora do handler; `vine.compile()` dentro do handler recompila a cada requisição.
- Tipo derivado por `Infer<typeof X>`; escopo agregado com `Merge<Infer<...>, { actor: User }>`.
- `LIST_LIMITS` e o `SlugValidator` genérico existem nos três.
- Mensagens em `start/validator.ts`, espelhando `frontend/src/lib/validator-messages.ts`.

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

A doc do Lucid (`lucid.md:262-270`) mostra `.serialize()`, que no runtime devolve o mesmo
envelope — e as duas formas passam nos mesmos testes. A montagem à mão é decisão
registrada em `app/core/entity.ts`, e ela vence: `toJSON()` devolve
`{ meta: any; data: ModelObject[] }`, perdendo o tipo do item, e devolver o paginator cru
faz o registry do Tuyau inferir a classe inteira em vez do JSON. `all()` mantém `T[]`, e o
`any` morre na fronteira do `Response` declarado.

É o caso em que o repositório sabe algo que a doc da biblioteca não cobre — e a regra da
seção 0 se aplica ao contrário do que parece: a doc descreve o mecanismo, o projeto decidiu
a forma, e a decisão está escrita com o porquê.

O que **não** se repete é o default: `PAGINATION` mora em `app/core/entity.ts`, e não há
`const PAGE`/`PER_PAGE` por caso de uso.

### 4.6 Autorização

Três camadas que compõem, e cada regra mora numa só:

| Camada | Onde | Cobre |
|---|---|---|
| Alcance de rota | middleware no grupo (`role()`) | papel errado nem entra |
| Forma do payload | validator | campo que aquele papel não pode enviar |
| Regra por registro | **policy** | "só o dono edita", "ninguém edita a si mesmo" |

A policy é uma **classe injetável comum**, recebida por construtor no use-case, com um
método por ação e a assinatura `(actor, target)`:

```ts
@inject()
export default class UserUpdateUseCase {
  constructor(private readonly policy: UserPolicy) {}

  async execute({ actor, id, ...payload }: Payload): Promise<Response> {
    const target = await User.find(id)
    if (!target) return left(HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'))

    if (!this.policy.update(actor, target)) {
      return left(HTTPException.Forbidden('Acesso negado', 'ACCESS_DENIED'))
    }
    // ...
  }
}
```

**Sem Bouncer como exigência** — §1.1. O pacote entrega `ctx.bouncer`, que obriga o caso
de uso a receber `HttpContext` e quebra o contrato `Payload → Either`; o que se quer dele
(regra fora do caso de uso, testável e reusável) uma classe injetável já entrega, sem
dependência nova em projeto que não a tem.

**A chamada é a mesma nos três**, tenha o projeto o pacote ou não: a policy entra por
construtor e o método é chamado direto. Só o academy tem `@adonisjs/bouncer`, e lá a
classe estende `BasePolicy` — o que muda a declaração e nada no ponto de uso. `new Bouncer(`
aparece uma vez no repositório inteiro, em `initialize_bouncer_middleware.ts`, que é
composition root e não caso de uso.

Uma versão anterior desta seção prescrevia
`new Bouncer(actor).setContainerResolver(resolver).with(UserPolicy).denies(...)` dentro do
use-case, e nenhum use-case jamais fez isso. O construtor é de fato público — verificado em
`node_modules/@adonisjs/bouncer/build/src/bouncer.d.ts`, funciona fora do contexto HTTP —
mas construí-lo à mão é um `new` a mais para chegar onde a injeção já chega, e a §2.1 não
abre exceção por gosto. O texto foi corrigido para o que o código faz, que é o melhor dos
dois.

`ctx.bouncer` **não é usado** em nenhum lugar. Cobrado por `pattern:check`.

### 4.7 Model *(Adonis)*

O model estende a classe gerada em `database/schema.ts`, que é **reescrita a cada
`migration:run`**. Só três coisas entram no arquivo do model, porque só elas sobrevivem:

1. Relações.
2. Estreitamento de enum, **com `@column()`** — sem o decorator o Lucid não hidrata.
3. `prepare`/`consume` de coluna `jsonb` ou `bigint`.
4. Query scopes (§4.8).

`serializeAs: null` para campo sensível vive em `database/schema_rules.ts`, nunca no model.

### 4.8 Soft delete por query scope

*Correção sobre a doc — `lucid.md:830-868`.*

```ts
export default class User extends UserSchema {
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })
}

const rows = await User.query().withScopes((scopes) => scopes.notDeleted())
```

A doc define o gatilho: *"assim que o mesmo filtro aparecer pela terceira vez.
Especialmente valioso para filtros de segurança, porque centraliza a regra num ponto só,
em vez de depender de cada consulta lembrar dela."*

O scope vive no arquivo do model, que não é regerado — sobrevive ao `migration:run`.

Descartados: `@beforeFetch()`, pela ressalva da própria doc (*"hooks não disparam em
update ou delete em massa via query builder"*); e scope global, que a doc confirma não
existir no Lucid.

Consulta que precisa ver o arquivado usa `TrashedModes` explicitamente. A exceção
legítima se registra em `padrao.manifest.json` (`softDeleteExempt`) — ausência vira
decisão registrada, não esquecimento.

### 4.9 Service ou `_shared`?

**O critério é dependência ou estado.**

- **Service injetável** quando precisa de outra dependência (banco, drive, outro service)
  ou de configuração. Teste rápido: se a função recebe uma dependência como *parâmetro*,
  ela é um service disfarçado.
- **`app/features/_shared.<tema>.ts`** quando é função pura sobre model ou query já em mãos.
- **Service injetável, mesmo sem dependência,** quando o que ele guarda é uma *política* e
  ele **constrói** a consulta em vez de modificar uma recebida. `visibleProducts()` nasce de
  `Product.query()` e devolve o recorte da vitrine inteiro; não há "dado em mãos" sobre o
  qual ser função pura. Injetável porque a política é o que um teste quer trocar.

A diferença entre os dois últimos é quem é dono da consulta. `visibleCourses(query)` recebe a
consulta e acrescenta condição — é `_shared`. `visibleProducts()` é a origem da consulta — é
service. Os dois formatos existem hoje e os dois estão certos; o que não vale é um service sem
dependência que apenas recebe e devolve.

`_shared/` não é depósito. Função que cresceu e passou a tocar o banco migra para service.

---

## 5. Módulos congelados

Os caminhos listados em `padrao.manifest.json` são **byte-idênticos nos três projetos
Adonis** e cobrados por hash. Mudar um em só um repositório reprova o CI.

Categorias:

- **CONGELADO** — byte-idêntico, cobrado por sha256.
- **FORMA** — mesma API pública e mesma estrutura; conteúdo varia por domínio.
- **LIVRE** — domínio puro, não se propaga.

Estão congelados, entre outros: `app/exceptions/*`, `app/core/either.ts`,
`app/core/openapi/*`, `app/services/{cookie,multipart}.service.ts`,
`app/guards/cookie-access-tokens.guard.ts`, os middlewares transversais,
`providers/storage_provider.ts`, `config/{session,hash,shield,encryption,bodyparser,cors,app,limiter,auth,drive}.ts`,
`commands/openapi_generate.ts`, `.husky/pre-commit`, `_doc-lib/*`, este documento e o
próprio manifesto.

`app/services/storage.service.ts` é FORMA com miolo congelado: a lista `REFERENCES` é do
domínio, o resto é igual.

### 5.1 Comentário em módulo congelado é genérico

O arquivo vale para os três projetos, então o texto dentro dele também. Num módulo
congelado, um comentário **não** cita:

- **instalação, domínio ou cliente** — não "o caso desta instalação,
  `api-academy.maiyu.com.br` com `academy.maiyu.com.br`", e sim "onde os dois estão sob o
  mesmo domínio-pai";
- **identificador de requisito** (`RN-09`, `AD-010`, `RF-*`) — esses vivem no documento de
  requisitos de **um** projeto, e a referência não resolve nos outros dois. Diga a regra,
  não o número dela;
- **contagem que depende do domínio** — "a contagem de uma das dez consultas" vira mentira
  no projeto que tem cinco. Isso já aconteceu.

O comentário explica o mecanismo e o defeito que a regra evita. Quando o texto só faz
sentido num projeto, ou ele é reescrito de forma genérica, ou o arquivo não é congelado.

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

## 6. Variáveis de ambiente

**As mesmas chaves declaradas nos três**, na mesma ordem, com o mesmo validador e o mesmo
comentário. A base é canônica e os três são espelho um do outro: a lista é a mesma
inclusive onde só um deles lê a chave, e a chave não lida fica opcional. A única diferença
entre os três `start/env.ts` são as três linhas do Pix — obrigatórias onde a cobrança
existe, opcionais onde não existe, porque exigi-las derrubaria o boot de quem não cobra.

Blocos, nesta ordem: `# Node` · `# App` · `# Session` · `# CORS` · `# Banco de dados` ·
`# Armazenamento` · `# Semeadura` · `# Envio de e-mail` · `# Endereço do site` · `# Fila` ·
`# Pix`.

Regras:

- **Toda chave lida por `env.get()` é declarada no schema**, e vice-versa. Cobrado por
  `pattern:check`.
- **O schema declara exatamente a lista de `envChaves` do manifesto**, nem uma a menos nem
  uma a mais. Chave nova entra nos três ou em nenhum.
- **Chave morta sai dos três.** Cada entrada do manifesto registra em `lidaPor` quem a lê
  hoje; quando o projeto está lá, a leitura tem que existir, e quando `lidaPor` fica vazio
  a chave sai. `foraDoCodigo` é a saída para o que nunca passa por `env.get()` — `PORT` e
  `HOST` são lidas em `process.env` por `@adonisjs/core`, `NODE_ENV` pelo carregador antes
  de haver serviço de env, e `TZ` pelo próprio Node. Sem esse registro a regra acusaria as
  quatro como mortas.
- **Segredo e credencial não têm default.** A aplicação para em vez de subir com um valor
  que ninguém escolheu: `PIX_KEY`, `SEED_OWNER_PASSWORD`, `SEED_DEMO_PASSWORD`, `MAIL_FROM`,
  `SMTP_HOST`. Um default de código para a chave que recebe dinheiro é um bug, não uma
  conveniência.
- **Default inseguro é declarado no comentário**, com o motivo. `DATABASE_SSL` ausente
  significa TLS desligado, e isso está escrito.
- `.env` e variantes de ambiente real **não são versionados**. Versionam-se `.env.example`
  e `.env.test` — o segundo só tem endereço de container local e senha de banco de teste,
  e sem ele ninguém roda a suíte sem adivinhar o que preencher.

---

## 7. Testes

Suíte `functional`. Piso obrigatório de arquivos nos três:

`account` · `authentication` · `papeis` · `cookie` · `cors` · `documentacao` ·
`mensagens` · `storages` · `multipart` · `validator`, mais um `<módulo>.spec.ts` por
módulo de features.

Meta: **≥ 2,0 specs de asserção por controller**, medida por relatório.

- Toda correção de segurança nasce com uma spec que **falha antes do fix**.
- Objeto real em teste vem de `app.container.make(X)` (§2.1).
- Fixture que se repete em dois arquivos vira `tests/<tema>-fixtures.ts`.

---

## 8. Documentação

Hierarquia de `CLAUDE.md`, onde **cada nível assume o de cima e nunca o repete**, e
aponta para o filho em vez de duplicar:

| Nível | Arquivo | Responde |
|---|---|---|
| Monorepo | `/CLAUDE.md` | ponteiro para backend e frontend, comandos de topo |
| Backend | `backend/CLAUDE.md` | árvore comentada, ponteiro para esta régua e para os filhos |
| Camada | `app/core/CLAUDE.md`, `app/services/CLAUDE.md`, … | regra de alocação da camada, tabela arquivo → propósito, **a decisão e o defeito que a motivou** |
| Índice de features | `app/features/CLAUDE.md` | os módulos, mapa rota → módulo |
| Módulo/recurso | `app/features/<x>/CLAUDE.md` | base route, tabela de operações, middlewares comuns, o que **não** existe e por quê |
| Operação | `app/features/<x>/<y>/CLAUDE.md` | endpoint, fluxo numerado, regras, tabela de erros, testes |

Formato do nível operação — a linha de endpoint é máquina-legível e igual em todo lugar:

```markdown
# <Verbo> <Substantivo>

<uma frase>

## Endpoint
`MÉTODO /rota` | Auth: Sim | Permission: <PERMISSION>

## Fluxo
1. Middleware: <lista ordenada, com argumento>
2. Validator: <Nome> - campos: <lista com tipo>
3. UseCase:
   - <passo>

## Regras de Negocio
- <invariante>

## Erros Possiveis
| Code | Cause | Quando |
|------|-------|--------|
| 404  | X_NOT_FOUND | ... |

## Testes
- E2E: `<verbo>.controller.spec.ts`
```

`Cause` é o `code` do envelope — os mesmos strings que o cliente compara. Seção sem
conteúdo é **omitida**, nunca preenchida com "N/A". Operação trivial usa só `## Notas`.
Sem código no `CLAUDE.md`: ele descreve, o arquivo irmão implementa.

**O nível operação só existe onde a ação é um diretório.** No lowcodejs ela é
(`features/<recurso>/<ação>/`), e por isso são 388 arquivos lá. Nos três Adonis a ação é
um **par de arquivos** dentro do diretório do recurso, e não há onde pendurar um
`CLAUDE.md` por operação sem inventar diretório vazio. Ali a operação é documentada na
tabela do recurso, com a mesma informação: endpoint, auth, permission e a tabela de erros.

**Onde a informação é derivável, ela é derivada.** A tabela de operações e a de erros
saem do `openapi.json`, que é gerado do router de verdade; a coluna de propósito do nível
camada sai do JSDoc de cada arquivo. Tabela redigida à parte envelhece na primeira
mudança — foi assim que a tabela de versões do lowcodejs passou a citar um Fastify quatro
minor atrás do instalado, num documento que fala de segurança.

Quando dois campos derivados existem mas não se correspondem, **não se correlaciona**: o
`code` e a descrição de um status com mais de um erro vêm em ordens diferentes, então a
coluna `Quando` fica vazia em vez de afirmar um pareamento que ninguém garante.

---

## 9. Commits

Conventional Commits, **em pt-BR**, atômicos. Um commit é uma mudança lógica completa que
compila e passa nos testes.

```
feat(matriculas): aceita anexo de comprovante no protocolo
fix(arquivos): exige sessao e posse no download
refactor(nucleo): remove o serializador de API que ninguem chama
docs(padrao): registra a regua unica dos quatro backends
```

O tipo reflete o que mudou de fato: correção de bug é `fix`, não `chore`; rearranjo sem
mudança de comportamento é `refactor`, não `feat`. Cobrado por `commitlint`.

---

## 10. Guard-rails

```
check = lint + typecheck + openapi:check + pattern:check + sync:check + authz:check
```

| Script | O que reprova |
|---|---|
| `lint` | as quatro regras de escrita e `new` fora da allowlist (§2.1) |
| `typecheck` | `tsc --noEmit` |
| `openapi:check` | `openapi:generate --check --strict`: documento desatualizado, ou operação sem resposta descrita |
| `pattern:check` | o que o ESLint não alcança porque depende de *onde* o arquivo está: nome de classe derivado do caminho, camada que importa outra, `ctx.bouncer`, `throw` em use-case, `actor: string`, model kebab, diretórios obrigatórios, e as três checagens de ENV (§6) |
| `sync:check` | divergência nos módulos congelados, contra o `padrao.manifest.json` |
| `authz:check` | mudança na cadeia de autorização de qualquer rota, contra `app/core/openapi/authz-baseline.json` |
| `di:check` | comando ace: constrói todo service e policy pelo container e reprova o que não sobe |

`pre-commit` roda `pnpm check && pnpm test`. `di:check` fica fora do `check` porque boota
a aplicação — o CI o roda no job que já tem banco e bucket de pé, junto da suíte.

**Dois guardas que o plano previa e não existem, com o motivo.** `boot:check` ("kernel que
sobe mas não responde") é redundante: toda spec funcional boota a aplicação, e uma que não
sobe reprova a suíte inteira antes de chegar a qualquer asserção. `openapi:verify` (comparar
resposta real com o schema publicado) tem valor e custo alto — exige factory por model e
uma segunda serialização —, e o `--strict` do `openapi:check` mais as specs de
`documentacao.spec.ts` já cobrem o caso comum. Entram quando um defeito real passar por
essas duas redes.

---

## 11. Mudar um módulo congelado

Quando a necessidade aparecer num projeto, a mudança vale para os três:

1. Edite no repositório onde a necessidade apareceu.
2. `pnpm sync:check -- --propagate` copia para os irmãos presentes localmente.
3. `pnpm sync:check -- --write` recalcula os hashes e regrava `padrao.manifest.json` nos três.
4. Um commit por repositório, **com a mesma mensagem**.

Divergência deliberada e permanente não existe em módulo congelado — ou o caminho sai da
lista de congelados no manifesto (com justificativa no commit), ou os três mudam juntos.

Mudança neste documento segue o mesmo fluxo: ele é congelado nos quatro.
