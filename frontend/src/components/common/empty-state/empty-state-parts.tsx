import type * as React from 'react'

import {
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from '#/components/ui/empty'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

import { useEmptyStateContext } from './empty-state-context'

/** O título que o componente escreve quando o motivo não é o vazio de verdade. */
const OWN_TITLES = {
  filtered: () => m.table_empty_filtered_title(),
  trash: () => m.table_empty_trash_title(),
}

/** O título do vazio. O filtro e a lixeira têm o seu e ignoram o da tela. */
export function EmptyStateTitle({
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  const { reason } = useEmptyStateContext('EmptyStateTitle')

  return (
    <EmptyTitle data-slot="empty-state-title" {...props}>
      {reason === 'empty' && children}
      {reason !== 'empty' && OWN_TITLES[reason]()}
    </EmptyTitle>
  )
}

/**
 * A descrição do vazio.
 *
 * A lixeira mantém a da tela - ela explica o recurso, e isso vale igual com a
 * lixeira vazia. Só o filtro troca, porque ali o texto tem de dizer o que fazer
 * a seguir.
 */
export function EmptyStateDescription({
  children,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element {
  const { reason } = useEmptyStateContext('EmptyStateDescription')

  return (
    <EmptyDescription data-slot="empty-state-description" {...props}>
      {reason === 'filtered' && m.table_empty_filtered_description()}
      {reason !== 'filtered' && children}
    </EmptyDescription>
  )
}

/**
 * A ação oferecida na lista vazia - em geral o botão de criar.
 *
 * Só no vazio de verdade: mandar cadastrar quem está olhando a lixeira ou um
 * filtro sem resultado é oferecer a saída errada.
 */
export function EmptyStateActions({
  className,
  ...props
}: React.ComponentProps<'div'>): React.JSX.Element | null {
  const { reason } = useEmptyStateContext('EmptyStateActions')

  if (reason !== 'empty') return null

  return (
    <EmptyContent
      data-slot="empty-state-actions"
      className={cn('mt-3', className)}
      {...props}
    />
  )
}
