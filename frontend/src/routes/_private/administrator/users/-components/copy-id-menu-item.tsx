import type * as React from 'react'
import { CopySimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages'

type CopyIdMenuItemProps = Readonly<{
  id: string
}>

/**
 * "Copiar ID" no menu de uma linha.
 *
 * O id não aparece em coluna nenhuma - é uuid, ocuparia a largura de duas
 * colunas úteis e ninguém o lê. Mas ele é o que abre o registro pela URL, o que
 * se cola num chamado de suporte e o que se leva para uma consulta no banco, e
 * sem isto o caminho era abrir o detalhe e copiar da barra de endereços.
 *
 * Componente e não uma linha em cada tela: são oito menus, e a alternativa era
 * o mesmo `writeText` com o mesmo toast copiado oito vezes.
 */
export function CopyIdMenuItem({ id }: CopyIdMenuItemProps): React.JSX.Element {
  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(id)
    toast.success(m.admin_users_id_copied(), { id: 'copy-id' })
  }

  return (
    <DropdownMenuItem onClick={() => void copy()}>
      <CopySimpleIcon />
      {m.admin_users_copy_id()}
    </DropdownMenuItem>
  )
}
