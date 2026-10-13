import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

import { Categories, MatchPhases } from '#core/entity'
import {
  authenticateAsAdministrator,
  body,
  resetDatabase,
  signInWithFactory,
  type Session,
} from '#tests/helpers'

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
  total: number,
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
      (match: { phase: string }) => match.phase === MatchPhases.FINAL,
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
        match.phase === MatchPhases.SEMI && match.winnerTeamId === match.homeTeamId,
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
    // Conta de conselheiro e de representante não sai no site anônimo.
    assert.notProperty(body(response).data[0].homeTeam.classroom, 'advisorId')
    assert.notProperty(body(response).data[0].homeTeam.classroom, 'representativeId')
  })

  test('placar errado se desfaz, e a final desfeita reabre a chave', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 4)
    const bracket = await draw(client, admin, sport.id)
    await scoreAll(client, admin, bracket.id, MatchPhases.SEMI)
    await scoreAll(client, admin, bracket.id, MatchPhases.FINAL)

    const jogada = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    const semi = jogada.matches.find((match: { phase: string }) => match.phase === MatchPhases.SEMI)
    const final = jogada.matches.find(
      (match: { phase: string }) => match.phase === MatchPhases.FINAL,
    )

    // A semifinal não sai enquanto a final, que depende dela, tem placar.
    const cedo = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    cedo.assertStatus(409)
    assert.equal(body(cedo).code, 'NEXT_MATCH_PLAYED')

    const desfazFinal = await client
      .delete(`/administrator/matches/${final.id}/score`)
      .cookies(admin)
    desfazFinal.assertStatus(200)
    assert.equal(body(desfazFinal).status, 'SCHEDULED')

    const desfazSemi = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    desfazSemi.assertStatus(200)

    const depois = body(await client.get(`/storefront/brackets/${bracket.id}`))
    const finalDepois = depois.matches.find(
      (match: { phase: string }) => match.phase === MatchPhases.FINAL,
    )
    assert.equal(depois.status, 'KNOCKOUT')
    assert.isNull(depois.championTeamId)
    // O vencedor da semifinal desfeita saiu da vaga dele na final.
    assert.isTrue(finalDepois.homeTeamId === null || finalDepois.awayTeamId === null)

    const deNovo = await client.delete(`/administrator/matches/${semi.id}/score`).cookies(admin)
    deNovo.assertStatus(409)
    assert.equal(body(deNovo).code, 'MATCH_NOT_PLAYED')
  })

  test('chave com placar não se apaga; sem placar, sim', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    await enrolledClassrooms(client, admin, sport.id, 4)
    const bracket = await draw(client, admin, sport.id)
    await scoreAll(client, admin, bracket.id, MatchPhases.SEMI)

    const recusa = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)
    recusa.assertStatus(409)
    assert.equal(body(recusa).code, 'BRACKET_HAS_RESULTS')

    const jogada = body(await client.get(`/administrator/brackets/${bracket.id}`).cookies(admin))
    for (const match of jogada.matches) {
      if (match.status !== 'FINISHED') continue
      const desfaz = await client.delete(`/administrator/matches/${match.id}/score`).cookies(admin)
      desfaz.assertStatus(200)
    }

    const apaga = await client.delete(`/administrator/brackets/${bracket.id}`).cookies(admin)
    apaga.assertStatus(204)
  })

  test('o máximo não desce abaixo de uma lista já inscrita', async ({ client, assert }) => {
    const admin = await authenticateAsAdministrator(client)
    const sport = await createSport(client, admin)
    const classroom = await client
      .post('/administrator/classrooms')
      .cookies(admin)
      .json({ name: '8º Z', grade: 8 })
    const ids: string[] = []
    for (const name of ['Ana', 'Bia', 'Caio']) {
      const student = await client
        .post('/advisor/students')
        .cookies(admin)
        .json({ classroomId: body(classroom).id, name })
      ids.push(body(student).id)
    }
    await client
      .put('/advisor/enrollments')
      .cookies(admin)
      .json({ classroomId: body(classroom).id, sportId: sport.id, studentIds: ids })

    const abaixo = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(admin)
      .json({ maxAthletes: 2 })
    abaixo.assertStatus(409)
    assert.equal(body(abaixo).code, 'SPORT_ROSTER_ABOVE_LIMIT')

    const igual = await client
      .put(`/administrator/sports/${sport.id}`)
      .cookies(admin)
      .json({ maxAthletes: 3 })
    igual.assertStatus(200)
  })
})
