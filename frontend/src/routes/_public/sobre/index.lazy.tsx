import { createLazyFileRoute } from '@tanstack/react-router'

import { AboutPage } from './-components/about-page'

export const Route = createLazyFileRoute('/_public/sobre/')({
  component: AboutPage,
})
