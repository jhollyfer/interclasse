import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { type Category } from '@interclasse/shared'

import { ClassroomSchema } from '#database/schema'
import User from '#models/user'

/** A turma: a unidade que compete. Cada modalidade forma um time por turma. */
export default class Classroom extends ClassroomSchema {
  declare category: Category

  @belongsTo(() => User, { foreignKey: 'advisorId' })
  declare advisor: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'representativeId' })
  declare representative: BelongsTo<typeof User>
}
