import { User } from '#domain/user/user.entity'
import { StorageMemoryRepository } from '#repositories/storage/storage.memory.repository'
import { UnitOfWorkMemory } from '#repositories/unit-of-work/unit-of-work.memory'
import { UserMemoryRepository } from '#repositories/user/user.memory.repository'
import { ClassroomMemoryRepository } from '#repositories/classroom/classroom.memory.repository'
import { SessionFake } from '#services/session/session.fake'

export const USER_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
export const OTHER_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'
export const PASSWORD = 'Senha@123'

/** Os colaboradores de conta e sessão, todos em memória. */
export function identityDoubles() {
  const storages = new StorageMemoryRepository()

  return {
    storages,
    users: new UserMemoryRepository(storages),
    sessions: new SessionFake(),
    classrooms: new ClassroomMemoryRepository(),
    unitOfWork: new UnitOfWorkMemory(),
  }
}

type Seed = {
  readonly id?: string
  readonly name?: string
  readonly email?: string
  readonly role?: 'ADMINISTRATOR' | 'ADVISOR' | 'REPRESENTATIVE'
  readonly archived?: boolean
  readonly inactive?: boolean
}

/** Grava uma conta no repositório de memória; a senha é `PASSWORD`, cifrada no `save`. */
export async function seedUser(users: UserMemoryRepository, seed: Seed = {}): Promise<User> {
  const user = User.create({
    id: seed.id ?? USER_ID,
    name: seed.name ?? 'Ana',
    email: seed.email ?? 'ana@mail.com',
    password: PASSWORD,
    role: seed.role ?? 'ADVISOR',
    now: new Date('2026-10-29T12:00:00Z'),
  })
  if (seed.inactive) user.update({ status: 'INACTIVE' }, new Date('2026-10-29T12:30:00Z'))
  if (seed.archived) user.archive(new Date('2026-10-29T13:00:00Z'))

  await users.save(user)

  return user
}
