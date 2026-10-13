import factory from '@adonisjs/lucid/factories'

import Team from '#models/team'
import { ClassroomFactory } from '#database/factories/classroom.factory'

/** Time: a turma inscrita numa chave. A chave vem de quem cria (`bracketId`). */
export const TeamFactory = factory
  .define(Team, () => ({}))
  .relation('classroom', () => ClassroomFactory)
  .build()
