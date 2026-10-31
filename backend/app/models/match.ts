import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { type MatchPhase, type MatchStatus } from '@interclasse/shared'

import { MatchSchema } from '#database/schema'
import Bracket from '#models/bracket'
import Team from '#models/team'

/** A match: group or knockout, scheduled or with a score. */
export default class Match extends MatchSchema {
  declare phase: MatchPhase
  declare status: MatchStatus

  @belongsTo(() => Bracket)
  declare bracket: BelongsTo<typeof Bracket>

  @belongsTo(() => Team, { foreignKey: 'homeTeamId' })
  declare homeTeam: BelongsTo<typeof Team>

  @belongsTo(() => Team, { foreignKey: 'awayTeamId' })
  declare awayTeam: BelongsTo<typeof Team>
}
