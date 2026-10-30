import { createFileRoute } from '@tanstack/react-router'

import { currentSchoolYear } from '#/lib/i18n'
import { pageHead } from '#/lib/page-head'
import { m } from '#/paraglide/messages'

/** O dado vem do loader de `_public/layout.tsx`, que todo o site já carrega. */
export const Route = createFileRoute('/_public/sobre/')({
  // O ano vem do loader: o servidor o calcula uma vez e o cliente hidrata com
  // o mesmo valor, em vez de ler o relógio no render.
  loader: () => ({ currentYear: currentSchoolYear() }),
  head: () =>
    pageHead({
      title: m.public_about_title(),
      description: m.public_about_head_description(),
      pathname: '/sobre',
    }),
})
