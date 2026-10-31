import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { CARD_COLOR, MATCH_PHASE } from '@interclasse/shared'

import { MatchCardLucidRepository } from './match-card.lucid.repository.ts'
import { MatchCardMemoryRepository } from './match-card.memory.repository.ts'
import type { MatchCardRepository } from './match-card.repository.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { BracketArrangements, type BracketHarness } from '#tests/bracket-harness-fixtures'
import { resetDatabase } from '#tests/http-fixtures'

/**
 * The same contract in both implementations (`_standards/domain.md` §5.4). The
 * card reads the match through the bracket repository, so each implementation
 * receives its own: the in-memory one gets the in-memory repository; Lucid, the database one.
 */
type Harness = {
  readonly bracket: BracketHarness
  readonly cards: MatchCardRepository
  /** The students the card only reads, arranged the way each implementation does. */
  arrangeStudent(student: { id: string; name: string; classroomId: string }): void
}

const IMPLEMENTATIONS = {
  lucid: async (): Promise<Harness> => ({
    bracket: await BracketArrangements.lucid(),
    cards: await app.container.make(MatchCardLucidRepository),
    arrangeStudent: () => undefined,
  }),
  memory: async (): Promise<Harness> => {
    const bracket = BracketArrangements.memory()
    const cards = new MatchCardMemoryRepository(bracket.repository)

    return {
      bracket,
      cards,
      arrangeStudent: (student) => {
        cards.withStudent({ ...student, createdAt: BracketArrangements.NOW, updatedAt: null })
      },
    }
  },
} satisfies Record<string, () => Promise<Harness>>

/** A drawn bracket of 4 classrooms, and a card of the student of the home classroom of the first semifinal. */
async function launched(harness: Harness, createdAt = BracketArrangements.NOW) {
  const drawn = await BracketArrangements.drawn(harness.bracket, ['8º A', '8º B', '8º C', '8º D'])
  for (const student of drawn.students) harness.arrangeStudent(student)

  const semi = drawn.bracket
    .snapshot()
    .matches.find((match) => match.phase === MATCH_PHASE.SEMI && match.position === 0)
  const student = drawn.students.find(
    (candidate) =>
      candidate.classroomId ===
      drawn.bracket.snapshot().teams.find((team) => team.id === semi?.homeTeamId)?.classroomId,
  )
  if (!semi || !student) throw new Error('incomplete arrangement')

  const created = MatchCard.launch({
    id: randomUUID(),
    matchId: semi.id,
    studentId: student.id,
    color: CARD_COLOR.YELLOW,
    note: 'Falta dura',
    now: createdAt,
    homeTeamId: semi.homeTeamId,
    awayTeamId: semi.awayTeamId,
    studentTeamId: semi.homeTeamId,
  })
  if (created.isLeft()) throw new Error('invalid card in the arrangement')

  await harness.cards.save(created.value)

  return { ...drawn, semi, student, card: created.value }
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`MatchCardRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save and findById return the same card', async ({ assert }) => {
      const harness = await make()
      const { card } = await launched(harness)

      const found = await harness.cards.findById(card.id)

      assert.deepEqual(found?.snapshot(), card.snapshot())
      assert.isNull(await harness.cards.findById(randomUUID()))
    })

    test("findStudentClassroom finds the student's classroom", async ({ assert }) => {
      const harness = await make()
      const { student } = await launched(harness)

      assert.equal(await harness.cards.findStudentClassroom(student.id), student.classroomId)
      assert.isNull(await harness.cards.findStudentClassroom(randomUUID()))
    })

    test('findResponse brings the student, the team and the match', async ({ assert }) => {
      const harness = await make()
      const { card, student, semi } = await launched(harness)

      const response = await harness.cards.findResponse(card.id)

      assert.deepInclude(response, { id: card.id, color: CARD_COLOR.YELLOW, note: 'Falta dura' })
      assert.equal(response?.student.name, student.name)
      assert.equal(response?.team.id, semi.homeTeamId)
      assert.equal(response?.match.id, semi.id)
      assert.equal(response?.match.bracket.sport.name, 'Futsal')
      assert.isNull(await harness.cards.findResponse(randomUUID()))
    })

    test('paginate filters by match, athlete and classroom, newest to oldest', async ({
      assert,
    }) => {
      const harness = await make()
      const first = await launched(harness, new Date('2026-10-29T12:00:00.000Z'))

      const all = await harness.cards.paginate({ page: 1, perPage: 10 })
      const byStudent = await harness.cards.paginate({
        page: 1,
        perPage: 10,
        studentId: first.student.id,
      })
      const byClassroom = await harness.cards.paginate({
        page: 1,
        perPage: 10,
        classroomId: first.student.classroomId,
      })
      const otherClassroom = await harness.cards.paginate({
        page: 1,
        perPage: 10,
        classroomId: first.classrooms.find((c) => c.id !== first.student.classroomId)?.id,
      })
      const otherMatch = await harness.cards.paginate({
        page: 1,
        perPage: 10,
        matchId: randomUUID(),
      })

      assert.equal(all.meta.total, 1)
      assert.equal(byStudent.meta.total, 1)
      assert.equal(byClassroom.meta.total, 1)
      assert.equal(otherClassroom.meta.total, 0)
      assert.equal(otherMatch.meta.total, 0)
    })

    test('paginate sorts newest first', async ({ assert }) => {
      const harness = await make()
      const { semi, student } = await launched(harness, new Date('2026-10-29T12:00:00Z'))
      const newer = MatchCard.launch({
        id: randomUUID(),
        matchId: semi.id,
        studentId: student.id,
        color: CARD_COLOR.RED,
        note: null,
        now: new Date('2026-10-29T13:00:00Z'),
        homeTeamId: semi.homeTeamId,
        awayTeamId: semi.awayTeamId,
        studentTeamId: semi.homeTeamId,
      })
      if (newer.isLeft()) throw new Error('invalid card in the arrangement')
      await harness.cards.save(newer.value)

      const page = await harness.cards.paginate({ page: 1, perPage: 10 })

      assert.deepEqual(
        page.data.map((item) => item.color),
        [CARD_COLOR.RED, CARD_COLOR.YELLOW],
      )
    })

    test('delete removes the card', async ({ assert }) => {
      const harness = await make()
      const { card } = await launched(harness)

      await harness.cards.delete(card)

      assert.isNull(await harness.cards.findById(card.id))
    })
  })
}
