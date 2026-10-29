import type * as React from 'react'

import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { IPhoto } from '#/lib/interfaces'
import {
  PHOTO_STATUS_LABELS,
  PHOTO_STATUS_VARIANTS,
  formatDate,
} from '#/lib/labels'

type PhotoGridProps = Readonly<{
  photos: ReadonlyArray<IPhoto>
  isPending: boolean
  empty: string
  /** Mostra quem enviou: a organização revisa fotos de vários conselheiros. */
  showAuthor?: boolean
  /** Os botões de cada foto - aprovar e recusar, ou só apagar. */
  actions: (photo: IPhoto) => React.ReactNode
}>

/** As fotos enviadas, com a situação de cada uma e as ações de quem vê. */
export function PhotoGrid({
  photos,
  isPending,
  empty,
  showAuthor = false,
  actions,
}: PhotoGridProps): React.JSX.Element {
  if (isPending) return <Skeleton className="h-48 w-full" />

  if (photos.length === 0)
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        {empty}
      </p>
    )

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id}>
          <Card className="h-full overflow-hidden pt-0">
            <img
              src={photo.storage.url}
              alt={photo.caption ?? 'Foto dos jogos'}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
            <CardContent className="flex flex-col gap-2">
              <Badge
                variant={PHOTO_STATUS_VARIANTS[photo.status]}
                className="w-fit"
              >
                {PHOTO_STATUS_LABELS[photo.status]}
              </Badge>
              {photo.caption && <p className="text-sm">{photo.caption}</p>}
              <p className="text-muted-foreground text-xs">
                {showAuthor && photo.author && `${photo.author.name} · `}
                {formatDate(photo.createdAt)}
              </p>
              <div className="flex flex-wrap gap-2">{actions(photo)}</div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
