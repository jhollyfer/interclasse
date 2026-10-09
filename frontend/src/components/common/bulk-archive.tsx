import type * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { ArchiveIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
} from '#/components/common/confirm-dialog'
import { Button } from '#/components/ui/button'
import { bulkMessage, runBulk } from '#/lib/bulk'

type BulkArchiveProps<TItem> = {
  /** As linhas selecionadas na barra de seleção. */
  items: Array<TItem>
  /** O que arquivar um item. Quase sempre `(item) => archive.mutateAsync(item.id)`. */
  action: (item: TItem) => Promise<unknown>
  /**
   * O prefixo do recurso no cache - `queryKeys.notices.all`.
   *
   * A invalidação é **uma**, depois do laço inteiro, e não uma por item: com N
   * itens o `onSuccess` da mutation dispararia N refetches da mesma listagem,
   * e o último é o único que conta.
   */
  queryKey: QueryKey
  /**
   * O particípio no plural, com o gênero do recurso: `arquivadas`,
   * `arquivados`. É o que `bulkMessage` flexiona no aviso, e português não
   * deixa derivar do nome.
   */
  verb: string
  /** `ConfirmDialogTitle` e `ConfirmDialogDescription`: o texto é markup. */
  children: React.ReactNode
}

/**
 * Arquivar as linhas selecionadas.
 *
 * A ação em massa é a mesma nas sete listagens do painel - o mesmo gatilho, o
 * mesmo `runBulk`, o mesmo relato parcial, o mesmo rodapé. O que muda é o
 * recurso e as duas frases, e por isso o recurso vem por prop e as frases por
 * slot.
 *
 * Não há contexto aqui: título e descrição não leem estado nenhum, são o
 * cabeçalho do `ConfirmDialog` de baixo escrito pela tela. Provider sem estado
 * a compartilhar é sobrecarga, e a própria `compound-pattern` diz isso.
 *
 * Remoção em massa não existe de propósito: arquivar e restaurar é do editor,
 * apagar de vez é só do administrador e só alcança o que já está arquivado.
 * Daqui só se arquiva, e o que foi para a lixeira volta pela linha.
 */
export function BulkArchive<TItem>({
  items,
  action,
  queryKey,
  verb,
  children,
}: BulkArchiveProps<TItem>): React.JSX.Element {
  const queryClient = useQueryClient()

  return (
    <ConfirmDialog
      onConfirm={async () => {
        const outcome = await runBulk(items, action)

        // O aviso primeiro: `invalidateQueries` só resolve quando o refetch
        // volta, e esperá-lo aqui atrasaria o "7 de 9 arquivados" por uma ida
        // ao servidor que ninguém está olhando.
        toast.success(bulkMessage(outcome, verb), { id: 'bulk-archive' })

        await queryClient.invalidateQueries({ queryKey })
      }}
      trigger={
        <Button variant="outline">
          <ArchiveIcon />
          Arquivar
        </Button>
      }
    >
      <ConfirmDialogHeader>{children}</ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>Arquivar</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
