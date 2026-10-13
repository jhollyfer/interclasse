import type * as React from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { notifyError } from '#/lib/form-errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { fromSchoolInput, toSchoolInput } from '#/lib/labels'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import {
  useMatchScore,
  useMatchUnscore,
  useMatchUpdate,
} from '#/integrations/tanstack-query/mutations'
import type {
  MatchScoreVariables,
  MatchUpdateVariables,
} from '#/integrations/tanstack-query/mutations'
import type { IMatch } from '#/lib/interfaces'
import {
  MatchScoreValidator,
  MatchUpdateValidator,
} from '#/validators/administrator/matches.validator'
import type { MatchScorePayload } from '#/validators/administrator/matches.validator'
import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'

/** O mínimo de uma partida que os dois diálogos precisam. */
export type MatchRef = Readonly<{
  id: string
  phase: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeName: string | null
  awayName: string | null
  homeScore: number | null
  awayScore: number | null
  winnerTeamId: string | null
  scheduledAt: string | null
  location: string | null
}>

type DialogProps = Readonly<{
  match: MatchRef
  open: boolean
  onOpenChange: (open: boolean) => void
}>

const SCORE_FIELDS = ['homeScore', 'awayScore', 'winnerTeamId'] as const
const SCHEDULE_FIELDS = ['scheduledAt', 'location'] as const

/** Placar e agenda mexem na chave inteira, e ela no site e nas inscrições. */
const GAME_CHANGE = [...GAME_KEYS, ...DEPENDENTS.games]

/** O `<select>` de quem venceu nos pênaltis, que só aparece no empate. */
function isTied(home: number | undefined, away: number | undefined): boolean {
  return home !== undefined && !Number.isNaN(home) && home === away
}

/**
 * O placar. Empatado, aparece a escolha de quem venceu nos pênaltis - o
 * servidor recusa o empate sem ela.
 */
export function MatchScoreDialog({
  match,
  open,
  onOpenChange,
}: DialogProps): React.JSX.Element {
  const { form, mutation, onSubmit } = useMutationForm<
    MatchScorePayload,
    IMatch,
    MatchScoreVariables
  >({
    validator: MatchScoreValidator,
    defaults: {
      homeScore: match.homeScore ?? undefined,
      awayScore: match.awayScore ?? undefined,
      winnerTeamId: match.winnerTeamId ?? undefined,
    },
    fields: SCORE_FIELDS,
    mutation: useMatchScore,
    success: 'Placar salvo.',
    // Placar é escrita idempotente: reenviar grava o mesmo resultado.
    retry: 'match-score',
    payload: (values) => {
      let winnerTeamId: string | undefined = undefined
      if (isTied(values.homeScore, values.awayScore))
        winnerTeamId = values.winnerTeamId

      return { ...values, id: match.id, winnerTeamId }
    },
    invalidate: GAME_CHANGE,
    onSuccess: () => onOpenChange(false),
  })

  const tied = isTied(form.watch('homeScore'), form.watch('awayScore'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Placar</DialogTitle>
            <DialogDescription>
              {match.homeName} x {match.awayName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <AppField
              control={form.control}
              name="homeScore"
              id="score-home"
              label={match.homeName}
            >
              {({ field, control }) => (
                <ScoreInput
                  {...control}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            </AppField>
            <AppField
              control={form.control}
              name="awayScore"
              id="score-away"
              label={match.awayName}
            >
              {({ field, control }) => (
                <ScoreInput
                  {...control}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            </AppField>
          </div>

          {tied && (
            <AppField
              control={form.control}
              name="winnerTeamId"
              id="score-winner"
              label="Venceu nos pênaltis"
            >
              {({ field, control }) => (
                <NativeSelect
                  {...control}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value || undefined)
                  }
                  onBlur={field.onBlur}
                >
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  <NativeSelectOption value={match.homeTeamId ?? ''}>
                    {match.homeName}
                  </NativeSelectOption>
                  <NativeSelectOption value={match.awayTeamId ?? ''}>
                    {match.awayName}
                  </NativeSelectOption>
                </NativeSelect>
              )}
            </AppField>
          )}

          <AppFormRootError form={form} />

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Salvar placar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type ScoreInputProps = Readonly<{
  id: string
  'aria-invalid': boolean
  value: number | undefined
  onValueChange: (value: number) => void
  onBlur: () => void
}>

/** Gols de um lado. Vazio vira `NaN`, que o validator recusa como número. */
function ScoreInput({
  value,
  onValueChange,
  ...props
}: ScoreInputProps): React.JSX.Element {
  let shown = ''
  if (value !== undefined && !Number.isNaN(value)) shown = String(value)

  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      min={0}
      value={shown}
      onChange={(event) => onValueChange(event.target.valueAsNumber)}
    />
  )
}

/** O que a agenda edita: o texto do `datetime-local` e o local. */
type ScheduleForm = Readonly<{ scheduledAt: string; location: string }>

/** Data, hora e local da partida. */
export function MatchScheduleDialog({
  match,
  open,
  onOpenChange,
}: DialogProps): React.JSX.Element {
  const { form, mutation, onSubmit } = useMutationForm<
    ScheduleForm,
    IMatch,
    MatchUpdateVariables
  >({
    validator: MatchUpdateValidator,
    defaults: {
      scheduledAt: toSchoolInput(match.scheduledAt),
      location: match.location ?? '',
    },
    fields: SCHEDULE_FIELDS,
    mutation: useMatchUpdate,
    success: 'Agenda salva.',
    retry: 'match-update',
    // O campo guarda o relógio da escola; a API recebe ISO com fuso.
    payload: (values) => {
      let scheduledAt: string | null = null
      if (values.scheduledAt) scheduledAt = fromSchoolInput(values.scheduledAt)

      return { id: match.id, scheduledAt, location: values.location || null }
    },
    invalidate: GAME_CHANGE,
    onSuccess: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Agendar partida</DialogTitle>
            <DialogDescription>
              {match.homeName ?? 'A definir'} x {match.awayName ?? 'A definir'}
            </DialogDescription>
          </DialogHeader>

          <AppField
            control={form.control}
            name="scheduledAt"
            id="schedule-when"
            label="Data e hora"
          >
            {({ field, control }) => (
              <Input {...field} {...control} type="datetime-local" />
            )}
          </AppField>
          <AppField
            control={form.control}
            name="location"
            id="schedule-location"
            label="Local"
          >
            {({ field, control }) => (
              <Input
                {...field}
                {...control}
                maxLength={120}
                placeholder="Quadra principal"
              />
            )}
          </AppField>

          <AppFormRootError form={form} />

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Salvar agenda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Desfazer o placar lançado errado. O servidor recusa quando a partida
 * seguinte já tem placar, e o motivo chega por toast.
 */
export function MatchUnscoreDialog({
  match,
  open,
  onOpenChange,
}: DialogProps): React.JSX.Element {
  const invalidate = useInvalidate()
  const unscore = useMatchUnscore({
    onSuccess: async () => {
      toast.success('Placar desfeito.')
      await invalidate(GAME_CHANGE)
    },
    onError: (error) => notifyError(error, { id: 'match-unscore' }),
  })

  return (
    <ConfirmDialog
      destructive
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={() => unscore.mutate(match.id)}
    >
      <ConfirmDialogHeader>
        <ConfirmDialogTitle>Desfazer o placar?</ConfirmDialogTitle>
        <ConfirmDialogDescription>
          {`${match.homeName ?? 'A definir'} ${match.homeScore ?? '-'} x ${match.awayScore ?? '-'} ${match.awayName ?? 'A definir'}`}
          {' volta para "a jogar", e o vencedor sai da partida seguinte.'}
        </ConfirmDialogDescription>
      </ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>Desfazer</ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
