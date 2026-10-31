import factory from '@adonisjs/lucid/factories'

import Team from '#models/team'
import { ClassroomFactory } from '#database/factories/classroom.factory'

/** Team: the classroom enrolled in a bracket. The bracket comes from whoever creates it (`bracketId`). */
export const TeamFactory = factory
  .define(Team, () => ({}))
  .relation('classroom', () => ClassroomFactory)
  .build()
