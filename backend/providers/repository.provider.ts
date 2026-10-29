import type { ApplicationService } from '@adonisjs/core/types'

import { ClassroomLucidRepository } from '#repositories/classroom/classroom.lucid.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentLucidRepository } from '#repositories/enrollment/enrollment.lucid.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { EnrollmentRemovalLucidRepository } from '#repositories/enrollment-removal/enrollment-removal.lucid.repository'
import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { StudentLucidRepository } from '#repositories/student/student.lucid.repository'
import { StudentRepository } from '#repositories/student/student.repository'
import { SportLucidRepository } from '#repositories/sport/sport.lucid.repository'
import { SportRepository } from '#repositories/sport/sport.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UnitOfWorkLucid } from '#repositories/unit-of-work/unit-of-work.lucid'

/**
 * O composition root da persistência (`_standards/architecture.md` §2,
 * `solid.md` §2): liga cada contrato de `app/repositories/` à implementação
 * Lucid. O use-case recebe o contrato pelo construtor e nunca sabe qual é; o
 * teste unitário passa a implementação em memória direto.
 */
export default class RepositoryProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(UnitOfWork, () => this.app.container.make(UnitOfWorkLucid))
    this.app.container.bind(SportRepository, () => this.app.container.make(SportLucidRepository))
    this.app.container.bind(ClassroomRepository, () =>
      this.app.container.make(ClassroomLucidRepository),
    )
    this.app.container.bind(StudentRepository, () =>
      this.app.container.make(StudentLucidRepository),
    )
    this.app.container.bind(EnrollmentRepository, () =>
      this.app.container.make(EnrollmentLucidRepository),
    )
    this.app.container.bind(EnrollmentRemovalRepository, () =>
      this.app.container.make(EnrollmentRemovalLucidRepository),
    )
  }
}
