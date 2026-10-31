import { BaseSchema } from '@adonisjs/lucid/schema'
import { MATCH_PHASES, MATCH_STATUS, MATCH_STATUSES } from '@interclasse/shared'

export default class extends BaseSchema {
  protected tableName = 'matches'

  override async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.knexRawQuery('uuid_generate_v4()'))
      table
        .uuid('bracket_id')
        .notNullable()
        .references('id')
        .inTable('brackets')
        .onDelete('CASCADE')
        .index()
      table.enum('phase', MATCH_PHASES).notNullable()
      table.smallint('round').notNullable()
      // The position within the phase. It is what links a match to the
      // next one: the winner of position `p` goes to position `p / 2` of the next
      // phase, as home team when `p` is even. No "next" column.
      table.smallint('position').notNullable()
      // Null until the previous match finishes.
      table.uuid('home_team_id').nullable().references('id').inTable('teams').onDelete('CASCADE')
      table.uuid('away_team_id').nullable().references('id').inTable('teams').onDelete('CASCADE')
      table.smallint('home_score').nullable()
      table.smallint('away_score').nullable()
      // Filled in on every finished match, including a tie decided on
      // penalties.
      table.uuid('winner_team_id').nullable().references('id').inTable('teams').onDelete('CASCADE')
      table.enum('status', MATCH_STATUSES).notNullable().defaultTo(MATCH_STATUS.SCHEDULED)
      table.timestamp('scheduled_at').nullable()
      table.string('location', 120).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      // One match per position of each phase: it is what the winner's advance
      // looks up, and two rows at the same position would leave the winner in the
      // wrong place.
      table.unique(['bracket_id', 'phase', 'position'])
      table.index(['home_team_id'])
      table.index(['away_team_id'])
      table.index(['winner_team_id'])
    })
  }

  override async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
