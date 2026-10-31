import { BaseSchema } from '@adonisjs/lucid/schema'
import { CARD_COLORS } from '@interclasse/shared'

/**
 * The cards an athlete received in a match.
 *
 * The team comes along, not just the student: the student's classroom may change later, and the
 * card was received playing for that team.
 */
export default class extends BaseSchema {
  protected tableName = 'match_cards'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table
        .uuid('match_id')
        .notNullable()
        .references('id')
        .inTable('matches')
        .onDelete('CASCADE')
        .index()
      table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE')
      table
        .uuid('student_id')
        .notNullable()
        .references('id')
        .inTable('students')
        .onDelete('CASCADE')
        .index()
      table.enum('color', CARD_COLORS).notNullable()
      table.string('note', 200).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
