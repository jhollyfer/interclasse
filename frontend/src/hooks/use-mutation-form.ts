import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from '@interclasse/shared'
import type {
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'
import type * as React from 'react'
import { useForm } from 'react-hook-form'
import type {
  DefaultValues,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form'
import { toast } from 'sonner'

import type { HTTPError } from '#/integrations/tanstack-query/http'
import { useInvalidate } from '#/integrations/tanstack-query/invalidate'
import { applyMutationError } from '#/lib/form-errors'

/**
 * O hook de mutation do recurso, como o formulário o recebe.
 *
 * Todos os de `integrations/tanstack-query/mutations/` têm esta forma: aceitam
 * as opções do `useMutation` menos a `mutationFn`, que é o que eles próprios
 * fornecem. É o que permite passar o hook como argumento em vez de chamá-lo no
 * arquivo do formulário.
 */
export type ResourceMutation<TRecord, TPayload> = (
  options?: Omit<
    UseMutationOptions<TRecord, HTTPError, TPayload>,
    'mutationFn'
  >,
) => UseMutationResult<TRecord, HTTPError, TPayload>

export type UseMutationFormOptions<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Readonly<{
  /** O validator Zod de `@interclasse/shared`, o mesmo que o backend usa. */
  validator: z.ZodType<TValues, TValues>
  /** O formulário vazio. */
  defaults?: DefaultValues<TValues>
  /**
   * O registro carregado, na edição. `values` e não `defaultValues`: o
   * registro chega depois do primeiro render, e `defaultValues` só é lido uma
   * vez.
   */
  values?: TValues
  /** Os campos que o backend pode acusar, para o erro cair no lugar certo. */
  fields: ReadonlyArray<FieldPath<TValues>>
  mutation: ResourceMutation<TRecord, TPayload>
  /** As chaves invalidadas no sucesso, antes do aviso e do `onSuccess`. */
  invalidate?: ReadonlyArray<QueryKey>
  /** O texto do toast de sucesso. Função quando cita o registro salvo. */
  success?: string | ((record: TRecord) => string)
  /**
   * O id do aviso de "Tentar de novo", quando o reenvio é seguro. O critério
   * está em `applyMutationError`: edição sempre pode, cadastro só onde o
   * use-case recusa a duplicata com 409.
   */
  retry?: string
  /**
   * O que vai para a API. O cadastro cujo campo bate um a um com o corpo passa
   * `(values) => values`: é a identidade que faz o compilador conferir que o
   * formulário **é** o payload.
   */
  payload: (values: TValues) => TPayload
  /** O que a tela faz depois de salvar: fechar o diálogo, navegar. */
  onSuccess?: (record: TRecord, payload: TPayload) => Promise<void> | void
}>

export type UseMutationFormReturn<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Readonly<{
  form: UseFormReturn<TValues>
  mutation: UseMutationResult<TRecord, HTTPError, TPayload>
  onValid: (values: TValues) => void
  /**
   * O `onSubmit` do `<form>`, pronto: `handleSubmit(onValid)` devolve promessa,
   * e o atributo do JSX espera `void`.
   */
  onSubmit: (event?: React.BaseSyntheticEvent) => void
}>

/**
 * Formulário que dispara uma mutation: `useForm` com o resolver do validator
 * do `shared/`, a mutation com o erro levado aos campos (`applyMutationError`), a
 * invalidação, o aviso de sucesso e um `onValid` que limpa o `root` antes de
 * reenviar.
 *
 * É a base de `useResourceForm` (a tela de criar/editar, que ainda navega de
 * volta) e serve sozinho a quem não é tela: diálogo de placar, sorteio,
 * cadastro em linha, login.
 */
export function useMutationForm<
  TValues extends FieldValues,
  TRecord,
  TPayload,
>({
  validator,
  defaults,
  values,
  fields,
  mutation: useResourceMutation,
  invalidate = [],
  success,
  retry,
  payload: toPayload,
  onSuccess,
}: UseMutationFormOptions<TValues, TRecord, TPayload>): UseMutationFormReturn<
  TValues,
  TRecord,
  TPayload
> {
  const invalidateKeys = useInvalidate()

  const form = useForm<TValues>({
    resolver: zodResolver(validator),
    mode: 'onTouched',
    defaultValues: defaults,
    values,
  })

  function retryOption(sent: TPayload) {
    if (!retry) return undefined

    return { id: retry, onClick: () => mutation.mutate(sent) }
  }

  const mutation = useResourceMutation({
    onError: function (error, sent) {
      applyMutationError({ form, error, fields, retry: retryOption(sent) })
    },
    async onSuccess(record, sent) {
      await invalidateKeys(invalidate)

      if (typeof success === 'string') toast.success(success)
      else if (success) toast.success(success(record))

      await onSuccess?.(record, sent)
    },
  })

  function onValid(submitted: TValues): void {
    // O `root` guarda o erro da tentativa anterior. Sem limpar, um 409 já
    // resolvido continua no rodapé enquanto a segunda tentativa está em voo.
    form.clearErrors('root')

    mutation.mutate(toPayload(submitted))
  }

  function onSubmit(event?: React.BaseSyntheticEvent): void {
    void form.handleSubmit(onValid)(event)
  }

  return { form, mutation, onValid, onSubmit }
}
