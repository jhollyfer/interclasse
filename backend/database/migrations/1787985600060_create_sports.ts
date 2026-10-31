import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sports'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('name', 60).notNullable().unique()
      // The sport identifier in the public URL (`/standings/futsal`).
      table.string('slug', 255).notNullable().unique()
      // A classroom with fewer enrolled than the minimum does not enter the draw: it would not have a
      // team to take the court.
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
