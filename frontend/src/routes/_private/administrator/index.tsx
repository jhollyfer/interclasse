import { createFileRoute, redirect } from '@tanstack/react-router'

/** A organização começa pelas chaves: é onde o sorteio e o placar acontecem. */
export const Route = createFileRoute('/_private/administrator/')({
  beforeLoad: () => {
    throw redirect({ to: '/administrator/brackets' })
  },
})
