# AdonisJS

Framework Node.js completo, com TypeScript nativo, injeção de dependência e baterias inclusas.

**O que é:** um framework MVC para backend em Node.js, no espírito do Laravel: em vez de escolher e
costurar dez bibliotecas, ele já traz roteamento, validação, ORM, autenticação, sessão, e-mail,
filas, cache, testes e uma CLI de scaffolding, todos integrados e tipados. Roda em TypeScript de
verdade, com ESM e decorators.

**Para que serve:** entregar API ou aplicação renderizada no servidor sem gastar a primeira semana
montando infraestrutura. As convenções e o container de injeção de dependência mantêm o projeto
organizado à medida que ele cresce, e a CLI (`ace`) gera controllers, models, migrations, validators
e testes com a estrutura correta.

**Como usar:**

```bash
npm init adonisjs@latest minha-api -- --kit=api
node ace serve --watch
node ace make:controller users
node ace list                    # todos os comandos disponíveis
```

```ts
// start/routes.ts
router.group(() => {
  router.resource('posts', PostsController).apiOnly()
}).prefix('/api').use(middleware.auth())
```

**Quando usar o framework:** em API ou app de médio a grande porte, onde convenção compartilhada vale
mais que liberdade total de montagem. Para um endpoint só ou uma função serverless, Hono ou Fastify
entregam com muito menos peso.

**Os três conceitos que destravam o resto:** o **container de IoC** (que resolve dependências
sozinho, e é por isso que os controllers recebem serviços sem `new`), o **HttpContext** (o objeto que
carrega request, response, usuário autenticado e sessão através de toda a requisição) e os
**service providers** (que registram e inicializam tudo isso no boot).

**Links:** 91.

---

## Começando

#### introduction
[doc](https://docs.adonisjs.com/introduction)
**O que é:** a apresentação do framework, a filosofia por trás dele e o que vem incluído.
**Para que serve:** entender o escopo antes de investir tempo.
**Quando usar:** primeira leitura, e ao comparar com Express, Fastify ou NestJS.

```ts
// A diferença que a página vende, num arquivo: rota, validação, autorização e
// controller injetado, tudo do próprio framework, sem costurar bibliotecas.
router
  .group(() => {
    router.post('/', [controllers.administrator.administrators.Create])
  })
  .prefix('administrator/administrators')
  .use([middleware.auth(), middleware.role(['owner', 'admin'])])
```

#### stacks-and-starter-kits
[doc](https://docs.adonisjs.com/stacks-and-starter-kits)
**O que é:** os kits iniciais disponíveis: `api` (só JSON), `web` (com Edge), `inertia` e `slim`.
**Para que serve:** começar com exatamente o que o projeto precisa, sem carregar peso extra.
**Quando usar:** **antes de rodar o comando de criação**. Escolher o kit errado custa uma limpeza
chata depois. Para API consumida por frontend separado, o kit `api` é o certo.

```bash
# frontend separado (o caso desta stack): kit api, sem Edge nem Vite
npm init adonisjs@latest backend -- --kit=api

# app renderizado no servidor: kit web, com Edge e assets
# npm init adonisjs@latest app -- --kit=web
```

#### installation
[doc](https://docs.adonisjs.com/installation)
**O que é:** requisitos, comando de criação e as flags disponíveis.
**Para que serve:** criar o projeto.
**Quando usar:** uma vez por projeto.

```bash
npm init adonisjs@latest backend -- --kit=api --db=postgres --auth-guard=session
cd backend
node ace serve --watch
```

#### folder-structure
[doc](https://docs.adonisjs.com/folder-structure)
**O que é:** o que cada pasta significa: `app`, `start`, `config`, `database`, `bin`, `tests`, e os
imports com `#` do subpath imports do Node.
**Para que serve:** saber onde colocar cada arquivo e entender os imports com `#models/user`.
**Quando usar:** **nos primeiros dias**. Os subpath imports com `#` confundem quem chega, e a
explicação está aqui, não no TypeScript.

```ts
// os `#` são subpath imports do NODE, declarados em package.json > imports.
// Não são alias do TypeScript, e é por isso que funcionam em runtime sem build.
import User from '#models/user'
import HTTPException from '#exceptions/http.exception'
import { middleware } from '#start/kernel'

// package.json:
// "imports": { "#models/*": "./app/models/*.js", "#exceptions/*": "./app/exceptions/*.js" }
```

#### dev-environment
[doc](https://docs.adonisjs.com/dev-environment)
**O que é:** o servidor de desenvolvimento, o hot reload via hot-hook, o assembler e as ferramentas
de qualidade de código.
**Para que serve:** um ciclo de desenvolvimento rápido, sem reiniciar o processo a cada mudança.
**Quando usar:** na configuração, e quando o hot reload não pegar alguma mudança. Nem todo arquivo é
recarregável a quente, e a página diz quais.

```jsonc
// package.json: só o que está em `boundary` recarrega a quente.
// Mudança em start/, config/ ou providers/ REINICIA o processo, e é normal.
{
  "hotHook": {
    "boundaries": ["./app/features/**/*.controller.ts", "./app/middleware/*.ts"]
  }
}
```

#### configuration
[doc](https://docs.adonisjs.com/configuration)
**O que é:** os arquivos de `config/`, o serviço `config`, e a validação das variáveis de ambiente em
`start/env.ts`.
**Para que serve:** configuração tipada e validada no boot, em vez de `process.env.ALGO!` espalhado.
**Quando usar:** ao adicionar qualquer variável de ambiente. **Declare no `Env.create`**, e o app
falha no start se ela faltar, em vez de falhar em produção às três da manhã.

```ts
// start/env.ts
import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // a validação roda no BOOT: variável faltando derruba o start, e não o
  // primeiro request que precisar dela em produção
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PASSWORD: Env.schema.string(),
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),
})
// env.get('DB_HOST') é `string`, não `string | undefined`
```

#### deployment
[doc](https://docs.adonisjs.com/deployment)
**O que é:** build de produção, o que copiar para o servidor, migrations em produção, gestão de
processo e configuração de proxy reverso.
**Para que serve:** publicar sem descobrir na tentativa o que falta.
**Quando usar:** antes do primeiro deploy. A parte de rodar migrations no deploy merece atenção
especial.

```bash
node ace build                 # gera ./build, com package.json próprio
cd build && pnpm i --prod

# migration em produção pede confirmação; --force é obrigatório em script de CI
node ace migration:run --force

node bin/server.js             # o processo final não usa ace nem TypeScript
```

#### faqs
[doc](https://docs.adonisjs.com/faqs)
**O que é:** as dúvidas recorrentes sobre o framework, o ecossistema e as escolhas de design.
**Para que serve:** respostas rápidas para o que quase todo mundo pergunta.
**Quando usar:** ao esbarrar em algo que parece esquisito. Costuma ter explicação aqui.

```ts
// As três perguntas que aparecem sempre, com a resposta curta:
//
// 1. "Por que import com #?"        -> subpath imports do Node, ver folder-structure
// 2. "Por que .js no import de .ts?" -> ESM exige a extensão do arquivo EMITIDO
// 3. "Por que decorator @inject?"    -> o container lê os tipos do construtor

import User from '#models/user' // resolve para ./app/models/user.js em runtime
```

## Tutorial

#### tutorial/hypermedia/overview
[doc](https://docs.adonisjs.com/tutorial/hypermedia/overview)
**O que é:** a visão geral do tutorial guiado que constrói um app renderizado no servidor do começo
ao fim.
**Para que serve:** aprender pela ordem em que as peças aparecem num app real.
**Quando usar:** se você está começando no framework e prefere aprender construindo. Se o seu caso é
API pura, os guias são mais diretos.

```bash
# o tutorial usa o kit web (Edge + Vite). Para API pura, o caminho é outro:
npm init adonisjs@latest tutorial -- --kit=web

# em API, pule direto para guides/basics/routing e guides/basics/validation
```

#### tutorial/hypermedia/cli-and-repl
[doc](https://docs.adonisjs.com/tutorial/hypermedia/cli-and-repl)
**O que é:** a etapa que apresenta o `ace` e o REPL interativo.
**Para que serve:** conhecer as duas ferramentas que você mais usa no terminal.
**Quando usar:** cedo. O REPL é subestimado: dá para consultar o banco e testar um método sem
escrever rota nenhuma.

```bash
node ace list                    # o catálogo inteiro, inclusive comandos de pacotes
node ace repl
# dentro do REPL:
# > await importDefault('#models/user')
# > await (await importDefault('#models/user')).query().count('* as total')
```

#### tutorial/hypermedia/database-and-models
[doc](https://docs.adonisjs.com/tutorial/hypermedia/database-and-models)
**O que é:** a etapa de banco e models, com migrations e a primeira consulta.
**Para que serve:** ver Lucid integrado ao framework, e não isolado.
**Quando usar:** como primeiro contato com Lucid. Depois, a doc própria do Lucid é a referência.

```bash
node ace make:model Team -m   # model + migration na mesma tacada
node ace migration:run

# ORDEM OBRIGATÓRIA quando a tabela é nova: migration primeiro, model depois.
# `migration:fresh` sobe o app e carrega os models, e um model de tabela
# inexistente derruba o boot antes de a migration rodar.
```

#### tutorial/hypermedia/routes-controller-views
[doc](https://docs.adonisjs.com/tutorial/hypermedia/routes-controller-views)
**O que é:** a etapa que liga rota, controller e template.
**Para que serve:** ver o caminho completo de uma requisição.
**Quando usar:** para fixar o fluxo. Em API, a parte de views não se aplica, mas rota e controller
sim.

```ts
// o caminho de uma requisição, sem a parte de view:
// rota -> middleware do grupo -> controller -> validator -> use-case -> resposta
router.post('/', [controllers.administrator.teams.Create])

// no controller:
const payload = await context.request.validateUsing(TeamCreateValidator)
const result = await this.useCase.execute(payload)
return context.response.created(result.value)
```

#### tutorial/hypermedia/forms-and-validation
[doc](https://docs.adonisjs.com/tutorial/hypermedia/forms-and-validation)
**O que é:** a etapa de formulários, validação com VineJS e exibição de erros.
**Para que serve:** ver a validação no contexto de um fluxo real, com erro voltando para o
formulário.
**Quando usar:** antes de escrever o primeiro validator. Vale mesmo para API, trocando a exibição
por resposta JSON.

```ts
// em API o erro de validação vira 422 com o corpo padronizado, sem template:
// { "errors": [{ "field": "email", "rule": "email", "message": "..." }] }
const payload = await context.request.validateUsing(TeamCreateValidator)

// nenhum try/catch aqui: o handler global de exceções já formata a resposta
```

#### tutorial/hypermedia/styling-and-cleanup
[doc](https://docs.adonisjs.com/tutorial/hypermedia/styling-and-cleanup)
**O que é:** a etapa de estilo com Vite e organização final do código.
**Para que serve:** fechar o app do tutorial.
**Quando usar:** só se estiver seguindo o tutorial com frontend renderizado no servidor.

```bash
# só faz sentido no kit web. Em projeto de API o Vite não é instalado, e o
# frontend tem o build dele, em outro repositório ou em outra pasta.
node ace add @adonisjs/vite
```

#### tutorial/hypermedia/authorization
[doc](https://docs.adonisjs.com/tutorial/hypermedia/authorization)
**O que é:** a etapa de autorização, com o Bouncer e as habilidades por recurso.
**Para que serve:** ver permissão aplicada num caso concreto, e não só em teoria.
**Quando usar:** antes de modelar permissões. O guia de autorização é a referência completa, este é
o exemplo que a torna concreta.

```ts
// Duas camadas diferentes, e confundi-las é o erro comum:
//
// 1. ALCANCE de rota  -> middleware no grupo (papel errado nem entra)
// 2. ESCOPO de dado   -> filtro na consulta (user só vê o que é dela)
//
// O Bouncer cobre a segunda quando a regra é por registro:
// if (await bouncer.denies('editProduct', post)) ...
```

## Básico

#### guides/basics/routing
[doc](https://docs.adonisjs.com/guides/basics/routing)
**O que é:** definição de rotas, parâmetros e curingas, grupos com prefixo e middleware, rotas
nomeadas, rotas de recurso e o registro do arquivo `start/routes.ts`.
**Para que serve:** o mapa de URLs da aplicação.
**Quando usar:** o tempo todo. **Grupos com middleware são o mecanismo certo para segurança**: rota
nova nasce protegida por estar no grupo certo, em vez de depender de alguém lembrar de proteger.

```ts
router
  .group(() => {
    router.get('/', [controllers.administrator.teams.Paginate])
    // subgrupo aninhado: só o dono remove, e a exigência vale para tudo aqui
    router.group(() => {
      router.delete(':id', [controllers.administrator.teams.Delete])
    }).use(middleware.role(['owner']))
  })
  .prefix('administrator/teams')
  // ordem: auth ANTES de role. Sem sessão o papel é desconhecido, e a resposta
  // correta é 401, não 403.
  .use([middleware.auth(), middleware.role(['owner', 'admin'])])
```

#### guides/basics/controllers
[doc](https://docs.adonisjs.com/guides/basics/controllers)
**O que é:** controllers como classes, o import dinâmico com `lazy import` nas rotas, controllers de
recurso e injeção de dependência no construtor.
**Para que serve:** organizar os handlers em classes coesas em vez de funções soltas na rota.
**Quando usar:** sempre. O import dinâmico é a convenção recomendada, e melhora o tempo de boot.

```ts
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject() // sem o decorator, o container não sabe montar o construtor
export default class TeamCreateController {
  constructor(private readonly useCase: TeamCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(TeamCreateValidator)
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
```

#### guides/basics/http-context
[doc](https://docs.adonisjs.com/guides/basics/http-context)
**O que é:** o `HttpContext`, o objeto que carrega `request`, `response`, `params`, `auth`,
`session`, `logger` e o container por requisição.
**Para que serve:** é o que todo handler recebe. Entender o que tem dentro dele é entender metade do
framework.
**Quando usar:** **leia cedo e por inteiro**. `ctx.auth.user` é a fonte de verdade do usuário
autenticado, e a alternativa (aceitar o id do usuário vindo do cliente) é uma falha de segurança
clássica.

```ts
async handle({ auth, params, request, response, logger }: HttpContext) {
  // CERTO: quem está chamando vem da sessão, sempre
  const usuario = auth.getUserOrFail()

  // ERRADO: aceitar o dono vindo do cliente permite ler dado de outra user
  // const teamId = request.input('team_id')

  logger.info({ userId: usuario.id, id: params.id }, 'consulta de post')
  return response.ok({ id: params.id })
}
```

#### guides/basics/middleware
[doc](https://docs.adonisjs.com/guides/basics/middleware)
**O que é:** os três tipos de middleware (servidor, roteador e nomeado), o registro em `start/
kernel.ts`, e como escrever um.
**Para que serve:** lógica transversal como autenticação, log e CORS, sem repetição.
**Quando usar:** ao adicionar qualquer regra que valha para várias rotas. Middleware nomeado
aplicado no grupo é a forma mais limpa de exigir papel ou permissão.

```ts
// app/middleware/role_middleware.ts
export default class RoleMiddleware {
  async handle(context: HttpContext, next: NextFn, roles: UserRole[]) {
    const user = context.auth.user
    if (!user || !roles.includes(user.role)) {
      throw HTTPException.Forbidden('Acesso negado', 'ACCESS_DENIED')
    }
    return next() // esquecer o `return next()` engasga a requisição em silêncio
  }
}
// start/kernel.ts: export const middleware = router.named({ role: () => import(...) })
```

#### guides/basics/request
[doc](https://docs.adonisjs.com/guides/basics/request)
**O que é:** a API de leitura da requisição: `input`, `only`, `except`, `all`, cabeçalhos, cookies,
IP, e a detecção de conteúdo.
**Para que serve:** ler o que o cliente mandou.
**Quando usar:** o tempo todo. Prefira validar com VineJS a ler campo por campo com `input`, porque
o validator já devolve o objeto tipado.

```ts
// `input` devolve `any`: sem validação, o resto do código carrega a dúvida
const page = request.input('page', 1) // any, pode ser 'abc'

// com validateUsing, o payload chega tipado e conferido
const { page } = await request.validateUsing(PaginateValidator) // number

const ip = request.ip() // atrás de proxy, exige TRUST_PROXY configurado
```

#### guides/basics/response
[doc](https://docs.adonisjs.com/guides/basics/response)
**O que é:** a API de resposta: status, cabeçalhos, cookies, JSON, download, redirect e os
atalhos por status.
**Para que serve:** devolver o que o cliente espera, com o status correto.
**Quando usar:** o tempo todo. Os atalhos (`response.created()`, `response.noContent()`) deixam a
intenção explícita e evitam número mágico espalhado.

```ts
return response.created(registro) // 201, e a intenção fica escrita
return response.noContent() // 204, sem corpo
return response.notFound({ message: 'Não encontrado' }) // 404

// `response.ok(x)` e `response.status(200).send(x)` fazem o mesmo; o primeiro
// diz o que significa, o segundo espalha número mágico pelo código
```

#### guides/basics/body-parser
[doc](https://docs.adonisjs.com/guides/basics/body-parser)
**O que é:** a configuração de análise do corpo da requisição: JSON, formulário, multipart, e os
limites de tamanho.
**Para que serve:** aceitar upload maior, ou restringir o tamanho aceito.
**Quando usar:** ao configurar upload de arquivo. **O limite do body-parser é global e vem antes da
validação**, então arquivo grande é recusado aqui, e a mensagem de erro não é óbvia.

```ts
// config/bodyparser.ts
export default defineConfig({
  multipart: {
    // este limite corta ANTES do validator. Se o schema aceita 10mb e aqui
    // está 2mb, o usuário recebe um erro genérico e o schema nunca roda.
    limit: '20mb',
    autoProcess: true,
  },
})
```

#### guides/basics/validation
[doc](https://docs.adonisjs.com/guides/basics/validation)
**O que é:** a integração com VineJS: schemas, `request.validateUsing`, mensagens customizadas e
tratamento dos erros de validação.
**Para que serve:** garantir formato antes de qualquer lógica, e ganhar o tipo do payload de graça.
**Quando usar:** **em toda rota que recebe dados**. Valide na entrada e o resto do código passa a
poder confiar nos dados, o que elimina uma classe inteira de verificação defensiva.

```ts
import vine from '@vinejs/vine'

export const TeamCreateValidator = vine.compile(
  vine.object({
    document: vine.string().trim().fixedLength(14),
    displayName: vine.string().trim().minLength(3),
  })
)
export type TeamCreatePayload = Infer<typeof TeamCreateValidator>

// no controller: o retorno JÁ é o tipo do schema, sem type paralela
const payload = await context.request.validateUsing(TeamCreateValidator)
```

#### guides/basics/file-uploads
[doc](https://docs.adonisjs.com/guides/basics/file-uploads)
**O que é:** upload multipart, o objeto `MultipartFile`, validação de tamanho e extensão, e o
`moveToDisk`.
**Para que serve:** receber arquivo com validação antes de gravar.
**Quando usar:** em qualquer upload. **Valide extensão e tamanho no schema**, para o arquivo
inválido ser recusado antes de tocar o disco.

```ts
const UploadValidator = vine.compile(
  vine.object({
    // a validação acontece antes de qualquer gravação: arquivo inválido nunca
    // chega ao disco nem ao bucket
    arquivo: vine.file({ size: '5mb', extnames: ['jpg', 'png', 'pdf'] }),
  })
)

const { arquivo } = await request.validateUsing(UploadValidator)
const chave = await arquivo.moveToDisk('anexos') // usa o disco do ambiente
```

#### guides/basics/session
[doc](https://docs.adonisjs.com/guides/basics/session)
**O que é:** sessão com os drivers de cookie, arquivo e Redis, mensagens flash e a configuração.
**Para que serve:** manter estado entre requisições em app renderizado no servidor.
**Quando usar:** em app com formulários renderizados no servidor. Em API com token, sessão
geralmente não é necessária.

```ts
// driver cookie: o estado viaja assinado no próprio cookie, sem armazenamento
// no servidor. Simples, mas limitado a ~4kb e visível (assinado, não cifrado).
session.put('ultimoFiltro', { status: 'ATIVO' })
const filtro = session.get('ultimoFiltro')

// com várias instâncias e driver `file`, cada máquina tem a própria pasta:
// a sessão "some" conforme o balanceador troca de instância. Aí é Redis.
```

#### guides/basics/url-builder
[doc](https://docs.adonisjs.com/guides/basics/url-builder)
**O que é:** gerar URLs a partir de rotas nomeadas, com parâmetros e query string, incluindo URLs
assinadas.
**Para que serve:** não escrever URL na mão em e-mail e redirecionamento, e não quebrar tudo quando
uma rota mudar de caminho.
**Quando usar:** ao montar links em e-mail. **URL assinada** é a forma certa de fazer link de
confirmação de e-mail ou redefinição de senha sem inventar criptografia.

```ts
import router from '@adonisjs/core/services/router'

// assinada: a própria URL carrega a prova de que o servidor a emitiu, e expira
// sozinha. Não precisa de tabela de tokens para confirmação de e-mail.
const link = router
  .builder()
  .params({ id: usuario.id })
  .makeSigned('verificarEmail', { expiresIn: '24 hours' })
```

#### guides/basics/exception-handling
[doc](https://docs.adonisjs.com/guides/basics/exception-handling)
**O que é:** o handler global de exceções, exceções customizadas com status e código, e o
`handle`/`report`.
**Para que serve:** respostas de erro consistentes em toda a API, em vez de `try/catch` repetido.
**Quando usar:** **cedo no projeto**. Defina o formato de erro uma vez, no handler global, e o
frontend passa a poder tratar erro de um jeito só.

```ts
import { Exception } from '@adonisjs/core/exceptions'

export default class HTTPException extends Exception {
  static Conflict(message: string, code: string, fields?: Record<string, string>) {
    return new HTTPException(message, { status: 409, code })
  }
}

// o formato do corpo de erro é decidido UMA vez, no handler global. Cada
// controller só lança; ninguém monta resposta de erro na mão.
```

#### guides/basics/debugging
[doc](https://docs.adonisjs.com/guides/basics/debugging)
**O que é:** as flags de debug, o inspetor do Node e o log de requisições.
**Para que serve:** investigar sem espalhar `console.log`.
**Quando usar:** ao caçar um comportamento estranho. Conectar o depurador do editor ao processo
economiza muito tempo.

```bash
# ponto de parada de verdade, com o app inteiro carregado
node ace serve --watch --inspect

# ver o SQL que o Lucid está gerando (mais útil que qualquer console.log)
DEBUG=knex:query node ace serve --watch
```

#### guides/basics/static-file-server
[doc](https://docs.adonisjs.com/guides/basics/static-file-server)
**O que é:** servir arquivos estáticos da pasta pública, com cabeçalhos de cache.
**Para que serve:** entregar imagens e assets sem servidor web na frente.
**Quando usar:** em desenvolvimento, e em produção pequena. Com CDN ou nginx na frente, ele deixa de
ser necessário.

```ts
// config/static.ts
export default defineConfig({
  enabled: true,
  // o servidor estático do Node é conveniente, não rápido: com CDN ou nginx
  // na frente, desligar tira trabalho do processo que atende a API
  headers: () => ({ 'Cache-Control': 'public, max-age=31536000' }),
})
```

## Frontend

#### guides/frontend/edgejs
[doc](https://docs.adonisjs.com/guides/frontend/edgejs)
**O que é:** o motor de templates do AdonisJS, com layouts, componentes, slots e escape automático.
**Para que serve:** renderizar HTML no servidor.
**Quando usar:** só em app renderizado no servidor. Em API pura, ignore.

```ts
// mesmo em API o Edge aparece num lugar: o corpo dos e-mails.
// {{ valor }} escapa HTML por padrão; {{{ valor }}} não escapa, e é onde
// nasce XSS quando o conteúdo vem do usuário.
return view.render('emails/verificacao', { nome: usuario.name })
```

#### guides/frontend/inertia
[doc](https://docs.adonisjs.com/guides/frontend/inertia)
**O que é:** a integração com Inertia.js, que liga controllers do AdonisJS a componentes React ou
Vue sem construir uma API.
**Para que serve:** ter SPA no frontend mantendo roteamento e autorização no servidor.
**Quando usar:** ao querer o melhor dos dois mundos sem manter uma API separada. Não se aplica se o
frontend já é um projeto independente.

```ts
// o controller devolve um componente e as props dele, em vez de JSON
return inertia.render('users/lista', { users: await Team.all() })

// Não serve a esta stack: o frontend é um projeto TanStack Start separado,
// com o próprio roteamento.
```

#### guides/frontend/transformers
[doc](https://docs.adonisjs.com/guides/frontend/transformers)
**O que é:** camada de transformação de dados entre os models e a resposta enviada ao cliente.
**Para que serve:** desacoplar o formato da resposta da estrutura do banco.
**Quando usar:** quando a serialização do model não bastar, ou quando a mesma entidade precisar de
formatos diferentes por endpoint.

```ts
// serialização do model resolve o caso simples:
// @column({ serializeAs: null }) declare password: string

// transformer entra quando a MESMA entidade precisa de formatos diferentes:
// a listagem devolve id e nome, o detalhe devolve tudo com relacionamentos
export const paraListagem = (c: Team) => ({ id: c.id, name: c.name })
```

#### guides/frontend/api-client
[doc](https://docs.adonisjs.com/guides/frontend/api-client)
**O que é:** a geração de um cliente tipado para consumir a API do backend a partir do frontend.
**Para que serve:** tipos compartilhados entre backend e frontend sem manter definições duplicadas.
**Quando usar:** em monorepo com frontend separado. Elimina a divergência silenciosa entre o que a
API devolve e o que o frontend espera.

```ts
// backend: o Tuyau gera o contrato a partir das rotas e validators reais
// node ace tuyau:generate

// frontend: a chamada é tipada, e renomear uma rota no backend vira erro de
// compilação no frontend, em vez de 404 em produção
const { data } = await tuyau.administrator.teams.$get({ query: { page: 1 } })
```

#### guides/frontend/tanstack-query
[doc](https://docs.adonisjs.com/guides/frontend/tanstack-query)
**O que é:** a integração recomendada entre o cliente tipado do AdonisJS e o TanStack Query.
**Para que serve:** consumir a API com cache e tipos de ponta a ponta.
**Quando usar:** em projeto com AdonisJS no backend e TanStack Query no frontend. É exatamente a
ponte entre as duas metades da stack.

```ts
// a chave do cache e a chamada tipada, juntas: é a costura das duas metades
// da stack
export const usersQuery = (page: number) =>
  queryOptions({
    queryKey: ['users', { page }],
    queryFn: () => tuyau.administrator.teams.$get({ query: { page } }),
  })
```

#### guides/frontend/vite
[doc](https://docs.adonisjs.com/guides/frontend/vite)
**O que é:** a integração com Vite para os assets do lado servidor, com HMR e build de produção.
**Para que serve:** empacotar CSS e JS de app renderizado no servidor.
**Quando usar:** com Edge ou Inertia. Com frontend em projeto separado, ele tem o Vite dele.

```bash
# só no kit web. Em projeto de API, instalar isto adiciona build sem uso.
node ace add @adonisjs/vite
```

## Banco de dados

#### guides/database/lucid
[doc](https://docs.adonisjs.com/guides/database/lucid)
**O que é:** a página de entrada do Lucid dentro da doc do framework, com instalação e configuração.
**Para que serve:** o ponto de partida para banco relacional.
**Quando usar:** na configuração inicial. Depois disso, a doc própria do Lucid é a referência de
verdade, muito mais completa.

```bash
node ace add @adonisjs/lucid --db=postgres
# gera config/database.ts, registra o provider e adiciona os comandos de migration
node ace migration:run
```

#### guides/database/redis
[doc](https://docs.adonisjs.com/guides/database/redis)
**O que é:** o pacote de Redis, com conexões, pub/sub e integração com sessão, cache e filas.
**Para que serve:** cache, sessão distribuída, fila e mensageria.
**Quando usar:** ao escalar para mais de uma instância da aplicação, quando estado em memória local
deixa de servir.

```ts
import redis from '@adonisjs/redis/services/main'

// o gatilho para instalar não é performance, é a SEGUNDA instância: sessão,
// cache e trava em memória local param de funcionar quando há duas máquinas
await redis.set('users:total', '42', 'EX', 60)
```

## Autenticação

#### guides/auth/introduction
[doc](https://docs.adonisjs.com/guides/auth/introduction)
**O que é:** o panorama do pacote de autenticação, com o conceito de *guards* e de *providers* de
usuário.
**Para que serve:** entender a arquitetura antes de escolher a estratégia.
**Quando usar:** **antes de implementar login**. A escolha do guard condiciona todo o resto.

```ts
// config/auth.ts: guard = COMO se autentica, provider = ONDE mora o usuário
export default defineConfig({
  default: 'web',
  guards: {
    web: sessionGuard({ useRememberMeTokens: false, provider: sessionUserProvider({
      model: () => import('#models/user'),
    })}),
  },
})
// Trocar de guard depois mexe em login, middleware e testes de uma vez só.
```

#### guides/auth/verifying-user-credentials
[doc](https://docs.adonisjs.com/guides/auth/verifying-user-credentials)
**O que é:** o mixin `withAuthFinder`, a verificação de senha e a proteção contra ataque de tempo.
**Para que serve:** validar e-mail e senha do jeito certo, sem escrever comparação de hash na mão.
**Quando usar:** ao implementar o login. **Use o helper, não compare hash manualmente**: ele já trata
o vazamento por tempo de resposta que revela se o e-mail existe.

```ts
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

// verifyCredentials gasta o mesmo tempo com e-mail inexistente e senha errada.
// Buscar o usuário e só então comparar o hash entrega, pelo tempo de resposta,
// quais e-mails existem no sistema.
const user = await User.verifyCredentials(email, password)
```

#### guides/auth/session-guard
[doc](https://docs.adonisjs.com/guides/auth/session-guard)
**O que é:** autenticação por sessão em cookie, com "lembrar-me" e logout.
**Para que serve:** o modelo clássico para app renderizado no servidor no mesmo domínio.
**Quando usar:** em app web tradicional. Para API consumida por outro domínio, veja o guard de
tokens.

```ts
await auth.use('web').login(user)
await auth.use('web').logout()

// Com frontend em outro domínio, o cookie exige CORS com credentials, origem
// explícita (nada de curinga) e SameSite=None com Secure. Nenhum desses
// detalhes avisa quando está errado: só "não autentica no navegador".
```

#### guides/auth/access-tokens-guard
[doc](https://docs.adonisjs.com/guides/auth/access-tokens-guard)
**O que é:** tokens opacos guardados no banco, com criação, verificação, expiração, habilidades e
revogação.
**Para que serve:** autenticar API, com a vantagem de dar para revogar um token específico a
qualquer momento, coisa que JWT não permite sem infraestrutura extra.
**Quando usar:** em API consumida por SPA ou app mobile. **A revogação é a razão principal para
preferir isto a JWT** quando você precisa derrubar sessões (troca de senha, remoção de usuário).

```ts
const token = await User.accessTokens.create(user, ['*'], { expiresIn: '30 days' })

// a revogação é o ponto: trocar senha, remover usuário ou inativar user
// derruba as sessões de verdade, na hora
const tokens = await User.accessTokens.all(user)
for (const t of tokens) await User.accessTokens.delete(user, t.identifier)
```

#### guides/auth/basic-auth-guard
[doc](https://docs.adonisjs.com/guides/auth/basic-auth-guard)
**O que é:** autenticação HTTP básica, com usuário e senha no cabeçalho.
**Para que serve:** proteger algo interno rapidamente, como um painel de métricas.
**Quando usar:** casos internos e temporários. Nunca como autenticação de usuário final.

```ts
// as credenciais viajam em base64 a CADA requisição: sem HTTPS é texto puro,
// e não existe logout de verdade (o navegador continua reenviando)
router.get('/metricas', handler).use(middleware.auth({ guards: ['basicAuth'] }))
```

#### guides/auth/custom-auth-guard
[doc](https://docs.adonisjs.com/guides/auth/custom-auth-guard)
**O que é:** o contrato para escrever um guard próprio.
**Para que serve:** integrar com um sistema de autenticação existente, como um SSO corporativo.
**Quando usar:** raro. Verifique antes se um guard existente com um provider customizado já resolve.

```ts
// Antes de escrever um guard, tente o caminho barato: guard existente + provider
// próprio. O provider decide de ONDE vem o usuário; o guard, COMO ele prova
// quem é. Trocar só a origem quase nunca exige guard novo.
export class MeuGuard implements GuardContract<User> {
  async authenticate(): Promise<User> {
    throw new Error('implementar')
  }
}
```

#### guides/auth/social-authentication
[doc](https://docs.adonisjs.com/guides/auth/social-authentication)
**O que é:** o pacote Ally, com os drivers de Google, GitHub, Facebook e outros, e o fluxo OAuth.
**Para que serve:** "entrar com Google" sem implementar OAuth na mão.
**Quando usar:** ao adicionar login social. Planeje desde o começo o que fazer quando o e-mail social
já existe como conta local, porque é a decisão que costuma ficar para depois e dói.

```ts
const google = ally.use('google')
const usuarioGoogle = await google.user()

// A decisão que precisa existir ANTES do primeiro login social:
// e-mail já cadastrado com senha local -> vincular? recusar? pedir a senha?
// Deixar para depois significa decidir com contas duplicadas já criadas.
const existente = await User.findBy('email', usuarioGoogle.email)
```

#### guides/auth/authorization
[doc](https://docs.adonisjs.com/guides/auth/authorization)
**O que é:** o Bouncer, com habilidades (`abilities`), políticas por recurso e a verificação nos
controllers.
**Para que serve:** separar **quem é** o usuário (autenticação) de **o que ele pode fazer**
(autorização).
**Quando usar:** assim que existir mais de um papel. **Políticas por recurso** são o caminho para
regras como "só o dono do registro edita", centralizadas num lugar em vez de espalhadas em `if`.

```ts
export default class PostPolicy extends BasePolicy {
  edit(user: User, post: Post) {
    // a regra "só o dono edita" mora AQUI, uma vez, e não em cada controller
    return user.role === 'owner' || post.teamId === user.teamId
  }
}

if (await bouncer.with(PostPolicy).denies('edit', post)) {
  throw HTTPException.Forbidden('Acesso negado', 'ACCESS_DENIED')
}
```

## Segurança

#### guides/security/hashing
[doc](https://docs.adonisjs.com/guides/security/hashing)
**O que é:** os drivers de hash (scrypt, bcrypt, argon2), o rehash automático e a verificação.
**Para que serve:** guardar senha do jeito certo.
**Quando usar:** ao configurar o projeto. O hash acontece no model, via hook, então a senha nunca
deve ser hasheada manualmente no controller.

```ts
// no model, uma vez: o hook cobre TODO caminho de escrita
@beforeSave()
static async hashPassword(user: User) {
  // `$dirty` evita re-hashear um hash em cada update de outro campo
  if (user.$dirty.password) user.password = await hash.make(user.password)
}
// no controller, nada: `user.password = 'segredo'` já entra hasheado
```

#### guides/security/encryption
[doc](https://docs.adonisjs.com/guides/security/encryption)
**O que é:** criptografia simétrica e assinatura de valores usando a chave da aplicação.
**Para que serve:** guardar dado sensível reversível, e assinar valores para detectar adulteração.
**Quando usar:** para dado que precisa ser lido de volta. **Senha não entra aqui**, senha é hash, que
é via de mão única.

```ts
import encryption from '@adonisjs/core/services/encryption'

// reversível: token de API de terceiro, que você precisa LER de volta
const cifrado = encryption.encrypt(tokenDoParceiro)
const original = encryption.decrypt<string>(cifrado)

// Senha nunca: hash é via de mão única DE PROPÓSITO. Se dá para descriptografar,
// um vazamento do banco mais a APP_KEY entrega todas as senhas.
```

#### guides/security/cors
[doc](https://docs.adonisjs.com/guides/security/cors)
**O que é:** a configuração de CORS: origens permitidas, métodos, cabeçalhos e credenciais.
**Para que serve:** permitir que o frontend em outro domínio chame a API.
**Quando usar:** assim que o frontend estiver em domínio ou porta diferente. Com cookie, `credentials`
precisa estar ligado **e** a origem não pode ser curinga, e essa combinação é a causa mais comum de
"funciona no Insomnia mas não no navegador".

```ts
// config/cors.ts
export default defineConfig({
  enabled: true,
  // com credentials: true, `origin: '*'` é RECUSADO pelo navegador. A origem
  // precisa ser explícita, e é essa combinação que quebra só no navegador.
  origin: [env.get('FRONTEND_URL')],
  credentials: true,
})
```

#### guides/security/securing-ssr-applications
[doc](https://docs.adonisjs.com/guides/security/securing-ssr-applications)
**O que é:** o pacote Shield, com CSRF, CSP, e cabeçalhos de segurança.
**Para que serve:** proteger app com formulários renderizados no servidor.
**Quando usar:** em app renderizado no servidor. Em API pura com token, CSRF não se aplica da mesma
forma, e a página explica a distinção.

```ts
// config/shield.ts
export default defineConfig({
  // CSRF protege o que o NAVEGADOR envia sozinho (cookie). Com token em
  // cabeçalho, o ataque não se sustenta, e ligar isto quebra a API sem ganho.
  csrf: { enabled: false },
  // o resto do Shield (CSP, noSniff, frameGuard) vale para qualquer app
  csp: { enabled: true },
})
```

#### guides/security/rate-limiting
[doc](https://docs.adonisjs.com/guides/security/rate-limiting)
**O que é:** limite de requisições por chave, com os armazenamentos de memória, Redis e banco.
**Para que serve:** conter força bruta e abuso.
**Quando usar:** **no endpoint de login, sempre**. É a proteção de melhor custo-benefício contra
tentativa de adivinhar senha.

```ts
const throttleLogin = limiter.define('login', () =>
  // por IP E por e-mail: só por IP, um atacante com muitos IPs passa; só por
  // e-mail, dá para trancar a conta de alguém de propósito
  limiter.allowRequests(5).every('1 minute').blockFor('10 mins')
)

router.post('sign-in', [controllers.authentication.SignIn]).use(throttleLogin)
```

## Conceitos

#### guides/concepts/application-lifecycle
[doc](https://docs.adonisjs.com/guides/concepts/application-lifecycle)
**O que é:** as fases de boot da aplicação e os ganchos disponíveis em cada uma.
**Para que serve:** saber em que momento cada coisa está pronta.
**Quando usar:** ao precisar rodar código no start, e ao investigar erro de "serviço usado antes de
estar pronto".

```ts
// as fases, na ordem, e o que já existe em cada uma:
// register -> bindings no container (NENHUM serviço pode ser usado ainda)
// boot     -> serviços disponíveis, nada de rede
// start    -> app pronto, é aqui que vai warm-up e conexão externa
// shutdown -> fechar pool, drenar fila

export default class AppProvider {
  async start() {
    // usar o banco no `register` estoura: o provider do Lucid ainda não bootou
  }
}
```

#### guides/concepts/dependency-injection
[doc](https://docs.adonisjs.com/guides/concepts/dependency-injection)
**O que é:** o container de IoC, o decorator `@inject`, a resolução por tipo e o container por
requisição.
**Para que serve:** classes que declaram do que precisam no construtor e recebem pronto, o que
também torna o teste trivial de escrever com substitutos.
**Quando usar:** **conceito central do framework**. Leia antes de criar a primeira camada de
serviço, senão o instinto é dar `new` na mão e perder a testabilidade.

```ts
@inject()
export default class TeamCreateUseCase {
  // o container resolve pelo TIPO do parâmetro: nada de string mágica, e
  // trocar por um substituto no teste é uma linha de container.swap()
  constructor(private readonly mailer: MailService) {}
}

@inject()
export default class TeamCreateController {
  constructor(private readonly useCase: TeamCreateUseCase) {}
}
```

#### guides/concepts/service-providers
[doc](https://docs.adonisjs.com/guides/concepts/service-providers)
**O que é:** os providers e seus métodos de ciclo de vida (`register`, `boot`, `start`, `shutdown`).
**Para que serve:** registrar serviços no container e inicializar recursos externos no boot.
**Quando usar:** ao integrar biblioteca de terceiro que precisa de configuração única, ou ao criar
um serviço próprio compartilhado.

```ts
export default class StorageProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    // singleton: uma instância para o processo inteiro, criada sob demanda
    this.app.container.singleton('storage', () => new StorageService())
  }

  async shutdown() {
    // sem isto, reiniciar em desenvolvimento vaza conexão a cada hot reload
  }
}
```

#### guides/concepts/container-services
[doc](https://docs.adonisjs.com/guides/concepts/container-services)
**O que é:** os serviços expostos como módulos importáveis (`import db from '@adonisjs/lucid/
services/db'`) e a relação deles com o container.
**Para que serve:** entender por que dá para importar `db` direto e ainda assim substituí-lo em
teste.
**Quando usar:** ao decidir entre importar o serviço ou injetar a dependência. A página explica o
custo de cada escolha para os testes.

```ts
// import direto: conciso, e o serviço ainda é resolvido pelo container
import db from '@adonisjs/lucid/services/db'

// injeção: mais verboso, e explicita a dependência na assinatura da classe
@inject()
class Relatorio {
  constructor(private db: Database) {}
}
// A escolha é sobre TESTE: o injetado se troca por parâmetro, o importado
// exige mexer no container.
```

#### guides/concepts/barrel-files
[doc](https://docs.adonisjs.com/guides/concepts/barrel-files)
**O que é:** por que o framework desencoraja arquivos `index.ts` que reexportam tudo.
**Para que serve:** evitar import circular e boot lento.
**Quando usar:** leia antes de criar um `index.ts` "para organizar". A recomendação é explícita e
tem motivo técnico.

```ts
// ERRADO: importar UM model carrega TODOS, e basta um par de referências
// cruzadas para virar import circular difícil de rastrear
// import { User } from '#models/index'

// CERTO: caminho direto, um módulo por arquivo
import User from '#models/user'
```

#### guides/concepts/assembler-hooks
[doc](https://docs.adonisjs.com/guides/concepts/assembler-hooks)
**O que é:** ganchos no processo de build e de desenvolvimento, para rodar tarefas próprias.
**Para que serve:** encaixar geração de código ou verificação no ciclo de build.
**Quando usar:** ao automatizar geração de tipos ou de cliente de API no build.

```ts
// adonisrc.ts
export default defineConfig({
  hooks: {
    // gerar o cliente tipado no build evita o clássico "esqueci de rodar o
    // generate" e o frontend compilando contra um contrato velho
    onBuildStarting: [() => import('@tuyau/core/build_hook')],
  },
})
```

#### guides/concepts/scaffolding
[doc](https://docs.adonisjs.com/guides/concepts/scaffolding)
**O que é:** o sistema de stubs, os templates que os comandos `make:` usam, e como sobrescrevê-los.
**Para que serve:** que os arquivos gerados já saiam no padrão do seu time.
**Quando usar:** quando você se pegar editando as mesmas linhas em todo arquivo gerado. Publicar os
stubs e ajustá-los resolve de vez.

```bash
# traz os templates para stubs/ do projeto, onde dá para editá-los
node ace eject make/controller

# a partir daí, todo make:controller já nasce com o padrão do time
node ace make:controller teams
```

#### guides/concepts/extending-adonisjs
[doc](https://docs.adonisjs.com/guides/concepts/extending-adonisjs)
**O que é:** os pontos de extensão do framework: macros, getters e a criação de pacotes.
**Para que serve:** adicionar métodos a classes do framework, como um helper em `Response`.
**Quando usar:** ao criar utilitário compartilhado entre projetos, ou ao escrever um pacote.

```ts
import { Response } from '@adonisjs/core/http'

Response.macro('paginado', function (this: Response, dados: unknown, meta: unknown) {
  return this.ok({ data: dados, meta })
})

// o macro só existe em runtime: sem o `declare module`, o TypeScript não
// conhece `response.paginado` e o autocomplete não ajuda ninguém
declare module '@adonisjs/core/http' {
  interface Response {
    paginado(dados: unknown, meta: unknown): void
  }
}
```

## Recursos adicionais

#### guides/digging-deeper/cache
[doc](https://docs.adonisjs.com/guides/digging-deeper/cache)
**O que é:** o pacote de cache, com múltiplas camadas (memória e Redis), tags e o padrão
`getOrSet`.
**Para que serve:** guardar resultado caro sem escrever a lógica de expiração na mão.
**Quando usar:** ao identificar consulta pesada e repetida. `getOrSet` resolve o caso comum numa
linha.

```ts
import cache from '@adonisjs/cache/services/main'

// getOrSet: busca, e só calcula se não houver. Sem if de cache espalhado.
const categorias = await cache.getOrSet({
  key: 'categorias:ativas',
  factory: () => Category.query().whereNull('deleted_at'),
  ttl: '10m',
})
// invalide na ESCRITA (cache.delete), senão o catálogo editado demora o TTL
// inteiro para aparecer
```

#### guides/digging-deeper/drive
[doc](https://docs.adonisjs.com/guides/digging-deeper/drive)
**O que é:** a integração do FlyDrive com o framework, com discos configurados por ambiente e o
`moveToDisk` no upload.
**Para que serve:** upload que vai para disco local em desenvolvimento e para bucket em produção,
com o mesmo código.
**Quando usar:** em qualquer feature de arquivo. Leia junto com a doc do FlyDrive, que cobre a API
em profundidade.

```ts
// config/drive.ts: o destino muda por ambiente, o código não
export default defineConfig({
  default: env.get('DRIVE_DISK'), // 'fs' em dev, 's3' em produção
  services: { fs: services.fs({ location: app.makePath('storage') }), s3: services.s3({ ... }) },
})

// no upload, uma linha só, igual nos dois ambientes:
const chave = await arquivo.moveToDisk('posts')
```

#### guides/digging-deeper/emitter
[doc](https://docs.adonisjs.com/guides/digging-deeper/emitter)
**O que é:** o emissor de eventos tipado, com listeners em classe e eventos falsos para teste.
**Para que serve:** desacoplar efeitos colaterais do fluxo principal, como enviar e-mail depois do
cadastro.
**Quando usar:** quando um caso de uso começa a acumular responsabilidades que não são dele.
Cuidado: evento demais deixa o fluxo difícil de seguir.

```ts
import emitter from '@adonisjs/core/services/emitter'

emitter.emit('team:created', { id: user.id })

// no teste, sem disparar nada de verdade:
const events = emitter.fake()
events.assertEmitted('team:created')
// O limite: com muitos eventos, ninguém consegue responder "o que acontece
// quando um user é criado?" sem caçar listeners pelo projeto inteiro.
```

#### guides/digging-deeper/health-checks
[doc](https://docs.adonisjs.com/guides/digging-deeper/health-checks)
**O que é:** os checadores de saúde prontos (banco, Redis, memória, disco) e o endpoint que os
expõe.
**Para que serve:** o orquestrador saber se a instância está viva e pronta.
**Quando usar:** antes de publicar em Kubernetes, ECS ou qualquer plataforma com verificação de
saúde.

```ts
export const healthChecks = new HealthChecks().register([
  new DbCheck(db.connection()),
  new MemoryHeapCheck(),
])

// PROTEJA a rota: a resposta detalha infraestrutura interna, e não é
// informação para o mundo
router.get('/health', handler).use(middleware.auth())
```

#### guides/digging-deeper/i18n
[doc](https://docs.adonisjs.com/guides/digging-deeper/i18n)
**O que é:** internacionalização, com arquivos de tradução, pluralização, formatação e detecção de
idioma.
**Para que serve:** mensagens em vários idiomas, incluindo as de erro de validação.
**Quando usar:** em app multi-idioma. Mesmo em app de um idioma só, dá para usar o arquivo de
traduções para centralizar as mensagens de validação em português.

```ts
// resources/lang/pt/validator.json centraliza as mensagens de erro num lugar
// só, mesmo num app de um idioma. Sem isso, elas ficam espalhadas por dezenas
// de schemas.
// { "shared": { "minLength": "O campo {{ field }} é curto demais" } }

const mensagem = i18n.t('validator.shared.minLength', { field: 'nome' })
```

#### guides/digging-deeper/locks
[doc](https://docs.adonisjs.com/guides/digging-deeper/locks)
**O que é:** travas atômicas distribuídas, com Redis ou banco.
**Para que serve:** garantir que só um processo execute algo por vez, com várias instâncias rodando.
**Quando usar:** em tarefa agendada que roda em mais de uma instância, e em operação que não pode
ser concorrente, como gerar um número sequencial.

```ts
import locks from '@adonisjs/lock/services/main'

// SEMPRE com expiração: sem ela, um processo que morre segurando a trava
// bloqueia a operação para sempre
await locks.createLock('gerar-relatorio', '30s').run(async () => {
  await gerarRelatorio()
})
```

#### guides/digging-deeper/logger
[doc](https://docs.adonisjs.com/guides/digging-deeper/logger)
**O que é:** o logger baseado em Pino, com níveis, log estruturado, redação de campos sensíveis e
logger por requisição.
**Para que serve:** log em JSON que ferramenta de observabilidade consegue indexar.
**Quando usar:** em vez de `console.log`, sempre. **Configure a redação** para senha e token nunca
aparecerem no log, que é um vazamento comum e fácil de evitar.

```ts
// config/logger.ts
export default defineConfig({
  loggers: {
    app: {
      // sem redact, um `logger.info({ payload })` num sign-up grava a senha do
      // usuário em texto puro no arquivo de log
      redact: { paths: ['password', 'token', '*.password', 'headers.authorization'] },
    },
  },
})
// use ctx.logger: ele já carrega o id da requisição em toda linha
```

#### guides/digging-deeper/mail
[doc](https://docs.adonisjs.com/guides/digging-deeper/mail)
**O que é:** o pacote de e-mail, com os drivers (SMTP, SES, Mailgun, Resend), templates em Edge,
envio em fila e o modo falso para teste.
**Para que serve:** enviar e-mail transacional sem acoplar ao provedor.
**Quando usar:** em confirmação de cadastro, redefinição de senha e notificações. **Envie em fila**,
para o tempo de resposta da API não depender do servidor de e-mail.

```ts
import mail from '@adonisjs/mail/services/main'

// sendLater enfileira: a resposta da API não fica presa ao SMTP, que é lento e
// falha em horário ruim
await mail.sendLater((message) => {
  message.to(user.email).subject('User aprovada').htmlView('emails/aprovada', { user })
})
```

#### guides/digging-deeper/queues
[doc](https://docs.adonisjs.com/guides/digging-deeper/queues)
**O que é:** filas de trabalho, com jobs, workers, tentativas e agendamento.
**Para que serve:** tirar trabalho lento do ciclo da requisição.
**Quando usar:** para e-mail, processamento de imagem, relatório e integração com terceiro. Regra
prática: se pode demorar mais de um segundo, vai para a fila.

```ts
// o job precisa ser IDEMPOTENTE: tentativas existem, e rodar duas vezes não
// pode cobrar duas vezes nem duplicar registro
export default class GerarMiniaturas extends Job {
  async handle(payload: { postId: string }) {
    await processar(payload.postId)
  }
}
// o worker roda em outro processo: `node ace queue:work`
```

#### guides/digging-deeper/server-sent-events
[doc](https://docs.adonisjs.com/guides/digging-deeper/server-sent-events)
**O que é:** SSE, um canal unidirecional do servidor para o cliente sobre HTTP.
**Para que serve:** notificação e atualização em tempo real sem o peso de WebSocket.
**Quando usar:** quando só o servidor precisa falar. Se o cliente também precisa enviar mensagens,
o caso é WebSocket.

```ts
// cada conexão SSE segura um socket aberto: com muitas instâncias e proxy no
// meio, confira o timeout do proxy antes de contar com a conexão longa
response.header('Content-Type', 'text/event-stream')
response.header('Cache-Control', 'no-cache')
response.response.write(`data: ${JSON.stringify({ status: 'processando' })}\n\n`)
```

#### guides/digging-deeper/opentelemetry
[doc](https://docs.adonisjs.com/guides/digging-deeper/opentelemetry)
**O que é:** a instrumentação com OpenTelemetry, para tracing distribuído e métricas.
**Para que serve:** ver onde o tempo é gasto dentro de uma requisição, atravessando serviços.
**Quando usar:** ao investigar lentidão em produção, e em arquitetura com mais de um serviço.

```ts
// o tracing responde a pergunta que o log não responde: DENTRO da requisição
// lenta, quanto foi banco, quanto foi API externa, quanto foi código
import { trace } from '@opentelemetry/api'

const span = trace.getTracer('api').startSpan('gerar-relatorio')
try {
  await gerarRelatorio()
} finally {
  span.end() // span sem end vaza e some do painel
}
```

## Ace (CLI)

#### guides/ace/introduction
[doc](https://docs.adonisjs.com/guides/ace/introduction)
**O que é:** a apresentação da CLI, como listar comandos e ver a ajuda de cada um.
**Para que serve:** descobrir o que já existe antes de escrever script próprio.
**Quando usar:** cedo. `node ace list` costuma revelar comandos que você não sabia que tinha.

```bash
node ace list                     # tudo, inclusive comandos vindos de pacotes
node ace list:routes              # o mapa real de URLs, com middleware por rota
node ace make:controller --help
```

#### guides/ace/creating-commands
[doc](https://docs.adonisjs.com/guides/ace/creating-commands)
**O que é:** criar comandos próprios, com o ciclo de vida e o acesso ao container da aplicação.
**Para que serve:** scripts de manutenção que rodam **dentro** da aplicação, com acesso a models e
serviços.
**Quando usar:** para migração de dados, importação e rotina administrativa. Melhor que script solto,
porque tem acesso a tudo que a aplicação tem.

```ts
export default class BackfillCnpj extends BaseCommand {
  static commandName = 'backfill:slug'
  // sem `startApp`, o comando roda SEM container: models e serviços não existem
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: Team } = await import('#models/team')
    this.logger.info(`${await Team.query().count('* as t')} users`)
  }
}
```

#### guides/ace/arguments
[doc](https://docs.adonisjs.com/guides/ace/arguments)
**O que é:** argumentos posicionais dos comandos, com obrigatoriedade e valor padrão.
**Para que serve:** receber entrada obrigatória no comando.
**Quando usar:** ao escrever comando próprio que age sobre algo específico.

```ts
export default class AprovarUser extends BaseCommand {
  // posicional e obrigatório: `node ace aprovar:user <id>`
  @args.string({ description: 'ID do user' })
  declare id: string

  @args.string({ required: false, default: 'manual' })
  declare origem: string
}
```

#### guides/ace/flags
[doc](https://docs.adonisjs.com/guides/ace/flags)
**O que é:** flags nomeadas, com tipos, aliases e valores padrão.
**Para que serve:** opções do comando, como `--dry-run` e `--force`.
**Quando usar:** ao escrever comando próprio. Uma flag `--dry-run` em comando destrutivo evita
acidente.

```ts
export default class LimparRemovidos extends BaseCommand {
  // padrão TRUE no dry-run: o comando destrutivo exige `--no-dry-run` para
  // agir. O acidente passa a ser não fazer nada.
  @flags.boolean({ default: true })
  declare dryRun: boolean
}
```

#### guides/ace/prompts
[doc](https://docs.adonisjs.com/guides/ace/prompts)
**O que é:** perguntas interativas: texto, senha, confirmação, escolha e múltipla escolha.
**Para que serve:** comandos que conversam com quem executa.
**Quando usar:** em comando destrutivo, pedindo confirmação, e em assistentes de configuração.

```ts
const confirma = await this.prompt.confirm('Apagar 1.240 registros?')
if (!confirma) return

// prompt TRAVA em CI, onde não há ninguém para responder. Comando que roda em
// pipeline precisa de uma flag `--force` que pule a pergunta.
```

#### guides/ace/terminal-ui
[doc](https://docs.adonisjs.com/guides/ace/terminal-ui)
**O que é:** os utilitários de saída: tabelas, barra de progresso, tarefas, cores e ícones.
**Para que serve:** saída de comando legível em vez de um monte de linhas soltas.
**Quando usar:** em comando de longa duração. A lista de tarefas dá um retorno visual muito melhor
que `console.log` em sequência.

```ts
const tabela = this.ui.table().head(['ID', 'User'])
for (const c of users) tabela.row([c.id, c.name])
tabela.render()

await this.ui.tasks()
  .add('migrar dados', async () => 'ok')
  .run()
```

#### guides/ace/repl
[doc](https://docs.adonisjs.com/guides/ace/repl)
**O que é:** o REPL com a aplicação carregada, incluindo os helpers de import de models e serviços.
**Para que serve:** consultar o banco, testar um método, inspecionar um serviço, tudo sem escrever
código.
**Quando usar:** **ferramenta subestimada**. `node ace repl` é o caminho mais rápido para responder
"o que tem nessa tabela mesmo?" sem abrir cliente de banco.

```bash
node ace repl
# > const User = await importDefault('#models/user')
# > await User.query().where('role', 'member').count('* as total')
# > .ls        lista os helpers disponíveis
```

## Testes

#### guides/testing/introduction
[doc](https://docs.adonisjs.com/guides/testing/introduction)
**O que é:** o Japa como runner, a organização em suítes, a configuração e os comandos de execução.
**Para que serve:** entender a estrutura de testes que o framework já monta.
**Quando usar:** antes do primeiro teste. As suítes já vêm separadas entre unidade e funcional, e
vale manter essa divisão.

```bash
node ace test                    # tudo
node ace test functional         # só a suíte funcional
node ace test --watch --files="teams"

# a suíte funcional sobe o servidor HTTP; a de unidade não. Misturar as duas
# na mesma pasta faz a de unidade herdar um custo que ela não precisa pagar.
```

#### guides/testing/api-tests
[doc](https://docs.adonisjs.com/guides/testing/api-tests)
**O que é:** testes de API com o cliente HTTP do Japa, com asserções de status e de corpo, e o
helper `loginAs` para autenticar.
**Para que serve:** testar o endpoint de ponta a ponta, do roteamento à resposta.
**Quando usar:** **é o tipo de teste com melhor retorno num backend**. `loginAs` elimina a
necessidade de simular autenticação na mão.

```ts
test('user não alcança o módulo do administrador', async ({ client }) => {
  const user = await UserFactory.apply('team').create()

  // caixa-preta: entra por HTTP, como o cliente real. Middleware, guard e
  // roteamento são exercitados de verdade.
  const response = await client.get('/administrator/teams').loginAs(user)

  response.assertStatus(403)
})
```

#### guides/testing/browser-tests
[doc](https://docs.adonisjs.com/guides/testing/browser-tests)
**O que é:** testes de navegador com Playwright integrado.
**Para que serve:** validar fluxo completo com JavaScript rodando.
**Quando usar:** em app renderizado no servidor, para os fluxos críticos. São lentos, use com
parcimônia.

```ts
test('login pelo navegador', async ({ visit }) => {
  const page = await visit('/login')
  await page.fill('input[name="email"]', 'a@b.com')
  await page.click('button[type="submit"]')
  // custa segundos, não milissegundos: reserve para os 3 ou 4 fluxos que, se
  // quebrarem, derrubam o post
})
```

#### guides/testing/console-tests
[doc](https://docs.adonisjs.com/guides/testing/console-tests)
**O que é:** testes de comandos ace, com captura da saída e simulação de prompts.
**Para que serve:** testar comando próprio sem executá-lo de verdade no terminal.
**Quando usar:** se você escreveu comando com lógica relevante, especialmente destrutiva.

```ts
const comando = await ace.create(LimparRemovidos, ['--no-dry-run'])
comando.prompt.trap('Apagar 1.240 registros?').accept() // responde sem travar

await comando.exec()
comando.assertSucceeded()
```

#### guides/testing/resetting-state-between-tests
[doc](https://docs.adonisjs.com/guides/testing/resetting-state-between-tests)
**O que é:** as estratégias de isolamento: transação global por teste, truncar tabelas, ou recriar o
banco.
**Para que serve:** um teste não contaminar o outro.
**Quando usar:** **na configuração da suíte, antes do segundo teste**. A transação global com
rollback é a estratégia mais rápida, e ordem de execução é o pesadelo que ela evita.

```ts
// tests/bootstrap.ts
export const testUtils = {
  setup: [() => testUtils.db().withGlobalTransaction()],
}
// cada teste roda dentro de uma transação e sofre rollback no fim: mais rápido
// que truncar, e sem deixar rastro para o teste seguinte.
// Cuidado: código que abre transação própria pode conflitar com a global.
```

#### guides/testing/database-assertions
[doc](https://docs.adonisjs.com/guides/testing/database-assertions)
**O que é:** asserções sobre o estado do banco, como "existe uma linha com estes valores" e
contagem.
**Para que serve:** verificar o efeito colateral da requisição, e não só a resposta HTTP.
**Quando usar:** em teste de escrita. Resposta 201 não prova que gravou certo, a asserção de banco
prova.

```ts
await client.post('/authentication/sign-up').json(payload)

// o 201 não prova NADA sobre o que foi gravado: status forçado, papel forçado
// e soft delete só aparecem aqui
await assert.containsSubset(
  await db.from('users').where('email', payload.email).firstOrFail(),
  { role: 'member', status: 'INATIVO' }
)
```

#### guides/testing/test-doubles
[doc](https://docs.adonisjs.com/guides/testing/test-doubles)
**O que é:** substitutos de teste: mocks, stubs e spies, além dos modos falsos embutidos de e-mail,
eventos e drive.
**Para que serve:** testar sem tocar em serviço externo.
**Quando usar:** em qualquer teste que dispararia e-mail ou chamada externa. Os modos falsos
embutidos (`mail.fake()`, `emitter.fake()`) são mais simples que montar mock na mão.

```ts
const mailer = mail.fake()
await client.post('/administrator/teams').json(payload)
mailer.assertSent(BoasVindas)
mail.restore() // sem restore, o falso vaza para os testes seguintes
```

## Referência

#### reference/application
[doc](https://docs.adonisjs.com/reference/application)
**O que é:** a API da classe `Application`: caminhos, ambiente, estado e os ganchos de ciclo de vida.
**Para que serve:** consultar caminhos e estado da aplicação de forma portátil.
**Quando usar:** ao escrever provider ou comando que precisa saber onde as coisas estão.

```ts
import app from '@adonisjs/core/services/app'

// caminho montado pelo framework: funciona em dev (TS) e no build (JS), coisa
// que `__dirname` mais `..` não garante
const destino = app.makePath('storage/uploads')

if (app.inProduction) { /* ... */ }
if (app.inTest) { /* ... */ }
```

#### reference/adonisrc-rcfile
[doc](https://docs.adonisjs.com/reference/adonisrc-rcfile)
**O que é:** a referência do `adonisrc.ts`: providers, comandos, pré-carregamentos, arquivos de
metadados e suítes de teste.
**Para que serve:** o arquivo central de composição da aplicação.
**Quando usar:** ao adicionar pacote que precisa de provider, ou ao criar suíte de teste nova.

```ts
export default defineConfig({
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    // `environment` limita ONDE o provider carrega: um provider de web num
    // comando ace é peso morto no boot da CLI
    { file: () => import('#providers/storage_provider'), environment: ['web'] },
  ],
  preloads: [() => import('#start/routes'), () => import('#start/kernel')],
})
```

#### reference/commands
[doc](https://docs.adonisjs.com/reference/commands)
**O que é:** a lista completa dos comandos embutidos, com argumentos e flags.
**Para que serve:** referência de consulta rápida.
**Quando usar:** quando não lembrar a flag exata. Mais rápido que `--help` na maioria das vezes.

```bash
node ace migration:run --force      # obrigatório em produção
node ace migration:fresh --seed     # derruba tudo, recria e semeia
node ace make:middleware role
node ace list:routes                # confere qual middleware protege o quê
```

#### reference/edge
[doc](https://docs.adonisjs.com/reference/edge)
**O que é:** a referência dos helpers, tags e globais disponíveis nos templates Edge.
**Para que serve:** consulta ao escrever template.
**Quando usar:** só em app renderizado no servidor.

```ts
// em API isto só aparece no corpo de e-mail. Os globais úteis lá:
// {{ route('verificarEmail', { id }) }}   URL a partir da rota nomeada
// {{ await ... }}                          o template suporta await
return mail.send((m) => m.htmlView('emails/aprovada', { user }))
```

#### reference/events
[doc](https://docs.adonisjs.com/reference/events)
**O que é:** a lista dos eventos emitidos pelo framework e pelos pacotes oficiais, com o formato de
cada um.
**Para que serve:** descobrir em que ganchos dá para se pendurar sem alterar o código do framework.
**Quando usar:** ao querer reagir a algo do framework, como uma query lenta ou uma falha de
autenticação.

```ts
import emitter from '@adonisjs/core/services/emitter'

// eventos que o framework já emite, de graça:
emitter.on('db:query', (q) => { if (q.duration?.[0] > 1) logger.warn(q.sql) })
emitter.on('http:request_completed', (e) => { /* métrica de latência */ })
```

#### reference/exceptions
[doc](https://docs.adonisjs.com/reference/exceptions)
**O que é:** o catálogo das exceções do framework, com código, status HTTP e significado.
**Para que serve:** decifrar um código de erro `E_*` sem caçar no código-fonte.
**Quando usar:** **ao encontrar um erro `E_ALGUMA_COISA`**. Procure o código aqui primeiro, a
resposta costuma estar em uma linha.

```ts
// os que mais aparecem, e o que significam de verdade:
// E_ROW_NOT_FOUND        404, vindo de findOrFail
// E_UNAUTHORIZED_ACCESS  401, sem sessão válida
// E_VALIDATION_ERROR     422, o VineJS recusou o payload
// E_INVALID_CREDENTIALS  400, verifyCredentials falhou

if (error.code === 'E_ROW_NOT_FOUND') return response.notFound({})
```

#### reference/helpers
[doc](https://docs.adonisjs.com/reference/helpers)
**O que é:** os utilitários incluídos: manipulação de string (slug, camelCase, plural), `cuid`,
`safeEqual`, `base64`, `messageBuilder` e outros.
**Para que serve:** evitar instalar biblioteca para coisas que já vêm no pacote.
**Quando usar:** **antes de instalar qualquer utilitário pequeno**. Slug, comparação segura e id
único já estão aqui, e essa página é a mais subestimada da doc.

```ts
import string from '@adonisjs/core/helpers/string'
import { cuid, safeEqual, base64 } from '@adonisjs/core/helpers'

string.slug('Café com Leite') // 'cafe-com-leite', sem instalar slugify
cuid() // id ordenável, sem instalar uuid
safeEqual(tokenRecebido, tokenEsperado) // comparação em tempo constante
```

#### reference/types-helpers
[doc](https://docs.adonisjs.com/reference/types-helpers)
**O que é:** os tipos utilitários do TypeScript exportados pelo framework.
**Para que serve:** tipar código próprio que interage com as estruturas do framework.
**Quando usar:** ao escrever middleware, provider ou helper genérico que precisa dos tipos internos.

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

// a assinatura correta de um middleware sai daqui: `next` tem tipo próprio, e
// os parâmetros extras são o que `middleware.role(['owner'])` passa adiante
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, roles: string[]) {
    return next()
  }
}
```
