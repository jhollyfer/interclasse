import type * as React from 'react'

import { Empty, EmptyDescription } from '#/components/ui/empty'
import { cn } from '#/lib/cn'

/**
 * A short "nothing here yet" note, on top of `ui/empty`: a dashed frame and one sentence.
 * It replaces the `<p>` with a dashed border that each screen wrote by hand. The list's
 * empty states with a title and an action are `EmptyState`.
 */
export function EmptyNote({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Empty>): React.JSX.Element {
  return (
    <Empty
      data-slot="empty-note"
      className={cn('rounded-lg border border-dashed p-6', className)}
      {...props}
    >
      <EmptyDescription className="text-sm">{children}</EmptyDescription>
    </Empty>
  )
}
