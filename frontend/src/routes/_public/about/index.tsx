import { createFileRoute } from '@tanstack/react-router'

import { currentSchoolYear } from '#/lib/i18n'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/** The data comes from `_public/layout.tsx`'s loader, which the whole site already loads. */
export const Route = createFileRoute('/_public/about/')({
  // The year comes from the loader: the server computes it once and the client hydrates with
  // the same value, instead of reading the clock on render.
  loader: () => ({ currentYear: currentSchoolYear() }),
  head: () =>
    pageHead({
      title: m.public_about_title(),
      description: m.public_about_head_description(),
      pathname: '/about',
    }),
})
