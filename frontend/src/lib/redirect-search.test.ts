import { expect, test } from 'vitest'

import { validateRedirectSearch } from './redirect-search'

test('aceita caminho interno', () => {
  expect(validateRedirectSearch({ redirect: '/administrator' })).toEqual({
    redirect: '/administrator',
  })
  expect(
    validateRedirectSearch({
      redirect: '/administrator/testimonials?page=2#topo',
    }),
  ).toEqual({ redirect: '/administrator/testimonials?page=2#topo' })
})

test('recusa destino externo', () => {
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

test('ignora o que não é string', () => {
  expect(validateRedirectSearch({})).toEqual({})
  expect(validateRedirectSearch({ redirect: 42 })).toEqual({})
  expect(validateRedirectSearch({ redirect: ['/administrator'] })).toEqual({})
})
