import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sports'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('name', 60).notNullable().unique()
      // O identificador da modalidade na URL pública (`/classificacao/futsal`).
      table.string('slug', 255).notNullable().unique()
      // Turma com menos inscritos que o mínimo não entra no sorteio: não teria
      // time para entrar em quadra.
      table.smallint('min_athletes').notNullable()
      table.smallint('max_athletes').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
