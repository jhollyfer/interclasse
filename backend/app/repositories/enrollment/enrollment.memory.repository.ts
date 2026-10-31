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
 * The second real implementation, for the use case unit test
 * (`_standards/domain.md` §5.3). It keeps copies: the test does not change the "database"
 * by reference.
 */
export class EnrollmentMemoryRepository extends EnrollmentRepository {
  /** The list of each classroom per sport, by the key `classroom:sport`. */
  private readonly lists = new Map<string, string[]>()
  private readonly sports = new Map<
    string,
    Pick<SportRow, 'id' | 'name' | 'minAthletes' | 'maxAthletes'>
  >()
  private readonly classrooms = new Map<string, ClassroomRow>()
  private readonly students = new Map<string, EnrollmentStudent[]>()
  /** The sports drawn per category. */
  private readonly drawn = new Map<Category, Set<string>>()

  /** Test arrangement: the sport exists. */
  withSport(sport: Pick<SportRow, 'id' | 'name' | 'minAthletes' | 'maxAthletes'>): this {
    this.sports.set(sport.id, sport)
    return this
  }

  /** Test arrangement: the classroom exists. */
  withClassroom(classroom: ClassroomRow): this {
    this.classrooms.set(classroom.id, classroom)
    return this
  }

  /** Test arrangement: the student belongs to the classroom. */
  withStudent(classroomId: string, student: EnrollmentStudent): this {
    this.students.set(classroomId, [...(this.students.get(classroomId) ?? []), student])
    return this
  }

  /** Test arrangement: the sport was already drawn in this category. */
  markDrawn(category: Category, sportId: string): this {
    this.drawn.set(category, (this.drawn.get(category) ?? new Set()).add(sportId))
    return this
  }

  /** Test arrangement: the list that was already saved. */
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
