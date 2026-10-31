import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * What the site shows about the games that only the organization knows: the
 * "About" text, the current edition, since when it has been held, who organizes, the
 * Instagrams and the PDF regulation.
 *
 * A single row (singleton). A table and not an environment variable: whoever changes it is the
 * administrator, through the screen, without a deploy.
 */
export default class extends BaseSchema {
  protected tableName = 'site_settings'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.text('about').nullable()
      table.string('organizer', 160).nullable()
      table.smallint('first_edition_year').nullable()
      table.smallint('edition').nullable()
      table.string('school_instagram', 60).nullable()
      table.string('developer_instagram', 60).nullable()
      // `SET NULL`: the deleted storage file removes the download button, not the
      // whole configuration.
      table
        .uuid('regulation_id')
        .nullable()
        .references('id')
        .inTable('storages')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
