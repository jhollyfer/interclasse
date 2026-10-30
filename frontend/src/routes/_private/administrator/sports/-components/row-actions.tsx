import type { AdministratorSportShowResponse } from '@interclasse/shared'
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
import { useSportDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

/**
 * Editar e apagar. Modalidade com inscrições é recusada pelo servidor com
 * `409 SPORT_IN_USE`, que vira toast - a linha fica.
 */
export function SportRowActions({
  sport,
}: Readonly<{
  sport: AdministratorSportShowResponse
}>): React.JSX.Element {
  const invalidate = useInvalidate()
  const [deleteHandle] = React.useState(createConfirmHandle)

  const remove = useSportDeleteMutation({
    onError: (error) => notifyError(error, { id: 'sport-delete' }),
    onSuccess: () => {
      toast.success(m.admin_sports_removed())
      return invalidate([
        queryKeys.administrator.sports.all,
        ...DEPENDENTS.sports,
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
          onConfirm={() => remove.mutate(sport.id)}
        >
          <ConfirmDialogTitle>
            {m.admin_sports_remove_title({ name: sport.name })}
          </ConfirmDialogTitle>
          <ConfirmDialogDescription>
            {m.admin_sports_remove_description()}
          </ConfirmDialogDescription>
        </RowActionsConfirm>
      }
    >
      <DropdownMenuItem
        render={
          <Link to="/administrator/sports/$id/edit" params={{ id: sport.id }}>
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
