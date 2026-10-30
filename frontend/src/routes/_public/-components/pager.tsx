import type { PaginationMeta } from '@interclasse/shared'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import { m } from '#/paraglide/messages'

/**
 * Anterior e próxima, para as listas do site. Sem número de página clicável:
 * ninguém pula para a página 7 de avisos.
 *
 * `to="."` com `search` em função: mantém os filtros da URL e troca só a
 * página, sem precisar saber em que rota está.
 */
export function Pager({
  meta,
}: Readonly<{
  meta?: PaginationMeta
}>): React.JSX.Element | null {
  if (!meta || meta.lastPage <= 1) return null

  const page = meta.currentPage

  return (
    <nav
      className="flex items-center justify-center gap-4 text-sm"
      aria-label={m.public_pager_label()}
    >
      {page > 1 && (
        <Link
          to="."
          search={(previous: Record<string, unknown>) => ({
            ...previous,
            page: page - 1,
          })}
          className="text-primary px-2 py-2 font-semibold hover:underline"
        >
          {m.public_pager_previous()}
        </Link>
      )}
      <span className="text-muted-foreground">
        {m.public_pager_status({ page, total: meta.lastPage })}
      </span>
      {page < meta.lastPage && (
        <Link
          to="."
          search={(previous: Record<string, unknown>) => ({
            ...previous,
            page: page + 1,
          })}
          className="text-primary px-2 py-2 font-semibold hover:underline"
        >
          {m.public_pager_next()}
        </Link>
      )}
    </nav>
  )
}
