import type * as React from 'react'
import { Link } from '@tanstack/react-router'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

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
import { useClassroomDelete } from '#/integrations/tanstack-query/mutations/administrator'
import type { IClassroom } from '#/lib/interfaces'

/**
 * Editar e apagar. Turma já sorteada numa chave é recusada pelo servidor com
 * `409 CLASSROOM_IN_COMPETITION`, que vira toast - a linha fica.
 */
export function ClassroomRowActions({
  classroom,
}: Readonly<{
  classroom: IClassroom
}>): React.JSX.Element {
  const invalidate = useInvalidate()

  const remove = useClassroomDelete({
    onError: (error) => notifyError(error, { id: 'classroom-delete' }),
    onSuccess: () => {
      toast.success('Turma removida.')
      return invalidate([
        queryKeys.administrator.classrooms.all,
        ...DEPENDENTS.classrooms,
      ])
    },
  })

  return (
    <RowActions>
      <DropdownMenuItem
        render={
          <Link
            to="/administrator/classrooms/$id/edit"
            params={{ id: classroom.id }}
          >
            <PencilSimpleIcon />
            Editar
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete onConfirm={() => remove.mutate(classroom.id)}>
        <ConfirmDialogTitle>{`Remover a turma ${classroom.name}?`}</ConfirmDialogTitle>
        <ConfirmDialogDescription>
          Os alunos e as inscrições dela são apagados junto. Não dá para
          desfazer.
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
