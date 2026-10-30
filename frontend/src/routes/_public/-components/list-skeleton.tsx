import type * as React from 'react'

import { Skeleton } from '#/components/ui/skeleton'

import { Section, SectionHeader } from './section'

/**
 * O esqueleto de uma listagem pública, para o `pendingComponent` da rota: o
 * título e os cartões no tamanho da tela final, no lugar de um quadro em
 * branco entre o clique e a resposta (`frontend.md` §5).
 */
export function ListSkeleton(): React.JSX.Element {
  return (
    <Section aria-busy="true">
      <SectionHeader>
        <Skeleton className="h-9 w-56" />
      </SectionHeader>
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Section>
  )
}
