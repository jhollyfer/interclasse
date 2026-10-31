import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as limiterErrors } from '@adonisjs/limiter'
import { LimiterResponse } from '@adonisjs/limiter'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import HttpExceptionHandler from '#exceptions/handler'
import HTTPException from '#exceptions/http.exception'

async function run(error: unknown) {
  const handler = await app.container.make(HttpExceptionHandler)
  const context = new HttpContextFactory().create()

  await handler.handle(error, context)

  return { status: context.response.getStatus(), body: context.response.getBody() }
}

test.group('exceptions > handler (unit)', () => {
  test("the guard's 401 uses the HTTPException factory code", async ({ assert }) => {
    const result = await run(new authErrors.E_UNAUTHORIZED_ACCESS('x', { guardDriverName: 'api' }))

    assert.equal(result.status, 401)
    assert.deepInclude(result.body, { status: 401, code: 'AUTHENTICATION_REQUIRED' })
  })

  test("the limiter's 429 becomes the envelope with a stable code", async ({ assert }) => {
    const response = new LimiterResponse({ limit: 5, remaining: 0, consumed: 5, availableIn: 600 })
    const result = await run(new limiterErrors.E_TOO_MANY_REQUESTS(response))

    assert.equal(result.status, 429)
    assert.deepInclude(result.body, { status: 429, code: 'TOO_MANY_REQUESTS' })
  })

  test('an unknown error becomes a generic 500 and does not leak the message', async ({
    assert,
  }) => {
    const result = await run(new Error('relation "users" does not exist'))

    assert.equal(result.status, 500)
    assert.deepInclude(result.body, { status: 500, code: 'SERVER_ERROR' })
    assert.notInclude(JSON.stringify(result.body), 'users')
  })

  test('HTTPException keeps its own message and code', async ({ assert }) => {
    const result = await run(HTTPException.Conflict('já existe', 'ALREADY_EXISTS'))

    assert.equal(result.status, 409)
    assert.deepInclude(result.body, { message: 'já existe', code: 'ALREADY_EXISTS' })
  })
})
