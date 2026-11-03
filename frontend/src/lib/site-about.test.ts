import type { StorefrontSiteShowResponse } from '@interclasse/shared'
import { describe, expect, it } from 'vitest'

import { hasAboutContent } from './site-about'

const EMPTY: StorefrontSiteShowResponse = {
  about: null,
  organizer: null,
  firstEditionYear: null,
  edition: null,
  schoolInstagram: null,
  developerInstagram: null,
  regulation: null,
}

function site(
  patch: Partial<StorefrontSiteShowResponse>,
): StorefrontSiteShowResponse {
  return { ...EMPTY, ...patch }
}

describe('hasAboutContent', () => {
  it('is false without a site', () => {
    expect(hasAboutContent(undefined)).toBe(false)
  })

  it('is false when about, organizer and edition are empty', () => {
    expect(hasAboutContent(site({}))).toBe(false)
  })

  it.each([
    ['about', { about: 'Texto' }],
    ['organizer', { organizer: 'Escola' }],
    ['edition', { edition: 2026 }],
  ])('is true when only %s is filled in', (_name, patch) => {
    expect(hasAboutContent(site(patch))).toBe(true)
  })
})
