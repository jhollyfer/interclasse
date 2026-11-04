import type { StorefrontPhotoShowResponse } from '@interclasse/shared'
import type * as React from 'react'

import { Picture } from '#/components/common/picture'
import { m } from '#/paraglide/messages'

type PhotoFigureProps = Readonly<{
  photo: StorefrontPhotoShowResponse
}>

/**
 * One approved photo with its caption. The home carousel and the photos page
 * draw the same figure: written twice, one of them would drift.
 */
export function PhotoFigure({ photo }: PhotoFigureProps): React.JSX.Element {
  return (
    <figure className="overflow-hidden rounded-lg border">
      <Picture
        src={photo.url}
        alt={photo.caption ?? m.public_photos_alt_fallback()}
        className="aspect-photo w-full object-cover"
        width={800}
        height={600}
        placement="fold"
      />
      {photo.caption && (
        <figcaption className="text-muted-foreground p-3 text-sm">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  )
}
