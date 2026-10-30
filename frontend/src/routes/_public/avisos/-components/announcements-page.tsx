import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { AnnouncementList } from '../../-components/announcement-list'
import { Pager } from '../../-components/pager'
import { Section, SectionHeader, SectionTitle } from '../../-components/section'

const route = getRouteApi('/_public/avisos/')

export function AnnouncementsPage(): React.JSX.Element {
  const search = route.useSearch()
  const { data } = useQuery(storefrontAnnouncementsQueryOptions(search))

  return (
    <Section>
      <SectionHeader>
        <SectionTitle level="h1">
          {m.public_nav_announcements()}
        </SectionTitle>
      </SectionHeader>
      <AnnouncementList announcements={data?.data ?? []} />
      <Pager meta={data?.meta} />
    </Section>
  )
}
