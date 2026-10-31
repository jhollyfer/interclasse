import { ArchiveIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import type * as React from 'react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
} from '#/components/common/confirm-dialog'
import { Button } from '#/components/ui/button'
import { runBulk } from '#/lib/bulk'
import type { BulkOutcome } from '#/lib/bulk'
import { m } from '#/paraglide/messages'

type BulkArchiveProps<TItem> = Readonly<{
  /** The rows selected in the selection bar. */
  items: ReadonlyArray<TItem>
  /** What archiving one item does. Almost always `(item) => archive.mutateAsync(item.id)`. */
  action: (item: TItem) => Promise<unknown>
  /**
   * The resource's cache prefix - `queryKeys.administrator.users.all`.
   *
   * The invalidation happens **once**, after the whole loop, and not once per item: with N
   * items the mutation's `onSuccess` would fire N refetches of the same listing,
   * and only the last one counts.
   */
  queryKey: QueryKey
  /** `ConfirmDialogTitle` and `ConfirmDialogDescription`: the text is markup. */
  children: React.ReactNode
}>

/**
 * The notice at the end of the batch. The partial report is the point: "7 de 9 arquivados" is
 * actionable, "erro ao arquivar" after seven successes is a lie. Each case is
 * a whole message, with the number inflection inside it and not assembled here.
 */
function bulkArchiveMessage(outcome: BulkOutcome): string {
  const total = outcome.done + outcome.failed

  if (outcome.failed === 0)
    return m.admin_bulk_archive_done({ done: outcome.done })

  if (outcome.done === 0) return m.admin_bulk_archive_none({ total })

  return m.admin_bulk_archive_partial({
    done: outcome.done,
    total,
    failed: outcome.failed,
  })
}

/**
 * Archive the selected rows.
 *
 * The bulk action is the same on the dashboard's seven listings - the same trigger, the
 * same `runBulk`, the same partial report, the same footer. What changes is the
 * resource and the two sentences, so the resource comes by prop and the sentences by
 * slot.
 *
 * There is no context here: title and description read no state at all, they are the
 * header of the `ConfirmDialog` below, written by the screen. A stateless provider
 * with nothing to share is overhead, and `compound-pattern` itself says so.
 *
 * Bulk removal does not exist on purpose: archiving and restoring belongs to the editor,
 * deleting for good belongs only to the administrator and only reaches what is already archived.
 * From here we only archive, and what went to the trash comes back through the row.
 */
export function BulkArchive<TItem>({
  items,
  action,
  queryKey,
  children,
}: BulkArchiveProps<TItem>): React.JSX.Element {
  const queryClient = useQueryClient()

  async function confirm(): Promise<void> {
    const outcome = await runBulk(items, action)

    // The notice first: `invalidateQueries` only resolves when the refetch
    // comes back, and waiting for it here would delay the "7 de 9 arquivados" by a trip
    // to the server that nobody is watching.
    toast.success(bulkArchiveMessage(outcome), { id: 'bulk-archive' })

    await queryClient.invalidateQueries({ queryKey })
  }

  return (
    <ConfirmDialog
      onConfirm={() => void confirm()}
      render={
        <Button variant="outline">
          <ArchiveIcon />
          {m.admin_common_archive()}
        </Button>
      }
    >
      <ConfirmDialogHeader>{children}</ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>{m.admin_common_archive()}</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
