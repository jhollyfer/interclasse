import { AccountProfileShowResponse } from '@interclasse/shared'
import { queryOptions } from '@tanstack/react-query'

import { queryKeys } from '#/hooks/tanstack-query/_query-keys'

import { request } from '../http'

/**
 * A sessão. Não há store, contexto nem hook de auth neste repositório de
 * propósito: quem está logado é dado do servidor, e dado do servidor mora no
 * cache do TanStack Query.
 *
 * `queryOptions` e não um objeto solto para que o `beforeLoad` do layout e o
 * `useQuery` do cabeçalho usem literalmente a mesma chave - é o que faz o
 * segundo aproveitar o cache que o primeiro encheu, em vez de repetir a
 * requisição.
 */
export const accountQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.account.profile.all,
    // O `signal` vem da própria biblioteca e é repassado ao `fetch`: sem ele,
    // query que desmonta antes de resolver não cancela nada, e a resposta
    // atrasada de uma sessão anterior chega depois da atual.
    queryFn: ({ signal }) =>
      request('/account', AccountProfileShowResponse, { signal }),
    // O 401 já foi tratado dentro de `request`, que tentou renovar a sessão e
    // não conseguiu. Repetir a chamada não muda a resposta, só atrasa o
    // redirecionamento para o login.
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
