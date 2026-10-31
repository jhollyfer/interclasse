import handler from '@tanstack/react-start/server-entry'

import { paraglideMiddleware } from './paraglide/server'

/**
 * The SSR server entry. Paraglide's middleware receives the original request and
 * opens its language context before Start renders: without that, two
 * parallel requests would share the language (_standards/i18n.md §2,
 * _doc-lib/paraglide.md#/tanstack-start, #/middleware).
 */
export default {
  fetch(request: Request): Promise<Response> {
    return paraglideMiddleware(request, () => handler.fetch(request))
  },
}
