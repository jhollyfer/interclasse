import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries'

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
        <SectionTitle render={<h1 />}>Avisos</SectionTitle>
      </SectionHeader>
      <AnnouncementList announcements={data?.data ?? []} />
      <Pager meta={data?.meta} />
    </Section>
  )
}
