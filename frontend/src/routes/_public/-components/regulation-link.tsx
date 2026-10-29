import type * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePdfIcon } from '@phosphor-icons/react'

import { storefrontSiteQueryOptions } from '#/integrations/tanstack-query/queries'
import { cn } from '#/lib/utils'

/**
 * O "Baixar regulamento", onde quer que apareça: no topo da home, no "Sobre" e
 * no rodapé. Some enquanto a organização não enviar o PDF.
 */
export function RegulationLink({
  className,
}: Readonly<{ className?: string }>): React.JSX.Element | null {
  const { data } = useQuery(storefrontSiteQueryOptions())
  const regulation = data?.regulation

  if (!regulation) return null

  return (
    <a
      href={regulation.url}
      target="_blank"
      rel="noreferrer"
      download={regulation.originalName}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <FilePdfIcon className="size-5" />
      Baixar regulamento
    </a>
  )
}
