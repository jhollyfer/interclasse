import {
  AccountProfileShowResponse,
  AdministratorAnnouncementShowResponse,
  AdministratorBracketPaginateResponse,
  AdministratorBracketPreviewResponse,
  AdministratorBracketShowResponse,
  AdministratorCardCreateResponse,
  AdministratorCardPaginateResponse,
  AdministratorClassroomPaginateResponse,
  AdministratorClassroomShowResponse,
  AdministratorEnrollmentRemovalShowResponse,
  AdministratorMatchAthletesResponse,
  AdministratorMatchPaginateResponse,
  AdministratorMatchScoreResponse,
  AdministratorMatchUnscoreResponse,
  AdministratorMatchUpdateResponse,
  AdministratorPhotoShowResponse,
  AdministratorReportShowResponse,
  AdministratorSiteShowResponse,
  AdministratorSportShowResponse,
  AdministratorUserShowResponse,
  AdvisorCardPaginateResponse,
  AdvisorClassroomShowResponse,
  AdvisorEnrollmentShowResponse,
  AdvisorPhotoShowResponse,
  AdvisorStudentShowResponse,
  RepresentativeEnrollmentShowResponse,
  StoragesFileShowResponse,
  StorefrontAnnouncementShowResponse,
  StorefrontBracketPaginateResponse,
  StorefrontBracketShowResponse,
  StorefrontMatchPaginateResponse,
  StorefrontPhotoShowResponse,
  StorefrontSiteShowResponse,
  StorefrontSportShowResponse,
} from '@interclasse/shared'

import type { FeatureResponse } from '#core/openapi/types'

/**
 * O registro de qual schema de resposta responde por cada ação da API
 * (`_standards/openapi.md`, "registro-de-resposta"). O registro só aponta: o
 * schema mora em `shared/src/responses/`, o mesmo que o presenter tipa e o
 * frontend lê, e `core/` não importa `models/`.
 *
 * A chave é o diretório do recurso em `app/features` (`administrator/sports`),
 * e vale para todas as ações dele; a chave com a ação (`administrator/brackets/show`)
 * ganha quando a ação devolve outra forma. Listagem ganha o envelope de
 * paginação sozinha.
 */
export const RESPONSES: Record<string, FeatureResponse> = {
  'account/profile': AccountProfileShowResponse,
  'administrator/announcements': AdministratorAnnouncementShowResponse,
  'administrator/brackets': AdministratorBracketPaginateResponse,
  'administrator/brackets/preview': AdministratorBracketPreviewResponse,
  'administrator/brackets/show': AdministratorBracketShowResponse,
  'administrator/cards': AdministratorCardPaginateResponse,
  'administrator/cards/create': AdministratorCardCreateResponse,
  'administrator/classrooms': AdministratorClassroomShowResponse,
  'administrator/classrooms/paginate': AdministratorClassroomPaginateResponse,
  'administrator/enrollment-removals': AdministratorEnrollmentRemovalShowResponse,
  'administrator/matches': AdministratorMatchPaginateResponse,
  'administrator/matches/athletes': AdministratorMatchAthletesResponse,
  'administrator/matches/score': AdministratorMatchScoreResponse,
  'administrator/matches/unscore': AdministratorMatchUnscoreResponse,
  'administrator/matches/update': AdministratorMatchUpdateResponse,
  'administrator/photos': AdministratorPhotoShowResponse,
  'administrator/reports': AdministratorReportShowResponse,
  'administrator/site': AdministratorSiteShowResponse,
  'administrator/sports': AdministratorSportShowResponse,
  'administrator/users': AdministratorUserShowResponse,
  'advisor/cards': AdvisorCardPaginateResponse,
  'advisor/classrooms': AdvisorClassroomShowResponse,
  'advisor/enrollments': AdvisorEnrollmentShowResponse,
  'advisor/photos': AdvisorPhotoShowResponse,
  'advisor/students': AdvisorStudentShowResponse,
  'representative/enrollments': RepresentativeEnrollmentShowResponse,
  'storages/files': StoragesFileShowResponse,
  'storefront/announcements': StorefrontAnnouncementShowResponse,
  'storefront/brackets': StorefrontBracketPaginateResponse,
  'storefront/brackets/show': StorefrontBracketShowResponse,
  'storefront/matches': StorefrontMatchPaginateResponse,
  'storefront/photos': StorefrontPhotoShowResponse,
  'storefront/site': StorefrontSiteShowResponse,
  'storefront/sports': StorefrontSportShowResponse,
}
