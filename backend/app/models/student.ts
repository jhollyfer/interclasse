import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import { StudentSchema } from '#database/schema'
import Classroom from '#models/classroom'
import Enrollment from '#models/enrollment'

/** O aluno de uma turma. Só vira atleta quando inscrito numa modalidade. */
export default class Student extends StudentSchema {
  @belongsTo(() => Classroom)
  declare classroom: BelongsTo<typeof Classroom>

  @hasMany(() => Enrollment)
  declare enrollments: HasMany<typeof Enrollment>
}
