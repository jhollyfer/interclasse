import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { CARD_COLOR, MATCH_PHASE } from '@interclasse/shared'

import { MatchCardLucidRepository } from './match-card.lucid.repository.ts'
import { MatchCardMemoryRepository } from './match-card.memory.repository.ts'
import type { MatchCardRepository } from './match-card.repository.ts'

import { MatchCard } from '#domain/match-card/match-card.entity'
import { BracketArrangements, type BracketHarness } from '#tests/bracket-harness'
import { resetDatabase } from '#tests/helpers'

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4). O
 * cartão lê a partida pelo repositório da chave, então cada implementação
 * recebe o dela: o de memória, o repositório em memória; o Lucid, o do banco.
 */
type Harness = {
  readonly bracket: BracketHarness
  readonly cards: MatchCardRepository
  /** Os alunos que o cartão só lê, arranjados do jeito de cada implementação. */
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

/** Uma chave de 4 turmas sorteada, e um cartão do aluno da turma mandante da primeira semifinal. */
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
  if (!semi || !student) throw new Error('arranjo incompleto')

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
  if (created.isLeft()) throw new Error('cartão inválido no arranjo')

  await harness.cards.save(created.value)

  return { ...drawn, semi, student, card: created.value }
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`MatchCardRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem o mesmo cartão', async ({ assert }) => {
      const harness = await make()
      const { card } = await launched(harness)

      const found = await harness.cards.findById(card.id)

      assert.deepEqual(found?.snapshot(), card.snapshot())
      assert.isNull(await harness.cards.findById(randomUUID()))
    })

    test('findStudentClassroom acha a turma do aluno', async ({ assert }) => {
      const harness = await make()
      const { student } = await launched(harness)

      assert.equal(await harness.cards.findStudentClassroom(student.id), student.classroomId)
      assert.isNull(await harness.cards.findStudentClassroom(randomUUID()))
    })

    test('findResponse traz o aluno, o time e a partida', async ({ assert }) => {
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

    test('paginate filtra por partida, atleta e turma, do mais novo ao mais antigo', async ({
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

    test('paginate ordena pelo mais novo primeiro', async ({ assert }) => {
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
      if (newer.isLeft()) throw new Error('cartão inválido no arranjo')
      await harness.cards.save(newer.value)

      const page = await harness.cards.paginate({ page: 1, perPage: 10 })

      assert.deepEqual(
        page.data.map((item) => item.color),
        [CARD_COLOR.RED, CARD_COLOR.YELLOW],
      )
    })

    test('delete tira o cartão', async ({ assert }) => {
      const harness = await make()
      const { card } = await launched(harness)

      await harness.cards.delete(card)

      assert.isNull(await harness.cards.findById(card.id))
    })
  })
}
