/**
 * A configuração do Start que vale para o servidor inteiro.
 *
 * O arquivo é detectado pelo nome, sem registro em lugar nenhum, e existe por
 * um motivo só: abrir um escopo por requisição antes que qualquer coisa rode
 * dentro dela. Middleware de request roda "antes de toda requisição, incluindo
 * server routes, SSR e server functions" - que é exatamente a fronteira que o
 * escopo precisa cobrir, porque o `beforeLoad` de uma rota é SSR e não passa
 * por server function nenhuma.
 */

import { createMiddleware, createStart } from '@tanstack/react-start'
import { runInRequestScope } from '#/integrations/tanstack-query/http.server'

/**
 * `http.server.ts` é só-servidor pelo sufixo, então o `node:async_hooks` que
 * ele importa nunca entra no bundle do navegador. Este arquivo também só roda
 * no servidor, e por isso pode importá-lo direto.
 */
const requestScope = createMiddleware({ type: 'request' }).server(({ next }) =>
  runInRequestScope(next),
)

export const startInstance = createStart(() => ({
  requestMiddleware: [requestScope],
}))
