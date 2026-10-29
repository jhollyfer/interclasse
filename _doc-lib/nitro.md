# Nitro

Servidor de produção que o build do frontend vira, portátil entre runtimes e plataformas.

> ⚠️ **A v3 está em beta** e é a versão que o plugin de Vite exige. O pacote mudou de nome — era
> `nitropack`, hoje é `nitro` — e quase todo helper foi renomeado junto. Material escrito para a v2
> (que é a maior parte do que se acha buscando) usa nomes que não existem mais. A página
> `docs/migration` abaixo é a tradução completa, e vale abrir antes de copiar qualquer trecho de
> fora daqui.
>
> Conferido contra o `llms.txt` oficial (nitro.build) nesta rodada — build nightly/beta, sem
> "latest" estável publicado para comparar (é nightly/beta por natureza).

**O que é:** o servidor que roda a aplicação em produção. Ele pega o resultado do build e produz um
`.output/` que sabe rodar em Node, Bun, Deno, Cloudflare Workers, Vercel, Netlify e mais uma dúzia de
destinos — o mesmo código de servidor, empacotado de forma diferente por **preset**. Junto vem o que
um servidor precisa e o bundler não dá: roteamento por arquivo, storage com chave e valor, cache de
resposta, tarefas agendadas e websocket.

**Para que serve:** publicar o app sem escrever adaptador para cada hospedagem, e sem descobrir no
deploy que a plataforma esperava outro formato de saída. Também é onde moram as respostas para
"quem serve o `.output/`", "por que o build não é `dist/`" e "onde ponho um endpoint de health check
que não passa pelo React".

**Como usar:** num projeto com TanStack Start ele entra como plugin de Vite, e é o plugin que decide
o formato da saída:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  // Sem preset, o Nitro detecta a plataforma pelas variáveis de ambiente do CI.
  // Com preset, você crava — e é o que se quer quando o destino é um container.
  plugins: [tanstackStart(), viteReact(), nitro({ preset: 'node-server' })],
})
```

```bash
pnpm build                      # → .output/, não dist/
node .output/server/index.mjs   # → http://localhost:3000
```

**Quando usar a biblioteca:** a pergunta raramente se coloca — em projeto TanStack Start o Nitro já
é quem produz o servidor, com ou sem você configurar. A dúvida real é **onde ele começa**. Num app
que fala com um backend separado, o Nitro é infraestrutura: você toca nele no primeiro deploy
(preset) e depois só se precisar de cache de resposta, storage ou task. Já as features de servidor
completo — `routes/`, `database`, `websocket` — competem com o backend que você já tem, e usá-las
significa espalhar regra de negócio por dois servidores.

**A ideia que organiza tudo:** são três camadas, não três alternativas. **Vite** transforma arquivo e
resolve módulo. **TanStack Start** decide o que é SSR, o que é server function e o que é rota.
**Nitro** pega o que os dois produziram e empacota num servidor que a plataforma de destino aceita —
e é dele o `.output/`. Quando o build passa e o deploy quebra, o problema é quase sempre desta
camada. Ver [`vitejs.md`](vitejs.md) e [`tanstack-start.md`](tanstack-start.md) para os outros dois
terços da fronteira.

**Links:** 30.

**Skills:** `vite-bundle-optimization`, `perf-web-optimization`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### docs
[doc](https://nitro.build/docs) | [markdown](https://nitro.build/raw/docs.md)
**O que é:** a porta de entrada da documentação, com a definição de uma linha — "framework de
servidor full-stack, compatível com qualquer runtime e qualquer destino de deploy" — e o índice do
resto.
**Para que serve:** entender o escopo antes de procurar página específica. O Nitro cobre muito mais
do que a parte que um app com backend separado usa.
**Quando usar:** primeira visita, e só uma vez. É índice, não conteúdo.

```txt
O que o Nitro traz, e o que disso um app com backend próprio realmente usa:

  preset e .output/      ← isto você usa sempre, é o deploy
  assets e renderer      ← isto o TanStack Start já configura por você
  routes/ e middleware   ← isto compete com o seu backend
  storage, cache, tasks  ← isto é útil e independente do backend
  database, websocket    ← isto é experimental ou específico demais
```

#### docs/quick-start
[doc](https://nitro.build/docs/quick-start) | [markdown](https://nitro.build/raw/docs/quick-start.md)
**O que é:** criar um projeto Nitro do zero, com a estrutura de pastas e o mapa de arquivo para
rota.
**Para que serve:** ver o Nitro sozinho, sem framework por cima, que é a forma mais rápida de
entender o que ele faz e o que o Start esconde.
**Quando usar:** quando quiser experimentar uma feature (task, storage, cache) isolada, sem misturar
com o app. Para adicionar Nitro a um projeto que já existe, o caminho é `examples/vite-nitro-plugin`.

```bash
# projeto novo, do zero
npx create-nitro-app@latest meu-servidor

# ou dentro de um projeto Vite que já existe
pnpm add nitro
```

```txt
# a convenção de pastas que o Nitro varre, e o que cai em cada uma:
server/
  routes/      → rota HTTP, o nome do arquivo é a URL
  middleware/  → roda antes de toda rota
  plugins/     → roda uma vez, no boot do servidor
  tasks/       → tarefa avulsa ou agendada
  utils/       → auto-import
  assets/      → arquivo que vai DENTRO do bundle do servidor
public/        → arquivo servido como está, fora do bundle
```

#### docs/migration
[doc](https://nitro.build/docs/migration) | [markdown](https://nitro.build/raw/docs/migration.md)
**O que é:** a lista completa de mudanças da v2 para a v3: renome do pacote, renome de praticamente
todo helper, presets consolidados e a subida do h3 para a v2.
**Para que serve:** traduzir qualquer material da v2 — que é a maioria do que existe escrito, do
Stack Overflow ao blog post — para os nomes que hoje existem.
**Quando usar:** **antes de copiar qualquer código de fora deste arquivo.** O código da v2 não
quebra com erro claro: ele quebra com "não é uma função", ou pior, compila e some em runtime.

```ts
// A tabela de tradução, conferida contra dist/runtime/nitro.mjs do pacote instalado.
//
// pacote:      nitropack                  →  nitro
// config:      defineNitroConfig          →  defineConfig
// plugin:      defineNitroPlugin          →  definePlugin
// handler:     defineEventHandler         →  defineHandler
// erro:        createError / isError      →  HTTPError / HTTPError.isError()
// runtime:     nitropack/runtime/*        →  nitro/*   (nitro/storage, nitro/cache…)
// tipos:       nitropack                  →  nitro/types
// hooks:       useNitroApp().hooks        →  useNitroHooks()
//
// O h3 subiu para a v2 junto, e lá as funções de resposta viraram retorno direto:
// send(event, valor)          →  return valor
// sendRedirect(event, url)    →  return redirect(event, url)
// sendError(event, erro)      →  throw createError(erro)  →  throw new HTTPError(…)
// getHeader(event, 'x')       →  event.req.headers.get('x')
// setHeader(event, 'x', 'y')  →  event.res.headers.set('x', 'y')
// readBody(event)             →  await event.req.json()
//
// E o mínimo de Node subiu para 20.
```

```ts
// caso real da stack: migrar server/routes/health.get.ts (docs/routing)
// que ainda estivesse na forma v2
import { defineHandler, HTTPError } from 'nitro'

export default defineHandler((event) => {
  if (event.req.method !== 'GET') {
    // v2: sendError(event, createError(...)). v3: lança, o H3 converte.
    throw new HTTPError({ status: 405, message: 'method not allowed' })
  }

  return { status: 'ok' }
})
```

```ts
// errado — v2: helper de resposta por efeito colateral
export default defineEventHandler(async (event) => {
  const body = await readBody(event) // h3 v2 não existe mais: "readBody is not a function"
  send(event, body)
})

// certo — v3: Request/Response padrão web, o handler retorna o valor
import { defineHandler } from 'nitro'

export default defineHandler(async (event) => {
  const body = await event.req.json()
  return body
})
```

#### docs/nightly
[doc](https://nitro.build/docs/nightly) | [markdown](https://nitro.build/raw/docs/nightly.md)
**O que é:** o canal noturno, publicado a cada commit no `main`.
**Para que serve:** confirmar se um bug já foi corrigido antes de a correção sair em release — que,
com a v3 em beta, acontece com alguma frequência.
**Quando usar:** só para reproduzir ou confirmar correção de bug. Nunca em produção.

```json
// package.json — a instalação é por alias, não por `pnpm add nitro-nightly`,
// que resolve para o pacote errado.
{
  "devDependencies": {
    "nitro": "npm:nitro-nightly@latest"
  }
}
```

```bash
# trocar de canal deixa lockfile e node_modules inconsistentes; apagar os dois
# é parte do procedimento, não sinal de que deu errado
rm -rf node_modules pnpm-lock.yaml && pnpm install
```

## Requisição e runtime

#### docs/routing
[doc](https://nitro.build/docs/routing) | [markdown](https://nitro.build/raw/docs/routing.md)
**O que é:** roteamento por arquivo do servidor Nitro: nome de arquivo vira URL, sufixo vira método,
colchete vira parâmetro.
**Para que serve:** endpoint que não passa pelo React — health check, webhook, redirect.
**Quando usar:** com um backend separado, **use com parcimônia**. Cada rota aqui é regra de negócio
que passa a viver fora do backend. Health check e webhook são os casos que valem; CRUD não é.

```ts
// server/routes/health.get.ts  →  GET /health
// O helper é `defineHandler`. `defineEventHandler`, da v2, não existe mais.
import { defineHandler } from 'nitro'

export default defineHandler(() => ({ status: 'ok' }))
```

```txt
# a convenção inteira:
routes/health.get.ts        → GET  /health        (sufixo trava o método)
routes/api/[org]/index.ts   → GET  /api/:org      (colchete = parâmetro)
routes/[...].ts             → qualquer rota não casada
routes/(admin)/users.ts     → /users              (parêntese agrupa sem virar URL)

# A pegadinha da ordem: middleware roda em ordem de listagem do diretório, que é
# ordenação de STRING. `10.log.ts` vem antes de `2.auth.ts`. Zere à esquerda.
```

```ts
// server/routes/webhooks/billing.post.ts  →  POST /webhooks/billing
// caso real: webhook de provedor de pagamento, que não pode passar pelo
// backend de negócio sem duplicar validação de assinatura
import { defineHandler, HTTPError } from 'nitro'

export default defineHandler(async (event) => {
  const signature = event.req.headers.get('x-webhook-signature')
  const isValid = signature === process.env.WEBHOOK_SECRET

  if (!isValid) throw new HTTPError({ status: 401, message: 'invalid signature' })

  const payload = await event.req.json()
  return { received: true }
})
```

#### docs/renderer
[doc](https://nitro.build/docs/renderer) | [markdown](https://nitro.build/raw/docs/renderer.md)
**O que é:** o handler que pega tudo que não casou com rota nenhuma e devolve HTML. É por onde o SSR
entra no Nitro.
**Para que serve:** entender de onde vem o HTML quando nenhuma rota respondeu.
**Quando usar:** raramente na mão — **num app TanStack Start o renderer é o próprio Start**, e
configurá-lo aqui é reescrever o que ele já faz. A página vale para saber quem está respondendo.

```ts
// nitro.config.ts — o que o Start configura por você
import { defineConfig } from 'nitro'

export default defineConfig({
  renderer: {
    template: './index.html', // o <!--ssr-outlet--> do template recebe o HTML
    handler: './renderer.ts', // se existir, ele manda: `template` é IGNORADO
  },
})

// A ordem real: rota catch-all (`routes/[...].ts`) é chamada ANTES do
// renderer — server-entry e renderer só entram depois, como últimos
// fallbacks. Quem espera configurar renderer.handler pra "vencer" uma rota
// catch-all erra a leitura: é o inverso.
```

```ts
// renderer.ts — página de status fora do shell do TanStack Start, pensada
// pro health check do load balancer, sem hidratar React
export default function renderer({ req }: { req: Request }) {
  const { pathname } = new URL(req.url)

  if (pathname === '/_status') return new Response('ok', { status: 200 })

  return undefined
}
```

```ts
// errado — espera que renderer.handler intercepte ANTES da rota catch-all
// nitro.config.ts
export default defineConfig({ renderer: { handler: './renderer.ts' } })
// server/routes/[...].ts → sempre responde primeiro; renderer.ts nunca roda

// certo — quem decide o fallback customizado é a rota catch-all: o renderer
// só entra depois dela, como último recurso
export default defineHandler((event) => new Response('fallback customizado'))
```

#### docs/server-entry
[doc](https://nitro.build/docs/server-entry) | [markdown](https://nitro.build/raw/docs/server-entry.md)
**O que é:** um `server.ts` na raiz do projeto que roda **antes** do roteamento, para toda
requisição.
**Para que serve:** o único ponto que enxerga todo request antes de qualquer coisa — health check,
cabeçalho global, bloqueio por IP.
**Quando usar:** quando precisar de algo verdadeiramente global e barato. O arquivo é **opcional**:
sem ele o Nitro segue direto para as rotas.

```ts
// server.ts, na raiz — detectado pelo nome, sem registro em config nenhum
export default {
  async fetch(req: Request) {
    const url = new URL(req.url)
    if (url.pathname === '/health') return new Response('OK')

    // A regra que decide tudo aqui: devolver uma Response ENCERRA o request.
    // Devolver undefined (ou nada) deixa seguir para rota e renderer.
    // Um `return` esquecido no fim transforma o app inteiro em 404.
  },
}

// Para desligar a detecção automática: `serverEntry: false` na config.
```

```ts
// server.ts — bloqueio por IP antes de qualquer rota, pro `/internal/*`
// que não deve nem chegar na tela React
export default {
  async fetch(req: Request) {
    const url = new URL(req.url)
    const allowed = ['127.0.0.1', '::1']
    const ip = req.headers.get('x-forwarded-for') ?? ''

    if (url.pathname.startsWith('/internal') && !allowed.includes(ip)) {
      return new Response('forbidden', { status: 403 })
    }

    return undefined
  },
}
```

```ts
// errado — handler estilo Node (req, res) nomeado `server.ts`: Nitro assume
// formato "web" por padrão e chama como fetch(req), quebra em runtime
import type { IncomingMessage, ServerResponse } from 'node:http'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.end('ok')
}

// certo — o sufixo `.node.` no nome avisa o Nitro pra converter via srvx:
// renomear server.ts → server.node.ts, mesmo handler
```

#### docs/lifecycle
[doc](https://nitro.build/docs/lifecycle) | [markdown](https://nitro.build/raw/docs/lifecycle.md)
**O que é:** a ordem exata em que uma requisição atravessa o Nitro, e os hooks que existem em cada
ponto.
**Para que serve:** saber onde enfiar log, tracing ou métrica — e por que o seu middleware não roda
para arquivo estático.
**Quando usar:** **ao instrumentar o servidor**, e ao depurar "por que isso não rodou". A resposta é
quase sempre que a etapa anterior encerrou o request.

```ts
// A ordem, do primeiro ao último:
//   hook `request` → asset estático → route rules → middleware global →
//   middleware de rota → rota → renderer → hook `response`
//
// Asset estático vem ANTES do middleware: autenticação escrita como middleware
// não protege nada em public/.

import { definePlugin } from 'nitro'

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    console.info('entrou', event.url.pathname)
  })
  // `response` roda para TODA resposta, inclusive asset e erro. Contar
  // requisição aqui conta o favicon junto.
})
```

```ts
// plugins/shutdown.ts — fecha conexões pendentes no encerramento gracioso,
// pro socket de migração de storage que fica aberto entre requests
import { definePlugin } from 'nitro'

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    await closeOpenSockets()
  })
})

async function closeOpenSockets() {
  // implementação real mora no serviço de socket, não aqui
}
```

```ts
// errado — middleware pensando que protege TODO request, inclusive asset
import { defineHandler, HTTPError } from 'nitro'

export default defineHandler((event) => {
  if (!isAuthenticated(event)) throw new HTTPError({ status: 401, message: 'unauthorized' })
})
// registrado como middleware global: nunca roda pra public/**, que o asset
// estático responde ANTES do middleware na ordem do lifecycle

// certo — arquivo que precisa de autenticação não mora em public/: vira rota
// servida por handler, que aí sim passa pelo middleware
function isAuthenticated(event: unknown) {
  return false
}
```

#### docs/assets
[doc](https://nitro.build/docs/assets) | [markdown](https://nitro.build/raw/docs/assets.md)
**O que é:** as duas pastas de arquivo e o abismo entre elas — `public/` é servido como está,
`assets/` vai para dentro do bundle do servidor.
**Para que serve:** decidir onde um arquivo mora conforme quem precisa lê-lo, o navegador ou o
servidor.
**Quando usar:** ao adicionar qualquer arquivo que não seja código. Errar a pasta ou publica um
arquivo que devia ser privado, ou incha o bundle do servidor com um PNG.

```ts
import { defineHandler } from 'nitro'
import { useStorage } from 'nitro/storage'

// assets/templates/email.html → lido pelo servidor, NUNCA servido por URL
export default defineHandler(async () => {
  return useStorage('assets:server').getItem('templates/email.html')
})

// public/logo.png → servido em /logo.png, copiado para .output/public/
//
// Duas pegadinhas juntas: (1) arquivo em assets/ só entra no bundle se alguém
// o alcançar via useStorage — import direto inlineia o conteúdo no código;
// (2) em dev ele é lido do disco, em produção vem embutido, então "funciona
// em dev e some em produção" costuma ser isto.
```

#### docs/plugins
[doc](https://nitro.build/docs/plugins) | [markdown](https://nitro.build/raw/docs/plugins.md)
**O que é:** arquivos em `plugins/` que rodam uma vez, no boot do servidor, e registram hooks.
**Para que serve:** o lugar de tudo que precisa existir antes do primeiro request: conexão, driver
de storage, cliente de observabilidade.
**Quando usar:** ao integrar qualquer coisa que tenha inicialização. Não confunda com plugin de
Vite: aquele é build, este é runtime.

```ts
// plugins/observability.ts — auto-registrado pelo diretório
// O nome é `definePlugin`. `defineNitroPlugin`, da v2, saiu.
import { definePlugin } from 'nitro'

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error) => {
    console.error('erro no servidor', error)
  })
})

// A regra que pega quem tenta ser esperto: a FUNÇÃO do plugin precisa ser
// síncrona. Os hooks que ela registra podem ser async. `definePlugin(async …)`
// não espera ninguém, e o servidor atende request antes de o boot terminar.
```

## Estado do servidor

#### docs/storage
[doc](https://nitro.build/docs/storage) | [markdown](https://nitro.build/raw/docs/storage.md)
**O que é:** uma interface única de chave e valor (o `unstorage`) sobre memória, disco, Redis, KV de
borda e mais de trinta drivers.
**Para que serve:** guardar coisa pequena e volátil — token de terceiro, resultado de cálculo caro,
rascunho — sem decidir hoje onde ela vai morar em produção.
**Quando usar:** quando precisar de um lugar para guardar algo no servidor e o banco for pesado
demais para a necessidade. **Não** é substituto de banco: não tem consulta, nem transação.

```ts
import { useStorage } from 'nitro/storage'

// a API é a mesma, mude só o driver na config
const cache = useStorage('redis')
await cache.setItem('users:42', { name: 'Ana' })
const user = await cache.getItem<{ name: string }>('users:42')

// Sem configurar nada, o driver é MEMÓRIA: some a cada restart e não é
// compartilhado entre instâncias. Em serverless isso significa que cada
// invocação começa vazia — e é o bug clássico de "o cache não funciona".
```

```ts
// nitro.config.ts — `devStorage` sobrepõe `storage` em desenvolvimento, que é
// como se usa disco local no dev e Redis gerenciado em produção
export default defineConfig({
  storage: { redis: { driver: 'redis', url: process.env.REDIS_URL } },
  devStorage: { redis: { driver: 'fs', base: '.data/redis' } },
})
```

#### docs/cache
[doc](https://nitro.build/docs/cache) | [markdown](https://nitro.build/raw/docs/cache.md)
**O que é:** cache de função e de handler, com chave, validade e revalidação em background, gravado
por cima do storage.
**Para que serve:** parar de chamar uma API de terceiro lenta a cada request, sem escrever a lógica
de cache na mão.
**Quando usar:** **quando a mesma resposta serve a vários usuários**. Cache de resposta por usuário
é vazamento de dado esperando acontecer.

```ts
import { defineCachedFunction } from 'nitro/cache'

// os nomes são `defineCachedFunction` e `defineCachedHandler`;
// `defineCachedEventHandler`, da v2, saiu
export const getStars = defineCachedFunction(
  async (repo: string) => {
    const res = await fetch(`https://api.github.com/repos/${repo}`)
    return (await res.json()).stargazers_count as number
  },
  {
    maxAge: 60 * 60,
    name: 'ghStars',
    getKey: (repo: string) => repo, // sem getKey, TODA chamada divide a mesma entrada
  },
)
```

```ts
// As regras que decidem se algo é cacheável, e que explicam a maior parte dos
// "por que isso não cacheou":
//   • só GET e HEAD; qualquer outro método passa direto
//   • status >= 400 ou corpo vazio nunca entram
//   • o valor precisa ser serializável em JSON — Map, Set e Symbol somem
//   • cabeçalho do request é DESCARTADO, a menos que listado em `varies`
//     (é por isso que cache por usuário não funciona sem pensar)
//
// Onde fica: memória em produção, .nitro/cache em desenvolvimento.
```

```ts
// errado — cacheia resposta que depende do usuário, sem variar por cookie
import { defineCachedHandler } from 'nitro/cache'

export default defineCachedHandler(async (event) => {
  return getProfile(event.context.userId as string)
})
// próximo usuário recebe o perfil do primeiro: o cache ignora o userId

// certo — varia a entrada do cache pelo cabeçalho de sessão
export default defineCachedHandler(
  async (event) => getProfile(event.context.userId as string),
  { varies: ['cookie'] },
)

function getProfile(userId: string) {
  return { userId }
}
```

#### docs/database
[doc](https://nitro.build/docs/database) | [markdown](https://nitro.build/raw/docs/database.md)
**O que é:** uma camada SQL fina (`db0`) com conectores para SQLite, Postgres, MySQL, D1 e outros.
**Para que serve:** SQL direto a partir do servidor Nitro, sem ORM.
**Quando usar:** **quase nunca num projeto que já tem backend.** É experimental, não tem migration
nem relacionamento, e ter dois caminhos até o mesmo banco é a receita de regra de negócio duplicada.
Ver [`lucid.md`](lucid.md) para o lado que deve continuar dono do schema.

```ts
// nitro.config.ts — precisa de flag, e sem ela nada existe
export default defineConfig({
  experimental: { database: true },
  database: {
    default: { connector: 'postgresql', options: { url: process.env.DATABASE_URL } },
  },
})
```

```ts
import { useDatabase } from 'nitro/database'

const db = useDatabase()
// template tag faz o bind dos parâmetros: o ${} NÃO é interpolação de string,
// e é isso que separa esta linha de uma injeção de SQL
const { rows } = await db.sql`SELECT * FROM users WHERE id = ${userId}`

// Com a flag ligada e nenhuma conexão configurada, o Nitro cria um SQLite
// default sozinho — e aí o dado escrito some no próximo deploy.
```

```ts
import { useDatabase } from 'nitro/database'

const db = useDatabase()
const userId = '42'

// errado — interpolação de string: abre pra SQL injection
const bad = await db.sql(`SELECT * FROM users WHERE id = ${userId}`)

// certo — template tag faz o bind dos parâmetros, não concatena string
const good = await db.sql`SELECT * FROM users WHERE id = ${userId}`
```

#### docs/tasks
[doc](https://nitro.build/docs/tasks) | [markdown](https://nitro.build/raw/docs/tasks.md)
**O que é:** unidades de trabalho nomeadas, executáveis pela CLI, por HTTP em dev, ou por cron.
**Para que serve:** rotina de manutenção — limpar registro velho, reprocessar fila, aquecer cache —
com um nome e um jeito único de disparar.
**Quando usar:** quando a rotina for do servidor do frontend. Se o backend já tem sistema de filas
ou comandos, a rotina pertence a ele. Ainda é **experimental**.

```ts
// tasks/cache/clear.ts → nome `cache:clear` (diretório vira prefixo)
import { defineTask } from 'nitro/task'

export default defineTask({
  meta: { name: 'cache:clear', description: 'Limpa o cache de resposta' },
  async run({ payload }) {
    return { result: 'ok' }
  },
})
```

```ts
// nitro.config.ts
export default defineConfig({
  experimental: { tasks: true },
  scheduledTasks: { '0 * * * *': ['cache:clear'] }, // cron → nome da task
})

// Uma instância por task: chamadas paralelas da MESMA task não rodam duas
// vezes, recebem o resultado da que já está rodando. Ótimo contra duplicata,
// péssimo se você esperava paralelismo.
```

```bash
nitro task run cache:clear --payload "{}"   # produção
curl -X POST http://localhost:3000/_nitro/tasks/cache:clear   # só em dev
```

#### docs/websocket
[doc](https://nitro.build/docs/websocket) | [markdown](https://nitro.build/raw/docs/websocket.md)
**O que é:** websocket com a mesma API em Node, Bun, Deno e Cloudflare, via `crossws`.
**Para que serve:** notificação ao vivo, presença, colaboração — sem escrever um servidor de socket
por plataforma.
**Quando usar:** só quando o tempo real for requisito. Antes disso, revalidação do TanStack Query
resolve a maior parte do que parece precisar de websocket, e custa infinitamente menos.

```ts
// routes/_ws.ts — precisa de `features: { websocket: true }` na config
import { defineWebSocketHandler } from 'nitro'

export default defineWebSocketHandler({
  open: (peer) => peer.send({ user: 'server', message: `bem-vindo ${peer.id}` }),
  message: (peer, message) => peer.publish('chat', message.text()),
  close: (peer, details) => console.info('saiu', peer.id, details.code),
})

// A pegadinha que gera o bug "não vejo a minha própria mensagem":
// `peer.publish()` manda para todos os inscritos MENOS quem publicou.
// Para o próprio remetente receber, é `peer.send()` também.
```

## Configuração e deploy

#### docs/configuration
[doc](https://nitro.build/docs/configuration) | [markdown](https://nitro.build/raw/docs/configuration.md)
**O que é:** onde a configuração mora, e as duas peças que se usa de verdade: `runtimeConfig` e
`routeRules`.
**Para que serve:** ter valor de configuração que muda entre ambientes sem rebuild, e aplicar regra
(cache, header, redirect) por padrão de URL.
**Quando usar:** ao precisar de segredo no servidor, e ao querer cache ou cabeçalho sem escrever
middleware.

```ts
// A configuração pode morar em quatro lugares, carregada pelo c12:
//   nitro.config.ts  |  chave `nitro` no vite.config.ts  |  .nitrorc  |  package.json
// Num projeto Vite, a do vite.config.ts é a que evita um arquivo a mais.
import { defineConfig } from 'nitro'

export default defineConfig({
  runtimeConfig: { apiToken: '' }, // declarar aqui é OBRIGATÓRIO
})
```

```ts
import { useRuntimeConfig } from 'nitro/runtime-config'

const token = useRuntimeConfig().apiToken

// A regra do override, e o motivo de o valor chegar vazio em produção:
//   apiToken        → NITRO_API_TOKEN
//   database.host   → NITRO_DATABASE_HOST
// Só chave DECLARADA em runtimeConfig é considerada. Exportar NITRO_ALGO que
// não existe na config não faz nada, e não avisa.
//
// Isto é diferente do `VITE_` do Vite, e a diferença é o ponto: `VITE_` vai
// para o bundle do NAVEGADOR, `NITRO_` fica no servidor. Ver vitejs.md.
```

```ts
// errado — valor real como default: vai pro bundle do servidor e junto com
// o nitro.config.ts pro controle de versão
export default defineConfig({ runtimeConfig: { apiToken: 'sk_live_abc123' } })

// certo — default vazio, valor real só via NITRO_API_TOKEN no ambiente
export default defineConfig({ runtimeConfig: { apiToken: '' } })
```

#### config
[doc](https://nitro.build/config) | [markdown](https://nitro.build/raw/config.md)
**O que é:** a referência completa, com mais de oitenta opções agrupadas em geral, features, dev,
log, roteamento, diretórios, build, avançado e preset.
**Para que serve:** consulta pontual. Não é para ler.
**Quando usar:** quando souber o nome da opção, ou quando desconfiar que existe uma. As que valem
saber que existem estão no bloco abaixo.

```ts
export default defineConfig({
  preset: 'node-server',       // ou a env NITRO_PRESET
  compatibilityDate: '2026-08-09', // trava o comportamento dos presets numa data
  output: {
    dir: '.output',            // é daqui que sai o `.output/`, e é configurável
    serverDir: '.output/server',
    publicDir: '.output/public',
  },
  minify: false,               // default false — surpreende quem espera build minificado
  sourcemap: false,            // ligar ajuda a ler stack trace de produção
  routeRules: {
    '/api/**': { cors: true },
    '/blog/**': { swr: 3600 },
  },
})

// `compatibilityDate` é a opção que ninguém lê e todo mundo devia: sem ela, um
// preset pode mudar de comportamento numa atualização de patch.
```

```ts
// vite.config.ts — opções reais desta stack, direto no plugin nitro()
import { nitro } from 'nitro/vite'

nitro({
  preset: 'node-server',
  // ordem de import executada como no fonte, não a que o bundler escolher
  rolldownConfig: { output: { strictExecutionOrder: true } },
  routeRules: { '/**': { headers: { 'X-Frame-Options': 'DENY' } } },
})
```

```ts
// errado — troca output.dir sem atualizar o Dockerfile/CI que lê .output/
export default defineConfig({ output: { dir: 'dist-server' } })
// o `COPY --from=build /app/.output ...` do Dockerfile não acha nada

// certo — não muda o dir, ou muda junto de todo script que referencia .output
export default defineConfig({})
```

#### deploy
[doc](https://nitro.build/deploy) | [markdown](https://nitro.build/raw/deploy.md)
**O que é:** o índice de plataformas e a explicação de como o preset é escolhido.
**Para que serve:** publicar sem adaptador escrito à mão, e saber por que o build saiu diferente na
máquina do CI.
**Quando usar:** **no primeiro deploy, e sempre que trocar de hospedagem.** É a página que mais
economiza tempo deste arquivo.

```bash
# Três formas de cravar o preset, em ordem de precedência prática:
NITRO_PRESET=node-server pnpm build   # env — a recomendada para CI/CD
# `preset: 'node-server'` na config   # arquivo — boa quando o destino é fixo
nitro build --preset node-server      # flag — para teste pontual

# Sem nenhuma delas, a detecção é automática pelas variáveis que a plataforma
# injeta: Vercel, Netlify, Cloudflare, AWS Amplify, Azure, Firebase App
# Hosting, Stormkit e Zeabur se identificam sozinhas.
#
# É por isso que "na minha máquina o build sai diferente do CI" é o
# comportamento esperado, e não um bug: local cai no default node-server.
```

```dockerfile
# Dockerfile-production — cravar o preset documenta a intenção pra quem lê o
# Dockerfile, mesmo sem nenhuma env de plataforma gerenciada na imagem
FROM node:22-slim AS build
WORKDIR /app
COPY . .
ENV NITRO_PRESET=node-server
RUN pnpm install --frozen-lockfile && pnpm build

FROM node:22-slim
COPY --from=build /app/.output /app/.output
CMD ["node", "/app/.output/server/index.mjs"]
```

```bash
# errado — export depois do build: a env não existe quando o nitro build roda
pnpm build
export NITRO_PRESET=node-server

# certo — a env precisa estar presente ANTES do comando de build
export NITRO_PRESET=node-server
pnpm build
```

#### deploy/runtimes/node
[doc](https://nitro.build/deploy/runtimes/node) | [markdown](https://nitro.build/raw/deploy/runtimes/node.md)
**O que é:** os três presets de Node, o que cada um produz, e as variáveis de ambiente que o
servidor gerado lê.
**Para que serve:** rodar em container ou VPS, que é o destino de quem não usa plataforma
gerenciada.
**Quando usar:** ao escrever o Dockerfile, e ao configurar porta, encerramento gracioso ou proxy
reverso.

```bash
# Os três presets, com os nomes conferidos em node_modules/nitro (hífen, não
# underline — a doc oficial escreve com underline em alguns lugares):
#   node-server      servidor pronto para rodar (default)
#   node-cluster     o mesmo, distribuído pelos núcleos
#   node-middleware  exporta um middleware para você montar no seu servidor
#   node             alias de node-server

pnpm build
node .output/server/index.mjs   # → http://localhost:3000
```

```ts
// node-middleware, para quando já existe um servidor HTTP no projeto
import { createServer } from 'node:http'
import { listener } from './.output/server'

createServer(listener).listen(8080)

// As variáveis que o servidor gerado lê, e as que importam num container:
//   PORT / NITRO_PORT          porta, default 3000
//   HOST / NITRO_HOST          interface
//   NITRO_SHUTDOWN_TIMEOUT     ms até o encerramento forçado, default 30000
//   NITRO_SSL_CERT / _KEY      só para teste; em produção, TLS no proxy
```

```bash
# errado — desliga o shutdown gracioso achando que acelera o restart
NITRO_SHUTDOWN_DISABLED=true node .output/server/index.mjs
# requests em andamento são cortados no meio no primeiro SIGTERM do orquestrador

# certo — deixa o shutdown gracioso ligado (default), só ajusta o timeout
NITRO_SHUTDOWN_TIMEOUT=10000 node .output/server/index.mjs
```

#### docs/openapi
[doc](https://nitro.build/docs/openapi) | [markdown](https://nitro.build/raw/docs/openapi.md)
**O que é:** geração de documento OpenAPI a partir das rotas **do servidor Nitro**, com Scalar e
Swagger servidos em dev.
**Para que serve:** documentar os endpoints que moram no Nitro.
**Quando usar:** só se você tiver rotas Nitro que valham documentar. **Não confundir com
[`_standards/openapi.md`](../_standards/openapi.md) deste pacote**, que documenta a API do backend: são dois geradores
diferentes, cada um lendo as próprias rotas. É **experimental**.

```ts
export default defineConfig({ experimental: { openAPI: true } })

// em desenvolvimento:
//   /_openapi.json   o documento, OpenAPI 3.1.0
//   /_scalar         referência Scalar
//   /_swagger        Swagger UI
```

```ts
// A anotação por rota é uma macro de build: custo zero em runtime.
defineRouteMeta({
  openAPI: {
    tags: ['health'],
    description: 'Verifica se o servidor está de pé',
    responses: { 200: { description: 'ok' } },
  },
})

// O aviso da própria doc: ligado em produção, isso publica o mapa completo da
// sua API. Proteja com autenticação ou deixe só em dev.
```

```ts
// errado — liga em produção sem proteção: /_openapi.json fica público
export default defineConfig({ experimental: { openAPI: true } })

// certo — só fora de produção, ou atrás de autenticação via routeRules
export default defineConfig({
  experimental: { openAPI: process.env.NODE_ENV !== 'production' },
})
```

#### docs/vite
[doc](https://nitro.build/docs/vite) | [markdown](https://nitro.build/raw/docs/vite.md)
**O que é:** a página que descreve exatamente o que o `nitro()` faz como plugin do Vite — API
routes, SSR e build de produção que roda em qualquer lugar. É a base de como o Nitro entra aqui:
não como servidor separado, só como plugin do `vite.config.ts` do TanStack Start.
**Para que serve:** entender o que o plugin resolve por baixo antes de tocar no `nitro({ preset })`.
**Quando usar:** ao debugar algo do build ou do SSR que pareça do Vite mas na verdade é o Nitro.

```ts
// vite.config.ts — a forma como aparece nos dois projetos daqui
import { nitro } from 'nitro/vite'

export default defineConfig({ plugins: [nitro({ preset: 'node-server' })] })
```

```ts
// vite.config.ts — bundler real aqui é "vite" (auto-detectado pelo nitro()
// dentro do Vite config), que junta cliente e servidor com Rolldown
import { nitro } from 'nitro/vite'

nitro({
  preset: 'node-server',
  // escape hatch pro bundler: módulo de terceiro que roda código no import
  // (`window` no topo) quebrava toda rota com 500 ao compartilhar chunk
  rolldownConfig: { output: { strictExecutionOrder: true } },
})
```

```jsonc
// errado — "dev": "nitro dev" num projeto que já usa o plugin nitro() no
// Vite: o CLI do Nitro não suporta o builder do Vite
{ "scripts": { "dev": "nitro dev" } }

// certo — o Vite orquestra os dois lados quando o plugin está nele
{ "scripts": { "dev": "vite dev" } }
```

#### docs/utils
[doc](https://nitro.build/docs/utils) | [markdown](https://nitro.build/raw/docs/utils.md)
**O que é:** o mapa de tudo que se importa de `nitro` e seus subpaths — **sem auto-import**, tudo
precisa de `import` explícito.
**Para que serve:** achar o import certo (`defineEventHandler`, `useStorage`, `defineTask`, etc.)
sem adivinhar o subpath.
**Quando usar:** **antes de escrever qualquer coisa que rode no runtime do Nitro** — importar do
caminho errado é o erro mais comum.

```ts
// o handler vem do pacote raiz, não de um subpath
import { defineHandler } from 'nitro'
```

```ts
// server/routes/api/export.get.ts — combina os imports mais comuns da stack
import { defineHandler, HTTPError } from 'nitro'
import { getQuery } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

export default defineHandler((event) => {
  const { format } = getQuery(event)
  if (!format) throw new HTTPError({ status: 400, message: 'format é obrigatório' })

  const token = useRuntimeConfig().apiToken
  return { format, hasToken: Boolean(token) }
})
```

```ts
// errado — useStorage não existe no pacote raiz, só no subpath
import { useStorage } from 'nitro'

// certo — cada utilitário mora no subpath que a tabela desta página lista
import { useStorage } from 'nitro/storage'
```

#### docs/typescript
[doc](https://nitro.build/docs/typescript) | [markdown](https://nitro.build/raw/docs/typescript.md)
**O que é:** confirmação de que `.ts` funciona direto no Nitro, sem passo de compilação — o
TypeScript só entra para type-check (`tsc --noEmit` na CI).
**Para que serve:** saber que não falta configurar nada extra para TS no lado do Nitro.
**Quando usar:** ao configurar CI e notar que falta um `tsc --noEmit` que cubra o código do Nitro.

```jsonc
// package.json: o type-check de CI é separado do build, o Nitro não bloqueia nele
{ "scripts": { "typecheck": "tsc --noEmit" } }
```

#### docs/prerendering
[doc](https://nitro.build/docs/prerendering) | [markdown](https://nitro.build/raw/docs/prerendering.md)
**O que é:** renderizar rotas em tempo de build e servir como arquivo estático em
`.output/public`, sem SSR em tempo de requisição para elas.
**Para que serve:** página que não muda por request (landing, termos de uso) ficar rápida e
cacheável sem custo de servidor a cada acesso.
**Quando usar:** para rotas públicas que não dependem de dados por usuário. **Não prerenderize rota
que lê sessão/cookie** — o conteúdo fica congelado no que existia no build.

```ts
export default defineConfig({ prerender: { routes: ['/termos', '/sobre'] } })
```

```ts
// nitro.config.ts — prerenderiza só as páginas públicas de marketing, que
// não dependem de sessão nem de dado por usuário
export default defineConfig({
  prerender: { routes: ['/', '/precos', '/termos', '/privacidade'] },
})
```

```ts
// errado — prerenderiza rota que lê sessão: o HTML fica congelado com o
// usuário (ou ausência dele) que existia no momento do build
export default defineConfig({ prerender: { routes: ['/conta/perfil'] } })

// certo — rota de usuário fica fora do prerender, servida por SSR normal
export default defineConfig({ prerender: { routes: ['/termos'] } })
```

## Exemplos com Vite

#### examples/vite-nitro-plugin
[doc](https://nitro.build/examples/vite-nitro-plugin) | [markdown](https://nitro.build/raw/examples/vite-nitro-plugin.md)
**O que é:** o exemplo mínimo do plugin de Vite, e o hook `nitro.setup` para registrar rota e módulo
virtual por código.
**Para que serve:** o menor caminho para adicionar Nitro a um projeto Vite existente.
**Quando usar:** **ao integrar Nitro a um projeto que já existe**, e como referência da forma de
configurar — que é onde mais se erra.

```ts
// A assinatura, conferida em node_modules/nitro/dist/vite.d.mts:
//   nitro(pluginConfig?: NitroPluginConfig)  com  NitroPluginConfig extends NitroConfig
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [nitro({ preset: 'node-server' })],
  // alternativa equivalente, porque o plugin aumenta o UserConfig do Vite
  // com uma chave `nitro`:
  // nitro: { preset: 'node-server' },
})
```

```ts
// Existe uma TERCEIRA forma, que funciona e não está no tipo. Em
// dist/vite.mjs a configuração final é montada assim:
//
//   defu(pluginConfig, pluginConfig.config, userConfig.nitro)
//
// Ou seja, `nitro({ config: { preset: 'node-server' } })` é lido — a chave
// `config` é aninhada e mesclada, mesmo sem constar em NitroPluginConfig. O
// `defu` faz o primeiro vencer, então a precedência é:
//   opção no topo do plugin  >  dentro de `config`  >  chave `nitro` da raiz
//
// Vale saber que funciona, para não "consertar" um projeto que já usa. Para
// código novo, prefira a forma do tipo: o que só existe em runtime não
// aparece no autocomplete e some sem aviso numa versão futura.
```

```bash
# passo fácil de esquecer, e sem ele os tipos do servidor não resolvem:
# tsconfig.json → { "extends": "nitro/tsconfig" }
```

#### examples/vite-ssr-tss-react
[doc](https://nitro.build/examples/vite-ssr-tss-react) | [markdown](https://nitro.build/raw/examples/vite-ssr-tss-react.md)
**O que é:** o exemplo oficial de TanStack Start com Nitro — exatamente a combinação desta stack.
**Para que serve:** conferir ordem de plugin e configuração contra uma referência mantida pelo time
do Nitro.
**Quando usar:** **quando o build passar e o deploy quebrar.** É a primeira coisa a comparar com o
seu `vite.config.ts`.

```ts
// A ordem do exemplo oficial do Nitro: nitro() por ÚLTIMO.
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tanstackStart(), viteReact(), nitro()],
  resolve: { tsconfigPaths: true },
  environments: { ssr: { build: { rollupOptions: { input: './server.ts' } } } },
})

// As duas docs oficiais DISCORDAM da ordem: o guia de hosting do TanStack
// Start põe o nitro() entre tanstackStart() e viteReact(). Este exemplo é o
// mais recente dos dois. Se o build sair estranho, é a primeira variável a
// mexer — e a que quase ninguém desconfia.
```

```ts
// vite.config.ts — ordem usada nos dois projetos desta stack: nitro() primeiro
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    nitro({ preset: 'node-server' }),
    tailwindcss(),
    tanstackStart({ router: { routeToken: 'layout' } }),
    react(),
  ],
})
```

```ts
// errado — seguir o guia de hosting do TanStack Start ao pé da letra e pôr
// nitro() ENTRE tanstackStart() e viteReact()
export default defineConfig({
  plugins: [tanstackStart(), nitro(), viteReact()],
})

// certo — bater com o exemplo oficial mais recente: nitro() não fica
// espremido entre os dois plugins de framework
export default defineConfig({
  plugins: [tanstackStart(), viteReact(), nitro()],
})
```

#### examples/vite-ssr-tsr-react
[doc](https://nitro.build/examples/vite-ssr-tsr-react) | [markdown](https://nitro.build/raw/examples/vite-ssr-tsr-react.md)
**O que é:** TanStack **Router** (sem o Start) sobre Nitro: roteamento tipado no cliente, servidor
do Nitro por baixo.
**Para que serve:** ver o meio-termo — roteamento de cliente com servidor de verdade, sem a camada
full-stack do Start.
**Quando usar:** ao avaliar se o Start é mesmo necessário. Se o app só consome uma API externa, esta
configuração é bem menor. Ver [`tanstack-router.md`](tanstack-router.md).

```ts
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  // o plugin do Router precisa vir ANTES do de React: ele gera a routeTree
  // que o React vai compilar
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), nitro()],
})

// O que você perde em relação ao Start: server function tipada e SSR. O que
// ganha: um vite.config que cabe na tela.
```

#### examples/vite-ssr-react
[doc](https://nitro.build/examples/vite-ssr-react) | [markdown](https://nitro.build/raw/examples/vite-ssr-react.md)
**O que é:** SSR de React sem framework nenhum: `renderToReadableStream` na mão, assets injetados
via import com `?assets`.
**Para que serve:** ver quanto trabalho o TanStack Start está fazendo por você.
**Quando usar:** leitura de uma vez só, por entendimento. Montar SSR na mão em projeto de produção é
reescrever mal o que o Start já faz.

```ts
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [nitro(), react()],
  environments: { client: { build: { rollupOptions: { input: './src/entry-client.tsx' } } } },
})

// O que o exemplo faz à mão, e o Start faz sozinho: renderizar com
// renderToReadableStream, descobrir os assets de cliente e de ssr
// (import '…?assets=client'), injetar <link> e <script> no HTML, e só então
// devolver o stream. São umas cem linhas de entrypoint.
```

#### examples/vite-trpc
[doc](https://nitro.build/examples/vite-trpc) | [markdown](https://nitro.build/raw/examples/vite-trpc.md)
**O que é:** tRPC montado numa rota do Nitro, via a opção `routes` do plugin.
**Para que serve:** o padrão de montar QUALQUER handler que fale `Request`/`Response` numa faixa de
URL — tRPC é só o exemplo.
**Quando usar:** ao montar biblioteca de terceiro que espera um handler web padrão. Para o seu
próprio frontend, server function do Start continua melhor por causa da tipagem.

```ts
// vite.config.ts — `routes` mapeia padrão de URL para arquivo de handler,
// e é a prova de que as opções vão direto no plugin
export default defineConfig({
  plugins: [nitro({ routes: { '/trpc/**': './server/trpc.ts' } })],
})
```

```ts
// server/trpc.ts — a interface é Request → Response, sem nada de específico
export default {
  async fetch(request: Request): Promise<Response> {
    return fetchRequestHandler({ endpoint: '/trpc', req: request, router: appRouter })
  },
}
```

#### examples/vite-rsc
[doc](https://nitro.build/examples/vite-rsc) | [markdown](https://nitro.build/raw/examples/vite-rsc.md)
**O que é:** React Server Components com o plugin RSC experimental do Vite, servidos pelo Nitro.
**Para que serve:** acompanhar o estado do suporte a RSC fora do Next.
**Quando usar:** só por curiosidade, hoje. Duas peças experimentais empilhadas — o plugin RSC do
Vite e a v3 do Nitro. Ver `guide/server-components` em [`tanstack-start.md`](tanstack-start.md) para
o caminho estável que resolve o mesmo problema.

```ts
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import rsc from '@vitejs/plugin-rsc'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    nitro(),
    // `serverHandler: false` entrega o servidor ao Nitro em vez de o plugin
    // RSC subir o dele
    rsc({
      serverHandler: false,
      entries: { ssr: './app/framework/entry.ssr.tsx', rsc: './app/framework/entry.rsc.tsx' },
    }),
    react(),
  ],
})
```

## Fora de escopo

- docs/cli, docs/modules (uso avançado de build/CLI do Nitro como framework standalone; aqui ele só
  roda como plugin do Vite)
- docs/testing, examples/vitest (testar rotas **do servidor Nitro** com Vitest — não há rota Nitro
  própria aqui para testar; o Vitest dos dois projetos testa componentes React)
- examples/api-routes, cached-handler, custom-error-handler, database, elysia, express, fastify,
  hello-world, hono, import-alias, middleware, mono-jsx, nano-jsx, plugins, renderer,
  runtime-config, server-fetch, shiki, takumi, tracing, virtual-routes, websocket (padrões de
  servidor Nitro próprio; o backend fica no AdonisJS/Fastify separado, não no Nitro)
- examples/vite-ssr-html, vite-ssr-preact, vite-ssr-react-router, vite-ssr-solid,
  vite-ssr-solidstart, vite-ssr-vue-router (outro framework de UI)
- examples/vite-nitro-plugin (já coberto pela entrada `docs/vite` acima e por `examples/vite-ssr-tss-react`)
- deploy (índice) e todos os `deploy/providers/*` (Alwaysdata, AWS Amplify, AWS Lambda, Azure,
  Cleavr, Cloudflare, Deno Deploy, DigitalOcean, EdgeOne, Firebase, Flightcontrol, Genezio, GitHub
  Pages, GitLab Pages, Heroku, IIS, Koyeb, Netlify, Render.com, Stormkit, Upsun, Vercel, Zeabur,
  Zephyr, Zerops) e `deploy/runtimes/{bun,deno,standard}` — o deploy real é Docker com preset
  `node-server` (`Dockerfile-production`/`Dockerfile-coolify`), nenhum provider bate exatamente
- blog, blog/v3-beta
- examples (índice)
