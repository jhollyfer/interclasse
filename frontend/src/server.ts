import handler from '@tanstack/react-start/server-entry'

import { env } from './env'
import { securityHeaders } from './lib/security-headers'
import { paraglideMiddleware } from './paraglide/server'

/**
 * The SSR server entry. Paraglide's middleware receives the original request and
 * opens its language context before Start renders: without that, two
 * parallel requests would share the language (_standards/i18n.md §2,
 * _doc-lib/paraglide.md#/tanstack-start, #/middleware).
 *
 * The security headers are set here, per request, because the CSP depends on
 * `STORAGE_PUBLIC_URL` (the bucket origin), a runtime value that never goes into
 * the build (`frontend.md` §3.3). Production only: the dev server needs the HMR
 * websocket and eval.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const response = await paraglideMiddleware(request, () =>
      handler.fetch(request),
    )

    if (!import.meta.env.PROD) return response

    const secured = new Response(response.body, response)
    const headers = securityHeaders({
      apiUrl: env.VITE_API_URL,
      storagePublicUrl: process.env.STORAGE_PUBLIC_URL,
    })

    for (const [name, value] of Object.entries(headers)) {
      secured.headers.set(name, value)
    }

    return secured
  },
}
