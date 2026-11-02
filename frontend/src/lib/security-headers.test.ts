import { expect, test } from 'vitest'

import { securityHeaders } from './security-headers'

test('without STORAGE_PUBLIC_URL, the CSP opens only the API', () => {
  const headers = securityHeaders({
    apiUrl: 'https://api.example.com',
    storagePublicUrl: undefined,
  })

  expect(headers['Content-Security-Policy']).toContain(
    "connect-src 'self' https://api.example.com;",
  )
  expect(headers['Content-Security-Policy']).toContain(
    "img-src 'self' https://api.example.com data: blob:",
  )
})

test('with STORAGE_PUBLIC_URL, img-src and connect-src open the bucket', () => {
  const headers = securityHeaders({
    apiUrl: 'https://api.example.com',
    storagePublicUrl: 'https://storage.example.com',
  })
  const csp = headers['Content-Security-Policy']

  expect(csp).toContain(
    "connect-src 'self' https://api.example.com https://storage.example.com;",
  )
  expect(csp).toContain(
    "img-src 'self' https://api.example.com https://storage.example.com data: blob:",
  )
})

test('forbids framing and sniffing', () => {
  const headers = securityHeaders({
    apiUrl: 'https://api.example.com',
    storagePublicUrl: undefined,
  })

  expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
  expect(headers['X-Content-Type-Options']).toBe('nosniff')
})
