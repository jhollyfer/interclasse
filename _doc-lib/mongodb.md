# MongoDB (driver Node.js)

Driver oficial do MongoDB para Node.js: o cliente que fala o protocolo do banco, sem ODM no meio.

> Conferido contra `mongodb@7.7.0`

**O que é:** o pacote `mongodb`, mantido pela própria MongoDB, hoje na linha **7.x**. Ele expõe três
objetos e pouco mais: `MongoClient` (que é um pool de conexões), `Db` e `Collection`. Os métodos de
`Collection` são os comandos do servidor com nomes quase idênticos — `insertOne`, `find`,
`updateMany`, `aggregate`, `bulkWrite`. Não há schema, não há model, não há camada de tradução: o
objeto que você passa é o documento BSON que vai para o servidor.

**Para que serve:** executar comandos do MongoDB usando o vocabulário do MongoDB. Quando uma
consulta não funciona, a dúvida é sobre o banco, não sobre a biblioteca — o que você escreveu é o
que o servidor recebeu, e a documentação do servidor vale literalmente. É também o pacote que o
Mongoose e o Prisma usam por baixo, então adotá-lo direto não é sair do caminho principal: é
remover uma camada dele.

**Como usar:**

```bash
pnpm add mongodb
```

```ts
import { MongoClient, type Collection } from 'mongodb'

type User = { name: string; email: string; createdAt: Date }

// Um client por processo. Ele já é o pool — não crie um por requisição.
const client = new MongoClient(process.env.MONGO_URL!)
const users: Collection<User> = client.db('app').collection<User>('users')

const { insertedId } = await users.insertOne({
  name: 'Ada',
  email: 'ada@example.com',
  createdAt: new Date(),
})

const user = await users.findOne({ _id: insertedId })
// user: WithId<User> | null  <- o _id entrou no tipo sozinho
```

**Quando usar a biblioteca:** sempre que o projeto já for **TypeScript com validação na borda**.
Essa é a condição, e ela decide tudo. Num projeto assim, o tipo do documento já existe (é uma
`type`), e a validação do payload já acontece antes do caso de uso — num validador de requisição
como VineJS ou Zod. Um schema de Mongoose, nesse cenário, é a **terceira** declaração da mesma
entidade: a `type`, o schema de validação, e o schema do ODM. Três lugares para mudar quando um
campo nasce, e dois deles não avisam quando saem de sincronia.

O driver puro desfaz esse empate: o TypeScript é a fonte do tipo, o validador é a fonte da regra, e
o banco não tem opinião nenhuma. É a mesma lógica que faz `vine.create` render um tipo em vez de
uma `type` paralela — ver [`vinejs.md`](vinejs.md).

**O que você perde, e qual é o equivalente manual.** Esta tabela é o coração da decisão. Nada aqui é
intransponível, mas tudo aqui passa a ser código seu:

| O que o Mongoose faz sozinho | O driver | Equivalente manual |
|---|---|---|
| Validação de schema | nada | O validador de requisição, na borda, antes do caso de uso |
| Casting (`"42"` vira `42`, string vira `ObjectId`) | nada | O validador converte, ou você chama `new ObjectId(id)` explicitamente |
| `populate()` | nada | `$lookup` na agregação, ou uma segunda consulta com `$in` |
| Hooks (`pre('save')`, `post('find')`) | nada | Uma função no repositório. O gancho vira chamada explícita |
| `timestamps: true` | nada | `createdAt` no documento, `$currentDate: { updatedAt: true }` no update |
| `strict` (campo fora do schema é descartado) | grava tudo que você mandar | O validador remove o que não é do schema |
| Métodos e estáticos de model | nada | Funções exportadas de um módulo de repositório |
| `_id` exposto como string | `ObjectId` de verdade | Conversão explícita na borda de entrada e de saída |
| `lean()` para sair do documento hidratado | já é sempre "lean" | Nada a fazer: o retorno é um objeto simples |

A linha do `populate` é a única que muda o desenho do código, e vale encarar de frente: sem ele,
relação vira decisão de modelagem. Ou o documento embute o que precisa ser lido junto, ou a leitura
vira um `$lookup` explícito numa agregação. As duas opções são visíveis no código; o `populate` era
uma consulta invisível por trás de um acesso a propriedade.

**Três avisos que só aparecem em produção:**

| Armadilha | O que acontece |
|---|---|
| `new MongoClient()` por requisição | Cada instância abre o próprio pool. Um client por processo, reutilizado — a doc de `connect/mongoclient` repete isso em destaque |
| Chave fora da `type` no filtro | O driver dá tipo `any` a qualquer chave não declarada. `find({ agee: 1 })` compila, roda e devolve zero documentos |
| Projeção sem parâmetro de tipo | `findOne(f, { projection: { _id: 0 } })` continua tipado **com** `_id`. `doc._id.toHexString()` compila e quebra em runtime |

**O detalhe que economiza horas:** o driver serializa `undefined` como **`null`** por padrão. Um
`$set: { phone: user.phone }` em que `phone` veio `undefined` grava `null` no documento — não
"deixa como está", não "remove o campo". O comportamento tem interruptor (`ignoreUndefined: true`,
no client ou na operação) e uma página inteira dedicada a ele (`data-formats/bson/undefined-values`,
mais abaixo). Quem vem do Mongoose passa direto por aqui, porque o ODM descartava `undefined`
antes de montar o comando. Ler essa página no primeiro dia evita um bug de dado sujo que só aparece
semanas depois.

**Links:** 48.

**Skills:** `maiyu-backend`, `tactical-ddd` (só em modelagem de agregado). Dispare junto com a leitura da entrada; a entrada é o contrato, a skill executa (`SKILLS-MAP.md`). Versão nova: `deprecation-and-migration`.

---

## Fundamentos

#### index
[doc](https://www.mongodb.com/docs/drivers/node/current/)

**O que é:** a página de entrada do driver, com o recorte do que ele cobre e o ponteiro para a
referência de API gerada do código-fonte.
**Para que serve:** entender que a documentação tem dois níveis — os guias em prosa, e a referência
de tipos em `mongodb.github.io/node-mongodb-native`.
**Quando usar:** na primeira visita, e sempre que precisar da assinatura exata de um método: o guia
explica o conceito, a referência de API diz quais opções o objeto aceita.

```ts
import { MongoClient } from 'mongodb'

// O pacote exporta tudo de um lugar só: client, tipos, BSON e erros.
// Não há subcaminhos de import (`mongodb/lib/...`) na API pública.
import type { Collection, Db, Document, Filter, UpdateFilter, WithId } from 'mongodb'
import { ObjectId, BSON, MongoServerError } from 'mongodb'
```

#### get-started
[doc](https://www.mongodb.com/docs/drivers/node/current/get-started/)

**O que é:** o caminho mínimo: instalar, montar a string de conexão, criar o client, rodar uma
consulta, fechar.
**Para que serve:** ter algo funcionando em cinco minutos e confirmar que a conexão está de pé.
**Quando usar:** no primeiro uso. Repare no `finally { await client.close() }` do exemplo: ele é
correto para um **script**, e errado para um servidor — num servidor o client vive tanto quanto o
processo.

```ts
import { MongoClient } from 'mongodb'

// SCRIPT: abre, faz o trabalho, fecha.
async function run() {
  const client = new MongoClient(process.env.MONGO_URL!)
  try {
    const posts = client.db('app').collection('posts')
    console.log(await posts.findOne({ slug: 'hello' }))
  } finally {
    await client.close()
  }
}

// SERVIDOR: um client no boot, reaproveitado, fechado no shutdown.
// Copiar o try/finally do quickstart para dentro de um handler HTTP
// derruba o pool a cada requisição.
```

#### promises
[doc](https://www.mongodb.com/docs/drivers/node/current/promises/)

**O que é:** a API assíncrona do driver. Desde a v5 **não há callbacks** — todo método que fala com
o servidor devolve `Promise`, e `find()` devolve um cursor.
**Para que serve:** saber o que é `await`-ável e o que não é.
**Quando usar:** ao escrever o primeiro laço sobre cursor. A página documenta um erro clássico com
`hasNext()`/`next()` que rende laço infinito, e vale conhecer antes de cometê-lo.

```ts
// ERRADO: hasNext() devolve uma Promise, que é sempre truthy.
// O while nunca termina.
const cursor = posts.find()
while (cursor.hasNext()) console.log(cursor.next())

// CERTO: await nos dois.
while (await cursor.hasNext()) console.log(await cursor.next())

// MELHOR: for await, que não tem como errar.
for await (const post of posts.find()) console.log(post)
```

#### typescript
[doc](https://www.mongodb.com/docs/drivers/node/current/typescript/)

**O que é:** a página mais importante do conjunto para esta stack. Explica `Collection<T>`, como o
`_id` entra e sai dos tipos, e — em detalhe — **onde a tipagem não protege**.
**Para que serve:** entender que a tipagem do driver é uma ajuda, não uma garantia.
**Quando usar:** **antes de escrever o primeiro repositório**. As três limitações abaixo são
silenciosas, e cada uma delas rende um bug que o compilador aprovou.

```ts
import type { Collection, StrictFilter } from 'mongodb'

type User = { name: string; email: string }
const users: Collection<User> = db.collection<User>('users')

// LIMITE 1 — chave fora da type recebe `any`. Isto compila e não acha nada:
await users.find({ emial: 'ada@example.com' }).toArray()

// LIMITE 2 — notação de ponto não é checada por padrão.
// `StrictFilter` liga a checagem (experimental, pode acusar falso positivo).
const filtro: StrictFilter<User> = { 'profile.age': 'trinta' } // erro de tipo aqui

// LIMITE 3 — projeção NÃO muda o tipo do retorno.
const doc = await users.findOne({}, { projection: { _id: 0, name: 1 } })
doc!._id // compila. Explode em runtime: o campo não veio.

// Correção: passe o tipo projetado ao método.
type UserNome = { name: string }
const seguro = await users.findOne<UserNome>({}, { projection: { _id: 0, name: 1 } })
// seguro._id -> erro de compilação, como deveria
```

```ts
// Caso real da stack: store guarda só collection() e hydrate() — o service nunca manipula o tipo cru.
export default class TeamStore {
  constructor(private readonly db: MongoClient) {}

  collection(): Collection<TeamDocument> {
    return this.db.db().collection<TeamDocument>('teams')
  }
}
```

## Conexão

#### connect/mongoclient
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/)

**O que é:** a anatomia da string de conexão (esquema, credenciais, host, banco de autenticação,
opções) e a criação do `MongoClient`.
**Para que serve:** conectar, e entender por que o client é um recurso de processo.
**Quando usar:** ao montar o módulo de infraestrutura do banco. A regra que a página destaca em
caixa: **`MongoClient` é um pool, então um por aplicação**. `connect()` é opcional desde a v4.7 —
o driver conecta sozinho na primeira operação —, mas chamá-lo explicitamente no boot faz a falha
de conexão aparecer na inicialização, e não na primeira requisição do usuário.

```ts
import { MongoClient } from 'mongodb'

// Convenção sugerida: app/infra/mongo.ts
const client = new MongoClient(process.env.MONGO_URL!)

export async function connectMongo() {
  await client.connect()
  // ping confirma que o servidor respondeu, não só que o socket abriu
  await client.db('admin').command({ ping: 1 })
  return client
}

export const db = client.db('app')
export const closeMongo = () => client.close()

// mongodb://user:senha@host:27017/app?opcao=valor
//   `/app` é o banco de AUTENTICAÇÃO quando não há authSource,
//   e o banco que `client.db()` sem argumento devolve.
// Senha com : / ? # [ ] @ precisa de encodeURIComponent.
```

#### connect/connection-options
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/)

**O que é:** o catálogo completo de opções do client — pool, timeouts, retry, read preference,
compressão, TLS —, com os valores padrão de cada uma.
**Para que serve:** a página de consulta quando alguém pergunta "qual é o default de X?".
**Quando usar:** ao revisar a configuração de produção. Os defaults que mais surpreendem:
`socketTimeoutMS` e `waitQueueTimeoutMS` são **`0`, ou seja, sem limite**; `maxPoolSize` é `100`;
`retryWrites` e `retryReads` já vêm ligados.

```ts
const client = new MongoClient(uri, {
  maxPoolSize: 100,        // padrão
  minPoolSize: 0,          // padrão
  maxIdleTimeMS: 45_000,   // padrão 0 = conexão ociosa nunca fecha
  connectTimeoutMS: 30_000,        // padrão
  serverSelectionTimeoutMS: 30_000, // padrão
  retryWrites: true,       // padrão
  retryReads: true,        // padrão
})

// As mesmas opções cabem na URI, e a URI ganha de quem lê o .env:
// mongodb://host:27017/?maxPoolSize=100&retryWrites=true&w=majority
```

#### connect/connection-options/connection-pools
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/)

**O que é:** como o pool funciona por dentro: um pool **por servidor da topologia**, `maxConnecting`
limitando aberturas simultâneas, e o que `close()` realmente fecha.
**Para que serve:** dimensionar o pool com número, não com palpite.
**Quando usar:** quando as operações começam a esperar. A conta que a página dá vale guardar: cada
`MongoClient` abre até **duas conexões de monitoramento por servidor**, além das do pool — num
replica set de três nós com `maxPoolSize` padrão, são até 106 sockets lendo só do primário.

```ts
const client = new MongoClient(uri, {
  maxPoolSize: 200,       // teto de conexões simultâneas por servidor
  minPoolSize: 10,        // mantém aquecido; 0 deixa o pool encolher na ociosidade
  maxConnecting: 2,       // aberturas em paralelo (rate limit de handshake)
  maxIdleTimeMS: 10_000,  // ponha ABAIXO do timeout do firewall/proxy
  waitQueueTimeoutMS: 10_000, // sem isto, a fila espera para sempre
})

// close() fecha os sockets ociosos e devolve os em uso conforme terminam.
// Ele NÃO aborta operação em andamento.
```

#### connect/connection-options/csot
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/csot/)

**O que é:** o `timeoutMS`, timeout de operação do lado do cliente (CSOT), que cobre o ciclo
inteiro: seleção de servidor, retirada de conexão do pool e execução no servidor.
**Para que serve:** substituir a colcha de retalhos de `socketTimeoutMS` + `maxTimeMS` +
`wTimeoutMS` por um número só.
**Quando usar:** em toda API com contrato de latência. `timeoutMS` **tem precedência** sobre
`socketTimeoutMS`, `waitQueueTimeoutMS`, `wTimeoutMS`, `maxTimeMS` e `maxCommitTimeMS`, e a
documentação avisa que esses vão ser depreciados quando o recurso sair do estado experimental.

```ts
// Teto do cliente: nenhuma operação passa de 10s de ponta a ponta.
const client = new MongoClient(uri, { timeoutMS: 10_000 })

// Override por operação, para o relatório que sabidamente demora:
const linhas = await report.aggregate(pipeline, { timeoutMS: 60_000 }).toArray()

// Cursor: o padrão é `cursorLifetime` (o timeout cobre TODA a iteração).
// Para laço longo, troque para `iteration`, que renova a cada next().
for await (const doc of posts.find({}, { timeoutMode: 'iteration', timeoutMS: 5_000 })) {
  await processar(doc)
}
```

#### connect/connection-options/stable-api
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/stable-api/)

**O que é:** o `serverApi`, que prende o comportamento dos comandos a uma versão declarada da API do
servidor (requer MongoDB 5.0+).
**Para que serve:** atualizar servidor ou driver sem herdar mudança de comportamento silenciosa.
**Quando usar:** em qualquer instalação gerenciada, Atlas em primeiro lugar, porque o upgrade do
servidor não é seu. `strict: true` transforma em erro o uso de comando fora da versão declarada —
é a opção que revela a dependência antes de ela quebrar sozinha.

```ts
import { MongoClient, ServerApiVersion } from 'mongodb'

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,            // comando fora da API declarada => exceção
    deprecationErrors: true, // comando depreciado => exceção
  },
})

// `strict: true` recusa comandos não cobertos pela v1 (vários comandos
// administrativos entram aí). Se algum for necessário, use um segundo
// client sem strict, em vez de desligar a garantia do principal.
```

#### connect/connection-targets
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/connection-targets/)

**O que é:** como a string de conexão muda conforme o alvo: standalone, replica set, cluster
particionado, Atlas.
**Para que serve:** escrever a URI certa em cada ambiente.
**Quando usar:** ao montar o `docker-compose` de desenvolvimento. A armadilha documentada é
específica e cara: um replica set dentro do Docker costuma expor **um** endpoint, e a descoberta de
topologia falha — em desenvolvimento, `directConnection=true` resolve; em produção, a resposta é
tornar cada nó alcançável.

```ts
// Standalone local
new MongoClient('mongodb://localhost:27017')

// Replica set: liste todos os nós que puder; um só já basta para descobrir o resto
new MongoClient('mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0')

// Replica set de um nó dentro do Docker (só em dev)
new MongoClient('mongodb://localhost:27017/?directConnection=true')

// SRV: o driver resolve os hosts por DNS e reescaneia sozinho
new MongoClient('mongodb+srv://user:senha@cluster.exemplo.mongodb.net/')
```

#### connect/connection-troubleshooting
[doc](https://www.mongodb.com/docs/drivers/node/current/connect/connection-troubleshooting/)

**O que é:** o catálogo de erros de conexão com a causa provável de cada um.
**Para que serve:** encurtar a investigação de "não conecta".
**Quando usar:** no primeiro `MongoServerSelectionError`. O item que mais pega gente hoje é de
Node, não de MongoDB: **a partir do Node 17 o resolvedor de DNS prefere IPv6**, e um servidor
escutando só em IPv4 devolve `ECONNREFUSED` contra um endereço `::1` que ninguém escreveu.

```ts
// ECONNREFUSED em ::1 com o banco rodando: cliente em IPv6, servidor em IPv4.
const client = new MongoClient(uri, { family: 4 })

// ECONNRESET: descritores de arquivo esgotados. Baixe maxPoolSize.
// "bad auth: authentication failed": credencial certa, authSource errado.
const comAuthSource = new MongoClient(
  'mongodb://user:senha@host:27017/?authSource=admin'
)
// Sem authSource e sem banco na URI, o driver autentica contra `admin`.
```

## Bancos, coleções e comandos

#### databases-collections
[doc](https://www.mongodb.com/docs/drivers/node/current/databases-collections/)

**O que é:** `client.db()`, `db.collection()`, `createCollection()`, `listCollections()`, `drop()`.
**Para que serve:** navegar a hierarquia banco → coleção → documento.
**Quando usar:** ao montar o módulo de acesso. O ponto que muda o desenho: **banco e coleção não
precisam existir** — o servidor cria na primeira escrita. `db.collection<T>('x')` é barato e
síncrono, então guardar a referência num módulo é conveniência, não otimização.

```ts
const db = client.db('app')

// Não vai ao servidor: só devolve um handle tipado.
const users = db.collection<User>('users')

// createCollection explícito só quando há OPÇÃO a declarar:
await db.createCollection('audit_log', {
  capped: true,
  size: 10_485_760,
  // validação no servidor, o mais perto de "schema" que o driver chega
  validator: { $jsonSchema: { required: ['action', 'at'] } },
})

for await (const c of db.listCollections({}, { nameOnly: true })) console.log(c.name)
```

#### run-command
[doc](https://www.mongodb.com/docs/drivers/node/current/run-command/)

**O que é:** `db.command()` e `db.runCursorCommand()`, a porta para qualquer comando do servidor que
não tenha método dedicado.
**Para que serve:** `ping`, `dbStats`, `collStats`, `explain`, diagnóstico.
**Quando usar:** raramente, e a própria página pede isso — **prefira o método do driver quando ele
existir**. Note que `command()` **ignora o read preference do `Db`** e usa `primary`, e que desde a
v6 ele aceita só cinco opções (`comment`, `enableUtf8Validation`, `raw`, `readPreference`,
`session`); o resto vai dentro do documento do comando.

```ts
// Healthcheck: o uso mais legítimo desta API numa aplicação.
export async function mongoHealthy() {
  const { ok } = await client.db('admin').command({ ping: 1 })
  return ok === 1
}

// Opção do COMANDO vai no documento; opção do DRIVER vai no segundo argumento.
await db.command(
  { grantRolesToUser: 'app', roles: ['readWrite'], writeConcern: { w: 'majority' } },
  { readPreference: 'primary' }
)
```

## Escrita

#### crud/insert
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/insert/)

**O que é:** `insertOne()` e `insertMany()`, seus resultados (`insertedId`, `insertedCount`,
`insertedIds`) e a opção `ordered`.
**Para que serve:** criar documentos.
**Quando usar:** o tempo todo. `ordered` merece atenção em carga: o padrão `true` **para no primeiro
erro** e deixa o resto sem inserir; `false` continua e junta as falhas no fim — que costuma ser o
que uma importação quer.

```ts
const { insertedId } = await users.insertOne({
  name: 'Ada',
  email: 'ada@example.com',
  createdAt: new Date(), // `timestamps` do Mongoose vira este campo, escrito por você
})

// Importação: não deixe um e-mail duplicado abortar as outras 4.999 linhas.
const res = await users.insertMany(lote, { ordered: false })
console.log(res.insertedCount, Object.values(res.insertedIds))

// Sem `_id` no documento, o driver gera um ObjectId pela primary key factory.
// Com `_id` repetido, o servidor devolve WriteError de chave duplicada.
```

```ts
// Caso real da stack: use-case devolve Either, o E11000 do insertOne vira left no catch global.
async execute(payload: Payload): Promise<Response> {
  try {
    const { insertedId } = await this.teams.collection().insertOne({ ...payload, createdAt: new Date() })
    return right({ id: insertedId.toString(), ...payload })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return left(HTTPException.Conflict('nome já existe', 'TEAM_NAME_TAKEN'))
    }
    return left(HTTPException.InternalServerError('Erro interno do servidor', 'TEAM_CREATE_ERROR'))
  }
}
```

```ts
// errado: ObjectId cru cruzando a fronteira do use-case até a resposta HTTP.
return right({ id: insertedId, ...payload }) // serializa como objeto { $oid: ... }, não string

// certo: cast explícito pra string na borda — contrato de API nunca vê ObjectId.
return right({ id: insertedId.toString(), ...payload })
```

#### crud/update
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/update/)

**O que é:** a opção `upsert`, disponível em `updateOne()`, `updateMany()` e `replaceOne()`.
**Para que serve:** "grave isto, exista ou não", sem o `findOne` antes.
**Quando usar:** em sincronização e em importação idempotente. Um detalhe que muda o resultado:
campos que devem valer **só na criação** vão em `$setOnInsert`, não em `$set` — senão a
reexecução sobrescreve o valor original toda vez.

```ts
await teams.updateOne(
  { slug: 'core' },                       // filtro é a chave natural
  {
    $set: { name: 'Core', updatedAt: new Date() },
    $setOnInsert: { createdAt: new Date() }, // só quando o documento nasce
  },
  { upsert: true }
)

// ATENÇÃO: o upsert NÃO usa a primary key factory customizada.
// Quando ele insere, o `_id` é um ObjectId gerado pelo servidor.
```

```ts
// Caso real da stack: use-case de sincronização, idempotente por slug.
async execute(payload: SyncPayload): Promise<Response> {
  await this.teams.collection().updateOne(
    { slug: payload.slug },
    { $set: { name: payload.name }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  )
  return right(undefined)
}
```

```ts
// errado: campo de criação em $set — toda reexecução do sync sobrescreve o valor original.
{ $set: { name: payload.name, createdAt: new Date() } }

// certo: campo que só vale na criação vai em $setOnInsert.
{ $set: { name: payload.name }, $setOnInsert: { createdAt: new Date() } }
```

#### crud/update/modify
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/update/modify/)

**O que é:** `updateOne()` e `updateMany()`, o formato do documento de update e os operadores
(`$set`, `$inc`, `$unset`, `$rename`, `$mul`, e a família de array).
**Para que serve:** alterar campos sem reescrever o documento.
**Quando usar:** em toda edição. Diferença que custa dado: `updateOne` altera **apenas o primeiro**
documento que casa com o filtro — não o único, o primeiro. Se o filtro não for único, é
`updateMany` ou um filtro melhor.

```ts
const r = await posts.updateOne(
  { _id: id },
  {
    $set: { title: 'Novo título' },
    $inc: { views: 1 },
    $unset: { draftNote: '' },
    $currentDate: { updatedAt: true }, // o servidor carimba a hora dele
  }
)
console.log(r.matchedCount, r.modifiedCount) // casou ≠ mudou

// matchedCount 1 e modifiedCount 0 significa "achei e o valor já era esse".
// Não é erro — e tratar como erro gera falso alarme.

// Atualizar item de array pela condição, não pelo índice:
await posts.updateOne(
  { _id: id },
  { $set: { 'comments.$[c].hidden': true } },
  { arrayFilters: [{ 'c.authorId': autorId }] }
)
```

#### crud/update/replace
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/update/replace/)

**O que é:** `replaceOne()`, que troca **todo** o conteúdo do documento, preservando só o `_id`.
**Para que serve:** o caso em que o cliente manda o documento inteiro, como um PUT.
**Quando usar:** com cuidado, e quase nunca a partir de payload de formulário. Um campo que o
formulário não conhece — `createdAt`, um contador, uma flag interna — **desaparece**. `updateOne`
com `$set` é o padrão; `replaceOne` é a exceção consciente.

```ts
// PUT: o corpo é o documento inteiro, por contrato.
await items.replaceOne({ _id: id }, { name: 'Novo', price: 79.15, quantity: 1 })
// `_id` sobrevive. Todo o resto que não veio no objeto sumiu.

// Precisa do documento resultante? findOneAndReplace tem a mesma interface
// e devolve a versão anterior ou a nova, conforme `returnDocument`.
```

#### crud/delete
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/delete/)

**O que é:** `deleteOne()`, `deleteMany()` e o `deletedCount` do resultado.
**Para que serve:** remover documentos.
**Quando usar:** com o mesmo cuidado do `updateOne`: filtro frouxo em `deleteMany` é irreversível.
Se a aplicação precisa do documento depois de apagado, `findOneAndDelete` já o devolve e evita a
corrida entre ler e apagar.

```ts
const r = await posts.deleteOne({ _id: id })
if (r.deletedCount === 0) throw new NotFound()

// deleteMany com filtro amplo não pergunta nada. Confira o count antes:
const alvo = { status: 'draft', createdAt: { $lt: umAnoAtras } }
console.log(await posts.countDocuments(alvo))
await posts.deleteMany(alvo)

// `deleteMany({})` esvazia a coleção. `drop()` apaga índices junto.
```

```ts
// Caso real da stack: use-case devolve left de 404 de negócio quando nada foi apagado.
async execute(payload: Payload): Promise<Response> {
  const { deletedCount } = await this.posts.collection().deleteOne({ _id: castFilter(payload.id) })
  if (deletedCount === 0) return left(HTTPException.NotFound('post não encontrado', 'POST_NOT_FOUND'))
  return right(undefined)
}
```

```ts
// errado: ObjectId malformado chega direto ao filtro — estoura BSONError, cai no catch genérico (500).
await posts.deleteOne({ _id: request.params.id })

// certo: cast explícito na borda, erro de formato tratado como 400 pelo handler global.
await posts.deleteOne({ _id: castFilter(request.params.id) })
```

#### crud/compound-operations
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/compound-operations/)

**O que é:** `findOneAndUpdate()`, `findOneAndReplace()` e `findOneAndDelete()` — leitura e escrita
num único comando atômico.
**Para que serve:** eliminar a janela entre ler e escrever, sem abrir transação.
**Quando usar:** em contador, reserva de estoque, fila de trabalho, geração de sequência. Duas
opções decidem o retorno: `returnDocument` (`'before'` ou `'after'`) e `includeResultMetadata`, que
desde a v6 é **`false` por padrão** — o método devolve o documento direto, ou `null`.

```ts
// Fila: pegar o próximo item e marcá-lo como meu, sem outro worker levar o mesmo.
const job = await jobs.findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'running', startedAt: new Date() } },
  { sort: { priority: -1, createdAt: 1 }, returnDocument: 'after' }
)
if (job === null) return // nada na fila

// includeResultMetadata: true devolve { value, lastErrorObject, ok } —
// o formato antigo, útil só quando você precisa do metadado.
```

```ts
// Caso real da stack: contador de visualização sem janela entre ler e escrever, sem transação.
async execute(payload: Payload): Promise<Response> {
  const post = await this.posts.collection().findOneAndUpdate(
    { _id: castFilter(payload.id) },
    { $inc: { views: 1 } },
    { returnDocument: 'after' },
  )
  if (post === null) return left(HTTPException.NotFound('post não encontrado', 'POST_NOT_FOUND'))
  return right(post)
}
```

```ts
// errado: ler e depois escrever em dois comandos — outro worker pode ler o mesmo job entre os dois.
const job = await jobs.findOne({ status: 'pending' })
await jobs.updateOne({ _id: job._id }, { $set: { status: 'running' } }) // corrida: dois workers podem pegar o mesmo job

// certo: findOneAndUpdate é atômico — nenhum outro worker vê o mesmo job como pending.
const job = await jobs.findOneAndUpdate({ status: 'pending' }, { $set: { status: 'running' } })
```

#### crud/bulk-write
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/bulk-write/)

**O que é:** `collection.bulkWrite()` e, desde MongoDB 8.0 com driver 6.10+, `client.bulkWrite()`,
que escreve em **várias coleções e bancos** numa chamada.
**Para que serve:** trocar N idas ao servidor por uma.
**Quando usar:** em toda escrita em lote. O driver reparte sozinho em blocos de 100.000 operações
(`maxWriteBatchSize`, imutável), então o limite prático é o seu, não o dele. Em erro, a exceção é
`MongoBulkWriteError` — e ela carrega `result` com o que já passou, que é o que permite retomar.

```ts
await users.bulkWrite(
  [
    { insertOne: { document: { name: 'Ada', email: 'ada@example.com' } } },
    { updateOne: { filter: { email: 'x@y.z' }, update: { $set: { active: true } }, upsert: true } },
    { updateMany: { filter: { plan: 'free' }, update: { $set: { quota: 100 } } } },
    { deleteOne: { filter: { email: 'antigo@y.z' } } },
  ],
  { ordered: false } // continua após falha; com true, para na primeira
)

// Resultado: insertedCount, matchedCount, modifiedCount, upsertedCount, deletedCount.
// Cruzando bancos e coleções, o bulkWrite é do CLIENT e cada item traz `namespace`:
await client.bulkWrite([
  { namespace: 'app.users', name: 'insertOne', document: { name: 'Ada' } },
  { namespace: 'app.audit', name: 'insertOne', document: { action: 'user.create' } },
])
```

```ts
// Caso real da stack: importação em lote no use-case, falha parcial não aborta o resto.
async execute(payload: ImportPayload): Promise<Response> {
  const ops = payload.rows.map((row) => ({ insertOne: { document: { ...row, createdAt: new Date() } } }))
  const result = await this.posts.collection().bulkWrite(ops, { ordered: false })
  return right({ importados: result.insertedCount })
}
```

```ts
// errado: N chamadas insertOne em loop — N idas ao servidor para o que cabe numa.
for (const row of payload.rows) await posts.insertOne(row)

// certo: uma chamada só, o driver reparte em blocos de até 100.000 operações.
await posts.bulkWrite(payload.rows.map((row) => ({ insertOne: { document: row } })))
```

#### crud/configure
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/configure/)

**O que é:** read preference, read concern, write concern e collation — e os quatro níveis em que se
declaram: client, transação, banco, coleção.
**Para que serve:** decidir durabilidade e consistência por caso, em vez de aceitar um default global.
**Quando usar:** ao separar leitura de relatório de leitura de tela. A ordem de precedência é
client < banco < coleção < transação, e a coleção é o nível certo para a maioria das decisões:
declarada uma vez, no módulo, vale para toda operação daquela coleção.

```ts
// Leitura de relatório: pode ler de secundário e aceitar dado um pouco atrás.
const reportView = db.collection('orders', {
  readPreference: 'secondaryPreferred',
  readConcern: { level: 'available' },
})

// Escrita que não pode sumir numa eleição: maioria confirma.
const ledger = db.collection('ledger', { writeConcern: { w: 'majority' } })

// Collation: ordenação com regra de idioma. Definida na coleção,
// no índice ou na operação — e não dá para mudar a da coleção depois.
await db.createCollection('names', { collation: { locale: 'pt' } })
```

#### crud/pkfactory
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/pkfactory/)

**O que é:** a opção `pkFactory` do client, que troca o gerador padrão de `_id` (um `ObjectId`) por
um seu.
**Para que serve:** usar UUID, ULID ou id de domínio como chave primária.
**Quando usar:** quando o id precisa ser gerado **antes** da ida ao banco, ou precisa ser opaco (um
`ObjectId` vaza o instante de criação em `getTimestamp()`). Duas ressalvas da própria página: o
`pkFactory` **não vale em upsert** — ali o servidor gera um `ObjectId` —, e misturar tipos de `_id`
na mesma coleção é dado inconsistente que ninguém detecta.

```ts
import { MongoClient, UUID } from 'mongodb'

const client = new MongoClient(uri, {
  pkFactory: { createPk: () => new UUID().toBinary() },
})

// Com pkFactory trocado, todo insert sem `_id` recebe um UUID binário.
// Um `insertOne({ _id: 'texto-livre' })` fura a convenção sem aviso —
// o validador da borda é quem impede isso.
```

## Leitura

#### crud/query/query-document
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/query-document/)

**O que é:** o documento de consulta e as quatro famílias de operador: comparação (`$gt`, `$lt`,
`$ne`, `$in`), lógicos (`$and`, `$or`, `$nor`, `$not`), de elemento (`$exists`, `$type`) e de
avaliação (`$regex`, `$text`, `$mod`).
**Para que serve:** o vocabulário de filtro que todo método de leitura e escrita reaproveita.
**Quando usar:** **antes do segundo filtro**. A regra que evita `$and` desnecessário: chaves no
mesmo objeto já são combinadas com **`$and` implícito**, e valor literal já é `$eq`.

```ts
// Estes dois filtros são o mesmo comando:
await users.find({ role: 'admin', age: { $gt: 18 } })
await users.find({ $and: [{ role: { $eq: 'admin' } }, { age: { $gt: 18 } }] })

// `$or` é o caso em que o operador é obrigatório:
await users.find({ $or: [{ role: 'admin' }, { ownerId: id }] })

// `$exists` distingue "campo ausente" de "campo com valor null" —
// e essa diferença importa quando `undefined` virou `null` na escrita.
await users.find({ deletedAt: { $exists: false } })
await users.find({ deletedAt: null }) // casa com ausente E com null
```

```ts
// Caso real da stack: filtro combinado no use-case de busca, sem $and explícito.
async execute(payload: SearchPayload): Promise<Response> {
  const docs = await this.posts.collection().find({
    status: 'published',
    tags: { $in: payload.tags },
  }).toArray()
  return right(docs)
}
```

#### crud/query/retrieve
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/)

**O que é:** `find()` e `findOne()`. O primeiro devolve um **cursor**; o segundo, uma `Promise` do
documento ou de `null`.
**Para que serve:** a leitura, no singular e no plural.
**Quando usar:** sempre. A regra que a página repete em três lugares: **encadeie `sort()`,
`limit()`, `skip()` e `project()` antes de iterar o cursor** — depois de começar a iteração, a
chamada é silenciosamente ignorada.

```ts
// findOne: Promise<WithId<User> | null>. Checar null não é opcional.
const user = await users.findOne({ email })
if (user === null) throw new NotFound()

// find: cursor. Nada foi ao servidor ainda.
const cursor = posts
  .find({ status: 'published' })
  .sort({ publishedAt: -1 })
  .limit(20)
  .project({ body: 0 })

for await (const post of cursor) console.log(post.title)

// ERRADO: o sort não tem efeito, a iteração já começou.
const c = posts.find({})
const primeiro = await c.next()
c.sort({ title: 1 })
```

```ts
// Caso real da stack: store expõe só collection(), use-case encadeia antes de iterar.
async execute(payload: Payload): Promise<Response> {
  const team = await this.teams.collection().findOne({ _id: castFilter(payload.id) })
  if (team === null) return left(HTTPException.NotFound('time não encontrado', 'TEAM_NOT_FOUND'))
  return right(team)
}
```

#### crud/query/specify-documents-to-return
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/specify-documents-to-return/)

**O que é:** `sort()`, `limit()` e `skip()`, e como se combinam.
**Para que serve:** paginação e recorte.
**Quando usar:** em toda listagem. Dois fatos que a página deixa explícitos: **a ordem das chamadas
não importa** — o driver reordena para aplicar o sort primeiro —, e **`skip()` sem `sort()` pula
documentos arbitrários**, porque sem ordenação o servidor não promete ordem nenhuma.

```ts
// Paginação por offset: simples, e degrada — o servidor percorre e descarta
// os `skip` primeiros. Em página 500 isso já dói.
const pagina = await posts
  .find({ status: 'published' })
  .sort({ publishedAt: -1, _id: -1 }) // 2º campo desempata e torna estável
  .skip((n - 1) * 20)
  .limit(20)
  .toArray()

// Paginação por cursor: custo constante, e imune a inserção durante a leitura.
const proxima = await posts
  .find({ status: 'published', _id: { $lt: ultimoIdVisto } })
  .sort({ _id: -1 })
  .limit(20)
  .toArray()
```

#### crud/query/project
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/project/)

**O que é:** a projeção: `1` inclui (e exclui todo o resto), `0` exclui (e inclui todo o resto). As
duas formas são mutuamente exclusivas.
**Para que serve:** não trafegar campo que a tela não usa.
**Quando usar:** sempre que o documento tiver campo grande ou sensível. A exceção que confunde:
**`_id` é sempre devolvido**, mesmo numa projeção de inclusão, a menos que você o exclua
explicitamente — é a única chave que pode aparecer com `0` no meio de uma projeção de `1`.

```ts
// Inclusão: só name e email — mais o _id, que veio de brinde.
await users.find().project({ name: 1, email: 1 })

// Inclusão sem _id: a única mistura de 1 e 0 que o servidor aceita.
await users.find().project({ _id: 0, name: 1, email: 1 })

// Exclusão: tudo menos o que dói. Bom para esconder campo sensível
// sem ter que listar os outros vinte.
await users.find().project({ passwordHash: 0, mfaSecret: 0 })

// Lembre do limite da página `typescript`: a projeção não muda o TIPO.
// Passe o tipo projetado ao método para o compilador acompanhar.
```

#### crud/query/cursor
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/cursor/)

**O que é:** o cursor e seus modos de consumo — `for await`, `hasNext()`/`next()`, `toArray()`,
`stream()`, eventos — mais `close()`, `rewind()` e `AbortSignal`.
**Para que serve:** ler resultado grande sem trazer tudo para a memória.
**Quando usar:** em toda leitura que possa crescer. Dois avisos em caixa na página: **não misture
paradigmas no mesmo cursor** (um `hasNext()` no meio de um `toArray()` dá resultado indefinido), e
**feche o cursor não exaurido** — ele segura recurso no cliente e no servidor.

```ts
// Streaming: memória constante, independente do tamanho do resultado.
for await (const doc of posts.find({})) await processar(doc)

// toArray(): tudo na memória de uma vez. Só com limit() por perto.
const primeiros = await posts.find({}).limit(100).toArray()

// Saída antecipada: feche o que você não terminou de ler.
const cursor = posts.find({})
try {
  for await (const doc of cursor) if (achou(doc)) break
} finally {
  await cursor.close()
}

// v7: o batchSize padrão de 1000 foi REMOVIDO. Leitura grande em rede lenta
// pode querer um valor explícito.
posts.find({}, { batchSize: 500 })
```

#### crud/query/count
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/count/)

**O que é:** `countDocuments()` (exato, aceita filtro, percorre) e `estimatedDocumentCount()`
(estimado, sem filtro, lê metadado da coleção).
**Para que serve:** o total da paginação, e o número do painel.
**Quando usar:** `countDocuments` quando há filtro; `estimatedDocumentCount` para "quantos
registros existem" numa tela de visão geral. A dica da página vale guardar: um
`countDocuments({})` sem filtro pode usar `.hint('_id')` para se apoiar no índice do `_id` em vez
de varrer a coleção.

```ts
// Total da paginação: precisa ser exato, e o filtro é o mesmo da listagem.
const total = await posts.countDocuments({ status: 'published' })

// Painel: um número aproximado, instantâneo.
const aprox = await posts.estimatedDocumentCount()

// Contagem total exata, sem varredura:
await posts.countDocuments({}).hint('_id')
```

```ts
// Caso real da stack: Paginated<T> do contrato leva total e items, mesmo filtro nos dois.
async execute(payload: ListPayload): Promise<Either<HTTPException, Paginated<Post>>> {
  const filter = { status: 'published' }
  const [items, total] = await Promise.all([
    this.posts.collection().find(filter).skip(payload.skip).limit(payload.limit).toArray(),
    this.posts.collection().countDocuments(filter),
  ])
  return right({ items, total })
}
```

```ts
// errado: filtro da contagem diferente do filtro da listagem — total não bate com o que a tela mostra.
const total = await posts.countDocuments({})
const items = await posts.find({ status: 'published' }).toArray()

// certo: o mesmo filtro nos dois, sempre.
const filter = { status: 'published' }
const total = await posts.countDocuments(filter)
const items = await posts.find(filter).toArray()
```

#### crud/query/distinct
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/distinct/)

**O que é:** `distinct()`, que devolve os valores únicos de um campo, com filtro e collation
opcionais.
**Para que serve:** alimentar um `<select>` de filtro a partir do que existe nos dados.
**Quando usar:** em campo de baixa cardinalidade. Em campo com muitos valores distintos, o
resultado precisa caber num documento BSON de **16 MB** — aí a resposta é `$group` na agregação,
que pagina. Detalhe de assinatura: para passar `options`, o `query` é obrigatório (use `{}`).

```ts
const areas = await posts.distinct('area')                       // todos
const ativos = await posts.distinct('area', { status: 'published' }) // filtrado

// Com options, o filtro vazio é obrigatório na posição do meio:
await posts.distinct('title', {}, { collation: { locale: 'pt' } })
```

#### crud/query/text
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/query/text/)

**O que é:** busca textual com `$text`/`$search`, exigindo um índice `text`, com frase entre aspas,
negação com `-` e ordenação por `$meta: 'textScore'`.
**Para que serve:** busca por palavra em campo livre sem serviço externo.
**Quando usar:** quando "razoável" basta. O limite que decide a arquitetura: **só existe um índice
`text` por coleção** — ele cobre todos os campos que você listar nele, e não há um segundo para
outro conjunto. Além disso, a relevância é rústica; busca de produto séria pede outra ferramenta.

```ts
await posts.createIndex(
  { title: 'text', body: 'text' },
  { default_language: 'portuguese', weights: { title: 3, body: 1 } }
)

// Palavras soltas = OU. Frase = aspas escapadas. `-` nega.
const query = { $text: { $search: '"banco de dados" -legado' } }

const achados = await posts
  .find(query)
  .sort({ score: { $meta: 'textScore' } })
  .project({ title: 1, score: { $meta: 'textScore' } })
  .toArray()
```

## Transações e sessões

#### crud/transactions
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/)

**O que é:** transações multi-documento, as duas APIs disponíveis (Core e Convenient), as opções
(`readConcern`, `writeConcern`, `maxCommitTimeMS`) e os dois erros que **exigem** retentativa:
`TransientTransactionError` e `UnknownTransactionCommitResult`.
**Para que serve:** atomicidade quando a operação toca mais de um documento.
**Quando usar:** menos do que o instinto pede. **Escrita num único documento já é atômica** — se a
consistência cabe dentro de um documento, modelar assim é mais barato que transacionar. Requisito:
replica set (MongoDB 4.0+); standalone não tem transação.

```ts
// Três regras que a doc chama de obrigatórias:
// 1. passe a `session` em TODA operação da transação;
// 2. use `await` em cada uma;
// 3. nada de Promise.all — sessão em paralelo gera erro de servidor.

// Antes de abrir transação, pergunte se o $inc resolve. Muitas vezes resolve:
await accounts.updateOne({ _id: id, balance: { $gte: 100 } }, { $inc: { balance: -100 } })
// matchedCount 0 significa "saldo insuficiente", atomicamente, sem sessão.
```

#### crud/transactions/transaction-conv
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/transaction-conv/)

**O que é:** a Convenient Transaction API: `client.withSession()` + `session.withTransaction()`, que
criam, comitam e encerram sozinhas.
**Para que serve:** ter transação sem escrever o ciclo de vida à mão.
**Quando usar:** **este é o caminho padrão**. Ela já embute a lógica de retentativa dos dois erros
transitórios, que na API Core é código seu. Desde a v6, `withTransaction()` devolve o valor do
callback — e o alerta da doc é único: o callback tem que tratar os próprios erros, ou o retry vira
laço infinito.

```ts
const resultado = await client.withSession((session) =>
  session.withTransaction(async (session) => {
    await accounts.updateOne({ _id: origem }, { $inc: { balance: -100 } }, { session })
    await accounts.updateOne({ _id: destino }, { $inc: { balance: 100 } }, { session })
    return { ok: true } // vira o retorno de withTransaction
  })
)

// A sessão pertence ao client que a criou. Passá-la para outro MongoClient
// levanta MongoInvalidArgumentError.
```

```ts
// Caso real da stack: duas escritas, uma transação (backend.md §4.2) — use-case devolve left se uma falhar.
async execute(payload: Payload): Promise<Response> {
  try {
    await this.client.withSession((session) =>
      session.withTransaction(async (session) => {
        await this.teams.collection().updateOne({ _id: teamId }, { $inc: { seats: -1 } }, { session })
        await this.invites.collection().insertOne({ teamId, email: payload.email }, { session })
      }),
    )
    return right(undefined)
  } catch (error) {
    return left(HTTPException.InternalServerError('Erro interno do servidor', 'INVITE_ERROR'))
  }
}
```

```ts
// errado: callback engole o próprio erro sem relançar — o retry do transitório vira laço infinito.
session.withTransaction(async (session) => {
  try { await accounts.updateOne({}, {}, { session }) } catch { return }
})

// certo: deixa o erro subir, é ele que a Convenient API usa para decidir repetir ou não.
session.withTransaction(async (session) => { await accounts.updateOne({}, {}, { session }) })
```

#### crud/transactions/transaction-core
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/transaction-core/)

**O que é:** a API Core: `startSession()`, `startTransaction()`, `commitTransaction()`,
`abortTransaction()`, `endSession()`, com o `try/catch/finally` explícito.
**Para que serve:** controle fino do ciclo de vida da transação.
**Quando usar:** quando a Convenient não serve — comitar em ponto específico, ou orquestrar a
sessão junto de outra coisa. O preço é claro: **a retentativa passa a ser sua**, e são duas rotinas
distintas (repetir a transação inteira em `TransientTransactionError`; repetir só o commit em
`UnknownTransactionCommitResult`).

```ts
const session = client.startSession()
try {
  session.startTransaction({ readConcern: { level: 'local' }, writeConcern: { w: 'majority' } })
  await savings.findOneAndUpdate({ accountId }, { $inc: { amount: -100 } }, { session })
  await checking.findOneAndUpdate({ accountId }, { $inc: { amount: 100 } }, { session })
  await session.commitTransaction()
} catch (error) {
  await session.abortTransaction()
  throw error // sem a lógica de retry, este catch PERDE o erro transitório
} finally {
  await session.endSession()
}
```

## Índices

#### indexes
[doc](https://www.mongodb.com/docs/drivers/node/current/indexes/)

**O que é:** `createIndex()`, `listIndexes()` e os tipos: campo único, composto, multikey (array),
único, texto, geoespacial, clusterizado, mais os índices de MongoDB Search e Vector Search.
**Para que serve:** o que separa uma consulta de 2 ms de uma varredura de coleção.
**Quando usar:** **junto com a consulta, não depois do incidente**. O conceito que rende mais: uma
consulta **coberta**, em que filtro, ordenação e projeção cabem todos no índice, é respondida sem
tocar nos documentos. E índice composto é direcional — a ordem dos campos importa.

```ts
// Um índice para a consulta, não um por campo.
await posts.createIndex({ status: 1, publishedAt: -1 })
// Serve para filtrar por status + ordenar por data, e para filtrar só por status.
// NÃO serve para ordenar só por publishedAt: prefixo à esquerda manda.

await users.createIndex({ email: 1 }, { unique: true })
await posts.createIndex({ 'location.geo': '2dsphere' })

// Migration/boot: createIndex é idempotente, então declarar os índices
// no start da aplicação é seguro — e é o substituto do `index: true`
// que o schema do Mongoose declarava junto do campo.
for await (const ix of posts.listIndexes()) console.log(ix.name, ix.key)
```

```ts
// Caso real da stack: índice declarado no boot do kernel, junto do registro dos stores.
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection('teams').createIndex({ slug: 1 }, { unique: true })
  await db.collection('posts').createIndex({ status: 1, publishedAt: -1 })
}
```

```ts
// errado: índice de campo único quando a consulta de verdade filtra e ordena por dois campos.
await posts.createIndex({ status: 1 })
await posts.find({ status: 'published' }).sort({ publishedAt: -1 }) // ordena em memória, sem índice

// certo: índice composto na mesma ordem do filtro + sort — consulta coberta.
await posts.createIndex({ status: 1, publishedAt: -1 })
```

#### interfaces/CreateIndexesOptions
[doc](https://mongodb.github.io/node-mongodb-native/7.6/interfaces/CreateIndexesOptions.html)

**O que é:** a referência de API das opções de `createIndex()`. É onde vivem `expireAfterSeconds`
(TTL), `partialFilterExpression` (índice parcial), `unique`, `sparse`, `hidden`, `name`, `collation`
e `weights`.
**Para que serve:** os três índices que o guia em prosa menciona pouco e que resolvem muito: TTL,
parcial e único parcial.
**Quando usar:** ao criar índice que não seja o trivial. **TTL** apaga documento sozinho — é sessão,
token e log sem cron. **Parcial** indexa só o subconjunto que interessa, e combinado com `unique`
resolve o caso clássico de "e-mail único, mas só entre os não excluídos".

```ts
// TTL: o servidor remove o documento passados 3600s do campo de data.
// O campo TEM que ser Date; o varredor roda a cada ~60s, então não é exato.
await sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })

// Parcial + único: unicidade que vale só para a fatia relevante.
await users.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } }
)

// `hidden: true` mantém o índice existindo, mas fora do planejador —
// o jeito de testar a remoção de um índice caro sem perdê-lo.
await posts.createIndex({ legacyKey: 1 }, { hidden: true })
```

## Agregação

#### aggregation
[doc](https://www.mongodb.com/docs/drivers/node/current/aggregation/)

**O que é:** a apresentação do pipeline de agregação: estágios em sequência, cada um transformando o
fluxo de documentos.
**Para que serve:** tudo que `find()` não faz — agrupar, juntar coleções, calcular campo, resumir.
**Quando usar:** quando a resposta não é uma lista de documentos como estão guardados. Dois limites
que a página fixa e que voltam como erro em produção: o documento de saída não pode passar de
**16 MB**, e cada estágio tem **100 MB** de memória (`allowDiskUse: true` levanta isso ao custo de
ir ao disco).

```ts
const porStatus = await orders.aggregate([
  { $match: { createdAt: { $gte: inicioDoMes } } }, // SEMPRE primeiro: usa índice
  { $group: { _id: '$status', total: { $sum: '$amount' }, qtd: { $sum: 1 } } },
  { $sort: { total: -1 } },
]).toArray()

// `aggregate()` devolve cursor, como `find()`. Pipeline pesado:
orders.aggregate(pipeline, { allowDiskUse: true })
```

```ts
// Caso real da stack: relatório resumido no use-case, tipado no generic do aggregate.
async execute(payload: Payload): Promise<Response> {
  const relatorio = await this.orders.collection()
    .aggregate<{ _id: string; total: number }>([
      { $match: { teamId: payload.teamId } },
      { $group: { _id: '$status', total: { $sum: '$amount' } } },
    ]).toArray()
  return right(relatorio)
}
```

```ts
// errado: $lookup para outra coleção, ignorando a projeção e o escopo de tenant do loader.
{ $lookup: { from: 'users', localField: 'ownerId', foreignField: '_id', as: 'owner' } } // vaza hash de senha

// certo: carrega pela collection escopada do próprio store, com projeção própria (backend-fastify.md §4).
const owners = await this.users.collection().find({ _id: { $in: ownerIds } }, { projection: { password: 0 } }).toArray()
```

#### aggregation/pipeline-stages
[doc](https://www.mongodb.com/docs/drivers/node/current/aggregation/pipeline-stages/)

**O que é:** a tabela de todos os estágios, cada um com link para a referência do servidor.
**Para que serve:** achar o estágio certo sem decorar a lista.
**Quando usar:** ao montar pipeline. Os que mais aparecem no dia a dia desta stack: `$match` (filtro,
sempre no começo), `$lookup` (**o substituto do `populate`**), `$group`, `$facet` (vários pipelines
no mesmo passo — página e total numa ida só), `$unwind` e `$project`.

```ts
// $lookup: a junção explícita que substitui o populate.
const comAutor = await posts.aggregate([
  { $match: { status: 'published' } },
  { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'author' } },
  { $unwind: '$author' }, // $lookup sempre devolve array; isto o achata
  { $project: { title: 1, 'author.name': 1 } },
]).toArray()

// $facet: listagem paginada e contagem total numa única ida ao servidor.
const [{ itens, total }] = await posts.aggregate([
  { $match: filtro },
  {
    $facet: {
      itens: [{ $sort: { publishedAt: -1 } }, { $skip: 0 }, { $limit: 20 }],
      total: [{ $count: 'value' }],
    },
  },
]).toArray()
```

## Change streams e observabilidade

#### monitoring-and-logging/change-streams
[doc](https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/change-streams/)

**O que é:** `watch()` em coleção, banco ou client, devolvendo um `ChangeStream` de eventos de
alteração — aceita pipeline de agregação para filtrar.
**Para que serve:** reagir a mudança de dado sem polling: invalidar cache, empurrar por WebSocket,
alimentar índice de busca.
**Quando usar:** quando o gatilho é o dado mudar, não a requisição chegar. Requer replica set. Duas
pegadinhas: evento de **update traz só os campos alterados** (`fullDocument: 'updateLookup'`
resolve), e **usar o mesmo stream como iterador e como EventEmitter dá erro**.

```ts
const stream = posts.watch(
  [{ $match: { operationType: { $in: ['insert', 'update'] } } }],
  { fullDocument: 'updateLookup' } // sem isto, update traz só o delta
)

for await (const change of stream) {
  if (change.operationType === 'insert' || change.operationType === 'update') {
    await cache.invalidate(change.documentKey._id)
  }
}

// Um dos dois modos, nunca os dois no mesmo stream:
stream.on('change', (c) => console.log(c)) // EventEmitter
```

#### monitoring-and-logging/monitoring
[doc](https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/monitoring/)

**O que é:** os eventos que o client emite, em três famílias: comandos
(`commandStarted`/`Succeeded`/`Failed`), topologia/SDAM, e pool de conexões.
**Para que serve:** medir o banco de dentro da aplicação, sem depender do profiler do servidor.
**Quando usar:** ao instrumentar. `commandSucceeded` traz `duration` — é a métrica de latência por
comando, e alimenta um histograma direto. Os eventos de comando são **desligados por padrão**
(`monitorCommands: true` liga), e a própria doc avisa que o custo não é zero.

```ts
const client = new MongoClient(uri, { monitorCommands: true })

client.on('commandSucceeded', (e) => {
  metrics.histogram('mongo.command.duration', e.duration, { command: e.commandName })
})
client.on('commandFailed', (e) => {
  logger.error({ command: e.commandName, err: e.failure }, 'mongo command failed')
})

// Sem monitorCommands, os eventos de POOL continuam disponíveis —
// e são os que mostram saturação antes de virar timeout:
client.on('connectionCheckOutFailed', (e) => metrics.increment('mongo.pool.exhausted'))
```

#### monitoring-and-logging/logging
[doc](https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/logging/)

**O que é:** o log interno do driver, configurável por variável de ambiente
(`MONGODB_LOG_ALL`, `MONGODB_LOG_COMMAND`, `MONGODB_LOG_CONNECTION`...) ou por opção de client
(`mongodbLogComponentSeverities`, `mongodbLogPath`).
**Para que serve:** ver o que o driver está fazendo em produção sem recompilar nada.
**Quando usar:** ao investigar conexão instável ou seleção de servidor. As variáveis de ambiente são
o caminho rápido; a opção de client é o caminho certo numa aplicação que já tem logger, porque
`mongodbLogPath` aceita um objeto com `write()` e entrega o log ao seu.

```bash
# Investigação pontual, sem tocar no código:
export MONGODB_LOG_ALL="debug"
export MONGODB_LOG_COMMAND="off"   # command é o mais caro de todos
export MONGODB_LOG_PATH="stdout"
```

```ts
// Permanente: o log do driver entra no logger da aplicação.
const client = new MongoClient(uri, {
  mongodbLogComponentSeverities: { default: 'warn', command: 'off', connection: 'info' },
  mongodbLogPath: { write: (log) => logger.info(log) },
})
// A opção de client tem precedência sobre a variável de ambiente.
// O write NÃO pode lançar: exceção ali encerra o logger.
```

## Arquivos grandes

#### crud/gridfs
[doc](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/)

**O que é:** o GridFS, que parte um arquivo em pedaços e os guarda em duas coleções (`fs.files` com
metadado, `fs.chunks` com os bytes), por trás da classe `GridFSBucket`.
**Para que serve:** guardar arquivo maior que o limite de 16 MB de um documento BSON.
**Quando usar:** com parcimônia. Se já existe um armazenamento de objetos (S3 ou compatível), ele é
melhor nesse trabalho — mais barato, servível por URL assinada, fora do backup do banco. GridFS
ganha quando não há esse armazenamento, ou quando o arquivo precisa estar na mesma transação e no
mesmo backup do resto.

```ts
import { GridFSBucket, ObjectId } from 'mongodb'
import { createReadStream, createWriteStream } from 'node:fs'

const bucket = new GridFSBucket(db, { bucketName: 'uploads' })

createReadStream('./relatorio.pdf').pipe(
  bucket.openUploadStream('relatorio.pdf', { metadata: { ownerId, mime: 'application/pdf' } })
)

bucket.openDownloadStream(new ObjectId(fileId)).pipe(createWriteStream('./saida.pdf'))

// delete() e rename() aceitam SÓ o _id, nunca o nome — e um por vez.
await bucket.delete(new ObjectId(fileId))
```

## BSON, ObjectId e tipagem

#### data-formats/bson
[doc](https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/)

**O que é:** o BSON, formato binário do MongoDB, e o pacote `BSON` exportado pelo próprio driver
(`serialize`, `deserialize`, `UUID`).
**Para que serve:** entender que o documento guardado tem tipos que o JSON não tem — `Date`,
`ObjectId`, `Decimal128`, `Binary`, inteiros de tamanhos distintos.
**Quando usar:** ao serializar documento para fora da aplicação. A recomendação explícita da página:
**use o BSON que vem com o driver**, importando de `mongodb`, e não um pacote `bson` separado —
versão divergente gera incompatibilidade silenciosa.

```ts
import { BSON, UUID, Decimal128 } from 'mongodb'

// Dinheiro: Decimal128 evita o erro de arredondamento do float do JS.
await orders.insertOne({ total: Decimal128.fromString('79.15') })

// Data vai como Date e volta como Date — não como string ISO.
// É o que permite $gte com Date no filtro.
await posts.find({ publishedAt: { $gte: new Date('2026-01-01') } })

const bytes = BSON.serialize(doc)
const volta = BSON.deserialize(bytes)
```

#### data-formats/bson/undefined-values
[doc](https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/undefined-values/)

**O que é:** o que o driver faz com `undefined` ao serializar — por padrão, converte em **`null`** —
e a opção `ignoreUndefined`, que faz o campo ser omitido.
**Para que serve:** evitar gravar `null` onde a intenção era "não mexa nisso".
**Quando usar:** **leia cedo.** É a diferença de comportamento mais cara em relação ao Mongoose, que
descartava `undefined` antes de montar o comando. A opção vale no client, no banco, na coleção e na
operação — e ligar no client cobre o código todo de uma vez.

```ts
// Padrão do driver: grava null.
await users.updateOne({ _id: id }, { $set: { phone: undefined } })
// documento: { phone: null }  <- não era isso que o PATCH queria dizer

// Com ignoreUndefined, o campo some do comando e o valor atual sobrevive.
const client = new MongoClient(uri, { ignoreUndefined: true })

// Ou por operação, quando o resto do código depende do padrão:
await users.updateOne({ _id: id }, { $set: patch }, { ignoreUndefined: true })

// Alternativa sem flag global: monte o $set só com o que veio.
// O validador de requisição já sabe quais chaves chegaram — e essa
// informação é melhor no validador do que num default do driver.
```

```ts
// Caso real da stack: client criado uma vez no kernel, ignoreUndefined cobre toda a aplicação.
export async function kernel(app: FastifyInstance): Promise<void> {
  await app.register(mongodb, { url: env.MONGO_URL, forceClose: true, ignoreUndefined: true })
}
```

#### classes/BSON.ObjectId
[doc](https://mongodb.github.io/node-mongodb-native/7.6/classes/BSON.ObjectId.html)

**O que é:** a referência da classe `ObjectId`: construtores, `createFromHexString`, `isValid`,
`toHexString`, `getTimestamp`, `equals`.
**Para que serve:** a conversão que atravessa toda aplicação — HTTP fala string de 24 caracteres, o
banco fala `ObjectId` de 12 bytes.
**Quando usar:** nas duas bordas. Três fatos que economizam depuração: `new ObjectId('lixo')`
**lança**, então a validação vem antes; `equals()` existe porque `===` entre dois `ObjectId` é
sempre `false`; e `getTimestamp()` mostra que o id **vaza o instante de criação**.

```ts
import { ObjectId } from 'mongodb'

// Entrada: valide antes de construir. isValid não lança; o construtor lança.
if (!ObjectId.isValid(req.params.id)) throw new BadRequest()
const doc = await posts.findOne({ _id: new ObjectId(req.params.id) })

// Saída: o JSON da API entrega string, não o objeto.
return { ...doc, _id: doc._id.toHexString() }

// Comparação: === compara referência e dá false até para o mesmo id.
a.equals(b)

// O id revela quando foi criado — não use como identificador público
// em contexto onde isso é informação.
doc._id.getTimestamp()
```

```ts
// Caso real da stack: castFilter centraliza a conversão na borda — use-case nunca vê ObjectId cru.
export function castFilter(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw HTTPException.BadRequest('id inválido', 'INVALID_ID')
  return new ObjectId(id)
}
```

#### types/WithId
[doc](https://mongodb.github.io/node-mongodb-native/7.6/types/WithId.html)

**O que é:** o utilitário de tipo que acrescenta `_id` a `T`. É o retorno de `findOne`, e o item de
`find().toArray()`.
**Para que serve:** deixar o `_id` **fora** da sua `type` de domínio e ainda assim tê-lo no
resultado.
**Quando usar:** ao escrever a assinatura do repositório. A recomendação da documentação é
declarar a entidade **sem** `_id` — o tipo fica reaproveitável no domínio e nas bordas, e `WithId<T>`
aparece só onde o documento realmente veio do banco.

```ts
import type { WithId, Collection } from 'mongodb'

// A type do domínio não conhece o banco.
type User = { name: string; email: string; createdAt: Date }

const users: Collection<User> = db.collection<User>('users')

// O driver põe o _id no retorno, sem você declarar nada.
const found: WithId<User> | null = await users.findOne({ email })
const all: WithId<User>[] = await users.find().toArray()

// Sem `_id` na type, ele é inferido como ObjectId.
// Com `_id: number` declarado, o retorno respeita o number —
// mas o driver NÃO converte: o tipo tem que bater com o dado real.
```

#### types/OptionalUnlessRequiredId
[doc](https://mongodb.github.io/node-mongodb-native/7.6/types/OptionalUnlessRequiredId.html)

**O que é:** o tipo que `insertOne` exige: `T` com `_id` opcional, a menos que `_id` seja
obrigatório em `T`.
**Para que serve:** explicar por que `insertOne` às vezes cobra `_id` e às vezes não.
**Quando usar:** quando o compilador reclamar de `_id` faltando num insert. A regra é mecânica:
`_id` obrigatório na sua `type` → obrigatório no insert; `_id?` opcional ou ausente → o driver
gera. `OptionalId<T>` é a saída para quando a `type` precisa do `_id` obrigatório em outros lugares.

```ts
import type { OptionalId } from 'mongodb'

type User = { name: string }              // insert não pede _id
type Fixed = { _id: number; name: string } // insert EXIGE _id

await db.collection<User>('users').insertOne({ name: 'Ada' })       // ok
await db.collection<Fixed>('fixed').insertOne({ name: 'Ada' })      // erro de tipo

// `_id` obrigatório na type, opcional no insert:
const coll = db.collection<OptionalId<Fixed>>('fixed')
await coll.insertOne({ name: 'Ada' }) // ok, o driver gera o _id
```

## Erros e versões

#### classes/MongoServerError
[doc](https://mongodb.github.io/node-mongodb-native/7.6/classes/MongoServerError.html)

**O que é:** a classe de erro devolvida pelo servidor, com `code`, `codeName`, `errmsg` e
`errorLabels` — irmã de `MongoNetworkError`, `MongoServerSelectionError` e `MongoBulkWriteError`.
**Para que serve:** distinguir erro de regra (chave duplicada) de erro de infraestrutura
(indisponibilidade), que pedem tratamentos opostos.
**Quando usar:** no tratamento de escrita. O código a decorar é **`11000`, chave duplicada** — é
como um índice único vira mensagem de "e-mail já cadastrado". Sem ODM, essa tradução é sua, e o
lugar dela é o repositório, não o controller.

```ts
import { MongoServerError } from 'mongodb'

try {
  await users.insertOne({ email, name })
} catch (error) {
  if (error instanceof MongoServerError && error.code === 11000) {
    // error.keyPattern diz QUAL índice: { email: 1 }
    throw new ConflictError('E-mail já cadastrado')
  }
  throw error
}

// `retryWrites`/`retryReads` já reexecutam falha transitória de rede sozinhos,
// por padrão. Um retry próprio por cima disso duplica escrita.
```

#### reference/upgrade
[doc](https://www.mongodb.com/docs/drivers/node/current/reference/upgrade/)

**O que é:** as mudanças incompatíveis de cada versão maior, mais as versões mínimas de Node e de
servidor.
**Para que serve:** subir de versão sem descobrir a quebra em produção.
**Quando usar:** antes de mexer no `package.json`. O resumo do que importa hoje: a **v7** derruba
Node 16 e 18, exige `@aws-sdk/credential-providers` para autenticação AWS, **remove o `batchSize`
padrão de 1000 dos cursores** e apaga uma lista de tipos já depreciados; a **v7.6** exige **MongoDB
Server 4.4+**. Mais atrás: a v6 pede Node 16.20.1+ e mudou `includeResultMetadata` para `false`; a
v5 removeu callbacks e os métodos `insert()`/`update()`/`remove()`.

```ts
// v7: transform em cursor saiu; o equivalente é o map do stream.
const antes = cursor.stream({ transform: JSON.stringify })
const agora = cursor.stream().map(JSON.stringify)

// v7: sem batchSize padrão. Onde o comportamento importava, declare.
posts.find({}, { batchSize: 1000 })

// v6: findOneAndUpdate devolve o DOCUMENTO por padrão, não { value, ok }.
const doc = await posts.findOneAndUpdate(f, u) // antes: res.value

// A Stable API (`serverApi`) é o que reduz o tamanho desta página
// na próxima subida de versão.
```

