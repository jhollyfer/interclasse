import type * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { storefrontAnnouncementsQueryOptions } from '#/integrations/tanstack-query/queries'

import { AnnouncementList } from '../-components/announcement-list'
import { Section } from '../-components/section'
import { Pager } from '../-components/pager'

export const Route = createLazyFileRoute('/_public/avisos/')({
  component: Announcements,
})

function Announcements(): React.JSX.Element {
  const search = Route.useSearch()
  const { data } = useQuery(storefrontAnnouncementsQueryOptions(search))

  return (
    <Section as="h1" title="Avisos">
      <AnnouncementList announcements={data?.data ?? []} />
      <Pager meta={data?.meta} />
    </Section>
  )
}
