import type { Merge } from '@interclasse/shared'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import type * as React from 'react'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
} from '#/components/common/confirm-dialog'
import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import type { ConfirmHandle } from '#/lib/dialog-handle'
import { m } from '#/paraglide/messages'

type RowActionsItemProps = Readonly<{
  /** O handle do alerta que este item abre (`createConfirmHandle`). */
  handle: ConfirmHandle
}>

type MenuConfirmProps = Readonly<
  Merge<
    RowActionsItemProps,
    {
      slot: string
      icon: React.ReactNode
      label: string
      destructive?: boolean
    }
  >
>

/**
 * Item de menu que pede confirmação.
 *
 * O item só abre o alerta: `handle.open(null)` no clique, e o menu fecha como
 * em qualquer item. O alerta é `RowActionsConfirm`, irmão do menu.
 */
function MenuConfirm({
  slot,
  icon,
  label,
  destructive = false,
  handle,
}: MenuConfirmProps): React.JSX.Element {
  let variant: 'destructive' | 'default' = 'default'
  if (destructive) variant = 'destructive'

  return (
    <DropdownMenuItem
      data-slot={slot}
      variant={variant}
      onClick={() => handle.open(null)}
    >
      {icon}
      {label}
    </DropdownMenuItem>
  )
}

type RowActionsConfirmProps = Readonly<{
  handle: ConfirmHandle
  /** A mutation da linha, já com o id: `() => archive.mutate(row.id)`. */
  onConfirm: () => void
  /** O texto do botão que confirma. */
  confirmLabel: string
  /** Ação sem volta pinta o botão de confirmar de vermelho. */
  destructive?: boolean
  /**
   * `ConfirmDialogTitle` e `ConfirmDialogDescription`.
   *
   * O texto fica com a tela porque é dela: umas listagens dizem o efeito
   * concreto ("sai da vitrine na hora") e outras a frase genérica. Fixar aqui
   * obrigaria a genérica em todas.
   */
  children: React.ReactNode
}>

/** O alerta de um item de menu, para o `dialogs` do `RowActions`. */
export function RowActionsConfirm({
  handle,
  onConfirm,
  confirmLabel,
  destructive = false,
  children,
}: RowActionsConfirmProps): React.JSX.Element {
  return (
    <ConfirmDialog
      handle={handle}
      destructive={destructive}
      onConfirm={onConfirm}
    >
      <ConfirmDialogHeader>{children}</ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>{confirmLabel}</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}

/** Arquivar a linha. Só aparece no que ainda não está arquivado. */
export function RowActionsArchive(
  props: RowActionsItemProps,
): React.JSX.Element {
  return (
    <MenuConfirm
      slot="row-actions-archive"
      icon={<ArchiveIcon />}
      label={m.common_archive()}
      {...props}
    />
  )
}

/** Tirar a linha da lixeira. Só aparece no que está arquivado. */
export function RowActionsUnarchive(
  props: RowActionsItemProps,
): React.JSX.Element {
  return (
    <MenuConfirm
      slot="row-actions-unarchive"
      icon={<ArrowCounterClockwiseIcon />}
      label={m.common_restore()}
      {...props}
    />
  )
}

type RowActionsDeleteProps = Readonly<
  Merge<
    RowActionsItemProps,
    {
      /** O texto do item. "Excluir" por padrão. */
      label?: string
    }
  >
>

/**
 * Apagar a linha de vez. Só no que já está arquivado e só para quem pode.
 *
 * O use-case recusa o registro vivo com `409` e o código `<RECURSO>_NOT_ARCHIVED`
 * (spec do backend, item 7): oferecer o item fora daí é oferecer um erro.
 */
export function RowActionsDelete({
  label = m.common_delete(),
  ...props
}: RowActionsDeleteProps): React.JSX.Element {
  return (
    <MenuConfirm
      slot="row-actions-delete"
      icon={<TrashIcon />}
      label={label}
      destructive
      {...props}
    />
  )
}
