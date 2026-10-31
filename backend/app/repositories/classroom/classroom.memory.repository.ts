import {
  USER_ROLE,
  left,
  right,
  type Actor,
  type AdministratorClassroomPaginateResponse,
  type AdministratorClassroomPersonResponse,
  type AdministratorClassroomShowResponse,
  type Either,
  type Paginated,
  type SortDirection,
} from '@interclasse/shared'

import {
  ClassroomRepository,
  type ClassroomListCriteria,
  type ClassroomOwnedListCriteria,
} from './classroom.repository.ts'

import {
  Classroom,
  type ClassroomLinkFacts,
  type ClassroomLinks,
  type ClassroomPeopleFacts,
  type ClassroomProps,
} from '#domain/classroom/classroom.entity'
import type { ClassroomError } from '#domain/classroom/classroom.errors'
import { MemoryPagination } from '#core/memory-pagination'

/** The sign of the comparison by sort direction. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

type Totals = { readonly students: number; readonly athletes: number; readonly sports: number }

/**
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 */
export class ClassroomMemoryRepository extends ClassroomRepository {
  private readonly rows = new Map<string, ClassroomProps>()
  /** The accounts the test arranges: what the `users` table would have. */
  private readonly accounts = new Map<string, AdministratorClassroomPersonResponse>()
  private readonly totals = new Map<string, Totals>()
  private readonly competing = new Set<string>()

  /** Test arrangement: an existing account (live, with the role it brings). */
  withAccount(account: AdministratorClassroomPersonResponse): this {
    this.accounts.set(account.id, account)
    return this
  }

  /** Test arrangement: the account was archived. */
  withArchivedAccount(accountId: string): this {
    const account = this.accounts.get(accountId)
    if (account) this.accounts.set(accountId, { ...account, deletedAt: '2026-10-29T12:00:00.000Z' })
    return this
  }

  /** Test arrangement: the classroom card totals. */
  withTotals(classroomId: string, totals: Totals): this {
    this.totals.set(classroomId, totals)
    return this
  }

  /** Test arrangement: the classroom has a team in a bracket. */
  markInCompetition(classroomId: string): this {
    this.competing.add(classroomId)
    return this
  }

  async findById(id: string): Promise<Classroom | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return Classroom.restore(structuredClone(props))
  }

  async findOwned(criteria: {
    readonly id: string
    readonly actor: Actor
  }): Promise<Classroom | null> {
    const props = this.rows.get(criteria.id)
    if (!props || !this.reaches(criteria.actor, props)) return null

    return Classroom.restore(structuredClone(props))
  }

  async findOfRepresentative(accountId: string): Promise<Classroom | null> {
    const props = [...this.rows.values()].find((row) => row.representativeId === accountId)
    if (!props) return null

    return Classroom.restore(structuredClone(props))
  }

  async findDetail(id: string): Promise<AdministratorClassroomShowResponse | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return this.toResponse(props)
  }

  async existsByName(name: string, exceptId?: string): Promise<boolean> {
    return [...this.rows.values()].some((row) => row.id !== exceptId && row.name === name)
  }

  async peopleFacts(
    links: ClassroomLinks,
    exceptClassroomId?: string,
  ): Promise<ClassroomPeopleFacts> {
    const facts: { advisor?: ClassroomLinkFacts; representative?: ClassroomLinkFacts } = {}

    if (links.advisorId)
      facts.advisor = this.linkFacts(
        'advisorId',
        links.advisorId,
        USER_ROLE.ADVISOR,
        exceptClassroomId,
      )
    if (links.representativeId)
      facts.representative = this.linkFacts(
        'representativeId',
        links.representativeId,
        USER_ROLE.REPRESENTATIVE,
        exceptClassroomId,
      )

    return facts
  }

  async isInCompetition(id: string): Promise<boolean> {
    return this.competing.has(id)
  }

  async save(classroom: Classroom): Promise<Either<ClassroomError, void>> {
    const snapshot = structuredClone(classroom.snapshot())
    const others = [...this.rows.values()].filter((row) => row.id !== snapshot.id)

    // The three database `unique`s: advisor, representative and name.
    if (snapshot.advisorId && others.some((row) => row.advisorId === snapshot.advisorId))
      return left({ code: 'ADVISOR_TAKEN' })
    if (
      snapshot.representativeId &&
      others.some((row) => row.representativeId === snapshot.representativeId)
    )
      return left({ code: 'REPRESENTATIVE_TAKEN' })
    if (others.some((row) => row.name === snapshot.name))
      return left({ code: 'CLASSROOM_ALREADY_EXISTS' })

    this.rows.set(snapshot.id, snapshot)

    return right(undefined)
  }

  async delete(classroom: Classroom): Promise<void> {
    this.rows.delete(classroom.id)
  }

  /** The accounts the test saw being released from classrooms, in order. */
  readonly detachedAccounts: string[] = []

  async detachAccount(accountId: string): Promise<void> {
    this.detachedAccounts.push(accountId)
    for (const props of this.rows.values()) {
      if (props.advisorId === accountId) props.advisorId = null
      if (props.representativeId === accountId) props.representativeId = null
    }
  }

  async paginate(
    criteria: ClassroomListCriteria,
  ): Promise<Paginated<AdministratorClassroomPaginateResponse>> {
    const search = criteria.search?.toLowerCase()
    const sign = SIGN[criteria.direction]
    const all = [...this.rows.values()]
      .filter((row) => !criteria.category || row.category === criteria.category)
      .filter((row) => !search || row.name.toLowerCase().includes(search))
      .sort((a, b) => sign * String(a[criteria.sort]).localeCompare(String(b[criteria.sort])))

    return this.page(all, criteria, (props) => {
      const totals = this.totals.get(props.id) ?? { students: 0, athletes: 0, sports: 0 }

      return {
        ...this.toResponse(props),
        studentsCount: totals.students,
        athletesCount: totals.athletes,
        sportsCount: totals.sports,
      }
    })
  }

  async paginateOwned(
    criteria: ClassroomOwnedListCriteria,
  ): Promise<Paginated<AdministratorClassroomShowResponse>> {
    const search = criteria.search?.toLowerCase()
    const all = [...this.rows.values()]
      .filter((row) => this.reaches(criteria.actor, row))
      .filter((row) => !search || row.name.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name))

    return this.page(all, criteria, (props) => this.toResponse(props))
  }

  /** The administrator reaches all; the others, the classroom they advise. */
  private reaches(actor: Actor, props: ClassroomProps): boolean {
    return actor.role === USER_ROLE.ADMINISTRATOR || props.advisorId === actor.id
  }

  private linkFacts(
    column: 'advisorId' | 'representativeId',
    accountId: string,
    role: string,
    exceptClassroomId?: string,
  ): ClassroomLinkFacts {
    const account = this.accounts.get(accountId)
    const exists = Boolean(account && account.role === role && account.deletedAt === null)
    const taken = [...this.rows.values()].some(
      (row) => row.id !== exceptClassroomId && row[column] === accountId,
    )

    return { exists, taken }
  }

  private page<T>(
    all: ClassroomProps[],
    criteria: { readonly page: number; readonly perPage: number },
    toItem: (props: ClassroomProps) => T,
  ): Paginated<T> {
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)

    return {
      meta: page.meta,
      data: page.data.map(toItem),
    }
  }

  private toResponse(props: ClassroomProps): AdministratorClassroomShowResponse {
    return {
      id: props.id,
      name: props.name,
      grade: props.grade,
      category: props.category,
      advisorId: props.advisorId,
      representativeId: props.representativeId,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt?.toISOString() ?? null,
      advisor: this.accountOf(props.advisorId),
      representative: this.accountOf(props.representativeId),
    }
  }

  private accountOf(accountId: string | null): AdministratorClassroomPersonResponse | null {
    if (!accountId) return null

    return this.accounts.get(accountId) ?? null
  }
}
