import { USER_ROLE } from '@interclasse/shared'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireRole } from '../-components/require-role'

const ROLES = [USER_ROLE.ADMINISTRATOR]

/** Only the area's role gets in; the others go back to their own home screen. */
export const Route = createFileRoute('/_private/administrator')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
