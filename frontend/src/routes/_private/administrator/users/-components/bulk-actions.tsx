import type * as React from 'react'
import { toast } from 'sonner'

import { BulkArchive } from '#/components/common/bulk-archive'
import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useUserArchive } from '#/integrations/tanstack-query/mutations'
import type { User } from '#/lib/validator'

/**
 * As ações da barra de seleção. Só arquivar: remover em massa não existe.
 *
 * A própria conta não chega aqui: a caixa dela nasce desabilitada, pelo
 * predicado de `selectable` em `table.tsx`.
 */
export function UserBulkActions({
  users,
}: {
  users: Array<User>
}): React.JSX.Element {
  const archive = useUserArchive({
    onError: (error) => toast.error(error.message, { id: 'users-archive' }),
  })

  return (
    <BulkArchive
      items={users}
      action={(item) => archive.mutateAsync(item.id)}
      queryKey={queryKeys.users.all}
      verb="arquivados"
    >
      <ConfirmDialogTitle>Arquivar usuários</ConfirmDialogTitle>
      <ConfirmDialogDescription>{`${users.length} conta(s) deixam de entrar no painel e saem da listagem. Podem ser restauradas depois.`}</ConfirmDialogDescription>
    </BulkArchive>
  )
}
