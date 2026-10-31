import { USER_ROLE, type Actor } from '@interclasse/shared'

import { Classroom } from '#domain/classroom/classroom.entity'
import { ClassroomMemoryRepository } from '#repositories/classroom/classroom.memory.repository'
import { EnrollmentMemoryRepository } from '#repositories/enrollment/enrollment.memory.repository'
import { EnrollmentRemovalMemoryRepository } from '#repositories/enrollment-removal/enrollment-removal.memory.repository'
import { UnitOfWorkMemory } from '#repositories/unit-of-work/unit-of-work.memory'

const ISO = '2026-10-29T12:00:00.000Z'

export const ENROLLMENT_IDS = {
  classroom: 'c1a55a00-0000-4000-8000-000000000001',
  sport: '5a0a7000-0000-4000-8000-000000000002',
  advisor: 'ad715000-0000-4000-8000-000000000003',
  otherAdvisor: 'ad715000-0000-4000-8000-000000000004',
  representative: 'e9e55000-0000-4000-8000-000000000005',
  ana: 'a0a00000-0000-4000-8000-000000000006',
  bia: 'b1b00000-0000-4000-8000-000000000007',
} as const

export const ADVISOR_ACTOR: Actor = {
  id: ENROLLMENT_IDS.advisor,
  role: USER_ROLE.ADVISOR,
  avatarId: null,
}
export const OTHER_ADVISOR_ACTOR: Actor = {
  id: ENROLLMENT_IDS.otherAdvisor,
  role: USER_ROLE.ADVISOR,
  avatarId: null,
}
export const REPRESENTATIVE_ACTOR: Actor = {
  id: ENROLLMENT_IDS.representative,
  role: USER_ROLE.REPRESENTATIVE,
  avatarId: null,
}

/**
 * The advisor's and representative's 7º A classroom, the Futsal sport and two
 * students, in the in-memory repositories the athlete list reads and writes.
 */
export function enrollmentWorld() {
  const classrooms = new ClassroomMemoryRepository()
  const enrollments = new EnrollmentMemoryRepository()
    .withSport({ id: ENROLLMENT_IDS.sport, name: 'Futsal', minAthletes: 1, maxAthletes: 2 })
    .withClassroom({
      id: ENROLLMENT_IDS.classroom,
      name: '7º A',
      category: 'F2',
    })
    .withStudent(ENROLLMENT_IDS.classroom, { id: ENROLLMENT_IDS.ana, name: 'Ana' })
    .withStudent(ENROLLMENT_IDS.classroom, { id: ENROLLMENT_IDS.bia, name: 'Bia' })
  const removals = new EnrollmentRemovalMemoryRepository()

  return { classrooms, enrollments, removals, unitOfWork: new UnitOfWorkMemory() }
}

/** Saves the 7º A classroom linked to the world's advisor and representative. */
export async function seedWorldClassroom(classrooms: ClassroomMemoryRepository): Promise<void> {
  await classrooms.save(
    Classroom.restore({
      id: ENROLLMENT_IDS.classroom,
      name: '7º A',
      grade: 7,
      category: 'F2',
      advisorId: ENROLLMENT_IDS.advisor,
      representativeId: ENROLLMENT_IDS.representative,
      createdAt: new Date(ISO),
      updatedAt: null,
    }),
  )
}
