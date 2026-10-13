import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { EyeIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  ConfirmDialogDescription,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { notifyError } from '#/lib/form-errors'
import {
  RowActions,
  RowActionsArchive,
  RowActionsDelete,
  RowActionsUnarchive,
} from '#/components/common/row-actions'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import {
  useUserArchive,
  useUserDelete,
  useUserUnarchive,
} from '#/integrations/tanstack-query/mutations'
import type { IUser } from '#/lib/interfaces'

import { CopyIdMenuItem } from './copy-id-menu-item'

type UserRowActionsProps = {
  user: IUser
  /** Só administrador apaga de vez. Vem da rota, que tem a conta em contexto. */
  canDelete: boolean
  /**
   * A linha é a conta de quem está olhando.
   *
   * O backend recusa arquivar e apagar a própria conta com
   * `403 SELF_ARCHIVE_FORBIDDEN` e `403 SELF_DELETE_FORBIDDEN`: sem essa
   * recusa, um administrador se trancaria para fora sozinho. A tela não oferece
   * as duas ações para não prometer o que a API nega.
   */
  isSelf: boolean
}

/**
 * O menu da linha: ver, editar, arquivar, restaurar e apagar.
 *
 * As mutations moram aqui, e não na rota: quem as dispara é este menu, e
 * mantê-las junto dele evita a rota carregar três hooks só para repassá-los.
 *
 * O erro vira toast e a linha permanece - `409 USER_NOT_ARCHIVED` e os dois
 * `403` da própria conta são as recusas prováveis, e nenhuma delas é motivo
 * para a tela sumir com o registro nem para deslogar quem está olhando.
 */
export function UserRowActions({
  user,
  canDelete,
  isSelf,
}: UserRowActionsProps): React.JSX.Element {
  const queryClient = useQueryClient()

  // A chave é a raiz do recurso, e não a página corrente: arquivar muda a
  // contagem de toda página e de todo recorte, não só do que está na tela.
  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.administrator.users.all,
    })
  }

  const archive = useUserArchive({
    onError: (error) => notifyError(error, { id: 'user-archive' }),
    onSuccess: () => {
      toast.success(`Conta de ${user.name} arquivada.`)
      return invalidate()
    },
  })
  const unarchive = useUserUnarchive({
    onError: (error) => notifyError(error, { id: 'user-archive' }),
    onSuccess: () => {
      toast.success(`Conta de ${user.name} restaurada.`)
      return invalidate()
    },
  })
  const remove = useUserDelete({
    onError: (error) => notifyError(error, { id: 'user-delete' }),
    onSuccess: () => {
      toast.success(`Conta de ${user.name} removida.`)
      return invalidate()
    },
  })

  return (
    <RowActions>
      {/* Detalhe e edição não alcançam conta arquivada: o backend responde 404
          fora da lixeira. Na lixeira, só restaurar ou apagar. */}
      {!user.deletedAt && (
        <React.Fragment>
          <DropdownMenuItem
            render={
              <Link to="/administrator/users/$id" params={{ id: user.id }}>
                <EyeIcon />
                Ver detalhes
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/administrator/users/$id/edit" params={{ id: user.id }}>
                <PencilSimpleIcon />
                Editar
              </Link>
            }
          />
        </React.Fragment>
      )}
      <CopyIdMenuItem id={user.id} />
      <DropdownMenuSeparator />
      {!user.deletedAt && !isSelf && (
        <RowActionsArchive onConfirm={() => archive.mutate(user.id)}>
          <ConfirmDialogTitle>{`Arquivar a conta de ${user.name}?`}</ConfirmDialogTitle>
          <ConfirmDialogDescription>
            Ela deixa de entrar no painel e sai da listagem, e pode ser
            restaurada depois.
          </ConfirmDialogDescription>
        </RowActionsArchive>
      )}
      {user.deletedAt && (
        <RowActionsUnarchive onConfirm={() => unarchive.mutate(user.id)}>
          <ConfirmDialogTitle>{`Restaurar a conta de ${user.name}?`}</ConfirmDialogTitle>
          <ConfirmDialogDescription>
            Ela volta para a listagem, na situação em que estava.
          </ConfirmDialogDescription>
        </RowActionsUnarchive>
      )}
      {/* Apagar só aparece no que já está arquivado: o `delete.use-case.ts`
          recusa conta viva com `409 USER_NOT_ARCHIVED`. Oferecer o botão fora
          daí é oferecer um erro. */}
      {user.deletedAt && canDelete && !isSelf && (
        <RowActionsDelete onConfirm={() => remove.mutate(user.id)}>
          <ConfirmDialogTitle>{`Remover a conta de ${user.name}?`}</ConfirmDialogTitle>
          <ConfirmDialogDescription>
            O registro é apagado de vez. Não dá para desfazer.
          </ConfirmDialogDescription>
        </RowActionsDelete>
      )}
    </RowActions>
  )
}
