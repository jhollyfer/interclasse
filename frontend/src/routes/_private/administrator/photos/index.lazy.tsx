import { createLazyFileRoute } from '@tanstack/react-router'

import { PhotosPage } from './-components/photos-page'

export const Route = createLazyFileRoute('/_private/administrator/photos/')({
  component: PhotosPage,
})
