import type * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries'

import { BRACKETS_INDEX } from './index'
import { BracketIndex } from '../-components/bracket-index'
import { Section } from '../-components/section'

export const Route = createLazyFileRoute('/_public/classificacao/')({
  component: Standings,
})

function Standings(): React.JSX.Element {
  const { data } = useQuery(storefrontBracketsQueryOptions(BRACKETS_INDEX))

  return (
    <Section as="h1" title="Classificação">
      <BracketIndex brackets={data?.data ?? []} />
    </Section>
  )
}
