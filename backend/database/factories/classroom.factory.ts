import factory from '@adonisjs/lucid/factories'

import Classroom from '#models/classroom'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import { UserFactory } from '#database/factories/user.factory'
import { StudentFactory } from '#database/factories/student.factory'

/**
 * Turma. A categoria é derivada do ano pela mesma regra da entidade - o
 * banco nunca recebe um par ano/categoria que a aplicação não gravaria.
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
  .relation('students', () => StudentFactory)
  .build()
