import { BaseSchema } from '@adonisjs/lucid/schema'

import { MATCH_PHASES, MATCH_STATUSES, MatchStatuses } from '#core/entity'

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
      // A posição dentro da fase. É o que liga uma partida à
      // seguinte: o vencedor da posição `p` vai para a posição `p / 2` da fase
      // seguinte, como mandante quando `p` é par. Sem coluna de "próxima".
      table.smallint('position').notNullable()
      // Nulos até a partida anterior terminar.
      table.uuid('home_team_id').nullable().references('id').inTable('teams').onDelete('CASCADE')
      table.uuid('away_team_id').nullable().references('id').inTable('teams').onDelete('CASCADE')
      table.smallint('home_score').nullable()
      table.smallint('away_score').nullable()
      // Preenchido em toda partida terminada, inclusive empate decidido nos
      // pênaltis.
      table.uuid('winner_team_id').nullable().references('id').inTable('teams').onDelete('CASCADE')
      table.enum('status', MATCH_STATUSES).notNullable().defaultTo(MatchStatuses.SCHEDULED)
      table.timestamp('scheduled_at').nullable()
      table.string('location', 120).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      // Uma partida por posição de cada fase: é o que o avanço do vencedor
      // procura, e duas linhas na mesma posição deixariam o vencedor no lugar
      // errado.
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
