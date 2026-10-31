import { AnnouncementMemoryRepository } from '#repositories/announcement/announcement.memory.repository'
import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { ClassroomMemoryRepository } from '#repositories/classroom/classroom.memory.repository'
import { ReportMemoryRepository } from '#repositories/report/report.memory.repository'
import { SiteSettingMemoryRepository } from '#repositories/site-setting/site-setting.memory.repository'
import { SportMemoryRepository } from '#repositories/sport/sport.memory.repository'
import { StudentMemoryRepository } from '#repositories/student/student.memory.repository'

/**
 * The unit in-memory repositories (`_standards/domain.md` §5.3). A `features/` spec
 * does not import a concrete implementation (`architecture.md` §2): it takes the
 * instance from here and passes it to the container by the contract (`makeWithMemory`).
 */
export class MemoryRepositories {
  static announcements(): AnnouncementMemoryRepository {
    return new AnnouncementMemoryRepository()
  }

  static brackets(): BracketMemoryRepository {
    return new BracketMemoryRepository()
  }

  static classrooms(): ClassroomMemoryRepository {
    return new ClassroomMemoryRepository()
  }

  static reports(): ReportMemoryRepository {
    return new ReportMemoryRepository()
  }

  static siteSettings(): SiteSettingMemoryRepository {
    return new SiteSettingMemoryRepository()
  }

  static sports(): SportMemoryRepository {
    return new SportMemoryRepository()
  }

  static students(): StudentMemoryRepository {
    return new StudentMemoryRepository()
  }
}
