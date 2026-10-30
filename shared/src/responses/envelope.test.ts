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

  it('aceita o rodapé e os registros', () => {
    expect(schema.parse({ meta, data: [{ id: 'a' }] }).data).toEqual([
      { id: 'a' },
    ])
  })

  it('recusa registro fora do schema do item', () => {
    expect(schema.safeParse({ meta, data: [{ id: 1 }] }).success).toBe(false)
  })

  it('recusa corpo sem o rodapé', () => {
    expect(schema.safeParse({ data: [] }).success).toBe(false)
  })
})
