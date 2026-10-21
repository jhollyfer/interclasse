import { CheckIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { useEnrollmentRemovalAcknowledge } from '#/integrations/tanstack-query/mutations'
import { enrollmentRemovalsQueryOptions } from '#/integrations/tanstack-query/queries'
import { notifyError } from '#/lib/form-errors'
import type { IEnrollmentRemoval } from '#/lib/interfaces'
import { formatDate, plural } from '#/lib/labels'
import { cn } from '#/lib/utils'

import { ADMINISTRATOR_REMOVALS } from '../index'

/**
 * Os avisos de atleta tirado de modalidade, com o motivo que o conselheiro
 * escreveu. Os pendentes vêm primeiro; "Ciente" tira o aviso do contador.
 */
export function RemovalsPage(): React.JSX.Element {
  const { data, isPending } = useQuery(
    enrollmentRemovalsQueryOptions(ADMINISTRATOR_REMOVALS),
  )
  const removals = data?.data ?? []
  const pending = removals.filter((removal) => !removal.acknowledgedAt).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Remoções de atleta</PageHeaderTitle>
        <PageHeaderDescription>
          {`Quem os conselheiros tiraram das modalidades, e por quê. ${plural(pending, 'aviso pendente', 'avisos pendentes')}.`}
        </PageHeaderDescription>
      </PageHeader>

      {isPending && <Skeleton className="h-24 w-full" />}
      {!isPending && removals.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Nenhum atleta foi tirado de modalidade.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {removals.map((removal) => (
          <RemovalItem key={removal.id} removal={removal} />
        ))}
      </ul>
    </div>
  )
}

function RemovalItem({
  removal,
}: Readonly<{ removal: IEnrollmentRemoval }>): React.JSX.Element {
  const invalidate = useInvalidate()
  const acknowledge = useEnrollmentRemovalAcknowledge({
    onSuccess: async () => {
      await invalidate([queryKeys.administrator.enrollmentRemovals.all])
    },
    onError: (error) => notifyError(error, { id: 'removal-acknowledge' }),
  })
  const open = !removal.acknowledgedAt

  return (
    <li
      className={cn(
        'bg-card flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start',
        open && 'border-primary',
      )}
    >
      <div className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium">
          {`${removal.studentName} saiu do ${removal.sport.name}`}
          <span className="text-muted-foreground font-normal">
            {` · ${removal.classroom.name}`}
          </span>
        </span>
        <p className="bg-muted rounded-md px-3 py-2">{removal.reason}</p>
        <span className="text-muted-foreground text-xs">
          {`Por ${removal.actor?.name ?? 'conta removida'} em ${formatDate(removal.createdAt)}`}
        </span>
      </div>
      {open && (
        <Button
          size="sm"
          variant="outline"
          disabled={acknowledge.isPending}
          onClick={() => acknowledge.mutate(removal.id)}
        >
          <CheckIcon />
          Ciente
        </Button>
      )}
      {!open && <Badge variant="neutral">Ciente</Badge>}
    </li>
  )
}
