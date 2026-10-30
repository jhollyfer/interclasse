import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { CARD_COLOR, MATCH_PHASE } from '@interclasse/shared'

import AdministratorCardCreateUseCase from './create.use-case.ts'

import { BracketMemoryRepository } from '#repositories/bracket/bracket.memory.repository'
import { BracketUnitFixtures } from '#tests/bracket-unit-fixtures'
import { makeWithMemory } from '#tests/container-fixtures'

async function setup() {
  const brackets = new BracketMemoryRepository()
  const drawn = await BracketUnitFixtures.drawn(brackets)
  const cards = BracketUnitFixtures.cards(brackets, drawn.students)
  const useCase = await makeWithMemory(
    AdministratorCardCreateUseCase,
    BracketUnitFixtures.cardBindings(brackets, cards),
  )
  const matches = drawn.bracket.snapshot().matches
  const semi = matches.find((match) => match.phase === MATCH_PHASE.SEMI && match.position === 0)
  const final = matches.find((match) => match.phase === MATCH_PHASE.FINAL)
  const teams = drawn.bracket.snapshot().teams
  const playing = drawn.students.find(
    (student) =>
      teams.find((team) => team.id === semi?.homeTeamId)?.classroomId === student.classroomId,
  )
  const outsider = drawn.students.find(
    (student) =>
      ![semi?.homeTeamId, semi?.awayTeamId].includes(
        teams.find((team) => team.classroomId === student.classroomId)?.id,
      ),
  )
  if (!semi || !final || !playing || !outsider) throw new Error('arranjo incompleto')

  return { cards, useCase, semi, final, playing, outsider }
}

test.group('administrator/cards > create (unit)', () => {
  test('lança o cartão com o time da turma do atleta', async ({ assert }) => {
    const { cards, useCase, semi, playing } = await setup()

    const result = await useCase.execute({
      matchId: semi.id,
      studentId: playing.id,
      color: CARD_COLOR.RED,
      note: 'Falta dura',
    })

    if (result.isLeft()) throw new Error('cartão deveria ser aceito')
    assert.deepInclude(result.value, {
      matchId: semi.id,
      studentId: playing.id,
      teamId: semi.homeTeamId,
      color: CARD_COLOR.RED,
      note: 'Falta dura',
    })
    assert.equal(result.value.student.name, playing.name)
    assert.isNotNull(await cards.findById(result.value.id))
  })

  test('partida inexistente é 422 MATCH_NOT_FOUND', async ({ assert }) => {
    const { useCase, playing } = await setup()

    const result = await useCase.execute({
      matchId: randomUUID(),
      studentId: playing.id,
      color: CARD_COLOR.YELLOW,
    })

    assert.deepInclude(result.value, { status: 422, code: 'MATCH_NOT_FOUND' })
  })

  test('partida sem os dois times é 409 MATCH_TEAMS_PENDING', async ({ assert }) => {
    const { useCase, final, playing } = await setup()

    const result = await useCase.execute({
      matchId: final.id,
      studentId: playing.id,
      color: CARD_COLOR.YELLOW,
    })

    assert.deepInclude(result.value, { status: 409, code: 'MATCH_TEAMS_PENDING' })
  })

  test('atleta de fora da partida é 422 STUDENT_NOT_IN_MATCH e não grava', async ({ assert }) => {
    const { cards, useCase, semi, outsider } = await setup()

    const result = await useCase.execute({
      matchId: semi.id,
      studentId: outsider.id,
      color: CARD_COLOR.YELLOW,
    })

    assert.deepInclude(result.value, { status: 422, code: 'STUDENT_NOT_IN_MATCH' })
    const page = await cards.paginate({ page: 1, perPage: 10 })
    assert.equal(page.meta.total, 0)
  })

  test('atleta inexistente é 422 STUDENT_NOT_IN_MATCH', async ({ assert }) => {
    const { useCase, semi } = await setup()

    const result = await useCase.execute({
      matchId: semi.id,
      studentId: randomUUID(),
      color: CARD_COLOR.YELLOW,
    })

    assert.deepInclude(result.value, { status: 422, code: 'STUDENT_NOT_IN_MATCH' })
  })
})
