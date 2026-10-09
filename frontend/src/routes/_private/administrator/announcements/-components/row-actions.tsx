import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { RowActions, RowActionsDelete } from '#/components/common/row-actions'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useAnnouncementDelete } from '#/integrations/tanstack-query/mutations'
import type { Announcement } from '#/lib/validator'

/** Editar e apagar. O aviso some do site na hora. */
export function AnnouncementRowActions({
  announcement,
}: {
  announcement: Announcement
}): React.JSX.Element {
  const queryClient = useQueryClient()

  const remove = useAnnouncementDelete({
    onError: (error) =>
      toast.error(error.message, { id: 'announcement-delete' }),
    onSuccess: () => {
      toast.success('Aviso removido.')
      return Promise.all(
        [queryKeys.announcements.all, ...DEPENDENTS.announcements].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      )
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
            Editar
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete onConfirm={() => remove.mutate(announcement.id)}>
        <ConfirmDialogTitle>{`Remover o aviso "${announcement.title}"?`}</ConfirmDialogTitle>
        <ConfirmDialogDescription>
          Ele some do site na hora. Não dá para desfazer.
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
