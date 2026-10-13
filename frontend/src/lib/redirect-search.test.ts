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
  // Cada um destes leva o usuário para fora logo depois de ele digitar a senha.
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
