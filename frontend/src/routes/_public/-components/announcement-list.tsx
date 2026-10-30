import type * as React from 'react'
import { PushPinIcon } from '@phosphor-icons/react'
import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'

import { formatWhen } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { Empty } from './section'

export function AnnouncementList({
  announcements,
}: Readonly<{
  announcements: ReadonlyArray<AdministratorAnnouncementShowResponse>
}>): React.JSX.Element {
  if (announcements.length === 0)
    return <Empty>{m.public_announcements_empty()}</Empty>

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
                aria-label={m.public_announcements_pinned()}
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
