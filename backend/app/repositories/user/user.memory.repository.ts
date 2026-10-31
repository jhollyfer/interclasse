import hash from '@adonisjs/core/services/hash'
import { TRASHED_MODE, left, right } from '@interclasse/shared'
import type { Either, Paginated, SortDirection } from '@interclasse/shared'

import { UserRepository, type UserListCriteria, type UserRead } from './user.repository.ts'

import { User, type UserProps } from '#domain/user/user.entity'
import type { UserError } from '#domain/user/user.errors'
import type { StorageRepository } from '#repositories/storage/storage.repository'
import { MemoryPagination } from '#core/memory-pagination'

/** The sign of the comparison by sort direction. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

/**
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 *
 * It hashes the password on `save` when it changed, as the model hook does: without that
 * the use case that checks the current password would pass against a lying double. The
 * avatar comes from the files repository the test passes.
 */
export class UserMemoryRepository extends UserRepository {
  private readonly rows = new Map<string, UserProps>()

  constructor(private readonly storages: StorageRepository) {
    super()
  }

  async findById(id: string): Promise<User | null> {
    const props = this.rows.get(id)
    if (!props || props.deletedAt) return null

    return this.restore(props)
  }

  async findArchivedById(id: string): Promise<User | null> {
    const props = this.rows.get(id)
    if (!props?.deletedAt) return null

    return this.restore(props)
  }

  async findAnyById(id: string): Promise<User | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return this.restore(props)
  }

  async findByEmail(email: string): Promise<User | null> {
    const props = [...this.rows.values()].find((row) => row.email === email)
    if (!props) return null

    return this.restore(props)
  }

  async existsByEmail(email: string, exceptId?: string): Promise<boolean> {
    return [...this.rows.values()].some((row) => row.id !== exceptId && row.email === email)
  }

  async save(user: User): Promise<Either<UserError, void>> {
    const snapshot = structuredClone(user.snapshot())
    // The e-mail `unique`, as the database guarantees it.
    if (await this.existsByEmail(snapshot.email, snapshot.id))
      return left({ code: 'USER_ALREADY_EXISTS' })

    const stored = this.rows.get(snapshot.id)
    const changed = !stored || stored.password !== snapshot.password
    let password = snapshot.password
    if (changed) password = await hash.make(snapshot.password)

    this.rows.set(snapshot.id, { ...snapshot, password })

    return right(undefined)
  }

  async delete(user: User): Promise<void> {
    this.rows.delete(user.id)
  }

  async detail(id: string): Promise<UserRead | null> {
    const props = this.rows.get(id)
    if (!props || props.deletedAt) return null

    return this.toResponse(props, await this.avatarOf(props))
  }

  async paginate(criteria: UserListCriteria): Promise<Paginated<UserRead>> {
    const search = criteria.search?.toLowerCase()
    const sign = SIGN[criteria.direction]
    const all = [...this.rows.values()]
      .filter((row) => this.inTrashedMode(row, criteria.trashed))
      .filter((row) => !criteria.role || row.role === criteria.role)
      .filter((row) => !criteria.status || row.status === criteria.status)
      .filter(
        (row) =>
          !search ||
          row.name.toLowerCase().includes(search) ||
          row.email.toLowerCase().includes(search),
      )
      .sort((a, b) => sign * this.compare(a, b, criteria.sort))
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: await Promise.all(
        page.data.map(async (row) => this.toResponse(row, await this.avatarOf(row))),
      ),
    }
  }

  private restore(props: UserProps): User {
    return User.restore(structuredClone(props))
  }

  private inTrashedMode(row: UserProps, mode: UserListCriteria['trashed']): boolean {
    if (mode === undefined) return !row.deletedAt
    if (mode === TRASHED_MODE.ONLY) return Boolean(row.deletedAt)

    return true
  }

  private compare(a: UserProps, b: UserProps, sort: UserListCriteria['sort']): number {
    if (sort === 'createdAt') return a.createdAt.getTime() - b.createdAt.getTime()

    return a[sort].localeCompare(b[sort])
  }

  private async avatarOf(props: UserProps): Promise<UserRead['avatar']> {
    const [avatar] = await this.storages.detailsOf([props.avatarId ?? []].flat())

    return avatar ?? null
  }

  private toResponse(props: UserProps, avatar: UserRead['avatar']): UserRead {
    return {
      id: props.id,
      name: props.name,
      email: props.email,
      role: props.role,
      status: props.status,
      avatarId: props.avatarId,
      avatar,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt?.toISOString() ?? null,
      deletedAt: props.deletedAt?.toISOString() ?? null,
    }
  }
}
