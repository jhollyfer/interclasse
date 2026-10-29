import { useQuery } from '@tanstack/react-query'
import type * as React from 'react'
import { AdministratorCardCreateValidator } from '@interclasse/shared'
import type { AdministratorCardCreatePayload } from '@interclasse/shared'

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
  useCardCreate,
  useCardDelete,
} from '#/integrations/tanstack-query/mutations/administrator'
import {
  cardsQueryOptions,
  matchAthletesQueryOptions,
} from '#/integrations/tanstack-query/queries/administrator'
import { CARD_COLORS } from '#/lib/entity'
import { notifyError } from '#/lib/form-errors'
import type { IMatchCard } from '#/lib/interfaces'
import { CARD_COLOR_LABELS } from '#/lib/labels'

import type { MatchRef } from './match-dialogs'

const FIELDS = ['studentId', 'color', 'note'] as const

/** Quem não está na lista da modalidade aparece, mas avisado. */
function athleteLabel(student: { name: string; enrolled: boolean }): string {
  if (student.enrolled) return student.name

  return `${student.name} (não inscrito)`
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
    IMatchCard,
    AdministratorCardCreatePayload
  >({
    validator: AdministratorCardCreateValidator,
    defaults: { matchId: match.id, studentId: '', note: '' },
    fields: FIELDS,
    mutation: useCardCreate,
    invalidate: GAME_KEYS,
    success: (card) =>
      `Cartão ${CARD_COLOR_LABELS[card.color]?.toLowerCase() ?? ''} para ${card.student.name}.`,
    payload: (values) => ({ ...values, note: values.note || null }),
    onSuccess: (): void =>
      form.reset({ matchId: match.id, studentId: '', note: '' }),
  })

  const remove = useCardDelete({
    onSuccess: async () => {
      await invalidate(GAME_KEYS)
    },
    onError: (error) => notifyError(error, { id: 'card-delete' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cartões</DialogTitle>
          <DialogDescription>
            {match.homeName ?? 'A definir'} x {match.awayName ?? 'A definir'}
          </DialogDescription>
        </DialogHeader>

        <CardList
          cards={cards?.data ?? []}
          isPending={isPending}
          empty="Nenhum cartão nesta partida."
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
              label="Atleta"
            >
              {({ field, control }) => (
                // `select` nativo: dentro do diálogo o popup do combobox abre
                // atrás do overlay.
                <NativeSelect {...field} {...control}>
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
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
              label="Cor"
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
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
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
            label="Observação"
          >
            {({ field, control }) => (
              <Input
                {...field}
                {...control}
                value={field.value ?? ''}
                maxLength={200}
                placeholder="Opcional. Ex.: falta por trás"
              />
            )}
          </AppField>

          <AppFormRootError form={form} />

          <Button
            type="submit"
            className="justify-self-end"
            disabled={mutation.isPending}
          >
            Lançar cartão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
