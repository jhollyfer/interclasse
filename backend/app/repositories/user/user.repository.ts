import type {
  ActiveStatus,
  AdministratorUserShowResponse,
  Paginated,
  SortDirection,
  TrashedMode,
  UserRole,
} from '@interclasse/shared'
import type { Either } from '@interclasse/shared'

import type { User } from '#domain/user/user.entity'
import type { StorageFileRead } from '#repositories/storage/storage.repository'
import type { UserError } from '#domain/user/user.errors'

/**
 * The account in the response shape, with the avatar without the `url`: signing belongs to the use case, through the
 * bucket contract (`_standards/architecture.md` §2, `StorageContract.withUrl`).
 */
export type UserRead = Omit<AdministratorUserShowResponse, 'avatar'> & {
  readonly avatar: StorageFileRead | null
}

export type UserListCriteria = {
  readonly page: number
  readonly perPage: number
  readonly search?: string
  readonly role?: UserRole
  readonly status?: ActiveStatus
  /** Absent is only the live ones; `only` is the trash; `with` brings both. */
  readonly trashed?: TrashedMode
  readonly sort: 'name' | 'email' | 'role' | 'status' | 'createdAt'
  readonly direction: SortDirection
}

/**
 * The account persistence, by intent (`_standards/domain.md` §5.1). The
 * single writer of the `users` table. The trash filter (`backend.md` §4.8) lives
 * inside the implementation: the contract says which account it wants, not how to filter.
 *
 * The password enters in plain text on `save` and comes back hashed on reads: hashing is
 * persistence mechanics, not an account rule.
 */
export abstract class UserRepository {
  /** The live account, outside the trash. */
  abstract findById(id: string): Promise<User | null>
  /** Only the archived account: what to restore. */
  abstract findArchivedById(id: string): Promise<User | null>
  /** Live or archived: deleting for good needs to tell the two apart. */
  abstract findAnyById(id: string): Promise<User | null>
  /** Live or archived: the e-mail `unique` holds for the whole table. */
  abstract findByEmail(email: string): Promise<User | null>
  /** Another account, live or archived, other than `exceptId`, already uses the e-mail. */
  abstract existsByEmail(email: string, exceptId?: string): Promise<boolean>
  /** Saves the account; the e-mail of another account (the race on the `unique`) comes back as `USER_ALREADY_EXISTS`. */
  abstract save(user: User): Promise<Either<UserError, void>>
  abstract delete(user: User): Promise<void>
  /** Lightweight read of the live account, with the avatar (without the `url`): the response shape, without the password. */
  abstract detail(id: string): Promise<UserRead | null>
  abstract paginate(criteria: UserListCriteria): Promise<Paginated<UserRead>>
}
