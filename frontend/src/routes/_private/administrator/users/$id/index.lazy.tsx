import { createLazyFileRoute } from '@tanstack/react-router'
import { UserDetail } from '../-components/detail'

export const Route = createLazyFileRoute('/_private/administrator/users/$id/')({
  component: UserDetail,
})
