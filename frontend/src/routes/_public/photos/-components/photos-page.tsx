import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import type * as React from 'react'

import { storefrontPhotosQueryOptions } from '#/integrations/tanstack-query/queries/storefront'
import { m } from '#/paraglide/messages'

import { Pager } from '../../-components/pager'
import { PhotoFigure } from '../../-components/photo-figure'
import {
  Empty,
  Section,
  SectionHeader,
  SectionTitle,
} from '../../-components/section'

const route = getRouteApi('/_public/photos/')

/** Every approved photo, page by page: the carousel on the home shows only the latest. */
export function PhotosPage(): React.JSX.Element {
  const search = route.useSearch()
  const { data } = useQuery(storefrontPhotosQueryOptions(search))
  const photos = data?.data ?? []

  return (
    <Section>
      <SectionHeader>
        <SectionTitle level="h1">{m.public_nav_photos()}</SectionTitle>
      </SectionHeader>
      {photos.length === 0 && <Empty>{m.public_photos_empty()}</Empty>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.id}>
            <PhotoFigure photo={photo} />
          </li>
        ))}
      </ul>
      <Pager meta={data?.meta} />
    </Section>
  )
}
