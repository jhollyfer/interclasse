import { BaseSchema } from '@adonisjs/lucid/schema'
import { BRACKET_STATUSES, CATEGORIES } from '#core/entity'

export default class extends BaseSchema {
  protected tableName = 'brackets'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.uuid('sport_id').notNullable().references('id').inTable('sports').onDelete('RESTRICT')
      table.enum('category', CATEGORIES).notNullable()
      table.enum('status', BRACKET_STATUSES).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      // Uma competição por modalidade e categoria. Dois sorteios simultâneos
      // esbarram aqui, e não em duas chaves paralelas.
      table.unique(['sport_id', 'category'])
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
