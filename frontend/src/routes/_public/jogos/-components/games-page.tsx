import type * as React from 'react'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CATEGORIES, MATCH_STATUSES } from '@interclasse/shared'

import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import {
  storefrontMatchesQueryOptions,
  storefrontSportsQueryOptions,
} from '#/integrations/tanstack-query/queries/storefront'
import { CATEGORY_LABELS, MATCH_STATUS_LABELS } from '#/lib/labels'
import { Agenda } from '#/components/common/match-agenda'

import {
  Empty,
  Section,
  SectionHeader,
  SectionTitle,
} from '../../-components/section'
import { Pager } from '../../-components/pager'

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
        <SectionTitle render={<h1 />}>Tabela de jogos</SectionTitle>
      </SectionHeader>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <OptionCombobox
          aria-label="Modalidade"
          className="w-full sm:w-48"
          clearable
          value={search.sportId ?? ''}
          onValueChange={(value) => filter('sportId', value)}
          options={[
            { value: '', label: 'Toda modalidade' },
            ...(sports?.data ?? []).map((sport) => ({
              value: sport.id,
              label: sport.name,
            })),
          ]}
        />
        <OptionCombobox
          aria-label="Categoria"
          className="w-full sm:w-48"
          clearable
          value={search.category ?? ''}
          onValueChange={(value) => filter('category', value)}
          options={toOptions(['', ...CATEGORIES], {
            ...CATEGORY_LABELS,
            '': 'Toda categoria',
          })}
        />
        <OptionCombobox
          aria-label="Situação"
          className="w-full sm:w-48"
          clearable
          value={search.status ?? ''}
          onValueChange={(value) => filter('status', value)}
          options={toOptions(['', ...MATCH_STATUSES], {
            ...MATCH_STATUS_LABELS,
            '': 'Todos',
          })}
        />
      </div>

      {data?.data.length === 0 && <Empty>Nenhum jogo neste recorte.</Empty>}

      <Agenda matches={data?.data ?? []} />

      <Pager meta={data?.meta} />
    </Section>
  )
}
