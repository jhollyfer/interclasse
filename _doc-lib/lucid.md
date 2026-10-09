# Lucid ORM

ORM oficial do AdonisJS: Active Record por cima do Knex, com migrations, models e relacionamentos.

> O nome é **Lucid**, sem "e". `lucide-react` é outra coisa completamente diferente, uma biblioteca
> de ícones para o frontend. A confusão é comum e vale checar antes de instalar.

**O que é:** uma camada de banco de dados com duas metades que dá para usar separadas. A de baixo é
um query builder (Knex por dentro) que fala SQL de forma programática. A de cima é um ORM Active
Record, onde cada model é uma classe que representa uma tabela e cada instância representa uma
linha, com `save()`, `delete()` e relacionamentos. Suporta PostgreSQL, MySQL, MSSQL, SQLite e Oracle.

**Para que serve:** escrever consultas com autocomplete e tipagem em vez de string de SQL, versionar
o schema em migrations reversíveis, e navegar por relacionamentos (`user.related('posts')`) sem
montar `JOIN` na mão. Também traz transações, paginação e factories de teste prontos.

**Como usar:**

```bash
node ace add @adonisjs/lucid
node ace make:model User -m       # model junto com a migration
node ace migration:run
```

```ts
import User from '#models/user'

const user = await User.findOrFail(id)
await user.load('posts')

const page = await User.query().where('status', 'active').paginate(1, 20)
```

**Quando usar a biblioteca:** em qualquer app AdonisJS que fale com banco relacional. Fora do
AdonisJS ela funciona, mas perde a integração com o container e os comandos ace, e aí Kysely ou
Drizzle costumam ser escolhas melhores.

**A distinção que evita confusão:** `db.from('users')` é o **query builder**, devolve objetos
simples. `User.query()` é o **model query builder**, devolve instâncias do model com métodos e
relacionamentos. Boa parte das dúvidas de quem começa vem de misturar os dois.

**Links:** 35.

---

## Fundamentos

#### introduction
[doc](https://lucid.adonisjs.com/docs/introduction)

**O que é:** a apresentação do Lucid, os bancos suportados e a divisão entre query builder e ORM.
**Para que serve:** entender o escopo da biblioteca e o que ela faz por baixo (Knex).
**Quando usar:** antes de adotar, e para saber quais bancos estão realmente suportados.

```ts
// As duas metades da biblioteca, lado a lado.
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

// query builder: devolve objetos simples, sem métodos
const linhas = await db.from('users').select('id', 'name').where('status', 'active')
console.log(linhas[0].name) // string, mas linhas[0] é um objeto cru

// ORM: devolve instâncias do model, com métodos e relacionamentos
const usuarios = await User.query().where('status', 'active')
await usuarios[0].load('addresses')
usuarios[0].name = 'Novo nome'
await usuarios[0].save()
```

#### installation
[doc](https://lucid.adonisjs.com/docs/installation)

**O que é:** o comando de instalação, o driver de banco a instalar junto (`pg`, `mysql2`,
`better-sqlite3`) e o que o instalador escreve nos arquivos do projeto.
**Para que serve:** deixar o pacote e o driver certos instalados e configurados.
**Quando usar:** na configuração inicial do projeto. Note que o driver do banco é **dependência
separada**, e esquecer disso gera um erro de conexão nada óbvio.

```bash
# o comando já pergunta o dialeto e instala o driver correspondente
node ace add @adonisjs/lucid

# se instalar na mão, o driver é um pacote À PARTE do @adonisjs/lucid
pnpm add pg              # PostgreSQL
pnpm add mysql2          # MySQL / MariaDB
pnpm add better-sqlite3  # SQLite (bom para testes)
```

```
# o instalador escreve isto no .env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_DATABASE=app
```

#### configuration
[doc](https://lucid.adonisjs.com/docs/configuration)

**O que é:** o arquivo de configuração de conexões: credenciais, múltiplas conexões, pool, SSL,
`healthCheck` e opções por dialeto.
**Para que serve:** apontar para o banco certo em cada ambiente e ajustar o pool de conexões.
**Quando usar:** ao configurar o projeto, ao adicionar uma segunda conexão (por exemplo uma réplica
de leitura) e ao investigar esgotamento de pool em produção.

```ts
// config/database.ts
import { defineConfig } from '@adonisjs/lucid'
import env from '#start/env'

export default defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
        ssl: env.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      },
      // pool pequeno demais gera timeout sob carga, grande demais estoura o limite do banco
      pool: { min: 2, max: 10 },
      migrations: { naturalSort: true, paths: ['database/migrations'] },
      healthCheck: true,
      debug: false,
    },

    // réplica só de leitura, usada com db.connection('replica')
    replica: {
      client: 'pg',
      connection: { host: env.get('DB_REPLICA_HOST') /* ... */ },
    },
  },
})
```

#### commands
[doc](https://lucid.adonisjs.com/docs/commands)

**O que é:** a lista dos comandos ace do Lucid: `make:model`, `make:migration`, `make:factory`,
`make:seeder`, `migration:run`, `migration:rollback`, `migration:fresh`, `db:seed`, `db:wipe`,
`db:truncate`.
**Para que serve:** gerar arquivos e operar o banco sem sair do terminal.
**Quando usar:** o tempo todo no dia a dia. Vale ler uma vez inteiro só para saber que
`migration:fresh` e `db:truncate` existem antes de fazer na mão.

```bash
# gerar
node ace make:model Post -m       # model + migration
node ace make:migration add_role_to_users
node ace make:factory Post
node ace make:seeder Category

# operar
node ace migration:run               # aplica as pendentes
node ace migration:rollback          # desfaz o último lote
node ace migration:status            # o que já rodou e o que falta
node ace migration:fresh --seed      # derruba tudo, recria e popula (só dev)

# dados
node ace db:seed
node ace db:truncate                 # esvazia tabelas, mantém o schema
node ace db:wipe                     # derruba as tabelas
```

#### database-service
[doc](https://lucid.adonisjs.com/docs/database-service)

**O que é:** o serviço `db`, ponto de entrada para query builder cru, `db.rawQuery`,
`db.transaction` e a troca de conexão com `db.connection('nome')`.
**Para que serve:** consultas que não passam por model, como relatórios, agregações e scripts.
**Quando usar:** quando a consulta não tem model natural, ou quando instanciar models seria
desperdício por serem milhares de linhas.

```ts
import db from '@adonisjs/lucid/services/db'

// agregação: nenhum model faria sentido aqui
const porStatus = await db
  .from('posts')
  .select('status')
  .count('* as total')
  .groupBy('status')

// leitura pesada: objetos simples são bem mais baratos que instâncias de model
const ids = await db.from('posts').select('id').whereNull('deleted_at')

// trocar de conexão
const doReplica = await db.connection('replica').from('posts').limit(100)

// SQL cru quando o builder não expressa
const { rows } = await db.rawQuery('select now() as agora')
```

#### transactions
[doc](https://lucid.adonisjs.com/docs/transactions)

**O que é:** transações gerenciadas (callback com commit e rollback automáticos) e manuais, mais o
`useTransaction` que propaga a transação para models e relacionamentos.
**Para que serve:** garantir que uma escrita que toca várias tabelas aconteça inteira ou não
aconteça.
**Quando usar:** **em toda operação que escreve em mais de uma tabela**. A pegadinha: o model
precisa receber a transação explicitamente com `useTransaction`, ele não a herda por mágica, e
esquecer disso deixa metade da escrita fora da transação sem nenhum erro visível.

```ts
import db from '@adonisjs/lucid/services/db'

// gerenciada: commit no fim, rollback se lançar
const team = await db.transaction(async (trx) => {
  const user = new User()
  user.name = payload.name
  user.email = payload.email
  user.useTransaction(trx) // OBRIGATÓRIO: sem isto, o insert fica FORA da transação
  await user.save()

  const team = await user.related('team').create({
    slug: payload.slug,
    displayName: payload.displayName,
  }) // relacionamento herda a trx do pai automaticamente

  await user.related('addresses').create(payload.address)

  return team
})

// manual, quando o controle de fluxo é mais complexo
const trx = await db.transaction()
try {
  await SomeModel.create({ ... }, { client: trx })
  await trx.commit()
} catch (error) {
  await trx.rollback()
  throw error
}
```

#### pagination
[doc](https://lucid.adonisjs.com/docs/pagination)

**O que é:** o método `.paginate(page, perPage)`, o objeto de resultado com `meta` e `data`, e a
serialização dele.
**Para que serve:** listagens paginadas com contagem total, já no formato que o frontend consome.
**Quando usar:** em toda listagem. Lembre que `paginate` dispara **duas** consultas, uma de contagem
e uma de dados, o que importa quando a tabela é muito grande.

```ts
const page = request.input('page', 1)
const perPage = request.input('perPage', 20)

const posts = await Post.query()
  .where('status', 'active')
  .preload('category')
  .orderBy('created_at', 'desc')
  .paginate(page, perPage)

// mantém os filtros nos links de próxima página
posts.baseUrl('/posts').queryString(request.qs())

return posts.serialize()
// {
//   meta: { total, perPage, currentPage, lastPage, firstPage, ... },
//   data: [ ... ]
// }
```

#### debugging
[doc](https://lucid.adonisjs.com/docs/debugging)

**O que é:** como ligar o log das queries, ver o SQL gerado com `toQuery()` e escutar o evento
`db:query`.
**Para que serve:** ver exatamente qual SQL saiu, com os bindings, em vez de adivinhar.
**Quando usar:** **na primeira suspeita de N+1 ou de query errada**. `toQuery()` resolve em segundos
o que meia hora de leitura de código não resolve.

```ts
// 1. o SQL de UMA consulta, sem executá-la
const query = Post.query().where('status', 'active').preload('category')
console.log(query.toQuery())
// select * from "posts" where "status" = 'active'

// 2. todas as queries, com tempo de execução
import emitter from '@adonisjs/core/services/emitter'

emitter.on('db:query', (query) => {
  console.log(`${query.duration?.[1] ?? 0 / 1e6}ms`, query.sql, query.bindings)
})

// 3. ligar globalmente em config/database.ts: debug: true
// Se aparecerem 50 selects iguais mudando só o id, é N+1: falta um preload.
```

#### connection-manager
[doc](https://lucid.adonisjs.com/docs/connection-manager)

**O que é:** o gerenciador que abre, fecha e reaproveita conexões nomeadas em runtime.
**Para que serve:** cenários multi-banco, como um banco por tenant, com conexões criadas em tempo de
execução.
**Quando usar:** raro. Só em arquitetura multi-tenant com bancos separados. Um app de banco único
nunca toca nesta API.

```ts
import db from '@adonisjs/lucid/services/db'

// registrar uma conexão em tempo de execução (um banco por cliente)
db.manager.add(`tenant_${tenantId}`, {
  client: 'pg',
  connection: {
    host: tenant.dbHost,
    user: tenant.dbUser,
    password: tenant.dbPassword,
    database: tenant.dbName,
  },
})

db.manager.connect(`tenant_${tenantId}`)

const posts = await db.connection(`tenant_${tenantId}`).from('posts')

// fechar quando o tenant sair de cena, senão as conexões acumulam
await db.manager.close(`tenant_${tenantId}`)
```

#### validation
[doc](https://lucid.adonisjs.com/docs/validation)

**O que é:** as regras de validação que consultam o banco, `unique` e `exists`, integradas ao VineJS.
**Para que serve:** validar "este e-mail já está cadastrado" e "esta categoria existe" dentro do
próprio schema de validação, em vez de fazer a consulta na mão no controller.
**Quando usar:** em todo formulário de cadastro e edição. Para edição, atenção ao parâmetro que
ignora o próprio registro na regra `unique`, senão o usuário não consegue salvar sem trocar o
e-mail.

```ts
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

export const createUserValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .unique(async (db, value) => {
        const row = await db.from('users').where('email', value).first()
        return !row
      }),
    categoryId: vine
      .string()
      .uuid()
      .exists(async (db, value) => {
        const row = await db.from('categories').where('id', value).first()
        return !!row
      }),
  })
)

// EDIÇÃO: precisa ignorar o próprio registro, senão salvar sem mudar o e-mail falha
export const updateUserValidator = vine.withMetaData<{ userId: string }>().compile(
  vine.object({
    email: vine
      .string()
      .email()
      .unique(async (db, value, field) => {
        const row = await db
          .from('users')
          .whereNot('id', field.meta.userId)
          .where('email', value)
          .first()
        return !row
      }),
  })
)
```

## Query builder

#### select-query-builder
[doc](https://lucid.adonisjs.com/docs/select-query-builder)

**O que é:** a referência completa de leitura: `where` em todas as variações, `join`, `groupBy`,
`having`, `orderBy`, `limit`, subqueries e agregações.
**Para que serve:** montar qualquer `SELECT`, do trivial ao complexo.
**Quando usar:** é a página de consulta mais visitada da doc. Volte a ela para lembrar a assinatura
de `whereIn` com subquery, de `whereHas` e das variações de `join`.

```ts
import db from '@adonisjs/lucid/services/db'

const resultado = await db
  .from('posts as p')
  .select('p.id', 'p.name', 'c.name as category')
  .innerJoin('categories as c', 'c.id', 'p.category_id')
  .where('p.status', 'active')
  .whereNull('p.deleted_at')
  .whereIn('p.category_id', (sub) => {
    sub.from('categories').select('id').where('status', 'active')
  })
  .where((group) => {
    group.where('p.stock', '>', 0).orWhere('p.status', 'draft')
  })
  .whereBetween('p.price', [1000, 50000])
  .orderBy('p.created_at', 'desc')
  .limit(20)

// agregações
const total = await db.from('posts').count('* as total').first()
const media = await db.from('posts').avg('price as media').first()
```

#### insert-query-builder
[doc](https://lucid.adonisjs.com/docs/insert-query-builder)

**O que é:** `insert`, `multiInsert` e o `returning` para recuperar as colunas geradas.
**Para que serve:** inserir sem passar por model, útil em carga de dados e em seeders grandes.
**Quando usar:** ao inserir muitas linhas de uma vez. Um `multiInsert` é ordens de magnitude mais
rápido que um laço de `Model.create()`.

```ts
import db from '@adonisjs/lucid/services/db'

// uma linha, recuperando as colunas geradas pelo banco
const [row] = await db
  .table('categories')
  .returning(['id', 'created_at'])
  .insert({ name: 'Eletrônicos', slug: 'eletronicos' })

// LENTO: uma ida ao banco por item
for (const c of milCategorias) {
  await Category.create(c)
}

// RÁPIDO: uma consulta só
await db.table('categories').multiInsert(milCategorias)

// em lotes, para não estourar o limite de parâmetros do driver
for (let i = 0; i < registros.length; i += 500) {
  await db.table('categories').multiInsert(registros.slice(i, i + 500))
}
```

#### update-and-delete-queries
[doc](https://lucid.adonisjs.com/docs/update-and-delete-queries)

**O que é:** `update` e `delete` em massa via query builder, com `where` obrigatório na prática.
**Para que serve:** atualizar ou remover muitas linhas numa consulta só.
**Quando usar:** em operações em lote. **Cuidado:** essas operações **não disparam hooks de model**.
Se a sua lógica depende de `beforeSave` ou de remoção lógica, use o model, não isto.

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

// remoção lógica em lote
await db
  .from('posts')
  .where('team_id', teamId)
  .update({ deleted_at: DateTime.now().toSQL() })

// incremento sem ler antes (evita condição de corrida)
await db.from('posts').where('id', id).decrement('stock', quantidade)

// PERIGO: sem where, atinge a tabela inteira
// await db.from('posts').delete()

// PEGADINHA: isto NÃO passa a senha pelo hook de hash do model
await db.from('users').where('id', id).update({ password: 'texto puro' })

// o jeito certo quando há hook envolvido
const user = await User.findOrFail(id)
user.password = 'texto puro' // beforeSave faz o hash
await user.save()
```

#### raw-query-builder
[doc](https://lucid.adonisjs.com/docs/raw-query-builder)

**O que é:** SQL cru com bindings nomeados ou posicionais, protegido contra injeção.
**Para que serve:** recursos específicos do banco que o builder não expressa, como CTEs, funções de
janela e operadores de JSON do Postgres.
**Quando usar:** último recurso, e **sempre com bindings**, nunca concatenando string. Se você está
aqui com frequência, provavelmente há uma API do builder que resolve.

```ts
import db from '@adonisjs/lucid/services/db'

// bindings posicionais
const { rows } = await db.rawQuery('select * from posts where price > ? and status = ?', [
  1000,
  'active',
])

// bindings nomeados, mais legíveis em queries grandes
const ranking = await db.rawQuery(
  `select team_id,
          count(*) as total,
          rank() over (order by count(*) desc) as posicao
     from posts
    where created_at >= :desde
    group by team_id`,
  { desde: '2026-01-01' }
)

// raw dentro do builder, para um trecho só
await db.from('posts').select(db.raw('price * ? as price_with_tax', [1.1]))

// NUNCA faça isto: injeção de SQL
// await db.rawQuery(`select * from users where email = '${email}'`)
```

## Schema e migrations

#### migrations
[doc](https://lucid.adonisjs.com/docs/migrations)

**O que é:** o conceito de migration, os métodos `up` e `down`, a ordem de execução por timestamp e
os comandos de rodar e reverter.
**Para que serve:** versionar mudanças de schema junto com o código, e conseguir voltar atrás.
**Quando usar:** em toda alteração de estrutura de banco. **Escreva o `down` de verdade**, porque
`migration:rollback` sem `down` correto é uma armadilha que só aparece no pior momento.

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('role', ['owner', 'admin', 'member']).notNullable()
      table.uuid('avatar_id').nullable().references('id').inTable('storages').onDelete('SET NULL')
    })
  }

  // o down precisa desfazer EXATAMENTE o que o up fez, na ordem inversa
  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('avatar_id')
      table.dropColumn('role')
    })
  }
}
```

#### schema-builder
[doc](https://lucid.adonisjs.com/docs/schema-builder)

**O que é:** a API de nível de schema: `createTable`, `alterTable`, `dropTable`, `renameTable`,
`raw` e o controle de transação da migration.
**Para que serve:** as operações que agem sobre a tabela como um todo.
**Quando usar:** ao escrever qualquer migration. Anda sempre junto com `table-builder`.

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // criar
    this.schema.createTable('teams', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table.uuid('user_id').notNullable().unique()
    })

    // alterar
    this.schema.alterTable('addresses', (table) => {
      table.dropUnique(['user_id'])
      table.index(['user_id'])
    })

    // renomear e remover
    this.schema.renameTable('old_name', 'new_name')
    this.schema.dropTableIfExists('temp')

    // SQL cru quando o builder não alcança (extensões do Postgres, por exemplo)
    this.schema.raw('create extension if not exists "uuid-ossp"')
  }

  async down() {
    this.schema.dropTable('teams')
  }
}
```

#### table-builder
[doc](https://lucid.adonisjs.com/docs/table-builder)

**O que é:** a API de colunas: tipos (`string`, `integer`, `boolean`, `uuid`, `enum`, `json`,
`timestamp`), modificadores (`nullable`, `unique`, `defaultTo`, `index`) e chaves estrangeiras com
`onDelete`.
**Para que serve:** descrever cada coluna, índice e restrição da tabela.
**Quando usar:** dentro de toda migration. É a página que você mais abre ao mexer em schema, junto
com `schema-builder`. Consulte aqui a sintaxe de FK com `CASCADE`, `SET NULL` e `RESTRICT`.

```ts
this.schema.createTable('posts', (table) => {
  table.uuid('id').primary()

  // texto
  table.string('name').notNullable()
  table.string('slug', 254).notNullable().unique()
  table.text('description').nullable()

  // números e dinheiro (centavos, inteiro)
  table.integer('price').notNullable()
  table.integer('stock').notNullable().defaultTo(0)

  table.boolean('charge_tax').notNullable().defaultTo(false)
  table.enum('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft')

  // chaves estrangeiras: o onDelete é a decisão importante
  table.uuid('category_id').notNullable().references('id').inTable('categories').onDelete('RESTRICT')
  table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE')

  // índices
  table.index(['team_id'])
  table.unique(['team_id', 'sku'])

  table.timestamp('created_at', { useTz: true }).notNullable()
  table.timestamp('updated_at', { useTz: true }).nullable()
  table.timestamp('deleted_at', { useTz: true }).nullable()
})
```

#### schema-generation
[doc](https://lucid.adonisjs.com/docs/schema-generation)

**O que é:** geração de schema a partir do estado atual do banco, para gerar migrations ou tipos.
**Para que serve:** trazer para o projeto um banco que já existe, sem escrever as migrations na mão.
**Quando usar:** ao adotar Lucid num banco legado. Em projeto novo, não serve para nada.

```bash
# lê o schema atual do banco e gera os artefatos correspondentes
node ace db:generate

# fluxo típico de adoção em banco legado:
# 1. apontar a conexão para o banco existente
# 2. gerar o schema
# 3. conferir os tipos das colunas gerados (enums e defaults costumam precisar de ajuste)
# 4. daqui em diante, toda mudança passa a ser migration normal
```

#### schema-dumps
[doc](https://lucid.adonisjs.com/docs/schema-dumps)

**O que é:** compactar o histórico de migrations num dump de schema, para não rodar centenas de
arquivos a cada banco novo.
**Para que serve:** acelerar a criação do banco em CI e em máquinas novas quando o projeto acumulou
muitas migrations.
**Quando usar:** só em projeto maduro, com dezenas ou centenas de migrations e suíte de teste lenta.

```bash
# compacta o histórico até aqui num dump único
node ace migration:dump

# a partir daí, criar um banco do zero aplica o dump e só depois
# as migrations posteriores a ele, em vez das 300 antigas.
node ace migration:run

# vale rodar quando o setup do banco em CI passa de alguns segundos.
```

## Models

#### models
[doc](https://lucid.adonisjs.com/docs/models)

**O que é:** a classe de model: `@column`, `@column.dateTime`, chave primária, nome de tabela,
convenção de nomes (camelCase no código, snake_case no banco), `serializeAs` e colunas computadas.
**Para que serve:** mapear a tabela para uma classe tipada.
**Quando usar:** ao criar cada model. Preste atenção em `serializeAs: null` para esconder campos
sensíveis como hash de senha, e em colunas computadas para valores derivados que não existem no
banco.

```ts
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare email: string

  // nunca aparece no JSON da resposta
  @column({ serializeAs: null })
  declare password: string

  // camelCase no código vira snake_case no banco automaticamente
  @column()
  declare avatarId: string | null // -> avatar_id

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  // valor derivado, não existe coluna
  @computed()
  get isDeleted() {
    return this.deletedAt !== null
  }
}
```

#### schema-classes
[doc](https://lucid.adonisjs.com/docs/schema-classes)

**O que é:** a classe base de schema que toda migration estende, e seu ciclo de vida.
**Para que serve:** entender o que a classe gerada por `make:migration` traz de fábrica.
**Quando usar:** raramente de forma direta. Útil ao criar uma classe base própria de migration com
comportamento compartilhado.

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

// Classe base própria: todo timestamp do projeto sai igual, sem repetir.
export abstract class AppSchema extends BaseSchema {
  protected timestamps(table: any) {
    table.timestamp('created_at', { useTz: true }).notNullable()
    table.timestamp('updated_at', { useTz: true }).nullable()
    table.timestamp('deleted_at', { useTz: true }).nullable()
  }
}

// nas migrations
export default class extends AppSchema {
  async up() {
    this.schema.createTable('categories', (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable()
      this.timestamps(table)
    })
  }

  async down() {
    this.schema.dropTable('categories')
  }
}
```

#### crud-operations
[doc](https://lucid.adonisjs.com/docs/crud-operations)

**O que é:** `create`, `createMany`, `find`, `findBy`, `findOrFail`, `firstOrCreate`,
`updateOrCreate`, `merge().save()` e `delete()`.
**Para que serve:** o dia a dia de escrita e leitura via model.
**Quando usar:** o tempo todo. A dupla `firstOrCreate` e `updateOrCreate` elimina muito `if` manual,
e `findOrFail` já devolve 404 no AdonisJS sem você escrever nada.

```ts
import User from '#models/user'

// criar
const user = await User.create({ name: 'Ana', email: 'ana@x.com' })
await User.createMany([{ name: 'A' }, { name: 'B' }])

// ler
const talvez = await User.find(id) // User | null
const certo = await User.findOrFail(id) // lança 404 automaticamente no HTTP
const porEmail = await User.findBy('email', 'ana@x.com')

// os dois que eliminam if manual
await User.firstOrCreate(
  { email: 'ana@x.com' }, // busca por isto
  { name: 'Ana', role: 'member' } // cria com isto, se não achar
)

await Setting.updateOrCreate(
  { key: 'theme' },
  { value: 'dark' } // atualiza se existir, cria se não
)

// atualizar
user.merge({ name: 'Ana Paula' })
await user.save()

// remover
await user.delete()
```

#### model-query-builder
[doc](https://lucid.adonisjs.com/docs/model-query-builder)

**O que é:** `Model.query()`, que é o query builder devolvendo instâncias do model, com `preload`
para relacionamentos.
**Para que serve:** consultas com filtro e relacionamentos carregados, mantendo os métodos do model.
**Quando usar:** em toda listagem com filtro. **`preload` é a resposta para N+1**, e essa é a
diferença prática mais importante entre `db.from()` e `Model.query()`.

```ts
import Post from '#models/post'

// N+1: uma consulta para os posts, mais uma por post para a categoria
const ruim = await Post.query()
for (const p of ruim) {
  console.log((await p.related('category').query().first())?.name) // 1 query por item
}

// preload: duas consultas no total, independente da quantidade de posts
const bom = await Post.query()
  .preload('category')
  .preload('subcategories')
  .preload('team', (q) => q.select('id', 'display_name')) // limita as colunas do relacionado
  .where('status', 'active')
  .whereNull('deleted_at')
  .orderBy('created_at', 'desc')

// filtrar PELO relacionamento
const comCategoriaAtiva = await Post.query().whereHas('category', (q) =>
  q.where('status', 'active')
)

// contar sem carregar
const comContagem = await Team.query().withCount('posts')
comContagem[0].$extras.posts_count
```

#### model-query-scopes
[doc](https://lucid.adonisjs.com/docs/model-query-scopes)

**O que é:** trechos de consulta nomeados e reutilizáveis, declarados com `scope()` no model e
aplicados com `withScopes`.
**Para que serve:** não repetir o mesmo `where` em vinte lugares, por exemplo "só registros não
removidos" ou "só do usuário atual".
**Quando usar:** assim que o mesmo filtro aparecer pela terceira vez. Especialmente valioso para
filtros de segurança, porque centraliza a regra num ponto só, em vez de depender de cada consulta
lembrar dela.

```ts
import { BaseModel, scope } from '@adonisjs/lucid/orm'

export default class Post extends BaseModel {
  static notDeleted = scope((query) => {
    query.whereNull('deleted_at')
  })

  // filtro de segurança centralizado: nenhuma tela precisa lembrar dele
  static ownedBy = scope((query, teamId: string) => {
    query.where('team_id', teamId)
  })

  static active = scope((query) => {
    query.where('status', 'active')
  })
}

// uso
const meus = await Post.query()
  .withScopes((scopes) => {
    scopes.notDeleted()
    scopes.ownedBy(auth.user!.teamId)
    scopes.active()
  })
  .paginate(page, perPage)

// se a regra de isolamento mudar, muda em um lugar só
```

#### model-hooks
[doc](https://lucid.adonisjs.com/docs/model-hooks)

**O que é:** os decorators de ciclo de vida: `@beforeSave`, `@afterSave`, `@beforeCreate`,
`@beforeFind`, `@beforeFetch`, `@beforeDelete` e os pares `after`.
**Para que serve:** lógica que deve rodar sempre, como gerar hash de senha antes de salvar ou
preencher um UUID antes de criar.
**Quando usar:** para invariantes do model. **Lembre que hooks não disparam em update ou delete em
massa via query builder**, o que é a fonte clássica de "a senha não foi hasheada".

```ts
import { BaseModel, beforeCreate, beforeSave, beforeFetch, column } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { randomUUID } from 'node:crypto'
import string from '@adonisjs/core/helpers/string'

export default class User extends BaseModel {
  @beforeCreate()
  static assignUuid(user: User) {
    if (!user.id) user.id = randomUUID()
  }

  @beforeSave()
  static async hashPassword(user: User) {
    // $dirty diz o que mudou: sem isto, o hash seria refeito a cada save
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  @beforeSave()
  static slugify(user: User) {
    if (user.$dirty.name && !user.slug) {
      user.slug = string.slug(user.name, { lower: true })
    }
  }

  // aplica em toda leitura via model
  @beforeFetch()
  static ignoreDeleted(query: ModelQueryBuilderContract<typeof User>) {
    query.whereNull('deleted_at')
  }
}

// ATENÇÃO: db.from('users').update({ password: 'x' }) NÃO passa por hashPassword
```

#### serializing-models
[doc](https://lucid.adonisjs.com/docs/serializing-models)

**O que é:** como o model vira JSON: `serialize()`, `toJSON()`, `serializeAs`, `serializeExtras`,
`makeVisible`, `makeHidden` e serializadores customizados.
**Para que serve:** controlar exatamente o que a API devolve, e garantir que campo sensível nunca
vaze na resposta.
**Quando usar:** ao definir o contrato de resposta da API. Vale um cuidado extra em qualquer model
com senha, token ou dado interno.

```ts
export default class Storage extends BaseModel {
  @column()
  declare disk: string

  @column()
  declare path: string

  // campo virtual: derivado na leitura, nunca gravado
  @computed()
  get url() {
    return `${env.get('APP_URL')}/uploads/${this.path}`
  }

  // renomeia na resposta
  @column({ serializeAs: 'originalName' })
  declare original_name: string

  // formata na saída sem mudar o tipo interno
  @column({ serialize: (value: number) => value / 100 })
  declare price: number
}

// escolher campos na hora de responder
return post.serialize({
  fields: { pick: ['id', 'name', 'price'] },
  relations: {
    category: { fields: { pick: ['id', 'name'] } },
  },
})

// withCount e outros extras só aparecem se você pedir
class Team extends BaseModel {
  serializeExtras = true
}
```

## Relacionamentos

#### relationships
[doc](https://lucid.adonisjs.com/docs/relationships)

**O que é:** a visão geral dos relacionamentos, o `preload` (carregamento antecipado), o `load`
(carregamento sob demanda numa instância) e os agregados `withCount` e `withAggregate`.
**Para que serve:** entender as convenções de nome de chave e a diferença entre carregar antes e
carregar depois.
**Quando usar:** antes de declarar o primeiro relacionamento. `withCount` resolve sozinho o caso
frequente de "quantos posts esse team tem" sem carregar os posts.

```ts
// preload: na CONSULTA, para muitos registros de uma vez
const teams = await Team.query().preload('posts')

// load: numa INSTÂNCIA que você já tem em mãos
const team = await Team.findOrFail(id)
await team.load('posts')
await team.load('posts', (q) => q.where('status', 'active')) // com filtro

// contar sem carregar os relacionados
const comTotais = await Team.query().withCount('posts', (q) => {
  q.where('status', 'active').as('active_products_count')
})
comTotais[0].$extras.active_products_count

// agregar
const comEstoque = await Team.query().withAggregate('posts', (q) => {
  q.sum('stock').as('total_stock')
})
```

#### belongs-to
[doc](https://lucid.adonisjs.com/docs/belongs-to)

**O que é:** o lado que **guarda a chave estrangeira**, com `@belongsTo`, `associate` e
`dissociate`.
**Para que serve:** ligar o filho ao pai, por exemplo post para categoria.
**Quando usar:** sempre que a tabela do model tiver a coluna `*_id`. Se a coluna está na sua tabela,
o relacionamento é este.

```ts
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Category from '#models/category'

export default class Post extends BaseModel {
  // a coluna está NESTA tabela, então o relacionamento é belongsTo
  @column()
  declare categoryId: string

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>
}

const post = await Post.findOrFail(id)

// ligar sem mexer na coluna na mão
await post.related('category').associate(category)

// desligar (a FK precisa ser nullable)
await post.related('category').dissociate()

// ler
await post.load('category')
console.log(post.category.name)
```

#### has-many
[doc](https://lucid.adonisjs.com/docs/has-many)

**O que é:** o lado inverso do `belongsTo`, com `@hasMany`, e os métodos `related().create()` e
`saveMany()`.
**Para que serve:** ir do pai para a coleção de filhos, e criar filhos já com a FK preenchida.
**Quando usar:** o `related('filhos').create()` é o atalho que evita passar o `parent_id` na mão, e
por isso evita o bug de passar o id errado.

```ts
import { BaseModel, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Post from '#models/post'

export default class Team extends BaseModel {
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}

const team = await Team.findOrFail(id)

// team_id preenchido automaticamente: impossível errar o dono
const post = await team.related('posts').create({
  name: 'Camiseta',
  price: 4990,
  categoryId,
})

await team.related('posts').createMany([{ name: 'A' }, { name: 'B' }])

// consultar só os filhos, sem carregar todos
const ativos = await team.related('posts').query().where('status', 'active').paginate(1, 20)
```

#### many-to-many
[doc](https://lucid.adonisjs.com/docs/many-to-many)

**O que é:** `@manyToMany` com tabela pivô, mais `attach`, `detach`, `sync` e `pivotColumns` para
colunas extras na pivô.
**Para que serve:** relações N para N, como post e subcategoria, ou usuário e permissão.
**Quando usar:** ao modelar N para N. **`sync` é o método que você quer** ao salvar um formulário
com checkboxes, porque ele adiciona e remove de uma vez para bater com a lista enviada. Use
`pivotColumns` quando a ligação tiver dado próprio, como uma posição ou uma data.

```ts
import { BaseModel, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Post extends BaseModel {
  @manyToMany(() => Subcategory, {
    pivotTable: 'post_subcategories',
  })
  declare subcategories: ManyToMany<typeof Subcategory>

  @manyToMany(() => Storage, {
    pivotTable: 'post_images',
    pivotColumns: ['position'], // dado próprio da ligação
  })
  declare images: ManyToMany<typeof Storage>
}

// sync: deixa a ligação IGUAL à lista enviada (adiciona e remove)
await post.related('subcategories').sync(payload.subcategoryIds)

// attach adiciona sem remover, detach remove
await post.related('subcategories').attach([idA, idB])
await post.related('subcategories').detach([idA])

// pivô com dado: sync recebe um objeto id -> colunas
await post.related('images').sync({
  [storageId1]: { position: 0 },
  [storageId2]: { position: 1 },
})

// ler a coluna da pivô
await post.load('images')
post.images[0].$extras.pivot_position
```

#### has-one
[doc](https://lucid.adonisjs.com/docs/has-one)

**O que é:** `@hasOne`, o um para um visto pelo lado que **não** guarda a FK.
**Para que serve:** perfis e extensões de uma entidade, como usuário e o perfil dele.
**Quando usar:** ao separar uma entidade em duas tabelas com relação de um para um. O par disso do
outro lado é `belongsTo`.

```ts
import { BaseModel, hasOne, belongsTo } from '@adonisjs/lucid/orm'
import type { HasOne, BelongsTo } from '@adonisjs/lucid/types/relations'

// users NÃO tem team_id: o lado sem a FK usa hasOne
export default class User extends BaseModel {
  @hasOne(() => Team)
  declare team: HasOne<typeof Team>
}

// teams TEM user_id: o lado com a FK usa belongsTo
export class Team extends BaseModel {
  @column()
  declare userId: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

// criar o perfil junto, com user_id preenchido
const user = await User.create({ name: 'Acme', email: 'a@acme.com' })
await user.related('team').create({ slug: 'acme', displayName: 'Acme' })

await user.load('team')
```

#### has-many-through
[doc](https://lucid.adonisjs.com/docs/has-many-through)

**O que é:** `@hasManyThrough`, que alcança uma tabela distante atravessando uma intermediária.
**Para que serve:** ir direto de categoria para posts das subcategorias dela, sem carregar as
subcategorias no meio.
**Quando usar:** quando você se pegar carregando um relacionamento só para alcançar o relacionamento
seguinte. Resolve o caso em uma consulta.

```ts
import { BaseModel, hasManyThrough } from '@adonisjs/lucid/orm'
import type { HasManyThrough } from '@adonisjs/lucid/types/relations'

export default class Category extends BaseModel {
  // Category -> Subcategory -> Post, sem carregar Subcategory
  @hasManyThrough([() => Post, () => Subcategory])
  declare posts: HasManyThrough<typeof Post>
}

const category = await Category.findOrFail(id)
await category.load('posts') // uma consulta com join, não duas

// o que isto evita:
// await category.load('subcategories')
// for (const sub of category.subcategories) await sub.load('posts')
```

## Testes

#### testing
[doc](https://lucid.adonisjs.com/docs/testing)

**O que é:** as ferramentas de teste com banco: transações globais por teste, `migration:fresh` na
suíte e as asserções de banco.
**Para que serve:** rodar testes que tocam o banco sem que um teste contamine o outro.
**Quando usar:** ao montar a suíte. A receita de **envolver cada teste numa transação com rollback
no fim** é a que mantém a suíte rápida e isolada, e é a primeira coisa a configurar.

```ts
// tests/bootstrap.ts
import testUtils from '@adonisjs/core/services/test_utils'

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['functional', 'e2e'].includes(suite.name)) {
    // cada teste roda numa transação, revertida no fim: isolamento sem recriar o banco
    suite.setup(() => testUtils.db().withGlobalTransaction())
  }
}
```

```ts
// no teste
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Posts', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('cria post', async ({ client, assert }) => {
    const response = await client.post('/posts').json({ name: 'X', price: 1000 })

    response.assertStatus(201)
    // o registro criado some no rollback: o próximo teste começa limpo
    await assert.rejects(() => Post.findByOrFail('name', 'inexistente'))
  })
})
```

#### model-factories
[doc](https://lucid.adonisjs.com/docs/model-factories)

**O que é:** factories que geram registros falsos, com estados nomeados, relacionamentos e
`createMany`.
**Para que serve:** produzir dados de teste sem repetir vinte campos obrigatórios em cada arquivo.
**Quando usar:** desde o primeiro teste que precise de um registro no banco. Estados nomeados (por
exemplo `.apply('inactive')`) evitam uma factory diferente para cada variação.

```ts
// database/factories/user_factory.ts
import factory from '@adonisjs/lucid/factories'
import User from '#models/user'

export const UserFactory = factory
  .define(User, async ({ faker }) => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'segredo123',
    role: 'member' as const,
    status: 'active' as const,
  }))
  // estados nomeados em vez de uma factory por variação
  .state('inactive', (user) => (user.status = 'inactive'))
  .state('admin', (user) => (user.role = 'admin'))
  .relation('team', () => TeamFactory)
  .build()
```

```ts
// no teste: uma linha em vez de vinte campos
const user = await UserFactory.create()
const inativo = await UserFactory.apply('inactive').create()
const dez = await UserFactory.createMany(10)

const comTeam = await UserFactory.with('team', 1, (c) =>
  c.merge({ document: '12345678000190' })
).create()
```

#### seeders
[doc](https://lucid.adonisjs.com/docs/seeders)

**O que é:** classes de seed executadas por `db:seed`, com controle de quais rodam em produção.
**Para que serve:** popular dados que o sistema precisa para funcionar (um usuário administrador
inicial, uma lista fixa de categorias) e dados de demonstração.
**Quando usar:** para o registro inicial obrigatório do sistema, e para popular o ambiente de
desenvolvimento. Use a flag de ambiente para impedir que seed de demonstração rode em produção.

```ts
// database/seeders/owner_seeder.ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // idempotente: rodar duas vezes não duplica
    await User.updateOrCreate(
      { email: 'owner@app.com' },
      { name: 'Dono', password: 'trocar-depois', role: 'owner', status: 'active' }
    )
  }
}
```

```ts
// database/seeders/demo_seeder.ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  // impede que dados de demonstração vazem para produção
  static environment = ['development', 'testing']

  async run() {
    await PostFactory.createMany(50)
  }
}
```
