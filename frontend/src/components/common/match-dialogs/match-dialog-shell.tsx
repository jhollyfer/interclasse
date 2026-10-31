import * as React from 'react'

import { Dialog, DialogContent } from '#/components/ui/dialog'
import type { DialogHandle } from '#/lib/dialog-handle'

/** The minimum of a match that the dialogs need. */
export type MatchRef = Readonly<{
  id: string
  phase: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeName: string | null
  awayName: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  scheduledAt: string | null
  location: string | null
}>

type MatchDialogShellProps = Readonly<{
  /** One handle per dialog; the table opens with `handle.openWithPayload(match)`. */
  handle: DialogHandle<MatchRef>
  className?: string
  /** The content, mounted only when open and with the clicked match. */
  children: (match: MatchRef) => React.ReactNode
}>

/**
 * The match dialogs' shell: uncontrolled, opened by `handle` with the
 * match as payload (`frontend.md` §6.2). The content only mounts open, so
 * the form is born with the clicked match and vanishes on close - no `key`, no
 * "which match" state on the screen.
 * _doc-lib/base-ui.md#react/components/dialog.
 */
export function MatchDialogShell({
  handle,
  className,
  children,
}: MatchDialogShellProps): React.JSX.Element {
  return (
    <Dialog handle={handle}>
      {({ payload }) => (
        <React.Fragment>
          {payload !== undefined && (
            <DialogContent className={className}>
              {children(payload)}
            </DialogContent>
          )}
        </React.Fragment>
      )}
    </Dialog>
  )
}
