import { createLazyFileRoute } from '@tanstack/react-router'

import { RemovalsPage } from './-components/removals-page'

export const Route = createLazyFileRoute('/_private/administrator/removals/')({
  component: RemovalsPage,
})
