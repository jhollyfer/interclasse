import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import { EnrollmentSchema } from '#database/schema'
import Sport from '#models/sport'
import Student from '#models/student'

/** The student enrolled as an athlete in a sport. */
export default class Enrollment extends EnrollmentSchema {
  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => Sport)
  declare sport: BelongsTo<typeof Sport>
}
