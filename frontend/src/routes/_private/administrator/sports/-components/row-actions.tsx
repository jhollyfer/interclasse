import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { AdministratorSportShowResponse } from '@interclasse/shared'

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
import { useSportDelete } from '#/integrations/tanstack-query/mutations/administrator'

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

  const remove = useSportDelete({
    onError: (error) => notifyError(error, { id: 'sport-delete' }),
    onSuccess: () => {
      toast.success('Modalidade removida.')
      return invalidate([
        queryKeys.administrator.sports.all,
        ...DEPENDENTS.sports,
      ])
    },
  })

  return (
    <RowActions>
      <DropdownMenuItem
        render={
          <Link to="/administrator/sports/$id/edit" params={{ id: sport.id }}>
            <PencilSimpleIcon />
            Editar
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete onConfirm={() => remove.mutate(sport.id)}>
        <ConfirmDialogTitle>{`Remover a modalidade ${sport.name}?`}</ConfirmDialogTitle>
        <ConfirmDialogDescription>
          Só é possível enquanto nenhuma turma inscreveu atletas nela. Não dá
          para desfazer.
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
