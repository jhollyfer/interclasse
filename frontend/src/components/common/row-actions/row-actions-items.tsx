import type { Merge } from '@interclasse/shared'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import * as React from 'react'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
} from '#/components/common/confirm-dialog'
import { DropdownMenuItem } from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages'

import { useCloseRowActions } from './row-actions'

type RowActionsItemProps = Readonly<{
  /** A mutation da linha, já com o id: `() => archive.mutate(row.id)`. */
  onConfirm: () => void
  /**
   * `ConfirmDialogTitle` e `ConfirmDialogDescription`.
   *
   * O texto fica com a tela porque é dela: umas listagens dizem o efeito
   * concreto ("sai da vitrine na hora") e outras a frase genérica. Fixar aqui
   * obrigaria a genérica em todas.
   */
  children: React.ReactNode
}>

type MenuConfirmProps = Readonly<
  Merge<
    Omit<
      RowActionsItemProps,
      'slot' | 'icon' | 'label' | 'confirmLabel' | 'destructive'
    >,
    {
      slot: string
      icon: React.ReactNode
      label: string
      confirmLabel: string
      destructive?: boolean
    }
  >
>

/**
 * Item de menu que pede confirmação.
 *
 * O item é um item comum, e não o gatilho do alerta: como gatilho ele herdava
 * `tabindex=0` e virava o foco inicial do menu - abria aceso, e no "Excluir".
 * O clique abre o alerta controlado e fecha o menu; o alerta continua vivo
 * porque o menu fica montado (`keepMounted` em `RowActions`).
 */
function MenuConfirm({
  slot,
  icon,
  label,
  confirmLabel,
  destructive = false,
  onConfirm,
  children,
}: MenuConfirmProps): React.JSX.Element {
  const closeMenu = useCloseRowActions()
  const [open, setOpen] = React.useState(false)

  let variant: 'destructive' | 'default' = 'default'
  if (destructive) variant = 'destructive'

  return (
    <React.Fragment>
      <DropdownMenuItem
        data-slot={slot}
        variant={variant}
        onClick={() => {
          setOpen(true)
          closeMenu()
        }}
      >
        {icon}
        {label}
      </DropdownMenuItem>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive={destructive}
        onConfirm={onConfirm}
      >
        <ConfirmDialogHeader>{children}</ConfirmDialogHeader>
        <ConfirmDialogFooter>
          <ConfirmDialogCancel />
          <ConfirmDialogConfirm>{confirmLabel}</ConfirmDialogConfirm>
        </ConfirmDialogFooter>
      </ConfirmDialog>
    </React.Fragment>
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
      confirmLabel={m.common_archive()}
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
      confirmLabel={m.common_restore()}
      {...props}
    />
  )
}

type RowActionsDeleteProps = Readonly<
  Merge<
    Omit<RowActionsItemProps, 'label'>,
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
      confirmLabel={m.common_remove()}
      destructive
      {...props}
    />
  )
}
