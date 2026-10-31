import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import {
  RowActions,
  RowActionsConfirm,
  RowActionsDelete,
} from '#/components/common/row-actions'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useAnnouncementDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

/** Edit and delete. The announcement leaves the site at once. */
export function AnnouncementRowActions({
  announcement,
}: Readonly<{
  announcement: AdministratorAnnouncementShowResponse
}>): React.JSX.Element {
  const invalidate = useInvalidate()
  const [deleteHandle] = React.useState(createConfirmHandle)

  const remove = useAnnouncementDeleteMutation({
    onError: (error) => notifyError(error, { id: 'announcement-delete' }),
    onSuccess: () => {
      toast.success(m.admin_announcements_removed())
      return invalidate([
        queryKeys.administrator.announcements.all,
        ...DEPENDENTS.announcements,
      ])
    },
  })

  return (
    <RowActions
      dialogs={
        <RowActionsConfirm
          handle={deleteHandle}
          destructive
          confirmLabel={m.common_remove()}
          onConfirm={() => remove.mutate(announcement.id)}
        >
          <ConfirmDialogTitle>
            {m.admin_announcements_remove_title({ title: announcement.title })}
          </ConfirmDialogTitle>
          <ConfirmDialogDescription>
            {m.admin_announcements_remove_description()}
          </ConfirmDialogDescription>
        </RowActionsConfirm>
      }
    >
      <DropdownMenuItem
        render={
          <Link
            to="/administrator/announcements/$id/edit"
            params={{ id: announcement.id }}
          >
            <PencilSimpleIcon />
            {m.admin_common_edit()}
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete handle={deleteHandle} />
    </RowActions>
  )
}
