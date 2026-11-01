import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'
import { PushPinIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import { cn } from '#/lib/cn'
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
          className={cn(
            'rounded-lg border p-4',
            announcement.pinned && 'border-primary bg-primary/5',
            !announcement.pinned && 'bg-card',
          )}
        >
          {announcement.pinned && (
            <p className="text-primary mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase">
              <PushPinIcon weight="fill" aria-hidden />
              {m.public_announcements_pinned()}
            </p>
          )}
          <h3 className="font-semibold">{announcement.title}</h3>
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
