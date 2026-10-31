import factory from '@adonisjs/lucid/factories'

import Classroom from '#models/classroom'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import { UserFactory } from '#database/factories/user.factory'

/**
 * Classroom. The category is derived from the grade by the same rule as the entity - the
 * database never receives a grade/category pair the application would not write.
 */
export const ClassroomFactory = factory
  .define(Classroom, ({ faker }) => {
    const grade = faker.number.int({ min: 3, max: 9 })

    return {
      name: `${grade}º ${faker.string.alpha({ length: 4, casing: 'upper' })}`,
      grade,
      category: ClassroomEntity.categoryOf(grade),
      advisorId: null,
      representativeId: null,
    }
  })
  .relation('advisor', () => UserFactory)
  .relation('representative', () => UserFactory)
  .build()
