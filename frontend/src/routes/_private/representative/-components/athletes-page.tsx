import { useQuery, useQueryClient } from '@tanstack/react-query'
import type * as React from 'react'
import { toast } from 'sonner'

import { EmptyNote } from '#/components/common/empty-note'
import { EnrollmentBoard } from '#/components/common/enrollment-board'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import { Empty, EmptyContent, EmptyDescription } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { HTTPStatus } from '#/integrations/tanstack-query/http'
import { useRepresentativeEnrollmentUpdateMutation } from '#/integrations/tanstack-query/mutations/representative'
import { representativeEnrollmentsQueryOptions } from '#/integrations/tanstack-query/queries/representative'
import { notifyError } from '#/lib/form-errors'
import { m } from '#/paraglide/messages'

/** The athlete list of the representative's classroom. The classroom comes from the session. */
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

      {/* Only the 404 means "no classroom"; the rest is a network or server failure. */}
      {error?.status === HTTPStatus.NOT_FOUND && (
        <EmptyNote>{m.representative_no_class()}</EmptyNote>
      )}
      {error && error.status !== HTTPStatus.NOT_FOUND && (
        <Empty className="rounded-lg border border-dashed">
          <EmptyDescription>{m.representative_load_error()}</EmptyDescription>
          <EmptyContent>
            <Button variant="outline" onClick={() => void refetch()}>
              {m.common_retry()}
            </Button>
          </EmptyContent>
        </Empty>
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
