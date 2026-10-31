import type { AdministratorUserShowResponse } from '@interclasse/shared'
import { EyeIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import {
  RowActions,
  RowActionsArchive,
  RowActionsConfirm,
  RowActionsDelete,
  RowActionsUnarchive,
} from '#/components/common/row-actions'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import {
  useUserArchiveMutation,
  useUserDeleteMutation,
  useUserUnarchiveMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

import { CopyIdMenuItem } from './copy-id-menu-item'

type UserRowActionsProps = Readonly<{
  user: AdministratorUserShowResponse
  /** Only the administrator deletes for good. Comes from the route, which has the account in context. */
  canDelete: boolean
  /**
   * The row is the account of whoever is looking.
   *
   * The backend refuses to archive and delete one's own account with
   * `403 SELF_ARCHIVE_FORBIDDEN` and `403 SELF_DELETE_FORBIDDEN`: without that
   * refusal, an administrator would lock themselves out. The screen does not offer
   * the two actions so as not to promise what the API denies.
   */
  isSelf: boolean
}>

/**
 * The row menu: view, edit, archive, restore and delete.
 *
 * The mutations live here, and not in the route: it is this menu that fires them, and
 * keeping them next to it spares the route from loading three hooks just to pass them along.
 *
 * The error becomes a toast and the row stays - `409 USER_NOT_ARCHIVED` and the two
 * `403`s of one's own account are the likely refusals, and none of them is a reason
 * for the screen to remove the record nor to sign out whoever is looking.
 */
export function UserRowActions({
  user,
  canDelete,
  isSelf,
}: UserRowActionsProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [archiveHandle] = React.useState(createConfirmHandle)
  const [unarchiveHandle] = React.useState(createConfirmHandle)
  const [deleteHandle] = React.useState(createConfirmHandle)

  // The key is the resource root, and not the current page: archiving changes the
  // count of every page and every subset, not just what is on screen.
  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.administrator.users.all,
    })
  }

  const archive = useUserArchiveMutation({
    onError: (error) => notifyError(error, { id: 'user-archive' }),
    onSuccess: () => {
      toast.success(m.admin_users_archived_ok({ name: user.name }))
      return invalidate()
    },
  })
  const unarchive = useUserUnarchiveMutation({
    onError: (error) => notifyError(error, { id: 'user-archive' }),
    onSuccess: () => {
      toast.success(m.admin_users_restored_ok({ name: user.name }))
      return invalidate()
    },
  })
  const remove = useUserDeleteMutation({
    onError: (error) => notifyError(error, { id: 'user-delete' }),
    onSuccess: () => {
      toast.success(m.admin_users_removed_ok({ name: user.name }))
      return invalidate()
    },
  })

  return (
    <RowActions
      dialogs={
        <React.Fragment>
          <RowActionsConfirm
            handle={archiveHandle}
            confirmLabel={m.common_archive()}
            onConfirm={() => archive.mutate(user.id)}
          >
            <ConfirmDialogTitle>
              {m.admin_users_archive_title({ name: user.name })}
            </ConfirmDialogTitle>
            <ConfirmDialogDescription>
              {m.admin_users_archive_description()}
            </ConfirmDialogDescription>
          </RowActionsConfirm>
          <RowActionsConfirm
            handle={unarchiveHandle}
            confirmLabel={m.common_restore()}
            onConfirm={() => unarchive.mutate(user.id)}
          >
            <ConfirmDialogTitle>
              {m.admin_users_restore_title({ name: user.name })}
            </ConfirmDialogTitle>
            <ConfirmDialogDescription>
              {m.admin_users_restore_description()}
            </ConfirmDialogDescription>
          </RowActionsConfirm>
          <RowActionsConfirm
            handle={deleteHandle}
            destructive
            confirmLabel={m.common_remove()}
            onConfirm={() => remove.mutate(user.id)}
          >
            <ConfirmDialogTitle>
              {m.admin_users_remove_title({ name: user.name })}
            </ConfirmDialogTitle>
            <ConfirmDialogDescription>
              {m.admin_users_remove_description()}
            </ConfirmDialogDescription>
          </RowActionsConfirm>
        </React.Fragment>
      }
    >
      {/* Detail and edit do not reach an archived account: the backend answers 404
          outside the trash. In the trash, only restore or delete. */}
      {!user.deletedAt && (
        <React.Fragment>
          <DropdownMenuItem
            render={
              <Link to="/administrator/users/$id" params={{ id: user.id }}>
                <EyeIcon />
                {m.admin_users_view_details()}
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/administrator/users/$id/edit" params={{ id: user.id }}>
                <PencilSimpleIcon />
                {m.admin_common_edit()}
              </Link>
            }
          />
        </React.Fragment>
      )}
      <CopyIdMenuItem id={user.id} />
      <DropdownMenuSeparator />
      {!user.deletedAt && !isSelf && (
        <RowActionsArchive handle={archiveHandle} />
      )}
      {user.deletedAt && <RowActionsUnarchive handle={unarchiveHandle} />}
      {/* Delete only appears on what is already archived: `delete.use-case.ts`
          refuses a live account with `409 USER_NOT_ARCHIVED`. Offering the button outside
          that is offering an error. */}
      {user.deletedAt && canDelete && !isSelf && (
        <RowActionsDelete handle={deleteHandle} />
      )}
    </RowActions>
  )
}
