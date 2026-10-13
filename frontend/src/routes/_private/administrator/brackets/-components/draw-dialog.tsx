import { ShuffleIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useBracketCreate } from '#/integrations/tanstack-query/mutations'
import { sportsQueryOptions } from '#/integrations/tanstack-query/queries'
import { CATEGORIES } from '#/lib/entity'
import type { IBracket } from '#/lib/interfaces'
import { CATEGORY_LABELS } from '#/lib/labels'
import { BracketCreateValidator } from '#/validators/administrator/brackets.validator'
import type { BracketCreatePayload } from '#/validators/administrator/brackets.validator'

const FIELDS = ['sportId', 'category'] as const

/**
 * O sorteio. Escolhe modalidade e categoria; o resto - quem entra, os confrontos,
 * as partidas - o servidor decide com o que as turmas inscreveram.
 */
export function DrawDialog(): React.JSX.Element {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const { data: sports } = useQuery(sportsQueryOptions({ perPage: 100 }))

  const { form, mutation, onSubmit } = useMutationForm<
    BracketCreatePayload,
    IBracket,
    BracketCreatePayload
  >({
    validator: BracketCreateValidator,
    defaults: { sportId: '' },
    fields: FIELDS,
    mutation: useBracketCreate,
    invalidate: [...GAME_KEYS, ...DEPENDENTS.games],
    success: 'Chave sorteada.',
    payload: (values) => values,
    async onSuccess(bracket) {
      setOpen(false)
      await navigate({
        to: '/administrator/brackets/$id',
        params: { id: bracket.id },
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <ShuffleIcon />
            Sortear chave
          </Button>
        }
      />
      <DialogContent>
        <form method="post" className="grid gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Sortear chave</DialogTitle>
            <DialogDescription>
              Entram as turmas da categoria com o mínimo de atletas inscritos.
              Depois do sorteio, as inscrições da modalidade nessa categoria
              travam.
            </DialogDescription>
          </DialogHeader>

          <AppField
            control={form.control}
            name="sportId"
            id="draw-sport"
            label="Modalidade"
          >
            {({ field, control }) => (
              // `select` nativo: dentro do diálogo o popup do combobox abre
              // atrás do overlay.
              <NativeSelect {...field} {...control}>
                <NativeSelectOption value="">Selecione</NativeSelectOption>
                {(sports?.data ?? []).map((sport) => (
                  <NativeSelectOption key={sport.id} value={sport.id}>
                    {sport.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </AppField>
          <AppField
            control={form.control}
            name="category"
            id="draw-category"
            label="Categoria"
          >
            {({ field, control }) => (
              <NativeSelect
                {...control}
                // A categoria nasce ausente: `String(undefined)` não casa com
                // opção nenhuma, e o select mostra o "Selecione".
                value={String(field.value)}
                onChange={(event) =>
                  field.onChange(
                    CATEGORIES.find((value) => value === event.target.value),
                  )
                }
                onBlur={field.onBlur}
              >
                <NativeSelectOption value="">Selecione</NativeSelectOption>
                {CATEGORIES.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </AppField>

          <AppFormRootError form={form} />

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Sortear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
