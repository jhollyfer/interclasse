import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import { StudentSchema } from '#database/schema'
import Classroom from '#models/classroom'

/** The student of a classroom. Only becomes an athlete when enrolled in a sport. */
export default class Student extends StudentSchema {
  @belongsTo(() => Classroom)
  declare classroom: BelongsTo<typeof Classroom>
}
