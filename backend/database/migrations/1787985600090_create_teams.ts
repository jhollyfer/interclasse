import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'teams'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // The classroom inside a competition. Born in the draw and dies with the bracket.
      table
        .uuid('bracket_id')
        .notNullable()
        .references('id')
        .inTable('brackets')
        .onDelete('CASCADE')
      // `RESTRICT`: the classroom does not vanish from an already drawn bracket.
      table
        .uuid('classroom_id')
        .notNullable()
        .references('id')
        .inTable('classrooms')
        .onDelete('RESTRICT')
        .index()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['bracket_id', 'classroom_id'])
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
