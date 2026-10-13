import type { HTTPError } from '#/integrations/tanstack-query/http'
import type { getRouter } from '#/router'

/**
 * Os registros de tipo das bibliotecas, num `.d.ts` porque declaration merging
 * exige `interface` (o lint libera a forma só nos arquivos `.d.ts`).
 */

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

/**
 * Todo caminho de falha de `request` lança `HTTPError`, então `onError` de
 * mutation e `error` de query chegam com `.status`, `.code` e `.errors` sem
 * `instanceof` em cada tela. É promessa de compilação: um throw que não venha
 * de `request` (um bug, um `TypeError`) chega mesmo assim, e por isso o
 * `retry` de `query-context.ts` mantém o `instanceof`.
 */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: HTTPError
  }
}
