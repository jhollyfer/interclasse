import type * as React from 'react'

import { Skeleton } from '#/components/ui/skeleton'

import { Section, SectionHeader } from './section'

/**
 * A public listing's skeleton, for the route's `pendingComponent`: the
 * title and cards at the final screen's size, in place of a blank frame
 * between the click and the response (`frontend.md` §5).
 */
export function ListSkeleton(): React.JSX.Element {
  return (
    <Section aria-busy="true">
      <SectionHeader>
        <Skeleton className="h-9 w-56" />
      </SectionHeader>
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Section>
  )
}
