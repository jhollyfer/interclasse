import {
  AdministratorAnnouncementShowResponse,
  AdministratorBracketCreateResponse,
  AdministratorCardCreateResponse,
  AdministratorClassroomShowResponse,
  AdministratorEnrollmentRemovalShowResponse,
  AdministratorMatchScoreResponse,
  AdministratorMatchUnscoreResponse,
  AdministratorMatchUpdateResponse,
  AdministratorPhotoShowResponse,
  AdministratorSiteShowResponse,
  AdministratorSportShowResponse,
  AdministratorUserShowResponse,
} from '@interclasse/shared'
import type {
  AdministratorAnnouncementCreatePayload,
  AdministratorAnnouncementUpdatePayload,
  AdministratorBracketCreatePayload,
  AdministratorCardCreatePayload,
  AdministratorClassroomCreatePayload,
  AdministratorClassroomUpdatePayload,
  AdministratorMatchScorePayload,
  AdministratorMatchUpdatePayload,
  AdministratorPhotoCreatePayload,
  AdministratorPhotoReviewPayload,
  AdministratorSiteUpdatePayload,
  AdministratorSportCreatePayload,
  AdministratorSportUpdatePayload,
  AdministratorUserCreatePayload,
  AdministratorUserUpdatePayload,
  Merge,
} from '@interclasse/shared'
import { useMutation } from '@tanstack/react-query'

import type { MutationProps } from '#/hooks/tanstack-query/_mutation-props'

import type { HTTPError } from '../http'
import { request, send } from '../http'
import { shouldRetryQuery } from '../query-context'

/** The whole module requires `ADMINISTRATOR`. */

export function useUserCreateMutation(
  options?: MutationProps<
    AdministratorUserShowResponse,
    AdministratorUserCreatePayload
  >,
) {
  return useMutation<
    AdministratorUserShowResponse,
    HTTPError,
    AdministratorUserCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request('/administrator/users', AdministratorUserShowResponse, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** The `id` travels with the payload because it goes in the path, not in the body. */
export type UserUpdateVariables = Merge<
  AdministratorUserUpdatePayload,
  { readonly id: string }
>

/**
 * An absent field means "leave alone", and not "erase". Only `avatarId` accepts an
 * explicit `null`.
 *
 * `password` enters the payload only when there is a new password: the validator's `confirmed`
 * looks at the pair, and sending `password: ''` would leave the key in the body with a
 * value the server refuses.
 */
export function useUserUpdateMutation(
  options?: MutationProps<AdministratorUserShowResponse, UserUpdateVariables>,
) {
  return useMutation<
    AdministratorUserShowResponse,
    HTTPError,
    UserUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/users/'.concat(id),
        AdministratorUserShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

/** Sends to the trash: fills in `deletedAt`, deletes nothing. */
export function useUserArchiveMutation(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/users/'.concat(id, '/archive'), {
        method: 'PATCH',
      })
    },
  })
}

/** Takes out of the trash. */
export function useUserUnarchiveMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/users/'.concat(id, '/unarchive'), {
        method: 'PATCH',
      })
    },
  })
}

/**
 * Deletes for good. The backend requires the record to be archived, and refuses the account
 * of whoever is logged in.
 */
export function useUserDeleteMutation(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/users/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

/**
 * No trash: classroom, sport and announcement delete for good. Whoever protects what has already
 * entered a bracket is the server, with `409`.
 */

export function useClassroomCreateMutation(
  options?: MutationProps<
    AdministratorClassroomShowResponse,
    AdministratorClassroomCreatePayload
  >,
) {
  return useMutation<
    AdministratorClassroomShowResponse,
    HTTPError,
    AdministratorClassroomCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request(
        '/administrator/classrooms',
        AdministratorClassroomShowResponse,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    },
  })
}

export type ClassroomUpdateVariables = Merge<
  AdministratorClassroomUpdatePayload,
  { readonly id: string }
>

export function useClassroomUpdateMutation(
  options?: MutationProps<
    AdministratorClassroomShowResponse,
    ClassroomUpdateVariables
  >,
) {
  return useMutation<
    AdministratorClassroomShowResponse,
    HTTPError,
    ClassroomUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/classrooms/'.concat(id),
        AdministratorClassroomShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useClassroomDeleteMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/classrooms/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export function useSportCreateMutation(
  options?: MutationProps<
    AdministratorSportShowResponse,
    AdministratorSportCreatePayload
  >,
) {
  return useMutation<
    AdministratorSportShowResponse,
    HTTPError,
    AdministratorSportCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request('/administrator/sports', AdministratorSportShowResponse, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type SportUpdateVariables = Merge<
  AdministratorSportUpdatePayload,
  { readonly id: string }
>

export function useSportUpdateMutation(
  options?: MutationProps<AdministratorSportShowResponse, SportUpdateVariables>,
) {
  return useMutation<
    AdministratorSportShowResponse,
    HTTPError,
    SportUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/sports/'.concat(id),
        AdministratorSportShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useSportDeleteMutation(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/sports/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export function useAnnouncementCreateMutation(
  options?: MutationProps<
    AdministratorAnnouncementShowResponse,
    AdministratorAnnouncementCreatePayload
  >,
) {
  return useMutation<
    AdministratorAnnouncementShowResponse,
    HTTPError,
    AdministratorAnnouncementCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request(
        '/administrator/announcements',
        AdministratorAnnouncementShowResponse,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    },
  })
}

export type AnnouncementUpdateVariables = Merge<
  AdministratorAnnouncementUpdatePayload,
  { readonly id: string }
>

export function useAnnouncementUpdateMutation(
  options?: MutationProps<
    AdministratorAnnouncementShowResponse,
    AnnouncementUpdateVariables
  >,
) {
  return useMutation<
    AdministratorAnnouncementShowResponse,
    HTTPError,
    AnnouncementUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/announcements/'.concat(id),
        AdministratorAnnouncementShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useAnnouncementDeleteMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/announcements/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

/** The draw. Creates the bracket and the whole knockout, from the first round to the final. */
export function useBracketCreateMutation(
  options?: MutationProps<
    AdministratorBracketCreateResponse,
    AdministratorBracketCreatePayload
  >,
) {
  return useMutation<
    AdministratorBracketCreateResponse,
    HTTPError,
    AdministratorBracketCreatePayload
  >({
    // A mutation does not retry by default, because retrying a write duplicates. The draw
    // can: the API is idempotent per sport and category and returns the bracket
    // that already exists. Without this, a network drop after the commit showed an error
    // with the bracket created (_doc-lib/tanstack-query.md#guides/mutations, "Retry").
    retry: shouldRetryQuery,
    ...options,
    mutationFn: function (payload) {
      return request(
        '/administrator/brackets',
        AdministratorBracketCreateResponse,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    },
  })
}

/** Deletes the whole bracket and reopens the enrollments. That is how a draw is redone. */
export function useBracketDeleteMutation(
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/brackets/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export type MatchUpdateVariables = Merge<
  AdministratorMatchUpdatePayload,
  { readonly id: string }
>

/** A agenda: data, hora e local. */
export function useMatchUpdateMutation(
  options?: MutationProps<
    AdministratorMatchUpdateResponse,
    MatchUpdateVariables
  >,
) {
  return useMutation<
    AdministratorMatchUpdateResponse,
    HTTPError,
    MatchUpdateVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/matches/'.concat(id),
        AdministratorMatchUpdateResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export type MatchScoreVariables = Merge<
  AdministratorMatchScorePayload,
  { readonly id: string }
>

/** The score. In the knockout the winner advances on its own. */
export function useMatchScoreMutation(
  options?: MutationProps<AdministratorMatchScoreResponse, MatchScoreVariables>,
) {
  return useMutation<
    AdministratorMatchScoreResponse,
    HTTPError,
    MatchScoreVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/matches/'.concat(id, '/score'),
        AdministratorMatchScoreResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

/** Undoes the score: the match goes back to "a jogar" and the winner leaves the next one. */
export function useMatchUnscoreMutation(
  options?: MutationProps<AdministratorMatchUnscoreResponse, string>,
) {
  return useMutation<AdministratorMatchUnscoreResponse, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return request(
        '/administrator/matches/'.concat(id, '/score'),
        AdministratorMatchUnscoreResponse,
        {
          method: 'DELETE',
        },
      )
    },
  })
}

/** Records a card. The team comes from the athlete, on the server. */
export function useCardCreateMutation(
  options?: MutationProps<
    AdministratorCardCreateResponse,
    AdministratorCardCreatePayload
  >,
) {
  return useMutation<
    AdministratorCardCreateResponse,
    HTTPError,
    AdministratorCardCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request('/administrator/cards', AdministratorCardCreateResponse, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export function useCardDeleteMutation(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/cards/'.concat(id), { method: 'DELETE' })
    },
  })
}

/** Acknowledging the removal notice. Repeating changes nothing. */
export function useEnrollmentRemovalAcknowledgeMutation(
  options?: MutationProps<AdministratorEnrollmentRemovalShowResponse, string>,
) {
  return useMutation<
    AdministratorEnrollmentRemovalShowResponse,
    HTTPError,
    string
  >({
    ...options,
    mutationFn: function (id) {
      return request(
        '/administrator/enrollment-removals/'.concat(id, '/acknowledge'),
        AdministratorEnrollmentRemovalShowResponse,
        { method: 'PATCH' },
      )
    },
  })
}

/** Saves the "Sobre" and the regulation. An absent field does not change; `null` deletes. */
export function useSiteUpdateMutation(
  options?: MutationProps<
    AdministratorSiteShowResponse,
    AdministratorSiteUpdatePayload
  >,
) {
  return useMutation<
    AdministratorSiteShowResponse,
    HTTPError,
    AdministratorSiteUpdatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request('/administrator/site', AdministratorSiteShowResponse, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    },
  })
}

/**
 * Uploads a photo to the carousel. The path decides the state it is born in:
 * the administrator's goes straight to the site, the advisor's waits for approval.
 */
function usePhotoCreateMutation(
  area: 'administrator' | 'advisor',
  options?: MutationProps<
    AdministratorPhotoShowResponse,
    AdministratorPhotoCreatePayload
  >,
) {
  return useMutation<
    AdministratorPhotoShowResponse,
    HTTPError,
    AdministratorPhotoCreatePayload
  >({
    ...options,
    mutationFn: function (payload) {
      return request(
        '/'.concat(area, '/photos'),
        AdministratorPhotoShowResponse,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
    },
  })
}

/** The administrator's photo upload: goes straight to the site. */
export function useAdministratorPhotoCreateMutation(
  options?: MutationProps<
    AdministratorPhotoShowResponse,
    AdministratorPhotoCreatePayload
  >,
) {
  return usePhotoCreateMutation('administrator', options)
}

/** The advisor's photo upload: waits for approval. */
export function useAdvisorPhotoCreateMutation(
  options?: MutationProps<
    AdministratorPhotoShowResponse,
    AdministratorPhotoCreatePayload
  >,
) {
  return usePhotoCreateMutation('advisor', options)
}

export type PhotoReviewVariables = Merge<
  AdministratorPhotoReviewPayload,
  { id: string }
>

/** Approves (goes to the site) or rejects (leaves the site). The decision can be redone. */
export function usePhotoReviewMutation(
  options?: MutationProps<AdministratorPhotoShowResponse, PhotoReviewVariables>,
) {
  return useMutation<
    AdministratorPhotoShowResponse,
    HTTPError,
    PhotoReviewVariables
  >({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request(
        '/administrator/photos/'.concat(id, '/review'),
        AdministratorPhotoShowResponse,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

/** Deletes the photo. The advisor only reaches the ones they uploaded (the others are 404). */
export function usePhotoDeleteMutation(
  area: 'administrator' | 'advisor',
  options?: MutationProps<void, string>,
) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/'.concat(area, '/photos/', id), { method: 'DELETE' })
    },
  })
}
