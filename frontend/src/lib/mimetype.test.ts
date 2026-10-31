import { STORAGE_MIMETYPES } from '@interclasse/shared'
import { describe, expect, it } from 'vitest'

import { IMAGE_MIMETYPES, isStorageMimetype } from './mimetype'

describe('isStorageMimetype', () => {
  it('recognizes each type in the shared list', () => {
    for (const mimetype of STORAGE_MIMETYPES) {
      expect(isStorageMimetype(mimetype)).toBe(true)
    }
  })

  it('refuses what is outside the list, empty included', () => {
    expect(isStorageMimetype('application/x-msdownload')).toBe(false)
    expect(isStorageMimetype('')).toBe(false)
  })
})

describe('IMAGE_MIMETYPES', () => {
  it('keeps only image types, all accepted by the storage', () => {
    expect(IMAGE_MIMETYPES.length).toBeGreaterThan(0)

    for (const mimetype of IMAGE_MIMETYPES) {
      expect(mimetype.startsWith('image/')).toBe(true)
      expect(isStorageMimetype(mimetype)).toBe(true)
    }
  })
})
