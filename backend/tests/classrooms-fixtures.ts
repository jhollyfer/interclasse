import type { ApiClient } from '@japa/api-client'

import type Classroom from '#models/classroom'
import type Sport from '#models/sport'
import { BracketFactory } from '#database/factories/bracket.factory'
import { ClassroomFactory } from '#database/factories/classroom.factory'
import { MatchFactory } from '#database/factories/match.factory'
import { StudentFactory } from '#database/factories/student.factory'
import { TeamFactory } from '#database/factories/team.factory'
import { Classroom as ClassroomEntity } from '#domain/classroom/classroom.entity'
import { signInWithFactory } from '#tests/http-fixtures'

/** Uma turma com `total` alunos, no lugar da relação inversa que o model não declara. */
export async function classroomWithStudents(total: number): Promise<Classroom> {
  const classroom = await ClassroomFactory.create()
  await StudentFactory.merge({ classroomId: classroom.id }).createMany(total)

  return classroom
}

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
  const classroom = await ClassroomFactory.merge({
    grade,
    category: ClassroomEntity.categoryOf(grade),
  }).create()
  const bracket = await BracketFactory.with('sport').create()

  await TeamFactory.merge({ bracketId: bracket.id, classroomId: classroom.id }).create()

  return classroom
}

/**
 * Uma partida com os dois times definidos e um aluno em cada turma: o mínimo
 * para lançar cartão.
 */
export async function matchWithTeams() {
  const bracket = await BracketFactory.with('sport').create()
  const [home, away] = await ClassroomFactory.merge({
    grade: 3,
    category: ClassroomEntity.categoryOf(3),
  }).createMany(2)
  if (!home || !away) throw new Error('factory criou menos turmas que o pedido')
  const homeTeam = await TeamFactory.merge({ bracketId: bracket.id, classroomId: home.id }).create()
  const awayTeam = await TeamFactory.merge({ bracketId: bracket.id, classroomId: away.id }).create()
  const match = await MatchFactory.merge({
    bracketId: bracket.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
  }).create()
  const homeStudent = await StudentFactory.merge({ classroomId: home.id }).create()
  const awayStudent = await StudentFactory.merge({ classroomId: away.id }).create()

  return { bracket, match, home, away, homeTeam, awayTeam, homeStudent, awayStudent }
}
