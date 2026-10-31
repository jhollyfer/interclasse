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
 * The registry of which response schema answers for each API action
 * (`_standards/openapi.md`, "response-registry"). The registry only points: the
 * schema lives in `shared/src/responses/`, the same one the presenter types and the
 * frontend reads, and `core/` does not import `models/`.
 *
 * The key is the resource directory in `app/features` (`administrator/sports`),
 * and holds for all its actions; the key with the action (`administrator/brackets/show`)
 * wins when the action returns another shape. A listing gets the pagination
 * envelope on its own.
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
