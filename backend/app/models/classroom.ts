import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import { ClassroomSchema } from '#database/schema'
import Student from '#models/student'
import User from '#models/user'
import type { Category } from '#core/entity'

/** A turma: a unidade que compete. Cada modalidade forma um time por turma. */
export default class Classroom extends ClassroomSchema {
  declare category: Category

  @belongsTo(() => User, { foreignKey: 'advisorId' })
  declare advisor: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'representativeId' })
  declare representative: BelongsTo<typeof User>

  @hasMany(() => Student)
  declare students: HasMany<typeof Student>
}
