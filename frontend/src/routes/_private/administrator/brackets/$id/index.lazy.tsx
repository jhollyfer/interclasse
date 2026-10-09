import { createLazyFileRoute } from '@tanstack/react-router'
import { BracketDetailView } from '../-components/detail'

export const Route = createLazyFileRoute(
  '/_private/administrator/brackets/$id/',
)({
  component: BracketDetailView,
})
