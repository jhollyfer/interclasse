import * as React from 'react'
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
import { Field, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { fromSchoolInput, toSchoolInput } from '#/lib/labels'
import {
  useMatchScore,
  useMatchUnscore,
  useMatchUpdate,
} from '#/integrations/tanstack-query/mutations'
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
export type MatchRef = {
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
}

type DialogProps = {
  match: MatchRef
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Placar e agenda mexem na chave inteira, e ela no site e nas inscrições. */
function useInvalidateGames(): () => Promise<void> {
  const invalidate = useInvalidate()

  return () => invalidate([...GAME_KEYS, ...DEPENDENTS.games])
}

/**
 * O placar. Empatado, aparece a escolha de quem venceu nos pênaltis - o
 * servidor recusa o empate sem ela.
 *
 * Estado local e não `react-hook-form`: são dois números e uma escolha, e a
 * regra que importa (empate, vencedor) é do servidor, que responde 422.
 */
export function MatchScoreDialog({
  match,
  open,
  onOpenChange,
}: DialogProps): React.JSX.Element {
  const [home, setHome] = React.useState(String(match.homeScore ?? ''))
  const [away, setAway] = React.useState(String(match.awayScore ?? ''))
  const [winner, setWinner] = React.useState(match.winnerTeamId ?? '')
  const invalidate = useInvalidateGames()

  const score = useMatchScore({
    onSuccess: async () => {
      toast.success('Placar salvo.')
      await invalidate()
      onOpenChange(false)
    },
    onError: (error) => notifyError(error, { id: 'match-score' }),
  })

  const tied = home !== '' && home === away

  function submit(event: React.FormEvent) {
    event.preventDefault()
    score.mutate({
      id: match.id,
      homeScore: Number(home),
      awayScore: Number(away),
      winnerTeamId: (tied && winner) || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Placar</DialogTitle>
            <DialogDescription>
              {match.homeName} x {match.awayName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="score-home">{match.homeName}</FieldLabel>
              <Input
                id="score-home"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={home}
                onChange={(event) => setHome(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="score-away">{match.awayName}</FieldLabel>
              <Input
                id="score-away"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={away}
                onChange={(event) => setAway(event.target.value)}
              />
            </Field>
          </div>

          {tied && (
            <Field>
              <FieldLabel htmlFor="score-winner">
                Venceu nos pênaltis
              </FieldLabel>
              <NativeSelect
                id="score-winner"
                required
                value={winner}
                onChange={(event) => setWinner(event.target.value)}
              >
                <NativeSelectOption value="">Selecione</NativeSelectOption>
                <NativeSelectOption value={match.homeTeamId ?? ''}>
                  {match.homeName}
                </NativeSelectOption>
                <NativeSelectOption value={match.awayTeamId ?? ''}>
                  {match.awayName}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
          )}

          <DialogFooter>
            <Button type="submit" disabled={score.isPending}>
              Salvar placar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Data, hora e local da partida. */
export function MatchScheduleDialog({
  match,
  open,
  onOpenChange,
}: DialogProps): React.JSX.Element {
  const [when, setWhen] = React.useState(toSchoolInput(match.scheduledAt))
  const [location, setLocation] = React.useState(match.location ?? '')
  const invalidate = useInvalidateGames()

  const update = useMatchUpdate({
    onSuccess: async () => {
      toast.success('Agenda salva.')
      await invalidate()
      onOpenChange(false)
    },
    onError: (error) => notifyError(error, { id: 'match-update' }),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()

    let scheduledAt: string | null = null
    if (when) scheduledAt = fromSchoolInput(when)

    update.mutate({ id: match.id, scheduledAt, location: location || null })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Agendar partida</DialogTitle>
            <DialogDescription>
              {match.homeName ?? 'A definir'} x {match.awayName ?? 'A definir'}
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="schedule-when">Data e hora</FieldLabel>
            <Input
              id="schedule-when"
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="schedule-location">Local</FieldLabel>
            <Input
              id="schedule-location"
              value={location}
              maxLength={120}
              placeholder="Quadra principal"
              onChange={(event) => setLocation(event.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={update.isPending}>
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
  const invalidate = useInvalidateGames()
  const unscore = useMatchUnscore({
    onSuccess: async () => {
      toast.success('Placar desfeito.')
      await invalidate()
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
