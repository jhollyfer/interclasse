import { randomUUID } from 'node:crypto'

import { USER_ROLE, type UserRole } from '@interclasse/shared'

import { EnrollmentRemoval } from '#domain/enrollment-removal/enrollment-removal.entity'
import { EnrollmentRemovalMemoryRepository } from '#repositories/enrollment-removal/enrollment-removal.memory.repository'

const ISO = '2026-10-29T12:00:00.000Z'

export const REMOVAL_CLASSROOM_ID = 'c1a55a00-0000-4000-8000-000000000001'
export const REMOVAL_SPORT_ID = '5a0a7000-0000-4000-8000-000000000002'
export const REMOVAL_ACTOR_ID = 'ac707000-0000-4000-8000-000000000003'

/** The in-memory repository with the classroom, the sport and who removed the athlete. */
export function memoryRemovals(): EnrollmentRemovalMemoryRepository {
  return new EnrollmentRemovalMemoryRepository()
    .withClassroom({
      id: REMOVAL_CLASSROOM_ID,
      name: '7º A',
      grade: 7,
      category: 'F2',
      advisorId: null,
      representativeId: null,
      createdAt: ISO,
      updatedAt: null,
    })
    .withSport({
      id: REMOVAL_SPORT_ID,
      name: 'Futsal',
      slug: 'futsal',
      minAthletes: 5,
      maxAthletes: 12,
      createdAt: ISO,
      updatedAt: null,
    })
    .withActor({
      id: REMOVAL_ACTOR_ID,
      name: 'Conselheiro',
      email: 'c@mail.com',
      role: USER_ROLE.ADVISOR,
      status: 'ACTIVE',
      avatarId: null,
      createdAt: ISO,
      updatedAt: null,
      deletedAt: null,
    })
}

/** Saves a removal notice and returns the id. */
export async function seedRemoval(
  removals: EnrollmentRemovalMemoryRepository,
  options: { readonly role?: UserRole; readonly at?: Date } = {},
): Promise<string> {
  const removal = EnrollmentRemoval.record({
    id: randomUUID(),
    classroomId: REMOVAL_CLASSROOM_ID,
    sportId: REMOVAL_SPORT_ID,
    studentId: randomUUID(),
    studentName: 'Ana',
    reason: 'Mudou de turno',
    actorId: REMOVAL_ACTOR_ID,
    actorRole: options.role ?? USER_ROLE.ADVISOR,
    now: options.at ?? new Date('2026-10-29T12:00:00.000Z'),
  })
  await removals.save(removal)

  return removal.id
}
