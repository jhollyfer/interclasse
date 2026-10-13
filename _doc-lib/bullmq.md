# BullMQ

Sistema de filas em Redis para Node.js, feito para trabalho assíncrono distribuído entre processos.

> Conferido contra `bullmq@6.3.12`

**O que é:** uma biblioteca que transforma o Redis em um sistema de filas com semântica de entrega
garantida. Você declara uma `Queue` (quem adiciona), um `Worker` (quem processa) e o BullMQ cuida do
resto: estado do job, retentativa, atraso, prioridade e redistribuição quando um processo morre. A
decisão técnica que sustenta tudo é que **cada transição de estado é um script Lua atômico** rodando
dentro do Redis, com pipelining — não há janela entre "peguei o job" e "marquei como ativo" em que
dois workers possam pegar o mesmo item.

**Para que serve:** tirar do ciclo da requisição HTTP tudo que não precisa acontecer agora — envio de
e-mail, geração de relatório, processamento de imagem, chamada a API de terceiro — e ganhar de brinde
retentativa com backoff, agendamento por cron e limite de taxa. O outro uso, menos óbvio e igualmente
forte, é **desacoplar serviços**: um processo publica, outro consome, e se o consumidor cair o
trabalho fica na fila em vez de se perder.

**Como usar:**

```bash
npm install bullmq
```

```ts
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'

// Worker EXIGE maxRetriesPerRequest: null. Sem isso, ele para de tentar
// reconectar depois de 20 falhas e o processo vira um zumbi silencioso.
const connection = new IORedis({ maxRetriesPerRequest: null })

const queue = new Queue('emails', { connection })
await queue.add('welcome', { userId: 'usr_1' })

const worker = new Worker(
  'emails',
  async (job) => {
    await sendEmail(job.data.userId)
    return 'sent'
  },
  { connection },
)
```

**Quando usar a biblioteca:** quando houver **trabalho que pode falhar e precisa ser retentado**, ou
trabalho que demora mais do que um cliente HTTP aceita esperar. Em stack Node com Redis já presente,
essa é a escolha padrão: o Redis é o mesmo que serve de cache, e a fila não acrescenta
infraestrutura nova. O gatilho negativo também é claro — se o trabalho é rápido, não pode falhar e
não precisa sobreviver a um restart, `await` direto no handler é mais simples e você não paga o custo
de operar uma fila.

As cinco classes, e o que cada uma resolve:

| Classe | Papel |
|---|---|
| `Queue` | Produtor. Adiciona jobs, pausa, limpa, consulta contadores |
| `Worker` | Consumidor. Recebe o job, executa o processador, marca completo ou falho |
| `Job` | O item em si: `data`, `opts`, `returnvalue`, `progress` e os métodos de transição |
| `QueueEvents` | Eventos **globais**, via Redis streams: um processo vê o que os outros fizeram |
| `FlowProducer` | Árvore de jobs pai × filho, com o pai esperando os filhos terminarem |

**Três exigências do Redis que não são negociáveis**, e que a doc repete em mais de uma página:

| O quê | Por quê |
|---|---|
| `maxmemory-policy = noeviction` | O BullMQ não funciona se o Redis descartar chaves por conta própria. Com outra política, jobs somem e o erro que aparece é "Missing lock", que não parece ter relação nenhuma |
| `maxRetriesPerRequest: null` no Worker | Garante que o worker continue processando enquanto houver conexão. No `Queue` que serve um endpoint HTTP é o contrário: valor baixo, para falhar rápido |
| Persistência AOF, `appendfsync everysec` | Fila é estado, não cache. Sem AOF, um restart do Redis perde jobs pendentes |

**O detalhe que economiza horas — o encerramento.** É o erro mais comum, e ele se manifesta de duas
maneiras opostas. A primeira: o processo recebe `SIGTERM`, o orquestrador espera, nada acontece, e o
container só morre no `SIGKILL` — porque `Worker`, `Queue` e `QueueEvents` mantêm conexões Redis
abertas e o event loop não esvazia. A segunda, pior: o `SIGKILL` chega no meio de um job, o lock
expira, e aquele job fica travado até o mecanismo de *stalled* devolvê-lo. A correção cabe em cinco
linhas, e está na página `guide/going-to-production`:

```ts
const gracefulShutdown = async (signal: string) => {
  await worker.close() // para de aceitar jobs novos e espera os atuais
  await queue.close()
  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
```

`worker.close()` **não tem timeout próprio**. Se o job pode demorar cinco minutos, o encerramento
demora cinco minutos, e o `terminationGracePeriodSeconds` do orquestrador precisa saber disso. Jobs
com timeout próprio (`patterns/timeout-jobs`) existem em parte por causa disso.

**A outra decisão que separa quem já apanhou:** nem toda falha merece retentativa. Um timeout de rede
merece — a próxima tentativa pode dar certo. Um payload inválido, uma credencial errada ou um
registro que não existe **não**: repetir três vezes com backoff exponencial só atrasa o inevitável e
enche o log de ruído idêntico. Para essa segunda classe existe o `UnrecoverableError`, que manda o
job direto para o conjunto de falhos ignorando o `attempts` configurado. A regra prática é perguntar
"o que mudou entre esta tentativa e a próxima?" — se a resposta é "nada", é `UnrecoverableError`.

**Se você vem do Bull (o antecessor), leia a seção de migração antes de qualquer coisa.** A doc é
explícita em dizer que as duas divergiram demais para haver compatibilidade, e a migração é feita
rodando as duas em paralelo, não convertendo código.

**Links:** 45.

**Skills:** `maiyu-backend`, `observability-and-instrumentation`, `debugging-and-error-recovery`. Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### quick-start
[doc](https://docs.bullmq.io/quick-start)

**O que é:** instalação e o menor exemplo completo: uma `Queue`, dois jobs, um `Worker` e os
listeners de `completed` e `failed`.
**Para que serve:** ter algo rodando antes de entender a arquitetura.
**Quando usar:** no primeiro contato. Repare que o exemplo do worker já traz
`maxRetriesPerRequest: null` — não é enfeite, e copiar sem ele é a primeira pegadinha da biblioteca.

```ts
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'

const myQueue = new Queue('foo')

await myQueue.add('myJobName', { foo: 'bar' })
await myQueue.add('myJobName', { qux: 'baz' })

const connection = new IORedis({ maxRetriesPerRequest: null })

const worker = new Worker(
  'foo',
  async (job) => {
    console.log(job.data)
  },
  { connection },
)

worker.on('completed', (job) => console.log(`${job.id} has completed!`))
worker.on('failed', (job, err) => console.log(`${job.id} has failed with ${err.message}`))
```

```ts
// Caso real da stack: contrato (abstract class) + impl com DI por construtor.
export abstract class WelcomeQueueContractService {
  abstract enqueue(userId: string): Promise<string>
}

@Service()
export default class BullMQWelcomeQueueService implements WelcomeQueueContractService {
  constructor(private readonly redis: RedisContractService) {}

  private readonly queue = new Queue('welcome', {
    connection: this.redis.createQueueConnection(),
  })

  async enqueue(userId: string): Promise<string> {
    const job = await this.queue.add('welcome', { userId })
    return job.id ?? ''
  }
}
```

```ts
// errado: sem maxRetriesPerRequest: null, o worker para de tentar
// reconectar depois de 20 falhas e o processo vira um zumbi silencioso.
const connection = new IORedis()
const worker = new Worker('foo', processor, { connection })

// certo: o worker precisa de conexão persistente, nunca de retry limitado.
const connectionOk = new IORedis({ maxRetriesPerRequest: null })
const workerOk = new Worker('foo', processor, { connection: connectionOk })
```

#### guide/introduction
[doc](https://docs.bullmq.io/guide/introduction)

**O que é:** a apresentação das classes centrais — `Queue`, `Worker`, `QueueEvents` e
`FlowProducer` — e do que é um job.
**Para que serve:** o vocabulário mínimo, antes de escolher qual página abrir depois.
**Quando usar:** logo depois do quick start, para saber que os workers podem viver no mesmo processo,
em processos separados ou em máquinas diferentes — é essa liberdade que faz a fila escalar
horizontalmente.

```ts
import { Queue, Worker, QueueEvents, FlowProducer } from 'bullmq'

// Produtor e consumidor não precisam estar no mesmo processo.
// O que os liga é o NOME da fila e o Redis, nada mais.
const queue = new Queue('transcode')        // processo da API
const worker = new Worker('transcode', fn)  // processo do worker
const events = new QueueEvents('transcode') // processo do dashboard
```

```ts
// Caso real da stack: cada classe injetada por construtor, uma por processo.
export abstract class TranscodeContractService {
  abstract enqueue(fileId: string): Promise<void>
}

@Service()
export default class BullMQTranscodeService implements TranscodeContractService {
  constructor(private readonly redis: RedisContractService) {}

  private readonly queue = new Queue('transcode', {
    connection: this.redis.createQueueConnection(),
  })

  async enqueue(fileId: string): Promise<void> {
    await this.queue.add('transcode', { fileId })
  }
}
```

```ts
// errado: instanciar Worker dentro do Queue (ou vice-versa) acopla
// produtor e consumidor ao mesmo processo, perdendo a escala horizontal.
class BrokenService {
  private readonly queue = new Queue('transcode')
  private readonly worker = new Worker('transcode', async (job) => job.data)
}

// certo: cada papel na sua classe; o que liga os dois é só o NOME da fila.
class ProducerService {
  private readonly queue = new Queue('transcode')
}
class ConsumerService {
  private readonly worker = new Worker('transcode', async (job) => job.data)
}
```

#### guide/architecture
[doc](https://docs.bullmq.io/guide/architecture)

**O que é:** a máquina de estados do job: `wait`, `prioritized`, `delayed`, `active`, `completed`,
`failed` e, com flows, `waiting-children`.
**Para que serve:** entender por onde um job passa, o que é indispensável na hora de investigar um
job "sumido".
**Quando usar:** **antes de escrever a primeira tela de monitoramento**, e sempre que um job parecer
não estar em lugar nenhum. Vale saber que `prioritized` e `delayed` são conjuntos separados de
`wait` — um job atrasado não aparece numa contagem de `wait`.

```ts
// Onde um job pode estar, e o que move ele dali:
//
//   wait ──────────► active ──► completed
//   prioritized ───►   │    └─► failed (pode voltar a wait se houver attempts)
//   delayed ───────►   │
//   waiting-children ──┘  (só com FlowProducer: espera os filhos)
//
// Prioridade: 1 a 2.097.151, MENOR número = MAIOR prioridade.
// Prioridade 0 (o default) vem antes de qualquer job priorizado.

const state = await job.getState() // 'waiting' | 'active' | 'delayed' | ...
```

```ts
// Caso real da stack: expor o estado num use-case, sem mexer na fila.
type Response = Either<HTTPException, { readonly state: string }>

export default class CheckImportStatusUseCase {
  constructor(private readonly importQueue: ImportQueueContractService) {}

  async execute(jobId: string): Promise<Response> {
    const state = await this.importQueue.getJobState(jobId)
    return right({ state })
  }
}
```

```ts
// errado: contar "pendente" somando só wait ignora prioritized e delayed —
// são conjuntos separados, e o número sempre fica menor que o real.
const counts = await queue.getJobCounts('wait')

// certo: soma os quatro estados que significam "ainda não processou".
const all = await queue.getJobCounts('wait', 'prioritized', 'delayed', 'active')
const pending = all.wait + all.prioritized + all.delayed
```

#### guide/connections
[doc](https://docs.bullmq.io/guide/connections)

**O que é:** como o BullMQ fala com o Redis: o cliente `ioredis` por padrão, os adaptadores para
`node-redis`, Bun e Valkey Glide, reuso de conexão e o que o Redis precisa ter configurado.
**Para que serve:** a página que decide se a sua fila é confiável ou não.
**Quando usar:** **antes de subir qualquer coisa**, e de novo ao contar conexões. Um `Worker`
duplica a conexão internamente para as operações bloqueantes, então "uma instância de `IORedis`
compartilhada" não significa "uma conexão no Redis" — em provedor que cobra por conexão, essa conta
surpreende.

```ts
import IORedis from 'ioredis'
import { Queue, Worker } from 'bullmq'

// Uma instância compartilhada por vários objetos.
const connection = new IORedis({ maxRetriesPerRequest: null })

const worker = new Worker('myQueue', processor, { connection })

// O Queue de um endpoint HTTP quer o OPOSTO: falhar rápido em vez de
// insistir para sempre, para o cliente receber um erro em vez de pendurar.
const producer = new Queue('myQueue', {
  connection: new IORedis({ maxRetriesPerRequest: 1 }),
})

// Exigência do servidor Redis, não da biblioteca:
//   maxmemory-policy noeviction
// Com qualquer outra política, chaves de job podem ser descartadas e os
// erros que aparecem não têm relação aparente com memória.
```

```ts
// Caso real da stack: conexão resolvida pelo contrato de Redis, nunca
// instanciada inline no service — o service não sabe de host/porta/senha.
@Service()
export default class BullMQEmailQueueService implements EmailQueueContractService {
  constructor(private readonly redis: RedisContractService) {}

  private readonly queue = new Queue('emails', {
    connection: this.redis.createQueueConnection(), // já vem com o maxRetriesPerRequest certo
  })
}
```

```ts
// errado: uma conexão ioredis por Queue/Worker criado — esgota o limite
// de conexões do provedor bem antes do esperado.
for (const name of queueNames) {
  const connection = new IORedis({ maxRetriesPerRequest: null })
  queues.push(new Queue(name, { connection }))
}

// certo: uma conexão compartilhada entre as instâncias do mesmo processo.
const connection = new IORedis({ maxRetriesPerRequest: null })
const queues = queueNames.map((name) => new Queue(name, { connection }))
```

#### guide/parallelism-and-concurrency
[doc](https://docs.bullmq.io/guide/parallelism-and-concurrency)

**O que é:** a diferença entre paralelismo (núcleos e máquinas de verdade) e concorrência (o event
loop do Node alternando entre tarefas que esperam IO).
**Para que serve:** escolher o número certo de `concurrency` em vez de chutar.
**Quando usar:** ao dimensionar workers. A regra que a página dá é direta: job pesado de IO aguenta
concorrência de 100 a 300 por worker; job pesado de CPU **piora** com concorrência alta, e só melhora
com mais processos.

```ts
// Job de IO (chamada HTTP, consulta ao banco): concorrência alta compensa,
// porque o event loop aproveita a espera de um job para tocar os outros.
new Worker('webhooks', callExternalApi, { concurrency: 200 })

// Job de CPU (redimensionar imagem, gerar PDF): concorrência alta só
// adiciona overhead e ainda arrisca travar o loop, o que vira job stalled.
// Aqui o ganho vem de MAIS PROCESSOS, um por núcleo.
new Worker('thumbnails', resizeImage, { concurrency: 2 })
```

```ts
// Caso real da stack: concorrência configurada por ENV, não fixa no código
// — cada ambiente (dev, produção) escala diferente sem redeploy de código.
protected createWorker(): Worker<EmailJobPayload> {
  return new Worker<EmailJobPayload>(EMAIL_QUEUE_NAME, this.process, {
    connection: this.redis.createQueueConnection(),
    concurrency: Env.EMAIL_WORKER_CONCURRENCY, // IO: 50–200 é razoável
  })
}
```

```ts
// errado: job de CPU (gerar PDF, redimensionar imagem) com concorrência
// alta só faz o event loop fila e produz jobs stalled — nada roda em paralelo.
new Worker('thumbnails', resizeImageSync, { concurrency: 50 })

// certo: concorrência baixa, mais PROCESSOS (um por núcleo) para CPU.
new Worker('thumbnails', resizeImageSync, { concurrency: 1 })
```

## Adicionar jobs

#### guide/jobs/fifo
[doc](https://docs.bullmq.io/guide/jobs/fifo)

**O que é:** o job comum, processado na ordem em que entrou, e o `defaultJobOptions` da fila.
**Para que serve:** o caso de 90% das filas.
**Quando usar:** sempre, como ponto de partida. Coloque as opções que valem para todos os jobs no
`defaultJobOptions` da `Queue`, não repetidas em cada `add` — é lá que `removeOnComplete` e
`attempts` deveriam morar.

```ts
import { Queue } from 'bullmq'

// Defaults na fila: cada add() herda, e pode sobrescrever pontualmente.
const queue = new Queue('Paint', {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
})

await queue.add('wall', { color: 'pink' })

// FIFO é a ordem de ENTRADA, não a de término: com vários workers e jobs
// de durações diferentes, terminar fora de ordem é o esperado.
```

```ts
// Caso real da stack: defaultJobOptions no createQueue(), nunca repetido
// a cada add() — é a base que as filas do backend estendem.
protected createQueue(): Queue {
  return new Queue(EMAIL_QUEUE_NAME, {
    connection: this.redis.createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  })
}
```

```ts
// errado: opção repetida em cada chamada de add() — uma fila com 10
// pontos de enqueue é 10 lugares para esquecer de atualizar junto.
await queue.add('wall', data, { removeOnComplete: true, attempts: 3 })
await queue.add('roof', data, { removeOnComplete: true, attempts: 3 })

// certo: definido uma vez, em defaultJobOptions; add() só manda o que varia.
const queue = new Queue('paint', {
  defaultJobOptions: { removeOnComplete: true, attempts: 3 },
})
await queue.add('wall', data)
await queue.add('roof', data)
```

#### guide/jobs/job-data
[doc](https://docs.bullmq.io/guide/jobs/job-data)

**O que é:** o campo `data` do job, o `updateData`, e o fato de que tudo trafega como JSON
serializado.
**Para que serve:** saber o que sobrevive à viagem até o worker.
**Quando usar:** **antes de mandar qualquer coisa que não seja objeto simples**. `undefined`,
funções, `BigInt` e referências circulares se perdem, e instância de classe chega do outro lado como
objeto puro, sem métodos. O tipo genérico do TypeScript descreve o **formato do JSON**, não a classe
em runtime — ele mente com toda a boa fé.

```ts
import { Queue } from 'bullmq'

const myQueue = new Queue('paint')
const job = await myQueue.add('wall', { color: 'red' })
job.data // { color: 'red' }

await job.updateData({ color: 'blue' })

// O padrão recomendado: mandar objeto puro e reconstruir no processador.
class Message {
  constructor(public token: string, public timestamp: number) {}
  getTimestamp() {
    return this.timestamp
  }
}

await myQueue.add('send', { token: 't', timestamp: Date.now() })

const worker = new Worker('paint', async (job) => {
  const msg = new Message(job.data.token, job.data.timestamp)
  msg.getTimestamp() // funciona; job.data.getTimestamp() NÃO existiria
})
```

```ts
// Caso real da stack: payload tipado como objeto puro na fronteira entre
// contrato e worker — é o que atravessa o Redis como JSON.
export type EmailJobPayload = {
  readonly to: string
  readonly subject: string
  readonly template: string
}

export abstract class EmailQueueContractService {
  abstract enqueue(payload: EmailJobPayload): Promise<string>
}
```

```ts
// errado: mandar uma instância de classe — o worker recebe o objeto puro,
// sem os métodos, e `job.data.toReceipt()` estoura em runtime.
class Invoice {
  constructor(public amount: number) {}
  toReceipt() {
    return `R$ ${this.amount}`
  }
}
await queue.add('bill', new Invoice(100))

// certo: objeto puro; reconstrói a classe DENTRO do processador se precisar.
await queue.add('bill', { amount: 100 })
new Worker('bill', async (job) => new Invoice(job.data.amount).toReceipt())
```

#### guide/jobs/delayed
[doc](https://docs.bullmq.io/guide/jobs/delayed)

**O que é:** o job que vai para um conjunto separado e só é promovido depois de N milissegundos, e o
`changeDelay` para reagendar.
**Para que serve:** "manda esse e-mail daqui a uma hora", "tenta de novo às 3h".
**Quando usar:** sempre que a hora importar. Atenção a duas coisas: o atraso é um **piso**, não uma
promessa — só roda quando houver worker livre; e `changeDelay` conta a partir de **agora**, não do
agendamento original.

```ts
import { Queue } from 'bullmq'

const myQueue = new Queue('Paint')

// Pelo menos 5 segundos de espera.
await myQueue.add('house', { color: 'white' }, { delay: 5000 })

// Para um instante específico, o delay é a diferença até lá.
const targetTime = new Date('2035-07-03T10:30:00')
const delay = Number(targetTime) - Number(new Date())
await myQueue.add('house', { color: 'white' }, { delay })

// Reagendar: 4s A PARTIR DE AGORA, ignorando o delay original.
await job.changeDelay(4000)
// Só funciona em job que ainda está no estado delayed.
```

```ts
// Caso real da stack: agendar um lembrete sem Job Scheduler, como caso
// único (o Scheduler é para RECORRENTE; delay isolado é para uma vez só).
export default class SendDigestReminderUseCase {
  constructor(private readonly emailQueue: EmailQueueContractService) {}

  async execute(userId: string, sendAt: Date): Promise<Either<HTTPException, string>> {
    const delay = Number(sendAt) - Date.now()
    const jobId = await this.emailQueue.enqueue({ userId, delay })
    return right(jobId)
  }
}
```

```ts
// errado: tratar delay como garantia de horário exato — não é promessa,
// é um PISO; se não houver worker livre, o job espera além do previsto.
await queue.add('alert', data, { delay: 0 }) // "roda imediatamente"

// certo: delay é "não antes de". Para horário crítico, confira na própria
// execução se ainda vale a pena, e trate atraso como esperado.
new Worker('alert', async (job) => {
  if (Date.now() - job.timestamp > 60_000) return // atrasou demais, descarta
  await sendAlert(job.data)
})
```

#### guide/jobs/prioritized
[doc](https://docs.bullmq.io/guide/jobs/prioritized)

**O que é:** a opção `priority`, com valores de 1 a 2.097.151, e o `changePriority`.
**Para que serve:** deixar o job interativo passar na frente do job de lote.
**Quando usar:** com parcimônia, e sabendo da inversão: **número menor é prioridade maior**, e
prioridade `0` (o default, "sem prioridade") vem **antes** de qualquer job priorizado. Marcar um job
como `priority: 1` achando que ele passa na frente de todos coloca ele atrás dos jobs sem prioridade
nenhuma.

```ts
import { Queue } from 'bullmq'

const myQueue = new Queue('Paint')

await myQueue.add('wall', { color: 'pink' }, { priority: 10 })
await myQueue.add('wall', { color: 'brown' }, { priority: 5 })
await myQueue.add('wall', { color: 'blue' }, { priority: 7 })
// Ordem de processamento: brown (5), blue (7), pink (10).

await job.changePriority({ priority: 1 })

// Consultas específicas: jobs priorizados não aparecem em getJobs(['wait']).
const jobs = await myQueue.getPrioritized()
const counts = await myQueue.getCountsPerPriority([1, 0])
```

```ts
// Caso real da stack: plano pago sobe na frente do gratuito — a regra de
// negócio decide o número, o use-case não conhece BullMQ.
export default class EnqueueExportUseCase {
  constructor(private readonly exportQueue: ExportQueueContractService) {}

  async execute(workspace: Workspace): Promise<Either<HTTPException, string>> {
    const priority = workspace.plan === 'pro' ? 1 : 10
    const jobId = await this.exportQueue.enqueue({ workspace }, { priority })
    return right(jobId)
  }
}
```

```ts
// errado: priority: 1 pensando em "o mais alto": fica ATRÁS dos jobs sem
// prioridade (priority: 0, o default), que sempre vêm primeiro.
await queue.add('export', data, { priority: 1 })
await queue.add('export-comum', data) // priority 0 — processa ANTES

// certo: para furar a fila de verdade, o comum também precisa de prioridade.
await queue.add('export', data, { priority: 1 })
await queue.add('export-comum', data, { priority: 100 })
```

#### guide/jobs/job-ids
[doc](https://docs.bullmq.io/guide/jobs/job-ids)

**O que é:** o id do job — gerado por contador incremental, ou definido por você via `jobId` — e as
regras do id customizado.
**Para que serve:** a forma mais simples de não processar a mesma coisa duas vezes: adicionar um job
com id já existente é **ignorado**.
**Quando usar:** quando a origem do job tem um identificador natural (`invoice-4821`,
`user-1-digest-2026-09-23`). Duas restrições que a doc dá e que geram erro só em produção: o id
**não pode conter `:`**, e **não pode ser só dígitos** (`"123"` colide com o formato gerado; o erro é
`Custom Id cannot be integers`).

```ts
// Idempotência de graça: chamar duas vezes cria um job só.
await myQueue.add('wall', { color: 'pink' }, { jobId: 'invoice-4821' })
await myQueue.add('wall', { color: 'pink' }, { jobId: 'invoice-4821' }) // ignorado

// ERRADO: dois pontos é separador interno; só dígitos colide com o contador.
// { jobId: 'user:42' }   { jobId: '123' }
// CERTO:
// { jobId: 'user-42' }   { jobId: 'job-123' }

// A pegadinha que casa com removeOnComplete: job REMOVIDO deixa de contar
// como duplicata. Se a retenção apagar o job, o mesmo id entra de novo.
```

```ts
// Caso real da stack: id natural a partir do domínio, montado num helper
// compartilhado — nunca string concatenada à mão em cada chamador.
protected buildJobId(jobName: string): string {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `${jobName}-${Date.now()}-${suffix}` // nunca usa ':'
}
```

```ts
// errado: jobId só com dígitos colide com o formato do contador interno,
// e dois-pontos quebra a montagem de chave do Redis — ambos estouram erro.
await queue.add('invoice', data, { jobId: '4821' })
await queue.add('invoice', data, { jobId: 'user:42' })

// certo: separador '-', e pelo menos um caractere não numérico.
await queue.add('invoice', data, { jobId: 'invoice-4821' })
await queue.add('invoice', data, { jobId: 'user-42' })
```

#### guide/jobs/deduplication
[doc](https://docs.bullmq.io/guide/jobs/deduplication)

**O que é:** a opção `deduplication`, com `id`, `ttl`, `extend`, `replace` e `keepLastIfActive` — três
modos distintos de "não faça isso de novo agora".
**Para que serve:** a versão com janela de tempo do que o `jobId` faz de forma absoluta.
**Quando usar:** em evento que chega em rajada — webhook barulhento, salvamento automático,
reindexação disparada por cada alteração. O modo *debounce* (`ttl` + `extend` + `replace` + `delay`)
é o que a maioria quer sem saber o nome: enquanto os eventos chegarem, adia; quando pararem, executa
uma vez com os dados mais recentes.

```ts
// Simples: dedupe até o job completar ou falhar.
await myQueue.add('house', { color: 'white' }, {
  deduplication: { id: 'customValue' },
})

// Throttle: ignora duplicatas dentro da janela de 5s.
await myQueue.add('house', { color: 'white' }, {
  deduplication: { id: 'customValue', ttl: 5000 },
})

// Debounce: substitui o job anterior e reinicia a janela a cada evento.
await myQueue.add('house1', { color: 'white' }, {
  deduplication: { id: 'customValue', ttl: 5000, extend: true, replace: true },
  delay: 5000,
})

queueEvents.on('deduplicated', ({ jobId, deduplicationId, deduplicatedJobId }) => {
  console.log(`Job ${deduplicatedJobId} foi deduplicado`)
})

await myQueue.removeDeduplicationKey('customValue')
```

#### guide/queues/adding-bulks
[doc](https://docs.bullmq.io/guide/queues/adding-bulks)

**O que é:** `addBulk`, que adiciona vários jobs de uma vez, de forma atômica.
**Para que serve:** "ou entram todos, ou não entra nenhum", com uma ida ao Redis em vez de N.
**Quando usar:** sempre que o número de jobs vier de uma lista — um disparo para todos os assinantes,
uma importação de planilha. Um `for` com `await queue.add()` dentro paga um round-trip por item e
ainda deixa a fila pela metade se falhar no meio.

```ts
import { Queue } from 'bullmq'

const queue = new Queue('paint')
const name = 'jobName'

const jobs = await queue.addBulk([
  { name, data: { paint: 'car' } },
  { name, data: { paint: 'house' } },
  { name, data: { paint: 'boat' } },
])

// Cada item aceita opts próprio:
// { name, data: { ... }, opts: { delay: 1000, priority: 5 } }
```

## Processar

#### guide/workers/concurrency
[doc](https://docs.bullmq.io/guide/workers/concurrency)

**O que é:** a opção `concurrency`, quantos jobs uma instância de `Worker` processa ao mesmo tempo, e
como alterá-la em runtime.
**Para que serve:** aproveitar a espera de IO em vez de processar um job por vez.
**Quando usar:** em todo worker cujo trabalho seja assíncrono. A página é explícita: a concorrência
**só existe se o job faz operação assíncrona**. Um processador que faz cálculo puro com
`concurrency: 50` não fica 50 vezes mais rápido — ele monopoliza o event loop e começa a produzir
jobs stalled.

```ts
import { Worker, Job } from 'bullmq'

const worker = new Worker(
  queueName,
  async (job: Job) => {
    return 'some value'
  },
  { concurrency: 50 },
)

// Ajustável com o worker já rodando.
worker.concurrency = 5

// A doc prefere VÁRIOS WORKERS a um worker com concorrência gigante:
// vários processos dão disponibilidade maior e distribuem por máquinas.
```

```ts
// Caso real da stack: concorrência por ENV, lida uma vez no createWorker().
protected createWorker(): Worker<FileImportJobPayload> {
  return new Worker<FileImportJobPayload>(QUEUE_NAME, this.process, {
    connection: this.redis.createQueueConnection(),
    concurrency: Env.FILE_IMPORT_WORKER_CONCURRENCY,
  })
}
```

```ts
// errado: ajustar concurrency direto na opção depois de criado não existe
// — a opção só vale na construção do Worker.
const worker = new Worker('foo', processor, { concurrency: 5 })
worker.opts.concurrency = 50 // não tem efeito nenhum

// certo: em runtime, é a PROPRIEDADE do worker que muda o comportamento.
worker.concurrency = 50
```

#### guide/queues/global-concurrency
[doc](https://docs.bullmq.io/guide/queues/global-concurrency)

**O que é:** `setGlobalConcurrency`, um teto de jobs simultâneos válido para **todas** as instâncias
de worker da fila.
**Para que serve:** o "no máximo N ao mesmo tempo" que a concorrência local não consegue dar, porque
ela só conhece o próprio processo.
**Quando usar:** quando o limite é do recurso do outro lado, não do seu processo — um banco legado
que aguenta duas conexões, uma licença de software, um `setGlobalConcurrency(1)` para serializar de
verdade. A concorrência do worker vira um sub-limite: ela nunca ultrapassa a global.

```ts
// Teto absoluto: 4 jobs em execução na fila inteira, somando todos os workers.
await queue.setGlobalConcurrency(4)

const globalConcurrency = await queue.getGlobalConcurrency()

await queue.removeGlobalConcurrency()

// Com 10 workers de concurrency: 10 cada, o global de 4 ainda manda.
// O valor local é o máximo POR WORKER, nunca mais do que o global.
```

#### guide/workers/sandboxed-processors
[doc](https://docs.bullmq.io/guide/workers/sandboxed-processors)

**O que é:** o processador declarado em arquivo separado, que roda em outro processo (ou numa worker
thread, com `useWorkerThreads`), isolado do resto do código.
**Para que serve:** impedir que um job pesado de CPU trave o event loop e derrube o controle dos
outros jobs.
**Quando usar:** em trabalho de CPU — imagem, PDF, criptografia, parsing de arquivo grande. É a
resposta certa para job stalled causado por CPU; aumentar `lockDuration` só disfarça o sintoma.

```ts
// my_processor.ts — arquivo separado, roda fora do processo principal
import { SandboxedJob } from 'bullmq'

module.exports = async (job: SandboxedJob) => {
  // trabalho pesado de CPU, sem travar o event loop de quem coordena
}
```

```ts
import { Worker } from 'bullmq'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const processorFile = path.join(__dirname, 'my_processor.js')
const worker = new Worker(queueName, processorFile)

// Em Windows, a doc recomenda a forma com URL.
const processorUrl = pathToFileURL(path.join(__dirname, 'my_processor.js'))
new Worker(queueName, processorUrl)

// Worker threads (v3.13.0+): mais barato que processo, mas ainda duplica
// o runtime do Node. Mantenha a concorrência em números sensatos.
new Worker(queueName, processorFile, { useWorkerThreads: true })
```

#### guide/workers/pausing-queues
[doc](https://docs.bullmq.io/guide/workers/pausing-queues)

**O que é:** a diferença entre pausar a fila (global, via `Queue`) e pausar um worker (local, só
aquela instância).
**Para que serve:** parar o consumo sem derrubar processo e sem perder o que está na fila.
**Quando usar:** em janela de manutenção, em deploy de migração de banco, ou quando a API de terceiro
que o job chama está fora. Pausa global impede **todos** os workers de pegar job novo; pausa local
afeta só a instância onde você chamou. Ambas esperam os jobs em andamento terminarem, a menos que
você peça o contrário.

```ts
// Global: nenhum worker pega job novo. Quem está processando termina.
await myQueue.pause()
await myQueue.resume() // em v6 este resume é assíncrono e PRECISA de await

// Local: só esta instância para.
await myWorker.pause()

// Local e imediato: não espera os jobs em andamento.
await myWorker.pause(true)
```

```ts
// Caso real da stack: pausar a fila inteira numa janela de manutenção,
// disparado por um use-case administrativo, nunca direto num controller.
export default class PauseImportQueueUseCase {
  constructor(private readonly importQueue: ImportQueueContractService) {}

  async execute(): Promise<Either<HTTPException, void>> {
    await this.importQueue.pause()
    return right(undefined)
  }
}
```

```ts
// errado: esquecer o await no resume (quebra desde a v6, que o tornou
// assíncrono) — a fila parece despausada mas ainda rejeita jobs novos.
myQueue.resume()

// certo: sempre aguardar.
await myQueue.resume()
```

#### guide/workers/graceful-shutdown
[doc](https://docs.bullmq.io/guide/workers/graceful-shutdown)

**O que é:** `worker.close()`, que marca o worker como em encerramento, para de aceitar job novo e
espera os atuais terminarem.
**Para que serve:** encerrar sem deixar job pendurado — é a peça que todo deploy precisa e que quase
ninguém coloca na primeira versão.
**Quando usar:** **em todo processo de worker, ligado a `SIGINT` e `SIGTERM`**. Dois avisos que valem
o preço da página: a chamada **não tem timeout próprio**, então o encerramento dura o que o job mais
lento durar; e se o processo for morto antes de terminar, os jobs viram stalled e outro worker os
retoma — perda não há, mas o trabalho é refeito do zero.

```ts
// Encerramento correto de um processo de worker.
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing server...`)
  await worker.close()
  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Feche TAMBÉM Queue e QueueEvents do processo: cada um segura uma conexão
// Redis, e uma conexão aberta mantém o event loop vivo. O sintoma de
// esquecer é o processo que "não morre" e só sai no SIGKILL.
```

```ts
// Caso real da stack: stop() idempotente na base comum, chamado pelo
// kernel no SIGINT/SIGTERM — cada worker concreto só implementa createWorker().
async stop(): Promise<void> {
  if (!this.worker) return
  await this.worker.close()
  this.worker = null
}
```

```ts
// errado: matar o processo sem fechar o worker — o lock do job ativo
// expira sozinho, e o mecanismo de stalled devolve o trabalho do zero.
process.on('SIGTERM', () => process.exit(0))

// certo: fechar primeiro, sair depois. Demora o tempo do job mais lento.
process.on('SIGTERM', async () => {
  await worker.close()
  process.exit(0)
})
```

#### guide/workers/stalled-jobs
[doc](https://docs.bullmq.io/guide/workers/stalled-jobs)

**O que é:** o mecanismo que detecta job ativo cujo worker parou de renovar o lock, devolve à espera
e entrega a outro worker.
**Para que serve:** é o que garante que um worker morto não leve o job junto.
**Quando usar:** ao investigar job processado duas vezes, ou job que volta sozinho para a fila. A
causa quase sempre é uma só — **o processador segurou o event loop tempo demais** — e a correção é
sandboxed processor ou concorrência menor, não mexer no `stalledInterval`, que a doc diz que você
normalmente não deveria tocar.

```ts
// A regra por trás do mecanismo: o worker precisa DEVOLVER O CONTROLE ao
// event loop com frequência suficiente para renovar o lock.
//
// ERRADO: laço síncrono longo. Nada renova o lock, e o job vira stalled
// enquanto AINDA está rodando — outro worker pega a mesma coisa.
new Worker('reports', async (job) => {
  for (const row of milhoesDeLinhas) {
    calculoPesadoSincrono(row)
  }
})

// CERTO: o trabalho pesado sai do processo principal.
new Worker('reports', path.join(__dirname, 'report_processor.js'))
```

```ts
// Caso real da stack: logLifecycle na base registra completed/failed com
// a tentativa — é onde um job repetido duas vezes (sintoma de stalled)
// aparece primeiro no log.
protected logLifecycle(worker: Worker, tag: string): void {
  worker.on('completed', (job) => console.info(`[${tag}] Job ${job.id} processado`))
  worker.on('failed', (job, error) =>
    console.error(`[${tag}] Job ${job?.id} falhou (tentativa ${job?.attemptsMade}):`, error.message),
  )
}
```

```ts
// errado: "corrigir" stalled aumentando lockDuration — disfarça o sintoma,
// mas o event loop continua travado e a detecção real só demora mais.
new Worker('reports', heavySyncProcessor, { lockDuration: 300_000 })

// certo: o trabalho pesado sai do processo principal (sandboxed processor).
new Worker('reports', path.join(__dirname, 'report_processor.js'))
```

#### guide/jobs/stalled
[doc](https://docs.bullmq.io/guide/jobs/stalled)

**O que é:** o lado "job" do mesmo assunto: não existe **estado** stalled, existe um **evento**
`stalled`, emitido quando o job é movido de `active` de volta para `waiting`. E existe o
`maxStalledCount`.
**Para que serve:** entender o teto — depois de estagnar demais, o job falha em definitivo, com a
mensagem `job stalled more than allowable limit`.
**Quando usar:** ao ver essa mensagem no log. Dois números da página explicam o comportamento: a
verificação padrão é de **30 segundos** e o `maxStalledCount` padrão é **1**. Ou seja: basta o job
estagnar duas vezes para ele falhar de vez, o que costuma surpreender quem espera que `attempts: 5`
cubra esse caso — não cobre, são contadores diferentes.

```ts
// Monitorar é a primeira providência: o evento existe, e ele é o aviso de
// que algum worker está segurando o event loop.
queueEvents.on('stalled', ({ jobId }) => {
  console.warn(`job ${jobId} estagnou e voltou para a espera`)
})

// maxStalledCount default = 1: na segunda estagnação o job falha de vez.
// Aumentar o número NÃO corrige a causa; ele só adia o sintoma.
new Worker('reports', processor, { maxStalledCount: 2 })
```

```ts
// Caso real da stack: QueueEvents vive no processo do dashboard, não no
// worker — é dali que o alerta de estagnação sai.
export default class ImportQueueMonitorService {
  constructor(private readonly redis: RedisContractService) {}

  private readonly events = new QueueEvents(QUEUE_NAME, {
    connection: this.redis.createQueueConnection(),
  })

  watch(): void {
    this.events.on('stalled', ({ jobId }) => console.warn(`[Import] ${jobId} estagnou`))
  }
}
```

```ts
// errado: assumir que attempts cobre estagnação — são contadores
// diferentes, e maxStalledCount default é 1: estagna duas vezes, falha.
new Worker('reports', processor, { attempts: 5 }) // não protege contra stalled

// certo: se o job legitimamente demora, aumente maxStalledTimeout também,
// não só attempts.
new Worker('reports', processor, { maxStalledCount: 2, stalledInterval: 60_000 })
```

## Resultado e eventos

#### guide/returning-job-data
[doc](https://docs.bullmq.io/guide/returning-job-data)

**O que é:** o valor devolvido pelo processador, guardado em `job.returnvalue` e entregue no evento
`completed`.
**Para que serve:** levar o resultado do worker de volta para quem pediu.
**Quando usar:** para valores pequenos. A recomendação da própria página é mais forte do que parece:
**é mais confiável gravar o resultado dentro do processador** do que depender de alguém estar
escutando `completed`. Para arquitetura de microsserviços, ela sugere uma fila de resultados — se o
destino estiver fora do ar, a resposta espera na fila em vez de se perder.

```ts
import { Worker, QueueEvents } from 'bullmq'

const myWorker = new Worker('AsyncProc', async (job) => {
  const result = await doSomeAsyncProcessing()
  return result // vira job.returnvalue
})

const queueEvents = new QueueEvents('AsyncProc')
queueEvents.on('completed', ({ returnvalue }) => {
  console.log(returnvalue)
})

// Mais robusto para resultado que importa: gravar no destino dentro do
// processador, ou publicar numa fila de resultados. Quem escuta 'completed'
// e está fora do ar no momento do evento simplesmente não vê o resultado.
```

```ts
// Caso real da stack: o worker grava o resultado no próprio store da
// entidade, dentro do processador — nunca depende de quem escuta 'completed'.
protected createWorker(): Worker<FileImportJobPayload> {
  return new Worker<FileImportJobPayload>(QUEUE_NAME, async (job) => {
    const result = await this.importRows(job.data)
    await this.importStore.markFinished(job.data.importId, result) // fonte da verdade
    return result
  })
}
```

```ts
// errado: devolver só um status e deixar o CONSUMIDOR do resultado
// depender de 'completed' estar sendo escutado no momento exato.
new Worker('import', async (job) => 'done')

// certo: gravar o resultado onde ele precisa estar, e devolver como eco.
new Worker('import', async (job) => {
  const rows = await processImport(job.data)
  await importStore.save(job.data.importId, rows)
  return { rowCount: rows.length }
})
```

#### guide/events
[doc](https://docs.bullmq.io/guide/events)

**O que é:** os eventos do BullMQ, e a divisão que organiza tudo: eventos **locais** (no `Worker` ou
`Queue` do seu processo) e eventos **globais** (`QueueEvents`, implementado sobre Redis streams).
**Para que serve:** reagir a job completo, falho, progresso ou fila vazia.
**Quando usar:** **a escolha entre os dois decide se o seu dashboard funciona**. Listener local só vê
o que aquele processo fez — a API que adicionou o job não recebe `completed` do worker que roda
noutra máquina. `QueueEvents` vê tudo, e por usar streams em vez de pub/sub, os eventos não se perdem
numa desconexão.

```ts
import { Worker, QueueEvents } from 'bullmq'

// LOCAL: só os jobs processados POR ESTE worker.
const myWorker = new Worker('Paint')
myWorker.on('completed', (job) => {
  // este worker terminou este job
})

// GLOBAL: qualquer worker, qualquer processo, qualquer máquina.
const queueEvents = new QueueEvents('Paint')
queueEvents.on('completed', ({ jobId }) => {
  // chamado toda vez que um job completa em QUALQUER worker
})

// Progresso, do processador para quem estiver escutando:
await job.updateProgress({ completed: 3, total: 10 })
```

```ts
// Caso real da stack: QueueEvents só no processo do dashboard (Socket.IO),
// reemitindo para o namespace do cliente — o worker nunca conhece o socket.
export default class FileBatchProgressService {
  constructor(private readonly redis: RedisContractService) {}

  private readonly events = new QueueEvents(QUEUE_NAME, {
    connection: this.redis.createQueueConnection(),
  })

  bridgeToSocket(namespace: Namespace): void {
    this.events.on('progress', ({ jobId, data }) => {
      namespace.emit('file-batch:progress', { jobId, data })
    })
  }
}
```

```ts
// errado: escutar 'completed' no Worker da API e achar que isso cobre
// jobs processados por OUTRA instância — local só vê o que o processo fez.
apiProcessWorker.on('completed', (job) => notifyDashboard(job))

// certo: QueueEvents vê qualquer worker, em qualquer máquina.
const queueEvents = new QueueEvents('Paint')
queueEvents.on('completed', ({ jobId }) => notifyDashboard(jobId))
```

#### guide/jobs/getters
[doc](https://docs.bullmq.io/guide/jobs/getters)

**O que é:** as consultas de estado da fila: `getJobCounts`, `getJobs` com paginação, e os getters por
estado.
**Para que serve:** montar tela de monitoramento, alerta e health check sem ferramenta externa.
**Quando usar:** ao construir observabilidade caseira. O alerta que vale a pena montar primeiro é o
crescimento de `wait` — fila que só cresce significa produção acima da capacidade de consumo, e
descobrir isso pelo gráfico é bem melhor do que pelo cliente reclamando.

```ts
// Contadores por estado.
const counts = await myQueue.getJobCounts('wait', 'completed', 'failed')
// { wait: number, completed: number, failed: number }
//
// Estados aceitos: completed, failed, delayed, active, wait,
// waiting-children, prioritized, paused, repeat.

// Listagem paginada: início, fim, ordem crescente.
const completed = await myQueue.getJobs(['completed'], 0, 99, true)
```

## Falha, repetição e desistência

#### guide/retrying-failing-jobs
[doc](https://docs.bullmq.io/guide/retrying-failing-jobs)

**O que é:** `attempts` e `backoff` — fixo ou exponencial, com `jitter` — além da estratégia de
backoff customizada, declarada nas `settings` do worker.
**Para que serve:** absorver falha temporária sem intervenção humana.
**Quando usar:** em todo job que toca a rede. Use **exponencial com jitter**: sem jitter, mil jobs
que falharam juntos voltam juntos, batem no serviço já combalido na mesma milésima de segundo e
derrubam de novo. O `jitter` (0 a 1) espalha as retentativas, e é a diferença entre retentar e
martelar.

```ts
// Exponencial: 2 ^ (attempts - 1) * delay, com jitter espalhando as voltas.
await queue.add('test-retry', { foo: 'bar' }, {
  attempts: 8,
  backoff: { type: 'exponential', delay: 3000, jitter: 0.5 },
})

// Como default da fila inteira, que é onde isso deveria ficar:
const myQueue = new Queue('foo', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
})

// Estratégia própria: mora no WORKER, e é escolhida por nome no add().
const worker = new Worker('foo', processor, {
  settings: {
    backoffStrategy: (attemptsMade: number, type: string, err: Error, job: Job) => {
      switch (type) {
        case 'custom1':
          return attemptsMade * 1000
        default:
          throw new Error('invalid type')
      }
    },
  },
})
await queue.add('test-retry', { foo: 'bar' }, { attempts: 3, backoff: { type: 'custom1' } })
```

```ts
// Caso real da stack: attempts/backoff vivem no defaultJobOptions da
// fila, não espalhados pelos chamadores — cada fila decide sua política.
protected createQueue(): Queue {
  return new Queue(STORAGE_OPTIMIZATION_QUEUE_NAME, {
    connection: this.redis.createQueueConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  })
}
```

```ts
// errado: backoff fixo e curto para uma chamada de rede instável — mil
// jobs que falharam juntos voltam juntos e martelam o serviço de novo.
await queue.add('call-api', data, { attempts: 5, backoff: 1000 })

// certo: exponencial com jitter espalha as retentativas no tempo.
await queue.add('call-api', data, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000, jitter: 0.5 },
})
```

#### patterns/stop-retrying-jobs
[doc](https://docs.bullmq.io/patterns/stop-retrying-jobs)

**O que é:** `UnrecoverableError`, a exceção que manda o job direto para o conjunto de falhos,
**ignorando o `attempts`**.
**Para que serve:** separar "falhou, tenta de novo" de "falhou, e tentar de novo não muda nada".
**Quando usar:** esta é a página mais subutilizada da doc. Erro de configuração, credencial inválida,
payload que não passa na validação, registro que não existe mais, regra de negócio violada — nada
disso melhora na terceira tentativa. Sem `UnrecoverableError`, esses casos gastam o `attempts`
inteiro, poluem o log com a mesma mensagem N vezes e escondem as falhas que **de fato** eram
temporárias. O teste é uma pergunta: *o que muda entre esta tentativa e a próxima?* Se a resposta é
"nada", é irrecuperável.

```ts
import { Worker, UnrecoverableError } from 'bullmq'

const worker = new Worker(
  'foo',
  async (job) => {
    const user = await findUser(job.data.userId)

    // Não existe agora e não vai existir na próxima: desistir é o certo.
    if (!user) throw new UnrecoverableError(`user ${job.data.userId} not found`)

    // Já a falha de rede abaixo MERECE retentativa: deixe subir normalmente.
    await callExternalApi(user)
  },
  { connection },
)

// Mesmo com attempts: 3, o UnrecoverableError falha na primeira e para ali.
await queue.add('test-retry', { foo: 'bar' }, { attempts: 3, backoff: 1000 })
```

```ts
// Caso real da stack: template de e-mail desconhecido não melhora na
// próxima tentativa — é dado errado no job, então falha de vez.
private async processSendJob(job: Job<EmailJobPayload>): Promise<void> {
  const { template } = job.data
  if (!isEmailTemplate(template)) {
    throw new UnrecoverableError(`Template de email desconhecido: ${String(template)}`)
  }
  // ... envia
}
```

```ts
// errado: lançar Error comum para payload inválido — gasta as 3
// tentativas repetindo a mesma falha, e esconde falhas de rede reais no log.
new Worker('checkout', async (job) => {
  if (!job.data.cardToken) throw new Error('cartão ausente')
})

// certo: o que não muda entre tentativas é irrecuperável.
new Worker('checkout', async (job) => {
  if (!job.data.cardToken) throw new UnrecoverableError('cartão ausente')
})
```

#### patterns/timeout-jobs
[doc](https://docs.bullmq.io/patterns/timeout-jobs)

**O que é:** o reconhecimento de que **o BullMQ não tem timeout de job embutido**, e o padrão
recomendado: `AbortController` mais `setTimeout` dentro do processador.
**Para que serve:** impedir que um job pendurado ocupe um slot de concorrência para sempre.
**Quando usar:** em todo job que chama serviço externo. Repare no detalhe do exemplo oficial: o
`AbortError` vira `UnrecoverableError`, não um erro comum — estourar o tempo é tratado como falha
definitiva daquela execução, e não como algo a repetir automaticamente.

```ts
import { Worker, UnrecoverableError } from 'bullmq'

const worker = new Worker('foo', async (job) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), job.data.timeout)

  try {
    const response = await fetch('https://slowserver.com', {
      signal: controller.signal,
    })
    return await response.text()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new UnrecoverableError('Timeout')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
})

// O mecanismo muda conforme a operação: o que precisa existir é um jeito de
// ABORTAR de verdade. Um Promise.race que só ignora o resultado deixa a
// operação rodando, e o slot de concorrência continua ocupado.
```

#### guide/jobs/retrying-job
[doc](https://docs.bullmq.io/guide/jobs/retrying-job)

**O que é:** `job.retry()`, o reprocessamento **manual** de um job já `failed` (ou `completed`), com
`resetAttemptsMade` e `resetAttemptsStarted`.
**Para que serve:** o botão "tentar de novo" da tela de administração, depois que a causa da falha
foi corrigida.
**Quando usar:** depois de um incidente. O `resetAttemptsMade` é o que faz diferença: sem ele, um job
que já gastou as tentativas volta com o contador esgotado e falha na primeira dificuldade.

```ts
import { Queue, Job } from 'bullmq'

const queue = new Queue('my-queue')
const job = await Job.fromId(queue, 'job-id')

await job.retry() // volta para a espera

// Depois de corrigir a causa, zerar o contador é quase sempre o que se quer.
await job.retry('failed', { resetAttemptsMade: true })

// O retry limpa failedReason, finishedOn, processedOn e returnvalue,
// emite 'waiting' e restaura as dependências de pai, se houver.
```

#### patterns/idempotent-jobs
[doc](https://docs.bullmq.io/patterns/idempotent-jobs)

**O que é:** o princípio que sustenta tudo o que veio acima: o estado final do sistema tem que ser o
mesmo quer o job acerte de primeira, quer acerte na terceira tentativa.
**Para que serve:** tornar a retentativa segura. Sem isso, `attempts: 3` é um gerador de cobranças
duplicadas.
**Quando usar:** **antes de ligar retentativa em qualquer job que escreva em algum lugar**. A
recomendação prática da página é manter o job atômico e simples — e, quando a operação é composta
mesmo, quebrá-la em jobs menores ligados por um flow, em vez de tentar tudo dentro de um processador
que não sabe reverter o que já fez.

```ts
// ERRADO: se a segunda parte falhar, a retentativa cobra de novo.
new Worker('checkout', async (job) => {
  await chargeCard(job.data)   // já aconteceu
  await sendReceipt(job.data)  // falhou -> retry refaz a cobrança
})

// CERTO: chave de idempotência no lado de lá, ou um job por etapa.
new Worker('checkout', async (job) => {
  await chargeCard({ ...job.data, idempotencyKey: job.id })
  await sendReceipt(job.data)
})

// Lembre que job.id pode ser seu: um jobId natural é a chave de graça.
```

```ts
// Caso real da stack: attempts: 1 declarado de propósito quando a operação
// não é idempotente e refazer criaria os registros de novo (importação,
// lote, migração) — a falha nesse caso é decisão humana, não retry automático.
protected createQueue(): Queue {
  return this.singleAttemptQueue(FILE_BATCH_QUEUE_NAME, this.redis.createQueueConnection())
}
// singleAttemptQueue(): defaultJobOptions com attempts: 1, removeOnComplete/Fail: 50
```

```ts
// errado: numerar linha a linha sem registrar o progresso — um retry depois
// de falhar na linha 8000 reprocessa as 8000 anteriores, duplicando registros.
new Worker('import', async (job) => {
  for (const row of job.data.rows) await insertRow(row)
})

// certo: idempotência por chave natural, ou dedupe por linha antes de gravar.
new Worker('import', async (job) => {
  for (const row of job.data.rows) {
    await upsertRow(row, { onConflict: 'skip' }) // chave natural da linha
  }
})
```

## Limite de taxa

#### guide/rate-limiting
[doc](https://docs.bullmq.io/guide/rate-limiting)

**O que é:** a opção `limiter` do worker (`max` por `duration`), o limite dinâmico via
`worker.rateLimit()` e o `Worker.RateLimitError()`.
**Para que serve:** respeitar o limite da API do outro lado sem inventar `sleep` no processador.
**Quando usar:** em toda integração com terceiro que publica limite. O ponto sutil é o
`Worker.RateLimitError()`: ele não é uma falha do job — é o que devolve o job para a espera **sem
gastar tentativa**. Lançar um `Error` comum no lugar dele consome o `attempts` por um motivo que não
é culpa do job.

```ts
import { Worker } from 'bullmq'

// Estático: no máximo 10 jobs por segundo, somando TODOS os workers da fila.
const worker = new Worker('painter', async (job) => paintCar(job), {
  limiter: { max: 10, duration: 1000 },
})

// Dinâmico: o próprio serviço externo diz quanto esperar (header 429).
const dynamic = new Worker('myQueue', async () => {
  const [isRateLimited, duration] = await doExternalCall()
  if (isRateLimited) {
    await worker.rateLimit(duration)
    throw Worker.RateLimitError() // devolve à espera, NÃO conta como falha
  }
})

const ttl = await queue.getRateLimitTtl(maxJobs)
if (ttl > 0) console.log('Queue is rate limited')

await queue.removeRateLimitKey() // libera antes da hora
```

```ts
// Caso real da stack: limite estático declarado no createWorker(), ao lado
// da concorrência — é a mesma linha que decide quantos jobs e a que ritmo.
protected createWorker(): Worker<EmailJobPayload> {
  return new Worker<EmailJobPayload>(EMAIL_QUEUE_NAME, this.process, {
    connection: this.redis.createQueueConnection(),
    limiter: { max: Env.EMAIL_PROVIDER_LIMIT, duration: 1000 },
  })
}
```

```ts
// errado: lançar Error comum quando o provedor devolve 429 — consome uma
// tentativa do attempts por um motivo que não é culpa do job.
if (isRateLimited) throw new Error('rate limited')

// certo: RateLimitError devolve à espera SEM gastar tentativa.
if (isRateLimited) {
  await worker.rateLimit(retryAfterMs)
  throw Worker.RateLimitError()
}
```

#### guide/queues/global-rate-limit
[doc](https://docs.bullmq.io/guide/queues/global-rate-limit)

**O que é:** o limite de taxa definido na **fila**, com `setGlobalRateLimit`, em vez de repetido na
configuração de cada worker.
**Para que serve:** ter uma fonte única do limite, alterável em runtime, sem redeploy dos workers.
**Quando usar:** quando o limite é um fato do mundo, não do processo — a cota do provedor de e-mail, o
teto do gateway de pagamento. Como o global não é sobrescrito pelo `limiter` local, ele é o lugar
certo para o número que não pode ser furado.

```ts
import { Queue } from 'bullmq'

// 1 job por segundo, para a fila inteira.
await queue.setGlobalRateLimit(1, 1000)

const { max, duration } = await queue.getGlobalRateLimit()

const ttl = await queue.getRateLimitTtl()

await queue.removeGlobalRateLimit()

// O limiter do worker não passa por cima do global: ajustar a cota é uma
// chamada só, sem reiniciar worker nenhum.
```

## Agendamento

#### guide/job-schedulers
[doc](https://docs.bullmq.io/guide/job-schedulers)

**O que é:** o Job Scheduler, uma fábrica que produz jobs conforme uma regra de repetição — `every`
em milissegundos ou `pattern` no formato cron — a partir de um template de nome, dados e opções.
**Para que serve:** o cron da aplicação, com a vantagem de valer para o cluster inteiro em vez de uma
máquina.
**Quando usar:** em toda tarefa periódica. Duas propriedades importam mais do que parecem: o método é
**upsert**, o que significa que rodar o mesmo código em dez réplicas no deploy cria **um** agendador,
não dez; e o job seguinte é gerado quando o anterior **começa a ser processado**, não pelo relógio de
parede. Nos projetos em v6, esta página substitui por inteiro o antigo "repeatable jobs".

```ts
// A cada segundo. Devolve o primeiro job, já em estado delayed.
const firstJob = await queue.upsertJobScheduler('my-scheduler-id', { every: 1000 })

// Cron com template de job: nome, dados e opções de cada execução.
await queue.upsertJobScheduler(
  'my-scheduler-id',
  { pattern: '0 15 3 * * *' }, // todo dia às 03:15
  {
    name: 'my-job-name',
    data: { foo: 'bar' },
    opts: { backoff: 3, attempts: 5, removeOnFail: 1000 },
  },
)

// Enquanto o agendador existe, há sempre UM job dele em delayed.
// O id do job é gerado automaticamente: discrimine pelo campo `name`.
```

```ts
// Caso real da stack: agendador criado no boot do processo, via método do
// contrato — chamar de novo no deploy seguinte é upsert, não duplica.
export abstract class StorageCleanupContractService {
  abstract scheduleDaily(): Promise<void>
}

@Service()
export default class BullMQStorageCleanupService implements StorageCleanupContractService {
  constructor(private readonly redis: RedisContractService) {}
  private readonly queue = new Queue('storage-cleanup', {
    connection: this.redis.createQueueConnection(),
  })

  async scheduleDaily(): Promise<void> {
    await this.queue.upsertJobScheduler('storage-cleanup-daily', { pattern: '0 0 4 * * *', tz: 'UTC' })
  }
}
```

```ts
// errado: chamar queue.add com repeat — API removida na v6, nem compila
// contra os tipos de bullmq@6.
await queue.add('cleanup', {}, { repeat: { pattern: '0 0 4 * * *' } })

// certo: upsertJobScheduler é o único caminho para job recorrente na v6.
await queue.upsertJobScheduler('storage-cleanup-daily', { pattern: '0 0 4 * * *', tz: 'UTC' })
```

#### guide/job-schedulers/repeat-options
[doc](https://docs.bullmq.io/guide/job-schedulers/repeat-options)

**O que é:** as opções de repetição: `pattern`, `every`, `tz`, `limit`, `startDate`, `endDate` e o
`immediately` (agora obsoleto).
**Para que serve:** ajustar a regra sem escrever lógica de calendário.
**Quando usar:** ao agendar qualquer coisa com hora fixa. **Defina o `tz` sempre** — cron sem fuso
declarado é o clássico relatório que chega três horas antes depois do deploy no servidor de outra
região. O `repeat.utc` foi removido na v6; o substituto é `tz: 'UTC'`.

```ts
// Fuso explícito: não deixe o servidor decidir por você.
await myQueue.upsertJobScheduler(
  'utc-cron-job',
  { pattern: '0 15 3 * * *', tz: 'UTC' },
  { name: 'utc-execution-job', data: { message: 'Runs at 03:15 UTC' } },
)

// Janela de validade.
await myQueue.upsertJobScheduler('start-later-job', {
  every: 60000,
  startDate: new Date('2026-10-15T00:00:00Z'),
  endDate: new Date('2026-11-01T00:00:00Z'),
})

// Número máximo de repetições.
await myQueue.upsertJobScheduler('limited-job', { every: 10000, limit: 10 })

// `immediately` está obsoleto desde a 5.19.0: agendador novo já executa
// imediatamente por padrão.
```

```ts
// Caso real da stack: tz fixo lido do ENV da aplicação, nunca do fuso do
// servidor — o mesmo agendamento se comporta igual em qualquer host.
await this.queue.upsertJobScheduler('storage-cleanup-daily', {
  pattern: '0 0 4 * * *',
  tz: Env.APPLICATION_TIMEZONE, // explícito, nunca o default do processo
})
```

```ts
// errado: cron sem tz — o horário depende do fuso do SERVIDOR, que muda
// de ambiente para ambiente e vira "relatório chega 3h antes" no deploy.
await queue.upsertJobScheduler('daily-report', { pattern: '0 15 3 * * *' })

// certo: tz sempre explícito, mesmo quando "parece óbvio" qual é.
await queue.upsertJobScheduler('daily-report', { pattern: '0 15 3 * * *', tz: 'UTC' })
```

#### guide/job-schedulers/manage-job-schedulers
[doc](https://docs.bullmq.io/guide/job-schedulers/manage-job-schedulers)

**O que é:** listar, consultar e remover agendadores: `getJobSchedulers`, `getJobScheduler` e
`removeJobScheduler`.
**Para que serve:** saber o que está agendado, o que é mais difícil do que parece quando os
agendadores nascem espalhados pelo código.
**Quando usar:** ao **remover** uma tarefa periódica, e é aqui que mora a pegadinha: apagar o
`upsertJobScheduler` do código **não** apaga o agendador do Redis. Ele continua produzindo jobs de um
tipo que ninguém mais processa, silenciosamente. Remover exige chamada explícita.

```ts
// O que está agendado agora, ordenado pela próxima execução.
const schedulers = await queue.getJobSchedulers(0, 9, true)

const scheduler = await queue.getJobScheduler('test')

// Deletar o código NÃO basta: o agendador vive no Redis.
const result = await queue.removeJobScheduler('scheduler-123')
console.log(result ? 'Scheduler removed successfully' : 'Missing Job Scheduler')
```

```ts
// Caso real da stack: um use-case administrativo lista os agendadores
// ativos, para a tela "o que roda sozinho" não ficar só na memória de quem
// escreveu o código.
export default class ListScheduledJobsUseCase {
  constructor(private readonly cleanupQueue: StorageCleanupContractService) {}

  async execute(): Promise<Either<HTTPException, ReadonlyArray<string>>> {
    const schedulers = await this.cleanupQueue.listSchedulers()
    return right(schedulers.map((s) => s.id))
  }
}
```

```ts
// errado: remover a chamada de upsertJobScheduler do código e achar que
// isso desativa a tarefa — o agendador continua vivo no Redis, gerando jobs.
// (deploy sem a linha de upsert, mas sem removeJobScheduler)

// certo: remoção é uma chamada explícita, de preferência numa migração
// ou script de deploy único.
await queue.removeJobScheduler('storage-cleanup-daily')
```

## Flows e dependências

#### guide/flows
[doc](https://docs.bullmq.io/guide/flows)

**O que é:** o `FlowProducer`: uma árvore de jobs em que o pai só é processado depois que todos os
filhos completam, e pode ler os resultados deles com `getChildrenValues`.
**Para que serve:** trabalho que se decompõe — processar cada item e depois consolidar, chamar três
serviços e depois juntar as respostas.
**Quando usar:** quando a alternativa seria um job gigante que faz tudo. O flow dá retentativa
**por etapa**: se o terceiro filho falhar, só ele repete, e os dois primeiros não são refeitos. Filhos
podem estar em filas diferentes, com workers e concorrências diferentes.

```ts
import { FlowProducer } from 'bullmq'

const flowProducer = new FlowProducer({ connection })

const flow = await flowProducer.add({
  name: 'renovate-interior',
  queueName: 'renovate',
  children: [
    { name: 'paint', data: { place: 'ceiling' }, queueName: 'steps' },
    { name: 'paint', data: { place: 'walls' }, queueName: 'steps' },
  ],
})

// No processador do PAI: os resultados dos filhos chegam juntos.
new Worker('renovate', async (job) => {
  const childrenValues = await job.getChildrenValues()
  return Object.values(childrenValues).reduce((a, b) => a + b, 0)
})

// Enquanto os filhos rodam, o pai fica em 'waiting-children'.
const state = await job.getState()
```

```ts
// Caso real da stack: FlowProducer encapsulado atrás de um contrato, para
// o use-case não conhecer BullMQ diretamente.
export abstract class StorageMigrationContractService {
  abstract enqueuePlan(plan: MigrationPlan): Promise<string>
}

@Service()
export default class BullMQStorageMigrationService implements StorageMigrationContractService {
  constructor(private readonly redis: RedisContractService) {}
  private readonly flow = new FlowProducer({ connection: this.redis.createQueueConnection() })

  async enqueuePlan(plan: MigrationPlan): Promise<string> {
    const { job } = await this.flow.add({
      name: 'migrate-plan',
      queueName: 'storage-migration',
      children: plan.files.map((f) => ({ name: 'migrate-file', data: f, queueName: 'storage-migration' })),
    })
    return job.id ?? ''
  }
}
```

```ts
// errado: um job gigante que itera todos os arquivos — se o item 900 de
// 1000 falhar, a retentativa refaz os 899 anteriores do zero.
new Worker('migrate', async (job) => {
  for (const file of job.data.files) await migrateFile(file)
})

// certo: flow com um filho por item — retry atinge só o que falhou.
await flowProducer.add({
  name: 'migrate-plan',
  queueName: 'storage-migration',
  children: files.map((f) => ({ name: 'migrate-file', data: f, queueName: 'storage-migration' })),
})
```

#### guide/flows/fail-parent
[doc](https://docs.bullmq.io/guide/flows/fail-parent)

**O que é:** a opção `failParentOnFailure`, que propaga a falha de um filho para o pai — e, em
cascata, para os ancestrais que também a declararem.
**Para que serve:** dependência estrita, em que o pai não tem sentido se aquele filho específico
falhou.
**Quando usar:** quando "quase todos os filhos deram certo" não serve. Sem a opção, o pai espera e
depois roda com um resultado faltando, o que costuma render um bug bem mais difícil de achar do que
uma falha explícita. A propagação é **preguiçosa**: o pai só é marcado como falho quando um worker o
processa, e o erro que aparece é um `UnrecoverableError` com a mensagem `child {childKey} failed`.

```ts
import { FlowProducer } from 'bullmq'

const flow = new FlowProducer({ connection })

await flow.add({
  name: 'root-job',
  queueName: 'topQueueName',
  data: {},
  children: [
    {
      name: 'child-job',
      data: { idx: 0, foo: 'bar' },
      queueName: 'childrenQueueName',
      opts: { failParentOnFailure: true }, // este é indispensável
    },
    {
      name: 'optional-job',
      data: { idx: 3, foo: 'foo' },
      queueName: 'childrenQueueName',
      // sem a opção: pode falhar sem derrubar o pai
    },
  ],
})
```

```ts
// Caso real da stack: um filho de migração é obrigatório — se falhar, o
// plano inteiro não tem sentido como "concluído".
await flow.add({
  name: 'migrate-plan',
  queueName: 'storage-migration',
  children: plan.files.map((file) => ({
    name: 'migrate-file',
    data: file,
    queueName: 'storage-migration',
    opts: file.required ? { failParentOnFailure: true } : {},
  })),
})
```

```ts
// errado: assumir que o pai sabe da falha do filho na hora — a propagação
// é PREGUIÇOSA, só acontece quando um worker processa o pai.
await flow.add({ name: 'root', queueName: 'q', children: [{ name: 'c', queueName: 'q' }] })
// sem failParentOnFailure: filho falha, pai processa e "funciona" sem o dado

// certo: declarar a opção em todo filho que o pai não sobrevive sem.
await flow.add({
  name: 'root',
  queueName: 'q',
  children: [{ name: 'c', queueName: 'q', opts: { failParentOnFailure: true } }],
})
```

#### guide/flows/get-flow-tree
[doc](https://docs.bullmq.io/guide/flows/get-flow-tree)

**O que é:** `getFlow`, que recupera um job junto com toda a sua descendência, com `depth` e
`maxChildren` para limitar o tamanho.
**Para que serve:** inspecionar o estado de um flow inteiro numa chamada — indispensável para
depurar árvore travada.
**Quando usar:** ao investigar pai preso em `waiting-children`. A árvore mostra qual filho não
terminou, o que é bem mais rápido do que consultar fila por fila. **Use `depth` e `maxChildren`** em
flow largo: sem limite, a chamada traz a árvore completa.

```ts
const tree = await flow.getFlow({
  id: topJob.id,
  queueName: 'topQueueName',
})

const { children, job } = tree

// Em árvore grande, limite antes de pedir.
const limitedTree = await flow.getFlow({
  id: topJob.id,
  queueName: 'topQueueName',
  depth: 1, // só o primeiro nível
  maxChildren: 2, // no máximo 2 filhos por nó
})
```

```ts
// Caso real da stack: expor a árvore num use-case de depuração, sem vazar
// detalhe do BullMQ para o controller.
export default class GetMigrationPlanTreeUseCase {
  constructor(private readonly migrationQueue: StorageMigrationContractService) {}

  async execute(planId: string): Promise<Either<HTTPException, FlowTree>> {
    const tree = await this.migrationQueue.getPlanTree(planId, { depth: 1, maxChildren: 50 })
    return right(tree)
  }
}
```

```ts
// errado: pedir a árvore inteira de um flow com milhares de filhos — a
// chamada traz tudo de uma vez e pode travar o processo que chamou.
const tree = await flow.getFlow({ id: topJob.id, queueName: 'topQueueName' })

// certo: limitar profundidade e filhos por nó, e paginar se precisar de mais.
const tree = await flow.getFlow({
  id: topJob.id,
  queueName: 'topQueueName',
  depth: 1,
  maxChildren: 50,
})
```

#### patterns/process-step-jobs
[doc](https://docs.bullmq.io/patterns/process-step-jobs)

**O que é:** o padrão de dividir um processador em etapas, gravando a etapa atual em `job.data` com
`updateData`, e podendo adiar entre etapas com `moveToDelayed` + `DelayedError`.
**Para que serve:** job longo que, ao ser retentado, retoma de onde parou em vez de recomeçar.
**Quando usar:** quando o flow é exagero mas o job tem etapas com efeito colateral. É a forma mais
barata de idempotência em job composto: a etapa já concluída não roda de novo. Atenção ao detalhe que
faz o padrão funcionar — o `moveToDelayed` precisa do **token do worker**, e depois dele é obrigatório
lançar `DelayedError`, senão o worker acha que o job terminou.

```ts
import { Worker, DelayedError } from 'bullmq'

enum Step {
  Initial,
  Second,
  Finish,
}

const worker = new Worker(
  'queueName',
  async (job, token) => {
    let step = job.data.step
    while (step !== Step.Finish) {
      switch (step) {
        case Step.Initial: {
          await doInitialStepStuff()
          await job.updateData({ step: Step.Second }) // retry retoma daqui
          step = Step.Second
          break
        }
        case Step.Second: {
          // esperar sem ocupar um slot de concorrência
          await job.moveToDelayed(Date.now() + 60_000, token)
          await job.updateData({ step: Step.Finish })
          throw new DelayedError() // obrigatório depois do moveToDelayed
        }
      }
    }
  },
  { connection },
)
```

```ts
// Caso real da stack: etapa gravada no payload tipado do worker — o
// contrato declara o shape, o processador só avança o enum.
type FileBatchStep = 'validate' | 'insert' | 'finish'
type FileBatchJobPayload = { readonly batchId: string; readonly step: FileBatchStep }

protected createWorker(): Worker<FileBatchJobPayload> {
  return new Worker<FileBatchJobPayload>(QUEUE_NAME, async (job, token) => {
    if (job.data.step === 'validate') {
      await this.validate(job.data.batchId)
      await job.updateData({ ...job.data, step: 'insert' })
      throw new DelayedError() // token exigido pelo moveToDelayed interno
    }
  })
}
```

```ts
// errado: esquecer o DelayedError depois do moveToDelayed — o worker acha
// que o job terminou normalmente, e ele nunca volta para rodar a etapa seguinte.
await job.moveToDelayed(Date.now() + 60_000, token)
await job.updateData({ step: Step.Second })
// sem throw: job marcado como completo, etapa seguinte nunca executa

// certo: o throw é parte obrigatória do padrão, não um detalhe opcional.
await job.moveToDelayed(Date.now() + 60_000, token)
await job.updateData({ step: Step.Second })
throw new DelayedError()
```

## Retenção e limpeza

#### guide/queues/auto-removal-of-jobs
[doc](https://docs.bullmq.io/guide/queues/auto-removal-of-jobs)

**O que é:** `removeOnComplete` e `removeOnFail`, nas três formas: booleano, número, ou objeto com
`age` (segundos) e `count`.
**Para que serve:** impedir que o Redis cresça para sempre. Job completo não some sozinho.
**Quando usar:** **em toda fila, desde o primeiro dia**, de preferência no `defaultJobOptions`. A
combinação que quase sempre é a certa: descartar os completos e **guardar os falhos**, que são os
únicos que alguém vai querer ler depois. Dois avisos: a remoção é **preguiçosa** — acontece quando
outro job termina, não por relógio; e job removido **deixa de contar como duplicata**, o que interage
diretamente com quem usa `jobId` para idempotência.

```ts
// Booleano: apaga assim que finaliza.
await myQueue.add('test', { foo: 'bar' }, { removeOnComplete: true, removeOnFail: true })

// Número: mantém os N mais recentes.
await myQueue.add('test', { foo: 'bar' }, { removeOnComplete: 1000, removeOnFail: 5000 })

// Objeto: por idade (SEGUNDOS) e/ou quantidade. A combinação mais útil:
// completo some rápido, falho fica um dia para alguém investigar.
await myQueue.add('test', { foo: 'bar' }, {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600 },
})
```

```ts
// Caso real da stack: a política vive no createQueue() de cada fila, com
// o falho retido mais tempo do que o completo — é a base que toda fila usa.
protected createQueue(): Queue {
  return new Queue(EMAIL_QUEUE_NAME, {
    connection: this.redis.createQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 }, // guardado mais tempo: é o que alguém lê depois
    },
  })
}
```

```ts
// errado: fila sem política de retenção — cada job completo e falho fica
// no Redis para sempre, e a memória cresce até o noeviction começar a rejeitar.
const queue = new Queue('reports')

// certo: retenção desde a primeira linha, mesmo em fila de teste.
const queue = new Queue('reports', {
  defaultJobOptions: { removeOnComplete: { count: 50 }, removeOnFail: { count: 200 } },
})
```

#### guide/queues/removing-jobs
[doc](https://docs.bullmq.io/guide/queues/removing-jobs)

**O que é:** a limpeza manual: `drain` (esvazia espera e atrasados), `clean` (remove por estado
respeitando um período de carência) e `obliterate` (apaga a fila inteira).
**Para que serve:** as operações de manutenção que a retenção automática não cobre.
**Quando usar:** com cuidado, e sabendo o alcance de cada um. `drain` **não** toca em jobs ativos nem
finalizados; `obliterate` apaga tudo e só inclui os ativos com `{ force: true }`. `obliterate` em fila
de produção não tem volta — é o comando que se digita uma vez e se lamenta depois.

```ts
import { Queue } from 'bullmq'

const queue = new Queue('paint')

// Esvazia wait; com true, também os delayed. Ativos e finalizados ficam.
await queue.drain()
await queue.drain(true)

// Por estado, com carência de 1 minuto e teto de 1000 jobs.
const deletedJobIds = await queue.clean(60000, 1000, 'paused')

// Apaga a fila inteira. force inclui os jobs ATIVOS.
await queue.obliterate()
await queue.obliterate({ force: true })
```

```ts
// Caso real da stack: limpeza manual exposta num use-case administrativo,
// nunca chamada direto de um controller sem passar por uma confirmação.
export default class CleanFailedImportsUseCase {
  constructor(private readonly importQueue: ImportQueueContractService) {}

  async execute(olderThanMs: number): Promise<Either<HTTPException, ReadonlyArray<string>>> {
    const ids = await this.importQueue.cleanFailed(olderThanMs)
    return right(ids)
  }
}
```

```ts
// errado: obliterate numa fila de produção sem force, achando que ela
// "esvaziou" — jobs ativos continuam lá, e o comando falha silenciosamente
// até você forçar sem entender por quê.
await queue.obliterate() // jobs ativos permanecem

// certo: confirmar se há job ativo antes de decidir pelo force.
const { active } = await queue.getJobCounts('active')
if (active === 0) await queue.obliterate()
else await queue.obliterate({ force: true }) // decisão consciente
```

## Produção e observabilidade

#### guide/going-to-production
[doc](https://docs.bullmq.io/guide/going-to-production)

**O que é:** a lista de verificação antes de levar uma fila a sério: persistência AOF,
`maxmemory-policy noeviction`, `retryStrategy`, `enableOfflineQueue`, handlers de `error` e o
encerramento em `SIGINT`/`SIGTERM`.
**Para que serve:** é a página mais densa em consequência por linha de toda a doc.
**Quando usar:** **antes do primeiro deploy, e de novo depois do primeiro incidente**. O item que mais
morde é o handler de `error` do `Worker` e da `Queue`: sem ele, um erro de conexão vira exceção não
tratada e derruba o processo inteiro por um problema que era transitório.

```ts
// Redis: AOF ligado, appendfsync everysec, maxmemory-policy noeviction.

// Reconexão com backoff exponencial entre 1s e 20s.
const retryStrategy = (times: number) => Math.max(Math.min(Math.exp(times), 20000), 1000)

// SEM isto, um erro de conexão derruba o processo.
worker.on('error', (err) => {
  // registre o erro
})
queue.on('error', (err) => {
  // registre o erro
})

// Encerramento: a peça que fecha o ciclo.
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing server...`)
  await worker.close()
  process.exit(0)
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Produtor: enableOfflineQueue false, para falhar rápido.
// Worker: enableOfflineQueue ligado, para insistir.
```

```ts
// Caso real da stack: handler de error ligado no bin/server.ts, uma vez
// por conexão compartilhada — nunca espalhado por cada service.
export async function registerQueueErrorHandlers(redis: RedisContractService): Promise<void> {
  const connection = redis.createQueueConnection()
  connection.on('error', (err) => console.error('[Redis/Queue]', err.message))
}
```

```ts
// errado: sem handler de 'error' no worker, um erro de conexão sobe como
// exceção não tratada e derruba o processo inteiro por algo transitório.
const worker = new Worker('foo', processor, { connection })

// certo: capturar e registrar — a reconexão do ioredis cuida do resto.
const worker = new Worker('foo', processor, { connection })
worker.on('error', (err) => console.error('[Worker]', err.message))
```

#### patterns/failing-fast-when-redis-is-down
[doc](https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down)

**O que é:** `enableOfflineQueue: false` na conexão, para o `add` lançar exceção na hora em vez de
enfileirar o comando esperando a reconexão.
**Para que serve:** um endpoint HTTP que responde 503 em vez de pendurar o cliente.
**Quando usar:** **em todo produtor que vive dentro de uma requisição HTTP**. O default acumula os
comandos em memória enquanto o Redis não volta, e o resultado é o pior dos mundos: requisição que não
responde, pool esgotado e um usuário sem a menor pista do que aconteceu. Uma limitação declarada: a
instância do Redis precisa estar no ar pelo menos no momento em que a fila é criada.

```ts
const myQueue = new Queue('transcoding', {
  connection: {
    enableOfflineQueue: false,
  },
})

app.post('/jobs', async (req, res) => {
  try {
    const job = await myQueue.add('myjob', req.body)
    res.status(201).json(job.id)
  } catch (err) {
    res.status(503).send(err) // o cliente sabe na hora, e pode retentar
  }
})

// No WORKER a escolha é a oposta: ele DEVE esperar o Redis voltar.
```

```ts
// Caso real da stack: a conexão do PRODUTOR (dentro da request) e a do
// WORKER vêm do mesmo contrato, mas com opções diferentes por propósito.
export default class RedisService implements RedisContractService {
  createQueueConnection(): Redis {
    return new IORedis({ maxRetriesPerRequest: null }) // worker: insiste
  }
  createHttpQueueConnection(): Redis {
    return new IORedis({ maxRetriesPerRequest: 1, enableOfflineQueue: false }) // API: falha rápido
  }
}
```

```ts
// errado: usar a MESMA conexão (enableOfflineQueue: false) para o worker —
// ele também vai lançar exceção em vez de esperar o Redis voltar, e para
// de processar jobs legítimos por uma queda transitória.
const worker = new Worker('foo', processor, {
  connection: { enableOfflineQueue: false },
})

// certo: só o produtor HTTP quer falhar rápido; o worker espera.
const worker = new Worker('foo', processor, { connection: workerConnection })
const queue = new Queue('foo', { connection: { enableOfflineQueue: false } })
```

#### guide/metrics/prometheus
[doc](https://docs.bullmq.io/guide/metrics/prometheus)

**O que é:** `queue.exportPrometheusMetrics()`, que devolve as métricas da fila já no formato de texto
do Prometheus, com rótulos globais opcionais.
**Para que serve:** monitoramento sem biblioteca intermediária: um endpoint e pronto.
**Quando usar:** assim que a fila virar caminho crítico. A métrica que justifica sozinha o trabalho é
`bullmq_job_count{state="waiting"}`: crescimento sustentado é o aviso antecipado de que a capacidade
de consumo ficou abaixo da produção.

```ts
import express from 'express'
import { Queue } from 'bullmq'

const app = express()
const queue = new Queue('my-queue')

app.get('/metrics', async (req, res) => {
  try {
    const metrics = await queue.exportPrometheusMetrics()
    res.set('Content-Type', 'text/plain')
    res.send(metrics)
  } catch (err) {
    res.status(500).send(err.message)
  }
})

// Saída:
// bullmq_job_count{queue="my-queue", state="waiting"} 5
// bullmq_job_count{queue="my-queue", state="active"} 3
// bullmq_job_count{queue="my-queue", state="failed"} 2

// Rótulos globais, para separar ambientes no mesmo painel.
const metrics = await queue.exportPrometheusMetrics({ env: 'Production', server: '1' })
```

#### guide/telemetry/getting-started
[doc](https://docs.bullmq.io/guide/telemetry/getting-started)

**O que é:** a integração com OpenTelemetry pelo pacote `bullmq-otel`, passado na opção `telemetry`
de `Queue` e `Worker`.
**Para que serve:** ligar o trace da requisição HTTP ao trace do job que ela criou — o rastro que
normalmente se perde na fronteira da fila.
**Quando usar:** em sistema com mais de um serviço, onde a pergunta "por que esse pedido demorou?"
atravessa processos. Sem isso, o trace termina no `queue.add` e recomeça do zero no worker, e ninguém
liga as duas metades.

```bash
npm add --save bullmq-otel
```

```ts
import { Queue, Worker } from 'bullmq'
import { BullMQOtel } from 'bullmq-otel'

const queue = new Queue('myQueue', {
  connection: { host: '127.0.0.1', port: 6379 },
  telemetry: new BullMQOtel('simple-guide'),
})

const worker = new Worker('myQueue', async (job) => 'some value', {
  name: 'myWorker',
  connection: { host: '127.0.0.1', port: 6379 },
  telemetry: new BullMQOtel('simple-guide'), // o mesmo dos DOIS lados
})
```

## Diagnóstico e migração

#### guide/troubleshooting
[doc](https://docs.bullmq.io/guide/troubleshooting)

**O que é:** os dois erros que mais aparecem e o que está por trás deles: `Missing lock for job ...
moveToFinished` e o erro de Lua sobre argumentos que precisam ser string ou inteiro.
**Para que serve:** traduzir mensagem obscura em causa real.
**Quando usar:** ao ver qualquer um dos dois. O `Missing lock` tem quatro causas e nenhuma delas
menciona lock: CPU saturada impedindo a renovação a cada 30 segundos, perda de comunicação com o
Redis, remoção forçada do job, ou política de memória errada. Já o erro de Lua é quase sempre uma
variável de ambiente `undefined` chegando como nome de fila.

```ts
// "Missing lock for job 1234. moveToFinished"
//   -> processador segurando o event loop (veja sandboxed processors)
//   -> conexão com o Redis caiu antes da renovação
//   -> o job foi removido por fora enquanto rodava
//   -> maxmemory-policy diferente de noeviction

// "ERR Error running script ... Lua redis() command arguments must be
//  strings or integers" -> variável de ambiente indefinida. Valide na borda:
const queueName = process.env.QUEUE_NAME
if (!queueName) {
  throw new Error('QUEUE_NAME is not defined or is empty.')
}
const queue = new Queue(queueName)

// ou um default explícito, quando fizer sentido:
const name = process.env.QUEUE_NAME ?? 'defaultQueue'
```

#### guide/migrations/bull-to-bullmq
[doc](https://docs.bullmq.io/guide/migrations/bull-to-bullmq)

**O que é:** a estratégia de migração a partir do Bull, o antecessor.
**Para que serve:** evitar a tentativa que não funciona.
**Quando usar:** ao herdar um projeto com Bull. A doc é categórica: as duas divergiram demais para
haver qualquer garantia de compatibilidade, e as chaves no Redis **não** são intercambiáveis. O
caminho é conviver — filas com nome ou `prefix` diferentes, os dois workers rodando juntos, os
produtores apontados para o BullMQ, e o desligamento do Bull só quando a fila antiga zerar.

```ts
// Separar os dois mundos: nome diferente, ou prefix diferente.
const queue = new Queue('transcoding-v2', { connection })
const worker = new Worker('transcoding-v2', processor, { connection, prefix: 'bullmq' })

// A sequência da migração:
//   1. criar as filas BullMQ com nome/prefix próprios
//   2. subir os workers BullMQ junto com os do Bull
//   3. apontar os PRODUTORES para o BullMQ
//   4. deixar o Bull drenar o que sobrou, e só então desligar
```

```ts
// Caso real da stack: o contrato não muda — só a impl por trás troca de
// lib. Quem consome (use-case) nunca soube que havia Bull ali.
@Service()
export default class BullMQTranscodeService implements TranscodeContractService {
  constructor(private readonly redis: RedisContractService) {}
  private readonly queue = new Queue('transcoding-v2', {
    connection: this.redis.createQueueConnection(),
  })
  async enqueue(fileId: string): Promise<string> {
    const job = await this.queue.add('transcode', { fileId })
    return job.id ?? ''
  }
}
```

```ts
// errado: assumir que as chaves do Bull no Redis funcionam com o BullMQ —
// a doc é explícita que não são intercambiáveis, mesmo com o mesmo nome.
const queue = new Queue('transcoding') // mesmo nome do Bull antigo: NÃO lê os jobs dele

// certo: nome (ou prefix) novo, e os dois sistemas coexistindo até o
// Bull esvaziar por conta própria.
const queue = new Queue('transcoding-v2', { connection })
```

#### guide/migrations/migrate-from-v5-to-v6
[doc](https://docs.bullmq.io/guide/migrations/migrate-from-v5-to-v6)

**O que é:** as quebras da v6: remoção completa das APIs de repeatable jobs, fim do `repeat.utc`, fim
do `debounce`, `Queue.resume()` agora assíncrono, ids de job de flow como UUID, e Node 14.17.0 como
mínimo.
**Para que serve:** subir de versão sem perder agendamento pelo caminho.
**Quando usar:** ao atualizar. A ordem importa e a doc a define: vá primeiro para a última v5,
**troque os repeatables por Job Schedulers ainda na v5**, recrie as configurações, limpe os
repeatables antigos do Redis, e só então suba para a v6. Pular a etapa intermediária deixa agendamento
órfão no Redis, sem API para removê-lo.

```ts
// REMOVIDO na v6:
//   queue.add(..., { repeat })     queue.addBulk(..., { repeat })
//   queue.getRepeatableJobs()      queue.removeRepeatable()
//   queue.removeRepeatableByKey()  repeat.utc      opção `debounce`

// O equivalente atual:
await queue.upsertJobScheduler(
  'paint-daily',
  { pattern: '0 15 3 * * *' },
  { name: 'paint', data: { color: 'blue' }, opts: { attempts: 5, backoff: 3000 } },
)

await queue.getJobSchedulers()
await queue.removeJobScheduler('paint-daily')

// Outras quebras fáceis de esquecer:
await queue.resume() // agora é assíncrono: PRECISA de await
// `debounce` virou `deduplication` (ttl/replace/extend)
// `repeat.utc` virou `tz: 'UTC'`
```

```ts
// Caso real da stack: upsertJobScheduler chamado no boot do processo,
// substituindo o antigo repeat que vivia espalhado em cada add().
export default class BullMQStorageCleanupService implements StorageCleanupContractService {
  async scheduleDaily(): Promise<void> {
    await this.queue.upsertJobScheduler('storage-cleanup-daily', {
      pattern: '0 0 4 * * *',
      tz: 'UTC', // substitui repeat.utc, removido na v6
    })
  }
}
```

```ts
// errado: subir direto para a v6 com repeatables ainda no Redis — a API
// para removê-los foi removida junto, e o agendamento antigo fica órfão.
// (upgrade direto v5 -> v6, sem passar pela migração)

// certo: ainda na v5, trocar repeat por upsertJobScheduler, confirmar
// que getRepeatableJobs() voltou vazio, e só então atualizar o pacote.
const old = await queueV5.getRepeatableJobs()
for (const r of old) await queueV5.removeRepeatableByKey(r.key)
await queueV5.upsertJobScheduler('job-id', { pattern: r.pattern })
```

