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

/** O módulo inteiro exige `ADMINISTRATOR`. */

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

/** O `id` viaja com o payload porque ele vai no caminho, não no corpo. */
export type UserUpdateVariables = Merge<
  AdministratorUserUpdatePayload,
  { readonly id: string }
>

/**
 * Campo ausente significa "não mexer", e não "apagar". Só `avatarId` aceita
 * `null` explícito.
 *
 * `password` entra no payload só quando há senha nova: o `confirmed` do
 * validator olha o par, e mandar `password: ''` deixaria a chave no corpo com um
 * valor que o servidor recusa.
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

/** Manda para a lixeira: preenche `deletedAt`, não apaga nada. */
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

/** Tira da lixeira. */
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
 * Apaga de vez. O backend exige o registro arquivado, e recusa a própria conta
 * de quem está logado.
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
 * Sem lixeira: turma, modalidade e aviso apagam de vez. Quem protege o que já
 * entrou numa chave é o servidor, com `409`.
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

/** O sorteio. Cria a chave e o mata-mata inteiro, da primeira fase à final. */
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
    // Mutation não repete por padrão, porque repetir escrita duplica. O sorteio
    // pode: a API é idempotente por modalidade e categoria e devolve a chave
    // que já existe. Sem isto, a queda de rede depois do commit mostrava erro
    // com a chave criada (_doc-lib/tanstack-query.md#guides/mutations, "Retry").
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

/** Apaga a chave inteira e reabre as inscrições. É como se refaz um sorteio. */
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

/** O placar. No mata-mata o vencedor avança sozinho. */
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

/** Desfaz o placar: a partida volta a "a jogar" e o vencedor sai da seguinte. */
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

/** Lança um cartão. O time sai do atleta, no servidor. */
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

/** A ciência do aviso de remoção. Repetir não muda nada. */
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

/** Grava o "Sobre" e o regulamento. Campo ausente não muda; `null` apaga. */
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
 * Envia uma foto para o carrossel. O caminho decide o estado em que ela nasce:
 * a do administrador vai direto ao site, a do conselheiro espera aprovação.
 */
export function usePhotoCreateMutation(
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

export type PhotoReviewVariables = Merge<
  AdministratorPhotoReviewPayload,
  { id: string }
>

/** Aprova (vai ao site) ou recusa (sai do site). A decisão se refaz. */
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

/** Apaga a foto. O conselheiro só alcança as que enviou (as outras são 404). */
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
