import { AdministratorBracketPaginateResponse } from './brackets.response.js'
import { CATEGORIES } from '../../enums/category.js'
import { MATCH_PHASES } from '../../enums/match-phase.js'
import { MATCH_STATUSES } from '../../enums/match-status.js'
import { z } from '../../validator.js'

/**
 * A partida como a API devolve (`_standards/architecture.md` §10). A tabela de
 * jogos mostra só o que a vitrine pode ver da turma; a partida que o painel
 * acaba de mexer leva a turma inteira.
 */
const iso = () => z.iso.datetime({ offset: true })

/** A turma como a tabela de jogos a mostra: sem conselheiro nem representante. */
const publicClassroom = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.enum(CATEGORIES),
})

const fullClassroom = z.object({
  id: z.uuid(),
  name: z.string(),
  grade: z.number().int(),
  category: z.enum(CATEGORIES),
  advisorId: z.uuid().nullable(),
  representativeId: z.uuid().nullable(),
  createdAt: iso(),
  updatedAt: iso().nullable(),
})

/** O time é a turma dentro da competição: o nome no placar vem da turma. */
function teamOf<TClassroom extends z.ZodType>(classroom: TClassroom) {
  return z.object({
    id: z.uuid(),
    bracketId: z.uuid(),
    classroomId: z.uuid(),
    createdAt: iso(),
    updatedAt: iso().nullable(),
    classroom,
  })
}

const matchFields = {
  id: z.uuid(),
  bracketId: z.uuid(),
  phase: z.enum(MATCH_PHASES),
  round: z.number().int(),
  position: z.number().int(),
  status: z.enum(MATCH_STATUSES),
  homeTeamId: z.uuid().nullable(),
  awayTeamId: z.uuid().nullable(),
  homeScore: z.number().int().nullable(),
  awayScore: z.number().int().nullable(),
  winnerTeamId: z.uuid().nullable(),
  scheduledAt: iso().nullable(),
  location: z.string().nullable(),
  createdAt: iso(),
  updatedAt: iso().nullable(),
}

/** O time com a turma inteira: o cartão e a partida mexida reaproveitam. */
export const AdministratorMatchTeamResponse = teamOf(fullClassroom)

/** A tabela de jogos: os dois times já definidos, a turma só com o que é público. */
export const AdministratorMatchPaginateResponse = z.object({
  ...matchFields,
  homeTeam: teamOf(publicClassroom),
  awayTeam: teamOf(publicClassroom),
  bracket: AdministratorBracketPaginateResponse,
})

/** A partida agendada ou com placar: ainda pode faltar um time. */
export const AdministratorMatchUpdateResponse = z.object({
  ...matchFields,
  homeTeam: AdministratorMatchTeamResponse.nullable(),
  awayTeam: AdministratorMatchTeamResponse.nullable(),
  bracket: AdministratorBracketPaginateResponse,
})

export const AdministratorMatchScoreResponse = AdministratorMatchUpdateResponse

export const AdministratorMatchUnscoreResponse =
  AdministratorMatchUpdateResponse

/**
 * Os atletas que podem levar cartão numa partida: os alunos das duas turmas,
 * com os inscritos na modalidade marcados - são eles que entram em quadra.
 */
export const AdministratorMatchAthletesResponse = z.object({
  teams: z.array(
    z.object({
      teamId: z.uuid(),
      classroomId: z.uuid(),
      name: z.string(),
      students: z.array(
        z.object({ id: z.uuid(), name: z.string(), enrolled: z.boolean() }),
      ),
    }),
  ),
})

export type AdministratorMatchTeamResponse = z.infer<
  typeof AdministratorMatchTeamResponse
>

export type AdministratorMatchPaginateResponse = z.infer<
  typeof AdministratorMatchPaginateResponse
>

export type AdministratorMatchUpdateResponse = z.infer<
  typeof AdministratorMatchUpdateResponse
>

export type AdministratorMatchScoreResponse = z.infer<
  typeof AdministratorMatchScoreResponse
>

export type AdministratorMatchUnscoreResponse = z.infer<
  typeof AdministratorMatchUnscoreResponse
>

export type AdministratorMatchAthletesResponse = z.infer<
  typeof AdministratorMatchAthletesResponse
>
