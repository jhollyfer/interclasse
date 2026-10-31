import { createFileRoute } from '@tanstack/react-router'

import { NotFoundPage } from '#/components/common/not-found-page'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/**
 * The public address that does not exist (VI-05).
 *
 * The `defaultNotFoundComponent` in `router.tsx` draws the same screen, and draws it
 * **outside** any shell: an address that matches no route never
 * reaches `_public`, so the storefront's header and footer are not
 * mounted when it answers. Whoever gets the address wrong is left without menu, without brand
 * and without footer - with no exit other than the back button.
 *
 * This catch-all route is what brings the screen inside the shell: `$` matches
 * what is left, and being a child of `_public` it comes with header and footer. The
 * button still goes to the home, which is the right exit for whoever was in
 * the storefront.
 *
 * **No `.lazy` file, and it is a decision**: the screen is a component that is already in
 * the bundle - splitting it into two requests would cost a trip to the server
 * to load six lines.
 *
 * `noindex` because the address does not exist: without it the search engine would keep the
 * wrong URL with a success response.
 */
export const Route = createFileRoute('/_public/$')({
  head: ({ match }) =>
    pageHead({
      title: m.common_not_found_title(),
      pathname: match.pathname,
      noindex: true,
    }),
  // `min-h` smaller than the default: inside the shell the screen shares the height with the
  // header and footer, and `min-h-dvh` would push the footer out of the
  // first fold.
  component: () => <NotFoundPage className="min-h-stage-sm" />,
})
