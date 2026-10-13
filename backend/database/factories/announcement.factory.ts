import factory from '@adonisjs/lucid/factories'

import Announcement from '#models/announcement'

/** Aviso do site. Nasce sem destaque, que é o caso comum. */
export const AnnouncementFactory = factory
  .define(Announcement, ({ faker }) => ({
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    body: faker.lorem.paragraph(),
    pinned: false,
  }))
  .state('pinned', (announcement) => (announcement.pinned = true))
  .build()
