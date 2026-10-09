import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table.string('name', 120).notNullable()
      // `CASCADE`: aluno não existe fora de uma turma.
      table
        .uuid('classroom_id')
        .notNullable()
        .references('id')
        .inTable('classrooms')
        .onDelete('CASCADE')
        .index()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
