import { createLazyFileRoute } from '@tanstack/react-router'
import { UsersTable } from './-components/table'

export const Route = createLazyFileRoute('/_private/administrator/users/')({
  component: UsersTable,
})
