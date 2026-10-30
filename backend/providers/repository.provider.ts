import type { ApplicationService } from '@adonisjs/core/types'

import { AnnouncementLucidRepository } from '#repositories/announcement/announcement.lucid.repository'
import { AnnouncementRepository } from '#repositories/announcement/announcement.repository'
import { SiteSettingLucidRepository } from '#repositories/site-setting/site-setting.lucid.repository'
import { SiteSettingRepository } from '#repositories/site-setting/site-setting.repository'
import { PhotoLucidRepository } from '#repositories/photo/photo.lucid.repository'
import { PhotoRepository } from '#repositories/photo/photo.repository'
import { ReportLucidRepository } from '#repositories/report/report.lucid.repository'
import { ReportRepository } from '#repositories/report/report.repository'
import { ClassroomLucidRepository } from '#repositories/classroom/classroom.lucid.repository'
import { ClassroomRepository } from '#repositories/classroom/classroom.repository'
import { EnrollmentLucidRepository } from '#repositories/enrollment/enrollment.lucid.repository'
import { EnrollmentRepository } from '#repositories/enrollment/enrollment.repository'
import { EnrollmentRemovalLucidRepository } from '#repositories/enrollment-removal/enrollment-removal.lucid.repository'
import { EnrollmentRemovalRepository } from '#repositories/enrollment-removal/enrollment-removal.repository'
import { StudentLucidRepository } from '#repositories/student/student.lucid.repository'
import { StudentRepository } from '#repositories/student/student.repository'
import { BracketLucidRepository } from '#repositories/bracket/bracket.lucid.repository'
import { BracketRepository } from '#repositories/bracket/bracket.repository'
import { MatchCardLucidRepository } from '#repositories/match-card/match-card.lucid.repository'
import { MatchCardRepository } from '#repositories/match-card/match-card.repository'
import { SportLucidRepository } from '#repositories/sport/sport.lucid.repository'
import { SportRepository } from '#repositories/sport/sport.repository'
import { UnitOfWork } from '#repositories/unit-of-work/unit-of-work'
import { UnitOfWorkLucid } from '#repositories/unit-of-work/unit-of-work.lucid'
import { StorageLucidRepository } from '#repositories/storage/storage.lucid.repository'
import { StorageRepository } from '#repositories/storage/storage.repository'
import { UserLucidRepository } from '#repositories/user/user.lucid.repository'
import { UserRepository } from '#repositories/user/user.repository'
import { SessionLucidRepository } from '#repositories/session/session.lucid.repository'
import { SessionRepository } from '#repositories/session/session.repository'

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
    this.app.container.bind(AnnouncementRepository, () =>
      this.app.container.make(AnnouncementLucidRepository),
    )
    this.app.container.bind(SiteSettingRepository, () =>
      this.app.container.make(SiteSettingLucidRepository),
    )
    this.app.container.bind(SportRepository, () => this.app.container.make(SportLucidRepository))
    this.app.container.bind(PhotoRepository, () => this.app.container.make(PhotoLucidRepository))
    this.app.container.bind(ReportRepository, () => this.app.container.make(ReportLucidRepository))
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
    this.app.container.bind(StorageRepository, () =>
      this.app.container.make(StorageLucidRepository),
    )
    this.app.container.bind(UserRepository, () => this.app.container.make(UserLucidRepository))
    this.app.container.bind(SessionRepository, () =>
      this.app.container.make(SessionLucidRepository),
    )
    this.app.container.bind(BracketRepository, () =>
      this.app.container.make(BracketLucidRepository),
    )
    this.app.container.bind(MatchCardRepository, () =>
      this.app.container.make(MatchCardLucidRepository),
    )
  }
}
