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
import { MemoryPagination } from '#core/memory-pagination'

type Classroom = AdministratorEnrollmentRemovalShowResponse['classroom']
type Sport = AdministratorEnrollmentRemovalShowResponse['sport']

/**
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 */
export class EnrollmentRemovalMemoryRepository extends EnrollmentRemovalRepository {
  private readonly rows = new Map<string, EnrollmentRemovalProps>()
  /** What the notice nests, as the test arranges it from the other tables. */
  private readonly classrooms = new Map<string, Classroom>()
  private readonly sports = new Map<string, Sport>()
  private readonly actors = new Map<string, AdministratorClassroomPersonResponse>()

  /** Test arrangement: the notice's classroom. */
  withClassroom(classroom: Classroom): this {
    this.classrooms.set(classroom.id, classroom)
    return this
  }

  /** Test arrangement: the notice's sport. */
  withSport(sport: Sport): this {
    this.sports.set(sport.id, sport)
    return this
  }

  /** Test arrangement: who removed the athlete. */
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
    const page = MemoryPagination.slice(all, criteria.page, criteria.perPage)
    const items: AdministratorEnrollmentRemovalShowResponse[] = []
    for (const row of page.data) {
      const detail = this.toResponse(row)
      if (detail) items.push(detail)
    }

    return {
      meta: page.meta,
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
