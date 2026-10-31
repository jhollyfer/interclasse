import type {
  AdministratorSportShowResponse,
  Either,
  Paginated,
  SortDirection,
} from '@interclasse/shared'

import type { Sport } from '#domain/sport/sport.entity'
import type { SportError } from '#domain/sport/sport.errors'

export type SportListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly sort: 'name' | 'createdAt'
  readonly direction: SortDirection
}

/**
 * The sport persistence, by intent (`_standards/domain.md` §5.1). The
 * single writer of the `sports` table; it reads enrollments and brackets only to
 * answer what the sport rule asks.
 */
export abstract class SportRepository {
  abstract findById(id: string): Promise<Sport | null>
  /** Another sport, other than `exceptId`, already uses the name or the slug. */
  abstract existsByNameOrSlug(name: string, slug: string, exceptId?: string): Promise<boolean>
  /** The largest number of athletes a classroom has enrolled in this sport. */
  abstract largestRoster(sportId: string): Promise<number>
  /** Has an enrollment or a bracket: deleting would leave both without a sport. */
  abstract isInUse(sportId: string): Promise<boolean>
  /** Saves the sport; the name or slug of another (the race on the `unique`) comes back as `SPORT_ALREADY_EXISTS`. */
  abstract save(sport: Sport): Promise<Either<SportError, void>>
  abstract delete(sport: Sport): Promise<void>
  /** Lightweight read: the response shape straight from the query, without hydrating an entity. */
  abstract paginate(criteria: SportListCriteria): Promise<Paginated<AdministratorSportShowResponse>>
}
