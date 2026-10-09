import type * as React from 'react'

import {
  PageShell,
  PageShellContent,
  PageShellFooter,
  PageShellHeader,
} from '#/components/common/page-shell'
import { Skeleton } from '#/components/ui/skeleton'

/**
 * O esqueleto de uma listagem, para o `pendingComponent` da rota.
 *
 * As 32 listagens do painel resolvem o `loader` antes de o componente existir,
 * então entre o clique e a resposta não havia quadro nenhum: a tela anterior
 * ficava parada, e num clique frio isso lê como travamento. Este é o quadro que
 * faltava.
 *
 * **Mora no arquivo crítico da rota, nunca no `.lazy.tsx`.** O
 * `createLazyFileRoute` aceita `pendingComponent`, mas dentro do chunk lazy ele
 * só apareceria depois que o chunk chegasse - que é exatamente quando ele
 * deixa de ser necessário. Por isso o `pendingComponent` também não está nos
 * grupos que o divisor automático separa
 * (`router-plugin/core/constants.js:11`): ele fica eager de propósito.
 *
 * Sem contexto e sem `useTable`: aqui a rota ainda não carregou, e não há
 * `Table` em volta para prover nada. E sem receber as colunas de verdade -
 * importar o `*_COLUMNS` da listagem traria as células, as ações da linha e as
 * mutations junto para o lado eager, desfazendo o corte que o par `.lazy.tsx`
 * existe para tornar auditável. Uma contagem literal basta para reservar o
 * espaço.
 */
export function TableSkeleton({
  columns = 6,
  rows = 8,
}: {
  /** Quantas colunas desenhar. Um literal, nunca `COLUMNS.length`. */
  columns?: number
  rows?: number
}): React.JSX.Element {
  // As mesmas células no cabeçalho e em toda linha. Elemento React é imutável,
  // então o mesmo array serve os dois lugares - e as chaves são locais a cada
  // pai, não competem entre si.
  const cells = Array.from({ length: columns }, (_, column) => (
    <Skeleton key={column} className="h-4 flex-1" />
  ))

  return (
    <PageShell>
      <PageShellHeader>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </PageShellHeader>

      <PageShellContent>
        {/* A barra de busca e filtros, que fica acima da grade. */}
        <div className="flex items-center justify-between gap-2 pb-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="overflow-hidden rounded-md border">
          {/* O cabeçalho da grade, mais alto e mais escuro que as linhas. */}
          <div
            className="flex gap-4 border-b bg-muted/50 px-4 py-3"
            aria-hidden
          >
            {cells}
          </div>

          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="flex gap-4 border-b px-4 py-4 last:border-b-0"
              aria-hidden
            >
              {cells}
            </div>
          ))}
        </div>
      </PageShellContent>

      <PageShellFooter>
        <Skeleton className="h-9 w-64" />
      </PageShellFooter>
    </PageShell>
  )
}
