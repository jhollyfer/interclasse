import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type {
  AdministratorAnnouncementShowResponse,
  AdministratorBracketPaginateResponse,
  AdministratorBracketPreviewResponse,
  AdministratorBracketShowResponse,
  AdministratorCardPaginateResponse,
  AdministratorClassroomPaginateResponse,
  AdministratorClassroomShowResponse,
  AdministratorEnrollmentRemovalShowResponse,
  AdministratorMatchAthletesResponse,
  AdministratorMatchPaginateResponse,
  AdministratorPhotoShowResponse,
  AdministratorReportShowResponse,
  AdministratorSiteShowResponse,
  AdministratorSportShowResponse,
  AdministratorUserShowResponse,
  Paginated,
} from '@interclasse/shared'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
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
      request<Paginated<AdministratorUserShowResponse>>(
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
      request<AdministratorUserShowResponse>(
        '/administrator/users/'.concat(id),
        { signal },
      ),
  })

export const classroomsQueryOptions = (params: ClassroomListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorClassroomPaginateResponse>>(
        '/administrator/classrooms'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const classroomQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.detail(id),
    queryFn: ({ signal }) =>
      request<AdministratorClassroomShowResponse>(
        '/administrator/classrooms/'.concat(id),
        { signal },
      ),
  })

export const sportsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorSportShowResponse>>(
        '/administrator/sports'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const sportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.detail(id),
    queryFn: ({ signal }) =>
      request<AdministratorSportShowResponse>(
        '/administrator/sports/'.concat(id),
        { signal },
      ),
  })

export const announcementsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorAnnouncementShowResponse>>(
        '/administrator/announcements'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const announcementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.detail(id),
    queryFn: ({ signal }) =>
      request<AdministratorAnnouncementShowResponse>(
        '/administrator/announcements/'.concat(id),
        {
          signal,
        },
      ),
  })

export const bracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorBracketPaginateResponse>>(
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
      request<AdministratorBracketShowResponse>(
        '/administrator/brackets/'.concat(id),
        {
          signal,
        },
      ),
  })

export const matchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorMatchPaginateResponse>>(
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
      request<AdministratorBracketPreviewResponse>(
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
      request<AdministratorMatchAthletesResponse>(
        '/administrator/matches/'.concat(id, '/athletes'),
        { signal },
      ),
  })

export const cardsQueryOptions = (params: CardListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.cards.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorCardPaginateResponse>>(
        '/administrator/cards'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const enrollmentRemovalsQueryOptions = (params: RemovalListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.enrollmentRemovals.list(params),
    queryFn: ({ signal }) =>
      request<Paginated<AdministratorEnrollmentRemovalShowResponse>>(
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
      request<Paginated<AdministratorPhotoShowResponse>>(
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
      request<AdministratorReportShowResponse>('/administrator/reports', {
        signal,
      }),
    staleTime: 0,
  })

/** A configuração do site no painel. */
export const siteQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.administrator.site,
    queryFn: ({ signal }) =>
      request<AdministratorSiteShowResponse>('/administrator/site', { signal }),
  })
