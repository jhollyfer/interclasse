import { STORAGE_MIMETYPES } from '@interclasse/shared'
import { describe, expect, it } from 'vitest'

import { IMAGE_MIMETYPES, isStorageMimetype } from './mimetype'

describe('isStorageMimetype', () => {
  it('reconhece cada tipo da lista do shared', () => {
    for (const mimetype of STORAGE_MIMETYPES) {
      expect(isStorageMimetype(mimetype)).toBe(true)
    }
  })

  it('recusa o que está fora da lista, inclusive vazio', () => {
    expect(isStorageMimetype('application/x-msdownload')).toBe(false)
    expect(isStorageMimetype('')).toBe(false)
  })
})

describe('IMAGE_MIMETYPES', () => {
  it('guarda só tipos de imagem, todos aceitos pelo storage', () => {
    expect(IMAGE_MIMETYPES.length).toBeGreaterThan(0)

    for (const mimetype of IMAGE_MIMETYPES) {
      expect(mimetype.startsWith('image/')).toBe(true)
      expect(isStorageMimetype(mimetype)).toBe(true)
    }
  })
})
