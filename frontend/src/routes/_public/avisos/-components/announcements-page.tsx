import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { AnnouncementList } from '../../-components/announcement-list'
import { Section, SectionHeader, SectionTitle } from '../../-components/section'
import { Pager } from '../../-components/pager'

const route = getRouteApi('/_public/avisos/')

export function AnnouncementsPage(): React.JSX.Element {
  const search = route.useSearch()
  const { data } = useQuery(storefrontAnnouncementsQueryOptions(search))

  return (
    <Section>
      <SectionHeader>
        <SectionTitle render={<h1 />}>
          {m.public_nav_announcements()}
        </SectionTitle>
      </SectionHeader>
      <AnnouncementList announcements={data?.data ?? []} />
      <Pager meta={data?.meta} />
    </Section>
  )
}
