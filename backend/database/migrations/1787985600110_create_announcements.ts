import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'announcements'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('title', 160).notNullable()
      table.text('body').notNullable()
      // Fixado aparece antes dos demais no site, independente da data.
      table.boolean('pinned').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
