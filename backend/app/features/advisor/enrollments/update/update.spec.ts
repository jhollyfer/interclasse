import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
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
