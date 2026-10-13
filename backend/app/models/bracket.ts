import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import { BracketSchema } from '#database/schema'
import Match from '#models/match'
import Sport from '#models/sport'
import Team from '#models/team'
import type { BracketStatus, Category } from '#core/entity'

/** A competição de uma modalidade numa categoria: os times, os grupos e as partidas. */
export default class Bracket extends BracketSchema {
  declare category: Category
  declare status: BracketStatus

  @belongsTo(() => Sport)
  declare sport: BelongsTo<typeof Sport>

  @hasMany(() => Team)
  declare teams: HasMany<typeof Team>

  @hasMany(() => Match)
  declare matches: HasMany<typeof Match>
}
