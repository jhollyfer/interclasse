import { useMutation } from '@tanstack/react-query'

import type {
  IAnnouncement,
  IBracket,
  IClassroom,
  IMatch,
  ISport,
  IUser,
  IEnrollmentRemoval,
  IMatchCard,
  IPhoto,
  ISiteSetting,
  Merge,
} from '#/lib/interfaces'
import type {
  PhotoCreatePayload,
  PhotoReviewPayload,
} from '#/validators/administrator/photos.validator'
import type { SiteUpdatePayload } from '#/validators/administrator/site.validator'
import type {
  AnnouncementCreatePayload,
  AnnouncementUpdatePayload,
} from '#/validators/administrator/announcements.validator'
import type { BracketCreatePayload } from '#/validators/administrator/brackets.validator'
import type { CardCreatePayload } from '#/validators/administrator/cards.validator'
import type {
  ClassroomCreatePayload,
  ClassroomUpdatePayload,
} from '#/validators/administrator/classrooms.validator'
import type {
  MatchScorePayload,
  MatchUpdatePayload,
} from '#/validators/administrator/matches.validator'
import type {
  SportCreatePayload,
  SportUpdatePayload,
} from '#/validators/administrator/sports.validator'
import type {
  UserCreatePayload,
  UserUpdatePayload,
} from '#/validators/administrator/users.validator'

import type { HTTPError } from '../http'
import { request, send } from '../http'
import type { MutationProps } from '../mutation-props'
import { shouldRetryQuery } from '../query-context'

/** O módulo inteiro exige `ADMINISTRATOR`. */

export function useUserCreate(
  options?: MutationProps<IUser, UserCreatePayload>,
) {
  return useMutation<IUser, HTTPError, UserCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IUser>('/administrator/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** O `id` viaja com o payload porque ele vai no caminho, não no corpo. */
export type UserUpdateVariables = Merge<
  UserUpdatePayload,
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
export function useUserUpdate(
  options?: MutationProps<IUser, UserUpdateVariables>,
) {
  return useMutation<IUser, HTTPError, UserUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IUser>('/administrator/users/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

/** Manda para a lixeira: preenche `deletedAt`, não apaga nada. */
export function useUserArchive(options?: MutationProps<void, string>) {
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
export function useUserUnarchive(options?: MutationProps<void, string>) {
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
export function useUserDelete(options?: MutationProps<void, string>) {
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

export function useClassroomCreate(
  options?: MutationProps<IClassroom, ClassroomCreatePayload>,
) {
  return useMutation<IClassroom, HTTPError, ClassroomCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IClassroom>('/administrator/classrooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type ClassroomUpdateVariables = Merge<
  ClassroomUpdatePayload,
  { readonly id: string }
>

export function useClassroomUpdate(
  options?: MutationProps<IClassroom, ClassroomUpdateVariables>,
) {
  return useMutation<IClassroom, HTTPError, ClassroomUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IClassroom>('/administrator/classrooms/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export function useClassroomDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/classrooms/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export function useSportCreate(
  options?: MutationProps<ISport, SportCreatePayload>,
) {
  return useMutation<ISport, HTTPError, SportCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<ISport>('/administrator/sports', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type SportUpdateVariables = Merge<
  SportUpdatePayload,
  { readonly id: string }
>

export function useSportUpdate(
  options?: MutationProps<ISport, SportUpdateVariables>,
) {
  return useMutation<ISport, HTTPError, SportUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<ISport>('/administrator/sports/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export function useSportDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/sports/'.concat(id), {
        method: 'DELETE',
      })
    },
  })
}

export function useAnnouncementCreate(
  options?: MutationProps<IAnnouncement, AnnouncementCreatePayload>,
) {
  return useMutation<IAnnouncement, HTTPError, AnnouncementCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IAnnouncement>('/administrator/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type AnnouncementUpdateVariables = Merge<
  AnnouncementUpdatePayload,
  { readonly id: string }
>

export function useAnnouncementUpdate(
  options?: MutationProps<IAnnouncement, AnnouncementUpdateVariables>,
) {
  return useMutation<IAnnouncement, HTTPError, AnnouncementUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IAnnouncement>(
        '/administrator/announcements/'.concat(id),
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
    },
  })
}

export function useAnnouncementDelete(options?: MutationProps<void, string>) {
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
export function useBracketCreate(
  options?: MutationProps<IBracket, BracketCreatePayload>,
) {
  return useMutation<IBracket, HTTPError, BracketCreatePayload>({
    // Mutation não repete por padrão, porque repetir escrita duplica. O sorteio
    // pode: a API é idempotente por modalidade e categoria e devolve a chave
    // que já existe. Sem isto, a queda de rede depois do commit mostrava erro
    // com a chave criada (_doc-lib/tanstack-query.md#guides/mutations, "Retry").
    retry: shouldRetryQuery,
    ...options,
    mutationFn: function (payload) {
      return request<IBracket>('/administrator/brackets', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

/** Apaga a chave inteira e reabre as inscrições. É como se refaz um sorteio. */
export function useBracketDelete(options?: MutationProps<void, string>) {
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
  MatchUpdatePayload,
  { readonly id: string }
>

/** A agenda: data, hora e local. */
export function useMatchUpdate(
  options?: MutationProps<IMatch, MatchUpdateVariables>,
) {
  return useMutation<IMatch, HTTPError, MatchUpdateVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IMatch>('/administrator/matches/'.concat(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

export type MatchScoreVariables = Merge<
  MatchScorePayload,
  { readonly id: string }
>

/** O placar. No mata-mata o vencedor avança sozinho. */
export function useMatchScore(
  options?: MutationProps<IMatch, MatchScoreVariables>,
) {
  return useMutation<IMatch, HTTPError, MatchScoreVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IMatch>('/administrator/matches/'.concat(id, '/score'), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

/** Desfaz o placar: a partida volta a "a jogar" e o vencedor sai da seguinte. */
export function useMatchUnscore(options?: MutationProps<IMatch, string>) {
  return useMutation<IMatch, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return request<IMatch>('/administrator/matches/'.concat(id, '/score'), {
        method: 'DELETE',
      })
    },
  })
}

/** Lança um cartão. O time sai do atleta, no servidor. */
export function useCardCreate(
  options?: MutationProps<IMatchCard, CardCreatePayload>,
) {
  return useMutation<IMatchCard, HTTPError, CardCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IMatchCard>('/administrator/cards', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export function useCardDelete(options?: MutationProps<void, string>) {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return send('/administrator/cards/'.concat(id), { method: 'DELETE' })
    },
  })
}

/** A ciência do aviso de remoção. Repetir não muda nada. */
export function useEnrollmentRemovalAcknowledge(
  options?: MutationProps<IEnrollmentRemoval, string>,
) {
  return useMutation<IEnrollmentRemoval, HTTPError, string>({
    ...options,
    mutationFn: function (id) {
      return request<IEnrollmentRemoval>(
        '/administrator/enrollment-removals/'.concat(id, '/acknowledge'),
        { method: 'PATCH' },
      )
    },
  })
}

/** Grava o "Sobre" e o regulamento. Campo ausente não muda; `null` apaga. */
export function useSiteUpdate(
  options?: MutationProps<ISiteSetting, SiteUpdatePayload>,
) {
  return useMutation<ISiteSetting, HTTPError, SiteUpdatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<ISiteSetting>('/administrator/site', {
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
export function usePhotoCreate(
  area: 'administrator' | 'advisor',
  options?: MutationProps<IPhoto, PhotoCreatePayload>,
) {
  return useMutation<IPhoto, HTTPError, PhotoCreatePayload>({
    ...options,
    mutationFn: function (payload) {
      return request<IPhoto>('/'.concat(area, '/photos'), {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}

export type PhotoReviewVariables = Merge<PhotoReviewPayload, { id: string }>

/** Aprova (vai ao site) ou recusa (sai do site). A decisão se refaz. */
export function usePhotoReview(
  options?: MutationProps<IPhoto, PhotoReviewVariables>,
) {
  return useMutation<IPhoto, HTTPError, PhotoReviewVariables>({
    ...options,
    mutationFn: function ({ id, ...body }) {
      return request<IPhoto>('/administrator/photos/'.concat(id, '/review'), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    },
  })
}

/** Apaga a foto. O conselheiro só alcança as que enviou (as outras são 404). */
export function usePhotoDelete(
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
