import { useForm } from 'react-hook-form'
import { vineResolver } from '@hookform/resolvers/vine'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import type {
  DefaultValues,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form'
import type {
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query'
import type { LinkProps } from '@tanstack/react-router'
import type { HTTPError } from '#/integrations/tanstack-query/http'

import { applyMutationError } from '#/lib/form-errors'

/**
 * O hook de mutation do recurso, como o formulário o recebe.
 *
 * Todos os de `integrations/tanstack-query/mutations.ts` têm esta forma: aceitam
 * as opções do `useMutation` menos a `mutationFn`, que é o que eles próprios
 * fornecem. É o que permite passar o hook como argumento em vez de chamá-lo no
 * arquivo do formulário.
 */
type ResourceMutation<TRecord, TPayload> = (
  options?: Omit<
    UseMutationOptions<TRecord, HTTPError, TPayload>,
    'mutationFn'
  >,
) => UseMutationResult<TRecord, HTTPError, TPayload>

type UseResourceFormOptions<TValues extends FieldValues, TRecord, TPayload> = {
  /** O id do `<form>`, que liga o `Salvar` do cabeçalho ao formulário que rola. */
  formId: string
  /** O validator do vine. A edição usa o de **criação** - ver nota abaixo. */
  validator: Parameters<typeof vineResolver>[0]
  /**
   * O formulário vazio.
   *
   * Ausente numa edição que só usa `values`: o registro chega da query e não há
   * estado inicial a declarar - `administrator/users` é o caso.
   */
  defaults?: DefaultValues<TValues>
  /**
   * O registro carregado, na edição.
   *
   * `values` e não `defaultValues`: o registro chega depois do primeiro render,
   * e `defaultValues` só é lido uma vez.
   */
  values?: TValues
  /** Os campos que o backend pode acusar, para o erro cair no lugar certo. */
  fields: ReadonlyArray<FieldPath<TValues>>
  mutation: ResourceMutation<TRecord, TPayload>
  /** A chave invalidada no sucesso. Uma só - nenhum dos formulários invalida duas. */
  invalidate: QueryKey
  /**
   * Outras chaves que o registro alimenta: o nome de uma turma aparece no
   * placar, então salvar turma também invalida jogos e o site.
   */
  alsoInvalidate?: ReadonlyArray<QueryKey>
  /** Para onde volta depois de salvar, e para onde apontam a seta e o `Descartar`. */
  backTo: LinkProps['to']
  backParams?: LinkProps['params']
  /** O texto do toast de sucesso. Função quando cita o registro salvo. */
  success: string | ((record: TRecord) => string)
  /**
   * O id do aviso de "Tentar de novo", quando o reenvio é seguro.
   *
   * Ausente, o 5xx cai no rodapé do formulário. O critério está em
   * `applyMutationError`, e é regra: edição sempre pode, cadastro só onde o
   * use-case recusa a duplicata com 409.
   */
  retry?: string
  /**
   * O que vai para a API. A edição acrescenta o id; o cadastro cujo campo bate
   * um a um com o corpo passa `(values) => values`, e é essa identidade que faz
   * o compilador conferir que o formulário **é** o payload - os dois generics
   * soltos não provam isso sozinhos.
   */
  payload: (values: TValues) => TPayload
}

type UseResourceFormReturn<TValues extends FieldValues, TRecord, TPayload> = {
  form: UseFormReturn<TValues>
  mutation: UseMutationResult<TRecord, HTTPError, TPayload>
  onValid: (values: TValues) => void
  /** As quatro props do `FormShell`, prontas para espalhar. */
  shell: {
    formId: string
    backTo: LinkProps['to']
    backParams?: LinkProps['params']
    isPending: boolean
  }
}

/**
 * A fiação de um formulário de criar ou editar do painel.
 *
 * Os `form-create.tsx` / `form-edit.tsx` de cada recurso - notícia, evento,
 * podcast, vídeo, álbum, depoimento e usuário, mais o da conta - escreveriam as
 * mesmas ~25 linhas antes de chegar no primeiro campo: `useForm` com o resolver
 * do vine, a mutation com `onError` e `onSuccess`, o `invalidateQueries`, o
 * toast, o `navigate` de volta e um `onValid` que limpa o `root` antes de
 * enviar. O que varia são treze valores, e é o que este hook recebe.
 *
 * Ele não desenha nada: o casco visual continua sendo `common/form-shell/`, e
 * os campos continuam no `form-fields.tsx` de cada pasta. `shell` sai pronto
 * para espalhar no `FormShell` porque as quatro props dele saem todas daqui -
 * e assim o destino de volta é escrito uma vez, não duas.
 *
 * **O `queryClient` vem do `useQueryClient()`, e não do contexto da rota.** Nos
 * arquivos de formulário a leitura era `route.useRouteContext()`, para não
 * pedir de novo o que o `loader` já tinha. Aqui não há rota: o hook serve todos
 * os formulários do painel. É a mesma instância - `router.tsx` monta o
 * `QueryClientProvider` com o client do contexto do router, via
 * `setupRouterSsrQueryIntegration` -, então o cache é um só.
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
  validator,
  defaults,
  values,
  fields,
  mutation: useResourceMutation,
  invalidate,
  alsoInvalidate = [],
  backTo,
  backParams,
  success,
  retry,
  payload: toPayload,
}: UseResourceFormOptions<TValues, TRecord, TPayload>): UseResourceFormReturn<
  TValues,
  TRecord,
  TPayload
> {
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<TValues>({
    resolver: vineResolver(validator),
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
    async onSuccess(record) {
      await Promise.all(
        [invalidate, ...alsoInvalidate].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      )

      if (typeof success === 'string') toast.success(success)
      else toast.success(success(record))

      router.navigate({ to: backTo, params: backParams })
    },
  })

  function onValid(submitted: TValues): void {
    // O `root` guarda o erro da tentativa anterior. Sem limpar, um 409 já
    // resolvido continua no rodapé enquanto a segunda tentativa está em voo.
    form.clearErrors('root')

    mutation.mutate(toPayload(submitted))
  }

  return {
    form,
    mutation,
    onValid,
    shell: { formId, backTo, backParams, isPending: mutation.isPending },
  }
}
