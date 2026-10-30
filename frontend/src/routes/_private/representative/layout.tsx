import { USER_ROLE } from '@interclasse/shared'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireRole } from '../-components/require-role'

const ROLES = [USER_ROLE.REPRESENTATIVE]

/** Só o papel da área entra; os outros voltam à própria tela inicial. */
export const Route = createFileRoute('/_private/representative')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
