import { CATEGORIES, MATCH_STATUSES } from '@interclasse/shared'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'

import { Agenda } from '#/components/common/match-agenda'
import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import {
  storefrontMatchesQueryOptions,
  storefrontSportsQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { CATEGORY_LABELS, MATCH_STATUS_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { Pager } from '../../-components/pager'
import {
  Empty,
  Section,
  SectionHeader,
  SectionTitle,
} from '../../-components/section'

const route = getRouteApi('/_public/jogos/')

export function GamesPage(): React.JSX.Element {
  const search = route.useSearch()
  const navigate = useNavigate({ from: '/jogos/' })
  const { data } = useQuery(storefrontMatchesQueryOptions(search))
  const { data: sports } = useQuery(storefrontSportsQueryOptions())

  function filter(key: 'sportId' | 'category' | 'status', value: string) {
    void navigate({
      search: { ...search, [key]: value || undefined, page: undefined },
    })
  }

  return (
    <Section>
      <SectionHeader>
        <SectionTitle render={<h1 />}>{m.public_games_title()}</SectionTitle>
      </SectionHeader>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <OptionCombobox
          aria-label={m.public_games_filter_sport()}
          className="w-full sm:w-48"
          clearable
          value={search.sportId ?? ''}
          onValueChange={(value) => filter('sportId', value)}
          options={[
            { value: '', label: m.public_games_all_sports() },
            ...(sports?.data ?? []).map((sport) => ({
              value: sport.id,
              label: sport.name,
            })),
          ]}
        />
        <OptionCombobox
          aria-label={m.public_games_filter_category()}
          className="w-full sm:w-48"
          clearable
          value={search.category ?? ''}
          onValueChange={(value) => filter('category', value)}
          options={toOptions(['', ...CATEGORIES], {
            ...CATEGORY_LABELS,
            '': m.public_games_all_categories(),
          })}
        />
        <OptionCombobox
          aria-label={m.public_games_filter_status()}
          className="w-full sm:w-48"
          clearable
          value={search.status ?? ''}
          onValueChange={(value) => filter('status', value)}
          options={toOptions(['', ...MATCH_STATUSES], {
            ...MATCH_STATUS_LABELS,
            '': m.public_games_all_statuses(),
          })}
        />
      </div>

      {data?.data.length === 0 && <Empty>{m.public_games_empty()}</Empty>}

      <Agenda matches={data?.data ?? []} />

      <Pager meta={data?.meta} />
    </Section>
  )
}
