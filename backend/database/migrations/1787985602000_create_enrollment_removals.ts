import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The record of each athlete removed from a sport, with the reason.
 *
 * It exists so the organization knows: the advisor can remove an athlete from the list at
 * any time, including after the draw, and the administrator receives the
 * notice with the justification.
 *
 * The student's name is copied, not just referenced: the student may leave the classroom
 * later, and the notice keeps saying who was removed.
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
      // Who removed them. Null when the account was deleted afterwards.
      table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      // When the administrator acknowledged it. Null means a pending notice.
      table.timestamp('acknowledged_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
