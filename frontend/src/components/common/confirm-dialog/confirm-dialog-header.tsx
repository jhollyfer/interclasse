import type * as React from 'react'

import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'

/**
 * O topo do alerta: título e descrição.
 *
 * Existe como parte, e não embutido no `ConfirmDialog`, porque é ele quem
 * carrega a grade e o alinhamento que o `AlertDialogContent` não dá - sem ele o
 * título e a descrição herdariam o `gap-3` do conteúdo em vez do `gap-1` de um
 * cabeçalho.
 */
export function ConfirmDialogHeader(
  props: React.ComponentProps<typeof AlertDialogHeader>,
): React.JSX.Element {
  return <AlertDialogHeader data-slot="confirm-dialog-header" {...props} />
}

/**
 * O ícone da ação, no bloco que o `AlertDialogHeader` já reserva para ele.
 *
 * Fora do `ConfirmDialogTitle` de propósito: o cabeçalho troca de grade quando
 * enxerga um `data-slot="alert-dialog-media"` (`has-data-[slot=...]`), e ícone
 * enfiado dentro do título não dispara essa troca - ele só empurra o texto para
 * o lado e some do leitor de tela junto com o resto do título.
 *
 * É o único da família que **não** reescreve o `data-slot`: são esses seletores
 * do `ui/alert-dialog` que leem o slot, e renomeá-lo desligaria a grade que a
 * parte existe para ligar.
 */
export function ConfirmDialogMedia(
  props: React.ComponentProps<typeof AlertDialogMedia>,
): React.JSX.Element {
  return <AlertDialogMedia {...props} />
}

/**
 * O título nomeia o registro: "Arquivar o depoimento de Maria?", nunca "Tem
 * certeza?". A primitiva anuncia este elemento, então ele não pode faltar.
 */
export function ConfirmDialogTitle(
  props: React.ComponentProps<typeof AlertDialogTitle>,
): React.JSX.Element {
  return <AlertDialogTitle data-slot="confirm-dialog-title" {...props} />
}

/**
 * O que acontece se confirmar.
 *
 * Slot e não prop de texto: é aqui que a tela fora da curva põe um `<Alert>`
 * com o que trava a ação, ou um `<Checkbox>` de "também arquivar os arquivos".
 */
export function ConfirmDialogDescription(
  props: React.ComponentProps<typeof AlertDialogDescription>,
): React.JSX.Element {
  return (
    <AlertDialogDescription data-slot="confirm-dialog-description" {...props} />
  )
}
