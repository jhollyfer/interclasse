import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries'

import { BRACKETS_INDEX } from '../index'
import { BracketIndex } from '../../-components/bracket-index'
import { Section, SectionHeader, SectionTitle } from '../../-components/section'

export function StandingsPage(): React.JSX.Element {
  const { data } = useQuery(storefrontBracketsQueryOptions(BRACKETS_INDEX))

  return (
    <Section>
      <SectionHeader>
        <SectionTitle render={<h1 />}>Classificação</SectionTitle>
      </SectionHeader>
      <BracketIndex brackets={data?.data ?? []} />
    </Section>
  )
}
