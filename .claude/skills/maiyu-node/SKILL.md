---
name: maiyu-node
description: Use when writing or reviewing backend code in an AdonisJS or Fastify project of the house that touches the Node.js runtime, such as wrapping or rethrowing an error, an unhandled promise rejection, a timeout or AbortSignal on an outbound call, streams or pipe, request context or AsyncLocalStorage, graceful shutdown on SIGTERM, closing server, queue and database, UUID, token, HMAC or constant-time comparison, password hashing, spawning a process, worker threads, env files, ESM or package.json imports aliases, or a blocked event loop. Not for endpoint shape (maiyu-backend) and not for the type system (maiyu-typescript).
---

# Node Maiyu

**REQUIRED:** `maiyu-standards` (ordem de consulta). Esta skill é o roteiro do runtime no backend;
as regras estão nas seções citadas e não se repetem aqui. Regra: `_standards/backend.md`
(+ `backend-fastify.md`), `domain.md`, `tooling.md` §2 (piso Node ≥ 24) e §8 (imagem e entrega).
Contrato: `_doc-lib/nodejs.md`; abra o **link oficial** da entrada (o `[markdown]` cru) antes de
decidir (`AGENTS.md`, etapa 2).

Antes de instalar pacote para UUID, `.env`, argumento de CLI, glob, cor de terminal, timeout ou
contexto assíncrono: a stdlib da linha 24 resolve (`typescript.md` §6; `_doc-lib/nodejs.md`,
"Quando adotar").

## Perfil: o que o framework já faz por cima do Node

| Assunto | AdonisJS | Fastify |
|---|---|---|
| sinal e desligamento | o Ignitor ouve o sinal e chama `shutdown()` de cada provider (`backend.md` §3, linha "provider"; `_doc-lib/adonisjs.md#guides/concepts/application-lifecycle`) | `bin/server.ts` espera o sinal e fecha (`architecture.md` §3.3; `app.close()`, `_doc-lib/fastify.md#Reference/Server`) |
| erro que escapou | exception handler global (`backend.md` §5.5) | handler único no kernel (`backend-fastify.md` §6) |
| ENV | `start/env.ts` com `Env.create` (`backend.md` §6) | leitor síncrono (`backend-fastify.md` §7) |
| log com contexto da requisição | logger do framework, nunca `console` (`backend.md` §2, item 9) | `request.log` (`backend-fastify.md` §6) |
| alias de import | `"imports"` do `package.json` (`architecture.md` §3, `tooling.md` §3) | o mesmo |

## Roteiro por assunto

| Assunto | Regra da casa | Contrato (`_doc-lib/nodejs.md#…`) |
|---|---|---|
| **Erro** | falha de negócio é `left`, nunca `throw` (`typescript.md` §5, `backend.md` §4.2, `domain.md` §2); erro inesperado cai no `try` global do use-case (500 com tag e `code` do caminho) ou, fora dele (middleware, job, comando), no handler global (`backend.md` §5.5). Ao relançar erro de infraestrutura, `new Error(msg, { cause })` e decisão por `error.code` (`backend.md` §5.6, item 1) | `api/errors` |
| **Promessa** | sempre `await` (`backend.md` §2, item 8); `no-floating-promises` e `no-misused-promises` (`tooling.md` §4.1); "dispara e esquece" vai para fila (`backend.md` §4.12). Ouvinte de `unhandledRejection`/`uncaughtException` só loga e sai (`backend.md` §5.6, item 2) | `api/process`, `api/cli` (`--unhandled-rejections`) |
| **Timeout** | toda chamada de saída com `AbortSignal.timeout(ms)`, estouro vira `left` (`backend.md` §5.3, `solid.md` §2); retry só idempotente, com backoff | `api/globals#class-abortsignal`, `api/timers#timers-promises-api` |
| **Stream** | `pipeline` de `node:stream/promises`, com `signal`; `.pipe()` recusado pelo lint (`backend.md` §5.6, item 3) | `api/stream#streams-promises-api`, `learn/modules/backpressuring-in-streams` |
| **Contexto** | `AsyncLocalStorage` mora em `core/`: escopo de tenant (`architecture.md` §3.1) e transação (`domain.md` §6). `run`, nunca `enterWith` (experimental). Id de requisição no log: `HttpContext` no Adonis, `core/request-context.ts` no Fastify (`backend.md` §5.6, item 4) | `api/async_context`, `api/async_hooks` (não usar) |
| **Desligamento** | provider fecha pool no `shutdown()` (`backend.md` §3); fila fecha com `worker.close()` (`_doc-lib/bullmq.md#guide/workers/graceful-shutdown`); nada de `setInterval` no processo web (`backend.md` §4.12). Ordem, teto por timer `unref` e `exitCode` em vez de `exit()` (`backend.md` §5.6, item 5) | `api/process` (sinais, `exit`), `api/http` (`server.close`, `closeAllConnections`), `api/timers` (`unref`) |
| **Crypto** | chave de objeto `randomUUID()` (`backend.md` §5.4); token opaco por `randomBytes`, guardado como hash (`backend.md` §4.10); assinatura de webhook com `timingSafeEqual` sobre o corpo cru (`backend.md` §4.11); hash de senha só pelo framework (`_doc-lib/adonisjs.md#guides/security/hashing`). Hash de senha no Fastify: `crypto.scrypt` + `timingSafeEqual` num service (`backend.md` §5.6, item 6) | `api/crypto`, `api/buffer` |
| **Processo filho** | `spawn(binary, [args], { shell: false })`, valor de usuário depois de `--` (`backend.md` §5.3); spec de migration standalone por `child_process` (`backend.md` §7). `exec` nunca recebe entrada | `api/child_process` |
| **ENV** | um leitor só; `process.env` fora dele é desvio, inclusive `NODE_ENV` (`backend.md` §6, `backend-fastify.md` §7). `--env-file` só em script fora do app: põe texto em `process.env`, sem schema, e o ambiente vence o arquivo | `api/cli`, `learn/command-line/how-to-read-environment-variables-from-nodejs`, `learn/getting-started/nodejs-the-difference-between-development-and-production` |
| **Módulo** | ESM (`"type": "module"`); alias `#core/*`, `#features/*` pelo `"imports"` (`architecture.md` §3, `DECISIONS.md` #54); `shared/` expõe pelo `"exports"` e importa com extensão (`tooling.md` §3). Type stripping não roda o backend (parameter property, decorator) | `api/packages`, `api/esm`, `api/typescript` |
| **CPU e laço** | `worker_threads` só para CPU; I/O lento vai para fila (`backend.md` §4.12); código não confiável vai para `isolated-vm` (`_doc-lib/isolated-vm.md`) | `api/worker_threads`, `learn/asynchronous-work/dont-block-the-event-loop`, `api/perf_hooks` |
| **Borda de rede** | URL do usuário com allowlist de esquema e bloqueio de IP privado (`backend.md` §5.3); proxy confiável e cookie (`backend.md` §4.10) | `api/url`, `api/dns`, `api/net` (`BlockList`), `learn/getting-started/security-best-practices` |
| **Imagem** | `node:24-alpine`, servidor como `node` (com volume gravável: entrypoint só com `chown` + `su-exec node`), nunca `--inspect` nem `--insecure-http-parser` (`tooling.md` §8.2) | `api/cli` |

```ts
// app/services/cnpj/cnpj.service.ts: timeout is left, upstream breakage keeps the cause
async lookup(cnpj: string): Promise<Either<CnpjError, CnpjData>> {
  const signal = AbortSignal.timeout(5_000)
  try {
    const response = await fetch(`${this.baseUrl}/${cnpj}`, { signal })
    if (!response.ok) return left({ code: 'CNPJ_UPSTREAM_FAILED', status: response.status })
    return this.parse(await response.json()) // unknown until the schema (Zod, VineJS only on Adonis) (typescript.md §2)
  } catch (error) {
    if (signal.aborted) return left({ code: 'CNPJ_TIMEOUT' })
    throw new Error('cnpj lookup failed', { cause: error })
  }
}
```

## Red flags: pare e volte ao roteiro

| Pensamento | Realidade |
|---|---|
| "`throw new Error(err.message)` resolve" | Perde a pilha e o `code` original. `{ cause: error }` (`api/errors`) |
| "Ponho `process.on('uncaughtException')` e o servidor segue" | Estado indefinido; a doc manda limpar e sair (`api/process`) |
| "`promise.catch(() => {})` para calar o aviso" | Erro engolido. `await` e fila (`backend.md` §2, §4.12) |
| "O fornecedor sempre responde" | Sem teto, segura a requisição e o pool. `AbortSignal.timeout` (`backend.md` §5.3) |
| "`source.pipe(destination)`" | Origem com erro não fecha o destino. `pipeline` (`api/stream`) |
| "Passo o `requestId` de parâmetro em tudo" | ALS em `core/`, como o tenant (`architecture.md` §3.1) |
| "`process.exit(0)` no `SIGTERM`" | Corta I/O pendente e a resposta em voo. Fechar e deixar o laço esvaziar (`api/process`) |
| "`setInterval` limpa o expirado" | Morre no deploy e roda N vezes. Comando + cron (`backend.md` §4.12) |
| "`token === expected`" | Vaza tempo. `timingSafeEqual` com o mesmo tamanho (`api/crypto`) |
| "Faço o hash da senha com `createHash('sha256')`" | Hash rápido não é hash de senha. O do framework (`_doc-lib/adonisjs.md#guides/security/hashing`) |
| "`` exec(`convert ${name}`) ``" | Metacaractere vira comando. `spawn` sem shell, `--` antes do valor (`backend.md` §5.3) |
| "`dotenv` ou `--env-file` no app" | Um leitor só, com schema (`backend.md` §6) |
| "`if (process.env.NODE_ENV === 'production')`" | Getter do leitor de ENV (`backend-fastify.md` §7) |
| "Worker thread para paralelizar as chamadas HTTP" | Worker é para CPU; I/O já é assíncrono (`api/worker_threads`) |
| "Alias pelo `paths` do tsconfig" | `"imports"` do `package.json`, nativo do Node (`architecture.md` §3) |
| "Rodo o `.ts` direto com `node`" | Type stripping recusa parameter property e decorator (`api/typescript`) |

## Fluxo

Etapa 4 de `AGENTS.md` ("Fluxo de uma tarefa"), ao lado de `maiyu-backend` (que dá a forma do
endpoint, do use-case e do service) e de `maiyu-typescript` (o tipo). Antes: `maiyu-standards` e o
plano. Durante: `superpowers:test-driven-development`; diff que toca processo filho, cripto, ENV ou
borda de rede passa por `/claude-security` "Scan changes" (`tooling.md` §10.4). Depois:
`superpowers:verification-before-completion` → `superpowers:requesting-code-review` →
`caveman-commit` (regras de commit em `code-pattern` §9).
