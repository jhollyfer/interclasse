import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { storefrontBracketsQueryOptions } from '#/integrations/tanstack-query/queries'

import { BRACKETS_INDEX } from '../../index'
import { StandingsExplorer } from '../../../-components/standings-explorer'
import {
  Section,
  SectionHeader,
  SectionMore,
  SectionTitle,
} from '../../../-components/section'

const route = getRouteApi('/_public/classificacao/$id/')

/**
 * A chave pelo link compartilhado. A escolha mora na URL: trocar de modalidade
 * ou de categoria substitui o histórico em vez de empilhar, e o "voltar" do
 * navegador sai da classificação em vez de passar por cada chave vista.
 */
export function BracketPage(): React.JSX.Element {
  const { id } = route.useParams()
  const navigate = useNavigate()
  const { data } = useQuery(storefrontBracketsQueryOptions(BRACKETS_INDEX))

  return (
    <Section>
      <SectionHeader>
        <SectionTitle render={<h1 />}>Classificação</SectionTitle>
        <SectionMore to="/">Voltar ao início</SectionMore>
      </SectionHeader>
      <StandingsExplorer
        brackets={data?.data ?? []}
        selected={id}
        onSelect={(next) =>
          void navigate({
            to: '/classificacao/$id',
            params: { id: next },
            replace: true,
            resetScroll: false,
          })
        }
      />
    </Section>
  )
}
