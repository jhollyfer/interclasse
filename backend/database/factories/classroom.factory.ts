import factory from '@adonisjs/lucid/factories'

import Classroom from '#models/classroom'
import { categoryOf } from '#features/administrator/_shared.classroom'
import { UserFactory } from '#database/factories/user.factory'
import { StudentFactory } from '#database/factories/student.factory'

/**
 * Turma. A categoria é derivada do ano pela mesma função do caso de uso - o
 * banco nunca recebe um par ano/categoria que a aplicação não gravaria.
 */
export const ClassroomFactory = factory
  .define(Classroom, ({ faker }) => {
    const grade = faker.number.int({ min: 3, max: 9 })

    return {
      name: `${grade}º ${faker.string.alpha({ length: 4, casing: 'upper' })}`,
      grade,
      category: categoryOf(grade),
      advisorId: null,
      representativeId: null,
    }
  })
  .relation('advisor', () => UserFactory)
  .relation('representative', () => UserFactory)
  .relation('students', () => StudentFactory)
  .build()
