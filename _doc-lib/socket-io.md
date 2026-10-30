# Socket.IO

Biblioteca de comunicação bidirecional por eventos entre cliente e servidor, com fallback de transporte e reconexão automática.

> Conferido contra `socket.io@4.8.4`

**O que é:** uma camada de eventos sobre uma conexão persistente. A doc é explícita numa advertência
que define a biblioteca inteira: **"Socket.IO is NOT a WebSocket implementation"** — ele usa WebSocket
como transporte quando dá, mas acrescenta metadados a cada pacote, então um cliente WebSocket puro
não fala com um servidor Socket.IO e vice-versa. Por dentro são duas camadas: **Engine.IO**, o
"encanamento" que estabelece e mantém a conexão (long-polling, WebSocket, WebTransport, heartbeat,
upgrade), e o Socket.IO propriamente dito, que põe em cima disso eventos nomeados, namespaces, rooms,
acknowledgements, broadcast e reconexão.

**Para que serve:** entregar uma conexão que **funciona mesmo quando WebSocket não funciona**. O
cliente começa por HTTP long-polling — que atravessa proxy corporativo, firewall pessoal e antivírus —
e só então tenta subir para um transporte melhor. Isso é decisão de projeto, não acidente: a doc diz
que nem sempre é possível estabelecer uma conexão WebSocket. Some a isso reconexão com backoff
exponencial, buffer de pacotes durante a queda, acknowledgements com timeout, broadcast para
subconjuntos de clientes e multiplexação por namespace, e você tem o conjunto que separa Socket.IO
de `ws`.

**Como usar:**

```bash
npm install socket.io          # servidor
npm install socket.io-client   # cliente
npm install --save-optional bufferutil utf-8-validate   # add-ons binários do ws (opcional)
```

```ts
// servidor — app/realtime/server.ts (convenção sugerida)
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: { origin: ['https://app.example.com'], credentials: true },
})

// Middleware de handshake: roda UMA vez por conexão, antes do "connection".
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('unauthorized'))

    socket.data.user = verifyToken(token) // socket.data é o lugar certo para isso
    next()
  } catch {
    next(new Error('unauthorized')) // falha FECHADA: erro nunca vira next()
  }
})

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`) // room por usuário, não por socket.id

  socket.on('post:create', async (payload, ack) => {
    try {
      const post = await createPost(payload)
      socket.to(`team:${post.teamId}`).emit('post:created', post)
      ack?.({ ok: true, post })
    } catch (error) {
      ack?.({ ok: false }) // não há tratamento de erro embutido: capture aqui
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(socket.id, reason)
  })
})

httpServer.listen(3000)
```

```ts
// cliente — src/lib/socket.ts (convenção sugerida)
import { io } from 'socket.io-client'

export const socket = io('https://api.example.com', {
  withCredentials: true,
  autoConnect: false,
  // função, e não objeto: reavaliada a cada tentativa de reconexão
  auth: (cb) => cb({ token: readToken() }),
})

socket.on('connect_error', (error) => {
  // socket.active === false significa recusa do middleware: não haverá retry
  if (!socket.active) redirectToLogin()
})
```

**Quando usar a biblioteca:** quando o servidor precisa **empurrar** dado para o cliente e você não
quer escrever à mão reconexão, heartbeat, buffer, fallback de transporte e roteamento entre
instâncias. Se o requisito é só "atualizar a tela de vez em quando", polling ou Server-Sent Events
custam menos. Se o requisito é um protocolo binário próprio com clientes de terceiros, use `ws` —
a própria doc recomenda isso para quem quer WebSocket puro. E a doc desaconselha dois cenários
explicitamente: **serviço em segundo plano de app móvel** (consumo de bateria — use Firebase Cloud
Messaging) e **plataformas serverless** como Vercel e AWS Lambda, cujo modelo de cobrança briga com
conexão de longa duração.

| Transporte | Como funciona | Custo |
|---|---|---|
| HTTP long-polling | GET sucessivos para receber, POST para enviar | Cada pacote é uma requisição HTTP nova, com todos os headers |
| WebSocket | Conexão persistente após upgrade | Headers uma vez só, no início da sessão |
| WebTransport | Mais recente, sem head-of-line blocking | Exige HTTPS e não vem ligado por padrão |

**O detalhe que economiza horas:** o middleware de autenticação roda **uma única vez**, no handshake.
Depois disso a conexão vive por horas sem passar por ele de novo. Sessão revogada, senha trocada,
usuário banido — nada disso derruba quem já está conectado; o socket continua recebendo broadcast até
alguém checar de novo. Duas correções, e as duas são código de aplicação, não configuração:

1. Reverifique a autorização **por evento** que importa, dentro do handler (ou num `socket.use`, que
   roda a cada pacote recebido).
2. Tenha um jeito de expulsar: guarde o usuário em `socket.data`, junte o socket a uma room por
   usuário no `connection`, e no logout chame `io.in('user:123').disconnectSockets()`.

O erro irmão, e mais grave, é o middleware que **falha aberto**. Um `try/catch` cujo `catch` chama
`next()` — ou um `await` sem `catch` cuja rejeição some — transforma "não consegui validar o token"
em "entra". Em `io.use` e em `namespace.use` a regra é a mesma e não tem exceção: todo caminho de
erro termina em `next(new Error(...))`. E se você **não** chamar `next()` de forma alguma, a doc é
clara: a conexão fica pendurada até cair pelo timeout (`connectTimeout`, 45 s) — o cliente não recebe
nem sucesso nem erro.

| Pegadinha de produção | O que acontece |
|---|---|
| Usar `socket.id` como identidade | É efêmero: 20 caracteres aleatórios, **regenerado a cada reconexão** e diferente por aba. Identidade vem do `auth`/cookie |
| `cors: { origin: '*', credentials: true }` | O navegador recusa: `Access-Control-Allow-Origin: *` é incompatível com credenciais |
| Vários nós sem sticky session | HTTP 400 com `{"code":1,"message":"Session ID unknown"}` no meio da sessão de long-polling |
| `proxy_read_timeout` do nginx menor que `pingInterval + pingTimeout` (45 s) | Desconexão periódica, sem causa aparente |
| Registrar `socket.on(...)` **dentro** do handler de `connect` | Um listener novo a cada reconexão; o handler dispara N vezes |
| Erro lançado dentro de um listener | Não há tratamento embutido na biblioteca — a exceção sobe e derruba o processo |
| Emitir com o socket desconectado | Por padrão o evento fica **bufferizado** e chega todo de uma vez na volta |
| Payload acima de `maxHttpBufferSize` (1 MB) | A conexão é fechada, não é um erro de validação |

**Links:** 44.

**Skills:** `maiyu-backend`, `observability-and-instrumentation`, `debugging-and-error-recovery`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Como funciona por baixo

#### index
[doc](https://socket.io/docs/v4/)

**O que é:** a apresentação: o que a biblioteca entrega, o que ela **não** é, e a lista de features.
**Para que serve:** calibrar a expectativa antes de escolher entre Socket.IO, `ws` e SSE.
**Quando usar:** primeira leitura, e toda vez que alguém disser "é só um WebSocket". As
implementações existem em várias linguagens (servidor em JS, Java, Python, Go, Rust; cliente também
em Swift, Dart, Kotlin, .Net, PHP), mas sempre falando o protocolo do Socket.IO.

```ts
// As seis features que justificam a biblioteca sobre WebSocket puro:
// 1. fallback para HTTP long-polling
// 2. reconexão automática, com heartbeat e backoff exponencial
// 3. buffer de pacotes durante a desconexão
// 4. acknowledgements (request-response), com timeout opcional
// 5. broadcast para todos ou para um subconjunto (rooms)
// 6. multiplexação por namespace sobre uma conexão só

// O que NÃO fazer: apontar um cliente WebSocket puro para o servidor.
// new WebSocket('wss://api.example.com/socket.io/')  <- não conversa
```

#### how-it-works
[doc](https://socket.io/docs/v4/how-it-works/)

**O que é:** a divisão em duas camadas — Engine.IO embaixo, Socket.IO em cima — e o mecanismo de
upgrade de transporte.
**Para que serve:** entender por que a primeira requisição é um GET de polling, e não um WebSocket.
**Quando usar:** **antes de debugar qualquer coisa na aba Network**. Sem esta página, o tráfego de
polling parece bug.

```ts
// Sequência real de uma conexão:
// 1. GET  /socket.io/?EIO=4&transport=polling      -> handshake, devolve o sid
// 2. POST /socket.io/?EIO=4&transport=polling&sid=…-> cliente manda pacotes
// 3. o cliente espera o buffer de saída esvaziar e testa o WebSocket
// 4. se o teste passa, o polling fecha e a sessão segue no WebSocket

// O handshake devolve: sid, upgrades, pingInterval, pingTimeout, maxPayload.

// Para pular o polling (exige que WebSocket sempre funcione na sua rede):
const socket = io('https://api.example.com', { transports: ['websocket'] })
```

```ts
// caso real — bin/server.ts: Socket.IO sobre o MESMO http.Server do Fastify
import { Server } from 'socket.io'
import { buildKernel } from '@application/core/kernel.core'

const fastify = await buildKernel()
await fastify.ready()
const io = new Server(fastify.server) // reusa o handshake HTTP, não cria outro

io.engine.on('connection', (raw) => {
  console.log(raw.transport.name) // 'polling' primeiro, sempre
})
```

```ts
// errado — pula o long-polling por padrão em todo cliente
const socket = io(url, { transports: ['websocket'] })

// certo — deixa o fallback decidir; só force websocket onde a rede é sua
const socket = io(url)
// por quê: a doc lista proxy corporativo, firewall pessoal e antivírus como
// causas reais de bloqueio a WebSocket — pular o polling troca compatibilidade
// por uma otimização que só vale quando você controla a rede do cliente
```

#### engine-io-protocol
[doc](https://socket.io/docs/v4/engine-io-protocol/)

**O que é:** o protocolo de baixo nível: tipos de pacote, handshake, heartbeat e a sequência de
upgrade em três passos.
**Para que serve:** ler o que passa no fio quando o log da aplicação não explica a queda.
**Quando usar:** ao investigar desconexão periódica. O detalhe que resolve a maioria dos casos: **no
v4 quem envia o `ping` é o servidor**, porque os timers do navegador não são confiáveis (aba em
segundo plano é estrangulada pelo Chrome).

```ts
// Tipos de pacote do Engine.IO:
// 0 open | 1 close | 2 ping | 3 pong | 4 message | 5 upgrade | 6 noop

// Resposta do handshake (pacote "0"):
// {"sid":"lv_VI97HAXpY6yYWAAAC","upgrades":["websocket"],
//  "pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}

// Upgrade em três passos, desenhado para não perder pacote:
// 1. cliente abre o WebSocket e PAUSA o long-polling
// 2. cliente manda ping "probe"  ->  servidor responde pong "probe"
// 3. cliente manda o pacote "upgrade" e o transporte antigo fecha

// Teste manual de que o servidor está de pé:
// curl "https://api.example.com/socket.io/?EIO=4&transport=polling"
```

```ts
// caso real — monitoring-socket.service.ts (DI por construtor, Fastify)
import { Service } from 'fastify-decorators'
import type { Server as SocketIOServer } from 'socket.io'

@Service()
export default class MonitoringSocketService {
  attach(io: SocketIOServer): void {
    // handshake recusado NÃO passa por "connection" — só aparece aqui
    io.engine.on('connection_error', (err) => {
      console.error('[engine.io]', err.code, err.message)
    })
  }
}
```

```ts
// errado — trata desconexão periódica como bug da aplicação
// nginx com proxy_read_timeout padrão (60s) perto de pingInterval+pingTimeout

// certo — o ping é do SERVIDOR desde o v4 (timer de aba em 2º plano não é
// confiável); o proxy só precisa sobreviver ao intervalo dos dois
const io = new Server(httpServer, { pingInterval: 25_000, pingTimeout: 20_000 })
// nginx: proxy_read_timeout tem de ser MAIOR que pingInterval + pingTimeout
```

#### socket-io-protocol
[doc](https://socket.io/docs/v4/socket-io-protocol/)

**O que é:** a camada de cima: tipos de pacote, codificação, namespace e id de acknowledgement.
**Para que serve:** decifrar strings como `42["post:created",{…}]` num dump de rede.
**Quando usar:** ao escrever cliente em outra linguagem, testar com ferramenta genérica, ou entender
por que binário vira dois frames com o parser padrão.

```ts
// Tipos: 0 CONNECT | 1 DISCONNECT | 2 EVENT | 3 ACK
//        4 CONNECT_ERROR | 5 BINARY_EVENT | 6 BINARY_ACK

// Formato:
// <tipo>[<n anexos binários>-][<namespace>,][<ack id>]<payload JSON>

// socket.emit('foo')                 -> 2["foo"]   -> no fio: 42["foo"]
//   (o "4" da frente é o "message" do Engine.IO)
// evento com ack id 12               -> 212["foo"]
// binário no namespace /admin        -> 51-/admin,["msg",{"_placeholder":true,"num":0}]

// O namespace "/" é omitido. O handshake do namespace é um par CONNECT:
// cliente -> { type: CONNECT, nsp: "/" }
// servidor -> { type: CONNECT, nsp: "/", data: { sid: "…" } }  ou CONNECT_ERROR
```

#### faq
[doc](https://socket.io/docs/v4/faq/)

**O que é:** as perguntas recorrentes, com respostas curtas e definitivas.
**Para que serve:** encerrar discussões de arquitetura com o que a doc realmente afirma.
**Quando usar:** antes de propor qualquer coisa que dependa do servidor "lembrar" mensagens. Duas
frases valem por si: **"The Socket.IO server does not store any message"** e **"There is no concept
of user in Socket.IO"**.

```ts
// Consequências práticas das duas frases acima:

// 1. Não há histórico. Quem esteve offline perde o que passou, a menos que
//    VOCÊ persista os eventos (ver delivery-guarantees).

// 2. Não há usuário. A ligação socket <-> conta é sua, feita no handshake:
io.use((socket, next) => {
  const user = authenticate(socket.handshake.auth.token)
  if (!user) return next(new Error('unauthorized'))
  socket.data.user = user
  next()
})

// Garantia de ordem: a doc garante ordenação das mensagens em qualquer
// transporte. Garantia de entrega: "at most once" por padrão.
```

## Servidor

#### server-installation
[doc](https://socket.io/docs/v4/server-installation/)

**O que é:** instalação do servidor, add-ons binários opcionais e implementações alternativas de
WebSocket.
**Para que serve:** decidir entre `ws` (padrão), `eiows` e `µWebSockets.js` antes de ter problema.
**Quando usar:** no primeiro dia. Instale `bufferutil` e `utf-8-validate` como opcionais: o servidor
cai para a implementação em JavaScript se eles não compilarem, então o risco é zero.

```bash
npm install socket.io
npm install --save-optional bufferutil utf-8-validate
```

```ts
// Trocar a implementação de WebSocket (v4: passe o módulo, não a string):
import { Server } from 'socket.io'
import eiows from 'eiows'

const io = new Server(3000, { wsEngine: eiows.Server })

// µWebSockets.js é suportado desde a 4.4.0, com ligação própria (App + attachApp).
// Node.js 10 é o mínimo; use a LTS corrente.
```

#### server-initialization
[doc](https://socket.io/docs/v4/server-initialization/)

**O que é:** todas as formas de subir o servidor: standalone, sobre `http`, com Express, Fastify,
Koa, NestJS, HTTPS, HTTP/2.
**Para que serve:** anexar o Socket.IO ao mesmo servidor HTTP da API, na mesma porta.
**Quando usar:** ao integrar com um framework. A pegadinha do Express está aqui, escrita na doc:
**`app.listen(3000)` não funciona**, porque cria um servidor HTTP novo, ao qual o Socket.IO não está
anexado.

```ts
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)  // o MESMO servidor vai para os dois
const io = new Server(httpServer)

httpServer.listen(3000)   // CERTO
// app.listen(3000)       // ERRADO: outro servidor, o Socket.IO fica de fora

// Com Fastify, anexe ao servidor interno:
// const io = new Server(fastify.server)

// Standalone (o Socket.IO cria o servidor HTTP, acessível em io.httpServer):
// const io = new Server(3000)
```

```ts
// caso real — bin/server.ts: Socket.IO é serviço próprio, não vive no kernel
// HTTP do Fastify (_standards/backend-fastify.md §9); liga-se aqui, uma vez.
import { Server } from 'socket.io'
import { buildKernel } from '@application/core/kernel.core'
import NotificationSocketService from '@application/services/notification/notification-socket/notification-socket.service'

const fastify = await buildKernel()
await fastify.ready()
const io = new Server(fastify.server)
fastify.container.get(NotificationSocketService).init(io, decode)
await fastify.listen({ port: 3000 })
```

```ts
// errado — registrar o plugin de CORS do Fastify e achar que cobre o socket
await fastify.register(cors, { origin: '*' })
const io = new Server(fastify.server)

// certo — a opção `cors` do Server é um CONTRATO separado do Fastify
const io = new Server(fastify.server, { cors: { origin: 'https://app.example.com' } })
// por quê: Socket.IO não lê o plugin @fastify/cors — o handshake de
// long-polling é uma requisição HTTP própria, fora do roteador do Fastify
```

#### server-options
[doc](https://socket.io/docs/v4/server-options/)

**O que é:** a tabela completa de opções, do `path` ao `pingTimeout`, incluindo as do Engine.IO.
**Para que serve:** ajustar heartbeat, tamanho máximo de payload, CORS e compressão.
**Quando usar:** ao diagnosticar desconexão ou payload recusado. Guarde dois números: `pingInterval`
25 s + `pingTimeout` 20 s = **45 s**, que é o piso de qualquer timeout de proxy no caminho.

```ts
import { Server } from 'socket.io'

const io = new Server(httpServer, {
  path: '/socket.io/',        // servidor e cliente PRECISAM coincidir
  serveClient: true,          // serve o bundle em /socket.io/socket.io.js
  connectTimeout: 45_000,     // derruba quem não entra num namespace a tempo

  pingInterval: 25_000,       // servidor manda ping a cada 25 s
  pingTimeout: 20_000,        // e espera o pong por 20 s
  maxHttpBufferSize: 1e6,     // 1 MB: acima disso a conexão é FECHADA
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  perMessageDeflate: false,   // desligado por padrão: custa CPU e memória
  httpCompression: true,
  allowEIO3: false,           // true só para aceitar clientes v2
})

// allowRequest: recusa o handshake antes de qualquer alocação de sessão.
// Útil como primeira barreira, mas NÃO substitui io.use — ele não tem Socket.
```

```ts
// caso real — kernel.core.ts: opções lidas do leitor de ENV síncrono
// (_standards/backend-fastify.md §7), nunca hard-coded no arquivo do socket
import { Server } from 'socket.io'
import { ENV } from '@application/core/env.core'

const io = new Server(httpServer, {
  path: ENV.SOCKET_PATH,
  cors: { origin: ENV.APP_ORIGIN, credentials: true },
  maxHttpBufferSize: 2e6, // import de planilha manda payload maior que 1 MB
})
```

```ts
// errado — path diferente em cada lado, ou achar que connectTimeout é o ping
const io = new Server(httpServer, { path: '/ws/' })
const socket = io(url) // default '/socket.io/': NUNCA conecta

// certo — os dois lados declaram o MESMO path
const io = new Server(httpServer, { path: '/ws/' })
const socket = io(url, { path: '/ws/' })
// connectTimeout (45s) derruba quem não entra num namespace a tempo; não
// confundir com pingInterval+pingTimeout, que é o heartbeat de quem já entrou
```

#### server-instance
[doc](https://socket.io/docs/v4/server-instance/)

**O que é:** a instância `io`: `io.engine`, utilitários de cluster (`fetchSockets`, `socketsJoin`,
`socketsLeave`, `disconnectSockets`) e `serverSideEmit`.
**Para que serve:** agir sobre sockets que **não estão neste processo**, com o adapter fazendo a
ponte.
**Quando usar:** ao implementar logout global, ao contar conexões, e ao diagnosticar handshakes que
falham — `io.engine.on("connection_error")` é o único lugar onde eles aparecem.

```ts
io.engine.clientsCount // conexões de baixo nível abertas

// Handshakes recusados NÃO passam por "connection". Só aqui:
io.engine.on('connection_error', (err) => {
  console.log(err.code, err.message) // 1 = "Session ID unknown", 5 = protocolo
})

// Expulsar todas as sessões de um usuário, em todo o cluster:
await io.in('user:123').disconnectSockets()

// Ler sockets remotos (id, handshake, rooms, data são acessíveis):
const sockets = await io.in('team:42').fetchSockets()

// Mensagem entre servidores (não chega a cliente nenhum):
io.serverSideEmit('cache:invalidate', { key: 'teams' })
```

```ts
// caso real — session-revocation.service.ts: método chamado pelo use-case de
// logout, recebendo a instância `io` já aberta em bin/server.ts
import { Service } from 'fastify-decorators'
import type { Server as SocketIOServer } from 'socket.io'

@Service()
export default class SessionRevocationService {
  async revokeUser(io: SocketIOServer, userId: string): Promise<void> {
    // expulsa em TODO o cluster, não só neste processo
    await io.in(`user:${userId}`).disconnectSockets()
  }
}
```

```ts
// errado — tratar fetchSockets como leitura local, síncrona e barata
const sockets = io.in('team:42').fetchSockets()
console.log(sockets.length) // undefined: é uma Promise, não um array

// certo — await, e só quando precisar atravessar processos
const sockets = await io.in('team:42').fetchSockets()
console.log(sockets.length)
// por quê: fetchSockets pergunta a CADA nó do cluster pelo adapter; usar como
// substituto de um contador local é round-trip de rede a cada chamada
```

#### server-socket-instance
[doc](https://socket.io/docs/v4/server-socket-instance/)

**O que é:** o `socket` do lado servidor: `id`, `handshake`, `rooms`, `data`, `conn`, `socket.use` e
os eventos `disconnect`/`disconnecting`.
**Para que serve:** saber onde guardar estado por conexão e onde ler o que o cliente mandou no
handshake.
**Quando usar:** sempre. Duas regras saem daqui: **`socket.data` é o lugar do usuário autenticado**
(porque é o que o `fetchSockets()` expõe entre servidores), e **`socket.id` não é identidade** — é
efêmero e muda a cada reconexão.

```ts
io.on('connection', (socket) => {
  socket.handshake.auth     // o que o cliente mandou em `auth`
  socket.handshake.query    // query string (NÃO muda durante a sessão)
  socket.handshake.headers  // headers da requisição inicial
  socket.handshake.address  // IP (atrás de proxy, depende do X-Forwarded-For)

  socket.data.user = user   // visível via io.fetchSockets() em outro nó
  socket.rooms              // Set; contém o próprio socket.id

  // Middleware por PACOTE: roda a cada evento recebido, ao contrário de io.use
  socket.use(([event, ...args], next) => {
    if (!can(socket.data.user, event)) return next(new Error('forbidden'))
    next()
  })

  // disconnecting roda ANTES de esvaziar socket.rooms
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) socket.to(room).emit('user:left', socket.data.user.id)
  })

  // reasons: "server shutting down", "ping timeout", "transport close",
  //          "transport error", "parse error", "client namespace disconnect"…
  socket.on('disconnect', (reason) => {})
})
```

```ts
// caso real — notification-socket.service.ts: namespace que junta room por
// usuário a partir de socket.data, preenchido pelo middleware de auth
import { Service } from 'fastify-decorators'
import type { Namespace, Server as SocketIOServer } from 'socket.io'

@Service()
export default class NotificationSocketService {
  create(io: SocketIOServer): Namespace {
    const namespace = io.of('/notifications')
    namespace.on('connection', (socket) => {
      const userId = socket.data.user.sub
      socket.join(`user:${userId}`)
    })
    return namespace
  }
}
```

```ts
// errado — usar socket.id como chave de identidade do usuário
const sessionsByUser = new Map<string, string>()
sessionsByUser.set(socket.id, socket.data.user.id) // chave MUDA a cada reconexão

// certo — identidade vem de socket.data, preenchido no handshake pelo io.use
io.on('connection', (socket) => {
  const userId: string = socket.data.user.id
})
// por quê: socket.id é 20 caracteres aleatórios, regenerado em TODA
// reconexão e diferente por aba — nunca sobrevive a um F5
```

#### server-api
[doc](https://socket.io/docs/v4/server-api/)

**O que é:** a referência completa do servidor: classes `Server`, `Namespace` e `Socket`, com todos
os métodos, eventos e flags.
**Para que serve:** conferir assinatura exata em vez de adivinhar.
**Quando usar:** quando o guia menciona um método e você precisa do contrato. As **flags** estão aqui
e são fáceis de esquecer: `volatile`, `local`, `compress`, `broadcast`.

```ts
// Flags, todas encadeáveis antes do emit:
socket.volatile.emit('cursor', pos)   // descarta se a conexão não estiver pronta
io.local.emit('metrics', data)        // só os clientes DESTE nó (ignora o adapter)
socket.compress(false).emit('ping')   // desliga a compressão deste pacote
socket.broadcast.emit('joined')       // todos menos o remetente

// Namespace: mesma superfície de broadcast do io
io.of('/admin').to('room1').except('room2').emit('event')

// Fechar o servidor (encerra as conexões e libera a porta)
await io.close()
```

```ts
// caso real — storage-migration-worker.service.ts: broadcast restrito à room
// do plano, lido do contrato do namespace (padrão contract/impl)
import type { Namespace } from 'socket.io'

export class StorageMigrationWorkerService {
  emitProgress(namespace: Namespace, jobId: string, filename: string): void {
    namespace.emit('storage-migration:progress', { jobId, filename })
  }
}
```

```ts
// errado — `broadcast` não existe em `io`, só em `socket` (quem é "o remetente"
// só faz sentido dentro de uma conexão)
io.broadcast.emit('e', data) // TypeError: broadcast não é propriedade de Server

// certo — fora de um handler de socket, use io.emit (não há remetente a excluir)
io.emit('e', data)
// dentro de io.on('connection', (socket) => { ... }), aí sim:
socket.broadcast.emit('e', data)
```

#### server-application-structure
[doc](https://socket.io/docs/v4/server-application-structure/)

**O que é:** duas formas de organizar os handlers quando o arquivo de entrada cresce.
**Para que serve:** não terminar com um `io.on('connection')` de trezentas linhas.
**Quando usar:** no terceiro grupo de eventos. A doc avisa que são sugestões, não regras — e que a
forma descentralizada deixa o ponto de entrada limpo ao custo de tornar os listeners menos
descobríveis.

```ts
// app/realtime/handlers/post.ts (convenção sugerida)
export function registerPostHandlers(io: Server, socket: Socket) {
  socket.on('post:create', createPost)
  socket.on('post:read', readPost)
}

// app/realtime/index.ts
io.on('connection', (socket) => {
  registerPostHandlers(io, socket)
  registerTeamHandlers(io, socket)
})

// Namespace de evento com prefixo ("post:create", não "createPost") não é
// exigência da biblioteca, mas é o que a doc usa e o que mantém a lista legível.
```

## Cliente

#### client-installation
[doc](https://socket.io/docs/v4/client-installation/)

**O que é:** as três formas de obter o cliente — npm, o bundle servido pelo próprio servidor, e CDN —
e as variantes de bundle com seus tamanhos.
**Para que serve:** escolher entre `socket.io.js` (34,7 kB gzip, com debug) e `socket.io.min.js`
(14,7 kB min+gzip, sem debug).
**Quando usar:** ao montar o frontend. Os tipos vêm no pacote: **`@types/socket.io-client` não é mais
necessário**.

```bash
npm install socket.io-client
```

```html
<!-- O servidor serve o bundle e registra o global `io` -->
<script src="/socket.io/socket.io.js"></script>

<!-- Desligue com serveClient: false se você empacota o cliente você mesmo -->
```

```ts
// Variantes publicadas:
// socket.io.js              34,7 kB gzip  — com debug, para desenvolvimento
// socket.io.min.js          14,7 kB min+gzip — produção
// socket.io.msgpack.min.js  15,3 kB min+gzip — produção, com parser msgpack
```

#### client-initialization
[doc](https://socket.io/docs/v4/client-initialization/)

**O que é:** as formas de chamar `io()`: mesma origem, origem diferente, namespace.
**Para que serve:** apontar o cliente para o servidor certo, no namespace certo.
**Quando usar:** no primeiro `io()`. A pegadinha mora aqui: **o que parece caminho na URL é
namespace**. `io('/admin')` não muda o caminho da requisição — conecta ao namespace `/admin`. Caminho
se muda com a opção `path`.

```ts
import { io } from 'socket.io-client'

const a = io()                                   // mesma origem, via window.location
const b = io('https://api.example.com')          // origem diferente: exige CORS no servidor
const c = io('/admin')                           // NAMESPACE /admin, mesma origem
const d = io('https://api.example.com/admin')    // namespace /admin em outra origem

// Caminho é outra coisa, e tem de bater com o servidor:
const e = io('https://api.example.com', { path: '/ws/' })
```

```ts
// caso real — use-team-socket.ts: hook React 19 que abre o namespace do
// módulo, no padrão de hooks/use-kebab-case.ts (_standards/frontend.md §7)
import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { openSocket } from '@/lib/socket-registry'

export function useTeamSocket(baseUrl: string): { socket: Socket | null } {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const { socket, close } = openSocket(`${baseUrl}/team`, '')
    socketRef.current = socket
    return (): void => {
      close()
      socketRef.current = null
    }
  }, [baseUrl])

  return { socket: socketRef.current }
}
```

```ts
// errado — ler "/admin" como caminho da requisição e esperar outra rota HTTP
const socket = io('/admin') // conecta ao mesmo host, caminho /socket.io/

// certo — "/admin" é NAMESPACE; caminho é a opção `path`
const socket = io('/admin', { path: '/socket.io/' })
// por quê: a doc separa os dois sem ambiguidade — mudar o caminho precisa da
// opção `path` nos DOIS lados; o primeiro segmento do io() nunca é rota HTTP
```

#### client-options
[doc](https://socket.io/docs/v4/client-options/)

**O que é:** a lista completa de opções do cliente, separadas em fábrica `io`, engine de baixo nível,
Manager e Socket.
**Para que serve:** controlar reconexão, transportes, credenciais e retentativa.
**Quando usar:** ao ajustar comportamento de rede. Note o default de `reconnectionAttempts`:
**`Infinity`** — o cliente tenta para sempre, com delay que dobra até `reconnectionDelayMax` (5 s) e
`randomizationFactor` 0.5 para não criar avalanche quando o servidor volta.

```ts
const socket = io('https://api.example.com', {
  // engine
  transports: ['polling', 'websocket'],
  upgrade: true,
  withCredentials: false,       // true para mandar cookie em cross-origin
  auth: (cb) => cb({ token }),  // função: reavaliada a cada reconexão
  query: { version: '2' },      // NÃO muda durante a sessão
  extraHeaders: { 'X-Trace': 'abc' }, // ignorado no navegador com WebSocket puro
  rememberUpgrade: false,       // true pula o polling após um WebSocket bem-sucedido

  // manager
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 5_000,
  randomizationFactor: 0.5,
  timeout: 20_000,
  autoConnect: true,

  // socket (4.6.0+): entrega "at least once" do cliente para o servidor
  retries: 3,
  ackTimeout: 10_000,
})

// forceNew: true / multiplex: false criam um Manager novo, ou seja, uma CONEXÃO
// nova. Sem isso, dois io('/a') e io('/b') compartilham o mesmo WebSocket.
```

#### client-socket-instance
[doc](https://socket.io/docs/v4/client-socket-instance/)

**O que é:** o `socket` do cliente: `id`, `connected`, `active`, `io` (o Manager) e os três eventos
de ciclo de vida.
**Para que serve:** distinguir "caiu e vai voltar" de "fui recusado e não vou voltar".
**Quando usar:** **em todo aplicativo**. `socket.active` é o atributo que decide isso: `false` no
`connect_error` significa que um middleware do servidor recusou, e nenhuma reconexão automática vai
acontecer — só `socket.connect()` manual.

```ts
socket.on('connect', () => {
  // NÃO registre socket.on(...) aqui dentro: reconecta, registra de novo, duplica
  console.log(socket.id, socket.recovered)
})

socket.on('connect_error', (error) => {
  if (socket.active) {
    // falha temporária: o cliente já está reagendando a tentativa
  } else {
    // recusado pelo middleware; error.message veio do next(new Error(...))
    console.log(error.message)
  }
})

socket.on('disconnect', (reason) => {
  // "io server disconnect" e "io client disconnect" NÃO reconectam sozinhos
  if (!socket.active) socket.connect()
})

// Reservados, não use como nome de evento seu:
// connect, connect_error, disconnect, disconnecting, newListener, removeListener
```

```ts
// caso real — use-job-socket.ts: hook devolve o status de conexão lido do
// próprio socket, sem useState espelhando evento por evento
import { useRef } from 'react'
import type { Socket } from 'socket.io-client'

export function useConnectionStatus(socket: Socket | null): boolean {
  const statusRef = useRef(Boolean(socket?.connected))
  statusRef.current = Boolean(socket?.connected)
  return statusRef.current
}
```

```ts
// errado — reconectar manualmente sem checar se já há retry agendado
socket.on('connect_error', () => {
  socket.connect() // ou já está tentando (active), ou foi recusado (não vai colar)
})

// certo — connect() manual só quando active já é false
socket.on('connect_error', () => {
  if (!socket.active) return // recusado por middleware; reconectar não ajuda
  // active === true: o Manager já está reagendando sozinho
})
```

#### client-api
[doc](https://socket.io/docs/v4/client-api/)

**O que é:** a referência do cliente: a fábrica `io()`, a classe `Manager` e a classe `Socket`.
**Para que serve:** achar os eventos do Manager, que não são os do Socket e quase ninguém conhece.
**Quando usar:** ao construir indicador de status de conexão. `reconnect_attempt`, `reconnect_error`
e `reconnect_failed` vivem em `socket.io`, o Manager — não em `socket`.

```ts
// Eventos do Manager (o transporte), e não do Socket (a sessão do namespace):
socket.io.on('reconnect_attempt', (n) => setStatus(`tentativa ${n}`))
socket.io.on('reconnect', (n) => setStatus('online'))
socket.io.on('reconnect_error', (error) => {})
socket.io.on('reconnect_failed', () => setStatus('desisti'))  // só com reconnectionAttempts finito
socket.io.on('ping', () => {})
socket.io.on('error', (error) => {})

// Métodos do Socket:
socket.connect()      // com autoConnect: false, ou após recusa
socket.disconnect()   // encerra: não haverá reconexão automática
const ack = await socket.timeout(5_000).emitWithAck('post:read', id)
```

#### client-offline-behavior
[doc](https://socket.io/docs/v4/client-offline-behavior/)

**O que é:** o que acontece com os eventos emitidos enquanto o cliente está desconectado.
**Para que serve:** evitar a enxurrada de eventos antigos quando a conexão volta.
**Quando usar:** **antes de emitir qualquer coisa numa tela que fica aberta o dia todo**. O default é
bufferizar, e a doc diz literalmente que qualquer evento emitido desconectado fica na fila **até a
reconexão** — dez minutos offline viram uma avalanche na volta.

```ts
// Default: fila. Se a queda durar, tudo chega de uma vez depois.
socket.emit('cursor:move', pos)

// Opção 1: só emite se estiver conectado
if (socket.connected) {
  socket.emit('cursor:move', pos)
} else {
  // decida: descartar, guardar localmente, avisar o usuário
}

// Opção 2: volátil — descartado se a conexão não estiver pronta.
// Certo para dado onde só o último valor importa (posição, presença, telemetria).
socket.volatile.emit('cursor:move', pos)

// Para dado que NÃO pode sumir, buffer não basta: use ack + retries (ver
// delivery-guarantees), porque um F5 descarta a fila inteira.
```

```ts
// caso real — use-chat-socket.ts: cursor de presença é descartável, mensagem
// de chat não — os dois usam o MESMO socket, com emissões diferentes
import type { Socket } from 'socket.io-client'

export function sendTyping(socket: Socket): void {
  socket.volatile.emit('chat:typing') // perde sem problema numa queda
}

export function sendMessage(socket: Socket, text: string): void {
  socket.emit('chat:message', text) // fica na fila; chega quando reconectar
}
```

```ts
// errado — supor que o buffer do cliente sobrevive a um F5
socket.emit('post:create', payload) // usuário recarrega a aba antes de reconectar
// o payload nunca saiu do processo do navegador: está perdido, sem erro algum

// certo — dado que não pode sumir usa ack e trata a falta de resposta
const result = await socket.timeout(5_000).emitWithAck('post:create', payload)
// se o F5 acontecer antes do ack, a Promise nem resolve: trate como falha
```

## Eventos, rooms e namespaces

#### emitting-events
[doc](https://socket.io/docs/v4/emitting-events/)

**O que é:** o `emit`, a serialização automática, os acknowledgements, o `timeout` e os eventos
voláteis.
**Para que serve:** mandar dado nas duas direções com a mesma API.
**Quando usar:** sempre. Duas armadilhas de serialização: **`Date` vira string** (ISO) na travessia, e
**`Map`/`Set` não sobrevivem** — precisam ser convertidos à mão.

```ts
// Qualquer número de argumentos, estruturas serializáveis e binário (Buffer,
// TypedArray) — sem JSON.stringify manual.
socket.emit('post:create', { title: 'Olá' }, buffer)

// Acknowledgement: o último argumento é o callback
socket.emit('post:read', id, (post) => console.log(post))

// Com timeout (4.4.0+): o primeiro argumento do callback é o erro
socket.timeout(5_000).emit('post:read', id, (err, post) => {
  if (err) return // ninguém respondeu a tempo
})

// Versão em promise
const post = await socket.timeout(5_000).emitWithAck('post:read', id)

// Volátil: como UDP. Não bufferiza, descarta.
socket.volatile.emit('cursor', pos)

// Pegadinhas de serialização:
socket.emit('x', new Date())          // chega como string ISO
socket.emit('x', new Set([1, 2]))     // NÃO sobrevive: mande [...set]
```

```ts
// caso real — file-import-socket.service.ts: progresso com ack, sem any
import type { Namespace } from 'socket.io'

export class FileImportSocketService {
  async notifyJoin(namespace: Namespace, jobId: string): Promise<void> {
    const sockets = await namespace.in(`job:${jobId}`).fetchSockets()
    for (const socket of sockets) {
      socket.emit('import:joined', { jobId }, (receivedAt: number) => {
        console.log('cliente confirmou em', receivedAt)
      })
    }
  }
}
```

```ts
// errado — handler do servidor nunca chama o ack: a Promise do cliente
// trava até o timeout, mesmo quando o trabalho deu certo
socket.on('post:create', async (payload) => {
  await createPost(payload) // ack esquecido
})

// certo — todo handler com ack responde em TODO caminho, inclusive erro
socket.on('post:create', async (payload, ack) => {
  try {
    const post = await createPost(payload)
    ack?.({ ok: true, post })
  } catch {
    ack?.({ ok: false })
  }
})
```

#### listening-to-events
[doc](https://socket.io/docs/v4/listening-to-events/)

**O que é:** `on`, `once`, `off`, `removeAllListeners` e os listeners "pega-tudo" (`onAny`,
`onAnyOutgoing`, `prependAny`).
**Para que serve:** receber eventos e instrumentar o tráfego.
**Quando usar:** sempre — e leia o aviso da doc: **"There is currently no built-in error handling in
the Socket.IO library"**. Uma exceção não capturada num listener sobe até o processo.

```ts
socket.on('post:created', (post) => {
  try {
    render(post)
  } catch (error) {
    report(error) // a biblioteca NÃO captura isto por você
  }
})

socket.once('ready', init)
socket.off('post:created', handler)
socket.removeAllListeners('post:created')

// Instrumentação: log de tudo que entra e sai
socket.onAny((event, ...args) => log('in', event, args))
socket.onAnyOutgoing((event, ...args) => log('out', event, args))

// Pegadinha: callbacks de acknowledgement NÃO passam pelos listeners pega-tudo.
```

```ts
// caso real — use-job-socket.ts: listener registrado uma vez, `off` no cleanup
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'

export function useJobProgress(socket: Socket, onProgress: (pct: number) => void): void {
  useEffect(() => {
    socket.on('job:progress', onProgress)
    return (): void => {
      socket.off('job:progress', onProgress)
    }
  }, [socket, onProgress])
}
```

```ts
// errado — registrar o listener DENTRO do handler de connect
socket.on('connect', () => {
  socket.on('post:created', render) // um novo a cada reconexão: handler roda N vezes
})

// certo — registra uma vez, fora de qualquer evento de ciclo de vida
socket.on('post:created', render)
socket.on('connect', () => {
  console.log('conectado', socket.id) // só o que É sobre o connect
})
```

#### broadcasting-events
[doc](https://socket.io/docs/v4/broadcasting-events/)

**O que é:** `io.emit` para todos, `socket.broadcast.emit` para todos menos o remetente, broadcast com
acknowledgement e a flag `local`.
**Para que serve:** falar com muitos clientes de uma vez.
**Quando usar:** em qualquer notificação. Saiba o que broadcast **não** faz: a doc é explícita —
clientes desconectados ou reconectando **não recebem**, e não há reenvio.

```ts
io.emit('announcement', 'manutenção às 22h')      // todos, deste nó e dos outros
socket.broadcast.emit('user:joined', socket.id)    // todos menos quem emitiu
io.local.emit('metrics', data)                     // só este nó, ignora o adapter

// Broadcast com ack (4.5.0+): uma resposta por cliente
io.timeout(5_000).emit('ping', (err, responses) => {
  if (err) {
    // ALGUNS clientes não responderam a tempo — responses fica indisponível
  } else {
    console.log(responses.length)
  }
})

// Com vários servidores, broadcast SÓ atravessa nós se houver adapter.
// Sem adapter, io.emit alcança apenas os clientes do processo atual.
```

```ts
// caso real — notification-socket.service.ts: broadcast restrito à room do
// usuário+plano, nunca io.emit solto (vazaria entre ambientes)
import type { Namespace } from 'socket.io'
import { userPlaneRoom } from '@application/core/workspace-scope.core'

export function notifyUser(namespace: Namespace, userId: string, workspaceId: string): void {
  namespace.to(userPlaneRoom(userId, workspaceId)).emit('notification:created', { userId })
}
```

```ts
// errado — supor que quem estava desconectado recebeu o broadcast na volta
io.to('team:42').emit('post:created', post) // cliente caiu 2s antes: PERDIDO

// certo — se o evento importa, reenvie no reconnect, não confie no broadcast
io.on('connection', async (socket) => {
  if (!socket.recovered) socket.emit('post:list', await loadRecentPosts())
})
// por quê: a doc é explícita — broadcast não tem reenvio; quem não estava
// com o socket aberto no instante do emit nunca mais recebe aquele pacote
```

#### emit-cheatsheet
[doc](https://socket.io/docs/v4/emit-cheatsheet/)

**O que é:** a folha de consulta com todas as formas de emitir, lado a lado.
**Para que serve:** achar a combinação certa de modificadores sem reler três páginas.
**Quando usar:** deixe aberta enquanto escreve a camada de realtime. É a página que mostra que os
modificadores **encadeiam**.

```ts
// Servidor, dentro de io.on('connection', (socket) => { … })
socket.emit('e', data)                                  // só para o remetente
io.emit('e', data)                                      // para todos
socket.broadcast.emit('e', data)                        // todos menos o remetente
io.to('room1').emit('e', data)                          // uma room
socket.to('room1').emit('e', data)                      // a room, menos o remetente
io.to('room1').to('room2').except('room3').emit('e', d) // união menos exceção
io.to(socketId).emit('e', data)                         // um socket específico
io.of('/admin').emit('e', data)                         // um namespace

// Entre servidores (4.1.0+), não chega a cliente nenhum
io.serverSideEmit('sync', payload)

// Reservados, em qualquer lado:
// connect, connect_error, disconnect, disconnecting, newListener, removeListener
```

#### rooms
[doc](https://socket.io/docs/v4/rooms/)

**O que é:** rooms — canais arbitrários em que sockets entram e saem — e a sua implementação no
adapter.
**Para que serve:** endereçar subconjuntos de clientes sem manter listas próprias.
**Quando usar:** **em vez de guardar `socket.id` num Map seu**. A room é o mecanismo que o adapter
entende e que, portanto, funciona entre servidores; um Map local não funciona. Lembre: **room é
conceito só do servidor** — o cliente não entra em room nem sabe em quais está.

```ts
io.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`)   // todas as abas do mesmo usuário
  socket.join(`team:${teamId}`)                // todo mundo de um time

  // Todo socket já está numa room com o próprio id — é como io.to(socketId) funciona.
})

io.to(`team:${teamId}`).emit('post:created', post)

// União: quem está nas duas recebe UMA vez só
io.to('room1').to('room2').emit('e')

// Saída é automática na desconexão. Para ver as rooms antes de esvaziarem:
socket.on('disconnecting', () => { /* socket.rooms ainda está cheio */ })

// O adapter emite: create-room, delete-room, join-room, leave-room (3.1.0+)
io.of('/').adapter.on('join-room', (room, id) => {})
```

```ts
// caso real — job-room-namespace.base.ts: room por job, só depois de provar
// posse (payload, dono, plano) — nunca join sem checagem
export function jobRoom(jobId: string): string {
  return `job:${jobId}`
}

export async function joinJob(socket: { join: (room: string) => void }, jobId: string): Promise<void> {
  const owns = await userOwnsJob(socket.data.user.id, jobId)
  if (!owns) return
  socket.join(jobRoom(jobId))
}
```

```ts
// errado — Map local ligando socket.id a um canal de negócio
const roomByUser = new Map<string, string>()
roomByUser.set(socket.id, `team:${teamId}`) // só existe NESTE processo

// certo — a room, que o adapter conhece em todo o cluster
socket.join(`team:${teamId}`)
io.to(`team:${teamId}`).emit('post:created', post)
// por quê: com mais de um nó, o Map local não alcança quem está no outro nó;
// a room é o único mecanismo que o adapter propaga entre processos
```

#### namespaces
[doc](https://socket.io/docs/v4/namespaces/)

**O que é:** namespaces — canais de comunicação que dividem a lógica sobre **uma conexão
compartilhada** (multiplexação), cada um com seus handlers, rooms e middlewares.
**Para que serve:** separar domínios (`/chat`, `/admin`) sem abrir uma segunda conexão.
**Quando usar:** quando os grupos de eventos têm autorizações diferentes. E cuidado com o namespace
dinâmico por regex: a doc avisa que ele **permite a qualquer cliente criar um namespace novo** só
conectando a um nome que case — consumo de recurso inesperado. A forma em função permite autorizar.

```ts
const admin = io.of('/admin')

// Middleware É por namespace: o de io.use NÃO protege /admin
admin.use((socket, next) => {
  try {
    if (!isAdmin(socket.handshake.auth.token)) return next(new Error('forbidden'))
    next()
  } catch {
    next(new Error('forbidden')) // NUNCA next() no catch
  }
})

admin.on('connection', (socket) => { /* … */ })

// Dinâmico por regex: qualquer cliente pode criar um namespace que case
io.of(/^\/team-\d+$/)

// Dinâmico por função: você decide quem pode
io.of((name, auth, next) => next(null, canAccess(name, auth)))

// cleanupEmptyChildNamespaces (4.6.0+) descarta os que ficam vazios
const io = new Server(httpServer, { cleanupEmptyChildNamespaces: true })
```

```ts
// caso real — socket-namespace.base.ts: contrato que todo namespace do
// domínio implementa (notificação, import de arquivo, migração de storage)
import type { Namespace, Server as SocketIOServer } from 'socket.io'

export abstract class SocketNamespaceBase {
  private current: Namespace | null = null

  protected abstract create(io: SocketIOServer): Namespace

  init(io: SocketIOServer): Namespace {
    this.current = this.create(io)
    return this.current
  }
}
```

```ts
// errado — namespace dinâmico por regex, sem checagem de quem pode entrar
io.of(/^\/team-\d+$/) // qualquer cliente cria um namespace novo só conectando

// certo — forma em função: você decide, com await se precisar consultar o banco
io.of((name, auth, next) => {
  void canAccessTeamNamespace(name, auth).then((allowed) => next(null, allowed))
})
// por quê: a doc avisa que o regex aceita qualquer nome que case — é
// consumo de recurso sem controle; a função é o único ponto de autorização
```

## Middleware, autenticação e CORS

#### middlewares
[doc](https://socket.io/docs/v4/middlewares/)

**O que é:** `io.use((socket, next) => {})` — a função que roda **uma vez por conexão**, antes do
evento `connection`, e o caminho oficial da autenticação.
**Para que serve:** validar credencial, carregar o usuário, recusar quem não passa.
**Quando usar:** em toda aplicação com login, e **este é o bloco mais fácil de errar da biblioteca**.
Três regras:

1. **Falhe fechado.** Todo caminho de erro — `catch`, rejeição de promise, token ausente, chave
   expirada — termina em `next(new Error(...))`. Um `catch` que chama `next()` autentica o atacante.
2. **Sempre chame `next()`, de um jeito ou de outro.** A doc: sem isso "the connection will be left
   hanging until it is closed after a given timeout".
3. **Repita em cada namespace.** `namespace.use` é independente de `io.use`; um namespace sem
   middleware é um namespace sem autenticação.

E lembre do limite estrutural: o middleware roda no handshake e **não roda de novo**. Revogação de
sessão depois disso exige `socket.use` por pacote, verificação dentro do handler, ou
`disconnectSockets()`.

```ts
// Cliente manda a credencial em `auth` (objeto ou função)
const socket = io({ auth: (cb) => cb({ token: readToken() }) })

// Servidor
io.use(async (socket, next) => {
  try {
    const user = await verify(socket.handshake.auth.token)
    if (!user) return next(new Error('unauthorized'))
    socket.data.user = user
    return next()
  } catch {
    return next(new Error('unauthorized'))   // fecha. Nunca next().
  }
})

// Erro com dado estruturado para o cliente
io.use((socket, next) => {
  const err = new Error('not authorized')
  err.data = { content: 'Please retry later' }
  next(err)
})

// No cliente:
socket.on('connect_error', (err) => console.log(err.message, err.data))

// Middleware do Express sobre CADA requisição HTTP, inclusive o upgrade (4.6.0+):
io.engine.use(helmet())
```

```ts
// caso real — socket-auth.service.ts: método público chamado por CADA
// namespace, porque io.use não protege namespace nenhum
import { Service } from 'fastify-decorators'
import type { Namespace, Socket } from 'socket.io'

@Service()
export default class SocketAuthService {
  protect(namespace: Namespace, decode: (token: string) => { sub: string } | null): void {
    namespace.use((socket: Socket, next) => {
      void this.authorize(socket, next, decode)
    })
  }

  private async authorize(
    socket: Socket,
    next: (error?: Error) => void,
    decode: (token: string) => { sub: string } | null,
  ): Promise<void> {
    try {
      const decoded = decode(socket.handshake.auth.token)
      if (!decoded) return next(new Error('unauthorized'))
      socket.data.user = decoded
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  }
}
```

```ts
// errado — proteger io, e achar que /admin herdou a proteção
io.use(authenticate)
const admin = io.of('/admin') // SEM middleware próprio: aberto a qualquer um

// certo — cada namespace registra o seu
io.use(authenticate)
const admin = io.of('/admin')
admin.use(authenticate)
// por quê: a doc trata namespace.use como independente de io.use — não há
// herança entre eles, nem do namespace "/" para os outros
```

#### handling-cors
[doc](https://socket.io/docs/v4/handling-cors/)

**O que é:** a opção `cors` do servidor e o `withCredentials` do cliente.
**Para que serve:** deixar o frontend em outro domínio conectar.
**Quando usar:** sempre que API e app não compartilham origem — desde a v3 o CORS precisa ser
**habilitado explicitamente**. Duas coisas que a página deixa claras e que confundem muita gente:
`origin: '*'` é **incompatível** com `credentials: true`; e CORS só vale para o **long-polling** — a
conexão WebSocket não passa por CORS.

```ts
const io = new Server(httpServer, {
  cors: {
    origin: ['https://app.example.com'],  // liste as origens; não use '*' com credenciais
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['X-Trace'],
    maxAge: 86_400,
  },
})

// Cliente: os dois lados têm de concordar
const socket = io('https://api.example.com', { withCredentials: true })

// Diagnóstico rápido: se isto responde, o servidor está acessível e o CORS é o
// problema — e não a rede.
// curl "https://api.example.com/socket.io/?EIO=4&transport=polling"

// Sintoma de cookie: cross-site exige SameSite=None; Secure.
```

## Erro de conexão, desconexão e entrega

#### troubleshooting-connection-issues
[doc](https://socket.io/docs/v4/troubleshooting-connection-issues/)

**O que é:** o catálogo de falhas: não conecta, desconecta sempre, fica preso no long-polling.
**Para que serve:** ir do sintoma à causa sem chutar.
**Quando usar:** **abra esta antes de qualquer outra quando algo não conecta**. As causas com número
de erro, direto da página:

| Sintoma | Causa provável |
|---|---|
| `{"code":5,"message":"Unsupported protocol version"}` | Cliente v1/v2 contra servidor v3/v4 — `allowEIO3: true` aceita v2 |
| `{"code":1,"message":"Session ID unknown"}` (HTTP 400) | Vários nós sem sticky session |
| "The Same Origin Policy disallows…" | CORS não habilitado no servidor |
| Desconexão a cada ~60 s | Timeout do proxy menor que `pingInterval + pingTimeout` (45 s) |
| Preso em polling, `TRANSPORT_MISMATCH` | Proxy sem os headers de upgrade de WebSocket |
| Handler dispara N vezes | Listener registrado dentro do handler de `connect` |

```ts
// O teste que separa "servidor fora" de "CORS/proxy":
// curl "https://api.example.com/socket.io/?EIO=4&transport=polling"
// -> deve devolver algo como 0{"sid":"…","upgrades":["websocket"],…}

// Payload grande derruba a conexão por DOIS motivos:
// 1. acima de maxHttpBufferSize (1 MB)
// 2. o upload demora mais que pingTimeout
const io = new Server(httpServer, { maxHttpBufferSize: 5e6, pingTimeout: 30_000 })
```

```ts
// caso real — health.controller.ts: expõe o sintoma antes que o usuário abra
// chamado, em vez de caçar log depois que a reclamação chega
import { Controller, GET } from 'fastify-decorators'
import type { Server as SocketIOServer } from 'socket.io'

@Controller('/health')
export default class {
  constructor(private readonly realtime: RealtimeContractService) {}

  @GET({ url: '/realtime' })
  check(): { clients: number } {
    const io: SocketIOServer = this.realtime.instance()
    return { clients: io.engine.clientsCount }
  }
}
```

```ts
// errado — ligar allowEIO3 "para ver se resolve" sem saber a causa
const io = new Server(httpServer, { allowEIO3: true }) // aceita cliente v2 de novo

// certo — primeiro confirme a causa com o teste da própria doc
// curl "https://api.example.com/socket.io/?EIO=4&transport=polling"
// code 5 "Unsupported protocol version" é SEMPRE cliente v1/v2 desatualizado
// certo -> atualizar socket.io-client, não reabrir suporte a protocolo antigo
```

#### tutorial/handling-disconnections
[doc](https://socket.io/docs/v4/tutorial/handling-disconnections)

**O que é:** a etapa do tutorial que declara as duas propriedades incômodas: o cliente nem sempre está
conectado, e o servidor não guarda eventos.
**Para que serve:** aceitar o problema antes de escolher a solução.
**Quando usar:** antes de projetar a feature. A frase da página é o resumo: **"Even over a stable
network, it is not possible to maintain a connection alive forever"** — e qualquer evento perdido
durante a queda está perdido, a menos que você faça algo.

```ts
// Reconexão é automática. Reentrega NÃO é.
// Três caminhos, em ordem crescente de esforço e de garantia:
//
// 1. Ignorar a perda           -> volatile emit; serve para presença, cursor
// 2. connection state recovery -> recupera pacotes de uma queda CURTA, sem garantia
// 3. Persistência própria      -> offset por evento; a única garantia de verdade

socket.on('connect', () => {
  if (socket.recovered) return       // sessão retomada, nada a fazer
  resyncFromServer()                 // sessão nova: rebusque o estado
})
```

```ts
// caso real — use-notifications-socket.ts: refaz a query ao reconectar sem
// recovery, em vez de confiar no que sobrou do cache antigo
import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'

export function useResyncOnReconnect(socket: Socket, client: QueryClient): void {
  useEffect(() => {
    function handleConnect(): void {
      if (socket.recovered) return
      void client.invalidateQueries({ queryKey: ['notifications'] })
    }
    socket.on('connect', handleConnect)
    return (): void => {
      socket.off('connect', handleConnect)
    }
  }, [socket, client])
}
```

```ts
// errado — tratar "reconectou" como "estado sincronizado"
socket.on('connect', () => {
  render(cachedState) // pode faltar tudo que aconteceu durante a queda
})

// certo — reconectar não é sincronizar; rebusque sempre que não houver recovery
socket.on('connect', () => {
  if (socket.recovered) return // só aqui o estado voltou sozinho
  void refetchEverythingRelevant()
})
// por quê: a doc separa as duas coisas — reconexão é do transporte,
// consistência de dado é problema que a aplicação resolve
```

#### delivery-guarantees
[doc](https://socket.io/docs/v4/delivery-guarantees)

**O que é:** o que Socket.IO garante (ordem) e o que não garante (entrega), com as receitas de "at
least once" nas duas direções.
**Para que serve:** decidir o que precisa de confirmação e o que pode se perder.
**Quando usar:** **antes de mandar qualquer coisa que não possa se perder**. A doc garante ordenação
em qualquer transporte, mas a entrega padrão é **at most once**: se a conexão cai no meio, ninguém
reenvia.

```ts
// Cliente -> servidor: at least once com retries (4.6.0+)
const socket = io({ retries: 3, ackTimeout: 10_000 })
socket.emit('post:create', payload)   // reenvia até retries + 1 vezes
// Ainda assim: um F5 no navegador descarta o que estava pendente.

// Servidor -> cliente: não existe opção, é padrão de aplicação.
// 1. dê um id/offset a cada evento e persista
// 2. o cliente devolve o último offset recebido no `auth` da reconexão
// 3. o servidor reenvia o que veio depois

// Servidor
io.on('connection', async (socket) => {
  const since = socket.handshake.auth.serverOffset
  if (since) for (const e of await loadEventsAfter(since)) socket.emit(e.name, e.data, e.id)
})

// Cliente
let serverOffset: string | undefined
const socket = io({ auth: (cb) => cb({ serverOffset }) })
socket.on('post:created', (post, id) => {
  serverOffset = id
})
```

```ts
// caso real — use-chat-socket.ts: mensagem de chat não pode se perder,
// então o socket do módulo liga retries no cliente
import { io } from 'socket.io-client'

export function openChatSocket(url: string): ReturnType<typeof io> {
  return io(url, { retries: 3, ackTimeout: 10_000 })
}

export function sendChatMessage(socket: ReturnType<typeof io>, text: string): void {
  socket.emit('chat:message', text) // reenviado até 4x se não vier ack
}
```

```ts
// errado — emitir sem ack e supor que a biblioteca reenvia sozinha
const socket = io(url) // retries default é 0: NADA se reenvia
socket.emit('post:create', payload)

// certo — "at least once" exige os dois: retries ligado E ack no handler
const socket = io(url, { retries: 3, ackTimeout: 10_000 })
socket.emit('post:create', payload, (ack: { ok: boolean }) => {})
// por quê: a doc condiciona o reenvio a existir um ack pendente; sem ack
// no evento, não há "pendente" para o cliente saber que precisa reenviar
```

#### connection-state-recovery
[doc](https://socket.io/docs/v4/connection-state-recovery)

**O que é:** o recurso que, após uma queda curta, restaura **id, rooms e `socket.data`** e reenvia os
pacotes perdidos.
**Para que serve:** tornar invisível o túnel, o elevador e a troca de rede.
**Quando usar:** quase sempre — é barato de ligar. Mas trate como otimização, não como garantia: a
doc diz que a recuperação **"will not always be successful"**, então o caminho de sessão nova
continua obrigatório. E dois cuidados: nunca `maxDisconnectionDuration: Infinity`, e
`skipMiddlewares: true` deixa voltar quem você acabou de bloquear.

```ts
const io = new Server(httpServer, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,   // true pula a reautenticação — cuidado
  },
})

io.on('connection', async (socket) => {
  if (socket.recovered) return   // id, rooms e data voltaram
  socket.join(`user:${socket.data.user.id}`)
  socket.emit('state:full', await loadState())
})
```

```ts
// caso real — chat-socket.service.ts: liga a recuperação com teto curto e
// NUNCA pula a reautenticação (skipMiddlewares falso é o default seguro)
import { Service } from 'fastify-decorators'
import { Server } from 'socket.io'

@Service()
export default class ChatSocketService {
  create(httpServer: import('node:http').Server): Server {
    return new Server(httpServer, {
      connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 },
    })
  }
}
```

```ts
// errado — tratar recovered como garantia e pular o carregamento inicial
io.on('connection', (socket) => {
  // nada de fallback: se a recuperação falhar, o cliente fica sem estado
})

// certo — recovered=false é o caminho ESPERADO, não excepcional
io.on('connection', async (socket) => {
  if (socket.recovered) return
  socket.emit('state:full', await loadState())
})
// por quê: a doc avisa que a recuperação "will not always be successful" —
// todo handler de connection precisa do caminho de sessão nova, sempre
```

| Adapter | Suporta recuperação |
|---|---|
| Em memória (padrão) | Sim |
| Redis Streams | Sim |
| MongoDB | Sim |
| Redis PUB/SUB | **Não** |
| Postgres, Cluster | Em andamento |

## Escala horizontal

#### adapter
[doc](https://socket.io/docs/v4/adapter/)

**O que é:** o componente do servidor responsável por **propagar broadcasts** — em memória por
padrão, substituível.
**Para que serve:** fazer `io.emit` alcançar clientes conectados a **outro** processo.
**Quando usar:** no instante em que houver mais de uma instância. Sem adapter, cada nó fala só com os
próprios clientes, e o bug aparece como "às vezes a notificação não chega".

```ts
// Oficiais: Redis (pub/sub), Redis Streams, MongoDB, Postgres, Cluster,
// Google Cloud Pub/Sub, AWS SQS, Azure Service Bus.

io.adapter(createAdapter(/* … */))

// Eventos que todo adapter emite:
io.of('/').adapter.on('create-room', (room) => {})
io.of('/').adapter.on('join-room', (room, id) => {})

// Quase todos têm um pacote "emitter" companheiro, para um processo de FORA do
// cluster (um worker, outro serviço) publicar para os clientes sem ser servidor
// Socket.IO.
```

```ts
// caso real — kernel.core.ts: adapter escolhido pelo ENV, nunca hard-coded —
// dev usa o padrão em memória, produção liga Redis
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { ENV } from '@application/core/env.core'

export function createRealtimeServer(httpServer: import('node:http').Server): Server {
  if (!ENV.REDIS_URL) return new Server(httpServer) // 1 nó: adapter em memória
  return new Server(httpServer, { adapter: createAdapter(pubClient, subClient) })
}
```

```ts
// errado — um worker de fila sobe o pacote adapter completo só para publicar
import { createAdapter } from '@socket.io/redis-adapter' // traz dependência do servidor

// certo — processo que só PUBLICA usa o pacote "emitter", mais leve
import { Emitter } from '@socket.io/redis-emitter'

const emitter = new Emitter(redisClient)
emitter.to('team:42').emit('post:created', post)
// por quê: o emitter não abre handshake nem mantém socket — é metade do
// peso para quem só precisa publicar a partir de um worker, não ser servidor
```

#### redis-adapter
[doc](https://socket.io/docs/v4/redis-adapter/)

**O que é:** o adapter sobre o Pub/Sub do Redis, o mais usado.
**Para que serve:** ligar N instâncias por um Redis que a maioria das stacks já tem.
**Quando usar:** a escolha padrão para escalar — com duas ressalvas da própria página: ele **não
suporta connection state recovery**, e **não dispensa sticky session**. Nota fina: o pacote `redis`
tem problema para restaurar as subscrições após reconexão, e por isso `ioredis` pode ser preferível.

```bash
npm install @socket.io/redis-adapter ioredis
```

```ts
import { Redis } from 'ioredis'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'

const pubClient = new Redis()
const subClient = pubClient.duplicate()   // DOIS clientes: publicar e assinar

const io = new Server(httpServer, { adapter: createAdapter(pubClient, subClient) })

// Opções: key (prefixo, default "socket.io"), requestsTimeout (5000 ms)

// Redis 7+: sharded pub/sub, melhor escalabilidade
// import { createShardedAdapter } from '@socket.io/redis-adapter'

// Nada é persistido: é pub/sub puro. Com o Redis fora do ar, os pacotes só
// alcançam os clientes do nó atual.
```

```ts
// errado — ligar connectionStateRecovery esperando que o Redis pub/sub cubra
const io = new Server(httpServer, {
  adapter: createAdapter(pubClient, subClient),
  connectionStateRecovery: { maxDisconnectionDuration: 120_000 }, // NÃO suportado aqui
})

// certo — se precisa dos dois, troque de adapter
import { createAdapter as createStreamsAdapter } from '@socket.io/redis-streams-adapter'

const io2 = new Server(httpServer, {
  adapter: createStreamsAdapter(redisClient),
  connectionStateRecovery: { maxDisconnectionDuration: 120_000 },
})
// por quê: a própria página do redis-adapter avisa que pub/sub não guarda
// nada — recovery precisa de um backlog, e pub/sub não tem backlog
```

#### redis-streams-adapter
[doc](https://socket.io/docs/v4/redis-streams-adapter/)

**O que é:** o adapter que usa um **stream** do Redis em vez de pub/sub.
**Para que serve:** não perder pacote quando a conexão com o Redis pisca.
**Quando usar:** quando a queda momentânea do Redis não pode virar evento perdido, ou quando você
quer **connection state recovery com Redis** — o pub/sub não suporta, este suporta.

```bash
npm install @socket.io/redis-streams-adapter redis
```

```ts
import { createAdapter } from '@socket.io/redis-streams-adapter'

const io = new Server(httpServer, { adapter: createAdapter(redisClient) })

// Opções principais:
// streamName        "socket.io"     nome do stream
// maxLen            10_000          trim aproximado do tamanho
// readCount         100             elementos por XREAD
// sessionKeyPrefix  "sio:session:"  chaves de sessão da recuperação de estado

// A diferença que importa: ele retoma o stream depois de uma desconexão
// temporária do Redis SEM perder pacotes.
```

#### cluster-adapter
[doc](https://socket.io/docs/v4/cluster-adapter/)

**O que é:** o adapter que propaga os pacotes pelo canal IPC do `node:cluster`.
**Para que serve:** usar todos os núcleos de **uma** máquina sem subir infraestrutura nova.
**Quando usar:** deploy de um servidor só. Sem Redis, sem rede — mas **não** atravessa máquinas, e
não suporta connection state recovery.

```bash
npm install @socket.io/cluster-adapter @socket.io/sticky
```

```ts
// primário
import { setupMaster } from '@socket.io/sticky'
import { setupPrimary } from '@socket.io/cluster-adapter'

setupMaster(httpServer, { loadBalancingMethod: 'least-connection' })
setupPrimary()

// worker
import { createAdapter } from '@socket.io/cluster-adapter'
import { setupWorker } from '@socket.io/sticky'

io.adapter(createAdapter())
setupWorker(io)

// São DUAS peças distintas: sticky roteia o cliente sempre para o mesmo worker,
// o adapter leva o broadcast de um worker para os outros. Uma não substitui a outra.
```

```ts
// errado — subir cluster-adapter achando que ele também cobre o segundo servidor
// servidor A (4 workers, node:cluster) + servidor B (outra VM) — broadcast
// de A nunca chega em B: o IPC do node:cluster não atravessa máquinas

// certo — mais de UMA máquina exige adapter com transporte de rede
import { createAdapter } from '@socket.io/redis-adapter'
io.adapter(createAdapter(pubClient, subClient))
// por quê: a doc é explícita — cluster-adapter é só para os núcleos de UMA
// máquina; two boxes é sempre Redis, Postgres ou outro adapter de rede
```

#### postgres-adapter
[doc](https://socket.io/docs/v4/postgres-adapter/)

**O que é:** o adapter sobre `NOTIFY`/`LISTEN` do Postgres, com uma tabela auxiliar para payload
grande.
**Para que serve:** escalar sem acrescentar Redis à infraestrutura, quando já existe Postgres.
**Quando usar:** quando o Postgres já está lá. Note o desenho: pacote abaixo de 8 000 bytes vai no
próprio `NOTIFY`; acima disso, ou com binário, é codificado em msgpack, gravado numa tabela, e só o
id da linha viaja.

```bash
npm install @socket.io/postgres-adapter pg
```

```ts
import { createAdapter } from '@socket.io/postgres-adapter'
import pg from 'pg'

const pool = new pg.Pool({ /* … */ })

await pool.query(`
  CREATE TABLE IF NOT EXISTS socket_io_attachments (
    id         bigserial UNIQUE,
    created_at timestamptz DEFAULT NOW(),
    payload    bytea
  );
`)

io.adapter(createAdapter(pool))

// Opções: channelPrefix ("socket.io"), tableName ("socket_io_attachments"),
// payloadThreshold (8000), cleanupInterval (30_000), heartbeatInterval (5_000)

// Sticky session continua obrigatória. Connection state recovery: não suportado.
```

#### using-multiple-nodes
[doc](https://socket.io/docs/v4/using-multiple-nodes/)

**O que é:** o que muda com mais de uma instância: **sticky sessions** e **adapter**.
**Para que serve:** evitar o HTTP 400 intermitente que aparece só em produção.
**Quando usar:** **antes do segundo nó**. A causa é mecânica: no long-polling, cada pacote é uma
requisição HTTP nova; se ela cair noutro servidor, a sessão não existe lá e vem
`{"code":1,"message":"Session ID unknown"}`.

```nginx
upstream nodes {
  hash $remote_addr consistent;   # mesmo cliente, mesmo nó
  server app01:3000;
  server app02:3000;
  server app03:3000;
}
```

```ts
// Alternativa: dispensar o polling. Sem long-polling não há requisição avulsa
// para se perder, e o sticky deixa de ser necessário.
const socket = io('https://api.example.com', { transports: ['websocket'] })
// Preço: você perde o fallback em redes que bloqueiam WebSocket.

// HAProxy usa cookie no lugar do hash de IP:
//   cookie io prefix indirect nocache
//   server app01 app01:3000 check cookie app01

// São DUAS necessidades independentes, e faltar qualquer uma quebra:
// sticky  -> a sessão sobrevive
// adapter -> o broadcast atravessa os nós
```

```ts
// errado — só o adapter, achando que resolve o 400 "Session ID unknown"
const io = new Server(httpServer, { adapter: createAdapter(pubClient, subClient) })
// sem sticky session, o SEGUNDO pacote de polling ainda pode cair noutro nó

// certo — adapter PARA broadcast, sticky session PARA a sessão sobreviver
// (nginx consistent hash ou HAProxy cookie — ver bloco nginx acima)
// por quê: adapter propaga evento entre nós; não tem nada a ver com qual
// nó recebe o próximo pacote HTTP de um long-polling em andamento
```

#### reverse-proxy
[doc](https://socket.io/docs/v4/reverse-proxy/)

**O que é:** as configurações de nginx, Apache, Caddy e `http-proxy` que deixam o upgrade passar.
**Para que serve:** não ficar preso em long-polling para sempre, nem cair a cada minuto.
**Quando usar:** em todo deploy atrás de proxy. Copie os headers de upgrade **e** ajuste o timeout: a
doc exige que `proxy_read_timeout` (60 s por padrão) seja **maior** que `pingInterval + pingTimeout`
(45 s).

```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_read_timeout 60s;      # > pingInterval + pingTimeout
}
```

```ts
// Caddy 2 resolve numa linha:
//   reverse_proxy /socket.io/* localhost:3000

// http-proxy do Node precisa de ws: true, senão o upgrade não passa:
//   httpProxy.createProxyServer({ target: 'http://localhost:3000', ws: true })

// Load balancer gerenciado (GCP, ALB): aumente o timeout dele também, pela
// mesma regra dos 45 s.
```

```nginx
# errado — proxy_pass sem os headers de upgrade: fica preso em long-polling
location / {
  proxy_pass http://localhost:3000;
}

# certo — os headers de upgrade são o que deixa o WebSocket subir
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;     # sem isto, nunca sobe de transporte
  proxy_set_header Connection "upgrade";
}
# por quê: sem os dois headers o proxy nunca encaminha o pedido de upgrade,
# e o sintoma vira TRANSPORT_MISMATCH, nunca um erro claro de configuração
```

## Tipagem, operação e diagnóstico

#### typescript
[doc](https://socket.io/docs/v4/typescript/)

**O que é:** os quatro genéricos que tipam os eventos: `ClientToServerEvents`, `ServerToClientEvents`,
`InterServerEvents` e `SocketData`.
**Para que serve:** um contrato único de eventos, compartilhado pelos dois lados, com autocompletar.
**Quando usar:** **desde o primeiro evento** numa stack TypeScript. Coloque os tipos num módulo que
os dois lados importam e o nome do evento deixa de ser string solta. Aviso da própria doc: os tipos
**não substituem validação** do que chega.

```ts
// shared/realtime-events.ts (convenção sugerida)
export type ServerToClientEvents = {
  'post:created': (post: Post) => void
  'user:left': (userId: string) => void
}

export type ClientToServerEvents = {
  'post:create': (input: PostInput, ack: (res: { ok: boolean }) => void) => void
}

export type InterServerEvents = { 'cache:invalidate': (key: string) => void }
export type SocketData = { user: { id: string; role: string } }

// Servidor: ClientToServer primeiro
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
)

// Cliente: a ordem INVERTE
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io()

// Ack tipado em promise
const res = await socket.timeout(5_000).emitWithAck('post:create', input)

// O tipo é ajuda de edição. Valide o payload no servidor de qualquer jeito.
```

```ts
// caso real — file-import-socket-contract.service.ts: o contrato do
// namespace expõe o tipo de evento, a impl usa os genéricos do Socket.IO
import type { Namespace } from 'socket.io'

export type FileImportProgress = { jobId: string; percent: number }

export abstract class FileImportSocketContractService {
  abstract namespace(): Namespace | null
  abstract emitProgress(progress: FileImportProgress): void
}
```

```ts
// errado — confiar no tipo e pular a validação, porque "o cliente é TS também"
socket.on('post:create', (input: PostInput, ack) => {
  void createPost(input) // input é `unknown` em runtime; o tipo não valida nada
})

// certo — tipo guia o editor, VineJS valida o que realmente chegou
socket.on('post:create', async (input: unknown, ack) => {
  const { data, errors } = await postCreateValidator.tryValidate(input)
  if (errors) return ack?.({ ok: false })
  await createPost(data)
  ack?.({ ok: true })
})
// por quê: a doc avisa que os genéricos são só compile-time; um cliente
// adulterado ou outra versão do app manda o payload que quiser
```

#### logging-and-debugging
[doc](https://socket.io/docs/v4/logging-and-debugging/)

**O que é:** a instrumentação via pacote `debug`, ligada por variável de ambiente ou `localStorage`.
**Para que serve:** ver o handshake, o upgrade e cada pacote sem instrumentar o próprio código.
**Quando usar:** no primeiro problema de conexão. E saiba distinguir: `net::ERR_CONNECTION_REFUSED` e
os avisos de CORS vêm **do navegador**, não do Socket.IO — não adianta procurar no log da biblioteca.

```bash
DEBUG=socket.io:* node server.js     # só o Socket.IO
DEBUG=engine,socket.io* node server.js  # o transporte também
DEBUG=* node server.js               # tudo
```

```ts
// Navegador: ligue e recarregue a página
localStorage.debug = 'socket.io-client:socket'
localStorage.debug = '*'

// Produção: o `debug` custa ~4 kB min+gzip no bundle. O bundle "slim" já vem
// sem ele; em build próprio, o loader webpack-remove-debug tira.
```

#### testing
[doc](https://socket.io/docs/v4/testing/)

**O que é:** o padrão de teste: subir servidor e cliente de verdade no próprio teste.
**Para que serve:** testar a comunicação, e não um mock dela.
**Quando usar:** ao cobrir a camada de realtime. Há exemplos para Mocha, Jest, Tape e Vitest — a
lógica é a mesma, muda a sintaxe. O que mais quebra suíte é o teardown: sem `io.close()` o processo
não termina.

```ts
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client'

function waitFor(socket: ClientSocket, event: string) {
  return new Promise((resolve) => socket.once(event, resolve))
}

beforeAll((done) => {
  const httpServer = createServer()
  io = new Server(httpServer)
  httpServer.listen(() => {
    const { port } = httpServer.address() as AddressInfo
    clientSocket = ioc(`http://localhost:${port}`)
    io.on('connection', (s) => { serverSocket = s })
    clientSocket.on('connect', done)
  })
})

afterAll(() => {
  io.close()                  // sem isto o processo fica pendurado
  clientSocket.disconnect()
})
```

#### memory-usage
[doc](https://socket.io/docs/v4/memory-usage/)

**O que é:** o benchmark de memória entre `ws`, `eiows`, `µWebSockets.js` e WebSocket puro, até 10 000
clientes.
**Para que serve:** dimensionar a instância com número, não com palpite.
**Quando usar:** ao planejar capacidade. A boa notícia: o consumo **escala linearmente** com o número
de clientes. A economia fácil: por padrão o servidor guarda uma referência à requisição HTTP inicial
de cada sessão — se você não usa `express-session` nem nada que dependa dela, descarte.

```ts
// Uma linha, e a memória por sessão cai:
io.engine.on('connection', (rawSocket) => {
  rawSocket.request = null
})

// Cuidado: isso invalida o acesso à requisição original (cookies de sessão,
// headers) depois do handshake. Leia o que precisar DENTRO do io.use e guarde
// em socket.data antes de descartar.

// perMessageDeflate vem desligado justamente por custo de memória e CPU.
```

```ts
// caso real — monitoring-socket.service.ts: descarta a requisição crua logo
// depois de guardar o que importa em socket.data, dentro do próprio io.use
import type { Server as SocketIOServer } from 'socket.io'

export function attachMemorySaver(io: SocketIOServer): void {
  io.use((socket, next) => {
    socket.data.cookieHeader = socket.request.headers.cookie ?? ''
    next()
  })
  io.engine.on('connection', (rawSocket: { request: unknown }) => {
    rawSocket.request = null // já lemos o que precisava no io.use acima
  })
}
```

```ts
// errado — descartar a requisição sem ter lido nada antes
io.engine.on('connection', (rawSocket: { request: unknown }) => {
  rawSocket.request = null // qualquer leitura posterior de cookie/header falha
})

// certo — leia o que precisa no io.use e guarde em socket.data; só então descarte
io.use((socket, next) => {
  socket.data.cookieHeader = socket.handshake.headers.cookie ?? ''
  next()
})
io.engine.on('connection', (rawSocket: { request: unknown }) => {
  rawSocket.request = null
})
// por quê: a própria doc avisa que descartar invalida o acesso à requisição
// original — o dado que importa precisa estar em socket.data ANTES disso
```

#### performance-tuning
[doc](https://socket.io/docs/v4/performance-tuning/)

**O que é:** os ajustes de biblioteca e de sistema operacional para muitas conexões simultâneas.
**Para que serve:** passar dos tetos artificiais que parecem limite do Node e não são.
**Quando usar:** quando as conexões **empacam num número redondo**. Dois números diagnósticos: travou
perto de **1 000** é limite de descritores de arquivo; travou perto de **28 000** é faixa de portas
efêmeras.

```bash
# ~1000 conexões: limite de file descriptors
ulimit -n                                   # veja o atual
# /etc/security/limits.d/ -> nofile 1048576 (exige reinício)

# ~28000 conexões: faixa de portas locais
# /etc/sysctl.d/ -> net.ipv4.ip_local_port_range = 10000 65535  (~55k por IP)
```

```ts
// No nível da biblioteca:
// - bufferutil e utf-8-validate instalados
// - wsEngine: eiows.Server, ou µWebSockets.js
// - parser msgpack para carga binária (menos frames WebSocket)
// - rawSocket.request = null para liberar a requisição inicial
```

```bash
# errado — subir mais instâncias Node para "resolver" sem checar o teto do SO
pm2 scale app +4   # as 4 novas travam no MESMO limite de file descriptors

# certo — primeiro suba o teto, DEPOIS escale
ulimit -n 1048576
# por quê: a doc atribui o travamento perto de 1000 a file descriptors do
# processo, não a CPU/memória — escalar processo não contorna um limite de SO
```

#### custom-parser
[doc](https://socket.io/docs/v4/custom-parser/)

**O que é:** a troca do parser que serializa os pacotes, com as alternativas prontas.
**Para que serve:** reduzir bytes e frames, ou suportar o que o parser padrão não suporta.
**Quando usar:** com tráfego binário pesado. A diferença concreta: o parser padrão manda o binário
como **anexo separado**, o msgpack manda tudo num **único frame WebSocket**. Regra de ouro: servidor e
cliente precisam usar o **mesmo** parser, senão nada conversa.

```bash
npm install socket.io-msgpack-parser
```

```ts
import customParser from 'socket.io-msgpack-parser'

const io = new Server(httpServer, { parser: customParser })   // servidor
const socket = io('https://api.example.com', { parser: customParser })  // cliente

// Alternativas prontas:
// - padrão: JSON + anexos binários; maior compatibilidade
// - msgpack: binário em um frame só; sem suporte a IE9
// - com referência circular
// - JSON puro, sem binário

// Parser próprio: um Encoder com encode() e um Decoder com add(), estendendo Emitter.
```

#### admin-ui
[doc](https://socket.io/docs/v4/admin-ui/)

**O que é:** o painel `@socket.io/admin-ui`, que mostra servidores, sockets, rooms e eventos ao vivo.
**Para que serve:** olhar o estado do cluster em vez de deduzi-lo pelo log.
**Quando usar:** em desenvolvimento e em staging, com autenticação. **`auth: false` expõe o painel —
e com ele os comandos de join, leave e disconnect — a quem chegar na URL.** Em produção, `mode:
"production"` reduz o que fica em memória, e `readonly: true` tira os comandos.

```bash
npm install @socket.io/admin-ui
```

```ts
import { instrument } from '@socket.io/admin-ui'

instrument(io, {
  auth: {
    type: 'basic',
    username: 'admin',
    password: '$2b$10$…',   // hash bcrypt, NUNCA a senha em texto
  },
  namespaceName: '/admin',  // o namespace do painel
  readonly: true,           // sem join/leave/disconnect pela interface
  mode: 'production',       // menos detalhe em memória
})

// A interface hospedada (admin.socket.io) é estática, sem rastreamento; dá para
// servir o ui/dist do repositório por conta própria.
```

```ts
// errado — auth: false "só por enquanto", esquecido até produção
instrument(io, { auth: false }) // qualquer um na URL vê sockets e rooms

// certo — auth sempre, e o modo certo por ambiente
instrument(io, {
  auth: { type: 'basic', username: 'admin', password: ENV.ADMIN_UI_HASH },
  mode: ENV.NODE_ENV === 'production' ? 'production' : 'development',
  readonly: ENV.NODE_ENV === 'production',
})
// por quê: a doc nomeia join, leave e disconnect como comandos que o painel
// expõe — sem auth, é um painel de administração aberto na internet
```

## Fora de escopo

- v2 e v3: versões antigas, fora de uso.
- changelog, changelog/4.x.x (cada versão): histórico de release.
- tutorial/* (step-1..9, introduction, api-overview, ending-notes): passo a passo introdutório.
- client-with-bundlers, server-with-bundlers: configuração para Webpack/Rollup; o frontend usa Vite.
- client-testing: a entrada `testing` já cobre o padrão servidor+cliente real.
- aws-sqs-adapter, azure-service-bus-adapter, gcp-pubsub-adapter, mongo-adapter, pm2: adapters e
  deploy para infra que o projeto não usa (sem fila cloud dedicada para socket, sem pm2).
- glossary, load-testing: terminologia e benchmark, baixo valor imediato.
- migrating-from-2-x-to-3-0, migrating-from-3-x-to-4-0: migração de versões já superadas.
