import factory from '@adonisjs/lucid/factories'

import Student from '#models/student'
import { ClassroomFactory } from '#database/factories/classroom.factory'

/** Student of a classroom. */
export const StudentFactory = factory
  .define(Student, ({ faker }) => ({ name: faker.person.fullName() }))
  .relation('classroom', () => ClassroomFactory)
  .build()
