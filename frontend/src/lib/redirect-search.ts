/** Where to go back to after signing in, when the guard blocked someone midway. */
export type RedirectSearch = {
  redirect?: string
}

/**
 * Validates the authentication screen's `?redirect=`.
 *
 * By hand, and not with a Zod schema: the rule is about the path (`/`, never `//` or
 * `/\`), not the shape, and the router's `validateSearch` has to return the
 * clean object, without throwing.
 *
 * Lives outside `routes/` so it can be tested without the route tree generator
 * treating the test file as a route.
 */
export function validateRedirectSearch(
  search: Record<string, unknown>,
): RedirectSearch {
  const value = search.redirect

  if (typeof value !== 'string') return {}

  // Internal paths only. `https://evil.com` is obvious, but `//evil.com` is also
  // external navigation: the browser reads it as "same protocol, other host".
  // Without this line, a link with `?redirect=` takes the user off-site right
  // after typing the password, and the address bar gives nothing away.
  if (!value.startsWith('/') || value.startsWith('//')) return {}

  // `\` in place of `/` is the variation that browsers normalize back
  // to `//`, and that gets past a check made only on the slash.
  if (value.startsWith('/\\')) return {}

  return { redirect: value }
}
