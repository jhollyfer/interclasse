import { createFileRoute, Outlet } from '@tanstack/react-router'

import { UserRoles } from '#/lib/entity'

import { requireRole } from '../-components/require-role'

const ROLES = [UserRoles.ADMINISTRATOR]

/** Só o papel da área entra; os outros voltam à própria tela inicial. */
export const Route = createFileRoute('/_private/administrator')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
