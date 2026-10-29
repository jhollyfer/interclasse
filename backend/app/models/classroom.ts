import { belongsTo, hasMany, hasManyThrough } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasManyThrough } from '@adonisjs/lucid/types/relations'
import { type Category } from '@interclasse/shared'

import { ClassroomSchema } from '#database/schema'
import Enrollment from '#models/enrollment'
import Student from '#models/student'
import User from '#models/user'

/** A turma: a unidade que compete. Cada modalidade forma um time por turma. */
export default class Classroom extends ClassroomSchema {
  declare category: Category

  @belongsTo(() => User, { foreignKey: 'advisorId' })
  declare advisor: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'representativeId' })
  declare representative: BelongsTo<typeof User>

  @hasMany(() => Student)
  declare students: HasMany<typeof Student>

  /** As inscrições dos alunos da turma, para contar atletas e modalidades. */
  @hasManyThrough([() => Enrollment, () => Student])
  declare enrollments: HasManyThrough<typeof Enrollment>
}
