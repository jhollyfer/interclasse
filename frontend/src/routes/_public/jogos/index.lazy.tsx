import type * as React from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import {
  storefrontMatchesQueryOptions,
  storefrontSportsQueryOptions,
} from '#/integrations/tanstack-query/queries'
import { CATEGORIES, MATCH_STATUSES } from '#/lib/entity'
import { CATEGORY_LABELS, MATCH_STATUS_LABELS } from '#/lib/labels'

import { Empty, Section } from '../-components/section'
import { Pager } from '../-components/pager'
import { Agenda } from '../-components/match-row'

export const Route = createLazyFileRoute('/_public/jogos/')({
  component: Games,
})

function Games(): React.JSX.Element {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/jogos/' })
  const { data } = useQuery(storefrontMatchesQueryOptions(search))
  const { data: sports } = useQuery(storefrontSportsQueryOptions())

  function filter(key: 'sportId' | 'category' | 'status', value: string) {
    void navigate({
      search: { ...search, [key]: value || undefined, page: undefined },
    })
  }

  return (
    <Section as="h1" title="Tabela de jogos">
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
