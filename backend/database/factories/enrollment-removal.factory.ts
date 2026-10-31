import factory from '@adonisjs/lucid/factories'

import EnrollmentRemoval from '#models/enrollment-removal'

/**
 * The enrollment removal notice. `classroomId` and `sportId` come from the test
 * (`merge`), because the notice only exists tied to a classroom and a sport.
 */
export const EnrollmentRemovalFactory = factory
  .define(EnrollmentRemoval, ({ faker }) => ({
    studentName: faker.person.fullName(),
    reason: 'Saiu da escola',
  }))
  .build()
