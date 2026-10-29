import {
  USER_ROLE,
  type Actor,
  type AdministratorClassroomPaginateResponse,
  type AdministratorClassroomPersonResponse,
  type AdministratorClassroomShowResponse,
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

/** O sinal da comparação por sentido de ordenação. */
const SIGN = { asc: 1, desc: -1 } satisfies Record<SortDirection, number>

type Totals = { readonly students: number; readonly athletes: number; readonly sports: number }

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
export class ClassroomMemoryRepository extends ClassroomRepository {
  private readonly rows = new Map<string, ClassroomProps>()
  /** As contas que o teste arranja: o que a tabela `users` teria. */
  private readonly accounts = new Map<string, AdministratorClassroomPersonResponse>()
  private readonly totals = new Map<string, Totals>()
  private readonly competing = new Set<string>()

  /** Arranjo do teste: uma conta existente (viva, com o papel que ela traz). */
  withAccount(account: AdministratorClassroomPersonResponse): this {
    this.accounts.set(account.id, account)
    return this
  }

  /** Arranjo do teste: a conta foi arquivada. */
  withArchivedAccount(accountId: string): this {
    const account = this.accounts.get(accountId)
    if (account) this.accounts.set(accountId, { ...account, deletedAt: '2026-10-29T12:00:00.000Z' })
    return this
  }

  /** Arranjo do teste: os totais do cartão da turma. */
  withTotals(classroomId: string, totals: Totals): this {
    this.totals.set(classroomId, totals)
    return this
  }

  /** Arranjo do teste: a turma tem time numa chave. */
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

  async save(classroom: Classroom): Promise<void> {
    this.rows.set(classroom.id, structuredClone(classroom.snapshot()))
  }

  async delete(classroom: Classroom): Promise<void> {
    this.rows.delete(classroom.id)
  }

  async detachAccount(accountId: string): Promise<void> {
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

  /** O administrador alcança todas; os outros, a turma que aconselham. */
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
    const start = (criteria.page - 1) * criteria.perPage
    const lastPage = Math.max(1, Math.ceil(all.length / criteria.perPage))

    return {
      meta: {
        total: all.length,
        perPage: criteria.perPage,
        currentPage: criteria.page,
        lastPage,
        firstPage: 1,
        firstPageUrl: '/?page=1',
        lastPageUrl: `/?page=${lastPage}`,
        nextPageUrl: null,
        previousPageUrl: null,
      },
      data: all.slice(start, start + criteria.perPage).map(toItem),
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
