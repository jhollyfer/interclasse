import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'
import { BASE_LOCALE } from '@interclasse/shared'

import OriginMiddleware from '#middleware/origin.middleware'
import HTTPException from '#exceptions/http.exception'

/** The `.env.test` allowlist. */
const ALLOWED = 'http://localhost:5173'

async function run(method: string, headers: Record<string, string>) {
  const middleware = await app.container.make(OriginMiddleware)
  const req = new IncomingMessage(new Socket())
  req.headers = headers
  const request = new RequestFactory().merge({ method, req }).create()
  const context = new HttpContextFactory().merge({ request }).create()
  context.i18n = i18nManager.locale(BASE_LOCALE)

  let reached = false
  const next = async () => {
    reached = true
  }

  try {
    await middleware.handle(context, next)
  } catch (error) {
    if (error instanceof HTTPException) return { reached, status: error.status, code: error.code }
    throw error
  }

  return { reached, status: 200, code: null }
}

test.group('middleware > origin (CSRF, unit)', () => {
  test('GET passes without Origin', async ({ assert }) => {
    const result = await run('GET', {})

    assert.isTrue(result.reached)
  })

  test('a write with an allowlist Origin passes, whatever the Content-Type', async ({ assert }) => {
    const result = await run('POST', { 'origin': ALLOWED, 'content-type': 'text/plain' })

    assert.isTrue(result.reached)
  })

  test('a write with an Origin outside the allowlist is 403 ORIGIN_NOT_ALLOWED', async ({
    assert,
  }) => {
    const result = await run('POST', {
      'origin': 'http://intruso.example',
      'content-type': 'application/json',
    })

    assert.isFalse(result.reached)
    assert.equal(result.status, 403)
    assert.equal(result.code, 'ORIGIN_NOT_ALLOWED')
  })

  test('text/plain from another site is refused', async ({ assert }) => {
    const result = await run('POST', {
      'origin': 'http://intruso.example',
      'content-type': 'text/plain',
    })

    assert.equal(result.code, 'ORIGIN_NOT_ALLOWED')
  })

  test('without Origin, Sec-Fetch-Site same-origin passes', async ({ assert }) => {
    const result = await run('DELETE', { 'sec-fetch-site': 'same-origin' })

    assert.isTrue(result.reached)
  })

  test('without Origin, a cross-site Sec-Fetch-Site is refused', async ({ assert }) => {
    const result = await run('POST', { 'sec-fetch-site': 'cross-site' })

    assert.equal(result.code, 'ORIGIN_NOT_ALLOWED')
  })

  test('a write without Origin and without Sec-Fetch-Site is refused', async ({ assert }) => {
    const result = await run('PUT', {})

    assert.isFalse(result.reached)
    assert.equal(result.code, 'ORIGIN_NOT_ALLOWED')
  })
})
