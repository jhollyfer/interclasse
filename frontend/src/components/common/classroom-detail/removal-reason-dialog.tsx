import { AdvisorEnrollmentUpdateValidator } from '@interclasse/shared'
import type {
  AdvisorEnrollmentUpdatePayload,
  AdvisorEnrollmentShowResponse,
} from '@interclasse/shared'
import type * as React from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Textarea } from '#/components/ui/textarea'
import { queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useAdvisorEnrollmentUpdateMutation } from '#/integrations/tanstack-query/mutations/advisor'
import { m } from '#/paraglide/messages'

/** A lista que espera o motivo para ser gravada. */
export type PendingRemoval = Readonly<{
  sportId: string
  sportName: string
  studentIds: ReadonlyArray<string>
  removed: ReadonlyArray<string>
}>

const FIELDS = ['reason', 'studentIds'] as const

type RemovalReasonDialogProps = Readonly<{
  classroomId: string
  pending: PendingRemoval
  onClose: () => void
  onSaved: (board: AdvisorEnrollmentShowResponse) => void
}>

/**
 * Tirar atleta da lista pede o motivo. Ele vai para a organização como aviso,
 * junto com o nome de quem saiu - é assim que o administrador fica sabendo.
 */
export function RemovalReasonDialog({
  classroomId,
  pending,
  onClose,
  onSaved,
}: RemovalReasonDialogProps): React.JSX.Element {
  const { form, mutation, onSubmit } = useMutationForm<
    AdvisorEnrollmentUpdatePayload,
    AdvisorEnrollmentShowResponse,
    AdvisorEnrollmentUpdatePayload
  >({
    validator: AdvisorEnrollmentUpdateValidator,
    defaults: {
      classroomId,
      sportId: pending.sportId,
      studentIds: [...pending.studentIds],
      reason: '',
    },
    fields: FIELDS,
    mutation: useAdvisorEnrollmentUpdateMutation,
    invalidate: [queryKeys.administrator.enrollmentRemovals.all],
    success: m.common_removal_saved(),
    payload: (values) => values,
    onSuccess: (board) => {
      onSaved(board)
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <form method="post" className="grid gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {m.common_removal_title({ sport: pending.sportName })}
            </DialogTitle>
            <DialogDescription>
              {m.common_removal_description({
                names: pending.removed.join(', '),
              })}
            </DialogDescription>
          </DialogHeader>

          <AppField
            control={form.control}
            name="reason"
            id="removal-reason"
            label={m.common_removal_reason()}
          >
            {({ field, control }) => (
              <Textarea
                {...field}
                {...control}
                value={field.value ?? ''}
                rows={4}
                maxLength={500}
                placeholder={m.common_removal_placeholder()}
              />
            )}
          </AppField>

          <AppFormRootError form={form} />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {m.common_cancel()}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {m.common_removal_submit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
