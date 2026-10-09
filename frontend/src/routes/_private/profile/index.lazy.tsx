import { createLazyFileRoute } from '@tanstack/react-router'
import { Profile } from './-components/profile'

export const Route = createLazyFileRoute('/_private/profile/')({
  component: Profile,
})
