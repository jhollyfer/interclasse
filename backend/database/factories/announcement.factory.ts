import factory from '@adonisjs/lucid/factories'

import Announcement from '#models/announcement'

/** Site announcement. Born unpinned, the common case. */
export const AnnouncementFactory = factory
  .define(Announcement, ({ faker }) => ({
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    body: faker.lorem.paragraph(),
    pinned: false,
  }))
  .state('pinned', (announcement) => (announcement.pinned = true))
  .build()
