import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import {
  BRACKET_STATUS,
  CATEGORY,
  MATCH_PHASE,
  MATCH_STATUS,
  type AdministratorSportShowResponse,
} from '@interclasse/shared'

import { BracketLucidRepository } from './bracket.lucid.repository.ts'
import {
  BracketMemoryRepository,
  type ClassroomView,
  type StudentView,
} from './bracket.memory.repository.ts'
import type { BracketRepository } from './bracket.repository.ts'

import { resetDatabase } from '#tests/helpers'
import { Bracket } from '#domain/bracket/bracket.entity'

/**
 * O mesmo contrato nas duas implementações (`_standards/domain.md` §5.4): é o
 * que garante que o unitário do use-case, que roda na de memória, não passa
 * contra um dublê que mente.
 *
 * Modalidade, turma, aluno e inscrição são o que a chave só lê: cada
 * implementação os arranja do seu jeito (linhas no banco, ou o mapa da memória).
 */
type Harness = {
  readonly repository: BracketRepository
  sport(sport: AdministratorSportShowResponse): Promise<void>
  classroom(classroom: ClassroomView): Promise<void>
  student(student: StudentView, enrolledIn: ReadonlyArray<string>): Promise<void>
}

class LucidHarness implements Harness {
  constructor(readonly repository: BracketRepository) {}

  async sport(sport: AdministratorSportShowResponse): Promise<void> {
    await db.table('sports').insert({
      id: sport.id,
      name: sport.name,
      slug: sport.slug,
      min_athletes: sport.minAthletes,
      max_athletes: sport.maxAthletes,
      created_at: new Date(sport.createdAt),
    })
  }

  async classroom(classroom: ClassroomView): Promise<void> {
    await db.table('classrooms').insert({
      id: classroom.id,
      name: classroom.name,
      grade: classroom.grade,
      category: classroom.category,
      created_at: classroom.createdAt,
    })
  }

  async student(student: StudentView, enrolledIn: ReadonlyArray<string>): Promise<void> {
    await db.table('students').insert({
      id: student.id,
      name: student.name,
      classroom_id: student.classroomId,
      created_at: new Date(),
    })
    for (const sportId of enrolledIn)
      await db.table('enrollments').insert({
        student_id: student.id,
        sport_id: sportId,
        created_at: new Date(),
      })
  }
}

class MemoryHarness implements Harness {
  constructor(readonly repository: BracketMemoryRepository) {}

  async sport(sport: AdministratorSportShowResponse): Promise<void> {
    this.repository.withSport(sport)
  }

  async classroom(classroom: ClassroomView): Promise<void> {
    this.repository.withClassroom(classroom)
  }

  async student(student: StudentView, enrolledIn: ReadonlyArray<string>): Promise<void> {
    this.repository.withStudent(student, enrolledIn)
  }
}

const IMPLEMENTATIONS = {
  lucid: async () => new LucidHarness(await app.container.make(BracketLucidRepository)),
  memory: async () => new MemoryHarness(new BracketMemoryRepository()),
} satisfies Record<string, () => Promise<Harness>>

const NOW = new Date('2026-10-29T12:00:00.000Z')
const LATER = new Date('2026-10-29T15:00:00.000Z')

function sportView(name: string, minAthletes = 1): AdministratorSportShowResponse {
  return {
    id: randomUUID(),
    name,
    slug: name.toLowerCase(),
    minAthletes,
    maxAthletes: 10,
    createdAt: NOW.toISOString(),
    updatedAt: null,
  }
}

function classroomView(name: string, grade = 8): ClassroomView {
  return {
    id: randomUUID(),
    name,
    grade,
    category: CATEGORY.F2,
    advisorId: null,
    representativeId: null,
    createdAt: NOW,
    updatedAt: null,
  }
}

/** A chave gravada, como a entidade a vê; `undefined` se não há. */
async function savedOf(harness: Harness, id: string) {
  const bracket = await harness.repository.findById(id)

  return bracket?.snapshot()
}

/** A modalidade, `names.length` turmas com um atleta inscrito cada, e o sorteio gravado. */
async function drawn(harness: Harness, names: string[], sportName = 'Futsal') {
  const sport = sportView(sportName)
  await harness.sport(sport)

  const classrooms = names.map((name) => classroomView(name))
  for (const classroom of classrooms) {
    await harness.classroom(classroom)
    await harness.student(
      { id: randomUUID(), name: `Aluno ${classroom.name}`, classroomId: classroom.id },
      [sport.id],
    )
  }

  const result = Bracket.draw({
    id: randomUUID(),
    sportId: sport.id,
    category: CATEGORY.F2,
    minAthletes: 1,
    classroomIds: classrooms.map((classroom) => classroom.id),
    newId: () => randomUUID(),
    random: () => 0,
    now: NOW,
  })
  if (result.isLeft()) throw new Error('sorteio inválido no arranjo')

  await harness.repository.save(result.value)

  return { sport, classrooms, bracket: result.value }
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`BracketRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('save e findById devolvem a mesma chave, com times e partidas', async ({ assert }) => {
      const harness = await make()
      const { bracket } = await drawn(harness, ['8º A', '8º B', '8º C'])

      const found = await savedOf(harness, bracket.id)
      const byId = <T extends { id: string }>(items: T[] | undefined) =>
        [...(items ?? [])].sort((a, b) => a.id.localeCompare(b.id))

      // Os times não têm ordem natural: o contrato é o conjunto.
      assert.deepEqual(byId(found?.teams), byId(bracket.snapshot().teams))
      assert.deepEqual(found?.matches, bracket.snapshot().matches)
      assert.deepEqual(
        { ...found, teams: [], matches: [] },
        { ...bracket.snapshot(), teams: [], matches: [] },
      )
    })

    test('findById de id inexistente é null', async ({ assert }) => {
      const harness = await make()

      assert.isNull(await harness.repository.findById(randomUUID()))
    })

    test('acha a chave pela partida e pela modalidade com a categoria', async ({ assert }) => {
      const harness = await make()
      const { bracket, sport } = await drawn(harness, ['8º A', '8º B'])
      const [match] = bracket.snapshot().matches

      const byMatch = await harness.repository.findByMatchId(match?.id ?? '')
      const bySport = await harness.repository.findBySportAndCategory(sport.id, CATEGORY.F2)

      assert.equal(byMatch?.id, bracket.id)
      assert.equal(bySport?.id, bracket.id)
      assert.isNull(await harness.repository.findBySportAndCategory(sport.id, CATEGORY.F1))
      assert.isNull(await harness.repository.findByMatchId(randomUUID()))
    })

    test('save do placar grava o vencedor na seguinte e só toca o que mudou', async ({
      assert,
    }) => {
      const harness = await make()
      const { bracket } = await drawn(harness, ['8º A', '8º B', '8º C', '8º D'])
      const matches = bracket.snapshot().matches
      const semi = matches.find((m) => m.phase === MATCH_PHASE.SEMI && m.position === 0)
      const other = matches.find((m) => m.phase === MATCH_PHASE.SEMI && m.position === 1)
      if (!semi || !other) throw new Error('semifinais ausentes no arranjo')

      bracket.score(semi.id, { homeScore: 3, awayScore: 1 }, LATER)
      await harness.repository.save(bracket)
      const found = await savedOf(harness, bracket.id)

      const saved = found?.matches.find((m) => m.id === semi.id)
      const final = found?.matches.find((m) => m.phase === MATCH_PHASE.FINAL)
      const untouched = found?.matches.find((m) => m.id === other.id)
      assert.deepInclude(saved, {
        status: MATCH_STATUS.FINISHED,
        homeScore: 3,
        awayScore: 1,
        winnerTeamId: semi.homeTeamId,
      })
      assert.equal(final?.homeTeamId, semi.homeTeamId)
      assert.deepEqual(untouched?.updatedAt, NOW)
    })

    test('save da final grava a chave encerrada, e desfazer a reabre', async ({ assert }) => {
      const harness = await make()
      const { bracket } = await drawn(harness, ['8º A', '8º B'])
      const final = bracket.snapshot().matches[0]
      if (!final) throw new Error('final ausente no arranjo')

      bracket.score(final.id, { homeScore: 1, awayScore: 0 }, LATER)
      await harness.repository.save(bracket)
      const finished = await savedOf(harness, bracket.id)
      assert.equal(finished?.status, BRACKET_STATUS.FINISHED)

      bracket.unscore(final.id, LATER)
      await harness.repository.save(bracket)
      const reopened = await savedOf(harness, bracket.id)
      assert.equal(reopened?.status, BRACKET_STATUS.KNOCKOUT)
      assert.equal(reopened?.matches[0]?.status, MATCH_STATUS.SCHEDULED)
    })

    test('save da agenda grava data e local', async ({ assert }) => {
      const harness = await make()
      const { bracket } = await drawn(harness, ['8º A', '8º B'])
      const match = bracket.snapshot().matches[0]
      if (!match) throw new Error('partida ausente no arranjo')

      bracket.schedule(match.id, { scheduledAt: LATER, location: 'Quadra 1' }, LATER)
      await harness.repository.save(bracket)
      const found = await savedOf(harness, bracket.id)
      const saved = found?.matches[0]

      assert.deepEqual(saved?.scheduledAt, LATER)
      assert.equal(saved?.location, 'Quadra 1')
    })

    test('delete leva a chave com times e partidas', async ({ assert }) => {
      const harness = await make()
      const { bracket } = await drawn(harness, ['8º A', '8º B'])

      await harness.repository.delete(bracket)

      assert.isNull(await harness.repository.findById(bracket.id))
    })

    test('eligibleClassroomIds só traz a turma com atletas no mínimo', async ({ assert }) => {
      const harness = await make()
      const sport = sportView('Vôlei', 2)
      await harness.sport(sport)
      const full = classroomView('8º A')
      const short = classroomView('8º B')
      await harness.classroom(full)
      await harness.classroom(short)
      await harness.student({ id: randomUUID(), name: 'A1', classroomId: full.id }, [sport.id])
      await harness.student({ id: randomUUID(), name: 'A2', classroomId: full.id }, [sport.id])
      await harness.student({ id: randomUUID(), name: 'B1', classroomId: short.id }, [sport.id])

      const ids = await harness.repository.eligibleClassroomIds(sport.id, CATEGORY.F2, 2)

      assert.deepEqual(ids, [full.id])
    })

    test('preview conta os atletas de cada turma e avisa se já sorteou', async ({ assert }) => {
      const harness = await make()
      const sport = sportView('Handebol', 2)
      await harness.sport(sport)
      const a = classroomView('8º A', 8)
      const b = classroomView('9º B', 9)
      await harness.classroom(a)
      await harness.classroom(b)
      await harness.student({ id: randomUUID(), name: 'A1', classroomId: a.id }, [sport.id])
      await harness.student({ id: randomUUID(), name: 'A2', classroomId: a.id }, [sport.id])
      await harness.student({ id: randomUUID(), name: 'B1', classroomId: b.id }, [])

      const preview = await harness.repository.preview(sport.id, CATEGORY.F2)

      assert.deepEqual(preview, {
        minAthletes: 2,
        maxTeams: 16,
        drawn: false,
        classrooms: [
          { id: a.id, name: '8º A', athletes: 2, eligible: true },
          { id: b.id, name: '9º B', athletes: 0, eligible: false },
        ],
      })
      assert.isNull(await harness.repository.preview(randomUUID(), CATEGORY.F2))
    })

    test('detail traz as partidas com o nome das turmas e a campeã', async ({ assert }) => {
      const harness = await make()
      const { bracket, sport } = await drawn(harness, ['8º A', '8º B'])
      const final = bracket.snapshot().matches[0]
      if (!final) throw new Error('final ausente no arranjo')
      bracket.score(final.id, { homeScore: 2, awayScore: 0 }, LATER)
      await harness.repository.save(bracket)

      const detail = await harness.repository.detail(bracket.id)

      assert.equal(detail?.sport.name, sport.name)
      assert.equal(detail?.status, BRACKET_STATUS.FINISHED)
      assert.equal(detail?.championTeamId, final.homeTeamId)
      assert.sameMembers(
        [detail?.matches[0]?.homeName, detail?.matches[0]?.awayName],
        ['8º A', '8º B'],
      )
      assert.isNull(await harness.repository.detail(randomUUID()))
    })

    test('paginate filtra e ordena pela mais nova ou pelo nome da modalidade', async ({
      assert,
    }) => {
      const harness = await make()
      await drawn(harness, ['8º A', '8º B'], 'Vôlei')
      await drawn(harness, ['9º A', '9º B'], 'Basquete')

      const bySport = await harness.repository.paginate({
        page: 1,
        perPage: 10,
        order: 'sport-name',
      })
      const finished = await harness.repository.paginate({
        page: 1,
        perPage: 10,
        status: BRACKET_STATUS.FINISHED,
        order: 'newest',
      })

      assert.deepEqual(
        bySport.data.map((item) => item.sport.name),
        ['Basquete', 'Vôlei'],
      )
      assert.equal(bySport.meta.total, 2)
      assert.equal(finished.meta.total, 0)
    })

    test('paginateMatches filtra por turma e ignora a partida sem os dois times', async ({
      assert,
    }) => {
      const harness = await make()
      const { classrooms } = await drawn(harness, ['8º A', '8º B', '8º C', '8º D'])

      const all = await harness.repository.paginateMatches({
        page: 1,
        perPage: 10,
        order: 'schedule',
      })
      const ofClassroom = await harness.repository.paginateMatches({
        page: 1,
        perPage: 10,
        classroomId: classrooms[0]?.id,
        order: 'schedule',
      })

      // Duas semifinais com os dois times; a final ainda não tem adversário.
      assert.equal(all.meta.total, 2)
      assert.equal(ofClassroom.meta.total, 1)
      assert.deepEqual(Object.keys(all.data[0]?.homeTeam.classroom ?? {}).sort(), [
        'category',
        'id',
        'name',
      ])
    })

    test('findMatchResponse traz a partida com as turmas inteiras e a chave', async ({
      assert,
    }) => {
      const harness = await make()
      const { bracket, sport } = await drawn(harness, ['8º A', '8º B'])
      const match = bracket.snapshot().matches[0]

      const response = await harness.repository.findMatchResponse(match?.id ?? '')

      assert.equal(response?.bracket.sport.name, sport.name)
      assert.sameMembers(
        [response?.homeTeam?.classroom.name, response?.awayTeam?.classroom.name],
        ['8º A', '8º B'],
      )
      assert.property(response?.homeTeam?.classroom, 'grade')
      assert.isNull(await harness.repository.findMatchResponse(randomUUID()))
    })

    test('matchAthletes lista os alunos das duas turmas, os inscritos primeiro', async ({
      assert,
    }) => {
      const harness = await make()
      const { bracket, sport, classrooms } = await drawn(harness, ['8º A', '8º B'])
      const home = classrooms[0]
      if (!home) throw new Error('turma ausente no arranjo')
      await harness.student(
        { id: randomUUID(), name: 'Aaa fora da lista', classroomId: home.id },
        [],
      )
      await harness.student({ id: randomUUID(), name: 'Zzz na lista', classroomId: home.id }, [
        sport.id,
      ])
      const match = bracket.snapshot().matches[0]

      const athletes = await harness.repository.matchAthletes(match?.id ?? '')

      const team = athletes?.teams.find((candidate) => candidate.classroomId === home.id)
      assert.lengthOf(athletes?.teams ?? [], 2)
      assert.deepEqual(
        team?.students.map((student) => [student.name, student.enrolled]),
        [
          ['Aluno 8º A', true],
          ['Zzz na lista', true],
          ['Aaa fora da lista', false],
        ],
      )
      assert.isNull(await harness.repository.matchAthletes(randomUUID()))
    })

    test('findSport e lockSport leem a modalidade', async ({ assert }) => {
      const harness = await make()
      const { sport } = await drawn(harness, ['8º A', '8º B'])

      const found = await harness.repository.findSport(sport.id)
      const locked = await harness.repository.lockSport(sport.id)

      assert.equal(found?.name, sport.name)
      assert.equal(locked?.name, sport.name)
      assert.isNull(await harness.repository.findSport(randomUUID()))
    })
  })
}
