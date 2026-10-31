import {
  AdministratorBracketCreateValidator,
  CATEGORIES,
} from '@interclasse/shared'
import type {
  Merge,
  AdministratorBracketCreatePayload,
  AdministratorBracketPaginateResponse,
} from '@interclasse/shared'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'

import { OptionCombobox, toOptions } from '#/components/common/option-combobox'
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
import { Skeleton } from '#/components/ui/skeleton'
import { DEPENDENTS, GAME_KEYS } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useBracketCreateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { bracketPreviewQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { createDialogHandle } from '#/lib/dialog-handle'
import type { DialogHandle } from '#/lib/dialog-handle'
import { CATEGORY_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { SportCombobox } from './sport-combobox'

const FIELDS = ['sportId', 'category'] as const

type DrawDialogProps = Readonly<
  Merge<
    React.ComponentProps<typeof DialogTrigger>,
    { render: React.ReactElement }
  >
>

/**
 * The draw. Chooses sport and category; the rest - who enters, the fixtures,
 * the matches - the server decides from what the classrooms enrolled.
 *
 * Uncontrolled and trigger-forward (`frontend.md` §6.2): the caller passes the visible
 * button in `render`. The form only mounts open and closes through the `handle` on
 * draw.
 */
export function DrawDialog({
  ref,
  render,
  ...rest
}: DrawDialogProps): React.JSX.Element {
  const [handle] = React.useState(() => createDialogHandle())

  return (
    <Dialog handle={handle}>
      <DialogTrigger {...rest} ref={ref} render={render} />
      <DialogContent>
        <DrawForm handle={handle} />
      </DialogContent>
    </Dialog>
  )
}

function DrawForm({
  handle,
}: Readonly<{ handle: DialogHandle }>): React.JSX.Element {
  const navigate = useNavigate()

  const { form, mutation, onSubmit } = useMutationForm<
    AdministratorBracketCreatePayload,
    AdministratorBracketPaginateResponse,
    AdministratorBracketCreatePayload
  >({
    validator: AdministratorBracketCreateValidator,
    defaults: { sportId: '' },
    fields: FIELDS,
    mutation: useBracketCreateMutation,
    invalidate: [...GAME_KEYS, ...DEPENDENTS.games],
    success: m.admin_brackets_drawn_ok(),
    payload: (values) => values,
    async onSuccess(bracket) {
      handle.close()
      await navigate({
        to: '/administrator/brackets/$id',
        params: { id: bracket.id },
      })
    },
  })

  return (
    <form method="post" className="grid gap-4" onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle>{m.admin_brackets_draw()}</DialogTitle>
        <DialogDescription>
          {m.admin_brackets_draw_description()}
        </DialogDescription>
      </DialogHeader>

      <AppField
        control={form.control}
        name="sportId"
        id="draw-sport"
        label={m.admin_common_sport()}
      >
        {({ field, control }) => (
          <SportCombobox
            {...control}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      </AppField>
      <AppField
        control={form.control}
        name="category"
        id="draw-category"
        label={m.admin_common_category()}
      >
        {({ field, control }) => (
          <OptionCombobox
            {...control}
            // The category is born absent: `String(undefined)` matches no
            // option, and the field shows the "Selecione".
            value={String(field.value)}
            onValueChange={(value) =>
              field.onChange(CATEGORIES.find((category) => category === value))
            }
            onBlur={field.onBlur}
            options={toOptions(CATEGORIES, CATEGORY_LABELS)}
          />
        )}
      </AppField>

      <DrawPreview
        sportId={form.watch('sportId')}
        category={form.watch('category')}
      />

      <AppFormRootError form={form} />

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {m.admin_brackets_draw_confirm()}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * Who would enter the draw right now. Without it, a classroom below the minimum was left
 * out without notice, and "não há turmas suficientes" looked like a draw defect.
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
          {m.admin_brackets_preview_already_drawn()}
        </p>
      )}
      <p className="font-medium">
        {m.admin_brackets_preview_eligible({
          eligible: eligible.length,
          min: data.minAthletes,
        })}
      </p>
      {eligible.length > 0 && (
        <p className="text-muted-foreground">
          {eligible.map((row) => `${row.name} (${row.athletes})`).join(', ')}
        </p>
      )}
      {out.length > 0 && (
        <p className="text-muted-foreground">
          <span className="text-foreground">
            {m.admin_brackets_preview_out()}{' '}
          </span>
          {out.map((row) => `${row.name} (${row.athletes})`).join(', ')}
        </p>
      )}
      {eligible.length < 2 && !data.drawn && (
        <p className="text-destructive">
          {m.admin_brackets_preview_not_enough()}
        </p>
      )}
    </div>
  )
}
