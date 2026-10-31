import { BaseSchema } from '@adonisjs/lucid/schema'
import { PHOTO_STATUSES } from '@interclasse/shared'

/**
 * The site carousel photos: athletes, games, the crowd. Whoever uploads is the
 * advisor or the administrator; whoever decides whether it goes to the site is the
 * administrator.
 */
export default class extends BaseSchema {
  protected tableName = 'photos'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // `RESTRICT`: the file only leaves the storage after the photo - deleting it first
      // would leave a hole in the carousel.
      table
        .uuid('storage_id')
        .notNullable()
        .references('id')
        .inTable('storages')
        .onDelete('RESTRICT')
      table.string('caption', 200).nullable()
      table.enum('status', PHOTO_STATUSES).notNullable().index()
      // `SET NULL`: the deleted account does not take the approved photo along.
      table
        .uuid('author_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      table.uuid('reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('reviewed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
