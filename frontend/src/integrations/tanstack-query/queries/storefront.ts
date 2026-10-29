import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type {
  IBracketDetail,
  IPaginated,
  IAnnouncement,
  IBracket,
  IMatch,
  ISport,
  IStorefrontPhoto,
  IStorefrontSite,
} from '#/lib/interfaces'
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
      request<IPaginated<ISport>>('/storefront/sports?perPage=100', { signal }),
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
      request<IPaginated<IStorefrontPhoto>>(
        '/storefront/photos'.concat(queryString(params)),
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
      request<IStorefrontSite>('/storefront/site', { signal }),
    staleTime: 5 * 60 * 1000,
  })

export const storefrontAnnouncementsQueryOptions = (params: StorefrontSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.announcements.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IAnnouncement>>(
        '/storefront/announcements'.concat(queryString(params)),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })

export const storefrontMatchesQueryOptions = (params: MatchListSearch) =>
  queryOptions({
    queryKey: queryKeys.storefront.matches.list(params),
    queryFn: ({ signal }) =>
      request<IPaginated<IMatch>>(
        '/storefront/matches'.concat(queryString(params)),
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
      request<IPaginated<IBracket>>(
        '/storefront/brackets'.concat(queryString(params)),
        { signal },
      ),
  })

export const storefrontBracketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.storefront.brackets.detail(id),
    queryFn: ({ signal }) =>
      request<IBracketDetail>('/storefront/brackets/'.concat(id), { signal }),
    refetchInterval: LIVE,
  })
