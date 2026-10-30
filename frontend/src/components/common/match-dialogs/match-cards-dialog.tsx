import {
  AdministratorCardCreateValidator,
  CARD_COLORS,
} from '@interclasse/shared'
import type {
  AdministratorCardCreatePayload,
  AdministratorCardPaginateResponse,
} from '@interclasse/shared'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { CardList } from '#/components/common/card-list'
import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
import { Button } from '#/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import {
  useCardCreateMutation,
  useCardDeleteMutation,
} from '#/integrations/tanstack-query/mutations/administrator'
import {
  cardsQueryOptions,
  matchAthletesQueryOptions,
} from '#/integrations/tanstack-query/queries/administrator'
import type { DialogHandle } from '#/lib/dialog-handle'
import { notifyError } from '#/lib/form-errors'
import { CARD_COLOR_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { MatchDialogShell } from './match-dialog-shell'
import type { MatchRef } from './match-dialog-shell'

const FIELDS = ['studentId', 'color', 'note'] as const

/** Quem não está na lista da modalidade aparece, mas avisado. */
function athleteLabel(student: { name: string; enrolled: boolean }): string {
  if (student.enrolled) return student.name

  return m.common_match_not_enrolled({ name: student.name })
}

type MatchCardsDialogProps = Readonly<{
  handle: DialogHandle<MatchRef>
}>

/**
 * Os cartões da partida: os já lançados, com o apagar, e o formulário do novo.
 * O atleta sai das duas turmas da partida, os inscritos na modalidade primeiro.
 */
export function MatchCardsDialog({
  handle,
}: MatchCardsDialogProps): React.JSX.Element {
  return (
    <MatchDialogShell handle={handle} className="sm:max-w-lg">
      {(match) => <MatchCardsContent match={match} />}
    </MatchDialogShell>
  )
}

function MatchCardsContent({
  match,
}: Readonly<{ match: MatchRef }>): React.JSX.Element {
  const invalidate = useInvalidate()
  const { data: cards, isPending } = useQuery(
    cardsQueryOptions({ matchId: match.id, perPage: 100 }),
  )
  const { data: athletes } = useQuery(matchAthletesQueryOptions(match.id))

  const { form, mutation, onSubmit } = useMutationForm<
    AdministratorCardCreatePayload,
    AdministratorCardPaginateResponse,
    AdministratorCardCreatePayload
  >({
    validator: AdministratorCardCreateValidator,
    defaults: { matchId: match.id, studentId: '', note: '' },
    fields: FIELDS,
    mutation: useCardCreateMutation,
    invalidate: GAME_KEYS,
    success: (card) =>
      m.common_match_card_given({
        color: CARD_COLOR_LABELS[card.color]?.toLowerCase() ?? '',
        name: card.student.name,
      }),
    payload: (values) => ({ ...values, note: values.note || null }),
    onSuccess: (): void =>
      form.reset({ matchId: match.id, studentId: '', note: '' }),
  })

  // Uma lista só, com a turma no rótulo: o combobox busca por texto, e quem
  // não está inscrito na modalidade segue avisado em `athleteLabel`.
  const athleteOptions = (athletes?.teams ?? []).flatMap((team) =>
    team.students.map((student) => ({
      value: student.id,
      label: `${team.name} - ${athleteLabel(student)}`,
    })),
  )

  const remove = useCardDeleteMutation({
    onSuccess: async () => {
      await invalidate(GAME_KEYS)
    },
    onError: (error) => notifyError(error, { id: 'card-delete' }),
  })

  return (
    <React.Fragment>
      <DialogHeader>
        <DialogTitle>{m.common_match_cards_title()}</DialogTitle>
        <DialogDescription>
          {m.common_match_versus({
            home: match.homeName ?? m.common_to_be_defined(),
            away: match.awayName ?? m.common_to_be_defined(),
          })}
        </DialogDescription>
      </DialogHeader>

      <CardList
        cards={cards?.data ?? []}
        isPending={isPending}
        empty={m.common_match_cards_empty()}
        showMatch={false}
        onDelete={(card) => remove.mutate(card.id)}
      />

      <form
        method="post"
        className="grid gap-3 border-t pt-4"
        onSubmit={onSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <AppField
            control={form.control}
            name="studentId"
            id="card-student"
            label={m.common_match_card_athlete()}
          >
            {({ field, control }) => (
              <OptionCombobox
                id={control.id}
                aria-invalid={control['aria-invalid']}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                options={athleteOptions}
              />
            )}
          </AppField>
          <AppField
            control={form.control}
            name="color"
            id="card-color"
            label={m.common_match_card_color()}
          >
            {({ field, control }) => (
              <OptionCombobox
                id={control.id}
                aria-invalid={control['aria-invalid']}
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(CARD_COLORS.find((color) => color === value))
                }
                onBlur={field.onBlur}
                options={toOptions(CARD_COLORS, CARD_COLOR_LABELS)}
              />
            )}
          </AppField>
        </div>
        <AppField
          control={form.control}
          name="note"
          id="card-note"
          label={m.common_match_card_note()}
        >
          {({ field, control }) => (
            <Input
              {...field}
              {...control}
              value={field.value ?? ''}
              maxLength={200}
              placeholder={m.common_match_card_note_placeholder()}
            />
          )}
        </AppField>

        <AppFormRootError form={form} />

        <Button
          type="submit"
          className="justify-self-end"
          disabled={mutation.isPending}
        >
          {m.common_match_card_submit()}
        </Button>
      </form>
    </React.Fragment>
  )
}
