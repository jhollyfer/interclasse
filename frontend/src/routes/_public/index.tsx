import { createFileRoute } from '@tanstack/react-router'

import {
  storefrontAnnouncementsQueryOptions,
  storefrontBracketsQueryOptions,
  storefrontMatchesQueryOptions,
} from '#/integrations/tanstack-query/queries'
import { SITE_DESCRIPTION, SITE_TITLE } from '#/lib/constant'

/** As consultas da home, com os mesmos parâmetros no loader e na tela. */
export const HOME_NEXT = { status: 'SCHEDULED', perPage: 6 }
export const HOME_RESULTS = { status: 'FINISHED', perPage: 10 }
export const HOME_ANNOUNCEMENTS = { perPage: 3 }
export const HOME_BRACKETS = { perPage: 100 }

/**
 * `prefetchQuery` e não `ensureQueryData`: a API fora do ar não derruba a home,
 * cada seção desenha o próprio estado.
 */
export const Route = createFileRoute('/_public/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(
        storefrontMatchesQueryOptions(HOME_NEXT),
      ),
      context.queryClient.prefetchQuery(
        storefrontMatchesQueryOptions(HOME_RESULTS),
      ),
      context.queryClient.prefetchQuery(
        storefrontAnnouncementsQueryOptions(HOME_ANNOUNCEMENTS),
      ),
      context.queryClient.prefetchQuery(
        storefrontBracketsQueryOptions(HOME_BRACKETS),
      ),
    ]),
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
    ],
  }),
})
