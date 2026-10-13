import { createFileRoute, Outlet } from '@tanstack/react-router'

import { USER_ROLE } from '#/lib/entity'

import { requireRole } from '../-components/require-role'

const ROLES = [USER_ROLE.ADMINISTRATOR, USER_ROLE.ADVISOR]

/** Só o papel da área entra; os outros voltam à própria tela inicial. */
export const Route = createFileRoute('/_private/advisor')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
