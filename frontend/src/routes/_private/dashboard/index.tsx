import { createFileRoute, redirect } from '@tanstack/react-router'

import { HOME_BY_ROLE } from '../-components/menu'

/**
 * The dashboard's front door: sends each role to its own first screen.
 *
 * It exists because the three roles do not share a home screen - the administrator
 * lands on the brackets, the advisor on their classroom, the representative on the athlete
 * list. The login and the logo point here, and not to any one of them.
 */
export const Route = createFileRoute('/_private/dashboard/')({
  beforeLoad: ({ context }) => {
    throw redirect({ to: HOME_BY_ROLE[context.account.role] })
  },
})
