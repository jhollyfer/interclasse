import { QueryClient } from '@tanstack/react-query'

import { HTTPError } from './http'

/** Quantas vezes uma query que falhou por servidor ou rede é repetida. */
const MAX_QUERY_RETRIES = 3

/**
 * O `retry` padrão das queries: repete 5xx e falha de rede, e nunca 4xx.
 *
 * 401, 403, 404 e 422 não mudam de resposta na terceira tentativa - só atrasam
 * a mensagem de erro na tela. O `instanceof` fica mesmo com
 * `Register.defaultError` declarado em `register.d.ts`: aquilo é promessa de
 * compilação, e um throw que não venha de `request` (um bug, um `TypeError`)
 * chega mesmo assim.
 */
export function shouldRetryQuery(failures: number, error: unknown): boolean {
  if (error instanceof HTTPError && !error.isServerError) return false

  return failures < MAX_QUERY_RETRIES
}

/**
 * O `QueryClient` que vai para o contexto do router.
 *
 * Este arquivo **não** provê nada - quem monta o `QueryClientProvider` é o
 * `setupRouterSsrQueryIntegration` de `src/router.tsx`, que embrulha o `Wrap`
 * do próprio router. Acrescentar um provider à mão aqui criaria um segundo
 * client, ou seja, dois caches, e o `useQuery` da sidebar leria o que o
 * `beforeLoad` não encheu.
 *
 * Um `QueryClient` por requisição, e nunca um singleton de módulo: no servidor
 * de SSR o módulo é compartilhado por todos os visitantes, e um cache de módulo
 * entregaria o `/account` de um usuário renderizado para o próximo.
 * `getContext` roda dentro de `getRouter`, que o Start chama a cada
 * requisição, então o isolamento vem daí.
 */
export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Com o default `0` todo dado que veio pronto do servidor nasce velho e
        // é refeito assim que a página hidrata - a primeira carga paga a
        // requisição duas vezes. Um minuto é curto o bastante para não segurar
        // dado obsoleto e longo o bastante para cobrir a hidratação.
        //
        // Quem precisa de outro valor declara o seu: `accountQueryOptions` usa
        // cinco minutos.
        //
        // **O teto não é arbitrário: é o `URL_TTL` do backend**, hoje quinze
        // minutos (`config/drive.ts`). A resposta carrega `url` assinada, e o
        // cache a guarda junto - `staleTime` acima daquele prazo serve imagem
        // com URL vencida, e a falha aparece como imagem quebrada, sem erro.
        staleTime: 60 * 1000,
        retry: shouldRetryQuery,
      },
    },
  })

  return {
    queryClient,
  }
}
