# Node.js 24

> Conferido em 2026-10-16 contra a tag `v24.22.0`: as páginas de API foram lidas do branch `v24.x`
> do repositório `nodejs/node` (`doc/api/<modulo>.md`, commit `0d10bfe`, `src/node_version.h` em
> `24.22.1-pre`, ou seja, a linha da `v24.22.0` mais as correções ainda não lançadas). Os guias
> Learn foram lidos do repositório `nodejs/learn` (`pages/<caminho>.md`, commit `6eb551e`,
> 2026-10-14), para onde saíram do `nodejs/nodejs.org`.
>
> `nodejs.org` está bloqueado na rede desta conferência: o `[doc]` de cada entrada é a URL pública
> correspondente, não aberta; o `[markdown]` é o fonte que foi aberto e lido. O cabeçalho de entrada
> é o caminho sem o prefixo `docs/latest-v24.x/` (`api/<modulo>`) ou sem `en/` (`learn/<caminho>`),
> para que a âncora citada pela régua fique curta (`_doc-lib/nodejs.md#api/process`).
>
> **Não existe guia Learn de desligamento limpo** (graceful shutdown) no `nodejs/learn` conferido. O
> contrato do assunto está em `api/process` (eventos de sinal, `exit`) e `api/http`
> (`server.close`, `closeAllConnections`); as duas entradas cobrem.

O runtime JavaScript do backend da casa (AdonisJS ou Fastify) e do servidor do frontend (Nitro).
A régua fixa o piso em **Node ≥ 24** (`_standards/tooling.md` §2).

**O que é:** o runtime V8 com a biblioteca padrão `node:*` (arquivo, rede, processo, cripto,
stream, thread) e o laço de eventos da libuv. Na linha 24 já são estáveis: `--env-file`
(24.10), remoção de tipo de TypeScript (type stripping, 24.12), `require(esm)` (24.15),
`import.meta.dirname`/`filename` (24.0), o Permission Model e `util.styleText`.

**Para que serve:** saber o que o framework já faz por cima do runtime e o que continua sendo
responsabilidade de quem escreve o código: erro com `cause`, promessa rejeitada sem dono, timeout
de chamada de saída, stream com contrapressão, contexto por requisição, sinal de término,
comparação em tempo constante, processo filho sem shell.

**Como usar:**

```bash
# engines no package.json e a mesma major na imagem (tooling.md §2, §8.2)
node --version   # v24.x
```

```ts
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { createGzip } from 'node:zlib'

// prefixo node: sempre; a API de promessa no lugar do callback
await pipeline(createReadStream(source), createGzip(), createWriteStream(target), {
  signal: AbortSignal.timeout(30_000),
})
const key = randomUUID()
```

**Quando adotar a biblioteca:** não se adota, é o runtime. Antes de instalar um pacote para
UUID, leitura de `.env`, parse de argumento de CLI, cor de terminal, glob, timeout ou
contexto assíncrono, confira a entrada daqui: a stdlib da linha 24 já resolve
(`typescript.md` §6, "e só se o stdlib não resolver").

**O que muda a experiência:**

1. **Promessa rejeitada sem dono derruba o processo.** O modo padrão de
   `--unhandled-rejections` é `throw`: sem ouvinte de `unhandledRejection`, a rejeição vira
   exceção não capturada e o processo sai. Depois de `uncaughtException` o estado é indefinido, e
   a doc diz que não é seguro continuar: limpe de forma síncrona e saia.
2. **`pipe()` não fecha o destino quando a origem falha.** `pipeline` de `node:stream/promises`
   propaga o erro, destrói todos os streams e aceita `signal`.
3. **Ouvir `SIGTERM` tira o comportamento padrão de sair.** Quem instala o ouvinte precisa
   terminar o processo; `process.exit()` corta I/O pendente, então o caminho é fechar servidor,
   fila e banco e deixar o laço esvaziar (`process.exitCode`).
4. **Type stripping não roda o TypeScript da casa.** Parameter property (`constructor(private
   readonly repo: X)`) e decorator exigem transformação; o Node recusa (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`)
   e não lê `tsconfig.json`. O runtime de TS continua sendo o do framework (Adonis) ou o build
   (`tsup`, Fastify).
5. **`--env-file` não valida nada.** Só põe texto em `process.env`, e o valor do ambiente vence o
   do arquivo. O leitor de ENV da casa continua sendo a única porta (`backend.md` §6).

**Links:** 37

**Skills:** `maiyu-node` (o roteiro do runtime no backend), `maiyu-backend`,
`security-best-practices`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill
executa (`SKILLS-MAP.md`).

---

## Erros e assincronia

#### api/errors
[doc](https://nodejs.org/docs/latest-v24.x/api/errors.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/errors.md)
**O que é:** como o Node propaga erro (`throw`, promessa rejeitada, callback com erro primeiro,
evento `'error'`), as classes (`Error`, `SystemError`, `AbortError`) e o catálogo de `error.code`.
**Para que serve:** `error.cause` (16.9) encadeia o erro original no novo, e `util.inspect`
serializa a cadeia inteira no log. `error.code` é a forma estável de identificar o erro (só muda
em major); `error.message` muda em qualquer versão.
**Quando usar:** ao embrulhar erro de infraestrutura num service (o detalhe do driver vai no
`cause`, nunca na mensagem que sobe), e ao decidir por `code` (`ENOENT`, `ERR_INVALID_ARG_TYPE`)
em vez de comparar texto.

```ts
try {
  await this.client.send(message)
} catch (error) {
  throw new Error('mail transport failed', { cause: error })
}
```

#### api/events
[doc](https://nodejs.org/docs/latest-v24.x/api/events.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/events.md)
**O que é:** `EventEmitter`, os eventos especiais `'error'` e `'newListener'`, `events.once` e
`events.on` com `signal`, `captureRejections` e `addAbortListener`.
**Para que serve:** emitter sem ouvinte de `'error'` lança o erro e derruba o processo. Ouvinte
`async` que lança vira rejeição sem dono, a menos que `captureRejections` esteja ligado.
`events.once(emitter, 'x', { signal })` transforma um evento em promessa cancelável.
**Quando usar:** ao escrever ou consumir emitter fora do framework (cliente de socket, stream,
worker). O emitter de domínio do Adonis é outra API (`backend.md` §4.12).

#### api/process
[doc](https://nodejs.org/docs/latest-v24.x/api/process.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/process.md)
**O que é:** o objeto `process`: eventos (`unhandledRejection`, `uncaughtException`,
`uncaughtExceptionMonitor`, `beforeExit`, `exit`, `warning`), eventos de sinal, `exit`,
`exitCode`, `env`, `argv`, `memoryUsage`.
**Para que serve:** três regras da página. `uncaughtException` é "último recurso": só limpeza
síncrona e saída, nunca retomar. Ouvinte de `SIGTERM`/`SIGINT` remove o padrão de sair com
`128 + sinal`, e o sinal chega de forma assíncrona. `process.exit()` encerra o mais rápido possível
"mesmo com operações assíncronas pendentes", inclusive escrita em `stdout`; `process.exitCode` deixa
o laço terminar.
**Quando usar:** no boot do processo (o `bin/server.ts` do Fastify, `architecture.md` §3.3; no
Adonis o Ignitor já ouve o sinal e chama o `shutdown()` dos providers,
`_doc-lib/adonisjs.md#guides/concepts/application-lifecycle`), em comando de CLI que precisa de
código de saída, e em script de migration (`exit(1)`, `backend.md` §7).

```ts
import { once } from 'node:events'

// bin/server.ts (Fastify): wait for the signal, close in reverse boot order, let the loop drain
await app.listen({ port, host })
await Promise.race([once(process, 'SIGTERM'), once(process, 'SIGINT')])
await app.close()
await queue.close()
await mongo.close()
```

#### api/timers
[doc](https://nodejs.org/docs/latest-v24.x/api/timers.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/timers.md)
**O que é:** `setTimeout`, `setInterval`, `setImmediate`, o objeto `Timeout` (`ref`, `unref`,
`refresh`, `Symbol.dispose`).
**Para que serve:** `timeout.unref()` faz o timer não segurar o processo vivo; sem ele, um
intervalo esquecido impede o desligamento.
**Quando usar:** em timer de manutenção dentro de um service (raro). Agendamento recorrente no
processo web é proibido: comando + cron do orquestrador (`backend.md` §4.12).

#### api/timers#timers-promises-api
[doc](https://nodejs.org/docs/latest-v24.x/api/timers.html#timers-promises-api) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/timers.md)
**O que é:** `node:timers/promises`: `setTimeout(delay, value, { signal, ref })`, `setImmediate`,
`setInterval` como iterador assíncrono, e `scheduler.wait`/`scheduler.yield` (experimentais).
**Para que serve:** espera cancelável por `AbortSignal`, sem `new Promise` à mão.
**Quando usar:** backoff entre tentativas de retry idempotente (`backend.md` §5.3) e espera em
teste. `scheduler.*` é experimental: fora de produção (`learn/getting-started/security-best-practices`).

```ts
import { setTimeout as sleep } from 'node:timers/promises'

await sleep(backoffMs, undefined, { signal })
```

#### api/globals#class-abortsignal
[doc](https://nodejs.org/docs/latest-v24.x/api/globals.html#class-abortsignal) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/globals.md)
**O que é:** `AbortController` e `AbortSignal` globais: `AbortSignal.timeout(ms)` (aborta depois de
`ms`), `AbortSignal.any([...])` (aborta quando qualquer um aborta, com o `reason` de quem disparou),
`signal.throwIfAborted()`, `signal.reason`.
**Para que serve:** o teto de tempo que a régua exige em toda chamada de saída
(`backend.md` §5.3, `solid.md` §2). `fetch`, `pipeline`, `events.once`, `timers/promises`,
`child_process` e o SDK da AWS aceitam `signal`.
**Quando usar:** em toda chamada de rede de um service; `AbortSignal.any` quando já existe um sinal
de fora (requisição cancelada, desligamento) e o teto se soma a ele.

```ts
const response = await fetch(url, { signal: AbortSignal.any([shutdownSignal, AbortSignal.timeout(5_000)]) })
```

#### api/async_context
[doc](https://nodejs.org/docs/latest-v24.x/api/async_context.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/async_context.md)
**O que é:** `AsyncLocalStorage` (estável) e `AsyncResource`, em `node:async_hooks`. `run(store,
fn)` abre o contexto, `getStore()` lê; `enterWith` é experimental; `withScope` (24.20) é
experimental.
**Para que serve:** carregar dado da requisição (id, tenant, transação) por toda a cadeia de
`await` sem passar parâmetro. A página tem a seção "Context loss": callback antigo perde o
contexto e se conserta com `util.promisify` ou `AsyncResource`.
**Quando usar:** escopo multi-tenant (`architecture.md` §3.1), transação lida pelo repository
(`domain.md` §6). Use `run`, nunca `enterWith`.

#### api/async_hooks
[doc](https://nodejs.org/docs/latest-v24.x/api/async_hooks.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/async_hooks.md)
**O que é:** a API de baixo nível `createHook`/`AsyncHook`/`executionAsyncResource`, marcada
"Experimental. Please migrate away from this API".
**Para que serve:** a página desaconselha o uso e manda para `AsyncLocalStorage` (contexto) e
`process.getActiveResourcesInfo()` (recursos ativos).
**Quando usar:** nunca em código de aplicação. Só para entender por que uma lib de APM pesa.

## Streams e dados

#### api/stream
[doc](https://nodejs.org/docs/latest-v24.x/api/stream.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/stream.md)
**O que é:** `Readable`, `Writable`, `Duplex`, `Transform`, `finished`, `compose`,
`addAbortSignal`, `highWaterMark` e o modelo de contrapressão.
**Para que serve:** a ressalva de `readable.pipe()`: se a origem emite erro, o destino "não é
fechado automaticamente", e cada stream precisa ser fechado à mão para não vazar memória.
**Quando usar:** ao escrever stream próprio (exportação CSV, SSE) e ao revisar código com `.pipe(`.

#### api/stream#streams-promises-api
[doc](https://nodejs.org/docs/latest-v24.x/api/stream.html#streams-promises-api) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/stream.md)
**O que é:** `node:stream/promises`: `pipeline(source, ...transforms, destination, { signal, end })`
e `finished(stream, { signal })`, que devolvem promessa.
**Para que serve:** a forma da casa de ligar streams: propaga erro, destrói todos os elos, aceita
gerador assíncrono como transformação e `AbortSignal` como teto.
**Quando usar:** sempre que dois streams se ligam (arquivo, gzip, resposta HTTP, upload).

```ts
import { pipeline } from 'node:stream/promises'

await pipeline(source, async function* (rows: AsyncIterable<Row>) {
  for await (const row of rows) yield `${row.id};${row.name}\n`
}, destination, { signal })
```

#### api/buffer
[doc](https://nodejs.org/docs/latest-v24.x/api/buffer.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/buffer.md)
**O que é:** `Buffer` (subclasse de `Uint8Array`), codificações (`utf8`, `base64`, `base64url`,
`hex`), `Buffer.byteLength`, `Buffer.compare`.
**Para que serve:** comparar segredo exige dois buffers do mesmo tamanho em bytes
(`api/crypto`, `timingSafeEqual`); `Buffer.byteLength` mede bytes, não caracteres.
**Quando usar:** em assinatura de webhook, token, magic bytes de upload (`backend.md` §5.4).

#### api/zlib
[doc](https://nodejs.org/docs/latest-v24.x/api/zlib.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/zlib.md)
**O que é:** gzip, deflate, brotli e zstd (este experimental), por stream ou por função; opção
`maxOutputLength`; seção "Threadpool usage" sobre o custo no pool da libuv.
**Para que serve:** descompactar entrada de fora sem `maxOutputLength` aceita bomba de
descompressão; cada operação assíncrona ocupa uma thread do pool.
**Quando usar:** ao descompactar upload ou corpo de terceiro. Compressão de resposta HTTP é do
proxy ou do plugin do framework, não da aplicação.

## Sistema e arquivos

#### api/fs#promises-api
[doc](https://nodejs.org/docs/latest-v24.x/api/fs.html#promises-api) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/fs.md)
**O que é:** `node:fs/promises`: `readFile`, `writeFile`, `rm`, `mkdtemp`, `mkdtempDisposable`,
`glob`, `FileHandle`.
**Para que serve:** I/O de arquivo sem bloquear o laço; `glob` dispensa pacote de glob;
`mkdtempDisposable` limpa a pasta temporária com `await using`.
**Quando usar:** em script, comando e teste. Arquivo de usuário não passa pelo disco local: vai
para o storage (`backend.md` §5.4). `*Sync` só no boot.

#### api/path
[doc](https://nodejs.org/docs/latest-v24.x/api/path.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/path.md)
**O que é:** `join`, `resolve`, `relative`, `basename`, `extname`, `matchesGlob`.
**Para que serve:** a própria página avisa que `path.isAbsolute()` "não é seguro para mitigar path
traversal".
**Quando usar:** em script e comando. Caminho montado com entrada de usuário não existe na casa:
a chave do objeto nasce no servidor (`backend.md` §5.4).

#### api/url
[doc](https://nodejs.org/docs/latest-v24.x/api/url.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/url.md)
**O que é:** a API WHATWG `URL` (com `URL.canParse` e `URL.parse`), `URLSearchParams`,
`fileURLToPath`, `pathToFileURL`, e a API legada `url.parse()`.
**Para que serve:** parse de URL sem expressão regular; a API legada fica de fora.
**Quando usar:** ao validar URL vinda do usuário antes da allowlist de esquema e do bloqueio de IP
privado (SSRF, `backend.md` §5.3).

#### api/child_process
[doc](https://nodejs.org/docs/latest-v24.x/api/child_process.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/child_process.md)
**O que é:** `spawn`, `execFile`, `exec`, `fork` e as versões `*Sync`.
**Para que serve:** o perigo, em negrito na página: `exec` (e todo método com `shell: true`)
nunca recebe entrada não sanitizada, porque metacaractere de shell vira execução arbitrária.
`spawn`/`execFile` sem shell passam argumento como array, sem interpretação.
**Quando usar:** só ao chamar binário externo (conversor, `pg_dump`) e no spec de migration
standalone (`backend.md` §7). Forma da casa: `spawn(binary, [args], { shell: false })`, valor de
usuário depois de `--` (`backend.md` §5.3), com `signal` para o teto.

#### api/worker_threads
[doc](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/worker_threads.md)
**O que é:** `Worker`, `parentPort`, `MessageChannel`, `workerData`, `resourceLimits`.
**Para que serve:** "Workers são úteis para operações JavaScript que usam muita CPU. Não ajudam
muito em trabalho de I/O": o I/O assíncrono do Node já é mais eficiente.
**Quando usar:** só para CPU (gerar PDF grande, hash em lote, processar imagem) que bloquearia o
laço. Trabalho lento de I/O vai para fila (`backend.md` §4.12); código não confiável vai para
`isolated-vm` (`_doc-lib/isolated-vm.md`).

## Segurança e cripto

#### api/crypto
[doc](https://nodejs.org/docs/latest-v24.x/api/crypto.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/crypto.md)
**O que é:** `randomUUID`, `randomBytes`, `timingSafeEqual`, `createHmac`, `hash`, `scrypt`,
`argon2` (24.7), `webcrypto`.
**Para que serve:** `timingSafeEqual` compara em tempo constante, exige os dois lados com o mesmo
tamanho em bytes (lança se diferir) e não torna seguro o código em volta. `randomBytes` gera token
opaco. `scrypt` e `argon2` existem, mas hash de senha da casa é o do framework.
**Quando usar:** assinatura de webhook (`backend.md` §4.11), token de convite ou redefinição
(`backend.md` §4.10), chave de objeto (`randomUUID`, §5.4). Senha: `hash` do Adonis
(`_doc-lib/adonisjs.md#guides/security/hashing`).

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const expected = createHmac('sha256', secret).update(rawBody).digest()
const received = Buffer.from(signature, 'hex')
const valid = received.length === expected.length && timingSafeEqual(received, expected)
```

#### api/permissions
[doc](https://nodejs.org/docs/latest-v24.x/api/permissions.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/permissions.md)
**O que é:** o Permission Model (`--permission`, estável): restringe sistema de arquivos, processo
filho, worker, WASI, addon e loader do OpenSSL, liberados por `--allow-fs-read`,
`--allow-fs-write`, `--allow-child-process`, `--allow-worker`; modo `--permission-audit`.
**Para que serve:** é "cinto de segurança" para código confiável: a página diz que não protege
contra código malicioso, que contorna o modelo.
**Quando usar:** não coberto pela régua. Candidato para script de CI e comando que lê só uma pasta;
não substitui `isolated-vm` para código de usuário.

## Rede

#### api/http
[doc](https://nodejs.org/docs/latest-v24.x/api/http.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/http.md)
**O que é:** servidor e cliente HTTP/1.1: `server.close`, `closeIdleConnections`,
`closeAllConnections`, `Symbol.asyncDispose`, e os tetos `headersTimeout` (mínimo entre
`requestTimeout` e 60 s), `requestTimeout` (300 s), `keepAliveTimeout` (5 s),
`keepAliveTimeoutBuffer` (24.6, 1 s), `maxRequestsPerSocket`.
**Para que serve:** `server.close()` para de aceitar conexão e fecha as ociosas;
`closeAllConnections()` corta as ativas e, pela página, vem **depois** do `close`. Os dois
primeiros tetos protegem contra DoS "quando o servidor está sem proxy reverso na frente".
**Quando usar:** no desligamento (o framework expõe por cima: `app.close()` do Fastify,
`_doc-lib/fastify.md#Reference/Server`) e ao ajustar `keepAliveTimeout` acima do tempo ocioso do
proxy.

#### api/net
[doc](https://nodejs.org/docs/latest-v24.x/api/net.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/net.md)
**O que é:** TCP: `net.Server`, `net.Socket`, `socket.setTimeout`, `server.maxConnections`,
`net.isIP`, e `net.BlockList` (lista de endereço, faixa e sub-rede).
**Para que serve:** `BlockList` com `check(address)` decide se um IP resolvido cai em faixa
privada, loopback ou metadata.
**Quando usar:** no bloqueio de SSRF de URL vinda do usuário (`backend.md` §5.3), depois do DNS.

#### api/dns
[doc](https://nodejs.org/docs/latest-v24.x/api/dns.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/dns.md)
**O que é:** `dns.lookup` (resolvedor do sistema, roda no pool da libuv) e `dns.resolve*`
(consulta de rede, fora do pool); `node:dns/promises`.
**Para que serve:** a seção "Implementation considerations" mostra que `lookup` ocupa thread do
pool e pode travar fs, crypto e zlib sob carga (`UV_THREADPOOL_SIZE`).
**Quando usar:** ao resolver o host antes do teste de IP privado (SSRF) e ao investigar latência
que some quando o DNS responde rápido.

## Módulos e execução

#### api/packages
[doc](https://nodejs.org/docs/latest-v24.x/api/packages.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/packages.md)
**O que é:** `"type"`, `"exports"` (subpath, condicional, padrão `*`), `"imports"` (subpath
imports, sempre com `#`), autorreferência pelo nome, e package maps (24.20, experimental).
**Para que serve:** `"imports"` é o alias nativo da casa (`#core/*`, `#features/*`,
`architecture.md` §3); desde 24.14 aceita a forma `#/`. `"exports"` define o que `shared/` expõe
a backend e frontend.
**Quando usar:** ao criar alias, ao publicar `@<projeto>/shared` e ao ver `ERR_PACKAGE_PATH_NOT_EXPORTED`.

```json
{
  "type": "module",
  "imports": { "#core/*": "./app/core/*.js", "#features/*": "./app/features/*.js" }
}
```

#### api/esm
[doc](https://nodejs.org/docs/latest-v24.x/api/esm.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/esm.md)
**O que é:** ESM no Node: extensão obrigatória no especificador relativo, import attributes
(`with { type: 'json' }`), `import.meta.dirname`, `filename` (estáveis desde 24.0), `url`,
`main`, `resolve`, interoperação com CommonJS.
**Para que serve:** `import.meta.dirname` substitui `fileURLToPath(new URL('.', import.meta.url))`.
**Quando usar:** em script e comando que leem arquivo ao lado; ao entender por que `shared/`
importa com extensão (`tooling.md` §3).

#### api/modules
[doc](https://nodejs.org/docs/latest-v24.x/api/modules.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/modules.md)
**O que é:** CommonJS e `require(esm)`, estável desde 24.15 para módulo síncrono (sem
`await` no topo).
**Para que serve:** explica por que um pacote só ESM agora carrega em ferramenta CJS, e o erro
quando o módulo tem `await` no topo.
**Quando usar:** só ao diagnosticar ferramenta CJS. Código da casa é ESM.

#### api/typescript
[doc](https://nodejs.org/docs/latest-v24.x/api/typescript.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/typescript.md)
**O que é:** type stripping, estável desde 24.12 e ligado por padrão: o Node troca a anotação por
espaço e executa. Recusa sintaxe que precisa de transformação (enum, namespace com código,
parameter property, import alias), não transforma decorator, não lê `tsconfig.json` e recusa `.ts`
dentro de `node_modules`.
**Para que serve:** mostra por que o backend da casa não roda `.ts` direto no Node: injeção por
construtor usa parameter property, e o perfil Fastify usa decorator (`tooling.md` §3). Exige
`import type` para tipo, o que `verbatimModuleSyntax` já cobra.
**Quando usar:** em script solto de `scripts/` sem parameter property nem decorator; em app, o
runtime de TS é o do framework ou o build.

#### api/cli
[doc](https://nodejs.org/docs/latest-v24.x/api/cli.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/cli.md)
**O que é:** as flags: `--env-file` (estável desde 24.10; valor do ambiente vence o do arquivo;
vários arquivos, o último vence), `--env-file-if-exists`, `--watch` (estável), `--watch-path`,
`--unhandled-rejections` (padrão `throw`), `--permission`, `--enable-source-maps`,
`--disable-warning`, `--max-old-space-size`.
**Para que serve:** saber o que já vem do runtime antes de instalar `dotenv` ou `nodemon`.
**Quando usar:** em script de desenvolvimento e de CI. Em app, a leitura de `.env` é do leitor de
ENV (`backend.md` §6, `backend-fastify.md` §7), e `--env-file` só põe texto em `process.env`, sem
schema. `--inspect` nunca em produção (`tooling.md` §8.2).

#### api/util
[doc](https://nodejs.org/docs/latest-v24.x/api/util.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/util.md)
**O que é:** `parseArgs` (argumento de CLI), `styleText` (cor de terminal, estável, respeita
`NO_COLOR`/`FORCE_COLOR`), `promisify`, `inspect`, `aborted`, `types`, `deprecate`.
**Para que serve:** `parseArgs` e `styleText` dispensam pacote em script; `promisify` conserta a
perda de contexto do `AsyncLocalStorage` em API de callback.
**Quando usar:** em `scripts/` (guard-rail, sync, auditoria). Comando do framework usa as flags do
próprio framework (`_doc-lib/adonisjs.md#guides/ace/flags`).

```ts
import { parseArgs, styleText } from 'node:util'

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } })
if (values.check) process.stdout.write(`${styleText('green', 'ok')}\n`)
```

## Observabilidade e teste

#### api/diagnostics_channel
[doc](https://nodejs.org/docs/latest-v24.x/api/diagnostics_channel.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/diagnostics_channel.md)
**O que é:** canal nomeado de publicação (estável), `TracingChannel` (início, fim, erro de uma
operação) e os canais embutidos (`http.client.request.start`, `http.server.request.start`,
`http2.*`, `console.*`, `tracing:module.*`, `net`, `worker_threads`).
**Para que serve:** instrumentar sem monkey patch: biblioteca publica, APM assina.
**Quando usar:** ao ligar observabilidade (OpenTelemetry) ou medir chamada de saída sem tocar no
service. Não coberto pela régua.

#### api/perf_hooks
[doc](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/perf_hooks.md)
**O que é:** `performance.now`, `performance.mark`/`measure`, `eventLoopUtilization`,
`monitorEventLoopDelay` (histograma do atraso do laço).
**Para que serve:** medir se o laço está bloqueado em vez de supor.
**Quando usar:** ao investigar latência (`tooling.md` §10.3) e ao decidir se algo vai para
`worker_threads`.

#### api/test
[doc](https://nodejs.org/docs/latest-v24.x/api/test.html) | [markdown](https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/test.md)
**O que é:** o runner `node:test` (estável): `describe`/`it`, `mock` (função, módulo, timers),
cobertura, reporters, modo watch.
**Para que serve:** só referência. A casa testa com Japa (Adonis) e Vitest (Fastify e frontend),
`architecture.md` §8.
**Quando usar:** nunca em projeto da casa; leia para entender o reporter TAP ou o `mock.timers`
que outras ferramentas imitam.

## Guias (Learn)

#### learn/asynchronous-work/event-loop-timers-and-nexttick
[doc](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) | [markdown](https://raw.githubusercontent.com/nodejs/learn/main/pages/asynchronous-work/event-loop-timers-and-nexttick.md)
**O que é:** as fases do laço (timers, pending callbacks, poll, check, close),
`setImmediate` contra `setTimeout`, e `process.nextTick` fora das fases.
**Para que serve:** explicar por que `nextTick` recursivo mata o I/O de fome e por que a ordem
entre timer e immediate depende de onde foram agendados.
**Quando usar:** ao depurar ordem de execução e antes de usar `nextTick` (quase nunca é preciso).

#### learn/asynchronous-work/dont-block-the-event-loop
[doc](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop) | [markdown](https://raw.githubusercontent.com/nodejs/learn/main/pages/asynchronous-work/dont-block-the-event-loop.md)
**O que é:** o que roda no laço e no pool da libuv, e o que bloqueia cada um: ReDoS, `JSON.parse`
de corpo grande, API `*Sync`, cálculo pesado; particionar contra delegar (worker).
**Para que serve:** a base de "CPU vai para worker, I/O fica no laço" e do teto de tamanho de corpo.
**Quando usar:** ao escrever regex sobre entrada de usuário, ao aceitar corpo grande e ao escolher
entre fila e `worker_threads`.

#### learn/modules/backpressuring-in-streams
[doc](https://nodejs.org/en/learn/modules/backpressuring-in-streams) | [markdown](https://raw.githubusercontent.com/nodejs/learn/main/pages/modules/backpressuring-in-streams.md)
**O que é:** contrapressão: o que acontece quando o produtor é mais rápido que o consumidor
(memória, GC), o ciclo do `.pipe()` e as regras para stream próprio (respeitar o retorno de
`write()`, esperar `'drain'`).
**Para que serve:** mostra que ignorar o `false` de `write()` é o vazamento de memória que
`pipeline` evita.
**Quando usar:** ao escrever `Readable`/`Writable` próprio e ao exportar volume grande.

#### learn/getting-started/security-best-practices
[doc](https://nodejs.org/en/learn/getting-started/security-best-practices) | [markdown](https://raw.githubusercontent.com/nodejs/learn/main/pages/getting-started/security-best-practices.md)
**O que é:** o modelo de ameaça do Node em lista CWE: DoS do servidor HTTP (Slowloris, socket sem
ouvinte de erro), DNS rebinding, exposição de arquivo, request smuggling, timing attack, módulo de
terceiro malicioso, prototype pollution, caminho de busca não controlado, Permission Model, e
"recurso experimental em produção não é recomendado".
**Para que serve:** a checagem de borda do runtime que a régua aplica em `backend.md` §4.10 e
§5.3.
**Quando usar:** na varredura de segurança (`tooling.md` §10.4) e antes de expor servidor sem
proxy.

#### learn/command-line/how-to-read-environment-variables-from-nodejs
[doc](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs) | [markdown](https://raw.githubusercontent.com/nodejs/learn/main/pages/command-line/how-to-read-environment-variables-from-nodejs.md)
**O que é:** `process.env`, `--env-file`, vários arquivos (o último vence), precedência do
ambiente sobre o arquivo, `--env-file-if-exists` e `process.loadEnvFile`.
**Para que serve:** o que o runtime faz com `.env` sem biblioteca.
**Quando usar:** em script fora da aplicação. Na aplicação, `process.env` fora do leitor de ENV é
desvio (`backend-fastify.md` §7).

#### learn/getting-started/nodejs-the-difference-between-development-and-production
[doc](https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production) | [markdown](https://raw.githubusercontent.com/nodejs/learn/main/pages/getting-started/nodejs-the-difference-between-development-and-production.md)
**O que é:** "não há diferença entre desenvolvimento e produção no Node"; `NODE_ENV=production`
só muda bibliotecas, e a seção "Why is NODE_ENV considered an antipattern?".
**Para que serve:** sustenta a regra de não decidir comportamento por `NODE_ENV` espalhado.
**Quando usar:** ao revisar `if (process.env.NODE_ENV === ...)`: vira getter do leitor de ENV
(`backend-fastify.md` §7).
