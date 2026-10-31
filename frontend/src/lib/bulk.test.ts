import { describe, expect, it } from 'vitest'

import { runBulk } from './bulk'

describe('runBulk', () => {
  it('counts what passed and what failed without aborting at the first error', async () => {
    const touched: Array<number> = []

    const outcome = await runBulk([1, 2, 3, 4], async (item) => {
      touched.push(item)
      if (item % 2 === 0) throw new Error('falhou')
    })

    expect(outcome).toEqual({ done: 2, failed: 2 })
    // The point of using `allSettled`: item 2's failure did not stop 3 and 4.
    expect(touched).toEqual([1, 2, 3, 4])
  })

  it('returns zeros for an empty list', async () => {
    expect(await runBulk([], async () => undefined)).toEqual({
      done: 0,
      failed: 0,
    })
  })
})
