import { useQuery, useQueryClient } from '@tanstack/react-query'
import type * as React from 'react'
import { toast } from 'sonner'

import { EnrollmentBoard } from '#/components/common/enrollment-board'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { HTTPStatus } from '#/integrations/tanstack-query/http'
import { useRepresentativeEnrollmentUpdateMutation } from '#/integrations/tanstack-query/mutations/representative'
import { representativeEnrollmentsQueryOptions } from '#/integrations/tanstack-query/queries/representative'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

/** A lista de atletas da turma do representante. A turma sai da sessão. */
export function AthletesPage(): React.JSX.Element {
  const {
    data: board,
    error,
    isPending,
    refetch,
  } = useQuery(representativeEnrollmentsQueryOptions())
  const queryClient = useQueryClient()

  const save = useRepresentativeEnrollmentUpdateMutation({
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.representative.enrollments.board,
        updated,
      )
      toast.success(m.common_classroom_saved())
    },
    onError: (failure) => notifyError(failure, { id: 'enrollment-save' }),
  })

  let title = m.representative_title()
  if (board)
    title = m.representative_title_named({ name: board.classroom.name })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{title}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.representative_description()}
        </PageHeaderDescription>
      </PageHeader>

      {isPending && <Skeleton className="h-64 w-full" />}

      {/* Só o 404 quer dizer "sem turma"; o resto é falha de rede ou de servidor. */}
      {error?.status === HTTPStatus.NOT_FOUND && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          {m.representative_no_class()}
        </p>
      )}
      {error && error.status !== HTTPStatus.NOT_FOUND && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground">
            {m.representative_load_error()}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            {m.common_retry()}
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
