import type { UseMutationOptions } from '@tanstack/react-query'

import type { HTTPError } from './http'

/**
 * As opções que todo hook deste arquivo aceita: o contrato do TanStack Query
 * menos o `mutationFn`, que é o que o hook guarda.
 *
 * Vinte e seis tipos escreviam esta mesma forma por extenso, cada um só trocando
 * o par `<dado, payload>` — e nada garantia que continuassem iguais. Portado de
 * `lowcodejs`, que já tinha fatorado a forma.
 *
 * Os generics precisam vir preenchidos: eles têm default (`TVariables = void`) e,
 * com `strictFunctionTypes`, o parâmetro dos callbacks é contravariante — sem
 * preencher, a função resultante não aceita o payload.
 *
 * `TError` tem default `HTTPError` porque todo caminho de falha de `request()`
 * lança `HTTPError` — é o que `register.d.ts` declara em `Register.defaultError`. Quem
 * não passa por `request()` o informa: o upload multipart fala com o bucket
 * direto e pode lançar `Error` cru.
 */
export type MutationProps<TData, TPayload, TError = HTTPError> = Omit<
  UseMutationOptions<TData, TError, TPayload>,
  'mutationFn'
>
