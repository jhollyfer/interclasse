import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import { EnrollmentRemovalSchema } from '#database/schema'
import Classroom from '#models/classroom'
import Sport from '#models/sport'
import User from '#models/user'

export default class EnrollmentRemoval extends EnrollmentRemovalSchema {
  @belongsTo(() => Classroom)
  declare classroom: BelongsTo<typeof Classroom>

  @belongsTo(() => Sport)
  declare sport: BelongsTo<typeof Sport>

  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>
}
