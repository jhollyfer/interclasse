import { AdvisorEnrollmentUpdateValidator } from '@interclasse/shared'
import type {
  AdvisorEnrollmentUpdatePayload,
  AdvisorEnrollmentShowResponse,
} from '@interclasse/shared'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
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
import type { DialogHandle } from '#/lib/dialog-handle'
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
  /** Um handle por diálogo; a tela abre com `handle.openWithPayload(pedido)`. */
  handle: DialogHandle<PendingRemoval>
  onSaved: (board: AdvisorEnrollmentShowResponse) => void
}>

/**
 * Tirar atleta da lista pede o motivo. Ele vai para a organização como aviso,
 * junto com o nome de quem saiu - é assim que o administrador fica sabendo.
 *
 * Uncontrolled, aberto por `handle` com o pedido como payload (`frontend.md`
 * §6.2): o formulário só monta aberto e nasce com a lista do clique.
 * _doc-lib/base-ui.md#react/components/dialog.
 */
export function RemovalReasonDialog({
  classroomId,
  handle,
  onSaved,
}: RemovalReasonDialogProps): React.JSX.Element {
  return (
    <Dialog handle={handle}>
      {({ payload }) => (
        <React.Fragment>
          {payload !== undefined && (
            <DialogContent>
              <RemovalReasonForm
                classroomId={classroomId}
                pending={payload}
                handle={handle}
                onSaved={onSaved}
              />
            </DialogContent>
          )}
        </React.Fragment>
      )}
    </Dialog>
  )
}

function RemovalReasonForm({
  classroomId,
  pending,
  handle,
  onSaved,
}: Readonly<{
  classroomId: string
  pending: PendingRemoval
  handle: DialogHandle<PendingRemoval>
  onSaved: (board: AdvisorEnrollmentShowResponse) => void
}>): React.JSX.Element {
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
      handle.close()
    },
  })

  return (
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
        <DialogClose render={<Button type="button" variant="ghost" />}>
          {m.common_cancel()}
        </DialogClose>
        <Button type="submit" disabled={mutation.isPending}>
          {m.common_removal_submit()}
        </Button>
      </DialogFooter>
    </form>
  )
}
