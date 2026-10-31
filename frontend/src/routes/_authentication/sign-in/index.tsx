import { createFileRoute } from '@tanstack/react-router'

/**
 * The sign-in form. The inverse guard (whoever already has a session leaves here) and
 * the validated `?redirect=` live in the `_authentication/` layout.
 */
export const Route = createFileRoute('/_authentication/sign-in/')({})
