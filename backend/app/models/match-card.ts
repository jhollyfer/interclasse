import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { type CardColor } from '@interclasse/shared'

import { MatchCardSchema } from '#database/schema'
import Match from '#models/match'
import Student from '#models/student'
import Team from '#models/team'

export default class MatchCard extends MatchCardSchema {
  declare color: CardColor

  @belongsTo(() => Match)
  declare match: BelongsTo<typeof Match>

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>
}
