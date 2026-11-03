import type { AdministratorAnnouncementShowResponse } from '@interclasse/shared'
import { PushPinIcon } from '@phosphor-icons/react'
import type * as React from 'react'

import { Card } from '#/components/ui/card'
import { cn } from '#/lib/cn'
import { formatWhen } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { Empty } from './section'

/**
 * `headingLevel`: the title is an `h3` under a section's `h2` (home), and an `h2` on the
 * page whose only heading above is the `h1` - skipping a level breaks the screen-reader outline.
 */
export function AnnouncementList({
  announcements,
  headingLevel = 'h3',
}: Readonly<{
  announcements: ReadonlyArray<AdministratorAnnouncementShowResponse>
  headingLevel?: 'h2' | 'h3'
}>): React.JSX.Element {
  if (announcements.length === 0)
    return <Empty>{m.public_announcements_empty()}</Empty>

  const Heading = headingLevel

  return (
    <ul className="grid gap-3">
      {announcements.map((announcement) => (
        <li key={announcement.id}>
          <Card
            className={cn(
              'gap-0 px-4 py-4 text-base',
              announcement.pinned && 'bg-primary/5 ring-primary',
            )}
          >
            {announcement.pinned && (
              <p className="text-primary mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase">
                <PushPinIcon weight="fill" aria-hidden />
                {m.public_announcements_pinned()}
              </p>
            )}
            <Heading className="font-semibold">{announcement.title}</Heading>
            <p className="text-muted-foreground mt-1 whitespace-pre-line">
              {announcement.body}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              {formatWhen(announcement.createdAt)}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  )
}
