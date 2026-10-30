import { createLazyFileRoute } from '@tanstack/react-router'

import { SignInForm } from './-components/sign-in-form'

export const Route = createLazyFileRoute('/_authentication/sign-in/')({
  component: SignInForm,
})
