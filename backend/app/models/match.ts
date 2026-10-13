import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import { MatchSchema } from '#database/schema'
import Bracket from '#models/bracket'
import Team from '#models/team'
import type { MatchPhase, MatchStatus } from '#core/entity'

/** Uma partida: de grupo ou de mata-mata, marcada ou com placar. */
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
