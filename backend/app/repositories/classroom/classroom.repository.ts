import type {
  Actor,
  AdministratorClassroomPaginateResponse,
  AdministratorClassroomShowResponse,
  Category,
  Either,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import type {
  Classroom,
  ClassroomLinks,
  ClassroomPeopleFacts,
} from '#domain/classroom/classroom.entity'
import type { ClassroomError } from '#domain/classroom/classroom.errors'

export type ClassroomListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly category?: Category
  readonly sort: 'name' | 'grade' | 'category' | 'createdAt'
  readonly direction: SortDirection
}

/** The advisor's list: only the classrooms in their reach, by name. */
export type ClassroomOwnedListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly actor: Actor
}

/**
 * The classroom persistence, by intent (`_standards/domain.md` §5.1). The single
 * writer of the `classrooms` table; it reads `users` only to answer whether the given account
 * fits the link, and `teams` and `enrollments` for the totals and the draw.
 */
export abstract class ClassroomRepository {
  abstract findById(id: string): Promise<Classroom | null>
  /**
   * The classroom within reach of whoever acts: the administrator reaches all, the advisor
   * their own. A foreign classroom comes back `null`, same as a nonexistent one (`backend.md` §4.6).
   */
  abstract findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Classroom | null>
  /** The classroom the account represents, which is only one. */
  abstract findOfRepresentative(accountId: string): Promise<Classroom | null>
  /** Lightweight read: the classroom with advisor and representative, straight from the query. */
  abstract findDetail(id: string): Promise<AdministratorClassroomShowResponse | null>
  /** Another classroom, other than `exceptId`, already uses the name. */
  abstract existsByName(name: string, exceptId?: string): Promise<boolean>
  /** The facts of each given account; an account absent from the criteria has no fact. */
  abstract peopleFacts(
    links: ClassroomLinks,
    exceptClassroomId?: string,
  ): Promise<ClassroomPeopleFacts>
  /** The classroom already has a team in a drawn bracket. */
  abstract isInCompetition(id: string): Promise<boolean>
  /**
   * Saves the classroom; the race on the `unique` comes back as the fact of the field that collided: the name,
   * the advisor or the representative.
   */
  abstract save(classroom: Classroom): Promise<Either<ClassroomError, void>>
  abstract delete(classroom: Classroom): Promise<void>
  /**
   * Undoes the classroom links of an account that stopped being what it was (role
   * changed or was archived). Archiving is a soft delete, so the column's `ON DELETE SET
   * NULL` never fires: this method is what plays its part.
   */
  abstract detachAccount(accountId: string): Promise<void>
  abstract paginate(
    criteria: ClassroomListCriteria,
  ): Promise<Paginated<AdministratorClassroomPaginateResponse>>
  abstract paginateOwned(
    criteria: ClassroomOwnedListCriteria,
  ): Promise<Paginated<AdministratorClassroomShowResponse>>
}
