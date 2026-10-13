import { createLazyFileRoute } from '@tanstack/react-router'

import { BracketsTable } from './-components/table'

export const Route = createLazyFileRoute('/_private/administrator/brackets/')({
  component: BracketsTable,
})
