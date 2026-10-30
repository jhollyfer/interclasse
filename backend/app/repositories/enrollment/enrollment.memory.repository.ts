import type { AdvisorEnrollmentShowResponse, Category } from '@interclasse/shared'

import {
  EnrollmentRepository,
  type EnrollmentKey,
  type EnrollmentSport,
  type EnrollmentStudent,
} from './enrollment.repository.ts'

import { Enrollment } from '#domain/enrollment/enrollment.entity'

type SportRow = AdvisorEnrollmentShowResponse['sports'][number]
type ClassroomRow = AdvisorEnrollmentShowResponse['classroom']

/**
 * A segunda implementação de verdade, para o teste unitário do use-case
 * (`_standards/domain.md` §5.3). Guarda cópias: o teste não altera o "banco"
 * por referência.
 */
export class EnrollmentMemoryRepository extends EnrollmentRepository {
  /** A lista de cada turma por modalidade, pela chave `turma:modalidade`. */
  private readonly lists = new Map<string, string[]>()
  private readonly sports = new Map<
    string,
    Pick<SportRow, 'id' | 'name' | 'minAthletes' | 'maxAthletes'>
  >()
  private readonly classrooms = new Map<string, ClassroomRow>()
  private readonly students = new Map<string, EnrollmentStudent[]>()
  /** As modalidades sorteadas por categoria. */
  private readonly drawn = new Map<Category, Set<string>>()

  /** Arranjo do teste: a modalidade existe. */
  withSport(sport: Pick<SportRow, 'id' | 'name' | 'minAthletes' | 'maxAthletes'>): this {
    this.sports.set(sport.id, sport)
    return this
  }

  /** Arranjo do teste: a turma existe. */
  withClassroom(classroom: ClassroomRow): this {
    this.classrooms.set(classroom.id, classroom)
    return this
  }

  /** Arranjo do teste: o aluno é da turma. */
  withStudent(classroomId: string, student: EnrollmentStudent): this {
    this.students.set(classroomId, [...(this.students.get(classroomId) ?? []), student])
    return this
  }

  /** Arranjo do teste: a modalidade já foi sorteada nesta categoria. */
  markDrawn(category: Category, sportId: string): this {
    this.drawn.set(category, (this.drawn.get(category) ?? new Set()).add(sportId))
    return this
  }

  /** Arranjo do teste: a lista que já estava gravada. */
  withList(key: EnrollmentKey, studentIds: string[]): this {
    this.lists.set(this.keyOf(key), studentIds)
    return this
  }

  async findSport(sportId: string): Promise<EnrollmentSport | null> {
    const sport = this.sports.get(sportId)
    if (!sport) return null

    return { id: sport.id, maxAthletes: sport.maxAthletes }
  }

  async studentsOf(classroomId: string): Promise<EnrollmentStudent[]> {
    return [...(this.students.get(classroomId) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  }

  async isDrawn(key: EnrollmentKey): Promise<boolean> {
    const classroom = this.classrooms.get(key.classroomId)
    if (!classroom) return false

    return this.drawn.get(classroom.category)?.has(key.sportId) ?? false
  }

  async findForUpdate(key: EnrollmentKey): Promise<Enrollment> {
    return Enrollment.restore({ ...key, studentIds: [...(this.lists.get(this.keyOf(key)) ?? [])] })
  }

  async save(enrollment: Enrollment): Promise<void> {
    const { classroomId, sportId, studentIds } = enrollment.snapshot()
    this.lists.set(this.keyOf({ classroomId, sportId }), [...studentIds])
  }

  async board(criteria: {
    readonly classroomId: string
    readonly lockAfterDraw: boolean
  }): Promise<AdvisorEnrollmentShowResponse | null> {
    const classroom = this.classrooms.get(criteria.classroomId)
    if (!classroom) return null

    const drawn = this.drawn.get(classroom.category) ?? new Set<string>()
    const students = await this.studentsOf(classroom.id)

    return {
      classroom,
      sports: [...this.sports.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((sport) => ({
          ...sport,
          drawn: drawn.has(sport.id),
          locked: criteria.lockAfterDraw && drawn.has(sport.id),
        })),
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        sportIds: [...this.sports.keys()].filter((sportId) =>
          this.lists.get(this.keyOf({ classroomId: classroom.id, sportId }))?.includes(student.id),
        ),
      })),
    }
  }

  private keyOf(key: EnrollmentKey): string {
    return `${key.classroomId}:${key.sportId}`
  }
}
