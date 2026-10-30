import { createLazyFileRoute } from '@tanstack/react-router'

import { MyPhotosPage } from './-components/my-photos-page'

export const Route = createLazyFileRoute('/_private/advisor/photos/')({
  component: MyPhotosPage,
})
