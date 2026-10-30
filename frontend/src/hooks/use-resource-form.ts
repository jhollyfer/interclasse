import type { Merge } from '@interclasse/shared'
import type { QueryKey } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type { FieldValues } from 'react-hook-form'

import { useMutationForm } from './use-mutation-form'
import type {
  UseMutationFormOptions,
  UseMutationFormReturn,
} from './use-mutation-form'

type UseResourceFormOptions<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Merge<
  Omit<
    UseMutationFormOptions<TValues, TRecord, TPayload>,
    | 'formId'
    | 'invalidate'
    | 'alsoInvalidate'
    | 'backTo'
    | 'backParams'
    | 'onSuccess'
  >,
  Readonly<{
    /** O id do `<form>`, que liga o `Salvar` do cabeçalho ao formulário que rola. */
    formId: string
    /** A chave do próprio recurso, invalidada no sucesso. */
    invalidate: QueryKey
    /**
     * Outras chaves que o registro alimenta: o nome de uma turma aparece no
     * placar, então salvar turma também invalida jogos e o site.
     */
    alsoInvalidate?: ReadonlyArray<QueryKey>
    /** Para onde volta depois de salvar, e para onde apontam a seta e o `Descartar`. */
    backTo: LinkProps['to']
    backParams?: LinkProps['params']
    /**
     * O que fazer depois de salvar, no lugar de voltar para `backTo`. É o caso
     * do perfil: trocar e-mail ou senha derruba a sessão, e o destino passa a
     * ser o login.
     */
    onSuccess?: UseMutationFormOptions<TValues, TRecord, TPayload>['onSuccess']
  }>
>

type UseResourceFormReturn<
  TValues extends FieldValues,
  TRecord,
  TPayload,
> = Merge<
  Omit<UseMutationFormReturn<TValues, TRecord, TPayload>, 'shell'>,
  Readonly<{
    /** As quatro props do `FormShell`, prontas para espalhar. */
    shell: {
      readonly formId: string
      readonly backTo: LinkProps['to']
      readonly backParams?: LinkProps['params']
      readonly isPending: boolean
    }
  }>
>

/**
 * A fiação de um formulário de criar ou editar do painel: `useMutationForm`
 * mais a volta para `backTo` e as props do `FormShell`.
 *
 * Ele não desenha nada: o casco visual continua sendo `common/form-shell/`, e
 * os campos continuam no `form-fields.tsx` de cada pasta.
 *
 * **A edição valida com o validator de criação, e não com o de atualização.** O
 * de atualização é todo `.optional()` - correto para a API, porque o `PUT` é
 * parcial, e péssimo como regra de tela: o usuário apagaria o nome, o
 * formulário aprovaria, a API leria o campo vazio como "não mexer" e o nome
 * ficaria o antigo sem aviso nenhum. O payload continua válido para o `PUT`
 * justamente porque lá tudo é opcional.
 */
export function useResourceForm<
  TValues extends FieldValues,
  TRecord,
  TPayload,
>({
  formId,
  invalidate,
  alsoInvalidate = [],
  backTo,
  backParams,
  onSuccess,
  ...options
}: UseResourceFormOptions<TValues, TRecord, TPayload>): UseResourceFormReturn<
  TValues,
  TRecord,
  TPayload
> {
  const router = useRouter()

  const resource = useMutationForm<TValues, TRecord, TPayload>({
    ...options,
    invalidate: [invalidate, ...alsoInvalidate],
    async onSuccess(record, sent) {
      if (onSuccess) {
        await onSuccess(record, sent)
        return
      }

      await router.navigate({ to: backTo, params: backParams })
    },
  })

  return {
    ...resource,
    shell: {
      formId,
      backTo,
      backParams,
      isPending: resource.mutation.isPending,
    },
  }
}
