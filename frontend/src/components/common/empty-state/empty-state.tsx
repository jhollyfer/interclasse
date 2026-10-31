import * as React from 'react'

import { Empty } from '#/components/ui/empty'
import { cn } from '#/lib/cn'

import { EmptyStateProvider } from './empty-state-context'
import type { EmptyStateReason } from './empty-state-context'

type EmptyStateProps = Readonly<
  {
    reason: EmptyStateReason
  } & React.ComponentProps<typeof Empty>
>

/**
 * A list's empty state, by reason (`frontend.md` §10.1), on top of
 * `ui/empty` (_doc-lib/shadcn.md#empty).
 *
 * The reason goes through the context: the parts pick its text, and the screen only
 * writes what holds for a true empty (`empty`). Filter and trash use the
 * component's text.
 *
 * `gap-1` and not `Empty`'s `gap-4`: title and description stay together, and it is
 * `EmptyStateActions` that opens the breathing room before the button.
 */
export function EmptyState({
  reason,
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  const value = { reason }

  return (
    <EmptyStateProvider value={value}>
      <Empty
        data-slot="empty-state"
        className={cn('gap-1 rounded-xl border', className)}
        {...props}
      />
    </EmptyStateProvider>
  )
}
