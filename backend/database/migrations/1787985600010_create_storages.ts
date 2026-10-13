import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'storages'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // `filename` é gerado pelo sistema (uuid+extensão); `original_name` guarda
      // só o rótulo que o usuário enviou e nunca vira caminho no bucket.
      table.string('filename', 255).notNullable()
      table.string('original_name', 255).notNullable()
      table.string('mimetype', 127).notNullable()
      // `bigint` e não `integer`: o teto de `int4` é 2,1 GB, abaixo do que
      // `UPLOAD_MAX_SIZE` pode pedir. Com `integer`, subir o limite passava na
      // validação e estourava no `INSERT` - o teto real ficava escondido no
      // tipo da coluna. `backend-old` gravava `integer` e nullable.
      table.bigint('size').notNullable()
      // A chave do objeto no bucket. NÃO existe coluna `url`: ela é derivada na
      // leitura pelo model, para trocar de bucket ou de CDN não exigir
      // migration de dado - `backend-old` congelava a URL na linha.
      table.string('path', 255).notNullable()
      // Máquina de estado do upload. O binário não passa por esta aplicação:
      // `POST /storages` grava a linha, o navegador sobe as partes direto no
      // bucket, e `POST /storages/:id/complete` confirma. Entre uma coisa e
      // outra a linha existe sem binário íntegro, e é isso que `PENDING` nomeia.
      // Só `UPLOADED` pode ser anexado a alguma coisa.
      table.string('status', 20).notNullable().defaultTo('PENDING')
      // `UploadId` devolvido pelo storage ao iniciar um multipart. Nulo quando o
      // arquivo coube numa parte só e subiu por um PUT simples.
      table.string('upload_id', 255).nullable()
      // O tamanho de parte usado neste upload. Guardado porque a retomada
      // precisa dele: depois de um reload, o cliente refatia o arquivo e as
      // fronteiras têm de bater com as partes que o storage já recebeu.
      table.integer('part_size').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      // Remoção lógica: apagar a linha aqui não apaga o binário no bucket.
      table.timestamp('deleted_at').nullable()
      // Serve a varredura de `PENDING` abandonado (`node ace storages:prune`).
      table.index(['status', 'created_at'], 'storages_status_created_at_index')
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
