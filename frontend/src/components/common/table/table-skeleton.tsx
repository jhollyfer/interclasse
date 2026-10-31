import type * as React from 'react'

import {
  PageShell,
  PageShellContent,
  PageShellFooter,
  PageShellHeader,
} from '#/components/common/page-shell'
import { Skeleton } from '#/components/ui/skeleton'

/**
 * A listing's skeleton, for the route's `pendingComponent`.
 *
 * The dashboard's 32 listings resolve the `loader` before the component exists,
 * so between the click and the response there was no frame at all: the previous screen
 * stayed still, and on a cold click that reads as a freeze. This is the frame that
 * was missing.
 *
 * **It lives in the route's critical file, never in `.lazy.tsx`.**
 * `createLazyFileRoute` accepts `pendingComponent`, but inside the lazy chunk it
 * would only appear after the chunk arrived - which is exactly when it
 * stops being needed. That is why `pendingComponent` is also not among the
 * groups that the automatic splitter separates
 * (`router-plugin/core/constants.js:11`): it stays eager on purpose.
 *
 * No context and no `useTable`: here the route has not loaded yet, and there is no
 * `Table` around to provide anything. And without receiving the real columns -
 * importing the listing's `*_COLUMNS` would bring the cells, the row actions and the
 * mutations along to the eager side, undoing the cut that the `.lazy.tsx` pair
 * exists to make auditable. A literal count is enough to reserve the
 * space.
 */
export function TableSkeleton({
  columns = 6,
  rows = 8,
}: Readonly<{
  /** How many columns to draw. A literal, never `COLUMNS.length`. */
  columns?: number
  rows?: number
}>): React.JSX.Element {
  // The same cells in the header and in every row. A React element is immutable,
  // so the same array serves both places - and the keys are local to each
  // parent, they do not compete with each other.
  const cells = Array.from({ length: columns }, (_, column) => (
    <Skeleton key={column} className="h-4 flex-1" />
  ))

  return (
    <PageShell data-slot="table-skeleton">
      <PageShellHeader>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </PageShellHeader>

      <PageShellContent>
        {/* The search and filters bar, which sits above the grid. */}
        <div className="flex items-center justify-between gap-2 pb-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="overflow-hidden rounded-md border">
          {/* The grid header, taller and darker than the rows. */}
          <div
            className="flex gap-4 border-b bg-muted/50 px-4 py-3"
            aria-hidden
          >
            {cells}
          </div>

          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="flex gap-4 border-b px-4 py-4 last:border-b-0"
              aria-hidden
            >
              {cells}
            </div>
          ))}
        </div>
      </PageShellContent>

      <PageShellFooter>
        <Skeleton className="h-9 w-64" />
      </PageShellFooter>
    </PageShell>
  )
}
