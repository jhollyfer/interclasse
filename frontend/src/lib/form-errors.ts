import { toast } from 'sonner'

import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
import type { HTTPError } from '#/integrations/tanstack-query/http'

/**
 * Leva o erro da API para os campos do formulário.
 *
 * O 422 do backend traz `errors` com **uma** mensagem por campo - o handler
 * guarda a primeira, não a lista -, e o 409 traz o campo em conflito do mesmo
 * jeito (`{ email: 'Usuário já existe' }`). Sem isto, o formulário aceita o
 * payload, a API o recusa e a tela não mostra onde - o erro fica só no
 * `error.message` de um toast que some em 4 segundos.
 *
 * `root` é o canal do backend para "a mensagem é do formulário, não de um
 * campo": é o que o 401 do sign-in usa para não revelar se falhou o email ou a
 * senha.
 *
 * Chave que o formulário não conhece - o backend ganhou um campo, ou o nome
 * mudou - não some em silêncio: vira mensagem de `root`. É a diferença entre
 * "o formulário não valida mais" e "ninguém percebeu por três semanas".
 *
 * Devolve `true` quando algo foi marcado na tela. `false` significa erro sem
 * campo atribuível (5xx, rede), e aí a decisão é de quem chamou: normalmente um
 * toast com ação de tentar de novo.
 */
export function applyHTTPErrorToForm<TValues extends FieldValues>({
  form,
  error,
  fields,
}: {
  form: UseFormReturn<TValues>
  error: HTTPError
  fields: ReadonlyArray<FieldPath<TValues>>
}): boolean {
  const { root, ...rest } = error.errors ?? {}

  const orphans: Array<string> = []

  for (const [field, message] of Object.entries(rest)) {
    // `find` e não `includes`: a chave vem do backend como `string` larga, e o
    // predicado prova o estreitamento em vez de afirmá-lo com uma asserção.
    const known = fields.find((candidate) => candidate === field)

    if (known) {
      form.setError(known, { message })
      continue
    }

    orphans.push(message)
  }

  const rootMessage = [root, ...orphans].filter(Boolean).join(' ')

  if (rootMessage) form.setError('root', { message: rootMessage })

  return Boolean(rootMessage) || Object.keys(rest).length > orphans.length
}

/**
 * O `onError` de um formulário, inteiro.
 *
 * É o que cada `form-create.tsx` e `form-edit.tsx` do painel escreveria à mão,
 * sempre na mesma ordem: tenta marcar os campos, e o que não couber em campo
 * nenhum vira mensagem de rodapé.
 *
 * `retry` é a única variação real: um aviso com "Tentar de novo" que reenvia o
 * mesmo payload, porque erro de servidor não é culpa de quem preencheu e
 * redigitar um formulário longo por causa de um 500 é castigo. Ausente, o 5xx
 * cai no rodapé como qualquer outro.
 *
 * **Quando passar `retry`, e é regra, não gosto:**
 *
 * - **Edição sempre pode.** O `PUT` leva o id e escreve o mesmo estado final;
 *   reenviar não cria nada.
 * - **Criação só quando o use-case recusa a duplicata com 409.** O 5xx pode
 *   ter vindo *depois* da escrita, e aí o reenvio grava o registro de novo. Os
 *   que checam antes de inserir devolvem `*_ALREADY_EXISTS` e são seguros -
 *   notícia e evento pelo `slug`, usuário pelo e-mail. Depoimento, podcast,
 *   vídeo e álbum inserem direto e ficam **sem** `retry` por isso: dois
 *   depoimentos iguais são um depoimento duplicado, não um conflito.
 */
export function applyMutationError<TValues extends FieldValues>({
  form,
  error,
  fields,
  retry,
}: {
  form: UseFormReturn<TValues>
  error: HTTPError
  fields: ReadonlyArray<FieldPath<TValues>>
  retry?: {
    /** O id do aviso, para o sonner não empilhar um por tentativa. */
    id: string
    onClick: () => void
  }
}): void {
  if (applyHTTPErrorToForm({ form, error, fields })) return

  if (retry && error.isServerError) {
    toast.error(error.message, {
      id: retry.id,
      action: { label: 'Tentar de novo', onClick: retry.onClick },
    })
    return
  }

  form.setError('root', { message: error.message })
}
