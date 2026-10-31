import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import { TeamSchema } from '#database/schema'
import Classroom from '#models/classroom'

/** The classroom inside a competition. */
export default class Team extends TeamSchema {
  @belongsTo(() => Classroom)
  declare classroom: BelongsTo<typeof Classroom>
}
