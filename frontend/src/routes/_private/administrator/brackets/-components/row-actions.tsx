import type { AdministratorBracketPaginateResponse } from '@interclasse/shared'
import { TreeStructureIcon } from '@phosphor-icons/react'
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
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useBracketDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { createConfirmHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * Open and delete the bracket from the list. A bracket with a recorded score is refused by the
 * server with `409 BRACKET_HAS_RESULTS`, which becomes a toast - the row stays.
 */
export function BracketRowActions({
  bracket,
}: Readonly<{
  bracket: AdministratorBracketPaginateResponse
}>): React.JSX.Element {
  const invalidate = useInvalidate()
  const [deleteHandle] = React.useState(createConfirmHandle)

  const remove = useBracketDeleteMutation({
    onError: (error) => notifyError(error, { id: 'bracket-delete' }),
    onSuccess: () => {
      toast.success(m.admin_brackets_deleted())
      return invalidate([...GAME_KEYS, ...DEPENDENTS.games])
    },
  })

  return (
    <RowActions
      dialogs={
        <RowActionsConfirm
          handle={deleteHandle}
          destructive
          confirmLabel={m.common_remove()}
          onConfirm={() => remove.mutate(bracket.id)}
        >
          <ConfirmDialogTitle>
            {m.admin_brackets_row_delete_title({
              sport: bracket.sport.name,
              category: CATEGORY_LABELS[bracket.category] ?? bracket.category,
            })}
          </ConfirmDialogTitle>
          <ConfirmDialogDescription>
            {m.admin_brackets_row_delete_description()}
          </ConfirmDialogDescription>
        </RowActionsConfirm>
      }
    >
      <DropdownMenuItem
        render={
          <Link to="/administrator/brackets/$id" params={{ id: bracket.id }}>
            <TreeStructureIcon />
            {m.admin_brackets_open()}
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete handle={deleteHandle} />
    </RowActions>
  )
}
