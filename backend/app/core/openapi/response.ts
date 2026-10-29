import {
  ACTIVE_STATUSES,
  BRACKET_STATUSES,
  CARD_COLORS,
  CATEGORIES,
  MATCH_PHASES,
  MATCH_STATUSES,
  PHOTO_STATUSES,
  UPLOAD_STATUSES,
  USER_ROLES,
} from '@interclasse/shared'
import {
  AccountProfileShowResponse,
  AdministratorSportShowResponse,
  AdministratorUserShowResponse,
  StoragesFileShowResponse,
  StorefrontSportShowResponse,
} from '@interclasse/shared'

import { vine } from '#core/validator'
import Announcement from '#models/announcement'
import Bracket from '#models/bracket'
import Classroom from '#models/classroom'
import EnrollmentRemoval from '#models/enrollment-removal'
import MatchCard from '#models/match-card'
import Photo from '#models/photo'
import SiteSetting from '#models/site-setting'
import Match from '#models/match'
import Sport from '#models/sport'
import Storage from '#models/storage'
import Student from '#models/student'
import Team from '#models/team'
import User from '#models/user'
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

const STORAGE: ModelResource = {
  model: Storage,
  enums: { status: UPLOAD_STATUSES },
}

/** A conta como vínculo de outra coisa: conselheiro ou representante, sem o avatar. */
const PERSON: ModelResource = {
  model: User,
  enums: { role: USER_ROLES, status: ACTIVE_STATUSES },
}

const CLASSROOM: ModelResource = {
  model: Classroom,
  enums: { category: CATEGORIES },
}

/** A turma no painel: com quem a aconselha e quem a representa. */
const CLASSROOM_WITH_PEOPLE: ModelResource = {
  model: Classroom,
  enums: { category: CATEGORIES },
  relations: { advisor: PERSON, representative: PERSON },
}

const STUDENT: ModelResource = {
  model: Student,
}

const SPORT: ModelResource = {
  model: Sport,
}

const ANNOUNCEMENT: ModelResource = {
  model: Announcement,
}
const PHOTO: ModelResource = {
  model: Photo,
  enums: { status: PHOTO_STATUSES },
  relations: { storage: STORAGE, author: PERSON },
}
const SITE_SETTING: ModelResource = {
  model: SiteSetting,
  relations: { regulation: STORAGE },
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

/** O aviso de atleta tirado da lista: a turma, a modalidade e quem tirou. */
const ENROLLMENT_REMOVAL: ModelResource = {
  model: EnrollmentRemoval,
  relations: { classroom: CLASSROOM, sport: SPORT, actor: PERSON },
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
 * As inscrições de uma turma: as modalidades, os alunos e em quais modalidades
 * cada um está. É a matriz aluno x modalidade da tela do conselheiro e do
 * representante.
 *
 * `locked` diz que a modalidade já foi sorteada na categoria da turma: a lista
 * dela não muda mais.
 */
export const EnrollmentBoardResponse = vine.create({
  classroom: vine.object({
    id: vine.string().uuid(),
    name: vine.string(),
    category: vine.enum(CATEGORIES),
  }),
  sports: vine.array(
    vine.object({
      id: vine.string().uuid(),
      name: vine.string(),
      minAthletes: vine.number(),
      maxAthletes: vine.number(),
      locked: vine.boolean(),
    }),
  ),
  students: vine.array(
    vine.object({
      id: vine.string().uuid(),
      name: vine.string(),
      sportIds: vine.array(vine.string().uuid()),
    }),
  ),
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

/**
 * O "Sobre" para o site anônimo: o recorte de `GET /storefront/site`. Do
 * regulamento sai só o que o botão de baixar precisa, sem o caminho no bucket.
 */
export const StorefrontSiteResponse = vine.create({
  about: vine.string().nullable(),
  organizer: vine.string().nullable(),
  firstEditionYear: vine.number().nullable(),
  edition: vine.number().nullable(),
  schoolInstagram: vine.string().nullable(),
  developerInstagram: vine.string().nullable(),
  regulation: vine
    .object({ url: vine.string(), originalName: vine.string(), size: vine.number() })
    .nullable(),
})

/**
 * A foto do carrossel no site anônimo: a URL assinada e a legenda, sem quem
 * enviou nem o caminho no bucket.
 */
export const StorefrontPhotoResponse = vine.create({
  id: vine.string().uuid(),
  caption: vine.string().nullable(),
  url: vine.string(),
  createdAt: vine.date(),
})

/** O relatório dos jogos: totais, por categoria, por modalidade e por turma. */
export const ReportResponse = vine.create({
  totals: vine.object({
    classrooms: vine.number(),
    students: vine.number(),
    athletes: vine.number(),
    enrollments: vine.number(),
    sports: vine.number(),
    matchesPlayed: vine.number(),
    matchesScheduled: vine.number(),
  }),
  byCategory: vine.array(
    vine.object({
      category: vine.enum(CATEGORIES),
      classrooms: vine.number(),
      students: vine.number(),
      athletes: vine.number(),
    }),
  ),
  bySport: vine.array(
    vine.object({
      id: vine.string().uuid(),
      name: vine.string(),
      athletes: vine.number(),
      classrooms: vine.number(),
    }),
  ),
  classrooms: vine.array(
    vine.object({
      id: vine.string().uuid(),
      name: vine.string(),
      category: vine.enum(CATEGORIES),
      advisor: vine.string().nullable(),
      representative: vine.string().nullable(),
      students: vine.number(),
      athletes: vine.number(),
      sports: vine.number(),
    }),
  ),
})

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

  'administrator/classrooms': CLASSROOM_WITH_PEOPLE,
  'administrator/sports': AdministratorSportShowResponse,
  'administrator/announcements': ANNOUNCEMENT,
  'administrator/site': SITE_SETTING,
  'administrator/photos': PHOTO,
  'administrator/reports': ReportResponse,
  'advisor/photos': PHOTO,

  /**
   * A competição como a listagem, o sorteio e o apagar a devolvem. `show` foge
   * desta forma - devolve a chave inteira - e por isso declara
   * `BracketDetailResponse` no próprio controller.
   */
  'administrator/brackets': BRACKET,
  'administrator/matches': MATCH,
  'administrator/enrollment-removals': ENROLLMENT_REMOVAL,
  'administrator/cards': MATCH_CARD,
  'advisor/cards': MATCH_CARD,

  'advisor/classrooms': CLASSROOM_WITH_PEOPLE,
  'advisor/students': STUDENT,
  'advisor/enrollments': EnrollmentBoardResponse,
  'representative/enrollments': EnrollmentBoardResponse,

  /**
   * O site. Aqui o recurso é o model serializado, sem recorte: nada destas
   * tabelas é privado - nome de turma, placar e aviso são
   * públicos por natureza.
   */
  'storefront/sports': StorefrontSportShowResponse,
  'storefront/announcements': ANNOUNCEMENT,
  'storefront/matches': MATCH,
  'storefront/brackets': BRACKET,
  'storefront/site': StorefrontSiteResponse,
  'storefront/photos': StorefrontPhotoResponse,
}
