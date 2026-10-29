import { createFileRoute } from '@tanstack/react-router'

import {
  storefrontAnnouncementsQueryOptions,
  storefrontBracketsQueryOptions,
  storefrontMatchesQueryOptions,
  storefrontPhotosQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { SITE_DESCRIPTION, SITE_TITLE } from '#/lib/constant'

/** As consultas da home, com os mesmos parâmetros no loader e na tela. */
export const HOME_NEXT = { status: 'SCHEDULED', perPage: 6 }
export const HOME_RESULTS = { status: 'FINISHED', perPage: 10 }
export const HOME_ANNOUNCEMENTS = { perPage: 3 }
export const HOME_BRACKETS = { perPage: 100 }
/** O carrossel: as últimas fotos aprovadas. */
export const HOME_PHOTOS = { perPage: 20 }

/**
 * Erro engolido (`.catch`): a API fora do ar não derruba a home,
 * cada seção desenha o próprio estado.
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
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
    ],
  }),
})
