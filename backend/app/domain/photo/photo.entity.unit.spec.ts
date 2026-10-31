import { test } from '@japa/runner'
import { PHOTO_STATUS } from '@interclasse/shared'

import { PHOTO_SENDER, Photo, type PhotoSender } from './photo.entity.ts'

const NOW = new Date('2026-10-29T12:00:00Z')
const LATER = new Date('2026-10-30T12:00:00Z')
const IMAGE = { id: 'storage', mimetype: 'image/png' }

function send(sender: PhotoSender): Photo {
  const created = Photo.create({
    id: 'photo',
    storage: IMAGE,
    author: { id: 'user' },
    sender,
    now: NOW,
  })
  if (created.isLeft()) throw new Error('invalid arrangement')

  return created.value
}

test.group('Photo', () => {
  test("the advisor's photo is born pending and unreviewed", ({ assert }) => {
    const photo = send(PHOTO_SENDER.ADVISOR)

    assert.deepInclude(photo.snapshot(), {
      status: PHOTO_STATUS.PENDING,
      reviewedById: null,
      reviewedAt: null,
      authorId: 'user',
      caption: null,
    })
  })

  test("the organization's photo is born approved by whoever uploaded it", ({ assert }) => {
    const photo = send(PHOTO_SENDER.ADMINISTRATOR)

    assert.deepInclude(photo.snapshot(), {
      status: PHOTO_STATUS.APPROVED,
      reviewedById: 'user',
      reviewedAt: NOW,
    })
  })

  test('images only: another file type is PHOTO_NOT_IMAGE', ({ assert }) => {
    const created = Photo.create({
      id: 'photo',
      storage: { id: 'storage', mimetype: 'application/pdf' },
      author: { id: 'user' },
      sender: PHOTO_SENDER.ADVISOR,
      now: NOW,
    })

    assert.deepEqual(created.value, { code: 'PHOTO_NOT_IMAGE' })
  })

  test('the review can be redone and stamps who decided', ({ assert }) => {
    const photo = send(PHOTO_SENDER.ADVISOR)

    photo.review({ status: PHOTO_STATUS.APPROVED, reviewerId: 'a', now: NOW })
    photo.review({ status: PHOTO_STATUS.REJECTED, reviewerId: 'b', now: LATER })

    assert.deepInclude(photo.snapshot(), {
      status: PHOTO_STATUS.REJECTED,
      reviewedById: 'b',
      reviewedAt: LATER,
      updatedAt: LATER,
    })
  })
})
