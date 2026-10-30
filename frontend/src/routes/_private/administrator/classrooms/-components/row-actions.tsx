import type { AdministratorClassroomShowResponse } from '@interclasse/shared'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'
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
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useClassroomDeleteMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

/**
 * Editar e apagar. Turma já sorteada numa chave é recusada pelo servidor com
 * `409 CLASSROOM_IN_COMPETITION`, que vira toast - a linha fica.
 */
export function ClassroomRowActions({
  classroom,
}: Readonly<{
  classroom: AdministratorClassroomShowResponse
}>): React.JSX.Element {
  const invalidate = useInvalidate()

  const remove = useClassroomDeleteMutation({
    onError: (error) => notifyError(error, { id: 'classroom-delete' }),
    onSuccess: () => {
      toast.success(m.admin_classrooms_removed())
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
            {m.admin_common_edit()}
          </Link>
        }
      />
      <DropdownMenuSeparator />
      <RowActionsDelete onConfirm={() => remove.mutate(classroom.id)}>
        <ConfirmDialogTitle>
          {m.admin_classrooms_remove_title({ name: classroom.name })}
        </ConfirmDialogTitle>
        <ConfirmDialogDescription>
          {m.admin_classrooms_remove_description()}
        </ConfirmDialogDescription>
      </RowActionsDelete>
    </RowActions>
  )
}
