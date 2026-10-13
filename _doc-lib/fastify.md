# Fastify

Framework HTTP para Node.js montado por plugin, com validação e serialização por JSON Schema.

> Conferido contra `fastify@5.12.5`

**O que é:** um servidor HTTP que entrega o mínimo — roteamento, ciclo de vida da requisição,
validação de entrada, serialização de saída e log — e deixa o resto para plugins. O roteador é
um radix tree (`find-my-way`), a validação é AJV e a serialização é `fast-json-stringify`, que
compila o schema de resposta numa função de `stringify` específica em vez de chamar
`JSON.stringify` genérico. É daí que vem a fama de rápido, e não de mágica de runtime: o
framework não faz monkeypatch de nada do Node.

**Para que serve:** publicar uma API HTTP quando você quer decidir a arquitetura. Ele não impõe
pasta, não impõe ORM, não tem CLI que gera arquivo, não tem container de injeção. O que ele
impõe é o **contrato do plugin** — e é sobre esse contrato que uma aplicação inteira se monta.

**Como usar:**

```bash
pnpm add fastify
pnpm add fastify-plugin        # para o plugin que precisa vazar o que decora
```

```ts
// server.ts
import Fastify from 'fastify'

const app = Fastify({ logger: true })

// Um plugin é uma função async que recebe a instância. Tudo é plugin.
app.register(async function users(scope) {
  scope.get('/users/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
        },
      },
    },
  }, async (request) => {
    return { id: request.params.id, name: 'Ada' }
  })
}, { prefix: '/api' })

await app.listen({ port: 3333, host: '0.0.0.0' })
```

**Quando usar a biblioteca:** quando o projeto quer montar a própria arquitetura, ou quando o
que se publica é pequeno o bastante para não pagar por estrutura que não usa. A pergunta que
decide não é desempenho — todo framework Node moderno é rápido o bastante para o gargalo ser o
banco. É **quanto do servidor você quer escrever**. O Fastify entrega um esqueleto e um
ecossistema; quem escolhe autenticação, ORM, fila, configuração e pasta é você, em cada
projeto, de novo.

**A ideia que organiza tudo:** **encapsulamento**. Todo `register` cria um contexto filho. O
que um plugin decora, adiciona como hook ou registra como schema fica visível para ele e para
os descendentes — e **não** sobe para o pai nem escorre para os irmãos. Quebrar isso é
deliberado, e se faz embrulhando o plugin em `fastify-plugin`.

```ts
// Sem fastify-plugin: o decorator morre no filho.
app.register(async (scope) => { scope.decorate('db', conn) })
app.db // undefined

// Com fastify-plugin: sobe para quem registrou.
import fp from 'fastify-plugin'
app.register(fp(async (scope) => { scope.decorate('db', conn) }))
app.db // conn
```

É a única ideia do Fastify que, mal entendida, produz bug **silencioso**: o decorator que
"sumiu", o hook de autenticação que não rodou na rota nova, o schema compartilhado que o
`$ref` não acha. Nada disso levanta erro de tipo, e metade dá 500 só em produção. Se for para
ler uma página antes de escrever a primeira linha, é `Reference/Encapsulation`.

**Fronteira com o AdonisJS:** os dois ocupam a **mesma camada** — quem recebe a requisição,
roteia e responde — e um projeto tem um ou o outro, nunca os dois. A diferença é o que vem
junto. O Adonis entrega estrutura (container de injeção, ORM, CLI, autenticação, fila) e cobra
que você siga a convenção dele; o Fastify entrega montagem, e cobra que você escolha cada peça.
Nenhuma das duas é a certa em abstrato: a pergunta é se o projeto ganha mais com a decisão já
tomada ou com a decisão em aberto. Ver [`adonisjs.md`](adonisjs.md) para o outro lado.

**Onde ficam os plugins:** este arquivo é só a documentação oficial do núcleo. O catálogo do
ecossistema — os 60 oficiais `@fastify/*` e 237 da comunidade — está em
[`fastify-plugins.md`](fastify-plugins.md). A regra para decidir qual abrir: aqui é "como o
Fastify funciona", lá é "que plugin resolve isto".

**Links:** 42.

**Skills:** `maiyu-backend`, `solid`, `api-and-interface-design`, `security-best-practices`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### docs/latest
[doc](https://fastify.dev/docs/latest/) | [markdown](https://fastify.dev/docs/latest.md)
**O que é:** a raiz da documentação, com a divisão em duas categorias — *Reference*, formal e
exaustiva, e *Guides*, informal e didática — e um ponteiro de onde começar.
**Para que serve:** entender que as duas metades não são níveis de profundidade da mesma coisa.
A mesma feature costuma ter uma página em cada, escritas para leitores diferentes.
**Quando usar:** primeira visita, e só uma vez. São vinte linhas.

#### docs/latest/Guides
[doc](https://fastify.dev/docs/latest/Guides/) | [markdown](https://fastify.dev/docs/latest/Guides.md)
**O que é:** o índice dos 20 guias, cada um com uma linha de descrição.
**Para que serve:** varrer o que existe em prosa didática antes de procurar na referência, que
é onde a resposta costuma estar em forma de tabela de opção.
**Quando usar:** quando a pergunta é "como se faz X", e não "que parâmetro faz X".

#### docs/latest/Reference
[doc](https://fastify.dev/docs/latest/Reference/) | [markdown](https://fastify.dev/docs/latest/Reference.md)
**O que é:** o índice da referência, com os documentos marcados como *core* separados do resto.
**Para que serve:** achar a página da API sem adivinhar o nome. `Server` cobre a fábrica e a
instância, `Routes` cobre a declaração de rota, `Request` e `Reply` cobrem o que chega ao
handler — e a fronteira entre elas não é óbvia pelo nome.
**Quando usar:** sempre que souber o que quer e não onde está.

#### Guides/Getting-Started
[doc](https://fastify.dev/docs/latest/Guides/Getting-Started/) | [markdown](https://fastify.dev/docs/latest/Guides/Getting-Started.md)
**O que é:** o tutorial de entrada: instalar, subir o servidor, primeira rota, primeiro plugin,
primeiro schema, log, teste e a diferença entre handler `async` e handler com `reply.send`.
**Para que serve:** ver o modelo mental inteiro numa página. É curto porque o framework é
pequeno — o que sobra de tamanho em outros frameworks aqui está no ecossistema.
**Quando usar:** **primeira página, sempre.** A seção "Your first plugin" é a que mais paga:
ela mostra `register` antes de qualquer arquitetura, que é a ordem certa de aprender.

```ts
// A pegadinha que o guia resolve logo: async e callback não se misturam.
// Handler async devolve o payload.
app.get('/ok', async () => ({ hello: 'world' }))

// Handler síncrono manda pela reply — e não devolve nada.
app.get('/tambem-ok', (request, reply) => { reply.send({ hello: 'world' }) })

// Isto responde uma vez e deixa uma promessa solta: nunca faça.
app.get('/errado', async (request, reply) => { reply.send({ a: 1 }); return { b: 2 } })
```

```ts
// Caso real da stack: controller por decorator chamando o use-case, handler async devolve o Either já tratado.
@Controller('/teams')
export default class {
  constructor(private readonly useCase: TeamCreateUseCase = getInstanceByToken(TeamCreateUseCase)) {}

  @POST({ url: '/' })
  async create(request: FastifyRequest<{ Body: TeamCreatePayload }>, reply: FastifyReply) {
    const result = await this.useCase.execute({ ...request.body, actor: request.user })
    if (result.isLeft()) return sendError(reply, result.value)
    return result.value
  }
}
```

#### Reference/Principles
[doc](https://fastify.dev/docs/latest/Reference/Principles/) | [markdown](https://fastify.dev/docs/latest/Reference/Principles.md)
**O que é:** os dez princípios técnicos que decidem o que entra no núcleo e o que vira plugin —
sobrecusto zero em produção, sem monkeypatch no core, testável, validação como primeira linha
de defesa, e "se pode ser um plugin, provavelmente deve ser".
**Para que serve:** parar de estranhar as ausências. O Fastify não tem ORM, container, CLI nem
sessão porque o sexto princípio diz que não deveria ter.
**Quando usar:** quando a pergunta for "por que isso não vem junto", e antes de abrir issue
pedindo feature de núcleo. Também é o argumento pronto para a discussão de arquitetura: o
framework tem uma opinião escrita, e ela é "monte você".

---

## O ciclo de vida da requisição

#### Reference/Lifecycle
[doc](https://fastify.dev/docs/latest/Reference/Lifecycle/) | [markdown](https://fastify.dev/docs/latest/Reference/Lifecycle.md)
**O que é:** o diagrama do caminho de uma requisição, do roteamento à resposta, com o código de
erro que cada etapa produz quando falha. Traz também o ciclo da resposta (validação →
`schemaErrorFormatter` → `onError` → `setErrorHandler`) e o de desligamento.
**Para que serve:** saber **em que ponto** enfiar o seu código, que é a decisão que o Fastify
pede toda vez que se escreve um hook.
**Quando usar:** **antes de escrever qualquer hook.** É a página mais curta com a maior
densidade do documento inteiro — e resolve sozinha a dúvida de por que um hook não enxerga
`request.body` (roda antes do parsing) ou por que outro não consegue mais mudar o status
(roda depois do envio).

```txt
Requisição
  └─ Routing → Instance Logger
       └─ onRequest          ← ainda não há body: só header, url e método
            └─ preParsing     ← dá para trocar o stream do payload
                 └─ Parsing
                      └─ preValidation   ← último ponto para mexer no body cru
                           └─ Validation (400 aqui)
                                └─ preHandler   ← o lugar da autenticação
                                     └─ Handler
                                          └─ preSerialization  ← muda o objeto
                                               └─ onSend       ← muda o payload já serializado
                                                    └─ Resposta
                                                         └─ onResponse  ← só métrica: já foi
```

```ts
// Básico: cada hook roda na fase certa, nunca fora de ordem.
app.addHook('onRequest', async (request) => { request.log.info('chegou') })
app.addHook('preHandler', async (request) => { await ensureAuthenticated(request) })
```

```ts
// Caso real da stack: autenticação de sessão fica no preHandler do kernel, nunca dentro do controller.
app.addHook('preHandler', async (request, reply) => {
  const actor = await sessionUserMiddleware.resolve(request)
  if (actor === null) return sendError(reply, HTTPException.Unauthorized('sessão inválida', 'NO_SESSION'))
  request.user = actor
})
```

```ts
// errado: ler request.body no onRequest — ainda não existe, o parsing roda depois.
app.addHook('onRequest', async (request) => { console.log(request.body) }) // sempre null

// certo: body só existe a partir do preValidation em diante.
app.addHook('preHandler', async (request) => { console.log(request.body) })
```

#### Reference/Hooks
[doc](https://fastify.dev/docs/latest/Reference/Hooks/) | [markdown](https://fastify.dev/docs/latest/Reference/Hooks.md)
**O que é:** a referência de cada hook de requisição (`onRequest`, `preParsing`,
`preValidation`, `preHandler`, `preSerialization`, `onSend`, `onResponse`, `onError`,
`onTimeout`, `onRequestAbort`) e de cada hook de aplicação (`onRoute`, `onRegister`, `onReady`,
`onListen`, `preClose`, `onClose`), mais o escopo de cada um e os hooks de rota.
**Para que serve:** é onde mora a regra que o diagrama do `Lifecycle` não mostra: **hook é
encapsulado**. Um `preHandler` registrado num plugin roda nas rotas daquele plugin e dos
descendentes, e em nenhuma outra.
**Quando usar:** **ao escrever autenticação, log de requisição, métrica ou qualquer coisa
transversal.** A seção `Scope` é a que evita o pior defeito da casa — o guard que existe, passa
no code review e não roda na rota que alguém registrou um nível acima.

```ts
// Básico: onSend ainda pode mudar o payload já serializado.
app.addHook('onSend', async (request, reply, payload) => payload)
```

```ts
// Caso real da stack: onError central para logar, nunca para responder — quem responde é o setErrorHandler do kernel.
app.addHook('onError', async (request, reply, error) => {
  request.log.error({ err: error }, '[post > create][error]')
})
```

```ts
// errado: registrar o preHandler de autenticação dentro do controller de cada feature.
@Controller('/posts')
export default class {
  @POST({ url: '/', options: { preHandler: ensureAuth } }) create() {} // repete em cada controller
}

// certo: um único preHandler no plugin pai cobre toda a árvore de controllers registrada abaixo dele.
app.register(async (scope) => {
  scope.addHook('preHandler', ensureAuth)
  scope.register(postsController)
}, { prefix: '/posts' })
```

#### Reference/Request
[doc](https://fastify.dev/docs/latest/Reference/Request/) | [markdown](https://fastify.dev/docs/latest/Reference/Request.md)
**O que é:** o objeto que chega ao handler: `body`, `query`, `params`, `headers`, `id`, `log`,
`ip`, `protocol`, `host`, `routeOptions` e o `raw` do Node por baixo.
**Para que serve:** saber o que já veio pronto antes de instalar plugin para obter. `request.id`
existe sem configuração nenhuma e é o que amarra as linhas de log de uma mesma requisição.
**Quando usar:** ao ler qualquer coisa da requisição, e principalmente quando o dado parecer
faltar. Na v5, `hostname` deixou de incluir a porta e ganhou `host` e `port` ao lado — código
antigo que fatiava a string continua compilando e passa a devolver outra coisa.

```ts
// Básico: params e query tipados pelo generic da rota, nunca any.
app.get<{ Params: { id: string }, Querystring: { page: number } }>('/teams/:id', async (request) => {
  return { id: request.params.id, page: request.query.page }
})
```

```ts
// Caso real da stack: use-case recebe o body já tipado pelo generic do controller, não o request inteiro.
@PATCH({ url: '/:id' })
async update(request: FastifyRequest<{ Params: { id: string }, Body: TeamUpdatePayload }>) {
  return this.useCase.execute({ id: request.params.id, ...request.body, actor: request.user })
}
```

```ts
// errado: `as` para forçar o tipo do body sem schema — nada valida em runtime.
async create(request: FastifyRequest) { const body = request.body as TeamCreatePayload }

// certo: generic na assinatura + schema na rota validam e tipam juntos.
async create(request: FastifyRequest<{ Body: TeamCreatePayload }>) { const body = request.body }
```

#### Reference/Reply
[doc](https://fastify.dev/docs/latest/Reference/Reply/) | [markdown](https://fastify.dev/docs/latest/Reference/Reply.md)
**O que é:** o objeto de resposta: `code`, `header`, `type`, `send`, `redirect`, `hijack`,
`elapsedTime`, `trailers`, e as regras de quando o Fastify serializa por você.
**Para que serve:** entender que `return` e `reply.send()` são a **mesma** coisa em handler
`async`, e que fazer os dois é o defeito clássico — a segunda resposta vira warning e some.
**Quando usar:** ao responder algo que não é o objeto do caminho feliz: status customizado,
stream, download, redirecionamento. `hijack()` é o que se usa quando o Fastify precisa sair da
frente por inteiro — SSE é o caso típico.

```ts
// Básico: return e reply.send() são a mesma coisa — nunca os dois.
app.get('/ok', async (request, reply) => { reply.code(201); return { criado: true } })
```

```ts
// Caso real da stack: sendError central traduz o left do use-case para status + code, uma vez só.
export function sendError(reply: FastifyReply, exception: HTTPException): void {
  reply.code(exception.status).send({ code: exception.code, message: exception.message })
}
```

```ts
// errado: responder duas vezes — a segunda vira warning no log e some em silêncio.
async create(request: FastifyRequest, reply: FastifyReply) {
  reply.send({ a: 1 })
  return { b: 2 }
}

// certo: escolhe um jeito só — aqui, return no handler async.
async create() { return { a: 1 } }
```

#### Reference/Routes
[doc](https://fastify.dev/docs/latest/Reference/Routes/) | [markdown](https://fastify.dev/docs/latest/Reference/Routes.md)
**O que é:** a declaração de rota completa: forma abreviada e forma de objeto, `schema`, hooks
por rota, `prefix`, parâmetro de caminho, wildcard, `constraints` (versão e host), log por rota
e `exposeHeadRoutes`.
**Para que serve:** é a página de referência mais usada no dia a dia, porque quase toda opção
de rota mora nela — inclusive as que parecem de outro lugar, como o nível de log.
**Quando usar:** ao registrar rota, e sempre que precisar prefixo. O `prefix` vem nas **opções
do `register`**, não na rota — e não funciona em plugin embrulhado com `fastify-plugin`, que é
exatamente o plugin que quebra o encapsulamento de que o prefixo depende.

```ts
// O prefixo é do register, não da rota.
app.register(orders, { prefix: '/orders' })

// Hook por rota: roda só nesta, sem criar um contexto para isso.
app.get('/reports', { preHandler: [ensureAdmin], schema }, handler)
```

#### Reference/Middleware
[doc](https://fastify.dev/docs/latest/Reference/Middleware/) | [markdown](https://fastify.dev/docs/latest/Reference/Middleware.md)
**O que é:** a página que explica que **o Fastify não tem middleware** desde a v3. Para usar
middleware de Express é preciso `@fastify/express` ou `@fastify/middie`.
**Para que serve:** matar a pergunta na origem. O motivo é técnico: o Fastify embrulha `req` e
`res` do Node nos próprios `Request` e `Reply` **depois** da fase de middleware, então
middleware não tem `send` nem nada da API de resposta.
**Quando usar:** ao migrar de Express, e ao achar uma resposta de Stack Overflow que começa com
`app.use(`. O equivalente nativo é o hook `preHandler`, e para os middlewares populares existe
plugin próprio — `@fastify/helmet` no lugar de `helmet`, `@fastify/cors` no lugar de `cors`,
`@fastify/static` no lugar de `serve-static`.

---

## Plugins e encapsulamento

#### Reference/Encapsulation
[doc](https://fastify.dev/docs/latest/Reference/Encapsulation/) | [markdown](https://fastify.dev/docs/latest/Reference/Encapsulation.md)
**O que é:** a página do contexto de encapsulamento: o que um contexto filho herda do pai, o
que o pai **não** enxerga do filho, e como `fastify-plugin` quebra a barreira para o plugin que
ele embrulha — e só para ele.
**Para que serve:** entender a única estrutura que o Fastify impõe. Contexto é um grafo acíclico
dirigido, e é ele que responde "por que este decorator é `undefined`" e "por que a autenticação
não pegou aqui".
**Quando usar:** **antes da primeira pull request que crie um plugin.** O exemplo das três
rotas — uma autenticada, uma pública, uma neta da pública — cabe numa tela e explica o modelo
inteiro.

```ts
// fastify-plugin quebra o encapsulamento SÓ do plugin que embrulha.
// Um register aninhado lá dentro continua criando contexto novo.
app.register(fp(async (scope) => {
  scope.decorate('foo', 'foo')
  scope.register(async (child) => { child.decorate('bar', 'bar') })
}))

await app.ready()
app.foo // 'foo'
app.bar // undefined  ← o aninhado continua encapsulado
```

```ts
// Caso real da stack: cada plugin oficial é registrado uma vez no kernel, visível para toda a árvore abaixo.
export async function kernel(app: FastifyInstance): Promise<void> {
  await app.register(mongodb, { forceClose: true, url: env.MONGO_URL })
  await app.register(teamsController, { prefix: '/teams' })
}
```

```ts
// errado: registrar @fastify/mongodb dentro de uma feature — só essa árvore vê fastify.mongo.
app.register(async (scope) => { await scope.register(mongodb); scope.register(teamsController) })

// certo: plugin de infraestrutura sobe no kernel, antes de qualquer feature registrar.
await app.register(mongodb)
await app.register(teamsController)
```

#### Reference/Plugins
[doc](https://fastify.dev/docs/latest/Reference/Plugins/) | [markdown](https://fastify.dev/docs/latest/Reference/Plugins.md)
**O que é:** a referência do `register`: as opções que o Fastify consome (`prefix`, `logLevel`,
`logSerializers`), as que vão para o plugin, a ordem de carga, o tratamento de erro via `after`
e `ready`, e as duas formas de não criar escopo novo — `fastify-plugin` e a propriedade oculta
`skip-override`.
**Para que serve:** escrever plugin sem descobrir na marra que a opção passada no `register` é
ignorada quando o plugin usa `fastify-plugin`.
**Quando usar:** ao empacotar qualquer coisa reutilizável. Vale ler junto o trecho de
`async/await`: `await app.register(...)` **finaliza** o encapsulamento naquele ponto, e mutação
posterior não sobe mais.

```ts
// Básico: FastifyPluginAsync tipado, sem any no parâmetro de opções.
export const teamsPlugin: FastifyPluginAsync<{ prefix: string }> = async (app, opts) => {
  app.get(opts.prefix, async () => ({ teams: [] }))
}
```

```ts
// Caso real da stack: plugin de infraestrutura exposto por fastify-plugin, para o decorator vazar pro resto da app.
export default fp(async (app: FastifyInstance) => {
  app.decorate('mail', new MailService())
}, { name: 'mail-plugin' })
```

```ts
// errado: esperar que a opção passada no register chegue ao plugin embrulhado em fastify-plugin.
app.register(fp(async (scope, opts) => { scope.prefix /* undefined: fp ignora prefix */ }), { prefix: '/x' })

// certo: prefix só funciona em plugin sem fastify-plugin, que cria escopo próprio.
app.register(async (scope, opts) => { scope.get(opts.prefix, handler) }, { prefix: '/x' })
```

#### Guides/Plugins-Guide
[doc](https://fastify.dev/docs/latest/Guides/Plugins-Guide/) | [markdown](https://fastify.dev/docs/latest/Guides/Plugins-Guide.md)
**O que é:** a versão narrada do assunto — `register`, decorator, hook, distribuição,
encapsulamento, ESM, erro e erro customizado — construindo um exemplo do começo ao fim.
**Para que serve:** é a página que ensina a **pensar** em plugin, enquanto a referência ensina a
API. A seção de erro é a que mostra por que erro de boot cai no callback do `listen`.
**Quando usar:** logo depois do `Getting-Started`, e antes de decidir como organizar as pastas
do projeto — porque a organização de um app Fastify é a árvore de plugins, e não outra coisa.

#### Guides/Write-Plugin
[doc](https://fastify.dev/docs/latest/Guides/Write-Plugin/) | [markdown](https://fastify.dev/docs/latest/Guides/Write-Plugin.md)
**O que é:** a régua de qualidade para publicar um plugin: código, documentação, licença,
exemplo, teste, linter e CI.
**Para que serve:** dois usos, e o segundo é o que mais paga — avaliar plugin **de terceiro**
antes de instalar, com o mesmo checklist que os oficiais seguem.
**Quando usar:** ao publicar um plugin, e ao escolher entre dois plugins da comunidade que
fazem a mesma coisa.

#### Reference/Decorators
[doc](https://fastify.dev/docs/latest/Reference/Decorators/) | [markdown](https://fastify.dev/docs/latest/Reference/Decorators.md)
**O que é:** `decorate`, `decorateRequest` e `decorateReply`: como pendurar propriedade na
instância, na requisição e na resposta, com dependência declarada e verificação por `hasDecorator`.
**Para que serve:** é a resposta do Fastify para "onde guardo a conexão do banco" e "onde
guardo o usuário autenticado". E tem motivo de desempenho: decorar define a **forma** do objeto
antes de ele existir, o que deixa o V8 otimizar; escrever `request.user = x` num hook muda a
forma em tempo de execução e desotimiza.
**Quando usar:** **sempre que for tentado a atribuir uma propriedade nova em `request`.**
Declare primeiro com o valor inicial mais próximo do futuro — `''` para string, `null` para
objeto — e só então atribua no hook. Tipo de referência como valor inicial levanta erro no
boot desde a v5, de propósito: o objeto seria compartilhado por todas as requisições.

```ts
app.decorateRequest('user', null)          // declara a forma
app.addHook('preHandler', async (request) => {
  request.user = await resolveUser(request) // preenche
})
```

```ts
// Caso real da stack: declaração do tipo via module augmentation — única exceção a "type, não interface".
declare module 'fastify' {
  interface FastifyRequest {
    user: User | null
  }
}
```

```ts
// errado: atribuir direto, sem decorateRequest — muda a forma do objeto em runtime, desotimiza o V8.
app.addHook('preHandler', async (request) => { request.user = await resolveUser(request) })

// certo: declara a forma uma vez no boot, atribui só o valor no hook.
app.decorateRequest('user', null)
app.addHook('preHandler', async (request) => { request.user = await resolveUser(request) })
```

---

## Validação e serialização

#### Reference/Validation-and-Serialization
[doc](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) | [markdown](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization.md)
**O que é:** a página central do `schema` de rota: validação de `body`, `querystring`, `params`
e `headers` por AJV; serialização de resposta por `fast-json-stringify`; schema compartilhado
por `addSchema` e `$ref`; compilador customizado; formatação de erro de validação.
**Para que serve:** as duas metades resolvem problemas diferentes, e confundi-las custa caro. A
validação **protege a entrada**; o schema de resposta **acelera a saída e filtra campo** — o que
não está declarado não é serializado.
**Quando usar:** ao declarar qualquer rota. E de novo, com atenção, no dia em que um campo
"sumiu" da resposta: quase sempre é o schema de resposta fazendo exatamente o que promete.

```ts
// O schema de resposta não é decoração: é filtro e é velocidade.
app.get('/users/:id', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: { id: { type: 'string' }, email: { type: 'string' } },
      },
    },
  },
}, async () => {
  // passwordHash existe no objeto e NÃO sai na resposta — não está no schema.
  return { id: '1', email: 'ada@example.com', passwordHash: '...' }
})
```

#### Guides/Fluent-Schema
[doc](https://fastify.dev/docs/latest/Guides/Fluent-Schema/) | [markdown](https://fastify.dev/docs/latest/Guides/Fluent-Schema.md)
**O que é:** o `fluent-json-schema`, que constrói JSON Schema por encadeamento em vez de objeto
literal, com as duas formas de reúso — `$ref` para schema externo e substituição por `$id`.
**Para que serve:** escrever JSON Schema sem a verbosidade do literal, e reaproveitar constante
do código dentro do schema (um `enum` que vem de um objeto, por exemplo).
**Quando usar:** quando o schema é JSON Schema à mão e começou a doer. Se o projeto já valida
com outra biblioteca de schema, esta página é leitura de contexto, não de adoção.

#### Reference/Type-Providers
[doc](https://fastify.dev/docs/latest/Reference/Type-Providers/) | [markdown](https://fastify.dev/docs/latest/Reference/Type-Providers.md)
**O que é:** o mecanismo que faz o TypeScript **inferir** o tipo de `request.body`,
`request.query` e afins a partir do schema da rota, com os três provedores suportados —
`json-schema-to-ts`, `typebox` e `zod`.
**Para que serve:** eliminar o par tipo-e-schema que dessincroniza. Sem provider, ou você
declara genérico em toda rota, ou `request.body` é `unknown`.
**Quando usar:** ao montar um projeto TypeScript cujo schema de rota é JSON Schema. Duas
armadilhas moram aqui: schema extraído para variável precisa de `as const`, ou o TS alarga
`type: 'object'` para `string` e a inferência morre; e o provider **não** se propaga por
contexto — cada plugin precisa chamar `withTypeProvider` de novo.

#### Guides/Write-Type-Provider
[doc](https://fastify.dev/docs/latest/Guides/Write-Type-Provider/) | [markdown](https://fastify.dev/docs/latest/Guides/Write-Type-Provider.md)
**O que é:** uma página de trinta linhas sobre escrever o seu próprio type provider, com um
detalhe só: reduza para `unknown`, nunca para `never`, porque parte da API de
`FastifyInstance` é contravariante em `TypeProvider`.
**Para que serve:** o caso raro de integrar uma biblioteca de schema que não tem provider
pronto.
**Quando usar:** quase nunca. Vale a leitura se um provider de terceiro estiver produzindo erro
de atribuição incompreensível — a causa costuma ser esse `never`.

#### Reference/ContentTypeParser
[doc](https://fastify.dev/docs/latest/Reference/ContentTypeParser/) | [markdown](https://fastify.dev/docs/latest/Reference/ContentTypeParser.md)
**O que é:** como o Fastify transforma o corpo da requisição em `request.body`. Nativamente ele
só entende `application/json` e `text/plain`; qualquer outro tipo cai em
`FST_ERR_CTP_INVALID_MEDIA_TYPE` até alguém registrar um parser.
**Para que serve:** aceitar XML, CSV, protobuf, corpo binário — ou desligar o parsing e ficar
com o stream cru.
**Quando usar:** ao receber qualquer coisa que não seja JSON. Duas notas caras: `GET` e `HEAD`
nunca têm o corpo lido, e parser registrado por regex sem entrada correspondente em
`schema.body.content` faz a requisição ser **parseada sem ser validada** — silenciosamente.

---

## TypeScript

#### Reference/TypeScript
[doc](https://fastify.dev/docs/latest/Reference/TypeScript/) | [markdown](https://fastify.dev/docs/latest/Reference/TypeScript.md)
**O que é:** a página mais longa do documento: os genéricos de `FastifyInstance`,
`FastifyRequest` e `FastifyReply`, o exemplo comentado de ponta a ponta, a declaração de módulo
para tipar decorator, e a lista completa dos tipos exportados.
**Para que serve:** duas coisas que todo projeto TypeScript precisa e ninguém adivinha: como
tipar `request.body` sem type provider (genérico na rota) e como fazer o TS conhecer um
decorator (`declare module 'fastify'`).
**Quando usar:** **ao decorar qualquer coisa.** Sem a declaração de módulo, `app.db` não existe
para o compilador, e o caminho fácil — um `as` no ponto de uso — espalha a mentira por todo
lugar em vez de corrigi-la num.

```ts
// Básico: um decorator só existe para o TypeScript depois da declaração de módulo.
// `interface` aqui é a exceção documentada — é merge de declaração, não cabe em `type`.
declare module 'fastify' {
  interface FastifyInstance {
    db: Database
  }
  interface FastifyRequest {
    user: User | null
  }
}
```

```ts
// Caso real da stack: tipa o retorno do use-case no generic da rota, sem `any` em nenhum ponto.
app.post<{ Body: TeamCreatePayload; Reply: Team }>('/teams', async (request, reply) => {
  const result = await useCase.execute({ ...request.body, actor: request.user })
  if (result.isLeft()) return sendError(reply, result.value)
  return result.value
})
```

```ts
// errado: `as` no ponto de uso espalha a mentira do tipo por todo handler que lê o decorator.
app.get('/teams', async (request: FastifyRequest) => (request as unknown as { db: Database }).db)

// certo: declare module uma vez, e todo handler recebe o tipo sem cast.
declare module 'fastify' { interface FastifyInstance { db: Database } }
app.get('/teams', async (request, reply) => reply.server.db)
```

---

## O servidor

#### Reference/Server
[doc](https://fastify.dev/docs/latest/Reference/Server/) | [markdown](https://fastify.dev/docs/latest/Reference/Server.md)
**O que é:** a referência da fábrica `Fastify(options)` e da instância. Cada opção do
construtor está aqui — `bodyLimit`, `trustProxy`, `caseSensitive`, `ignoreTrailingSlash`,
`disableRequestLogging`, `genReqId`, `ajv`, `http2`, `keepAliveTimeout`, `handlerTimeout` — e
cada método da instância também, de `addHook` a `close`.
**Para que serve:** é o dicionário do framework. Quando a pergunta é "existe uma opção para
isso", a resposta está aqui ou não existe.
**Quando usar:** ao criar o servidor, e sempre que o comportamento padrão desagradar. Três
opções que se descobre tarde demais: `trustProxy`, sem a qual `request.ip` atrás de proxy é o
IP do proxy — e todo limite por IP vira limite global; `bodyLimit`, que tem default de 1MB; e
`close`, cujo desligamento gracioso (drenar conexão, `preClose`, `onClose`) é o que separa
deploy sem erro de deploy com requisição cortada no meio.

#### Reference/Logging
[doc](https://fastify.dev/docs/latest/Reference/Logging/) | [markdown](https://fastify.dev/docs/latest/Reference/Logging.md)
**O que é:** o log com Pino: como ligar, `request.log` contra `app.log`, nível por rota,
serializer, redação de campo sensível, `pino-pretty` em desenvolvimento e rastreio por
`request.id`.
**Para que serve:** ter log estruturado sem instalar nada — o Pino já vem — e correlacionar as
linhas de uma requisição sem inventar um id.
**Quando usar:** **no primeiro dia.** Log é **desligado por default** e **não pode ser ligado em
runtime**: sem `{ logger: true }` na fábrica, não há como recuperar aquele erro depois. Vale ler
junto a redação: sem ela, `authorization` e senha entram no log de produção pela porta da
frente.

```ts
// Básico: liga no boot, nunca depois — e redige o header sensível.
const app = fastify({
  logger: { level: 'info', redact: ['req.headers.authorization'] },
})
```

```ts
// Caso real da stack: log de erro do use-case carrega a tag do módulo e do verbo, igual em todo caso de uso.
catch (error) {
  request.log.error({ err: error }, '[team > create][error]')
  return left(HTTPException.InternalServerError('Erro interno do servidor', 'TEAM_CREATE_ERROR'))
}
```

```ts
// errado: console.log no handler — perde request.id, nível e redação.
async create(request: FastifyRequest) { console.log('criando time', request.body) }

// certo: request.log já carrega o id da requisição, sem configurar nada.
async create(request: FastifyRequest) { request.log.info({ body: request.body }, 'criando time') }
```

#### Reference/Errors
[doc](https://fastify.dev/docs/latest/Reference/Errors/) | [markdown](https://fastify.dev/docs/latest/Reference/Errors.md)
**O que é:** duas coisas na mesma página — como o Fastify trata erro (`setErrorHandler`,
`onError`, o formato padrão da resposta de erro, erro em hook, erro de boot) e a **tabela
completa** dos códigos `FST_ERR_*`, com causa e solução de cada um.
**Para que serve:** a tabela é um buscador: código na mão, causa em uma linha. É o caminho mais
curto de um 500 críptico até o defeito.
**Quando usar:** ao ver qualquer `FST_ERR_` no log — comece por aqui, não pelo Google. E ao
padronizar o envelope de erro da API, que é onde `setErrorHandler` entra. Atenção ao
`FSTWRN004`: dois `setErrorHandler` no mesmo escopo, e o segundo apaga o primeiro sem avisar.

#### Reference/Warnings
[doc](https://fastify.dev/docs/latest/Reference/Warnings/) | [markdown](https://fastify.dev/docs/latest/Reference/Warnings.md)
**O que é:** os avisos `FSTWRN*` e as depreciações `FSTDEP*`, com o que cada um significa e como
resolver.
**Para que serve:** ler o aviso que apareceu no terminal em vez de silenciá-lo. `FSTWRN001` é
rota **sem schema** — quase sempre um esquecimento, não uma escolha. `FSTWRN003` é plugin que
mistura `async` com `done`, e o sintoma é rejeição não tratada.
**Quando usar:** quando o boot imprimir um aviso, com `--trace-warnings` para achar a linha. A
página lista como desligar aviso, e diz na mesma frase para não fazer isso.

#### Reference/HTTP2
[doc](https://fastify.dev/docs/latest/Reference/HTTP2/) | [markdown](https://fastify.dev/docs/latest/Reference/HTTP2.md)
**O que é:** HTTP/2 sobre TLS (h2) e em texto claro (h2c), com o `allowHTTP1: true` que faz o
mesmo socket atender os dois protocolos por ALPN.
**Para que serve:** o caso em que o Node termina o TLS — sem proxy na frente — ou comunicação
entre serviços em h2c.
**Quando usar:** raramente. Em produção com Traefik, nginx ou HAProxy na frente, quem fala
HTTP/2 com o navegador é o proxy, e a aplicação continua em HTTP/1.1 por trás. A página avisa
que **nenhuma** API específica de HTTP/2 está exposta: server push e afins só pelo `raw` do Node.

---

## Produção

#### Guides/Recommendations
[doc](https://fastify.dev/docs/latest/Guides/Recommendations/) | [markdown](https://fastify.dev/docs/latest/Guides/Recommendations.md)
**O que é:** as recomendações de produção, com configuração pronta de HAProxy e nginx como
proxy reverso, planejamento de capacidade, execução sem `root`, ajuste de kernel e o motivo de
não expor o Node direto na internet.
**Para que serve:** a metade da operação que não está no código. O trecho de proxy reverso é
copiável e explica cada bloco.
**Quando usar:** **antes do primeiro deploy.** Vale junto do parágrafo de `trustProxy` em
`Reference/Server`: pôr um proxy na frente sem contar isso à aplicação transforma todo IP de
cliente no IP do proxy.

```ts
// Básico: diz à aplicação que há proxy na frente, para request.ip refletir o cliente de verdade.
const app = fastify({ trustProxy: true })
```

```ts
// Caso real da stack: a leitura de ENV do kernel acumula essa checagem junto das outras, antes do boot.
if (env.TRUST_PROXY !== 'true' && env.NODE_ENV === 'production') {
  errors.push('TRUST_PROXY precisa ser "true" atrás de nginx/HAProxy em produção')
}
```

```ts
// errado: sem trustProxy, todo rate-limit e log de IP enxerga o IP do proxy, não do cliente.
const app = fastify()

// certo: trustProxy lido do mesmo .env que o resto da infraestrutura.
const app = fastify({ trustProxy: env.TRUST_PROXY === 'true' })
```

#### Guides/Delay-Accepting-Requests
[doc](https://fastify.dev/docs/latest/Guides/Delay-Accepting-Requests/) | [markdown](https://fastify.dev/docs/latest/Guides/Delay-Accepting-Requests.md)
**O que é:** o padrão de aceitar a conexão mas **segurar** a requisição enquanto a aplicação
não está pronta — carregando configuração remota, aquecendo cache, esperando o banco — usando
um hook e uma promessa em vez de adiar o `listen`.
**Para que serve:** não perder requisição na janela entre "o processo subiu" e "a aplicação
funciona", que é exatamente quando o orquestrador começa a mandar tráfego.
**Quando usar:** quando o boot depende de algo externo e lento. Se a dependência é apenas
`await` antes do `listen`, não precisa desta página — ela é para o caso em que a porta precisa
abrir antes.

#### Guides/Detecting-When-Clients-Abort
[doc](https://fastify.dev/docs/latest/Guides/Detecting-When-Clients-Abort/) | [markdown](https://fastify.dev/docs/latest/Guides/Detecting-When-Clients-Abort.md)
**O que é:** como perceber que o cliente desistiu no meio — `clientErrorHandler`, o hook
`onRequestAbort` e o `request.signal` — e como parar o trabalho em vez de terminar um relatório
que ninguém vai receber.
**Para que serve:** requisição longa. Um cliente que dá F5 três vezes numa exportação de dez
segundos deixa três processamentos rodando se ninguém escutar o abort.
**Quando usar:** ao implementar exportação, relatório, upload grande ou qualquer handler que
passe de alguns segundos. Passar `request.signal` adiante para o `fetch` e para a consulta é o
que faz o cancelamento chegar ao fim da cadeia.

#### Guides/Serverless
[doc](https://fastify.dev/docs/latest/Guides/Serverless/) | [markdown](https://fastify.dev/docs/latest/Guides/Serverless.md)
**O que é:** como rodar um app Fastify em AWS Lambda, Google Cloud Functions, Firebase, Cloud
Run, Vercel, Netlify e afins — e, antes disso, o argumento de que talvez não se deva.
**Para que serve:** o aviso vale mais que as receitas: em serverless o servidor não fica de pé,
então keep-alive, pool de conexão e cache em memória — parte do que faz o Fastify ser rápido —
não têm onde existir. Cold start passa a dominar o tempo de resposta.
**Quando usar:** ao considerar serverless, para decidir com o custo à vista. Cloud Run e
equivalentes rodam o processo de verdade e não caem nessa: ali o app é o mesmo do container.

#### Guides/Database
[doc](https://fastify.dev/docs/latest/Guides/Database/) | [markdown](https://fastify.dev/docs/latest/Guides/Database.md)
**O que é:** o guia dos plugins oficiais de banco — `@fastify/mysql`, `@fastify/postgres`,
`@fastify/redis`, `@fastify/mongodb`, `@fastify/leveldb` — com exemplo de uso de cada um.
**Para que serve:** mostrar o **padrão**, mais do que os plugins: a conexão vira decorator da
instância, e o handler a alcança por `this` ou por `fastify.db`. Quem escrever um plugin para
outro banco copia essa forma.
**Quando usar:** ao ligar o primeiro banco. Se o projeto usa ORM, o plugin de driver quase
sempre é desnecessário — o que fica valendo é a forma de expor a conexão e de fechá-la no
`onClose`.

#### Guides/Benchmarking
[doc](https://fastify.dev/docs/latest/Guides/Benchmarking/) | [markdown](https://fastify.dev/docs/latest/Guides/Benchmarking.md)
**O que é:** como medir a aplicação com `autocannon`, e como comparar dois branches ou duas
versões de Node com `branch-comparer` e `concurrently`.
**Para que serve:** transformar "acho que ficou mais lento" em número, com o **mesmo** roteiro
nas duas medições.
**Quando usar:** antes e depois de uma mudança que se suspeita cara. Fora disso, é ruído:
medição sem comparação não diz nada, porque o número absoluto depende da máquina.

#### Reference/LTS
[doc](https://fastify.dev/docs/latest/Reference/LTS/) | [markdown](https://fastify.dev/docs/latest/Reference/LTS.md)
**O que é:** a política de suporte: seis meses de suporte a partir do lançamento de uma major,
mais seis meses de correção de segurança depois da major seguinte, e a tabela com data e versão
de Node de cada linha.
**Para que serve:** saber quando a versão instalada deixa de receber correção, e qual Node ela
suporta. A v5 saiu em 2024-09-17 e cobre Node 20 e 22.
**Quando usar:** ao planejar atualização, e ao fixar versão. O aviso escondido é caro: correção
de segurança pode sair como **minor com quebra**, e prender em `~5.x.y` para evitar isso deixa
a aplicação vulnerável de propósito.

---

## Testes

#### Guides/Testing
[doc](https://fastify.dev/docs/latest/Guides/Testing/) | [markdown](https://fastify.dev/docs/latest/Guides/Testing.md)
**O que é:** como testar aplicação e plugin com `app.inject()`, que executa o ciclo de vida
inteiro **sem abrir porta**, e a alternativa com servidor de pé para o que `inject` não cobre.
**Para que serve:** teste de rota sem porta, sem `supertest`, sem cliente HTTP e sem
concorrência de porta em CI — o que também torna o teste paralelizável de graça.
**Quando usar:** **no primeiro teste.** A seção "Separating concerns" é a que ensina a estrutura
que torna tudo isso possível: a construção da aplicação num módulo, o `listen` em outro. Quem
chama `listen` no mesmo arquivo que monta o app não consegue usar `inject` sem subir servidor.

```ts
// Nenhuma porta é aberta. O ciclo de vida roda inteiro.
const response = await app.inject({
  method: 'POST',
  url: '/users',
  payload: { name: 'Ada' },
  cookies: { 'access-token': token },
})

expect(response.statusCode).toBe(201)
expect(response.json()).toMatchObject({ name: 'Ada' })
```

```ts
// Caso real da stack: *.controller.spec.ts sobe o app de verdade e usa supertest sobre o server, não inject.
const app = await buildApp()
await app.ready()

const response = await request(app.server).post('/teams').send({ name: 'Growth' })
expect(response.status).toBe(201)
```

```ts
// errado: instanciar o use-case com `new` no teste — não quebra quando o construtor ganha dependência nova.
const useCase = new TeamCreateUseCase(new TeamServiceFake())

// certo: resolve pelo container, igual à produção — ganha a dependência nova de graça.
const useCase = app.container.make(TeamCreateUseCase)
```

---

## Migração

#### Guides/Migration-Guide-V5
[doc](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/) | [markdown](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5.md)
**O que é:** as quebras da v4 para a v5: Node 20 como mínimo, JSON Schema **completo**
obrigatório em `querystring`, `params`, `body` e resposta, nova assinatura do construtor de
logger, `useSemicolonDelimiter` agora `false`, objeto de parâmetros sem protótipo,
`reply.redirect()` com assinatura nova, `reply.sent` imutável, `request.connection` removido,
`reply.getResponseTime()` trocado por `reply.elapsedTime`, plugin proibido de misturar callback
com promessa, e `hostname` sem a porta.
**Para que serve:** atualizar sem caçar cada erro em runtime. Muita quebra aqui **não** é erro
de tipo: `hostname` continua string, só passou a ter outro conteúdo.
**Quando usar:** **antes de subir a major, e antes de copiar código de qualquer tutorial.** A
maior parte do que existe escrito sobre Fastify é v4 ou v3.

```ts
// Básico: reply.getResponseTime() saiu — a v5 usa a propriedade elapsedTime.
app.addHook('onResponse', async (request, reply) => {
  request.log.info({ ms: reply.elapsedTime }, 'respondido')
})
```

```ts
// Caso real da stack: redirect com status explícito — a assinatura antiga (status, url) foi invertida.
reply.redirect('/login', 302)
```

```ts
// errado: código de tutorial v4 que fatia hostname para tirar a porta — na v5 não sobra porta ali.
const host = request.hostname.split(':')[0] // devolve o host inteiro, sem porta nenhuma pra cortar

// certo: host e port já vêm separados na v5.
const host = request.host
const port = request.port
```

#### Guides/Migration-Guide-V4
[doc](https://fastify.dev/docs/latest/Guides/Migration-Guide-V4/) | [markdown](https://fastify.dev/docs/latest/Guides/Migration-Guide-V4.md)
**O que é:** as quebras da v3 para a v4, com codemods: `app.use()` removido, `reply.res` virou
`reply.raw`, composição de tratamento de erro, `exposeHeadRoutes` ligado por default, definição
de rota síncrona e `.listen()` variádico depreciado.
**Para que serve:** traduzir material antigo. `app.use()` é a marca d'água mais visível — todo
exemplo que o usa é de antes da v4.
**Quando usar:** ao encontrar código que não bate com a API atual, e na atualização a partir da
v3.

#### Guides/Migration-Guide-V3
[doc](https://fastify.dev/docs/latest/Guides/Migration-Guide-V3/) | [markdown](https://fastify.dev/docs/latest/Guides/Migration-Guide-V3.md)
**O que é:** as quebras da v2 para a v3, incluindo a saída do middleware do núcleo e a mudança
na assinatura de hook e de content type parser.
**Para que serve:** contexto histórico, mais do que trabalho. É aqui que se lê **por que** o
Fastify não tem middleware.
**Quando usar:** quase nunca. Vale para entender resposta antiga de fórum antes de copiá-la.

---

## Comunidade

#### Guides/Ecosystem
[doc](https://fastify.dev/docs/latest/Guides/Ecosystem/) | [markdown](https://fastify.dev/docs/latest/Guides/Ecosystem.md)
**O que é:** a lista oficial de plugins, dividida entre os mantidos pela organização Fastify
(`@fastify/*`) e os da comunidade, cada um com uma linha de descrição.
**Para que serve:** procurar antes de escrever. A resposta para quase toda necessidade de
infraestrutura já existe empacotada.
**Quando usar:** antes de escrever qualquer plugin. Este arquivo tem o catálogo anotado em
[`fastify-plugins.md`](fastify-plugins.md), que é a mesma lista com "o que resolve" em
português — a página oficial continua sendo a fonte para conferir o que entrou depois.

#### Guides/Contributing
[doc](https://fastify.dev/docs/latest/Guides/Contributing/) | [markdown](https://fastify.dev/docs/latest/Guides/Contributing.md)
**O que é:** como contribuir com o Fastify: tipos de contribuição aceitos, regras de convivência,
como preparar o ambiente e como abrir pull request.
**Para que serve:** contribuir com o projeto.
**Quando usar:** ao mandar correção para o upstream. Fora disso, não.

#### Guides/Style-Guide
[doc](https://fastify.dev/docs/latest/Guides/Style-Guide/) | [markdown](https://fastify.dev/docs/latest/Guides/Style-Guide.md)
**O que é:** o guia de estilo da **documentação** do Fastify — escolha de palavra, quando evitar
a segunda pessoa, tom, formatação.
**Para que serve:** escrever documentação para o projeto.
**Quando usar:** ao contribuir com doc. Serve também como referência de estilo para
documentação técnica em geral, mas isso é uso lateral.

#### Guides/Prototype-Poisoning
[doc](https://fastify.dev/docs/latest/Guides/Prototype-Poisoning/) | [markdown](https://fastify.dev/docs/latest/Guides/Prototype-Poisoning.md)
**O que é:** a história de como envenenamento de protótipo funciona, escrita por Eran Hammer:
um JSON com `__proto__` que atravessa `JSON.parse` e contamina `Object.prototype`, e o que o
Fastify faz a respeito.
**Para que serve:** entender uma classe inteira de vulnerabilidade que parece teórica até
aparecer. O parser padrão do Fastify remove `__proto__` — mas parser customizado registrado por
`addContentTypeParser` **não** ganha isso de graça.
**Quando usar:** **ao registrar um content type parser próprio**, e ao revisar qualquer código
que faça merge profundo de objeto vindo da requisição. É leitura longa e vale o tempo uma vez
na vida.

```ts
// Básico: o parser default do Fastify já remove __proto__ do JSON recebido.
app.post('/teams', async (request) => request.body) // seguro sem nada escrito a mais
```

```ts
// Caso real da stack: parser customizado para um content type próprio precisa da mesma proteção.
function dropProto(key: string, value: unknown): unknown {
  if (key === '__proto__') return undefined
  return value
}

app.addContentTypeParser('application/x-team', { parseAs: 'string' }, (request, body, done) => {
  done(null, JSON.parse(body, dropProto))
})
```

```ts
// errado: merge profundo de body com objeto de configuração, sem filtrar __proto__.
const config = deepMerge({}, request.body) // __proto__ do payload contamina Object.prototype

// certo: valida pelo schema da rota antes de qualquer merge — campo fora do schema nem chega aqui.
app.post('/teams', { schema: teamCreateSchema }, async (request) => deepMerge({}, request.body))
```

