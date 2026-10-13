import type * as React from 'react'
import { PushPinIcon } from '@phosphor-icons/react'

import type { Announcement } from '#/lib/validator'

import { Empty } from './section'
import { formatWhen } from './match-row'

export function AnnouncementList({
  announcements,
}: {
  announcements: ReadonlyArray<Announcement>
}): React.JSX.Element {
  if (announcements.length === 0)
    return <Empty>Nenhum aviso por enquanto.</Empty>

  return (
    <ul className="grid gap-3">
      {announcements.map((announcement) => (
        <li
          key={announcement.id}
          className="bg-card border-l-accent rounded-lg border border-l-4 p-4"
        >
          <h3 className="flex items-center gap-2 font-semibold">
            {announcement.pinned && (
              <PushPinIcon
                className="text-primary"
                weight="fill"
                aria-label="Fixado"
              />
            )}
            {announcement.title}
          </h3>
          <p className="text-muted-foreground mt-1 whitespace-pre-line">
            {announcement.body}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {formatWhen(announcement.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}
