import type { AdministratorEnrollmentRemovalShowResponse, Paginated } from '@interclasse/shared'

import type { EnrollmentRemoval } from '#domain/enrollment-removal/enrollment-removal.entity'

export type EnrollmentRemovalListCriteria = {
  readonly page: number
  readonly perPage: number
  /** `true` only the pending, `false` only the read, absent both. */
  readonly pending?: boolean
  readonly classroomId?: string
}

/**
 * The removal notice persistence, by intent (`_standards/domain.md` §5.1).
 * The single writer of the `enrollment_removals` table.
 */
export abstract class EnrollmentRemovalRepository {
  abstract findById(id: string): Promise<EnrollmentRemoval | null>
  abstract save(removal: EnrollmentRemoval): Promise<void>
  /** The notices of a list swap, in a single write. */
  abstract saveAll(removals: EnrollmentRemoval[]): Promise<void>
  /** Lightweight read: the notice with the classroom, the sport and who removed, straight from the query. */
  abstract findDetail(id: string): Promise<AdministratorEnrollmentRemovalShowResponse | null>
  /** Newest to oldest, pending first. */
  abstract paginate(
    criteria: EnrollmentRemovalListCriteria,
  ): Promise<Paginated<AdministratorEnrollmentRemovalShowResponse>>
}
