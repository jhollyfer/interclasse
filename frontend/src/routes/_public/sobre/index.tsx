import { createFileRoute } from '@tanstack/react-router'

import { SITE_TITLE } from '#/lib/constant'

/** O dado vem do loader de `_public/layout.tsx`, que todo o site já carrega. */
export const Route = createFileRoute('/_public/sobre/')({
  head: () => ({ meta: [{ title: `Sobre os jogos | ${SITE_TITLE}` }] }),
})
