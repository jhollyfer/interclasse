import handler from '@tanstack/react-start/server-entry'

import { paraglideMiddleware } from './paraglide/server'

/**
 * A entrada do servidor de SSR. O middleware do Paraglide recebe a requisição
 * original e abre o contexto do idioma dela antes do Start renderizar: sem isso
 * duas requisições em paralelo dividiriam o idioma (_standards/i18n.md §2,
 * _doc-lib/paraglide.md#/tanstack-start, #/middleware).
 */
export default {
  fetch(request: Request): Promise<Response> {
    return paraglideMiddleware(request, () => handler.fetch(request))
  },
}
