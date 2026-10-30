import type * as React from 'react'
import { toast } from 'sonner'
import {
  AdministratorMatchScoreValidator,
  AdministratorMatchUpdateValidator,
} from '@interclasse/shared'
import type {
  AdministratorMatchScorePayload,
  AdministratorMatchUpdatePayload,
  AdministratorMatchScoreResponse,
  AdministratorMatchUpdateResponse,
} from '@interclasse/shared'

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
import { blankToNull } from '#/lib/form-values'
import { fromSchoolInput, toSchoolInput } from '#/lib/labels'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import {
  useMatchScoreMutation,
  useMatchUnscoreMutation,
  useMatchUpdateMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import type {
  MatchScoreVariables,
  MatchUpdateVariables,
} from '#/integrations/tanstack-query/mutations/administrator'
import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { m } from '#/paraglide/messages'

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
    AdministratorMatchScorePayload,
    AdministratorMatchScoreResponse,
    MatchScoreVariables
  >({
    validator: AdministratorMatchScoreValidator,
    defaults: {
      homeScore: match.homeScore ?? undefined,
      awayScore: match.awayScore ?? undefined,
      winnerTeamId: match.winnerTeamId ?? undefined,
    },
    fields: SCORE_FIELDS,
    mutation: useMatchScoreMutation,
    success: m.common_match_score_saved(),
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
            <DialogTitle>{m.common_match_score_title()}</DialogTitle>
            <DialogDescription>
              {m.common_match_versus({
                home: match.homeName ?? m.common_to_be_defined(),
                away: match.awayName ?? m.common_to_be_defined(),
              })}
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
              label={m.common_match_penalty_winner()}
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
                  <NativeSelectOption value="">
                    {m.common_select_placeholder()}
                  </NativeSelectOption>
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
              {m.common_match_score_submit()}
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

/** Data, hora e local da partida. */
export function MatchScheduleDialog({
  match,
  open,
  onOpenChange,
}: DialogProps): React.JSX.Element {
  const { form, mutation, onSubmit } = useMutationForm<
    AdministratorMatchUpdatePayload,
    AdministratorMatchUpdateResponse,
    MatchUpdateVariables
  >({
    validator: AdministratorMatchUpdateValidator,
    // O formulário guarda o que a API recebe: ISO com fuso e o local, ou
    // `null`. O relógio da escola é só o que o campo mostra.
    defaults: { scheduledAt: match.scheduledAt, location: match.location },
    fields: SCHEDULE_FIELDS,
    mutation: useMatchUpdateMutation,
    success: m.common_match_schedule_saved(),
    retry: 'match-update',
    payload: (values) => ({
      id: match.id,
      scheduledAt: values.scheduledAt ?? null,
      location: values.location ?? null,
    }),
    invalidate: GAME_CHANGE,
    onSuccess: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{m.common_match_schedule_title()}</DialogTitle>
            <DialogDescription>
              {m.common_match_versus({
                home: match.homeName ?? m.common_to_be_defined(),
                away: match.awayName ?? m.common_to_be_defined(),
              })}
            </DialogDescription>
          </DialogHeader>

          <AppField
            control={form.control}
            name="scheduledAt"
            id="schedule-when"
            label={m.common_match_when()}
          >
            {({ field, control }) => (
              <Input
                {...control}
                type="datetime-local"
                value={toSchoolInput(field.value ?? null)}
                onChange={(event) => {
                  const typed = event.target.value
                  if (typed) field.onChange(fromSchoolInput(typed))
                  else field.onChange(null)
                }}
                onBlur={field.onBlur}
              />
            )}
          </AppField>
          <AppField
            control={form.control}
            name="location"
            id="schedule-location"
            label={m.common_match_location()}
          >
            {({ field, control }) => (
              <Input
                {...control}
                maxLength={120}
                placeholder={m.common_match_location_placeholder()}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(blankToNull(event.target.value))
                }
                onBlur={field.onBlur}
              />
            )}
          </AppField>

          <AppFormRootError form={form} />

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {m.common_match_schedule_submit()}
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
  const unscore = useMatchUnscoreMutation({
    onSuccess: async () => {
      toast.success(m.common_match_unscored())
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
        <ConfirmDialogTitle>
          {m.common_match_unscore_title()}
        </ConfirmDialogTitle>
        <ConfirmDialogDescription>
          {m.common_match_unscore_description({
            home: match.homeName ?? m.common_to_be_defined(),
            homeScore: match.homeScore ?? '-',
            awayScore: match.awayScore ?? '-',
            away: match.awayName ?? m.common_to_be_defined(),
          })}
        </ConfirmDialogDescription>
      </ConfirmDialogHeader>
      <ConfirmDialogFooter>
        <ConfirmDialogCancel />
        <ConfirmDialogConfirm>
          {m.common_match_unscore_submit()}
        </ConfirmDialogConfirm>
      </ConfirmDialogFooter>
    </ConfirmDialog>
  )
}
