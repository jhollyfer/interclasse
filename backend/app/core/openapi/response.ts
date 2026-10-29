import {
  BRACKET_STATUSES,
  CARD_COLORS,
  CATEGORIES,
  MATCH_PHASES,
  MATCH_STATUSES,
} from '@interclasse/shared'
import {
  AccountProfileShowResponse,
  AdministratorAnnouncementShowResponse,
  AdministratorClassroomPaginateResponse,
  AdministratorClassroomShowResponse,
  AdministratorEnrollmentRemovalShowResponse,
  AdministratorPhotoShowResponse,
  AdministratorReportShowResponse,
  AdministratorSiteShowResponse,
  AdministratorSportShowResponse,
  AdministratorUserShowResponse,
  AdvisorClassroomShowResponse,
  AdvisorEnrollmentShowResponse,
  AdvisorPhotoShowResponse,
  AdvisorStudentShowResponse,
  RepresentativeEnrollmentShowResponse,
  StoragesFileShowResponse,
  StorefrontAnnouncementShowResponse,
  StorefrontPhotoShowResponse,
  StorefrontSiteShowResponse,
  StorefrontSportShowResponse,
} from '@interclasse/shared'

import { vine } from '#core/validator'
import Bracket from '#models/bracket'
import Classroom from '#models/classroom'
import MatchCard from '#models/match-card'
import Match from '#models/match'
import Sport from '#models/sport'
import Student from '#models/student'
import Team from '#models/team'
import type { FeatureResponse, ModelResource } from '#core/openapi/types'

/**
 * O contrato de resposta de toda a API, num lugar só.
 *
 * A resposta de um endpoint é o **model do Lucid serializado**, com as relações
 * que o use-case precarregou aninhadas como o `preload` as entrega. Então o que
 * este arquivo declara não é a forma da resposta: é o model e a lista de
 * relações. O resto - nome, visibilidade e tipo de cada campo - sai do próprio
 * Lucid.
 *
 * Duas declarações do mesmo contrato divergem, e a divergência aparece como
 * documentação errada, nunca como erro de compilação: por isso o registro é
 * chaveado pelo **diretório da feature**, e relação que um `preload` novo
 * trouxer precisa ser acrescentada aqui para entrar no contrato.
 */

// ---------------------------------------------------------------------------
// Recursos reaproveitados
// ---------------------------------------------------------------------------

const CLASSROOM: ModelResource = {
  model: Classroom,
  enums: { category: CATEGORIES },
}

const STUDENT: ModelResource = {
  model: Student,
}

const SPORT: ModelResource = {
  model: Sport,
}

/** O time é a turma dentro da competição: o nome que sai no placar vem de `classroom`. */
const TEAM: ModelResource = {
  model: Team,
  relations: { classroom: CLASSROOM },
}

const BRACKET: ModelResource = {
  model: Bracket,
  enums: { category: CATEGORIES, status: BRACKET_STATUSES },
  relations: { sport: SPORT },
}

/** A partida com os dois times e a competição, que é o que a tabela de jogos mostra. */
const MATCH: ModelResource = {
  model: Match,
  enums: { phase: MATCH_PHASES, status: MATCH_STATUSES },
  relations: { homeTeam: TEAM, awayTeam: TEAM, bracket: BRACKET },
}

/** O cartão com o atleta, o time por que jogava e a partida. */
const MATCH_CARD: ModelResource = {
  model: MatchCard,
  enums: { color: CARD_COLORS },
  relations: { student: STUDENT, team: TEAM, match: MATCH },
}

// ---------------------------------------------------------------------------
// O que não deriva de model
// ---------------------------------------------------------------------------

/** Uma partida como a chave a desenha: os nomes das turmas já resolvidos. */
function bracketMatchFields() {
  return {
    id: vine.string().uuid(),
    phase: vine.enum(MATCH_PHASES),
    round: vine.number(),
    position: vine.number(),
    status: vine.enum(MATCH_STATUSES),
    homeTeamId: vine.string().uuid().nullable(),
    awayTeamId: vine.string().uuid().nullable(),
    homeName: vine.string().nullable(),
    awayName: vine.string().nullable(),
    homeScore: vine.number().nullable(),
    awayScore: vine.number().nullable(),
    winnerTeamId: vine.string().uuid().nullable(),
    scheduledAt: vine.string().nullable(),
    location: vine.string().nullable(),
  }
}

/**
 * A competição inteira, numa resposta: todas as partidas, de cada fase, com os
 * nomes das turmas já resolvidos. É a tela de chave do painel e do site.
 *
 * Declarada em VineJS porque o nome da turma vem de duas relações abaixo, e a
 * resposta é achatada para quem desenha a chave.
 */
export const BracketDetailResponse = vine.create({
  id: vine.string().uuid(),
  category: vine.enum(CATEGORIES),
  status: vine.enum(BRACKET_STATUSES),
  sport: vine.object({ id: vine.string().uuid(), name: vine.string(), slug: vine.string() }),
  /** Nulo até a chave terminar. */
  championTeamId: vine.string().uuid().nullable(),
  matches: vine.array(vine.object(bracketMatchFields())),
})

/**
 * Os atletas que podem levar cartão numa partida: os alunos das duas turmas,
 * com os inscritos na modalidade marcados - são eles que entram em quadra.
 */
export const MatchAthletesResponse = vine.create({
  teams: vine.array(
    vine.object({
      teamId: vine.string().uuid(),
      classroomId: vine.string().uuid(),
      name: vine.string(),
      students: vine.array(
        vine.object({
          id: vine.string().uuid(),
          name: vine.string(),
          enrolled: vine.boolean(),
        }),
      ),
    }),
  ),
})

/**
 * O que o sorteio faria agora: cada turma da categoria com quantos atletas tem
 * inscritos na modalidade, e se entra. É o que o diálogo mostra antes de
 * sortear, para a turma de fora não ser surpresa.
 */
export const DrawPreviewResponse = vine.create({
  minAthletes: vine.number(),
  maxTeams: vine.number(),
  /** Já existe chave desta modalidade nesta categoria. */
  drawn: vine.boolean(),
  classrooms: vine.array(
    vine.object({
      id: vine.string().uuid(),
      name: vine.string(),
      athletes: vine.number(),
      eligible: vine.boolean(),
    }),
  ),
})

// ---------------------------------------------------------------------------
// O registro, por diretório de feature
// ---------------------------------------------------------------------------

export const RESPONSES: Record<string, FeatureResponse> = {
  /**
   * `GET /account` e `PUT /account` respondem o mesmo recurso: a conta com o
   * avatar. As duas rotas declaradas por uma entrada só é o que impede a
   * resposta do `PUT` apagar do cache do cliente o que o `GET` acabou de
   * entregar. Sign-in, sign-out e refresh respondem `204` sem corpo, e por isso
   * não têm entrada.
   */
  'account/profile': AccountProfileShowResponse,

  /**
   * O arquivo cru, que é o que `paginate`, `show` e `POST /storages/:id/complete`
   * devolvem - o `paginate` embrulhado em `{ meta, data }`, que o gerador deriva
   * do retorno do use-case. As outras rotas do grupo fogem desta forma - as duas
   * do plano de upload declaram `StoragesFileUploadResponse`, e `delete` e
   * `download` não têm corpo -, e por isso declaram `responses` no próprio
   * controller.
   */
  'storages/files': StoragesFileShowResponse,

  /**
   * As ações de usuário que devolvem corpo respondem a mesma forma: a conta com
   * o avatar, e nunca a senha. É a mesma de `/account`, e não uma cópia - duas
   * declarações do mesmo contrato divergem em silêncio.
   */
  'administrator/users': AdministratorUserShowResponse,

  'administrator/classrooms': AdministratorClassroomShowResponse,
  'administrator/classrooms/paginate': AdministratorClassroomPaginateResponse,
  'administrator/sports': AdministratorSportShowResponse,
  'administrator/announcements': AdministratorAnnouncementShowResponse,
  'administrator/site': AdministratorSiteShowResponse,
  'administrator/photos': AdministratorPhotoShowResponse,
  'administrator/reports': AdministratorReportShowResponse,
  'advisor/photos': AdvisorPhotoShowResponse,

  /**
   * A competição como a listagem, o sorteio e o apagar a devolvem. `show` foge
   * desta forma - devolve a chave inteira - e por isso declara
   * `BracketDetailResponse` no próprio controller.
   */
  'administrator/brackets': BRACKET,
  'administrator/matches': MATCH,
  'administrator/enrollment-removals': AdministratorEnrollmentRemovalShowResponse,
  'administrator/cards': MATCH_CARD,
  'advisor/cards': MATCH_CARD,

  'advisor/classrooms': AdvisorClassroomShowResponse,
  'advisor/students': AdvisorStudentShowResponse,
  'advisor/enrollments': AdvisorEnrollmentShowResponse,
  'representative/enrollments': RepresentativeEnrollmentShowResponse,

  /**
   * O site. Aqui o recurso é o model serializado, sem recorte: nada destas
   * tabelas é privado - nome de turma, placar e aviso são
   * públicos por natureza.
   */
  'storefront/sports': StorefrontSportShowResponse,
  'storefront/announcements': StorefrontAnnouncementShowResponse,
  'storefront/matches': MATCH,
  'storefront/brackets': BRACKET,
  'storefront/site': StorefrontSiteShowResponse,
  'storefront/photos': StorefrontPhotoShowResponse,
}
