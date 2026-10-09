import { createLazyFileRoute } from '@tanstack/react-router'
import { ProfileFormEdit } from './-components/form-edit'

export const Route = createLazyFileRoute('/_private/profile/edit')({
  component: ProfileFormEdit,
})
