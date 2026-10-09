import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'enrollments'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table
        .uuid('student_id')
        .notNullable()
        .references('id')
        .inTable('students')
        .onDelete('CASCADE')
      // `RESTRICT`: apagar a modalidade com atletas inscritos perderia as listas
      // que os representantes montaram. O caso de uso responde `409` antes.
      table
        .uuid('sport_id')
        .notNullable()
        .references('id')
        .inTable('sports')
        .onDelete('RESTRICT')
        .index()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['student_id', 'sport_id'])
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
