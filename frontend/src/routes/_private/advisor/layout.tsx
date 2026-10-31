import { USER_ROLE } from '@interclasse/shared'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireRole } from '../-components/require-role'

// Advisor only: the administrator opens the same classroom at
// `/administrator/classrooms/$id`, with "voltar" to their list.
const ROLES = [USER_ROLE.ADVISOR]

/** Only the area's role gets in; the others go back to their own home screen. */
export const Route = createFileRoute('/_private/advisor')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
