import {
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
  paginatedResponse,
} from '@interclasse/shared'
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
} from '@tanstack/react-query'

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
      request(
        '/administrator/users'.concat(queryString(params)),
        paginatedResponse(AdministratorUserShowResponse),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
  })

/**
 * As contas de um papel, página a página, para o combobox com busca no
 * servidor (`frontend.md` §2.1). `page` é o `pageParam`, e fica fora da chave.
 */
export const usersInfiniteQueryOptions = (params: UserListSearch) =>
  infiniteQueryOptions({
    queryKey: queryKeys.administrator.users.infinite(params),
    queryFn: ({ signal, pageParam }) =>
      request(
        '/administrator/users'.concat(
          queryString({ ...params, page: pageParam }),
        ),
        paginatedResponse(AdministratorUserShowResponse),
        { signal },
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      if (last.meta.currentPage >= last.meta.lastPage) return undefined

      return last.meta.currentPage + 1
    },
    placeholderData: keepPreviousData,
  })

/** O corpo vem nu, sem envelope - é o que o controller devolve. */
export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.users.detail(id),
    queryFn: ({ signal }) =>
      request(
        '/administrator/users/'.concat(id),
        AdministratorUserShowResponse,
        { signal },
      ),
  })

export const classroomsQueryOptions = (params: ClassroomListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/classrooms'.concat(queryString(params)),
        paginatedResponse(AdministratorClassroomPaginateResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const classroomQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.classrooms.detail(id),
    queryFn: ({ signal }) =>
      request(
        '/administrator/classrooms/'.concat(id),
        AdministratorClassroomShowResponse,
        { signal },
      ),
  })

export const sportsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/sports'.concat(queryString(params)),
        paginatedResponse(AdministratorSportShowResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** As modalidades, página a página, para o combobox com busca no servidor. */
export const sportsInfiniteQueryOptions = (params: ListSearch) =>
  infiniteQueryOptions({
    queryKey: queryKeys.administrator.sports.infinite(params),
    queryFn: ({ signal, pageParam }) =>
      request(
        '/administrator/sports'.concat(
          queryString({ ...params, page: pageParam }),
        ),
        paginatedResponse(AdministratorSportShowResponse),
        { signal },
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      if (last.meta.currentPage >= last.meta.lastPage) return undefined

      return last.meta.currentPage + 1
    },
    placeholderData: keepPreviousData,
  })

export const sportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.sports.detail(id),
    queryFn: ({ signal }) =>
      request(
        '/administrator/sports/'.concat(id),
        AdministratorSportShowResponse,
        { signal },
      ),
  })

export const announcementsQueryOptions = (params: ListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/announcements'.concat(queryString(params)),
        paginatedResponse(AdministratorAnnouncementShowResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const announcementQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.announcements.detail(id),
    queryFn: ({ signal }) =>
      request(
        '/administrator/announcements/'.concat(id),
        AdministratorAnnouncementShowResponse,
        {
          signal,
        },
      ),
  })

export const bracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/brackets'.concat(queryString(params)),
        paginatedResponse(AdministratorBracketPaginateResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** A chave inteira, com a classificação calculada do placar. */
export const bracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.detail(id),
    queryFn: ({ signal }) =>
      request(
        '/administrator/brackets/'.concat(id),
        AdministratorBracketShowResponse,
        {
          signal,
        },
      ),
  })

export const matchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/matches'.concat(queryString(params)),
        paginatedResponse(AdministratorMatchPaginateResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** Quem entraria no sorteio agora. Só consulta: o sorteio é o `POST`. */
export const bracketPreviewQueryOptions = (sportId: string, category: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.brackets.preview(sportId, category),
    queryFn: ({ signal }) =>
      request(
        '/administrator/brackets/preview'.concat(
          queryString({ sportId, category }),
        ),
        AdministratorBracketPreviewResponse,
        { signal },
      ),
    // A prévia muda a cada lista salva pelas turmas: o diálogo sempre relê.
    staleTime: 0,
  })

export const matchAthletesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.administrator.matches.athletes(id),
    queryFn: ({ signal }) =>
      request(
        '/administrator/matches/'.concat(id, '/athletes'),
        AdministratorMatchAthletesResponse,
        { signal },
      ),
  })

export const cardsQueryOptions = (params: CardListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.cards.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/cards'.concat(queryString(params)),
        paginatedResponse(AdministratorCardPaginateResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const enrollmentRemovalsQueryOptions = (params: RemovalListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.enrollmentRemovals.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/enrollment-removals'.concat(queryString(params)),
        paginatedResponse(AdministratorEnrollmentRemovalShowResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** As fotos enviadas, para a revisão da organização. `?status` recorta a fila. */
export const photosQueryOptions = (params: PhotoListSearch) =>
  queryOptions({
    queryKey: queryKeys.administrator.photos.list(params),
    queryFn: ({ signal }) =>
      request(
        '/administrator/photos'.concat(queryString(params)),
        paginatedResponse(AdministratorPhotoShowResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

/** Os números dos jogos. Sempre do momento: o relatório é para fechar a edição. */
export const reportQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.administrator.reports,
    queryFn: ({ signal }) =>
      request('/administrator/reports', AdministratorReportShowResponse, {
        signal,
      }),
    staleTime: 0,
  })

/** A configuração do site no painel. */
export const siteQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.administrator.site,
    queryFn: ({ signal }) =>
      request('/administrator/site', AdministratorSiteShowResponse, { signal }),
  })
