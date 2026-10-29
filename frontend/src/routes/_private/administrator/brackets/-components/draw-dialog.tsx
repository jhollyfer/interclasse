import { ShuffleIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { AdministratorBracketCreateValidator } from '@interclasse/shared'
import type { AdministratorBracketCreatePayload } from '@interclasse/shared'

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
import { Skeleton } from '#/components/ui/skeleton'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useBracketCreate } from '#/integrations/tanstack-query/mutations/administrator'
import {
  bracketPreviewQueryOptions,
  sportsQueryOptions,
} from '#/integrations/tanstack-query/queries/administrator'
import { CATEGORIES } from '#/lib/entity'
import type { IBracket } from '#/lib/interfaces'
import { CATEGORY_LABELS, plural } from '#/lib/labels'

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
    AdministratorBracketCreatePayload,
    IBracket,
    AdministratorBracketCreatePayload
  >({
    validator: AdministratorBracketCreateValidator,
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
              Depois do sorteio, só o professor conselheiro troca atleta da
              lista.
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

          <DrawPreview
            sportId={form.watch('sportId')}
            category={form.watch('category')}
          />

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

/**
 * Quem entraria no sorteio agora. Sem ela, a turma abaixo do mínimo ficava de
 * fora sem aviso, e "não há turmas suficientes" parecia defeito do sorteio.
 */
function DrawPreview({
  sportId,
  category,
}: Readonly<{
  sportId: string | undefined
  category: string | undefined
}>): React.JSX.Element | null {
  const { data, isPending } = useQuery({
    ...bracketPreviewQueryOptions(sportId ?? '', category ?? ''),
    enabled: Boolean(sportId && category),
  })

  if (!sportId || !category) return null
  if (isPending) return <Skeleton className="h-20 w-full" />
  if (!data) return null

  const eligible = data.classrooms.filter((row) => row.eligible)
  const out = data.classrooms.filter((row) => !row.eligible)

  return (
    <div className="grid gap-2 rounded-lg border p-3 text-sm">
      {data.drawn && (
        <p className="text-destructive">
          Esta modalidade já foi sorteada nesta categoria. Para refazer, apague
          a chave atual.
        </p>
      )}
      <p className="font-medium">
        {`${plural(eligible.length, 'turma entra', 'turmas entram')} (mínimo de ${plural(data.minAthletes, 'atleta', 'atletas')})`}
      </p>
      {eligible.length > 0 && (
        <p className="text-muted-foreground">
          {eligible.map((row) => `${row.name} (${row.athletes})`).join(', ')}
        </p>
      )}
      {out.length > 0 && (
        <p className="text-muted-foreground">
          <span className="text-foreground">Ficam de fora: </span>
          {out.map((row) => `${row.name} (${row.athletes})`).join(', ')}
        </p>
      )}
      {eligible.length < 2 && !data.drawn && (
        <p className="text-destructive">
          São necessárias ao menos 2 turmas com o mínimo de atletas. Peça aos
          conselheiros e representantes que completem as listas.
        </p>
      )}
    </div>
  )
}
