import factory from '@adonisjs/lucid/factories'

import EnrollmentRemoval from '#models/enrollment-removal'

/**
 * O aviso de baixa de inscrição. `classroomId` e `sportId` vêm do teste
 * (`merge`), porque o aviso só existe preso a uma turma e a uma modalidade.
 */
export const EnrollmentRemovalFactory = factory
  .define(EnrollmentRemoval, ({ faker }) => ({
    studentName: faker.person.fullName(),
    reason: 'Saiu da escola',
  }))
  .build()
