import { createLazyFileRoute } from '@tanstack/react-router'
import { SignInForm } from './-components/sign-in-form'

export const Route = createLazyFileRoute('/authentication/_sign-in/')({
  component: SignInForm,
})
