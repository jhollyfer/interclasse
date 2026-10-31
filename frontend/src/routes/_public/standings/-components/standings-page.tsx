import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { Section, SectionHeader, SectionTitle } from '../../-components/section'
import { StandingsExplorer } from '../../-components/standings-explorer'
import { BRACKETS_INDEX } from '../index'

export function StandingsPage(): React.JSX.Element {
  const { data } = useQuery(storefrontBracketsQueryOptions(BRACKETS_INDEX))
  const [bracketId, setBracketId] = React.useState<string>()

  return (
    <Section>
      <SectionHeader>
        <SectionTitle level="h1">{m.public_nav_standings()}</SectionTitle>
      </SectionHeader>
      <StandingsExplorer
        brackets={data?.data ?? []}
        selected={bracketId}
        onSelect={setBracketId}
      />
    </Section>
  )
}
