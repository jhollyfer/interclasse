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
import * as React from 'react'
import { toast } from 'sonner'

import {
  ConfirmDialog,
  ConfirmDialogCancel,
  ConfirmDialogConfirm,
  ConfirmDialogDescription,
  ConfirmDialogFooter,
  ConfirmDialogHeader,
  ConfirmDialogTitle,
} from '#/components/common/confirm-dialog'
import { OptionCombobox } from '#/components/common/option-combobox'
import { Button } from '#/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useMatchScoreMutation,
  useMatchUnscoreMutation,
  useMatchUpdateMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import type {
  MatchScoreVariables,
  MatchUpdateVariables,
} from '#/integrations/tanstack-query/mutations/administrator'
import type { ConfirmHandle, DialogHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { blankToNull } from '#/lib/form-values'
import { fromSchoolInput, toSchoolInput } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { MatchDialogShell } from './match-dialog-shell'
import type { MatchRef } from './match-dialog-shell'

export type { MatchRef } from './match-dialog-shell'

type DialogProps = Readonly<{
  handle: DialogHandle<MatchRef>
}>

type FormProps = Readonly<{
  match: MatchRef
  handle: DialogHandle<MatchRef>
}>

const SCORE_FIELDS = ['homeScore', 'awayScore', 'winnerTeamId'] as const
const SCHEDULE_FIELDS = ['scheduledAt', 'location'] as const

/** Score and schedule touch the whole bracket, and it touches the site and the enrollments. */
const GAME_CHANGE = [...GAME_KEYS, ...DEPENDENTS.games]

/** The `<select>` for who won on penalties, which only appears on a draw. */
function isTied(home: number | undefined, away: number | undefined): boolean {
  return home !== undefined && !Number.isNaN(home) && home === away
}

/**
 * The score. When tied, the choice of who won on penalties appears - the
 * server refuses the tie without it.
 */
export function MatchScoreDialog({ handle }: DialogProps): React.JSX.Element {
  return (
    <MatchDialogShell handle={handle}>
      {(match) => <MatchScoreForm match={match} handle={handle} />}
    </MatchDialogShell>
  )
}

function MatchScoreForm({ match, handle }: FormProps): React.JSX.Element {
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
    // The score is an idempotent write: resending saves the same result.
    retry: 'match-score',
    payload: (values) => {
      let winnerTeamId: string | undefined = undefined
      if (isTied(values.homeScore, values.awayScore))
        winnerTeamId = values.winnerTeamId

      return { ...values, id: match.id, winnerTeamId }
    },
    invalidate: GAME_CHANGE,
    onSuccess: () => handle.close(),
  })

  const tied = isTied(form.watch('homeScore'), form.watch('awayScore'))
  const winnerOptions = [
    { value: match.homeTeamId ?? '', label: match.homeName ?? '' },
    { value: match.awayTeamId ?? '', label: match.awayName ?? '' },
  ]

  return (
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
            <OptionCombobox
              id={control.id}
              aria-invalid={control['aria-invalid']}
              value={field.value}
              onValueChange={(value) => field.onChange(value || undefined)}
              onBlur={field.onBlur}
              options={winnerOptions}
            />
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
  )
}

type ScoreInputProps = Readonly<{
  id: string
  'aria-invalid': boolean
  value: number | undefined
  onValueChange: (value: number) => void
  onBlur: () => void
}>

/** Goals for one side. Empty becomes `NaN`, which the validator refuses as a number. */
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

/** The match's date, time and venue. */
export function MatchScheduleDialog({
  handle,
}: DialogProps): React.JSX.Element {
  return (
    <MatchDialogShell handle={handle}>
      {(match) => <MatchScheduleForm match={match} handle={handle} />}
    </MatchDialogShell>
  )
}

function MatchScheduleForm({ match, handle }: FormProps): React.JSX.Element {
  const { form, mutation, onSubmit } = useMutationForm<
    AdministratorMatchUpdatePayload,
    AdministratorMatchUpdateResponse,
    MatchUpdateVariables
  >({
    validator: AdministratorMatchUpdateValidator,
    // The form stores what the API receives: ISO with time zone and the venue, or
    // `null`. The school's clock is only what the field shows.
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
    onSuccess: () => handle.close(),
  })

  return (
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
  )
}

/**
 * Undo a wrongly recorded score. The server refuses when the next match
 * already has a score, and the reason arrives by toast.
 */
export function MatchUnscoreDialog({
  handle,
}: Readonly<{
  handle: ConfirmHandle<MatchRef>
}>): React.JSX.Element {
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
      handle={handle}
      onConfirm={(match) => {
        if (match) unscore.mutate(match.id)
      }}
    >
      {(match) => (
        <React.Fragment>
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
        </React.Fragment>
      )}
    </ConfirmDialog>
  )
}
