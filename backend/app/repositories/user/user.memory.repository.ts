import hash from '@adonisjs/core/services/hash'
import { TRASHED_MODE } from '@interclasse/shared'
import type { AdministratorUserShowResponse, Paginated, SortDirection } from '@interclasse/shared'

import { UserRepository, type UserListCriteria } from './user.repository.ts'

import { User, type UserProps } from '#domain/user/user.entity'
import type { StorageRepository } from '#repositories/storage/storage.repository'
import { MemoryPagination } from '#core/memory-pagination'

/** O sinal da comparação por sentido de ordenação. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 *
 * Cifra a senha no `save` quando ela mudou, como o hook do model faz: sem isso
 * o use-case que confere a senha atual passaria contra um dublê que mente. O
 * avatar vem do repository de arquivos que o teste passa.
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

  async save(user: User): Promise<void> {
    const snapshot = structuredClone(user.snapshot())
    const stored = this.rows.get(snapshot.id)
    const changed = !stored || stored.password !== snapshot.password
    let password = snapshot.password
    if (changed) password = await hash.make(snapshot.password)

    this.rows.set(snapshot.id, { ...snapshot, password })
  }

  async delete(user: User): Promise<void> {
    this.rows.delete(user.id)
  }

  async detail(id: string): Promise<AdministratorUserShowResponse | null> {
    const props = this.rows.get(id)
    if (!props || props.deletedAt) return null

    return this.toResponse(props, await this.avatarOf(props))
  }

  async paginate(criteria: UserListCriteria): Promise<Paginated<AdministratorUserShowResponse>> {
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

  private async avatarOf(props: UserProps): Promise<AdministratorUserShowResponse['avatar']> {
    const [avatar] = await this.storages.detailsOf([props.avatarId ?? []].flat())

    return avatar ?? null
  }

  private toResponse(
    props: UserProps,
    avatar: AdministratorUserShowResponse['avatar'],
  ): AdministratorUserShowResponse {
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
