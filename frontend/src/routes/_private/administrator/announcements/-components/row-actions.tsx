import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { RowActions, RowActionsDelete } from '#/components/common/row-actions'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { notifyError } from '#/lib/form-errors'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useAnnouncementDelete } from '#/integrations/tanstack-query/mutations/administrator'
import { m } from '#/paraglide/messages'

/** Editar e apagar. O aviso some do site na hora. */
export function AnnouncementRowActions({
  announcement,
}: Readonly<{
  announcement: AdministratorAnnouncementShowResponse
}>): React.JSX.Element {
  const invalidate = useInvalidate()

  const remove = useAnnouncementDelete({
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
    <RowActions>
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
      <RowActionsDelete onConfirm={() => remove.mutate(announcement.id)}>
        <ConfirmDialogTitle>
          {m.admin_announcements_remove_title({ title: announcement.title })}
        </ConfirmDialogTitle>
        <ConfirmDialogDescription>
          {m.admin_announcements_remove_description()}
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
