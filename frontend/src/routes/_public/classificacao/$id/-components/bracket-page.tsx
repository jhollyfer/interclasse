import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { TrophyIcon } from '@phosphor-icons/react'

import { BracketTree } from '#/components/common/bracket-tree'
import { storefrontBracketQueryOptions } from '#/integrations/tanstack-query/queries'
import { CATEGORY_LABELS, championName } from '#/lib/labels'

import {
  Section,
  SectionHeader,
  SectionTitle,
} from '../../../-components/section'

const route = getRouteApi('/_public/classificacao/$id/')

export function BracketPage(): React.JSX.Element {
  const { id } = route.useParams()
  const { data: bracket } = useSuspenseQuery(storefrontBracketQueryOptions(id))

  const champion = championName(bracket)

  return (
    <Section>
      <SectionHeader>
        <SectionTitle
          render={<h1 />}
        >{`${bracket.sport.name} · ${CATEGORY_LABELS[bracket.category]}`}</SectionTitle>
      </SectionHeader>
      {champion && (
        <p className="bg-accent text-accent-foreground flex items-center gap-3 rounded-lg p-4 text-lg font-extrabold uppercase italic">
          <TrophyIcon className="size-7" weight="fill" />
          Campeã: {champion}
        </p>
      )}

      <p className="text-muted-foreground text-sm">
        Mata-mata: quem vence avança (✓), quem perde está fora (riscado). Empate
        se decide nos pênaltis. Arraste para o lado para ver as fases seguintes.
      </p>

      <BracketTree bracket={bracket} />
    </Section>
  )
}
