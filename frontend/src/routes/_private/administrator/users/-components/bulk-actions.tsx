import type * as React from 'react'

import { BulkArchive } from '#/components/common/bulk-archive'
import { notifyError } from '#/lib/form-errors'
import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useUserArchive } from '#/integrations/tanstack-query/mutations'
import type { IUser } from '#/lib/interfaces'

/**
 * As ações da barra de seleção. Só arquivar: remover em massa não existe.
 *
 * A própria conta não chega aqui: a caixa dela nasce desabilitada, pelo
 * predicado de `selectable` em `table.tsx`.
 */
export function UserBulkActions({
  users,
}: {
  users: Array<IUser>
}): React.JSX.Element {
  const archive = useUserArchive({
    onError: (error) => notifyError(error, { id: 'users-archive' }),
  })

  return (
    <BulkArchive
      items={users}
      action={(item) => archive.mutateAsync(item.id)}
      queryKey={queryKeys.administrator.users.all}
      verb="arquivados"
    >
      <ConfirmDialogTitle>Arquivar usuários</ConfirmDialogTitle>
      <ConfirmDialogDescription>{`${users.length} conta(s) deixam de entrar no painel e saem da listagem. Podem ser restauradas depois.`}</ConfirmDialogDescription>
    </BulkArchive>
  )
}
