import { randomUUID } from 'node:crypto'

import { Sport } from '#domain/sport/sport.entity'
import type { SportMemoryRepository } from '#repositories/sport/sport.memory.repository'

/** Saves a sport in the in-memory repository and returns the id. */
export async function seedSport(sports: SportMemoryRepository, name: string): Promise<string> {
  const created = Sport.create({
    id: randomUUID(),
    name,
    minAthletes: 5,
    maxAthletes: 12,
    now: new Date('2026-10-29T12:00:00.000Z'),
  })
  if (created.isLeft()) throw new Error('invalid arrangement')
  await sports.save(created.value)

  return created.value.id
}
