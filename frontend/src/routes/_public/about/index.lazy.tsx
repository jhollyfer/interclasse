import { createLazyFileRoute } from '@tanstack/react-router'

import { AboutPage } from './-components/about-page'

export const Route = createLazyFileRoute('/_public/about/')({
  component: AboutPage,
})
