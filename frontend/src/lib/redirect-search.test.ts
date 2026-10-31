import { expect, test } from 'vitest'

import { validateRedirectSearch } from './redirect-search'

test('accepts an internal path', () => {
  expect(validateRedirectSearch({ redirect: '/administrator' })).toEqual({
    redirect: '/administrator',
  })
  expect(
    validateRedirectSearch({
      redirect: '/administrator/testimonials?page=2#topo',
    }),
  ).toEqual({ redirect: '/administrator/testimonials?page=2#topo' })
})

test('refuses an external destination', () => {
  // Each of these takes the user off-site right after typing the password.
  const attacks = [
    'https://evil.com',
    'http://evil.com',
    '//evil.com',
    '/\\evil.com',
    'javascript:alert(1)',
    'evil.com',
  ]

  for (const redirect of attacks) {
    expect(validateRedirectSearch({ redirect })).toEqual({})
  }
})

test('ignores what is not a string', () => {
  expect(validateRedirectSearch({})).toEqual({})
  expect(validateRedirectSearch({ redirect: 42 })).toEqual({})
  expect(validateRedirectSearch({ redirect: ['/administrator'] })).toEqual({})
})
