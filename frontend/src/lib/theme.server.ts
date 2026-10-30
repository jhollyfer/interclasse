/**
 * A parte de `lib/theme.ts` que só existe no servidor: ler o cookie da
 * requisição. Importa `@tanstack/react-start/server` e por isso nunca entra no
 * bundle do navegador; o consumidor é o `.server()` de um
 * `createIsomorphicFn` (mesmo desenho de `http.server.ts`).
 */

import { getCookie } from '@tanstack/react-start/server'

/** O valor cru do cookie de tema; `undefined` fora de uma requisição. */
export function themeCookie(name: string): string | undefined {
  try {
    return getCookie(name)
  } catch {
    // Fora de um ciclo de requisição - teste, script - não há cookie.
    return undefined
  }
}
