import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries'

import { AnnouncementList } from '../../-components/announcement-list'
import { Section } from '../../-components/section'
import { Pager } from '../../-components/pager'

const route = getRouteApi('/_public/avisos/')

export function AnnouncementsPage(): React.JSX.Element {
  const search = route.useSearch()
  const { data } = useQuery(storefrontAnnouncementsQueryOptions(search))

  return (
    <Section as="h1" title="Avisos">
      <AnnouncementList announcements={data?.data ?? []} />
      <Pager meta={data?.meta} />
    </Section>
  )
}
