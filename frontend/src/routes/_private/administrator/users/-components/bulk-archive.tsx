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
import { runBulk } from '#/lib/bulk'
import type { BulkOutcome } from '#/lib/bulk'
import { m } from '#/paraglide/messages'

type BulkArchiveProps<TItem> = Readonly<{
  /** As linhas selecionadas na barra de seleção. */
  items: ReadonlyArray<TItem>
  /** O que arquivar um item. Quase sempre `(item) => archive.mutateAsync(item.id)`. */
  action: (item: TItem) => Promise<unknown>
  /**
   * O prefixo do recurso no cache - `queryKeys.administrator.users.all`.
   *
   * A invalidação é **uma**, depois do laço inteiro, e não uma por item: com N
   * itens o `onSuccess` da mutation dispararia N refetches da mesma listagem,
   * e o último é o único que conta.
   */
  queryKey: QueryKey
  /** `ConfirmDialogTitle` e `ConfirmDialogDescription`: o texto é markup. */
  children: React.ReactNode
}>

/**
 * O aviso do fim do lote. O relato parcial é o ponto: "7 de 9 arquivados" é
 * acionável, "erro ao arquivar" depois de sete sucessos é mentira. Cada caso é
 * uma mensagem inteira, com a flexão de número dentro dela e não montada aqui.
 */
function bulkArchiveMessage(outcome: BulkOutcome): string {
  const total = outcome.done + outcome.failed

  if (outcome.failed === 0)
    return m.admin_bulk_archive_done({ done: outcome.done })

  if (outcome.done === 0) return m.admin_bulk_archive_none({ total })

  return m.admin_bulk_archive_partial({
    done: outcome.done,
    total,
    failed: outcome.failed,
  })
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
  children,
}: BulkArchiveProps<TItem>): React.JSX.Element {
  const queryClient = useQueryClient()

  async function confirm(): Promise<void> {
    const outcome = await runBulk(items, action)

    // O aviso primeiro: `invalidateQueries` só resolve quando o refetch
    // volta, e esperá-lo aqui atrasaria o "7 de 9 arquivados" por uma ida
    // ao servidor que ninguém está olhando.
    toast.success(bulkArchiveMessage(outcome), { id: 'bulk-archive' })

    await queryClient.invalidateQueries({ queryKey })
  }

  return (
    <ConfirmDialog
      onConfirm={() => void confirm()}
      trigger={
        <Button variant="outline">
          <ArchiveIcon />
          {m.admin_common_archive()}
        </Button>
      }
    >
      <ConfirmDialogHeader>{children}</ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>{m.admin_common_archive()}</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
