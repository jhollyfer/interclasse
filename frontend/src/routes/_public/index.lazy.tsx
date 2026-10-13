import { createLazyFileRoute } from '@tanstack/react-router'

import { HomePage } from './-components/home-page'

export const Route = createLazyFileRoute('/_public/')({
  component: HomePage,
})
