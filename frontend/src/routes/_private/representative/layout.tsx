import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireRole } from '../-components/require-role'
import { UserRoles } from '#/lib/entity'

const ROLES = [UserRoles.REPRESENTATIVE]

/** Só o papel da área entra; os outros voltam à própria tela inicial. */
export const Route = createFileRoute('/_private/representative')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
