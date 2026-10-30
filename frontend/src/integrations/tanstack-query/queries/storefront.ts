import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  StorefrontAnnouncementShowResponse,
  StorefrontBracketPaginateResponse,
  StorefrontBracketShowResponse,
  StorefrontMatchPaginateResponse,
  StorefrontPhotoShowResponse,
  StorefrontSiteShowResponse,
  StorefrontSportShowResponse,
  paginatedResponse,
} from '@interclasse/shared'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type {
  BracketListSearch,
  MatchListSearch,
  StorefrontSearch,
} from '#/lib/list-search'
import { queryString } from '#/lib/list-search'

import { request } from '../http'

/**
 * O site público, sem sessão. O `request` continua o mesmo: manda o cookie
 * quando existe, e estas rotas simplesmente não o exigem.
 *
 * Jogos e chaves se atualizam sozinhos a cada minuto com a aba aberta: no dia
 * dos jogos o placar entra pelo painel, e quem acompanha pelo celular não
 * precisa recarregar a página para ver.
 */
const LIVE = 60 * 1000

export const storefrontSportsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.storefront.sports.all,
    queryFn: ({ signal }) =>
      request(
        '/storefront/sports?perPage=100',
        paginatedResponse(StorefrontSportShowResponse),
        { signal },
      ),
    staleTime: 5 * 60 * 1000,
  })

/**
 * O carrossel do site. As URLs são assinadas e vencem em minutos: `staleTime`
 * abaixo disso, para nenhuma foto virar imagem quebrada na tela aberta.
 */
export const storefrontPhotosQueryOptions = (params: StorefrontSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.photos.list(params),
    queryFn: ({ signal }) =>
      request(
        '/storefront/photos'.concat(queryString(params)),
        paginatedResponse(StorefrontPhotoShowResponse),
        { signal },
      ),
    staleTime: 5 * 60 * 1000,
  })

/**
 * O "Sobre" e o regulamento no site. A URL do PDF é assinada e vence em
 * minutos: `staleTime` abaixo disso, para o botão nunca apontar para um link
 * vencido.
 */
export const storefrontSiteQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.storefront.site,
    queryFn: ({ signal }) =>
      request('/storefront/site', StorefrontSiteShowResponse, { signal }),
    staleTime: 5 * 60 * 1000,
  })

export const storefrontAnnouncementsQueryOptions = (params: StorefrontSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.announcements.list(params),
    queryFn: ({ signal }) =>
      request(
        '/storefront/announcements'.concat(queryString(params)),
        paginatedResponse(StorefrontAnnouncementShowResponse),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const storefrontMatchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.matches.list(params),
    queryFn: ({ signal }) =>
      request(
        '/storefront/matches'.concat(queryString(params)),
        paginatedResponse(StorefrontMatchPaginateResponse),
        {
          signal,
        },
      ),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE,
  })

export const storefrontBracketsQueryOptions = (params: BracketListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.brackets.list(params),
    queryFn: ({ signal }) =>
      request(
        '/storefront/brackets'.concat(queryString(params)),
        paginatedResponse(StorefrontBracketPaginateResponse),
        { signal },
      ),
  })

export const storefrontBracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.storefront.brackets.detail(id),
    queryFn: ({ signal }) =>
      request(
        '/storefront/brackets/'.concat(id),
        StorefrontBracketShowResponse,
        { signal },
      ),
    refetchInterval: LIVE,
  })
