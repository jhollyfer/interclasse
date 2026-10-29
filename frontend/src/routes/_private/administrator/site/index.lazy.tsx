import { createLazyFileRoute } from '@tanstack/react-router'

import { SiteForm } from './-components/site-form'

export const Route = createLazyFileRoute('/_private/administrator/site/')({
  component: SiteForm,
})
