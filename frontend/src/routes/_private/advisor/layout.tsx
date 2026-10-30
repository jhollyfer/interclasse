import { USER_ROLE } from '@interclasse/shared'
import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireRole } from '../-components/require-role'

// Só o conselheiro: o administrador abre a mesma turma em
// `/administrator/classrooms/$id`, com o "voltar" para a lista dele.
const ROLES = [USER_ROLE.ADVISOR]

/** Só o papel da área entra; os outros voltam à própria tela inicial. */
export const Route = createFileRoute('/_private/advisor')({
  beforeLoad: ({ context }) => requireRole(context.account.role, ROLES),
  component: Outlet,
})
