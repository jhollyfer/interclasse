import { createFileRoute } from '@tanstack/react-router'

import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/** O dado vem do loader de `_public/layout.tsx`, que todo o site já carrega. */
export const Route = createFileRoute('/_public/sobre/')({
  head: () =>
    pageHead({
      title: m.public_about_title(),
      description: m.public_about_head_description(),
      pathname: '/sobre',
    }),
})
