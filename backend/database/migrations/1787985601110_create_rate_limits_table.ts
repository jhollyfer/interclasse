import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The attempt counter of `@adonisjs/limiter`.
 *
 * The column format is the package's, not ours: it reads and writes on its
 * own, without a Lucid model. That is also why there is no `deleted_at` nor the
 * timestamps of the rest of the schema - the row disappears when it expires
 * (`clearExpiredByTimeout`), and a counter row is not a domain record.
 */
export default class extends BaseSchema {
  protected tableName = 'rate_limits'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.integer('points', 9).notNullable().defaultTo(0)
      table.bigint('expire').unsigned()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
