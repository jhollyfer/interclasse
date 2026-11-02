/**
 * The frontend server's security headers (`frontend.md` §3.3). Nitro sends none by
 * default, and without `frame-ancestors` the sign-in screen can be embedded in an
 * `iframe` by another site.
 *
 * `connect-src` and `img-src` open only the API and, with presigned upload, the
 * storage's public origin (`STORAGE_PUBLIC_URL`). That origin is read **per request**
 * by the caller and passed here, never fixed at build time: the same image serves
 * any environment. `unsafe-inline` in script and style because Start writes the
 * hydration scripts inline and emits no nonce.
 * _doc-lib/nitro.md#config.
 */
type SecurityHeadersInput = Readonly<{
  /** Public origin of the API, the one the browser calls (`VITE_API_URL`). */
  apiUrl: string
  /** Public origin of the bucket (`STORAGE_PUBLIC_URL`); absent, only the API is open. */
  storagePublicUrl: string | undefined
}>

export function securityHeaders(
  input: SecurityHeadersInput,
): Readonly<Record<string, string>> {
  const origins = ["'self'", input.apiUrl, input.storagePublicUrl]
    .filter(Boolean)
    .join(' ')

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${origins} data: blob:`,
    "font-src 'self' data:",
    `connect-src ${origins}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // No `preload`: joining the list is a commitment that cannot be undone.
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }
}
