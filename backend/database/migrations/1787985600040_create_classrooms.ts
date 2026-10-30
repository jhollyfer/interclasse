import { BaseSchema } from '@adonisjs/lucid/schema'
import { CATEGORIES } from '@interclasse/shared'

export default class extends BaseSchema {
  protected tableName = 'classrooms'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      // "9º A". Único: é o nome que aparece no placar, e duas turmas com o mesmo
      // nome seriam indistinguíveis na tabela de jogos.
      table.string('name', 20).notNullable().unique()
      table.smallint('grade').notNullable()
      // Derivada de `grade` no caso de uso, e gravada para a chave filtrar sem
      // repetir a regra em SQL.
      table.enum('category', CATEGORIES).notNullable()
      // `SET NULL`: apagar a conta do professor não apaga a turma, que fica sem
      // conselheiro até o administrador indicar outro.
      table
        .uuid('advisor_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .index()
      // Único: o representante enxerga "a própria turma", no singular. Dois
      // vínculos tornariam a pergunta ambígua.
      table
        .uuid('representative_id')
        .nullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
