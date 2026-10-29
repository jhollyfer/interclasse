import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type {
  IBracketDetail,
  IDrawPreview,
  IEnrollmentRemoval,
  IMatchAthletes,
  IMatchCard,
  IPaginated,
  IAnnouncement,
  IBracket,
  IClassroom,
  IMatch,
  ISport,
  IUser,
  IPhoto,
  IReport,
  ISiteSetting,
} from '#/lib/interfaces'
import type {
  BracketListSearch,
  CardListSearch,
  ClassroomListSearch,
  ListSearch,
  MatchListSearch,
  PhotoListSearch,
  RemovalListSearch,
  UserListSearch,
} from '#/lib/list-search'
import { queryString } from '#/lib/list-search'

import { request } from '../http'

/**
 * `keepPreviousData` não é enfeite: sem ele, trocar de página passa por
 * `pending` e a tabela inteira esvazia no meio da navegação.
 */
export const usersQueryOptions = (params: UserListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.users.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IUser>>(
        '/administrator/users'.concat(queryString(params)),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })

/** O corpo vem nu, sem envelope - é o que o controller devolve. */
export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.users.detail(id),
    queryFn: ({ signal }) =>
      request<IUser>('/administrator/users/'.concat(id), { signal }),
  })

export const classroomsQueryOptions = (params: ClassroomListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IClassroom>>(
        '/administrator/classrooms'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const classroomQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.detail(id),
    queryFn: ({ signal }) =>
      request<IClassroom>('/administrator/classrooms/'.concat(id), { signal }),
  })

export const sportsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<ISport>>(
        '/administrator/sports'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const sportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.detail(id),
    queryFn: ({ signal }) =>
      request<ISport>('/administrator/sports/'.concat(id), { signal }),
  })

export const announcementsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IAnnouncement>>(
        '/administrator/announcements'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const announcementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.detail(id),
    queryFn: ({ signal }) =>
      request<IAnnouncement>('/administrator/announcements/'.concat(id), {
        signal,
      }),
  })

export const bracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IBracket>>(
        '/administrator/brackets'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** A chave inteira, com a classificação calculada do placar. */
export const bracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.detail(id),
    queryFn: ({ signal }) =>
      request<IBracketDetail>('/administrator/brackets/'.concat(id), {
        signal,
      }),
  })

export const matchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatch>>(
        '/administrator/matches'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** Quem entraria no sorteio agora. Só consulta: o sorteio é o `POST`. */
export const bracketPreviewQueryOptions = (sportId: string, category: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.preview(sportId, category),
    queryFn: ({ signal }) =>
      request<IDrawPreview>(
        '/administrator/brackets/preview'.concat(
          queryString({ sportId, category }),
        ),
        { signal },
      ),
    // A prévia muda a cada lista salva pelas turmas: o diálogo sempre relê.
    staleTime: 0,
  })

export const matchAthletesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.athletes(id),
    queryFn: ({ signal }) =>
      request<IMatchAthletes>(
        '/administrator/matches/'.concat(id, '/athletes'),
        { signal },
      ),
  })

export const cardsQueryOptions = (params: CardListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.cards.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatchCard>>(
        '/administrator/cards'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const enrollmentRemovalsQueryOptions = (params: RemovalListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.enrollmentRemovals.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IEnrollmentRemoval>>(
        '/administrator/enrollment-removals'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** As fotos enviadas, para a revisão da organização. `?status` recorta a fila. */
export const photosQueryOptions = (params: PhotoListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.photos.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IPhoto>>(
        '/administrator/photos'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** Os números dos jogos. Sempre do momento: o relatório é para fechar a edição. */
export const reportQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.administrator.reports,
    queryFn: ({ signal }) =>
      request<IReport>('/administrator/reports', { signal }),
    staleTime: 0,
  })

/** A configuração do site no painel. */
export const siteQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.administrator.site,
    queryFn: ({ signal }) =>
      request<ISiteSetting>('/administrator/site', { signal }),
  })
