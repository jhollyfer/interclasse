import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import {
  storefrontBracketQueryOptions,
  storefrontBracketsQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { CATEGORY_LABELS } from '#/lib/labels'
import { loadOrNotFound } from '#/lib/load-or-not-found'
import { breadcrumbJsonLd, pageHead, sportsEventJsonLd } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

import { BRACKETS_INDEX } from '../index'

export const Route = createFileRoute('/_public/classificacao/$id/')({
  notFoundComponent: () => <NotFoundPage />,
  loader: async ({ context, params }) => {
    // A lista é a barra de abas da página; falha nela não esconde a chave.
    void context.queryClient
      .query(storefrontBracketsQueryOptions(BRACKETS_INDEX))
      .catch(() => undefined)

    return loadOrNotFound(() =>
      context.queryClient.query({
        ...storefrontBracketQueryOptions(params.id),
        staleTime: 'static',
      }),
    )
  },
  head: ({ loaderData, match }) => {
    if (!loaderData)
      return pageHead({
        title: m.public_bracket_head_fallback(),
        pathname: match.pathname,
      })

    const inputs = {
      sport: loaderData.sport.name,
      category: CATEGORY_LABELS[loaderData.category] ?? loaderData.category,
    }

    const title = m.public_bracket_head_title(inputs)
    const description = m.public_bracket_head_description(inputs)

    return pageHead({
      title,
      description,
      pathname: match.pathname,
      structuredData: [
        breadcrumbJsonLd([
          { name: m.public_nav_home(), pathname: '/' },
          { name: m.public_nav_standings(), pathname: '/classificacao' },
          { name: title, pathname: match.pathname },
        ]),
        sportsEventJsonLd({
          name: title,
          description,
          sport: loaderData.sport.name,
          pathname: match.pathname,
          scheduledAt: loaderData.matches.map((item) => item.scheduledAt),
        }),
      ],
    })
  },
})
