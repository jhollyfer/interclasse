import type {
  AdministratorClassroomPersonResponse,
  AdministratorEnrollmentRemovalShowResponse,
  Paginated,
} from '@interclasse/shared'

import {
  EnrollmentRemovalRepository,
  type EnrollmentRemovalListCriteria,
} from './enrollment-removal.repository.ts'

import {
  EnrollmentRemoval,
  type EnrollmentRemovalProps,
} from '#domain/enrollment-removal/enrollment-removal.entity'

type Classroom = AdministratorEnrollmentRemovalShowResponse['classroom']
type Sport = AdministratorEnrollmentRemovalShowResponse['sport']

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
export class EnrollmentRemovalMemoryRepository extends EnrollmentRemovalRepository {
  private readonly rows = new Map<string, EnrollmentRemovalProps>()
  /** O que o aviso aninha, como o teste arranja das outras tabelas. */
  private readonly classrooms = new Map<string, Classroom>()
  private readonly sports = new Map<string, Sport>()
  private readonly actors = new Map<string, AdministratorClassroomPersonResponse>()

  /** Arranjo do teste: a turma do aviso. */
  withClassroom(classroom: Classroom): this {
    this.classrooms.set(classroom.id, classroom)
    return this
  }

  /** Arranjo do teste: a modalidade do aviso. */
  withSport(sport: Sport): this {
    this.sports.set(sport.id, sport)
    return this
  }

  /** Arranjo do teste: quem tirou o atleta. */
  withActor(actor: AdministratorClassroomPersonResponse): this {
    this.actors.set(actor.id, actor)
    return this
  }

  async findById(id: string): Promise<EnrollmentRemoval | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return EnrollmentRemoval.restore(structuredClone(props))
  }

  async save(removal: EnrollmentRemoval): Promise<void> {
    this.rows.set(removal.id, structuredClone(removal.snapshot()))
  }

  async saveAll(removals: EnrollmentRemoval[]): Promise<void> {
    for (const removal of removals) await this.save(removal)
  }

  async findDetail(id: string): Promise<AdministratorEnrollmentRemovalShowResponse | null> {
    const props = this.rows.get(id)
    if (!props) return null

    return this.toResponse(props)
  }

  async paginate(
    criteria: EnrollmentRemovalListCriteria,
  ): Promise<Paginated<AdministratorEnrollmentRemovalShowResponse>> {
    const all = [...this.rows.values()]
      .filter(
        (row) =>
          criteria.pending === undefined || (row.acknowledgedAt === null) === criteria.pending,
      )
      .filter((row) => !criteria.classroomId || row.classroomId === criteria.classroomId)
      .sort(
        (a, b) =>
          Number(b.acknowledgedAt === null) - Number(a.acknowledgedAt === null) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      )
    const items: AdministratorEnrollmentRemovalShowResponse[] = []
    const start = (criteria.page - 1) * criteria.perPage
    for (const row of all.slice(start, start + criteria.perPage)) {
      const detail = this.toResponse(row)
      if (detail) items.push(detail)
    }
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
      data: items,
    }
  }

  private toResponse(
    props: EnrollmentRemovalProps,
  ): AdministratorEnrollmentRemovalShowResponse | null {
    const classroom = this.classrooms.get(props.classroomId)
    const sport = this.sports.get(props.sportId)
    if (!classroom || !sport) return null

    return {
      id: props.id,
      classroomId: props.classroomId,
      sportId: props.sportId,
      studentId: props.studentId,
      studentName: props.studentName,
      reason: props.reason,
      actorId: props.actorId,
      acknowledgedAt: props.acknowledgedAt?.toISOString() ?? null,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt?.toISOString() ?? null,
      classroom,
      sport,
      actor: this.actors.get(props.actorId ?? '') ?? null,
    }
  }
}
