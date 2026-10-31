import factory from '@adonisjs/lucid/factories'

import Enrollment from '#models/enrollment'
import { SportFactory } from '#database/factories/sport.factory'
import { StudentFactory } from '#database/factories/student.factory'

/** Enrollment of a student in a sport. */
export const EnrollmentFactory = factory
  .define(Enrollment, () => ({}))
  .relation('student', () => StudentFactory)
  .relation('sport', () => SportFactory)
  .build()
