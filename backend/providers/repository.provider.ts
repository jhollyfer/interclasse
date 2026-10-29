import type { ApplicationService } from '@adonisjs/core/types'

import { SportLucidRepository } from '#repositories/sport/sport.lucid.repository'
import { SportRepository } from '#repositories/sport/sport.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UnitOfWorkLucid } from '#repositories/unit-of-work/unit-of-work.lucid'
import { StorageLucidRepository } from '#repositories/storage/storage.lucid.repository'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UserLucidRepository } from '#repositories/user/user.lucid.repository'
import { UserRepository } from '#repositories/user/user.repository'
import ClassroomDetachService from '#services/classroom-detach/classroom-detach.service'
import { ClassroomDetachContract } from '#services/classroom-detach/classroom-detach.contract'
import SessionService from '#services/session/session.service'
import { SessionContract } from '#services/session/session.contract'

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
    this.app.container.bind(StorageRepository, () =>
      this.app.container.make(StorageLucidRepository),
    )
    this.app.container.bind(UserRepository, () => this.app.container.make(UserLucidRepository))
    this.app.container.bind(SessionContract, () => this.app.container.make(SessionService))
    this.app.container.bind(ClassroomDetachContract, () =>
      this.app.container.make(ClassroomDetachService),
    )
  }
}
