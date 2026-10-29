import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { TreeStructureIcon } from '@phosphor-icons/react'
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
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useBracketDelete } from '#/integrations/tanstack-query/mutations/administrator'
import { notifyError } from '#/lib/form-errors'
import type { IBracket } from '#/lib/interfaces'
import { CATEGORY_LABELS } from '#/lib/labels'

/**
 * Abrir e apagar a chave pela lista. Chave com placar lançado é recusada pelo
 * servidor com `409 BRACKET_HAS_RESULTS`, que vira toast - a linha fica.
 */
export function BracketRowActions({
  bracket,
}: Readonly<{
  bracket: IBracket
}>): React.JSX.Element {
  const invalidate = useInvalidate()

  const remove = useBracketDelete({
    onError: (error) => notifyError(error, { id: 'bracket-delete' }),
    onSuccess: () => {
      toast.success('Chave apagada. As inscrições reabriram.')
      return invalidate([...GAME_KEYS, ...DEPENDENTS.games])
    },
  })

  return (
    <RowActions>
      <DropdownMenuItem
        render={
          <Link to="/administrator/brackets/$id" params={{ id: bracket.id }}>
            <TreeStructureIcon />
            Abrir chave
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete onConfirm={() => remove.mutate(bracket.id)}>
        <ConfirmDialogTitle>
          {`Apagar a chave de ${bracket.sport?.name ?? 'modalidade'} · ${CATEGORY_LABELS[bracket.category]}?`}
        </ConfirmDialogTitle>
        <ConfirmDialogDescription>
          As partidas da chave são apagadas e as inscrições reabrem. Chave com
          placar lançado não pode ser apagada.
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
