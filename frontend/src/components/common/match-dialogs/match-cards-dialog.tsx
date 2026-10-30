import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'
import {
  AdministratorCardCreateValidator,
  CARD_COLORS,
} from '@interclasse/shared'
import type {
  AdministratorCardCreatePayload,
  AdministratorCardPaginateResponse,
} from '@interclasse/shared'

import { CardList } from '#/components/common/card-list'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '#/components/ui/native-select'
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
import { notifyError } from '#/lib/form-errors'
import { CARD_COLOR_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import type { MatchRef } from './match-dialogs'

const FIELDS = ['studentId', 'color', 'note'] as const

/** Quem não está na lista da modalidade aparece, mas avisado. */
function athleteLabel(student: { name: string; enrolled: boolean }): string {
  if (student.enrolled) return student.name

  return m.common_match_not_enrolled({ name: student.name })
}

type MatchCardsDialogProps = Readonly<{
  match: MatchRef
  open: boolean
  onOpenChange: (open: boolean) => void
}>

/**
 * Os cartões da partida: os já lançados, com o apagar, e o formulário do novo.
 * O atleta sai das duas turmas da partida, os inscritos na modalidade primeiro.
 */
export function MatchCardsDialog({
  match,
  open,
  onOpenChange,
}: MatchCardsDialogProps): React.JSX.Element {
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

  const remove = useCardDeleteMutation({
    onSuccess: async () => {
      await invalidate(GAME_KEYS)
    },
    onError: (error) => notifyError(error, { id: 'card-delete' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
                // `select` nativo: dentro do diálogo o popup do combobox abre
                // atrás do overlay.
                <NativeSelect {...field} {...control}>
                  <NativeSelectOption value="">
                    {m.common_select_placeholder()}
                  </NativeSelectOption>
                  {(athletes?.teams ?? []).map((team) => (
                    <NativeSelectOptGroup key={team.teamId} label={team.name}>
                      {team.students.map((student) => (
                        <NativeSelectOption key={student.id} value={student.id}>
                          {athleteLabel(student)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              )}
            </AppField>
            <AppField
              control={form.control}
              name="color"
              id="card-color"
              label={m.common_match_card_color()}
            >
              {({ field, control }) => (
                <NativeSelect
                  {...control}
                  value={String(field.value)}
                  onChange={(event) =>
                    field.onChange(
                      CARD_COLORS.find((value) => value === event.target.value),
                    )
                  }
                  onBlur={field.onBlur}
                >
                  <NativeSelectOption value="">
                    {m.common_select_placeholder()}
                  </NativeSelectOption>
                  {CARD_COLORS.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {CARD_COLOR_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
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
      </DialogContent>
    </Dialog>
  )
}
