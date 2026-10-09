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
import { useClassroomDelete } from '#/integrations/tanstack-query/mutations'
import type { Classroom } from '#/lib/validator'

/**
 * Editar e apagar. Turma já sorteada numa chave é recusada pelo servidor com
 * `409 CLASSROOM_IN_COMPETITION`, que vira toast - a linha fica.
 */
export function ClassroomRowActions({
  classroom,
}: {
  classroom: Classroom
}): React.JSX.Element {
  const queryClient = useQueryClient()

  const remove = useClassroomDelete({
    onError: (error) => toast.error(error.message, { id: 'classroom-delete' }),
    onSuccess: () => {
      toast.success('Turma removida.')
      return Promise.all(
        [queryKeys.classrooms.all, ...DEPENDENTS.classrooms].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      )
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
