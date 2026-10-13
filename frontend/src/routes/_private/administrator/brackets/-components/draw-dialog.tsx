import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShuffleIcon } from '@phosphor-icons/react'
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
  DialogTrigger,
} from '#/components/ui/dialog'
import { Field, FieldLabel } from '#/components/ui/field'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useBracketCreate } from '#/integrations/tanstack-query/mutations'
import { sportsQueryOptions } from '#/integrations/tanstack-query/queries'
import { CATEGORIES } from '#/lib/entity'
import { CATEGORY_LABELS } from '#/lib/labels'

/**
 * O sorteio. Escolhe modalidade e categoria; o resto - quem entra, os confrontos,
 * as partidas - o servidor decide com o que as turmas inscreveram.
 */
export function DrawDialog(): React.JSX.Element {
  const [open, setOpen] = React.useState(false)
  const [sportId, setSportId] = React.useState('')
  const [category, setCategory] = React.useState('')
  const navigate = useNavigate()
  const invalidate = useInvalidate()
  const { data: sports } = useQuery(sportsQueryOptions({ perPage: 100 }))

  const draw = useBracketCreate({
    onSuccess: async (bracket) => {
      toast.success('Chave sorteada.')
      await invalidate([...GAME_KEYS, ...DEPENDENTS.games])
      setOpen(false)
      await navigate({
        to: '/administrator/brackets/$id',
        params: { id: bracket.id },
      })
    },
    onError: (error) => notifyError(error, { id: 'bracket-draw' }),
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
        <form
          method="post"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            const chosen = CATEGORIES.find((value) => value === category)
            if (!sportId || !chosen) return
            draw.mutate({ sportId, category: chosen })
          }}
        >
          <DialogHeader>
            <DialogTitle>Sortear chave</DialogTitle>
            <DialogDescription>
              Entram as turmas da categoria com o mínimo de atletas inscritos.
              Depois do sorteio, as inscrições da modalidade nessa categoria
              travam.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="draw-sport">Modalidade</FieldLabel>
            {/* `select` nativo: dentro do diálogo o popup do combobox abre
                atrás do overlay. */}
            <NativeSelect
              id="draw-sport"
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {(sports?.data ?? []).map((sport) => (
                <NativeSelectOption key={sport.id} value={sport.id}>
                  {sport.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="draw-category">Categoria</FieldLabel>
            <NativeSelect
              id="draw-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {CATEGORIES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <DialogFooter>
            <Button
              type="submit"
              disabled={draw.isPending || !sportId || !category}
            >
              Sortear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
