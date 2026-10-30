import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { TreeStructureIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { AdministratorBracketPaginateResponse } from '@interclasse/shared'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { RowActions, RowActionsDelete } from '#/components/common/row-actions'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useBracketDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { notifyError } from '#/lib/form-errors'
import { CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * Abrir e apagar a chave pela lista. Chave com placar lançado é recusada pelo
 * servidor com `409 BRACKET_HAS_RESULTS`, que vira toast - a linha fica.
 */
export function BracketRowActions({
  bracket,
}: Readonly<{
  bracket: AdministratorBracketPaginateResponse
}>): React.JSX.Element {
  const invalidate = useInvalidate()

  const remove = useBracketDeleteMutation({
    onError: (error) => notifyError(error, { id: 'bracket-delete' }),
    onSuccess: () => {
      toast.success(m.admin_brackets_deleted())
      return invalidate([...GAME_KEYS, ...DEPENDENTS.games])
    },
  })

  return (
    <RowActions>
      <DropdownMenuItem
        render={
          <Link to="/administrator/brackets/$id" params={{ id: bracket.id }}>
            <TreeStructureIcon />
            {m.admin_brackets_open()}
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete onConfirm={() => remove.mutate(bracket.id)}>
        <ConfirmDialogTitle>
          {m.admin_brackets_row_delete_title({
            sport: bracket.sport.name,
            category: CATEGORY_LABELS[bracket.category] ?? bracket.category,
          })}
        </ConfirmDialogTitle>
        <ConfirmDialogDescription>
          {m.admin_brackets_row_delete_description()}
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
