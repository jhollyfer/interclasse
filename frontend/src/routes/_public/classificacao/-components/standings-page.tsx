import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries'

import { BRACKETS_INDEX } from '../index'
import { StandingsExplorer } from '../../-components/standings-explorer'
import { Section, SectionHeader, SectionTitle } from '../../-components/section'

export function StandingsPage(): React.JSX.Element {
  const { data } = useQuery(storefrontBracketsQueryOptions(BRACKETS_INDEX))
  const [bracketId, setBracketId] = React.useState<string>()

  return (
    <Section>
      <SectionHeader>
        <SectionTitle render={<h1 />}>Classificação</SectionTitle>
      </SectionHeader>
      <StandingsExplorer
        brackets={data?.data ?? []}
        selected={bracketId}
        onSelect={setBracketId}
      />
    </Section>
  )
}
