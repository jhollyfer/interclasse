import * as React from 'react'

import { Empty } from '#/components/ui/empty'
import { cn } from '#/lib/cn'

import { EmptyStateProvider } from './empty-state-context'
import type { EmptyStateReason } from './empty-state-context'

type EmptyStateProps = Readonly<
  {
    reason: EmptyStateReason
  } & React.ComponentProps<typeof Empty>
>

/**
 * O estado vazio de uma lista, por motivo (`frontend.md` §10.1), sobre o
 * `ui/empty` (_doc-lib/shadcn.md#empty).
 *
 * O motivo vai pelo contexto: as partes escolhem o texto dele, e a tela só
 * escreve o que vale para o vazio de verdade (`empty`). Filtro e lixeira têm o
 * texto do componente.
 *
 * `gap-1` e não o `gap-4` do `Empty`: título e descrição andam colados, e é
 * `EmptyStateActions` quem abre o respiro antes do botão.
 */
export function EmptyState({
  reason,
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  const value = { reason }

  return (
    <EmptyStateProvider value={value}>
      <Empty
        data-slot="empty-state"
        className={cn('gap-1 rounded-xl border', className)}
        {...props}
      />
    </EmptyStateProvider>
  )
}
