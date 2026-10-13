import type { ApiClient } from '@japa/api-client'

import type Classroom from '#models/classroom'
import type Sport from '#models/sport'
import { BracketFactory } from '#database/factories/bracket.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { TeamFactory } from '#database/factories/team.factory'
import { categoryOf } from '#features/administrator/_shared.classroom'
import { signInWithFactory } from '#tests/helpers'

/**
 * Um professor conselheiro com sessão e a turma que ele aconselha. É o ponto de
 * partida de toda spec de `/advisor`: a policy só deixa passar a turma do
 * próprio conselheiro.
 */
export async function signInAsAdvisorOfClassroom(client: ApiClient) {
  const { user, session } = await signInWithFactory(client)
  const classroom = await ClassroomFactory.merge({ advisorId: user.id }).create()

  return { user, session, classroom }
}

/**
 * Um representante com sessão e a turma que ele representa. Em
 * `/representative` a turma sai da sessão, então o vínculo é o que a rota lê.
 */
export async function signInAsRepresentativeOfClassroom(client: ApiClient) {
  const { user, session } = await signInWithFactory(client, 'representative')
  const classroom = await ClassroomFactory.merge({ representativeId: user.id }).create()

  return { user, session, classroom }
}

/**
 * Fecha a modalidade na categoria da turma, como o sorteio faria: a chave
 * existir é o que trava as inscrições.
 */
export function drawSport(sport: Sport, classroom: Classroom) {
  return BracketFactory.merge({ sportId: sport.id, category: classroom.category }).create()
}

/**
 * Uma turma já numa chave sorteada: a linha de `teams` que a liga a uma chave.
 *
 * É o estado que trava `delete` e a troca de categoria em `update`. Não passa
 * pelo sorteio, que exige modalidade, inscrições e outras turmas: para a guarda
 * basta a turma ter um time.
 */
export async function drawnClassroom(grade = 7) {
  const classroom = await ClassroomFactory.merge({ grade, category: categoryOf(grade) }).create()
  const bracket = await BracketFactory.with('sport').create()

  await TeamFactory.merge({ bracketId: bracket.id, classroomId: classroom.id }).create()

  return classroom
}
