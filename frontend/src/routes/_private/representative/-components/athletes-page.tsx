import type * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { EnrollmentBoard } from '#/components/common/enrollment-board'
import { notifyError } from '#/lib/form-errors'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { HTTPStatus } from '#/integrations/tanstack-query/http'
import { useRepresentativeEnrollmentUpdate } from '#/integrations/tanstack-query/mutations/representative'
import { representativeEnrollmentsQueryOptions } from '#/integrations/tanstack-query/queries/representative'

/** A lista de atletas da turma do representante. A turma sai da sessão. */
export function AthletesPage(): React.JSX.Element {
  const {
    data: board,
    error,
    isPending,
    refetch,
  } = useQuery(representativeEnrollmentsQueryOptions())
  const queryClient = useQueryClient()

  const save = useRepresentativeEnrollmentUpdate({
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.representative.enrollments.board,
        updated,
      )
      toast.success('Atletas salvos.')
    },
    onError: (failure) => notifyError(failure, { id: 'enrollment-save' }),
  })

  let title = 'Atletas da turma'
  if (board) title = `Atletas do ${board.classroom.name}`

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{title}</PageHeaderTitle>
        <PageHeaderDescription>
          Marque quem joga cada modalidade. Atleta salvo só sai da lista pelo
          professor conselheiro, e depois do sorteio a modalidade trava.
        </PageHeaderDescription>
      </PageHeader>

      {isPending && <Skeleton className="h-64 w-full" />}

      {/* Só o 404 quer dizer "sem turma"; o resto é falha de rede ou de servidor. */}
      {error?.status === HTTPStatus.NOT_FOUND && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          Nenhuma turma vinculada a você. Peça à organização para indicá-lo como
          representante.
        </p>
      )}
      {error && error.status !== HTTPStatus.NOT_FOUND && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground">
            Não foi possível carregar a lista agora.
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {board && (
        <EnrollmentBoard
          board={board}
          canRemove={false}
          savingSportId={
            (save.isPending && save.variables.sportId) || undefined
          }
          onSave={(sportId, studentIds) => save.mutate({ sportId, studentIds })}
        />
      )}
    </div>
  )
}
