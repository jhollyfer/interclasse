import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type * as React from 'react'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import {
  Section,
  SectionHeader,
  SectionMore,
  SectionTitle,
} from '../../../-components/section'
import { StandingsExplorer } from '../../../-components/standings-explorer'
import { BRACKETS_INDEX } from '../../index'

const route = getRouteApi('/_public/standings/$id/')

/**
 * The bracket through the shared link. The choice lives in the URL: switching sport
 * or category replaces the history instead of stacking, and the browser's "back" leaves the
 * standings instead of going through each bracket viewed.
 */
export function BracketPage(): React.JSX.Element {
  const { id } = route.useParams()
  const navigate = useNavigate()
  const { data } = useQuery(storefrontBracketsQueryOptions(BRACKETS_INDEX))

  return (
    <Section>
      <SectionHeader>
        <SectionTitle level="h1">{m.public_nav_standings()}</SectionTitle>
        <SectionMore to="/">{m.common_back_home()}</SectionMore>
      </SectionHeader>
      <StandingsExplorer
        brackets={data?.data ?? []}
        selected={id}
        onSelect={(next) =>
          void navigate({
            to: '/standings/$id',
            params: { id: next },
            replace: true,
            resetScroll: false,
          })
        }
      />
    </Section>
  )
}
