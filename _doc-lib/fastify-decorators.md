# fastify-decorators

Controller, rota, hook e injeção de dependência por decorator sobre o Fastify, com bootstrap por
diretório.

> Conferido contra `fastify-decorators@3.16.1`

**O que é:** um pacote pequeno que dá ao Fastify a peça que ele deliberadamente não tem — uma
convenção de classe. `@Controller` agrupa rotas, `@GET`/`@POST`/`@PUT`/`@PATCH`/`@DELETE`/`@HEAD`/
`@OPTIONS`/`@ALL` marcam os métodos, `@Hook` e `@ErrorHandler` prendem hook e tratamento de erro ao
escopo do controller, e `bootstrap` varre um diretório por máscara e registra cada classe como um
plugin Fastify comum. Por cima vem um container mínimo: `@Service`, `@Inject`,
`getInstanceByToken`, `@Initializer` para inicialização assíncrona e `@Destructor` para o
encerramento. O container é o de decorators **legados** do TypeScript — exige
`experimentalDecorators` e, para injeção por constructor, `emitDecoratorMetadata` mais
`reflect-metadata`.

**Para que serve:** fechar a lacuna com o AdonisJS sem sair do Fastify. O Adonis entrega container
e controller de fábrica; o Fastify entrega função e plugin, e a estrutura fica por conta de cada
projeto. Este pacote é uma resposta a isso que **não** troca o modelo: o que ele produz continua
sendo `register` de plugin, e encapsulamento, ciclo de vida e schema continuam sendo do Fastify.

**Como usar:**

```bash
pnpm add fastify-decorators reflect-metadata
```

```json
// tsconfig.json — os dois, senão a injeção por constructor vira undefined
{ "compilerOptions": { "experimentalDecorators": true, "emitDecoratorMetadata": true } }
```

```ts
// server.ts
import 'reflect-metadata'
import Fastify from 'fastify'
import { bootstrap } from 'fastify-decorators'

const app = Fastify({ logger: true })

app.register(bootstrap, {
  directory: new URL('./', import.meta.url),
  mask: /\.controller\./, // só arquivos *.controller.* viram rota
})

await app.listen({ port: 3333, host: '0.0.0.0' })
```

```ts
// user.service.ts
import { Service } from 'fastify-decorators'

@Service()
export class UserService {
  async find(id: string) {
    return { id, name: 'Ada' }
  }
}

// user.controller.ts
import type { FastifyRequest } from 'fastify'
import { Controller, GET } from 'fastify-decorators'
import { UserService } from './user.service.js' // classe, pelo caminho direto: o tipo precisa existir em runtime

@Controller('/users')
export default class UserController {
  constructor(private readonly users: UserService) {}

  @GET('/:id')
  async show(request: FastifyRequest<{ Params: { id: string } }>) {
    return this.users.find(request.params.id)
  }
}
```

**Quando usar a biblioteca:** quando a aplicação cresceu a ponto de precisar de uma convenção de
controller e de injeção, e a alternativa seria trocar de framework. Para meia dúzia de rotas ela
não paga a configuração de decorator, e o Fastify puro com `register` é mais curto e mais fácil de
tipar. Vale também a advertência inversa: quem quer o container completo — escopos, provedores,
módulos — está descrevendo o NestJS, e este pacote não tenta ser isso.

**A armadilha que organiza tudo:** a injeção por constructor depende do tipo de cada parâmetro
existir **em runtime**, emitido pelo compilador em `design:paramtypes`. Tudo que apaga o tipo na
compilação apaga a injeção junto, sem erro de tipo: `import type`, parâmetro tipado com
`interface`, e re-export por barrel em compiladores que elidem tipo (SWC, esbuild). O sintoma é o
serviço chegar `undefined` no primeiro uso, não no boot — e se o método for chamado só em produção,
é lá que aparece. A regra que segura isso é do compilador, não de projeto: o tipo do parâmetro é
uma **classe** importada pelo caminho direto do arquivo que a declara. Quem não quer conviver com
isso usa `getInstanceByToken` ou `@Inject(Token)`, que não dependem de metadata.

**Fronteira com o Fastify:** aqui é "como se declara"; ciclo de vida, encapsulamento, schema de
validação e serialização são os de [`fastify.md`](fastify.md). Um `@Hook('preHandler')` num
controller é um `addHook` no plugin daquele controller, com o mesmo alcance e as mesmas regras de
fase; um `@GET('/', { schema })` recebe o mesmo `RouteShorthandOptions` que o `app.get`. A doc
deste pacote não repete nada disso, e é proposital.

**Duas versões, e só uma instalada:** a **3.16.1** é a `latest` do npm e é a que este arquivo
documenta; ela aceita Fastify 3, 4 e 5 (`peerDependencies`, e não a tabela do README, que parou no
4). A **v4** existe como branch e como `4.0.0-next.*`, e muda o desenho: o container sai do núcleo
para o plugin `@fastify-decorators/simple-di`, entra `@fastify-decorators/typedi` como alternativa,
`ControllerType` vira `Scope`, e os decorators ECMAScript nativos passam a ser aceitos. Os links
da seção **v4** abaixo são leitura de *para onde isto vai*, para quem planeja a migração — não são
referência do que está instalado, e o conteúdo deles muda sem a URL avisar.

**Links:** 20.

**Skills:** `maiyu-backend`, `solid`, `api-and-interface-design`, `security-best-practices`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### npm
[doc](https://www.npmjs.com/package/fastify-decorators)

**O que é:** a página do pacote no registro, com a versão `latest`, a tag `next`, o README
renderizado e a lista de versões publicadas.
**Para que serve:** conferir o que é a versão estável de verdade antes de ler qualquer outra
página deste arquivo — a `latest` é a 3.x, e a `next` é a 4.0.0 em pré-lançamento.
**Quando usar:** ao instalar, ao decidir se atualiza, e sempre que um link de `v4` mostrar uma
API que o pacote instalado não tem. A seção `#getting-started` desta página é o mesmo texto do
README do GitHub, anotado na entrada seguinte.

#### README
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v3.16.1) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/README.md)

**O que é:** a introdução da 3.16.1: benefícios, tabela de compatibilidade com o Fastify, as duas
formas de escrever um servidor — *request handler*, uma classe por rota, e *controller*, uma classe
por grupo — e a configuração de `tsconfig.json`.
**Para que serve:** escolher entre as duas formas antes de escrever o primeiro arquivo. A de
*controller* é a que quase todo projeto usa; a de *request handler* existe para função pequena que
vira classe só para receber `@Hook` e `@ErrorHandler`.
**Quando usar:** primeira visita. E quando a pergunta for "isto funciona com o Fastify 5?" —
a tabela do README para no 4, mas o `peerDependencies` do pacote aceita `^5.0.0`, e é ele que vale.

```ts
// As duas formas, lado a lado. A doc chama de "Request handler way" e "Controllers way".
import { Controller, GET, RequestHandler } from 'fastify-decorators'

// uma classe por rota: request e reply chegam como campos protegidos
@GET('/health')
export default class HealthHandler extends RequestHandler {
  async handle() {
    return { ok: true }
  }
}

// uma classe por grupo: request e reply chegam como parâmetros
@Controller('/posts')
export default class PostController {
  @GET('/')
  async index() {
    return []
  }
}
```

```ts
// Caso real da stack: controller injeta use-case pelo construtor, resolve o Either pelo sendError central.
@Controller('/posts')
export default class {
  constructor(private readonly useCase: PostCreateUseCase = getInstanceByToken(PostCreateUseCase)) {}

  @POST('/')
  async create(request: FastifyRequest<{ Body: PostCreatePayload }>, reply: FastifyReply) {
    const result = await this.useCase.execute({ ...request.body, actor: request.user })
    if (result.isLeft()) return sendError(reply, result.value)
    return result.value
  }
}
```

```ts
// errado: instanciar o controller à mão — o container do pacote nunca entra em cena.
import PostController from './post.controller'
const controller = new PostController() // o parâmetro do construtor fica undefined, sem erro

// certo: quem instancia é o bootstrap, por reflexão sobre o diretório de controllers.
bootstrap(app, { controllersDirectory: `${__dirname}/controllers` })
```

## Referência (v3.16.1)

#### Bootstrapping
[doc](https://github.com/L2jLiga/fastify-decorators/blob/v3.16.1/docs/Bootstrapping.md) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/Bootstrapping.md)

**O que é:** as duas formas de subir a aplicação — `directory` + `mask`, que varre a pasta, e
`controllers: [...]`, que recebe a lista explícita — e a opção `classLoader`, que substitui o
container embutido por um externo (o exemplo da doc é o TypeDI).
**Para que serve:** entender o que o `bootstrap` faz com a árvore do Fastify: ele próprio é
embrulhado em `fastify-plugin`, então não cria contexto, e **cada controller** vira um `register`
filho com o próprio prefixo — hook e `@ErrorHandler` de um controller não alcançam o vizinho.
Prefixo global vai em `prefix`.
**Quando usar:** **antes do primeiro controller que "não sobe"**. Três motivos, nenhum com erro
de tipo. A máscara default é `/\.(handler|controller)\./`, testada contra o **nome** do arquivo,
recursivamente, e arquivo fora dela é ignorado em silêncio. A varredura lê só o **`export
default`** do módulo — `export class` sem default é "arquivo incorreto", e derruba o boot, a não ser
que `skipBroken` esteja ligado, o que troca um erro no boot por uma rota 404 em produção. E
`getInstanceByToken(FastifyInstanceToken)` em campo estático não funciona: a instância só existe
depois do `bootstrap`, e o campo estático roda no `import`.

```ts
import { bootstrap } from 'fastify-decorators'

// varredura por diretório: tudo que casar com a máscara é registrado
app.register(bootstrap, {
  directory: new URL('./modules', import.meta.url),
  mask: /\.controller\.(js|ts)$/,
  prefix: '/api',
})

// lista explícita: sem varredura, sem surpresa de máscara, e é a forma que serve em Lambda
app.register(bootstrap, {
  controllers: [UserController, PostController],
})

// container externo: o pacote só chama o loader, quem instancia é você
app.register(bootstrap, {
  directory: new URL('./modules', import.meta.url),
  classLoader: (clazz) => Container.get(clazz),
})
```

```ts
// Caso real da stack: varre features/<modulo>/<acao>/*.controller.ts, cada ação no próprio diretório.
app.register(bootstrap, {
  directory: new URL('./features', import.meta.url),
  mask: /\.controller\.ts$/,
})
```

```ts
// errado: resolver dependência num campo estático — a instância do Fastify ainda não existe no import.
export default class {
  static db = getInstanceByToken(FastifyInstanceToken) // undefined: roda antes do bootstrap
}

// certo: resolve no construtor, chamado só depois do bootstrap registrar o controller.
export default class {
  constructor(private readonly db = getInstanceByToken(FastifyInstanceToken)) {}
}
```

#### Controllers
[doc](https://github.com/L2jLiga/fastify-decorators/blob/v3.16.1/docs/Controllers.md) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/Controllers.md)

**O que é:** o decorator `@Controller` — string de rota ou `{ route, type, tags }` —, os
decorators de método HTTP, as três formas de injetar um serviço, `@Hook` e `@ErrorHandler` por
classe ou por código de erro.
**Para que serve:** é a página do dia a dia. Quase tudo que se escreve com o pacote é um
controller, e as opções que não cabem no nome do decorator estão aqui.
**Quando usar:** ao criar o primeiro controller, e ao decidir `ControllerType.SINGLETON` (uma
instância para todas as requisições, o default) contra `ControllerType.REQUEST` (uma por
requisição). A segunda é a única forma de ter estado por requisição num campo da classe; a
primeira transforma esse campo num vazamento entre usuários.

```ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { Controller, ControllerType, ErrorHandler, GET, Hook, POST } from 'fastify-decorators'

class PostNotFound extends Error {}

@Controller({ route: '/posts', type: ControllerType.SINGLETON, tags: [{ name: 'Posts' }] })
export default class PostController {
  @GET('/:id')
  async show(request: FastifyRequest<{ Params: { id: string } }>) {
    const post = await find(request.params.id)
    if (!post) throw new PostNotFound()
    return post
  }

  @POST('/', { schema: { body: { type: 'object', required: ['title'] } } })
  async create(request: FastifyRequest<{ Body: { title: string } }>) {
    return save(request.body)
  }

  // hook do Fastify, com alcance limitado às rotas deste controller
  @Hook('onSend')
  async strip(_request: FastifyRequest, reply: FastifyReply) {
    reply.removeHeader('x-powered-by')
  }

  // por classe de erro; também aceita string de código, ou nada para pegar tudo
  @ErrorHandler(PostNotFound)
  notFound(_error: PostNotFound, _request: FastifyRequest, reply: FastifyReply) {
    reply.status(404).send({ message: 'Post not found' })
  }
}
```

```ts
// Caso real da stack: injeção por construtor, schema escrito à mão, Either tratado por sendError.
@Controller('/teams')
export default class {
  constructor(private readonly useCase: TeamCreateUseCase = getInstanceByToken(TeamCreateUseCase)) {}

  @POST({ url: '/', options: { schema: teamCreateSchema } })
  async create(request: FastifyRequest<{ Body: TeamCreatePayload }>, reply: FastifyReply) {
    const result = await this.useCase.execute({ ...request.body, actor: request.user })
    if (result.isLeft()) return sendError(reply, result.value)
    return result.value
  }
}
```

```ts
// errado: SINGLETON (o default) guardando estado de uma requisição num campo da classe.
@Controller('/teams')
export default class {
  private lastQuery = '' // uma instância para toda a app: usuário A lê a query do usuário B

  @GET('/') async index(request: FastifyRequest<{ Querystring: { q: string } }>) {
    this.lastQuery = request.query.q
  }
}

// certo: ControllerType.REQUEST cria uma instância por requisição — nada sobrevive entre elas.
@Controller({ route: '/teams', type: ControllerType.REQUEST })
export default class { private lastQuery = '' }
```

#### Request Handlers
[doc](https://github.com/L2jLiga/fastify-decorators/blob/v3.16.1/docs/Request%20Handlers.md) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/Request%20Handlers.md)

**O que é:** a assinatura dos decorators de método — `(url?, options?)` ou `({ url, options })`,
com `options` sendo o `RouteShorthandOptions` do Fastify — e a forma *uma classe por rota*, que
estende `RequestHandler` e implementa `handle()`.
**Para que serve:** saber onde o `schema`, o `preHandler` e o `config` da rota entram: no segundo
argumento do decorator, exatamente como entrariam no `app.get`.
**Quando usar:** ao passar schema ou opção de rota por decorator, e ao ler a limitação que a página
declara: um decorator HTTP por método, sem empilhar `@GET` e `@POST` na mesma função.

```ts
import { GET, RequestHandler } from 'fastify-decorators'

// o segundo argumento é o RouteShorthandOptions do Fastify, sem tradução
@GET('/users/:id', {
  schema: { params: { type: 'object', properties: { id: { type: 'string' } } } },
  config: { rateLimit: { max: 10 } },
})
export default class ShowUser extends RequestHandler {
  async handle() {
    // request e reply são campos protegidos da classe base, não parâmetros
    this.reply.header('cache-control', 'no-store')
    return { id: this.request.id }
  }
}
```

```ts
// Caso real da stack: a mesma assinatura (url, options) usada no decorator de método do Controller.
@Controller('/teams')
export default class {
  @POST({ url: '/', options: { schema: teamCreateSchema } })
  async create(request: FastifyRequest<{ Body: TeamCreatePayload }>) { /* ... */ }
}
```

```ts
// errado: empilhar dois decoradores HTTP na mesma função — o pacote só reconhece o último.
export default class {
  @GET('/teams') @POST('/teams') async handle() {} // POST sobrescreve o GET em silêncio
}

// certo: um decorator por método, um método por verbo.
export default class {
  @GET('/teams') async index() {}
  @POST('/teams') async create() {}
}
```

#### Services and dependency injection
[doc](https://github.com/L2jLiga/fastify-decorators/blob/v3.16.1/docs/Services%20and%20dependency%20injection.md) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/Services%20and%20dependency%20injection.md)

**O que é:** o container: `@Service` (token é a classe, ou uma string/símbolo passado ao
decorator), as três formas de injetar — constructor, `@Inject(Token)` e `getInstanceByToken` —,
`@Initializer` para inicialização assíncrona com dependências ordenadas, `@Destructor`, e
`injectablesHolder.injectService` / `injectSingleton` para inverter a dependência num token
abstrato. Os tokens embutidos `FastifyInstanceToken`, `FastifyRequestToken` e `FastifyReplyToken`
fecham a página.
**Para que serve:** decidir uma forma de injeção e usá-la em todo lugar. As três funcionam, mas só
a do constructor depende de `emitDecoratorMetadata` — e é ela que falha em silêncio quando o tipo
some na compilação.
**Quando usar:** **antes do primeiro `@Service`**, e de novo quando um serviço chegar `undefined`
sem nenhum erro de boot. A frase da própria doc, "metadata gerada automaticamente pode ter
problemas com referência circular ou adiantada", é a descrição educada desse bug.

```ts
import { Destructor, Initializer, Service, getInstanceByToken, injectablesHolder } from 'fastify-decorators'

// Serviço com ciclo de vida: init roda no bootstrap, destroy no close do Fastify
@Service()
export class Database {
  declare client: Client

  @Initializer()
  async init() {
    this.client = await connect(process.env.DATABASE_URL)
  }

  @Destructor()
  async destroy() {
    await this.client.end()
  }
}

// Serviço que depende do init de outro: o array garante a ordem
@Service()
export class UserRepository {
  constructor(private readonly db: Database) {}

  @Initializer([Database])
  async init() {
    await this.db.client.query('select 1')
  }
}

// Inversão: o controller tipa o abstrato no constructor, o boot escolhe o concreto
export abstract class Mailer {
  abstract send(to: string, body: string): Promise<void>
}

injectablesHolder.injectService(Mailer, SmtpMailer) // antes do register(bootstrap)

// Sem metadata: token explícito no @Service, e o compilador não tem como apagá-lo
@Service('mailer')
export class SmtpMailer extends Mailer {
  async send(to: string, body: string) {}
}

const mailer = getInstanceByToken<Mailer>('mailer')
```

```ts
// errado: import de Contract pelo barrel index.ts — o SWC elide o tipo do parâmetro em re-export,
// e a injeção vira undefined sem erro, sem log.
import { TeamContractService } from '../services' // barrel
export default class { constructor(private readonly teams: TeamContractService) {} }

// certo: import direto do módulo, o tipo chega inteiro ao emitDecoratorMetadata.
import { TeamContractService } from '../services/team/team-contract.service'
export default class { constructor(private readonly teams: TeamContractService) {} }
```

#### Testing
[doc](https://github.com/L2jLiga/fastify-decorators/blob/v3.16.1/docs/Testing.md) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/Testing.md)

**O que é:** `configureControllerTest`, que sobe um Fastify de teste com um controller só e os
serviços trocados por mock (`{ provide, useValue }`), `configureServiceTest`, que devolve o serviço
com as dependências mockadas — e resolve o `@Initializer` se houver —, e o teste de aplicação
inteira via `bootstrap` + `inject`. Abre com a configuração de Jest e Mocha, que é quase toda sobre
carregar `reflect-metadata` antes de qualquer classe.
**Para que serve:** testar um controller sem subir o banco, e um serviço sem subir o Fastify.
Dependência sem mock usa a implementação real — o que é conveniente e, quando esquecido, vira teste
que fala com o banco de verdade.
**Quando usar:** ao escrever o primeiro teste de controller. E ao ver `Reflect.getMetadata is not a
function` no runner: é o `reflect-metadata` sendo importado depois de uma classe decorada, e a
correção é o setup do runner, não o teste.

```ts
import { configureControllerTest, configureServiceTest } from 'fastify-decorators/testing'

// controller isolado, serviço trocado por mock
const app = await configureControllerTest({
  controller: UserController,
  mocks: [{ provide: UserService, useValue: { find: async () => ({ id: '1', name: 'Ada' }) } }],
})
const response = await app.inject({ method: 'GET', url: '/users/1' })
expect(response.json()).toEqual({ id: '1', name: 'Ada' })

// serviço isolado; o await resolve o @Initializer, se existir
const repository = await configureServiceTest({
  service: UserRepository,
  mocks: [{ provide: Database, useValue: { client: { query: async () => [] } } }],
})
```

#### Migration to v3
[doc](https://github.com/L2jLiga/fastify-decorators/blob/v3.16.1/docs/Migration%20to%20v3.md) | [markdown](https://raw.githubusercontent.com/L2jLiga/fastify-decorators/v3.16.1/docs/Migration%20to%20v3.md)

**O que é:** o guia de migração de 2.x para 3.x. É curto: a mudança de verdade foi acompanhar o
Fastify 3, e a página remete ao *Changed TypeScript support* do guia de migração do próprio Fastify.
**Para que serve:** entender que o pacote segue o Fastify em versão maior, e que quebrar tipagem
de `FastifyRequest`/`FastifyReply` é o que muda entre majors.
**Quando usar:** só ao encontrar código de fastify-decorators 2.x. Para projeto novo, pule.

## v4 (branch, não instalada)

O que está abaixo é a branch `v4`, publicada como `4.0.0-next.*`. A API é parecida, mas os imports
mudam — `@Service`, `@Inject`, `@Initializer` saem de `fastify-decorators` e vão para
`@fastify-decorators/simple-di` — e o piso sobe para Node 20.12, TypeScript 5 e Fastify 4. Os
links são diretório no GitHub, sem `.md` cru, e o conteúdo muda com a branch.

#### tree/v4/docs
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/docs)

**O que é:** a pasta de documentação da branch: `Bootstrapping`, `Controllers`, `Request
Handlers`, `Testing`, mais duas páginas que a v3 não tem — `Migration to v4`, com a tabela do que
mudou, e `Plugins Development`, com os hooks de ciclo de vida do pacote (`appInit`,
`beforeControllerCreation`, `afterControllerCreation`, `appReady`, `appDestroy`) e o contrato do
`classLoader`.
**Para que serve:** planejar a migração. `Migration to v4` é a lista de tarefas; `Plugins
Development` explica por que o container virou plugin, e é a página para quem quer escrever o
próprio.
**Quando usar:** ao decidir se migra, e não antes. As páginas com o mesmo nome das da v3 não são
as da v3 — `Services and dependency injection` sumiu daqui e virou o README do `simple-di`.

#### tree/v4/examples
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples)

**O que é:** oito projetos completos, cada um com `src/`, `test/`, `tsconfig` e `jest.config`,
rodáveis com `install` + `build` + `start`. Os README de cada um são de uma linha; o conteúdo é o
código.
**Para que serve:** ver a v4 montada de ponta a ponta, incluindo o que a doc só descreve —
configuração de teste, `import.meta.url` no `directory`, e a divisão de imports entre o núcleo e o
`simple-di`.
**Quando usar:** como referência de projeto ao migrar. Cada exemplo tem uma entrada abaixo; abra
o que cobre a dúvida em vez de ler os oito.

#### examples/controllers
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/controllers)

**O que é:** o exemplo mais completo: pastas `dependency-injection`, `error-handling`, `hooks`,
`inheritance`, `states` (controller *stateful* e *stateless*, os dois escopos) e `user`, um CRUD
com schema.
**Para que serve:** ver cada decorator num contexto, e em especial a pasta `states`, que é o
`Scope.SINGLETON` contra `Scope.REQUEST` — o `ControllerType` renomeado — em dois arquivos
comparáveis.
**Quando usar:** ao migrar um controller e querer o equivalente v4 de cada peça da v3.

#### examples/request-handlers
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/request-handlers)

**O que é:** a forma *uma classe por rota* na v4, com `hooks` e um `user` com schema. O README foi
copiado do exemplo de swagger e diz outra coisa; o código é o que conta.
**Para que serve:** ver que `RequestHandler` sobreviveu à v4 sem mudar de forma.
**Quando usar:** só se o projeto usa request handler em vez de controller. Caso contrário, pule.

#### examples/async-initializer
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/async-initializer)

**O que é:** um `ServiceA` com `@Initializer` que grava numa lista compartilhada
(`MessagesHolder`), um `ServiceB` que depende dele, e um controller que usa os dois. O teste, com
`configureControllerTest`, prova pela ordem das mensagens que o `init` rodou antes da primeira
requisição.
**Para que serve:** ver o `@Initializer` de ponta a ponta, incluindo o `testing` do `simple-di`
lendo o estado do serviço pelo `instance.controller`.
**Quando usar:** ao portar serviço com conexão assíncrona — banco, fila, cache — para a v4, onde
`@Initializer` vem do `simple-di`.

#### examples/injecting-requests-in-services
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/injecting-requests-in-services)

**O que é:** serviços aninhados em três níveis que recebem `FastifyRequest` e `FastifyReply` por
`@Inject(FastifyRequestToken)` e `@Inject(FastifyReplyToken)`, e respondem de dentro do serviço.
**Para que serve:** mostrar que os tokens de requisição existem e chegam a qualquer profundidade —
e, por consequência, que o serviço passa a ter escopo de requisição.
**Quando usar:** raramente, e com desconfiança. Serviço que toca `reply` é controller com outro
nome; o exemplo prova que dá, não que deve. Os mesmos tokens já existem na 3.16.1.

#### examples/ecmascript-decorators
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/ecmascript-decorators)

**O que é:** o mesmo CRUD de `user` com `experimentalDecorators: false` — decorators do padrão
ECMAScript (TypeScript 5), sem `reflect-metadata` e, por isso, sem injeção por constructor: não há
pasta `dependency-injection` neste exemplo.
**Para que serve:** ver o que sobra quando se abandona o decorator legado: rota, hook e
`@ErrorHandler` funcionam; o container por metadata não existe, porque o padrão não emite tipo.
**Quando usar:** ao planejar sair de `experimentalDecorators`. É a resposta para "o pacote roda com
decorator nativo?" — roda, e a injeção passa a ser por token explícito.

#### examples/swagger
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/swagger)

**O que é:** `@Controller({ route, tags })` e `@POST('/', { schema })` com schema tipado por
`TypeBox`, alimentando `@fastify/swagger` para gerar OpenAPI 3 com tag por controller.
**Para que serve:** ver que `tags` do controller vira tag de todos os métodos, e que a tag do
método, quando existe, vence. A opção `tags` já existe na 3.16.1.
**Quando usar:** ao publicar OpenAPI a partir de controllers. O plugin de swagger é o de
[`fastify-plugins.md`](fastify-plugins.md); este exemplo só mostra onde a tag entra.

#### examples/aws-lambda
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/aws-lambda)

**O que é:** `bootstrap` com lista explícita `controllers: [PingController]`, embrulhado por
`@fastify/aws-lambda`, e exportado como `handler`.
**Para que serve:** mostrar que em Lambda a varredura por diretório não serve — o bundle não tem
pasta para varrer — e a lista explícita é a forma. Vale igual na 3.16.1.
**Quando usar:** ao empacotar para serverless, ou ao usar um bundler que junta tudo num arquivo.

#### examples/typedi
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/examples/typedi)

**O que é:** o container do TypeDI no lugar do `simple-di`: `useContainer(Container)` antes do
`bootstrap`, `@Service` e `@Inject` importados do `typedi`.
**Para que serve:** ver a troca de container em uma linha, que é o que o desenho por plugin da v4
comprou.
**Quando usar:** se o projeto já usa TypeDI em outro lugar. Na 3.16.1 o equivalente é a opção
`classLoader` do `bootstrap`.

#### plugins/simple-di
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/plugins/simple-di)

**O que é:** o container embutido da v3, extraído para o pacote `@fastify-decorators/simple-di`.
O README é a antiga página *Services and dependency injection* mais a seção de testes, com os
imports trocados.
**Para que serve:** é o destino de `@Service`, `@Inject`, `@Initializer`, `@Destructor`,
`getInstanceByToken` e de `configureControllerTest`/`configureServiceTest` na v4.
**Quando usar:** ao migrar — é o `pnpm add` a mais e o *find and replace* de import que o guia de
migração descreve. `reflect-metadata` deixa de ser importado por você: o plugin importa.

#### plugins/typedi
[doc](https://github.com/L2jLiga/fastify-decorators/tree/v4/plugins/typedi)

**O que é:** o pacote `@fastify-decorators/typedi`, com a única API `useContainer(Container)`, que
registra o TypeDI como `classLoader` da aplicação.
**Para que serve:** usar um container que já existe no ecossistema, com escopos e provedores que o
`simple-di` não tem.
**Quando usar:** ao escolher container na migração. Se o `simple-di` basta, e para quase todo
projeto basta, pule.

