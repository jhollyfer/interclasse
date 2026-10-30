import type * as React from 'react'
import type { AdministratorUserShowResponse } from '@interclasse/shared'

import { notifyError } from '#/lib/form-errors'
import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useUserArchiveMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { m } from '#/paraglide/messages'

import { BulkArchive } from './bulk-archive'

/**
 * As ações da barra de seleção. Só arquivar: remover em massa não existe.
 *
 * A própria conta não chega aqui: a caixa dela nasce desabilitada, pelo
 * predicado de `selectable` em `table.tsx`.
 */
export function UserBulkActions({
  users,
}: Readonly<{
  users: ReadonlyArray<AdministratorUserShowResponse>
}>): React.JSX.Element {
  const archive = useUserArchiveMutation({
    onError: (error) => notifyError(error, { id: 'users-archive' }),
  })

  return (
    <BulkArchive
      items={users}
      action={(item) => archive.mutateAsync(item.id)}
      queryKey={queryKeys.administrator.users.all}
    >
      <ConfirmDialogTitle>
        {m.admin_users_bulk_archive_title()}
      </ConfirmDialogTitle>
      <ConfirmDialogDescription>
        {m.admin_users_bulk_archive_description({ count: users.length })}
      </ConfirmDialogDescription>
    </BulkArchive>
  )
}
