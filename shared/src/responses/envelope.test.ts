import { describe, expect, it } from 'vitest'

import { z } from '../validator.js'
import { paginatedResponse } from './envelope.js'

const meta = {
  total: 1,
  perPage: 20,
  currentPage: 1,
  lastPage: 1,
  firstPage: 1,
  firstPageUrl: '/?page=1',
  lastPageUrl: '/?page=1',
  nextPageUrl: null,
  previousPageUrl: null,
}

describe('paginatedResponse', () => {
  const schema = paginatedResponse(z.object({ id: z.string() }))

  it('accepts the footer and the records', () => {
    expect(schema.parse({ meta, data: [{ id: 'a' }] }).data).toEqual([
      { id: 'a' },
    ])
  })

  it('rejects a record outside the item schema', () => {
    expect(schema.safeParse({ meta, data: [{ id: 1 }] }).success).toBe(false)
  })

  it('rejects a body without the footer', () => {
    expect(schema.safeParse({ data: [] }).success).toBe(false)
  })
})
