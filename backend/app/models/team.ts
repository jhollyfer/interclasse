import { TeamSchema } from '#database/schema'
import Classroom from '#models/classroom'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/** A turma dentro de uma competição. */
export default class Team extends TeamSchema {
  @belongsTo(() => Classroom)
  declare classroom: BelongsTo<typeof Classroom>
}
