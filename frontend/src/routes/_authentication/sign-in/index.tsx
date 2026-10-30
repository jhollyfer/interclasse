import { createFileRoute } from '@tanstack/react-router'

/**
 * O formulário de entrada. O guard inverso (quem já tem sessão sai daqui) e
 * o `?redirect=` validado moram no layout de `_authentication/`.
 */
export const Route = createFileRoute('/_authentication/sign-in/')({})
