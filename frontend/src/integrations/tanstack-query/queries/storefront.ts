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
import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import type {
  BracketListSearch,
  MatchListSearch,
  StorefrontSearch,
} from '#/lib/list-search'
import { queryString } from '#/lib/list-search'

import { request } from '../http'

/**
 * The public site, without a session. `request` stays the same: it sends the cookie
 * when there is one, and these routes simply do not require it.
 *
 * Matches and brackets refresh on their own every minute with the tab open: on
 * game day the score is entered through the dashboard, and whoever follows on a phone
 * does not need to reload the page to see it.
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
 * The site carousel. The URLs are signed and expire in minutes: `staleTime`
 * below that, so no photo turns into a broken image on an open screen.
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
 * The "Sobre" and the regulation on the site. The PDF URL is signed and expires in
 * minutes: `staleTime` below that, so the button never points to an expired
 * link.
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
