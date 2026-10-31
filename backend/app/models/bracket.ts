import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { type BracketStatus, type Category } from '@interclasse/shared'

import { BracketSchema } from '#database/schema'
import Sport from '#models/sport'
import Team from '#models/team'

/** The competition of a sport in a category: the teams, the groups and the matches. */
export default class Bracket extends BracketSchema {
  declare category: Category
  declare status: BracketStatus

  @belongsTo(() => Sport)
  declare sport: BelongsTo<typeof Sport>

  @hasMany(() => Team)
  declare teams: HasMany<typeof Team>
}
