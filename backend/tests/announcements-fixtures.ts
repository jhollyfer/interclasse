import { DateTime } from 'luxon'

import { AnnouncementFactory } from '#database/factories/announcement.factory'

/**
 * Three announcements on different dates, one of them pinned and the oldest of all.
 *
 * The default order of the panel and the site is "pinned first, then newest to
 * oldest": with the pinned one also being the oldest, a listing that forgot `pinned`
 * would send it to the end, and the test would notice.
 */
export async function announcementTimeline() {
  const pinned = await AnnouncementFactory.apply('pinned')
    .merge({ title: 'Fixado antigo', createdAt: DateTime.now().minus({ days: 3 }) })
    .create()
  const older = await AnnouncementFactory.merge({
    title: 'Intermediário',
    createdAt: DateTime.now().minus({ days: 1 }),
  }).create()
  const newest = await AnnouncementFactory.merge({ title: 'Recente' }).create()

  return { pinned, older, newest }
}
