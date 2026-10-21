import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * O registro de cada atleta tirado de uma modalidade, com o motivo.
 *
 * Existe para a organização saber: o conselheiro pode tirar atleta da lista a
 * qualquer momento, inclusive depois do sorteio, e o administrador recebe o
 * aviso com a justificativa.
 *
 * O nome do aluno é copiado, e não só referenciado: o aluno pode sair da turma
 * depois, e o aviso continua dizendo quem foi tirado.
 */
export default class extends BaseSchema {
  protected tableName = 'enrollment_removals'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table
        .uuid('classroom_id')
        .notNullable()
        .references('id')
        .inTable('classrooms')
        .onDelete('CASCADE')
        .index()
      table.uuid('sport_id').notNullable().references('id').inTable('sports').onDelete('CASCADE')
      table.uuid('student_id').nullable().references('id').inTable('students').onDelete('SET NULL')
      table.string('student_name', 120).notNullable()
      table.text('reason').notNullable()
      // Quem tirou. Nulo quando a conta foi apagada depois.
      table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      // Quando o administrador deu ciência. Nulo é aviso pendente.
      table.timestamp('acknowledged_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
