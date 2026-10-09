import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { Categories, MatchPhases } from '#core/entity'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
  type Session,
} from '../helpers.ts'

/**
 * O caminho dos jogos de ponta a ponta, por HTTP: turmas, alunos, inscrições,
 * sorteio, placar, mata-mata e o site.
 *
 * Um arquivo só porque as etapas dependem umas das outras - o sorteio precisa
 * de inscrição, o mata-mata precisa de placar -, e espalhá-las repetiria toda a
 * montagem em cada spec.
 */

async function createSport(client: ApiClient, admin: Session, minAthletes = 1) {
  const response = await client
    .post('/administrator/sports')
    .cookies(admin)
    .json({ name: 'Futsal', minAthletes, maxAthletes: 3 })

  response.assertStatus(201)

  return body(response)
}

/** Cria `total` turmas do 6º ao 9º, cada uma com um aluno inscrito na modalidade. */
async function enrolledClassrooms(
  client: ApiClient,
  admin: Session,
  sportId: string,
  total: number
) {
  const ids: string[] = []

  for (let index = 0; index < total; index++) {
    const classroom = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({
        name: `${6 + (index % 4)}º ${String.fromCharCode(65 + index)}`,
        grade: 6 + (index % 4),
      })

    classroom.assertStatus(201)

    const student = await client
      .post('/advisor/students')
      .cookies(admin)
      .json({ classroomId: body(classroom).id, name: `Aluno ${index}` })

    student.assertStatus(201)

    const enrollment = await client
      .put('/advisor/enrollments')
      .cookies(admin)
      .json({ classroomId: body(classroom).id, sportId, studentIds: [body(student).id] })

    enrollment.assertStatus(200)
    ids.push(body(classroom).id)
  }

  return ids
}

async function draw(client: ApiClient, admin: Session, sportId: string) {
  const response = await client
    .post('/administrator/brackets')
    .cookies(admin)
    .json({ sportId, category: Categories.F2 })

  response.assertStatus(201)

  return body(response)
}

async function scoreAll(client: ApiClient, admin: Session, bracketId: string, phase: string) {
  const detail = await client.get(`/administrator/brackets/${bracketId}`).cookies(admin)

  for (const match of body(detail).matches) {
    if (match.phase !== phase || !match.homeTeamId || !match.awayTeamId) continue

    const response = await client
      .put(`/administrator/matches/${match.id}/score`)
      .cookies(admin)
      .json({ homeScore: 2, awayScore: 1 })

    response.assertStatus(200)
  }
}

test.group('jogos > turmas', (group) => {
  group.each.setup(() => resetDatabase())

  test('a categoria sai do ano, e nome repetido é 409', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)

    const quinto = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '5º A', grade: 5 })
    const sexto = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '6º A', grade: 6 })
    const repetido = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '6º A', grade: 6 })

    assert.equal(body(quinto).category, Categories.F1)
    assert.equal(body(sexto).category, Categories.F2)
    repetido.assertStatus(409)
    assert.equal(body(repetido).code, 'CLASSROOM_ALREADY_EXISTS')
  })

  test('conselheiro precisa ter o papel de conselheiro', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const { user } = await signInWithFactory(client, 'representative')

    const response = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '7º A', grade: 7, advisorId: user.id })

    response.assertStatus(422)
    assert.equal(body(response).code, 'ADVISOR_NOT_FOUND')
  })
})

test.group('jogos > conselheiro e representante', (group) => {
  group.each.setup(() => resetDatabase())

  test('o conselheiro cuida só da própria turma', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const dono = await signInWithFactory(client)
    const outro = await signInWithFactory(client)

    const classroom = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '8º B', grade: 8, advisorId: dono.user.id })

    const proprio = await client
      .post('/advisor/students')
      .cookies(dono.session)
      .json({ classroomId: body(classroom).id, name: 'Maria' })
    const alheio = await client
      .post('/advisor/students')
      .cookies(outro.session)
      .json({ classroomId: body(classroom).id, name: 'João' })
    const lista = await client.get('/advisor/classrooms').cookies(outro.session)

    proprio.assertStatus(201)
    alheio.assertStatus(404)
    assert.lengthOf(body(lista).data, 0)
  })

  test('o representante monta a lista da própria turma, dentro do limite', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const representante = await signInWithFactory(client, 'representative')
    const sport = await createSport(client, admin)

    const classroom = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '9º C', grade: 9, representativeId: representante.user.id })

    const alunos: string[] = []
    for (const name of ['Ana', 'Bia', 'Caio', 'Davi']) {
      const student = await client
        .post('/advisor/students')
        .cookies(admin)
        .json({ classroomId: body(classroom).id, name })
      alunos.push(body(student).id)
    }

    const dentro = await client
      .put('/representative/enrollments')
      .cookies(representante.session)
      .json({ sportId: sport.id, studentIds: alunos.slice(0, 3) })
    const acima = await client
      .put('/representative/enrollments')
      .cookies(representante.session)
      .json({ sportId: sport.id, studentIds: alunos })

    dentro.assertStatus(200)
    assert.lengthOf(
      body(dentro).students.filter((student: { sportIds: string[] }) =>
        student.sportIds.includes(sport.id)
      ),
      3
    )
    acima.assertStatus(422)
    assert.equal(body(acima).code, 'ENROLLMENT_LIMIT_EXCEEDED')
  })
})

test.group('jogos > sorteio e placar', (group) => {
  group.each.setup(() => resetDatabase())

  test('turma abaixo do mínimo não entra, e menos de duas turmas é 409', async ({
    client,
    assert,
  }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin, 2)
    await enrolledClassrooms(client, admin, sport.id, 3)

    const response = await client
      .post('/administrator/brackets')
      .cookies(admin)
      .json({ sportId: sport.id, category: Categories.F2 })

    response.assertStatus(409)
    assert.equal(body(response).code, 'NOT_ENOUGH_TEAMS')
  })

  test('com 3 turmas: uma de folga vai direto para a final', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 3)

    const bracket = await draw(client, admin, sport.id)
    const detail = await client.get(`/storefront/brackets/${bracket.id}`)
    const matches: Array<{ phase: string; homeTeamId: string | null; awayTeamId: string | null }> =
      body(detail).matches

    const semis = matches.filter((match) => match.phase === MatchPhases.SEMI)
    const final = matches.find((match) => match.phase === MatchPhases.FINAL)

    assert.equal(body(detail).status, 'KNOCKOUT')
    // Chave de 4 com uma folga: só uma semifinal de verdade.
    assert.lengthOf(semis, 1)
    // O time de folga já está na final, à espera do vencedor da semifinal.
    assert.isString(final?.homeTeamId)
    assert.isNull(final?.awayTeamId)
  })

  test('o sorteio trava as inscrições da modalidade na categoria', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    const [classroomId] = await enrolledClassrooms(client, admin, sport.id, 2)
    await draw(client, admin, sport.id)

    const response = await client
      .put('/advisor/enrollments')
      .cookies(admin)
      .json({ classroomId, sportId: sport.id, studentIds: [] })

    response.assertStatus(409)
    assert.equal(body(response).code, 'ENROLLMENT_LOCKED')
  })

  test('do sorteio ao campeão: o vencedor avança sozinho', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 4)

    const bracket = await draw(client, admin, sport.id)
    await scoreAll(client, admin, bracket.id, MatchPhases.SEMI)

    const antes = await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin)
    const final = body(antes).matches.find(
      (match: { phase: string }) => match.phase === MatchPhases.FINAL
    )
    assert.isString(final.homeTeamId)
    assert.isString(final.awayTeamId)

    // Empate exige quem venceu nos pênaltis.
    const semVencedor = await client
      .put(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 1 })
    semVencedor.assertStatus(422)
    assert.equal(body(semVencedor).code, 'MATCH_WINNER_REQUIRED')

    const penaltis = await client
      .put(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
      .json({ homeScore: 1, awayScore: 1, winnerTeamId: final.awayTeamId })
    penaltis.assertStatus(200)

    const depois = await client.get(`/storefront/brackets/${bracket.id}`)
    assert.equal(body(depois).status, 'FINISHED')
    assert.equal(body(depois).championTeamId, final.awayTeamId)

    // Trocar o vencedor de uma semifinal depois da final jogada reescreveria a final.
    const semi = body(depois).matches.find(
      (match: { phase: string; winnerTeamId: string; homeTeamId: string }) =>
        match.phase === MatchPhases.SEMI && match.winnerTeamId === match.homeTeamId
    )
    const virada = await client
      .put(`/administrator/matches/${semi.id}/score`)
      .cookies(admin)
      .json({ homeScore: 0, awayScore: 5 })
    virada.assertStatus(409)
    assert.equal(body(virada).code, 'NEXT_MATCH_PLAYED')
  })

  test('o representante só acrescenta; quem tira é o conselheiro', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const representante = await signInWithFactory(client, 'representative')
    const sport = await createSport(client, admin)
    const classroom = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '7º C', grade: 7, representativeId: representante.user.id })
    const ids: string[] = []
    for (const name of ['Ana', 'Bia']) {
      const student = await client
        .post('/advisor/students')
        .cookies(admin)
        .json({ classroomId: body(classroom).id, name })
      ids.push(body(student).id)
    }

    const acrescenta = await client
      .put('/representative/enrollments')
      .cookies(representante.session)
      .json({ sportId: sport.id, studentIds: ids })
    const tira = await client
      .put('/representative/enrollments')
      .cookies(representante.session)
      .json({ sportId: sport.id, studentIds: [ids[0]] })
    const conselheiroTira = await client
      .put('/advisor/enrollments')
      .cookies(admin)
      .json({ classroomId: body(classroom).id, sportId: sport.id, studentIds: [ids[0]] })

    acrescenta.assertStatus(200)
    tira.assertStatus(403)
    assert.equal(body(tira).code, 'ENROLLMENT_REMOVAL_FORBIDDEN')
    conselheiroTira.assertStatus(200)
  })

  test('o site lista os jogos sem sessão', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 3)
    await draw(client, admin, sport.id)

    const response = await client.get('/storefront/matches').qs({ status: 'SCHEDULED' })

    response.assertStatus(200)
    // 3 turmas: uma semifinal de verdade e a final, que já tem o time de folga
    // mas não o adversário - por isso não entra na tabela de jogos.
    assert.lengthOf(body(response).data, 1)
    assert.isString(body(response).data[0].homeTeam.classroom.name)
  })
})
