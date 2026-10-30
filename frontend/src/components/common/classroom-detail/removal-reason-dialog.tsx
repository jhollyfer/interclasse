import type * as React from 'react'
import { AdvisorEnrollmentUpdateValidator } from '@interclasse/shared'
import type {
  AdvisorEnrollmentUpdatePayload,
  AdvisorEnrollmentShowResponse,
} from '@interclasse/shared'

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
import { useAdvisorEnrollmentUpdate } from '#/integrations/tanstack-query/mutations/advisor'

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
    mutation: useAdvisorEnrollmentUpdate,
    invalidate: [queryKeys.administrator.enrollmentRemovals.all],
    success: 'Atletas salvos. A organização foi avisada.',
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
            <DialogTitle>{`Tirar do ${pending.sportName}`}</DialogTitle>
            <DialogDescription>
              {`Saem da lista: ${pending.removed.join(', ')}. Diga o motivo - a organização recebe o aviso.`}
            </DialogDescription>
          </DialogHeader>

          <AppField
            control={form.control}
            name="reason"
            id="removal-reason"
            label="Motivo"
          >
            {({ field, control }) => (
              <Textarea
                {...field}
                {...control}
                value={field.value ?? ''}
                rows={4}
                maxLength={500}
                placeholder="Ex.: retirado do vôlei por mau comportamento com os colegas."
              />
            )}
          </AppField>

          <AppFormRootError form={form} />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Salvar e avisar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
