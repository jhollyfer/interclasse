import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

import { csvDownload } from './_shared.csv.ts'

test.group('features/_shared > csvDownload (unit)', () => {
  test('sets type, attachment and no-store, and returns the content', ({ assert }) => {
    const context = new HttpContextFactory().create()

    csvDownload(context.response, 'relatorio.csv', 'a;b')

    assert.equal(context.response.getHeader('Content-Type'), 'text/csv; charset=utf-8')
    assert.equal(
      context.response.getHeader('Content-Disposition'),
      'attachment; filename="relatorio.csv"',
    )
    assert.equal(context.response.getHeader('Cache-Control'), 'no-store')
    assert.equal(context.response.getBody(), 'a;b')
  })
})
