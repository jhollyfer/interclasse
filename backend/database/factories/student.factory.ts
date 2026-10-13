import factory from '@adonisjs/lucid/factories'

import Student from '#models/student'
import { ClassroomFactory } from '#database/factories/classroom.factory'

/** Aluno de uma turma. */
export const StudentFactory = factory
  .define(Student, ({ faker }) => ({ name: faker.person.fullName() }))
  .relation('classroom', () => ClassroomFactory)
  .build()
