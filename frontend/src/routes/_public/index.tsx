import { createFileRoute } from '@tanstack/react-router'

import {
  storefrontAnnouncementsQueryOptions,
  storefrontBracketsQueryOptions,
  storefrontMatchesQueryOptions,
  storefrontPhotosQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { pageHead } from '#/lib/page-head'

/** The home's queries, with the same parameters in the loader and on screen. */
export const HOME_NEXT = { status: 'SCHEDULED', perPage: 6 }
export const HOME_RESULTS = { status: 'FINISHED', perPage: 10 }
export const HOME_ANNOUNCEMENTS = { perPage: 3 }
export const HOME_BRACKETS = { perPage: 100 }
/** The carousel: the latest approved photos. */
export const HOME_PHOTOS = { perPage: 20 }

/**
 * Swallowed error (`.catch`): the API being down does not bring the home down,
 * each section draws its own state.
 */
export const Route = createFileRoute('/_public/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient
        .query(storefrontMatchesQueryOptions(HOME_NEXT))
        .catch(() => undefined),
      context.queryClient
        .query(storefrontMatchesQueryOptions(HOME_RESULTS))
        .catch(() => undefined),
      context.queryClient
        .query(storefrontAnnouncementsQueryOptions(HOME_ANNOUNCEMENTS))
        .catch(() => undefined),
      context.queryClient
        .query(storefrontBracketsQueryOptions(HOME_BRACKETS))
        .catch(() => undefined),
      context.queryClient
        .query(storefrontPhotosQueryOptions(HOME_PHOTOS))
        .catch(() => undefined),
    ]),
  head: () => pageHead({ pathname: '/' }),
})
